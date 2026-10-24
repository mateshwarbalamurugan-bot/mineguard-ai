<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { api } from '../api.js';

const props = defineProps({
  notes: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'select-note']);

const searchInput = ref(null);
const query = ref('');
const activeTab = ref('search'); // 'search' | 'ask'
const aiQuery = ref('');
const aiAnswer = ref('');
const aiSources = ref([]);
const aiLoading = ref(false);
const aiError = ref('');

const filteredNotes = computed(() => {
  if (!query.value.trim()) return props.notes.slice(0, 8);
  const q = query.value.toLowerCase();
  return props.notes
    .filter((n) => {
      if (n.locked) return n.title.toLowerCase().includes(q);
      const inTitle = n.title.toLowerCase().includes(q);
      const inBody = typeof n.body === 'string' ? n.body.toLowerCase().includes(q) : false;
      const inTags = Array.isArray(n.tags) ? n.tags.some((t) => t.toLowerCase().includes(q)) : false;
      return inTitle || inBody || inTags;
    })
    .slice(0, 10);
});

async function askAI() {
  if (!aiQuery.value.trim() || aiLoading.value) return;
  aiLoading.value = true;
  aiError.value = '';
  aiAnswer.value = '';
  aiSources.value = [];

  try {
    const res = await api.aiAsk(aiQuery.value.trim());
    aiAnswer.value = res.answer;
    aiSources.value = res.sources || [];
  } catch (err) {
    aiError.value = err.message || 'Failed to query AI';
  } finally {
    aiLoading.value = false;
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    emit('close');
  }
}

function selectNote(note) {
  emit('select-note', note);
  emit('close');
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  nextTick(() => {
    searchInput.value?.focus();
  });
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')" role="dialog" aria-modal="true" aria-label="Command Palette">
    <div class="palette-container">
      <div class="palette-tabs">
        <button
          :class="['palette-tab', { active: activeTab === 'search' }]"
          @click="activeTab = 'search'"
        >
          🔍 Search Notes
        </button>
        <button
          :class="['palette-tab', { active: activeTab === 'ask' }]"
          @click="activeTab = 'ask'"
        >
          ✨ Ask Your Notes (AI)
        </button>
        <button class="ghost sm" style="margin-left: auto;" @click="emit('close')">✕</button>
      </div>

      <!-- Quick Search Tab -->
      <div v-if="activeTab === 'search'" class="search-view">
        <input
          ref="searchInput"
          v-model="query"
          placeholder="Type to search titles, body, tags..."
          class="palette-input"
        />

        <div class="results-list">
          <div
            v-for="note in filteredNotes"
            :key="note.id"
            class="result-item"
            @click="selectNote(note)"
          >
            <div class="result-title-row">
              <span class="result-title">{{ note.title }}</span>
              <span v-if="note.locked" class="badge badge-locked">Locked</span>
              <span v-if="note.pinned" class="badge badge-pinned">Pinned</span>
            </div>
            <p v-if="!note.locked && note.body" class="result-snippet">
              {{ typeof note.body === 'string' ? note.body.slice(0, 100) : 'Checklist note' }}
            </p>
          </div>
          <div v-if="filteredNotes.length === 0" class="empty-state" style="padding: 24px 0;">
            No notes found matching "{{ query }}"
          </div>
        </div>
      </div>

      <!-- Ask AI Tab -->
      <div v-if="activeTab === 'ask'" class="ask-view">
        <div class="row">
          <input
            v-model="aiQuery"
            placeholder="e.g. What are our key Q4 deliverables?"
            class="palette-input"
            @keydown.enter.prevent="askAI"
          />
          <button class="primary" :disabled="aiLoading || !aiQuery.trim()" @click="askAI">
            {{ aiLoading ? 'Thinking...' : 'Ask AI' }}
          </button>
        </div>

        <div v-if="aiError" class="error-text" style="margin-top: 10px;">{{ aiError }}</div>

        <div v-if="aiAnswer" class="ai-answer-card">
          <h4>AI Answer:</h4>
          <p class="ai-answer-text">{{ aiAnswer }}</p>

          <div v-if="aiSources.length > 0" class="sources-box">
            <span class="sources-label">Sources:</span>
            <div class="source-chips">
              <span
                v-for="src in aiSources"
                :key="src.id"
                class="source-chip"
                @click="selectNote(src)"
              >
                📄 {{ src.title }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.palette-container {
  background: var(--surface);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  width: 100%;
  max-width: 620px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
  animation: scaleUp 0.15s ease-out;
}

.palette-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--input-bg);
  border-bottom: 1px solid var(--card-border);
}

.palette-tab {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
}

.palette-tab.active {
  background: var(--surface);
  border-color: var(--card-border);
  color: var(--text);
  font-weight: 600;
}

.search-view, .ask-view {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.palette-input {
  padding: 10px 14px;
  font-size: 1rem;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 360px;
  overflow-y: auto;
}

.result-item {
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--input-bg);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.result-item:hover {
  background: var(--surface);
  border-color: var(--primary);
  transform: translateX(2px);
}

.result-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-title {
  font-weight: 600;
  font-size: 0.95rem;
}

.result-snippet {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ai-answer-card {
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  padding: 16px;
  border-radius: 8px;
  margin-top: 10px;
}

.ai-answer-card h4 {
  font-size: 0.9rem;
  margin-bottom: 8px;
  color: var(--primary);
}

.ai-answer-text {
  font-size: 0.95rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.sources-box {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--card-border);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sources-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.source-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.source-chip {
  font-size: 0.75rem;
  padding: 2px 8px;
  background: var(--surface);
  border: 1px solid var(--card-border);
  border-radius: 4px;
  cursor: pointer;
}

.source-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
}
</style>
