'use strict';

const requestCounts = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute per IP

function publicRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown-client';
  const now = Date.now();

  let entry = requestCounts.get(ip);
  if (!entry) {
    entry = [];
    requestCounts.set(ip, entry);
  }

  // Retain only requests within the window
  entry = entry.filter((timestamp) => now - timestamp < WINDOW_MS);
  requestCounts.set(ip, entry);

  if (entry.length >= MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  entry.push(now);
  next();
}

function _clearPublicRateLimits() {
  requestCounts.clear();
}

module.exports = {
  publicRateLimit,
  _clearPublicRateLimits,
};
