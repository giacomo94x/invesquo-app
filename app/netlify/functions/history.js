// Finholdra 10.9.50 — strictly validated Yahoo historical data proxy.
// TradingView Datafeed API is not an exchange-price service and must not be scraped.
const RANGES = {
  '1d':['1d','5m'],'5d':['5d','15m'],'1mo':['1mo','1d'],
  '3mo':['3mo','1d'],'6mo':['6mo','1d'],'1y':['1y','1d'],
  'max':['10y','1wk']
};
exports.handler = async event => {
  const qp=event.queryStringParameters||{},symbol=String(qp.symbol||'').trim(),range=String(qp.range||'').trim(),currency=String(qp.currency||'').toUpperCase();
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=180, stale-while-revalidate=300','Access-Control-Allow-Origin':'*'};
  if(event.httpMethod!=='GET')return {statusCode:405,headers,body:JSON.stringify({error:'Method not allowed'})};
  if(!/^[A-Za-z0-9.^=\-]{1,24}$/.test(symbol)||!RANGES[range]||!/^(EUR|USD|GBP|CHF|CAD|JPY|AUD|SEK|NOK|DKK|HKD|CNY|BRL|INR)?$/.test(currency))return {statusCode:400,headers,body:JSON.stringify({error:'Richiesta non valida'})};
  const isFuture=/=F$/i.test(symbol);
  const [baseRange,baseInterval]=RANGES[range];
  // Only for continuous futures: restore the multi-resolution Yahoo intraday
  // fallback used by the earlier working beta. Never synthesize missing prices.
  // The client filters the last 25 hours and draws the prior-close connector.
  const standardQuery=async()=>{
    const url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+
      '?range='+encodeURIComponent(baseRange)+'&interval='+encodeURIComponent(baseInterval)+
      '&includePrePost='+(isFuture?'true':'false');
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);
    try{
      const resp=await fetch(url,{signal:controller.signal,headers:{'Accept':'application/json','User-Agent':'Mozilla/5.0 (compatible; Finholdra/1.0)'}});
      if(!resp.ok)throw Error('HTTP '+resp.status);
      const data=await resp.json(),item=data?.chart?.result?.[0];
      if(!item||String(item.meta?.symbol||'').toUpperCase()!==symbol.toUpperCase())throw Error('Ticker storico incoerente');
      if(currency&&String(item.meta?.currency||'').toUpperCase()!==currency)throw Error('Valuta diversa dalla richiesta');
      if(!Array.isArray(item.timestamp)||!Array.isArray(item.indicators?.quote?.[0]?.close))throw Error('Serie non disponibile');
      return {statusCode:200,headers,body:JSON.stringify(data)};
    }catch(e){return {statusCode:502,headers,body:JSON.stringify({error:'Fonte storica indisponibile',detail:String(e.message||'errore').slice(0,80)})}}
    finally{clearTimeout(timeout)}
  };
  if(!isFuture||range!=='1d')return standardQuery();
  // Yahoo may omit overnight trading with a single interval. Query alternative
  // authentic CME candle feeds; each must match symbol and currency exactly.
  const attempts=[
    ['query1.finance.yahoo.com','5d','1m'],
    ['query2.finance.yahoo.com','1d','1m'],
    ['query1.finance.yahoo.com','5d','2m'],
    ['query2.finance.yahoo.com','5d','5m']
  ];
  const retrieve=async([host,days,interval])=>{
    const url='https://'+host+'/v8/finance/chart/'+encodeURIComponent(symbol)+
      '?range='+days+'&interval='+interval+'&includePrePost=true';
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6800);
    try{
      const response=await fetch(url,{signal:controller.signal,headers:{'Accept':'application/json','User-Agent':'Mozilla/5.0 (compatible; Finholdra/1.0)'}});
      if(!response.ok)throw Error('Yahoo HTTP '+response.status);
      const data=await response.json(),item=data?.chart?.result?.[0];
      if(String(item?.meta?.symbol||'').toUpperCase()!==symbol.toUpperCase())throw Error('Ticker Yahoo differente');
      if(currency&&String(item.meta.currency||'').toUpperCase()!==currency)throw Error('Valuta Yahoo differente');
      const ts=item.timestamp,prices=item.indicators?.quote?.[0]?.close;
      if(!Array.isArray(ts)||!Array.isArray(prices))throw Error('Candele mancanti');
      const usable=ts.filter((t,i)=>Number.isFinite(Number(t))&&Number(prices[i])>0);
      if(usable.length<2)throw Error('Punti insufficienti');
      return {data,item,usable,latest:Math.max(...usable)};
    }finally{clearTimeout(timeout)}
  };
  try{
    const all=await Promise.allSettled(attempts.map(retrieve));
    const good=all.filter(x=>x.status==='fulfilled').map(x=>x.value);
    if(!good.length)throw Error('Nessuna fonte intraday Yahoo disponibile');
    // Merge *real* Yahoo candles: preserve exact times and prices, preferring
    // higher-resolution samples when two feeds share a timestamp.
    const samples=new Map();
    const metadata=good.slice().sort((a,b)=>a.latest-b.latest).at(-1).item.meta;
    for(const feed of good.slice().reverse()){
      const ts=feed.item.timestamp,close=feed.item.indicators.quote[0].close;
      for(let i=0;i<ts.length;i++){
        const t=Number(ts[i]),p=Number(close[i]);
        if(Number.isFinite(t)&&p>0&&Number.isFinite(p))samples.set(t,p);
      }
    }
    const times=[...samples.keys()].sort((a,b)=>a-b);
    const latest=times.at(-1),cutoff=latest-5*86400;
    const kept=times.filter(t=>t>=cutoff);
    const output={chart:{result:[{meta:metadata,timestamp:kept,indicators:{quote:[{close:kept.map(t=>samples.get(t))}]}}],error:null}};
    return {statusCode:200,headers:{...headers,'Cache-Control':'public, max-age=25, stale-while-revalidate=30'},body:JSON.stringify(output)};
  }catch(e){return {statusCode:502,headers,body:JSON.stringify({error:'Candele futures Yahoo non disponibili',detail:String(e.message||'errore').slice(0,100)})}}
};
