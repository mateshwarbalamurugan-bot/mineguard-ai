'use strict';
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Use an in-memory DB for tests
process.env.DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../server');

describe('Notes API', () => {
  it('GET /api/notes returns empty array initially', async () => {
    const res = await request(app).get('/api/notes');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  it('POST /api/notes creates a note', async () => {
    const res = await request(app)
      .post('/api/notes')
      .send({ title: 'Test Note', body: 'Hello world', tags: 'test,demo' });
    assert.equal(res.status, 201);
    assert.equal(res.body.title, 'Test Note');
    assert.equal(res.body.tags, 'demo,test');
  });

  it('POST /api/notes rejects missing title', async () => {
    const res = await request(app).post('/api/notes').send({ body: 'no title' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('POST /api/notes rejects title > 120 chars', async () => {
    const res = await request(app).post('/api/notes').send({ title: 'a'.repeat(121) });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('POST /api/notes rejects body > 100000 chars', async () => {
    const res = await request(app).post('/api/notes').send({ title: 'ok', body: 'b'.repeat(100001) });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('GET /api/notes/:id returns the note', async () => {
    const create = await request(app).post('/api/notes').send({ title: 'Find Me' });
    const res = await request(app).get(`/api/notes/${create.body.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.title, 'Find Me');
  });

  it('GET /api/notes/:id returns 404 for missing note', async () => {
    const res = await request(app).get('/api/notes/999999');
    assert.equal(res.status, 404);
  });

  it('GET /api/notes/:id returns 400 for invalid id', async () => {
    const res = await request(app).get('/api/notes/abc');
    assert.equal(res.status, 400);
  });

  it('PUT /api/notes/:id updates the note', async () => {
    const create = await request(app).post('/api/notes').send({ title: 'Old Title' });
    const res = await request(app)
      .put(`/api/notes/${create.body.id}`)
      .send({ title: 'New Title', body: 'updated' });
    assert.equal(res.status, 200);
    assert.equal(res.body.title, 'New Title');
  });

  it('DELETE /api/notes/:id removes the note', async () => {
    const create = await request(app).post('/api/notes').send({ title: 'To Delete' });
    const del = await request(app).delete(`/api/notes/${create.body.id}`);
    assert.equal(del.status, 204);
    const get = await request(app).get(`/api/notes/${create.body.id}`);
    assert.equal(get.status, 404);
  });

  it('GET /api/notes?q= filters by search', async () => {
    await request(app).post('/api/notes').send({ title: 'Searchable note', body: 'special content' });
    const res = await request(app).get('/api/notes?q=special');
    assert.ok(res.body.some(n => n.body.includes('special')));
  });

  it('GET /api/notes?tag= filters by tag', async () => {
    await request(app).post('/api/notes').send({ title: 'Tagged', tags: 'filtertest' });
    const res = await request(app).get('/api/notes?tag=filtertest');
    assert.ok(res.body.every(n => n.tags.includes('filtertest')));
  });
});
