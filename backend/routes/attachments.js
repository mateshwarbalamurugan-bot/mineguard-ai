'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { upload, UPLOADS_DIR } = require('../middleware/upload');

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

// POST /api/notes/:id/attachments (Upload attachment to note)
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 5MB limit' });
      }
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    next();
  });
}

router.post('/notes/:id/attachments', validateId('id'), handleUpload, (req, res, next) => {
  try {
    const note = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(req.id, req.user.id);
    if (!note) {
      // If file was saved by multer, clean it up
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Note not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const info = db
      .prepare(
        `INSERT INTO attachments (note_id, user_id, filename, original_name, mime_type, size)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.id,
        req.user.id,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size
      );

    const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(info.lastInsertRowid);

    res.status(201).json({
      ...attachment,
      url: `/api/attachments/${attachment.id}`,
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // ignore
      }
    }
    next(err);
  }
});

// GET /api/notes/:id/attachments (List attachments for note)
router.get('/notes/:id/attachments', validateId('id'), (req, res, next) => {
  try {
    const note = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(req.id, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const rows = db
      .prepare('SELECT * FROM attachments WHERE note_id = ? AND user_id = ? ORDER BY created_at DESC')
      .all(req.id, req.user.id);

    const formatted = rows.map((r) => ({
      ...r,
      url: `/api/attachments/${r.id}`,
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// GET /api/attachments/:id (Download/serve attachment - ownership checked)
router.get('/attachments/:id', validateId('id'), (req, res, next) => {
  try {
    const attachment = db
      .prepare('SELECT * FROM attachments WHERE id = ? AND user_id = ?')
      .get(req.id, req.user.id);

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const filePath = path.join(UPLOADS_DIR, attachment.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.original_name}"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/attachments/:id (Delete attachment)
router.delete('/attachments/:id', validateId('id'), (req, res, next) => {
  try {
    const attachment = db
      .prepare('SELECT * FROM attachments WHERE id = ? AND user_id = ?')
      .get(req.id, req.user.id);

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const filePath = path.join(UPLOADS_DIR, attachment.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        // ignore
      }
    }

    db.prepare('DELETE FROM attachments WHERE id = ? AND user_id = ?').run(req.id, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
