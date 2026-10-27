<script setup>
import { computed } from 'vue'
import { state } from '../lib/store.js'
import { proiezione } from '../lib/scadenze.js'
import { eur } from '../lib/dates.js'

const months = computed(() => proiezione(state.mezzi, state.cfg))
const max = computed(() => Math.max(...months.value.map(x => x.tot), 1))
const tot = computed(() => months.value.reduce((s, x) => s + x.tot, 0))
const w = v => `${(v / max.value * 100).toFixed(2)}%`
const label = d => `${d.toLocaleDateString('it-IT', { month: 'short' })} ${String(d.getFullYear()).slice(2)}`
</script>

<template>
  <div v-if="!state.mezzi.length" class="notice"><b>Nessuna spesa da mostrare</b><span>Aggiungi un mezzo per vedere quanto pagherai mese per mese.</span></div>
  <template v-else>
    <section class="stats two">
      <div class="stat"><b>{{ eur(tot) }}</b><span>Totale prossimi 12 mesi</span></div>
      <div class="stat"><b>{{ eur(tot / 12) }}</b><span>Da mettere da parte al mese</span></div>
    </section>
    <div class="legend">
      <span><i class="dot k-assic"></i>Assicurazioni</span>
      <span><i class="dot k-revisione"></i>Revisioni</span>
      <span><i class="dot k-bollo"></i>Bolli</span>
    </div>
    <section class="bars" aria-label="Spese per mese">
      <div v-for="x in months" :key="x.date.getTime()" class="bar" :class="{ max: x.tot === max && x.tot > 0 }"
           :title="`Assicurazioni ${eur(x.assic)} · Revisioni ${eur(x.revisione)} · Bolli ${eur(x.bollo)}`">
        <span class="m">{{ label(x.date) }}</span>
        <span class="track">
          <i v-if="x.assic" :style="{ width: w(x.assic), background: 'var(--c-assic)' }"></i>
          <i v-if="x.revisione" :style="{ width: w(x.revisione), background: 'var(--c-rev)' }"></i>
          <i v-if="x.bollo" :style="{ width: w(x.bollo), background: 'var(--c-bollo)' }"></i>
        </span>
        <span class="v">{{ x.tot ? eur(x.tot) : '–' }}</span>
      </div>
    </section>
    <p class="muted" style="font-size:13px">Le revisioni usano il costo indicato nelle impostazioni ({{ eur(state.cfg.costoRevisione) }}).</p>
  </template>
</template>
