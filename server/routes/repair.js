const express = require('express');
const router = express.Router();
const { query } = require('../models/db');

// ===== 公開檢視 API（免登入）=====

// GET /api/repair/list — 明細查詢
router.get('/list', async (req, res) => {
  try {
    const { period, branch, account_type, service_advisor, page = 1, limit = 50 } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (period) { conditions.push(`period = $${idx++}`); params.push(period); }
    if (branch) { conditions.push(`branch = $${idx++}`); params.push(branch); }
    if (account_type) { conditions.push(`account_type = $${idx++}`); params.push(account_type); }
    if (service_advisor) { conditions.push(`service_advisor = $${idx++}`); params.push(service_advisor); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countResult = await query(`SELECT COUNT(*) FROM repair_income ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM repair_income ${where} ORDER BY settle_date DESC, id LIMIT $${idx++} OFFSET $${idx}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/repair/summary — 帳類彙總
router.get('/summary', async (req, res) => {
  try {
    const { period, branch } = req.query;
    const result = await query(`
      SELECT
        branch, account_type,
        COUNT(*) AS count,
        SUM(total_untaxed) AS total_untaxed,
        SUM(parts_income) AS parts_income,
        SUM(engine_wage) AS engine_wage,
        SUM(bodywork_income + paint_income) AS bodywork_revenue
      FROM repair_income
      WHERE period = $1 AND ($2::text IS NULL OR branch = $2)
      GROUP BY branch, account_type
      ORDER BY branch, account_type
    `, [period, branch || null]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
