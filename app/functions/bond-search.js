// Bonds: verified ISIN match only; no guessed MOT instruments.
'use strict';
const {ok,fail,remote}=require('./market-data');
exports.handler=async event=>{
 if(event.httpMethod&&event.httpMethod!=='GET')return fail('Metodo non consentito',405);
 const q=String(event.queryStringParameters?.q||'').trim().slice(0,90);if(q.length<2)return fail('Ricerca troppo breve',400);
 try{const d=await remote('https://query1.finance.yahoo.com/v1/finance/search?q='+encodeURIComponent(q)+'&quotesCount=40&newsCount=0');
  const rows=(d.quotes||[]).filter(r=>/BOND/i.test(String(r.quoteType||''))&&r.symbol);
  return ok({results:rows.map(r=>({symbol:r.symbol,shortname:r.shortname||r.longname||r.symbol,longname:r.longname||r.shortname||r.symbol,exchDisp:r.exchDisp||r.exchange||'',exchange:r.exchange||'',currency:r.currency||'',quoteType:'BOND',isin:r.isin||'',source:'Yahoo Finance · directory'}))});
 }catch(e){return fail('Ricerca obbligazioni non disponibile: '+String(e.message).slice(0,100))}
};
