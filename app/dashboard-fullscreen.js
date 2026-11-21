/* Finholdra Beta 10.9.3 - landscape fullscreen Dashboard charts */
(()=>{'use strict';
const graph=document.getElementById('wealthGraph'),card=document.getElementById('dashboardWealthCard');
if(!graph||!card)return;
const button=document.createElement('button');button.id='fhWealthFullscreenOpen';button.className='btn fh1093-expand';button.type='button';button.textContent='Ingrandisci ↗';button.setAttribute('aria-label','Ingrandisci andamento patrimonio a schermo intero orizzontale');
graph.before(button);
const modal=document.createElement('div');modal.id='fhWealthFullscreen';modal.className='fh1093-fullscreen';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Andamento del patrimonio ingrandito');
modal.innerHTML='<div class="fh1093-landscape"><header><strong>Andamento del patrimonio</strong><button class="btn fh1093-close" type="button">✕ Chiudi</button></header><div class="fh1093-plot" id="fh1093WealthPlot"></div><div class="fh1093-readout" id="fh1093WealthReadout"></div><div class="fh1093-tools"><button class="btn" type="button" data-fh1093-zoom="out">− Zoom</button><button class="btn" type="button" data-fh1093-zoom="reset">Ripristina</button><button class="btn" type="button" data-fh1093-zoom="in">+ Zoom</button><button class="btn" type="button" id="fh1093AB">A↔B</button></div></div>';
document.body.appendChild(modal);
const plot=modal.querySelector('#fh1093WealthPlot'),readout=modal.querySelector('#fh1093WealthReadout');let zoom=1,anchor=0.5,ab=false,picks=[];
function current(){return graph.querySelector('svg.history-plot')}
function refresh(preserveReadout=false){const orig=current();if(!orig){plot.innerHTML='<p>Storico non disponibile per il periodo selezionato.</p>';return;}
 const clone=orig.cloneNode(true);clone.removeAttribute('id');clone.classList.add('fh1093-full-svg');clone.setAttribute('preserveAspectRatio','xMidYMid meet');
 const vb=orig.viewBox.baseVal;const width=vb.width/zoom;const left=vb.x+(vb.width-width)*anchor;clone.setAttribute('viewBox',`${left} ${vb.y} ${width} ${vb.height}`);
 plot.replaceChildren(clone);if(!preserveReadout)readout.textContent=(graph.querySelector('.wealth-day-focus')?.textContent||'Tocca un punto per leggere il valore.').trim();
}
function open(){zoom=1;anchor=.5;ab=false;picks=[];modal.classList.add('open');document.body.classList.add('fh1093-modal-open');refresh()}
function close(){modal.classList.remove('open');document.body.classList.remove('fh1093-modal-open')}
button.addEventListener('click',open);modal.querySelector('.fh1093-close').addEventListener('click',close);
modal.addEventListener('click',ev=>{if(ev.target===modal)close()});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&modal.classList.contains('open'))close()});
modal.querySelectorAll('[data-fh1093-zoom]').forEach(b=>b.addEventListener('click',()=>{const action=b.dataset.fh1093Zoom;zoom=action==='reset'?1:Math.max(1,Math.min(7,zoom*(action==='in'?1.55:1/1.55)));refresh()}));
modal.querySelector('#fh1093AB').addEventListener('click',ev=>{ab=!ab;picks=[];ev.currentTarget.classList.toggle('selected',ab);readout.textContent=ab?'Seleziona due punti A e B per confrontare il patrimonio.':'Seleziona un giorno sul grafico.'});
plot.addEventListener('click',ev=>{const node=ev.target.closest('[data-wealth-day]');if(!node)return;const date=node.dataset.wealthDay;const match=graph.querySelector(`[data-wealth-day="${date}"]`);if(match)match.dispatchEvent(new MouseEvent('click',{bubbles:true}));
 if(ab){const orig=current();const series=orig?.getAttribute('data-ab-series');let val=null;try{const parsed=JSON.parse(decodeURIComponent(series));val=parsed.pts?.find(p=>String(p.label).includes(date))?.value??null}catch(_){}picks.push({date,val});if(picks.length>2)picks.shift();if(picks.length===2&&picks.every(p=>Number.isFinite(Number(p.val)))){let delta=picks[1].val-picks[0].val;readout.textContent=`A ${picks[0].date} → B ${picks[1].date} · Differenza ${delta.toLocaleString('it-IT',{style:'currency',currency:'EUR'})}`;}else readout.textContent='Punto A: '+date+' · scegli B';
 }else readout.textContent=(graph.querySelector('.wealth-day-focus')?.textContent||date).trim();
 refresh(true);});
let sx=0;plot.addEventListener('pointerdown',e=>{sx=e.clientX});plot.addEventListener('pointerup',e=>{if(Math.abs(e.clientX-sx)>32&&zoom>1){anchor=Math.max(0,Math.min(1,anchor-(e.clientX-sx)/Math.max(200,plot.clientWidth)/zoom));refresh(true)}});
const obs=new MutationObserver(()=>{if(modal.classList.contains('open'))refresh(true)});obs.observe(graph,{childList:true,subtree:false});
})();
