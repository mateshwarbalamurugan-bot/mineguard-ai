-- Migration 005: Real-time collaboration document state persistence
CREATE TABLE IF NOT EXISTS note_collab (
  note_id INTEGER PRIMARY KEY REFERENCES notes(id) ON DELETE CASCADE,
  ydoc_state BLOB NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_note_collab_updated_at ON note_collab(updated_at);
