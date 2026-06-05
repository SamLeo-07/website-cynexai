const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

// ─── Attendance Sessions ──────────────────────────────────────────────────────

// GET /api/attendance/sessions  (optional ?courseId=xxx)
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.query;
    let sql = 'SELECT * FROM attendance_sessions';
    const params = [];
    if (courseId) {
      sql += ' WHERE course_id = ?';
      params.push(courseId);
    }
    sql += ' ORDER BY session_date DESC';
    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/sessions
router.post('/sessions', requireAdmin, async (req, res) => {
  try {
    const { id, course_id, session_date, topic, pin, batch_id } = req.body;
    await mutate(
      `INSERT OR REPLACE INTO attendance_sessions
        (id, course_id, session_date, topic, pin, batch_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, course_id, session_date, topic, pin, batch_id]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/attendance/sessions/:id
router.delete('/sessions/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await mutate('DELETE FROM attendance_records WHERE session_id=?', [id]);
    await mutate('DELETE FROM attendance_sessions WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Attendance Records ───────────────────────────────────────────────────────

// GET /api/attendance/records  (required ?sessionId=xxx)
router.get('/records', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId query parameter is required' });
    }
    const rows = await query(
      'SELECT * FROM attendance_records WHERE session_id = ?',
      [sessionId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/records
router.post('/records', requireAuth, async (req, res) => {
  try {
    const { id, session_id, student_id, student_name, marked_at } = req.body;
    await mutate(
      `INSERT OR IGNORE INTO attendance_records
        (id, session_id, student_id, student_name, marked_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [id, session_id, student_id, student_name, marked_at]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Student Attendance Summary ───────────────────────────────────────────────

// GET /api/attendance/student  (required ?studentId=xxx&courseId=xxx)
router.get('/student', requireAuth, async (req, res) => {
  try {
    const { studentId, courseId } = req.query;
    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'studentId and courseId query parameters are required' });
    }

    const [totalRow] = await query(
      'SELECT COUNT(*) AS total FROM attendance_sessions WHERE course_id = ?',
      [courseId]
    );
    const [attendedRow] = await query(
      `SELECT COUNT(*) AS attended
       FROM attendance_records ar
       INNER JOIN attendance_sessions s ON ar.session_id = s.id
       WHERE s.course_id = ? AND ar.student_id = ?`,
      [courseId, studentId]
    );

    const totalSessions = totalRow ? totalRow.total : 0;
    const attended = attendedRow ? attendedRow.attended : 0;
    const percentage = totalSessions > 0
      ? parseFloat(((attended / totalSessions) * 100).toFixed(2))
      : 0;

    res.json({ totalSessions, attended, percentage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Pin Verification ─────────────────────────────────────────────────────────

// POST /api/attendance/verify-pin
router.post('/verify-pin', requireAuth, async (req, res) => {
  try {
    const { pin, courseId } = req.body;
    const rows = await query(
      `SELECT * FROM attendance_sessions
       WHERE pin=? AND course_id=? AND session_date = date('now')
       LIMIT 1`,
      [pin, courseId]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No active session found for this PIN and course today' });
    }
    res.json({ session: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Aggregate Stats ──────────────────────────────────────────────────────────

// GET /api/attendance/stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const rows = await query(
      `SELECT
         s.id          AS session_id,
         s.session_date,
         s.course_id,
         COUNT(ar.id)  AS attended,
         (SELECT COUNT(*) FROM attendance_records WHERE session_id = s.id) AS total_students
       FROM attendance_sessions s
       LEFT JOIN attendance_records ar ON ar.session_id = s.id
       GROUP BY s.id
       ORDER BY s.session_date DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
