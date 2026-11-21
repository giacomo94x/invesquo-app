/* Finholdra Beta 10.6.7 · Asset statistics. Read-only; no fabricated quotes. */
(function(){
 'use strict';
 const root=document.getElementById('fh1067StatsView');if(!root)return;
 let selectedId='',span='90';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const euro=n=>Number.isFinite(n)?new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n):'n.d.';
 const percent=n=>Number.isFinite(n)?(n>0?'+':'')+new Intl.NumberFormat('it-IT',{maximumFractionDigits:2}).format(n)+'%':'n.d.';
 const dayValid=d=>/^\d{4}-\d\d-\d\d$/.test(String(d||''));
 const asDay=d=>String(d||'').slice(0,10);
 const dayNum=d=>Date.parse(d+'T12:00:00Z');
 const dayLabel=d=>dayValid(d)?new Date(dayNum(d)).toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'2-digit'}):'n.d.';
 const getAssets=()=>{
   const map=new Map();
   for(const a of state.assets||[])if(a?.id&&!a.finholdraWatchOnly)map.set(String(a.id),a);
   for(const t of trades||[]){if(!t?.asset)continue;const id=String(t.asset);if(!map.has(id))map.set(id,{id,name:t.assetName||t.symbol||id,cat:t.cat||'Altro',symbol:t.symbol||'',q:0,p:0,pmc:0});}
   return [...map.values()].sort((a,b)=>String(a.name||a.id).localeCompare(String(b.name||b.id),'it'));
 };
 const relevantTrades=(a)=>trades.filter(t=>t&&t.asset===a.id&&dayValid(t.date)&&Number(t.quantity)>0&&(t.kind==='buy'||t.kind==='sale')).slice().sort((a,b)=>a.date.localeCompare(b.date));
 function historyFor(a,archive){
   const events=relevantTrades(a),rec=archive.assets?.[a.id],daily=rec?.days||{},dates=new Set(Object.keys(daily).filter(dayValid));
   for(const e of events)dates.add(e.date);
   const current=asDay(new Date().toISOString());dates.add(current);
   const earliest=events[0]?.date||Object.keys(daily).filter(dayValid).sort()[0]||current;
   const all=[...dates].filter(d=>dayValid(d)&&d>=earliest&&d<=current).sort();
   if(!all.length)return {points:[],events};
   let i=0,qty=0,cost=0,bought=0,proceeds=0,realized=0;
   const actual=state.assets.find(x=>x.id===a.id);
   const noLedger=!events.length&&actual&&Number(actual.q)>0;
   const points=[];
   for(const date of all){
     while(i<events.length&&events[i].date<=date){
       const e=events[i++],q=Number(e.quantity),raw=Number(e.spent),unit=Number(e.price);
       const money=Number.isFinite(raw)&&raw>0?raw:Number.isFinite(unit)&&unit>0?q*unit:null;
       if(e.kind==='buy'){qty+=q;if(money!==null){bought+=money;cost+=money;}else cost=NaN;}
       else{const avg=qty>0?cost/qty:0,disposed=q*avg;qty=Math.max(0,qty-q);cost=qty<1e-7?0:cost-disposed;if(money!==null){proceeds+=money;realized+=money-disposed;}}
     }
     let price=Number(daily[date]?.price);
     let source=daily[date]?.quality||'';
     if(!(price>0)){
       // Carry forward the last observed quote for at most 7 days (closed markets).
       const look=Object.keys(daily).filter(d=>dayValid(d)&&d<date&&dayNum(date)-dayNum(d)<=7*86400000).sort().pop();
       if(look){price=Number(daily[look].price);source='riportato';}
     }
     if(!(price>0)){
       // Execution price is a documented transaction amount, not a market close.
       const todayTrade=events.filter(t=>t.date===date&&Number(t.price)>0).at(-1);
       if(todayTrade){price=Number(todayTrade.price);source='prezzo operazione';}
     }
     if(date===current&&actual&&Number(actual.p)>0){price=Number(actual.p);source='quotazione portafoglio';}
     const q=noLedger?Number(actual.q):qty;
     const openCost=noLedger?Number(cap(actual)):cost;
     const valid=q<=1e-8||(price>0&&Number.isFinite(openCost));
     if(!valid)continue;
     const value=q<=1e-8?0:(a.cat==='Obbligazioni'&&actual?.id===a.id?Number(q)*price/100:Number(q)*price);
     const capital=Number.isFinite(openCost)?openCost:null;
     const pnl=Number.isFinite(value)&&Number.isFinite(bought)?value+proceeds-bought:null;
     points.push({date,value,capital,pnl,realized,price:price>0?price:null,source,qty:q,bought,proceeds});
   }
   return {points,events,noLedger};
 }
 function line(points,key,color){
   const data=points.filter(p=>Number.isFinite(p[key]));if(data.length<2)return '';
   const vals=points.flatMap(p=>[p.value,p.capital].filter(Number.isFinite));const lo=Math.min(...vals),hi=Math.max(...vals),rng=Math.max(hi-lo,1);
   const first=dayNum(points[0].date),last=dayNum(points.at(-1).date),span=Math.max(last-first,86400000);
   const coords=data.map(p=>[(35+(dayNum(p.date)-first)/span*370).toFixed(1),(160-(p[key]-lo)/rng*124).toFixed(1)]);
   return '<path d="'+coords.map((v,i)=>(i?'L':'M')+v.join(' ')).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>';
 }
 function miniChart(points){
   if(points.length<2)return '<p class="fhstats-note">Grafico non disponibile: servono almeno due valutazioni con prezzi documentati.</p>';
   return '<div class="fhstats-chart"><strong>📈 Capitale e valore nel tempo</strong><svg viewBox="0 0 430 188" role="img" aria-label="Andamento osservato del valore e del capitale investito">'+[36,98,160].map(y=>'<line x1="35" y1="'+y+'" x2="405" y2="'+y+'" stroke="currentColor" opacity=".1" stroke-dasharray="4 4"/>').join('')+line(points,'value','#4ddbb3')+line(points,'capital','#ecbc55')+'<text x="36" y="181" fill="currentColor" opacity=".6" font-size="10">'+esc(dayLabel(points[0].date))+'</text><text x="405" y="181" text-anchor="end" fill="currentColor" opacity=".6" font-size="10">'+esc(dayLabel(points.at(-1).date))+'</text></svg><div class="fhstats-legend"><span><i class="fhstats-dot" style="background:#4ddbb3"></i>Valore della posizione</span><span><i class="fhstats-dot" style="background:#ecbc55"></i>Capitale ancora investito</span></div><p class="fhstats-note">Tracciati basati soltanto sulle date e quotazioni disponibili; variazioni dovute agli acquisti e alle vendite sono comprese. I periodi senza prezzi non vengono ricostruiti.</p></div>';
 }
 function suggestion(a){
   const c=String(a.cat||'').toLowerCase();
   if(c.includes('obbligaz')||c.includes('postale')||c.includes('deposito'))return '📅 Orizzonte da valutare: scadenza dello strumento, vincoli e rischio emittente. Il rendimento effettivo può includere cedole o interessi non presenti nel grafico.';
   if(c.includes('crypto')||c.includes('future'))return '⚠️ Non esiste un periodo di mantenimento affidabile per ottenere profitti: volatilità e rischio di perdita elevati. Valuta un orizzonte e una soglia di rischio personali.';
   if(c.includes('etf'))return '🧭 Per ETF azionari diversificati si considera spesso un orizzonte pluriennale (indicativamente 5 anni o più), ma l’orizzonte dipende dal sottostante e non garantisce guadagni.';
   if(c.includes('azion')||c.includes('etc')||c.includes('materie'))return '🧭 Per singole azioni ed ETC non esiste un periodo che garantisca profitti. Considera il rischio specifico, la concentrazione e il tuo obiettivo temporale.';
   return '🧭 Nessun intervallo garantisce profitti. Usa la scadenza, il rischio dello strumento e la tua strategia come riferimento.';
 }
 function metric(icon,label,value){return '<div class="fhstats-metric"><div class="fhstats-icon">'+icon+'</div><small>'+esc(label)+'</small><b>'+esc(value)+'</b></div>';}
 function averageReturns(points,days){
   const cutoff=Date.now()-days*86400000;const subset=points.filter(p=>p.price>0&&dayNum(p.date)>=cutoff);let total=0,n=0;
   for(let i=1;i<subset.length;i++){const diff=dayNum(subset[i].date)-dayNum(subset[i-1].date);if(diff<=7*86400000&&subset[i-1].price>0){total+=(subset[i].price/subset[i-1].price-1)*100;n++;}}
   return n?percent(total/n):'n.d.';
 }
 function renderHistoryStatistics(){
   if(!root)return;
   const assets=getAssets();if(!assets.length){root.innerHTML='<p class="history-empty">Ancora nessuno strumento posseduto o venduto.</p>';return;}
   if(!assets.some(a=>a.id===selectedId))selectedId=assets[0].id;
   let archive={assets:{}};try{archive=fh102Read()}catch(_){}
   const a=assets.find(x=>x.id===selectedId),result=historyFor(a,archive),all=result.points;
   const cutoff=span==='all'?0:Date.now()-Number(span)*86400000;
   const displayed=all.filter(p=>dayNum(p.date)>=cutoff);
   const latest=all.at(-1),previous=displayed[0],last=displayed.at(-1),values=displayed.map(p=>p.value).filter(Number.isFinite);
   const historicalValues=all.map(p=>p.value).filter(Number.isFinite);
   const historicalMax=historicalValues.length?Math.max(...historicalValues):null,historicalMin=historicalValues.length?Math.min(...historicalValues):null;
   const resultInterval=previous&&last&&Number.isFinite(previous.pnl)&&Number.isFinite(last.pnl)?last.pnl-previous.pnl:null;
   const currentHolding=(a.q&&Number(a.q)>0),sold=!currentHolding&&result.events.some(e=>e.kind==='sale');
   const validHistory=all.length>=2;
   const displayName=a.name||a.symbol||a.id;
   root.innerHTML='<div class="fhstats-bar"><label>🔎 Seleziona lo strumento (inclusi quelli venduti)<select id="fhStatsAsset">'+assets.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===a.id?' selected':'')+'>'+esc(x.name||x.symbol||x.id)+(Number(x.q)>0?'':' · non in portafoglio')+'</option>').join('')+'</select></label></div>'+
    '<div class="fhstats-name"><h3>'+esc(displayName)+'</h3><div class="fhstats-chips"><span class="fhstats-chip">'+esc(a.cat||'Strumento')+'</span><span class="fhstats-chip">'+(sold?'✅ Venduto':currentHolding?'💼 In portafoglio':'📁 Storico')+'</span><span class="fhstats-chip">'+result.events.length+' operazioni</span></div></div>'+
    '<div class="fhstats-ranges" aria-label="Periodo statistiche">'+[['7','1S'],['30','1M'],['90','3M'],['180','6M'],['365','1A'],['all','MAX']].map(v=>'<button type="button" class="btn '+(span===v[0]?'selected':'')+'" data-fhstats-span="'+v[0]+'" aria-pressed="'+(span===v[0])+'">'+v[1]+'</button>').join('')+'</div>'+
    '<div class="fhstats-grid">'+
    metric('💰','Capitale ancora investito',latest?euro(latest.capital):Number(a.q)>0?euro(cap(a)):'0,00 €')+
    metric('💼','Valore alla data più recente',latest?euro(latest.value):Number(a.q)>0?euro(val(a)):'n.d.')+
    metric('🏔️','Massimo valore osservato nello storico',historicalMax===null?'n.d.':euro(historicalMax))+
    metric('🏞️','Minimo valore osservato nello storico',historicalMin===null?'n.d.':euro(historicalMin))+
    metric('📊','Risultato nel periodo (incluse compravendite)',resultInterval===null?'n.d.':(resultInterval>0?'+':'')+euro(resultInterval))+
    metric('🏁','Risultato complessivo documentato',latest?.pnl===null||!latest?'n.d.':(latest.pnl>0?'+':'')+euro(latest.pnl))+
    metric('📆','Media variazioni giornaliere · 7 giorni',averageReturns(all,7))+
    metric('🗓️','Media variazioni giornaliere · 30 giorni',averageReturns(all,30))+
    metric('📅','Media variazioni giornaliere · 90 giorni',averageReturns(all,90))+
    metric('🗂️','Media variazioni giornaliere · 365 giorni',averageReturns(all,365))+
    '</div>'+miniChart(displayed)+
    '<div class="fhstats-explain">'+esc(suggestion(a))+'</div>'+
    '<p class="fhstats-note">Massimo e minimo si riferiscono soltanto alle valutazioni archiviate nell’intero storico disponibile, non ai massimi/minimi di borsa assoluti. I rendimenti medi sono medie delle variazioni tra sedute registrate, non previsioni. I risultati ignorano commissioni, tasse, dividendi, cedole e cambi non documentati; in caso di cronologia incompleta potrebbero essere non confrontabili. '+(result.noLedger?'⚠️ Non risultano acquisti datati: la serie precedente non può essere ricostruita con certezza. ':'')+(validHistory?'Prime/ultime date disponibili: '+esc(dayLabel(all[0].date))+' — '+esc(dayLabel(all.at(-1).date))+'.':'Poche rilevazioni disponibili.')+'</p>'+
    '<h3 style="margin-top:18px">🗂️ Tutti gli strumenti seguiti nella storia</h3><div class="fhstats-list">'+assets.map(x=>'<button type="button" data-fhstats-id="'+esc(x.id)+'" aria-pressed="'+(x.id===a.id)+'"><span><strong>'+esc(x.name||x.id)+'</strong><small>'+esc(x.cat||'')+' · '+(Number(x.q)>0?'posizione aperta':'posizione non più attiva')+'</small></span><span aria-hidden="true">📈</span></button>').join('')+'</div>';
 }
 root.addEventListener('change',e=>{if(e.target?.id==='fhStatsAsset'){selectedId=e.target.value;renderHistoryStatistics();}});
 root.addEventListener('click',e=>{const spanBtn=e.target.closest('[data-fhstats-span]');if(spanBtn){span=spanBtn.dataset.fhstatsSpan;renderHistoryStatistics();return;}const assetBtn=e.target.closest('[data-fhstats-id]');if(assetBtn){selectedId=assetBtn.dataset.fhstatsId;renderHistoryStatistics();}});
 window.renderHistoryStatistics=renderHistoryStatistics;
})();
