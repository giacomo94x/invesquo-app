// Netlify scheduled background refresh. Serial processing caps OpenFIGI queries without API key.
// Not a bulk list downloader: progressively enriches securities searched by users.
const C=require('./catalog-core');
const timeoutFetch=async(url,options={},ms=4500)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await fetch(url,{...options,signal:c.signal})}finally{clearTimeout(t)}};
const italy = ex => /^(?:IM|MI|IT|BIT|MIL|MTAA|MT)$/.test(String(ex||'').toUpperCase());
async function yahooMetadata(symbol){try{
 const r=await timeoutFetch('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?range=5d&interval=1d',{'headers':{'User-Agent':'Mozilla/5.0','Accept':'application/json'}},3000);
 if(!r.ok)return null;const meta=(await r.json())?.chart?.result?.[0]?.meta;
 if(String(meta?.symbol||'').toUpperCase()!==symbol.toUpperCase()||!meta.currency)return null;
 return {symbol:meta.symbol,shortname:C.safe(meta.shortName||meta.longName||symbol),longname:C.safe(meta.longName||meta.shortName||symbol),exchange:C.safe(meta.exchangeName||meta.fullExchangeName),exchDisp:C.safe(meta.fullExchangeName||meta.exchangeName),currency:meta.currency,quoteType:meta.instrumentType||'EQUITY',source:'Yahoo Finance · ticker verificato',verifiedYahoo:true};
 }catch{return null}}
async function yahooSearch(q){
 try{const r=await timeoutFetch('https://query1.finance.yahoo.com/v1/finance/search?q='+encodeURIComponent(q)+'&quotesCount=35&newsCount=0',{headers:{'Accept':'application/json','User-Agent':'Mozilla/5.0'}},3900);
  if(!r.ok)return [];const data=await r.json();const term=q.toLowerCase();
  return (data.quotes||[]).filter(x=>x&&x.symbol&&x.shortname&&
    [x.symbol,x.shortname,x.longname,x.isin].some(s=>String(s||'').toLowerCase().includes(term)))
   .map(x=>({symbol:C.safe(x.symbol),shortname:C.safe(x.shortname),longname:C.safe(x.longname||x.shortname),exchange:C.safe(x.exchange),exchDisp:C.safe(x.exchDisp||x.exchange),currency:C.safe(x.currency),quoteType:C.safe(x.quoteType),isin:C.safe(x.isin),source:'Yahoo Finance · ricerca',verifiedYahoo:true}))
   .filter(C.valid).slice(0,25);
 }catch{return []}
}
async function refresh(q){
 const yahooRows=await yahooSearch(q);
 const key=process.env.OPENFIGI_API_KEY;
 const headers={'Content-Type':'application/json','Accept':'application/json','User-Agent':'Finholdra/1.0'};
 if(key)headers['X-OPENFIGI-APIKEY']=key;
 const res=await timeoutFetch('https://api.openfigi.com/v3/search',{method:'POST',headers,body:JSON.stringify({query:q})},4500);
 if(res.status===429)return {limited:true};if(!res.ok)throw Error('OpenFIGI '+res.status);
 const payload=await res.json();const rows=Array.isArray(payload.data)?payload.data:[];
 const entries=[],seen=new Set();
 // Verify Yahoo mapping before making a FIGI ticker user-selectable.
 // Restrict verification to 8 symbols per queued query to avoid external API bursts.
 for(const x of rows){if(entries.length>=8)break;
  const ticker=C.safe(x.ticker).toUpperCase(),ex=C.safe(x.exchCode).toUpperCase();
  if(!/^[A-Z0-9.\-]{1,20}$/.test(ticker)||!x.name)continue;
  const milan=italy(ex),usa=['US','UN','UQ','UW','UA','UF','UR'].includes(ex);
  if(!milan&&!usa)continue;
  const symbol=milan?(ticker.endsWith('.MI')?ticker:ticker+'.MI'):ticker;
  if(seen.has(symbol))continue;seen.add(symbol);
  const y=await yahooMetadata(symbol);if(!y)continue;
  // Verified symbol paired with OpenFIGI instrument identity.
  entries.push({...y,shortname:C.safe(x.name||y.shortname),longname:C.safe(x.name||y.longname),figi:C.safe(x.figi),marketSector:C.safe(x.marketSector),isin:C.safe(x.isin),exchange:milan?'MIL':y.exchange,exchDisp:milan?'Borsa Italiana · Milano':y.exchDisp,source:'OpenFIGI · Yahoo verificato',referenceOnly:true});
 }
 // Preserve previously verified listings if providers intermittently fail.
 const old=await C.read(q);await C.save(q,C.unique([...entries,...yahooRows,...(old?.quotes||[])]));
 return {limited:false,found:entries.length};
}
exports.handler=async()=>{
 const s=C.store();if(!s)return {statusCode:200,body:'Catalogo non disponibile: Netlify Blobs non configurato'};
 const batch=await s.list({prefix:'pending/'});const jobs=(batch.blobs||[]).slice(0,3);
 let completed=0,limited=false;
 for(const job of jobs){let item;try{item=await s.get(job.key,{type:'json'})}catch{};if(!item?.query){await s.delete(job.key);continue}
  try{const result=await refresh(item.query);if(result.limited){limited=true;break}await s.delete(job.key);completed++}
  catch(e){ // Leave a retry, with no guarantee of completing inside one scheduled run.
   console.warn('Catalog refresh deferred:',String(e.message||e).slice(0,100));break;
  }
 }
 return {statusCode:200,body:JSON.stringify({completed,limited,pending:jobs.length-completed})};
};
