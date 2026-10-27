<script setup>
import { computed, ref } from 'vue'
import { state } from '../lib/store.js'
import { scadenze, proiezione, KIND, DONE_LABEL, pillText } from '../lib/scadenze.js'
import { fmtDate, fmtMonth, eur } from '../lib/dates.js'
import { googleCalendarUrl } from '../lib/ics.js'
import { openSheet } from '../lib/ui.js'
import PlateTag from '../components/PlateTag.vue'

const filter = ref('tutte')
const open = ref(null)

const all = computed(() => scadenze(state.mezzi, state.cfg))
const first = computed(() => all.value.find(i => i.days >= 0) || all.value[0])
const nRed = computed(() => all.value.filter(i => i.status === 'red').length)
const nAmber = computed(() => all.value.filter(i => i.status === 'amber').length)
const tot12 = computed(() => proiezione(state.mezzi, state.cfg).reduce((s, x) => s + x.tot, 0))

const groups = computed(() => {
  const list = filter.value === 'urgenti' ? all.value.filter(i => i.days <= 30) : all.value
  const out = []
  for (const it of list) {
    const k = it.date.getFullYear() * 12 + it.date.getMonth()
    let g = out[out.length - 1]
    if (!g || g.k !== k) { g = { k, date: it.date, items: [] }; out.push(g) }
    g.items.push(it)
  }
  return out
})

const shortMonth = d => d.toLocaleDateString('it-IT', { month: 'short' })
const toggle = key => { open.value = open.value === key ? null : key }
</script>

<template>
  <div v-if="!all.length" class="notice">
    <b>Nessun mezzo ancora</b>
    <span>Aggiungi il primo mezzo con targa, assicurazione, revisione e bollo: le scadenze compariranno qui in ordine di urgenza.</span>
    <button class="btn primary" @click="openSheet('mezzo')">Aggiungi mezzo</button>
  </div>

  <template v-else>
    <section class="hero" :class="`s-${first.status}`" aria-label="Prossima scadenza">
      <div class="big">
        <template v-if="first.days < 0">{{ -first.days }}<small>gg fa</small></template>
        <template v-else>{{ first.days }}<small>{{ first.days === 0 ? 'oggi' : first.days === 1 ? 'giorno' : 'giorni' }}</small></template>
      </div>
      <div><span class="label">Prossima scadenza</span><div class="what">{{ KIND[first.kind] }} · {{ first.m.modello }}</div></div>
      <div class="veh"><PlateTag :targa="first.m.targa" /> <span>{{ fmtDate(first.date) }}<template v-if="first.amount"> · {{ eur(first.amount) }}</template></span></div>
    </section>

    <section class="stats">
      <div class="stat red"><b>{{ nRed }}</b><span>Scadute</span></div>
      <div class="stat amber"><b>{{ nAmber }}</b><span>Entro 30 giorni</span></div>
      <div class="stat"><b>{{ eur(tot12).replace(/,\d\d/, '') }}</b><span>Prossimi 12 mesi</span></div>
    </section>

    <div class="chips" role="group" aria-label="Filtro">
      <button class="chip" :aria-pressed="filter === 'tutte'" @click="filter = 'tutte'">Tutte</button>
      <button class="chip" :aria-pressed="filter === 'urgenti'" @click="filter = 'urgenti'">Da gestire ({{ nRed + nAmber }})</button>
    </div>

    <div v-if="!groups.length" class="notice">
      <b>Niente da gestire nei prossimi 30 giorni</b><span>Tutte le scadenze sono più avanti.</span>
    </div>

    <section v-for="g in groups" :key="g.k" class="month">
      <h3>{{ fmtMonth(g.date) }}</h3>
      <div v-for="it in g.items" :key="it.key" class="item" :class="`s-${it.status}`">
        <button class="row" :aria-expanded="open === it.key" @click="toggle(it.key)">
          <div class="date"><b>{{ it.date.getDate() }}</b><span>{{ shortMonth(it.date) }}</span></div>
          <div class="mid">
            <span class="kind"><i class="dot" :class="`k-${it.kind}`"></i>{{ KIND[it.kind] }}</span>
            <span class="veh"><PlateTag :targa="it.m.targa" /> {{ it.m.modello }}</span>
          </div>
          <div class="end">
            <span class="amt">{{ it.amount ? eur(it.amount) : '–' }}</span>
            <span class="pill" :class="it.status">{{ pillText(it.days) }}</span>
          </div>
        </button>
        <div v-if="open === it.key" class="actions">
          <button class="btn primary" @click="openSheet('done', { mezzo: it.m, kind: it.kind })">{{ DONE_LABEL[it.kind] }}</button>
          <a class="btn" :href="googleCalendarUrl(it)" target="_blank" rel="noopener">Google Calendar</a>
          <button class="btn" @click="openSheet('mezzo', { mezzo: it.m })">Modifica mezzo</button>
        </div>
      </div>
    </section>
  </template>
</template>
