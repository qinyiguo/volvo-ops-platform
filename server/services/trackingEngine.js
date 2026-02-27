const { query } = require('../models/db');

/**
 * 追蹤品項統計引擎
 * 根據 tracking_items 中的 match_rules (JSONB) 動態統計各品項數量
 *
 * match_rules 格式：
 * [
 *   { data_source: "parts_sales", match_type: "category_code", category_code: "15" },
 *   { data_source: "parts_sales", match_type: "function_code", function_code: "7731" },
 *   { data_source: "parts_sales", match_type: "both", category_code: "11", function_code: "7731" },
 *   { data_source: "parts_sales", match_type: "part_number", part_number: "7280011" },
 *   { data_source: "business_query", match_type: "condition", condition_field: "repair_type", condition_value: "保養" }
 * ]
 */

// 取得所有啟用的追蹤品項
const getActiveTrackingItems = async (reportType = null) => {
  let sql = 'SELECT * FROM tracking_items WHERE is_active = true';
  const params = [];

  if (reportType) {
    const colMap = {
      sa_summary: 'show_in_sa_summary',
      tech_summary: 'show_in_tech_summary',
      beauty: 'show_in_beauty',
      bodywork: 'show_in_bodywork',
      branch_overview: 'show_in_branch_overview',
    };
    const col = colMap[reportType];
    if (col) {
      sql += ` AND ${col} = true`;
    }
  }

  sql += ' ORDER BY sort_order, id';
  const result = await query(sql, params);
  return result.rows;
};

// 統計單一品項（按人員分組）
const calculateItemStats = async (item, period, branch, groupBy = 'sales_person') => {
  const rules = item.match_rules || [];
  if (rules.length === 0) return [];

  // 分類規則
  const partsSalesRules = rules.filter(r => r.data_source === 'parts_sales');
  const businessQueryRules = rules.filter(r => r.data_source === 'business_query');

  let results = [];

  // 處理 parts_sales 來源的規則
  if (partsSalesRules.length > 0) {
    const conditions = partsSalesRules.map(rule => buildPartsSalesCondition(rule)).filter(Boolean);
    if (conditions.length > 0) {
      const groupCol = groupBy === 'sales_person' ? 'sales_person' : 'pickup_person';
      const countExpr = item.count_method === '金額' ? 'SUM(sale_price_untaxed)' :
                        item.count_method === '公升' ? 'SUM(sale_qty)' :
                        'SUM(sale_qty)';

      const sql = `
        SELECT ${groupCol} AS person_name, ${countExpr} AS value
        FROM parts_sales
        WHERE period = $1
          AND ($2::text IS NULL OR branch = $2)
          AND (${conditions.join(' OR ')})
        GROUP BY ${groupCol}
        HAVING ${groupCol} IS NOT NULL AND ${groupCol} != ''
      `;
      const r = await query(sql, [period, branch || null]);
      results = results.concat(r.rows);
    }
  }

  // 處理 business_query 來源的規則
  if (businessQueryRules.length > 0) {
    for (const rule of businessQueryRules) {
      if (rule.match_type === 'condition' && rule.condition_field && rule.condition_value) {
        const validFields = ['repair_type', 'is_ev', 'status', 'car_series'];
        if (!validFields.includes(rule.condition_field)) continue;

        const sql = `
          SELECT service_advisor AS person_name, COUNT(*) AS value
          FROM business_query
          WHERE period = $1
            AND ($2::text IS NULL OR branch = $2)
            AND ${rule.condition_field} = $3
          GROUP BY service_advisor
          HAVING service_advisor IS NOT NULL AND service_advisor != ''
        `;
        const r = await query(sql, [period, branch || null, rule.condition_value]);
        results = results.concat(r.rows);
      }
    }
  }

  // 合併同一人的結果（多條規則 OR 可能重複）
  const merged = {};
  for (const r of results) {
    if (!r.person_name) continue;
    merged[r.person_name] = (merged[r.person_name] || 0) + parseFloat(r.value || 0);
  }

  return Object.entries(merged).map(([person_name, value]) => ({ person_name, value }));
};

// 建立 parts_sales 的 WHERE 條件
const buildPartsSalesCondition = (rule) => {
  switch (rule.match_type) {
    case 'category_code':
      return rule.category_code ? `category_code = '${escapeSql(rule.category_code)}'` : null;
    case 'function_code':
      return rule.function_code ? `function_code = '${escapeSql(rule.function_code)}'` : null;
    case 'both':
      if (rule.category_code && rule.function_code) {
        return `(category_code = '${escapeSql(rule.category_code)}' AND function_code = '${escapeSql(rule.function_code)}')`;
      }
      return null;
    case 'part_number':
      if (rule.part_number) {
        // 支援 prefix match（如 7013%）
        if (rule.part_number.includes('%')) {
          return `part_number LIKE '${escapeSql(rule.part_number)}'`;
        }
        return `part_number = '${escapeSql(rule.part_number)}'`;
      }
      return null;
    default:
      return null;
  }
};

// 取得完整報表資料（某報表的所有品項 × 所有人）
const getReportData = async (reportType, period, branch) => {
  const items = await getActiveTrackingItems(reportType);
  const groupBy = reportType === 'tech_summary' ? 'pickup_person' : 'sales_person';

  const result = [];
  for (const item of items) {
    const stats = await calculateItemStats(item, period, branch, groupBy);
    result.push({
      item_id: item.id,
      item_name: item.item_name,
      count_method: item.count_method,
      stats, // [{ person_name, value }, ...]
    });
  }

  return result;
};

// 取得四廠整合品項統計
const getBranchOverviewStats = async (period) => {
  const items = await getActiveTrackingItems('branch_overview');
  const branches = ['AMA', 'AMC', 'AMD'];

  const result = [];
  for (const item of items) {
    const branchData = {};
    let total = 0;

    for (const branch of branches) {
      const stats = await calculateItemStats(item, period, branch);
      const branchTotal = stats.reduce((sum, s) => sum + s.value, 0);
      branchData[branch] = branchTotal;
      total += branchTotal;
    }
    branchData['AM'] = total;

    result.push({
      item_id: item.id,
      item_name: item.item_name,
      count_method: item.count_method,
      branches: branchData,
    });
  }

  return result;
};

// 防 SQL injection
const escapeSql = (val) => String(val).replace(/'/g, "''");

module.exports = {
  getActiveTrackingItems,
  calculateItemStats,
  getReportData,
  getBranchOverviewStats,
};
