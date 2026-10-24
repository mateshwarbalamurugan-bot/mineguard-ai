'use strict';
const express = require('express');
const db = require('../db');
const { getNoteTags, formatNote } = require('../services/noteService');
const { checkDueReminders } = require('../services/reminderService');

const router = express.Router();

function validateId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  req.noteId = id;
  next();
}

// GET /api/reminders/due
router.get('/due', (req, res, next) => {
  try {
    // Check reminders to ensure database status is current
    checkDueReminders();

    const notes = db
      .prepare(
        `SELECT * FROM notes
         WHERE user_id = ?
           AND status != 'trashed'
           AND reminder_at IS NOT NULL
           AND datetime(reminder_at) <= datetime('now')
         ORDER BY datetime(reminder_at) ASC`
      )
      .all(req.user.id);

    const formatted = notes.map((note) => {
      const tags = getNoteTags(db, note.id);
      return formatNote(note, tags);
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// POST /api/reminders/:id/dismiss
router.post('/:id/dismiss', validateId, (req, res, next) => {
  try {
    const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(req.noteId, req.user.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    db.prepare(
      "UPDATE notes SET reminder_at = NULL, reminded_at = NULL, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
    ).run(req.noteId, req.user.id);

    const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.noteId);
    const tags = getNoteTags(db, req.noteId);

    res.json({
      success: true,
      note: formatNote(updated, tags),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
