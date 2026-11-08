// Invesquo: same-origin public Yahoo Finance search adapter. Identity reference only, not quote verification.
exports.handler=async(event)=>{
 const q=String(event.queryStringParameters?.q||'').trim();
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public,max-age=180'};
 if(q.length<1||q.length>100||/[<>\x00-\x1f]/.test(q))return{statusCode:400,headers,body:JSON.stringify({error:'Ricerca non valida'})};
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6500);
 try{
  const uri='https://query1.finance.yahoo.com/v1/finance/search?q='+encodeURIComponent(q)+'&quotesCount=35&newsCount=0';
  const r=await fetch(uri,{signal:controller.signal,headers:{Accept:'application/json','User-Agent':'Mozilla/5.0'}});
  if(!r.ok)throw Error('Fonte ricerca HTTP '+r.status);
  const obj=await r.json();
  const fields=['symbol','longname','shortname','exchDisp','exchange','quoteType','currency','isin'];
  const quotes=(Array.isArray(obj.quotes)?obj.quotes:[]).filter(x=>x&&typeof x.symbol==='string').slice(0,45).map(x=>Object.fromEntries(fields.filter(k=>typeof x[k]==='string').map(k=>[k,x[k].slice(0,180)])));
  return{statusCode:200,headers,body:JSON.stringify({quotes,source:'Yahoo Finance · riferimento titoli',disclaimer:'Non certifica identità, ISIN o quotazione. Controllare prima di registrare un acquisto.'})};
 }catch(e){return{statusCode:503,headers,body:JSON.stringify({error:'Ricerca non disponibile',details:String(e.message||e)})}}
 finally{clearTimeout(timeout)}
};
