// Market quotes: unchanged market unit and verified Yahoo symbol, no fabrication.
'use strict';
const {ok,fail,cleanSymbol,validSymbol,yahooChart,lastQuote}=require('../lib/market-data');
exports.handler=async event=>{
 if(event.httpMethod && event.httpMethod!=='GET')return fail('Metodo non consentito',405);
 const q=event.queryStringParameters||{},symbol=cleanSymbol(q.symbol),currency=String(q.currency||'').toUpperCase();
 if(!validSymbol(symbol)||currency&&!/^[A-Z]{3}$/.test(currency))return fail('Ticker/valuta non validi',400);
 try{const r=await yahooChart(symbol),item=lastQuote(r);
  if(currency&&item.currency!==currency)return fail('Valuta fonte diversa dalla valuta richiesta',422);
  return ok({symbol:String(r.meta.symbol),...item});
 }catch(e){return fail('Quotazione non disponibile: '+String(e.message).slice(0,120))}
};
