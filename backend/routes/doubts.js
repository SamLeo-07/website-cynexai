const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

// ─── Doubts (Questions) ───────────────────────────────────────────────────────

// GET /api/doubts  (optional ?courseId=xxx)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.query;
    let sql = 'SELECT * FROM doubt_questions';
    const params = [];
    if (courseId) {
      sql += ' WHERE course_id = ?';
      params.push(courseId);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/doubts
router.post('/', requireAuth, async (req, res) => {
  try {
    const { id, course_id, student_id, student_name, question, tags } = req.body;
    const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : tags;
    await mutate(
      `INSERT INTO doubt_questions
        (id, course_id, student_id, student_name, question, tags, upvotes, is_resolved, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, datetime('now'))`,
      [id, course_id, student_id, student_name, question, tagsStr]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/doubts/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await mutate('DELETE FROM doubt_answers WHERE question_id=?', [id]);
    await mutate('DELETE FROM doubt_questions WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/doubts/:id/resolve
router.patch('/:id/resolve', requireAdmin, async (req, res) => {
  try {
    await mutate('UPDATE doubt_questions SET is_resolved=1 WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/doubts/:id/upvote
router.patch('/:id/upvote', requireAuth, async (req, res) => {
  try {
    await mutate(
      'UPDATE doubt_questions SET upvotes = upvotes + 1 WHERE id=?',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Doubt Answers ────────────────────────────────────────────────────────────

// GET /api/doubts/:questionId/answers
router.get('/:questionId/answers', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM doubt_answers WHERE question_id = ? ORDER BY upvotes DESC',
      [req.params.questionId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/doubts/:questionId/answers
router.post('/:questionId/answers', requireAuth, async (req, res) => {
  try {
    const { questionId } = req.params;
    const { id, student_id, student_name, answer, is_instructor } = req.body;
    await mutate(
      `INSERT INTO doubt_answers
        (id, question_id, student_id, student_name, answer, is_instructor, upvotes, is_accepted, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, datetime('now'))`,
      [id, questionId, student_id, student_name, answer, is_instructor ? 1 : 0]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/doubts/answers/:answerId/accept
router.patch('/answers/:answerId/accept', requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.body;
    await mutate('UPDATE doubt_answers SET is_accepted=1 WHERE id=?', [req.params.answerId]);
    if (questionId) {
      await mutate('UPDATE doubt_questions SET is_resolved=1 WHERE id=?', [questionId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/doubts/answers/:answerId/upvote
router.patch('/answers/:answerId/upvote', requireAuth, async (req, res) => {
  try {
    await mutate(
      'UPDATE doubt_answers SET upvotes = upvotes + 1 WHERE id=?',
      [req.params.answerId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
