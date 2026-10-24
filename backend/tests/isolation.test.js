'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_PATH = ':memory:';

const app = require('../server');
const db = require('../db');

describe('Multi-User Resource Isolation', () => {
  let userAToken;
  let userBToken;
  let noteAId;
  let folderAId;

  

  before(async () => {
    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'password123' });
    userAToken = resA.body.token;

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@example.com', password: 'password123' });
    userBToken = resB.body.token;

    // User A creates a folder
    const folderRes = await request(app)
      .post('/api/folders')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Alice Private Folder' });
    folderAId = folderRes.body.id;

    // User A creates a note
    const noteRes = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Alice Diary',
        body: 'Super confidential secrets',
        tags: ['alice', 'private'],
        folder_id: folderAId,
      });
    noteAId = noteRes.body.id;
  });

  it('User B cannot see User A note in GET /api/notes or search', async () => {
    const listRes = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${userBToken}`);
    assert.equal(listRes.status, 200);
    assert.ok(!listRes.body.some((n) => n.id === noteAId));

    const searchRes = await request(app)
      .get('/api/notes?q=confidential')
      .set('Authorization', `Bearer ${userBToken}`);
    assert.equal(searchRes.status, 200);
    assert.ok(!searchRes.body.some((n) => n.id === noteAId));
  });

  it('User B GET /api/notes/:id on User A note returns 404', async () => {
    const res = await request(app)
      .get(`/api/notes/${noteAId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'Note not found');
  });

  it('User B PUT and PATCH on User A note returns 404', async () => {
    const putRes = await request(app)
      .put(`/api/notes/${noteAId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ title: 'Hacked Title' });
    assert.equal(putRes.status, 404);

    const patchRes = await request(app)
      .patch(`/api/notes/${noteAId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ title: 'Hacked Title' });
    assert.equal(patchRes.status, 404);
  });

  it('User B DELETE on User A note returns 404', async () => {
    const delRes = await request(app)
      .delete(`/api/notes/${noteAId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    assert.equal(delRes.status, 404);

    // Verify User A still has the note intact
    const verifyRes = await request(app)
      .get(`/api/notes/${noteAId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.title, 'Alice Diary');
  });

  it('User B lock operations on User A note return 404', async () => {
    const lockRes = await request(app)
      .post(`/api/notes/${noteAId}/lock`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ pin: '1111' });
    assert.equal(lockRes.status, 404);

    const revealRes = await request(app)
      .post(`/api/notes/${noteAId}/reveal`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ pin: '1111' });
    assert.equal(revealRes.status, 404);
  });

  it('User B folder access on User A folder returns 404', async () => {
    const getRes = await request(app)
      .get(`/api/folders/${folderAId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    assert.equal(getRes.status, 404);

    const patchRes = await request(app)
      .patch(`/api/folders/${folderAId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ name: 'Bob Renamed' });
    assert.equal(patchRes.status, 404);

    const delRes = await request(app)
      .delete(`/api/folders/${folderAId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    assert.equal(delRes.status, 404);
  });
});
