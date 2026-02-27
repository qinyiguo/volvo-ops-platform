const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authenticate, adminOnly } = require('../middleware/auth');
const { query } = require('../models/db');

// ======================== 使用者管理 ========================
router.get('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const result = await query('SELECT id, username, display_name, role, branch, is_active, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const { username, password, display_name, role, branch } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (username, password_hash, display_name, role, branch) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [username, hash, display_name, role || 'user', branch]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/users/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { display_name, role, branch, is_active, password } = req.body;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.params.id]);
    }
    await query(
      'UPDATE users SET display_name=$1, role=$2, branch=$3, is_active=$4, updated_at=NOW() WHERE id=$5',
      [display_name, role, branch, is_active, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ======================== 人員據點對照 ========================
router.get('/staff-map', authenticate, async (req, res) => {
  try {
    const { branch, staff_type } = req.query;
    const result = await query(`
      SELECT * FROM staff_branch_map
      WHERE ($1::text IS NULL OR branch = $1) AND ($2::text IS NULL OR staff_type = $2)
      ORDER BY branch, staff_type, staff_name
    `, [branch || null, staff_type || null]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/staff-map', authenticate, adminOnly, async (req, res) => {
  try {
    const { staff_name, staff_code, staff_type, branch, department } = req.body;
    const result = await query(`
      INSERT INTO staff_branch_map (staff_name, staff_code, staff_type, branch, department)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (staff_name, branch) DO UPDATE SET
        staff_code=EXCLUDED.staff_code, staff_type=EXCLUDED.staff_type,
        department=EXCLUDED.department, updated_at=NOW()
      RETURNING id
    `, [staff_name, staff_code, staff_type, branch, department || '售服部']);
    res.json({ id: result.rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/staff-map/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { staff_name, staff_code, staff_type, branch, department, is_active } = req.body;
    await query(`
      UPDATE staff_branch_map SET staff_name=$1, staff_code=$2, staff_type=$3, branch=$4,
        department=$5, is_active=$6, updated_at=NOW() WHERE id=$7
    `, [staff_name, staff_code, staff_type, branch, department, is_active, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ======================== 零件對照表 ========================
router.get('/parts-catalog', authenticate, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '';
    const params = [parseInt(limit), offset];
    if (search) {
      where = `WHERE part_number ILIKE $3 OR part_name ILIKE $3`;
      params.push(`%${search}%`);
    }
    const result = await query(`SELECT * FROM parts_catalog ${where} ORDER BY part_number LIMIT $1 OFFSET $2`, params);
    const countResult = await query(`SELECT COUNT(*) FROM parts_catalog ${where}`, search ? [`%${search}%`] : []);
    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ======================== 工時主檔 ========================
router.get('/work-hours', authenticate, async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM work_hour_master';
    const params = [];
    if (search) {
      sql += ' WHERE work_code ILIKE $1 OR work_name ILIKE $1';
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY work_code LIMIT 200';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ======================== 追蹤品項設定 ========================
router.get('/tracking-items', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM tracking_items ORDER BY sort_order, id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/tracking-items', authenticate, adminOnly, async (req, res) => {
  try {
    const {
      item_name, item_category, count_method, match_rules,
      show_in_sa_summary, show_in_tech_summary, show_in_beauty,
      show_in_bodywork, show_in_branch_overview, sort_order
    } = req.body;
    const result = await query(`
      INSERT INTO tracking_items (item_name, item_category, count_method, match_rules,
        show_in_sa_summary, show_in_tech_summary, show_in_beauty, show_in_bodywork,
        show_in_branch_overview, sort_order)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [
      item_name, item_category || '通用', count_method || '數量',
      JSON.stringify(match_rules || []),
      show_in_sa_summary || false, show_in_tech_summary || false,
      show_in_beauty || false, show_in_bodywork || false,
      show_in_branch_overview || false, sort_order || 0
    ]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/tracking-items/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const {
      item_name, item_category, count_method, match_rules,
      show_in_sa_summary, show_in_tech_summary, show_in_beauty,
      show_in_bodywork, show_in_branch_overview, is_active, sort_order
    } = req.body;
    await query(`
      UPDATE tracking_items SET
        item_name=$1, item_category=$2, count_method=$3, match_rules=$4,
        show_in_sa_summary=$5, show_in_tech_summary=$6, show_in_beauty=$7,
        show_in_bodywork=$8, show_in_branch_overview=$9, is_active=$10, sort_order=$11,
        updated_at=NOW()
      WHERE id=$12
    `, [
      item_name, item_category, count_method, JSON.stringify(match_rules || []),
      show_in_sa_summary, show_in_tech_summary, show_in_beauty,
      show_in_bodywork, show_in_branch_overview, is_active, sort_order, req.params.id
    ]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/tracking-items/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await query('UPDATE tracking_items SET is_active = false, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ======================== 促銷獎金參數 ========================
router.get('/promo-rules', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM promo_rules ORDER BY applicable_types, discount_min');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/promo-rules', authenticate, adminOnly, async (req, res) => {
  try {
    const { rule_name, applicable_types, discount_min, discount_max, bonus_rate, effective_from, effective_to } = req.body;
    const result = await query(`
      INSERT INTO promo_rules (rule_name, applicable_types, discount_min, discount_max, bonus_rate, effective_from, effective_to)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [rule_name, applicable_types, discount_min, discount_max, bonus_rate, effective_from, effective_to]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/promo-rules/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { rule_name, applicable_types, discount_min, discount_max, bonus_rate, is_active, effective_from, effective_to } = req.body;
    await query(`
      UPDATE promo_rules SET rule_name=$1, applicable_types=$2, discount_min=$3, discount_max=$4,
        bonus_rate=$5, is_active=$6, effective_from=$7, effective_to=$8, updated_at=NOW()
      WHERE id=$9
    `, [rule_name, applicable_types, discount_min, discount_max, bonus_rate, is_active, effective_from, effective_to, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
