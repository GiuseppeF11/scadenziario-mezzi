# Scadenziario

PWA (Vue 3 + Vite + Firebase) per tenere traccia di **tutte le scadenze e le uscite**: mezzi, bollette, internet e telefono, abbonamenti, casa e tasse, assicurazioni e altro.
Si installa sul telefono come un'app, funziona offline, si sincronizza tra dispositivi con il tuo account.

## Come è organizzata

- **Voce** = qualcosa che genera spese (la Peugeot 2008, la luce di casa, Netflix, il condominio).
  Ogni voce ha una **tipologia** che decide i campi mostrati (mezzo → targa, compagnia, polizza; bolletta → fornitore, POD/PDR, codice cliente; internet → operatore, vincolo; …), più **campi personalizzati** liberi e **etichette** tue.
- Ogni voce ha una o più **scadenze** (un mezzo ne ha tre: assicurazione, revisione, bollo) con data, importo, ripetizione (mensile, bimestrale, annuale, ogni N giorni/settimane/mesi/anni, una tantum), preavviso, "a fine mese", "si calcola dalla data in cui pago".
  Importo **variabile** (bollette): stima = media degli ultimi 3 pagamenti.
- **Segna pagata** registra un **movimento** con l'importo reale e sposta la data alla prossima (con Annulla). Puoi registrare anche **spese extra** non legate a scadenze.

## Schermate

- **Scadenze**: prossima in evidenza, scadute / in arrivo / totale 30 giorni, filtri per tipologia ed etichetta, raggruppamento per mese, tipologia o etichetta. Da ogni scadenza: Segna pagata, Google Calendar, Apri voce.
- **Voci**: ricerca (nome, targa, fornitore, codici…), raggruppa per tipologia o etichetta, costo medio mensile per voce e gruppo, archivio.
- **Andamento**: storico pagato per mese (ultimi 12 mesi, anno corrente, anno precedente) e previsione dei prossimi 12, ripartizione per tipologia, etichetta e voce, quota mensile da accantonare, registro movimenti.
- **Impostazioni** (ingranaggio): account e stato sincronizzazione, gestione etichette, export `.ics` per il calendario, backup/import JSON (accetta anche il vecchio backup dei soli mezzi e lo converte).

## Configurare Firebase (gratis, piano Spark)

Servono solo **Authentication** e **Cloud Firestore**, entrambi inclusi nel piano gratuito senza carta di credito. Non usiamo Cloud Storage (quello ora richiede il piano a consumo).

1. Vai su https://console.firebase.google.com → **Aggiungi progetto** (Google Analytics non serve).
2. **Build → Authentication → Inizia**: abilita **Email/password** e, se vuoi, **Google**.
3. **Build → Firestore Database → Crea database**: località `eur3 (europe-west)`, avvia in **modalità produzione**.
4. Scheda **Regole** di Firestore: incolla il contenuto di `firestore.rules` e **Pubblica** (ogni utente vede solo i suoi dati).
5. **Impostazioni progetto (ingranaggio) → Le tue app → icona Web `</>`**: registra l'app (niente Hosting) e copia i valori di `firebaseConfig`.
6. In locale: copia `.env.example` in `.env.local` e incolla i valori.

Senza `.env.local` l'app parte in **modalità locale** (nessun login, dati nel browser): comoda per provarla.

## Avvio in locale

```bash
npm install
npm run dev      # http://localhost:5173 (con --host la apri anche dal telefono sulla stessa Wi-Fi)
npm test         # test della logica (node --test)
npm run build    # produzione in dist/
```

Il service worker (offline + installazione) è attivo solo nella build: `npm run build && npm run preview`.

## Pubblicazione su Firebase Hosting

L'app è pubblicata su **https://scadenziario-101bb.web.app** (gratis, piano Spark; dominio già autorizzato per il login).

Una tantum:
```bash
npm install -g firebase-tools
firebase login
```

A ogni aggiornamento:
```bash
npm run deploy
```
Esegue i test, la build (con i valori di `.env.local`) e pubblica sito + regole di Firestore (`firebase.json`, `.firebaserc`).
Il service worker si aggiorna da solo: sul telefono basta riaprire l'app (al massimo due volte).

## Passare i dati dalla prima versione

Nella vecchia app: ⚙️ → Salva backup. Nella nuova, dopo il login: ⚙️ → Importa da file. I 4 mezzi di `dati/mezzi-iniziali.json` vengono convertiti in voci con le loro tre scadenze.

## Promemoria

Gli avvisi li fa il calendario: tocca una scadenza → *Google Calendar*, oppure ⚙️ → *Esporta scadenze nel calendario* (un `.ics` con gli avvisi di ogni scadenza; su Android importalo da calendar.google.com → Impostazioni → Importa). Reimportando, gli eventi si aggiornano invece di duplicarsi.
Il pallino sull'icona dell'app mostra quante scadenze sono da gestire (dove supportato).

## Struttura

```
src/
  firebase-config.js      config da variabili d'ambiente; se manca → modalità locale
  lib/tipi.js             tipologie: campi, scadenze proposte, icone (aggiungi qui una tipologia)
  lib/scadenze.js         regole di dominio pure: ricorrenze, stati, pagamenti, proiezione, storico, migrazione
  lib/store.js            stato reattivo + API dati usata dalle viste
  lib/backend-firebase.js Auth + Firestore con cache offline persistente
  lib/backend-local.js    stesso contratto su localStorage
  lib/dates.js, ics.js, download.js, ui.js
  views/                  Scadenze, Voci, Andamento, Login
  components/             form voce/scadenza/pagamento/spesa, filtri, grafico, impostazioni
tests/                    node:test sulla logica
firestore.rules           regole di sicurezza
```

Dati su Firestore: `users/{uid}/voci/{id}`, `users/{uid}/pagamenti/{id}`, `users/{uid}/meta/impostazioni`.

## Limiti noti

- Niente notifiche push: servirebbe una Cloud Function (piano a consumo). I promemoria passano dal calendario.
- Il primo accesso su un dispositivo richiede internet; dopo funziona anche offline e sincronizza al ritorno della rete.
