'use strict';
const db = require('../db');

let reminderInterval = null;

function checkDueReminders() {
  try {
    const info = db
      .prepare(
        `UPDATE notes
         SET reminded_at = datetime('now'), updated_at = datetime('now')
         WHERE status != 'trashed'
           AND reminder_at IS NOT NULL
           AND datetime(reminder_at) <= datetime('now')
           AND reminded_at IS NULL`
      )
      .run();
    return info.changes;
  } catch (err) {
    console.error('Error checking reminders:', err.message);
    return 0;
  }
}

function startReminderJob(intervalMs = 60000) {
  if (reminderInterval) return;
  // Run once immediately
  checkDueReminders();
  reminderInterval = setInterval(checkDueReminders, intervalMs);
  // Unref timer so it does not block Node process or test completion
  if (reminderInterval.unref) {
    reminderInterval.unref();
  }
}

function stopReminderJob() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
}

module.exports = {
  checkDueReminders,
  startReminderJob,
  stopReminderJob,
};
