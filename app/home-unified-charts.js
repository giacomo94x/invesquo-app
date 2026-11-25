/* Finholdra 10.9.28 — date panel hidden by semantic attribute; portrait chart layout corrected. */
(()=>{'use strict';
const $=id=>document.getElementById(id),EUR=new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'});
const euros=n=>Number.isFinite(n)?EUR.format(n):'n.d.';
const signedEuros=n=>Number.isFinite(n)?`${n>0?'+':''}${euros(n)}`:'n.d.';
const signedPct=n=>Number.isFinite(n)?`${n>0?'+':''}${n.toFixed(2).replace('.',',')}%`:'n.d.';
const dt=d=>new Date(d+'T12:00:00Z').getTime();
const fmt=d=>{try{return new Date(d+'T12:00:00Z').toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'2-digit'})}catch(_){return d}};
const ranges=[['1G',1],['1S',7],['1M',30],['3M',90],['6M',183],['1A',365],['MAX','all']];
let pending=false;
function wealthData(){try{return JSON.parse($('wealthGraph')?.dataset.wealthPoints||'[]').filter(p=>p&&Number.isFinite(p.value)&&/^\d{4}-\d{2}-\d{2}$/.test(p.date))}catch(_){return []}}
function capitalData(){if(typeof state==='undefined'||typeof fh102CalendarSeries!=='function'||typeof fh1096PositionAt!=='function')return [];
 const series=fh102CalendarSeries(),cats=series.cats,assets=state.assets.filter(a=>cats.includes(a.cat));
 const dated=series.records.filter(p=>p.valid).map(p=>{let invested=0;for(const a of assets){const pos=fh1096PositionAt(a,p.date);if(pos.qty===null)return null;if(pos.qty>1e-7){if(!Number.isFinite(Number(pos.capital)))return null;invested+=Number(pos.capital)}}return {date:p.date,value:Number(p.value),capital:invested,provisional:!!p.provisional};}).filter(Boolean);
 // Mark dated purchase events without recomputing the valuation.
 const buys=new Map();for(const t of trades||[]){if(t.kind!=='buy'||!cats.includes(t.cat))continue;const date=typeof fh1099EffectiveTradeDate==='function'?fh1099EffectiveTradeDate(t):t.date;if(/^\d{4}-\d{2}-\d{2}$/.test(date))buys.set(date,(buys.get(date)||0)+Math.abs(Number(t.spent)||0))}
 const wealthByDate=new Map(wealthData().map(p=>[p.date,p]));return dated.map((p,i)=>({...p,buys:buys.get(p.date)||0,gain:wealthByDate.get(p.date)?.gain??(i? p.value-dated[i-1].value-(p.capital-dated[i-1].capital):null)}));}
const states={capital:{id:'capital',card:$('fhHomeCapitalCard'),data:capitalData,range:7,from:'',to:'',calendarOpen:false,selected:null,ab:false,A:null,B:null,zoom:1,scroll:0}};
let expanded=null,full=null,lastFocus=null;
function filtered(s){let all=s.data();if(!Array.isArray(all))return [];all=all.slice().sort((a,b)=>a.date.localeCompare(b.date));if(s.from)all=all.filter(p=>p.date>=s.from && (!s.to || p.date<=s.to));else if(s.range!=='all'&&all.length){const end=dt(all.at(-1).date),start=end-Number(s.range)*86400000;all=all.filter(p=>dt(p.date)>=start);if(all.length===1&&s.range===1){const prev=s.data().filter(p=>p.date<all[0].date).at(-1);if(prev)all.unshift(prev);}}
 if(s.zoom>1&&all.length>2){const len=Math.max(2,Math.ceil(all.length/s.zoom)),start=Math.max(0,Math.round(s.scroll*(all.length-len)));all=all.slice(start,start+len)}return all;}
function chartSvg(s,all,large){if(!all.length)return '<p class="hint">Nessuna quotazione completa disponibile per questo intervallo.</p>';
 const portraitHome=!large&&window.matchMedia('(max-width: 560px)').matches;const W=760,H=large?(()=>{const node=full?.querySelector('.fh115-modal-plot');const width=node?.clientWidth||760,height=node?.clientHeight||330;return Math.max(180,Math.min(470,Math.round(W*height/Math.max(200,width))))})():(portraitHome?560:360),L=70,R=23,T=large?28:26,B=portraitHome?53:46,values=all.flatMap(p=>s.id==='capital'?[p.value,p.capital]:[p.value]);let min=Math.min(...values),max=Math.max(...values),pad=Math.max(1,(max-min)*.13,Math.abs(max)*.004);min-=pad;max+=pad;
 const xmin=dt(all[0].date),xmax=dt(all.at(-1).date);const x=p=>L+(W-L-R)*(dt(p.date)-xmin)/Math.max(86400000,xmax-xmin),y=v=>T+(H-T-B)*(max-v)/Math.max(.01,max-min);
 const tickSize=large?14:(portraitHome?15:14);const axisSize=large?15:(portraitHome?16:15);const ticks=[0,.5,1].map(q=>{const yy=T+q*(H-B-T),v=max-q*(max-min);return `<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="currentColor" opacity=".18" stroke-dasharray="5 8"/><text x="${L-9}" y="${yy+5}" text-anchor="end" fill="currentColor" opacity=".75" font-size="${tickSize}">${Math.round(v).toLocaleString('it-IT')}</text>`}).join('');
 const rangeColor=p=>p.gain==null?'#9aabc4':p.gain>=0?'#54d5ad':'#f78299';
 const lines=`<path d="${all.map((p,i)=>(i?'L':'M')+x(p)+' '+y(p.capital)).join(' ')}" stroke="#f1c464" stroke-width="3.2" fill="none" stroke-linejoin="round"/>`+all.slice(1).map((p,i)=>`<path d="M${x(all[i])} ${y(all[i].value)}L${x(p)} ${y(p.value)}" stroke="${rangeColor(p)}" stroke-width="3.6" fill="none" stroke-linecap="round"${dt(p.date)-dt(all[i].date)>86400000?' stroke-dasharray="5 6"':''}/>`).join('');
 const area=all.length>1?`<defs><linearGradient id="fhHomeAreaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c56b90" stop-opacity=".20"/><stop offset="100%" stop-color="#c56b90" stop-opacity="0"/></linearGradient></defs><path d="${all.map((p,i)=>(i?'L':'M')+x(p)+' '+y(p.value)).join(' ')} L${x(all.at(-1))} ${H-B} L${x(all[0])} ${H-B} Z" fill="url(#fhHomeAreaFill)"/>`:'';
 const marks=all.filter(p=>p.buys>0).map(p=>`<g transform="translate(${x(p)} ${Math.max(T+13,y(p.value)-17)})"><circle r="9" fill="#eec057" stroke="#8f6a1e" stroke-width="1.5"/><text y="4.4" text-anchor="middle" fill="#283446" font-size="13" font-weight="900">€</text></g>`).join('');
 const chosen=all.find(p=>p.date===s.selected)||all.at(-1),cross=chosen?`<line x1="${x(chosen)}" x2="${x(chosen)}" y1="${T}" y2="${H-B}" stroke="currentColor" opacity=".65" stroke-dasharray="5 6"/><circle cx="${x(chosen)}" cy="${y(chosen.value)}" r="7" fill="#f78197" stroke="white" stroke-width="3"/>`:'';
 const abMarks=s.ab?[['A',s.A,'#47d8bd'],['B',s.B,'#f9b85b']].filter(v=>v[1]).map(([label,p,color])=>`<g class="fh119-ab-marker"><line x1="${x(p)}" x2="${x(p)}" y1="${T}" y2="${H-B}" stroke="${color}" stroke-dasharray="4 5" stroke-width="2"/><circle cx="${x(p)}" cy="${y(p.value)}" r="9" fill="${color}" stroke="#eff8ff" stroke-width="2.6"/><rect x="${Math.max(L,x(p)-17)}" y="${T+3}" rx="11" width="27" height="23" fill="${color}"/><text x="${Math.max(L,x(p)-17)+13.5}" y="${T+20}" text-anchor="middle" fill="#071a2d" font-size="16" font-weight="800">${label}</text></g>`).join(''):'';
 return `<svg class="fh115-svg" preserveAspectRatio="xMidYMid meet" role="img" tabindex="0" aria-label="Grafico interattivo; tocca e trascina per leggere la data" viewBox="0 0 ${W} ${H}">${ticks}${area}${lines}${marks}<g data-fh115-cursors="1">${cross}${abMarks}</g><text x="${L}" y="${H-9}" fill="currentColor" opacity=".85" font-size="${axisSize}">${fmt(all[0].date)}</text><text x="${W-R}" y="${H-9}" text-anchor="end" fill="currentColor" opacity=".85" font-size="${axisSize}">${fmt(all.at(-1).date)}</text></svg>`;
}
function readout(s,all){const p=all.find(p=>p.date===s.selected)||all.at(-1);if(!p)return 'Nessun dato storico';if(s.ab&&s.A&&s.B){const delta=s.B.value-s.A.value,base=s.A.value,pct=base?delta/Math.abs(base)*100:0;return `<span class="fh119-ab-read"><b style="color:#47d8bd">A · ${fmt(s.A.date)}</b> ${euros(s.A.value)} <b style="color:#f9b85b">B · ${fmt(s.B.date)}</b> ${euros(s.B.value)}</span><strong style="color:${delta>=0?'#54d5ad':'#f78299'}">Δ ${delta>0?'+':''}${euros(delta)} (${pct>0?'+':''}${pct.toFixed(2).replace('.',',')}%)</strong>`;}
 if(s.ab&&s.A)return `<span>A: ${fmt(s.A.date)} · ${euros(s.A.value)}</span><strong>Seleziona B</strong>`;
 const delta=p.value-p.capital,pctBase=p.capital?delta/Math.abs(p.capital)*100:null;return `<span class="fh149-date">${fmt(p.date)}${p.provisional?' · indicativo':''}</span><span class="fh149-metric"><b>Valore</b> <span>${euros(p.value)}</span></span><span class="fh149-metric fh149-difference ${delta>=0?'fh149-positive':'fh149-negative'}"><b>Differenza</b> <span>${signedEuros(delta)} · ${signedPct(pctBase)}</span></span><span class="fh149-metric"><b>Capitale</b> <span>${euros(p.capital)}</span></span>`;}
function controls(s){
 const today=new Date().toISOString().slice(0,10);
 const start=s.data().map(p=>p.date).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort()[0]||today;
 const calendarIcon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg>';
 return `<div class="fh115-range" role="group" aria-label="Periodo">${ranges.map(([l,d])=>`<button type="button" data-fh115-range="${d}" class="${s.range===d&&!s.from?'selected':''}" aria-pressed="${s.range===d&&!s.from}">${l}</button>`).join('')}<button type="button" class="fh115-calendar-btn ${s.calendarOpen?'selected':''}" data-fh115-calendar="1" aria-expanded="${!!s.calendarOpen}" aria-label="Intervallo personalizzato" title="Scegli le date">${calendarIcon}</button></div><div class="fh115-custom-dates ${s.calendarOpen?'':'hidden'}" ${s.calendarOpen?'':'hidden'} data-fh115-dates="1"><label>Dal <input type="date" class="fh115-from-date" aria-label="Data iniziale" value="${s.from||start}" min="${start}" max="${today}"></label><label>Al <input type="date" class="fh115-to-date" aria-label="Data finale" value="${s.to||today}" min="${start}" max="${today}"></label><button type="button" class="btn" data-fh115-apply="1">Mostra</button></div>`;
}
function mount(){const report=$('dashboardReports'),home=$('dashboardView');if(report&&home){let reportCard=$('fh117ReportCard');if(!reportCard){reportCard=document.createElement('section');reportCard.id='fh117ReportCard';reportCard.className='card fh117-report';home.append(reportCard);}reportCard.append(report);}const cap=$('fhHomeCapitalCard');if(cap){cap.querySelector('.section-head h2').textContent='Patrimonio e valore';const sub=cap.querySelector('.section-head .sub');if(sub)sub.textContent='Capitale investito e valore nel tempo';}for(const s of Object.values(states)){if(!s.card)continue;const original=s.card.querySelector('.section-head');let host=s.card.querySelector('.fh115-host');if(!host){host=document.createElement('div');host.className='fh115-host';original?.after(host);}s.host=host;} full=document.createElement('div');full.id='fh115Fullscreen';full.innerHTML='<div class="fh115-modal fh117-investment-style" role="dialog" aria-modal="true" aria-label="Patrimonio e valore a schermo intero"><div class="fh115-modal-head"><strong id="fh115Title">Patrimonio e valore</strong><button class="btn" type="button" data-fh115-close="1">✕ Chiudi</button></div><div class="fh115-modal-plot"></div><div class="fh115-modal-readout"></div><div class="fh115-zoom"><button type="button" data-fh115-tool="prev" aria-label="Punto precedente">↑</button><button type="button" data-fh115-tool="minus">− Zoom</button><button type="button" data-fh115-tool="reset">Ripristina</button><button type="button" data-fh115-tool="plus">+ Zoom</button><button type="button" data-fh115-tool="next" aria-label="Punto successivo">↓</button><button type="button" data-fh115-tool="ab">A↔B</button></div></div>';document.body.append(full);}
function paint(s){if(!s.host)return;let all=filtered(s);if(!all.find(p=>p.date===s.selected))s.selected=all.at(-1)?.date||null;
 if(s.ab&&all.length>1){if(!s.A||!all.some(p=>p.date===s.A.date))s.A=all[Math.floor((all.length-1)*.25)];if(!s.B||!all.some(p=>p.date===s.B.date))s.B=all[Math.ceil((all.length-1)*.75)];}
 const inner=`${controls(s)}<div class="fh115-actions"><button type="button" data-fh115-open="1" aria-label="Ingrandisci grafico patrimonio e valore"><span>⛶ Ingrandisci</span></button></div><div class="fh115-plot">${chartSvg(s,all,false)}</div><div class="fh115-readout">${readout(s,all)}</div><div class="fh115-tools"><button type="button" data-fh115-tool="ab" class="${s.ab?'selected':''}">A↔B</button><span><i class="fh115-dot green"></i> Positivo <i class="fh115-dot red"></i> Negativo <i class="fh115-dot gold"></i> Capitale · 💰 Acquisti</span></div>`;
 // Preserve SVG roots and the active pointer target while dragging. Replacing the
 // whole plot on every pointermove breaks touch tracking on WebKit/iOS.
 function updatePlot(container, svgMarkup){
  const existing=container.querySelector('svg.fh115-svg');
  if(existing && svgMarkup.startsWith('<svg')){
    const template=document.createElement('template');template.innerHTML=svgMarkup;
    const fresh=template.content.querySelector('svg');
    if(fresh){existing.setAttribute('viewBox',fresh.getAttribute('viewBox'));existing.setAttribute('preserveAspectRatio','xMidYMid meet');existing.innerHTML=fresh.innerHTML;return;}
  }
  container.innerHTML=svgMarkup;
 }
 s.host.innerHTML=inner;
 s.card?.classList.toggle('fh116-active', all.length>0 && !!s.host.querySelector('svg.fh115-svg'));
 if(expanded===s&&full){full.querySelector('#fh115Title').textContent='Patrimonio e valore';updatePlot(full.querySelector('.fh115-modal-plot'),chartSvg(s,all,true));full.querySelector('.fh115-modal-readout').innerHTML=readout(s,all);full.querySelector('[data-fh115-tool="ab"]').classList.toggle('selected',s.ab);}
}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;for(const s of Object.values(states)){try{paint(s)}catch(err){s.card?.classList.remove('fh116-active');console.warn('[Finholdra Home chart]',s.id,err)}}})}
function show(s){expanded=s;lastFocus=document.activeElement;full.classList.add('open');document.body.classList.add('fh115-modal-open');paint(s);full.querySelector('[data-fh115-close]')?.focus()}
function hide(){expanded=null;full.classList.remove('open');document.body.classList.remove('fh115-modal-open');lastFocus?.focus?.()}
function pointerSvgX(svg,e){
 // The landscape modal is CSS-rotated on iPhone: screen Y is the chart's X.
 // Compute actual painted content (SVG preserveAspectRatio="meet"), not just
 // the bounding rectangle or a stale CTM from WebKit.
 const rect=svg.getBoundingClientRect(), vb=svg.viewBox.baseVal;
 const rotated=!!(expanded&&full?.classList.contains('open')&&window.matchMedia('(orientation: portrait) and (max-width: 800px)').matches);
 const localW=rotated?rect.height:rect.width;
 const localH=rotated?rect.width:rect.height;
 const scale=Math.min(localW/Math.max(vb.width,1),localH/Math.max(vb.height,1));
 const letterboxX=(localW-vb.width*scale)/2;
 const localX=(rotated?e.clientY-rect.top:e.clientX-rect.left)-letterboxX;
 return vb.x+Math.max(0,Math.min(vb.width,localX/Math.max(scale,.0001)));
}
function nearest(svg,e,s){
 const data=filtered(s);if(!data.length)return null;
 const fraction=Math.max(0,Math.min(1,(pointerSvgX(svg,e)-70)/(760-70-23)));
 const target=dt(data[0].date)+fraction*(dt(data.at(-1).date)-dt(data[0].date));
 return data.reduce((best,p)=>Math.abs(dt(p.date)-target)<Math.abs(dt(best.date)-target)?p:best,data[0]);
}
function paintCursorsOnly(svg,s,points){
 // Crucial: never replace the SVG root or graph while touch capture is active.
 // Only replace the dedicated, noninteractive overlay group.
 const updated=chartSvg(s,points,expanded===s&&full?.classList.contains('open'));
 const template=document.createElement('template');template.innerHTML=updated;
 const next=template.content.querySelector('[data-fh115-cursors]');
 const current=svg.querySelector('[data-fh115-cursors]');
 if(current&&next)current.innerHTML=next.innerHTML;
}
function pick(s,e,handle=null){
 const isFull=expanded===s&&full?.classList.contains('open');
 const svg=isFull?full.querySelector('svg.fh115-svg'):s.host?.querySelector('svg.fh115-svg');
 if(!svg)return;
 const p=nearest(svg,e,s);if(!p)return;
 s.selected=p.date;
 if(s.ab){if(handle==='A')s.A=p;else if(handle==='B')s.B=p;}
 const points=filtered(s);
 paintCursorsOnly(svg,s,points);
 const readTarget=isFull?full.querySelector('.fh115-modal-readout'):s.host.querySelector('.fh115-readout');
 if(readTarget)readTarget.innerHTML=readout(s,points);
}
function action(s,e){const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-fh115-calendar')){s.calendarOpen=!s.calendarOpen;paint(s);return;}
 if(b.hasAttribute('data-fh115-apply')){
  const container=b.closest('.fh115-host, .fh115-modal-controls')||s.host;
  const from=container.querySelector('.fh115-from-date')?.value||'';
  const to=container.querySelector('.fh115-to-date')?.value||'';
  const today=new Date().toISOString().slice(0,10);
  if(!from||!to||from>to||to>today){window.alert('Seleziona due date valide in ordine cronologico.');return;}
  s.from=from;s.to=to;s.calendarOpen=false;s.zoom=1;s.scroll=0;s.selected=null;s.A=s.B=null;paint(s);return;
 }
 if(b.hasAttribute('data-fh115-range')){s.range=b.dataset.fh115Range==='all'?'all':Number(b.dataset.fh115Range);s.from='';s.to='';s.calendarOpen=false;s.zoom=1;s.scroll=0;s.A=s.B=null;s.selected=null;paint(s);return}
 if(b.hasAttribute('data-fh115-open')){show(s);return;}
 if(b.hasAttribute('data-fh115-tool')){const tool=b.dataset.fh115Tool;if(tool==='ab'){s.ab=!s.ab;s.A=s.B=null;}else if(tool==='reset'){s.zoom=1;s.scroll=0;}else if(tool==='prev'||tool==='next'){const points=filtered(s),at=points.findIndex(p=>p.date===s.selected),ix=Math.max(0,Math.min(points.length-1,at+(tool==='next'?1:-1)));if(points[ix])s.selected=points[ix].date;}else s.zoom=Math.max(1,Math.min(12,s.zoom*(tool==='plus'?1.65:1/1.65)));paint(s);}
}
mount();
for(const s of Object.values(states)){s.card?.addEventListener('click',e=>{if(e.target.closest('.fh115-host'))action(s,e)});s.card?.addEventListener('pointerdown',e=>{if(e.target.closest('svg.fh115-svg')){try{s.card.setPointerCapture(e.pointerId)}catch(_){}pick(s,e)}});s.card?.addEventListener('pointermove',e=>{if(e.buttons>0&&e.target.closest('.fh115-host,svg.fh115-svg,#dashboardWealthCard,#fhHomeCapitalCard'))pick(s,e)})}
let touch=null;
full.addEventListener('click',e=>{if(e.target.closest('[data-fh115-close]')){hide();return}if(expanded)action(expanded,e)});

full.addEventListener('pointerdown',e=>{
 if(!expanded||!e.target.closest('.fh115-modal-plot'))return;
 const s=expanded,svg=full.querySelector('svg.fh115-svg');if(!svg)return;
 const p=nearest(svg,e,s);if(!p)return;
 let handle=null;
 if(s.ab){
  const distA=s.A?Math.abs(dt(s.A.date)-dt(p.date)):Infinity;
  const distB=s.B?Math.abs(dt(s.B.date)-dt(p.date)):Infinity;
  handle=distA<=distB?'A':'B';
 }
 touch={id:e.pointerId,handle};
 // Capture on the NEVER-replaced fullscreen shell, not on an SVG descendant.
 try{full.setPointerCapture(e.pointerId)}catch(_){}
 e.preventDefault();pick(s,e,handle);
});
full.addEventListener('pointermove',e=>{
 if(!expanded||!touch||touch.id!==e.pointerId)return;
 e.preventDefault();pick(expanded,e,touch.handle);
});
function releaseTouch(e){if(touch&&(e.pointerId===undefined||touch.id===e.pointerId))touch=null;}
full.addEventListener('pointerup',releaseTouch);
full.addEventListener('pointercancel',releaseTouch);
full.addEventListener('lostpointercapture',releaseTouch);
// iOS Safari sometimes does not dispatch pointermove to a CSS-rotated SVG
// after capture. Use native touch events on the plot as a primary fallback.
let finger=null;
const plotElement=()=>full?.querySelector('.fh115-modal-plot');
function locateFinger(e){if(!expanded||!finger)return;const t=Array.from(e.changedTouches||e.touches||[]).find(t=>t.identifier===finger.id);if(!t)return;pick(expanded,{clientX:t.clientX,clientY:t.clientY},finger.handle);}
full.addEventListener('touchstart',e=>{
 if(!expanded||!e.target.closest('.fh115-modal-plot')||e.touches.length!==1)return;
 const t=e.changedTouches[0],s=expanded,svg=full.querySelector('svg.fh115-svg');if(!svg)return;
 const near=nearest(svg,{clientX:t.clientX,clientY:t.clientY},s);if(!near)return;
 const da=s.A?Math.abs(dt(s.A.date)-dt(near.date)):Infinity, db=s.B?Math.abs(dt(s.B.date)-dt(near.date)):Infinity;
 finger={id:t.identifier,handle:s.ab?(da<=db?'A':'B'):null};e.preventDefault();locateFinger(e);
},{passive:false});
full.addEventListener('touchmove',e=>{if(!finger||e.touches.length!==1)return;e.preventDefault();locateFinger(e);},{passive:false});
function releaseFinger(e){if(!finger)return;if(Array.from(e.changedTouches||[]).some(t=>t.identifier===finger.id))finger=null;}
full.addEventListener('touchend',releaseFinger,{passive:true});full.addEventListener('touchcancel',releaseFinger,{passive:true});
full.addEventListener('wheel',e=>{if(!expanded)return;e.preventDefault();expanded.zoom=Math.max(1,Math.min(12,expanded.zoom*(e.deltaY<0?1.15:1/1.15)));paint(expanded)},{passive:false});
let pinchDistance=0;full.addEventListener('touchstart',e=>{if(e.touches.length===2)pinchDistance=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)},{passive:true});full.addEventListener('touchmove',e=>{if(!expanded||e.touches.length!==2)return;e.preventDefault();const dist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(pinchDistance>10){expanded.zoom=Math.max(1,Math.min(12,expanded.zoom*dist/pinchDistance));paint(expanded)}pinchDistance=dist},{passive:false});full.addEventListener('touchend',e=>{if(e.touches.length<2)pinchDistance=0},{passive:true});window.addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded)hide();if(expanded&&['ArrowLeft','ArrowRight'].includes(e.key)){const data=filtered(expanded);const at=data.findIndex(p=>p.date===expanded.selected),next=data[Math.max(0,Math.min(data.length-1,at+(e.key==='ArrowRight'?1:-1)))];if(next){expanded.selected=next.date;paint(expanded)}e.preventDefault()}});
window.addEventListener('resize',()=>{if(expanded)paint(expanded)},{passive:true});window.renderHomeCapitalChart=schedule;const wealthEl=$('wealthGraph');if(wealthEl)new MutationObserver(schedule).observe(wealthEl,{childList:true,attributes:true,attributeFilter:['data-wealth-points']});schedule();
})();
