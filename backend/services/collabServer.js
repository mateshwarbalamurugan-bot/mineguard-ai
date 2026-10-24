'use strict';
const WebSocket = require('ws');
const { URL } = require('url');
const { JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const Y = require('yjs');
const db = require('../db');
const IDLE_PERSIST_MS = 2000;

class CollabServer {
  constructor(server, options = {}) {
    this.server = server;
    this.rooms = new Map(); // noteId -> Room
    this.options = options;

    this.wss = new WebSocket.Server({ noServer: true });

    this.setupUpgradeHandler();
    this.setupWss();
  }

  isCollabEnabled() {
    return process.env.COLLAB_ENABLED !== 'false';
  }

  setupUpgradeHandler() {
    this.server.on('upgrade', (req, socket, head) => {
      const parsedUrl = new URL(req.url, 'http://localhost');
      if (parsedUrl.pathname !== '/ws') {
        return; // Ignore other WebSocket paths or let other handlers process
      }

      if (!this.isCollabEnabled()) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\nCollab feature is disabled');
        socket.destroy();
        return;
      }

      const query = Object.fromEntries(parsedUrl.searchParams);

      this.authenticateRequest(query, (err, clientInfo) => {
        if (err || !clientInfo) {
          const status = err?.status || 401;
          const msg = err?.message || 'Unauthorized';
          socket.write(`HTTP/1.1 ${status} ${msg}\r\n\r\n${msg}`);
          socket.destroy();
          return;
        }

        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit('connection', ws, req, clientInfo);
        });
      });
    });
  }

  authenticateRequest(query, callback) {
    const noteId = parseInt(query.noteId, 10);
    if (!noteId || isNaN(noteId)) {
      return callback({ status: 400, message: 'Invalid noteId' });
    }

    const note = db.prepare('SELECT id, user_id, title, body, type, status, lock_hash FROM notes WHERE id = ?').get(noteId);
    if (!note) {
      return callback({ status: 404, message: 'Note not found' });
    }

    if (note.status === 'trashed') {
      return callback({ status: 403, message: 'Cannot collaborate on trashed note' });
    }

    if (note.lock_hash) {
      return callback({ status: 403, message: 'Cannot collaborate on locked note' });
    }

    if (note.type !== 'text') {
      return callback({ status: 400, message: 'Collaboration is supported for text notes only' });
    }

    const token = query.token;
    const shareToken = query.shareToken;

    // 1. Try JWT authentication (owner check)
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.id === note.user_id) {
          return callback(null, {
            noteId: note.id,
            canEdit: true,
            role: 'owner',
            user: {
              id: decoded.id,
              email: decoded.email,
              name: (decoded.email || 'Owner').split('@')[0],
            },
          });
        }
      } catch {
        // Fall through to test shareToken if provided
      }
    }

    // 2. Try Share Token
    const effectiveShareToken = shareToken || (typeof token === 'string' && token.length === 64 ? token : null);
    if (effectiveShareToken) {
      const share = db.prepare('SELECT token, note_id, can_edit FROM shares WHERE token = ? AND note_id = ?').get(effectiveShareToken, note.id);
      if (share) {
        const canEdit = share.can_edit === 1;
        return callback(null, {
          noteId: note.id,
          canEdit,
          role: canEdit ? 'collaborator' : 'viewer',
          user: {
            id: 'share-' + share.token.slice(0, 8),
            email: canEdit ? 'editor@share' : 'viewer@share',
            name: canEdit ? 'Collaborator' : 'Viewer',
          },
        });
      }
    }

    // Unauthorized
    return callback({ status: 403, message: 'Access denied to this note' });
  }

  getOrCreateRoom(noteId) {
    let room = this.rooms.get(noteId);
    if (!room) {
      const ydoc = new Y.Doc();
      room = {
        noteId,
        ydoc,
        conns: new Map(), // ws -> { clientInfo, presence }
        idleTimer: null,
      };

      // Check if persistent ydoc exists in note_collab
      const saved = db.prepare('SELECT ydoc_state FROM note_collab WHERE note_id = ?').get(noteId);
      if (saved && saved.ydoc_state) {
        try {
          Y.applyUpdate(ydoc, saved.ydoc_state);
        } catch (e) {
          console.error('Failed to load ydoc state for note', noteId, e);
        }
      } else {
        // Initialize from note body if empty
        const note = db.prepare('SELECT body FROM notes WHERE id = ?').get(noteId);
        if (note && note.body) {
          ydoc.getText('content').insert(0, note.body);
        }
      }

      this.rooms.set(noteId, room);
    }
    return room;
  }

  persistRoom(room) {
    if (!room) return;
    try {
      const state = Buffer.from(Y.encodeStateAsUpdate(room.ydoc));
      const plainText = room.ydoc.getText('content').toString();

      db.prepare(`
        INSERT INTO note_collab (note_id, ydoc_state, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(note_id) DO UPDATE SET ydoc_state = excluded.ydoc_state, updated_at = datetime('now')
      `).run(room.noteId, state);

      db.prepare(`
        UPDATE notes SET body = ?, updated_at = datetime('now') WHERE id = ?
      `).run(plainText, room.noteId);
    } catch (err) {
      console.error(`Error persisting collab room for note ${room.noteId}:`, err);
    }
  }

  scheduleIdlePersist(room) {
    if (room.idleTimer) {
      clearTimeout(room.idleTimer);
    }
    room.idleTimer = setTimeout(() => {
      this.persistRoom(room);
      room.idleTimer = null;
    }, IDLE_PERSIST_MS);
  }

  broadcastPresence(room) {
    const presenceList = [];
    for (const client of room.conns.values()) {
      if (client.presence) {
        presenceList.push(client.presence);
      }
    }

    const payload = JSON.stringify({
      type: 'presence-sync',
      users: presenceList,
    });

    for (const ws of room.conns.keys()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  setupWss() {
    this.wss.on('connection', (ws, req, clientInfo) => {
      const room = this.getOrCreateRoom(clientInfo.noteId);

      const defaultColors = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0891b2', '#e11d48'];
      const assignedColor = defaultColors[room.conns.size % defaultColors.length];

      const clientRecord = {
        ...clientInfo,
        presence: {
          id: clientInfo.user.id,
          name: clientInfo.user.name,
          email: clientInfo.user.email,
          role: clientInfo.role,
          canEdit: clientInfo.canEdit,
          color: assignedColor,
        },
      };

      room.conns.set(ws, clientRecord);

      // Send initial sync state to client
      const initialUpdate = Buffer.from(Y.encodeStateAsUpdate(room.ydoc)).toString('base64');
      ws.send(JSON.stringify({
        type: 'sync-init',
        canEdit: clientInfo.canEdit,
        role: clientInfo.role,
        color: assignedColor,
        update: initialUpdate,
      }));

      // Broadcast presence
      this.broadcastPresence(room);

      ws.on('message', (data) => {
        let msg;
        try {
          msg = JSON.parse(data.toString());
        } catch {
          return;
        }

        if (msg.type === 'doc-update') {
          // Server-enforced read-only check
          if (!clientRecord.canEdit) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'READ_ONLY',
              error: 'Forbidden: read-only access. Update rejected.',
            }));
            return;
          }

          if (msg.update) {
            try {
              const updateBuffer = Buffer.from(msg.update, 'base64');
              Y.applyUpdate(room.ydoc, updateBuffer);

              // Broadcast update to all other clients in the room
              const broadcastPayload = JSON.stringify({
                type: 'doc-update',
                update: msg.update,
              });

              for (const [peerWs] of room.conns) {
                if (peerWs !== ws && peerWs.readyState === WebSocket.OPEN) {
                  peerWs.send(broadcastPayload);
                }
              }

              // Trigger 2s debounced idle persist
              this.scheduleIdlePersist(room);
            } catch (err) {
              console.error('Error applying doc update:', err);
            }
          }
        } else if (msg.type === 'presence-update') {
          if (msg.presence) {
            clientRecord.presence = {
              ...clientRecord.presence,
              ...msg.presence,
              canEdit: clientRecord.canEdit,
              role: clientRecord.role,
            };
            this.broadcastPresence(room);
          }
        }
      });

      ws.on('close', () => {
        room.conns.delete(ws);
        this.broadcastPresence(room);

        // If no more connections in room, flush persistence
        if (room.conns.size === 0) {
          if (room.idleTimer) {
            clearTimeout(room.idleTimer);
            room.idleTimer = null;
          }
          this.persistRoom(room);
          this.rooms.delete(room.noteId);
        }
      });
    });
  }

  close() {
    for (const room of this.rooms.values()) {
      if (room.idleTimer) {
        clearTimeout(room.idleTimer);
      }
      this.persistRoom(room);
    }
    this.rooms.clear();
    this.wss.close();
  }
}

let collabInstance = null;

function initCollabServer(server) {
  if (!collabInstance) {
    collabInstance = new CollabServer(server);
  }
  return collabInstance;
}

function getCollabServer() {
  return collabInstance;
}

module.exports = {
  CollabServer,
  initCollabServer,
  getCollabServer,
};
