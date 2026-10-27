// Backend cloud: Firebase Authentication + Cloud Firestore con cache offline.
// Struttura dati:  users/{uid}/voci/{id}   users/{uid}/pagamenti/{id}   users/{uid}/meta/impostazioni
// Le scritture fatte offline restano in coda sul dispositivo e partono appena torna la rete.
import { initializeApp } from 'firebase/app'
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, updateProfile, GoogleAuthProvider, signInWithPopup
} from 'firebase/auth'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, writeBatch
} from 'firebase/firestore'
import { firebaseConfig } from '../firebase-config.js'

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
auth.languageCode = 'it'
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })

let uid = null

const ERRORI = {
  'auth/invalid-email': 'Indirizzo email non valido.',
  'auth/missing-password': 'Inserisci la password.',
  'auth/weak-password': 'La password deve avere almeno 6 caratteri.',
  'auth/email-already-in-use': 'Esiste già un account con questa email: accedi.',
  'auth/invalid-credential': 'Email o password non corretti.',
  'auth/wrong-password': 'Email o password non corretti.',
  'auth/user-not-found': 'Nessun account con questa email.',
  'auth/too-many-requests': 'Troppi tentativi. Riprova tra qualche minuto.',
  'auth/network-request-failed': 'Nessuna connessione. Per accedere la prima volta serve internet.',
  'auth/popup-closed-by-user': 'Accesso con Google annullato.',
  'auth/popup-blocked': 'Il browser ha bloccato la finestra di Google: consenti i popup e riprova.',
  'auth/unauthorized-domain': 'Questo indirizzo non è autorizzato in Firebase (Authentication → Settings → Domini autorizzati).',
  'permission-denied': 'Permesso negato dal database: controlla le regole di Firestore.'
}
export const erroreLeggibile = e => ERRORI[e?.code] || e?.message || 'Errore sconosciuto'

const wrap = fn => async (...a) => { try { return await fn(...a) } catch (e) { throw new Error(erroreLeggibile(e)) } }

export const authApi = {
  onUser: cb => onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, email: u.email, nome: u.displayName || '' } : null)),
  register: wrap(async (email, password, nome) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    if (nome) await updateProfile(user, { displayName: nome })
  }),
  login: wrap((email, password) => signInWithEmailAndPassword(auth, email, password)),
  google: wrap(() => signInWithPopup(auth, new GoogleAuthProvider())),
  reset: wrap(email => sendPasswordResetEmail(auth, email)),
  logout: () => signOut(auth)
}

const ref = (col, id) => (col === 'meta' ? doc(db, 'users', uid, 'meta', id) : doc(db, 'users', uid, col, id))

/** Ascolta i dati dell'utente. onData({ voci | pagamenti | impostazioni }, { pending }) */
export function connect(userId, onData, onError) {
  uid = userId
  const base = ['users', uid]
  const meta = s => ({ pending: s.metadata.hasPendingWrites, fromCache: s.metadata.fromCache })
  const opts = { includeMetadataChanges: true }
  const un = [
    onSnapshot(collection(db, ...base, 'voci'), opts, s => onData({ voci: s.docs.map(d => d.data()) }, meta(s)), onError),
    onSnapshot(collection(db, ...base, 'pagamenti'), opts, s => onData({ pagamenti: s.docs.map(d => d.data()) }, meta(s)), onError),
    onSnapshot(doc(db, ...base, 'meta', 'impostazioni'), opts, s => onData({ impostazioni: s.data() || null }, meta(s)), onError)
  ]
  return () => { un.forEach(f => f()); uid = null }
}

/**
 * Scrive in blocchi atomici. ops: [{ type: 'set' | 'merge' | 'delete', col, id, data }]
 * Non serve aspettare la promise: la UI si aggiorna subito dalla cache locale.
 */
export async function write(ops) {
  if (!uid) throw new Error('Non sei collegato')
  for (let i = 0; i < ops.length; i += 450) {
    const b = writeBatch(db)
    for (const op of ops.slice(i, i + 450)) {
      const r = ref(op.col, op.id)
      if (op.type === 'delete') b.delete(r)
      else if (op.type === 'merge') b.set(r, op.data, { merge: true })
      else b.set(r, op.data)
    }
    await b.commit()
  }
}
