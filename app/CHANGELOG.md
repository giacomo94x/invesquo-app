# Finholdra — Changelog cumulativo

Tutte le note delle precedenti beta sono raccolte qui. Lo storico più recente è in alto.

## Beta 10.9.22 — 22 novembre 2026

- **Grafico Patrimonio e valore:** corretto tracciamento del cursore in fullscreen ruotato su iPhone con coordinate dell'area SVG realmente disegnata, compresi i margini di adattamento.
- **Touch Safari:** introdotta gestione touch dedicata quando gli eventi pointer non vengono recapitati stabilmente.
- **Icone:** indicatori degli acquisti disegnati come simboli vettoriali e dimensioni dei comandi protette dalle deformazioni della vista orizzontale.
- **Dati finanziari:** invariati.

## Beta 10.9.21 — 22 novembre 2026

- **Mercati chiusi:** aggiunta l'opzione “Predefinito del tema” nel sottomenu del colore neutro. Preserva la palette di base del tema attivo anche nei weekend, lasciando Finn a riposo; disponibili ancora i colori dedicati e la tavolozza libera.
- **Compatibilità:** nessun intervento sui grafici o sui calcoli. Versione aggiornata nei file di rilascio.

## Beta 10.9.20 — 22 novembre 2026

- **Grafico Patrimonio e valore:** eliminata la regressione dei cursori in fullscreen: i movimenti non ricreano più l’intero SVG, ma aggiornano soltanto i marcatori e i dati selezionati.
- **Fullscreen e touch:** impedita la chiusura accidentale dopo il primo trascinamento. La cattura del puntatore rimane stabile anche con lo schermo ruotato su iPhone.
- **A↔B:** verificati trascinamenti ripetuti e indipendenti dei due cursori, con differenza in euro e percentuale aggiornata.
- **Altre funzioni:** mantenuti 1S predefinito, zoom, acquisti, linee del patrimonio, capitale e storico esistenti. Versione app, manifest e `version.json` aggiornati.

## Beta 10.9.19 — 22 novembre 2026

- **Grafico Patrimonio e valore a schermo intero:** ripristinate proporzioni corrette dello SVG (senza stretching) e adattamento alla superficie realmente disponibile su iPhone ruotato.
- **Confronto A↔B:** due marcatori indipendenti trascinabili, date e valori dei due punti più differenza assoluta e percentuale.
- **Precisione touch:** coordinate convertite con la matrice grafica reale, inclusa la rotazione dell'interfaccia; lettura aggiornata senza rimuovere il grafico durante il trascinamento.
- **Versione:** allineati interfaccia, manifest e version.json a 10.9.19.

## Beta 10.9.18 — 22 novembre 2026

- **Home, Patrimonio e valore:** periodo predefinito 1S (7 giorni), modificabile con gli altri selettori.
- **Grafico fullscreen:** riadattata la disposizione al modello della sezione Investimenti, lasciando il massimo spazio possibile al grafico.
- **Touch iOS:** corretto il trascinamento del cursore nel fullscreen ruotato: asse delle date interpretato sull’asse verticale dello schermo fisico; SVG mantenuto stabile durante il movimento, per non perdere la cattura del tocco.
- **Versione:** aggiornati interfaccia, manifest e `version.json` alla Beta 10.9.18.

# Finholdra — Changelog cumulativo

Tutte le modifiche, dalla versione più recente.

## Beta 10.9.17 — 22 novembre 2026

- **Dashboard:** fusi i grafici Andamento patrimonio e Capitale/Valore nel singolo grafico **Patrimonio e valore**, con capitale investito (giallo), valore del patrimonio (segmenti verdi e rossi in funzione del rendimento netto flussi) e marcatori degli acquisti. La serie storica e le quantità restano ricostruite dall'Archivio.
- **Schermo intero:** layout più ampio ispirato al grafico Investimenti, grafico dominante, lettura per data, frecce per muoversi fra i punti, zoom, Ripristina e confronto A↔B. Su iPhone resta la vista orizzontale.
- **Home:** Fotografia del patrimonio (report PDF) spostata alla fine della Dashboard. Rimossi dalla vista i due grafici separati.
- **Aspetto:** nel sottomenu dei mercati chiusi aggiunta l'opzione Personalizzato con tavolozza cromatica; tonalità salvata nelle preferenze locali.
- **Versione:** interfaccia, manifest, version.json e changelog allineati alla 10.9.17.

## Beta 10.9.16 — 22 novembre 2026

- **Home:** risolto blocco di inizializzazione del componente grafici (listener fullscreen registrati prima della creazione della finestra). Ripristinata la visualizzazione di Patrimonio e Capitale/Valore.
- **Affidabilità:** i grafici originali restano visibili se il componente nuovo non restituisce dati o si verifica un errore. Nessuna modifica ai calcoli e alle quotazioni storiche.
- **Interfaccia:** grafici con periodi, calendario, selezione date, confronto A↔B e fullscreen; sostituite le descrizioni tecniche con una frase breve per grafico.
- **Versione:** Beta 10.9.16 nei file di rilascio.

## Beta 10.9.15 — 22 novembre 2026

- **Home · allocazione:** Oggi/Investito e filtri delle categorie seguono il colore dinamico effettivo della Home, anche durante la chiusura dei mercati; eliminati blu fissi.
- **Grafici Home:** nuovo motore visivo condiviso fra Patrimonio e Capitale/Valore, con periodi 1G, 1S, 1M, 3M, 6M, 1A e MAX, selettore calendario a icona, lettura precisa sul tocco, selezione A↔B, zoom e apertura orizzontale a pieno schermo. Le valutazioni e quantità continuano a provenire dall'archivio già verificato.
- **Finn City:** sprite Finn copiato proporzionalmente dalla geometria di gioco di FinnSolid, anche per NPC e agenti, cambiandone palette, sia su Canvas sia SVG per iPhone.
- **Natale:** cappello riallineato sopra la testa di Finn e ornamenti, pulsanti e banner festivi.
- **Liquid Glass:** pannelli traslucidi, effetto sfocato/saturato, riflessi e pulsanti pill più vicini alla grafica iOS; Flat e Moderno invariati.
- **Stili:** Studio, Fiducia e Tradizionale differenziati; introdotti Arcade ed Editoriale.
- **Temi:** aggiunti Rame, Artico e Neon.
- **Impostazioni:** scelta colore neutro spostata dentro un sottomenu del colore dinamico.
- **Build:** changelog unico; interfaccia, manifest e version.json aggiornati a 10.9.15.

## Beta 10.9.14 — 22 novembre 2026

- **Allocazione Home:** corretto il bordo esterno del donut. Non usa più una tinta troppo scura: ora riprende il colore di fondo della schermata Home, cioè la stessa superficie visibile tra un banner e l’altro.
- **Coerenza temi:** il bordo del donut rimane uniforme con il fondo anche nei temi dinamici e nelle schermate a mercati chiusi.
- **Versione:** aggiornati interfaccia, `version.json` e manifest a Beta 10.9.14.

## Beta 10.9.13 — 22 novembre 2026

- **Mercati chiusi:** aggiunto il selettore del colore della schermata neutra della Dashboard quando i mercati sono chiusi. Opzioni: giallo Finholdra, blu ghiaccio, prugna e verde bosco.
- **Temi:** aggiunto il nuovo tema colore **Sunset · rosé sera**.
- **Stile natalizio:** nuova modalità **Natale** nell’aspetto, con dettagli grafici festivi e cappello di Babbo Natale su Finn.
- **Mascotte:** Finn conserva la modalità riposo a mercati chiusi e adotta la palette chiusa selezionata dall’utente.
- **Versione:** aggiornati interfaccia, `version.json` e manifest a Beta 10.9.13.

## Beta 10.9.12 — 22 novembre 2026

- **Home:** rimossi dai grafici i comandi superflui “Recupera chiusure giornaliere” e “Ripristina periodo”; mantenuta la selezione delle date e dei periodi, con recupero dati da Impostazioni → Archivio quotazioni giornaliere.
- **Stabilità:** rimossi i riferimenti agli elementi eliminati, senza modificare le funzioni di ricostruzione storica, la visualizzazione a schermo intero o gli altri moduli.
- **Versione:** aggiornati interfaccia, `version.json` e manifest a Beta 10.9.12.

## Beta 10.9.11 — 22 novembre 2026

- **FinnSolid:** scelta della difficoltà spostata nella schermata iniziale della campagna; eliminato il banner fisso durante il gioco. Interfaccia in partita più pulita: rimossi i testi sovrapposti di briefing/obiettivo e la lunga guida ai comandi; il pulsante Radar conserva gli avvisi e apre il briefing a richiesta. Restano visibili i tre cuori, il tempo, le risorse e gli indicatori di allarme.
- **Finn City:** sprite di Finn, NPC e poliziotti riallineati alla figura a candela di FinnSolid, con colori diversi per i personaggi. Pugni con animazione del braccio, spari con pallini/proiettili in movimento e collisioni effettive, rappresentati sia nel Canvas sia nell'SVG per Safari iOS.
- **Mappa di Finn City:** introdotti litorale e spiaggia con palme, ombrelloni e onde; fiume e due ponti attraversabili, più quartieri e punti d'interesse caratterizzati. Gli edifici non invadono più i nuovi elementi naturali.
- **Distribuzione:** file `CHANGELOG.md` cumulativo, numero di versione coerente fra interfaccia, `version.json` e manifest.

## Beta 10.9.10 — 22 novembre 2026

- **Home · Andamento patrimonio:** stessa impostazione grafica e stessi pulsanti periodo di Capitale e valore (1S, 1M, 3M, 6M, 1A, MAX).
- **Schermo intero:** finestra immersiva orizzontale su iPhone come Capitale e valore, con lettura per data, zoom e confronto A↔B.
- **Storico invariato:** mantenute le quantità ricostruite dall’Archivio operazioni e le quotazioni giornaliere già corrette in Beta 10.9.9.
- **Indicazioni grafiche conservate:** acquisti 💰 e segmenti verdi/rossi.
- **Pacchetto semplificato:** tutte le precedenti note beta TXT confluiscono in questo unico file.

## Beta 10.9.6

- Grafico andamento Patrimonio: ricostruzione giornaliera basata sulle operazioni datate in Storico > Archivio, con quantità cumulative dopo acquisti e vendite. Non impiega le vecchie fotografie per dedurre quote storiche.
- Valutazione: quantità del giorno × quotazione storica dal registro chiusure; cambio storico se necessario; conti deposito e buoni trattati secondo movimenti/documentazione disponibili. Sabati e festivi possono utilizzare l'ultima chiusura verificata del singolo strumento.
- Evidenziazione dei giorni mancanti con ragioni per strumento, senza inventare totali.
- Operazioni ereditate senza data effettiva (data di migrazione presunta 03/11/2026): segnalate come non sufficienti a dimostrare che la posizione fosse già posseduta in precedenza. Correggere la data effettiva in Storico > Archivio per rendere verificabile la ricostruzione.
- Archivio quotazioni giornaliere: nuova macro-categoria autonoma nelle Impostazioni, con Recupera e Importa.
- Versione app 10.9.6 nei file di release.

IMPORTANTE: per completare i giorni tra 26/10 e 05/11 devono risultare registrate le effettive date di possesso e le quotazioni corrispondenti. Dove l'archivio non contiene date certe, il programma non inventa valori.

## Beta 10.9.5

- Bordo grafico allocazione: stessa tinta del fondo Home, leggermente più scura; reattivo al cambio tema.
- Archivio chiusure 2026: recupero per tutti gli asset disponibili dal 01/01/2026, con distinzione per fonte e date.
- Grafico Patrimonio: non riempie più le giornate mancanti copiando il totale del giorno precedente; usa solo valori completi e prezzi portati avanti per le sole giornate di mercato chiuso.
- Resoconto recupero per strumento (giorni disponibili e mancanti).
- Versione app, version.json e manifest: 10.9.5.

Nota: le chiusure dipendono dalle fonti di mercato. Titoli senza dati, valute non recuperate e valori prima delle date documentate di possesso non vengono inventati.

## Beta 10.9.3

- Finn City: corretto ID pulsante ftaRide -> ftaInteract che causava crash in status() e impediva il rendering.
- SVG renderer indipendente per mappa e minimappa iPhone; test sintetico browser con contenuti grafici verificati.
- Dashboard: Patrimonio e Capitale/Valore a schermo intero orizzontale, con zoom e confronto A/B per Patrimonio.
- Restano le correzioni FinnSolid 15-16 della Beta 10.9.2.

## Beta 10.9.2

- FinnTheftAuto: canvas disegnato subito all’apertura, ridimensionamento iOS, rendering resiliente e fallback grafico.
- FinnSolid: menu segreto con tutte le 16 missioni, pulsanti su 4 colonne.
- FinnSolid missioni 15 e 16: pattuglie attive, mantenuto boss Liquid Leverage e la fuga in jeep.
- Messaggio introduttivo missione: sparisce appena Finn inizia a muoversi; dialoghi successivi restano normali.

## Beta 10.9.1

Quarto gioco: FinnTheftAuto
- Finn City: mondo libero 4032x4032 con quartieri e luoghi ispirati alla finanza.
- Vista dall’alto originale, mappa e minimappa.
- Traffico simulato, pedoni, vetture guidabili, movimento, interazione, corpo a corpo e arma.
- Livello di ricercato da zero a cinque stelle, inseguimento della polizia.
- Menu giochi aggiornato a quattro titoli.
- Salvaguardate le precedenti funzionalità della 10.9.0.
- Controlli mobili e tastiera.

Non utilizza sprite, musiche, mappe o personaggi di GTA.

## Beta 10.9.0

- Storico Home: parti dalla data della prima posizione documentata e dalle quotazioni archiviate, non dalla prima rilevazione dell’app.
- Capitale/valore: stessa serie completa dello storico selezionato.
- FinnSolid: bug Riprova corretto, difficoltà Facile/Difficile, fase jeep con Mira dopo Liquid al 15, poi inseguimento finale al 16.
- Dati anteriori all’acquisto non vengono presentati come patrimonio posseduto.

## Beta 10.8.8

- Riparato il blocco JavaScript di Nexus: un apostrofo non escapato impediva ai comandi di funzionare.
- Le 4 domande di Nexus ora funzionano e si riferiscono al mercato selezionato.
- Ricerca notizie per titolo tramite funzione Netlify server-side (Google News RSS + fallback Bing News), con link di verifica e nessun risultato inventato.
- Resta disponibile il collegamento esterno quando le fonti non rispondono.

## Beta 10.8.7

- Nexus in Radar: rimossi i comandi News.
- Nuovi comandi: Mercato selezionato, Titoli del Paese, Insight esclusivo, Come leggere i dati.
- Nexus ora commenta i titoli del paese selezionato e fornisce una sintesi extra basata sulle righe caricate nel Radar.

## Beta 10.8.6

- Corretto il wordmark Finholdra nell'header: stessa grafica della sezione News, stessa scala percepita ma senza il taglio in basso a sinistra.
- Aggiornato il numero di beta visualizzato a 10.9.1.

## Beta 10.8.5

FinnSolid: 16 missioni, nuovi passaggi dal radar al duello e fuga finale in jeep. Liquid Leverage arrabbiato, con sopracciglia e bocca aggressive. Progressi precedenti mantenuti.

## Beta 10.8.4

- Grafico capitale e valore per le categorie attive in fondo alla Dashboard, con dettaglio interattivo e ingrandimento.
- Mira resta presente nei dialoghi codec di FinnSolid, ma non appare sul campo né come pulsante alleato.
- Zoom sul ritratto di Finn nel codec; Nexus in Radar con inquadratura meno ravvicinata e frame uguale a Mira.

## Beta 10.8.3

- Nexus e Mira hanno animazioni leggere dei ritratti in Radar e Academy; supporto riduzione movimento.
- Liquid Leverage, boss finale di FinnSolid, ora e un rivale rosso di Finn con bandana blu e movimenti animati.
- Nessuna modifica alle hitbox, alle soglie o alla progressione.

## Beta 10.8.2

Finholdra Beta 10.8.2: Mira, avatar tattico con bandana nei codec e alleata nelle missioni 10 e 12, interazione di supporto nel gioco; avatar Academy con capelli castani senza bandana, tutor del quiz. Tutte le funzioni precedenti conservate.

## Beta 10.8.1

Nexus ora usa il volto e gli occhiali della seconda proposta con cappello a tesa della terza. Nuovo ritratto in Radar e in tutte le comunicazioni codec di FinnSolid. Aggiunte risorse nexus-portrait.webp e nexus-full.webp.

## Beta 10.8.0

- Opzione colore weekend giallo on/off
- FinnSolid: gadget EMP/fumo/esca con pulsanti distinti e meccaniche indipendenti
- Dialoghi Codec visuali prima di ogni missione (Nexus e Finn, personaggi originali)
- Nexus in coda a Radar, con risposte basate esclusivamente sui dati e notizie attualmente recuperati
- Conserva l'importazione/esportazione dei backup e tutte le altre funzioni.

## Beta 10.7.4

Finholdra Beta 10.7.4 — Dashboard neutra in giallo oro (mercati chiusi). Palette rossa e verde invariate; nessuna modifica ai dati o ai backup.

## Beta 10.7.3

Statistiche: intervalli e ambito massimo/minimo selezionati ora in oro con testo scuro e bordo visibile.

## Beta 10.7.2

Finholdra Beta 10.7.2 - Versione corretta in app; FinnSolid selezione livelli come overlay senza ridimensionare canvas; pulsante radar per rileggere il briefing; icone gadget EMP, fumo ed esca ridisegnate.

## Beta 10.7.0

Finholdra Beta 10.7.0 - FinnSolid: campagna completa 14 missioni, nuovi gadget, dialoghi, stealth, boss finale, salvataggio progressi, segreto per selezione livelli. Mantiene gli 8 livelli precedenti.

## Beta 10.6.12

- Statistiche: correzione della variabile di risultato non definita che impediva la visualizzazione.
- Home weekend: palette più gialla e luminosa.
- Sotto la lente: Ultimo acquisto vs minimo + PMC vs minimo, scala verde sotto 0, giallo 0-3, arancione 3-10, rosso oltre 10%.
- Impostazioni: Giochi di Finn diventa categoria separata in fondo, impostazioni mascotte restano in Aspetto.

## Beta 10.6.11

Finholdra Beta 10.6.11. Correzioni grafiche, icone, confronto sotto la lente, statistiche e grafico ingrandito. Nessun dato personale incluso.\n

## Beta 10.6.10

Weekend: palette dinamica ambra più gialla e luminosa, tema scuro e chiaro. Nessuna modifica alle altre funzioni.

## Beta 10.6.8

- Banner rendimento lordo in Home totale e per categoria.
- Sotto il totale patrimonio soltanto differenza euro, non percentuale.
- Legenda categorie senza riquadri colorati aggiuntivi.
- Sabato e domenica con tema dinamico: ambra neutro, anche durante caricamento.
- Finn nel weekend riposa e occasionalmente pensa; particelle € $ ¥.
- Mantiene Statistiche 10.6.7 e grafici 1S/3M.

## Beta 10.6.7

Finholdra Beta 10.6.7: Statistiche per tutti gli strumenti (inclusi quelli liquidati), grafici di valore/ capitale osservato, rendimenti calcolabili e intervalli; nuovi 1S e 3M per azioni ed ETC/ETN. Le statistiche segnalano dati storici mancanti e non offrono previsioni di profitto.

## Beta 10.6.5

Header: sfumatura uniforme a tutta larghezza, anche Liquid Glass. Finn mascotte e giochi in Aspetto; controlli originali preservati.

## Beta 10.6.4

Beta 10.6.4: palette mercato più intense, ambito configurabile, riferimento chiusura precedente nei grafici 1G quando disponibile.

## Beta 10.6.3

Correzione desktop/orizzontale: sfondo header a piena larghezza identico allo sfondo della pagina anche durante lo scroll. Nessuna modifica alle funzioni o ai backup.

## Beta 10.6.2

Backup automatico Google Drive opzionale per profilo e dispositivo. Frequenza 15 min–7 giorni, default 1 ora. Copia separata da quella manuale. Token in memoria; riconnessione dopo scadenza o riapertura. Nessun servizio in background.

## Beta 10.6.1

Accesso con Google Drive visibile in entrambe le schede iniziali. Recupera i backup privati tramite il flusso OAuth già configurato in 10.6.0. Il login locale e da JSON sono invariati.

## Beta 10.5.2

Palette Home autonome rosso/verde, header uniforme; Radar: fonte alternativa TradingView, collegamento ufficiale ETF Milano, controvalore ufficiale quando recuperabile, widget quotazioni in caso di indisponibilità. Le fonti esterne possono bloccare il browser: nessun dato simulato.

## Beta 10.5.1

Radar: ETF Milano e fallback USA su selezione monitorata; rete non garantita. Finn: palette coerente, lente senza tocco, palette in Aspetto. Home: tinta dal primo preferito, neutra senza dati validi.

## Beta 10.5.0

10.5.0 — Finn Radar: classifiche Yahoo, news RSS Google, filtri geografici, animazioni. Fonti browser best effort; nessun dato fittizio. Controvalore stimato. Nessun backend richiesto.

## Beta 10.4.1

Finn Radar: analisi locale di Form 4 XML importati, cluster USA, filtri e comandi; fonti ufficiali esterne. Nessun server richiesto. Nessun monitoraggio automatico o notifiche.

## Beta 10.4.0

Finn Radar: prototipo SEC Form 4 e nuovi Schedule 13D, cluster USA, archivio locale e comandi. Per funzionare serve deploy Netlify con Functions (non semplice Drop statico) e variabile SEC_USER_AGENT con nome app e contatto email. Nessuna credenziale privata nel client. La funzione legge un campione limitato di documenti recenti; non garantisce copertura, recupero giorni precedenti o alert immediati. Italia/13F solo collegamenti ufficiali; nessun report programmato, canale esterno o chatbot generativo.

## Beta 10.3.1

Larghezza condivisa per header, navigazione e sezioni su desktop e landscape. Vista verticale invariata.

## Beta 10.3.0

Grafico patrimonio con saldo al netto di acquisti/vendite, marker quantità, layout e trasferimento manuale JSON tramite cloud privato. Nessuna sincronizzazione automatica. I dati mancanti restano mancanti; le rilevazioni indicative non sono chiusure ufficiali.

## Beta 10.2.1

Archivio e grafico locali indipendenti dalla rete; recupero progressivo con timeout; calendario sulla stessa riga; ripristino prezzi archiviati dal JSON.

## Beta 10.2.0

Finholdra 10.2.0
Grafico patrimonio ricostruito con quantità giornaliere ricavate a ritroso dal registro delle transazioni e chiusure da archivio per strumento.
Archivio chiusure giornaliere in Impostazioni → Portafoglio; aggiornamento quando app aperta, senza background server e con indicazione della fonte.
Calendario personalizzato grafici singoli titoli (predefinito fine oggi).
Header orizzontale e desktop allineato larghezza contenuti.
Dati incompleti non generano un totale parziale.

## Beta 10.1.7

Beta 10.1.7: Grafico Home usa solo snapshots reali osservati, senza ricostruzioni e trascinamenti del giorno precedente. Scelta data iniziale. Grafici titoli con intervallo personalizzato da/al (giorno/mese/anno) con prezzi storici verificati. Nessuna modifica alle transazioni o al portafoglio.

## Beta 10.1.6

- Storico > Archivio: aggiunta la piccola icona categoria (Azioni/ETF/Obbligazioni ecc.) accanto al logo del titolo, in linea con la sezione Investimenti.

## Beta 10.1.5

Beta 10.1.5: Archivio Storico mostra un solo logo per operazione, identico a quello di Investimenti. Rimossa icona generica accanto al logo. Nessuna modifica ai dati finanziari.

## Beta 10.1.4

Beta 10.1.4: Archivio Storico utilizza ora il logo originale dello strumento e il glifo della categoria già condivisi da Investimenti e Academy. Nessuna modifica ai dati o alle operazioni.

## Beta 10.1.3

FINHOLDRA Beta 10.1.2 - Accesso cloud da nuovo dispositivo

Corretto il rientro dal link di accesso Supabase: quando non esiste un profilo locale sbloccato, Finholdra crea un profilo locale separato e lo collega all’utente cloud; non tocca i profili precedenti.

Nel pannello iniziale e` disponibile anche “Accedi con il cloud”. Se il backup e` gia` stato caricato da un altro dispositivo, viene recuperato dopo l’autenticazione.

IMPORTANTE: richiedere il link e aprirlo nello stesso browser; Safari e l’app installata possono avere archivi separati.

1. Sul dispositivo principale, accedi al tuo profilo esistente, collega l’account email in Impostazioni, e premi “Salva nel cloud”. Controlla la conferma.
2. Sul nuovo dispositivo, dalla schermata iniziale premi “Accedi con il cloud” e conferma il link ricevuto nella stessa app/browser. Il portafoglio verra` recuperato se il database contiene gia` un backup.
3. Verificare su Supabase Authentication > URL Configuration che Site URL e Redirect URL puntino al dominio pubblicato.

Non eliminare i backup JSON locali finche` un ripristino reale su due dispositivi non ha avuto successo.

Beta 10.1.3: rimossa la prima voce duplicata e vuota 'Finn · Mascotte e giochi' nelle impostazioni Portafoglio. Mantenuta la voce funzionante e la sezione Gioca con Finn.
