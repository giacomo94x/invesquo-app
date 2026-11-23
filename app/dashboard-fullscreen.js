/* Finholdra Beta 10.9.10 — Patrimonio uses the same inline and landscape fullscreen UI as Capitale e valore.
   The entire dataset comes from renderWealthGraph(): no recalculation or alteration of portfolio history. */
(()=>{'use strict';
const graph=document.getElementById('wealthGraph'),card=document.getElementById('dashboardWealthCard');
if(!graph||!card)return;
const fmt=n=>Number(n).toLocaleString('it-IT',{style:'currency',currency:'EUR'});
const label=d=>{try{return new Date(d+'T12:00:00Z').toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'2-digit'})}catch(_){return d}};
let selected=null,zoom=1,offset=0,compare=false,aPoint=null,previousFocus=null,points=[];
const modal=document.createElement('div');modal.id='fhWealthFullscreen';modal.className='fh10100-wealth-overlay';modal.innerHTML='<div class="fh10100-wealth-dialog" role="dialog" aria-modal="true" aria-label="Andamento del patrimonio a schermo intero"><div class="fh10100-wealth-dialog-head"><strong>Andamento del patrimonio · Categorie selezionate</strong><button class="btn" type="button" id="fhWealthFullscreenClose">Chiudi ✕</button></div><div id="fhWealthFullPlot" class="fh10100-wealth-fullplot"></div><div class="fh1084-capital-readout fh10100-wealth-readout" id="fhWealthFullReadout" aria-live="polite"></div><div class="fh1084-capital-legend fh10100-wealth-legend"><span><i class="fh10100-green"></i>Positivo</span><span><i class="fh10100-red"></i>Negativo</span><span>💰 Acquisti</span></div><div class="fh10100-wealth-tools"><button class="btn" type="button" data-wealth-zoom="out" aria-label="Riduci zoom">− Zoom</button><button class="btn" type="button" data-wealth-zoom="reset">Ripristina</button><button class="btn" type="button" data-wealth-zoom="in" aria-label="Aumenta zoom">+ Zoom</button><button class="btn" type="button" id="fhWealthAB">A↔B</button></div></div>';
document.body.appendChild(modal);
const plot=modal.querySelector('#fhWealthFullPlot'),readout=modal.querySelector('#fhWealthFullReadout');
function readData(){try{const x=JSON.parse(graph.dataset.wealthPoints||'[]');return Array.isArray(x)?x.filter(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&Number.isFinite(p.value)):[]}catch(_){return []}}
function visible(){if(points.length<2)return points;const count=Math.max(2,Math.ceil(points.length/zoom));const maxStart=Math.max(0,points.length-count);const start=Math.round(Math.max(0,Math.min(1,offset))*maxStart);return points.slice(start,start+count)}
function nearestAt(date){return points.find(p=>p.date===date)||points.at(-1)}
function setReadout(p){if(!p){readout.textContent='Scegli un punto sul grafico.';return}if(compare&&aPoint){const delta=p.value-aPoint.value,pc=aPoint.value?delta/Math.abs(aPoint.value):null;readout.innerHTML='<span>A '+label(aPoint.date)+' → B '+label(p.date)+'</span><strong style="color:'+(delta>=0?'#4ddbb3':'#f57f91')+'">Δ '+(delta>0?'+':'')+fmt(delta)+(pc===null?'':' · '+(pc>0?'+':'')+new Intl.NumberFormat('it-IT',{style:'percent',minimumFractionDigits:2,maximumFractionDigits:2}).format(pc))+'</strong>';return}readout.innerHTML='<span>'+label(p.date)+(p.provisional?' · indicativo':'')+'</span><strong>'+fmt(p.value)+(p.buys>0?' · 💰 '+fmt(p.buys):'')+'</strong>'}
function svgMarkup(data){
 if(data.length<1)return '<p class="hint">Nessuna giornata disponibile per il periodo selezionato.</p>';
 const W=760,H=360,L=76,R=18,T=24,B=44;
 const nums=data.map(p=>p.value),lo0=Math.min(...nums),hi0=Math.max(...nums),pad=Math.max(1,(hi0-lo0)*.13,hi0*.004),lo=lo0-pad,hi=hi0+pad;
 const first=Date.parse(data[0].date+'T12:00:00Z'),last=Date.parse(data.at(-1).date+'T12:00:00Z');
 const x=p=>L+(W-L-R)*(Date.parse(p.date+'T12:00:00Z')-first)/Math.max(86400000,last-first);
 const y=v=>T+(H-T-B)*(hi-v)/Math.max(.001,hi-lo);
 const ticks=[0,.5,1].map(t=>{const v=hi-(hi-lo)*t,yy=T+(H-T-B)*t;return '<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" stroke="currentColor" opacity=".17" stroke-dasharray="4 6"/><text x="'+(L-6)+'" y="'+(yy+5)+'" text-anchor="end" fill="currentColor" opacity=".75" font-size="15">'+Math.round(v).toLocaleString('it-IT')+'</text>'}).join('');
 const paths=data.slice(1).map((p,i)=>{const a=data[i];const color=p.gain===null||!Number.isFinite(p.gain)?'#9caec2':p.gain>=0?'#4ddbb3':'#f57f91';const d=(Date.parse(p.date)-Date.parse(a.date))/86400000;return '<path d="M'+x(a).toFixed(1)+' '+y(a.value).toFixed(1)+' L'+x(p).toFixed(1)+' '+y(p.value).toFixed(1)+'" fill="none" stroke="'+color+'" stroke-width="3.3" stroke-linecap="round"'+(d>1?' stroke-dasharray="5 6"':'')+'/>'}).join('');
 const buys=data.filter(p=>p.buys>0).map(p=>'<g><title>Acquisti '+fmt(p.buys)+'</title><text x="'+x(p)+'" y="'+Math.max(T+10,y(p.value)-13)+'" font-size="18" text-anchor="middle">💰</text></g>').join('');
 const marks=data.map(p=>'<g data-wealth-point="'+p.date+'" role="button"><circle cx="'+x(p)+'" cy="'+y(p.value)+'" r="'+(p.date===selected?'5.5':'3')+'" fill="'+(p.gain==null?'#a9b9ce':p.gain>=0?'#4ddbb3':'#f57f91')+'"/>'+(p.date===selected?'<circle cx="'+x(p)+'" cy="'+y(p.value)+'" r="11" fill="none" stroke="currentColor" opacity=".6"/>':'')+'<circle cx="'+x(p)+'" cy="'+y(p.value)+'" r="10" fill="transparent"/></g>').join('');
 const focus=data.find(p=>p.date===selected)||data.at(-1);
 const cross='<line x1="'+x(focus)+'" x2="'+x(focus)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="currentColor" opacity=".48" stroke-dasharray="5 6"/>';
 return '<svg class="fh1084-capital-svg fh10100-wealth-svg" viewBox="0 0 '+W+' '+H+'" role="img" tabindex="0" aria-label="Andamento giornaliero del patrimonio interattivo">'+ticks+paths+cross+marks+buys+'<text x="'+L+'" y="'+(H-8)+'" font-size="16" fill="currentColor" opacity=".85">'+label(data[0].date)+'</text><text x="'+(W-R)+'" y="'+(H-8)+'" text-anchor="end" font-size="16" fill="currentColor" opacity=".85">'+label(data.at(-1).date)+'</text></svg>';
}
function refresh(){points=readData();const data=visible();if(!data.some(p=>p.date===selected))selected=data.at(-1)?.date||null;plot.innerHTML=svgMarkup(data);setReadout(nearestAt(selected));}
function open(){previousFocus=document.activeElement;zoom=1;offset=0;compare=false;aPoint=null;modal.querySelector('#fhWealthAB').classList.remove('selected');points=readData();selected=points.at(-1)?.date||null;modal.classList.add('open');document.body.classList.add('fh10100-wealth-modal-open');refresh();modal.querySelector('#fhWealthFullscreenClose').focus()}
function close(){modal.classList.remove('open');document.body.classList.remove('fh10100-wealth-modal-open');previousFocus?.focus?.()}
graph.addEventListener('click',e=>{if(e.target.closest('#fhWealthFullscreenOpen'))open()});
modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('#fhWealthFullscreenClose'))close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close()});
modal.querySelectorAll('[data-wealth-zoom]').forEach(b=>b.addEventListener('click',()=>{const z=b.dataset.wealthZoom;zoom=z==='reset'?1:Math.max(1,Math.min(9,zoom*(z==='in'?1.55:1/1.55)));if(z==='reset')offset=0;refresh()}));
modal.querySelector('#fhWealthAB').addEventListener('click',e=>{compare=!compare;aPoint=null;e.currentTarget.classList.toggle('selected',compare);readout.textContent=compare?'Seleziona due date A e B sul grafico.':'Tocca una data per leggere il valore.'});
function select(ev){const svg=ev.target.closest('svg.fh10100-wealth-svg');if(!svg)return;const data=visible();if(!data.length)return;let px;try{const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;px=pt.matrixTransform(svg.getScreenCTM().inverse()).x}catch(_){const rect=svg.getBoundingClientRect();px=(ev.clientX-rect.left)*760/Math.max(1,rect.width)}
 const ratio=Math.max(0,Math.min(1,(px-76)/(760-76-18)));const target=Date.parse(data[0].date+'T12:00:00Z')+ratio*(Date.parse(data.at(-1).date+'T12:00:00Z')-Date.parse(data[0].date+'T12:00:00Z'));
 const p=data.reduce((best,p)=>Math.abs(Date.parse(p.date)-target)<Math.abs(Date.parse(best.date)-target)?p:best,data[0]);selected=p.date;if(compare){if(!aPoint)aPoint=p;else if(aPoint.date===p.date)aPoint=null;else{setReadout(p);refresh();setReadout(p);return}}refresh();if(compare&&aPoint)readout.textContent='A '+label(aPoint.date)+' · seleziona il punto B.';
}
plot.addEventListener('pointerdown',select);
plot.addEventListener('pointermove',e=>{if(e.buttons)select(e)});
plot.addEventListener('keydown',e=>{if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;const data=visible();if(!data.length)return;e.preventDefault();let index=data.findIndex(p=>p.date===selected);index=Math.max(0,Math.min(data.length-1,index+(e.key==='ArrowRight'?1:-1)));selected=data[index].date;refresh()});
const obs=new MutationObserver(()=>{if(modal.classList.contains('open'))refresh()});obs.observe(graph,{childList:true});
})();
