<script setup>
import { ref, onMounted, provide } from 'vue';

const theme = ref(localStorage.getItem('notes_theme') || 'light');
const toasts = ref([]);

function applyTheme(t) {
  theme.value = t;
  localStorage.setItem('notes_theme', t);
  if (t === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

function toggleTheme() {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark');
}

function showToast(message, type = 'info', duration = 4000) {
  const id = Date.now() + Math.random();
  toasts.value.push({ id, message, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, duration);
}

function removeToast(id) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

provide('theme', { theme, toggleTheme, applyTheme });
provide('toast', { showToast });

onMounted(() => {
  // Check system preference if no explicit storage
  if (!localStorage.getItem('notes_theme')) {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      applyTheme('dark');
    }
  } else {
    applyTheme(theme.value);
  }
});
</script>

<template>
  <div class="app-wrapper">
    <router-view />

    <!-- Global Toast Notifications -->
    <div v-if="toasts.length" class="toast-container" role="region" aria-label="Notifications">
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="['toast', `toast-${t.type}`]"
        role="alert"
      >
        <span>{{ t.message }}</span>
        <button class="ghost sm" style="padding: 2px 6px;" @click="removeToast(t.id)" aria-label="Dismiss">✕</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
