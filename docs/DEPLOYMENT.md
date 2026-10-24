# Production Deployment Guide: Render & Railway

This guide covers deploying NotesBoard as a single containerized Node.js process with persistent disk storage for both the SQLite database file and uploaded attachment images.

---

## 1. Architecture Overview

- **Single Process Execution**: Express serves API routes under `/api/*` and static SPA assets from `frontend/dist` with client-side routing fallback.
- **Persistent Data**:
  - SQLite database at `DB_PATH` (e.g. `/app/data/notes.db` or `/data/notes.db`).
  - Uploaded image attachments at `UPLOAD_DIR` (e.g. `/app/data/uploads` or `/data/uploads`).
- **Zero Downtime Migrations**: SQLite schema migrations run automatically on server boot via `backend/db.js` using the `schema_migrations` tracking table.

---

## 2. Deploying on Render

### Step 1: Create a Persistent Disk
1. In your [Render Dashboard](https://dashboard.render.com), go to **Disks** and click **New Disk**.
2. **Name**: `notes-data`
3. **Mount Path**: `/app/data`
4. **Size**: 1 GB (or as needed)

### Step 2: Create a Web Service
1. Select **New +** > **Web Service**.
2. Connect your Git repository.
3. Configure the service settings:
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Starter (or higher) to support persistent disks.
4. Under **Advanced** > **Disks**, attach your `notes-data` disk to Mount Path: `/app/data`.
5. Under **Environment Variables**, configure:
   ```env
   NODE_ENV=production
   PORT=3001
   DB_PATH=/app/data/notes.db
   UPLOAD_DIR=/app/data/uploads
   JWT_SECRET=generate-a-strong-random-hex-key
   AI_PROVIDER=mock
   # Optional: If using real AI provider
   # AI_PROVIDER=gemini
   # AI_API_KEY=your_gemini_api_key
   # AI_MODEL=gemini-1.5-flash
   ```
6. Click **Create Web Service**. Render builds the multi-stage Docker image and mounts the persistent disk.

---

## 3. Deploying on Railway

### Step 1: Create a New Project
1. In your [Railway Dashboard](https://railway.app), click **New Project** > **Deploy from GitHub repo**.
2. Railway detects the `Dockerfile` automatically.

### Step 2: Add a Persistent Volume
1. In your Railway service canvas, click **+ Add Volume**.
2. Mount Path: `/app/data`

### Step 3: Configure Environment Variables
In the **Variables** tab of the service, add:
```env
NODE_ENV=production
PORT=3001
DB_PATH=/app/data/notes.db
UPLOAD_DIR=/app/data/uploads
JWT_SECRET=generate-a-strong-random-hex-key
AI_PROVIDER=mock
# AI_PROVIDER=openai
# AI_API_KEY=your_openai_api_key
# AI_MODEL=gpt-4o-mini
```

### Step 4: Networking
Under **Settings** > **Networking**, click **Generate Domain** to get a public `railway.app` URL.

---

## 4. Backups and Health Checks

### Automated Backup API
You can schedule a periodic cron job to call the backup endpoint:
```bash
curl -H "Authorization: Bearer <ADMIN_OR_USER_TOKEN>" https://<your-domain>/api/export/backup -o backup-$(date +%F).json
```

### Health & Liveness
The server responds with HTTP 200 on `GET /` and `GET /robots.txt`.
Database integrity check:
```bash
sqlite3 /app/data/notes.db "PRAGMA integrity_check;"
```
