// Export calendario (.ics) con promemoria 30 e 7 giorni prima.
// Funziona con Google Calendar, Calendario di iPhone e Outlook.
import { KIND } from './scadenze.js'
import { eur, fmtDate } from './dates.js'

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

function event(it, stamp) {
  const next = new Date(it.date.getFullYear(), it.date.getMonth(), it.date.getDate() + 1)
  const title = `${KIND[it.kind]} ${it.m.modello || ''} (${it.m.targa || ''})`
  const desc = [
    `Scadenza ${KIND[it.kind].toLowerCase()}: ${fmtDate(it.date)}`,
    it.amount ? `Importo: ${eur(it.amount)}` : '',
    it.m.compagnia ? `Compagnia: ${it.m.compagnia}` : '',
    it.m.polizza ? `Polizza: ${it.m.polizza}` : ''
  ].filter(Boolean).join('\n')
  // UID stabile: reimportando, il calendario aggiorna l'evento invece di duplicarlo
  const uid = `${it.m.id}-${it.kind}-${ymd(it.date)}@scadenziario-mezzi`
  const alarm = (days) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escTxt(title)}`, `TRIGGER:-P${days}D`, 'END:VALARM']
  return [
    'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(it.date)}`, `DTEND;VALUE=DATE:${ymd(next)}`,
    `SUMMARY:${escTxt(title)}`, `DESCRIPTION:${escTxt(desc)}`, 'TRANSP:TRANSPARENT',
    ...alarm(30), ...alarm(7), 'END:VEVENT'
  ]
}

export function buildIcs(items, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Scadenziario Mezzi//IT', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Scadenze mezzi']
  for (const it of items) lines.push(...event(it, stamp))
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function googleCalendarUrl(it) {
  const next = new Date(it.date.getFullYear(), it.date.getMonth(), it.date.getDate() + 1)
  const title = `${KIND[it.kind]} ${it.m.modello || ''} (${it.m.targa || ''})`
  const det = `Scadenza ${KIND[it.kind].toLowerCase()}: ${fmtDate(it.date)}` + (it.amount ? `\nImporto: ${eur(it.amount)}` : '')
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) +
    `&dates=${ymd(it.date)}/${ymd(next)}&details=` + encodeURIComponent(det)
}

