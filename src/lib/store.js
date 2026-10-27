// Stato dell'app, salvato nel localStorage del telefono.
// Tutta la persistenza passa da qui: per passare a Supabase in futuro
// basta riscrivere load()/save() mantenendo la stessa API.
import { reactive, watch } from 'vue'

const KEY = 'scadenziario-mezzi.v1'
const DEFAULT = () => ({ mezzi: [], cfg: { costoRevisione: 79.02 }, ultimoBackup: null })

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT()
    const data = JSON.parse(raw)
    return { ...DEFAULT(), ...data, cfg: { ...DEFAULT().cfg, ...(data.cfg || {}) } }
  } catch {
    return DEFAULT()
  }
}

export const state = reactive(load())
export const storageOk = (() => { try { localStorage.setItem(KEY + '.t', '1'); localStorage.removeItem(KEY + '.t'); return true } catch { return false } })()

watch(state, () => {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* spazio pieno o storage bloccato */ }
}, { deep: true })

// Chiede al browser di non cancellare i dati se manca spazio (ignorato se non supportato)
navigator.storage?.persist?.().catch(() => {})

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2))

export function saveMezzo(data, id) {
  if (id) {
    const i = state.mezzi.findIndex(m => m.id === id)
    if (i >= 0) state.mezzi[i] = { ...data, id }
  } else {
    state.mezzi.push({ ...data, id: newId() })
  }
}

export function deleteMezzo(id) {
  state.mezzi = state.mezzi.filter(m => m.id !== id)
}

export function setField(id, field, value) {
  const m = state.mezzi.find(x => x.id === id)
  if (m) m[field] = value
}

/* ---------- backup ---------- */
export function exportJson() {
  state.ultimoBackup = new Date().toISOString()
  return JSON.stringify({ app: 'scadenziario-mezzi', versione: 1, esportato: state.ultimoBackup, mezzi: state.mezzi, cfg: state.cfg }, null, 2)
}

/** Sostituisce i dati con quelli del file. Lancia un errore leggibile se il file non è valido. */
export function importJson(text) {
  let data
  try { data = JSON.parse(text) } catch { throw new Error('Il file non è un JSON valido.') }
  const mezzi = Array.isArray(data) ? data : data.mezzi
  if (!Array.isArray(mezzi)) throw new Error('Nel file non trovo l\'elenco dei mezzi.')
  state.mezzi = mezzi.map(m => ({ ...m, id: m.id || newId() }))
  if (data.cfg) state.cfg = { ...state.cfg, ...data.cfg }
  return state.mezzi.length
}
