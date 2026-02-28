const express = require('express');
const router = express.Router();
const { query } = require('../models/db');

// ===== 公開檢視 API（免登入）=====

// GET /api/tech/list
router.get('/list', async (req, res) => {
  try {
    const { period, branch, tech_name, page = 1, limit = 50 } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (period) { conditions.push(`period = $${idx++}`); params.push(period); }
    if (branch) { conditions.push(`branch = $${idx++}`); params.push(branch); }
    if (tech_name) { conditions.push(`tech_name_clean = $${idx++}`); params.push(tech_name); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countResult = await query(`SELECT COUNT(*) FROM tech_performance ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM tech_performance ${where} ORDER BY dispatch_date DESC, id LIMIT $${idx++} OFFSET $${idx}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tech/ranking — 技師排名
router.get('/ranking', async (req, res) => {
  try {
    const { period, branch } = req.query;
    const result = await query(`
      SELECT
        tech_name_clean,
        SUM(car_count_flag) AS car_count,
        SUM(standard_hours) AS total_hours,
        SUM(wage) AS total_wage,
        SUM(CASE WHEN is_beauty THEN wage ELSE 0 END) AS beauty_wage
      FROM tech_performance
      WHERE period = $1 AND ($2::text IS NULL OR branch = $2)
      GROUP BY tech_name_clean
      ORDER BY total_wage DESC
    `, [period, branch || null]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
