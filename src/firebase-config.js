// Configurazione Firebase letta dalle variabili d'ambiente (file .env.local in locale,
// "Variables" del repository su GitHub per la build pubblicata).
// Questi valori NON sono segreti: la sicurezza la fanno le regole di Firestore (firestore.rules).
// Se mancano, l'app parte in "modalità locale" (dati solo su questo dispositivo, senza login).
const env = import.meta.env || {}

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
}

export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && env.VITE_FORCE_LOCAL !== '1')
