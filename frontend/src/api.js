// frontend/src/api.js
const BASE = '/api';

function getToken() {
  return localStorage.getItem('notes_auth_token') || '';
}

function setToken(token) {
  if (token) {
    localStorage.setItem('notes_auth_token', token);
  } else {
    localStorage.removeItem('notes_auth_token');
  }
}

async function request(url, options = {}) {
  const headers = { ...options.headers };
  const token = getToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set Content-Type to application/json if body is not FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(BASE + url, {
    ...options,
    headers,
  });

  if (res.status === 204) return null;

  // Handle binary downloads (e.g. PDF/backup)
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errorMsg = data && data.error ? data.error : `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Token management
  getToken,
  setToken,
  hasAuth: () => !!getToken(),

  // Auth
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
  updateSettings: (settings) => request('/auth/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  // Notes
  getNotes: (params = {}) => {
    const cleanParams = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
    const qs = new URLSearchParams(cleanParams).toString();
    return request('/notes' + (qs ? '?' + qs : ''));
  },
  getNote: (id) => request(`/notes/${id}`),
  createNote: (data) => request('/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id, data) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  patchNote: (id, data) => request(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),
  restoreNote: (id) => request(`/notes/${id}/restore`, { method: 'POST' }),
  permanentDeleteNote: (id) => request(`/notes/${id}/permanent`, { method: 'DELETE' }),
  emptyTrash: () => request('/notes/trash', { method: 'DELETE' }),
  reorderNotes: (positions) => request('/notes/reorder', { method: 'PATCH', body: JSON.stringify({ positions }) }),

  // PIN Lock & Lockout
  lockNote: (id, pin) => request(`/notes/${id}/lock`, { method: 'POST', body: JSON.stringify({ pin }) }),
  unlockNote: (id, pin) => request(`/notes/${id}/unlock`, { method: 'POST', body: JSON.stringify({ pin }) }),
  revealNote: (id, pin) => request(`/notes/${id}/reveal`, { method: 'POST', body: JSON.stringify({ pin }) }),

  // Folders
  getFolders: () => request('/folders'),
  createFolder: (name) => request('/folders', { method: 'POST', body: JSON.stringify({ name }) }),
  updateFolder: (id, name) => request(`/folders/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  deleteFolder: (id) => request(`/folders/${id}`, { method: 'DELETE' }),

  // Stats & Tags
  getStats: () => request('/stats'),
  getTags: () => request('/tags'),

  // Reminders
  getDueReminders: () => request('/reminders/due'),
  dismissReminder: (id) => request(`/reminders/${id}/dismiss`, { method: 'POST' }),

  // Attachments
  uploadAttachment: (noteId, file) => {
    const formData = new FormData();
    formData.append('note_id', noteId);
    formData.append('file', file);
    return request('/attachments/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set multipart boundary
    });
  },
  getAttachments: (noteId) => request(`/attachments/note/${noteId}`),
  deleteAttachment: (id) => request(`/attachments/${id}`, { method: 'DELETE' }),
  getAttachmentFileUrl: (id) => `${BASE}/attachments/${id}/file`,

  // Export / Import
  exportNoteUrl: (id, format = 'txt') => `${BASE}/export/note/${id}?format=${format}`,
  exportBackupUrl: () => `${BASE}/export/backup`,
  importNotes: (formData) => request('/import', {
    method: 'POST',
    body: formData,
    headers: {},
  }),

  // AI Service
  aiSummarize: (text) => request('/ai/summarize', { method: 'POST', body: JSON.stringify({ text }) }),
  aiSuggestTags: (text) => request('/ai/suggest-tags', { method: 'POST', body: JSON.stringify({ text }) }),
  aiImprove: (text, action) => request('/ai/improve', { method: 'POST', body: JSON.stringify({ text, action }) }),
  aiAsk: (question) => request('/ai/ask', { method: 'POST', body: JSON.stringify({ question }) }),

  // Sharing
  createShare: (noteId, canEdit = false) => request('/shares', { method: 'POST', body: JSON.stringify({ note_id: noteId, can_edit: canEdit }) }),
  getShares: (noteId) => request(`/shares/note/${noteId}`),
  revokeShare: (token) => request(`/shares/${token}`, { method: 'DELETE' }),

  // Public (no auth required)
  getPublicNote: (token) => request(`/public/notes/${token}`),
  getPublicComments: (token) => request(`/public/notes/${token}/comments`),
  postPublicComment: (token, data) => request(`/public/notes/${token}/comments`, { method: 'POST', body: JSON.stringify(data) }),
  deleteComment: (id) => request(`/public/comments/${id}`, { method: 'DELETE' }),
};
