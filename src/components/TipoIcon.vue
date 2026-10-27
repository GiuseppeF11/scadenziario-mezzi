<script setup>
import { computed } from 'vue'
import { tipoOf } from '../lib/tipi.js'
const props = defineProps({ tipo: String, small: Boolean })
const t = computed(() => tipoOf(props.tipo))
</script>

<template>
  <span class="tile ti" :class="[`ti-${t.id}`, { sm: small }]" :title="t.nome" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path :d="t.icon" /></svg>
  </span>
</template>
