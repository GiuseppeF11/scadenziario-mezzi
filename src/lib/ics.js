// Export calendario (.ics) con promemoria e link "aggiungi a Google Calendar".
// Funziona con Google Calendar, Calendario di iPhone, Samsung e Outlook.
import { eur, fmtDate } from './dates.js'
import { tipoOf } from './tipi.js'
import { formatTarga } from './scadenze.js'

const ymd = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
const escTxt = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

// Le righe .ics non devono superare 75 byte
function fold(line) {
  const out = []
  let cur = ''
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 73) { out.push(cur); cur = ' ' + ch } else cur += ch
  }
  out.push(cur)
  return out.join('\r\n')
}

export function titoloEvento(it) {
  const targa = it.v.campi?.targa ? ` (${formatTarga(it.v.campi.targa)})` : ''
  if (it.kind === 'disdire') return `Ultimo giorno per disdire · ${it.v.nome}`
  if (it.kind === 'fine') return `Fine ${it.v.nome} (disdetto)`
  return `${it.sc.titolo} · ${it.v.nome}${targa}`
}

function descrizione(it) {
  const c = it.v.campi || {}
  return [
    it.kind === 'disdire' ? `Rinnovo il ${fmtDate(it.rinnovo)}: disdici entro oggi per non pagare ${eur(it.rif)}` : `${tipoOf(it.v.tipo).nome} · scadenza ${fmtDate(it.date)}`,
    it.amount ? `Importo${it.stimato ? ' stimato' : ''}: ${eur(it.amount)}` : '',
    c.fornitore || c.operatore || c.compagnia ? `Fornitore: ${c.fornitore || c.operatore || c.compagnia}` : '',
    c.codiceCliente ? `Codice cliente: ${c.codiceCliente}` : '',
    c.polizza ? `Polizza: ${c.polizza}` : ''
  ].filter(Boolean).join('\n')
}

/** Giorni di preavviso: quello della scadenza e, se lungo, anche uno a una settimana. */
export function avvisi(sc, kind) {
  if (kind === 'disdire') return [3, 0]
  const a = Number(sc.avviso)
  const first = a >= 0 ? a : 30
  return [...new Set([first, first > 7 ? 7 : null, 0].filter(x => x !== null))]
}

function event(it, stamp) {
  const next = new Date(it.date.getFullYear(), it.date.getMonth(), it.date.getDate() + 1)
  const title = titoloEvento(it)
  // UID stabile: reimportando, il calendario aggiorna l'evento invece di duplicarlo
  const uid = `${it.v.id}-${it.sc.id}-${it.kind === 'disdire' ? 'disdire-' : ''}${ymd(it.date)}@scadenziario`
  const alarm = days => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escTxt(title)}`, days ? `TRIGGER:-P${days}D` : 'TRIGGER:PT9H', 'END:VALARM']
  return [
    'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(it.date)}`, `DTEND;VALUE=DATE:${ymd(next)}`,
    `SUMMARY:${escTxt(title)}`, `DESCRIPTION:${escTxt(descrizione(it))}`, 'TRANSP:TRANSPARENT',
    ...avvisi(it.sc, it.kind).flatMap(alarm), 'END:VEVENT'
  ]
}

export function buildIcs(items, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Scadenziario//IT', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Scadenziario']
  for (const it of items) lines.push(...event(it, stamp))
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function googleCalendarUrl(it) {
  const next = new Date(it.date.getFullYear(), it.date.getMonth(), it.date.getDate() + 1)
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(titoloEvento(it)) +
    `&dates=${ymd(it.date)}/${ymd(next)}&details=` + encodeURIComponent(descrizione(it))
}
