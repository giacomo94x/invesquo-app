/* Google Drive private appDataFolder. Access tokens remain in memory. */
(()=>{'use strict';
const scope='https://www.googleapis.com/auth/drive.appdata',api='https://www.googleapis.com/drive/v3/files',upload='https://www.googleapis.com/upload/drive/v3/files';
let token='',expiry=0,busy=false,client=null,ready=false,activeStatus=null,autoRetryAt=0,autoMessage='';
const intervals=[15,30,60,180,360,720,1440,4320,10080];
const account=()=>window.FINHOLDRA_CLOUD_BRIDGE?.accountId();
const sim=()=>new URLSearchParams(location.search).get('simulation')==='1';
const key=()=> 'fh_drive_auto_1062_'+account();
function config(){try{const c=JSON.parse(localStorage.getItem(key())||'{}');return {...c,minutes:intervals.includes(Number(c.minutes))?Number(c.minutes):60}}catch(_){return {minutes:60}}}
function persist(c){localStorage.setItem(key(),JSON.stringify(c));}
const authorized=()=>!!token&&Date.now()<expiry;
function pauseAuto(message){autoMessage=message;paintAuto();}
function stopAuto(){if(!account()||sim())return;const c=config();if(c.enabled){persist({...c,enabled:false});autoMessage='Backup automatico disattivato.';paintAuto()}}
const $=id=>document.getElementById(id),gate=$('accountGate')?.querySelector('.account-panel');
const note=(el,text)=>{if(el)el.textContent=text};
const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=()=>{ready=true};document.head.appendChild(script);
async function request(url,opts={}){if(!token||Date.now()>=expiry)throw Error('Sessione Google scaduta. Riprova.');const r=await fetch(url,{...opts,signal:AbortSignal.timeout(30000),headers:{Authorization:'Bearer '+token,...opts.headers}});if(!r.ok){if(r.status===401){token='';expiry=0}throw Error('Google Drive: '+r.status+' '+(await r.json().catch(()=>({}))).error?.message)}return r;}
async function find(){let files=[],page='';do{const q=new URLSearchParams({spaces:'appDataFolder',q:"name contains 'Finholdra - ' and trashed = false",fields:'nextPageToken,files(id,name,modifiedTime,size)',orderBy:'modifiedTime desc',pageSize:'100'});if(page)q.set('pageToken',page);const j=await (await request(api+'?'+q)).json();files.push(...(j.files||[]));page=j.nextPageToken||''}while(page);return files;}
function authorize(status,work){if(busy)return;activeStatus=status;if(!ready&&!window.google?.accounts?.oauth2){note(status,'Google non ancora disponibile: controlla la connessione e riprova.');return}busy=true;note(status,'Seleziona il tuo account Google…');const finish=async()=>{try{await work()}catch(e){note(status,'Operazione non riuscita: '+e.message);if(status?.id==='fhDriveAutoStatus')autoMessage='Operazione non riuscita: '+e.message}finally{busy=false;paintAuto()}};try{client=google.accounts.oauth2.initTokenClient({client_id:window.FINHOLDRA_GOOGLE_CLIENT_ID,scope,include_granted_scopes:false,callback:r=>{if(!r.access_token||!google.accounts.oauth2.hasGrantedAllScopes(r,scope)){busy=false;note(status,'Autorizzazione a Google Drive non concessa.');if(status?.id==='fhDriveAutoStatus')autoMessage='Autorizzazione non concessa.';paintAuto();return}token=r.access_token;expiry=Date.now()+Number(r.expires_in||3600)*1000-30000;void finish()},error_callback:e=>{busy=false;note(status,'Accesso Google interrotto: '+(e.type||'riprova'));if(status?.id==='fhDriveAutoStatus')autoMessage='Accesso Google interrotto.';paintAuto()}});client.requestAccessToken({prompt:'select_account'});}catch(e){busy=false;note(status,e.message)}}
function date(v){return new Date(v).toLocaleString('it-IT')}
async function restore(f,status,targetId){if(busy)return;busy=true;try{if(!confirm('Ripristinare '+f.name+' del '+date(f.modifiedTime)+'?'))return;stopAuto();note(status,'Scaricamento backup…');if(Number(f.size)>40*1024*1024)throw Error('Backup oltre 40 MB.');const blob=await(await request(api+'/'+encodeURIComponent(f.id)+'?alt=media')).blob();if(blob.size>40*1024*1024)throw Error('Backup oltre 40 MB.');const restored=await window.finholdraRestoreLoginFile(new File([blob],f.name,{type:'application/json'}),targetId);if(restored!==true)throw Error('Ripristino non completato. Controlla il messaggio di importazione, senza modificare il backup Drive.');note(status,'Ripristino verificato.');}catch(e){note(status,e.message)}finally{busy=false}}
async function list(status,box,targetId){const files=await find();box.replaceChildren();note(status,files.length?files.length+' backup disponibili':'Nessun backup trovato su questo account Google.');for(const f of files){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=f.name+' · '+date(f.modifiedTime);b.onclick=()=>restore(f,status,targetId);box.append(b)}}
function archiveStats(bundle){
 const storage=bundle?.profileStorage||{};
 const parsed=k=>{try{return JSON.parse(storage[k]||'null')}catch(_){return null}};
 const archive=parsed('finholdra_daily_closes_v1020');
 const closes=Object.values(archive?.assets||{}).reduce((n,a)=>n+Object.keys(a?.days||{}).length,0);
 const observed=Array.isArray(bundle?.dailyObservations)?bundle.dailyObservations.length:(parsed('finholdra_observations_v9930')||[]).length;
 return {closes,observed,snapshots:bundle?.snapshots?.length||0,trades:bundle?.trades?.length||0};
}
async function protectRemoteHistory(old,newBundle){
 if(!old)return;
 const response=await request(api+'/'+encodeURIComponent(old.id)+'?alt=media');
 const remote=await response.json();
 const prev=archiveStats(remote),next=archiveStats(newBundle);
 const smaller=['closes','observed','snapshots','trades'].filter(k=>next[k]<prev[k]);
 if(smaller.length)throw Error('Backup Drive conservato: lo storico locale è meno completo ('+smaller.join(', ')+'). Ripristina prima la cronologia dal dispositivo principale oppure esporta un file JSON separato.');
}
async function save(status){const bridge=window.FINHOLDRA_CLOUD_BRIDGE;if(sim())throw Error('Backup cloud disabilitato in simulazione.');if(!bridge?.accountId())throw Error('Accedi al profilo prima di salvare.');const bundle=bridge.exportBundle(),content=JSON.stringify(bundle);if(new Blob([content]).size>40*1024*1024)throw Error('Backup oltre 40 MB.');const name='Finholdra - '+bridge.profileName().replace(/[\\/]/g,'-')+'.json';const files=await find(),old=files.find(f=>f.name===name);await protectRemoteHistory(old,bundle);if(!confirm((old?'Esiste un backup del '+date(old.modifiedTime)+'. Sostituirlo con i dati di questo dispositivo?':'Salvare il portafoglio nel tuo Google Drive privato?')+'\n\nContenuto attuale: '+archiveStats(bundle).trades+' transazioni, '+archiveStats(bundle).snapshots+' rilevazioni, '+archiveStats(bundle).closes+' chiusure titoli, '+archiveStats(bundle).observed+' osservazioni giornaliere.')){note(status,'Salvataggio annullato.');return}let r;if(old){r=await request(upload+'/'+encodeURIComponent(old.id)+'?uploadType=media&fields=id,modifiedTime',{method:'PATCH',headers:{'Content-Type':'application/json'},body:content})}else{const boundary='fh_'+crypto.randomUUID();const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',JSON.stringify({name,mimeType:'application/json',parents:['appDataFolder']}),'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n',content,'\r\n--'+boundary+'--\r\n']);r=await request(upload+'?uploadType=multipart&fields=id,modifiedTime',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body})}const result=await r.json();if(!result.id)throw Error('Salvataggio non confermato da Google.');note(status,'Backup salvato · '+date(result.modifiedTime||Date.now()));try{localStorage.setItem('fh_drive_last_'+bridge.accountId(),result.modifiedTime||new Date().toISOString())}catch(_){}}
if(gate&&$('fhDriveLogin')){$('fhDriveLogin').onclick=()=>{ $('fhDriveLoginList').replaceChildren();authorize($('fhDriveLoginStatus'),()=>list($('fhDriveLoginStatus'),$('fhDriveLoginList')));};}
// Independent automatic copy per local profile/device. No credentials persisted.
function paintAuto(){const status=$('fhDriveAutoStatus'),toggle=$('fhDriveAutoToggle'),select=$('fhDriveAutoInterval'),resume=$('fhDriveAutoResume');if(!status||!toggle||!select||!resume)return;
 const c=config();toggle.checked=!!c.enabled;toggle.disabled=!account()||sim()||busy;select.disabled=!account()||sim()||busy;select.value=String(c.minutes);resume.hidden=!c.enabled||authorized();resume.disabled=busy||sim();const fresh=$('fhDriveAutoNew');if(fresh){fresh.hidden=!c.fileId;fresh.disabled=busy||sim()||!account();}
 const last=c.last?'Ultimo backup automatico: '+date(c.last)+'. ':'Nessun backup automatico completato. ';
 const next=c.enabled&&c.last?'Prossima scadenza: '+date(Date.parse(c.last)+c.minutes*60000)+'. ':'';
 status.textContent=sim()?'Non disponibile in simulazione.':last+(c.enabled?(authorized()?next+'Attivo con app aperta. ':'In pausa: riconnetti Google Drive. '):'Disattivato. ')+(autoMessage||'');
}
async function autoUpload(initial=false){
 const id=account();if(!id||sim())throw Error('Profilo non disponibile o in simulazione.');
 const perform=async()=>{
  if(account()!==id||sim())return;const c=config();if(!c.enabled&&!initial)return;
  if(!initial&&c.last&&Date.now()-Date.parse(c.last)<c.minutes*60000)return;
  const bridge=window.FINHOLDRA_CLOUD_BRIDGE;const bundle=bridge.exportBundle();if(!Array.isArray(bundle.assets)||!Array.isArray(bundle.trades))throw Error('Backup non valido.');
  if(!initial&&!bundle.assets.length)throw Error('Portafoglio vuoto: copia precedente preservata.');
  const content=JSON.stringify(bundle);if(new Blob([content]).size>40*1024*1024)throw Error('Backup oltre 40 MB.');
  const device=c.device||crypto.randomUUID().slice(0,8);const name='Finholdra - '+bridge.profileName().replace(/[\\/]/g,'-')+' · automatico '+device+'.json';let r;
  if(c.fileId){const remote=await(await request(api+'/'+encodeURIComponent(c.fileId)+'?fields=id,modifiedTime,name,trashed')).json();
   if(remote.trashed||remote.modifiedTime!==c.last)throw Error('Copia remota modificata o rimossa: usa il backup manuale e verifica i dati prima di riattivare.');
   if(account()!==id||(!initial&&!config().enabled))return;
   r=await request(upload+'/'+encodeURIComponent(c.fileId)+'?uploadType=media&fields=id,modifiedTime',{method:'PATCH',headers:{'Content-Type':'application/json'},body:content});
  }else{
   const boundary='fh_'+crypto.randomUUID();const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',JSON.stringify({name,mimeType:'application/json',parents:['appDataFolder']}),'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n',content,'\r\n--'+boundary+'--\r\n']);
   if(account()!==id)return;r=await request(upload+'?uploadType=multipart&fields=id,modifiedTime',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});
  }
  const result=await r.json();if(!result.id||!result.modifiedTime)throw Error('Salvataggio non confermato da Google.');
  if(account()===id){const latest=config();persist({...latest,enabled:initial?true:!!latest.enabled,device,fileId:result.id,last:result.modifiedTime});autoRetryAt=0;autoMessage='Copia aggiornata.';}
 };
 if(navigator.locks?.request)await navigator.locks.request('fh-drive-auto-'+id,{ifAvailable:true},async lock=>{if(lock)await perform();else if(initial)throw Error('Backup in corso in un’altra scheda. Riprova.');});else await perform();
}
async function tick(){if(busy||!account()||sim()||document.visibilityState==='hidden')return;const c=config();if(!c.enabled)return;if(!authorized()){paintAuto();return}if(!navigator.onLine||Date.now()<autoRetryAt)return;if(c.last&&Date.now()-Date.parse(c.last)<c.minutes*60000)return;
 busy=true;autoMessage='Backup in corso…';paintAuto();try{await autoUpload()}catch(e){autoRetryAt=Date.now()+5*60000;autoMessage='Salvataggio non riuscito: '+e.message+' Nuovo tentativo tra almeno 5 minuti.'}finally{busy=false;paintAuto()}}
function setup(){const root=$('finholdraCloudSync');if(!root||root.dataset.fh106)return;root.dataset.fh106='1';root.innerHTML='<h2>Backup Google Drive</h2><p class="hint">Salva e ripristina il JSON nello spazio privato Finholdra del tuo account Google.</p><div class="actions"><button class="btn primary" id="fhDriveSave" type="button">☁ Salva su Google Drive</button><button class="btn" id="fhDriveRestore" type="button">Ripristina da Google Drive</button></div><p class="hint" id="fhDriveStatus" role="status"></p><div class="actions" id="fhDriveList"></div><div class="field" style="margin-top:14px"><h3>⏱ Backup automatico su Drive</h3><label class="toggle"><input type="checkbox" id="fhDriveAutoToggle"> Attiva backup automatico</label><label for="fhDriveAutoInterval">Frequenza</label><select id="fhDriveAutoInterval"><option value="15">Ogni 15 minuti</option><option value="30">Ogni 30 minuti</option><option value="60">Ogni ora</option><option value="180">Ogni 3 ore</option><option value="360">Ogni 6 ore</option><option value="720">Ogni 12 ore</option><option value="1440">Ogni giorno</option><option value="4320">Ogni 3 giorni</option><option value="10080">Ogni 7 giorni</option></select><p class="hint" id="fhDriveAutoStatus" role="status"></p><button class="btn" type="button" id="fhDriveAutoResume" hidden>Riconnetti Google Drive</button><button class="btn" type="button" id="fhDriveAutoNew">Crea nuova copia automatica</button><p class="foot">Funziona con app aperta e sessione Google valida; alla riapertura recupera le scadenze saltate dopo la riconnessione. Una copia automatica distinta per dispositivo; i backup manuali restano separati.</p></div><p class="foot">Backup locale disponibile qui sotto. Il JSON non è cifrato dall’app.</p>';
 const status=$('fhDriveStatus');try{const t=localStorage.getItem('fh_drive_last_'+window.INVESQUO_ACCOUNT_ID);if(t)note(status,'Ultimo salvataggio da questo dispositivo: '+date(t))}catch(_){}
 $('fhDriveSave').onclick=()=>authorize(status,()=>save(status));$('fhDriveRestore').onclick=()=>authorize(status,()=>list(status,$('fhDriveList'),window.INVESQUO_ACCOUNT_ID));
 $('fhDriveAutoInterval').onchange=e=>{try{persist({...config(),minutes:Number(e.target.value)});autoMessage='Frequenza aggiornata.';paintAuto();void tick()}catch(err){pauseAuto(err.message)}};
 $('fhDriveAutoToggle').onchange=e=>{if(!e.target.checked){try{stopAuto()}catch(err){pauseAuto(err.message)}return}e.target.checked=false;if(!confirm('Attivare il backup automatico del profilo su Google Drive? Verrà creata o aggiornata una copia dedicata a questo dispositivo.'))return;
  const work=async()=>{try{await autoUpload(true)}catch(err){pauseAuto('Attivazione non riuscita: '+err.message);throw err}};
  authorize($('fhDriveAutoStatus'),work);if(busy){$('fhDriveAutoToggle').disabled=true;$('fhDriveAutoInterval').disabled=true;}};
 $('fhDriveAutoNew').onclick=()=>{if(busy||!account()||sim())return;if(!confirm('Scollegare la copia automatica precedente? Rimarrà disponibile su Drive. Riattiva il backup per crearne una nuova.'))return;try{persist({minutes:config().minutes,enabled:false});autoMessage='Copia precedente conservata. Riattiva per creare una nuova copia.';paintAuto()}catch(err){pauseAuto(err.message)}};
 $('fhDriveAutoResume').onclick=()=>authorize($('fhDriveAutoStatus'),async()=>{autoMessage='Google Drive collegato.';autoRetryAt=0;setTimeout(tick,0)});paintAuto();
}
setup();document.addEventListener('DOMContentLoaded',setup,{once:true});setTimeout(setup,700);
setInterval(()=>{paintAuto();void tick()},30000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){paintAuto();void tick()}});
window.addEventListener('online',()=>{autoRetryAt=0;void tick()});window.addEventListener('storage',e=>{if(e.key===key())paintAuto()});
})();
