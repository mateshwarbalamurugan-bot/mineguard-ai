'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_PATH = ':memory:';

const app = require('../server');
const db = require('../db');
const { _clearPublicRateLimits } = require('../middleware/publicRateLimit');

describe('Note Sharing & Public Comments API', () => {
  let tokenOwner;
  let tokenOther;
  let sharedNoteId;
  let lockedNoteId;
  let shareToken;

  

  before(async () => {
    _clearPublicRateLimits();

    const resOwner = await request(app)
      .post('/api/auth/register')
      .send({ email: 'owner@example.com', password: 'password123' });
    tokenOwner = resOwner.body.token;

    const resOther = await request(app)
      .post('/api/auth/register')
      .send({ email: 'other@example.com', password: 'password123' });
    tokenOther = resOther.body.token;

    // Normal shareable note
    const n1 = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        title: 'Public Knowledge Base',
        body: 'Collaborative guide for our open-source project.',
        tags: ['guide', 'public'],
      });
    sharedNoteId = n1.body.id;

    // Locked note
    const n2 = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        title: 'Secret Vault',
        body: 'Do not share',
      });
    lockedNoteId = n2.body.id;

    await request(app)
      .post(`/api/notes/${lockedNoteId}/lock`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ pin: '7777' });
  });

  it('Creates a 32-byte secure hex share token', async () => {
    const res = await request(app)
      .post(`/api/notes/${sharedNoteId}/share`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ can_edit: true });

    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    // 32 bytes in hex = 64 characters
    assert.equal(res.body.token.length, 64);
    assert.match(res.body.token, /^[0-9a-f]{64}$/);
    assert.equal(res.body.can_edit, true);

    shareToken = res.body.token;
  });

  it('Refuses to share locked notes (400)', async () => {
    const res = await request(app)
      .post(`/api/notes/${lockedNoteId}/share`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ can_edit: false });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Locked notes cannot be shared');
  });

  it('Public GET /api/public/notes/:token works with no login and leaks NO owner data', async () => {
    // Request without any Authorization header
    const res = await request(app).get(`/api/public/notes/${shareToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.title, 'Public Knowledge Base');
    assert.equal(res.body.body, 'Collaborative guide for our open-source project.');
    assert.deepEqual(res.body.tags, ['guide', 'public']);

    // CRITICAL SECURITY ASSERTIONS: No owner data leaks
    assert.equal(res.body.user_id, undefined);
    assert.equal(res.body.owner, undefined);
    assert.equal(res.body.email, undefined);
    assert.equal(res.body.settings, undefined);
    assert.equal(res.body.lock_hash, undefined);
  });

  it('Public comments: GET and POST /api/public/notes/:token/comments without login', async () => {
    // 1. Post comment anonymously
    const postRes = await request(app)
      .post(`/api/public/notes/${shareToken}/comments`)
      .send({ author: 'Alice Contributor', text: 'Great project guide! Thanks.' });

    assert.equal(postRes.status, 201);
    assert.equal(postRes.body.author, 'Alice Contributor');
    assert.equal(postRes.body.text, 'Great project guide! Thanks.');
    const commentId = postRes.body.id;

    // 2. Post second comment with default author
    await request(app)
      .post(`/api/public/notes/${shareToken}/comments`)
      .send({ text: 'Second anonymous comment' });

    // 3. List comments publicly
    const listRes = await request(app).get(`/api/public/notes/${shareToken}/comments`);
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body));
    assert.equal(listRes.body.length, 2);
    assert.ok(listRes.body.some((c) => c.id === commentId));
  });

  it('Note owner can delete comments, but non-owners cannot (404)', async () => {
    // Create comment
    const postRes = await request(app)
      .post(`/api/public/notes/${shareToken}/comments`)
      .send({ author: 'Spammer', text: 'Buy cheap items at link' });
    const commentId = postRes.body.id;

    // Other user attempts to delete -> 404
    const otherDel = await request(app)
      .delete(`/api/notes/${sharedNoteId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${tokenOther}`);
    assert.equal(otherDel.status, 404);

    // Note owner deletes -> 204
    const ownerDel = await request(app)
      .delete(`/api/notes/${sharedNoteId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${tokenOwner}`);
    assert.equal(ownerDel.status, 204);

    // Verify comment is deleted from public list
    const listAfter = await request(app).get(`/api/public/notes/${shareToken}/comments`);
    assert.ok(!listAfter.body.some((c) => c.id === commentId));
  });

  it('Revoking share makes public routes return 404', async () => {
    // Revoke share as owner
    const revokeRes = await request(app)
      .delete(`/api/notes/${sharedNoteId}/share`)
      .set('Authorization', `Bearer ${tokenOwner}`);
    assert.equal(revokeRes.status, 204);

    // Subsequent public view returns 404
    const getRes = await request(app).get(`/api/public/notes/${shareToken}`);
    assert.equal(getRes.status, 404);

    // Subsequent public comments access returns 404
    const commentRes = await request(app).get(`/api/public/notes/${shareToken}/comments`);
    assert.equal(commentRes.status, 404);
  });
});
