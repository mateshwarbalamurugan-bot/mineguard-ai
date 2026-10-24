'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_PATH = ':memory:';
process.env.AI_PROVIDER = 'mock';

const app = require('../server');
const db = require('../db');
const { _clearRateLimits } = require('../services/ai');

describe('AI Service API', () => {
  let tokenUser1;
  let tokenUser2;
  let normalNoteId;
  let lockedNoteId;

  

  before(async () => {
    _clearRateLimits();

    const res1 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'ai_u1@example.com', password: 'password123' });
    tokenUser1 = res1.body.token;

    const res2 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'ai_u2@example.com', password: 'password123' });
    tokenUser2 = res2.body.token;

    // Create normal note
    const n1 = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({
        title: 'Project Launch Plan',
        body: 'We will deploy the product on Monday. Verify DNS settings, test CDN caches, and alert on-call engineer.',
      });
    normalNoteId = n1.body.id;

    // Create locked note
    const n2 = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({
        title: 'Secret AI Note',
        body: 'Do not analyze this',
      });
    lockedNoteId = n2.body.id;

    await request(app)
      .post(`/api/notes/${lockedNoteId}/lock`)
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ pin: '4321' });
  });

  it('POST /api/ai/summarize produces a summary', async () => {
    const res = await request(app)
      .post('/api/ai/summarize')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ note_id: normalNoteId });

    assert.equal(res.status, 200);
    assert.ok(res.body.summary);
    assert.ok(res.body.summary.includes('Project Launch Plan'));
  });

  it('POST /api/ai/suggest-tags returns suggested tags array', async () => {
    const res = await request(app)
      .post('/api/ai/suggest-tags')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ note_id: normalNoteId });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.tags));
    assert.ok(res.body.tags.length >= 2);
  });

  it('POST /api/ai/improve returns improved text with action', async () => {
    const res = await request(app)
      .post('/api/ai/improve')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ text: 'this is a draft with typos and bad grammar', action: 'proofread' });

    assert.equal(res.status, 200);
    assert.ok(res.body.improved);
    assert.equal(res.body.action, 'proofread');
  });

  it('POST /api/ai/ask answers a question based on context', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ note_id: normalNoteId, question: 'When is the product deploying?' });

    assert.equal(res.status, 200);
    assert.ok(res.body.answer);
  });

  it('Refuses locked notes for all AI endpoints (400)', async () => {
    // 1. Summarize
    const sum = await request(app)
      .post('/api/ai/summarize')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ note_id: lockedNoteId });
    assert.equal(sum.status, 400);
    assert.equal(sum.body.error, 'Cannot process locked note with AI');

    // 2. Suggest tags
    const tags = await request(app)
      .post('/api/ai/suggest-tags')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ note_id: lockedNoteId });
    assert.equal(tags.status, 400);
    assert.equal(tags.body.error, 'Cannot process locked note with AI');

    // 3. Improve
    const imp = await request(app)
      .post('/api/ai/improve')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ note_id: lockedNoteId });
    assert.equal(imp.status, 400);
    assert.equal(imp.body.error, 'Cannot process locked note with AI');

    // 4. Ask
    const ask = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ note_id: lockedNoteId, question: 'What is inside?' });
    assert.equal(ask.status, 400);
    assert.equal(ask.body.error, 'Cannot process locked note with AI');
  });

  it('Enforces 20 calls/hour per user rate limit (429)', async () => {
    _clearRateLimits();

    // Make 20 successful calls
    for (let i = 0; i < 20; i++) {
      const res = await request(app)
        .post('/api/ai/summarize')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ title: `Test ${i}`, body: 'Content' });
      assert.equal(res.status, 200);
    }

    // 21st call must be blocked with 429
    const blocked = await request(app)
      .post('/api/ai/summarize')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ title: 'Test 21', body: 'Content' });
    assert.equal(blocked.status, 429);
    assert.ok(blocked.body.error.includes('rate limit exceeded'));

    // User 2 should NOT be blocked
    const user2Res = await request(app)
      .post('/api/ai/summarize')
      .set('Authorization', `Bearer ${tokenUser2}`)
      .send({ title: 'User 2 Note', body: 'Content' });
    assert.equal(user2Res.status, 200);

    _clearRateLimits();
  });
});
