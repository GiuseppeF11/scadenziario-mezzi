<script setup>
import { computed, ref } from 'vue'
import { state, etichetteById, setDisdetta } from '../lib/store.js'
import { occorrenze, pillText, donePerTitolo } from '../lib/scadenze.js'
import { tipoOf, TIPI } from '../lib/tipi.js'
import { fmtDate, fmtMonth, fmtMonthShort, eur, eur0, parse } from '../lib/dates.js'
import { googleCalendarUrl } from '../lib/ics.js'
import { ui, openSheet, passaFiltro, toast } from '../lib/ui.js'
import PlateTag from '../components/PlateTag.vue'
import TagList from '../components/TagList.vue'
import FiltriBar from '../components/FiltriBar.vue'

const open = ref(null)
const f = ui.filtri

const tutte = computed(() => occorrenze(state.voci, state.pagamenti))
const filtrate = computed(() => tutte.value.filter(i => passaFiltro(i.v.tipo, i.v.etichette)))
const attive = computed(() => filtrate.value.filter(i => i.kind !== 'fine'))
const first = computed(() => attive.value.find(i => i.days >= 0) || attive.value[0])
const nRed = computed(() => filtrate.value.filter(i => i.status === 'red').length)
const nAmber = computed(() => filtrate.value.filter(i => i.status === 'amber').length)
const tot30 = computed(() => filtrate.value.filter(i => i.days <= 30).reduce((s, i) => s + i.amount, 0))

const groups = computed(() => {
  const list = f.soloUrgenti ? filtrate.value.filter(i => i.status === 'red' || i.status === 'amber') : filtrate.value
  const map = new Map()
  const add = (k, label, extra, it) => {
    if (!map.has(k)) map.set(k, { k, label, ...extra, items: [], tot: 0 })
    const g = map.get(k); g.items.push(it); g.tot += it.amount
  }
  for (const it of list) {
    if (f.raggruppa === 'tipo') add(it.v.tipo, tipoOf(it.v.tipo).plurale, { tipo: it.v.tipo, order: TIPI.findIndex(t => t.id === it.v.tipo) }, it)
    else if (f.raggruppa === 'etichetta') {
      const ids = it.v.etichette?.filter(id => etichetteById.value.has(id)) || []
      if (!ids.length) add('_', 'Senza etichetta', { order: 999 }, it)
      for (const id of ids) { const e = etichetteById.value.get(id); add(id, e.nome, { colore: e.colore, order: 0 }, it) }
    } else {
      const k = it.days < 0 ? 'scadute' : it.date.getFullYear() * 12 + it.date.getMonth()
      add(k, it.days < 0 ? 'Scadute' : fmtMonth(it.date), { order: it.days < 0 ? -1 : k }, it)
    }
  }
  const out = [...map.values()]
  return f.raggruppa === 'etichetta' ? out.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)) : out.sort((a, b) => a.order - b.order)
})

const titolo = it => (it.kind === 'disdire' ? 'Ultimo giorno per disdire' : it.kind === 'fine' ? `${it.sc.titolo} · non si rinnova` : it.sc.titolo)
function disdetta(it, on) {
  open.value = null
  const undo = setDisdetta(it.v, it.sc.id, on)
  toast(on ? `${it.v.nome}: disdetto, non si rinnova dal ${fmtDate(it.kind === 'disdire' ? it.rinnovo : it.date)}` : `${it.v.nome}: riattivato`, undo)
}
const toggle = key => { open.value = open.value === key ? null : key }
</script>

<template>
  <div v-if="!state.voci.length" class="notice">
    <b>Inizia aggiungendo una voce</b>
    <span>Bollette, internet, abbonamenti, mezzi, tasse della casa: ogni voce ha le sue scadenze, che compariranno qui in ordine di urgenza.</span>
    <button class="btn primary" @click="openSheet('voce')">Aggiungi la prima voce</button>
  </div>

  <template v-else>
    <section v-if="first" class="hero" :class="`s-${first.status}`" aria-label="Prossima scadenza">
      <div class="big">
        <template v-if="first.days < 0">{{ -first.days }}<small>gg fa</small></template>
        <template v-else>{{ first.days }}<small>{{ first.days === 0 ? 'oggi' : first.days === 1 ? 'giorno' : 'giorni' }}</small></template>
      </div>
      <div><span class="label">Prossima scadenza</span><div class="what">{{ titolo(first) }} · {{ first.v.nome }}</div></div>
      <div class="sub"><PlateTag v-if="first.v.campi?.targa" :targa="first.v.campi.targa" /><span>{{ fmtDate(first.date) }}<template v-if="first.amount"> · {{ eur(first.amount) }}</template></span></div>
    </section>

    <section class="stats">
      <div class="stat red"><b>{{ nRed }}</b><span>Scadute</span></div>
      <div class="stat amber"><b>{{ nAmber }}</b><span>In arrivo</span></div>
      <div class="stat"><b>{{ eur0(tot30) }}</b><span>Entro 30 giorni</span></div>
    </section>

    <FiltriBar :raggruppa="['mese', 'tipo', 'etichetta']" :urgenti="nRed + nAmber" />

    <div v-if="!groups.length" class="notice">
      <b>{{ f.soloUrgenti ? 'Niente da gestire a breve' : 'Nessuna scadenza con questi filtri' }}</b>
      <span>{{ f.soloUrgenti ? 'Tutte le scadenze sono più avanti del loro preavviso.' : 'Prova a togliere qualche filtro, o aggiungi una data alle tue voci.' }}</span>
    </div>

    <section v-for="g in groups" :key="g.k" class="month">
      <div class="group-h">
        <h3><i v-if="g.colore" class="dot" :style="{ background: g.colore }"></i><i v-else-if="g.tipo" class="dot ti" :class="`ti-${g.tipo}`"></i>{{ g.label }}</h3>
        <span v-if="g.tot" class="sum">{{ eur(g.tot) }}</span>
      </div>
      <div v-for="it in g.items" :key="it.key" class="item" :class="`s-${it.status}`">
        <button class="row" :aria-expanded="open === g.k + it.key" @click="toggle(g.k + it.key)">
          <div class="date"><b>{{ it.date.getDate() }}</b><span>{{ fmtMonthShort(it.date) }}</span></div>
          <div class="mid">
            <span class="kind"><i class="dot ti" :class="`ti-${it.v.tipo}`"></i>{{ titolo(it) }}</span>
            <span class="sub"><PlateTag v-if="it.v.campi?.targa" :targa="it.v.campi.targa" /><span>{{ it.v.nome }}<template v-if="it.kind === 'disdire'"> · rinnovo {{ fmtDate(it.rinnovo) }}</template><template v-if="it.kind === 'fine'"> · disdetto il {{ fmtDate(parse(it.sc.disdetta.il)) }}</template></span><TagList :ids="it.v.etichette" /></span>
          </div>
          <div class="end">
            <span v-if="it.kind === 'rata'" class="amt">{{ it.amount ? eur(it.amount) : '–' }}</span>
            <s v-else-if="it.kind === 'fine'" class="amt muted">{{ eur(it.rif) }}</s>
            <span v-else class="stima">rinnovo {{ eur(it.rif) }}</span>
            <span v-if="it.kind === 'rata' && it.stimato && it.amount" class="stima">stima</span>
            <span v-if="it.kind === 'fine'" class="pill off">Disdetto</span>
            <span v-else class="pill" :class="it.status">{{ pillText(it.days) }}</span>
          </div>
        </button>
        <div v-if="open === g.k + it.key" class="actions">
          <template v-if="it.kind === 'rata'">
            <button class="btn primary" @click="openSheet('paga', { voce: it.v, scId: it.sc.id })">{{ donePerTitolo(it.sc.titolo) }}</button>
            <a class="btn" :href="googleCalendarUrl(it)" target="_blank" rel="noopener">Google Calendar</a>
            <button class="btn" @click="openSheet('voce', { voce: it.v })">Apri voce</button>
            <button v-if="it.sc.ricorrenza" class="btn danger" @click="disdetta(it, true)">Disdici</button>
          </template>
          <template v-else-if="it.kind === 'disdire'">
            <button class="btn danger" @click="disdetta(it, true)">Ho disdetto</button>
            <a class="btn" :href="googleCalendarUrl(it)" target="_blank" rel="noopener">Google Calendar</a>
            <button class="btn" @click="openSheet('voce', { voce: it.v })">Apri voce</button>
          </template>
          <template v-else>
            <p class="muted" style="font-size:13px;width:100%">Dal {{ fmtDate(it.date) }} non è più attivo e non lo conto nelle spese.</p>
            <button class="btn" @click="disdetta(it, false)">Riattiva</button>
            <button class="btn" @click="openSheet('voce', { voce: it.v })">Apri voce</button>
          </template>
        </div>
      </div>
    </section>
  </template>
</template>
