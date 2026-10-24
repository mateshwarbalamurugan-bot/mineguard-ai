'use strict';
const bcrypt = require('bcrypt');

const PIN_REGEX = /^\d{4,8}$/;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// In-memory lockout tracking per user
const attemptsMap = new Map();

function validatePinFormat(pin) {
  if (typeof pin !== 'string' && typeof pin !== 'number') return false;
  return PIN_REGEX.test(String(pin));
}

function checkLockout(userId) {
  const record = attemptsMap.get(userId);
  if (!record) return { isLockedOut: false };

  const now = Date.now();
  if (record.blockedUntil && record.blockedUntil > now) {
    const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { isLockedOut: true, remainingSeconds };
  }

  // If lockout expired, reset
  if (record.blockedUntil && record.blockedUntil <= now) {
    attemptsMap.delete(userId);
  }

  return { isLockedOut: false };
}

function recordFailure(userId) {
  const now = Date.now();
  let record = attemptsMap.get(userId);
  if (!record) {
    record = { attempts: 0, blockedUntil: 0 };
    attemptsMap.set(userId, record);
  }

  record.attempts += 1;
  if (record.attempts >= MAX_ATTEMPTS) {
    record.blockedUntil = now + LOCKOUT_DURATION_MS;
    return { isLockedOut: true, remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }

  return { isLockedOut: false, attemptsRemaining: MAX_ATTEMPTS - record.attempts };
}

function recordSuccess(userId) {
  attemptsMap.delete(userId);
}

// Helper for testing
function _clearAllAttempts() {
  attemptsMap.clear();
}

module.exports = {
  validatePinFormat,
  checkLockout,
  recordFailure,
  recordSuccess,
  _clearAllAttempts,
};
