const express = require('express');
const router = express.Router();
const { query } = require('../models/db');

// ===== 公開檢視 API（免登入）=====

// GET /api/parts/sales
router.get('/sales', async (req, res) => {
  try {
    const { period, branch, department, part_type, page = 1, limit = 50 } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (period) { conditions.push(`period = $${idx++}`); params.push(period); }
    if (branch) { conditions.push(`branch = $${idx++}`); params.push(branch); }
    if (department) { conditions.push(`department = $${idx++}`); params.push(department); }
    if (part_type) { conditions.push(`part_type = $${idx++}`); params.push(part_type); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countResult = await query(`SELECT COUNT(*) FROM parts_sales ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM parts_sales ${where} ORDER BY id DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/parts/summary
router.get('/summary', async (req, res) => {
  try {
    const { period, branch } = req.query;
    const result = await query(`
      SELECT
        branch, department, part_type,
        COUNT(*) AS count,
        SUM(sale_qty) AS total_qty,
        SUM(sale_price_untaxed) AS total_sales,
        SUM(cost_untaxed) AS total_cost,
        SUM(promo_bonus) AS total_bonus
      FROM parts_sales
      WHERE period = $1 AND ($2::text IS NULL OR branch = $2)
      GROUP BY branch, department, part_type
      ORDER BY branch, department, part_type
    `, [period, branch || null]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
