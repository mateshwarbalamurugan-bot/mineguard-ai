<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api.js';

const props = defineProps({
  note: { type: Object, required: true },
});

const emit = defineEmits(['close']);

const loading = ref(false);
const error = ref('');
const shares = ref([]);
const canEdit = ref(false);
const copied = ref(false);

async function loadShares() {
  loading.value = true;
  error.value = '';
  try {
    shares.value = await api.getShares(props.note.id);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function createShareLink() {
  loading.value = true;
  error.value = '';
  try {
    const newShare = await api.createShare(props.note.id, canEdit.value);
    shares.value.unshift(newShare);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function revoke(token) {
  loading.value = true;
  error.value = '';
  try {
    await api.revokeShare(token);
    shares.value = shares.value.filter((s) => s.token !== token);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function getShareUrl(token) {
  return `${window.location.origin}/s/${token}`;
}

async function copyToClipboard(token) {
  const url = getShareUrl(token);
  try {
    await navigator.clipboard.writeText(url);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    alert(`Link: ${url}`);
  }
}

onMounted(loadShares);
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')" role="dialog" aria-modal="true" aria-label="Share Note">
    <div class="modal-content">
      <div class="row space-between" style="margin-bottom: 16px;">
        <h3>Share Note: {{ note.title }}</h3>
        <button class="ghost sm" @click="emit('close')" aria-label="Close">✕</button>
      </div>

      <div v-if="error" class="error-text" style="margin-bottom: 12px;">{{ error }}</div>

      <div class="share-controls">
        <label class="row" style="font-size: 0.9rem; cursor: pointer;">
          <input type="checkbox" v-model="canEdit" style="width: auto;" />
          <span>Allow editor permissions (can_edit)</span>
        </label>
        <button class="primary sm" :disabled="loading" @click="createShareLink">
          {{ loading ? 'Generating...' : '+ Generate Public Share Link' }}
        </button>
      </div>

      <div v-if="shares.length > 0" class="shares-list">
        <h4>Active Share Links</h4>
        <div v-for="s in shares" :key="s.token" class="share-item">
          <div class="share-info">
            <span class="share-link-preview">{{ getShareUrl(s.token) }}</span>
            <span class="badge" :class="s.can_edit ? 'badge-pinned' : 'badge-locked'">
              {{ s.can_edit ? 'Can Edit' : 'Read Only' }}
            </span>
          </div>
          <div class="row" style="gap: 6px;">
            <button class="ghost sm" @click="copyToClipboard(s.token)">
              {{ copied ? 'Copied!' : 'Copy Link' }}
            </button>
            <button class="danger sm" @click="revoke(s.token)">Revoke</button>
          </div>
        </div>
      </div>

      <div v-else-if="!loading" class="empty-state" style="padding: 24px 0;">
        <p>No active public shares for this note.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.share-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--input-bg);
  padding: 14px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  margin-bottom: 20px;
}

.shares-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shares-list h4 {
  font-size: 0.95rem;
  margin-bottom: 6px;
}

.share-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  gap: 12px;
}

.share-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.share-link-preview {
  font-family: monospace;
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--primary);
}
</style>
