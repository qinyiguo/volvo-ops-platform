const express = require('express');
const router = express.Router();
const { query } = require('../models/db');
const { getReportData, getBranchOverviewStats } = require('../services/trackingEngine');

// ===== 以下皆為公開檢視 API（免登入）=====

// GET /api/dashboard/sa-summary — SA 綜合統計（追蹤品項 × SA）
router.get('/sa-summary', async (req, res) => {
  try {
    const { period, branch } = req.query;
    const data = await getReportData('sa_summary', period, branch);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/tech-summary — 技師統計（追蹤品項 × 技師）
router.get('/tech-summary', async (req, res) => {
  try {
    const { period, branch } = req.query;
    const data = await getReportData('tech_summary', period, branch);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/sa-engine — SA 接待業績（引擎）
router.get('/sa-engine', async (req, res) => {
  try {
    const { period, branch } = req.query;

    const revenueData = await query(`
      SELECT
        service_advisor,
        COUNT(DISTINCT work_order) AS car_count,
        SUM(total_untaxed) AS total_revenue,
        SUM(CASE WHEN account_type NOT IN ('保固','內結','VSA') THEN total_untaxed ELSE 0 END) AS effective_revenue,
        SUM(engine_wage) AS engine_wage,
        SUM(bodywork_income + paint_income) AS bodywork_revenue,
        SUM(parts_income) AS parts_income,
        SUM(accessories_income) AS accessories_income,
        SUM(boutique_income) AS boutique_income,
        SUM(parts_cost) AS parts_cost
      FROM repair_income
      WHERE period = $1 AND branch = $2
      GROUP BY service_advisor
      HAVING service_advisor IS NOT NULL AND service_advisor != ''
      ORDER BY service_advisor
    `, [period, branch]);

    const targets = await query(`
      SELECT staff_name, metric_key, individual_target
      FROM v_individual_targets
      WHERE year = $1 AND month = $2 AND branch = $3 AND staff_type = 'SA'
    `, [
      parseInt(period?.substring(0, 4)),
      parseInt(period?.substring(4, 6)),
      branch
    ]);

    const targetMap = {};
    for (const t of targets.rows) {
      if (!targetMap[t.staff_name]) targetMap[t.staff_name] = {};
      targetMap[t.staff_name][t.metric_key] = parseFloat(t.individual_target);
    }

    const result = revenueData.rows.map(sa => ({
      ...sa,
      targets: targetMap[sa.service_advisor] || {},
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/sa-bodywork — SA 接待業績（鈑烤）
router.get('/sa-bodywork', async (req, res) => {
  try {
    const { period, branch } = req.query;

    const data = await query(`
      SELECT
        service_advisor,
        COUNT(DISTINCT work_order) AS car_count,
        SUM(bodywork_income + paint_income) AS bodywork_revenue,
        SUM(carwash_income) AS beauty_revenue,
        SUM(boutique_income) AS boutique_income
      FROM repair_income
      WHERE period = $1 AND branch = $2
        AND is_self_pay_bodywork = true
      GROUP BY service_advisor
      HAVING service_advisor IS NOT NULL AND service_advisor != ''
    `, [period, branch]);

    const trackingData = await getReportData('bodywork', period, branch);

    res.json({ performance: data.rows, tracking: trackingData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/gro-sales — GRO 銷售
router.get('/gro-sales', async (req, res) => {
  try {
    const { period, branch } = req.query;

    const data = await query(`
      SELECT
        sales_person,
        SUM(CASE WHEN part_type = '精品' THEN sale_price_untaxed ELSE 0 END) AS boutique_sales,
        SUM(promo_bonus) AS promo_bonus
      FROM parts_sales
      WHERE period = $1 AND branch = $2
        AND department = '售服部'
      GROUP BY sales_person
      HAVING sales_person IS NOT NULL AND sales_person != ''
    `, [period, branch]);

    const targets = await query(`
      SELECT staff_name, metric_key, individual_target
      FROM v_individual_targets
      WHERE year = $1 AND month = $2 AND branch = $3 AND staff_type = 'GRO'
    `, [
      parseInt(period?.substring(0, 4)),
      parseInt(period?.substring(4, 6)),
      branch
    ]);

    res.json({ sales: data.rows, targets: targets.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/beauty — 美容統計
router.get('/beauty', async (req, res) => {
  try {
    const { period, branch } = req.query;

    const beautyData = await query(`
      SELECT
        tp.tech_name_clean AS person_name,
        SUM(tp.wage) AS beauty_wage,
        SUM(tp.car_count_flag) AS beauty_car_count
      FROM tech_performance tp
      WHERE tp.period = $1 AND tp.branch = $2 AND tp.is_beauty = true
      GROUP BY tp.tech_name_clean
    `, [period, branch]);

    const trackingData = await getReportData('beauty', period, branch);

    res.json({ beauty: beautyData.rows, tracking: trackingData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/branch-overview — 四廠整合
router.get('/branch-overview', async (req, res) => {
  try {
    const { period } = req.query;
    const year = parseInt(period?.substring(0, 4));
    const month = parseInt(period?.substring(4, 6));
    const branches = ['AMA', 'AMC', 'AMD'];

    const kpiData = {};
    for (const branch of branches) {
      const r = await query(`
        SELECT
          COUNT(DISTINCT work_order) AS car_count,
          SUM(total_untaxed) AS total_revenue,
          SUM(CASE WHEN account_type NOT IN ('保固','內結','VSA') THEN total_untaxed ELSE 0 END) AS effective_revenue,
          SUM(bodywork_income + paint_income) AS bodywork_revenue,
          SUM(parts_income) AS parts_income,
          SUM(accessories_income) AS accessories_income,
          SUM(boutique_income) AS boutique_income,
          SUM(parts_cost) AS parts_cost,
          SUM(engine_wage) AS engine_wage
        FROM repair_income
        WHERE period = $1 AND branch = $2
      `, [period, branch]);
      kpiData[branch] = r.rows[0] || {};
    }

    kpiData['AM'] = {};
    const keys = Object.keys(kpiData['AMA'] || {});
    for (const k of keys) {
      kpiData['AM'][k] = branches.reduce((sum, b) => sum + parseFloat(kpiData[b]?.[k] || 0), 0);
    }

    const targets = await query(`
      SELECT branch, metric_key, target_value
      FROM annual_targets
      WHERE year = $1 AND month = $2
    `, [year, month]);

    const targetMap = {};
    for (const t of targets.rows) {
      if (!targetMap[t.branch]) targetMap[t.branch] = {};
      targetMap[t.branch][t.metric_key] = parseFloat(t.target_value);
    }

    const lastYear = await query(`
      SELECT branch, metric_key, actual_value
      FROM last_year_actuals
      WHERE year = $1 AND month = $2
    `, [year - 1, month]);

    const lastYearMap = {};
    for (const l of lastYear.rows) {
      if (!lastYearMap[l.branch]) lastYearMap[l.branch] = {};
      lastYearMap[l.branch][l.metric_key] = parseFloat(l.actual_value);
    }

    const trackingStats = await getBranchOverviewStats(period);

    const evStats = {};
    for (const branch of branches) {
      const r = await query(`
        SELECT
          is_ev,
          COUNT(*) AS count
        FROM business_query
        WHERE period = $1 AND branch = $2 AND settle_date IS NOT NULL
        GROUP BY is_ev
      `, [period, branch]);
      evStats[branch] = {};
      for (const row of r.rows) {
        evStats[branch][row.is_ev || '油車'] = parseInt(row.count);
      }
    }

    res.json({ kpi: kpiData, targets: targetMap, lastYear: lastYearMap, tracking: trackingStats, evStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
