const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, adminOnly } = require('../middleware/auth');
const { processUpload } = require('../services/uploadParser');
const { query } = require('../models/db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// POST /api/upload/files — 多檔上傳
router.post('/files', authenticate, adminOnly, upload.array('files', 8), async (req, res) => {
  try {
const results = [];
for (const file of req.files) {
  try {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const result = await processUpload(file.buffer, file.originalname, req.user.username);
    results.push({ filename: file.originalname, status: 'success', ...result });
  } catch (err) {
        results.push({ filename: file.originalname, status: 'error', error: err.message });
        // 記錄失敗
        await query(`
          INSERT INTO upload_history (file_name, file_type, status, error_message, uploaded_by)
          VALUES ($1, 'unknown', 'error', $2, $3)
        `, [file.originalname, err.message, req.user.username]);
      }
    }
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload/parts-catalog — 零配件對照表
router.post('/parts-catalog', authenticate, adminOnly, upload.single('file'), async (req, res) => {
  try {
    const result = await processUpload(req.file.buffer, '零配件比對_upload.xlsx', req.user.username);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/upload/history — 上傳歷史
router.get('/history', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM upload_history ORDER BY created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
