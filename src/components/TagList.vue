<script setup>
import { computed } from 'vue'
import { etichetteById } from '../lib/store.js'
const props = defineProps({ ids: { type: Array, default: () => [] } })
const list = computed(() => props.ids.map(id => etichetteById.value.get(id)).filter(Boolean))
</script>

<template>
  <span v-if="list.length" class="tags">
    <span v-for="e in list" :key="e.id" class="tag" :style="{ '--tc': e.colore }"><i></i>{{ e.nome }}</span>
  </span>
</template>
