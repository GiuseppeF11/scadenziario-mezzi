<script setup>
// Crea o modifica una voce. I campi cambiano in base alla tipologia scelta.
import { ref, computed, reactive } from 'vue'
import { TIPI, tipoOf } from '../lib/tipi.js'
import { nuovaVoce, nuovaScadenza, newId, clean } from '../lib/scadenze.js'
import { state, saveVoce, deleteVoce } from '../lib/store.js'
import { closeSheet, toast } from '../lib/ui.js'
import { useBozza, leggiBozza, scartaBozza, oraBozza } from '../lib/bozze.js'
import TipoIcon from './TipoIcon.vue'
import ScadenzaEditor from './ScadenzaEditor.vue'
import EtichettePicker from './EtichettePicker.vue'

const props = defineProps({ voce: Object, tipo: String })
const isNew = !props.voce
const bozzaId = isNew ? 'voce-nuova' : `voce-${props.voce.id}`
const base = ref(props.voce ? JSON.stringify(clean(props.voce)) : null)
// Modifica: se c'è una bozza di questa voce la riapro direttamente (con avviso)
const bozzaEsistente = leggiBozza(bozzaId)
const ripristinata = ref(!isNew && bozzaEsistente ? bozzaEsistente : null)
const draft = ref(ripristinata.value ? reactive(ripristinata.value.data)
  : props.voce ? reactive(clean(props.voce))
  : props.tipo ? reactive(nuovaVoce(props.tipo)) : null)
if (isNew && props.tipo) base.value = JSON.stringify(draft.value)
// Nuova voce: la bozza si propone nella scelta tipologia
const bozzaNuova = ref(isNew && !props.tipo ? bozzaEsistente : null)
const { chiudiSenzaBozza, flush } = useBozza(() => (draft.value ? bozzaId : null), () => draft.value, () => base.value)
const t = computed(() => tipoOf(draft.value?.tipo))
const error = ref('')
const confirmDel = ref(false)
const nPagamenti = computed(() => (props.voce ? state.pagamenti.filter(p => p.voceId === props.voce.id).length : 0))

function scegli(id) { draft.value = reactive(nuovaVoce(id)); base.value = JSON.stringify(draft.value) }
function riprendi() { draft.value = reactive(bozzaNuova.value.data); base.value = JSON.stringify(nuovaVoce(draft.value.tipo)) }
function scartaNuova() { scartaBozza(bozzaId); bozzaNuova.value = null }
function scartaModifiche() { scartaBozza(bozzaId); draft.value = reactive(clean(props.voce)); ripristinata.value = null }
function indietro() {
  if (!(isNew && !props.tipo)) return closeSheet()
  flush()                              // tiene quanto scritto finora come bozza
  bozzaNuova.value = leggiBozza(bozzaId)
  draft.value = null
}
function cambiaTipo(id) { draft.value.tipo = id }

const addScadenza = () => draft.value.scadenze.push(nuovaScadenza(draft.value.scadenze.length ? 'Altra scadenza' : 'Scadenza'))
const addExtra = () => draft.value.extra.push({ id: newId(), k: '', v: '' })

function save() {
  error.value = ''
  const d = draft.value
  d.nome = (d.nome || '').trim()
  if (!d.nome) { error.value = `Inserisci ${t.value.nomeLabel.toLowerCase()}.`; return }
  if (d.scadenze.some(s => !s.titolo)) { error.value = 'Ogni scadenza deve avere un nome.'; return }
  if (d.campi.targa) d.campi.targa = d.campi.targa.toUpperCase().replace(/\s+/g, '')
  const out = clean({
    ...d,
    extra: d.extra.filter(x => x.k || x.v),
    scadenze: d.scadenze.map(({ _custom, ...s }) => ({ ...s, importo: s.importo === '' ? null : s.importo }))
  })
  chiudiSenzaBozza()
  saveVoce(out)
  toast(isNew ? `Voce aggiunta: ${out.nome}` : 'Modifiche salvate')
  closeSheet()
}

function archivia() {
  chiudiSenzaBozza()
  saveVoce({ ...clean(props.voce), archiviata: !props.voce.archiviata })
  toast(props.voce.archiviata ? 'Voce ripristinata' : 'Voce archiviata: non compare più nelle scadenze')
  closeSheet()
}

function elimina(conPagamenti) {
  chiudiSenzaBozza()
  deleteVoce(props.voce.id, conPagamenti)
  toast('Voce eliminata')
  closeSheet()
}
</script>

<template>
  <!-- Passo 1: scelta tipologia -->
  <template v-if="!draft">
    <div v-if="bozzaNuova" class="preview bozza">
      <span>Hai una bozza non salvata del {{ oraBozza(bozzaNuova) }}: <b>{{ bozzaNuova.data.nome || 'senza nome' }}</b> ({{ tipoOf(bozzaNuova.data.tipo).nome.toLowerCase() }})</span>
      <div class="sheet-actions">
        <button type="button" class="btn" @click="scartaNuova">Scarta</button>
        <button type="button" class="btn primary" @click="riprendi">Riprendi</button>
      </div>
    </div>
    <h2>Cosa vuoi aggiungere?</h2>
    <div class="tipi-grid">
      <button v-for="x in TIPI" :key="x.id" class="tipo-btn" @click="scegli(x.id)">
        <TipoIcon :tipo="x.id" /><span>{{ x.nome }}<small>{{ x.template().map(s => s.titolo).join(', ') }}</small></span>
      </button>
    </div>
    <button class="btn wide" @click="closeSheet">Annulla</button>
  </template>

  <!-- Passo 2: dettagli -->
  <form v-else class="form" novalidate @submit.prevent="save">
    <div class="voce-h">
      <TipoIcon :tipo="draft.tipo" />
      <h2 style="flex:1">{{ isNew ? `Nuova voce: ${t.nome.toLowerCase()}` : 'Modifica voce' }}</h2>
    </div>
    <div v-if="ripristinata" class="preview bozza">
      <span>Ho riaperto le modifiche non salvate del {{ oraBozza(ripristinata) }}.</span>
      <button type="button" class="link-btn danger" @click="scartaModifiche">Scarta modifiche</button>
    </div>

    <div class="grid2">
      <div class="field">
        <label for="v-nome">{{ t.nomeLabel }}</label>
        <input id="v-nome" v-model="draft.nome" :placeholder="t.nomePh" required autocomplete="off">
      </div>
      <div class="field">
        <label for="v-tipo">Tipologia</label>
        <select id="v-tipo" :value="draft.tipo" @change="cambiaTipo($event.target.value)">
          <option v-for="x in TIPI" :key="x.id" :value="x.id">{{ x.nome }}</option>
        </select>
      </div>
    </div>

    <template v-if="t.campi.length">
      <div class="sec">Dettagli {{ t.nome.toLowerCase() }}</div>
      <div class="grid2">
        <div v-for="c in t.campi" :key="c.k" class="field" :style="c.half ? '' : 'grid-column: 1 / -1'">
          <label :for="`c-${c.k}`">{{ c.label }}</label>
          <select v-if="c.type === 'select'" :id="`c-${c.k}`" v-model="draft.campi[c.k]">
            <option :value="undefined">—</option>
            <option v-for="o in c.options" :key="o" :value="o">{{ o }}</option>
          </select>
          <input v-else :id="`c-${c.k}`" v-model="draft.campi[c.k]" :type="c.type || 'text'" :placeholder="c.ph || ''"
            :inputmode="c.type === 'number' ? 'numeric' : undefined" :style="c.upper ? 'text-transform:uppercase' : ''" autocomplete="off">
        </div>
      </div>
    </template>

    <div class="sec">Etichette</div>
    <EtichettePicker v-model="draft.etichette" />

    <div class="sec">Scadenze e importi</div>
    <ScadenzaEditor v-for="(s, i) in draft.scadenze" :key="s.id" v-model="draft.scadenze[i]" :removable="draft.scadenze.length > 1" @remove="draft.scadenze.splice(i, 1)" />
    <button type="button" class="link-btn" style="align-self:flex-start" @click="addScadenza">+ Aggiungi un'altra scadenza</button>

    <div class="sec">Campi personalizzati</div>
    <div v-for="(x, i) in draft.extra" :key="x.id || i" class="extra-row">
      <input v-model="x.k" placeholder="Nome campo" aria-label="Nome campo">
      <input v-model="x.v" placeholder="Valore" aria-label="Valore">
      <button type="button" class="x-btn" aria-label="Rimuovi campo" @click="draft.extra.splice(i, 1)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <button type="button" class="link-btn" style="align-self:flex-start" @click="addExtra">+ Aggiungi campo (es. PIN, numero contratto)</button>

    <div class="field">
      <label for="v-note">Note</label>
      <textarea id="v-note" v-model="draft.note" rows="2"></textarea>
    </div>

    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <div class="sheet-actions">
      <button type="button" class="btn" @click="indietro">{{ isNew && !tipo ? 'Indietro' : 'Annulla' }}</button>
      <button type="submit" class="btn primary">Salva</button>
    </div>

    <template v-if="!isNew">
      <div class="sheet-actions">
        <button type="button" class="btn" @click="archivia">{{ voce.archiviata ? 'Ripristina' : 'Archivia' }}</button>
        <button v-if="!confirmDel" type="button" class="btn danger" @click="confirmDel = true">Elimina</button>
      </div>
      <div v-if="confirmDel" class="preview" style="display:flex;flex-direction:column;gap:8px">
        <span>Eliminare <b>{{ voce.nome }}</b>?<template v-if="nPagamenti"> Ha {{ nPagamenti }} pagamenti registrati.</template></span>
        <button v-if="nPagamenti" type="button" class="btn" @click="elimina(false)">Elimina e tieni lo storico pagamenti</button>
        <button type="button" class="btn danger" @click="elimina(true)">{{ nPagamenti ? 'Elimina tutto' : 'Sì, elimina' }}</button>
      </div>
    </template>
  </form>
</template>
