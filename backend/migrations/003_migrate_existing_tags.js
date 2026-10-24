'use strict';

module.exports = {
  up(db) {
    const columns = db.prepare('PRAGMA table_info(notes)').all().map(c => c.name);
    if (!columns.includes('tags')) return;

    const notes = db.prepare("SELECT id, tags FROM notes WHERE tags IS NOT NULL AND tags != ''").all();
    const insertTag = db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag) VALUES (?, ?)');

    for (const note of notes) {
      const tags = String(note.tags)
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);
      for (const tag of tags) {
        insertTag.run(note.id, tag);
      }
    }
  }
};
