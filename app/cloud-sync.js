/* Finholdra 10.1.0 — optional multi-device cloud sync.
 * App owner supplies Supabase public URL/key once; users only enter their email.
 * Ownership enforced by database RLS. No service-role key in a browser.
 * Optimistic revision compare-and-swap prevents silent concurrent overwrites.
 */
(()=>{'use strict';
 const el=id=>document.getElementById(id);
 const root=el('finholdraCloudSync');if(!root)return;
 const status=el('fh101CloudStatus'),sessionText=el('fh101CloudSession'),badge=el('fh101CloudBadge');
 const mail=el('fh101CloudEmail'),login=el('fh101CloudLogin'),logout=el('fh101CloudLogout'),upload=el('fh101CloudUpload'),download=el('fh101CloudDownload'),autosave=el('fh101AutoSync');
 const cfg=window.FINHOLDRA_SUPABASE||{};
 const host=String(cfg.url||'').replace(/\/$/,'');
 const key=String(cfg.publishableKey||'');
 const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(host)&&(/^(sb_publishable_|eyJ)/.test(key));
 const bridge=()=>window.FINHOLDRA_CLOUD_BRIDGE;
 let client=null,user=null,remote=null,baseline=null,busy=false,applying=false,saveTimer=null,lastPoll=0;
 const stateKey=()=>`fh101_cloud_${user?.id||'none'}_${bridge()?.accountId?.()||'local'}`;
 const readBaseline=()=>{try{return JSON.parse(localStorage.getItem(stateKey())||'null')}catch(_){return null}};
 const writeBaseline=(revision,fingerprint)=>{baseline={revision,fingerprint};localStorage.setItem(stateKey(),JSON.stringify(baseline))};
 const note=(message,isError=false)=>{status.textContent=message;status.classList.toggle('fh101-error',!!isError)};
 const pending=()=>!!user&&!busy;
 const ui=()=>{const active=!!user;badge.textContent=active?'Collegato':'Non collegato';login.hidden=active;logout.hidden=!active;upload.disabled=download.disabled=!active||busy;sessionText.textContent=active?'Account: '+user.email:'Accedi tramite link ricevuto via email.';};
 function bundle(){const api=bridge();if(!api?.exportBundle)throw Error('Il portafoglio non è ancora disponibile.');return api.exportBundle()}
 function fingerprint(b){const flat={...b};delete flat.createdAt;const data=JSON.stringify(flat);let h=2166136261;for(let i=0;i<data.length;i++){h^=data.charCodeAt(i);h=Math.imul(h,16777619)}return data.length+':'+(h>>>0).toString(16)}
 const prettyTime=raw=>raw?new Date(raw).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'}):'—';
 const isEmptyLocal=()=>{try{const b=bundle();return !(b.assets?.length||b.trades?.length||b.snapshots?.length)}catch(_){return false}};
 async function readRemote(){const {data,error}=await client.from('finholdra_backups').select('payload,revision,updated_at').eq('user_id',user.id).maybeSingle();if(error)throw error;remote=data||null;return remote}
 async function applyCloud(row,automatic=false){
  if(!row?.payload)throw Error('Nessun backup online disponibile.');
  if(!automatic&&!confirm('Vuoi caricare il portafoglio dal cloud? Le posizioni e le rilevazioni attuali su questo dispositivo saranno sostituite. Esporta prima un JSON se vuoi conservarle.'))return false;
  applying=true;try{bridge().importBundle(row.payload);writeBaseline(row.revision,fingerprint(bundle()));note('Dati caricati dal cloud · '+prettyTime(row.updated_at));return true;}finally{applying=false}
 }
 async function syncAfterLogin(){
  busy=true;ui();try{
   const row=await readRemote(),loc=bundle(),fp=fingerprint(loc),prior=readBaseline();baseline=prior;
   if(!row){note('Archivio online vuoto. Il primo salvataggio verrà creato automaticamente.');if(autosave.checked)queueSave(1500);return}
   if(isEmptyLocal()){await applyCloud(row,true);return}
   if(prior&&prior.revision===row.revision&&prior.fingerprint===fp){note('Portafoglio sincronizzato · '+prettyTime(row.updated_at));return}
   if(prior&&prior.fingerprint===fp&&row.revision>prior.revision){await applyCloud(row,true);return}
   note('Esiste un backup online ('+prettyTime(row.updated_at)+'). Usa «Carica dal cloud» per recuperarlo. Nessun dato è stato sovrascritto.');
  }catch(e){note('Cloud non disponibile: '+e.message,true)}finally{busy=false;ui()}
 }
 async function doSave(force=false){
  if(!user||busy||applying)return;
  busy=true;ui();try{
   const b=bundle(),fp=fingerprint(b);let current=remote;
   if(!force&&baseline&&fp===baseline.fingerprint){note('Nessuna modifica da salvare.');return}
   // Compare with server on every write to protect changes from other devices.
   current=await readRemote();
   const expected=baseline?.revision??0;
   if(current&&current.revision!==expected){note('Un altro dispositivo ha aggiornato il cloud. Carica il backup prima di salvare, per evitare perdite di dati.',true);return}
   if(!current){
    const result=await client.from('finholdra_backups').insert({user_id:user.id,payload:b,revision:1}).select('revision,updated_at').single();
    if(result.error)throw result.error;writeBaseline(result.data.revision,fp);
    remote={payload:b,...result.data};
   }else{
    const result=await client.from('finholdra_backups').update({payload:b,revision:expected+1,updated_at:new Date().toISOString()}).eq('user_id',user.id).eq('revision',expected).select('revision,updated_at').maybeSingle();
    if(result.error)throw result.error;
    if(!result.data){note('Backup modificato su un altro dispositivo. Aggiorna dal cloud prima di salvare.',true);return}
    writeBaseline(result.data.revision,fp);remote={payload:b,...result.data};
   }
   note('Salvato automaticamente nel cloud · '+prettyTime(remote.updated_at));
  }catch(e){note('Salvataggio cloud non riuscito: '+e.message,true)}finally{busy=false;ui()}
 }
 function queueSave(delay=10000){if(!user||!autosave.checked||applying)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>void doSave(),delay)}
 window.addEventListener('finholdra:changed',()=>queueSave(12000));
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user&&Date.now()-lastPoll>60000){lastPoll=Date.now();void checkRemote()}});
 async function checkRemote(){
  if(!pending())return;
  busy=true;ui();try{
   const row=await readRemote();if(!row)return;
   const last=readBaseline(),fp=fingerprint(bundle());
   if(last&&row.revision>last.revision){
    if(fp===last.fingerprint)await applyCloud(row,true);
    else note('Il cloud è cambiato su un altro dispositivo e ci sono modifiche locali. Scegli manualmente quale versione conservare.',true);
   }
  }catch(e){note('Impossibile verificare gli aggiornamenti: '+e.message,true)}finally{busy=false;ui()}
 }
 login.addEventListener('click',async()=>{
  const email=mail.value.trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){note('Inserisci un indirizzo email valido.',true);return}
  if(!client){note('Il servizio cloud non è configurato.',true);return}
  busy=true;ui();try{
   const res=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
   if(res.error)throw res.error;note('Ti abbiamo inviato un link di accesso. Apri la tua email e conferma l’accesso a Finholdra.');
  }catch(e){note('Accesso non riuscito: '+e.message,true)}finally{busy=false;ui()}
 });
 logout.addEventListener('click',async()=>{if(!client)return;clearTimeout(saveTimer);await client.auth.signOut();user=null;remote=null;baseline=null;ui();note('Disconnesso dal cloud. I dati locali sono rimasti sul dispositivo.')});
 upload.addEventListener('click',()=>void doSave(true));
 download.addEventListener('click',async()=>{if(!pending())return;busy=true;ui();try{const row=await readRemote();if(row)await applyCloud(row,false);else note('Non ci sono ancora backup nel cloud.')}catch(e){note('Caricamento non riuscito: '+e.message,true)}finally{busy=false;ui()}});
 autosave.addEventListener('change',()=>{localStorage.setItem('fh101_auto_sync',autosave.checked?'1':'0');if(autosave.checked)queueSave(1000);else clearTimeout(saveTimer)});
 autosave.checked=localStorage.getItem('fh101_auto_sync')!=='0';
 if(!configured){note('Per pubblicare la sincronizzazione, configura Supabase una sola volta nel file supabase-config.js. Ogni utente accederà con la propria email.');ui();return}
 if(!window.supabase?.createClient){note('Libreria Supabase non raggiungibile: controlla la connessione.',true);ui();return}
 try{
  client=window.supabase.createClient(host,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
  client.auth.onAuthStateChange((_event,sess)=>{const next=sess?.user||null;if(next?.id===user?.id)return;user=next;remote=null;baseline=null;ui();if(user)setTimeout(()=>void syncAfterLogin(),0)});
  void client.auth.getSession().then(({data,error})=>{if(error)note('Autenticazione non disponibile: '+error.message,true);else if(data?.session?.user&&!user){user=data.session.user;ui();void syncAfterLogin()}});
 }catch(e){note('Errore configurazione Supabase: '+e.message,true)}
 ui();
})();
