'use strict';

const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

// ---------------------------------------------------------------------------
// GET /api/enrollments
// Optional query: ?studentId=xxx
// ---------------------------------------------------------------------------
router.get('/', requireAuth, async (req, res) => {
  const { studentId } = req.query;

  let sql = 'SELECT * FROM enrollments WHERE 1=1';
  const params = [];

  if (studentId) {
    sql += ' AND student_id = ?';
    params.push(studentId);
  }

  sql += ' ORDER BY created_at DESC';

  try {
    const rows = await query(sql, params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/enrollments
// Body: { id, student_id, course_id, status, progress_percentage }
// ---------------------------------------------------------------------------
router.post('/', requireAuth, async (req, res) => {
  const { id, student_id, course_id, status, progress_percentage } = req.body || {};

  if (!id || !student_id || !course_id) {
    return res.status(400).json({ error: 'id, student_id, and course_id are required' });
  }

  try {
    await mutate(
      `INSERT OR REPLACE INTO enrollments
         (id, student_id, course_id, status, progress_percentage, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        id,
        student_id,
        course_id,
        status || 'active',
        progress_percentage != null ? progress_percentage : 0,
      ]
    );

    const { pushToGoogleSheet } = require('../lib/googleSheetsSync');
    pushToGoogleSheet('ENROLLMENT', {
      enrollmentId: id,
      studentId: student_id,
      courseId: course_id,
      status: status || 'active',
      progress: progress_percentage != null ? progress_percentage : 0
    });

    return res.status(201).json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/enrollments/:id/progress
// Body: { progress: number }
// ---------------------------------------------------------------------------
router.put('/:id/progress', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { progress } = req.body || {};

  if (progress === undefined || progress === null) {
    return res.status(400).json({ error: 'progress is required' });
  }

  const progressValue = Number(progress);
  if (isNaN(progressValue) || progressValue < 0 || progressValue > 100) {
    return res.status(400).json({ error: 'progress must be a number between 0 and 100' });
  }

  try {
    await mutate(
      'UPDATE enrollments SET progress_percentage=? WHERE id=?',
      [progressValue, id]
    );

    return res.json({ success: true, id, progress_percentage: progressValue });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/enrollments/:id
// ---------------------------------------------------------------------------
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await mutate('DELETE FROM enrollments WHERE id=?', [id]);
    return res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
