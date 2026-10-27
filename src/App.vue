<script setup>
import { ref, computed, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import { state, init } from './lib/store.js'
import { occorrenze } from './lib/scadenze.js'
import { today, fmtDate } from './lib/dates.js'
import { ui, openSheet, closeSheet } from './lib/ui.js'
import ScadenzeView from './views/ScadenzeView.vue'
import VociView from './views/VociView.vue'
import AndamentoView from './views/AndamentoView.vue'
import AuthView from './views/AuthView.vue'
import BottomSheet from './components/BottomSheet.vue'
import VoceForm from './components/VoceForm.vue'
import PagaForm from './components/PagaForm.vue'
import SpesaForm from './components/SpesaForm.vue'
import SettingsPanel from './components/SettingsPanel.vue'

init()

const TABS = ['scadenze', 'voci', 'andamento']
const readHash = () => (TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'scadenze')
const tab = ref(readHash())
const onHash = () => { tab.value = readHash(); window.scrollTo(0, 0) }
onMounted(() => window.addEventListener('hashchange', onHash))
onBeforeUnmount(() => window.removeEventListener('hashchange', onHash))

const views = { scadenze: ScadenzeView, voci: VociView, andamento: AndamentoView }
const urgenti = computed(() => occorrenze(state.voci, state.pagamenti).filter(i => i.status !== 'green').length)
const oggi = fmtDate(today()).replace(/ \d{4}$/, '')
const needLogin = computed(() => state.mode === 'cloud' && state.authReady && !state.user)
const sync = computed(() => {
  if (state.mode === 'local') return { cls: 'off', text: 'Locale' }
  if (!state.online) return { cls: 'off', text: 'Offline' }
  if (state.pending) return { cls: 'pend', text: 'Sincronizzo' }
  return { cls: '', text: 'Sincronizzato' }
})

// Pallino con il numero di scadenze da gestire sull'icona dell'app (se installata)
watchEffect(() => {
  try { urgenti.value ? navigator.setAppBadge?.(urgenti.value) : navigator.clearAppBadge?.() } catch { /* non supportato */ }
})

const backupVecchio = computed(() => state.mode === 'local' && state.voci.length > 0 &&
  (!state.impostazioni.ultimoBackup || Date.now() - new Date(state.impostazioni.ultimoBackup) > 60 * 864e5))

function undo() { const u = ui.toast?.undo; ui.toast = null; u?.() }
</script>

<template>
  <div v-if="!state.authReady" class="splash">Avvio…</div>
  <AuthView v-else-if="needLogin" />
  <template v-else>
    <div class="wrap">
      <header class="top">
        <h1>Scadenziario</h1>
        <div class="right">
          <span class="sync" :class="sync.cls" :title="sync.text"><i></i><span>{{ oggi }}</span></span>
          <button class="icon-btn" aria-label="Impostazioni, etichette e backup" @click="openSheet('settings')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
          </button>
        </div>
      </header>

      <div v-if="state.mode === 'local' && !backupVecchio" class="warn"><span>Modalità locale: nessun account, i dati restano su questo dispositivo.</span></div>
      <div v-if="backupVecchio" class="warn">
        <span>Modalità locale: i dati sono solo qui. Fai un backup ogni tanto.</span>
        <button class="btn" @click="openSheet('settings')">Fai backup</button>
      </div>

      <div v-if="!state.dataReady" class="splash">Carico i tuoi dati…</div>
      <component :is="views[tab]" v-else />
    </div>

    <button v-if="state.dataReady && tab !== 'andamento' && state.voci.length" class="fab" @click="openSheet('voce')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Nuova voce
    </button>

    <div class="tabs">
      <nav>
        <a href="#scadenze" :aria-current="tab === 'scadenze' ? 'page' : 'false'">
          <span v-if="urgenti" class="badge">{{ urgenti }}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>Scadenze
        </a>
        <a href="#voci" :aria-current="tab === 'voci' ? 'page' : 'false'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>Voci
        </a>
        <a href="#andamento" :aria-current="tab === 'andamento' ? 'page' : 'false'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>Andamento
        </a>
      </nav>
    </div>

    <BottomSheet v-if="ui.sheet" :key="ui.sheet.type + (ui.sheet.props.voce?.id || '')" @close="closeSheet">
      <VoceForm v-if="ui.sheet.type === 'voce'" :voce="ui.sheet.props.voce" :tipo="ui.sheet.props.tipo" />
      <PagaForm v-else-if="ui.sheet.type === 'paga'" :voce="ui.sheet.props.voce" :sc-id="ui.sheet.props.scId" />
      <SpesaForm v-else-if="ui.sheet.type === 'spesa'" :pagamento="ui.sheet.props.pagamento" />
      <SettingsPanel v-else-if="ui.sheet.type === 'settings'" />
    </BottomSheet>
  </template>

  <div v-if="ui.toast" class="toast" role="status">
    <span>{{ ui.toast.msg }}</span>
    <button v-if="ui.toast.undo" @click="undo">{{ ui.toast.label || 'Annulla' }}</button>
  </div>
</template>
