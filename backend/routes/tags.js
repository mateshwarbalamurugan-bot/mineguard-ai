'use strict';
const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/tags
router.get('/', (req, res, next) => {
  try {
    const rows = db
      .prepare(
        `SELECT nt.tag, COUNT(*) as count
         FROM note_tags nt
         JOIN notes n ON n.id = nt.note_id
         WHERE n.user_id = ? AND n.status != 'trashed'
         GROUP BY nt.tag
         ORDER BY nt.tag COLLATE NOCASE ASC`
      )
      .all(req.user.id);

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
