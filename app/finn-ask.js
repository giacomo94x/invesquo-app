/* Beta 10.9.72 — optional server AI + offline, explainable financial context. */
(()=>{'use strict';
const q=id=>document.getElementById(id);
const questions={trend:'Come sta andando questo titolo? Analizza la direzione e i limiti dei dati disponibili.',auction:'Come potrebbe andare questo titolo oggi, guardando i prezzi e i volumi dei primi minuti dopo l’apertura? Distingui uno scenario da una previsione certa.',us:'Se questo titolo è quotato anche negli USA, come è andato il titolo americano dopo la chiusura di Milano? Confronta le variazioni percentuali, con le date e gli orari.',risk:'Quali rischi, segnali contrari e limiti dei dati dovrei considerare?',pmc:'Confronta prezzo corrente e prezzo medio di carico, senza suggerire ordini di acquisto o vendita.'};
let busy=false,requestToken=0;
function num(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function snapshot(){
 let a;try{a=typeof getDetailAssetById==='function'?getDetailAssetById(assetDetailId):null;}catch(_){}if(!a)return null;
 const points=(typeof assetDetailPoints!=='undefined'&&Array.isArray(assetDetailPoints)?assetDetailPoints:[]).filter(p=>Number.isFinite(Number(p.p))&&Number(p.p)>0&&Number.isFinite(Number(p.t))).slice(-80).map(p=>({t:Number(p.t),p:Number(p.p)}));
 const last=points.at(-1),first=points[0];
 const quote=num(a.p),pmc=a.finholdraWatchOnly?null:num(a.pmc);
 return {id:String(a.id||''),name:String(a.name||'').slice(0,120),symbol:String(a.symbol||'').slice(0,35),category:String(a.cat||''),market:String(a.exchange||a.market||'').slice(0,45),currency:String((typeof currencyOf==='function'?currencyOf(a):a.currency)||'').slice(0,8),price:quote,pmc,points,period:String(typeof assetDetailRange!=='undefined'?assetDetailRange:'')};
}
function localAnswer(question,info){
 if(!info)return 'Apri un titolo per iniziare.';
 const ps=info.points,initial=ps[0],last=ps.at(-1),change=initial&&last&&initial.p>0?(last.p/initial.p-1)*100:null,fmt=n=>Number.isFinite(n)?n.toFixed(2).replace('.',','):'n.d.';
 let text='Analisi locale di Finn — senza modello AI connesso.\n';
 text+='Titolo: '+info.name+(info.symbol?' ('+info.symbol+')':'')+'. '+(Number.isFinite(info.price)?'Ultimo prezzo registrato: '+fmt(info.price)+' '+info.currency+'. ':'Ultimo prezzo non verificato. ');
 if(ps.length>=2)text+='Nel grafico selezionato risultano '+ps.length+' osservazioni: variazione tra prima e ultima '+(change>=0?'+':'')+fmt(change)+'%. ';else text+='Serie storica insufficiente per misurare una variazione del periodo. ';
 const auction=/asta|volum|previs|apertura|prossima seduta|market auction|volume profile|poc|hvn|lvn|value area|vah|val|oggi|primi minuti/i.test(question);const usCompare=/negli usa|americana|chiusura di milano|nasdaq|wall street/i.test(question);
 if(auction){
  const o=info.marketContext?.marketData;
  if(o?.status==='available'){
   const label=o.signal==='above'?'rialzista (prezzo sopra la fascia iniziale)':o.signal==='below'?'ribassista (prezzo sotto la fascia iniziale)':'neutrale (prezzo nella fascia iniziale)';
   text+='\nScenario per oggi: '+label+'. Nella prima fascia di 15 minuti il massimo è '+fmt(o.high)+' e il minimo '+fmt(o.low)+' '+info.currency+'; ultimo dato osservato '+fmt(o.last)+' '+info.currency+'. ';
   if(o.volumeAvailable)text+='Volumi prime candele: '+Math.round(o.openingVolume).toLocaleString('it-IT')+'; volumi candele successive comparabili: '+Math.round(o.laterVolume).toLocaleString('it-IT')+'. ';else text+='Non sono disponibili volumi sufficienti per confermare il movimento. ';
   text+='Il superamento o il rientro nella fascia iniziale è un indizio, non una previsione affidabile della chiusura.';
  }else text+='\nPer stimare scenari intraday basati sui primi 15 minuti servono prezzi e volumi realmente pubblicati della seduta. '+(o?.reason||'Non sono disponibili dati di apertura aggiornati.')+' Finn non produce un segnale rialzista/ribassista senza questi dati.';
 } else if(usCompare){
  const u=info.marketContext;
  if(u?.status==='available'&&u.usa){
    const time=t=>new Date(t).toLocaleString('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    text+='\nQuotazione USA '+u.usa.symbol+': '+(u.usa.changePct>=0?'+':'')+fmt(u.usa.changePct)+'% nella seduta '+u.usa.sessionDate+'. ';
    if(u.afterMilan)text+='Dopo le 17:30 italiane, nella seduta '+u.afterMilan.sessionDate+', tra '+time(u.afterMilan.fromTime)+' e '+time(u.afterMilan.toTime)+', variazione circa '+(u.afterMilan.changePct>=0?'+':'')+fmt(u.afterMilan.changePct)+'% su candele da 15 minuti. ';
    else text+='Dati intraday insufficienti per isolare il movimento successivo alle 17:30 italiane: il dato della seduta intera non equivale al movimento dopo Milano. ';
    if(u.italy)text+='Ultima giornata disponibile a Milano '+u.italy.symbol+': '+(u.italy.changePct>=0?'+':'')+fmt(u.italy.changePct)+'% (seduta '+u.italy.sessionDate+'). ';
    text+=(u.matching==='name_match'?'La corrispondenza è stata trovata per nome, non verificata tramite ISIN: confrontala prima di considerarla lo stesso titolo. ':'')+'Non significa che la variazione USA successiva alla chiusura italiana si trasferirà automaticamente alla riapertura di Milano. Contano cambio, spread e notizie.';
  } else text+='\nNon ho trovato una quotazione USA attendibile e aggiornata da confrontare. Per ETF e titoli senza corrispondente diretto non è corretto sostituire un indice o un ETF americano come se fosse lo stesso strumento.';
 } else if(/pmc|carico|acquisto|prezzo medio/i.test(question)){if(Number.isFinite(info.pmc)&&info.pmc>0&&Number.isFinite(info.price))text+='\nPrezzo rispetto al PMC: '+(info.price>=info.pmc?'+':'')+fmt((info.price/info.pmc-1)*100)+'%. Il confronto non include costi, fiscalità e rischio futuro.';else text+='\nPMC o prezzo non disponibile: confronto non calcolabile.';}
 else if(/risch|perdite|criticit/i.test(question))text+='\nRischi da verificare: volatilità, liquidità, spread, valuta, eventuale leva, concentrazione del portafoglio. I dati del grafico da soli non descrivono questi rischi in modo completo.';
 else text+='\nLa direzione passata non determina il movimento futuro. Valuta liquidità, volumi effettivi, notizie e orario della rilevazione prima di trarre conclusioni.';
 return text+'\n\nFonte: dati della scheda e, quando disponibili, quotazioni Yahoo verificate via server. Nessun dato di asta inventato e nessuna raccomandazione di investimento.';
}
async function contextFor(question,info){
 const mode=/negli usa|americana|chiusura di milano|nasdaq|wall street/i.test(question)?'us':/asta|volum|previs|apertura|oggi|primi minuti|volume profile|market auction/i.test(question)?'opening':null;
 if(!mode)return null;
 if(mode==='us'&&!String(info.symbol).toUpperCase().endsWith('.MI'))return {kind:'us',status:'not_italian'};
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8500);
 try{const url='/.netlify/functions/finn-market-context?kind='+mode+'&symbol='+encodeURIComponent(info.symbol)+'&name='+encodeURIComponent(info.name);
 const resp=await fetch(url,{signal:ctrl.signal});return resp.ok?await resp.json():{status:'unavailable'};
 }catch(_){return {status:'unavailable'}}finally{clearTimeout(timer)}
}
async function ask(question){const output=q('fhFinnResponse'),button=q('fhFinnSend'),info=snapshot();if(!output||!info||busy)return;
 const token=++requestToken;busy=true;button.disabled=true;output.textContent='Finn sta analizzando i dati disponibili…';
 try{
  info.marketContext=await contextFor(question,info);if(token!==requestToken)return;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12500);
  let response;try{response=await fetch('/.netlify/functions/finn-ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:question.slice(0,400),asset:info}),signal:controller.signal});}finally{clearTimeout(timeout)}
  const payload=await response.json();if(token!==requestToken)return;
  if(response.ok&&payload.answer){output.textContent='Finn · AI\n'+payload.answer;return;}
  output.textContent=localAnswer(question,info)+'\n\n'+(response.status===503?'Per attivare risposte AI generative configura OPENAI_API_KEY nelle variabili Netlify.':'Il servizio AI non è disponibile: è stata usata l’analisi locale.');
 }catch(_){if(token===requestToken)output.textContent=localAnswer(question,info)+'\n\nServizio AI temporaneamente non disponibile.'}
 finally{if(token===requestToken){busy=false;button.disabled=false}}
}
q('fhFinnSend')?.addEventListener('click',()=>{const text=q('fhFinnQuestion')?.value?.trim();if(text)void ask(text);});
q('fhFinnQuestion')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();q('fhFinnSend')?.click();}});
q('fhFinnAsk')?.addEventListener('click',e=>{const b=e.target.closest('[data-finn-question]');if(!b)return;const question=questions[b.dataset.finnQuestion];if(!question)return;q('fhFinnQuestion').value=question;void ask(question);});
const title=q('assetDetailTitle');if(title)new MutationObserver(()=>{const a=snapshot();const usButton=q('fhFinnAsk')?.querySelector('[data-finn-question=us]');if(usButton)usButton.hidden=!(a?.symbol||'').toUpperCase().endsWith('.MI')||/ETF|ETC|ETN|FUND|OBBLIGAZION|FUTURE/i.test(a?.category||'');requestToken++;busy=false;if(q('fhFinnSend'))q('fhFinnSend').disabled=false;if(q('fhFinnResponse'))q('fhFinnResponse').textContent='Seleziona una domanda oppure scrivi la tua. Finn analizzerà il titolo attualmente aperto.';if(q('fhFinnQuestion'))q('fhFinnQuestion').value='';}).observe(title,{childList:true,characterData:true,subtree:true});
})();
