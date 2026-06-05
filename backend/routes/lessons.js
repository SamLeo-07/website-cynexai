'use strict';

const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

// ---------------------------------------------------------------------------
// GET /api/lessons
// Required query: ?courseId=xxx
// ---------------------------------------------------------------------------
router.get('/', requireAuth, async (req, res) => {
  const { courseId } = req.query;

  if (!courseId) {
    return res.status(400).json({ error: 'courseId query parameter is required' });
  }

  try {
    const rows = await query(
      'SELECT * FROM lessons WHERE course_id = ? ORDER BY day_number ASC',
      [courseId]
    );

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/lessons
// Body: { id, course_id, title, description, video_url, day_number, duration }
// ---------------------------------------------------------------------------
router.post('/', requireAdmin, async (req, res) => {
  const { id, course_id, title, description, video_url, day_number, duration } = req.body || {};

  if (!id || !course_id || !title) {
    return res.status(400).json({ error: 'id, course_id, and title are required' });
  }

  try {
    await mutate(
      `INSERT OR REPLACE INTO lessons
         (id, course_id, title, description, video_url, day_number, duration, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        id,
        course_id,
        title,
        description || null,
        video_url || null,
        day_number != null ? day_number : null,
        duration || null,
      ]
    );

    return res.status(201).json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/lessons/:id
// Body: partial lesson object
// ---------------------------------------------------------------------------
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, description, video_url, day_number, duration } = req.body || {};

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  try {
    await mutate(
      'UPDATE lessons SET title=?, description=?, video_url=?, day_number=?, duration=? WHERE id=?',
      [
        title,
        description || null,
        video_url || null,
        day_number != null ? day_number : null,
        duration || null,
        id,
      ]
    );

    return res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/lessons/:id
// ---------------------------------------------------------------------------
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await mutate('DELETE FROM lessons WHERE id=?', [id]);
    return res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
