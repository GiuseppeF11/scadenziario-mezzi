<script setup>
// Filtri condivisi tra le viste: tipologie (multi), etichetta, raggruppamento.
import { computed } from 'vue'
import { state } from '../lib/store.js'
import { ui } from '../lib/ui.js'
import { TIPI } from '../lib/tipi.js'

const props = defineProps({ raggruppa: { type: Array, default: null }, urgenti: { type: Number, default: null }, gruppoKey: { type: String, default: 'raggruppa' } })
const f = ui.filtri
// Mostra solo le tipologie effettivamente usate (più quelle già selezionate)
const tipi = computed(() => TIPI.filter(t => f.tipi.includes(t.id) || state.voci.some(v => v.tipo === t.id)))
const toggle = id => { f.tipi = f.tipi.includes(id) ? f.tipi.filter(x => x !== id) : [...f.tipi, id] }
const LABEL = { mese: 'Mese', tipo: 'Tipologia', etichetta: 'Etichetta', voce: 'Voce' }
</script>

<template>
  <div class="filters">
    <div v-if="tipi.length > 1" class="scroller" role="group" aria-label="Filtra per tipologia">
      <button class="chip" :aria-pressed="!f.tipi.length" @click="f.tipi = []">Tutte</button>
      <button v-for="t in tipi" :key="t.id" class="chip" :aria-pressed="f.tipi.includes(t.id)" @click="toggle(t.id)">
        <i class="dot ti" :class="`ti-${t.id}`"></i>{{ t.plurale }}
      </button>
    </div>
    <div class="filter-row">
      <button v-if="urgenti !== null" class="chip" :aria-pressed="f.soloUrgenti" @click="f.soloUrgenti = !f.soloUrgenti">Da gestire ({{ urgenti }})</button>
      <label class="sr" for="f-et">Etichetta</label>
      <select v-if="state.impostazioni.etichette.length" id="f-et" v-model="f.etichetta" class="select-sm">
        <option value="">Tutte le etichette</option>
        <option v-for="e in state.impostazioni.etichette" :key="e.id" :value="e.id">{{ e.nome }}</option>
        <option value="_none">Senza etichetta</option>
      </select>
      <div v-if="raggruppa" class="seg" role="group" aria-label="Raggruppa per">
        <button v-for="g in raggruppa" :key="g" :aria-pressed="f[gruppoKey] === g" @click="f[gruppoKey] = g">{{ LABEL[g] }}</button>
      </div>
    </div>
  </div>
</template>
