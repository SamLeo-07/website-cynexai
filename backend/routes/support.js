const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

// GET /api/support/tickets
// Optional query: ?studentId=xxx
// Requires auth
router.get('/tickets', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.query;
    let sql = 'SELECT * FROM support_tickets';
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

// POST /api/support/tickets
// Requires auth
router.post('/tickets', requireAuth, async (req, res) => {
  try {
    const { id, student_id, category, description, status } = req.body;
    await mutate(
      `INSERT INTO support_tickets
        (id, student_id, category, description, status, created_at)
       VALUES (?, ?, ?, ?, 'open', datetime('now'))`,
      [id, student_id, category, description, status]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/support/tickets/:id/status
// Requires admin
router.patch('/tickets/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    await mutate(
      'UPDATE support_tickets SET status=? WHERE id=?',
      [status, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/support/tickets/:ticketId/replies
// Requires auth
router.get('/tickets/:ticketId/replies', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM support_replies WHERE ticket_id = ? ORDER BY created_at ASC',
      [req.params.ticketId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/support/tickets/:ticketId/replies
// Requires auth
router.post('/tickets/:ticketId/replies', requireAuth, async (req, res) => {
  try {
    const { id, author_name, message, is_admin_reply } = req.body;
    const { ticketId } = req.params;
    await mutate(
      `INSERT INTO support_replies
        (id, ticket_id, author_name, message, is_admin_reply, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [id, ticketId, author_name, message, is_admin_reply]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
