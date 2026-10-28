import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addMonths, iso, parse } from '../src/lib/dates.js'
import {
  status, occorrenze, proiezione, storico, prossimaData, registraPagamento, stimaImporto,
  costoMensile, migraV1, formatTarga, totaliPer, nuovaVoce, clean
} from '../src/lib/scadenze.js'
import { ricorrenzaId, ricorrenzaLabel, TIPI } from '../src/lib/tipi.js'
import { buildIcs } from '../src/lib/ics.js'

const NOW = new Date(2026, 9, 27) // 27 ottobre 2026
const v1 = {
  mezzi: [
    { modello: 'Beverly', targa: 'ER93421', tipo: 'moto', proprietario: 'GIUSEPPE FAILLA', frazionamento: 'SEMESTRALE', premioAnnuo: 600, ultimoPagamento: '2026-09-22', scadRevisione: '2028-03-31', importoBollo: 33.81, scadBollo: '2027-01-31' },
    { modello: 'Virago', targa: 'AX07678', tipo: 'moto', frazionamento: 'ANNUALE', premioAnnuo: 280, ultimoPagamento: '2026-05-12', scadRevisione: '2026-11-05', importoBollo: 64.6, scadBollo: '2027-01-31' }
  ],
  cfg: { costoRevisione: 79.02 }
}
const [beverly, virago] = migraV1(v1)
const luce = {
  id: 'luce', tipo: 'bolletta', nome: 'Luce casa', campi: { fornitore: 'Enel' }, etichette: ['casa'],
  scadenze: [{ id: 'b1', titolo: 'Bolletta', data: '2026-11-15', importo: 60, variabile: true, ricorrenza: { n: 2, unita: 'mesi' }, fineMese: false, base: 'scadenza', avviso: 10 }]
}
const netflix = {
  id: 'nf', tipo: 'abbonamento', nome: 'Netflix', campi: {}, etichette: [],
  scadenze: [{ id: 'n1', titolo: 'Rinnovo', data: '2026-11-03', importo: 13.99, ricorrenza: { n: 1, unita: 'mesi' }, avviso: 3 }]
}

test('addMonths si comporta come DATA.MESE (fine mese)', () => {
  assert.equal(iso(addMonths(parse('2026-08-31'), 6)), '2027-02-28')
  assert.equal(iso(addMonths(parse('2027-08-31'), 6)), '2028-02-29')
})

test('migrazione dalla prima versione', () => {
  assert.equal(beverly.tipo, 'mezzo')
  assert.equal(beverly.campi.targa, 'ER93421')
  assert.equal(beverly.campi.proprietario, 'Giuseppe Failla')
  const [ass, rev, bollo] = beverly.scadenze
  assert.equal(ass.data, '2027-03-22'); assert.equal(ass.importo, 300); assert.deepEqual(ass.ricorrenza, { n: 6, unita: 'mesi' })
  assert.equal(rev.importo, 79.02); assert.equal(rev.base, 'pagamento')
  assert.equal(bollo.data, '2027-01-31'); assert.ok(bollo.fineMese)
  assert.equal(migraV1({ foo: 1 }), null)
})

test('stati con preavviso per scadenza', () => {
  assert.equal(status(-1), 'red'); assert.equal(status(0), 'amber'); assert.equal(status(30), 'amber'); assert.equal(status(31), 'green')
  assert.equal(status(5, 3), 'green'); assert.equal(status(3, 3), 'amber')
})

test('occorrenze ordinate: Netflix, poi revisione Virago, poi luce', () => {
  const s = occorrenze([beverly, virago, luce, netflix], [], NOW)
  assert.deepEqual(s.slice(0, 3).map(x => x.v.nome), ['Netflix', 'Virago', 'Luce casa'])
  assert.equal(s[1].days, 9); assert.equal(s[1].status, 'amber')
  assert.equal(s[0].status, 'green') // 7 giorni ma preavviso 3
  assert.equal(occorrenze([{ ...luce, archiviata: true }], [], NOW).length, 0)
})

test('prossima data: dalla scadenza, dal pagamento, fine mese, una tantum', () => {
  const [ass, rev, bollo] = virago.scadenze
  assert.equal(prossimaData(ass, '2026-05-01'), '2028-05-12')
  assert.equal(prossimaData(rev, '2026-11-03'), '2028-11-30')
  assert.equal(prossimaData(bollo, '2027-01-10'), '2028-01-31')
  assert.equal(prossimaData({ data: '2026-11-03', ricorrenza: { n: 2, unita: 'settimane' } }), '2026-11-17')
  assert.equal(prossimaData({ data: '2026-11-03', ricorrenza: null }), null)
})

test('registra pagamento: crea il movimento e avanza la data', () => {
  const { pagamento, voce, next } = registraPagamento(luce, 'b1', { data: '2026-11-14', importo: 72.4 })
  assert.equal(next, '2027-01-15')
  assert.equal(voce.scadenze[0].data, '2027-01-15')
  assert.equal(luce.scadenze[0].data, '2026-11-15') // non muta l'originale
  assert.equal(pagamento.importo, 72.4); assert.equal(pagamento.prima, '2026-11-15'); assert.equal(pagamento.tipo, 'bolletta')
  assert.deepEqual(pagamento.etichette, ['casa'])
})

test('importo variabile stimato dalla media degli ultimi 3', () => {
  const pag = [
    { scadenzaId: 'b1', data: '2026-01-10', importo: 10 }, { scadenzaId: 'b1', data: '2026-03-10', importo: 60 },
    { scadenzaId: 'b1', data: '2026-05-10', importo: 70 }, { scadenzaId: 'b1', data: '2026-07-10', importo: 80 }
  ]
  assert.equal(stimaImporto(luce.scadenze[0], pag), 70)
  assert.equal(stimaImporto(luce.scadenze[0], []), 60)
  assert.equal(stimaImporto(netflix.scadenze[0], pag), 13.99)
})

test('proiezione 12 mesi con ricorrenze e scadute nel mese corrente', () => {
  const p = proiezione([beverly, netflix], [], NOW)
  assert.equal(p.length, 12)
  const mar = p.find(x => x.date.getMonth() === 2), sep = p.find(x => x.date.getMonth() === 8)
  assert.equal(mar.per.mezzo, 300); assert.equal(sep.per.mezzo, 300)
  const netflixTot = p.reduce((s, x) => s + x.per.abbonamento, 0)
  assert.equal(Math.round(netflixTot * 100), Math.round(13.99 * 11 * 100)) // da nov 2026 a set 2027
  const scaduta = { ...netflix, id: 'x', scadenze: [{ ...netflix.scadenze[0], data: '2026-08-01', ricorrenza: null }] }
  assert.equal(proiezione([scaduta], [], NOW)[0].per.abbonamento, 13.99)
})

test('storico per mese e totali per etichetta', () => {
  const pag = [
    { data: '2026-10-02', importo: 50, tipo: 'bolletta', etichette: ['casa'] },
    { data: '2026-09-02', importo: 20, tipo: 'abbonamento', etichette: [] },
    { data: '2025-01-02', importo: 999, tipo: 'altro', etichette: [] }
  ]
  const s = storico(pag, NOW, 12)
  assert.equal(s.at(-1).per.bolletta, 50); assert.equal(s.at(-2).tot, 20)
  assert.equal(s.reduce((a, m) => a + m.tot, 0), 70)
  const t = totaliPer(pag, p => p.etichette)
  assert.deepEqual(t.find(x => x.k === 'casa'), { k: 'casa', tot: 50 })
})

test('costo mensile medio', () => {
  assert.equal(Math.round(costoMensile(netflix) * 100), 1399)
  assert.equal(Math.round(costoMensile(luce)), 30)
})

test('ogni tipologia crea una voce valida e serializzabile', () => {
  for (const t of TIPI) {
    const v = nuovaVoce(t.id)
    assert.ok(v.scadenze.length >= 1)
    assert.deepEqual(clean(v).scadenze.length, v.scadenze.length)
  }
})

test('etichette ricorrenza', () => {
  assert.equal(ricorrenzaId({ n: 2, unita: 'mesi' }), 'bim')
  assert.equal(ricorrenzaLabel({ n: 10, unita: 'giorni' }), 'Ogni 10 giorni')
  assert.equal(ricorrenzaLabel(null), 'Una tantum')
})

test('targa formattata', () => {
  assert.equal(formatTarga('fk150nz'), 'FK 150NZ'); assert.equal(formatTarga('ER93421'), 'ER 93421')
})

test('ics valido con promemoria', () => {
  const items = occorrenze([virago, netflix], [], NOW)
  const ics = buildIcs(items, NOW)
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/)
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 4)
  assert.match(ics, /DTSTART;VALUE=DATE:20261105/)
  assert.match(ics, /TRIGGER:-P3D/)
  assert.ok(ics.split('\r\n').every(l => new TextEncoder().encode(l).length <= 75))
})

import { preavvisoDisdetta, disdici, riattiva } from '../src/lib/scadenze.js'

const disney = {
  id: 'dp', tipo: 'abbonamento', nome: 'Disney Plus', campi: {}, etichette: [],
  scadenze: [{ id: 'd1', titolo: 'Rinnovo', data: '2026-12-10', importo: 109.9, ricorrenza: { n: 1, unita: 'anni' }, avviso: 3 }]
}
const claude = {
  id: 'cl', tipo: 'abbonamento', nome: 'Claude', campi: {}, etichette: [],
  scadenze: [{ id: 'c1', titolo: 'Rinnovo', data: '2026-11-15', importo: 21.96, ricorrenza: { n: 1, unita: 'mesi' }, avviso: 3 }]
}

test('preavviso disdetta: 7 gg di default sui rinnovi lunghi, quello indicato altrimenti', () => {
  assert.equal(preavvisoDisdetta(disney, disney.scadenze[0]), 7)
  assert.equal(preavvisoDisdetta(claude, claude.scadenze[0]), null)
  assert.equal(preavvisoDisdetta({ ...claude, campi: { disdetta: 5 } }, claude.scadenze[0]), 5)
  assert.equal(preavvisoDisdetta({ ...disney, campi: { disdetta: '0' } }, disney.scadenze[0]), null)
  assert.equal(preavvisoDisdetta(luce, luce.scadenze[0]), null)
})

test('occorrenze: una sola riga per il rinnovo, con il termine per disdire nel dettaglio', () => {
  const s = occorrenze([disney], [], NOW)
  assert.equal(s.length, 1); assert.equal(s[0].kind, 'rata')
  assert.equal(iso(s[0].disdireEntro), '2026-12-03'); assert.equal(s[0].giorniDisdire, 37); assert.equal(s[0].preavviso, 7)
  assert.equal(occorrenze([claude], [], NOW)[0].disdireEntro, undefined)
})

test('disdetta: a dicembre resta visibile come "fine", non costa e non si proietta', () => {
  const dd = { ...disney, scadenze: [disdici(disney.scadenze[0], NOW)] }
  assert.equal(dd.scadenze[0].disdetta.il, '2026-10-27')
  const s = occorrenze([dd], [], NOW)
  assert.equal(s.length, 1); assert.equal(s[0].kind, 'fine'); assert.equal(s[0].amount, 0); assert.equal(s[0].status, 'off')
  assert.equal(proiezione([dd], [], NOW).reduce((a, m) => a + m.tot, 0), 0)
  assert.equal(costoMensile(dd), 0)
  // passata la data non compare più
  assert.equal(occorrenze([dd], [], new Date(2026, 11, 11)).length, 0)
  assert.equal(riattiva(dd.scadenze[0]).disdetta, undefined)
})
