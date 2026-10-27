<script setup>
import { reactive, ref } from 'vue'
import { saveMezzo, deleteMezzo } from '../lib/store.js'
import { iso, endOfMonth, parse } from '../lib/dates.js'
import { toast, closeSheet } from '../lib/ui.js'

const props = defineProps({ mezzo: Object })
const isNew = !props.mezzo
const m = props.mezzo || {}

const f = reactive({
  modello: m.modello || '', targa: m.targa || '', proprietario: m.proprietario || '', tipo: m.tipo || 'auto',
  compagnia: m.compagnia || '', polizza: m.polizza || '', frazionamento: m.frazionamento || 'ANNUALE',
  premioAnnuo: m.premioAnnuo ?? '', ultimoPagamento: m.ultimoPagamento || '',
  scadRevisione: m.scadRevisione || '', importoBollo: m.importoBollo ?? '',
  meseBollo: m.scadBollo ? String(m.scadBollo).slice(0, 7) : '', note: m.note || ''
})
const error = ref('')
const confirmDelete = ref(false)

const num = v => (v === '' || v == null ? 0 : Math.round(parseFloat(String(v).replace(',', '.')) * 100) / 100 || 0)

function save() {
  if (!f.modello.trim() || !f.targa.trim()) { error.value = 'Inserisci almeno modello e targa.'; return }
  const data = {
    modello: f.modello.trim(), targa: f.targa.toUpperCase().replace(/\s+/g, ''), proprietario: f.proprietario.trim().toUpperCase(),
    tipo: f.tipo, compagnia: f.compagnia.trim(), polizza: f.polizza.trim(), frazionamento: f.frazionamento,
    premioAnnuo: num(f.premioAnnuo), ultimoPagamento: f.ultimoPagamento, scadRevisione: f.scadRevisione,
    importoBollo: num(f.importoBollo), scadBollo: f.meseBollo ? iso(endOfMonth(parse(f.meseBollo + '-01'))) : '',
    note: f.note.trim()
  }
  saveMezzo(data, m.id)
  toast(isNew ? 'Mezzo aggiunto' : 'Modifiche salvate')
  closeSheet()
}

function remove() {
  deleteMezzo(m.id)
  toast('Mezzo eliminato')
  closeSheet()
}
</script>

<template>
  <h2>{{ isNew ? 'Nuovo mezzo' : 'Modifica mezzo' }}</h2>
  <form class="form" novalidate @submit.prevent="save">
    <div class="grid2">
      <div class="field"><label for="f-modello">Modello *</label><input id="f-modello" v-model="f.modello" placeholder="Peugeot 208"></div>
      <div class="field"><label for="f-targa">Targa *</label><input id="f-targa" v-model="f.targa" placeholder="AB123CD" autocapitalize="characters"></div>
      <div class="field"><label for="f-prop">Proprietario</label><input id="f-prop" v-model="f.proprietario"></div>
      <div class="field"><label for="f-tipo">Tipo</label>
        <select id="f-tipo" v-model="f.tipo"><option value="auto">Auto</option><option value="moto">Moto</option></select></div>
    </div>

    <div class="sec">Assicurazione</div>
    <div class="grid2">
      <div class="field"><label for="f-comp">Compagnia</label><input id="f-comp" v-model="f.compagnia"></div>
      <div class="field"><label for="f-pol">N° polizza</label><input id="f-pol" v-model="f.polizza"></div>
      <div class="field"><label for="f-fraz">Frazionamento</label>
        <select id="f-fraz" v-model="f.frazionamento"><option value="ANNUALE">Annuale</option><option value="SEMESTRALE">Semestrale</option></select></div>
      <div class="field"><label for="f-premio">Premio annuo (€)</label><input id="f-premio" v-model="f.premioAnnuo" type="number" inputmode="decimal" step="0.01" min="0"></div>
    </div>
    <div class="field">
      <label for="f-ultimo">Ultimo pagamento</label><input id="f-ultimo" v-model="f.ultimoPagamento" type="date">
      <span class="hint">La scadenza si calcola da qui: +6 mesi se semestrale, +12 se annuale.</span>
    </div>

    <div class="sec">Revisione e bollo</div>
    <div class="grid2">
      <div class="field"><label for="f-rev">Scadenza revisione</label><input id="f-rev" v-model="f.scadRevisione" type="date"></div>
      <div class="field"><label for="f-bollo">Importo bollo (€)</label><input id="f-bollo" v-model="f.importoBollo" type="number" inputmode="decimal" step="0.01" min="0"></div>
    </div>
    <div class="field"><label for="f-sbollo">Mese scadenza bollo</label><input id="f-sbollo" v-model="f.meseBollo" type="month"></div>
    <div class="field"><label for="f-note">Note</label><textarea id="f-note" v-model="f.note" rows="2"></textarea></div>

    <p v-if="error" class="err">{{ error }}</p>
    <div class="sheet-actions">
      <button type="button" class="btn" @click="closeSheet">Annulla</button>
      <button type="submit" class="btn primary">Salva</button>
    </div>
    <template v-if="!isNew">
      <button v-if="!confirmDelete" type="button" class="btn danger wide" @click="confirmDelete = true">Elimina mezzo</button>
      <div v-else class="sheet-actions">
        <button type="button" class="btn" @click="confirmDelete = false">Non eliminare</button>
        <button type="button" class="btn danger" @click="remove">Elimina definitivamente</button>
      </div>
    </template>
  </form>
</template>
