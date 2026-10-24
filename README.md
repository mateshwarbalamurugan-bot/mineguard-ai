# NotesBoard — Notion-Style Notes Workspace with AI

A fast, private, Notion-style notes workspace built with **Vue 3**, **Vite**, **Express 4**, and **SQLite** (`better-sqlite3`). It combines keyboard-friendly minimalist note taking with privacy-first PIN vaults, multi-provider AI writing assistance, speech dictation, smart reminders, and public sharing.

---

## Features

- **Personal Knowledge Workspace**:
  - Flexible note types: Plain text, Markdown notes, or interactive task checklists.
  - Organization: Custom folders, multi-tag filtering with counts, color coding (`yellow`, `mint`, `blue`, `pink`, `purple`), and pinned notes prioritization.
  - Soft-delete Trash with one-click restore or empty trash.
- **Privacy-First PIN Vault**:
  - Lock sensitive notes with a 4–8 digit PIN hashed via `bcrypt`.
  - Locked notes conceal content from list views, search queries, and AI assistants.
  - Dual access modes: Temporary inspection via **Reveal** or permanent removal via **Unlock**.
  - Brute-force protection: 5 incorrect PIN attempts trigger an automatic 5-minute lockout block.
- **AI Writing Assistant & "Ask Your Notes"**:
  - Pluggable AI service supporting **Gemini**, **OpenAI**, **Anthropic**, or built-in offline **Mock** provider.
  - Actions: **Summarize**, **Suggest Tags** (clickable chips + Accept All), **Fix Grammar**, **Shorten**, and **Friendlier Tone**.
  - Interactive Before/After diff viewer with "Nothing saves until accepted" safety guarantee.
  - Global Command Palette (`Ctrl+K` / `Cmd+K`): Instant search + conversational "Ask Your Notes" assistant that cites source notes.
- **Voice-to-Text Transcription**:
  - Native microphone dictation powered by the Web Speech API with graceful fallback alerts.
- **Intelligent Reminders**:
  - Schedule reminders with formatted date/time stamps and "Overdue" status badges.
  - 30-second background synchronizer with native Web Notifications API alerts and dismissable toasts.
- **Image Attachments**:
  - Multer upload with 5MB limit, random 32-character hex filenames, thumbnail galleries, and full-screen image lightbox.
  - Authenticated, ownership-checked file delivery.
- **Universal Import & Export**:
  - Single note export: Plain Text (`.txt`), Markdown (`.md`), or styled PDF documents (`.pdf` generated server-side via `pdfkit`).
  - Full workspace JSON backup (excludes locked notes for privacy).
  - Bulk file import (`.json`, `.txt`, `.md`) with detailed validation report (`{ created, skipped, errors }`).
- **Secure Public Sharing & Comments**:
  - Generate cryptographically secure 32-byte hex share links (`/s/:token`).
  - Read-only reader view that strictly leaks **zero** owner data.
  - Public reader comments with rate limiting; note owner can moderate and delete comments.
- **Design System & Accessibility**:
  - Warm paper minimalist aesthetic with Light (`#f4f1eb`) and Dark (`#121214`) themes.
  - Strict WCAG AA contrast compliance (≥ 4.5:1 text contrast).
  - Reduced-motion accessibility overrides (`prefers-reduced-motion: reduce`).
  - Mobile responsive down to 320px phone viewport width.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vue 3 (Composition API `<script setup>`), Vite 5, Vue Router 4, Pinia 2 |
| **Backend** | Express 4, better-sqlite3 (synchronous embedded SQLite), Helmet, Bcrypt, Multer, PDFKit |
| **Testing** | Node built-in test runner (`node --test`), Supertest |
| **Deployment** | Single-process production (Express serves `frontend/dist`), Multi-stage Dockerfile |

---

## Directory Structure

```text
notes/
├── backend/
│   ├── middleware/        # auth, rate limiters, upload validation
│   ├── migrations/        # numbered SQL & JS schema migrations
│   ├── routes/            # auth, notes, folders, ai, sharing, public, reminders, attachments
│   ├── services/          # ai, noteService, lockService, reminderService, exportService
│   ├── tests/             # 11 test suites covering all API routes
│   ├── db.js              # SQLite connection & schema_migrations runner
│   └── server.js          # Express app, security headers, SPA static serving
├── frontend/
│   ├── public/            # robots.txt, static assets
│   ├── src/
│   │   ├── components/    # NoteCard, NoteForm, CommandPalette, Lightbox, Share, ImportExport
│   │   ├── views/         # LandingView (/), BoardView (/app), SharedNoteView (/s/:token)
│   │   ├── router/        # Vue Router configuration
│   │   ├── api.js         # Unified HTTP API client with auth token management
│   │   └── style.css      # Theme variables, WCAG AA styles, animations
│   ├── index.html         # SEO meta tags, Open Graph, SVG favicon
│   └── vite.config.js     # Vite dev proxy configuration
├── docs/
│   ├── DEPLOYMENT.md      # Render and Railway persistent disk deployment guide
│   └── SCHEMA.md          # Database schema reference
├── Dockerfile             # Multi-stage production container build
├── PROJECT_CONTEXT.md     # Vision, conventions, and completed roadmap
└── package.json           # Root workspace scripts
```

---

## Quickstart

### Prerequisites
- Node.js 20+ (LTS) or Node.js 22+
- npm 9+

### 1. Installation
```bash
# Clone the repository
git clone <repo-url> notes
cd notes

# Install backend dependencies
npm install --prefix backend

# Install frontend dependencies
npm install --prefix frontend
```

### 2. Development Mode
Run both backend (port 3001) and Vite dev server (port 5173 with API proxy) concurrently:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Running the Automated Test Suite
Run all 11 test suites (71 tests covering auth, multi-tenant isolation, locks, reminders, AI, uploads, shares, exports, and production serving):
```bash
npm test
```

### 4. Production Build & Serving
Build the optimized frontend bundle and start the single-process Express server:
```bash
# Build frontend to frontend/dist
npm run build

# Start single Express process on port 3001
npm start
```
Visit [http://localhost:3001](http://localhost:3001) to experience the full production app.

---

## Environment Variables

Copy `.env.example` to `.env` or set these in your hosting environment:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server port |
| `DB_PATH` | `./backend/notes.db` | Path to SQLite database file |
| `UPLOAD_DIR` | `./uploads` | Directory for image attachments |
| `JWT_SECRET` | `default-secret-...` | Secret for signing JWT authentication tokens |
| `AI_PROVIDER` | `mock` | AI engine: `gemini`, `openai`, `anthropic`, or `mock` |
| `AI_API_KEY` | `""` | API key for Gemini / OpenAI / Anthropic |
| `AI_MODEL` | Provider default | Model override (e.g. `gemini-1.5-flash`, `gpt-4o-mini`) |

---

## API Endpoints

### Authentication
- `POST /api/auth/register` — Register new user (first user automatically claims ownerless notes).
- `POST /api/auth/login` — Sign in and receive 7-day JWT token.
- `GET /api/auth/me` — Get authenticated user details.
- `PUT /api/auth/settings` — Merge user JSON settings (e.g. theme preference).

### Notes & Organization
- `GET /api/notes` — List notes with combinable filters (`status`, `sort`, `folder`, `tag`, `q`).
- `POST /api/notes` — Create note (text or checklist).
- `GET /api/notes/:id` — Get single note (body omitted if PIN locked).
- `PUT /api/notes/:id` — Full update of note.
- `PATCH /api/notes/:id` — Partial update of note.
- `DELETE /api/notes/:id` — Soft delete note to Trash.
- `POST /api/notes/:id/restore` — Restore note from Trash.
- `DELETE /api/notes/:id/permanent` — Permanently delete note.
- `DELETE /api/notes/trash` — Empty all notes in Trash.
- `PATCH /api/notes/reorder` — Batch update note positions.
- `GET /api/stats` — Workspace counts (total, active, folders, tags).
- `GET /api/tags` — Aggregated tags with counts.

### Privacy PIN Lock
- `POST /api/notes/:id/lock` — Set 4–8 digit PIN to lock note.
- `POST /api/notes/:id/unlock` — Permanently unlock note with correct PIN.
- `POST /api/notes/:id/reveal` — Temporarily return note body with correct PIN.

### Folders
- `GET /api/folders` — List folders.
- `POST /api/folders` — Create new folder.
- `PATCH /api/folders/:id` — Rename folder.
- `DELETE /api/folders/:id` — Delete folder (notes moved to "No Folder").

### Reminders & Attachments
- `GET /api/reminders/due` — Check due notes.
- `POST /api/reminders/:id/dismiss` — Clear reminder status.
- `POST /api/attachments/upload` — Upload image (PNG/JPG/WEBP/GIF ≤ 5MB).
- `GET /api/attachments/note/:note_id` — List note attachments.
- `GET /api/attachments/:id/file` — Serve attachment file (ownership verified).
- `DELETE /api/attachments/:id` — Remove attachment.

### AI Writing Assistant
- `POST /api/ai/summarize` — Generate concise summary (refuses locked notes).
- `POST /api/ai/suggest-tags` — Suggest relevant tags array.
- `POST /api/ai/improve` — Refine text (`action`: `grammar`, `shorten`, `friendly`).
- `POST /api/ai/ask` — Ask conversational questions with source citations.

### Sharing & Public Access
- `POST /api/shares` — Generate secure 32-byte public share link.
- `GET /api/shares/note/:note_id` — List note share links.
- `DELETE /api/shares/:token` — Revoke share link.
- `GET /api/public/notes/:token` — Public view of shared note (zero owner leaks).
- `GET /api/public/notes/:token/comments` — Public comment list.
- `POST /api/public/notes/:token/comments` — Post public reader comment.
- `DELETE /api/public/comments/:id` — Delete comment (note owner only).

### Export & Import
- `GET /api/export/note/:id?format={txt|md|pdf}` — Export note file.
- `GET /api/export/backup` — Complete JSON backup download.
- `POST /api/import` — Import notes with `{ created, skipped, errors }` report.

---

## Deployment

Refer to [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for full instructions on deploying to **Render** or **Railway** with persistent disk volumes.
