'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const WebSocket = require('ws');
const Y = require('yjs');

process.env.DB_PATH = ':memory:';
process.env.COLLAB_ENABLED = 'true';
process.env.NODE_ENV = 'test';

const app = require('../server');
const db = require('../db');
const { getCollabServer } = require('../services/collabServer');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createTestClient(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const messageQueue = [];
    const messageWaiters = [];

    ws.on('message', (data) => {
      let parsed;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        return;
      }

      for (let i = 0; i < messageWaiters.length; i++) {
        const { predicate, resolveWaiter } = messageWaiters[i];
        if (predicate(parsed)) {
          messageWaiters.splice(i, 1);
          resolveWaiter(parsed);
          return;
        }
      }
      messageQueue.push(parsed);
    });

    ws.on('open', () => {
      resolve({
        ws,
        nextMessage(predicate = () => true, timeoutMs = 3000) {
          const idx = messageQueue.findIndex(predicate);
          if (idx !== -1) {
            return Promise.resolve(messageQueue.splice(idx, 1)[0]);
          }
          return new Promise((res, rej) => {
            const timer = setTimeout(() => {
              rej(new Error(`Timed out waiting for message matching predicate after ${timeoutMs}ms`));
            }, timeoutMs);

            messageWaiters.push({
              predicate,
              resolveWaiter: (msg) => {
                clearTimeout(timer);
                res(msg);
              },
            });
          });
        },
        hasMessage(predicate) {
          return messageQueue.some(predicate);
        },
        send(obj) {
          ws.send(JSON.stringify(obj));
        },
        close() {
          try {
            ws.close();
          } catch {}
        },
      });
    });

    ws.on('error', (err) => reject(err));
  });
}

function uint8ArrayToBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

function base64ToUint8Array(base64) {
  return Buffer.from(base64, 'base64');
}

describe('Real-time Collaboration Suite (Yjs + WebSocket at /ws)', () => {
  let server;
  let port;
  let ownerToken;
  let otherUserToken;
  let textNoteId;
  let readOnlyNoteId;
  let checklistNoteId;
  let editShareToken;
  let readOnlyShareToken;

  before(async () => {
    // Start listening on ephemeral port for WebSocket tests
    await new Promise((resolve) => {
      server = app.server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });

    // 1. Register Owner
    const regOwner = await request(app)
      .post('/api/auth/register')
      .send({ email: 'collab_owner@example.com', password: 'password123' });
    ownerToken = regOwner.body.token;

    // 2. Register Other User
    const regOther = await request(app)
      .post('/api/auth/register')
      .send({ email: 'collab_other@example.com', password: 'password123' });
    otherUserToken = regOther.body.token;

    // 3. Create Text Note (for collaborative editing)
    const textNoteRes = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Collab Document', body: 'Initial note text', type: 'text' });
    textNoteId = textNoteRes.body.id;

    // 4. Create Read-Only Text Note (for read-only viewer testing)
    const readOnlyNoteRes = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Read-only Document', body: 'Read only text', type: 'text' });
    readOnlyNoteId = readOnlyNoteRes.body.id;

    // 5. Create Checklist Note
    const checklistRes = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Checklist Task',
        type: 'checklist',
        body: [{ id: '1', text: 'Task 1', done: false }],
      });
    checklistNoteId = checklistRes.body.id;

    // 6. Create Can-Edit Share Token on textNoteId
    const editShareRes = await request(app)
      .post(`/api/notes/${textNoteId}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ can_edit: true });
    editShareToken = editShareRes.body.token;

    // 7. Create Read-Only Share Token on readOnlyNoteId
    const readOnlyShareRes = await request(app)
      .post(`/api/notes/${readOnlyNoteId}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ can_edit: false });
    readOnlyShareToken = readOnlyShareRes.body.token;
  });

  after(async () => {
    const collabServer = getCollabServer();
    if (collabServer) {
      collabServer.close();
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('Owner with valid JWT can connect and receives initial sync-init with initial text', async () => {
    const wsUrl = `ws://127.0.0.1:${port}/ws?noteId=${textNoteId}&token=${ownerToken}`;
    const client = await createTestClient(wsUrl);

    const message = await client.nextMessage((m) => m.type === 'sync-init');

    assert.equal(message.type, 'sync-init');
    assert.equal(message.canEdit, true);
    assert.equal(message.role, 'owner');
    assert.ok(message.update);

    // Apply update to local Y.Doc to verify content
    const clientDoc = new Y.Doc();
    Y.applyUpdate(clientDoc, base64ToUint8Array(message.update));
    assert.equal(clientDoc.getText('content').toString(), 'Initial note text');

    client.close();
  });

  it('Non-owner user with JWT is rejected (403)', async () => {
    const wsUrl = `ws://127.0.0.1:${port}/ws?noteId=${textNoteId}&token=${otherUserToken}`;
    await assert.rejects(async () => {
      await createTestClient(wsUrl);
    });
  });

  it('Unauthenticated connection without token is rejected (401/403)', async () => {
    const wsUrl = `ws://127.0.0.1:${port}/ws?noteId=${textNoteId}`;
    await assert.rejects(async () => {
      await createTestClient(wsUrl);
    });
  });

  it('Rejects collaboration on non-text (checklist) notes', async () => {
    const wsUrl = `ws://127.0.0.1:${port}/ws?noteId=${checklistNoteId}&token=${ownerToken}`;
    await assert.rejects(async () => {
      await createTestClient(wsUrl);
    });
  });

  it('Share token with can_edit = true connects with write access', async () => {
    const wsUrl = `ws://127.0.0.1:${port}/ws?noteId=${textNoteId}&shareToken=${editShareToken}`;
    const client = await createTestClient(wsUrl);

    const message = await client.nextMessage((m) => m.type === 'sync-init');

    assert.equal(message.type, 'sync-init');
    assert.equal(message.canEdit, true);
    assert.equal(message.role, 'collaborator');

    client.close();
  });

  it('Share token with can_edit = false connects with read-only access', async () => {
    const wsUrl = `ws://127.0.0.1:${port}/ws?noteId=${readOnlyNoteId}&shareToken=${readOnlyShareToken}`;
    const client = await createTestClient(wsUrl);

    const message = await client.nextMessage((m) => m.type === 'sync-init');

    assert.equal(message.type, 'sync-init');
    assert.equal(message.canEdit, false);
    assert.equal(message.role, 'viewer');

    client.close();
  });

  it('Server enforces read-only: drops update from read-only viewer and notifies error', async () => {
    // 1. Owner connects
    const ownerClient = await createTestClient(`ws://127.0.0.1:${port}/ws?noteId=${readOnlyNoteId}&token=${ownerToken}`);
    await ownerClient.nextMessage((m) => m.type === 'sync-init');

    // 2. Read-only viewer connects
    const viewerClient = await createTestClient(`ws://127.0.0.1:${port}/ws?noteId=${readOnlyNoteId}&shareToken=${readOnlyShareToken}`);
    await viewerClient.nextMessage((m) => m.type === 'sync-init');

    // 3. Read-only viewer tries to send document update
    const viewerDoc = new Y.Doc();
    viewerDoc.getText('content').insert(0, 'Unauthorized Hacked Content!');
    const update = uint8ArrayToBase64(Y.encodeStateAsUpdate(viewerDoc));

    viewerClient.send({ type: 'doc-update', update });

    // Read-only viewer should receive error notice
    const viewerErrorMsg = await viewerClient.nextMessage((m) => m.type === 'error');

    assert.equal(viewerErrorMsg.type, 'error');
    assert.equal(viewerErrorMsg.code, 'READ_ONLY');

    await wait(150);
    assert.equal(ownerClient.hasMessage((m) => m.type === 'doc-update'), false, 'Owner must NOT receive update from read-only client');

    ownerClient.close();
    viewerClient.close();
  });

  it('Two write clients can collaborate in real-time with updates broadcasted', async () => {
    // 1. Owner connects
    const ownerClient = await createTestClient(`ws://127.0.0.1:${port}/ws?noteId=${textNoteId}&token=${ownerToken}`);
    const ownerInit = await ownerClient.nextMessage((m) => m.type === 'sync-init');
    const ownerDoc = new Y.Doc();
    Y.applyUpdate(ownerDoc, base64ToUint8Array(ownerInit.update));

    // 2. Collaborator connects
    const collabClient = await createTestClient(`ws://127.0.0.1:${port}/ws?noteId=${textNoteId}&shareToken=${editShareToken}`);
    const collabInit = await collabClient.nextMessage((m) => m.type === 'sync-init');
    const collabDoc = new Y.Doc();
    Y.applyUpdate(collabDoc, base64ToUint8Array(collabInit.update));

    // 3. Owner makes an update
    let ownerUpdateBytes;
    ownerDoc.on('update', (u) => {
      ownerUpdateBytes = u;
    });
    ownerDoc.getText('content').insert(ownerDoc.getText('content').length, ' - Updated live');

    // Send update from owner to server
    ownerClient.send({
      type: 'doc-update',
      update: uint8ArrayToBase64(ownerUpdateBytes),
    });

    // 4. Collaborator receives broadcast
    const broadcastMsg = await collabClient.nextMessage((m) => m.type === 'doc-update');
    assert.ok(broadcastMsg.update);
    Y.applyUpdate(collabDoc, base64ToUint8Array(broadcastMsg.update));

    // Both documents converge!
    assert.equal(collabDoc.getText('content').toString(), 'Initial note text - Updated live');

    ownerClient.close();
    collabClient.close();
  });

  it('Persists ydoc state after 2s idle and mirrors plain text into notes.body in SQLite', async () => {
    // Connect owner and make an update
    const ownerClient = await createTestClient(`ws://127.0.0.1:${port}/ws?noteId=${textNoteId}&token=${ownerToken}`);
    const ownerInit = await ownerClient.nextMessage((m) => m.type === 'sync-init');
    const ownerDoc = new Y.Doc();
    Y.applyUpdate(ownerDoc, base64ToUint8Array(ownerInit.update));

    let updateBytes;
    ownerDoc.on('update', (u) => {
      updateBytes = u;
    });
    ownerDoc.getText('content').insert(ownerDoc.getText('content').length, ' - Idle saved');

    ownerClient.send({
      type: 'doc-update',
      update: uint8ArrayToBase64(updateBytes),
    });

    // Wait for the 2000ms idle timer to flush to disk while client remains connected
    await wait(2300);

    // Verify note_collab table has binary state
    const collabRecord = db.prepare('SELECT note_id, ydoc_state, updated_at FROM note_collab WHERE note_id = ?').get(textNoteId);
    assert.ok(collabRecord, 'note_collab record must exist');
    assert.ok(collabRecord.ydoc_state.length > 0, 'ydoc_state must contain binary state');

    // Verify notes table has mirrored plain text
    const note = db.prepare('SELECT body FROM notes WHERE id = ?').get(textNoteId);
    assert.equal(note.body, 'Initial note text - Updated live - Idle saved');

    ownerClient.close();
  });

  it('COLLAB_ENABLED=false flag rejects /ws connections', async () => {
    process.env.COLLAB_ENABLED = 'false';

    const wsUrl = `ws://127.0.0.1:${port}/ws?noteId=${textNoteId}&token=${ownerToken}`;
    await assert.rejects(async () => {
      await createTestClient(wsUrl);
    });

    process.env.COLLAB_ENABLED = 'true';
  });
});
