# Database Schema

## Current Tables

### `users`

Stores registered user accounts and authentication credentials.

| Column         | Type    | Constraints                        | Description                                  |
|----------------|---------|------------------------------------|----------------------------------------------|
| `id`           | INTEGER | PRIMARY KEY AUTOINCREMENT          | Unique user identifier                       |
| `email`        | TEXT    | UNIQUE NOT NULL                    | Lowercase user email address                 |
| `password_hash`| TEXT    | NOT NULL                           | bcrypt password hash                         |
| `settings`     | TEXT    | NOT NULL DEFAULT `'{}'`            | JSON string for arbitrary user preferences   |
| `created_at`   | TEXT    | NOT NULL DEFAULT `datetime('now')` | Account creation timestamp (UTC)             |

### `folders`

User-scoped containers for organizing notes.

| Column       | Type    | Constraints                            | Description                          |
|--------------|---------|----------------------------------------|--------------------------------------|
| `id`         | INTEGER | PRIMARY KEY AUTOINCREMENT              | Unique folder identifier             |
| `user_id`    | INTEGER | NOT NULL REFERENCES users(id) ON DEL CASCADE | Owner of the folder            |
| `name`       | TEXT    | NOT NULL                               | Folder display name (max 100 chars)  |
| `created_at` | TEXT    | NOT NULL DEFAULT `datetime('now')`     | Creation timestamp (UTC)             |
| `updated_at` | TEXT    | NOT NULL DEFAULT `datetime('now')`     | Last modification timestamp (UTC)    |

### `notes`

The primary table storing all notes across workspaces.

| Column       | Type    | Constraints                            | Description                                                 |
|--------------|---------|----------------------------------------|-------------------------------------------------------------|
| `id`         | INTEGER | PRIMARY KEY AUTOINCREMENT              | Unique note identifier                                      |
| `user_id`    | INTEGER | REFERENCES users(id) ON DELETE CASCADE | Owner of the note (`NULL` until claimed by 1st user)        |
| `folder_id`  | INTEGER | REFERENCES folders(id) ON DEL SET NULL | Associated folder (`NULL` = root/none)                      |
| `title`      | TEXT    | NOT NULL                               | Note title (max 120 chars)                                  |
| `body`       | TEXT    | NOT NULL DEFAULT `''`                  | Content (plain text or JSON array for checklist, ≤ 100k)    |
| `type`       | TEXT    | NOT NULL DEFAULT `'text'`              | Note content type: `'text'` or `'checklist'`                |
| `color`      | TEXT    | NOT NULL DEFAULT `'default'`           | Color: `'default'`, `'yellow'`, `'mint'`, `'blue'`, `'pink'`, `'purple'` |
| `status`     | TEXT    | NOT NULL DEFAULT `'active'`            | Note status: `'active'`, `'archived'`, or `'trashed'`       |
| `pinned`     | INTEGER | NOT NULL DEFAULT 0                     | Pin flag: `1` = pinned, `0` = unpinned                      |
| `position`   | INTEGER | NOT NULL DEFAULT 0                     | Position index for manual ordering                          |
| `lock_hash`  | TEXT    | NULL                                   | bcrypt hash of 4-8 digit PIN when locked (`NULL` if unlocked) |
| `tags`       | TEXT    | NOT NULL DEFAULT `''`                  | Legacy comma-delimited string (kept in sync)                |
| `deleted_at` | TEXT    | NULL                                   | Timestamp when soft-deleted to trash                        |
| `created_at` | TEXT    | NOT NULL DEFAULT `datetime('now')`     | ISO-8601 creation timestamp (UTC)                           |
| `updated_at` | TEXT    | NOT NULL DEFAULT `datetime('now')`     | ISO-8601 last-modified timestamp (UTC)                      |

### `note_tags`

Normalized many-to-many relationship for note tags.

| Column    | Type    | Constraints                            | Description                          |
|-----------|---------|----------------------------------------|--------------------------------------|
| `note_id` | INTEGER | NOT NULL REFERENCES notes(id) ON DEL CASCADE | Foreign key to `notes`          |
| `tag`     | TEXT    | NOT NULL                               | Normalized lowercase tag string      |
|           |         | PRIMARY KEY (`note_id`, `tag`)         | Composite primary key                |

### `schema_migrations`

Internal table used by the migration runner in `db.js` to track which `.sql` and `.js` files have been applied.

| Column       | Type | Constraints                        | Description                          |
|--------------|------|------------------------------------|--------------------------------------|
| `name`       | TEXT | PRIMARY KEY                        | Migration filename                   |
| `applied_at` | TEXT | NOT NULL DEFAULT `datetime('now')` | When migration was executed          |

---

## Indexes

- `idx_notes_user_status_updated`: `ON notes(user_id, status, updated_at)`
- `idx_note_tags_tag`: `ON note_tags(tag)`
- `idx_notes_folder`: `ON notes(folder_id)`
- `idx_folders_user`: `ON folders(user_id)`

---

## Planned Future Tables

### `shares`

Per-note sharing links or collaborator grants.

| Column      | Type    | Description                                           |
|-------------|---------|-------------------------------------------------------|
| `id`        | INTEGER | PRIMARY KEY AUTOINCREMENT                             |
| `note_id`   | INTEGER | REFERENCES notes(id) ON DELETE CASCADE                |
| `token`     | TEXT    | UNIQUE — random URL-safe token for link-based sharing |
| `granted_to`| INTEGER | REFERENCES users(id) — NULL means public link         |
| `permission`| TEXT    | `'read'` or `'write'`                                |
| `expires_at`| TEXT    | NULL means no expiry                                  |
| `created_at`| TEXT    | Grant creation timestamp                              |

### `note_versions`

Append-only version history for each note (audit trail / undo).

| Column       | Type    | Description                                |
|--------------|---------|--------------------------------------------|
| `id`         | INTEGER | PRIMARY KEY AUTOINCREMENT                  |
| `note_id`    | INTEGER | REFERENCES notes(id) ON DELETE CASCADE     |
| `title`      | TEXT    | Snapshot of title at this version          |
| `body`       | TEXT    | Snapshot of body at this version           |
| `tags`       | TEXT    | Snapshot of tags at this version           |
| `saved_at`   | TEXT    | When this version was saved                |
| `saved_by`   | INTEGER | REFERENCES users(id) — NULL = anonymous   |
