'use strict';
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_PATH = ':memory:';

const app = require('../server');

describe('Notes API Comprehensive Suite', () => {
  let token;

  before(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'notes_user@example.com', password: 'password123' });
    token = res.body.token;
  });

  it('GET /api/notes requires authentication', async () => {
    const res = await request(app).get('/api/notes');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Unauthorized');
  });

  it('GET /api/notes returns empty array initially for new user', async () => {
    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  it('POST /api/notes creates a note with tags as array', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Note', body: 'Hello world', tags: ['test', 'demo'] });
    assert.equal(res.status, 201);
    assert.equal(res.body.title, 'Test Note');
    assert.deepEqual(res.body.tags, ['demo', 'test']);
    assert.equal(res.body.locked, false);
    assert.equal(res.body.pinned, false);
    assert.equal(res.body.color, 'default');
  });

  it('POST /api/notes also accepts comma-separated tags string and normalizes to array', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'String Tag Note', body: 'Testing', tags: 'work, ideas, WORK' });
    assert.equal(res.status, 201);
    assert.deepEqual(res.body.tags, ['ideas', 'work']);
  });

  it('POST /api/notes validates input constraints', async () => {
    // Missing title
    const noTitle = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'no title' });
    assert.equal(noTitle.status, 400);

    // Title > 120 chars
    const longTitle = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'a'.repeat(121) });
    assert.equal(longTitle.status, 400);

    // Body > 100000 chars
    const longBody = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'ok', body: 'b'.repeat(100001) });
    assert.equal(longBody.status, 400);

    // Invalid color
    const badColor = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Color test', color: 'neon-green' });
    assert.equal(badColor.status, 400);
  });

  it('Checklist note validation and search matching checklist text', async () => {
    // Invalid checklist body (not array)
    const badChecklist = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Checklist', type: 'checklist', body: 'plain text' });
    assert.equal(badChecklist.status, 400);

    // Valid checklist note
    const checklistItems = [
      { id: '1', text: 'Buy almond milk', done: false },
      { id: '2', text: 'Call dentist', done: true },
    ];
    const created = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Daily Tasks', type: 'checklist', body: checklistItems });
    assert.equal(created.status, 201);
    assert.equal(created.body.type, 'checklist');

    // Search query matches text inside the checklist items
    const searchRes = await request(app)
      .get('/api/notes?q=almond')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(searchRes.status, 200);
    assert.ok(searchRes.body.some((n) => n.id === created.body.id));
  });

  it('GET /api/notes/:id, 404 for missing note, 400 for invalid id', async () => {
    const create = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Find Me' });

    const getRes = await request(app)
      .get(`/api/notes/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.title, 'Find Me');

    const notFound = await request(app)
      .get('/api/notes/999999')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(notFound.status, 404);

    const badId = await request(app)
      .get('/api/notes/invalid-id')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(badId.status, 400);
  });

  it('PATCH /api/notes/:id updates partial attributes', async () => {
    const create = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Original Title', body: 'Original Body', color: 'default' });

    const noteId = create.body.id;

    // Patch only color and pinned
    const patch1 = await request(app)
      .patch(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ color: 'mint', pinned: true });
    assert.equal(patch1.status, 200);
    assert.equal(patch1.body.title, 'Original Title');
    assert.equal(patch1.body.color, 'mint');
    assert.equal(patch1.body.pinned, true);

    // Patch only title
    const patch2 = await request(app)
      .patch(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Patched Title' });
    assert.equal(patch2.status, 200);
    assert.equal(patch2.body.title, 'New Patched Title');
    assert.equal(patch2.body.color, 'mint');
  });

  it('Notes filtering and sorting with pinned notes first', async () => {
    // Register a dedicated user for sort tests to isolate from earlier notes
    const sortUser = await request(app)
      .post('/api/auth/register')
      .send({ email: 'sort_user@example.com', password: 'password123' });
    const sortToken = sortUser.body.token;

    // Create 3 notes: 1 pinned, 2 unpinned
    const n1 = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${sortToken}`)
      .send({ title: 'Zebra Note', position: 10, pinned: false });
    const n2 = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${sortToken}`)
      .send({ title: 'Apple Note', position: 5, pinned: false });
    const n3 = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${sortToken}`)
      .send({ title: 'Middle Note Pinned', position: 20, pinned: true });

    // Sort by title: pinned note should still come first!
    const byTitle = await request(app)
      .get('/api/notes?sort=title')
      .set('Authorization', `Bearer ${sortToken}`);
    assert.equal(byTitle.status, 200);
    assert.equal(byTitle.body[0].id, n3.body.id); // pinned note is first
    assert.equal(byTitle.body[1].id, n2.body.id); // Apple note
    assert.equal(byTitle.body[2].id, n1.body.id); // Zebra note

    // Sort manual: pinned note first, then position ASC
    const byManual = await request(app)
      .get('/api/notes?sort=manual')
      .set('Authorization', `Bearer ${sortToken}`);
    assert.equal(byManual.status, 200);
    assert.equal(byManual.body[0].id, n3.body.id); // pinned note
    assert.equal(byManual.body[1].id, n2.body.id); // pos 5
    assert.equal(byManual.body[2].id, n1.body.id); // pos 10
  });

  it('PATCH /api/notes/reorder updates positions in batch', async () => {
    const a = await request(app).post('/api/notes').set('Authorization', `Bearer ${token}`).send({ title: 'A' });
    const b = await request(app).post('/api/notes').set('Authorization', `Bearer ${token}`).send({ title: 'B' });

    const reorderRes = await request(app)
      .patch('/api/notes/reorder')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [b.body.id, a.body.id] });
    assert.equal(reorderRes.status, 200);

    const checkB = await request(app).get(`/api/notes/${b.body.id}`).set('Authorization', `Bearer ${token}`);
    const checkA = await request(app).get(`/api/notes/${a.body.id}`).set('Authorization', `Bearer ${token}`);
    assert.equal(checkB.body.position, 0);
    assert.equal(checkA.body.position, 1);
  });

  it('Soft delete to trash, restore, permanent delete, and empty trash', async () => {
    const note = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Trash Candidate' });
    const noteId = note.body.id;

    // 1. Soft-delete
    const delRes = await request(app)
      .delete(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(delRes.status, 204);

    // Note is not in active notes list
    const activeList = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${token}`);
    assert.ok(!activeList.body.some((n) => n.id === noteId));

    // Note IS in trashed notes list
    const trashedList = await request(app)
      .get('/api/notes?status=trashed')
      .set('Authorization', `Bearer ${token}`);
    assert.ok(trashedList.body.some((n) => n.id === noteId));

    // 2. Restore note
    const restoreRes = await request(app)
      .post(`/api/notes/${noteId}/restore`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(restoreRes.status, 200);
    assert.equal(restoreRes.body.status, 'active');

    // 3. Permanent delete
    const permRes = await request(app)
      .delete(`/api/notes/${noteId}/permanent`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(permRes.status, 204);

    const verifyGone = await request(app)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(verifyGone.status, 404);

    // 4. Empty trash
    const trash1 = await request(app).post('/api/notes').set('Authorization', `Bearer ${token}`).send({ title: 'T1' });
    const trash2 = await request(app).post('/api/notes').set('Authorization', `Bearer ${token}`).send({ title: 'T2' });
    await request(app).delete(`/api/notes/${trash1.body.id}`).set('Authorization', `Bearer ${token}`);
    await request(app).delete(`/api/notes/${trash2.body.id}`).set('Authorization', `Bearer ${token}`);

    const emptyTrashRes = await request(app)
      .delete('/api/notes/trash')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(emptyTrashRes.status, 204);

    const trashedAfter = await request(app)
      .get('/api/notes?status=trashed')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(trashedAfter.body.length, 0);
  });

  it('GET /api/stats and GET /api/tags return accurate metrics', async () => {
    // Create note with tags
    await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Tagged Metric Note', tags: ['alpha', 'beta'] });

    // GET /api/stats
    const statsRes = await request(app)
      .get('/api/stats')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(statsRes.status, 200);
    assert.ok(typeof statsRes.body.total === 'number');
    assert.ok(typeof statsRes.body.active === 'number');
    assert.ok(typeof statsRes.body.tags === 'number');
    assert.ok(typeof statsRes.body.folders === 'number');

    // GET /api/tags
    const tagsRes = await request(app)
      .get('/api/tags')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(tagsRes.status, 200);
    assert.ok(Array.isArray(tagsRes.body));
    const alphaTag = tagsRes.body.find((t) => t.tag === 'alpha');
    assert.ok(alphaTag);
    assert.ok(alphaTag.count >= 1);
  });
});
