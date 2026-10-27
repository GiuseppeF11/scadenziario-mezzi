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
export function toast(msg, undo) {
  clearTimeout(timer)
  ui.toast = { msg, undo }
  timer = setTimeout(() => { ui.toast = null }, 6000)
}

export const openSheet = (type, props = {}) => { ui.sheet = { type, props } }
export const closeSheet = () => { ui.sheet = null }

/** Filtro comune a tutte le viste: tipologie selezionate + etichetta. */
export function passaFiltro(tipo, etichette = []) {
  const f = ui.filtri
  if (f.tipi.length && !f.tipi.includes(tipo)) return false
  if (f.etichetta === '_none') return !etichette.length
  if (f.etichetta && !etichette.includes(f.etichetta)) return false
  return true
}
