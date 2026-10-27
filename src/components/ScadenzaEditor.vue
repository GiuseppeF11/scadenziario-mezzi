<script setup>
// Una scadenza dentro una voce: data, importo, ricorrenza e opzioni avanzate.
import { computed } from 'vue'
import { RICORRENZE, UNITA, ricorrenzaId } from '../lib/tipi.js'

const sc = defineModel({ type: Object, required: true })
defineProps({ removable: Boolean })
defineEmits(['remove'])

const ric = computed({
  get: () => (sc.value._custom ? 'pers' : ricorrenzaId(sc.value.ricorrenza)),
  set: id => {
    const r = RICORRENZE.find(x => x.id === id).r
    if (r === 'custom') { sc.value._custom = true; sc.value.ricorrenza = sc.value.ricorrenza || { n: 10, unita: 'giorni' } } else { delete sc.value._custom; sc.value.ricorrenza = r ? { ...r } : null }
  }
})
const uid = Math.random().toString(36).slice(2, 8)
</script>

<template>
  <div class="sc-card">
    <div class="sc-card-h">
      <div class="field" style="flex:1">
        <label :for="`t-${uid}`">Scadenza</label>
        <input :id="`t-${uid}`" v-model.trim="sc.titolo" required placeholder="es. Bolletta, Rinnovo, Rata">
      </div>
      <button v-if="removable" type="button" class="x-btn" aria-label="Rimuovi scadenza" style="margin-top:20px" @click="$emit('remove')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="grid2">
      <div class="field">
        <label :for="`d-${uid}`">Prossima scadenza</label>
        <input :id="`d-${uid}`" v-model="sc.data" type="date">
      </div>
      <div class="field">
        <label :for="`i-${uid}`">Importo (€)</label>
        <input :id="`i-${uid}`" v-model.number="sc.importo" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0,00">
      </div>
    </div>
    <div class="grid2">
      <div class="field">
        <label :for="`r-${uid}`">Ripetizione</label>
        <select :id="`r-${uid}`" v-model="ric">
          <option v-for="r in RICORRENZE" :key="r.id" :value="r.id">{{ r.label }}</option>
        </select>
      </div>
      <div v-if="ric === 'pers'" class="field">
        <label :for="`n-${uid}`">Ogni</label>
        <div style="display:flex;gap:6px">
          <input :id="`n-${uid}`" v-model.number="sc.ricorrenza.n" type="number" min="1" inputmode="numeric" style="width:70px">
          <select v-model="sc.ricorrenza.unita" aria-label="Unità">
            <option v-for="u in UNITA" :key="u.id" :value="u.id">{{ u.label }}</option>
          </select>
        </div>
      </div>
      <label v-else class="check" style="align-self:end;padding-bottom:10px">
        <input v-model="sc.variabile" type="checkbox"> Importo variabile
      </label>
    </div>
    <label v-if="ric === 'pers'" class="check"><input v-model="sc.variabile" type="checkbox"> Importo variabile</label>
    <p v-if="sc.variabile" class="hint muted" style="font-size:12px">L'importo indicato è una stima: dopo qualche pagamento uso la media degli ultimi tre.</p>
    <details class="adv">
      <summary>Altre opzioni</summary>
      <div class="field">
        <label :for="`a-${uid}`">Avvisami (giorni prima)</label>
        <input :id="`a-${uid}`" v-model.number="sc.avviso" type="number" min="0" inputmode="numeric">
      </div>
      <div v-if="sc.ricorrenza" class="field">
        <label :for="`b-${uid}`">La prossima si calcola dalla</label>
        <select :id="`b-${uid}`" v-model="sc.base">
          <option value="scadenza">data di scadenza</option>
          <option value="pagamento">data in cui pago / faccio</option>
        </select>
      </div>
      <label v-if="sc.ricorrenza" class="check"><input v-model="sc.fineMese" type="checkbox"> Scade sempre a fine mese</label>
    </details>
  </div>
</template>
