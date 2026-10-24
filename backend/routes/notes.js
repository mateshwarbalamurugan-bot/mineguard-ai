'use strict';
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const {
  ALLOWED_COLORS,
  ALLOWED_STATUSES,
  ALLOWED_TYPES,
  normalizeTags,
  syncNoteTags,
  getNoteTags,
  formatNote,
  validateChecklistBody,
} = require('../services/noteService');
const {
  validatePinFormat,
  checkLockout,
  recordFailure,
  recordSuccess,
} = require('../services/lockService');

const router = express.Router();

function validateId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  req.noteId = id;
  next();
}

function getNoteForUser(noteId, userId) {
  return db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId);
}

// -------------------------------------------------------------
// Collection Routes
// -------------------------------------------------------------

// DELETE /api/notes/trash (Empty trash) - MUST BE BEFORE /:id
router.delete('/trash', (req, res, next) => {
  try {
    db.prepare("DELETE FROM notes WHERE user_id = ? AND status = 'trashed'").run(req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notes/reorder - MUST BE BEFORE /:id
router.patch('/reorder', (req, res, next) => {
  try {
    const { ids, items } = req.body || {};
    const updates = [];

    if (Array.isArray(ids)) {
      ids.forEach((id, idx) => {
        const numId = Number(id);
        if (Number.isInteger(numId) && numId > 0) {
          updates.push({ id: numId, position: idx });
        }
      });
    } else if (Array.isArray(items)) {
      items.forEach((item) => {
        const numId = Number(item.id);
        const pos = Number(item.position);
        if (Number.isInteger(numId) && numId > 0 && Number.isInteger(pos)) {
          updates.push({ id: numId, position: pos });
        }
      });
    } else {
      return res.status(400).json({ error: 'ids array or items array is required' });
    }

    const updateStmt = db.prepare('UPDATE notes SET position = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?');
    db.exec('BEGIN');
    try {
      for (const u of updates) {
        updateStmt.run(u.position, u.id, req.user.id);
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    res.json({ success: true, updated: updates.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/notes (Combinable status, folder, tag, q, sort)
router.get('/', (req, res, next) => {
  try {
    const { status = 'active', folder, tag, q, sort = 'updated' } = req.query;

    if (status && !ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    let sql = 'SELECT * FROM notes WHERE user_id = ?';
    const params = [req.user.id];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (folder !== undefined) {
      if (folder === 'none' || folder === 'null' || folder === '') {
        sql += ' AND folder_id IS NULL';
      } else {
        const folderId = Number(folder);
        if (!Number.isInteger(folderId)) {
          return res.status(400).json({ error: 'Invalid folder parameter' });
        }
        sql += ' AND folder_id = ?';
        params.push(folderId);
      }
    }

    if (tag) {
      sql += ' AND id IN (SELECT note_id FROM note_tags WHERE lower(tag) = ?)';
      params.push(String(tag).trim().toLowerCase());
    }

    if (q) {
      // Locked notes are excluded from search
      sql += ' AND lock_hash IS NULL AND (title LIKE ? OR body LIKE ?)';
      const term = `%${q}%`;
      params.push(term, term);
    }

    // Sort order: pinned always comes first
    let sortClause = 'ORDER BY pinned DESC';
    switch (sort) {
      case 'created':
        sortClause += ', created_at DESC, id DESC';
        break;
      case 'title':
        sortClause += ', lower(title) ASC, id DESC';
        break;
      case 'manual':
        sortClause += ', position ASC, id ASC';
        break;
      case 'updated':
      default:
        sortClause += ', updated_at DESC, id DESC';
        break;
    }

    sql += ' ' + sortClause;

    const notes = db.prepare(sql).all(...params);

    // Fetch tags for these notes
    const formattedNotes = notes.map((note) => {
      const tags = getNoteTags(db, note.id);
      return formatNote(note, tags);
    });

    res.json(formattedNotes);
  } catch (err) {
    next(err);
  }
});

// POST /api/notes (Create note)
router.post('/', (req, res, next) => {
  try {
    const {
      title,
      body = '',
      tags = [],
      color = 'default',
      type = 'text',
      pinned = 0,
      folder_id = null,
      position = 0,
      reminder_at = null,
    } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (title.trim().length > 120) {
      return res.status(400).json({ error: 'Title must be 120 characters or fewer' });
    }

    let finalBody = body;
    if (typeof body !== 'string' && typeof body !== 'object') {
      finalBody = '';
    }

    if (type === 'checklist') {
      const validation = validateChecklistBody(finalBody);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      finalBody = validation.itemsJson;
    } else {
      finalBody = String(finalBody);
      if (finalBody.length > 100000) {
        return res.status(400).json({ error: 'Body must be 100 000 characters or fewer' });
      }
    }

    if (!ALLOWED_COLORS.has(color)) {
      return res.status(400).json({ error: `Invalid color: ${color}` });
    }
    if (!ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ error: `Invalid type: ${type}` });
    }

    let cleanFolderId = null;
    if (folder_id !== null && folder_id !== undefined && folder_id !== '') {
      cleanFolderId = Number(folder_id);
      if (!Number.isInteger(cleanFolderId)) {
        return res.status(400).json({ error: 'Invalid folder_id' });
      }
      // Check folder belongs to user
      const folder = db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(cleanFolderId, req.user.id);
      if (!folder) {
        return res.status(400).json({ error: 'Folder does not belong to user' });
      }
    }

    const cleanTagArray = normalizeTags(tags);
    const pinnedVal = pinned ? 1 : 0;
    const posVal = Number.isInteger(Number(position)) ? Number(position) : 0;

    let createdNote;
    db.exec('BEGIN');
    try {
      const info = db
        .prepare(
          `INSERT INTO notes (title, body, tags, color, type, pinned, position, folder_id, user_id, status, reminder_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
        )
        .run(
          title.trim(),
          finalBody,
          cleanTagArray.join(','),
          color,
          type,
          pinnedVal,
          posVal,
          cleanFolderId,
          req.user.id,
          reminder_at ? String(reminder_at) : null
        );

      const noteId = Number(info.lastInsertRowid);
      syncNoteTags(db, noteId, cleanTagArray);
      createdNote = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    res.status(201).json(formatNote(createdNote, cleanTagArray));
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// Single Note Routes
// -------------------------------------------------------------

// GET /api/notes/:id
router.get('/:id', validateId, (req, res, next) => {
  try {
    const note = getNoteForUser(req.noteId, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const tags = getNoteTags(db, note.id);
    res.json(formatNote(note, tags));
  } catch (err) {
    next(err);
  }
});

// PUT /api/notes/:id (Full update)
router.put('/:id', validateId, (req, res, next) => {
  try {
    const existing = getNoteForUser(req.noteId, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Note not found' });

    const {
      title,
      body = '',
      tags = [],
      color = 'default',
      type = 'text',
      pinned = 0,
      folder_id = null,
      position = 0,
      reminder_at = null,
    } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (title.trim().length > 120) {
      return res.status(400).json({ error: 'Title must be 120 characters or fewer' });
    }

    let finalBody = body;
    if (type === 'checklist') {
      const validation = validateChecklistBody(finalBody);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      finalBody = validation.itemsJson;
    } else {
      finalBody = String(finalBody);
      if (finalBody.length > 100000) {
        return res.status(400).json({ error: 'Body must be 100 000 characters or fewer' });
      }
    }

    if (!ALLOWED_COLORS.has(color)) {
      return res.status(400).json({ error: `Invalid color: ${color}` });
    }
    if (!ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ error: `Invalid type: ${type}` });
    }

    let cleanFolderId = null;
    if (folder_id !== null && folder_id !== undefined && folder_id !== '') {
      cleanFolderId = Number(folder_id);
      if (!Number.isInteger(cleanFolderId)) {
        return res.status(400).json({ error: 'Invalid folder_id' });
      }
      const folder = db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(cleanFolderId, req.user.id);
      if (!folder) {
        return res.status(400).json({ error: 'Folder does not belong to user' });
      }
    }

    const cleanTagArray = normalizeTags(tags);
    const pinnedVal = pinned ? 1 : 0;
    const posVal = Number.isInteger(Number(position)) ? Number(position) : 0;

    let updatedNote;
    db.exec('BEGIN');
    try {
      db.prepare(
        `UPDATE notes 
         SET title = ?, body = ?, tags = ?, color = ?, type = ?, pinned = ?, position = ?, folder_id = ?, reminder_at = ?, updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      ).run(
        title.trim(),
        finalBody,
        cleanTagArray.join(','),
        color,
        type,
        pinnedVal,
        posVal,
        cleanFolderId,
        reminder_at ? String(reminder_at) : null,
        req.noteId,
        req.user.id
      );

      syncNoteTags(db, req.noteId, cleanTagArray);
      updatedNote = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.noteId);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    res.json(formatNote(updatedNote, cleanTagArray));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notes/:id (Partial update)
router.patch('/:id', validateId, (req, res, next) => {
  try {
    const existing = getNoteForUser(req.noteId, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Note not found' });

    const updates = [];
    const params = [];
    let updatedTags = null;

    const { title, body, tags, color, pinned, status, type, folder_id, position, reminder_at } = req.body || {};

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Title cannot be empty' });
      }
      if (title.trim().length > 120) {
        return res.status(400).json({ error: 'Title must be 120 characters or fewer' });
      }
      updates.push('title = ?');
      params.push(title.trim());
    }

    const effectiveType = type !== undefined ? type : existing.type;
    if (type !== undefined) {
      if (!ALLOWED_TYPES.has(type)) {
        return res.status(400).json({ error: `Invalid type: ${type}` });
      }
      updates.push('type = ?');
      params.push(type);
    }

    if (body !== undefined) {
      if (effectiveType === 'checklist') {
        const validation = validateChecklistBody(body);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
        }
        updates.push('body = ?');
        params.push(validation.itemsJson);
      } else {
        const bodyStr = String(body);
        if (bodyStr.length > 100000) {
          return res.status(400).json({ error: 'Body must be 100 000 characters or fewer' });
        }
        updates.push('body = ?');
        params.push(bodyStr);
      }
    }

    if (color !== undefined) {
      if (!ALLOWED_COLORS.has(color)) {
        return res.status(400).json({ error: `Invalid color: ${color}` });
      }
      updates.push('color = ?');
      params.push(color);
    }

    if (pinned !== undefined) {
      updates.push('pinned = ?');
      params.push(pinned ? 1 : 0);
    }

    if (status !== undefined) {
      if (!ALLOWED_STATUSES.has(status)) {
        return res.status(400).json({ error: `Invalid status: ${status}` });
      }
      updates.push('status = ?');
      params.push(status);

      if (status === 'trashed') {
        updates.push("deleted_at = datetime('now')");
      } else {
        updates.push('deleted_at = NULL');
      }
    }

    if (folder_id !== undefined) {
      if (folder_id === null || folder_id === 'null' || folder_id === '') {
        updates.push('folder_id = NULL');
      } else {
        const fId = Number(folder_id);
        if (!Number.isInteger(fId)) {
          return res.status(400).json({ error: 'Invalid folder_id' });
        }
        const folder = db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(fId, req.user.id);
        if (!folder) {
          return res.status(400).json({ error: 'Folder does not belong to user' });
        }
        updates.push('folder_id = ?');
        params.push(fId);
      }
    }

    if (position !== undefined) {
      const pos = Number(position);
      if (!Number.isInteger(pos)) {
        return res.status(400).json({ error: 'Position must be an integer' });
      }
      updates.push('position = ?');
      params.push(pos);
    }

    if (reminder_at !== undefined) {
      updates.push('reminder_at = ?');
      params.push(reminder_at ? String(reminder_at) : null);
      if (!reminder_at) {
        updates.push('reminded_at = NULL');
      }
    }

    if (tags !== undefined) {
      updatedTags = normalizeTags(tags);
      updates.push('tags = ?');
      params.push(updatedTags.join(','));
    }

    updates.push("updated_at = datetime('now')");

    let resultNote;
    db.exec('BEGIN');
    try {
      params.push(req.noteId, req.user.id);
      db.prepare(`UPDATE notes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);

      if (updatedTags !== null) {
        syncNoteTags(db, req.noteId, updatedTags);
      }

      resultNote = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.noteId);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    const finalTags = updatedTags !== null ? updatedTags : getNoteTags(db, req.noteId);
    res.json(formatNote(resultNote, finalTags));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notes/:id (Soft-delete to trash or permanent delete)
router.delete('/:id', validateId, (req, res, next) => {
  try {
    const existing = getNoteForUser(req.noteId, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Note not found' });

    const permanent = req.query.permanent === 'true' || existing.status === 'trashed';

    if (permanent) {
      db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(req.noteId, req.user.id);
      return res.status(204).end();
    }

    // Soft-delete to trash
    db.prepare("UPDATE notes SET status = 'trashed', deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND user_id = ?")
      .run(req.noteId, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// POST /api/notes/:id/restore (Restore from trash)
router.post('/:id/restore', validateId, (req, res, next) => {
  try {
    const existing = getNoteForUser(req.noteId, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Note not found' });

    db.prepare("UPDATE notes SET status = 'active', deleted_at = NULL, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
      .run(req.noteId, req.user.id);

    const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.noteId);
    const tags = getNoteTags(db, req.noteId);
    res.json(formatNote(updated, tags));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notes/:id/permanent (Permanent delete)
router.delete('/:id/permanent', validateId, (req, res, next) => {
  try {
    const existing = getNoteForUser(req.noteId, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Note not found' });

    db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(req.noteId, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// Lock, Unlock & Reveal Routes
// -------------------------------------------------------------

// POST /api/notes/:id/lock
router.post('/:id/lock', validateId, async (req, res, next) => {
  try {
    const { pin } = req.body || {};
    if (!validatePinFormat(pin)) {
      return res.status(400).json({ error: 'PIN must be between 4 and 8 digits' });
    }

    const note = getNoteForUser(req.noteId, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const lockHash = await bcrypt.hash(String(pin), 10);
    db.prepare("UPDATE notes SET lock_hash = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
      .run(lockHash, req.noteId, req.user.id);

    const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.noteId);
    const tags = getNoteTags(db, req.noteId);
    res.json(formatNote(updated, tags));
  } catch (err) {
    next(err);
  }
});

// POST /api/notes/:id/reveal (Temporarily view locked note body)
router.post('/:id/reveal', validateId, async (req, res, next) => {
  try {
    const { pin } = req.body || {};
    if (!validatePinFormat(pin)) {
      return res.status(400).json({ error: 'PIN must be between 4 and 8 digits' });
    }

    const note = getNoteForUser(req.noteId, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    if (!note.lock_hash) {
      const tags = getNoteTags(db, note.id);
      return res.json(formatNote(note, tags));
    }

    // Check lockout
    const lockout = checkLockout(req.user.id);
    if (lockout.isLockedOut) {
      return res.status(429).json({ error: 'Too many failed attempts. Try again in 5 minutes' });
    }

    const match = await bcrypt.compare(String(pin), note.lock_hash);
    if (!match) {
      const failure = recordFailure(req.user.id);
      if (failure.isLockedOut) {
        return res.status(429).json({ error: 'Too many failed attempts. Try again in 5 minutes' });
      }
      return res.status(400).json({ error: 'Incorrect PIN' });
    }

    recordSuccess(req.user.id);
    const tags = getNoteTags(db, note.id);
    res.json(formatNote(note, tags, { revealed: true }));
  } catch (err) {
    next(err);
  }
});

// POST /api/notes/:id/unlock (Remove lock)
router.post('/:id/unlock', validateId, async (req, res, next) => {
  try {
    const { pin } = req.body || {};
    if (!validatePinFormat(pin)) {
      return res.status(400).json({ error: 'PIN must be between 4 and 8 digits' });
    }

    const note = getNoteForUser(req.noteId, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    if (!note.lock_hash) {
      const tags = getNoteTags(db, note.id);
      return res.json(formatNote(note, tags));
    }

    // Check lockout
    const lockout = checkLockout(req.user.id);
    if (lockout.isLockedOut) {
      return res.status(429).json({ error: 'Too many failed attempts. Try again in 5 minutes' });
    }

    const match = await bcrypt.compare(String(pin), note.lock_hash);
    if (!match) {
      const failure = recordFailure(req.user.id);
      if (failure.isLockedOut) {
        return res.status(429).json({ error: 'Too many failed attempts. Try again in 5 minutes' });
      }
      return res.status(400).json({ error: 'Incorrect PIN' });
    }

    recordSuccess(req.user.id);
    db.prepare("UPDATE notes SET lock_hash = NULL, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
      .run(req.noteId, req.user.id);

    const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.noteId);
    const tags = getNoteTags(db, req.noteId);
    res.json(formatNote(updated, tags));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
