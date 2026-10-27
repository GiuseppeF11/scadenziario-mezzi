<script setup>
import { ref } from 'vue'
import { auth } from '../lib/store.js'

const modo = ref('login')          // login | registrati | reset
const email = ref('')
const password = ref('')
const nome = ref('')
const error = ref('')
const ok = ref('')
const busy = ref(false)

async function run(fn) {
  error.value = ''; ok.value = ''; busy.value = true
  try { await fn() } catch (e) { error.value = e.message } finally { busy.value = false }
}
function submit() {
  if (modo.value === 'reset') return run(async () => { await auth.reset(email.value.trim()); ok.value = 'Ti ho mandato un\'email per reimpostare la password.' })
  if (modo.value === 'registrati') return run(() => auth.register(email.value.trim(), password.value, nome.value.trim()))
  return run(() => auth.login(email.value.trim(), password.value))
}
const icon = import.meta.env.BASE_URL + 'icons/icon-192.png'
const go = m => { modo.value = m; error.value = ''; ok.value = '' }
</script>

<template>
  <main class="auth">
    <div class="brand">
      <img :src="icon" alt="">
      <div><h1>Scadenziario</h1><span class="muted">Bollette, mezzi, abbonamenti e casa in un posto solo</span></div>
    </div>

    <div v-if="modo !== 'reset'" class="seg" role="tablist" style="align-self:flex-start">
      <button role="tab" :aria-pressed="modo === 'login'" @click="go('login')">Accedi</button>
      <button role="tab" :aria-pressed="modo === 'registrati'" @click="go('registrati')">Registrati</button>
    </div>
    <h2 v-else style="font-size:20px">Recupera password</h2>

    <form class="form card" @submit.prevent="submit">
      <div v-if="modo === 'registrati'" class="field">
        <label for="a-nome">Nome</label>
        <input id="a-nome" v-model="nome" autocomplete="name">
      </div>
      <div class="field">
        <label for="a-email">Email</label>
        <input id="a-email" v-model="email" type="email" autocomplete="email" required>
      </div>
      <div v-if="modo !== 'reset'" class="field">
        <label for="a-pw">Password</label>
        <input id="a-pw" v-model="password" type="password" :autocomplete="modo === 'registrati' ? 'new-password' : 'current-password'" required minlength="6">
        <span v-if="modo === 'registrati'" class="hint">Almeno 6 caratteri.</span>
      </div>
      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <p v-if="ok" class="ok-msg" role="status">{{ ok }}</p>
      <button class="btn primary wide" :disabled="busy">{{ busy ? 'Attendi…' : modo === 'login' ? 'Accedi' : modo === 'registrati' ? 'Crea account' : 'Invia email' }}</button>
      <button v-if="modo === 'login'" type="button" class="link-btn" @click="go('reset')">Password dimenticata?</button>
      <button v-if="modo === 'reset'" type="button" class="link-btn" @click="go('login')">← Torna all'accesso</button>
    </form>

    <template v-if="modo !== 'reset'">
      <div class="or">oppure</div>
      <button class="btn wide" :disabled="busy" @click="run(auth.google)">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.8h3.6c2-1.9 3.2-4.7 3.2-8.1z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z"/></svg>
        Continua con Google
      </button>
    </template>
    <p class="muted" style="font-size:13px;text-align:center">I tuoi dati sono privati: solo tu puoi leggerli, da qualsiasi dispositivo con cui accedi.</p>
  </main>
</template>
