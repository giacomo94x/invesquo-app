/* Finholdra Beta 8.4 — Google Drive backup via Google Identity Services.
   Explicit opt-in, no token persistence, no background uploads. */
(()=>{'use strict';
 const byId=id=>document.getElementById(id);
 const root=byId('finCloudSettings');if(!root)return;
 const inp=byId('fhGoogleClientId'),status=byId('fhCloudStatus'),badge=byId('fhCloudBadge'),list=byId('fhCloudFiles');
 const connect=byId('fhCloudConnect'),find=byId('fhCloudList'),save=byId('fhCloudSave'),disconnect=byId('fhCloudDisconnect');
 const ID_KEY='finholdra_google_oauth_client_id_v84';
 const KEY_PREFIX='finholdra_drive_binding_v84_';
 const SCOPE='https://www.googleapis.com/auth/drive.file';
 const API='https://www.googleapis.com/drive/v3/files';
 const UPLOAD='https://www.googleapis.com/upload/drive/v3/files';
 let access='',expires=0,tokenClient=null,busy=false,files=[],oauthTimer=null;
 const profile=()=>String(window.invesquoLocalAccount?.name||'Profilo').replace(/[<>:"/\\|?*\x00-\x1f]/g,'').trim().slice(0,50)||'Profilo';
 const profileId=()=>String(window.INVESQUO_ACCOUNT_ID||'local');
 const bindingKey=()=>KEY_PREFIX+profileId();
 const savedBinding=()=>{try{return JSON.parse(localStorage.getItem(bindingKey())||'null')}catch(_){return null}};
 const setBinding=v=>localStorage.setItem(bindingKey(),JSON.stringify(v));
 const fmtDate=t=>{try{return new Date(t).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(_){return '—'}};
 const note=(s,error=false)=>{status.textContent=s;status.style.color=error?'#ff8a9a':''};
 const ui=()=>{const connected=!!access&&Date.now()<expires;badge.textContent=connected?'Collegato':'Non collegato';find.disabled=save.disabled=disconnect.disabled=!connected;connect.textContent=connected?'Ricollega Google':'Collega Google Drive';};
 const conf=String(window.FINHOLDRA_GOOGLE_CLIENT_ID||'').trim();
 inp.value=conf||localStorage.getItem(ID_KEY)||'';
 const getClientId=()=>inp.value.trim();
 inp.addEventListener('change',()=>{const id=getClientId();localStorage.setItem(ID_KEY,id);tokenClient=null;access='';expires=0;ui();note('Configurazione aggiornata: collega nuovamente Google Drive.')});
 function ensureOAuth(){
  if(!window.google?.accounts?.oauth2)throw Error('Google Identity Services non è disponibile. Controlla la connessione e riprova.');
  const clientId=getClientId();
  if(!/^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(clientId))throw Error('Inserisci un Client ID OAuth web valido nelle Impostazioni.');
  return clientId;
 }
 // Preload early to avoid popup blocking after a network-await on click.
 const googleScript=document.createElement('script');googleScript.src='https://accounts.google.com/gsi/client';googleScript.async=true;document.head.appendChild(googleScript);
 connect.addEventListener('click',()=>{
  try{
   const clientId=ensureOAuth();
   if(!tokenClient)tokenClient=window.google.accounts.oauth2.initTokenClient({client_id:clientId,scope:SCOPE,
    callback:res=>{clearTimeout(oauthTimer);if(!res?.access_token){note('Accesso Google non completato.',true);return}access=res.access_token;expires=Date.now()+Math.max(60,Number(res.expires_in)||3599)*1000-30000;ui();note('Google Drive collegato. Puoi cercare o salvare i backup.');void refreshFiles()},
    error_callback:e=>{clearTimeout(oauthTimer);note('Autorizzazione non riuscita: '+String(e?.type||'finestra chiusa'),true)}
   });
   localStorage.setItem(ID_KEY,clientId);
   tokenClient.requestAccessToken({prompt:'select_account'});
   note('Completa l’autorizzazione nella finestra Google.');
   oauthTimer=setTimeout(()=>{if(!access)note('Nessuna autorizzazione ricevuta. Se il popup è bloccato, abilitalo e riprova.',true)},45000);
  }catch(e){note(e.message,true)}
 });
 disconnect.addEventListener('click',()=>{if(access&&window.google?.accounts?.oauth2?.revoke)try{window.google.accounts.oauth2.revoke(access,()=>{})}catch(_){}access='';expires=0;tokenClient=null;files=[];list.replaceChildren();ui();note('Google Drive disconnesso. Nessun file eliminato.')});
 const check=()=>{if(!access||Date.now()>=expires){access='';ui();throw Error('Sessione Google scaduta: premi Collega Google Drive.')}return access};
 async function api(url,options={}){
  const headers={Authorization:'Bearer '+check(),...(options.headers||{})};
  let response;try{response=await fetch(url,{...options,headers})}catch(_){throw Error('Google Drive non raggiungibile dal browser. Controlla la connessione.')}
  if(!response.ok){let err={};try{err=await response.json()}catch(_){}if(response.status===401){access='';ui()}throw Error(err.error?.message||('Google Drive: errore '+response.status))}
  if(options.raw)return response;
  return response.json();
 }
 function safeName(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 function renderList(){
  list.replaceChildren();if(!files.length){list.textContent='Nessun backup Finholdra trovato in questo account Google.';return}
  const t=document.createElement('p');t.className='sub';t.textContent=files.length+' backup sul tuo Drive';list.appendChild(t);
  for(const f of files){
   const row=document.createElement('div');row.className='fh-cloud-file';
   const meta=document.createElement('div');meta.style.minWidth='0';meta.innerHTML='<strong>'+safeName(f.name)+'</strong><small>'+safeName(fmtDate(f.modifiedTime))+' · '+(Math.round((+f.size||0)/1024))+' KB</small>';
   const open=document.createElement('button');open.type='button';open.className='btn';open.textContent='Carica';open.addEventListener('click',()=>void downloadFile(f));
   const use=document.createElement('button');use.type='button';use.className='btn';use.textContent='Seleziona';use.title='Imposta questa copia come destinazione dei prossimi salvataggi';use.addEventListener('click',()=>{setBinding({id:f.id,modifiedTime:f.modifiedTime,name:f.name});note('Destinazione selezionata: '+f.name+'. Prima di sovrascrivere, importa il backup se questo dispositivo non è aggiornato.')});
   row.append(meta,open,use);list.appendChild(row);
  }
 }
 async function refreshFiles(){
  if(busy)return;busy=true;try{
   let token='',found=[];do{
    const params=new URLSearchParams({q:"name contains 'Finholdra - ' and trashed = false",fields:'nextPageToken,files(id,name,modifiedTime,mimeType,md5Checksum,size)',pageSize:'100',orderBy:'modifiedTime desc'});
    if(token)params.set('pageToken',token);
    const data=await api(API+'?'+params.toString());found.push(...(data.files||[]));token=data.nextPageToken||'';
   }while(token&&found.length<500);
   files=found.filter(f=>f.name.startsWith('Finholdra - ')&&f.name.endsWith('.json')&&f.mimeType==='application/json');renderList();
   note('Elenco aggiornato: '+files.length+' backup disponibile/i.');
  }catch(e){note(e.message,true)}finally{busy=false}
 }
 find.addEventListener('click',()=>void refreshFiles());
 function validate(data){if(!data||!Array.isArray(data.assets)||!Array.isArray(data.trades)||!Array.isArray(data.snapshots))throw Error('Il file non è un backup Finholdra valido.');return data}
 async function downloadFile(f){
  if(busy)return;
  if(!confirm('Caricare «'+f.name+'»? Il portafoglio locale sarà sostituito dal backup Google Drive. Scarica prima un JSON locale se vuoi conservare una copia.'))return;
  busy=true;note('Caricamento da Drive in corso…');
  try{
   const r=await api(API+'/'+encodeURIComponent(f.id)+'?alt=media',{raw:true});
   const raw=await r.text();if(raw.length>25*1024*1024)throw Error('Backup oltre 25 MB.');const data=validate(JSON.parse(raw));
   // Import only after full JSON validation: keep local portfolio intact on network/parsing errors.
   applyPortableBundle(data);
   setBinding({id:f.id,modifiedTime:f.modifiedTime,name:f.name});
   note('Backup importato: '+data.assets.length+' strumenti, '+data.trades.length+' transazioni. Ora questo dispositivo usa la copia selezionata.');
  }catch(e){note('Importazione non riuscita: '+e.message,true)}finally{busy=false}
 }
 function multipart(metadata,content){
  const boundary='finholdra_'+Math.random().toString(36).slice(2);
  const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',JSON.stringify(metadata),'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n',content,'\r\n--'+boundary+'--'],{type:'multipart/related; boundary='+boundary});
  return {boundary,body};
 }
 async function saveCloud(){
  if(busy)return;let content,bundle;
  try{bundle=makePortableBundle();content=JSON.stringify(bundle);if(content.length>20*1024*1024)throw Error('Backup troppo grande (oltre 20 MB).')}catch(e){note(e.message,true);return}
  const current=savedBinding(),name='Finholdra - '+profile()+'.json';
  if(!confirm('Salvare '+bundle.assets.length+' strumenti e '+bundle.trades.length+' transazioni su Google Drive? Il file contiene i tuoi dati finanziari in JSON non cifrato.'))return;
  busy=true;note('Salvataggio su Google Drive in corso…');
  try{
   let result;
   if(current?.id){
    // Optimistic concurrency: if another device has modified the file, never overwrite silently.
    let remote;try{remote=await api(API+'/'+encodeURIComponent(current.id)+'?fields=id,name,modifiedTime,mimeType,trashed')}catch(e){if(/404|not found/i.test(e.message))remote=null;else throw e}
    if(remote?.trashed)remote=null;
    if(remote&&current.modifiedTime&&remote.modifiedTime!==current.modifiedTime){
     if(!confirm('Il backup su Drive è stato modificato da un altro dispositivo ('+fmtDate(remote.modifiedTime)+'). Per proteggere le modifiche, creerò una NUOVA copia anziché sovrascriverlo. Continuare?'))return;
     remote=null;
    }
    if(remote){result=await api(UPLOAD+'/'+encodeURIComponent(current.id)+'?uploadType=media&fields=id,name,modifiedTime,mimeType,size',{method:'PATCH',headers:{'Content-Type':'application/json'},body:content});result.name=remote.name}
   }
   if(!result){const data=multipart({name,mimeType:'application/json'},content);
    result=await api(UPLOAD+'?uploadType=multipart&fields=id,name,modifiedTime,mimeType,size',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+data.boundary},body:data.body});}
   if(!result.id)throw Error('Drive non ha restituito l’ID del file.');
   setBinding({id:result.id,modifiedTime:result.modifiedTime,name:result.name||name});
   note('Backup salvato su Google Drive · '+fmtDate(result.modifiedTime)+'.');
  }catch(e){note('Salvataggio non riuscito: '+e.message,true)}finally{busy=false}
 }
 save.addEventListener('click',()=>void saveCloud());
 const style=document.createElement('style');style.textContent=`
 .fh-cloud-card .fh-cloud-file{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:12px 0;border-top:1px solid rgba(120,160,194,.20)}
 .fh-cloud-card .fh-cloud-file>div{flex:1 1 170px;overflow-wrap:anywhere;display:grid;gap:3px}
 .fh-cloud-card .fh-cloud-file strong{font-size:13px}.fh-cloud-card .fh-cloud-file small{font-size:11px;color:var(--muted)}
 .fh-cloud-card .fh-cloud-file .btn{white-space:nowrap}.fh-cloud-card .fh-cloud-list{margin-top:10px}
 .fh-cloud-card #fhGoogleClientId{width:100%;min-width:0;font-size:13px}
 .fh-cloud-card .actions{display:flex;gap:9px;flex-wrap:wrap;margin:10px 0}
 .fh-cloud-card .actions .btn{flex:1 1 150px}
 `;document.head.appendChild(style);ui();
})();
