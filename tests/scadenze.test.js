import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addMonths, iso, parse } from '../src/lib/dates.js'
import { scadAssicurazione, scadenze, proiezione, avanza, status, formatTarga } from '../src/lib/scadenze.js'
import { buildIcs } from '../src/lib/ics.js'

const NOW = new Date(2026, 9, 27) // 27 ottobre 2026
const cfg = { costoRevisione: 79.02 }
const beverly = { id: 'b', modello: 'Beverly', targa: 'ER93421', frazionamento: 'SEMESTRALE', premioAnnuo: 600, ultimoPagamento: '2026-09-22', scadRevisione: '2028-03-31', importoBollo: 33.81, scadBollo: '2027-01-31' }
const virago = { id: 'v', modello: 'Virago', targa: 'AX07678', frazionamento: 'ANNUALE', premioAnnuo: 280, ultimoPagamento: '2026-05-12', scadRevisione: '2026-11-05', importoBollo: 64.6, scadBollo: '2027-01-31' }

test('addMonths si comporta come DATA.MESE (fine mese)', () => {
  assert.equal(iso(addMonths(parse('2026-08-31'), 6)), '2027-02-28')
  assert.equal(iso(addMonths(parse('2027-08-31'), 6)), '2028-02-29')
})

test('scadenza assicurazione da ultimo pagamento', () => {
  assert.equal(iso(scadAssicurazione(beverly)), '2027-03-22')
  assert.equal(iso(scadAssicurazione(virago)), '2027-05-12')
})

test('stati: scaduta, entro 30 gg, ok', () => {
  assert.equal(status(-1), 'red'); assert.equal(status(0), 'amber'); assert.equal(status(30), 'amber'); assert.equal(status(31), 'green')
})

test('la revisione Virago è la prossima, tra 9 giorni', () => {
  const s = scadenze([beverly, virago], cfg, NOW)
  assert.equal(s[0].kind, 'revisione'); assert.equal(s[0].days, 9); assert.equal(s[0].status, 'amber')
})

test('proiezione 12 mesi include la seconda rata semestrale', () => {
  const p = proiezione([beverly], cfg, NOW)
  const mar = p.find(x => x.date.getMonth() === 2), sep = p.find(x => x.date.getMonth() === 8)
  assert.equal(mar.assic, 300); assert.equal(sep.assic, 300)
  assert.equal(p.reduce((s, x) => s + x.tot, 0), 600 + 33.81)
})

test('segna fatto: avanza le date', () => {
  assert.deepEqual(avanza(beverly, 'assic'), { field: 'ultimoPagamento', value: '2027-03-22' })
  assert.deepEqual(avanza(beverly, 'bollo'), { field: 'scadBollo', value: '2028-01-31' })
  assert.deepEqual(avanza(virago, 'revisione', '2026-11-03'), { field: 'scadRevisione', value: '2028-11-30' })
})

test('targa formattata', () => {
  assert.equal(formatTarga('fk150nz'), 'FK 150NZ'); assert.equal(formatTarga('ER93421'), 'ER 93421')
})

test('ics valido con due promemoria per evento', () => {
  const ics = buildIcs(scadenze([virago], cfg, NOW), NOW)
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/)
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3)
  assert.equal((ics.match(/TRIGGER:-P30D/g) || []).length, 3)
  assert.match(ics, /DTSTART;VALUE=DATE:20261105/)
  assert.ok(ics.split('\r\n').every(l => new TextEncoder().encode(l).length <= 75))
})
