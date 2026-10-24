'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_PATH = ':memory:';

const app = require('../server');
const db = require('../db');

describe('Export & Import API', () => {
  let token;
  let normalNoteId;
  let lockedNoteId;

  

  before(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'export_import@example.com', password: 'password123' });
    token = res.body.token;

    // Create a normal note
    const n1 = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Meeting Notes',
        body: 'Discuss roadmap for Q4',
        tags: ['work', 'planning'],
      });
    normalNoteId = n1.body.id;

    // Create a locked note
    const n2 = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Confidential Strategy',
        body: 'Top secret data',
      });
    lockedNoteId = n2.body.id;

    await request(app)
      .post(`/api/notes/${lockedNoteId}/lock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '5555' });
  });

  it('Exports single note as plain text (.txt)', async () => {
    const res = await request(app)
      .get(`/api/notes/${normalNoteId}/export?format=txt`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/plain'));
    assert.ok(res.text.includes('TITLE: Meeting Notes'));
    assert.ok(res.text.includes('Discuss roadmap for Q4'));
    assert.ok(res.text.includes('planning'));
    assert.ok(res.text.includes('work'));
  });

  it('Exports single note as Markdown (.md)', async () => {
    const res = await request(app)
      .get(`/api/notes/${normalNoteId}/export?format=md`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/markdown'));
    assert.ok(res.text.includes('# Meeting Notes'));
    assert.ok(res.text.includes('`#planning`'));
    assert.ok(res.text.includes('`#work`'));
    assert.ok(res.text.includes('Discuss roadmap for Q4'));
  });

  it('Exports single note as PDF (.pdf) generated via pdfkit', async () => {
    const res = await request(app)
      .get(`/api/notes/${normalNoteId}/export?format=pdf`)
      .set('Authorization', `Bearer ${token}`)
      .responseType('blob');

    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.ok(Buffer.isBuffer(res.body));
    // PDF magic bytes header "%PDF-"
    assert.ok(res.body.slice(0, 5).toString('ascii').startsWith('%PDF'));
  });

  it('Refuses to export locked note (400)', async () => {
    const res = await request(app)
      .get(`/api/notes/${lockedNoteId}/export?format=txt`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Cannot export locked note');
  });

  it('Full JSON backup export skips locked notes', async () => {
    const res = await request(app)
      .get('/api/backup/export')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'].includes('application/json'), true);
    assert.ok(res.body.version);
    assert.ok(Array.isArray(res.body.notes));

    // Normal note is included
    assert.ok(res.body.notes.some((n) => n.id === normalNoteId));

    // Locked note is strictly SKIPPED
    assert.ok(!res.body.notes.some((n) => n.id === lockedNoteId));
  });

  it('Imports JSON notes with validation and returns summary {created, skipped, errors}', async () => {
    const importPayload = {
      notes: [
        { title: 'Imported Valid 1', body: 'Valid note body', tags: ['imported', 'json'] },
        { title: 'Imported Valid 2', body: 'Another note', color: 'mint' },
        { title: '', body: 'Missing title note' }, // Should be skipped (missing title)
        { title: 'x'.repeat(125), body: 'Title too long' }, // Should be skipped
      ],
    };

    const res = await request(app)
      .post('/api/backup/import')
      .set('Authorization', `Bearer ${token}`)
      .send(importPayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.created, 2);
    assert.equal(res.body.skipped, 2);
    assert.equal(res.body.errors.length, 2);

    // Verify imported notes exist
    const notesRes = await request(app)
      .get('/api/notes?q=Imported Valid 1')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(notesRes.status, 200);
    assert.ok(notesRes.body.some((n) => n.title === 'Imported Valid 1'));
  });

  it('Imports Markdown text note with summary', async () => {
    const markdownContent = `# Markdown Imported Note\n\nThis note was imported from raw markdown.`;

    const res = await request(app)
      .post('/api/backup/import')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'text/markdown')
      .send(markdownContent);

    assert.equal(res.status, 200);
    assert.equal(res.body.created, 1);
    assert.equal(res.body.skipped, 0);

    const getRes = await request(app)
      .get('/api/notes?q=Markdown Imported Note')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(getRes.status, 200);
    assert.ok(getRes.body.some((n) => n.title === 'Markdown Imported Note'));
  });
});
