<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  editingNote: { type: Object, default: null },
  saveError: { type: String, default: '' },
});

const emit = defineEmits(['save', 'cancel']);

const form = ref({ title: '', body: '', tags: '' });
const saving = ref(false);
const localError = ref('');

// Populate form when editingNote changes
watch(
  () => props.editingNote,
  (note) => {
    form.value = note
      ? { title: note.title, body: note.body, tags: note.tags }
      : { title: '', body: '', tags: '' };
    localError.value = '';
  },
  { immediate: true }
);

async function onSubmit() {
  localError.value = '';
  saving.value = true;
  try {
    await new Promise((resolve, reject) => {
      emit('save', { ...form.value }, { resolve, reject });
    });
    // Clear form only in create mode (editingNote is null after save)
    if (!props.editingNote) {
      form.value = { title: '', body: '', tags: '' };
    }
  } catch (err) {
    localError.value = err.message || 'Save failed';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form class="card form" @submit.prevent="onSubmit">
    <h2>{{ editingNote ? 'Edit note' : 'New note' }}</h2>
    <input v-model="form.title" placeholder="Title" maxlength="120" required />
    <textarea v-model="form.body" rows="4" placeholder="Write your note..."></textarea>
    <input v-model="form.tags" placeholder="Tags, comma separated (e.g. work, ideas)" />
    <p v-if="saveError || localError" class="error">{{ saveError || localError }}</p>
    <div class="row">
      <button type="submit" :disabled="saving">{{ editingNote ? 'Update' : 'Add note' }}</button>
      <button v-if="editingNote" type="button" class="ghost" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>
