<script setup>
// Conferma di una scadenza pagata/fatta: registra l'importo reale e sposta la data alla prossima.
import { ref, computed } from 'vue'
import { paga, state } from '../lib/store.js'
import { prossimaData, stimaImporto, donePerTitolo } from '../lib/scadenze.js'
import { iso, today, parse, fmtDate, eur } from '../lib/dates.js'
import { closeSheet, toast } from '../lib/ui.js'
import TipoIcon from './TipoIcon.vue'

const props = defineProps({ voce: Object, scId: String })
const sc = computed(() => props.voce.scadenze.find(s => s.id === props.scId))
const data = ref(iso(today()))
const importo = ref(stimaImporto(sc.value, state.pagamenti) || null)
const nota = ref('')
const next = computed(() => prossimaData(sc.value, data.value))
const label = donePerTitolo(sc.value.titolo)

function conferma() {
  const r = paga(props.voce, props.scId, { data: data.value || iso(today()), importo: importo.value, nota: nota.value })
  toast(r.next ? `Fatto. Prossima: ${fmtDate(parse(r.next))}` : 'Fatto. Scadenza completata', r.undo)
  closeSheet()
}
</script>

<template>
  <div class="voce-h">
    <TipoIcon :tipo="voce.tipo" />
    <div class="mid"><h2>{{ label }}</h2><span class="muted">{{ sc.titolo }} · {{ voce.nome }}</span></div>
  </div>
  <form class="form" @submit.prevent="conferma">
    <div class="grid2">
      <div class="field">
        <label for="p-data">Data</label>
        <input id="p-data" v-model="data" type="date" required>
      </div>
      <div class="field">
        <label for="p-imp">Importo pagato (€)</label>
        <input id="p-imp" v-model.number="importo" type="number" inputmode="decimal" step="0.01" min="0">
        <span v-if="sc.variabile" class="hint">Stima {{ eur(stimaImporto(sc, state.pagamenti)) }}: metti l'importo reale.</span>
      </div>
    </div>
    <div class="field">
      <label for="p-nota">Nota (facoltativa)</label>
      <input id="p-nota" v-model="nota" placeholder="es. periodo set–ott, consumo 210 kWh">
    </div>
    <div class="preview">
      <template v-if="next">Prossima scadenza: <b>{{ fmtDate(parse(next)) }}</b></template>
      <template v-else>Scadenza una tantum: verrà chiusa.</template>
    </div>
    <div class="sheet-actions">
      <button type="button" class="btn" @click="closeSheet">Annulla</button>
      <button type="submit" class="btn primary">Conferma</button>
    </div>
  </form>
</template>
