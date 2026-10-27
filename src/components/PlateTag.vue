<script setup>
import { computed } from 'vue'
import { formatTarga } from '../lib/scadenze.js'

const props = defineProps({ targa: String, large: Boolean })
const text = computed(() => formatTarga(props.targa))
</script>

<template>
  <span v-if="text" class="plate" :class="{ lg: large }" :aria-label="`Targa ${text}`">
    <span class="eu">I</span><span class="tx">{{ text }}</span>
  </span>
</template>
