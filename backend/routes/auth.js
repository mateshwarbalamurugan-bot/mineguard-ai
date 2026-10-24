'use strict';
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check if this will be the first user
    const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
    const isFirstUser = userCount === 0;

    const passwordHash = await bcrypt.hash(password, 10);
    const result = db
      .prepare('INSERT INTO users (email, password_hash, settings) VALUES (?, ?, ?)')
      .run(cleanEmail, passwordHash, '{}');

    const userId = Number(result.lastInsertRowid);

    // If first registered user, claim all ownerless notes
    if (isFirstUser) {
      db.prepare('UPDATE notes SET user_id = ? WHERE user_id IS NULL').run(userId);
    }

    const token = jwt.sign({ id: userId, email: cleanEmail }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: userId,
        email: cleanEmail,
        settings: {},
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = db.prepare('SELECT id, email, password_hash, settings FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const settings = user.settings ? JSON.parse(user.settings) : {};
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        settings,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    settings: req.user.settings,
    user: req.user,
  });
});

// PUT /api/auth/settings
router.put('/settings', authMiddleware, (req, res, next) => {
  try {
    const incoming = req.body.settings !== undefined ? req.body.settings : req.body;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return res.status(400).json({ error: 'Settings must be an object' });
    }

    const merged = { ...req.user.settings, ...incoming };
    const mergedJson = JSON.stringify(merged);

    db.prepare('UPDATE users SET settings = ? WHERE id = ?').run(mergedJson, req.user.id);
    req.user.settings = merged;

    res.json({
      settings: merged,
      user: req.user,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
