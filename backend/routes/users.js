'use strict';

const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

// ---------------------------------------------------------------------------
// GET /api/users
// Optional query: ?role=student
// ---------------------------------------------------------------------------
router.get('/', requireAuth, async (req, res) => {
  const { role } = req.query;

  let sql = 'SELECT id, name, email, phone, role, created_at, batch_id, photo_url FROM users WHERE 1=1';
  const params = [];

  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }

  try {
    const rows = await query(sql, params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/users/:id
// ---------------------------------------------------------------------------
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const rows = await query(
      'SELECT id, name, email, phone, role, created_at, batch_id FROM users WHERE id = ? LIMIT 1',
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/users
// Body: { id, name, email, password_hash, phone, role, batch_id }
// ---------------------------------------------------------------------------
router.post('/', requireAdmin, async (req, res) => {
  const { id, name, email, password_hash, phone, role, batch_id } = req.body || {};

  if (!id || !name || !email || !password_hash || !role) {
    return res.status(400).json({ error: 'id, name, email, password_hash, and role are required' });
  }

  try {
    await mutate(
      `INSERT OR REPLACE INTO users (id, name, email, password_hash, phone, role, created_at, batch_id)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
      [id, name, email, password_hash, phone || null, role, batch_id || null]
    );

    return res.status(201).json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/users/:id
// Body: { name, email, phone, role, batch_id, password_hash? }
// ---------------------------------------------------------------------------
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, role, batch_id, password_hash } = req.body || {};

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'name, email, and role are required' });
  }

  try {
    await mutate(
      'UPDATE users SET name=?, email=?, phone=?, role=?, batch_id=? WHERE id=?',
      [name, email, phone || null, role, batch_id || null, id]
    );

    if (password_hash) {
      await mutate(
        'UPDATE users SET password_hash=? WHERE id=?',
        [password_hash, id]
      );
    }

    return res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/users/:id
// ---------------------------------------------------------------------------
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await mutate('DELETE FROM users WHERE id=?', [id]);
    return res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
