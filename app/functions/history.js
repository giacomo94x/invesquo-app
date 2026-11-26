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
  // CME futures have an extended electronic session. Read the Yahoo 1-minute
  // candles over 5 days, then let the client select its desired time window.
  // A 1-day regular-session request may omit the most recent overnight candles.
  const r=isFuture&&range==='1d'?'5d':baseRange;
  const interval=isFuture&&range==='1d'?'1m':baseInterval;
  const url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?range='+r+'&interval='+interval+'&includePrePost='+(isFuture?'true':'false');
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
