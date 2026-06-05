'use strict';

const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');

// Allowed fields that can be dynamically updated via PUT
const UPDATABLE_FIELDS = [
  'title', 'description', 'instructor', 'duration',
  'level', 'price', 'is_visible', 'thumbnail_url', 'category',
];

// ---------------------------------------------------------------------------
// GET /api/courses
// Optional query: ?includeHidden=true
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  const includeHidden = req.query.includeHidden === 'true';

  let sql = 'SELECT * FROM courses';
  if (!includeHidden) {
    sql += ' WHERE is_visible = 1';
  }
  sql += ' ORDER BY created_at DESC';

  try {
    const rows = await query(sql, []);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/courses/:id
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const rows = await query('SELECT * FROM courses WHERE id = ? LIMIT 1', [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/courses
// Body: { id, title, description, instructor, duration, level, price, is_visible, thumbnail_url, category }
// ---------------------------------------------------------------------------
router.post('/', requireAdmin, async (req, res) => {
  const { id, title, description, instructor, duration, level, price, is_visible, thumbnail_url, category } = req.body || {};

  if (!id || !title) {
    return res.status(400).json({ error: 'id and title are required' });
  }

  try {
    await mutate(
      `INSERT OR REPLACE INTO courses
         (id, title, description, instructor, duration, level, price, is_visible, thumbnail_url, category, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        id,
        title,
        description || null,
        instructor || null,
        duration || null,
        level || null,
        price != null ? price : null,
        is_visible != null ? (is_visible ? 1 : 0) : 1,
        thumbnail_url || null,
        category || null,
      ]
    );

    return res.status(201).json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/courses/:id
// Body: partial course object – builds SET clause dynamically
// ---------------------------------------------------------------------------
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  const setClauses = [];
  const params = [];

  for (const field of UPDATABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      setClauses.push(`${field} = ?`);
      // Coerce boolean-like is_visible to integer
      if (field === 'is_visible') {
        params.push(body[field] ? 1 : 0);
      } else {
        params.push(body[field] ?? null);
      }
    }
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }

  params.push(id);

  try {
    await mutate(`UPDATE courses SET ${setClauses.join(', ')} WHERE id = ?`, params);
    return res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/courses/:id
// ---------------------------------------------------------------------------
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await mutate('DELETE FROM courses WHERE id = ?', [id]);
    return res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/courses/:id/visibility
// Body: { is_visible: boolean }
// ---------------------------------------------------------------------------
router.patch('/:id/visibility', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { is_visible } = req.body || {};

  if (is_visible === undefined) {
    return res.status(400).json({ error: 'is_visible is required' });
  }

  try {
    await mutate('UPDATE courses SET is_visible = ? WHERE id = ?', [is_visible ? 1 : 0, id]);
    return res.json({ success: true, id, is_visible: !!is_visible });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
