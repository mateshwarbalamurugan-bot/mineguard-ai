'use strict';
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const foldersRoutes = require('./routes/folders');
const statsRoutes = require('./routes/stats');
const tagsRoutes = require('./routes/tags');
const remindersRoutes = require('./routes/reminders');
const attachmentsRoutes = require('./routes/attachments');
const exportImportRoutes = require('./routes/exportImport');
const aiRoutes = require('./routes/ai');
const sharingRoutes = require('./routes/sharing');
const publicRoutes = require('./routes/public');

const http = require('http');
const { authMiddleware } = require('./middleware/auth');
const { authRateLimit } = require('./middleware/authRateLimit');
const { startReminderJob } = require('./services/reminderService');
const { initCollabServer } = require('./services/collabServer');

const app = express();
const server = http.createServer(app);
initCollabServer(server);
app.server = server;
const PORT = process.env.PORT || 3001;

// ---------- Security Middleware ----------
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// ---------- Body Parser ----------
app.use(express.json());

// ---------- Public Routes (no authentication required) ----------
app.use('/api/auth/login', authRateLimit);
app.use('/api/auth/register', authRateLimit);
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);

// ---------- Protected Routes (scoped by user_id) ----------
app.use('/api/notes', authMiddleware, notesRoutes);
app.use('/api/folders', authMiddleware, foldersRoutes);
app.use('/api/stats', authMiddleware, statsRoutes);
app.use('/api/tags', authMiddleware, tagsRoutes);
app.use('/api/reminders', authMiddleware, remindersRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

// Multi-prefix protected routes
app.use('/api', authMiddleware, attachmentsRoutes);
app.use('/api', authMiddleware, exportImportRoutes);
app.use('/api', authMiddleware, sharingRoutes);

// ---------- Production Static Assets & SPA Fallback ----------
const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ---------- Central error handler ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ---------- Start (skip when required by tests) ----------
if (require.main === module) {
  startReminderJob();
  server.listen(PORT, () => {
    console.log(`Notes Board API & Web App running at http://localhost:${PORT}`);
  });
}

module.exports = app;
