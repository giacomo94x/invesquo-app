// Read-only market quotation for Invesquo charts. Actual exchange timestamp, never browser clock.
const VALID=/^[A-Z0-9.^=\-]{1,22}$/;const CURRENCIES=new Set(['EUR','USD','GBP','CHF','JPY','CAD','AUD']);
exports.handler=async (event)=>{
 const head={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
 const q=event.queryStringParameters||{},symbol=String(q.symbol||'').toUpperCase(),currency=String(q.currency||'EUR').toUpperCase();
 if(!VALID.test(symbol)||!CURRENCIES.has(currency))return{statusCode:400,headers:head,body:JSON.stringify({error:'Identificatore non valido'})};
 const failures=[];
 for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),5500);
  try{
   const url=`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d&includePrePost=false`;
   const response=await fetch(url,{signal:abort.signal,headers:{'User-Agent':'Mozilla/5.0 (compatible; Invesquo/6.6)','Accept':'application/json'},cache:'no-store'});
   if(!response.ok){failures.push(host+': '+response.status);continue;}
   const data=await response.json(),meta=data?.chart?.result?.[0]?.meta;
   if(String(meta?.symbol||'').toUpperCase()!==symbol||String(meta?.currency||'').toUpperCase()!==currency){failures.push(host+': ticker o valuta non corrispondenti');continue;}
   const price=Number(meta.regularMarketPrice),epoch=Number(meta.regularMarketTime),now=Date.now()/1000;
   if(!(price>0)||!Number.isFinite(epoch)||epoch<=0||epoch>now+3600||now-epoch>7*86400){failures.push(host+': prezzo/data mancanti o non recenti');continue;}
   return{statusCode:200,headers:head,body:JSON.stringify({price,asOf:new Date(epoch*1000).toISOString(),source:'Yahoo Finance · '+symbol,currency,symbol,delayed:true})};
  }catch(e){failures.push(host+': '+e.message)}finally{clearTimeout(timer)}
 }
 return{statusCode:503,headers:head,body:JSON.stringify({error:'Quotazione non disponibile',details:failures.join(' · ')})};
};
