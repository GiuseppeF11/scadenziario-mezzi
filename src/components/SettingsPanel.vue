<script setup>
import { ref, computed } from 'vue'
import { state, auth, exportJson, importJson, updateEtichetta, deleteEtichetta, addEtichetta } from '../lib/store.js'
import { occorrenze } from '../lib/scadenze.js'
import { COLORI_ETICHETTA } from '../lib/tipi.js'
import { buildIcs } from '../lib/ics.js'
import { saveFile } from '../lib/download.js'
import { iso, today, fmtDate } from '../lib/dates.js'
import { toast, closeSheet } from '../lib/ui.js'

const fileInput = ref(null)
const importError = ref('')
const sostituisci = ref(false)
const nuova = ref('')
const delId = ref(null)
const ultimoBackup = computed(() => state.impostazioni.ultimoBackup ? fmtDate(new Date(state.impostazioni.ultimoBackup)) : 'mai')
const usoEtichetta = id => state.voci.filter(v => v.etichette?.includes(id)).length

const syncText = computed(() => {
  if (state.mode === 'local') return 'Modalità locale: i dati restano su questo dispositivo.'
  if (!state.online) return 'Offline: le modifiche sono salvate qui e partiranno appena torna la connessione.'
  if (state.pending) return 'Sincronizzazione in corso…'
  return 'Sincronizzato su tutti i tuoi dispositivi.'
})

function cycleColor(e) {
  const i = COLORI_ETICHETTA.indexOf(e.colore)
  updateEtichetta(e.id, { colore: COLORI_ETICHETTA[(i + 1) % COLORI_ETICHETTA.length] })
}
function rename(e, nome) { if (nome.trim() && nome.trim() !== e.nome) updateEtichetta(e.id, { nome: nome.trim() }) }

async function backup() {
  const r = await saveFile(`scadenziario-backup-${iso(today())}.json`, exportJson(), 'application/json')
  if (r !== 'cancelled') toast('Backup creato')
}

async function calendario() {
  const items = occorrenze(state.voci, state.pagamenti).filter(i => i.days >= 0 && i.kind !== 'fine')
  if (!items.length) { toast('Nessuna scadenza futura da esportare'); return }
  await saveFile('scadenziario.ics', buildIcs(items), 'text/calendar')
}

async function onFile(e) {
  importError.value = ''
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const r = importJson(await file.text(), sostituisci.value)
    toast(`Importate ${r.voci} voci${r.pagamenti ? ` e ${r.pagamenti} pagamenti` : ''}`)
    closeSheet()
  } catch (err) {
    importError.value = err.message
  } finally {
    e.target.value = ''
  }
}

async function esci() { closeSheet(); await auth.logout() }
</script>

<template>
  <h2>Impostazioni</h2>

  <div class="setting-group">
    <div class="label">Account</div>
    <template v-if="state.mode === 'cloud'">
      <p><b>{{ state.user?.nome || state.user?.email }}</b><template v-if="state.user?.nome"><br>{{ state.user.email }}</template></p>
      <p>{{ syncText }}</p>
      <button class="btn wide" @click="esci">Esci</button>
    </template>
    <p v-else>{{ syncText }} Per registrarti e sincronizzare tra dispositivi configura Firebase (vedi README).</p>
  </div>

  <div class="sec">Etichette</div>
  <div class="setting-group">
    <p v-if="!state.impostazioni.etichette.length">Crea etichette per raggruppare le voci come preferisci: "Casa al mare", "Papà", "Lavoro"…</p>
    <div v-for="e in state.impostazioni.etichette" :key="e.id" class="extra-row" style="grid-template-columns: 32px 1fr auto">
      <button class="x-btn" :aria-label="`Cambia colore di ${e.nome}`" @click="cycleColor(e)"><i class="dot" :style="{ background: e.colore, width: '14px', height: '14px' }"></i></button>
      <input :value="e.nome" aria-label="Nome etichetta" @change="rename(e, $event.target.value)">
      <button v-if="delId !== e.id" class="link-btn danger" @click="delId = e.id">Elimina</button>
      <button v-else class="link-btn danger" @click="deleteEtichetta(e.id); delId = null">Conferma{{ usoEtichetta(e.id) ? ` (${usoEtichetta(e.id)} voci)` : '' }}</button>
    </div>
    <div class="extra-row" style="grid-template-columns: 1fr auto">
      <input v-model="nuova" placeholder="Nuova etichetta" aria-label="Nuova etichetta" @keydown.enter.prevent="addEtichetta(nuova); nuova = ''">
      <button class="btn" @click="addEtichetta(nuova); nuova = ''">Aggiungi</button>
    </div>
  </div>

  <div class="sec">Promemoria sul calendario</div>
  <div class="setting-group">
    <p>Crea un file con tutte le prossime scadenze, ognuna con i suoi avvisi. Aprilo con Calendario (iPhone/Samsung) o importalo su calendar.google.com. Reimportandolo gli eventi si aggiornano invece di duplicarsi.</p>
    <button class="btn primary wide" @click="calendario">Esporta scadenze nel calendario</button>
  </div>

  <div class="sec">Backup</div>
  <div class="setting-group">
    <p v-if="state.mode === 'cloud'">I dati sono già nel cloud. Un file di backup resta utile come copia di sicurezza. Ultimo: <b>{{ ultimoBackup }}</b>.</p>
    <p v-else>I dati sono solo su questo dispositivo: fai un backup ogni tanto. Ultimo: <b>{{ ultimoBackup }}</b>.</p>
    <button class="btn wide" @click="backup">Salva backup</button>
    <button class="btn wide" @click="fileInput.click()">Importa da file</button>
    <label class="check"><input v-model="sostituisci" type="checkbox"> Sostituisci i dati attuali (altrimenti li aggiunge)</label>
    <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="onFile">
    <p class="hint muted" style="font-size:12px">Accetta anche il backup della prima versione (solo mezzi): viene convertito automaticamente.</p>
    <p v-if="importError" class="err">{{ importError }}</p>
  </div>

  <button class="btn wide" @click="closeSheet">Chiudi</button>
</template>
