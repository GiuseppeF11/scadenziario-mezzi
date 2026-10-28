// Stato dell'app e unico punto di accesso ai dati.
// Il backend (Firebase o locale) viene scelto all'avvio; le viste usano solo queste funzioni.
import { reactive, computed } from 'vue'
import { firebaseEnabled } from '../firebase-config.js'
import { newId, clean, registraPagamento, migraV1, disdici, riattiva } from './scadenze.js'
import { COLORI_ETICHETTA } from './tipi.js'
import { toast } from './ui.js'

const DEFAULT_IMPOSTAZIONI = () => ({ etichette: [], ultimoBackup: null })

export const state = reactive({
  mode: firebaseEnabled ? 'cloud' : 'local',
  user: null,
  authReady: false,
  dataReady: false,
  voci: [],
  pagamenti: [],
  impostazioni: DEFAULT_IMPOSTAZIONI(),
  pending: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine
})

addEventListener('online', () => { state.online = true })
addEventListener('offline', () => { state.online = false })
navigator.storage?.persist?.().catch(() => {})

let api = null
let unsubscribe = null
const ready = { voci: false, pagamenti: false, impostazioni: false }
const pend = { voci: false, pagamenti: false, impostazioni: false }

export const vociById = computed(() => new Map(state.voci.map(v => [v.id, v])))
export const etichetteById = computed(() => new Map(state.impostazioni.etichette.map(e => [e.id, e])))

function onData(part, meta) {
  for (const [k, val] of Object.entries(part)) {
    if (k === 'impostazioni') state.impostazioni = { ...DEFAULT_IMPOSTAZIONI(), ...(val || {}) }
    else state[k] = val
    ready[k] = true
    pend[k] = !!meta?.pending
  }
  state.pending = Object.values(pend).some(Boolean)
  state.dataReady = Object.values(ready).every(Boolean)
}

function onError(e) {
  console.error(e)
  toast('Errore di sincronizzazione: ' + (api?.erroreLeggibile?.(e) || e.message))
}

/** Avvia auth e ascolto dei dati. */
export async function init() {
  api = firebaseEnabled ? await import('./backend-firebase.js') : await import('./backend-local.js')
  api.authApi.onUser(user => {
    unsubscribe?.()
    unsubscribe = null
    Object.keys(ready).forEach(k => { ready[k] = false })
    state.user = user
    state.voci = []; state.pagamenti = []; state.impostazioni = DEFAULT_IMPOSTAZIONI()
    state.dataReady = false
    if (user) unsubscribe = api.connect(user.uid, onData, onError)
    state.authReady = true
  })
}

export const auth = {
  register: (...a) => api.authApi.register(...a),
  login: (...a) => api.authApi.login(...a),
  google: () => api.authApi.google(),
  reset: email => api.authApi.reset(email),
  logout: () => api.authApi.logout()
}

// Le scritture non vengono attese dalla UI: lo stato si aggiorna subito dalla cache.
function write(ops) {
  return api.write(ops.map(o => (o.data ? { ...o, data: clean(o.data) } : o))).catch(onError)
}
const stamp = o => ({ ...o, aggiornato: new Date().toISOString(), creato: o.creato || new Date().toISOString() })

/* ---------- voci ---------- */
export function saveVoce(v) {
  write([{ type: 'set', col: 'voci', id: v.id, data: stamp(v) }])
}

export function deleteVoce(id, conPagamenti = false) {
  const ops = [{ type: 'delete', col: 'voci', id }]
  if (conPagamenti) for (const p of state.pagamenti.filter(p => p.voceId === id)) ops.push({ type: 'delete', col: 'pagamenti', id: p.id })
  write(ops)
}

/** Segna pagata una scadenza: crea il movimento e sposta la data in un'unica scrittura. Ritorna la funzione di annullamento. */
export function paga(v, scId, payload) {
  const { pagamento, voce, next } = registraPagamento(v, scId, payload)
  write([
    { type: 'set', col: 'pagamenti', id: pagamento.id, data: stamp(pagamento) },
    { type: 'set', col: 'voci', id: voce.id, data: stamp(voce) }
  ])
  const undo = () => {
    const cur = vociById.value.get(v.id) || voce
    const restored = { ...cur, scadenze: cur.scadenze.map(s => (s.id === scId ? { ...s, data: pagamento.prima } : s)) }
    write([
      { type: 'delete', col: 'pagamenti', id: pagamento.id },
      { type: 'set', col: 'voci', id: v.id, data: stamp(restored) }
    ])
  }
  return { next, undo }
}

/** Disdice (o riattiva) una scadenza ricorrente. Ritorna la funzione di annullamento. */
export function setDisdetta(v, scId, on) {
  const prima = clean(v)
  const voce = { ...prima, scadenze: prima.scadenze.map(s => (s.id === scId ? (on ? disdici(s) : riattiva(s)) : s)) }
  write([{ type: 'set', col: 'voci', id: v.id, data: stamp(voce) }])
  return () => write([{ type: 'set', col: 'voci', id: v.id, data: stamp(prima) }])
}

/* ---------- pagamenti / spese ---------- */
export function savePagamento(p) {
  const data = stamp({ ...p, id: p.id || newId(), importo: Number(p.importo) || 0 })
  write([{ type: 'set', col: 'pagamenti', id: data.id, data }])
}
export function deletePagamento(id) {
  const old = state.pagamenti.find(p => p.id === id)
  write([{ type: 'delete', col: 'pagamenti', id }])
  return () => old && write([{ type: 'set', col: 'pagamenti', id, data: old }])
}

/* ---------- impostazioni ed etichette ---------- */
export function saveImpostazioni(patch) {
  state.impostazioni = { ...state.impostazioni, ...patch }
  write([{ type: 'merge', col: 'meta', id: 'impostazioni', data: patch }])
}

export function addEtichetta(nome) {
  nome = String(nome || '').trim()
  if (!nome) return null
  const esiste = state.impostazioni.etichette.find(e => e.nome.toLowerCase() === nome.toLowerCase())
  if (esiste) return esiste.id
  const used = state.impostazioni.etichette.length
  const e = { id: newId(), nome, colore: COLORI_ETICHETTA[used % COLORI_ETICHETTA.length] }
  saveImpostazioni({ etichette: [...state.impostazioni.etichette, e] })
  return e.id
}

export function updateEtichetta(id, patch) {
  saveImpostazioni({ etichette: state.impostazioni.etichette.map(e => (e.id === id ? { ...e, ...patch } : e)) })
}

export function deleteEtichetta(id) {
  saveImpostazioni({ etichette: state.impostazioni.etichette.filter(e => e.id !== id) })
  const ops = state.voci.filter(v => v.etichette?.includes(id))
    .map(v => ({ type: 'set', col: 'voci', id: v.id, data: { ...v, etichette: v.etichette.filter(x => x !== id) } }))
  if (ops.length) write(ops)
}

/* ---------- backup ---------- */
export function exportJson() {
  const esportato = new Date().toISOString()
  saveImpostazioni({ ultimoBackup: esportato })
  return JSON.stringify({ app: 'scadenziario', versione: 2, esportato, voci: state.voci, pagamenti: state.pagamenti, impostazioni: { etichette: state.impostazioni.etichette } }, null, 2)
}

/**
 * Importa un backup (anche quello della prima versione con i soli mezzi).
 * sostituisci=true cancella prima i dati esistenti. Ritorna un riepilogo.
 */
export function importJson(text, sostituisci = false) {
  let data
  try { data = JSON.parse(text) } catch { throw new Error('Il file non è un JSON valido.') }
  let voci, pagamenti = [], etichette = []
  if (Array.isArray(data?.voci)) {
    voci = data.voci; pagamenti = data.pagamenti || []; etichette = data.impostazioni?.etichette || []
  } else {
    voci = migraV1(data)
    if (!voci) throw new Error('Non riconosco il formato di questo file.')
  }
  const ops = []
  if (sostituisci) {
    for (const v of state.voci) ops.push({ type: 'delete', col: 'voci', id: v.id })
    for (const p of state.pagamenti) ops.push({ type: 'delete', col: 'pagamenti', id: p.id })
  }
  for (const v of voci) ops.push({ type: 'set', col: 'voci', id: v.id || (v.id = newId()), data: v })
  for (const p of pagamenti) ops.push({ type: 'set', col: 'pagamenti', id: p.id || (p.id = newId()), data: p })
  const merged = sostituisci ? etichette : [...state.impostazioni.etichette, ...etichette.filter(e => !state.impostazioni.etichette.some(x => x.id === e.id))]
  saveImpostazioni({ etichette: merged })
  write(ops)
  return { voci: voci.length, pagamenti: pagamenti.length }
}
