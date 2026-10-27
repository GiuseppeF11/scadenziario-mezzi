# Scadenziario Mezzi

PWA (Vue 3 + Vite) per tenere sotto controllo **assicurazione, revisione e bollo** dei mezzi di famiglia.
Si installa sul telefono come un'app, funziona offline, non ha server né account: i dati restano sul dispositivo.

## Funzioni

- **Scadenze**: prossima scadenza in evidenza, lista per mese, colori rosso / giallo (entro 30 gg) / verde.
  Tocca una scadenza → *Segna pagata/fatta* (la data avanza da sola, con Annulla) o *Google Calendar*.
- **Mezzi**: aggiungi, modifica, elimina. Scadenza assicurazione calcolata dall'ultimo pagamento (+6 o +12 mesi).
- **Spese**: proiezione dei prossimi 12 mesi (comprese seconde rate semestrali, bolli annuali, revisioni biennali) e quota mensile da accantonare.
- **Impostazioni** (ingranaggio): costo revisione, export `.ics` con promemoria a 30 e 7 giorni, backup/ripristino JSON.
- Pallino con il numero di scadenze urgenti sull'icona dell'app (dove il launcher lo supporta).

## Avvio in locale

```bash
npm install
npm run dev      # http://localhost:5173 (con --host lo apri anche dal telefono sulla stessa Wi-Fi)
npm test         # test della logica date/scadenze (node --test, nessuna dipendenza)
npm run build    # produzione in dist/
```

> Il service worker (offline + installazione) è attivo solo nella build: per provarlo usa `npm run build && npm run preview`.

## Pubblicazione gratuita su GitHub Pages

1. Crea un repository su GitHub (anche privato va bene con piano Pro; pubblico con piano free) e fai push del progetto sul branch `main`.
2. Su GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Il workflow `.github/workflows/deploy.yml` esegue test e build a ogni push. L'indirizzo sarà `https://<tuo-utente>.github.io/<nome-repo>/`.

In alternativa: Netlify o Vercel (build `npm run build`, cartella `dist`). Il `base: './'` in `vite.config.js` funziona ovunque.

## Installazione sul telefono (Android)

1. Apri l'indirizzo con **Chrome**.
2. Menu ⋮ → **Installa app** (o *Aggiungi a schermata Home*).
3. Prima volta: ⚙️ → **Ripristina da backup** → scegli `dati/mezzi-iniziali.json` (i 4 mezzi dello scadenziario Excel). Copia il file sul telefono o su Drive prima.

## Promemoria

L'app non manda notifiche push (servirebbe un server). Gli avvisi li fa il calendario:

- **Un evento alla volta**: tocca la scadenza → *Google Calendar*, poi aggiungi una notifica all'evento.
- **Tutte insieme**: ⚙️ → *Esporta scadenze nel calendario* crea un `.ics` con due avvisi per evento (30 e 7 giorni prima).
  Su Android l'app Google Calendar non importa i `.ics`: importalo da computer su calendar.google.com → ⚙️ Impostazioni → *Importa ed esporta*.
  Il Calendario Samsung invece lo apre direttamente. Reimportando, gli eventi si aggiornano (UID stabili) invece di duplicarsi.

## Dati e backup

- Salvati in `localStorage` del browser con chiave `scadenziario-mezzi.v1`.
- Se disinstalli l'app o cancelli i dati di Chrome **si perdono**: l'app ricorda di fare un backup ogni 60 giorni.
- La cartella `dati/` è in `.gitignore`: non pubblicare i tuoi dati su GitHub.

## Struttura

```
src/
  lib/dates.js       date di calendario (DATA.MESE, fine mese, formattazione it-IT)
  lib/scadenze.js    regole di dominio: scadenze, stati, proiezione 12 mesi, "segna fatto"
  lib/ics.js         export calendario + link Google Calendar
  lib/store.js       stato reattivo + persistenza (unico punto da cambiare per passare a un backend)
  lib/download.js    salvataggio file (menu Condividi su mobile, download su desktop)
  views/             Scadenze, Mezzi, Spese
  components/        form mezzo, conferma "fatto", impostazioni, bottom sheet, targa
tests/               test node:test sulla logica
```

## Evoluzioni possibili

- **Sync tra dispositivi**: riscrivere `load()/save()` in `store.js` verso un backend (PocketBase self-hosted, Firebase, Supabase) mantenendo la stessa API.
- **Notifiche push vere**: backend + Web Push, oppure versione nativa (Flutter con `flutter_local_notifications`) riusando le stesse regole di `scadenze.js`.

## Regole usate

- Assicurazione: scadenza = ultimo pagamento + 6 mesi (semestrale) o + 12 (annuale), con fine mese corretto (31/08 + 6 mesi = 28/02).
- Bollo: salvato come ultimo giorno del mese di scadenza; pagato → +12 mesi.
- Revisione: fatta il giorno X → prossima entro fine mese di X + 24 mesi.
- Costo revisione: valore indicativo modificabile, da verificare col proprio centro.
