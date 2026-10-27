// Bozze dei form salvate sul dispositivo: se chiudi per sbaglio (tasto indietro,
// tocco fuori dal pannello, app chiusa) ritrovi quello che stavi scrivendo.
// Sono per utente e per dispositivo; spariscono quando salvi o scarti.
import { watch, onBeforeUnmount } from 'vue'
import { state } from './store.js'
import { toast } from './ui.js'

const PREFIX = 'scadenziario.bozza.'
const key = id => `${PREFIX}${state.user?.uid || 'anon'}.${id}`

export function leggiBozza(id) {
  try { return JSON.parse(localStorage.getItem(key(id)) || 'null') } catch { return null }
}
export function salvaBozza(id, data) {
  try { localStorage.setItem(key(id), JSON.stringify({ salvata: new Date().toISOString(), data })) } catch { /* storage pieno o bloccato */ }
}
export function scartaBozza(id) {
  try { localStorage.removeItem(key(id)) } catch { /* ignorato */ }
}

/**
 * Collega un form a una bozza.
 * getId(): id della bozza (o null se il form non è ancora pronto)
 * getData(): oggetto reattivo da salvare; getBase(): JSON di partenza per capire se è cambiato qualcosa.
 * Ritorna { chiudiSenzaBozza } da chiamare dopo un salvataggio riuscito.
 */
export function useBozza(getId, getData, getBase) {
  let timer = null
  let finito = false
  const sporco = () => getData() && JSON.stringify(getData()) !== getBase()
  const flush = () => {
    clearTimeout(timer)
    const id = getId()
    if (finito || !id) return
    if (sporco()) salvaBozza(id, getData()); else scartaBozza(id)
  }
  watch(getData, () => { clearTimeout(timer); timer = setTimeout(flush, 400) }, { deep: true })
  const onHide = () => { if (document.visibilityState === 'hidden') flush() }
  document.addEventListener('visibilitychange', onHide)
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onHide)
    const id = getId()
    const daSalvare = !finito && id && sporco()
    flush()
    if (daSalvare) toast('Bozza salvata: la ritrovi riaprendo', () => scartaBozza(id), 'Scarta')
  })
  return { flush, chiudiSenzaBozza: () => { finito = true; clearTimeout(timer); const id = getId(); if (id) scartaBozza(id) } }
}

export const oraBozza = b => new Date(b.salvata).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
