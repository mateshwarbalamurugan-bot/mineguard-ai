'use strict';
const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

// Set in-memory DB for tests
process.env.DB_PATH = ':memory:';

const app = require('../server');
const db = require('../db');

describe('Auth API & Ownerless Claiming', () => {
  
  it('First registered user claims ownerless notes', async () => {
    // Insert an ownerless note directly
    db.prepare("INSERT INTO notes (title, body, status) VALUES ('Ownerless Legacy Note', 'Original body', 'active')").run();
    const ownerlessBefore = db.prepare("SELECT * FROM notes WHERE title = 'Ownerless Legacy Note'").get();
    assert.equal(ownerlessBefore.user_id, null);

    // Register first user
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'first@example.com', password: 'password123' });

    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, 'first@example.com');
    const firstUserId = res.body.user.id;

    // Check that legacy note was claimed
    const ownerlessAfter = db.prepare("SELECT * FROM notes WHERE title = 'Ownerless Legacy Note'").get();
    assert.equal(ownerlessAfter.user_id, firstUserId);

    // The first user can fetch the claimed note via API
    const getRes = await request(app)
      .get(`/api/notes/${ownerlessAfter.id}`)
      .set('Authorization', `Bearer ${res.body.token}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.title, 'Ownerless Legacy Note');
  });

  it('POST /api/auth/register rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'first@example.com', password: 'password123' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('POST /api/auth/register rejects invalid inputs', async () => {
    const noEmail = await request(app).post('/api/auth/register').send({ password: 'password123' });
    assert.equal(noEmail.status, 400);

    const badEmail = await request(app).post('/api/auth/register').send({ email: 'notanemail', password: 'password123' });
    assert.equal(badEmail.status, 400);

    const shortPw = await request(app).post('/api/auth/register').send({ email: 'user@test.com', password: '12' });
    assert.equal(shortPw.status, 400);
  });

  it('POST /api/auth/login works with valid credentials and fails on invalid', async () => {
    // Valid login
    const valid = await request(app)
      .post('/api/auth/login')
      .send({ email: 'first@example.com', password: 'password123' });
    assert.equal(valid.status, 200);
    assert.ok(valid.body.token);
    assert.equal(valid.body.user.email, 'first@example.com');

    // Invalid password
    const wrongPw = await request(app)
      .post('/api/auth/login')
      .send({ email: 'first@example.com', password: 'wrongpassword' });
    assert.equal(wrongPw.status, 401);
    assert.ok(wrongPw.body.error);

    // Unknown email
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'password123' });
    assert.equal(unknown.status, 401);
    assert.ok(unknown.body.error);
  });

  it('GET /api/auth/me returns authenticated user details', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'first@example.com', password: 'password123' });

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.email, 'first@example.com');
  });

  it('PUT /api/auth/settings merges user JSON settings', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'first@example.com', password: 'password123' });

    // Initial merge
    const update1 = await request(app)
      .put('/api/auth/settings')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ theme: 'dark', viewMode: 'grid' });
    assert.equal(update1.status, 200);
    assert.equal(update1.body.settings.theme, 'dark');
    assert.equal(update1.body.settings.viewMode, 'grid');

    // Second merge (should preserve theme)
    const update2 = await request(app)
      .put('/api/auth/settings')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ settings: { viewMode: 'list', fontSize: 14 } });
    assert.equal(update2.status, 200);
    assert.equal(update2.body.settings.theme, 'dark');
    assert.equal(update2.body.settings.viewMode, 'list');
    assert.equal(update2.body.settings.fontSize, 14);

    // Check via GET /api/auth/me
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);
    assert.equal(me.body.settings.theme, 'dark');
    assert.equal(me.body.settings.fontSize, 14);
  });
});
