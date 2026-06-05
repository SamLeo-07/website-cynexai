'use strict';

const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');
const { signToken, requireAuth } = require('../lib/auth');

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter for admin login
// Map<ip, { count: number, resetAt: number }>
// ---------------------------------------------------------------------------
const adminLoginAttempts = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkAdminRateLimit(ip) {
  const now = Date.now();
  let record = adminLoginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    adminLoginAttempts.set(ip, record);
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false; // rate-limited
  }

  record.count += 1;
  return true; // allowed
}

function resetAdminRateLimit(ip) {
  adminLoginAttempts.delete(ip);
}

// ---------------------------------------------------------------------------
// POST /api/auth/student/login
// ---------------------------------------------------------------------------
router.post('/student/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const rows = await query(
      `SELECT id, name, email, role FROM users
       WHERE email = ? AND password_hash = ? AND role = 'student'
       LIMIT 1`,
      [email, password]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role });
    return res.json({ token, user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/admin/login
// ---------------------------------------------------------------------------
router.post('/admin/login', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  if (!checkAdminRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
  }

  const { password } = req.body || {};

  if (!password) {
    return res.status(400).json({ error: 'password is required' });
  }

  try {
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Successful login – clear rate-limit counter for this IP
    resetAdminRateLimit(ip);

    const token = signToken({ id: 'admin', role: 'admin' }, '24h');
    return res.json({ token });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/verify
// ---------------------------------------------------------------------------
router.get('/verify', requireAuth, (req, res) => {
  return res.json({ valid: true, user: req.user });
});

module.exports = router;
