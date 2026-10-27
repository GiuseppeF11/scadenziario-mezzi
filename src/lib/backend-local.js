// Backend locale (senza account): stesso contratto di backend-firebase.js, dati nel localStorage.
// Si usa quando Firebase non è configurato, ad esempio per sviluppare o provare l'app.
const KEY = 'scadenziario.v2'
const empty = () => ({ voci: {}, pagamenti: {}, meta: {} })

function read() {
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return empty() }
}

let listener = null
const emit = data => listener?.({ voci: Object.values(data.voci), pagamenti: Object.values(data.pagamenti), impostazioni: data.meta.impostazioni || null }, { pending: false })
const onStorage = e => { if (e.key === KEY) emit(read()) }

export const erroreLeggibile = e => e?.message || 'Errore'

export const authApi = {
  onUser: cb => { cb({ uid: 'locale', email: '', nome: '', locale: true }); return () => {} },
  logout: () => {}
}

export function connect(_uid, onData) {
  listener = onData
  addEventListener('storage', onStorage)
  emit(read())
  return () => { listener = null; removeEventListener('storage', onStorage) }
}

export async function write(ops) {
  const data = read()
  for (const op of ops) {
    const bucket = data[op.col]
    if (op.type === 'delete') delete bucket[op.id]
    else if (op.type === 'merge') bucket[op.id] = { ...(bucket[op.id] || {}), ...op.data }
    else bucket[op.id] = op.data
  }
  localStorage.setItem(KEY, JSON.stringify(data))
  emit(data)
}
