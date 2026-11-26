// Indices: report only verified real quotations, omit unreachable feeds.
'use strict';
const {ok,fail,yahooChart,lastQuote}=require('./market-data');
const INDEX=[['S&P 500','^GSPC'],['Nasdaq Composite','^IXIC'],['Dow Jones','^DJI'],['FTSE MIB','FTSEMIB.MI'],['DAX','^GDAXI'],['Euro Stoxx 50','^STOXX50E']];
exports.handler=async event=>{
 if(event.httpMethod&&event.httpMethod!=='GET')return fail('Metodo non consentito',405);
 const results=await Promise.allSettled(INDEX.map(async ([name,symbol])=>{
  const r=await yahooChart(symbol);const p=lastQuote(r),prev=Number(r.meta.chartPreviousClose||r.meta.previousClose);
  if(!(prev>0))throw Error('Chiusura precedente non verificata');
  return {name,symbol,price:p.price,changePercent:(p.price-prev)/prev*100,marketTime:p.asOf,currency:p.currency,source:p.source};
 }));
 const indices=results.filter(x=>x.status==='fulfilled').map(x=>x.value);
 return indices.length?ok({indices,available:true}):fail('Indici non disponibili dalla fonte esterna');
};
