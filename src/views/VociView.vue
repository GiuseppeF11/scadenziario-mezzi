<script setup>
import { computed, ref } from 'vue'
import { state, etichetteById } from '../lib/store.js'
import { costoMensile, pillText, status, stimaImporto } from '../lib/scadenze.js'
import { TIPI, tipoOf, ricorrenzaLabel } from '../lib/tipi.js'
import { parse, today, daysBetween, fmtDate, eur, eur0 } from '../lib/dates.js'
import { ui, openSheet, passaFiltro } from '../lib/ui.js'
import TipoIcon from '../components/TipoIcon.vue'
import PlateTag from '../components/PlateTag.vue'
import TagList from '../components/TagList.vue'
import FiltriBar from '../components/FiltriBar.vue'

const q = ref('')
const archiviate = ref(false)
const f = ui.filtri
const t0 = today()

const testo = v => [v.nome, v.note, ...Object.values(v.campi || {}), ...(v.extra || []).map(x => `${x.k} ${x.v}`), ...(v.etichette || []).map(id => etichetteById.value.get(id)?.nome)].join(' ').toLowerCase()
const lista = computed(() => state.voci
  .filter(v => !!v.archiviata === archiviate.value)
  .filter(v => passaFiltro(v.tipo, v.etichette))
  .filter(v => !q.value || testo(v).includes(q.value.toLowerCase()))
  .sort((a, b) => a.nome.localeCompare(b.nome)))
const nArch = computed(() => state.voci.filter(v => v.archiviata).length)
const totMese = computed(() => lista.value.reduce((s, v) => s + costoMensile(v, state.pagamenti), 0))

const groups = computed(() => {
  const map = new Map()
  const add = (k, label, extra, v) => { if (!map.has(k)) map.set(k, { k, label, ...extra, items: [] }); map.get(k).items.push(v) }
  for (const v of lista.value) {
    if (f.raggruppaVoci === 'etichetta') {
      const ids = v.etichette?.filter(id => etichetteById.value.has(id)) || []
      if (!ids.length) add('_', 'Senza etichetta', { order: 999 }, v)
      for (const id of ids) { const e = etichetteById.value.get(id); add(id, e.nome, { colore: e.colore, order: 0 }, v) }
    } else add(v.tipo, tipoOf(v.tipo).plurale, { tipo: v.tipo, order: TIPI.findIndex(t => t.id === v.tipo) }, v)
  }
  return [...map.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map(g => ({ ...g, mese: g.items.reduce((s, v) => s + costoMensile(v, state.pagamenti), 0) }))
})

// A destra: quanto paghi davvero alla prossima scadenza.
// Una sola scadenza → il suo importo con la cadenza (es. 109,90 € · annuale);
// più scadenze (es. un mezzo) → la prossima in ordine di data.
function rata(v) {
  const tutte = v.scadenze || []
  if (!tutte.length) return null
  const scs = tutte.filter(x => !x.disdetta)
  if (!scs.length) return { importo: null, label: 'disdetto' }
  const sc = scs.length === 1 ? scs[0]
    : [...scs].sort((a, b) => (a.data || '9999') < (b.data || '9999') ? -1 : 1)[0]
  const label = scs.length === 1 ? ricorrenzaLabel(sc.ricorrenza).toLowerCase() : `prossima · ${sc.titolo.toLowerCase()}`
  return { importo: stimaImporto(sc, state.pagamenti), label: (sc.variabile ? 'stima · ' : '') + label }
}

const scInfo = sc => {
  const d = parse(sc.data)
  if (!d) return { text: sc.disdetta ? 'disdetto' : 'senza data', cls: sc.disdetta ? 'off' : '' }
  const days = daysBetween(t0, d)
  if (sc.disdetta) return { text: days >= 0 ? `disdetto · attivo fino al ${fmtDate(d)}` : `terminato il ${fmtDate(d)}`, cls: 'off' }
  return { text: `${fmtDate(d)} · ${pillText(days).toLowerCase()}`, cls: status(days, sc.avviso) }
}
</script>

<template>
  <div v-if="!state.voci.length" class="notice">
    <b>Nessuna voce</b>
    <span>Una voce è qualcosa che genera spese: un'auto, la bolletta della luce, la fibra, Netflix, il condominio…</span>
    <button class="btn primary" @click="openSheet('voce')">Aggiungi voce</button>
  </div>

  <template v-else>
    <section class="stats two">
      <div class="stat"><b>{{ lista.length }}</b><span>{{ archiviate ? 'Archiviate' : 'Voci attive' }}</span></div>
      <div class="stat"><b>{{ eur0(totMese) }}</b><span>Costo medio al mese</span></div>
    </section>

    <input v-model="q" class="search" type="search" placeholder="Cerca per nome, targa, fornitore, codice…" aria-label="Cerca">
    <FiltriBar :raggruppa="['tipo', 'etichetta']" gruppo-key="raggruppaVoci" />

    <div v-if="!groups.length" class="notice"><b>Nessuna voce trovata</b><span>Cambia ricerca o filtri.</span></div>

    <section v-for="g in groups" :key="g.k" class="month">
      <div class="group-h">
        <h3><i v-if="g.colore" class="dot" :style="{ background: g.colore }"></i><i v-else class="dot ti" :class="`ti-${g.tipo}`"></i>{{ g.label }}</h3>
        <span class="sum">{{ eur0(g.mese) }}/mese</span>
      </div>
      <button v-for="v in g.items" :key="v.id" class="voce" :class="{ arch: v.archiviata }" @click="openSheet('voce', { voce: v })">
        <div class="voce-h">
          <TipoIcon :tipo="v.tipo" />
          <div class="mid">
            <b>{{ v.nome }}</b>
            <span class="sub"><PlateTag v-if="v.campi?.targa" :targa="v.campi.targa" /><span v-if="tipoOf(v.tipo).sotto(v)">{{ tipoOf(v.tipo).sotto(v) }}</span><TagList :ids="v.etichette" /></span>
          </div>
          <div v-if="rata(v)" class="mese"><b>{{ rata(v).importo === null ? 'Disdetto' : eur(rata(v).importo) }}</b><span v-if="rata(v).importo !== null">{{ rata(v).label }}</span></div>
        </div>
        <div class="sc-list">
          <div v-for="sc in v.scadenze" :key="sc.id" class="sc-line">
            <span>{{ sc.titolo }} · {{ ricorrenzaLabel(sc.ricorrenza).toLowerCase() }}<template v-if="v.scadenze.length > 1 && stimaImporto(sc, state.pagamenti)"> · {{ eur(stimaImporto(sc, state.pagamenti)) }}</template></span>
            <span class="pill" :class="scInfo(sc).cls">{{ scInfo(sc).text }}</span>
          </div>
        </div>
      </button>
    </section>

    <button v-if="nArch || archiviate" class="link-btn" style="align-self:center" @click="archiviate = !archiviate">
      {{ archiviate ? '← Torna alle voci attive' : `Mostra archiviate (${nArch})` }}
    </button>
  </template>
</template>
