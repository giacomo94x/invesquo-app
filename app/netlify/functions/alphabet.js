// Alphabet C, Milano/GEM: only the EUR Milan listing 1GOOG.MI.
'use strict';
const {ok,fail,yahooChart,lastQuote}=require('../lib/market-data');
exports.handler=async event=>{
 if(event.httpMethod && event.httpMethod!=='GET')return fail('Metodo non consentito',405);
 try{const r=await yahooChart('1GOOG.MI'),item=lastQuote(r);
  if(item.currency!=='EUR')return fail('Valuta Alphabet Milano diversa da EUR',422);
  return ok({symbol:'1GOOG',isin:'US02079K1079',...item});
 }catch(e){return fail('Alphabet Milano non disponibile: '+String(e.message).slice(0,120))}
};
