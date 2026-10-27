// Stato dell'interfaccia condiviso tra i componenti: pannello aperto, messaggi, filtri.
import { reactive, watch } from 'vue'

const FKEY = 'scadenziario.filtri'
const loadFiltri = () => {
  try { return { tipi: [], etichetta: '', raggruppa: 'mese', raggruppaVoci: 'tipo', soloUrgenti: false, ...JSON.parse(localStorage.getItem(FKEY) || '{}') } } catch { return { tipi: [], etichetta: '', raggruppa: 'mese', raggruppaVoci: 'tipo', soloUrgenti: false } }
}

export const ui = reactive({
  sheet: null,      // { type, props }
  toast: null,      // { msg, undo?: () => void }
  filtri: loadFiltri()
})

watch(() => ui.filtri, f => { try { localStorage.setItem(FKEY, JSON.stringify(f)) } catch { /* ignorato */ } }, { deep: true })

let timer = null
export function toast(msg, undo, label = 'Annulla') {
  clearTimeout(timer)
  ui.toast = { msg, undo, label }
  timer = setTimeout(() => { ui.toast = null }, 6000)
}

// Il pannello aperto occupa una voce nella cronologia: il tasto/gesto "indietro"
// chiude il pannello invece di uscire dall'app o cambiare scheda.
export function openSheet(type, props = {}) {
  if (ui.sheet && history.state?.sheet) history.replaceState({ sheet: true }, '')
  else history.pushState({ sheet: true }, '')
  ui.sheet = { type, props }
  ui.toast = null
}
export function closeSheet() {
  if (!ui.sheet) return
  ui.sheet = null
  if (history.state?.sheet) history.back()
}
addEventListener('popstate', () => { if (ui.sheet) ui.sheet = null })

/** Filtro comune a tutte le viste: tipologie selezionate + etichetta. */
export function passaFiltro(tipo, etichette = []) {
  const f = ui.filtri
  if (f.tipi.length && !f.tipi.includes(tipo)) return false
  if (f.etichetta === '_none') return !etichette.length
  if (f.etichetta && !etichette.includes(f.etichetta)) return false
  return true
}
