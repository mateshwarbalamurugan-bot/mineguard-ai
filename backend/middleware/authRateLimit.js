'use strict';

const authAttempts = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 50; // max 50 attempts per 15 mins

function authRateLimit(req, res, next) {
  if (process.env.NODE_ENV === 'test') return next();

  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  let attempts = (authAttempts.get(ip) || []).filter((t) => now - t < WINDOW_MS);

  if (attempts.length >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many authentication attempts, please try again later.' });
  }

  attempts.push(now);
  authAttempts.set(ip, attempts);
  next();
}

function _clearAuthRateLimits() {
  authAttempts.clear();
}

module.exports = {
  authRateLimit,
  _clearAuthRateLimits,
};
