/* Beta 10.9.59 — settings shortcuts, no changes to account/financial data */
(()=>{
 'use strict';
 const init=()=>{
  const settings=document.getElementById('settingsView');
  const container=settings?.querySelector('.settings-categories');
  if(!settings||!container||settings.querySelector('.fh10959-settings-toolbar'))return;
  const toolbar=document.createElement('div');toolbar.className='fh10959-settings-toolbar';
  const input=document.createElement('input');input.type='search';input.id='fh10959SettingsSearch';input.placeholder='Cerca nelle Impostazioni…';input.setAttribute('aria-label','Cerca sezioni delle Impostazioni');
  const reset=document.createElement('button');reset.type='button';reset.textContent='Azzera ricerca';
  const info=document.createElement('small');info.textContent='Trova rapidamente Backup, Finn, mercati, grafici e preferenze.';
  toolbar.append(input,reset,info);
  const empty=document.createElement('p');empty.className='fh10959-settings-empty';empty.textContent='Nessuna sezione trovata. Prova un altro termine.';
  container.parentNode.insertBefore(toolbar,container);
  container.parentNode.insertBefore(empty,container.nextSibling);
  const categories=[...container.querySelectorAll(':scope > details.settings-macro')];
  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const apply=()=>{
   const q=normalize(input.value);let count=0;
   for(const d of categories){
    const heading=normalize(d.querySelector('summary')?.textContent);
    const matches=!q||heading.includes(q)||normalize(d.textContent).includes(q);
    d.hidden=!matches;
    if(matches)count++;
   }
   empty.classList.toggle('visible',!!q&&!count);
   info.textContent=q?`${count} ${count===1?'sezione trovata':'sezioni trovate'} · Apri la sezione per vedere i comandi.`:'Trova rapidamente Backup, Finn, mercati, grafici e preferenze.';
  };
  input.addEventListener('input',apply);
  reset.addEventListener('click',()=>{input.value='';apply();input.focus()});
  // Open the Finn or backup category by a search result without resetting form state.
  const portrait=document.getElementById('fhBehavioralMiraPortrait');
  portrait?.addEventListener('click',()=>{
   const current=document.querySelector('#fhBehavioralQuestions button.selected')||document.querySelector('#fhBehavioralQuestions button');
   current?.click();document.getElementById('fhBehavioralReply')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
