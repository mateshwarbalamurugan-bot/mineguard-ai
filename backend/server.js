'use strict';
const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// ---------- Middleware ----------
app.use(express.json());

// ---------- Helpers ----------
function cleanTags(tags) {
  return String(tags || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .join(',');
}

function validateId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  req.noteId = id;
  next();
}

function validateNote(req, res, next) {
  const { title, body = '' } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (title.trim().length > 120) {
    return res.status(400).json({ error: 'Title must be 120 characters or fewer' });
  }
  if (body.length > 100000) {
    return res.status(400).json({ error: 'Body must be 100 000 characters or fewer' });
  }
  next();
}

// ---------- API routes ----------

// LIST notes. Optional: /api/notes?q=search&tag=work
app.get('/api/notes', (req, res, next) => {
  try {
    const { q, tag } = req.query;
    let sql = 'SELECT * FROM notes WHERE 1=1';
    const params = [];

    if (q) {
      sql += ' AND (title LIKE ? OR body LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (tag) {
      sql += " AND (',' || tags || ',') LIKE ?";
      params.push(`%,${tag.toLowerCase()},%`);
    }
    sql += ' ORDER BY updated_at DESC, id DESC';

    res.json(db.prepare(sql).all(...params));
  } catch (err) {
    next(err);
  }
});

// GET one note
app.get('/api/notes/:id', validateId, (req, res, next) => {
  try {
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.noteId);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    next(err);
  }
});

// CREATE a note
app.post('/api/notes', validateNote, (req, res, next) => {
  try {
    const { title, body = '', tags = '' } = req.body;
    const info = db
      .prepare('INSERT INTO notes (title, body, tags) VALUES (?, ?, ?)')
      .run(title.trim(), body, cleanTags(tags));
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

// EDIT a note
app.put('/api/notes/:id', validateId, validateNote, (req, res, next) => {
  try {
    const { title, body = '', tags = '' } = req.body;
    const info = db
      .prepare("UPDATE notes SET title = ?, body = ?, tags = ?, updated_at = datetime('now') WHERE id = ?")
      .run(title.trim(), body, cleanTags(tags), req.noteId);
    if (info.changes === 0) return res.status(404).json({ error: 'Note not found' });
    res.json(db.prepare('SELECT * FROM notes WHERE id = ?').get(req.noteId));
  } catch (err) {
    next(err);
  }
});

// DELETE a note
app.delete('/api/notes/:id', validateId, (req, res, next) => {
  try {
    const info = db.prepare('DELETE FROM notes WHERE id = ?').run(req.noteId);
    if (info.changes === 0) return res.status(404).json({ error: 'Note not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---------- Central error handler ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------- Start (skip when required by tests) ----------
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Notes Board API running at http://localhost:${PORT}`);
  });
}

module.exports = app;
