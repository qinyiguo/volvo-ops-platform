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

// POST /api/auth/setup — 初始化管理者密碼（僅限 admin 帳號尚未設定時可用）
router.post('/setup', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: '密碼至少 6 碼' });
    }

    // 檢查 admin 是否存在且密碼仍為 placeholder
    const result = await query(
      "SELECT id, password_hash FROM users WHERE username = 'admin'"
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'admin 帳號不存在，請先執行 schema.sql' });
    }

    const admin = result.rows[0];
    // 只允許密碼為 placeholder 或無法驗證時才能 setup
    let alreadySet = false;
    try {
      alreadySet = await bcrypt.compare('test', admin.password_hash);
      // 如果能成功 compare（不論結果），表示 hash 格式正確，已設定過
      alreadySet = !admin.password_hash.includes('placeholder');
    } catch {
      // hash 格式不正確（placeholder），允許設定
      alreadySet = false;
    }

    if (alreadySet) {
      return res.status(403).json({ error: '密碼已設定，請用登入功能。如需重設請直接聯繫管理員。' });
    }

    // 用 bcryptjs 產生 hash
    const hash = await bcrypt.hash(password, 10);
    await query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE username = 'admin'",
      [hash]
    );

    res.json({ success: true, message: '管理者密碼已設定，請前往 /login 登入' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
