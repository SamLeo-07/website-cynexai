const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');

// GET /api/faqs
// Public route — optional ?includeHidden=true
router.get('/', async (req, res) => {
  try {
    const { includeHidden } = req.query;
    let sql = 'SELECT * FROM faqs';
    const params = [];

    if (includeHidden !== 'true') {
      sql += ' WHERE is_visible = 1';
    }

    sql += ' ORDER BY order_index ASC';

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/faqs
// Requires admin
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { id, question, answer, category, is_visible, order_index } = req.body;
    await mutate(
      `INSERT OR REPLACE INTO faqs
        (id, question, answer, category, is_visible, order_index, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, question, answer, category, is_visible, order_index]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/faqs/:id
// Requires admin
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { question, answer, category, is_visible, order_index } = req.body;
    const { id } = req.params;
    await mutate(
      `UPDATE faqs
       SET question=?, answer=?, category=?, is_visible=?, order_index=?
       WHERE id=?`,
      [question, answer, category, is_visible, order_index, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/faqs/:id
// Requires admin
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await mutate('DELETE FROM faqs WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
