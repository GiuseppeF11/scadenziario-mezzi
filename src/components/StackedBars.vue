<script setup>
// Colonne impilate per mese, una fascia per tipologia (ordine fisso dei colori).
// Tocca/passa sopra una colonna per il dettaglio; sotto c'è sempre la legenda.
import { computed, ref, watch } from 'vue'
import { TIPI } from '../lib/tipi.js'
import { eur, eur0, fmtMonth, fmtMonthShort } from '../lib/dates.js'

const props = defineProps({ months: Array, highlight: { type: Number, default: -1 } })
const W = 340, H = 168, L = 34, B = 20, T = 8
const plotW = W - L, plotH = H - B - T
const sel = ref(props.highlight)
watch(() => props.months, () => { sel.value = props.highlight })

function niceMax(v) {
  if (v <= 0) return 100
  const p = 10 ** Math.floor(Math.log10(v)), n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}
const max = computed(() => niceMax(Math.max(...props.months.map(m => m.tot))))
const ticks = computed(() => [0, 0.5, 1].map(f => f * max.value))
const band = computed(() => plotW / props.months.length)
const bw = computed(() => Math.min(24, band.value * 0.62))
const y = v => T + plotH - (v / max.value) * plotH
const fmtTick = v => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v)))
const usati = computed(() => TIPI.filter(t => props.months.some(m => m.per[t.id] > 0)))

// Segmenti: 2px di stacco tra le fasce, angoli arrotondati solo in cima alla colonna
const cols = computed(() => props.months.map((m, i) => {
  const x = L + i * band.value + (band.value - bw.value) / 2
  let acc = 0
  const segs = []
  const parts = TIPI.filter(t => m.per[t.id] > 0)
  parts.forEach((t, j) => {
    const y0 = y(acc), y1 = y(acc + m.per[t.id])
    acc += m.per[t.id]
    const top = j === parts.length - 1
    const h = Math.max(0, y0 - y1 - (j > 0 ? 2 : 0))
    if (h < 0.5) return
    const yb = y0 - (j > 0 ? 2 : 0), yt = yb - h, r = top ? Math.min(4, h, bw.value / 2) : 0
    const d = `M${x},${yb}V${yt + r}${r ? `Q${x},${yt} ${x + r},${yt}` : ''}H${x + bw.value - r}${r ? `Q${x + bw.value},${yt} ${x + bw.value},${yt + r}` : ''}V${yb}Z`
    segs.push({ id: t.id, d })
  })
  return { i, x, segs, m }
}))
const cur = computed(() => props.months[sel.value] || null)
</script>

<template>
  <div class="chart">
    <div class="legend" aria-hidden="true">
      <span v-for="t in usati" :key="t.id"><i class="dot ti" :class="`ti-${t.id}`"></i>{{ t.plurale }}</span>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="`Uscite mensili, massimo ${eur0(Math.max(...months.map(m => m.tot)))}`">
      <g v-for="v in ticks" :key="v">
        <line class="gl" :x1="L" :x2="W" :y1="y(v)" :y2="y(v)" />
        <text class="ax" :x="L - 6" :y="y(v) + 4" text-anchor="end">{{ fmtTick(v) }}</text>
      </g>
      <g v-for="c in cols" :key="c.i">
        <rect class="hit" :class="{ on: sel === c.i }" :x="L + c.i * band" :y="T" :width="band" :height="plotH" rx="6"
          @mouseenter="sel = c.i" @click="sel = c.i" />
        <path v-for="s in c.segs" :key="s.id" :d="s.d" class="ti" :class="`ti-${s.id}`" style="fill: var(--c); pointer-events: none" />
        <text class="ax" :x="c.x + bw / 2" :y="H - 4" text-anchor="middle" :style="sel === c.i ? 'fill: var(--ink); font-weight: 600' : ''">{{ fmtMonthShort(c.m.date).slice(0, 3) }}</text>
      </g>
    </svg>
    <div class="chart-tip" aria-live="polite">
      <template v-if="cur">
        <div class="t"><span>{{ fmtMonth(cur.date) }}</span><span class="num">{{ eur(cur.tot) }}</span></div>
        <div v-for="t in TIPI.filter(t => cur.per[t.id] > 0)" :key="t.id" class="r">
          <span><i class="dot ti" :class="`ti-${t.id}`"></i>{{ t.plurale }}</span><span class="num">{{ eur(cur.per[t.id]) }}</span>
        </div>
        <span v-if="!cur.tot" class="muted">Nessuna uscita</span>
      </template>
      <span v-else class="muted">Tocca una colonna per il dettaglio del mese.</span>
    </div>
  </div>
</template>
