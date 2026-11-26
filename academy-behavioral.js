/* Finholdra Academy 10.9.47 — behavioral finance and Mira's educational coaching. */
(()=>{
 'use strict';
 const root=document.getElementById('fhBehavioralAcademy');
 if(!root)return;
 const buttons=root.querySelector('#fhBehavioralQuestions');
 const response=root.querySelector('#fhBehavioralReply');
 const focus=root.querySelector('#fhBehavioralContext');
 const sources=root.querySelector('#fhBehavioralSources');
 const menu=[
  ['recent','Ho iniziato a investire da poco'],
  ['drop','Il mercato scende: cosa faccio?'],
  ['red','Vedere il rosso mi preoccupa'],
  ['frequency','Controllo il portafoglio di continuo'],
  ['sell','Ho voglia di vendere per paura'],
  ['green','Il mercato sale, non voglio perdere l’occasione'],
  ['averaging','Ho acquistato a un prezzo più alto'],
  ['diversification','Un singolo titolo trascina tutto giù'],
  ['horizon','Come ragionare sul lungo periodo'],
  ['loss','Perché le perdite fanno più male dei guadagni?'],
  ['noise','Notizie allarmanti e previsioni'],
  ['habits','Costruiamo una routine più serena']
 ];
 const studies={
  kahneman:'Kahneman e Tversky, 1979 · Prospect Theory',
  benartzi:'Benartzi e Thaler, 1995 · Myopic Loss Aversion',
  barber:'Barber e Odean, 2000 · Trading Is Hazardous to Your Wealth'
 };
 const links={
  kahneman:'https://www.anderson.ucla.edu/faculty_pages/keith.chen/negot.%20papers/KahnemanTversky_ProsTheory79.pdf',
  benartzi:'https://academic.oup.com/qje/article-abstract/110/1/73/1894013',
  barber:'https://onlinelibrary.wiley.com/doi/10.1111/0022-1082.00226'
 };
 let current='recent';
 function context(){
  let p=NaN, start='';
  try{
   if(typeof totalCapital==='function' && typeof totalValue==='function'){
    const c=totalCapital(),v=totalValue();
    if(Number.isFinite(c)&&c>0) p=(v-c)/c*100;
   }
   if(typeof trades!=='undefined' && Array.isArray(trades)){
    const recorded=trades.map(t=>String(t.date||'')).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    start=recorded[0]||'';
   }
  }catch(_){/* Academy must work without portfolio data. */}
  const months=start ? Math.max(0,(Date.now()-new Date(start+'T12:00:00').getTime())/(86400000*30.44)):null;
  return {p,months};
 }
 function styleSign(v){return v>=0?'fh-beh-positive':'fh-beh-negative'}
 function contextLabel(c){
  const age=c.months===null?'':c.months<3?' · Operatività documentata: meno di 3 mesi':c.months<12?' · Operatività documentata: meno di un anno':' · Operatività documentata: oltre un anno';
  if(!Number.isFinite(c.p))return 'Mira non ha una valutazione completa del portafoglio disponibile in questa vista.'+age;
  return `Patrimonio selezionato: <b class="${styleSign(c.p)}">${c.p>=0?'+':''}${c.p.toLocaleString('it-IT',{maximumFractionDigits:2,minimumFractionDigits:2})}%</b> rispetto al capitale attualmente investito${age}. <small>Indicazione non equiparabile al rendimento ROI/TWRR/MWRR.</small>`;
 }
 function script(topic,c){
  const down=Number.isFinite(c.p)&&c.p<0,up=Number.isFinite(c.p)&&c.p>0;
  const newInvestor=c.months!==null&&c.months<6;
  const contextual=down?'Vedo un valore sotto il capitale investito.':up?'Vedo un valore sopra il capitale investito.':'Non vedo una differenza affidabile da interpretare qui.';
  const lines={
   recent:[`«${newInvestor?'Hai iniziato da pochi mesi: è comprensibile che ogni oscillazione sembri importante.':'All’inizio di un piano ogni movimento cattura l’attenzione.'} Una manciata di settimane non racconta l’esito di un progetto pluriennale. Prima di giudicare il risultato, ricorda perché hai scelto l’orizzonte e quanto rischio puoi sostenere.»`,`«Un segnale utile non è la sola quotazione di oggi: è se il tuo piano, la diversificazione e le riserve per imprevisti sono ancora adeguati. Se il denaro serve presto, il ragionamento cambia.»`],
   drop:[`«${contextual} Una discesa di mercato può essere normale in un investimento rischioso; non è però una promessa che il valore tornerà presto su. Se il tuo obiettivo è lontano e il portafoglio è coerente con il rischio scelto, una correzione da sola non impone di cambiare strada.»`,`«Prima di agire, distingui un calo temporaneo da un cambiamento reale delle tue esigenze. Chiediti: ho bisogno di questi soldi a breve? La concentrazione è troppo alta? Quanto sopporterei un’ulteriore discesa?»`],
   red:[`«Il rosso pesa molto. Kahneman e Tversky hanno mostrato che valutiamo guadagni e perdite in modo asimmetrico: una perdita può farci reagire più intensamente di un guadagno comparabile.»`,`«Prova a separare la reazione emotiva dal piano. La sensazione è reale, ma non è una previsione. Se l’ansia compromette sonno e decisioni, può essere il momento di rivedere il rischio che sei disposto a sostenere.»`],
   frequency:[`«Ogni controllo ripetuto ti espone a nuove variazioni casuali. Benartzi e Thaler hanno studiato l’avversione miope alle perdite: concentrarsi sul breve termine può rendere le oscillazioni più difficili da sopportare.»`,`«Scegli una frequenza di controllo coerente con l’investimento e separa la verifica tecnica del portafoglio dalla tentazione di decidere ogni volta. Meno notifiche non significa meno attenzione ai rischi.»`],
   sell:[`«La paura suggerisce una soluzione immediata: vendere, così il numero smette di oscillare. Prima di premere il pulsante, distingui una decisione pianificata da una fuga dal disagio.»`,`«Annota cosa è cambiato da quando hai investito. Se obiettivi, liquidità e rischio sono invariati, prova a rimandare una decisione impulsiva finché puoi valutarla con calma. Se invece i presupposti sono cambiati, è giusto rivalutare il piano.»`],
   green:[`«${up?'La crescita è piacevole, ma non rende automaticamente sicuro il prossimo acquisto.':'Anche quando un mercato accelera, inseguire il rialzo è una tentazione comune.'} La FOMO può farti confondere la recente crescita con una garanzia di quella futura.»`,`«Domandati se acquisteresti lo stesso strumento anche senza vedere il grafico dell’ultima settimana. Un piano valido non dovrebbe dipendere dall’euforia di un pomeriggio.»`],
   averaging:[`«Il tuo prezzo di acquisto è un riferimento contabile, non il valore giusto che il mercato ti deve restituire. L’effetto ancoraggio ci fa attribuire un’importanza eccessiva a un numero visto per primo.»`,`«Un nuovo acquisto non è automaticamente migliore solo perché abbassa il PMC. Verifica prima la qualità dello strumento, il rischio complessivo e il peso che assumerebbe nel portafoglio.»`],
   diversification:[`«Quando un solo titolo domina i movimenti, non stai vedendo soltanto volatilità: potresti avere una concentrazione. La diversificazione non elimina le perdite, ma riduce la dipendenza dal destino di un singolo investimento.»`,`«Osserva i pesi effettivi e le correlazioni tra strumenti. Avere molti ticker non significa necessariamente avere rischi diversi.»`],
   horizon:[`«Un orizzonte lungo cambia la lente con cui osservare il mercato, non elimina il rischio. Anche anni di attesa non garantiscono un risultato positivo.»`,`«Per un obiettivo lontano puoi valutare il percorso in tappe; per spese imminenti contano molto la disponibilità del capitale e la possibilità di perdite al momento del bisogno. La cosa importante è non confondere le due scadenze.»`],
   loss:[`«Immagina +100 € e −100 €: non è detto che le due emozioni si compensino. La Prospect Theory di Kahneman e Tversky descrive proprio come il punto di riferimento e le perdite influenzano le scelte.»`,`«Un esercizio: giudica una decisione con le informazioni che avevi prima, non soltanto con il risultato dopo. Una buona decisione può avere un esito sfortunato e viceversa.»`],
   noise:[`«Una notizia forte cattura più attenzione di una variazione lenta. Il cervello tende a sovrastimare ciò che è recente e facile da ricordare: è la scorciatoia della disponibilità.»`,`«Prima di cambiare il piano per un titolo di giornale, chiediti quale informazione nuova modifica davvero gli utili attesi, il rischio o il tuo bisogno di liquidità. Non tutte le notizie richiedono un’azione.»`],
   habits:[`«Costruiamo una piccola routine: primo, definisci scopo e orizzonte; secondo, controlla costi e pesi; terzo, usa un calendario di revisione; quarto, annota il motivo delle operazioni prima di eseguirle.»`,`«Barber e Odean hanno documentato che il trading molto frequente può penalizzare i risultati degli investitori individuali. Non serve fare qualcosa ogni volta che apri Finholdra: a volte una buona scelta è soltanto osservare.»`]
  };
  const refs={recent:['benartzi'],drop:['benartzi'],red:['kahneman'],frequency:['benartzi'],sell:['kahneman'],green:['kahneman'],averaging:['kahneman'],diversification:['kahneman'],horizon:['benartzi'],loss:['kahneman'],noise:['kahneman'],habits:['barber']};
  return {lines:lines[topic]||lines.recent,refs:refs[topic]||['kahneman']};
 }
 function render(topic){
  current=topic;const c=context();
  buttons.querySelectorAll('button').forEach(b=>{const selected=b.dataset.behavior===topic;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected))});
  focus.innerHTML=contextLabel(c);
  const {lines,refs}=script(topic,c);
  response.replaceChildren();
  const block=document.createElement('div');block.className='fh-beh-dialogue';const who=document.createElement('strong');who.textContent='MIRA';block.append(who);lines.forEach(t=>{const paragraph=document.createElement('p');paragraph.textContent=t;block.append(paragraph)});response.append(block);
  sources.replaceChildren();
  refs.forEach(r=>{const a=document.createElement('a');a.href=links[r];a.target='_blank';a.rel='noopener noreferrer';a.textContent=studies[r];sources.append(a)});
 }
 buttons.innerHTML=menu.map(([id,label])=>`<button type="button" data-behavior="${id}" aria-pressed="false">${label}</button>`).join('');
 buttons.addEventListener('click',event=>{const b=event.target.closest('button[data-behavior]');if(b)render(b.dataset.behavior)});
 document.getElementById('fhBehavioralRefresh')?.addEventListener('click',()=>render(current));
 render('recent');
})();
