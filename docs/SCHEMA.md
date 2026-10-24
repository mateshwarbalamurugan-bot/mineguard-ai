# Database Schema

## Current Tables

### `notes`

The primary table storing all user notes.

| Column       | Type    | Constraints                          | Description                          |
|--------------|---------|--------------------------------------|--------------------------------------|
| `id`         | INTEGER | PRIMARY KEY AUTOINCREMENT            | Unique note identifier               |
| `title`      | TEXT    | NOT NULL                             | Note title (max 120 chars enforced in API) |
| `body`       | TEXT    | NOT NULL DEFAULT `''`                | Note body / content (max 100,000 chars enforced in API) |
| `tags`       | TEXT    | NOT NULL DEFAULT `''`                | Comma-separated lowercase tags (e.g. `work,ideas`) |
| `created_at` | TEXT    | NOT NULL DEFAULT `datetime('now')`   | ISO-8601 creation timestamp (UTC)    |
| `updated_at` | TEXT    | NOT NULL DEFAULT `datetime('now')`   | ISO-8601 last-modified timestamp (UTC) |

**Tag storage convention**: tags are stored as a sorted, comma-separated, lowercase string with no spaces around commas. The API's `cleanTags()` helper normalises input before writing.

**Tag filtering query pattern**:
```sql
AND (',' || tags || ',') LIKE '%,<tag>,%'
```
This ensures partial tag names do not produce false matches.

### `_migrations`

Internal table used by the migration runner in `db.js` to track which SQL files have been applied.

| Column       | Type | Constraints                                          |
|--------------|------|------------------------------------------------------|
| `name`       | TEXT | PRIMARY KEY                                          |
| `applied_at` | TEXT | NOT NULL DEFAULT `datetime('now')`                   |

---

## Planned Future Tables

### `users`

Multi-user support (authentication & ownership).

| Column        | Type    | Description                             |
|---------------|---------|-----------------------------------------|
| `id`          | INTEGER | PRIMARY KEY AUTOINCREMENT               |
| `email`       | TEXT    | UNIQUE NOT NULL — login identifier      |
| `display_name`| TEXT    | Shown in the UI                         |
| `password_hash`| TEXT   | Argon2id hash — never stored plain-text |
| `created_at`  | TEXT    | Account creation timestamp              |

The `notes` table would gain a `user_id INTEGER REFERENCES users(id)` foreign key.

### `shares`

Per-note sharing links or collaborator grants.

| Column      | Type    | Description                                          |
|-------------|---------|------------------------------------------------------|
| `id`        | INTEGER | PRIMARY KEY AUTOINCREMENT                            |
| `note_id`   | INTEGER | REFERENCES notes(id) ON DELETE CASCADE               |
| `token`     | TEXT    | UNIQUE — random URL-safe token for link-based sharing |
| `granted_to`| INTEGER | REFERENCES users(id) — NULL means public link        |
| `permission`| TEXT    | `'read'` or `'write'`                               |
| `expires_at`| TEXT    | NULL means no expiry                                 |
| `created_at`| TEXT    | Grant creation timestamp                             |

### `note_versions`

Append-only version history for each note (audit trail / undo).

| Column       | Type    | Description                               |
|--------------|---------|-------------------------------------------|
| `id`         | INTEGER | PRIMARY KEY AUTOINCREMENT                 |
| `note_id`    | INTEGER | REFERENCES notes(id) ON DELETE CASCADE    |
| `title`      | TEXT    | Snapshot of title at this version         |
| `body`       | TEXT    | Snapshot of body at this version          |
| `tags`       | TEXT    | Snapshot of tags at this version          |
| `saved_at`   | TEXT    | When this version was saved               |
| `saved_by`   | INTEGER | REFERENCES users(id) — NULL = anonymous  |

Versions would be created by an `AFTER UPDATE` trigger on `notes`, or explicitly by the API before applying an update.
