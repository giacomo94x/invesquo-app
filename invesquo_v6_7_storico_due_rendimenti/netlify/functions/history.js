// Invesquo historical PRICE feed. Alphabet's separate v3.6 quote function stays untouched.
// Netlify Functions; read-only, no synthetic market observations.
const VALID_SYMBOL=/^[A-Z0-9.^=\-]{1,22}$/;
const PERIODS=Object.freeze({
  '1d':['1d','5m'], '5d':['5d','60m'], '1mo':['1mo','1d'],
  '6mo':['6mo','1d'], '1y':['1y','1d'], 'max':['max','1mo']
});
const CURRENCIES=new Set(['EUR','USD','GBP','CHF','JPY','CAD','AUD']);
function validSeries(data,symbol,currency){
 const r=data?.chart?.result?.[0];
 if(!r||String(r.meta?.symbol||'').toUpperCase()!==symbol||String(r.meta?.currency||'').toUpperCase()!==currency)return null;
 const timestamps=r.timestamp,close=r.indicators?.quote?.[0]?.close;
 if(!Array.isArray(timestamps)||!Array.isArray(close))return null;
 const now=Date.now()/1000;
 const count=timestamps.reduce((sum,t,i)=>sum+(Number.isFinite(+t)&&+t<=now+3600&&Number.isFinite(+close[i])&&+close[i]>0?1:0),0);
 return count>=1?count:null;
}
exports.handler=async event=>{
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=90'};
 const params=event.queryStringParameters||{};
 const symbol=String(params.symbol||'').toUpperCase();
 const requested=String(params.range||'1mo');
 const currency=String(params.currency||'EUR').toUpperCase();
 if(!VALID_SYMBOL.test(symbol)||!PERIODS[requested]||!CURRENCIES.has(currency))return {statusCode:400,headers,body:JSON.stringify({error:'Ticker, periodo o valuta non supportati'})};
 // Intraday feed often unavailable for Italian GEM and some equities; show real daily observations instead.
 const attempts=[requested]; // v6.8: never send another range while user sees 1G or 1S
 const failures=[];
 for(const range of attempts){
  const [period,interval]=PERIODS[range];
  for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){
   const url=`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${period}&interval=${interval}&includePrePost=false`;
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),5500);
   try{
    const r=await fetch(url,{signal:ctrl.signal,headers:{'User-Agent':'Mozilla/5.0 (compatible; Invesquo/6.5)','Accept':'application/json'}});
    if(!r.ok){failures.push(range+' '+host+': HTTP '+r.status);continue;}
    const data=await r.json();const count=validSeries(data,symbol,currency);
    if(!count){failures.push(range+' '+host+': meno di 2 punti validi o mercato/valuta errati');continue;}
    const rr=data.chart.result[0];
    const cutoff=requested==='1d'?Date.now()/1000-25*3600:requested==='5d'?Date.now()/1000-7*86400:0;
    const valid=rr.timestamp.map((t,i)=>({t:+t,p:+rr.indicators.quote[0].close[i]})).filter(x=>Number.isFinite(x.t)&&x.t>=cutoff&&x.t<=Date.now()/1000+3600&&Number.isFinite(x.p)&&x.p>0);
    if(!valid.length){failures.push(range+' '+host+': nessun dato nel periodo');continue;}
    const last=valid[valid.length-1];
    if(cutoff){rr.timestamp=valid.map(x=>x.t);rr.indicators.quote[0].close=valid.map(x=>x.p);}
    data.invesquo={requestedRange:requested,effectiveRange:range,validPoints:count,source:'Yahoo Finance',endpoint:host,lastHistoricalTimestamp:last.t,priceFeed:'historical; not live market quote'};
    return {statusCode:200,headers,body:JSON.stringify(data)};
   }catch(e){failures.push(range+' '+host+': '+String(e.message||e));}
   finally{clearTimeout(timer)}
  }
 }
 return {statusCode:503,headers,body:JSON.stringify({error:'Serie storica non disponibile',details:failures.join(' · ')})};
};
