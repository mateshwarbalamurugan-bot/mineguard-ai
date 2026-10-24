# Notes Board — Project Context

## Product Vision

Notes Board is a **Notion-style AI-enhanced notes workspace** — a fast, keyboard-friendly place to capture, organise, and search notes. The v1 MVP is a clean, no-auth single-user board. Future milestones add multi-user collaboration, AI summarisation, rich text editing, file attachments, and real-time sync.

---

## Technology Stack (Fixed)

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Runtime    | Node.js 20+ (LTS)                               |
| Backend    | Express 4, better-sqlite3 (synchronous SQLite)  |
| Frontend   | Vue 3 (Composition API + `<script setup>`), Vite 5, Pinia |
| Testing    | Node built-in `node:test` + `supertest`         |
| Dev runner | `concurrently` (root `npm run dev`)             |
| Database   | SQLite (file: `backend/notes.db`, in-memory for tests) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (port 5173)                  │
│  Vue 3 SPA                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐ │
│  │ App.vue  │  │ NoteForm │  │      NoteCard         │ │
│  │          │──│  .vue    │  │       .vue            │ │
│  └────┬─────┘  └──────────┘  └───────────────────────┘ │
│       │  api.js (fetch wrapper)                         │
└───────┼─────────────────────────────────────────────────┘
        │ HTTP /api/*  (Vite proxy → localhost:3001)
        ▼
┌─────────────────────────────────────────────────────────┐
│              Express API  (port 3001)                   │
│  server.js                                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  GET /api/notes          LIST (q, tag filter)    │   │
│  │  GET /api/notes/:id      READ one                │   │
│  │  POST /api/notes         CREATE                  │   │
│  │  PUT /api/notes/:id      UPDATE                  │   │
│  │  DELETE /api/notes/:id   DELETE                  │   │
│  └──────────────────────────────────────────────────┘   │
│  db.js → better-sqlite3                                 │
└────────────────────────────┬────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  notes.db       │
                    │  (SQLite file)  │
                    └─────────────────┘
```

---

## Conventions

### API
- All routes live under `/api/`
- Errors are always returned as `{ "error": "<message>" }` with an appropriate HTTP status
- Validation middleware (`validateNote`, `validateId`) runs before handlers
- All SQL uses parameterised queries — **no string interpolation of user input**
- `updated_at` is set to `datetime('now')` on every PUT

### Database / Migrations
- Migration files live in `backend/migrations/` and are numbered: `001_initial.sql`, `002_*.sql`, …
- `db.js` runs all unapplied migrations on startup using the `_migrations` table
- Never edit an applied migration — add a new numbered file instead

### Tests
- One test file per feature area: `backend/tests/notes.test.js`
- Tests use an in-memory SQLite database (`DB_PATH=:memory:`)
- Target: at least one test per API endpoint (happy path + error cases)
- Run with: `npm test` from root or `npm test --prefix backend`

### Frontend
- Components use `<script setup>` (Composition API only — no Options API)
- State that needs to be shared goes in a Pinia store
- The `api.js` module is the single place that talks to the backend
- No secrets, tokens, or credentials in browser-side code

### Security
- No `.env` files committed (add to `.gitignore`)
- No secrets in the browser bundle
- Validate and sanitise all inputs on the server

---

## Working Rule

> **Plan → Build → Verify in browser → Never break earlier features**

For every change:
1. **Plan**: write out which files change and why
2. **Build**: make the minimal change that satisfies the requirement
3. **Verify**: run `npm test` (all green) and manually test the affected UI flow
4. **Protect**: regression-test any related features touched by the change

---

## Roadmap

- [x] v1.0 — Core CRUD notes board (title, body, tags, search, filter)
- [ ] v1.1 — Rich text editor (TipTap / ProseMirror)
- [ ] v1.2 — File / image attachments (multipart upload, stored in `uploads/`)
- [ ] v1.3 — Version history (note_versions table, diff viewer)
- [ ] v2.0 — Multi-user auth (JWT, bcrypt/argon2, users table)
- [ ] v2.1 — Sharing & permissions (shares table, public links)
- [ ] v2.2 — Real-time sync (WebSockets or SSE)
- [ ] v3.0 — AI features (summarise, auto-tag, semantic search via embeddings)
