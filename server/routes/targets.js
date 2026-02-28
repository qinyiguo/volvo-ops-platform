const express = require('express');
const router = express.Router();
const { query, transaction } = require('../models/db');

// GET /api/targets/annual
router.get('/annual', async (req, res) => {
  try {
    const { year, branch } = req.query;
    const result = await query(`
      SELECT * FROM annual_targets
      WHERE year = $1 AND ($2::text IS NULL OR branch = $2)
      ORDER BY branch, month, metric_key
    `, [parseInt(year), branch || null]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/targets/annual — 批次寫入年度目標
router.post('/annual', async (req, res) => {
  try {
    const { targets } = req.body;
    await transaction(async (client) => {
      for (const t of targets) {
        await client.query(`
          INSERT INTO annual_targets (year, branch, month, metric_key, metric_name, target_value, updated_by)
          VALUES ($1, $2, $3, $4, $5, $6, 'system')
          ON CONFLICT (year, branch, month, metric_key) DO UPDATE SET
            metric_name = EXCLUDED.metric_name,
            target_value = EXCLUDED.target_value,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
        `, [t.year, t.branch, t.month, t.metric_key, t.metric_name, t.target_value]);
      }
    });
    res.json({ success: true, count: targets.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/targets/monthly-weights
router.get('/monthly-weights', async (req, res) => {
  try {
    const { year, branch } = req.query;
    const result = await query(`
      SELECT * FROM monthly_weights WHERE year = $1 AND branch = $2 ORDER BY month
    `, [parseInt(year), branch]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/targets/monthly-weights
router.post('/monthly-weights', async (req, res) => {
  try {
    const { weights } = req.body;
    await transaction(async (client) => {
      for (const w of weights) {
        await client.query(`
          INSERT INTO monthly_weights (year, branch, month, weight)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (year, branch, month) DO UPDATE SET weight = EXCLUDED.weight, updated_at = NOW()
        `, [w.year, w.branch, w.month, w.weight]);
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/targets/staff-weights
router.get('/staff-weights', async (req, res) => {
  try {
    const { year, branch, staff_type } = req.query;
    const result = await query(`
      SELECT * FROM staff_weights
      WHERE year = $1 AND branch = $2 AND ($3::text IS NULL OR staff_type = $3)
      ORDER BY staff_type, staff_name
    `, [parseInt(year), branch, staff_type || null]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/targets/staff-weights
router.post('/staff-weights', async (req, res) => {
  try {
    const { weights } = req.body;
    await transaction(async (client) => {
      for (const w of weights) {
        await client.query(`
          INSERT INTO staff_weights (year, branch, staff_name, staff_type, weight, period_month)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (year, branch, staff_name, staff_type, period_month) DO UPDATE SET
            weight = EXCLUDED.weight, updated_at = NOW()
        `, [w.year, w.branch, w.staff_name, w.staff_type, w.weight, w.period_month || null]);
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/targets/preview — 預覽個人目標分配
router.get('/preview', async (req, res) => {
  try {
    const { year, month, branch } = req.query;
    const result = await query(`
      SELECT * FROM v_individual_targets
      WHERE year = $1 AND month = $2 AND branch = $3
      ORDER BY staff_type, staff_name, metric_key
    `, [parseInt(year), parseInt(month), branch]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/targets/last-year
router.get('/last-year', async (req, res) => {
  try {
    const { year, branch } = req.query;
    const result = await query(`
      SELECT * FROM last_year_actuals WHERE year = $1 AND ($2::text IS NULL OR branch = $2)
      ORDER BY branch, month, metric_key
    `, [parseInt(year), branch || null]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/last-year', async (req, res) => {
  try {
    const { actuals } = req.body;
    await transaction(async (client) => {
      for (const a of actuals) {
        await client.query(`
          INSERT INTO last_year_actuals (year, branch, month, metric_key, actual_value)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (year, branch, month, metric_key) DO UPDATE SET actual_value = EXCLUDED.actual_value
        `, [a.year, a.branch, a.month, a.metric_key, a.actual_value]);
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
