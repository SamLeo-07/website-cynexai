const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

// GET /api/payments
// Optional query: ?studentId=xxx
// Requires auth
router.get('/', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.query;
    let sql = 'SELECT * FROM payments';
    const params = [];

    if (studentId) {
      sql += ' WHERE student_id = ?';
      params.push(studentId);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments
// Requires admin
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { id, student_id, total_amount, amount_paid, due_date, status } = req.body;
    await mutate(
      `INSERT OR REPLACE INTO payments
        (id, student_id, total_amount, amount_paid, due_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, student_id, total_amount, amount_paid, due_date, status]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payments/:id
// Partial payment update — Requires admin
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { total_amount, amount_paid, due_date, status } = req.body;
    const { id } = req.params;
    await mutate(
      `UPDATE payments
       SET total_amount=?, amount_paid=?, due_date=?, status=?
       WHERE id=?`,
      [total_amount, amount_paid, due_date, status, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payments/:id
// Requires admin
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await mutate('DELETE FROM payments WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/payments/:id/visibility
// Requires admin
router.patch('/:id/visibility', requireAdmin, async (req, res) => {
  try {
    const { is_visible } = req.body;
    await mutate(
      'UPDATE payments SET is_visible=? WHERE id=?',
      [is_visible, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
