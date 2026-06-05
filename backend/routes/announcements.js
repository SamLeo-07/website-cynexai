const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

// GET /api/announcements
// Public route — optional ?activeOnly=true
router.get('/', async (req, res) => {
  try {
    const { activeOnly } = req.query;
    let sql = 'SELECT * FROM announcements';
    const params = [];

    if (activeOnly === 'true') {
      sql += ' WHERE is_active = 1';
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/announcements
// Requires admin
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { id, title, content, type, is_active, expires_at } = req.body;
    await mutate(
      `INSERT OR REPLACE INTO announcements
        (id, title, content, type, is_active, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, title, content, type, is_active, expires_at]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/announcements/:id
// Requires admin
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { title, content, type, is_active, expires_at } = req.body;
    const { id } = req.params;
    await mutate(
      `UPDATE announcements
       SET title=?, content=?, type=?, is_active=?, expires_at=?
       WHERE id=?`,
      [title, content, type, is_active, expires_at, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/announcements/:id
// Requires admin
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await mutate('DELETE FROM announcements WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/announcements/:id/status
// Requires admin
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { is_active } = req.body;
    await mutate(
      'UPDATE announcements SET is_active=? WHERE id=?',
      [is_active, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
