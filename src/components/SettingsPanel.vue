<script setup>
import { ref, computed } from 'vue'
import { state, exportJson, importJson } from '../lib/store.js'
import { scadenze } from '../lib/scadenze.js'
import { buildIcs } from '../lib/ics.js'
import { saveFile } from '../lib/download.js'
import { iso, today, fmtDate } from '../lib/dates.js'
import { toast, closeSheet } from '../lib/ui.js'

const fileInput = ref(null)
const importError = ref('')
const ultimoBackup = computed(() => state.ultimoBackup ? fmtDate(new Date(state.ultimoBackup)) : 'mai')

async function backup() {
  const r = await saveFile(`scadenziario-backup-${iso(today())}.json`, exportJson(), 'application/json')
  if (r !== 'cancelled') toast('Backup creato')
}

async function calendario() {
  const items = scadenze(state.mezzi, state.cfg).filter(i => i.days >= 0)
  if (!items.length) { toast('Nessuna scadenza futura da esportare'); return }
  await saveFile('scadenze-mezzi.ics', buildIcs(items), 'text/calendar')
}

async function onFile(e) {
  importError.value = ''
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const n = importJson(await file.text())
    toast(`Importati ${n} mezzi`)
    closeSheet()
  } catch (err) {
    importError.value = err.message
  } finally {
    e.target.value = ''
  }
}
</script>

<template>
  <h2>Impostazioni</h2>

  <div class="setting-group">
    <div class="field">
      <label for="costoRev">Costo revisione (€)</label>
      <input id="costoRev" v-model.number="state.cfg.costoRevisione" type="number" inputmode="decimal" step="0.01" min="0">
      <span class="hint">Tariffa indicativa: controlla quella del tuo centro. Serve solo per il calendario spese.</span>
    </div>
  </div>

  <div class="sec">Promemoria sul calendario</div>
  <div class="setting-group">
    <p>Crea un file con tutte le prossime scadenze e due avvisi ciascuna, 30 e 7 giorni prima. Aprilo con Calendario (iPhone) o importalo in Google Calendar. Rifallo quando aggiorni una scadenza: gli eventi già importati vengono aggiornati.</p>
    <button class="btn primary wide" @click="calendario">Esporta scadenze nel calendario</button>
  </div>

  <div class="sec">Backup</div>
  <div class="setting-group">
    <p>I dati sono salvati solo su questo dispositivo. Fai un backup ogni tanto e conservalo su Drive o iCloud: ti serve anche per spostare i dati su un altro telefono. Ultimo backup: <b>{{ ultimoBackup }}</b>.</p>
    <button class="btn wide" @click="backup">Salva backup</button>
    <button class="btn wide" @click="fileInput.click()">Ripristina da backup</button>
    <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="onFile">
    <p class="hint">Il ripristino sostituisce i mezzi presenti con quelli del file.</p>
    <p v-if="importError" class="err">{{ importError }}</p>
  </div>

  <button class="btn wide" @click="closeSheet">Chiudi</button>
</template>
