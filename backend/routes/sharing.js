'use strict';
const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

function validateId(paramName) {
  return (req, res, next) => {
    const id = Number(req.params[paramName]);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: `Invalid ${paramName}` });
    }
    req[paramName] = id;
    next();
  };
}

// POST /api/notes/:id/share (Create/update share token)
router.post('/notes/:id/share', validateId('id'), (req, res, next) => {
  try {
    const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(req.id, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    // Locked notes cannot be shared
    if (note.lock_hash) {
      return res.status(400).json({ error: 'Locked notes cannot be shared' });
    }

    const { can_edit = 0 } = req.body || {};
    const canEditVal = can_edit ? 1 : 0;

    // Check if an existing share already exists for this note
    let share = db.prepare('SELECT * FROM shares WHERE note_id = ?').get(req.id);
    let token;

    if (share) {
      token = share.token;
      db.prepare("UPDATE shares SET can_edit = ? WHERE token = ?").run(canEditVal, token);
    } else {
      // Generate 32-byte cryptographically secure token
      token = crypto.randomBytes(32).toString('hex');
      db.prepare('INSERT INTO shares (token, note_id, can_edit) VALUES (?, ?, ?)').run(token, req.id, canEditVal);
    }

    const updated = db.prepare('SELECT * FROM shares WHERE token = ?').get(token);

    res.status(201).json({
      token: updated.token,
      note_id: updated.note_id,
      can_edit: Boolean(updated.can_edit),
      created_at: updated.created_at,
      share_url: `/api/public/notes/${updated.token}`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/notes/:id/share (View share info)
router.get('/notes/:id/share', validateId('id'), (req, res, next) => {
  try {
    const note = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(req.id, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const share = db.prepare('SELECT * FROM shares WHERE note_id = ?').get(req.id);
    if (!share) {
      return res.status(404).json({ error: 'Note is not shared' });
    }

    res.json({
      token: share.token,
      note_id: share.note_id,
      can_edit: Boolean(share.can_edit),
      created_at: share.created_at,
      share_url: `/api/public/notes/${share.token}`,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notes/:id/share (Revoke share)
router.delete('/notes/:id/share', validateId('id'), (req, res, next) => {
  try {
    const note = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(req.id, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const info = db.prepare('DELETE FROM shares WHERE note_id = ?').run(req.id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Note was not shared' });
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notes/:noteId/comments/:commentId (Owner deletes comment)
router.delete('/notes/:noteId/comments/:commentId', validateId('noteId'), validateId('commentId'), (req, res, next) => {
  try {
    const comment = db
      .prepare(
        `SELECT c.id, c.note_id, n.user_id
         FROM comments c
         JOIN notes n ON n.id = c.note_id
         WHERE c.id = ? AND c.note_id = ?`
      )
      .get(req.commentId, req.noteId);

    if (!comment || comment.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(req.commentId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
