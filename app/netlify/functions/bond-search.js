// Invesquo: search of public MOT-related bond reference catalogues.
// Instrument identity is searched separately from actual historical quotations.
const ISIN=/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
function response(status,data){return {statusCode:status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public,max-age=900','Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)}}
const catalogues=['https://quantotorna.it/dati/catalogo.json'];
function normalize(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()}
function fromCatalog(payload,search){
 const seen=new Set(),rows=[],requested=normalize(search),words=requested.split(/\s+/).filter(Boolean);
 const queue=[payload];let inspected=0;
 while(queue.length&&inspected++<60000){
  const v=queue.shift();if(!v||typeof v!=='object')continue;
  if(Array.isArray(v)){queue.push(...v.slice(0,6000));continue;}
  const id=String(v.isin||v.ISIN||v.isin_code||v.isincode||v.codice_isin||v.codiceIsin||'').toUpperCase().trim();
  if(ISIN.test(id)&&!seen.has(id)){
   const name=String(v.descrizione||v.description||v.nome||v.name||v.titolo||v.denominazione||v.short_name||v.label||'Obbligazione '+id).trim();
   const hay=normalize(name+' '+id+' '+(v.emittente||v.issuer||''));
   if(words.every(w=>hay.includes(w))){
    const venue=String(v.mercato||v.market||v.mic||'MOT').toUpperCase();
    rows.push({symbol:id,isin:id,shortname:name,longname:name,exchDisp:venue.includes('MOT')?'Borsa Italiana · MOT':'Mercato obbligazionario · da verificare',exchange:'BOND',currency:'EUR',quoteType:'BOND',manual:true});seen.add(id);
   }
  }
  // Also handle maps indexed by ISIN instead of a nested `isin` field.
  for(const [k,x] of Object.entries(v)){
   if(ISIN.test(k.toUpperCase())&&x&&typeof x==='object'&&!seen.has(k.toUpperCase())){
    queue.push({...x,isin:k.toUpperCase()});
   }else if(x&&typeof x==='object')queue.push(x);
  }
 }
 return rows.slice(0,50);
}
exports.handler=async event=>{
 const q=String(event.queryStringParameters?.q||'').trim();if(q.length<2||q.length>80)return response(400,{error:'Inserisci almeno due caratteri o un ISIN'});
 const results=[],details=[];
 for(const address of catalogues){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8500);
  try{const r=await fetch(address,{signal:controller.signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);
   const data=await r.json(),found=fromCatalog(data,q);results.push(...found);
   if(found.length)break;
  }catch(e){details.push(String(e.message||e))}finally{clearTimeout(timer)}
 }
 if(ISIN.test(q.toUpperCase())&&!results.some(x=>x.isin===q.toUpperCase()))results.push({symbol:q.toUpperCase(),isin:q.toUpperCase(),shortname:'Obbligazione '+q.toUpperCase()+' · identità da verificare',longname:'Obbligazione '+q.toUpperCase()+' · identità da verificare',exchDisp:'MOT / EuroTLX da verificare',exchange:'BOND',currency:'EUR',quoteType:'BOND',manual:true});
 return response(200,{results,source:results.length?'Catalogo obbligazionario pubblico o ISIN inserito':'Nessun titolo corrispondente',warnings:details.slice(0,2),note:'La ricerca NON certifica la disponibilità di quotazione o serie storica. Verifica ISIN e mercato prima di registrare.'});
};
