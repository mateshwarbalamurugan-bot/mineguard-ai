'use strict';

const ALLOWED_COLORS = new Set(['default', 'yellow', 'mint', 'blue', 'pink', 'purple']);
const ALLOWED_STATUSES = new Set(['active', 'archived', 'trashed']);
const ALLOWED_TYPES = new Set(['text', 'checklist']);

function normalizeTags(input) {
  if (Array.isArray(input)) {
    return [...new Set(input.map(t => String(t).trim().toLowerCase()).filter(Boolean))].sort();
  }
  if (typeof input === 'string') {
    return [...new Set(input.split(',').map(t => t.trim().toLowerCase()).filter(Boolean))].sort();
  }
  return [];
}

function syncNoteTags(db, noteId, tags) {
  db.prepare('DELETE FROM note_tags WHERE note_id = ?').run(noteId);
  const insert = db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag) VALUES (?, ?)');
  for (const tag of tags) {
    insert.run(noteId, tag);
  }
  db.prepare('UPDATE notes SET tags = ? WHERE id = ?').run(tags.join(','), noteId);
}

function getNoteTags(db, noteId) {
  const rows = db.prepare('SELECT tag FROM note_tags WHERE note_id = ? ORDER BY tag ASC').all(noteId);
  return rows.map(r => r.tag);
}

function formatNote(note, tags, options = {}) {
  const isLocked = Boolean(note.lock_hash);
  const formatted = {
    ...note,
    tags: tags || [],
    locked: isLocked,
    pinned: Boolean(note.pinned),
  };

  delete formatted.lock_hash;

  if (isLocked && !options.revealed) {
    delete formatted.body;
  }

  return formatted;
}

function validateChecklistBody(body) {
  let items = body;
  if (typeof body === 'string') {
    try {
      items = JSON.parse(body);
    } catch (e) {
      return { valid: false, error: 'Checklist body must be valid JSON' };
    }
  }

  if (!Array.isArray(items)) {
    return { valid: false, error: 'Checklist body must be an array of [{id, text, done}]' };
  }

  for (const item of items) {
    if (
      !item ||
      typeof item !== 'object' ||
      item.id === undefined ||
      typeof item.text !== 'string' ||
      typeof item.done !== 'boolean'
    ) {
      return {
        valid: false,
        error: 'Each checklist item must have id (string/number), text (string), and done (boolean)',
      };
    }
  }

  return { valid: true, itemsJson: JSON.stringify(items) };
}

module.exports = {
  ALLOWED_COLORS,
  ALLOWED_STATUSES,
  ALLOWED_TYPES,
  normalizeTags,
  syncNoteTags,
  getNoteTags,
  formatNote,
  validateChecklistBody,
};
