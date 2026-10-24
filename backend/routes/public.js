'use strict';
const express = require('express');
const db = require('../db');
const { getNoteTags } = require('../services/noteService');
const { publicRateLimit } = require('../middleware/publicRateLimit');

const router = express.Router();

// Apply public rate limiting to all public endpoints
router.use(publicRateLimit);

function getShareAndNote(token) {
  if (!token || typeof token !== 'string') return null;

  const share = db.prepare('SELECT * FROM shares WHERE token = ?').get(token);
  if (!share) return null;

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(share.note_id);
  if (!note || note.status === 'trashed') return null;

  return { share, note };
}

// GET /api/public/notes/:token (Public note view - NO OWNER DATA LEAKED)
router.get('/notes/:token', (req, res, next) => {
  try {
    const data = getShareAndNote(req.params.token);
    if (!data) {
      return res.status(404).json({ error: 'Shared note not found' });
    }

    const { share, note } = data;
    const tags = getNoteTags(db, note.id);

    // Strictly omit user_id, lock_hash, and any owner information
    const publicNote = {
      id: note.id,
      title: note.title,
      body: note.body,
      type: note.type,
      color: note.color,
      tags,
      can_edit: Boolean(share.can_edit),
      created_at: note.created_at,
      updated_at: note.updated_at,
    };

    res.json(publicNote);
  } catch (err) {
    next(err);
  }
});

// GET /api/public/notes/:token/comments (Public list comments)
router.get('/notes/:token/comments', (req, res, next) => {
  try {
    const data = getShareAndNote(req.params.token);
    if (!data) {
      return res.status(404).json({ error: 'Shared note not found' });
    }

    const comments = db
      .prepare('SELECT id, author, text, created_at FROM comments WHERE note_id = ? ORDER BY created_at ASC')
      .all(data.note.id);

    res.json(comments);
  } catch (err) {
    next(err);
  }
});

// POST /api/public/notes/:token/comments (Public post comment)
router.post('/notes/:token/comments', (req, res, next) => {
  try {
    const data = getShareAndNote(req.params.token);
    if (!data) {
      return res.status(404).json({ error: 'Shared note not found' });
    }

    const { author = 'Anonymous', text } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    if (text.trim().length > 2000) {
      return res.status(400).json({ error: 'Comment text must be 2000 characters or fewer' });
    }

    const cleanAuthor = typeof author === 'string' && author.trim() ? author.trim().slice(0, 50) : 'Anonymous';

    const info = db
      .prepare('INSERT INTO comments (note_id, author, text) VALUES (?, ?, ?)')
      .run(data.note.id, cleanAuthor, text.trim());

    const created = db.prepare('SELECT id, author, text, created_at FROM comments WHERE id = ?').get(info.lastInsertRowid);

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
