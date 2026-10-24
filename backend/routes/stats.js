'use strict';
const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/stats
router.get('/', (req, res, next) => {
  try {
    const userId = req.user.id;

    const stats = db
      .prepare(
        `SELECT
          COUNT(CASE WHEN status != 'trashed' THEN 1 END) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived,
          COUNT(CASE WHEN status = 'trashed' THEN 1 END) as trashed,
          COUNT(CASE WHEN status = 'active' AND pinned = 1 THEN 1 END) as pinned
        FROM notes
        WHERE user_id = ?`
      )
      .get(userId);

    const tagsCount = db
      .prepare(
        `SELECT COUNT(DISTINCT nt.tag) as count
         FROM note_tags nt
         JOIN notes n ON n.id = nt.note_id
         WHERE n.user_id = ? AND n.status != 'trashed'`
      )
      .get(userId).count;

    const foldersCount = db
      .prepare('SELECT COUNT(*) as count FROM folders WHERE user_id = ?')
      .get(userId).count;

    res.json({
      total: stats.total || 0,
      active: stats.active || 0,
      archived: stats.archived || 0,
      trashed: stats.trashed || 0,
      pinned: stats.pinned || 0,
      tags: tagsCount || 0,
      folders: foldersCount || 0,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
