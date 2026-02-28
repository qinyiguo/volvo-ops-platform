const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../models/db');
const { authenticate, generateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: '帳號或密碼錯誤' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '帳號或密碼錯誤' });
    }
    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role, branch: user.branch }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, display_name, role, branch FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/setup/:password — 一次性設定 admin 密碼（直接在瀏覽器網址列輸入即可）
router.get('/setup/:password', async (req, res) => {
  try {
    const { password } = req.params;
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE username = 'admin'",
      [hash]
    );
    if (result.rowCount === 0) {
      return res.json({ error: 'admin 帳號不存在' });
    }
    res.json({ success: true, message: '密碼已設定完成，請到 /login 登入' });
  } catch (err) {
    res.json({ error: err.message });
  }
});

module.exports = router;
