/* Finholdra Beta 10.6.9 · Asset statistics. Read-only; no fabricated quotes. */
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
   if(points.filter(p=>Number.isFinite(p.value)).length<2)return '<p class="fhstats-note">Servono almeno due valutazioni documentate per il grafico.</p>';
   return '<button type="button" id="fhStatsOpenChart" class="fhstats-chart-button" aria-label="Apri il grafico interattivo"><strong>Andamento capitale / valore</strong><span>Ingrandisci ↗</span>'+chartSvg(points,430,190)+'</button><div class="fhstats-legend"><span><i class="fhstats-dot" style="background:#4ddbb3"></i>Valore</span><span><i class="fhstats-dot" style="background:#ecbc55"></i>Capitale investito</span></div>';
 }
 function chartSvg(points,w,h){
   const valid=points.filter(p=>Number.isFinite(p.value)&&Number.isFinite(p.capital));if(valid.length<2)return '';
   const all=valid.flatMap(p=>[p.value,p.capital]),lo=Math.min(...all),hi=Math.max(...all),pad=Math.max((hi-lo)*.12,1),min=lo-pad,max=hi+pad;
   const xmin=dayNum(valid[0].date),xmax=dayNum(valid.at(-1).date),L=42,R=12,T=16,B=28;
   const X=p=>L+(dayNum(p.date)-xmin)/Math.max(86400000,xmax-xmin)*(w-L-R),Y=v=>T+(max-v)/(max-min)*(h-T-B);
   const lines=key=>valid.map((p,i)=>(i?'L':'M')+X(p).toFixed(2)+' '+Y(p[key]).toFixed(2)).join(' ');
   const axes=[0,.5,1].map(fr=>{const value=max-(max-min)*fr,y=T+fr*(h-T-B);return '<line x1="'+L+'" x2="'+(w-R)+'" y1="'+y+'" y2="'+y+'" stroke="currentColor" stroke-dasharray="3 5" opacity=".14"/><text x="'+(L-5)+'" y="'+(y+3)+'" fill="currentColor" text-anchor="end" font-size="10" opacity=".6">'+(Math.round(value)).toLocaleString('it-IT')+'</text>';}).join('');
   const coords=valid.map(p=>({x:X(p),valueY:Y(p.value),capitalY:Y(p.capital),...p}));
   return '<svg class="fhstats-svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Confronto tra capitale investito e valore della posizione">'+axes+'<path d="'+lines('value')+'" fill="none" stroke="#4ddbb3" stroke-width="2.7" stroke-linejoin="round"/><path d="'+lines('capital')+'" fill="none" stroke="#ecbc55" stroke-width="2.4" stroke-linejoin="round"/><text x="'+L+'" y="'+(h-5)+'" font-size="10" fill="currentColor" opacity=".65">'+esc(dayLabel(valid[0].date))+'</text><text x="'+(w-R)+'" y="'+(h-5)+'" text-anchor="end" font-size="10" fill="currentColor" opacity=".65">'+esc(dayLabel(valid.at(-1).date))+'</text><g id="fhStatsSvgFocus" style="display:none"><line id="fhStatsSvgGuide" y1="'+T+'" y2="'+(h-B)+'" stroke="currentColor" stroke-dasharray="4 4" opacity=".6"/><circle id="fhStatsSvgValue" r="5" fill="#4ddbb3"/><circle id="fhStatsSvgCapital" r="5" fill="#ecbc55"/></g></svg><script type="application/json" class="fhstats-points">'+JSON.stringify(coords).replace(/</g,'\u003c')+'</script>';
 }
 function statsMetric(label,value,secondary=''){return '<div class="fhstats-metric"><small>'+esc(label)+'</small><b>'+esc(value)+'</b>'+(secondary?'<span class="fhstats-secondary">'+esc(secondary)+'</span>':'')+'</div>';}
 function pctOfPosition(point){return point?.capital>0&&Number.isFinite(point.value)?(point.value-point.capital)/point.capital*100:null;}
 function lastContributionDate(events){return events.filter(e=>e.kind==='buy').map(e=>e.date).sort().at(-1)||null;}
 function openChart(){const a=getAssets().find(x=>x.id===selectedId);if(!a)return;let archive={assets:{}};try{archive=fh102Read()}catch(_){}const all=historyFor(a,archive).points,cutoff=span==='all'?0:Date.now()-Number(span)*86400000,pts=all.filter(x=>dayNum(x.date)>=cutoff);
 let overlay=document.getElementById('fhStatsChartOverlay');if(!overlay){overlay=document.createElement('div');overlay.id='fhStatsChartOverlay';overlay.className='fhstats-overlay';overlay.innerHTML='<div class="fhstats-dialog" role="dialog" aria-modal="true" aria-label="Grafico capitale e valore"><header><strong>Capitale e valore</strong><button id="fhStatsChartClose" class="btn" type="button">Chiudi ✕</button></header><div id="fhStatsChartBody"></div><div id="fhStatsChartReadout">Tocca o trascina sul grafico per leggere i valori.</div></div>';document.body.appendChild(overlay);overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('#fhStatsChartClose'))overlay.classList.remove('open');});}
 const body=overlay.querySelector('#fhStatsChartBody');body.innerHTML=chartSvg(pts,740,365);overlay.classList.add('open');const svg=body.querySelector('svg'),raw=body.querySelector('.fhstats-points');if(!svg||!raw)return;
 const points=JSON.parse(raw.textContent);const move=e=>{let x=0;try{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;x=p.matrixTransform(svg.getScreenCTM().inverse()).x;}catch(_){const r=svg.getBoundingClientRect();x=(e.clientX-r.left)/r.width*740;}
 const near=points.reduce((best,p)=>Math.abs(p.x-x)<Math.abs(best.x-x)?p:best,points[0]);const focus=svg.querySelector('#fhStatsSvgFocus');focus.style.display='';const guide=svg.querySelector('#fhStatsSvgGuide');guide.setAttribute('x1',near.x);guide.setAttribute('x2',near.x);for(const [sel,y] of [['#fhStatsSvgValue',near.valueY],['#fhStatsSvgCapital',near.capitalY]]){const el=svg.querySelector(sel);el.setAttribute('cx',near.x);el.setAttribute('cy',y);}overlay.querySelector('#fhStatsChartReadout').textContent=dayLabel(near.date)+' · Valore '+euro(near.value)+' · Capitale '+euro(near.capital)+' · Differenza '+euro(near.value-near.capital);};svg.addEventListener('pointerdown',move);svg.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons)move(e)});svg.addEventListener('pointerup',move);
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
  const assets=getAssets();if(!assets.length){root.innerHTML='<p class="fhstats-note">Nessuno strumento registrato.</p>';return;}
  if(!assets.some(a=>a.id===selectedId))selectedId=assets[0].id;
  let archive={assets:{}};try{archive=fh102Read()}catch(_){}
  const a=assets.find(x=>x.id===selectedId),{points:all,events,noLedger}=historyFor(a,archive),last=all.at(-1);
  const cutoff=span==='all'?0:Date.now()-Number(span)*86400000;
  const displayed=all.filter(p=>dayNum(p.date)>=cutoff),first=displayed[0],finish=displayed.at(-1);
  const afterDate=lastContributionDate(events),after=all.filter(p=>!afterDate||p.date>=afterDate).filter(p=>Number.isFinite(p.value)&&p.qty>0);
  const values=after.map(p=>p.value),peak=values.length?Math.max(...values):null,trough=values.length?Math.min(...values):null;
  const performance=after.map(p=>pctOfPosition(p)).filter(Number.isFinite);
  const maxProfit=performance.length?Math.max(...performance):null,maxLoss=performance.length?Math.min(...performance):null;
  const intervalPnL=first&&finish&&Number.isFinite(first.pnl)&&Number.isFinite(finish.pnl)?finish.pnl-first.pnl:null;
  const previousBuy=events.filter(x=>x.kind==='buy').at(-1),priorBuy=events.filter(x=>x.kind==='buy').at(-2);
  const avgUnit=last?.qty>0&&last?.capital>0?last.capital/last.qty:null;
  const prevUnit=priorBuy&&Number(priorBuy.price)>0?Number(priorBuy.price):null;
  const pmcChange=avgUnit&&prevUnit?(avgUnit/prevUnit-1)*100:null;
  const priceVsPmc=avgUnit&&last?.price>0?(last.price/avgUnit-1)*100:null;
  root.innerHTML='<div class="fhstats-bar"><label>Seleziona un titolo<select id="fhStatsAsset">'+assets.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===a.id?' selected':'')+'>'+esc(x.name||x.symbol||x.id)+(Number(x.q)>0?'':' · venduto/non attivo')+'</option>').join('')+'</select></label></div>'+
   '<div class="fhstats-ranges" aria-label="Periodo statistiche">'+[['7','1S'],['30','1M'],['90','3M'],['180','6M'],['365','1A'],['all','MAX']].map(v=>'<button type="button" class="btn '+(span===v[0]?'selected':'')+'" data-fhstats-span="'+v[0]+'" aria-pressed="'+(span===v[0])+'">'+v[1]+'</button>').join('')+'</div>'+
   '<div class="fhstats-section-label">Situazione attuale</div><div class="fhstats-grid">'+statsMetric('Capitale investito',last?euro(last.capital):'n.d.')+statsMetric('Valore attuale',last?euro(last.value):'n.d.')+'</div>'+
   '<div class="fhstats-section-label">Dall’ultimo acquisto'+(afterDate?' · '+esc(dayLabel(afterDate)):'')+'</div><div class="fhstats-grid">'+statsMetric('Valore massimo registrato',peak===null?'n.d.':euro(peak))+statsMetric('Valore minimo registrato',trough===null?'n.d.':euro(trough))+statsMetric('Massimo guadagno sul capitale',maxProfit===null?'n.d.':percent(maxProfit))+statsMetric('Massima perdita sul capitale',maxLoss===null?'n.d.':percent(maxLoss))+'</div>'+
   '<div class="fhstats-section-label">Quanto è cambiato?</div><div class="fhstats-grid">'+statsMetric('Risultato nel periodo',intervalPnL===null?'n.d.':euro(intervalPnL),'Al netto degli acquisti e delle vendite registrati')+statsMetric('Prezzo rispetto al tuo PMC',priceVsPmc===null?'n.d.':percent(priceVsPmc))+statsMetric('Tuo PMC per quota',avgUnit===null?'n.d.':euro(avgUnit))+statsMetric('Variazione PMC dall’acquisto precedente',pmcChange===null?'n.d.':percent(pmcChange))+'</div>'+
   miniChart(displayed)+
   '<p class="fhstats-note">Le valutazioni si riferiscono alle sole date archiviate e agli acquisti documentati. Massimo e minimo sono quelli della posizione dopo l’ultimo acquisto, non i massimi e minimi assoluti del titolo. Il rendimento in % confronta valore e capitale residuo alla stessa data, non neutralizza tutti i flussi. '+(noLedger?'Cronologia di acquisto non disponibile: le statistiche passate potrebbero essere incomplete.':'')+'</p>';
 }
 root.addEventListener('change',e=>{if(e.target?.id==='fhStatsAsset'){selectedId=e.target.value;renderHistoryStatistics();}});
 root.addEventListener('click',e=>{const spanBtn=e.target.closest('[data-fhstats-span]');if(spanBtn){span=spanBtn.dataset.fhstatsSpan;renderHistoryStatistics();return;}if(e.target.closest('#fhStatsOpenChart'))openChart();});
 window.renderHistoryStatistics=renderHistoryStatistics;
})();
