<script setup>
const props = defineProps({
  note: { type: Object, required: true },
});

const emit = defineEmits(['edit', 'delete', 'filter-tag']);

function tagList(note) {
  return note.tags ? note.tags.split(',') : [];
}
</script>

<template>
  <article class="card note">
    <h3>{{ note.title }}</h3>
    <p class="body">{{ note.body }}</p>
    <div class="tags">
      <span
        v-for="t in tagList(note)"
        :key="t"
        class="tag"
        @click="emit('filter-tag', t)"
      >{{ t }}</span>
    </div>
    <div class="row">
      <button class="ghost" @click="emit('edit', note)">Edit</button>
      <button class="danger" @click="emit('delete', note.id)">Delete</button>
    </div>
  </article>
</template>
