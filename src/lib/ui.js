// Stato dell'interfaccia condiviso tra i componenti: pannello aperto e messaggi.
import { reactive } from 'vue'

export const ui = reactive({
  sheet: null,      // { type: 'mezzo' | 'done' | 'settings', props: {} }
  toast: null,      // { msg, undo?: () => void }
})

let timer = null
export function toast(msg, undo) {
  clearTimeout(timer)
  ui.toast = { msg, undo }
  timer = setTimeout(() => { ui.toast = null }, 6000)
}

export const openSheet = (type, props = {}) => { ui.sheet = { type, props } }
export const closeSheet = () => { ui.sheet = null }
