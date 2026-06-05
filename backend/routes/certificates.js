const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

// ─── Certificates ─────────────────────────────────────────────────────────────

// GET /api/certificates  (optional ?studentId=xxx)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.query;
    let sql = 'SELECT * FROM certificates';
    const params = [];
    if (studentId) {
      sql += ' WHERE student_id = ?';
      params.push(studentId);
    }
    sql += ' ORDER BY issued_at DESC';
    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/certificates
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { id, student_id, student_name, course_id, course_title, issued_at } = req.body;
    await mutate(
      `INSERT OR IGNORE INTO certificates
        (id, student_id, student_name, course_id, course_title, issued_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, student_id, student_name, course_id, course_title, issued_at]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/certificates/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await mutate('DELETE FROM certificates WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/certificates/by-credential/:credentialId
router.get('/by-credential/:credentialId', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM certificates WHERE credential_id = ?',
      [req.params.credentialId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Certificate Credentials ──────────────────────────────────────────────────

// GET /api/certificate-credentials
router.get('/credentials', requireAdmin, async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, username, student_name, course_title, created_at FROM certificate_credentials'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/certificate-credentials
router.post('/credentials', requireAdmin, async (req, res) => {
  try {
    const { id, username, password, student_name, course_title } = req.body;
    await mutate(
      `INSERT OR REPLACE INTO certificate_credentials
        (id, username, password, student_name, course_title, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [id, username, password, student_name, course_title]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/certificate-credentials/verify  (public)
router.post('/credentials/verify', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const rows = await query(
      'SELECT * FROM certificate_credentials WHERE username=? AND password=? LIMIT 1',
      [username, password]
    );
    if (!rows || rows.length === 0) {
      return res.status(401).json({ valid: false, error: 'Invalid credentials' });
    }
    res.json({ valid: true, credentialId: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
