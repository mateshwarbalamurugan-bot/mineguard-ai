<script setup>
import { ref } from 'vue';
import { api } from '../api.js';

const props = defineProps({
  note: { type: Object, default: null }, // Optional: If provided, allows exporting this note
});

const emit = defineEmits(['close', 'imported']);

const mode = ref(props.note ? 'export' : 'backup'); // 'export' | 'backup' | 'import'
const importing = ref(false);
const importFile = ref(null);
const importResults = ref(null);
const errorMessage = ref('');

function downloadNote(format) {
  if (!props.note) return;
  const token = api.getToken();
  // Fetch with auth header to trigger browser download
  fetch(api.exportNoteUrl(props.note.id, format), {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error('Export failed (note may be locked)');
      return res.blob();
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${props.note.title.replace(/[^a-z0-9_-]/gi, '_')}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    })
    .catch((err) => {
      errorMessage.value = err.message;
    });
}

function downloadBackup() {
  const token = api.getToken();
  fetch(api.exportBackupUrl(), {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error('Backup failed');
      return res.blob();
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    })
    .catch((err) => {
      errorMessage.value = err.message;
    });
}

function handleFileChange(e) {
  importFile.value = e.target.files[0] || null;
}

async function handleImport() {
  if (!importFile.value) {
    errorMessage.value = 'Please select a file to import (.json, .txt, or .md)';
    return;
  }

  importing.value = true;
  errorMessage.value = '';
  importResults.value = null;

  try {
    const formData = new FormData();
    formData.append('file', importFile.value);
    const result = await api.importNotes(formData);
    importResults.value = result;
    emit('imported');
  } catch (err) {
    errorMessage.value = err.message || 'Import failed';
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')" role="dialog" aria-modal="true" aria-label="Import and Export">
    <div class="modal-content">
      <div class="row space-between" style="margin-bottom: 16px;">
        <h3>{{ note ? 'Export Note' : 'Backup & Import' }}</h3>
        <button class="ghost sm" @click="emit('close')">✕</button>
      </div>

      <div v-if="errorMessage" class="error-text" style="margin-bottom: 12px;">{{ errorMessage }}</div>

      <!-- Tab Buttons -->
      <div class="tabs-row">
        <button
          v-if="note"
          :class="['ghost sm tab-btn', { active: mode === 'export' }]"
          @click="mode = 'export'"
        >
          Export Single Note
        </button>
        <button
          :class="['ghost sm tab-btn', { active: mode === 'backup' }]"
          @click="mode = 'backup'"
        >
          Workspace Backup
        </button>
        <button
          :class="['ghost sm tab-btn', { active: mode === 'import' }]"
          @click="mode = 'import'"
        >
          Import Notes
        </button>
      </div>

      <!-- Export Single Note -->
      <div v-if="mode === 'export' && note" class="section-box">
        <h4>Download "{{ note.title }}"</h4>
        <p class="text-muted" style="font-size: 0.85rem;">Select your preferred export format:</p>
        <div class="export-buttons">
          <button class="ghost" @click="downloadNote('txt')">📄 Plain Text (.txt)</button>
          <button class="ghost" @click="downloadNote('md')">📝 Markdown (.md)</button>
          <button class="primary" @click="downloadNote('pdf')">📑 Document (.pdf)</button>
        </div>
      </div>

      <!-- Full Backup -->
      <div v-if="mode === 'backup'" class="section-box">
        <h4>Complete Notes Backup</h4>
        <p class="text-muted" style="font-size: 0.85rem;">
          Download a complete JSON export of all your unlocked notes, folders, and tags. Locked notes are excluded for privacy.
        </p>
        <button class="primary" @click="downloadBackup">📥 Download JSON Backup</button>
      </div>

      <!-- Import Section -->
      <div v-if="mode === 'import'" class="section-box">
        <h4>Restore or Import Files</h4>
        <p class="text-muted" style="font-size: 0.85rem;">
          Upload a previously exported JSON backup, or plain text / markdown files (.json, .txt, .md).
        </p>

        <input
          type="file"
          accept=".json,.txt,.md"
          @change="handleFileChange"
          style="margin-bottom: 12px;"
        />

        <button class="primary" :disabled="importing || !importFile" @click="handleImport">
          {{ importing ? 'Importing...' : 'Start Import' }}
        </button>

        <!-- Import Summary Result -->
        <div v-if="importResults" class="import-summary">
          <h4>Import Complete</h4>
          <div class="summary-metrics">
            <span class="metric-item success">Created: {{ importResults.created }}</span>
            <span class="metric-item warning">Skipped: {{ importResults.skipped }}</span>
            <span class="metric-item danger">Errors: {{ importResults.errors?.length || 0 }}</span>
          </div>
          <ul v-if="importResults.errors && importResults.errors.length" class="error-list">
            <li v-for="(err, idx) in importResults.errors" :key="idx">{{ err }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabs-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--card-border);
  padding-bottom: 8px;
}

.tab-btn.active {
  background: var(--surface);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 600;
}

.section-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--input-bg);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
}

.section-box h4 {
  font-size: 0.95rem;
}

.export-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.import-summary {
  margin-top: 14px;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--card-border);
  border-radius: 6px;
}

.summary-metrics {
  display: flex;
  gap: 12px;
  margin: 8px 0;
  font-size: 0.85rem;
  font-weight: 600;
}

.metric-item.success { color: var(--success); }
.metric-item.warning { color: var(--warning); }
.metric-item.danger { color: var(--danger); }

.error-list {
  margin: 6px 0 0;
  padding-left: 20px;
  font-size: 0.8rem;
  color: var(--danger);
}
</style>
