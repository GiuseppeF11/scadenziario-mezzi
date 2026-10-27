// Regole di dominio: niente Vue né Firebase qui, così si testa con `node --test`.
import { parse, iso, addPeriod, addMonths, endOfMonth, startOfMonth, today, daysBetween, monthIndex } from './dates.js'
import { TIPI, tipoOf, voltePerAnno } from './tipi.js'

export const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2))

export function status(days, avviso = 30) {
  if (days < 0) return 'red'
  if (days <= (Number(avviso) >= 0 ? Number(avviso) : 30)) return 'amber'
  return 'green'
}

export function pillText(days) {
  if (days === 0) return 'Oggi'
  if (days === 1) return 'Domani'
  if (days < 0) return `Scaduta da ${-days} gg`
  return `Tra ${days} gg`
}

export const donePerTitolo = t => /revision|tagliand|manutenz/i.test(t || '') ? 'Segna fatta' : 'Segna pagata'

/** Media degli ultimi 3 pagamenti di una scadenza a importo variabile, altrimenti l'importo impostato. */
export function stimaImporto(sc, pagamenti = []) {
  const base = Number(sc.importo) || 0
  if (!sc.variabile) return base
  const ult = pagamenti.filter(p => p.scadenzaId === sc.id && Number(p.importo) > 0)
    .sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 3)
  if (!ult.length) return base
  return Math.round(ult.reduce((s, p) => s + Number(p.importo), 0) / ult.length * 100) / 100
}

/** Prossima data dopo un pagamento. null = una tantum (scadenza completata). */
export function prossimaData(sc, dataPagamento) {
  const r = sc.ricorrenza
  if (!r || !Number(r.n)) return null
  const from = sc.base === 'pagamento' ? (parse(dataPagamento) || today()) : parse(sc.data)
  if (!from) return null
  let d = addPeriod(from, r.n, r.unita)
  if (sc.fineMese) d = endOfMonth(d)
  return iso(d)
}

/** Tutte le scadenze aperte, ordinate per data. */
export function occorrenze(voci, pagamenti = [], now = new Date()) {
  const t = today(now)
  const out = []
  for (const v of voci) {
    if (v.archiviata) continue
    for (const sc of v.scadenze || []) {
      const date = parse(sc.data)
      if (!date) continue
      const days = daysBetween(t, date)
      out.push({
        key: `${v.id}:${sc.id}`, v, sc, date, days,
        status: status(days, sc.avviso), amount: stimaImporto(sc, pagamenti), stimato: !!sc.variabile
      })
    }
  }
  return out.sort((a, b) => a.date - b.date || a.v.nome.localeCompare(b.v.nome))
}

const emptyMonth = date => ({ date, per: Object.fromEntries(TIPI.map(t => [t.id, 0])), tot: 0, items: [] })

/** Uscite previste nei prossimi `mesi` mesi (comprese le ricorrenze successive). Le scadute finiscono nel mese corrente. */
export function proiezione(voci, pagamenti = [], now = new Date(), mesi = 12) {
  const start = startOfMonth(today(now))
  const end = addMonths(start, mesi)
  const months = Array.from({ length: mesi }, (_, i) => emptyMonth(addMonths(start, i)))
  for (const v of voci) {
    if (v.archiviata) continue
    for (const sc of v.scadenze || []) {
      const amt = stimaImporto(sc, pagamenti)
      let d = parse(sc.data)
      let guard = 0
      while (d && d < end && guard++ < 400) {
        const i = Math.max(0, monthIndex(d) - monthIndex(start))
        const m = months[i]
        m.per[v.tipo in m.per ? v.tipo : 'altro'] += amt
        m.tot += amt
        m.items.push({ v, sc, date: d, amount: amt })
        const r = sc.ricorrenza
        if (!r || !Number(r.n)) break
        d = addPeriod(d, r.n, r.unita)
        if (sc.fineMese) d = endOfMonth(d)
      }
    }
  }
  return months
}

/** Pagamenti registrati raggruppati per mese, dagli ultimi `mesi` mesi fino al corrente incluso. */
export function storico(pagamenti, now = new Date(), mesi = 12) {
  const cur = startOfMonth(today(now))
  const start = addMonths(cur, -(mesi - 1))
  const months = Array.from({ length: mesi }, (_, i) => emptyMonth(addMonths(start, i)))
  for (const p of pagamenti) {
    const d = parse(p.data)
    if (!d) continue
    const i = monthIndex(d) - monthIndex(start)
    if (i < 0 || i >= mesi) continue
    const amt = Number(p.importo) || 0
    months[i].per[p.tipo in months[i].per ? p.tipo : 'altro'] += amt
    months[i].tot += amt
    months[i].items.push(p)
  }
  return months
}

/** Somma per chiave (tipo, etichetta, voce...). keyFn può restituire un array (es. più etichette). */
export function totaliPer(pagamenti, keyFn) {
  const out = new Map()
  for (const p of pagamenti) {
    let keys = keyFn(p)
    if (!Array.isArray(keys)) keys = [keys]
    if (!keys.length) keys = [null]
    for (const k of keys) out.set(k, (out.get(k) || 0) + (Number(p.importo) || 0))
  }
  return [...out.entries()].map(([k, tot]) => ({ k, tot })).sort((a, b) => b.tot - a.tot)
}

/** Costo medio mensile di una voce, dalle sue ricorrenze. */
export function costoMensile(v, pagamenti = []) {
  return (v.scadenze || []).reduce((s, sc) => s + stimaImporto(sc, pagamenti) * voltePerAnno(sc.ricorrenza) / 12, 0)
}

/**
 * Registra un pagamento: ritorna il documento pagamento e la voce con la data avanzata.
 * Funzione pura, la scrittura la fa lo store (in un'unica transazione).
 */
export function registraPagamento(v, scId, { data, importo, nota = '' }) {
  const sc = v.scadenze.find(s => s.id === scId)
  if (!sc) throw new Error('Scadenza non trovata')
  const next = prossimaData(sc, data)
  const pagamento = {
    id: newId(), voceId: v.id, scadenzaId: sc.id, tipo: v.tipo,
    titolo: `${sc.titolo} · ${v.nome}`, data, competenza: sc.data || null,
    importo: Number(importo) || 0, etichette: [...(v.etichette || [])], nota, prima: sc.data || null
  }
  const voce = { ...v, scadenze: v.scadenze.map(s => (s.id === sc.id ? { ...s, data: next } : s)) }
  return { pagamento, voce, next }
}

/** Etichette di un pagamento: quelle attuali della voce se esiste ancora, altrimenti quelle salvate. */
export const etichettePagamento = (p, vociById) => vociById.get(p.voceId)?.etichette || p.etichette || []

export function nuovaVoce(tipo) {
  return {
    id: newId(), tipo, nome: '', campi: {}, extra: [], etichette: [], note: '', archiviata: false,
    scadenze: tipoOf(tipo).template().map(s => ({ id: newId(), data: null, importo: null, ...s }))
  }
}

export function nuovaScadenza(titolo = 'Scadenza') {
  return { id: newId(), titolo, data: null, importo: null, variabile: false, ricorrenza: { n: 1, unita: 'mesi' }, fineMese: false, base: 'scadenza', avviso: 30 }
}

/** Converte il backup della prima versione (solo mezzi) nel nuovo formato. */
export function migraV1(data) {
  const mezzi = Array.isArray(data) ? data : data?.mezzi
  if (!Array.isArray(mezzi)) return null
  const costoRev = Number(data?.cfg?.costoRevisione) || 0
  const cap = s => String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  return mezzi.map(m => {
    const sem = String(m.frazionamento || '').toUpperCase() === 'SEMESTRALE'
    const ult = parse(m.ultimoPagamento)
    return {
      id: newId(), tipo: 'mezzo', nome: m.modello || m.targa || 'Mezzo',
      campi: { targa: String(m.targa || '').toUpperCase(), tipoMezzo: m.tipo ? cap(m.tipo) : '', proprietario: cap(m.proprietario), compagnia: m.compagnia || '', polizza: m.polizza || '' },
      extra: [], etichette: [], note: m.note || '', archiviata: false,
      scadenze: [
        { id: newId(), titolo: 'Assicurazione', data: ult ? iso(addMonths(ult, sem ? 6 : 12)) : null, importo: (Number(m.premioAnnuo) || 0) / (sem ? 2 : 1), variabile: false, ricorrenza: sem ? { n: 6, unita: 'mesi' } : { n: 1, unita: 'anni' }, fineMese: false, base: 'scadenza', avviso: 30 },
        { id: newId(), titolo: 'Revisione', data: m.scadRevisione || null, importo: costoRev, variabile: false, ricorrenza: { n: 2, unita: 'anni' }, fineMese: true, base: 'pagamento', avviso: 30 },
        { id: newId(), titolo: 'Bollo', data: m.scadBollo || null, importo: Number(m.importoBollo) || 0, variabile: false, ricorrenza: { n: 1, unita: 'anni' }, fineMese: true, base: 'scadenza', avviso: 30 }
      ]
    }
  })
}

export function formatTarga(t) {
  const raw = String(t || '').toUpperCase().replace(/\s+/g, '')
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(raw) || /^[A-Z]{2}\d{5}$/.test(raw)) return raw.slice(0, 2) + ' ' + raw.slice(2)
  return raw
}

/** Toglie i campi undefined (Firestore li rifiuta) e clona. */
export const clean = o => JSON.parse(JSON.stringify(o))
