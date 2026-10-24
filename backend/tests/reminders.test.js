'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_PATH = ':memory:';

const app = require('../server');
const db = require('../db');
const { checkDueReminders } = require('../services/reminderService');

describe('Reminders API', () => {
  let tokenUser1;
  let tokenUser2;

  

  before(async () => {
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'reminders_u1@example.com', password: 'password123' });
    tokenUser1 = res1.body.token;

    const res2 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'reminders_u2@example.com', password: 'password123' });
    tokenUser2 = res2.body.token;
  });

  it('Creates a note with reminder_at in the past and verifies it appears in due reminders', async () => {
    // 5 minutes in the past
    const pastTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const createRes = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({
        title: 'Doctor Appointment',
        body: 'Checkup at clinic',
        reminder_at: pastTime,
      });

    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.reminder_at, pastTime);
    const noteId = createRes.body.id;

    // Check reminders job marks it
    const changed = checkDueReminders();
    assert.ok(changed >= 1);

    // Fetch due reminders
    const dueRes = await request(app)
      .get('/api/reminders/due')
      .set('Authorization', `Bearer ${tokenUser1}`);
    assert.equal(dueRes.status, 200);
    assert.ok(Array.isArray(dueRes.body));
    const found = dueRes.body.find((n) => n.id === noteId);
    assert.ok(found);
    assert.equal(found.title, 'Doctor Appointment');
    assert.ok(found.reminded_at);
  });

  it('Future reminders do not appear in due reminders list', async () => {
    // 1 day in the future
    const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const createRes = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({
        title: 'Future Concert',
        reminder_at: futureTime,
      });

    const noteId = createRes.body.id;

    const dueRes = await request(app)
      .get('/api/reminders/due')
      .set('Authorization', `Bearer ${tokenUser1}`);
    assert.equal(dueRes.status, 200);
    assert.ok(!dueRes.body.some((n) => n.id === noteId));
  });

  it('Dismissing a reminder clears reminder_at and reminded_at', async () => {
    const pastTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const createRes = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({
        title: 'Call Plumber',
        reminder_at: pastTime,
      });
    const noteId = createRes.body.id;

    // Ensure it is marked due
    checkDueReminders();

    // Dismiss reminder
    const dismissRes = await request(app)
      .post(`/api/reminders/${noteId}/dismiss`)
      .set('Authorization', `Bearer ${tokenUser1}`);
    assert.equal(dismissRes.status, 200);
    assert.equal(dismissRes.body.success, true);
    assert.equal(dismissRes.body.note.reminder_at, null);

    // Verify it is gone from due reminders
    const dueAfter = await request(app)
      .get('/api/reminders/due')
      .set('Authorization', `Bearer ${tokenUser1}`);
    assert.ok(!dueAfter.body.some((n) => n.id === noteId));
  });

  it('User isolation: User 2 cannot see or dismiss User 1 due reminders', async () => {
    const pastTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const noteUser1 = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({
        title: 'User 1 Private Reminder',
        reminder_at: pastTime,
      });

    checkDueReminders();

    // User 2 cannot see it in due reminders
    const dueUser2 = await request(app)
      .get('/api/reminders/due')
      .set('Authorization', `Bearer ${tokenUser2}`);
    assert.ok(!dueUser2.body.some((n) => n.id === noteUser1.body.id));

    // User 2 cannot dismiss it
    const dismissRes = await request(app)
      .post(`/api/reminders/${noteUser1.body.id}/dismiss`)
      .set('Authorization', `Bearer ${tokenUser2}`);
    assert.equal(dismissRes.status, 404);
  });
});
