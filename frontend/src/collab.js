// frontend/src/collab.js
import * as Y from 'yjs';

function uint8ArrayToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function createCollabClient({
  noteId,
  token = '',
  shareToken = '',
  onTextChange = () => {},
  onPresenceChange = () => {},
  onStatusChange = () => {},
}) {
  let ws = null;
  let isDestroyed = false;
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  let canEdit = true;

  const ydoc = new Y.Doc();
  const ytext = ydoc.getText('content');

  // Listen to remote changes on Y.Text
  ytext.observe((event) => {
    if (event.transaction.origin === 'local') return;
    onTextChange(ytext.toString());
  });

  // Listen to Ydoc update events to send over wire
  ydoc.on('update', (update, origin) => {
    if (origin === 'remote') return;
    if (ws && ws.readyState === WebSocket.OPEN && canEdit) {
      const base64 = uint8ArrayToBase64(update);
      ws.send(JSON.stringify({ type: 'doc-update', update: base64 }));
    }
  });

  function getWsUrl() {
    const isSecure = window.location.protocol === 'https:';
    const protocol = isSecure ? 'wss:' : 'ws:';
    const host = window.location.host;
    const params = new URLSearchParams({ noteId: String(noteId) });
    if (token) params.set('token', token);
    if (shareToken) params.set('shareToken', shareToken);
    return `${protocol}//${host}/ws?${params.toString()}`;
  }

  function connect() {
    if (isDestroyed) return;

    onStatusChange('connecting');
    const url = getWsUrl();

    try {
      ws = new WebSocket(url);
    } catch (err) {
      console.warn('Failed to construct WebSocket', err);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectAttempts = 0;
      onStatusChange('connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'sync-init') {
          canEdit = Boolean(msg.canEdit);
          onStatusChange(canEdit ? 'connected' : 'read-only');

          if (msg.update) {
            const bytes = base64ToUint8Array(msg.update);
            Y.applyUpdate(ydoc, bytes, 'remote');
            onTextChange(ytext.toString());
          }
        } else if (msg.type === 'doc-update') {
          if (msg.update) {
            const bytes = base64ToUint8Array(msg.update);
            Y.applyUpdate(ydoc, bytes, 'remote');
            onTextChange(ytext.toString());
          }
        } else if (msg.type === 'presence-sync') {
          if (Array.isArray(msg.users)) {
            onPresenceChange(msg.users);
          }
        } else if (msg.type === 'error') {
          console.warn('Collab server notice:', msg.error);
        }
      } catch (err) {
        console.error('Collab message error', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('WebSocket error', err);
    };

    ws.onclose = () => {
      if (!isDestroyed) {
        onStatusChange('reconnecting');
        scheduleReconnect();
      }
    };
  }

  function scheduleReconnect() {
    if (isDestroyed) return;
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000);
    reconnectAttempts++;
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      connect();
    }, delay);
  }

  function updateText(newText) {
    if (!canEdit) return;
    const current = ytext.toString();
    if (current === newText) return;

    ydoc.transact(() => {
      // Simple replace transaction
      ytext.delete(0, current.length);
      ytext.insert(0, newText);
    }, 'local');
  }

  // Start initial connection
  connect();

  return {
    ydoc,
    ytext,
    updateText,
    getCanEdit: () => canEdit,
    destroy() {
      isDestroyed = true;
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.close();
        ws = null;
      }
      ydoc.destroy();
    },
  };
}
