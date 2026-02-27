const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const { authenticate } = require('../middleware/auth');
const { query } = require('../models/db');

// GET /api/export/:type
router.get('/:type', authenticate, async (req, res) => {
  try {
    const { type } = req.params;
    const { period, branch } = req.query;
    let data, filename;

    switch (type) {
      case 'repair':
        const repair = await query(
          'SELECT * FROM repair_income WHERE period = $1 AND ($2::text IS NULL OR branch = $2) ORDER BY settle_date',
          [period, branch || null]
        );
        data = repair.rows;
        filename = `維修收入明細_${period}_${branch || '全部'}.xlsx`;
        break;

      case 'tech':
        const tech = await query(
          'SELECT * FROM tech_performance WHERE period = $1 AND ($2::text IS NULL OR branch = $2) ORDER BY dispatch_date',
          [period, branch || null]
        );
        data = tech.rows;
        filename = `技師績效_${period}_${branch || '全部'}.xlsx`;
        break;

      case 'parts':
        const parts = await query(
          'SELECT * FROM parts_sales WHERE period = $1 AND ($2::text IS NULL OR branch = $2) ORDER BY id',
          [period, branch || null]
        );
        data = parts.rows;
        filename = `零件銷售_${period}_${branch || '全部'}.xlsx`;
        break;

      default:
        return res.status(400).json({ error: `未知的匯出類型: ${type}` });
    }

    // 產生 Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
