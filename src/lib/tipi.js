// Tipologie di voce: ognuna ha i suoi campi e delle scadenze proposte di default.
// Per aggiungere una tipologia basta aggiungere un oggetto qui: form, filtri,
// grafici e calendario si adattano da soli.

export const RICORRENZE = [
  { id: 'una', label: 'Una tantum', r: null },
  { id: 'sett', label: 'Ogni settimana', r: { n: 1, unita: 'settimane' } },
  { id: 'mens', label: 'Mensile', r: { n: 1, unita: 'mesi' } },
  { id: 'bim', label: 'Bimestrale', r: { n: 2, unita: 'mesi' } },
  { id: 'trim', label: 'Trimestrale', r: { n: 3, unita: 'mesi' } },
  { id: 'quad', label: 'Quadrimestrale', r: { n: 4, unita: 'mesi' } },
  { id: 'sem', label: 'Semestrale', r: { n: 6, unita: 'mesi' } },
  { id: 'ann', label: 'Annuale', r: { n: 1, unita: 'anni' } },
  { id: 'bienn', label: 'Ogni 2 anni', r: { n: 2, unita: 'anni' } },
  { id: 'pers', label: 'Personalizzata…', r: 'custom' }
]

export const UNITA = [
  { id: 'giorni', label: 'giorni' }, { id: 'settimane', label: 'settimane' },
  { id: 'mesi', label: 'mesi' }, { id: 'anni', label: 'anni' }
]

/** Id della ricorrenza predefinita corrispondente, o 'pers'. */
export function ricorrenzaId(r) {
  if (!r) return 'una'
  const f = RICORRENZE.find(x => x.r && x.r !== 'custom' && x.r.n === Number(r.n) && x.r.unita === r.unita)
  return f ? f.id : 'pers'
}

export function ricorrenzaLabel(r) {
  const id = ricorrenzaId(r)
  if (id !== 'pers') return RICORRENZE.find(x => x.id === id).label
  return `Ogni ${r.n} ${r.unita}`
}

/** Quante volte all'anno si ripete (per stimare il costo mensile). */
export function voltePerAnno(r) {
  if (!r || !Number(r.n)) return 0
  const n = Number(r.n)
  return { giorni: 365 / n, settimane: 52 / n, mesi: 12 / n, anni: 1 / n }[r.unita] || 0
}

const PAGAMENTO = ['Domiciliazione', 'Carta', 'Bollettino / PagoPA', 'Bonifico', 'Contanti', 'PayPal']

const sc = (titolo, ricorrenza, extra = {}) => ({ titolo, ricorrenza, fineMese: false, base: 'scadenza', variabile: false, avviso: 30, ...extra })

export const TIPI = [
  {
    id: 'mezzo', nome: 'Mezzo', plurale: 'Mezzi',
    icon: 'M5 17h14M6 17v2M18 17v2M4 17v-5l2.2-5.2A1.5 1.5 0 0 1 7.6 6h8.8a1.5 1.5 0 0 1 1.4.8L20 12v5M4 12h16M7.5 14.5h.01M16.5 14.5h.01',
    nomeLabel: 'Modello', nomePh: 'es. Peugeot 2008',
    campi: [
      { k: 'targa', label: 'Targa', ph: 'AB123CD', upper: true, half: true },
      { k: 'tipoMezzo', label: 'Tipo', type: 'select', options: ['Auto', 'Moto', 'Scooter', 'Furgone', 'Altro'], half: true },
      { k: 'proprietario', label: 'Intestatario', half: true },
      { k: 'compagnia', label: 'Compagnia assicurativa', half: true },
      { k: 'polizza', label: 'N. polizza', half: true },
      { k: 'km', label: 'Km attuali', type: 'number', half: true }
    ],
    template: () => [
      sc('Assicurazione', { n: 1, unita: 'anni' }),
      sc('Revisione', { n: 2, unita: 'anni' }, { fineMese: true, base: 'pagamento' }),
      sc('Bollo', { n: 1, unita: 'anni' }, { fineMese: true })
    ],
    sotto: v => [v.campi?.tipoMezzo, v.campi?.proprietario].filter(Boolean).join(' · ')
  },
  {
    id: 'bolletta', nome: 'Bolletta', plurale: 'Bollette',
    icon: 'M13 2 4 14h7l-1 8 9-12h-7z',
    nomeLabel: 'Nome', nomePh: 'es. Luce casa',
    campi: [
      { k: 'utenza', label: 'Utenza', type: 'select', options: ['Luce', 'Gas', 'Luce + Gas', 'Acqua', 'Rifiuti (TARI)', 'Altro'], half: true },
      { k: 'fornitore', label: 'Fornitore', ph: 'es. Enel', half: true },
      { k: 'codiceCliente', label: 'Codice cliente', half: true },
      { k: 'pod', label: 'POD / PDR / matricola', half: true },
      { k: 'intestatario', label: 'Intestatario', half: true },
      { k: 'pagamento', label: 'Pagamento', type: 'select', options: PAGAMENTO, half: true }
    ],
    template: () => [sc('Bolletta', { n: 2, unita: 'mesi' }, { variabile: true, avviso: 10 })],
    sotto: v => [v.campi?.utenza, v.campi?.fornitore].filter(Boolean).join(' · ')
  },
  {
    id: 'internet', nome: 'Internet e telefono', plurale: 'Internet e telefono',
    icon: 'M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01',
    nomeLabel: 'Nome', nomePh: 'es. Fibra casa',
    campi: [
      { k: 'linea', label: 'Linea', type: 'select', options: ['Fibra', 'ADSL', 'FWA', 'Mobile', 'Fisso', 'Altro'], half: true },
      { k: 'operatore', label: 'Operatore', ph: 'es. Iliad', half: true },
      { k: 'numero', label: 'Numero / ID linea', half: true },
      { k: 'codiceCliente', label: 'Codice cliente', half: true },
      { k: 'vincolo', label: 'Vincolo fino al', type: 'date', half: true },
      { k: 'pagamento', label: 'Pagamento', type: 'select', options: PAGAMENTO, half: true }
    ],
    template: () => [sc('Canone', { n: 1, unita: 'mesi' }, { avviso: 5 })],
    sotto: v => [v.campi?.linea, v.campi?.operatore].filter(Boolean).join(' · ')
  },
  {
    id: 'abbonamento', nome: 'Abbonamento', plurale: 'Abbonamenti',
    icon: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
    nomeLabel: 'Servizio', nomePh: 'es. Netflix',
    campi: [
      { k: 'categoria', label: 'Categoria', type: 'select', options: ['Streaming', 'Musica', 'Software / Cloud', 'Palestra / Sport', 'Giornali', 'Trasporti', 'Altro'], half: true },
      { k: 'piano', label: 'Piano', ph: 'es. Standard', half: true },
      { k: 'account', label: 'Account / email', half: true },
      { k: 'pagamento', label: 'Pagamento', type: 'select', options: PAGAMENTO, half: true },
      { k: 'disdetta', label: 'Preavviso disdetta (giorni)', type: 'number', half: true }
    ],
    template: () => [sc('Rinnovo', { n: 1, unita: 'mesi' }, { avviso: 3 })],
    sotto: v => [v.campi?.categoria, v.campi?.piano].filter(Boolean).join(' · ')
  },
  {
    id: 'casa', nome: 'Casa e tasse', plurale: 'Casa e tasse',
    icon: 'M3 11 12 3l9 8M5 9.5V21h14V9.5M10 21v-6h4v6',
    nomeLabel: 'Nome', nomePh: 'es. Condominio',
    campi: [
      { k: 'voce', label: 'Tipo', type: 'select', options: ['Affitto', 'Mutuo', 'Condominio', 'IMU', 'TARI', 'Manutenzione', 'Altro'], half: true },
      { k: 'beneficiario', label: 'Beneficiario / ente', half: true },
      { k: 'riferimento', label: 'Riferimento', ph: 'es. n. contratto', half: true },
      { k: 'pagamento', label: 'Pagamento', type: 'select', options: PAGAMENTO, half: true }
    ],
    template: () => [sc('Rata', { n: 1, unita: 'mesi' }, { avviso: 7 })],
    sotto: v => [v.campi?.voce, v.campi?.beneficiario].filter(Boolean).join(' · ')
  },
  {
    id: 'assicurazione', nome: 'Assicurazione', plurale: 'Assicurazioni',
    icon: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z',
    nomeLabel: 'Nome', nomePh: 'es. Polizza casa',
    campi: [
      { k: 'ramo', label: 'Ramo', type: 'select', options: ['Casa', 'Vita', 'Salute', 'Infortuni', 'RC', 'Animali', 'Altro'], half: true },
      { k: 'compagnia', label: 'Compagnia', half: true },
      { k: 'polizza', label: 'N. polizza', half: true },
      { k: 'agente', label: 'Agente / contatto', half: true }
    ],
    template: () => [sc('Premio', { n: 1, unita: 'anni' })],
    sotto: v => [v.campi?.ramo, v.campi?.compagnia].filter(Boolean).join(' · ')
  },
  {
    id: 'altro', nome: 'Altro', plurale: 'Altro',
    icon: 'M12 8v8M8 12h8M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    nomeLabel: 'Nome', nomePh: 'es. Rata TV',
    campi: [],
    template: () => [sc('Scadenza', null)],
    sotto: () => ''
  }
]

export const TIPO = Object.fromEntries(TIPI.map((t, i) => [t.id, { ...t, slot: i + 1 }]))
export const tipoOf = id => TIPO[id] || TIPO.altro

/** Colori delle etichette (testo sempre in inchiostro neutro, il colore va sul pallino). */
export const COLORI_ETICHETTA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948', '#5a6370']
