<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api.js';
import LightboxModal from '../components/LightboxModal.vue';

const route = useRoute();
const router = useRouter();
const token = route.params.token;
const { theme, toggleTheme } = inject('theme');
const { showToast } = inject('toast', { showToast: alert });

const note = ref(null);
const comments = ref([]);
const loading = ref(true);
const error = ref('');
const lightboxImage = ref(null);

// New comment form
const authorName = ref('');
const commentText = ref('');
const postingComment = ref(false);
const commentError = ref('');

const checklistItems = computed(() => {
  if (!note.value || note.value.type !== 'checklist') return [];
  if (Array.isArray(note.value.body)) return note.value.body;
  try {
    return JSON.parse(note.value.body) || [];
  } catch {
    return [];
  }
});

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    note.value = await api.getPublicNote(token);
    comments.value = await api.getPublicComments(token);
  } catch (err) {
    error.value = err.message || 'Note not found or link has expired.';
  } finally {
    loading.value = false;
  }
}

async function submitComment() {
  if (!commentText.value.trim()) return;
  postingComment.value = true;
  commentError.value = '';
  try {
    const newComment = await api.postPublicComment(token, {
      author: authorName.value.trim() || 'Anonymous Reader',
      text: commentText.value.trim(),
    });
    comments.value.push(newComment);
    commentText.value = '';
    showToast('Comment posted', 'success');
  } catch (err) {
    commentError.value = err.message || 'Failed to post comment';
  } finally {
    postingComment.value = false;
  }
}

async function deleteComment(id) {
  if (!confirm('Delete this comment?')) return;
  try {
    await api.deleteComment(id);
    comments.value = comments.value.filter((c) => c.id !== id);
    showToast('Comment deleted', 'info');
  } catch (err) {
    showToast(err.message || 'Only note owners can delete comments', 'danger');
  }
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

onMounted(loadData);
</script>

<template>
  <div class="shared-page">
    <!-- Header -->
    <header class="shared-nav">
      <div class="nav-content">
        <router-link to="/" class="brand">
          <svg class="brand-icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M3 4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4zm3 2v2h12V6H6zm0 4v2h12v-2H6zm0 4v2h8v-2H6z"/>
          </svg>
          <span>NotesBoard Shared Note</span>
        </router-link>
        <div class="row">
          <button class="ghost sm" @click="toggleTheme" :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
            {{ theme === 'dark' ? '☀️ Light' : '🌙 Dark' }}
          </button>
          <router-link to="/app" class="btn primary sm">Open NotesBoard →</router-link>
        </div>
      </div>
    </header>

    <!-- Main Container -->
    <main class="reading-container">
      <div v-if="loading" class="empty-state">
        <p>Loading shared note...</p>
      </div>

      <div v-else-if="error" class="error-container">
        <h2>Note Unavailable</h2>
        <p>{{ error }}</p>
        <router-link to="/" class="btn ghost sm">← Back to Home</router-link>
      </div>

      <article v-else class="article-box">
        <header class="note-header">
          <h1 class="note-title">{{ note.title }}</h1>
          <div class="note-meta">
            <span class="text-muted">Shared note &bull; {{ formatDate(note.updated_at || note.created_at) }}</span>
            <div v-if="note.tags && note.tags.length" class="tag-row">
              <span v-for="t in note.tags" :key="t" class="tag">#{{ t }}</span>
            </div>
          </div>
        </header>

        <!-- Body -->
        <div class="note-body-reading">
          <!-- Checklist -->
          <div v-if="note.type === 'checklist'" class="shared-checklist">
            <div
              v-for="(item, idx) in checklistItems"
              :key="item.id || idx"
              class="shared-check-item"
            >
              <input type="checkbox" :checked="item.done" disabled style="width: auto;" />
              <span :class="{ 'done-text': item.done }">{{ item.text }}</span>
            </div>
          </div>

          <!-- Plain / Markdown text -->
          <div v-else class="shared-text">
            {{ note.body }}
          </div>
        </div>

        <!-- Images gallery -->
        <div v-if="note.attachments && note.attachments.length" class="shared-gallery">
          <h4>Attachments</h4>
          <div class="gallery-grid">
            <img
              v-for="att in note.attachments"
              :key="att.id"
              :src="api.getAttachmentFileUrl(att.id)"
              :alt="att.original_name"
              class="gallery-img"
              @click="lightboxImage = api.getAttachmentFileUrl(att.id)"
            />
          </div>
        </div>

        <hr class="divider" />

        <!-- Public Comments Section -->
        <section class="comments-section">
          <h3>Comments ({{ comments.length }})</h3>

          <!-- Post comment form -->
          <form class="comment-form" @submit.prevent="submitComment">
            <input
              v-model="authorName"
              placeholder="Your Name (or Anonymous)"
              maxlength="50"
            />
            <textarea
              v-model="commentText"
              rows="3"
              placeholder="Write a comment..."
              maxlength="2000"
              required
            ></textarea>
            <div v-if="commentError" class="error-text">{{ commentError }}</div>
            <div class="row">
              <button type="submit" class="primary sm" :disabled="postingComment">
                {{ postingComment ? 'Posting...' : 'Post Comment' }}
              </button>
            </div>
          </form>

          <!-- Comment list -->
          <div v-if="comments.length" class="comments-list">
            <div v-for="c in comments" :key="c.id" class="comment-item">
              <div class="row space-between">
                <strong>{{ c.author }}</strong>
                <div class="row" style="gap: 8px;">
                  <span class="text-muted" style="font-size: 0.75rem;">{{ formatDate(c.created_at) }}</span>
                  <button class="ghost sm" style="padding: 1px 6px; font-size: 0.75rem;" title="Delete (owner only)" @click="deleteComment(c.id)">
                    ✕
                  </button>
                </div>
              </div>
              <p class="comment-text">{{ c.text }}</p>
            </div>
          </div>

          <div v-else class="empty-state" style="padding: 24px 0;">
            <p>No comments yet. Start the conversation!</p>
          </div>
        </section>
      </article>
    </main>

    <!-- Lightbox Modal -->
    <LightboxModal
      v-if="lightboxImage"
      :image-url="lightboxImage"
      @close="lightboxImage = null"
    />
  </div>
</template>

<style scoped>
.shared-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.shared-nav {
  position: sticky;
  top: 0;
  background: var(--surface);
  border-bottom: 1px solid var(--card-border);
  z-index: 100;
}

.nav-content {
  max-width: 820px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 1.05rem;
}

.reading-container {
  max-width: 820px;
  width: 100%;
  margin: 36px auto;
  padding: 0 20px 80px;
}

.article-box {
  background: var(--surface);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 36px;
  box-shadow: var(--shadow);
}

.note-header {
  margin-bottom: 24px;
}

.note-title {
  font-size: 2.2rem;
  line-height: 1.2;
  margin-bottom: 12px;
}

.note-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.85rem;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.note-body-reading {
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--text);
  margin-bottom: 28px;
}

.shared-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.shared-checklist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shared-check-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.done-text {
  text-decoration: line-through;
  opacity: 0.6;
}

.shared-gallery {
  margin-bottom: 28px;
}

.gallery-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.gallery-img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.gallery-img:hover {
  transform: scale(1.04);
}

.divider {
  border: none;
  border-top: 1px solid var(--card-border);
  margin: 32px 0;
}

/* Comments */
.comments-section h3 {
  font-size: 1.3rem;
  margin-bottom: 16px;
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item {
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 14px;
}

.comment-text {
  margin: 8px 0 0;
  font-size: 0.95rem;
  white-space: pre-wrap;
}

.error-container {
  text-align: center;
  padding: 48px 20px;
  background: var(--surface);
  border: 1px solid var(--card-border);
  border-radius: 12px;
}

@media (max-width: 640px) {
  .article-box {
    padding: 20px;
  }
  .note-title {
    font-size: 1.6rem;
  }
}
</style>
