<script setup>
import { ref, computed } from 'vue';
import { api } from '../api.js';

const props = defineProps({
  note: { type: Object, required: true },
  inTrash: { type: Boolean, default: false },
});

const emit = defineEmits([
  'edit',
  'delete',
  'restore',
  'permanent-delete',
  'filter-tag',
  'share',
  'export',
  'toggle-pin',
  'updated',
  'open-lightbox',
]);

const revealedBody = ref(null);
const showPinModal = ref(false);
const pinAction = ref('reveal'); // 'reveal' | 'unlock' | 'lock'
const pinInput = ref('');
const pinError = ref('');
const pinLoading = ref(false);

const isOverdue = computed(() => {
  if (!props.note.reminder_at) return false;
  return new Date(props.note.reminder_at) < new Date();
});

const formattedReminder = computed(() => {
  if (!props.note.reminder_at) return '';
  const d = new Date(props.note.reminder_at);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

const checklistItems = computed(() => {
  if (props.note.type !== 'checklist') return [];
  if (Array.isArray(props.note.body)) return props.note.body;
  try {
    return JSON.parse(props.note.body) || [];
  } catch {
    return [];
  }
});

function openPinDialog(action) {
  pinAction.value = action;
  pinInput.value = '';
  pinError.value = '';
  showPinModal.value = true;
}

async function handlePinSubmit() {
  if (!pinInput.value || pinInput.value.length < 4 || pinInput.value.length > 8) {
    pinError.value = 'PIN must be 4 to 8 digits';
    return;
  }

  pinLoading.value = true;
  pinError.value = '';
  try {
    if (pinAction.value === 'reveal') {
      const res = await api.revealNote(props.note.id, pinInput.value);
      revealedBody.value = res.body;
      showPinModal.value = false;
    } else if (pinAction.value === 'unlock') {
      await api.unlockNote(props.note.id, pinInput.value);
      showPinModal.value = false;
      emit('updated');
    } else if (pinAction.value === 'lock') {
      await api.lockNote(props.note.id, pinInput.value);
      showPinModal.value = false;
      emit('updated');
    }
  } catch (err) {
    pinError.value = err.message || 'Incorrect PIN or action failed';
  } finally {
    pinLoading.value = false;
  }
}

async function toggleChecklistItem(index) {
  if (props.inTrash || props.note.locked) return;
  const items = [...checklistItems.value];
  items[index] = { ...items[index], done: !items[index].done };
  try {
    await api.patchNote(props.note.id, { body: items });
    emit('updated');
  } catch (err) {
    console.error('Failed to toggle checklist item', err);
  }
}
</script>

<template>
  <article
    :class="[
      'card note-card',
      `note-color-${note.color || 'default'}`,
      { 'is-pinned': note.pinned, 'is-locked': note.locked }
    ]"
  >
    <!-- Card Header / Meta Badges -->
    <div class="note-meta-row">
      <div class="meta-left">
        <span v-if="note.pinned" class="badge badge-pinned" title="Pinned Note">📌 Pinned</span>
        <span v-if="note.locked" class="badge badge-locked" title="PIN Protected">🔒 Locked</span>
        <span
          v-if="note.reminder_at"
          :class="['badge', isOverdue ? 'badge-overdue' : 'badge-reminder']"
          :title="isOverdue ? 'Reminder is overdue' : 'Upcoming reminder'"
        >
          🔔 {{ formattedReminder }} {{ isOverdue ? '(Overdue)' : '' }}
        </span>
      </div>

      <div class="meta-right">
        <button
          v-if="!inTrash"
          class="ghost sm pin-btn"
          :title="note.pinned ? 'Unpin' : 'Pin'"
          @click="emit('toggle-pin', note)"
        >
          {{ note.pinned ? '📌' : '📍' }}
        </button>
      </div>
    </div>

    <!-- Title -->
    <h3 class="note-title">{{ note.title }}</h3>

    <!-- Locked Note View -->
    <div v-if="note.locked && revealedBody === null" class="locked-content-box">
      <p class="locked-msg">Content protected with PIN lock.</p>
      <div class="row" style="margin-top: 8px;">
        <button class="ghost sm" @click="openPinDialog('reveal')">👁️ Reveal</button>
        <button class="ghost sm" @click="openPinDialog('unlock')">🔓 Unlock</button>
      </div>
    </div>

    <!-- Revealed or Unlocked Body -->
    <div v-else class="note-body-container">
      <!-- Revealed body banner -->
      <div v-if="revealedBody !== null" class="revealed-banner">
        <span>Revealed (temporary)</span>
        <button class="ghost sm" style="padding: 2px 6px;" @click="revealedBody = null">Hide</button>
      </div>

      <!-- Checklist Note -->
      <div v-if="note.type === 'checklist' && !revealedBody" class="checklist-items">
        <div
          v-for="(item, idx) in checklistItems"
          :key="item.id || idx"
          class="checklist-item"
        >
          <input
            type="checkbox"
            :checked="item.done"
            :disabled="inTrash"
            style="width: auto; cursor: pointer;"
            @change="toggleChecklistItem(idx)"
          />
          <span :class="{ 'done-text': item.done }">{{ item.text }}</span>
        </div>
      </div>

      <!-- Text Note -->
      <p v-else class="note-text-body">{{ revealedBody !== null ? revealedBody : note.body }}</p>

      <!-- Attachments Gallery -->
      <div v-if="note.attachments && note.attachments.length > 0" class="attachments-grid">
        <div
          v-for="att in note.attachments"
          :key="att.id"
          class="att-thumb-wrapper"
          @click="emit('open-lightbox', api.getAttachmentFileUrl(att.id))"
        >
          <img
            :src="api.getAttachmentFileUrl(att.id)"
            :alt="att.original_name"
            class="att-thumb"
            loading="lazy"
          />
        </div>
      </div>
    </div>

    <!-- Tags List -->
    <div v-if="note.tags && note.tags.length > 0" class="note-tags">
      <span
        v-for="t in note.tags"
        :key="t"
        class="tag"
        @click="emit('filter-tag', t)"
      >
        #{{ t }}
      </span>
    </div>

    <!-- Card Actions -->
    <div class="note-actions-row">
      <template v-if="!inTrash">
        <button class="ghost sm" @click="emit('edit', note)">Edit</button>
        <button v-if="!note.locked" class="ghost sm" @click="openPinDialog('lock')">🔒 Lock</button>
        <button v-if="!note.locked" class="ghost sm" @click="emit('share', note)">Share</button>
        <button class="ghost sm" @click="emit('export', note)">Export</button>
        <button class="danger sm" @click="emit('delete', note.id)">Delete</button>
      </template>

      <template v-else>
        <button class="ghost sm" @click="emit('restore', note.id)">Restore</button>
        <button class="danger sm" @click="emit('permanent-delete', note.id)">Delete Forever</button>
      </template>
    </div>

    <!-- PIN Modal -->
    <div v-if="showPinModal" class="modal-overlay" @click.self="showPinModal = false">
      <div class="modal-content" style="max-width: 360px;">
        <h4 style="margin-bottom: 12px;">
          {{ pinAction === 'lock' ? 'Set PIN to Lock' : pinAction === 'unlock' ? 'Unlock Note' : 'Reveal Note Body' }}
        </h4>
        <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 12px;">
          Enter 4 to 8 digits PIN:
        </p>
        <input
          v-model="pinInput"
          type="password"
          maxlength="8"
          placeholder="Enter PIN..."
          style="margin-bottom: 10px;"
          @keydown.enter="handlePinSubmit"
        />
        <div v-if="pinError" class="error-text" style="margin-bottom: 10px;">{{ pinError }}</div>
        <div class="row space-between">
          <button class="ghost sm" @click="showPinModal = false">Cancel</button>
          <button class="primary sm" :disabled="pinLoading" @click="handlePinSubmit">
            {{ pinLoading ? 'Checking...' : 'Submit' }}
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.note-card {
  display: flex;
  flex-direction: column;
  padding: 18px;
  border-radius: 10px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  min-height: 180px;
}

.note-card:hover {
  box-shadow: var(--shadow);
}

/* Color tints */
.note-color-default { background: var(--note-default); border-color: var(--note-border-default); }
.note-color-yellow  { background: var(--note-yellow);  border-color: var(--note-border-yellow); }
.note-color-mint    { background: var(--note-mint);    border-color: var(--note-border-mint); }
.note-color-blue    { background: var(--note-blue);    border-color: var(--note-border-blue); }
.note-color-pink    { background: var(--note-pink);    border-color: var(--note-border-pink); }
.note-color-purple  { background: var(--note-purple);  border-color: var(--note-border-purple); }

.note-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.meta-left {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.pin-btn {
  padding: 2px 6px;
  font-size: 0.85rem;
}

.note-title {
  font-size: 1.15rem;
  margin-bottom: 8px;
  word-break: break-word;
}

.note-body-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.note-text-body {
  font-size: 0.92rem;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text);
  line-height: 1.5;
  margin-bottom: 12px;
}

.locked-content-box {
  background: var(--input-bg);
  border: 1px dashed var(--card-border);
  border-radius: 6px;
  padding: 16px;
  text-align: center;
  margin-bottom: 12px;
}

.locked-msg {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0;
}

.revealed-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fef08a;
  color: #854d0e;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Checklist items */
.checklist-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.done-text {
  text-decoration: line-through;
  opacity: 0.6;
}

/* Attachments thumbnails */
.attachments-grid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.att-thumb-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--card-border);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.att-thumb-wrapper:hover {
  transform: scale(1.05);
}

.att-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.note-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.note-actions-row {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: 10px;
}
</style>
