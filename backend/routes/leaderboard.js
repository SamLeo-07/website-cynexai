const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

// ─── Leaderboard ──────────────────────────────────────────────────────────────

// GET /api/leaderboard
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM leaderboard ORDER BY score DESC, rank ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leaderboard
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { id, student_id, student_name, score, badge, course_id } = req.body;
    await mutate(
      `INSERT OR REPLACE INTO leaderboard
        (id, student_id, student_name, score, badge, course_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, student_id, student_name, score, badge, course_id]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leaderboard/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { student_name, score, badge } = req.body;
    await mutate(
      `UPDATE leaderboard
       SET student_name=?, score=?, badge=?
       WHERE id=?`,
      [student_name, score, badge, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leaderboard/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await mutate('DELETE FROM leaderboard WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
