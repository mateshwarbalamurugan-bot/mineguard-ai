'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_PATH = ':memory:';

const app = require('../server');
const db = require('../db');

describe('Folders API', () => {
  let token;

  

  before(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'folder_user@example.com', password: 'password123' });
    token = res.body.token;
  });

  it('GET /api/folders returns empty array initially', async () => {
    const res = await request(app)
      .get('/api/folders')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  it('POST /api/folders creates a new folder', async () => {
    const res = await request(app)
      .post('/api/folders')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Work Projects' });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, 'Work Projects');
    assert.ok(res.body.id);
  });

  it('POST /api/folders rejects empty or invalid name', async () => {
    const empty = await request(app)
      .post('/api/folders')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '   ' });
    assert.equal(empty.status, 400);

    const tooLong = await request(app)
      .post('/api/folders')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'a'.repeat(101) });
    assert.equal(tooLong.status, 400);
  });

  it('GET /api/folders/:id returns the folder', async () => {
    const create = await request(app)
      .post('/api/folders')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Personal' });

    const get = await request(app)
      .get(`/api/folders/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(get.status, 200);
    assert.equal(get.body.name, 'Personal');
  });

  it('PATCH /api/folders/:id updates the folder name', async () => {
    const create = await request(app)
      .post('/api/folders')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Old Folder Name' });

    const patch = await request(app)
      .patch(`/api/folders/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed Folder' });
    assert.equal(patch.status, 200);
    assert.equal(patch.body.name, 'Renamed Folder');
  });

  it('DELETE /api/folders/:id deletes folder and moves notes to folder_id = null', async () => {
    // 1. Create a folder
    const folderRes = await request(app)
      .post('/api/folders')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Temporary Folder' });
    const folderId = folderRes.body.id;

    // 2. Create a note in this folder
    const noteRes = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Assigned Note', folder_id: folderId });
    assert.equal(noteRes.status, 201);
    assert.equal(noteRes.body.folder_id, folderId);

    // 3. Delete the folder
    const delRes = await request(app)
      .delete(`/api/folders/${folderId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(delRes.status, 204);

    // 4. Verify folder is gone
    const getFolder = await request(app)
      .get(`/api/folders/${folderId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(getFolder.status, 404);

    // 5. Verify the note still exists and folder_id is null ("delete moves notes to none")
    const getNote = await request(app)
      .get(`/api/notes/${noteRes.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(getNote.status, 200);
    assert.equal(getNote.body.folder_id, null);
  });
});
