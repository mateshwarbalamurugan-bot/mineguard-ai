<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from './api.js';
import NoteForm from './components/NoteForm.vue';
import NoteCard from './components/NoteCard.vue';

const notes = ref([]);
const allTags = ref([]);
const search = ref('');
const activeTag = ref('');
const editingNote = ref(null);
const error = ref('');

async function loadNotes() {
  try {
    const params = {};
    if (search.value) params.q = search.value;
    if (activeTag.value) params.tag = activeTag.value;
    notes.value = await api.getNotes(params);
    await refreshTags();
  } catch (err) {
    error.value = err.message;
  }
}

async function refreshTags() {
  const all = await api.getNotes();
  const set = new Set();
  all.forEach((n) => tagList(n).forEach((t) => set.add(t)));
  allTags.value = [...set].sort();
}

function tagList(note) {
  return note.tags ? note.tags.split(',') : [];
}

async function handleSave(formData, { resolve, reject }) {
  error.value = '';
  try {
    if (editingNote.value) {
      await api.updateNote(editingNote.value.id, formData);
    } else {
      await api.createNote(formData);
    }
    editingNote.value = null;
    await loadNotes();
    resolve();
  } catch (err) {
    error.value = err.message;
    reject(err);
  }
}

function startEdit(note) {
  editingNote.value = note;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
  editingNote.value = null;
  error.value = '';
}

async function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  try {
    await api.deleteNote(id);
    if (editingNote.value?.id === id) cancelEdit();
    await loadNotes();
  } catch (err) {
    error.value = err.message;
  }
}

function filterByTag(tag) {
  activeTag.value = tag;
  loadNotes();
}

onMounted(loadNotes);
</script>

<template>
  <header class="top">
    <h1>Notes Board</h1>
    <p class="sub">{{ notes.length }} note{{ notes.length === 1 ? '' : 's' }}</p>
  </header>

  <NoteForm
    :editing-note="editingNote"
    :save-error="error"
    @save="handleSave"
    @cancel="cancelEdit"
  />

  <div class="toolbar">
    <input v-model="search" @input="loadNotes" placeholder="Search notes..." />
    <select v-model="activeTag" @change="loadNotes">
      <option value="">All tags</option>
      <option v-for="t in allTags" :key="t" :value="t">{{ t }}</option>
    </select>
  </div>

  <p v-if="!notes.length" class="empty">No notes yet. Add your first one above.</p>
  <div class="grid">
    <NoteCard
      v-for="n in notes"
      :key="n.id"
      :note="n"
      @edit="startEdit"
      @delete="deleteNote"
      @filter-tag="filterByTag"
    />
  </div>
</template>
