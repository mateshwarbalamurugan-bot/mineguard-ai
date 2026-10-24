<script setup>
import { onMounted, onUnmounted } from 'vue';

const props = defineProps({
  imageUrl: { type: String, required: true },
  alt: { type: String, default: 'Attachment preview' },
});

const emit = defineEmits(['close']);

function handleKeyDown(e) {
  if (e.key === 'Escape') emit('close');
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="lightbox-overlay" @click.self="emit('close')" role="dialog" aria-modal="true" aria-label="Image preview">
    <div class="lightbox-content">
      <img :src="imageUrl" :alt="alt" class="lightbox-img" />
      <button class="lightbox-close" @click="emit('close')" aria-label="Close image preview">✕</button>
    </div>
  </div>
</template>

<style scoped>
.lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.lightbox-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-img {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.lightbox-close {
  position: absolute;
  top: -16px;
  right: -16px;
  background: #ffffff;
  color: #121214;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.lightbox-close:hover {
  background: #e4e4e7;
}
</style>
