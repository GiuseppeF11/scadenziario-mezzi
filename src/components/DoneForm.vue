<script setup>
import { computed, ref } from 'vue'
import { KIND, DONE_LABEL, avanza, scadAssicurazione } from '../lib/scadenze.js'
import { setField } from '../lib/store.js'
import { iso, parse, today, fmtDate, fmtMonth } from '../lib/dates.js'
import { toast, closeSheet } from '../lib/ui.js'

const props = defineProps({ mezzo: Object, kind: String })
const dataRev = ref(iso(today()))
const step = computed(() => avanza(props.mezzo, props.kind, dataRev.value))
const nextValue = computed(() => step.value.value)

function confirm() {
  const { field, value } = step.value
  const prev = props.mezzo[field]
  const id = props.mezzo.id
  setField(id, field, value)
  closeSheet()
  const label = props.kind === 'bollo' ? fmtMonth(parse(value)) : fmtDate(props.kind === 'assic' ? scadAssicurazione({ ...props.mezzo, [field]: value }) : parse(value))
  toast(`${KIND[props.kind]}: prossima ${label}`, () => setField(id, field, prev))
}
</script>

<template>
  <h2>{{ DONE_LABEL[kind] }} · {{ mezzo.modello }}</h2>

  <p v-if="kind === 'assic'">
    Rata del <b>{{ fmtDate(scadAssicurazione(mezzo)) }}</b>.
    La prossima scadenza diventa <b>{{ fmtDate(scadAssicurazione({ ...mezzo, ultimoPagamento: nextValue })) }}</b>.
  </p>
  <p v-else-if="kind === 'bollo'">Il prossimo bollo scade a <b>{{ fmtMonth(parse(nextValue)) }}</b>.</p>
  <div v-else class="field">
    <label for="revDate">Data della revisione</label>
    <input id="revDate" v-model="dataRev" type="date">
    <span class="hint">La prossima va fatta entro la fine dello stesso mese, tra 2 anni: <b>{{ fmtDate(parse(nextValue)) }}</b>.</span>
  </div>

  <div class="sheet-actions">
    <button class="btn" @click="closeSheet">Annulla</button>
    <button class="btn primary" @click="confirm">Conferma</button>
  </div>
</template>
