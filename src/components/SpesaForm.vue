<script setup>
// Registra una spesa extra (non legata a una scadenza) o modifica un pagamento esistente.
import { ref, computed, watch } from 'vue'
import { state, savePagamento, deletePagamento } from '../lib/store.js'
import { TIPI } from '../lib/tipi.js'
import { iso, today } from '../lib/dates.js'
import { closeSheet, toast } from '../lib/ui.js'
import EtichettePicker from './EtichettePicker.vue'
import { useBozza, leggiBozza, scartaBozza, oraBozza } from '../lib/bozze.js'

const props = defineProps({ pagamento: Object })
const iniziale = props.pagamento ? { ...props.pagamento, etichette: [...(props.pagamento.etichette || [])] } : { titolo: '', tipo: 'altro', voceId: '', data: iso(today()), importo: null, etichette: [], nota: '' }
const bozzaId = props.pagamento ? `spesa-${props.pagamento.id}` : 'spesa-nuova'
const base = JSON.stringify(iniziale)
const ripristinata = ref(leggiBozza(bozzaId))
const p = ref(ripristinata.value ? ripristinata.value.data : iniziale)
const { chiudiSenzaBozza } = useBozza(() => bozzaId, () => p.value, () => base)
function scartaModifiche() { scartaBozza(bozzaId); p.value = JSON.parse(base); ripristinata.value = null }
const error = ref('')
const voci = computed(() => state.voci.filter(v => v.tipo === p.value.tipo).sort((a, b) => a.nome.localeCompare(b.nome)))

// Collegando una voce eredita le sue etichette
watch(() => p.value.voceId, id => {
  const v = state.voci.find(x => x.id === id)
  if (v && !props.pagamento) p.value.etichette = [...(v.etichette || [])]
})

function save() {
  if (!p.value.titolo?.trim() && !p.value.voceId) { error.value = 'Scrivi una descrizione.'; return }
  if (!(Number(p.value.importo) > 0)) { error.value = 'Inserisci un importo.'; return }
  const v = state.voci.find(x => x.id === p.value.voceId)
  chiudiSenzaBozza()
  savePagamento({ ...p.value, titolo: p.value.titolo?.trim() || v?.nome || 'Spesa', voceId: p.value.voceId || null })
  toast(props.pagamento ? 'Movimento aggiornato' : 'Spesa registrata')
  closeSheet()
}
function remove() {
  chiudiSenzaBozza()
  const undo = deletePagamento(props.pagamento.id)
  toast('Movimento eliminato', undo)
  closeSheet()
}
</script>

<template>
  <h2>{{ pagamento ? 'Modifica movimento' : 'Registra una spesa' }}</h2>
  <div v-if="ripristinata" class="preview bozza">
    <span>Ho ripreso la bozza del {{ oraBozza(ripristinata) }}.</span>
    <button type="button" class="link-btn danger" @click="scartaModifiche">Scarta</button>
  </div>
  <form class="form" novalidate @submit.prevent="save">
    <div class="field">
      <label for="s-t">Descrizione</label>
      <input id="s-t" v-model="p.titolo" placeholder="es. Idraulico, ricarica telefono">
    </div>
    <div class="grid2">
      <div class="field">
        <label for="s-imp">Importo (€)</label>
        <input id="s-imp" v-model.number="p.importo" type="number" inputmode="decimal" step="0.01" min="0" required>
      </div>
      <div class="field">
        <label for="s-d">Data</label>
        <input id="s-d" v-model="p.data" type="date" required>
      </div>
      <div class="field">
        <label for="s-tipo">Tipologia</label>
        <select id="s-tipo" v-model="p.tipo">
          <option v-for="t in TIPI" :key="t.id" :value="t.id">{{ t.nome }}</option>
        </select>
      </div>
      <div class="field">
        <label for="s-v">Collega a una voce</label>
        <select id="s-v" v-model="p.voceId" :disabled="!voci.length">
          <option value="">Nessuna</option>
          <option v-for="v in voci" :key="v.id" :value="v.id">{{ v.nome }}</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label>Etichette</label>
      <EtichettePicker v-model="p.etichette" />
    </div>
    <div class="field">
      <label for="s-n">Nota</label>
      <input id="s-n" v-model="p.nota">
    </div>
    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <div class="sheet-actions">
      <button type="button" class="btn" @click="closeSheet">Annulla</button>
      <button type="submit" class="btn primary">Salva</button>
    </div>
    <button v-if="pagamento" type="button" class="btn danger wide" @click="remove">Elimina movimento</button>
    <p v-if="pagamento?.prima" class="hint muted" style="font-size:12px">Eliminare il movimento non sposta indietro la data della scadenza: se serve, correggila dalla voce.</p>
  </form>
</template>
