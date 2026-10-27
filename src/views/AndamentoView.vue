<script setup>
import { computed, ref } from 'vue'
import { state, vociById, etichetteById } from '../lib/store.js'
import { storico, proiezione, totaliPer, etichettePagamento } from '../lib/scadenze.js'
import { tipoOf } from '../lib/tipi.js'
import { parse, today, fmtDate, eur, eur0 } from '../lib/dates.js'
import { openSheet, passaFiltro } from '../lib/ui.js'
import StackedBars from '../components/StackedBars.vue'
import TipoIcon from '../components/TipoIcon.vue'
import FiltriBar from '../components/FiltriBar.vue'

const vista = ref('storico')           // storico | previsione
const t0 = today()
const anno = t0.getFullYear()
const periodo = ref('12')              // '12' | anno corrente | anno precedente
const periodi = [{ id: '12', label: 'Ultimi 12 mesi' }, { id: String(anno), label: String(anno) }, { id: String(anno - 1), label: String(anno - 1) }]
const quanti = ref(20)

// Pagamenti filtrati per tipologia/etichetta
const pagFiltrati = computed(() => state.pagamenti.filter(p => passaFiltro(p.tipo, etichettePagamento(p, vociById.value))))
const vociFiltrate = computed(() => state.voci.filter(v => passaFiltro(v.tipo, v.etichette)))

const mesiStorico = computed(() => {
  if (periodo.value === '12') return storico(pagFiltrati.value, t0, 12)
  return storico(pagFiltrati.value, new Date(Number(periodo.value), 11, 1), 12)
})
const mesiPrev = computed(() => proiezione(vociFiltrate.value, state.pagamenti, t0, 12))
const months = computed(() => (vista.value === 'storico' ? mesiStorico.value : mesiPrev.value))

const speso = computed(() => mesiStorico.value.reduce((s, m) => s + m.tot, 0))
// Media sui mesi effettivamente coperti dallo storico (se hai iniziato da poco non divide per 12)
const mesiTrascorsi = computed(() => {
  const ms = mesiStorico.value
  const first = ms.findIndex(m => m.tot > 0)
  if (first < 0) return 1
  const fine = periodo.value === String(anno) ? t0.getMonth() + 1 : 12
  return Math.max(1, fine - first)
})
const previsto = computed(() => mesiPrev.value.reduce((s, m) => s + m.tot, 0))

// Movimenti del periodo / della previsione, in un formato comune per i riepiloghi
const righe = computed(() => vista.value === 'storico'
  ? mesiStorico.value.flatMap(m => m.items).map(p => ({ tipo: p.tipo, voceId: p.voceId, nome: vociById.value.get(p.voceId)?.nome || p.titolo, etichette: etichettePagamento(p, vociById.value), importo: p.importo }))
  : mesiPrev.value.flatMap(m => m.items).map(i => ({ tipo: i.v.tipo, voceId: i.v.id, nome: i.v.nome, etichette: i.v.etichette || [], importo: i.amount })))
const totale = computed(() => righe.value.reduce((s, r) => s + (Number(r.importo) || 0), 0))
const perTipo = computed(() => totaliPer(righe.value, r => r.tipo).map(x => ({ ...x, label: tipoOf(x.k).plurale, tipo: x.k })))
const perEtichetta = computed(() => totaliPer(righe.value, r => r.etichette.filter(id => etichetteById.value.has(id)))
  .map(x => ({ ...x, label: x.k ? etichetteById.value.get(x.k).nome : 'Senza etichetta', colore: x.k ? etichetteById.value.get(x.k).colore : 'var(--muted)' })))
const perVoce = computed(() => totaliPer(righe.value, r => r.voceId || `_${r.nome}`).slice(0, 6)
  .map(x => { const r = righe.value.find(y => (y.voceId || `_${y.nome}`) === x.k); return { ...x, label: r.nome, tipo: r.tipo } }))
const maxOf = arr => Math.max(1, ...arr.map(x => x.tot))
const pct = v => (totale.value ? Math.round(v / totale.value * 100) : 0)

const movimenti = computed(() => mesiStorico.value.flatMap(m => m.items).sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0)))
</script>

<template>
  <section class="stats two">
    <div class="stat"><b>{{ eur0(speso) }}</b><span>Speso · {{ periodi.find(p => p.id === periodo).label.toLowerCase() }}</span></div>
    <div class="stat"><b>{{ eur0(speso / mesiTrascorsi) }}</b><span>Media al mese</span></div>
    <div class="stat"><b>{{ eur0(previsto) }}</b><span>Previsto prossimi 12 mesi</span></div>
    <div class="stat"><b>{{ eur0(previsto / 12) }}</b><span>Da mettere da parte al mese</span></div>
  </section>

  <div class="filters">
    <div class="filter-row">
      <div class="seg" role="group" aria-label="Vista">
        <button :aria-pressed="vista === 'storico'" @click="vista = 'storico'">Storico</button>
        <button :aria-pressed="vista === 'previsione'" @click="vista = 'previsione'">Previsione</button>
      </div>
      <select v-if="vista === 'storico'" v-model="periodo" class="select-sm" aria-label="Periodo">
        <option v-for="p in periodi" :key="p.id" :value="p.id">{{ p.label }}</option>
      </select>
    </div>
  </div>
  <FiltriBar />

  <section class="chart-card">
    <div class="chart-head">
      <h2>{{ vista === 'storico' ? 'Pagato per mese' : 'Uscite previste per mese' }}</h2>
      <span class="amt num">{{ eur(totale) }}</span>
    </div>
    <StackedBars :months="months" :highlight="vista === 'storico' && periodo === '12' ? 11 : vista === 'previsione' ? 0 : -1" />
    <p v-if="vista === 'storico' && !state.pagamenti.length" class="muted" style="font-size:13px">Lo storico si riempie quando segni le scadenze come pagate o registri una spesa.</p>
  </section>

  <section v-if="perTipo.length" class="chart-card">
    <h2>Per tipologia</h2>
    <div class="hbar">
      <template v-for="x in perTipo" :key="x.k">
        <span class="n"><i class="dot ti" :class="`ti-${x.tipo}`"></i><span>{{ x.label }}</span></span>
        <span class="v">{{ eur(x.tot) }}<small>{{ pct(x.tot) }}%</small></span>
        <span class="tr"><i class="ti" :class="`ti-${x.tipo}`" :style="{ width: `${x.tot / maxOf(perTipo) * 100}%` }"></i></span>
      </template>
    </div>
  </section>

  <section v-if="state.impostazioni.etichette.length && perEtichetta.length" class="chart-card">
    <h2>Per etichetta</h2>
    <div class="hbar">
      <template v-for="x in perEtichetta" :key="x.k || '_'">
        <span class="n"><i class="dot" :style="{ background: x.colore }"></i><span>{{ x.label }}</span></span>
        <span class="v">{{ eur(x.tot) }}</span>
        <span class="tr"><i :style="{ width: `${x.tot / maxOf(perEtichetta) * 100}%`, '--c': x.colore }"></i></span>
      </template>
    </div>
    <p class="muted" style="font-size:12px">Una voce con più etichette conta in ognuna.</p>
  </section>

  <section v-if="perVoce.length" class="chart-card">
    <h2>Voci che pesano di più</h2>
    <div class="hbar">
      <template v-for="x in perVoce" :key="x.k">
        <span class="n"><i class="dot ti" :class="`ti-${x.tipo}`"></i><span>{{ x.label }}</span></span>
        <span class="v">{{ eur(x.tot) }}<small>{{ pct(x.tot) }}%</small></span>
        <span class="tr"><i class="ti" :class="`ti-${x.tipo}`" :style="{ width: `${x.tot / maxOf(perVoce) * 100}%` }"></i></span>
      </template>
    </div>
  </section>

  <section class="chart-card">
    <div class="chart-head">
      <h2>Movimenti</h2>
      <button class="btn" @click="openSheet('spesa')">+ Registra spesa</button>
    </div>
    <p v-if="!movimenti.length" class="muted" style="font-size:14px">Nessun movimento nel periodo.</p>
    <div>
      <button v-for="p in movimenti.slice(0, quanti)" :key="p.id" class="mov" @click="openSheet('spesa', { pagamento: p })">
        <TipoIcon :tipo="p.tipo" small />
        <span class="mid"><span style="font-weight:600">{{ p.titolo }}</span><span class="sub"><span>{{ fmtDate(parse(p.data)) }}</span><span v-if="p.nota">· {{ p.nota }}</span></span></span>
        <span class="amt">{{ eur(p.importo) }}</span>
      </button>
    </div>
    <button v-if="movimenti.length > quanti" class="link-btn" @click="quanti += 50">Mostra altri ({{ movimenti.length - quanti }})</button>
  </section>
</template>

