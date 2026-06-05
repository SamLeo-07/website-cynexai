'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// ─── Route Modules ────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/auth');
const usersRoutes        = require('./routes/users');
const coursesRoutes      = require('./routes/courses');
const lessonsRoutes      = require('./routes/lessons');
const enrollmentsRoutes  = require('./routes/enrollments');
const postsRoutes        = require('./routes/posts');
const mockTestsRoutes    = require('./routes/mockTests');
const recordingsRoutes   = require('./routes/recordings');
const attendanceRoutes   = require('./routes/attendance');
const doubtsRoutes       = require('./routes/doubts');
const certificatesRoutes = require('./routes/certificates');
const leaderboardRoutes  = require('./routes/leaderboard');
const announcementsRoutes = require('./routes/announcements');
const paymentsRoutes     = require('./routes/payments');
const supportRoutes      = require('./routes/support');
const faqsRoutes         = require('./routes/faqs');
const codingRoutes       = require('./routes/coding');
const miscRoutes         = require('./routes/misc');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ───────────────────────────────────────────────────────

// Set security HTTP headers
app.use(helmet());

// Configure CORS — only allow the frontend domain(s)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin '${origin}' is not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Global rate limiter — 200 requests per minute per IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
}));

// Stricter rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CynexAI Backend API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',          authLimiter, authRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/courses',       coursesRoutes);
app.use('/api/lessons',       lessonsRoutes);
app.use('/api/enrollments',   enrollmentsRoutes);
app.use('/api/posts',         postsRoutes);
app.use('/api',               mockTestsRoutes);   // /api/mock-tests, /api/mock-tests/*
app.use('/api',               recordingsRoutes);  // /api/batches, /api/recordings
app.use('/api/attendance',    attendanceRoutes);
app.use('/api/doubts',        doubtsRoutes);
app.use('/api',               certificatesRoutes);// /api/certificates, /api/certificate-credentials
app.use('/api/leaderboard',   leaderboardRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/payments',      paymentsRoutes);
app.use('/api/support',       supportRoutes);
app.use('/api/faqs',          faqsRoutes);
app.use('/api/coding',        codingRoutes);
app.use('/api',               miscRoutes);        // /api/badges, /api/jobs, /api/reviews, etc.

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Server Error]', err);
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[CynexAI API] Server running on http://localhost:${PORT}`);
  console.log(`[CynexAI API] Allowed origins: ${allowedOrigins.join(', ')}`);
});

module.exports = app;
