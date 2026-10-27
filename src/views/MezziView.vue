<script setup>
import { computed } from 'vue'
import { state } from '../lib/store.js'
import { scadenze, pillText, isSemestrale } from '../lib/scadenze.js'
import { fmtDate, eur } from '../lib/dates.js'
import { openSheet } from '../lib/ui.js'
import PlateTag from '../components/PlateTag.vue'

const all = computed(() => scadenze(state.mezzi, state.cfg))
const sorted = computed(() => [...state.mezzi].sort((a, b) =>
  String(a.proprietario).localeCompare(String(b.proprietario)) || String(a.modello).localeCompare(String(b.modello))))
const SHORT = { assic: 'Assicuraz.', revisione: 'Revisione', bollo: 'Bollo' }
const find = (m, kind) => all.value.find(i => i.m.id === m.id && i.kind === kind)
</script>

<template>
  <div v-if="!state.mezzi.length" class="notice">
    <b>Nessun mezzo ancora</b>
    <span>Aggiungi un mezzo, oppure ripristina un backup dalle impostazioni (icona in alto a destra).</span>
  </div>

  <article v-for="m in sorted" :key="m.id" class="card">
    <div class="card-head">
      <div>
        <PlateTag :targa="m.targa" large />
        <h2>{{ m.modello }}</h2>
        <span class="meta">{{ m.proprietario }}<template v-if="m.tipo"> · {{ m.tipo === 'moto' ? 'Moto' : 'Auto' }}</template></span>
      </div>
      <button class="btn" @click="openSheet('mezzo', { mezzo: m })">Modifica</button>
    </div>
    <div class="meta">
      {{ m.compagnia || 'Compagnia non indicata' }}<template v-if="m.polizza"> · Polizza {{ m.polizza }}</template>
      · {{ isSemestrale(m) ? 'Semestrale' : 'Annuale' }} · {{ eur(m.premioAnnuo) }}/anno · Bollo {{ eur(m.importoBollo) }}
    </div>
    <div class="trio">
      <div v-for="k in ['assic', 'revisione', 'bollo']" :key="k">
        <span class="label">{{ SHORT[k] }}</span>
        <template v-if="find(m, k)">
          <b>{{ fmtDate(find(m, k).date) }}</b>
          <span class="pill" :class="find(m, k).status">{{ pillText(find(m, k).days) }}</span>
        </template>
        <b v-else>–</b>
      </div>
    </div>
    <div v-if="m.note" class="meta">{{ m.note }}</div>
  </article>

  <button class="btn primary wide" @click="openSheet('mezzo')">Aggiungi mezzo</button>
</template>
