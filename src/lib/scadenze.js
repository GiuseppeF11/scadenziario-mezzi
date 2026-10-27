// Regole di dominio: niente Vue qui, così si testa con `node --test`.
import { parse, iso, addMonths, endOfMonth, today, daysBetween } from './dates.js'

export const KIND = { assic: 'Assicurazione', revisione: 'Revisione', bollo: 'Bollo' }
export const DONE_LABEL = { assic: 'Segna pagata', revisione: 'Segna fatta', bollo: 'Segna pagato' }

export const isSemestrale = m => String(m.frazionamento || '').toUpperCase() === 'SEMESTRALE'
export const mesiRata = m => (isSemestrale(m) ? 6 : 12)
export const importoRata = m => (Number(m.premioAnnuo) || 0) / (isSemestrale(m) ? 2 : 1)

export function scadAssicurazione(m) {
  const d = parse(m.ultimoPagamento)
  return d ? addMonths(d, mesiRata(m)) : null
}

export function status(days) {
  if (days < 0) return 'red'
  if (days <= 30) return 'amber'
  return 'green'
}

export function pillText(days) {
  if (days === 0) return 'Oggi'
  if (days === 1) return 'Domani'
  if (days < 0) return `Scaduta da ${-days} gg`
  return `Tra ${days} gg`
}

/** Tutte le prossime scadenze, ordinate per data. */
export function scadenze(mezzi, cfg, now = new Date()) {
  const t = today(now)
  const out = []
  for (const m of mezzi) {
    const a = scadAssicurazione(m)
    if (a) out.push({ m, kind: 'assic', date: a, amount: importoRata(m) })
    const r = parse(m.scadRevisione)
    if (r) out.push({ m, kind: 'revisione', date: r, amount: Number(cfg.costoRevisione) || 0 })
    const b = parse(m.scadBollo)
    if (b) out.push({ m, kind: 'bollo', date: b, amount: Number(m.importoBollo) || 0 })
  }
  for (const it of out) {
    it.days = daysBetween(t, it.date)
    it.status = status(it.days)
    it.key = `${it.m.id}:${it.kind}`
  }
  return out.sort((x, y) => x.date - y.date)
}

/** Spese dei prossimi 12 mesi, incluse rate successive (semestrali, bolli annuali, revisioni biennali). */
export function proiezione(mezzi, cfg, now = new Date(), mesi = 12) {
  const t = today(now)
  const start = new Date(t.getFullYear(), t.getMonth(), 1)
  const end = addMonths(start, mesi)
  const months = Array.from({ length: mesi }, (_, i) => ({ date: addMonths(start, i), assic: 0, revisione: 0, bollo: 0, tot: 0 }))
  const put = (d, kind, amt) => {
    if (d < start || d >= end) return
    const i = (d.getFullYear() - start.getFullYear()) * 12 + d.getMonth() - start.getMonth()
    months[i][kind] += amt
  }
  const costoRev = Number(cfg.costoRevisione) || 0
  for (const m of mezzi) {
    for (let d = scadAssicurazione(m); d && d < end; d = addMonths(d, mesiRata(m))) put(d, 'assic', importoRata(m))
    for (let d = parse(m.scadBollo); d && d < end; d = endOfMonth(addMonths(d, 12))) put(d, 'bollo', Number(m.importoBollo) || 0)
    for (let d = parse(m.scadRevisione); d && d < end; d = endOfMonth(addMonths(d, 24))) put(d, 'revisione', costoRev)
  }
  for (const x of months) x.tot = x.assic + x.revisione + x.bollo
  return months
}

/**
 * Cosa cambia quando segni una scadenza come fatta.
 * Ritorna { field, value } da scrivere sul mezzo.
 */
export function avanza(m, kind, dataRevisione) {
  if (kind === 'assic') return { field: 'ultimoPagamento', value: iso(scadAssicurazione(m)) }
  if (kind === 'bollo') return { field: 'scadBollo', value: iso(endOfMonth(addMonths(parse(m.scadBollo), 12))) }
  if (kind === 'revisione') {
    // prossima revisione: entro fine mese, 2 anni dopo quella fatta
    const d = parse(dataRevisione) || today()
    return { field: 'scadRevisione', value: iso(endOfMonth(addMonths(d, 24))) }
  }
  throw new Error('Tipo di scadenza sconosciuto: ' + kind)
}

export function formatTarga(t) {
  const raw = String(t || '').toUpperCase().replace(/\s+/g, '')
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(raw) || /^[A-Z]{2}\d{5}$/.test(raw)) return raw.slice(0, 2) + ' ' + raw.slice(2)
  return raw
}
