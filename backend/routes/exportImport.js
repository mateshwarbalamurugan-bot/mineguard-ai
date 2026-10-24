'use strict';
const express = require('express');
const db = require('../db');
const { getNoteTags, normalizeTags, syncNoteTags, ALLOWED_COLORS, ALLOWED_TYPES } = require('../services/noteService');
const { exportAsText, exportAsMarkdown, exportAsPdf } = require('../services/exportService');

const router = express.Router();

function validateId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  req.noteId = id;
  next();
}

// -------------------------------------------------------------
// Single Note Export: GET /api/notes/:id/export
// -------------------------------------------------------------
async function handleSingleNoteExport(req, res, next) {
  try {
    const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(req.noteId, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    // Refuse export if note is locked
    if (note.lock_hash) {
      return res.status(400).json({ error: 'Cannot export locked note' });
    }

    const format = (req.query.format || req.params.format || 'txt').toLowerCase();
    const tags = getNoteTags(db, note.id);
    const sanitizedTitle = (note.title || 'note').replace(/[^a-zA-Z0-9_-]/g, '_');

    if (format === 'pdf') {
      const pdfBuffer = await exportAsPdf(note, tags);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedTitle}-${note.id}.pdf"`);
      return res.end(pdfBuffer);
    }

    if (format === 'md' || format === 'markdown') {
      const mdContent = exportAsMarkdown(note, tags);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedTitle}-${note.id}.md"`);
      return res.send(mdContent);
    }

    // Default to plain text
    const txtContent = exportAsText(note, tags);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedTitle}-${note.id}.txt"`);
    return res.send(txtContent);
  } catch (err) {
    next(err);
  }
}

router.get('/notes/:id/export', validateId, handleSingleNoteExport);
router.get('/notes/:id/export/:format', validateId, handleSingleNoteExport);

// -------------------------------------------------------------
// Full Backup Export: GET /api/backup/export (skip locked notes)
// -------------------------------------------------------------
function handleFullBackup(req, res, next) {
  try {
    // Only fetch notes where lock_hash is NULL (skip locked)
    const notes = db
      .prepare('SELECT * FROM notes WHERE user_id = ? AND lock_hash IS NULL ORDER BY id ASC')
      .all(req.user.id);

    const formattedNotes = notes.map((n) => {
      const copy = { ...n };
      delete copy.lock_hash;
      copy.tags = getNoteTags(db, n.id);
      return copy;
    });

    const folders = db
      .prepare('SELECT * FROM folders WHERE user_id = ? ORDER BY id ASC')
      .all(req.user.id);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="notes-backup-${new Date().toISOString().slice(0, 10)}.json"`);

    res.json({
      version: '1.0',
      exported_at: new Date().toISOString(),
      notes: formattedNotes,
      folders,
    });
  } catch (err) {
    next(err);
  }
}

router.get('/backup/export', handleFullBackup);
router.get('/notes/export/backup', handleFullBackup);

// -------------------------------------------------------------
// Import Notes: POST /api/backup/import (JSON/txt/md)
// -------------------------------------------------------------
function parseImportPayload(req) {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  const rawBody = req.body;

  // 1. If JSON array or object with notes
  if (Array.isArray(rawBody)) {
    return { type: 'json', list: rawBody };
  }
  if (rawBody && typeof rawBody === 'object' && Array.isArray(rawBody.notes)) {
    return { type: 'json', list: rawBody.notes };
  }

  // 2. If single note JSON object
  if (rawBody && typeof rawBody === 'object' && rawBody.title) {
    return { type: 'json', list: [rawBody] };
  }

  // 3. If raw text / markdown string
  if (typeof rawBody === 'string' && rawBody.trim()) {
    const text = rawBody.trim();
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return { type: 'json', list: parsed };
        if (parsed.notes && Array.isArray(parsed.notes)) return { type: 'json', list: parsed.notes };
        if (parsed.title) return { type: 'json', list: [parsed] };
      } catch (e) {
        // Not valid JSON, continue to text parsing
      }
    }

    // Markdown or plain text
    const lines = text.split(/\r?\n/);
    let title = 'Imported Note';
    let body = text;

    if (lines.length > 0 && lines[0].startsWith('# ')) {
      title = lines[0].replace(/^#\s+/, '').trim();
      body = lines.slice(1).join('\n').trim();
    } else if (lines.length > 0 && lines[0].trim().length > 0) {
      title = lines[0].trim().slice(0, 120);
      body = lines.slice(1).join('\n').trim();
    }

    return {
      type: 'text',
      list: [{ title, body, tags: ['imported'] }],
    };
  }

  return { type: 'unknown', list: [] };
}

function handleImport(req, res, next) {
  try {
    const { list } = parseImportPayload(req);

    const summary = {
      created: 0,
      skipped: 0,
      errors: [],
    };

    if (!list || list.length === 0) {
      summary.errors.push('No notes found to import');
      return res.status(400).json(summary);
    }

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item || typeof item !== 'object') {
        summary.skipped++;
        summary.errors.push(`Item ${i + 1}: Not a valid note object`);
        continue;
      }

      const title = typeof item.title === 'string' ? item.title.trim() : '';
      if (!title) {
        summary.skipped++;
        summary.errors.push(`Item ${i + 1}: Missing or empty title`);
        continue;
      }
      if (title.length > 120) {
        summary.skipped++;
        summary.errors.push(`Item ${i + 1}: Title exceeds 120 characters`);
        continue;
      }

      const body = typeof item.body === 'string' ? item.body : (item.body ? JSON.stringify(item.body) : '');
      if (body.length > 100000) {
        summary.skipped++;
        summary.errors.push(`Item ${i + 1}: Body exceeds 100,000 characters`);
        continue;
      }

      const color = item.color && ALLOWED_COLORS.has(item.color) ? item.color : 'default';
      const type = item.type && ALLOWED_TYPES.has(item.type) ? item.type : 'text';
      const pinned = item.pinned ? 1 : 0;
      const status = item.status === 'archived' ? 'archived' : 'active';
      const tags = normalizeTags(item.tags);

      try {
        const info = db
          .prepare(
            `INSERT INTO notes (user_id, title, body, color, type, pinned, status, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(req.user.id, title, body, color, type, pinned, status, tags.join(','));

        const noteId = Number(info.lastInsertRowid);
        syncNoteTags(db, noteId, tags);
        summary.created++;
      } catch (err) {
        summary.skipped++;
        summary.errors.push(`Item ${i + 1} ("${title}"): ${err.message}`);
      }
    }

    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
}

router.post('/backup/import', express.text({ type: ['text/*', 'application/json'], limit: '10mb' }), handleImport);
router.post('/notes/import', express.text({ type: ['text/*', 'application/json'], limit: '10mb' }), handleImport);

module.exports = router;
