const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

// ─── Mock Tests ───────────────────────────────────────────────────────────────

// GET /api/mock-tests
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM mock_tests ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mock-tests
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { id, title, description, duration, course_id, batch_id, scheduled_date, is_active } = req.body;
    await mutate(
      `INSERT OR REPLACE INTO mock_tests
        (id, title, description, duration, course_id, batch_id, scheduled_date, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, title, description, duration, course_id, batch_id, scheduled_date, is_active]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/mock-tests/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { title, description, duration, course_id, batch_id, scheduled_date, is_active } = req.body;
    await mutate(
      `UPDATE mock_tests
       SET title=?, description=?, duration=?, course_id=?, batch_id=?, scheduled_date=?, is_active=?
       WHERE id=?`,
      [title, description, duration, course_id, batch_id, scheduled_date, is_active, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/mock-tests/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await mutate('DELETE FROM questions WHERE test_id=?', [id]);
    await mutate('DELETE FROM mock_tests WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Questions ────────────────────────────────────────────────────────────────

// GET /api/mock-tests/:testId/questions
router.get('/:testId/questions', requireAuth, async (req, res) => {
  try {
    const { testId } = req.params;
    const includeUnapproved = req.query.includeUnapproved === 'true';
    let sql = 'SELECT * FROM questions WHERE test_id = ?';
    if (!includeUnapproved) sql += ' AND is_approved = 1';
    sql += ' ORDER BY created_at ASC';
    const rows = await query(sql, [testId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mock-tests/:testId/questions
router.post('/:testId/questions', requireAdmin, async (req, res) => {
  try {
    const { testId } = req.params;
    const { id, question, options, correct_answer, explanation, is_approved } = req.body;
    const optionsStr = Array.isArray(options) ? JSON.stringify(options) : options;
    await mutate(
      `INSERT OR REPLACE INTO questions
        (id, test_id, question, options, correct_answer, explanation, is_approved, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, testId, question, optionsStr, correct_answer, explanation, is_approved]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/mock-tests/questions/:questionId
router.put('/questions/:questionId', requireAdmin, async (req, res) => {
  try {
    const { question, options, correct_answer, explanation, is_approved } = req.body;
    const optionsStr = Array.isArray(options) ? JSON.stringify(options) : options;
    await mutate(
      `UPDATE questions
       SET question=?, options=?, correct_answer=?, explanation=?, is_approved=?
       WHERE id=?`,
      [question, optionsStr, correct_answer, explanation, is_approved, req.params.questionId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/mock-tests/questions/:questionId
router.delete('/questions/:questionId', requireAdmin, async (req, res) => {
  try {
    await mutate('DELETE FROM questions WHERE id=?', [req.params.questionId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Results ──────────────────────────────────────────────────────────────────

// GET /api/mock-tests/results
router.get('/results', requireAdmin, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM test_results ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mock-tests/results/student/:studentId
router.get('/results/student/:studentId', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM test_results WHERE student_id = ? ORDER BY created_at DESC',
      [req.params.studentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mock-tests/results
router.post('/results', requireAuth, async (req, res) => {
  try {
    const { id, student_id, test_id, score, total_questions, time_taken, answers } = req.body;
    const answersStr = typeof answers === 'object' ? JSON.stringify(answers) : answers;
    await mutate(
      `INSERT INTO test_results
        (id, student_id, test_id, score, total_questions, time_taken, answers, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, student_id, test_id, score, total_questions, time_taken, answersStr]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
