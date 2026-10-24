'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const fs = require('fs');
const path = require('path');

process.env.DB_PATH = ':memory:';

const app = require('../server');
const db = require('../db');
const { UPLOADS_DIR } = require('../middleware/upload');

describe('Attachments API', () => {
  let tokenUser1;
  let tokenUser2;
  let note1Id;
  let attachment1Id;
  let uploadedFilename;

  

  before(async () => {
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'attach_u1@example.com', password: 'password123' });
    tokenUser1 = res1.body.token;

    const res2 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'attach_u2@example.com', password: 'password123' });
    tokenUser2 = res2.body.token;

    const noteRes = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ title: 'Note with image' });
    note1Id = noteRes.body.id;
  });

  it('Uploads a valid PNG image attachment with randomized filename', async () => {
    // 1x1 transparent PNG buffer
    const pngBuffer = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');

    const res = await request(app)
      .post(`/api/notes/${note1Id}/attachments`)
      .set('Authorization', `Bearer ${tokenUser1}`)
      .attach('file', pngBuffer, 'test-image.png');

    assert.equal(res.status, 201);
    assert.ok(res.body.id);
    assert.equal(res.body.original_name, 'test-image.png');
    assert.equal(res.body.mime_type, 'image/png');
    assert.notEqual(res.body.filename, 'test-image.png'); // Must be randomized
    assert.match(res.body.filename, /^[a-f0-9]{32}\.png$/i); // Random hex name

    attachment1Id = res.body.id;
    uploadedFilename = res.body.filename;

    // Verify file exists on disk
    const filePath = path.join(UPLOADS_DIR, uploadedFilename);
    assert.ok(fs.existsSync(filePath));
  });

  it('Rejects files with disallowed types (e.g. text/html, txt)', async () => {
    const txtBuffer = Buffer.from('Hello plain text');

    const res = await request(app)
      .post(`/api/notes/${note1Id}/attachments`)
      .set('Authorization', `Bearer ${tokenUser1}`)
      .attach('file', txtBuffer, 'document.txt');

    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('Rejects files exceeding 5MB limit', async () => {
    // Create buffer slightly larger than 5MB
    const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024);

    const res = await request(app)
      .post(`/api/notes/${note1Id}/attachments`)
      .set('Authorization', `Bearer ${tokenUser1}`)
      .attach('file', bigBuffer, 'huge.jpg');

    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.ok(res.body.error.includes('5MB'));
  });

  it('Serves attachment only via authenticated ownership-checked route', async () => {
    // 1. Unauthenticated -> 401
    const noAuth = await request(app).get(`/api/attachments/${attachment1Id}`);
    assert.equal(noAuth.status, 401);

    // 2. User 2 (not owner) -> 404
    const otherUser = await request(app)
      .get(`/api/attachments/${attachment1Id}`)
      .set('Authorization', `Bearer ${tokenUser2}`);
    assert.equal(otherUser.status, 404);

    // 3. User 1 (owner) -> 200 with correct Content-Type
    const ownerRes = await request(app)
      .get(`/api/attachments/${attachment1Id}`)
      .set('Authorization', `Bearer ${tokenUser1}`);
    assert.equal(ownerRes.status, 200);
    assert.equal(ownerRes.headers['content-type'], 'image/png');
    assert.ok(ownerRes.body.length > 0);
  });

  it('List attachments for note', async () => {
    const listRes = await request(app)
      .get(`/api/notes/${note1Id}/attachments`)
      .set('Authorization', `Bearer ${tokenUser1}`);
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body));
    assert.ok(listRes.body.some((a) => a.id === attachment1Id));
  });

  it('DELETE /api/attachments/:id removes record and file from disk', async () => {
    const delRes = await request(app)
      .delete(`/api/attachments/${attachment1Id}`)
      .set('Authorization', `Bearer ${tokenUser1}`);
    assert.equal(delRes.status, 204);

    // Verify record gone
    const getRes = await request(app)
      .get(`/api/attachments/${attachment1Id}`)
      .set('Authorization', `Bearer ${tokenUser1}`);
    assert.equal(getRes.status, 404);

    // Verify file removed from disk
    const filePath = path.join(UPLOADS_DIR, uploadedFilename);
    assert.ok(!fs.existsSync(filePath));
  });
});
