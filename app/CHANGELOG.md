## Beta 10.9.91 — Ripristino sezione Aspetto
- Corretto il nome cercato dal raggruppamento impostazioni: "Aspetto" (non solo "Aspetto e colori").
- Ripristinati Lingua, Tema, Stile, colore dinamico e le restanti impostazioni prima di Aspetto avanzato.
- Conservate le preferenze esistenti: nessun reset del profilo o dei salvataggi.
- Pacchetto completo del sito, incluse le funzioni Netlify già presenti nella beta 10.9.90; nessuna modifica alle funzioni.

## Beta 10.9.90 — Correzione distribuzione e salvataggio
- Tema e Stile nello stesso blocco Aspetto e realmente affiancati anche su iPhone (salvo schermi estremamente stretti).
- Salvataggio delle preferenze verificato leggendo il valore persistito; impossibile ricevere una falsa conferma di salvataggio se il profilo non è attivo o localStorage fallisce.
- Refresh Home grafico dopo applicazione delle preferenze, mantenendo i colori tema.
- I file non modificati, incluse netlify/functions, non fanno parte della patch. NON pubblicare lo ZIP incrementale da solo come deploy Netlify: sovrascrivere i singoli file nel repository GitHub mantenendo tutti gli altri.
