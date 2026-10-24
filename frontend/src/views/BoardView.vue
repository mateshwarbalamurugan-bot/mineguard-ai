<script setup>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import NoteForm from '../components/NoteForm.vue';
import NoteCard from '../components/NoteCard.vue';
import CommandPalette from '../components/CommandPalette.vue';
import ShareModal from '../components/ShareModal.vue';
import ImportExportModal from '../components/ImportExportModal.vue';
import LightboxModal from '../components/LightboxModal.vue';

const router = useRouter();
const { theme, toggleTheme } = inject('theme');
const { showToast } = inject('toast', { showToast: alert });

// Auth state
const user = ref(null);
const authMode = ref('login'); // 'login' | 'register'
const authEmail = ref('');
const authPassword = ref('');
const authError = ref('');
const authLoading = ref(false);

// App state
const notes = ref([]);
const folders = ref([]);
const tags = ref([]);
const stats = ref(null);

const activeFolder = ref('all'); // 'all' | 'trash' | folderId
const searchQuery = ref('');
const activeTag = ref('');
const sortOrder = ref('updated'); // 'updated' | 'created' | 'title' | 'manual'
const editingNote = ref(null);
const pageError = ref('');
const loadingNotes = ref(false);

// Modals
const showPalette = ref(false);
const sharingNote = ref(null);
const exportingNote = ref(null);
const showBackupImport = ref(false);
const lightboxUrl = ref(null);
const newFolderName = ref('');
const showNewFolderInput = ref(false);

// Polling interval
let reminderInterval = null;

// Auth handlers
async function checkAuth() {
  if (!api.hasAuth()) {
    user.value = null;
    return;
  }
  try {
    user.value = await api.getMe();
    await loadInitialData();
  } catch {
    api.setToken('');
    user.value = null;
  }
}

async function handleAuthSubmit() {
  authError.value = '';
  authLoading.value = true;
  try {
    let res;
    if (authMode.value === 'register') {
      res = await api.register({ email: authEmail.value, password: authPassword.value });
      showToast('Account registered! Welcome to NotesBoard.', 'success');
    } else {
      res = await api.login({ email: authEmail.value, password: authPassword.value });
      showToast('Signed in successfully', 'success');
    }
    api.setToken(res.token);
    user.value = res.user;
    authPassword.value = '';
    await loadInitialData();
  } catch (err) {
    authError.value = err.message || 'Authentication failed';
  } finally {
    authLoading.value = false;
  }
}

function handleLogout() {
  api.setToken('');
  user.value = null;
  notes.value = [];
  folders.value = [];
  tags.value = [];
  stats.value = null;
  showToast('Logged out', 'info');
}

// Initial Data Load
async function loadInitialData() {
  await Promise.all([
    loadFolders(),
    loadTags(),
    loadStats(),
    loadNotes(),
  ]);
  startReminderPolling();
}

async function loadFolders() {
  try {
    folders.value = await api.getFolders();
  } catch (err) {
    console.error('Failed to load folders:', err);
  }
}

async function loadTags() {
  try {
    tags.value = await api.getTags();
  } catch (err) {
    console.error('Failed to load tags:', err);
  }
}

async function loadStats() {
  try {
    stats.value = await api.getStats();
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function loadNotes() {
  if (!user.value) return;
  loadingNotes.value = true;
  pageError.value = '';

  try {
    const params = {
      sort: sortOrder.value,
    };

    if (searchQuery.value) params.q = searchQuery.value;
    if (activeTag.value) params.tag = activeTag.value;

    if (activeFolder.value === 'trash') {
      params.status = 'trashed';
    } else {
      params.status = 'active';
      if (activeFolder.value !== 'all') {
        params.folder = activeFolder.value;
      }
    }

    notes.value = await api.getNotes(params);
  } catch (err) {
    pageError.value = err.message || 'Failed to load notes';
  } finally {
    loadingNotes.value = false;
  }
}

// Note CRUD actions
async function handleSaveNote(formData, { resolve, reject }) {
  pageError.value = '';
  try {
    let saved;
    if (editingNote.value) {
      saved = await api.updateNote(editingNote.value.id, formData);
      showToast('Note updated', 'success');
    } else {
      saved = await api.createNote(formData);
      showToast('Note created', 'success');
    }
    editingNote.value = null;
    await Promise.all([loadNotes(), loadTags(), loadStats()]);
    resolve(saved);
  } catch (err) {
    pageError.value = err.message;
    reject(err);
  }
}

function startEdit(note) {
  editingNote.value = note;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
  editingNote.value = null;
  pageError.value = '';
}

async function deleteNote(id) {
  try {
    await api.deleteNote(id);
    if (editingNote.value?.id === id) cancelEdit();
    showToast('Note moved to Trash', 'info');
    await Promise.all([loadNotes(), loadTags(), loadStats()]);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function restoreNote(id) {
  try {
    await api.restoreNote(id);
    showToast('Note restored', 'success');
    await Promise.all([loadNotes(), loadTags(), loadStats()]);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function permanentDeleteNote(id) {
  if (!confirm('Permanently delete this note? This action cannot be undone.')) return;
  try {
    await api.permanentDeleteNote(id);
    showToast('Note permanently deleted', 'info');
    await Promise.all([loadNotes(), loadTags(), loadStats()]);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function emptyTrash() {
  if (!confirm('Empty all notes in Trash? This cannot be undone.')) return;
  try {
    await api.emptyTrash();
    showToast('Trash emptied', 'info');
    await Promise.all([loadNotes(), loadStats()]);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function togglePin(note) {
  try {
    await api.patchNote(note.id, { pinned: !note.pinned });
    await loadNotes();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// Folders Management
async function createFolder() {
  if (!newFolderName.value.trim()) return;
  try {
    const f = await api.createFolder(newFolderName.value.trim());
    folders.value.push(f);
    newFolderName.value = '';
    showNewFolderInput.value = false;
    showToast(`Folder "${f.name}" created`, 'success');
    await loadStats();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function deleteFolder(id, name) {
  if (!confirm(`Delete folder "${name}"? Notes inside will be moved to No Folder.`)) return;
  try {
    await api.deleteFolder(id);
    if (activeFolder.value === id) activeFolder.value = 'all';
    await Promise.all([loadFolders(), loadNotes(), loadStats()]);
    showToast(`Folder "${name}" deleted`, 'info');
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// Tag filter
function filterByTag(tag) {
  if (activeTag.value === tag) {
    activeTag.value = '';
  } else {
    activeTag.value = tag;
  }
  loadNotes();
}

// Reminders 30s Polling & Notifications
async function checkDueReminders() {
  if (!user.value) return;
  try {
    const due = await api.getDueReminders();
    if (Array.isArray(due) && due.length > 0) {
      for (const note of due) {
        // Native notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Reminder Due: ' + note.title, {
            body: typeof note.body === 'string' ? note.body.slice(0, 120) : 'Checklist reminder',
            icon: '/favicon.ico',
          });
        }
        showToast(`🔔 Reminder Due: ${note.title}`, 'warning', 8000);
      }
      await loadNotes();
    }
  } catch {
    // Silent catch
  }
}

function startReminderPolling() {
  if (reminderInterval) clearInterval(reminderInterval);
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  reminderInterval = setInterval(checkDueReminders, 30000);
  checkDueReminders();
}

// Keyboard shortcuts (Ctrl+K or Cmd+K)
function handleGlobalKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    showPalette.value = !showPalette.value;
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
  checkAuth();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
  if (reminderInterval) clearInterval(reminderInterval);
});
</script>

<template>
  <div class="board-page">
    <!-- Board Navbar -->
    <header class="board-nav">
      <div class="nav-container">
        <div class="row" style="gap: 12px;">
          <router-link to="/" class="brand">
            <svg class="brand-icon" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M3 4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4zm3 2v2h12V6H6zm0 4v2h12v-2H6zm0 4v2h8v-2H6z"/>
            </svg>
            <span class="brand-text">NotesBoard</span>
          </router-link>

          <button class="ghost sm palette-btn" @click="showPalette = true" title="Quick Search & AI (Ctrl+K)">
            🔍 Search or Ask AI <kbd>Ctrl+K</kbd>
          </button>
        </div>

        <div class="row" style="gap: 10px;">
          <button class="ghost sm" @click="showBackupImport = true" title="Export & Import Backup">
            📦 Backup & Import
          </button>

          <button class="ghost sm theme-toggle" @click="toggleTheme" :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
            {{ theme === 'dark' ? '☀️' : '🌙' }}
          </button>

          <div v-if="user" class="row user-menu" style="gap: 8px;">
            <span class="user-email" :title="user.email">{{ user.email }}</span>
            <button class="ghost sm" @click="handleLogout">Logout</button>
          </div>
        </div>
      </div>
    </header>

    <!-- Unauthenticated View / Login & Register Form -->
    <div v-if="!user" class="auth-container">
      <div class="card auth-card">
        <h2>{{ authMode === 'login' ? 'Sign In to Workspace' : 'Create Free Account' }}</h2>
        <p class="text-muted" style="font-size: 0.9rem;">
          {{ authMode === 'login' ? 'Access your private encrypted notes.' : 'First registered user claims initial notes.' }}
        </p>

        <form class="col" style="gap: 12px; margin-top: 12px;" @submit.prevent="handleAuthSubmit">
          <input
            v-model="authEmail"
            type="email"
            placeholder="Email address"
            required
            autocomplete="email"
          />
          <input
            v-model="authPassword"
            type="password"
            placeholder="Password (min 6 characters)"
            minlength="6"
            required
            autocomplete="current-password"
          />

          <div v-if="authError" class="error-text">{{ authError }}</div>

          <button type="submit" class="primary" :disabled="authLoading">
            {{ authLoading ? 'Signing in...' : authMode === 'login' ? 'Sign In' : 'Register' }}
          </button>
        </form>

        <div class="auth-toggle-row">
          <span>{{ authMode === 'login' ? "Don't have an account?" : 'Already have an account?' }}</span>
          <button
            class="ghost sm"
            style="border: none; text-decoration: underline; color: var(--primary);"
            @click="authMode = authMode === 'login' ? 'register' : 'login'"
          >
            {{ authMode === 'login' ? 'Register now' : 'Sign In' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Authenticated Board View -->
    <div v-else class="board-layout">
      <!-- Sidebar -->
      <aside class="sidebar">
        <!-- Folders Header -->
        <div class="sidebar-header">
          <span class="sidebar-title">WORKSPACES</span>
          <button
            class="ghost sm"
            style="padding: 2px 6px;"
            title="Create new folder"
            @click="showNewFolderInput = !showNewFolderInput"
          >
            +
          </button>
        </div>

        <!-- New Folder Input -->
        <div v-if="showNewFolderInput" class="new-folder-box">
          <input
            v-model="newFolderName"
            placeholder="Folder name..."
            @keydown.enter.prevent="createFolder"
          />
          <div class="row" style="margin-top: 6px;">
            <button class="primary sm" @click="createFolder">Create</button>
            <button class="ghost sm" @click="showNewFolderInput = false">Cancel</button>
          </div>
        </div>

        <!-- Navigation Links -->
        <nav class="sidebar-nav">
          <button
            :class="['sidebar-nav-item', { active: activeFolder === 'all' }]"
            @click="activeFolder = 'all'; loadNotes()"
          >
            <span>📝 All Notes</span>
            <span class="nav-count">{{ stats?.active || notes.length }}</span>
          </button>

          <!-- Custom Folders -->
          <div
            v-for="f in folders"
            :key="f.id"
            :class="['sidebar-nav-item folder-item', { active: activeFolder === f.id }]"
            @click="activeFolder = f.id; loadNotes()"
          >
            <span>📁 {{ f.name }}</span>
            <button
              class="folder-del-btn"
              title="Delete folder"
              @click.stop="deleteFolder(f.id, f.name)"
            >
              ✕
            </button>
          </div>

          <!-- Trash -->
          <div class="sidebar-divider"></div>
          <button
            :class="['sidebar-nav-item trash-item', { active: activeFolder === 'trash' }]"
            @click="activeFolder = 'trash'; loadNotes()"
          >
            <span>🗑️ Trash</span>
          </button>
        </nav>

        <!-- Stats Overview Pill -->
        <div v-if="stats" class="stats-box">
          <div class="stats-row">
            <span>Total Notes:</span>
            <strong>{{ stats.total }}</strong>
          </div>
          <div class="stats-row">
            <span>Active:</span>
            <strong>{{ stats.active }}</strong>
          </div>
          <div class="stats-row">
            <span>Folders:</span>
            <strong>{{ stats.folders }}</strong>
          </div>
          <div class="stats-row">
            <span>Tags:</span>
            <strong>{{ stats.tags }}</strong>
          </div>
        </div>
      </aside>

      <!-- Main Workspace -->
      <main class="main-content">
        <!-- Workspace Header & Action bar -->
        <div class="content-header">
          <div class="header-left">
            <h2>
              {{ activeFolder === 'trash' ? 'Trash' : activeFolder === 'all' ? 'All Notes' : folders.find(f => f.id === activeFolder)?.name || 'Folder' }}
            </h2>
            <span class="text-muted" style="font-size: 0.85rem;">
              {{ notes.length }} note{{ notes.length === 1 ? '' : 's' }}
            </span>
          </div>

          <div v-if="activeFolder === 'trash' && notes.length > 0" class="header-right">
            <button class="danger sm" @click="emptyTrash">Empty Trash</button>
          </div>
        </div>

        <!-- Note Editor (Only in active folders) -->
        <NoteForm
          v-if="activeFolder !== 'trash'"
          :editing-note="editingNote"
          :folders="folders"
          :save-error="pageError"
          @save="handleSaveNote"
          @cancel="cancelEdit"
          @uploaded-attachment="loadNotes"
          @delete-attachment="loadNotes"
        />

        <!-- Toolbar: Search, Sort, Tags -->
        <div class="content-toolbar">
          <div class="search-sort-row">
            <input
              v-model="searchQuery"
              placeholder="Search notes or checklist items..."
              class="search-input"
              @input="loadNotes"
            />

            <select v-model="sortOrder" class="sort-select" @change="loadNotes">
              <option value="updated">Recently Updated</option>
              <option value="created">Date Created</option>
              <option value="title">Alphabetical (A-Z)</option>
              <option value="manual">Manual Order</option>
            </select>
          </div>

          <!-- Tag Filter Chips -->
          <div v-if="tags.length > 0" class="tag-filter-strip">
            <span class="tag-strip-label">Filter tags:</span>
            <button
              :class="['tag-filter-btn', { active: !activeTag }]"
              @click="activeTag = ''; loadNotes()"
            >
              All
            </button>
            <button
              v-for="t in tags"
              :key="t.tag"
              :class="['tag-filter-btn', { active: activeTag === t.tag }]"
              @click="filterByTag(t.tag)"
            >
              #{{ t.tag }} <span class="tag-count">({{ t.count }})</span>
            </button>
          </div>
        </div>

        <!-- Notes Grid -->
        <div v-if="loadingNotes" class="empty-state">
          <p>Loading notes...</p>
        </div>

        <div v-else-if="notes.length > 0" class="notes-grid">
          <NoteCard
            v-for="note in notes"
            :key="note.id"
            :note="note"
            :in-trash="activeFolder === 'trash'"
            @edit="startEdit"
            @delete="deleteNote"
            @restore="restoreNote"
            @permanent-delete="permanentDeleteNote"
            @filter-tag="filterByTag"
            @share="sharingNote = $event"
            @export="exportingNote = $event"
            @toggle-pin="togglePin"
            @updated="loadNotes"
            @open-lightbox="lightboxUrl = $event"
          />
        </div>

        <div v-else class="empty-state">
          <span class="empty-state-icon">📭</span>
          <h3>No notes here</h3>
          <p v-if="searchQuery || activeTag">Try clearing your search query or tag filter.</p>
          <p v-else-if="activeFolder === 'trash'">Trash is empty.</p>
          <p v-else>Write your first note above to get started!</p>
        </div>
      </main>
    </div>

    <!-- Modals -->
    <!-- Command Palette -->
    <CommandPalette
      v-if="showPalette"
      :notes="notes"
      @close="showPalette = false"
      @select-note="startEdit"
    />

    <!-- Share Modal -->
    <ShareModal
      v-if="sharingNote"
      :note="sharingNote"
      @close="sharingNote = null"
    />

    <!-- Export & Import Modal -->
    <ImportExportModal
      v-if="exportingNote || showBackupImport"
      :note="exportingNote"
      @close="exportingNote = null; showBackupImport = false"
      @imported="loadInitialData"
    />

    <!-- Lightbox Modal -->
    <LightboxModal
      v-if="lightboxUrl"
      :image-url="lightboxUrl"
      @close="lightboxUrl = null"
    />
  </div>
</template>

<style scoped>
.board-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Nav */
.board-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--surface);
  border-bottom: 1px solid var(--card-border);
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 1.1rem;
}

.palette-btn {
  font-size: 0.8rem;
  padding: 5px 10px;
  color: var(--text-muted);
  border-radius: 6px;
}

.palette-btn kbd {
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.7rem;
  margin-left: 4px;
}

.user-email {
  font-size: 0.85rem;
  color: var(--text-muted);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Auth Card */
.auth-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}

.auth-card {
  max-width: 400px;
  width: 100%;
  padding: 32px;
  border-radius: 12px;
  box-shadow: var(--shadow);
}

.auth-toggle-row {
  margin-top: 16px;
  font-size: 0.85rem;
  text-align: center;
}

/* Board Layout */
.board-layout {
  display: flex;
  flex-grow: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

/* Sidebar */
.sidebar {
  width: 250px;
  border-right: 1px solid var(--card-border);
  padding: 20px 14px;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.new-folder-box {
  background: var(--surface);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  padding: 8px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-nav-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  background: transparent;
  border: 1px solid transparent;
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
}

.sidebar-nav-item:hover {
  background: var(--surface);
  color: var(--text);
}

.sidebar-nav-item.active {
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  border-color: var(--card-border);
}

.nav-count {
  font-size: 0.75rem;
  background: var(--input-bg);
  padding: 1px 6px;
  border-radius: 9999px;
}

.folder-del-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.75rem;
  padding: 2px 4px;
  border-radius: 2px;
  opacity: 0;
}

.folder-item:hover .folder-del-btn {
  opacity: 1;
}

.folder-del-btn:hover {
  color: var(--danger);
}

.sidebar-divider {
  height: 1px;
  background: var(--card-border);
  margin: 8px 0;
}

.stats-box {
  margin-top: auto;
  background: var(--surface);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 12px;
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
}

/* Main Content */
.main-content {
  flex-grow: 1;
  padding: 24px 28px 80px;
  overflow-y: auto;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left h2 {
  font-size: 1.6rem;
}

/* Toolbar */
.content-toolbar {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-sort-row {
  display: flex;
  gap: 12px;
}

.search-input {
  flex-grow: 1;
}

.sort-select {
  width: auto;
  min-width: 170px;
}

.tag-filter-strip {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-strip-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-right: 4px;
}

.tag-filter-btn {
  background: var(--surface);
  border: 1px solid var(--card-border);
  color: var(--text-muted);
  font-size: 0.8rem;
  padding: 3px 8px;
  border-radius: 4px;
}

.tag-filter-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.tag-count {
  font-size: 0.7rem;
  opacity: 0.8;
}

/* Notes Grid */
.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

@media (max-width: 860px) {
  .board-layout {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--card-border);
  }
  .main-content {
    padding: 16px 16px 64px;
  }
}
</style>
