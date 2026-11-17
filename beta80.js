/* Finholdra Beta 8.0 — UI additions isolated from portfolio calculations. */
(()=>{'use strict';
const $=q=>document.querySelector(q), all=q=>Array.from(document.querySelectorAll(q));
const fmt=(n,d=2)=>Number(n).toLocaleString('it-IT',{minimumFractionDigits:d,maximumFractionDigits:d});
const euro=n=>fmt(n)+' €';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const profileName=()=>{try{const id=localStorage.getItem('invesquo_unlocked_account_v75');const xs=JSON.parse(localStorage.getItem('invesquo_local_profiles_v75')||'[]');return (xs.find(p=>p.id===id)||{}).name||'Finholdra';}catch(_){return 'Finholdra';}};
function setupSettings(){
  const theme=$('#settingTheme'),appearance=$('#settingAppearanceMode');
  if(theme){const newOptions=[['iconblue','Blu Finholdra'],['honey','Miele'],['burgundy','Borgogna'],['goldblue','Giallo e Blu Finholdra']];for(const [val,label] of newOptions){if(![...theme.options].some(o=>o.value===val))theme.add(new Option(label,val));} if([...theme.options].some(o=>o.value===document.body.dataset.theme))theme.value=document.body.dataset.theme;}
  if(appearance){appearance.querySelector('option[value="fiducia"]')?.replaceChildren(document.createTextNode('Fiducia'));appearance.querySelector('option[value="tradizionale"]')?.replaceChildren(document.createTextNode('Tradizione'));}
  const mascotSection=$('#mascotLab'),groups=$('#settingsSection');
  if(mascotSection&&groups&&!mascotSection.dataset.fh8Done){
    mascotSection.querySelector('.section-head h2').textContent='Finn';
    mascotSection.querySelectorAll('.hint,.foot').forEach(e=>{if((e.textContent||'').match(/trascina|inventat|nessun gioco/i))e.textContent='Tocca Finn per giocare.';});
    const finnGroup=[...groups.querySelectorAll('details.setting-group')].find(g=>/Finn/.test(g.querySelector('summary')?.textContent||''));
    if(finnGroup)finnGroup.remove();
    let finnDetails=$('#fh81FinnSettings');if(!finnDetails){finnDetails=document.createElement('details');finnDetails.id='fh81FinnSettings';finnDetails.className='setting-group';finnDetails.innerHTML='<summary>Gioca con Finn</summary>';groups.appendChild(finnDetails);}finnDetails.appendChild(mascotSection);
    mascotSection.dataset.fh8Done='1';
  }
  // Treat the mascot group as its own settings domain, not part of Appearance.
  const gr=all('#settingsSection .setting-group');for(const group of gr){const sum=group.querySelector('summary');if(sum&&/Finn · Mascotte/.test(sum.textContent))sum.textContent='Finn';if(sum&&/Aspetto e (?:colori|Finn)/i.test(sum.textContent))sum.textContent='Aspetto';}
}
function setupSources(){
 const sel=$('#assetDetailProvider');if(!sel)return;
 const sync=()=>{for(const o of [...sel.options])if(o.value==='twelvedata'||o.value==='saved')o.remove();};
 new MutationObserver(sync).observe(sel,{childList:true});sync();
}

function setupHome(){
 const head=$('.new-header-nav'),fav=$('#favoriteBanner')||$('.favorites-banner')||$('#favoriteTicker');
 if(head)head.style.marginBottom='0';
 const phrases=['Non generiamo dati inventati.','Nessuna quotazione fittizia.','Non sono state create quotazioni storiche mancanti.'];
 all('.foot,.entry-explain').forEach(e=>{let t=e.textContent.trim();if(phrases.some(p=>t.includes(p)))e.textContent=t.replace(/Non generiamo dati inventati\.?|Nessuna quotazione fittizia\.?|Non sono state create quotazioni storiche mancanti\.?/g,'').trim();});
}
function setupGate(){const img=$('.finholdra-gate-logo');if(img)img.src='./finholdra-header-bianco-neutral.svg?v=8.0';}
function setupFinn(){
 const face=$('#faceButton'), fig=$('#performanceFace');if(!face||!fig||face.dataset.fh8Hold)return;face.dataset.fh8Hold='1';
 let timeout=null,fired=false,startX=0,startY=0;
 const open=()=>{fired=true;openProfileCard();};
 const begin=e=>{if(e.type==='pointerdown'&&e.button!==0)return;fired=false;startX=e.clientX;startY=e.clientY;clearTimeout(timeout);timeout=setTimeout(open,3000);};
 const move=e=>{if(!timeout)return;if(Math.abs(e.clientX-startX)>24||Math.abs(e.clientY-startY)>24){clearTimeout(timeout);timeout=null;}};
 const end=e=>{clearTimeout(timeout);timeout=null;if(fired){e.preventDefault();e.stopPropagation();}};
 face.addEventListener('pointerdown',begin,true);face.addEventListener('pointermove',move,true);face.addEventListener('pointerup',end,true);face.addEventListener('pointercancel',end,true);face.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation()},true);
 for(const node of [face,fig,...face.querySelectorAll('*'),...fig.querySelectorAll('*')]){node.setAttribute('draggable','false');node.addEventListener('selectstart',e=>e.preventDefault());node.addEventListener('contextmenu',e=>e.preventDefault());}
 // iOS legacy touch fallback, prevent text selection without blocking taps.
 let touchStart=null;
 face.addEventListener('touchstart',e=>{if(e.touches.length===1){const t=e.touches[0];touchStart={x:t.clientX,y:t.clientY};clearTimeout(timeout);fired=false;timeout=setTimeout(open,3000)}},{passive:true,capture:true});
 face.addEventListener('touchmove',e=>{const t=e.touches[0];if(t&&touchStart&&(Math.abs(t.clientX-touchStart.x)>25||Math.abs(t.clientY-touchStart.y)>25)){clearTimeout(timeout);timeout=null;}},{passive:true,capture:true});
 face.addEventListener('touchend',e=>{clearTimeout(timeout);timeout=null;touchStart=null;if(fired)e.preventDefault()},{passive:false,capture:true});
 // Four separate ambient sleep motions, randomized only when the market is closed.
 const cycle=()=>{if(document.hidden)return;const closed=/chiusi/i.test($('#marketText')?.textContent||'');document.body.classList.remove('fh8-sleep-1','fh8-sleep-2','fh8-sleep-3','fh8-sleep-4');if(closed){const n=1+Math.floor(Math.random()*4);document.body.classList.add('fh8-sleep-'+n);}};
 cycle();setInterval(cycle,11000);
 const arcade=$('#finnArcade .arcade-bottom');if(arcade)arcade.textContent='Muovi Finn con un dito.';
 const labHint=$('#mascotLab .hint');if(labHint)labHint.textContent='Tocca Finn.';
}
function openProfileCard(){
 let m=$('#fh8ProfileModal');if(!m){m=document.createElement('div');m.id='fh8ProfileModal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.innerHTML='<div id="fh8ProfileCard"><div class="fh8-credit"><img src="./finholdra-header-bianco-positive.svg?v=8.0" alt="Finholdra"><span class="fh8-card-chip"></span><span class="fh8-card-name"></span></div><div class="fh8-stats"></div><button type="button">Chiudi</button></div>';document.body.append(m);m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')});m.querySelector('button').onclick=()=>m.classList.remove('open');}
 const v=window.finholdraPublicView?.();const assets=v?.assets||[],total=v?.total||0,invested=v?.capital||0,profit=total-invested;
 m.querySelector('.fh8-card-name').textContent=profileName();
 m.querySelector('.fh8-stats').innerHTML=`<div><small>Patrimonio selezionato</small><strong>${euro(total)}</strong></div><div><small>Capitale investito</small><strong>${euro(invested)}</strong></div><div><small>Risultato lordo</small><strong>${profit>=0?'+':''}${euro(profit)}</strong></div><div><small>Strumenti selezionati</small><strong>${assets.length}</strong></div>`;
 m.classList.add('open');
}
// Short source code and country marker rules; ETF domicile is NOT equivalent to fund exposure.
const COUNTRY={IT:['Italia',438,95],US:['Stati Uniti',153,113],DE:['Germania',432,72],FR:['Francia',416,88],GB:['Regno Unito',400,78],CH:['Svizzera',430,91],JP:['Giappone',686,130],CA:['Canada',145,66],ES:['Spagna',400,107],NL:['Paesi Bassi',418,74],LU:['Lussemburgo',423,80],IE:['Irlanda',393,81],AU:['Australia',695,230],CN:['Cina',645,120],BR:['Brasile',256,205],IN:['India',584,159]};
function countryForAsset(a){if(!['Azioni','Obbligazioni','Risparmio postale'].includes(a.cat))return '';let code=(a.isin||'').slice(0,2).toUpperCase();if(COUNTRY[code])return code;return ''}
function drawWorld(){
 const source=window.finholdraPublicView?.();const wrap=$('#fh8Exposure');if(!wrap)return;
 const items=source?.assets||[];const included=items.filter(a=>a.value>0),total=included.reduce((n,a)=>n+a.value,0);
 const aggregate={};included.forEach(a=>{const c=countryForAsset(a);if(c)aggregate[c]=(aggregate[c]||0)+Number(a.value||0)});
 const known=Object.entries(aggregate).sort((a,b)=>b[1]-a[1]);const unknown=Math.max(0,total-known.reduce((s,[,v])=>s+v,0));
 const svg=`<svg viewBox="0 0 800 300" role="img" aria-label="Mappa geografica indicativa delle esposizioni dirette"><rect width="800" height="300" rx="16" fill="#102942"/><g fill="#315576" stroke="#4a7192" stroke-width="1" opacity=".95"><path d="M65 68L122 44 182 42 229 63 253 97 219 135 179 154 163 184 136 186 122 141 95 137 61 109Z"/><path d="M199 170L241 159 286 185 284 222 258 284 230 264 208 227Z"/><path d="M368 80L425 59 463 76 479 109 460 131 417 126 393 104Z"/><path d="M407 122L463 115 497 157 488 217 453 268 430 221Z"/><path d="M476 61L560 42 648 62 708 104 717 153 676 168 637 146 595 180 555 162 520 130 489 131Z"/><path d="M660 226L718 217 745 249 717 270 673 260Z"/></g><g>${known.map(([code,v])=>{const [name,x,y]=COUNTRY[code];const r=Math.min(15,Math.max(5,10*v/Math.max(total,1)*5));return `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--fh8-map-highlight,#09d66b)" stroke="#fff" stroke-width="1.7"><title>${esc(name)}: ${fmt(v/Math.max(total,1)*100)}%</title></circle>`}).join('')}</g><text x="17" y="283" fill="#bfd2e2" font-size="12">Esposizione diretta verificabile</text></svg>`;
 const rows=known.map(([c,v])=>`<span>${COUNTRY[c][0]} · ${fmt(v/Math.max(total,1)*100)}%</span>`).join('');
 wrap.innerHTML='<h3>🌍 Dove investi</h3><p>Paesi individuati dai titoli diretti delle categorie attive.</p>'+svg+'<div class="fh8-country-rows">'+(rows||'<span>Nessun Paese diretto identificabile</span>')+(unknown>0?`<span>Altri / ETF globali · ${fmt(unknown/Math.max(total,1)*100)}%</span>`:'')+'</div><div class="fh8-note">Gli ETF non vengono attribuiti al Paese di domicilio: servono le partecipazioni effettive per una mappa completa.</div>';
 const mood=$('#headerMoodText')?.textContent?.toLowerCase()||'';
 wrap.style.setProperty('--fh8-map-highlight',mood.includes('negativ')?'#ef4444':mood.includes('stabil')?'#72e59d':'#09d66b');
 // Real Natural Earth country boundaries. Country exposure is shown only where directly attributable.
 fetch('./world-map.svg?v=8.1').then(r=>{if(!r.ok)throw Error('map unavailable');return r.text()}).then(svgText=>{
   if(!wrap.isConnected)return;const node=wrap.querySelector('svg');if(!node)return;
   const holder=document.createElement('div');holder.innerHTML=svgText;
   const real=holder.querySelector('svg');if(!real)return;
   const colors=Object.keys(aggregate);for(const p of real.querySelectorAll('[data-iso]')){
      const code=p.getAttribute('data-iso');if(colors.includes(code)){
         p.setAttribute('fill','var(--fh8-map-highlight,#09d66b)');p.setAttribute('stroke','#d8f8e6');p.setAttribute('stroke-width','1.2');
         const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=(COUNTRY[code]?.[0]||code)+' · '+fmt(aggregate[code]/Math.max(total,1)*100)+'%';p.appendChild(title);
      }
   }node.replaceWith(real);
 }).catch(()=>{});

}
function setupMap(){const shell=$('.finholdra-news-shell');if(!shell||$('#fh8Exposure'))return;const sec=document.createElement('section');sec.id='fh8Exposure';shell.append(sec);const btn=$('#finholdraBrandTrigger');btn?.addEventListener('click',()=>setTimeout(drawWorld,40));drawWorld();}
function setupArchiveIcons(){
 const root=$('#tradeEventList');if(!root)return;
 const decorate=()=>{root.querySelectorAll('.transaction-history-row').forEach(row=>{if(row.dataset.fh8Icon)return;row.dataset.fh8Icon='1';const label=row.textContent||'',cat=row.dataset.fh8Cat||'';const cls=cat==='ETF'||cat==='ETF monetari'?'📊':cat==='Crypto'?'₿':cat==='Obbligazioni'?'🏛️':cat==='Azioni'?'📈':cat==='Oro'?'🟡':cat==='Risparmio postale'?'🏤':cat==='Futures'?'📉':cat==='Conto deposito'?'🏦':cat==='Valute'?'💱':cat==='ETC/ETN'?'📜':'💼';const ico=document.createElement('span');ico.textContent=cls;ico.style.cssText='display:inline-grid;place-items:center;width:28px;height:28px;font-size:18px;float:left;margin:4px 9px 0 0;border-radius:7px;background:var(--panel2)';row.prepend(ico);});};
 // Observe only trade list additions, not document or its text nodes.
 const observer=new MutationObserver(decorate);observer.observe(root,{childList:true});decorate();
}
function setupHistory(){
 const select=$('#historyCategory');if(select){[...select.options].filter(o=>o.value==='Crypto'||o.text.toLowerCase()==='crypto').forEach(o=>o.remove());if(select.value==='Crypto'){select.value='ETF';select.dispatchEvent(new Event('change',{bubbles:true}));}}
 const h=$('#historyView .sub-screen-head p');if(h)h.textContent='Rendimento · Ultimo giorno · Archivio';
}

function setupChart(){
 const detail=$('#assetDetailChart');if(!detail||detail.dataset.fh8ChartInit)return;detail.dataset.fh8ChartInit='1';
 const modal=document.createElement('section');modal.id='fh8ChartModal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.innerHTML='<div class="fh8-chart-head"><strong>Grafico interattivo</strong><button id="fh8Close" type="button">× Chiudi</button></div><div id="fh8ChartArea"></div><div id="fh8ChartStatus">Muovi il dito sul grafico per vedere prezzo e data</div><small id="fh8BuysInfo"></small><div id="fh8ChartActions"><button id="fh82PanLeft" type="button" aria-label="Sposta grafico a sinistra">←</button><button id="fh8Minus">− Zoom</button><button id="fh8Reset">Ripristina</button><button id="fh8Plus">+ Zoom</button><button id="fh82PanRight" type="button" aria-label="Sposta grafico a destra">→</button><button id="fh8AB">A↔B</button></div>';
 document.body.append(modal);
 const area=$('#fh8ChartArea'),status=$('#fh8ChartStatus'),info=$('#fh8BuysInfo');
 let values=[],rawXs=[],markers=[],currency='EUR',lo=0,hi=0,drawn=[],selected=[],isAB=false,pressId=null,pressed=false,lastIndex=-1,previousBodyOverflow='';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const sourceSvg=()=>detail.querySelector('#detailSvg');
 function extract(){
  const src=sourceSvg(),series=src?.getAttribute('data-ab-series');if(!src||!series)return false;
  let parsed;try{parsed=JSON.parse(decodeURIComponent(series))}catch(_){return false}
  values=(parsed.pts||[]).map(x=>({x:Number(x.x),y:Number(x.y),v:Number(x.value),date:String(x.label||'')})).filter(x=>Number.isFinite(x.x)&&Number.isFinite(x.v));
  if(values.length<2)return false;currency=parsed.currency||'EUR';lo=0;hi=values.length-1;selected=[];isAB=false;$('#fh8AB').classList.remove('is-active');
  const xMin=values[0].x,xMax=values.at(-1).x,denom=Math.max(1e-9,xMax-xMin);
  const allBuys=src.getAttribute('data-fh81-buys');
  if(allBuys){try{
   const listed=JSON.parse(decodeURIComponent(allBuys));
   markers=listed.map(item=>{let idx=0,dist=Infinity;for(let j=0;j<values.length;j++){const delta=Math.abs(values[j].x-Number(item.x));if(delta<dist){dist=delta;idx=j;}}return {i:idx,label:item.label||'Acquisto registrato'};});
  }catch(e){markers=[];}}
  else markers=Array.from(src.querySelectorAll('g.fh-buy-marker')).map(g=>{
   const c=g.querySelector('circle');if(!c)return null;const cx=Number(c.getAttribute('cx'));if(!Number.isFinite(cx))return null;
   let i=0,dist=Infinity;for(let j=0;j<values.length;j++){const delta=Math.abs(values[j].x-cx);if(delta<dist){i=j;dist=delta}}
   return {i,label:g.querySelector('title')?.textContent?.trim()||'Acquisto registrato'};
  }).filter(Boolean);
  return true;
 }
 function visible(){return values.slice(lo,hi+1)}
 function graphDimensions(){const W=Math.max(360,area.clientWidth||360),H=Math.max(170,area.clientHeight||180),L=64,R=23,T=27,B=33;return {W,H,L,R,T,B}}
 function plot(){const xs=visible();if(xs.length<2)return;
  const {W,H,L,R,T,B}=graphDimensions();const vals=xs.map(p=>p.v),min=Math.min(...vals),max=Math.max(...vals),spread=Math.max(.0001,max-min),low=min-spread*.12,high=max+spread*.13;
  const x=i=>L+i/Math.max(1,xs.length-1)*(W-L-R),y=v=>T+(1-(v-low)/(high-low))*(H-T-B);
  drawn=xs.map((p,i)=>({point:p,absolute:lo+i,x:x(i),y:y(p.v)}));
  const path=drawn.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+' '+p.y.toFixed(2)).join(' ');
  const yAxis=[0,1,2,3,4].map(j=>{const py=T+j*(H-T-B)/4;return `<line x1="${L}" y1="${py}" x2="${W-R}" y2="${py}" stroke="#355370" stroke-dasharray="5 7"/><text x="3" y="${py+4}" fill="#aec8d7" font-size="11">${fmt(high-(high-low)*j/4,2)}</text>`}).join('');
  const pmcText=$('#assetDetailPmc')?.textContent||'';const pmcMatch=pmcText.match(/[\d.,]+/),pmc=pmcMatch?Number(pmcMatch[0].replace(/\./g,'').replace(',','.')):NaN;
  const pmcMarkup=Number.isFinite(pmc)&&pmc>low&&pmc<high?`<line x1="${L}" x2="${W-R}" y1="${y(pmc)}" y2="${y(pmc)}" stroke="#f7be57" stroke-dasharray="8 7" stroke-width="1.8"/>`:'';
  const last=drawn.at(-1),first=drawn[0];const color=last.point.v>=first.point.v?'#38d8a3':'#ff8796';
  const visibleMarkers=markers.filter(m=>m.i>=lo&&m.i<=hi);
  // Fullscreen is a detailed view: display individual labels, no clustering into one B.
  const perPoint=new Map();const buys=visibleMarkers.map((m,j)=>{
    const dp=drawn[m.i-lo];const ordinal=perPoint.get(m.i)||0;perPoint.set(m.i,ordinal+1);
    const markerX=dp.x+Math.min(ordinal,4)*11, markerY=T+ordinal*23;
    return `<g class="fh8-buy"><line x1="${dp.x}" y1="${dp.y}" x2="${markerX}" y2="${markerY+8}" stroke="#31d2b2" stroke-dasharray="4 6" opacity=".6"/><circle cx="${dp.x}" cy="${dp.y}" r="4.5" fill="#31d2b2" stroke="#092038" stroke-width="1.5"/><circle cx="${markerX}" cy="${markerY}" r="10" fill="#30d5b6"/><text x="${markerX}" y="${markerY+4}" text-anchor="middle" font-size="11" fill="#062639" font-weight="800">B</text><title>${esc(m.label)}</title></g>`;
   }).join('');
  area.innerHTML=`<svg id="fh8Svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="Grafico ingrandito con acquisti"><defs><linearGradient id="fh8Fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity=".23"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><rect width="${W}" height="${H}" fill="#081a2d"/>${yAxis}<path d="${path} L ${last.x} ${H-B} L ${first.x} ${H-B}Z" fill="url(#fh8Fill)"/>${pmcMarkup}<path d="${path}" fill="none" stroke="${color}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>${buys}<text x="${L}" y="${H-7}" font-size="11" fill="#a9bacd">${esc(first.point.date)}</text><text x="${W-R}" y="${H-7}" text-anchor="end" font-size="11" fill="#a9bacd">${esc(last.point.date)}</text><g id="fh8Cursor"></g></svg>`;
  info.textContent=`Acquisti nel periodo: ${markers.filter(m=>m.i>=lo&&m.i<=hi).length} · ${markers.length} marker nel grafico originale`;
  const leftButton=$('#fh82PanLeft'),rightButton=$('#fh82PanRight');if(leftButton)leftButton.disabled=lo<=0;if(rightButton)rightButton.disabled=hi>=values.length-1;
  lastIndex=-1;
 }
 // Screen-space projection is orientation-aware. In CSS-rotated Safari portrait,
 // graph-local X runs along the physical Y screen axis, NOT clientX.
 function graphX(clientX,clientY){
   const svg=$('#fh8Svg');if(!svg)return 0;const rect=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;
   const rotated=window.matchMedia('(max-width:767px) and (orientation:portrait)').matches;
   return rotated ? (clientY-rect.top)*vb.width/Math.max(1,rect.height) : (clientX-rect.left)*vb.width/Math.max(1,rect.width);
 }
 function nearest(clientX,clientY){const x=graphX(clientX,clientY);let best=0,dist=Infinity;drawn.forEach((pt,i)=>{const d=Math.abs(pt.x-x);if(d<dist){dist=d;best=i}});return best}
 function renderCursor(idx){const overlay=$('#fh8Cursor'),svg=$('#fh8Svg');if(!overlay||!svg||!drawn[idx])return;
   const p=drawn[idx],vb=svg.viewBox.baseVal,top=27,bottom=vb.height-33;
   let anchors='';if(isAB){selected.forEach((at,j)=>{const pp=drawn.find(o=>o.absolute===at);if(pp){anchors+=`<line x1="${pp.x}" x2="${pp.x}" y1="${top}" y2="${bottom}" stroke="#a2c9e8" stroke-dasharray="5 7" stroke-width="1.7"/><circle cx="${pp.x}" cy="${pp.y}" r="7" stroke="white" stroke-width="2" fill="#ffa06c"/><text x="${pp.x}" y="${Math.max(top+11,pp.y-13)}" font-size="14" text-anchor="middle" font-weight="800" fill="white">${j?'B':'A'}</text>`}})}
   const bubbleX=clamp(p.x-79,64,vb.width-170),bubbleY=clamp(p.y-68,11,vb.height-83);
   const bubble=`<rect x="${bubbleX}" y="${bubbleY}" width="158" height="46" rx="9" fill="#183350" stroke="#7fa8dc" stroke-width="1.2"/><text x="${bubbleX+79}" y="${bubbleY+20}" text-anchor="middle" fill="#fff" font-size="13" font-weight="800">${esc(fmt(p.point.v)+' '+currency)}</text><text x="${bubbleX+79}" y="${bubbleY+36}" text-anchor="middle" fill="#d0dfec" font-size="10">${esc(p.point.date)}</text>`;
   overlay.innerHTML=anchors+`<line x1="${p.x}" x2="${p.x}" y1="${top}" y2="${bottom}" stroke="#a7ceee" stroke-dasharray="5 7" stroke-width="1.5"/><line x1="64" x2="${vb.width-23}" y1="${p.y}" y2="${p.y}" stroke="#88afce" stroke-dasharray="4 7" opacity=".7"/><circle cx="${p.x}" cy="${p.y}" r="6.5" stroke="white" stroke-width="2" fill="#ff8796"/>${bubble}`;
   if(isAB&&selected.length===2){const a=values[selected[0]],b=values[selected[1]];const delta=b.v-a.v,pct=a.v?100*delta/a.v:0;status.textContent=`A ${a.date} → B ${b.date}: ${delta>=0?'+':''}${fmt(delta)} ${currency} · ${pct>=0?'+':''}${fmt(pct)}%`}
   else status.textContent=`${isAB?(selected.length?'B':'A')+' · ':''}${p.point.date} · ${fmt(p.point.v)} ${currency}${isAB?' · solleva per fissare':''}`;
   lastIndex=idx;
 }
 function begin(e){if(e.button!==undefined&&e.button!==0)return;e.preventDefault();pressId=e.pointerId;pressed=true;try{area.setPointerCapture(e.pointerId)}catch(_){}renderCursor(nearest(e.clientX,e.clientY));}
 function move(e){if(!pressed||pressId!==e.pointerId)return;e.preventDefault();renderCursor(nearest(e.clientX,e.clientY));}
 function end(e){if(!pressed||pressId!==e.pointerId)return;e.preventDefault();const idx=nearest(e.clientX,e.clientY);pressed=false;pressId=null;if(isAB&&drawn[idx]){if(selected.length===2)selected=[];selected.push(drawn[idx].absolute);}renderCursor(idx);}
 area.addEventListener('pointerdown',begin,{passive:false});area.addEventListener('pointermove',move,{passive:false});area.addEventListener('pointerup',end,{passive:false});area.addEventListener('pointercancel',()=>{pressed=false;pressId=null});
 // Safari fallback when PointerEvents are not exposed.
 if(!window.PointerEvent){area.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;const t=e.touches[0];begin({clientX:t.clientX,clientY:t.clientY,pointerId:1,preventDefault:()=>e.preventDefault()})},{passive:false});area.addEventListener('touchmove',e=>{const t=e.touches[0];if(t)move({clientX:t.clientX,clientY:t.clientY,pointerId:1,preventDefault:()=>e.preventDefault()})},{passive:false});area.addEventListener('touchend',e=>{const t=e.changedTouches[0];if(t)end({clientX:t.clientX,clientY:t.clientY,pointerId:1,preventDefault:()=>e.preventDefault()})},{passive:false});}
 function open(){if(!extract())return;previousBodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';modal.classList.add('open');requestAnimationFrame(()=>requestAnimationFrame(plot));}
 function close(){modal.classList.remove('open');document.body.style.overflow=previousBodyOverflow;pressed=false;selected=[];}
 $('#fh8Close').onclick=close;
 const zoom=scale=>{if(values.length<2)return;const length=hi-lo+1,target=clamp(Math.round(length*scale),Math.min(8,values.length),values.length),mid=Math.round((lo+hi)/2);lo=clamp(mid-Math.floor(target/2),0,values.length-target);hi=lo+target-1;plot();};
 function pan(dir){
  const length=hi-lo+1;
  if(length>=values.length)return;
  const step=Math.max(1,Math.round(length*.22));
  const next=clamp(lo+dir*step,0,values.length-length);
  if(next===lo)return;
  lo=next;hi=next+length-1;
  // Keep A/B markers only if they remain in the window.
  plot();
 }
 const panLeft=$('#fh82PanLeft'),panRight=$('#fh82PanRight');
 if(panLeft)panLeft.onclick=()=>pan(-1);
 if(panRight)panRight.onclick=()=>pan(1);
 $('#fh8Plus').onclick=()=>zoom(.7);$('#fh8Minus').onclick=()=>zoom(1.45);$('#fh8Reset').onclick=()=>{lo=0;hi=values.length-1;selected=[];isAB=false;$('#fh8AB').classList.remove('is-active');plot();};
 $('#fh8AB').onclick=e=>{isAB=!isAB;selected=[];e.currentTarget.classList.toggle('is-active',isAB);status.textContent=isAB?'Muovi il dito su A e sollevalo; ripeti per B.':'Sposta il dito sul grafico.';plot()};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close()});
 window.addEventListener('resize',()=>{if(modal.classList.contains('open'))requestAnimationFrame(plot)});
 function ensureButton(){const src=sourceSvg();if(!src)return;let btn=$('#fh8Open');if(!btn){btn=document.createElement('button');btn.id='fh8Open';btn.type='button';btn.className='btn';btn.textContent='⛶ Ingrandisci';btn.style.cssText='position:absolute;right:10px;bottom:9px;z-index:7;border:1px solid #769ac0;background:#183b5d;color:white;border-radius:11px;padding:9px 12px;font-size:12px;font-weight:800;';detail.style.position='relative';detail.append(btn);btn.onclick=open;}
 }
 const observer=new MutationObserver(ensureButton);observer.observe(detail,{childList:true});ensureButton();
}
function setup(){setupSettings();setupGate();setupSources();setupHome();setupFinn();setupMap();setupArchiveIcons();setupHistory();setupChart();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
