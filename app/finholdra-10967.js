/* 10.9.67 Mira single-panel controller; safer search status UI */
(()=>{'use strict';
 const ready=()=>{
  const quiz=document.getElementById('miraAcademyChat');
  const behavior=document.getElementById('fhBehavioralAcademy');
  const a=document.getElementById('fhMiraModeQuiz'),b=document.getElementById('fhMiraModeBehavior');
  if(quiz&&behavior&&a&&b){
   const choose=mode=>{
    const isQuiz=mode==='quiz';quiz.hidden=!isQuiz;behavior.hidden=isQuiz;
    a.classList.toggle('active',isQuiz);b.classList.toggle('active',!isQuiz);
    a.setAttribute('aria-selected',String(isQuiz));b.setAttribute('aria-selected',String(!isQuiz));
   };
   a.addEventListener('click',()=>choose('quiz'));b.addEventListener('click',()=>choose('behavior'));
   document.getElementById('miraAcademyOpen')?.addEventListener('click',event=>{event.stopImmediatePropagation();choose('quiz');quiz.hidden=false;event.currentTarget.setAttribute('aria-expanded','true')},true);
   choose('quiz');
  }
  // The issuer's listing and its live quote are different things: label directory matches precisely.
  const add=document.getElementById('assetSearchResults');
  if(add&&window.MutationObserver){
   const mark=()=>{add.querySelectorAll('.search-row').forEach(button=>{
    const i=Number(button.dataset.choice),row=window.__invesquoSearchResults?.[i];
    if(row?.referenceOnly && !button.querySelector('.fh-reference-note')){
     const n=document.createElement('span');n.className='fh-reference-note';n.textContent='Ticker identificato · quotazione da verificare';
     n.style.cssText='display:block;color:var(--muted);font-size:10px;margin-top:3px';button.append(n);
    }
   })};
   new MutationObserver(mark).observe(add,{childList:true});
  }
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
