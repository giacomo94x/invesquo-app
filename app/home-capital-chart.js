/* Finholdra 10.8.4: selected-category cost/value comparison; uses existing validated historic holdings. */
(()=>{'use strict';
const card=document.getElementById('fhHomeCapitalCard');if(!card)return;
const plot=document.getElementById('fhHomeCapitalPlot'),readout=document.getElementById('fhHomeCapitalReadout');
let range='90',selected=null,points=[],currentCats='';
const locale=new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:2});
const fmt=n=>Number.isFinite(n)?locale.format(n):'n.d.';
const signed=n=>Number.isFinite(n)?(n>0?'+':'')+fmt(n):'n.d.';
const color=n=>n>0?'#4ddbb3':n<0?'#f57f91':'var(--text)';
const dateLabel=d=>new Date(d+'T12:00:00Z').toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'2-digit'});
function costAt(a,date){
 const pos=fh1096PositionAt(a,date);
 if(pos.qty===null)return null;
 if(pos.qty<=1e-7)return 0;
 if(!Number.isFinite(Number(pos.capital)))return null;
 return Math.max(0,Number(pos.capital));
}
function build(){
 if(typeof fh102CalendarSeries!=='function')return [];
 const series=fh102CalendarSeries(),cats=series.cats;
 currentCats=cats.join(' · ');
 const assets=state.assets.filter(a=>cats.includes(a.cat));
 return series.records.filter(p=>p.valid).map(p=>{
  let capital=0;
  for(const a of assets){const c=costAt(a,p.date);if(c===null)return null;capital+=c;}
  return {date:p.date,value:Number(p.value),capital};
 }).filter(p=>p&&Number.isFinite(p.value)&&Number.isFinite(p.capital));
}
function filtered(){const last=days(today());return points.filter(p=>range==='all'||last-days(p.date)<=Number(range));}
function svgMarkup(data,large=false){
 const W=large?760:480,H=large?360:225,L=large?76:62,R=18,T=24,B=44;
 const minDate=days(data[0].date),maxDate=days(data.at(-1).date);
 const vals=data.flatMap(p=>[p.value,p.capital]),min=Math.min(...vals),max=Math.max(...vals),pad=Math.max(1,(max-min)*.11);
 const lower=min-pad,upper=max+pad;
 const x=p=>L+(W-L-R)*(days(p.date)-minDate)/Math.max(1,maxDate-minDate);
 const y=v=>T+(H-T-B)*(upper-v)/(upper-lower);
 const path=k=>data.map((p,i)=>(i?'L':'M')+x(p).toFixed(1)+' '+y(p[k]).toFixed(1)).join(' ');
 const ticks=[0,.5,1].map(t=>{const v=upper-(upper-lower)*t,yy=T+(H-T-B)*t;return '<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" stroke="currentColor" opacity=".17" stroke-dasharray="4 6"/><text x="'+(L-6)+'" y="'+(yy+5)+'" text-anchor="end" fill="currentColor" opacity=".75" font-size="'+(large?16:13)+'">'+Math.round(v).toLocaleString('it-IT')+'</text>';}).join('');
 let mark='';const p=data.find(p=>p.date===selected)||data.at(-1);if(p){const xx=x(p);mark='<line x1="'+xx+'" x2="'+xx+'" y1="'+T+'" y2="'+(H-B)+'" stroke="currentColor" opacity=".65" stroke-dasharray="4 4"/><circle cx="'+xx+'" cy="'+y(p.value)+'" r="5" fill="#4ddbb3"/><circle cx="'+xx+'" cy="'+y(p.capital)+'" r="5" fill="#ecbc55"/>';}
 return '<svg class="fh1084-capital-svg" viewBox="0 0 '+W+' '+H+'" role="img" tabindex="0" aria-label="Grafico interattivo di capitale investito e valore del portafoglio">'+ticks+'<path d="'+path('capital')+'" stroke="#ecbc55" stroke-width="3" stroke-linejoin="round" fill="none"/><path d="'+path('value')+'" stroke="#4ddbb3" stroke-width="3.3" stroke-linejoin="round" fill="none"/>'+mark+'<text x="'+L+'" y="'+(H-8)+'" font-size="'+(large?16:13)+'" fill="currentColor" opacity=".85">'+dateLabel(data[0].date)+'</text><text x="'+(W-R)+'" y="'+(H-8)+'" text-anchor="end" font-size="'+(large?16:13)+'" fill="currentColor" opacity=".85">'+dateLabel(data.at(-1).date)+'</text></svg>';
}
function renderReadout(p,box){if(!box)return;if(!p){box.textContent='Scegli un punto sul grafico.';return;}const delta=p.value-p.capital,pctValue=p.capital?delta/Math.abs(p.capital):null;box.innerHTML='<span>'+dateLabel(p.date)+' · Valore '+fmt(p.value)+' · Capitale '+fmt(p.capital)+'</span><strong style="color:'+color(delta)+'">Differenza '+signed(delta)+(pctValue===null?'':' · '+(pctValue>0?'+':'')+new Intl.NumberFormat('it-IT',{style:'percent',minimumFractionDigits:2,maximumFractionDigits:2}).format(pctValue))+'</strong>';}
function buildOverlay(){let el=document.getElementById('fhHomeCapitalOverlay');if(el)return el;
 el=document.createElement('div');el.id='fhHomeCapitalOverlay';el.className='fh1084-capital-overlay';el.innerHTML='<div class="fh1084-capital-dialog" role="dialog" aria-modal="true" aria-label="Grafico capitale e valore"><div class="fh1084-capital-dialog-head"><strong>Capitale e valore · Categorie selezionate</strong><button class="btn" type="button" id="fhHomeCapitalClose">Chiudi ✕</button></div><div id="fhHomeCapitalFullPlot"></div><div class="fh1084-capital-readout" id="fhHomeCapitalFullReadout"></div><div class="fh1084-capital-legend"><span><i class="fh1084-legend-dot value"></i>Valore</span><span><i class="fh1084-legend-dot capital"></i>Capitale investito</span></div></div>';
 document.body.appendChild(el);el.addEventListener('click',e=>{if(e.target===el||e.target.closest('#fhHomeCapitalClose'))close();});return el;
}
let previousFocus=null;function close(){const el=document.getElementById('fhHomeCapitalOverlay');if(el){el.classList.remove('open');document.body.classList.remove('fh1084-modal-open');previousFocus?.focus?.();}}
function open(){const data=filtered();if(data.length<2)return;previousFocus=document.activeElement;const el=buildOverlay();el.querySelector('#fhHomeCapitalFullPlot').innerHTML=svgMarkup(data,true);renderReadout(data.find(p=>p.date===selected)||data.at(-1),el.querySelector('#fhHomeCapitalFullReadout'));el.classList.add('open');document.body.classList.add('fh1084-modal-open');el.querySelector('#fhHomeCapitalClose').focus();}
function update(){try{points=build();const data=filtered();card.querySelectorAll('[data-hc-range]').forEach(b=>{const active=b.dataset.hcRange===range;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
 if(data.length<2){plot.innerHTML='<p class="hint">Dati storici completi insufficienti per le categorie selezionate. Servono prezzi verificati e movimenti con importi registrati.</p>';renderReadout(null,readout);return;}
 if(!data.some(p=>p.date===selected))selected=data.at(-1).date;
 plot.innerHTML=svgMarkup(data);renderReadout(data.find(p=>p.date===selected),readout);
 const overlay=document.getElementById('fhHomeCapitalOverlay');if(overlay?.classList.contains('open')){overlay.querySelector('#fhHomeCapitalFullPlot').innerHTML=svgMarkup(data,true);renderReadout(data.find(p=>p.date===selected),overlay.querySelector('#fhHomeCapitalFullReadout'));}
 }catch(e){console.warn('Capitale e valore Dashboard:',e);plot.innerHTML='<p class="hint">Grafico momentaneamente non disponibile: controlla le quotazioni archiviate.</p>';}}
function pick(ev){const svg=ev.target.closest('svg.fh1084-capital-svg');if(!svg)return;const data=filtered();if(!data.length)return;let loc;try{const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;loc=pt.matrixTransform(svg.getScreenCTM().inverse()).x;}catch(_){const r=svg.getBoundingClientRect();loc=(ev.clientX-r.left)/Math.max(1,r.width)*svg.viewBox.baseVal.width;}
 const W=svg.viewBox.baseVal.width,L=W>500?76:62,R=18;const first=days(data[0].date),last=days(data.at(-1).date),day=first+Math.max(0,Math.min(1,(loc-L)/(W-L-R)))*(last-first);
 selected=data.reduce((best,p)=>Math.abs(days(p.date)-day)<Math.abs(days(best.date)-day)?p:best,data[0]).date;
 update();}
card.addEventListener('click',e=>{const b=e.target.closest('[data-hc-range]');if(b){range=b.dataset.hcRange;selected=null;update();return;}if(e.target.closest('#fhHomeCapitalOpen'))open();});
card.addEventListener('pointerdown',e=>{if(e.target.closest('svg.fh1084-capital-svg'))pick(e)});card.addEventListener('pointermove',e=>{if(e.buttons&&e.target.closest('svg.fh1084-capital-svg'))pick(e)});
card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('svg.fh1084-capital-svg')){e.preventDefault();open();}});
document.addEventListener('pointerdown',e=>{if(e.target.closest('#fhHomeCapitalFullPlot svg'))pick(e)});
document.addEventListener('pointermove',e=>{if(e.buttons&&e.target.closest('#fhHomeCapitalFullPlot svg'))pick(e)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
window.renderHomeCapitalChart=update;
update();
})();
