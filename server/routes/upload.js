const express = require('express');
const router = express.Router();
const multer = require('multer');
const { processUpload } = require('../services/uploadParser');
const { query } = require('../models/db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// POST /api/upload/files — 多檔上傳（免登入）
router.post('/files', upload.array('files', 8), async (req, res) => {
  try {
    const results = [];
    for (const file of req.files) {
      try {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const result = await processUpload(file.buffer, file.originalname, 'system');
        results.push({ filename: file.originalname, status: 'success', ...result });
      } catch (err) {
        results.push({ filename: file.originalname, status: 'error', error: err.message });
        await query(`
          INSERT INTO upload_history (file_name, file_type, status, error_message, uploaded_by)
          VALUES ($1, 'unknown', 'error', $2, 'system')
        `, [file.originalname, err.message]);
      }
    }
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload/parts-catalog — 零配件對照表
router.post('/parts-catalog', upload.single('file'), async (req, res) => {
  try {
    const result = await processUpload(req.file.buffer, '零配件比對_upload.xlsx', 'system');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/upload/history — 上傳歷史
router.get('/history', async (req, res) => {
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
