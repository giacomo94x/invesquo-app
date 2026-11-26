/* Finholdra 10.9.86 — optional FinnSolid secret bonus: original signal-memory vault. */
(()=>{'use strict';
const root=document.getElementById('finnSolid'),world=document.getElementById('fsWorld'),overlay=document.getElementById('fsOverlay');
if(!root||!world||!overlay)return;
const actions=overlay.querySelector('.fs-overlay-actions');if(!actions)return;
const trigger=document.createElement('button');trigger.type='button';trigger.id='fsBonusStart';trigger.className='fs-bonus-trigger';trigger.textContent='✦ Missione bonus · Il Vault dei Segnali';trigger.title='Tre stanze segrete: ricorda i segnali nel giusto ordine, senza errori';
actions.append(trigger);
const screen=document.createElement('section');screen.id='fsBonusScreen';screen.className='fs-bonus-screen';screen.hidden=true;screen.setAttribute('role','dialog');screen.setAttribute('aria-modal','true');screen.setAttribute('aria-label','FinnSolid: bonus Vault dei Segnali');
screen.innerHTML='<header class="fs-bonus-top"><div><small>FINNSOLID · MISSIONE SEGRETA</small><h2>✦ Il Vault dei Segnali</h2></div><button type="button" class="fs-bonus-exit" aria-label="Esci dal livello bonus">✕ Esci</button></header><div class="fs-bonus-status"><span id="fsBonusRound">Stanza 1 / 3</span><strong id="fsBonusLives">◈ ◈ ◈</strong></div><p id="fsBonusMessage" aria-live="polite">Nexus ha intercettato una sequenza segreta. Memorizzala e ripetila.</p><div class="fs-bonus-board" id="fsBonusBoard" aria-label="Griglia interattiva a sedici segnali"></div><div class="fs-bonus-progress" id="fsBonusProgress"></div><div class="fs-bonus-actions"><button type="button" id="fsBonusGo">▶ Osserva i segnali</button><button type="button" id="fsBonusRestart" hidden>↻ Riprova il bonus</button></div><p class="fs-bonus-foot">Nexus trasmette i segnali. Mira ti guida a decifrarli. Supera tre stanze con massimo tre errori.</p>';
world.append(screen);
const board=screen.querySelector('#fsBonusBoard'),message=screen.querySelector('#fsBonusMessage'),roundEl=screen.querySelector('#fsBonusRound'),livesEl=screen.querySelector('#fsBonusLives'),progress=screen.querySelector('#fsBonusProgress'),go=screen.querySelector('#fsBonusGo'),retry=screen.querySelector('#fsBonusRestart');
for(let i=0;i<16;i++){const b=document.createElement('button');b.type='button';b.className='fs-bonus-tile';b.dataset.cell=String(i);b.setAttribute('aria-label','Segnale '+(i+1));b.textContent=['◇','△','□','✦'][Math.floor(i/4)];board.append(b)}
let on=false,round=1,errors=0,sequence=[],step=0,preview=false,timers=[];
function later(fn,ms){const id=setTimeout(fn,ms);timers.push(id);return id}
function cancel(){timers.forEach(clearTimeout);timers=[]}
function tiles(){return [...board.querySelectorAll('button')]}
function highlight(cell,ms=430){const tile=tiles()[cell];if(!tile)return;tile.classList.add('flash');later(()=>tile.classList.remove('flash'),ms)}
function status(){roundEl.textContent='Stanza '+round+' / 3';livesEl.textContent='◈ '.repeat(Math.max(0,3-errors))+'◇ '.repeat(errors);progress.textContent=Array.from({length:sequence.length},(_,i)=>i<step?'◆':'◇').join(' ')}
function open(){if(on)return;on=true;round=1;errors=0;step=0;sequence=[];preview=false;cancel();screen.hidden=false;screen.classList.add('open');go.hidden=false;retry.hidden=true;go.disabled=false;message.textContent='MIRA: «Nexus ha trovato tre stanze crittografate. Osserva i segnali e ripetili nell’ordine.»';status();screen.querySelector('.fs-bonus-exit').focus()}
function close(){cancel();on=false;screen.hidden=true;screen.classList.remove('open');tiles().forEach(b=>b.classList.remove('flash','correct','wrong'))}
function complete(){preview=true;go.hidden=true;retry.hidden=false;message.textContent='🏆 VAULT DECIFRATO! Nexus: «Protocollo SIGMA recuperato. Finholdra è al sicuro.» · '+(3-errors)+' energia residua.';try{localStorage.setItem('finholdra_finnsolid_bonus_sigma','completed')}catch(_){}status()}
function fail(){preview=true;go.hidden=true;retry.hidden=false;message.textContent='🚨 Segnali compromessi. Mira: «Ci riproviamo, ma ora conosci il codice.»';status()}
function newSequence(){const length=round+2;sequence=[];let prev=-1;for(let i=0;i<length;i++){let x=Math.floor(Math.random()*16);while(x===prev)x=Math.floor(Math.random()*16);sequence.push(x);prev=x}step=0;status()}
function show(){if(!on)return;preview=true;go.disabled=true;tiles().forEach(b=>b.classList.remove('correct','wrong'));message.textContent='NEXUS: «Guarda bene. I segnali appaiono uno dopo l’altro.»';sequence.forEach((v,i)=>later(()=>{if(on)highlight(v,500)},700+i*800));later(()=>{if(!on)return;preview=false;message.textContent='MIRA: «Tocca le caselle nello stesso ordine.»';go.hidden=true;status()},800+sequence.length*800)}
function startRound(){cancel();newSequence();show()}
function choose(cell){if(!on||preview||go.hidden===false||retry.hidden===false)return;const b=tiles()[cell];if(cell===sequence[step]){b.classList.add('correct');later(()=>b.classList.remove('correct'),260);step++;status();if(step>=sequence.length){preview=true;if(round>=3){later(complete,550)}else{message.textContent='🔓 Stanza '+round+' superata! Preparati al prossimo codice.';round++;later(startRound,1400)}}}else{errors++;b.classList.add('wrong');later(()=>b.classList.remove('wrong'),400);status();if(errors>=3){fail();return;}preview=true;message.textContent='⚠️ Segnale errato. Nexus ritrasmette il codice: '+(3-errors)+' tentativi rimasti.';later(show,1100)}}
trigger.addEventListener('click',open);screen.querySelector('.fs-bonus-exit').addEventListener('click',close);
go.addEventListener('click',startRound);retry.addEventListener('click',()=>{close();open()});board.addEventListener('click',e=>{const b=e.target.closest('[data-cell]');if(b)choose(Number(b.dataset.cell))});
window.addEventListener('keydown',e=>{if(on&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close()}},true);
})();
