<script setup>
import { ref, watch, computed, inject, onUnmounted } from 'vue';
import { api } from '../api.js';
import { createCollabClient } from '../collab.js';

const props = defineProps({
  editingNote: { type: Object, default: null },
  folders: { type: Array, default: () => [] },
  saveError: { type: String, default: '' },
});

const emit = defineEmits(['save', 'cancel', 'uploaded-attachment', 'delete-attachment']);
const { showToast } = inject('toast', { showToast: alert });

const form = ref({
  title: '',
  body: '',
  tags: '',
  color: 'default',
  pinned: false,
  folder_id: '',
  type: 'text', // 'text' | 'checklist'
  reminder_at: '',
});

const checklistItems = ref([]);
const newChecklistText = ref('');

const saving = ref(false);
const localError = ref('');

// Speech to text state
const isListening = ref(false);
let recognition = null;

// Image upload state
const fileInput = ref(null);
const uploadingImage = ref(false);
const pendingAttachments = ref([]); // for new notes before save
const existingAttachments = ref([]); // for editing note

// AI State
const aiDropdownOpen = ref(false);
const aiLoading = ref(false);
const aiPanelOpen = ref(false);
const aiAction = ref(''); // 'summarize' | 'suggest-tags' | 'grammar' | 'shorten' | 'friendly'
const aiResult = ref(null);
const aiBefore = ref('');
const aiAfter = ref('');
const aiError = ref('');

// Collab state
const collabOnlineUsers = ref([]);
const collabStatus = ref('');
let collabClient = null;

function setupCollab(note) {
  if (collabClient) {
    collabClient.destroy();
    collabClient = null;
    collabOnlineUsers.value = [];
    collabStatus.value = '';
  }

  if (note && note.id && (note.type || 'text') === 'text') {
    collabClient = createCollabClient({
      noteId: note.id,
      token: api.getToken(),
      onTextChange: (newBody) => {
        form.value.body = newBody;
      },
      onPresenceChange: (users) => {
        collabOnlineUsers.value = users;
      },
      onStatusChange: (status) => {
        collabStatus.value = status;
      },
    });
  }
}

function handleBodyInput(e) {
  form.value.body = e.target.value;
  if (collabClient) {
    collabClient.updateText(form.value.body);
  }
}

onUnmounted(() => {
  if (collabClient) {
    collabClient.destroy();
    collabClient = null;
  }
});

// Populate form when editingNote changes
watch(
  () => props.editingNote,
  (note) => {
    if (note) {
      form.value = {
        title: note.title || '',
        body: typeof note.body === 'string' ? note.body : '',
        tags: Array.isArray(note.tags) ? note.tags.join(', ') : (note.tags || ''),
        color: note.color || 'default',
        pinned: !!note.pinned,
        folder_id: note.folder_id || '',
        type: note.type || 'text',
        reminder_at: note.reminder_at ? note.reminder_at.slice(0, 16) : '',
      };
      if (note.type === 'checklist') {
        try {
          checklistItems.value = typeof note.body === 'string' ? JSON.parse(note.body) : (note.body || []);
        } catch {
          checklistItems.value = [];
        }
      } else {
        checklistItems.value = [];
      }
      existingAttachments.value = note.attachments || [];
      setupCollab(note);
    } else {
      resetForm();
    }
    localError.value = '';
    aiPanelOpen.value = false;
    aiResult.value = null;
  },
  { immediate: true }
);

function resetForm() {
  if (collabClient) {
    collabClient.destroy();
    collabClient = null;
    collabOnlineUsers.value = [];
    collabStatus.value = '';
  }
  form.value = {
    title: '',
    body: '',
    tags: '',
    color: 'default',
    pinned: false,
    folder_id: '',
    type: 'text',
    reminder_at: '',
  };
  checklistItems.value = [];
  pendingAttachments.value = [];
  existingAttachments.value = [];
}

const colors = [
  { id: 'default', label: 'Default', bg: 'var(--note-default)' },
  { id: 'yellow',  label: 'Yellow',  bg: '#fef9c3' },
  { id: 'mint',    label: 'Mint',    bg: '#dcfce7' },
  { id: 'blue',    label: 'Blue',    bg: '#dbeafe' },
  { id: 'pink',    label: 'Pink',    bg: '#fce7f3' },
  { id: 'purple',  label: 'Purple',  bg: '#f3e8ff' },
];

// Checklist helpers
function addChecklistItem() {
  if (!newChecklistText.value.trim()) return;
  checklistItems.value.push({
    id: Date.now().toString(),
    text: newChecklistText.value.trim(),
    done: false,
  });
  newChecklistText.value = '';
}

function removeChecklistItem(idx) {
  checklistItems.value.splice(idx, 1);
}

// Speech to text
function toggleSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Web Speech API is not supported in this browser. Try Chrome or Edge.', 'warning');
    return;
  }

  if (isListening.value) {
    recognition?.stop();
    isListening.value = false;
    return;
  }

  try {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening.value = true;
      showToast('Microphone active. Speak now...', 'info');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      if (form.value.type === 'checklist') {
        checklistItems.value.push({ id: Date.now().toString(), text: transcript.trim(), done: false });
      } else {
        form.value.body = form.value.body ? form.value.body + ' ' + transcript : transcript;
        if (collabClient) collabClient.updateText(form.value.body);
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      isListening.value = false;
      showToast(`Speech recognition notice: ${event.error}`, 'warning');
    };

    recognition.onend = () => {
      isListening.value = false;
    };

    recognition.start();
  } catch (err) {
    showToast('Failed to start speech recognition: ' + err.message, 'danger');
    isListening.value = false;
  }
}

// Images upload
function triggerImageSelect() {
  fileInput.value?.click();
}

async function handleFileSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('File size must be under 5MB', 'danger');
    return;
  }

  if (props.editingNote) {
    uploadingImage.value = true;
    try {
      const att = await api.uploadAttachment(props.editingNote.id, file);
      existingAttachments.value.push(att);
      showToast('Image uploaded successfully', 'success');
      emit('uploaded-attachment');
    } catch (err) {
      showToast(err.message || 'Image upload failed', 'danger');
    } finally {
      uploadingImage.value = false;
      fileInput.value.value = '';
    }
  } else {
    // Stage file for upload after note creation
    pendingAttachments.value.push(file);
    fileInput.value.value = '';
  }
}

async function removeExistingAttachment(id) {
  try {
    await api.deleteAttachment(id);
    existingAttachments.value = existingAttachments.value.filter((a) => a.id !== id);
    showToast('Attachment deleted', 'info');
    emit('delete-attachment');
  } catch (err) {
    showToast(err.message || 'Failed to remove attachment', 'danger');
  }
}

function removePendingAttachment(idx) {
  pendingAttachments.value.splice(idx, 1);
}

// AI Assistant
const isNoteEmpty = computed(() => {
  if (form.value.type === 'checklist') {
    return checklistItems.value.length === 0;
  }
  return !form.value.body.trim();
});

function getNoteTextForAI() {
  if (form.value.type === 'checklist') {
    return checklistItems.value.map((i) => (i.done ? '[x] ' : '[ ] ') + i.text).join('\n');
  }
  return form.value.body;
}

async function runAI(actionKey) {
  aiDropdownOpen.value = false;
  const text = getNoteTextForAI();
  if (!text.trim()) {
    showToast('Note body is empty. Write something first!', 'warning');
    return;
  }

  aiLoading.value = true;
  aiPanelOpen.value = true;
  aiAction.value = actionKey;
  aiError.value = '';
  aiResult.value = null;
  aiBefore.value = text;
  aiAfter.value = '';

  try {
    if (actionKey === 'summarize') {
      const res = await api.aiSummarize(text);
      aiResult.value = res.summary;
    } else if (actionKey === 'suggest-tags') {
      const res = await api.aiSuggestTags(text);
      aiResult.value = res.tags || [];
    } else {
      // grammar | shorten | friendly
      const res = await api.aiImprove(text, actionKey);
      aiAfter.value = res.improved;
      aiResult.value = res.improved;
    }
  } catch (err) {
    aiError.value = err.message || 'AI request failed';
  } finally {
    aiLoading.value = false;
  }
}

// AI Actions
function acceptTag(tag) {
  const currentTags = form.value.tags
    ? form.value.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    : [];
  if (!currentTags.includes(tag.toLowerCase())) {
    currentTags.push(tag.toLowerCase());
    form.value.tags = currentTags.join(', ');
  }
}

function acceptAllTags() {
  if (Array.isArray(aiResult.value)) {
    aiResult.value.forEach((t) => acceptTag(t));
    showToast('All suggested tags added to note', 'success');
  }
}

function insertAIResultAtEnd() {
  if (typeof aiResult.value === 'string') {
    form.value.body = form.value.body ? form.value.body + '\n\n' + aiResult.value : aiResult.value;
    if (collabClient) collabClient.updateText(form.value.body);
    showToast('Inserted into note body', 'success');
    aiPanelOpen.value = false;
  }
}

function replaceAIResult() {
  if (typeof aiResult.value === 'string') {
    form.value.body = aiResult.value;
    if (collabClient) collabClient.updateText(form.value.body);
    showToast('Note body replaced', 'success');
    aiPanelOpen.value = false;
  }
}

async function copyAIResult() {
  const textToCopy = Array.isArray(aiResult.value) ? aiResult.value.join(', ') : aiResult.value;
  try {
    await navigator.clipboard.writeText(textToCopy);
    showToast('Copied to clipboard', 'info');
  } catch {
    alert(textToCopy);
  }
}

function dismissAI() {
  aiPanelOpen.value = false;
  aiResult.value = null;
}

// Form Submit
async function onSubmit() {
  localError.value = '';

  if (form.value.title.trim().length > 120) {
    localError.value = 'Title must be 120 characters or fewer';
    return;
  }

  let finalBody = form.value.body;
  if (form.value.type === 'checklist') {
    finalBody = JSON.stringify(checklistItems.value);
  }

  if (typeof finalBody === 'string' && finalBody.length > 100000) {
    localError.value = 'Body must be 100,000 characters or fewer';
    return;
  }

  const payload = {
    title: form.value.title.trim(),
    body: finalBody,
    tags: form.value.tags,
    color: form.value.color,
    pinned: form.value.pinned,
    folder_id: form.value.folder_id ? Number(form.value.folder_id) : null,
    type: form.value.type,
    reminder_at: form.value.reminder_at ? new Date(form.value.reminder_at).toISOString() : null,
  };

  saving.value = true;
  try {
    await new Promise((resolve, reject) => {
      emit('save', payload, {
        resolve: async (savedNote) => {
          // If we had pending attachments and this was a new note, upload them
          if (savedNote && pendingAttachments.value.length > 0) {
            for (const file of pendingAttachments.value) {
              try {
                await api.uploadAttachment(savedNote.id, file);
              } catch (e) {
                console.error('Failed uploading pending file', e);
              }
            }
          }
          if (!props.editingNote) resetForm();
          resolve();
        },
        reject,
      });
    });
  } catch (err) {
    localError.value = err.message || 'Save failed';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="note-editor-wrapper">
    <form class="card form-card" @submit.prevent="onSubmit">
      <!-- Top Title and Type Toggle -->
      <div class="row space-between form-header">
        <div class="row" style="gap: 10px;">
          <h2>{{ editingNote ? 'Edit Note' : 'Create New Note' }}</h2>
          <!-- Colored Online Avatars -->
          <div v-if="collabOnlineUsers.length > 0" class="collab-avatars-strip" title="Live Collaboration">
            <span :class="['collab-status-dot', collabStatus]" :title="`Status: ${collabStatus}`"></span>
            <div
              v-for="u in collabOnlineUsers"
              :key="u.id"
              class="collab-avatar"
              :style="{ backgroundColor: u.color || '#2563eb' }"
              :title="`${u.name} (${u.canEdit ? 'Can Edit' : 'Read Only'})`"
            >
              {{ (u.name || '?').charAt(0).toUpperCase() }}
            </div>
          </div>
        </div>

        <div class="row" style="gap: 6px;">
          <button
            type="button"
            :class="['ghost sm', { active: form.type === 'text' }]"
            @click="form.type = 'text'"
          >
            📝 Text
          </button>
          <button
            type="button"
            :class="['ghost sm', { active: form.type === 'checklist' }]"
            @click="form.type = 'checklist'"
          >
            ☑️ Checklist
          </button>
        </div>
      </div>

      <!-- Title input -->
      <input
        v-model="form.title"
        placeholder="Note Title (up to 120 chars)"
        maxlength="120"
        required
        class="title-input"
      />

      <!-- Toolbar: Mic, Reminder, Image, AI -->
      <div class="editor-toolbar">
        <!-- Mic Button -->
        <button
          type="button"
          :class="['ghost sm toolbar-btn', { 'mic-active': isListening }]"
          :title="isListening ? 'Click to stop listening' : 'Dictate with Web Speech API'"
          @click="toggleSpeech"
        >
          🎙️ {{ isListening ? 'Listening...' : 'Dictate' }}
        </button>

        <!-- Reminder Picker -->
        <div class="reminder-picker-wrapper">
          <label class="reminder-label">
            🔔
            <input
              type="datetime-local"
              v-model="form.reminder_at"
              class="reminder-input"
              title="Set a reminder"
            />
          </label>
          <button
            v-if="form.reminder_at"
            type="button"
            class="ghost sm clear-btn"
            title="Clear reminder"
            @click="form.reminder_at = ''"
          >
            ✕
          </button>
        </div>

        <!-- Add Image -->
        <button
          type="button"
          class="ghost sm toolbar-btn"
          title="Attach image (PNG, JPG, WEBP, GIF up to 5MB)"
          @click="triggerImageSelect"
        >
          🖼️ {{ uploadingImage ? 'Uploading...' : 'Add Image' }}
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          style="display: none;"
          @change="handleFileSelected"
        />

        <!-- AI Assistant Dropdown (hidden on locked or empty note) -->
        <div v-if="!isNoteEmpty" class="ai-dropdown-wrapper">
          <button
            type="button"
            class="ghost sm toolbar-btn ai-btn"
            @click="aiDropdownOpen = !aiDropdownOpen"
          >
            ✨ AI Assistant ▾
          </button>
          <div v-if="aiDropdownOpen" class="ai-menu">
            <button type="button" class="ai-menu-item" @click="runAI('summarize')">
              📄 Summarize Note
            </button>
            <button type="button" class="ai-menu-item" @click="runAI('suggest-tags')">
              🏷️ Suggest Tags
            </button>
            <div class="menu-divider"></div>
            <button type="button" class="ai-menu-item" @click="runAI('grammar')">
              ✍️ Fix Grammar
            </button>
            <button type="button" class="ai-menu-item" @click="runAI('shorten')">
              ✂️ Shorten Note
            </button>
            <button type="button" class="ai-menu-item" @click="runAI('friendly')">
              😊 Friendlier Tone
            </button>
          </div>
        </div>

        <!-- Color Picker -->
        <div class="color-picker-row">
          <button
            v-for="c in colors"
            :key="c.id"
            type="button"
            :class="['color-dot', { selected: form.color === c.id }]"
            :style="{ backgroundColor: c.bg }"
            :title="c.label"
            @click="form.color = c.id"
          ></button>
        </div>
      </div>

      <!-- Text Mode: Textarea -->
      <div v-if="form.type === 'text'">
        <textarea
          :value="form.body"
          @input="handleBodyInput"
          rows="5"
          placeholder="Write your note body (Markdown supported)..."
          maxlength="100000"
          :disabled="collabStatus === 'read-only'"
        ></textarea>
        <div v-if="collabStatus === 'read-only'" class="text-muted" style="font-size: 0.8rem; margin-top: 4px;">
          🔒 You have read-only access to this shared note.
        </div>
      </div>

      <!-- Checklist Mode: Items list -->
      <div v-else class="checklist-builder">
        <div
          v-for="(item, idx) in checklistItems"
          :key="item.id || idx"
          class="checklist-builder-row"
        >
          <input
            type="checkbox"
            v-model="item.done"
            style="width: auto; cursor: pointer;"
          />
          <input
            v-model="item.text"
            placeholder="Checklist task..."
            class="checklist-text-input"
          />
          <button
            type="button"
            class="danger sm"
            style="padding: 2px 6px;"
            @click="removeChecklistItem(idx)"
          >
            ✕
          </button>
        </div>

        <div class="row" style="margin-top: 6px;">
          <input
            v-model="newChecklistText"
            placeholder="Add new task (press Enter)..."
            @keydown.enter.prevent="addChecklistItem"
          />
          <button type="button" class="ghost sm" @click="addChecklistItem">+ Add</button>
        </div>
      </div>

      <!-- Image Previews -->
      <div v-if="existingAttachments.length > 0 || pendingAttachments.length > 0" class="attachments-preview-strip">
        <div v-for="att in existingAttachments" :key="att.id" class="preview-item">
          <img :src="api.getAttachmentFileUrl(att.id)" alt="attachment" class="preview-thumb" />
          <button
            type="button"
            class="thumb-delete-btn"
            title="Delete image"
            @click="removeExistingAttachment(att.id)"
          >✕</button>
        </div>

        <div v-for="(file, idx) in pendingAttachments" :key="idx" class="preview-item pending">
          <span class="pending-badge">Pending</span>
          <span class="pending-name">{{ file.name }}</span>
          <button
            type="button"
            class="thumb-delete-btn"
            title="Remove"
            @click="removePendingAttachment(idx)"
          >✕</button>
        </div>
      </div>

      <!-- Metadata Controls: Tags, Folder, Pin -->
      <div class="meta-inputs-grid">
        <input
          v-model="form.tags"
          placeholder="Tags, comma-separated (e.g. work, ideas, urgent)"
        />

        <select v-model="form.folder_id" style="width: auto; min-width: 140px;">
          <option value="">📁 No Folder</option>
          <option v-for="f in folders" :key="f.id" :value="f.id">
            📁 {{ f.name }}
          </option>
        </select>

        <label class="row pin-toggle" style="cursor: pointer; width: auto; white-space: nowrap;">
          <input type="checkbox" v-model="form.pinned" style="width: auto;" />
          <span>📌 Pin Note</span>
        </label>
      </div>

      <!-- Errors -->
      <p v-if="saveError || localError" class="error-text">{{ saveError || localError }}</p>

      <!-- Submit / Cancel -->
      <div class="row space-between" style="margin-top: 6px;">
        <div class="row">
          <button type="submit" class="primary" :disabled="saving">
            {{ saving ? 'Saving...' : editingNote ? 'Update Note' : 'Add Note' }}
          </button>
          <button v-if="editingNote" type="button" class="ghost" @click="emit('cancel')">
            Cancel
          </button>
        </div>
        <span class="text-muted" style="font-size: 0.8rem;">
          {{ form.title.length }}/120
        </span>
      </div>
    </form>

    <!-- AI Results Side Panel -->
    <aside v-if="aiPanelOpen" class="ai-side-panel">
      <div class="ai-panel-header">
        <div class="row" style="gap: 6px;">
          <span>✨</span>
          <strong>AI {{ aiAction }}</strong>
        </div>
        <button class="ghost sm" style="padding: 2px 6px;" @click="dismissAI">✕</button>
      </div>

      <div class="ai-panel-body">
        <div v-if="aiLoading" class="ai-loading-state">
          <div class="spinner"></div>
          <p>Processing with AI...</p>
        </div>

        <div v-else-if="aiError" class="error-text">{{ aiError }}</div>

        <div v-else class="ai-content">
          <!-- Tag suggestions -->
          <div v-if="aiAction === 'suggest-tags'" class="ai-tags-view">
            <p class="text-muted" style="font-size: 0.85rem;">Click chips to add or accept all:</p>
            <div class="ai-tag-chips">
              <span
                v-for="tag in aiResult"
                :key="tag"
                class="tag"
                @click="acceptTag(tag)"
              >
                + #{{ tag }}
              </span>
            </div>
            <button
              v-if="Array.isArray(aiResult) && aiResult.length"
              class="primary sm"
              style="margin-top: 10px;"
              @click="acceptAllTags"
            >
              Accept All Tags
            </button>
          </div>

          <!-- Improve before / after diff -->
          <div v-else-if="['grammar', 'shorten', 'friendly'].includes(aiAction)" class="ai-diff-view">
            <div class="diff-block">
              <span class="diff-label">Original:</span>
              <p class="diff-text before">{{ aiBefore }}</p>
            </div>
            <div class="diff-block">
              <span class="diff-label">Improved:</span>
              <p class="diff-text after">{{ aiAfter }}</p>
            </div>
            <div class="ai-actions-row">
              <button class="primary sm" @click="replaceAIResult">Replace Body</button>
              <button class="ghost sm" @click="insertAIResultAtEnd">Insert at End</button>
              <button class="ghost sm" @click="copyAIResult">Copy</button>
            </div>
          </div>

          <!-- Summarize -->
          <div v-else-if="aiAction === 'summarize'" class="ai-summary-view">
            <p class="summary-text">{{ aiResult }}</p>
            <div class="ai-actions-row">
              <button class="primary sm" @click="insertAIResultAtEnd">Insert at End</button>
              <button class="ghost sm" @click="copyAIResult">Copy Summary</button>
            </div>
          </div>

          <div class="ai-footer-note">
            <span class="text-muted" style="font-size: 0.75rem;">
              ⚠️ Nothing saves until accepted. Rate limit: 20 calls/hr.
            </span>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.note-editor-wrapper {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.form-card {
  flex-grow: 1;
  background: var(--surface);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-header h2 {
  font-size: 1.1rem;
}

.title-input {
  font-weight: 600;
  font-size: 1.1rem;
}

/* Toolbar */
.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  padding: 8px 10px;
  border-radius: 8px;
}

.toolbar-btn {
  font-size: 0.8rem;
  padding: 4px 8px;
}

.mic-active {
  background: #fee2e2 !important;
  color: #b91c1c !important;
  border-color: #ef4444 !important;
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.8; }
  to { opacity: 1; transform: scale(1.03); }
}

.reminder-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--surface);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  padding: 2px 6px;
}

.reminder-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  cursor: pointer;
}

.reminder-input {
  border: none;
  background: transparent;
  padding: 2px;
  font-size: 0.8rem;
  width: auto;
}

.clear-btn {
  padding: 1px 4px;
  font-size: 0.75rem;
}

.ai-dropdown-wrapper {
  position: relative;
}

.ai-btn {
  color: var(--primary);
  border-color: var(--primary);
}

.ai-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: var(--surface);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  box-shadow: var(--shadow);
  z-index: 50;
  display: flex;
  flex-direction: column;
  min-width: 170px;
  overflow: hidden;
}

.ai-menu-item {
  background: transparent;
  border: none;
  border-radius: 0;
  text-align: left;
  justify-content: flex-start;
  padding: 8px 12px;
  font-size: 0.85rem;
  color: var(--text);
}

.ai-menu-item:hover {
  background: var(--input-bg);
}

.menu-divider {
  height: 1px;
  background: var(--card-border);
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--card-border);
  cursor: pointer;
  padding: 0;
  transition: transform 0.1s ease;
}

.color-dot.selected {
  transform: scale(1.25);
  box-shadow: 0 0 0 2px var(--primary);
}

/* Checklist */
.checklist-builder {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checklist-builder-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checklist-text-input {
  padding: 6px 10px;
}

/* Image preview strip */
.attachments-preview-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px;
  background: var(--input-bg);
  border-radius: 6px;
  border: 1px dashed var(--card-border);
}

.preview-item {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--card-border);
}

.preview-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-item.pending {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  padding: 4px;
}

.pending-badge {
  font-size: 0.6rem;
  background: var(--warning);
  color: #fff;
  padding: 1px 4px;
  border-radius: 2px;
}

.pending-name {
  font-size: 0.65rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 50px;
}

.thumb-delete-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  font-size: 0.65rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.meta-inputs-grid {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.meta-inputs-grid input {
  flex-grow: 1;
}

.pin-toggle {
  font-size: 0.9rem;
  font-weight: 500;
}

/* AI Side Panel */
.ai-side-panel {
  width: 300px;
  background: var(--surface);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow);
  animation: slideIn 0.2s ease-out;
}

.ai-panel-header {
  padding: 12px 14px;
  background: var(--input-bg);
  border-bottom: 1px solid var(--card-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.ai-panel-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  max-height: 480px;
}

.ai-loading-state {
  text-align: center;
  padding: 32px 0;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--card-border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-tags-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.diff-block {
  margin-bottom: 10px;
}

.diff-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.diff-text {
  font-size: 0.85rem;
  padding: 8px;
  border-radius: 4px;
  margin: 4px 0 0;
  white-space: pre-wrap;
}

.diff-text.before {
  background: #fee2e2;
  color: #7f1d1d;
}

.diff-text.after {
  background: #dcfce7;
  color: #14532d;
}

[data-theme="dark"] .diff-text.before {
  background: #450a0a;
  color: #fca5a5;
}

[data-theme="dark"] .diff-text.after {
  background: #052e16;
  color: #86efac;
}

.summary-text {
  font-size: 0.9rem;
  line-height: 1.5;
  background: var(--input-bg);
  padding: 10px;
  border-radius: 6px;
}

.ai-actions-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.ai-footer-note {
  margin-top: 8px;
  border-top: 1px solid var(--card-border);
  padding-top: 8px;
}

.collab-avatars-strip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--input-bg);
  padding: 3px 8px;
  border-radius: 9999px;
  border: 1px solid var(--card-border);
}

.collab-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
}

.collab-status-dot.connected {
  background: var(--success);
}

.collab-status-dot.reconnecting {
  background: var(--warning);
}

.collab-status-dot.read-only {
  background: var(--danger);
}

.collab-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

@media (max-width: 800px) {
  .note-editor-wrapper {
    flex-direction: column;
  }
  .ai-side-panel {
    width: 100%;
  }
}
</style>
