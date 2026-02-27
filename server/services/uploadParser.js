const XLSX = require('xlsx');
const { transaction, query } = require('../models/db');

// ============================================================
// 檔案類型辨識
// ============================================================
const detectFileType = (filename, sheetNames) => {
  const fn = filename.toLowerCase();

  if (fn.includes('技師績效') || fn.includes('工資明細')) return 'tech_performance';
  if (fn.includes('維修收入') || fn.includes('收入分類')) return 'repair_income';
  if (fn.includes('零件銷售') || fn.includes('零件明細')) return 'parts_sales';
  if (fn.includes('零配件比對') || fn.includes('零配件對照')) return 'parts_catalog';
  if (fn.includes('業務查詢')) return 'business_query';

  // 從 sheet 名稱推測
  if (sheetNames) {
    const names = sheetNames.join(',');
    if (names.includes('工資明細')) return 'tech_performance';
    if (names.includes('維修收入')) return 'repair_income';
  }

  return null;
};

// 據點辨識
const detectBranch = (filename) => {
  const fn = filename.toUpperCase();
  if (fn.includes('AMA')) return 'AMA';
  if (fn.includes('AMC')) return 'AMC';
  if (fn.includes('AMD')) return 'AMD';
  return null;
};

// 期間辨識（從檔名抓 YYYYMM）
const detectPeriod = (filename) => {
  const match = filename.match(/(\d{6})/);
  return match ? match[1] : null;
};

// ============================================================
// 解析各類檔案
// ============================================================

// 解析維修收入明細
const parseRepairIncome = (workbook, branch, period) => {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows.map((r) => ({
    period,
    branch,
    work_order: String(r['工作單號'] || r['工單號'] || '').trim(),
    settle_date: parseExcelDate(r['結算日期']),
    customer: String(r['客戶'] || r['顧客名稱'] || '').trim(),
    plate_no: String(r['車牌號碼'] || r['車牌'] || '').trim(),
    account_type_code: String(r['帳類代碼'] || r['帳類'] || '').trim(),
    account_type: String(r['帳類名稱'] || r['帳類'] || '').trim(),
    parts_income: num(r['零件收入']),
    accessories_income: num(r['配件收入']),
    boutique_income: num(r['精品收入']),
    engine_wage: num(r['引擎工資'] || r['工資收入']),
    bodywork_income: num(r['鈑金收入']),
    paint_income: num(r['烤漆收入']),
    carwash_income: num(r['洗車美容收入'] || r['洗車收入']),
    outsource_income: num(r['外包收入']),
    addon_income: num(r['附加服務'] || r['附加']),
    total_untaxed: num(r['收入合計(未稅)'] || r['合計未稅'] || r['收入合計']),
    total_taxed: num(r['收入合計(含稅)'] || r['合計含稅']),
    parts_cost: num(r['零件成本']),
    service_advisor: String(r['服務顧問'] || r['接待員'] || '').trim(),
  }));
};

// 解析技師績效
const parseTechPerformance = (workbook, branch, period) => {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows.map((r) => ({
    period,
    branch,
    tech_name_raw: String(r['技師姓名'] || r['姓名'] || '').trim(),
    tech_name_clean: String(r['技師姓名'] || r['姓名'] || '').trim().replace(/\s+/g, ''),
    dispatch_date: parseExcelDate(r['出廠日期']),
    work_order: String(r['工作單號'] || r['工單號'] || '').trim(),
    work_code: String(r['維修工時代碼'] || r['工時代碼'] || '').trim(),
    task_content: String(r['作業內容'] || '').trim(),
    standard_hours: num(r['標準工時']),
    wage: num(r['工資']),
    account_type: String(r['帳類'] || '').trim(),
    discount: num(r['折扣']),
    wage_category: String(r['工資類別'] || '').trim(),
  }));
};

// 解析零件銷售
const parsePartsSales = (workbook, branch, period) => {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows.map((r) => ({
    period,
    branch: branch || detectBranchFromRow(r),
    category: String(r['類別'] || '').trim(),
    category_detail: String(r['類別細節'] || r['類別明細'] || '').trim(),
    order_no: String(r['結帳單號'] || '').trim(),
    work_order: String(r['工單號'] || r['工作單號'] || '').trim(),
    part_number: String(r['零件編號'] || '').trim(),
    part_name: String(r['零件名稱'] || '').trim(),
    part_type: String(r['種類'] || r['零件種類'] || '').trim(),
    category_code: String(r['零件類別'] || '').trim(),
    function_code: String(r['功能碼'] || '').trim(),
    sale_qty: num(r['銷售數量'] || r['數量']),
    retail_price: num(r['零售價']),
    sale_price_untaxed: num(r['實際售價(未稅)'] || r['售價未稅'] || r['實際售價']),
    cost_untaxed: num(r['成本(未稅)'] || r['成本未稅'] || r['成本']),
    discount_rate: num(r['折扣率']),
    department: String(r['部門'] || '').trim(),
    pickup_person: String(r['領料人'] || '').trim(),
    sales_person: String(r['銷售人員'] || r['業務員'] || '').trim(),
    plate_no: String(r['車牌號碼'] || r['車牌'] || '').trim(),
  }));
};

// 解析零配件對照表
const parsePartsCatalog = (workbook) => {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows.map((r) => ({
    part_number: String(r['零件編號'] || r['料號'] || '').trim(),
    part_name: String(r['零件名稱'] || r['品名'] || '').trim(),
    part_category: String(r['種類'] || r['零件種類'] || '').trim(),
    function_code: String(r['功能碼'] || '').trim(),
    category_code: String(r['零件類別'] || '').trim(),
  })).filter((r) => r.part_number);
};

// 解析業務查詢
const parseBusinessQuery = (workbook, branch, period) => {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows.map((r) => ({
    period,
    branch: branch || detectBranchFromRow(r),
    work_order: String(r['工單號'] || r['工作單號'] || '').trim(),
    open_time: parseExcelDateTime(r['開單時間']),
    settle_date: parseExcelDate(r['結算日期']),
    plate_no: String(r['車牌號碼'] || r['車牌'] || '').trim(),
    vin: String(r['車身號碼'] || r['VIN'] || '').trim(),
    status: String(r['工單狀態'] || r['狀態'] || '').trim(),
    repair_item: String(r['交修項目'] || '').trim(),
    service_advisor: String(r['服務顧問'] || '').trim(),
    assigned_tech: String(r['指定技師'] || '').trim(),
    repair_tech: String(r['維修技師'] || '').trim(),
    repair_type: String(r['維修類型'] || '').trim(),
    car_series: String(r['車系'] || '').trim(),
    car_model: String(r['車型'] || '').trim(),
    model_year: String(r['年式'] || '').trim(),
    owner: String(r['車主'] || '').trim(),
    is_ev: String(r['電車'] || r['油電'] || r['動力'] || '').trim(),
    mileage_in: parseInt(r['進廠里程']) || null,
    mileage_out: parseInt(r['出廠里程']) || null,
  }));
};

// ============================================================
// 寫入資料庫
// ============================================================

const insertRepairIncome = async (client, rows) => {
  const cols = ['period','branch','work_order','settle_date','customer','plate_no',
    'account_type_code','account_type','parts_income','accessories_income','boutique_income',
    'engine_wage','bodywork_income','paint_income','carwash_income','outsource_income',
    'addon_income','total_untaxed','total_taxed','parts_cost','service_advisor'];
  return batchInsert(client, 'repair_income', cols, rows);
};

const insertTechPerformance = async (client, rows) => {
  const cols = ['period','branch','tech_name_raw','tech_name_clean','dispatch_date',
    'work_order','work_code','task_content','standard_hours','wage','account_type',
    'discount','wage_category'];
  return batchInsert(client, 'tech_performance', cols, rows);
};

const insertPartsSales = async (client, rows) => {
  const cols = ['period','branch','category','category_detail','order_no','work_order',
    'part_number','part_name','part_type','category_code','function_code','sale_qty',
    'retail_price','sale_price_untaxed','cost_untaxed','discount_rate','department',
    'pickup_person','sales_person','plate_no'];
  return batchInsert(client, 'parts_sales', cols, rows);
};

const insertBusinessQuery = async (client, rows) => {
  const cols = ['period','branch','work_order','open_time','settle_date','plate_no','vin',
    'status','repair_item','service_advisor','assigned_tech','repair_tech','repair_type',
    'car_series','car_model','model_year','owner','is_ev','mileage_in','mileage_out'];
  return batchInsert(client, 'business_query', cols, rows);
};

const upsertPartsCatalog = async (client, rows) => {
  let count = 0;
  for (const r of rows) {
    await client.query(`
      INSERT INTO parts_catalog (part_number, part_name, part_category, function_code, category_code, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (part_number) DO UPDATE SET
        part_name = EXCLUDED.part_name,
        part_category = EXCLUDED.part_category,
        function_code = EXCLUDED.function_code,
        category_code = EXCLUDED.category_code,
        updated_at = NOW()
    `, [r.part_number, r.part_name, r.part_category, r.function_code, r.category_code]);
    count++;
  }
  return count;
};

// ============================================================
// 公式引擎（上傳後自動執行）
// ============================================================

const runFormulaEngine = async (client, fileType, period, branch) => {
  const results = {};

  // A. 自費鈑烤判定
  if (fileType === 'repair_income') {
    const r = await client.query(`
      UPDATE repair_income SET is_self_pay_bodywork = true
      WHERE period = $1 AND branch = $2
        AND account_type IN ('一般', 'C')
        AND (bodywork_income > 0 OR paint_income > 0)
    `, [period, branch]);
    results.selfPayBodywork = r.rowCount;
  }

  // B. 延保判定（零件銷售中 7013 開頭）
  if (fileType === 'parts_sales') {
    const r = await client.query(`
      UPDATE parts_sales SET is_warranty_ext = true
      WHERE period = $1 AND ($2::text IS NULL OR branch = $2)
        AND part_number LIKE '7013%'
    `, [period, branch]);
    results.warrantyExt = r.rowCount;

    // 倍耐力判定（7489 開頭）
    const r2 = await client.query(`
      UPDATE parts_sales SET is_pirelli = true
      WHERE period = $1 AND ($2::text IS NULL OR branch = $2)
        AND part_number LIKE '7489%'
    `, [period, branch]);
    results.pirelli = r2.rowCount;

    // 促銷獎金計算
    await calculatePromoBonus(client, period, branch);
    results.promoBonus = true;
  }

  // C. 美容判定（技師績效）
  if (fileType === 'tech_performance') {
    const r = await client.query(`
      UPDATE tech_performance tp SET is_beauty = true
      FROM work_hour_master wh
      WHERE tp.work_code = wh.work_code
        AND wh.definition = '美容'
        AND tp.period = $1 AND tp.branch = $2
    `, [period, branch]);
    results.beauty = r.rowCount;

    // D. 台數判定（同出廠日+工單，首筆=1）
    await client.query(`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY dispatch_date, work_order, branch
          ORDER BY id
        ) AS rn
        FROM tech_performance
        WHERE period = $1 AND branch = $2
      )
      UPDATE tech_performance SET car_count_flag = CASE WHEN ranked.rn = 1 THEN 1 ELSE 0 END
      FROM ranked WHERE tech_performance.id = ranked.id
    `, [period, branch]);
    results.carCount = true;
  }

  return results;
};

// 促銷獎金計算
const calculatePromoBonus = async (client, period, branch) => {
  const rules = await client.query(
    'SELECT * FROM promo_rules WHERE is_active = true ORDER BY discount_min'
  );

  for (const rule of rules.rows) {
    await client.query(`
      UPDATE parts_sales SET promo_bonus = sale_price_untaxed * $1
      WHERE period = $2 AND ($3::text IS NULL OR branch = $3)
        AND part_type = $4
        AND discount_rate >= $5 AND discount_rate <= $6
        AND promo_bonus = 0
    `, [rule.bonus_rate, period, branch, rule.applicable_types, rule.discount_min, rule.discount_max]);
  }
};

// ============================================================
// 主要處理函式
// ============================================================

const processUpload = async (buffer, filename, uploadedBy) => {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const fileType = detectFileType(filename, workbook.SheetNames);
  const branch = detectBranch(filename);
  const period = detectPeriod(filename);

  if (!fileType) {
    throw new Error(`無法辨識檔案類型: ${filename}`);
  }

  let rowCount = 0;

  await transaction(async (client) => {
    let rows;

    switch (fileType) {
      case 'repair_income':
        if (!branch || !period) throw new Error('維修收入需要據點和期間（從檔名辨識）');
        // 清除該期間該據點舊資料
        await client.query('DELETE FROM repair_income WHERE period = $1 AND branch = $2', [period, branch]);
        rows = parseRepairIncome(workbook, branch, period);
        rowCount = await insertRepairIncome(client, rows);
        break;

      case 'tech_performance':
        if (!branch || !period) throw new Error('技師績效需要據點和期間（從檔名辨識）');
        await client.query('DELETE FROM tech_performance WHERE period = $1 AND branch = $2', [period, branch]);
        rows = parseTechPerformance(workbook, branch, period);
        rowCount = await insertTechPerformance(client, rows);
        break;

      case 'parts_sales':
        if (!period) throw new Error('零件銷售需要期間（從檔名辨識）');
        // 零件銷售是三廠合併，可能沒有單一 branch
        await client.query('DELETE FROM parts_sales WHERE period = $1', [period]);
        rows = parsePartsSales(workbook, branch, period);
        rowCount = await insertPartsSales(client, rows);
        break;

      case 'parts_catalog':
        rows = parsePartsCatalog(workbook);
        rowCount = await upsertPartsCatalog(client, rows);
        break;

      case 'business_query':
        if (!period) throw new Error('業務查詢需要期間（從檔名辨識）');
        const bqBranch = branch || null;
        if (bqBranch) {
          await client.query('DELETE FROM business_query WHERE period = $1 AND branch = $2', [period, bqBranch]);
        } else {
          await client.query('DELETE FROM business_query WHERE period = $1', [period]);
        }
        rows = parseBusinessQuery(workbook, bqBranch, period);
        rowCount = await insertBusinessQuery(client, rows);
        break;
    }

    // 執行公式引擎
    await runFormulaEngine(client, fileType, period, branch);

    // 記錄上傳歷史
    await client.query(`
      INSERT INTO upload_history (file_name, file_type, branch, period, row_count, status, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, 'success', $6)
    `, [filename, fileType, branch, period, rowCount, uploadedBy]);
  });

  return { fileType, branch, period, rowCount };
};

// ============================================================
// Helpers
// ============================================================

const num = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

const parseExcelDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const s = String(val).trim();
  // 嘗試 YYYY/MM/DD 或 YYYY-MM-DD
  const match = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  return null;
};

const parseExcelDateTime = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  return parseExcelDate(val);
};

const detectBranchFromRow = (row) => {
  // 從資料列中嘗試偵測據點
  const vals = Object.values(row).join(' ').toUpperCase();
  if (vals.includes('AMA')) return 'AMA';
  if (vals.includes('AMC')) return 'AMC';
  if (vals.includes('AMD')) return 'AMD';
  return null;
};

// 批次 INSERT（每 500 筆一批）
const batchInsert = async (client, table, cols, rows) => {
  const BATCH_SIZE = 500;
  let total = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values = [];
    const placeholders = [];

    batch.forEach((row, ri) => {
      const rowPlaceholders = cols.map((col, ci) => {
        values.push(row[col] !== undefined ? row[col] : null);
        return `$${ri * cols.length + ci + 1}`;
      });
      placeholders.push(`(${rowPlaceholders.join(',')})`);
    });

    await client.query(
      `INSERT INTO ${table} (${cols.join(',')}) VALUES ${placeholders.join(',')}`,
      values
    );
    total += batch.length;
  }

  return total;
};

module.exports = { processUpload, detectFileType, detectBranch, detectPeriod };
