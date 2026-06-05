const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

// GET /api/coding/problems
// Optional query: ?courseId=xxx
// Requires auth
router.get('/problems', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.query;
    let sql = 'SELECT * FROM coding_problems';
    const params = [];

    if (courseId) {
      sql += ' WHERE course_id = ?';
      params.push(courseId);
    }

    sql += ' ORDER BY difficulty ASC';

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/coding/problems
// Requires admin
router.post('/problems', requireAdmin, async (req, res) => {
  try {
    const {
      id, title, description, difficulty, course_id,
      examples, constraints, starter_code, solution
    } = req.body;
    await mutate(
      `INSERT OR REPLACE INTO coding_problems
        (id, title, description, difficulty, course_id, examples, constraints, starter_code, solution, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, title, description, difficulty, course_id, examples, constraints, starter_code, solution]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/coding/problems/:id
// Requires admin
router.put('/problems/:id', requireAdmin, async (req, res) => {
  try {
    const {
      title, description, difficulty, course_id,
      examples, constraints, starter_code, solution
    } = req.body;
    const { id } = req.params;
    await mutate(
      `UPDATE coding_problems
       SET title=?, description=?, difficulty=?, course_id=?, examples=?, constraints=?, starter_code=?, solution=?
       WHERE id=?`,
      [title, description, difficulty, course_id, examples, constraints, starter_code, solution, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/coding/problems/:id
// Requires admin
router.delete('/problems/:id', requireAdmin, async (req, res) => {
  try {
    await mutate('DELETE FROM coding_problems WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/coding/submissions
// Optional query: ?studentId=xxx
// Requires auth
router.get('/submissions', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.query;
    let sql;
    const params = [];

    if (studentId) {
      sql = 'SELECT * FROM code_submissions WHERE student_id = ? ORDER BY created_at DESC';
      params.push(studentId);
    } else {
      // Admin-level: all submissions
      sql = 'SELECT * FROM code_submissions ORDER BY created_at DESC';
    }

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/coding/submissions
// Requires auth
router.post('/submissions', requireAuth, async (req, res) => {
  try {
    const { id, student_id, problem_id, code, language, status, passed_tests } = req.body;
    await mutate(
      `INSERT INTO code_submissions
        (id, student_id, problem_id, code, language, status, passed_tests, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, student_id, problem_id, code, language, status, passed_tests]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/coding/solved/:studentId
// Returns distinct problem IDs with accepted submissions for a student
// Requires auth
router.get('/solved/:studentId', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT DISTINCT problem_id FROM code_submissions
       WHERE student_id=? AND status='accepted'`,
      [req.params.studentId]
    );
    const problemIds = rows.map((r) => r.problem_id);
    res.json({ problemIds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
