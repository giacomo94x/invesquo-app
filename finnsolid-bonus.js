/* Finholdra 10.9.88 — native canvas bonus level: entry button only. */
(()=>{'use strict';const root=document.getElementById('finnSolid'),panel=document.getElementById('fsOverlay');if(!root||!panel)return;
const actions=panel.querySelector('.fs-overlay-actions');if(!actions)return;
const btn=document.createElement('button');btn.id='fsBonusStart';btn.className='fs-bonus-trigger';btn.type='button';btn.textContent='✦ Bonus · Operazione Specchio';btn.title='Nuova missione classica top-down con guardie, telecamere, armi, tre obiettivi e fuga';actions.appendChild(btn);
btn.addEventListener('click',()=>{if(typeof window.finholdraStartSolidBonus==='function')window.finholdraStartSolidBonus();else{btn.disabled=true;btn.title='Il motore FinnSolid non è stato caricato';}});
})();
