// Shared verified-public-market helpers. No guessed prices or silent currency conversion.
'use strict';
const HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=60, stale-while-revalidate=120'};
const ok=(data,code=200)=>({statusCode:code,headers:HEADERS,body:JSON.stringify(data)});
const fail=(msg,code=503)=>ok({error:msg,available:false},code);
const cleanSymbol=s=>String(s||'').trim();
const validSymbol=s=>/^[A-Za-z0-9.^=\-]{1,24}$/.test(s);
const validIsin=s=>/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(s);
async function remote(url,timeoutMs=6500){
 const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),timeoutMs);
 try{const res=await fetch(url,{signal:ctl.signal,headers:{'Accept':'application/json','User-Agent':'Mozilla/5.0 (compatible; Finholdra/1.0)'}});if(!res.ok)throw Error('Fonte HTTP '+res.status);return await res.json()}
 finally{clearTimeout(timeout)}
}
async function yahooChart(symbol,range='5d',interval='1d'){
 if(!validSymbol(symbol))throw Error('Ticker non valido');
 const u='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?range='+encodeURIComponent(range)+'&interval='+encodeURIComponent(interval)+'&includePrePost=true';
 const d=await remote(u),r=d?.chart?.result?.[0];
 if(!r||String(r.meta?.symbol||'').toUpperCase()!==symbol.toUpperCase())throw Error('Ticker non verificato');
 return r;
}
function lastQuote(r){const meta=r?.meta||{},close=Number(meta.regularMarketPrice),ts=Number(meta.regularMarketTime);
 if(!(close>0)||!Number.isFinite(close)||!Number.isFinite(ts)||ts<1||ts*1000>Date.now()+3600000||Date.now()-ts*1000>7*86400000)throw Error('Quotazione recente non verificabile');
 return {price:close,asOf:new Date(ts*1000).toISOString(),currency:String(meta.currency||'').toUpperCase(),delayed:true,source:'Yahoo Finance · quotazione potenzialmente differita'};
}
module.exports={HEADERS,ok,fail,cleanSymbol,validSymbol,validIsin,remote,yahooChart,lastQuote};
