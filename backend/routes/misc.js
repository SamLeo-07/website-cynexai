const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

// ─── BADGES ──────────────────────────────────────────────────────────────────

// GET /api/badges/:studentId
// Requires auth
router.get('/badges/:studentId', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM badges WHERE student_id = ? ORDER BY earned_at DESC',
      [req.params.studentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/badges
// Requires admin
router.post('/badges', requireAdmin, async (req, res) => {
  try {
    const { id, student_id, name, description, icon, earned_at } = req.body;
    await mutate(
      `INSERT OR IGNORE INTO badges
        (id, student_id, name, description, icon, earned_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, student_id, name, description, icon, earned_at]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── JOBS ─────────────────────────────────────────────────────────────────────

// GET /api/jobs
// Public route
router.get('/jobs', async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM job_listings WHERE is_active = 1 ORDER BY posted_at DESC',
      []
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs
// Requires admin
router.post('/jobs', requireAdmin, async (req, res) => {
  try {
    const {
      id, title, company, location, type,
      description, requirements, apply_url, is_active
    } = req.body;
    await mutate(
      `INSERT OR REPLACE INTO job_listings
        (id, title, company, location, type, description, requirements, apply_url, is_active, posted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, title, company, location, type, description, requirements, apply_url, is_active]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/jobs/:id
// Requires admin
router.put('/jobs/:id', requireAdmin, async (req, res) => {
  try {
    const {
      title, company, location, type,
      description, requirements, apply_url, is_active
    } = req.body;
    await mutate(
      `UPDATE job_listings
       SET title=?, company=?, location=?, type=?, description=?, requirements=?, apply_url=?, is_active=?
       WHERE id=?`,
      [title, company, location, type, description, requirements, apply_url, is_active, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jobs/:id
// Requires admin
router.delete('/jobs/:id', requireAdmin, async (req, res) => {
  try {
    await mutate('DELETE FROM job_listings WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── REVIEWS / TESTIMONIALS ───────────────────────────────────────────────────

// GET /api/reviews
// Public route — optional ?includeHidden=true
router.get('/reviews', async (req, res) => {
  try {
    const { includeHidden } = req.query;
    let sql = 'SELECT * FROM testimonials';
    const params = [];

    if (includeHidden !== 'true') {
      sql += ' WHERE is_visible = 1';
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews
// Requires auth
router.post('/reviews', requireAuth, async (req, res) => {
  try {
    const { id, student_name, course, rating, review, is_visible } = req.body;
    await mutate(
      `INSERT OR REPLACE INTO testimonials
        (id, student_name, course, rating, review, is_visible, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, student_name, course, rating, review, is_visible]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reviews/:id
// Requires admin
router.put('/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const { student_name, course, rating, review, is_visible } = req.body;
    await mutate(
      `UPDATE testimonials
       SET student_name=?, course=?, rating=?, review=?, is_visible=?
       WHERE id=?`,
      [student_name, course, rating, review, is_visible, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reviews/:id
// Requires admin
router.delete('/reviews/:id', requireAdmin, async (req, res) => {
  try {
    await mutate('DELETE FROM testimonials WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/reviews/:id/visibility
// Requires admin
router.patch('/reviews/:id/visibility', requireAdmin, async (req, res) => {
  try {
    const { is_visible } = req.body;
    await mutate(
      'UPDATE testimonials SET is_visible=? WHERE id=?',
      [is_visible, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ONBOARDING CHECKLIST ─────────────────────────────────────────────────────

// GET /api/checklist/:studentId
// Requires auth
router.get('/checklist/:studentId', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM onboarding_checklist WHERE student_id = ?',
      [req.params.studentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/checklist/:studentId/:stepId
// Requires auth
router.patch('/checklist/:studentId/:stepId', requireAuth, async (req, res) => {
  try {
    const { is_done } = req.body;
    const { studentId, stepId } = req.params;
    await mutate(
      `INSERT OR REPLACE INTO onboarding_checklist
        (student_id, step_id, is_done, updated_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [studentId, stepId, is_done]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── USER PROGRESS ────────────────────────────────────────────────────────────

// GET /api/progress/:studentId
// Requires auth
router.get('/progress/:studentId', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM user_progress WHERE student_id = ? LIMIT 1',
      [req.params.studentId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/progress
// Requires auth
router.put('/progress', requireAuth, async (req, res) => {
  try {
    const { student_id, lesson_id, course_id, progress_percentage, completed } = req.body;
    await mutate(
      `INSERT OR REPLACE INTO user_progress
        (student_id, lesson_id, course_id, progress_percentage, completed, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [student_id, lesson_id, course_id, progress_percentage, completed]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
