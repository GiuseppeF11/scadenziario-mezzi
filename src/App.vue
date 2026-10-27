<script setup>
import { ref, computed, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import { state, storageOk } from './lib/store.js'
import { scadenze } from './lib/scadenze.js'
import { today, fmtDate } from './lib/dates.js'
import { ui, openSheet, closeSheet } from './lib/ui.js'
import ScadenzeView from './views/ScadenzeView.vue'
import MezziView from './views/MezziView.vue'
import SpeseView from './views/SpeseView.vue'
import BottomSheet from './components/BottomSheet.vue'
import MezzoForm from './components/MezzoForm.vue'
import DoneForm from './components/DoneForm.vue'
import SettingsPanel from './components/SettingsPanel.vue'

const TABS = ['scadenze', 'mezzi', 'spese']
const readHash = () => (TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'scadenze')
const tab = ref(readHash())
const onHash = () => { tab.value = readHash(); window.scrollTo(0, 0) }
onMounted(() => window.addEventListener('hashchange', onHash))
onBeforeUnmount(() => window.removeEventListener('hashchange', onHash))

const views = { scadenze: ScadenzeView, mezzi: MezziView, spese: SpeseView }
const urgenti = computed(() => scadenze(state.mezzi, state.cfg).filter(i => i.days <= 30).length)
const oggi = fmtDate(today()).replace(/ \d{4}$/, '')

// Pallino con il numero di scadenze urgenti sull'icona dell'app (Android e iPhone, se installata)
watchEffect(() => {
  try { urgenti.value ? navigator.setAppBadge?.(urgenti.value) : navigator.clearAppBadge?.() } catch { /* non supportato */ }
})

// Promemoria di backup: se ci sono dati e l'ultimo backup ha più di 60 giorni
const backupVecchio = computed(() => state.mezzi.length > 0 &&
  (!state.ultimoBackup || Date.now() - new Date(state.ultimoBackup) > 60 * 864e5))

function undo() { const u = ui.toast?.undo; ui.toast = null; u?.() }
</script>

<template>
  <div class="wrap">
    <header class="top">
      <h1>Scadenziario Mezzi</h1>
      <div class="right">
        <span>{{ oggi }}</span>
        <button class="icon-btn" aria-label="Impostazioni e backup" @click="openSheet('settings')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
        </button>
      </div>
    </header>

    <div v-if="!storageOk" class="warn">Questo browser non permette di salvare dati (forse sei in navigazione privata): le modifiche andranno perse.</div>
    <div v-else-if="backupVecchio" class="warn">
      <span>Non fai un backup da un po'. I dati sono solo su questo telefono.</span>
      <button class="btn" @click="openSheet('settings')">Fai backup</button>
    </div>

    <component :is="views[tab]" />
  </div>

  <div class="tabs">
    <nav>
      <a href="#scadenze" :aria-current="tab === 'scadenze' ? 'page' : 'false'">
        <span v-if="urgenti" class="badge">{{ urgenti }}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>Scadenze
      </a>
      <a href="#mezzi" :aria-current="tab === 'mezzi' ? 'page' : 'false'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/></svg>Mezzi
      </a>
      <a href="#spese" :aria-current="tab === 'spese' ? 'page' : 'false'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>Spese
      </a>
    </nav>
  </div>

  <BottomSheet v-if="ui.sheet" @close="closeSheet">
    <MezzoForm v-if="ui.sheet.type === 'mezzo'" :mezzo="ui.sheet.props.mezzo" />
    <DoneForm v-else-if="ui.sheet.type === 'done'" :mezzo="ui.sheet.props.mezzo" :kind="ui.sheet.props.kind" />
    <SettingsPanel v-else-if="ui.sheet.type === 'settings'" />
  </BottomSheet>

  <div v-if="ui.toast" class="toast" role="status">
    <span>{{ ui.toast.msg }}</span>
    <button v-if="ui.toast.undo" @click="undo">Annulla</button>
  </div>
</template>
