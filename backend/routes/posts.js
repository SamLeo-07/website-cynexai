'use strict';

const express = require('express');
const router = express.Router();
const { query, mutate } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');

// ---------------------------------------------------------------------------
// GET /api/posts
// Query: ?page=1&pageSize=10&search=xxx&category=xxx&includeHidden=true
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
  const { search, category, includeHidden } = req.query;
  const showHidden = includeHidden === 'true';

  const conditions = ['1=1'];
  const params = [];
  const countParams = [];

  if (!showHidden) {
    conditions.push('is_visible = 1');
  }

  if (search) {
    conditions.push('(title LIKE ? OR content LIKE ?)');
    const likeVal = `%${search}%`;
    params.push(likeVal, likeVal);
    countParams.push(likeVal, likeVal);
  }

  if (category) {
    conditions.push('category = ?');
    params.push(category);
    countParams.push(category);
  }

  const whereClause = conditions.join(' AND ');
  const offset = (page - 1) * pageSize;

  const dataSql = `SELECT * FROM blog_posts WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) AS total FROM blog_posts WHERE ${whereClause}`;

  params.push(pageSize, offset);

  try {
    const [posts, countRows] = await Promise.all([
      query(dataSql, params),
      query(countSql, countParams),
    ]);

    const total = (countRows && countRows[0] && countRows[0].total) || 0;

    return res.json({ posts, total, page, pageSize });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/posts/:id
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const rows = await query('SELECT * FROM blog_posts WHERE id = ? LIMIT 1', [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/posts
// Body: { id, title, content, excerpt, author, category, tags, thumbnail_url, is_visible, slug }
// ---------------------------------------------------------------------------
router.post('/', requireAdmin, async (req, res) => {
  const {
    id, title, content, excerpt, author,
    category, tags, thumbnail_url, is_visible, slug,
  } = req.body || {};

  if (!id || !title) {
    return res.status(400).json({ error: 'id and title are required' });
  }

  try {
    await mutate(
      `INSERT OR REPLACE INTO blog_posts
         (id, title, content, excerpt, author, category, tags, thumbnail_url, is_visible, slug, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        id,
        title,
        content || null,
        excerpt || null,
        author || null,
        category || null,
        tags || null,
        thumbnail_url || null,
        is_visible != null ? (is_visible ? 1 : 0) : 1,
        slug || null,
      ]
    );

    return res.status(201).json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/posts/:id
// Body: partial post object
// ---------------------------------------------------------------------------
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    title, content, excerpt, author,
    category, tags, thumbnail_url, is_visible, slug,
  } = req.body || {};

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  try {
    await mutate(
      `UPDATE blog_posts
       SET title=?, content=?, excerpt=?, author=?, category=?, tags=?, thumbnail_url=?, is_visible=?, slug=?
       WHERE id=?`,
      [
        title,
        content || null,
        excerpt || null,
        author || null,
        category || null,
        tags || null,
        thumbnail_url || null,
        is_visible != null ? (is_visible ? 1 : 0) : 1,
        slug || null,
        id,
      ]
    );

    return res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/posts/:id
// ---------------------------------------------------------------------------
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await mutate('DELETE FROM blog_posts WHERE id=?', [id]);
    return res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/posts/:id/visibility
// Body: { is_visible: boolean }
// ---------------------------------------------------------------------------
router.patch('/:id/visibility', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { is_visible } = req.body || {};

  if (is_visible === undefined) {
    return res.status(400).json({ error: 'is_visible is required' });
  }

  try {
    await mutate(
      'UPDATE blog_posts SET is_visible=? WHERE id=?',
      [is_visible ? 1 : 0, id]
    );

    return res.json({ success: true, id, is_visible: !!is_visible });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
