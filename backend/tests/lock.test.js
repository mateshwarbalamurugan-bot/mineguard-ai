'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_PATH = ':memory:';

const app = require('../server');
const db = require('../db');
const { _clearAllAttempts } = require('../services/lockService');

describe('Notes PIN Lock & Lockout API', () => {
  let token;
  let noteId;

  

  before(async () => {
    _clearAllAttempts();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'lock_user@example.com', password: 'password123' });
    token = res.body.token;

    // Create a note to test locking
    const note = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Top Secret Plans', body: 'The eagle flies at midnight.' });
    noteId = note.body.id;
  });

  it('Rejects invalid PIN formats (<4 digits, >8 digits, non-numeric)', async () => {
    const tooShort = await request(app)
      .post(`/api/notes/${noteId}/lock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '123' });
    assert.equal(tooShort.status, 400);

    const tooLong = await request(app)
      .post(`/api/notes/${noteId}/lock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '123456789' });
    assert.equal(tooLong.status, 400);

    const letters = await request(app)
      .post(`/api/notes/${noteId}/lock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: 'abcd' });
    assert.equal(letters.status, 400);
  });

  it('Locks note with valid 4-8 digit PIN', async () => {
    const res = await request(app)
      .post(`/api/notes/${noteId}/lock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '2468' });

    assert.equal(res.status, 200);
    assert.equal(res.body.locked, true);
    assert.equal(res.body.body, undefined);
  });

  it('Locked note returns title + locked: true and no body in GET /api/notes and GET /api/notes/:id', async () => {
    // Single GET
    const single = await request(app)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(single.status, 200);
    assert.equal(single.body.title, 'Top Secret Plans');
    assert.equal(single.body.locked, true);
    assert.equal(single.body.body, undefined);

    // List GET
    const list = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(list.status, 200);
    const found = list.body.find((n) => n.id === noteId);
    assert.ok(found);
    assert.equal(found.title, 'Top Secret Plans');
    assert.equal(found.locked, true);
    assert.equal(found.body, undefined);
  });

  it('Locked note is excluded from search (q)', async () => {
    // Search matching title
    const searchTitle = await request(app)
      .get('/api/notes?q=Secret')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(searchTitle.status, 200);
    assert.ok(!searchTitle.body.some((n) => n.id === noteId));

    // Search matching body text
    const searchBody = await request(app)
      .get('/api/notes?q=eagle')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(searchBody.status, 200);
    assert.ok(!searchBody.body.some((n) => n.id === noteId));
  });

  it('POST /api/notes/:id/reveal reveals body with correct PIN without removing lock', async () => {
    const reveal = await request(app)
      .post(`/api/notes/${noteId}/reveal`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '2468' });

    assert.equal(reveal.status, 200);
    assert.equal(reveal.body.body, 'The eagle flies at midnight.');
    assert.equal(reveal.body.locked, true);

    // Subsequent normal GET still returns masked body
    const single = await request(app)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(single.body.body, undefined);
  });

  it('POST /api/notes/:id/unlock removes lock with correct PIN', async () => {
    const unlock = await request(app)
      .post(`/api/notes/${noteId}/unlock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '2468' });

    assert.equal(unlock.status, 200);
    assert.equal(unlock.body.locked, false);
    assert.equal(unlock.body.body, 'The eagle flies at midnight.');

    // Now normal GET returns full body
    const single = await request(app)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(single.body.locked, false);
    assert.equal(single.body.body, 'The eagle flies at midnight.');

    // And note is searchable again
    const search = await request(app)
      .get('/api/notes?q=eagle')
      .set('Authorization', `Bearer ${token}`);
    assert.ok(search.body.some((n) => n.id === noteId));
  });

  it('5 wrong PINs triggers a 5-minute lockout block (429)', async () => {
    _clearAllAttempts();

    // Lock note again
    await request(app)
      .post(`/api/notes/${noteId}/lock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '9999' });

    // Attempt 1: wrong PIN
    const r1 = await request(app)
      .post(`/api/notes/${noteId}/reveal`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '0000' });
    assert.equal(r1.status, 400);

    // Attempt 2: wrong PIN
    const r2 = await request(app)
      .post(`/api/notes/${noteId}/reveal`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '0000' });
    assert.equal(r2.status, 400);

    // Attempt 3: wrong PIN
    const r3 = await request(app)
      .post(`/api/notes/${noteId}/reveal`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '0000' });
    assert.equal(r3.status, 400);

    // Attempt 4: wrong PIN
    const r4 = await request(app)
      .post(`/api/notes/${noteId}/reveal`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '0000' });
    assert.equal(r4.status, 400);

    // Attempt 5: wrong PIN -> triggers block
    const r5 = await request(app)
      .post(`/api/notes/${noteId}/reveal`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '0000' });
    assert.equal(r5.status, 429);
    assert.ok(r5.body.error);

    // Attempt 6: even with the CORRECT PIN, user is blocked for 5 minutes
    const r6 = await request(app)
      .post(`/api/notes/${noteId}/reveal`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '9999' });
    assert.equal(r6.status, 429);
    assert.ok(r6.body.error.includes('Too many failed attempts'));

    // Clean up attempts
    _clearAllAttempts();
  });
});
