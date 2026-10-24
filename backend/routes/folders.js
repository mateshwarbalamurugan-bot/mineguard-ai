'use strict';
const express = require('express');
const db = require('../db');

const router = express.Router();

function validateFolderId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid folder id' });
  }
  req.folderId = id;
  next();
}

// GET /api/folders
router.get('/', (req, res, next) => {
  try {
    const folders = db
      .prepare(
        `SELECT f.*, 
          (SELECT COUNT(*) FROM notes WHERE folder_id = f.id AND status != 'trashed') as note_count 
         FROM folders f 
         WHERE f.user_id = ? 
         ORDER BY f.name COLLATE NOCASE ASC`
      )
      .all(req.user.id);
    res.json(folders);
  } catch (err) {
    next(err);
  }
});

// GET /api/folders/:id
router.get('/:id', validateFolderId, (req, res, next) => {
  try {
    const folder = db
      .prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?')
      .get(req.folderId, req.user.id);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    res.json(folder);
  } catch (err) {
    next(err);
  }
});

// POST /api/folders
router.post('/', (req, res, next) => {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Folder name must be 100 characters or fewer' });
    }

    const info = db
      .prepare('INSERT INTO folders (user_id, name) VALUES (?, ?)')
      .run(req.user.id, name.trim());
    const created = db.prepare('SELECT * FROM folders WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT & PATCH /api/folders/:id
function updateFolder(req, res, next) {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Folder name must be 100 characters or fewer' });
    }

    const info = db
      .prepare("UPDATE folders SET name = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
      .run(name.trim(), req.folderId, req.user.id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const updated = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.folderId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

router.put('/:id', validateFolderId, updateFolder);
router.patch('/:id', validateFolderId, updateFolder);

// DELETE /api/folders/:id
router.delete('/:id', validateFolderId, (req, res, next) => {
  try {
    const folder = db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(req.folderId, req.user.id);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    db.transaction(() => {
      // "delete moves notes to none"
      db.prepare('UPDATE notes SET folder_id = NULL WHERE folder_id = ? AND user_id = ?').run(req.folderId, req.user.id);
      db.prepare('DELETE FROM folders WHERE id = ? AND user_id = ?').run(req.folderId, req.user.id);
    })();

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
