// ISIN directory: lookup only, not a quotation or statement that an instrument trades on MOT.
'use strict';
const {ok,fail,remote,validIsin}=require('../lib/market-data');
exports.handler=async event=>{
 if(event.httpMethod&&event.httpMethod!=='GET')return fail('Metodo non consentito',405);
 const isin=String(event.queryStringParameters?.isin||'').toUpperCase();if(!validIsin(isin))return fail('ISIN non valido',400);
 try{
  const d=await remote('https://query1.finance.yahoo.com/v1/finance/search?q='+encodeURIComponent(isin)+'&quotesCount=30&newsCount=0');
  const rows=(d.quotes||[]).filter(q=>String(q.isin||'').toUpperCase()===isin);
  return ok({isin,results:rows.map(q=>({isin,symbol:q.symbol,name:q.longname||q.shortname||q.symbol,market:q.exchDisp||q.exchange||'',exchange:q.exchange||'',type:q.quoteType||'',currency:q.currency||''}))});
 }catch(e){return fail('Catalogo strumenti non raggiungibile: '+String(e.message).slice(0,100))}
};
