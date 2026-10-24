'use strict';
const express = require('express');
const db = require('../db');
const { summarizeNote, suggestTags, improveText, askNote } = require('../services/ai');

const router = express.Router();

function getNoteOrVerifyContent(req, res) {
  const { note_id, title, body } = req.body || {};

  if (note_id) {
    const numId = Number(note_id);
    if (!Number.isInteger(numId) || numId < 1) {
      res.status(400).json({ error: 'Invalid note_id' });
      return null;
    }

    const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(numId, req.user.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return null;
    }

    // Refuse locked notes
    if (note.lock_hash) {
      res.status(400).json({ error: 'Cannot process locked note with AI' });
      return null;
    }

    return {
      title: note.title,
      body: note.body || '',
      note,
    };
  }

  if (title !== undefined || body !== undefined) {
    return {
      title: title || 'Untitled',
      body: body || '',
    };
  }

  res.status(400).json({ error: 'note_id or title/body is required' });
  return null;
}

// POST /api/ai/summarize
router.post('/summarize', async (req, res, next) => {
  try {
    const data = getNoteOrVerifyContent(req, res);
    if (!data) return;

    const summary = await summarizeNote(req.user.id, data.title, data.body);
    res.json({ summary });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/ai/suggest-tags
router.post('/suggest-tags', async (req, res, next) => {
  try {
    const data = getNoteOrVerifyContent(req, res);
    if (!data) return;

    const tags = await suggestTags(req.user.id, data.title, data.body);
    res.json({ tags });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/ai/improve
router.post('/improve', async (req, res, next) => {
  try {
    const { action = 'proofread', text, note_id } = req.body || {};

    let targetText = text;
    if (note_id) {
      const numId = Number(note_id);
      const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(numId, req.user.id);
      if (!note) return res.status(404).json({ error: 'Note not found' });
      if (note.lock_hash) return res.status(400).json({ error: 'Cannot process locked note with AI' });
      if (!targetText) targetText = note.body;
    }

    if (!targetText || typeof targetText !== 'string' || !targetText.trim()) {
      return res.status(400).json({ error: 'Text to improve is required' });
    }

    const improved = await improveText(req.user.id, targetText, action);
    res.json({ improved, action });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/ai/ask
router.post('/ask', async (req, res, next) => {
  try {
    const { question, context, note_id } = req.body || {};

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    let targetContext = context || '';
    if (note_id) {
      const numId = Number(note_id);
      const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(numId, req.user.id);
      if (!note) return res.status(404).json({ error: 'Note not found' });
      if (note.lock_hash) return res.status(400).json({ error: 'Cannot process locked note with AI' });
      targetContext = `Title: ${note.title}\nBody: ${note.body}\n${context || ''}`;
    }

    const answer = await askNote(req.user.id, question.trim(), targetContext);
    res.json({ answer });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
