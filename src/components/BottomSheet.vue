<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'

const emit = defineEmits(['close'])
const box = ref(null)
const onKey = e => { if (e.key === 'Escape') emit('close') }

onMounted(() => {
  document.addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
  box.value?.querySelector('input, select, button')?.focus({ preventScroll: true })
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="scrim" @click.self="emit('close')">
    <div ref="box" class="sheet" role="dialog" aria-modal="true">
      <slot />
    </div>
  </div>
</template>
