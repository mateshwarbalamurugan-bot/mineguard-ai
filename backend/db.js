'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'notes.db');

const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Ensure schema_migrations table exists
db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);

// Check if legacy _migrations table exists and copy records over
const hasLegacy = db.prepare(`SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='_migrations'`).get().count > 0;
if (hasLegacy) {
  db.exec(`INSERT OR IGNORE INTO schema_migrations (name, applied_at) SELECT name, applied_at FROM _migrations`);
}

// Run migrations
const migrationsDir = path.join(__dirname, 'migrations');
if (fs.existsSync(migrationsDir)) {
  const applied = new Set(db.prepare('SELECT name FROM schema_migrations').all().map(r => r.name));
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') || f.endsWith('.js'))
    .sort();

  for (const file of files) {
    if (!applied.has(file)) {
      const filePath = path.join(migrationsDir, file);
      if (file.endsWith('.sql')) {
        const sql = fs.readFileSync(filePath, 'utf8');
        db.exec(sql);
      } else if (file.endsWith('.js')) {
        const migration = require(filePath);
        if (typeof migration.up === 'function') {
          migration.up(db);
        }
      }
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file);
      // console.log(`Applied migration: ${file}`);
    }
  }
}

module.exports = db;
