<script setup>
// Selezione etichette con creazione al volo: scrivi e premi Invio.
import { ref } from 'vue'
import { state, addEtichetta } from '../lib/store.js'
const model = defineModel({ type: Array, default: () => [] })
const nuova = ref('')
const toggle = id => { model.value = model.value.includes(id) ? model.value.filter(x => x !== id) : [...model.value, id] }
function crea() {
  const id = addEtichetta(nuova.value)
  if (id && !model.value.includes(id)) model.value = [...model.value, id]
  nuova.value = ''
}
</script>

<template>
  <div class="picker">
    <button v-for="e in state.impostazioni.etichette" :key="e.id" type="button" class="chip" :style="{ '--tc': e.colore }" :aria-pressed="model.includes(e.id)" @click="toggle(e.id)">
      <i></i>{{ e.nome }}
    </button>
    <input v-model="nuova" placeholder="+ Nuova etichetta" aria-label="Nuova etichetta" enterkeyhint="done" @keydown.enter.prevent="crea" @blur="nuova && crea()">
  </div>
</template>
