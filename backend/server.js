'use strict';
const express = require('express');
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const foldersRoutes = require('./routes/folders');
const statsRoutes = require('./routes/stats');
const tagsRoutes = require('./routes/tags');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// ---------- Middleware ----------
app.use(express.json());

// ---------- Routes ----------
app.use('/api/auth', authRoutes);

// Protected routes (scoped by user_id)
app.use('/api/notes', authMiddleware, notesRoutes);
app.use('/api/folders', authMiddleware, foldersRoutes);
app.use('/api/stats', authMiddleware, statsRoutes);
app.use('/api/tags', authMiddleware, tagsRoutes);

// ---------- Central error handler ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ---------- Start (skip when required by tests) ----------
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Notes Board API running at http://localhost:${PORT}`);
  });
}

module.exports = app;
