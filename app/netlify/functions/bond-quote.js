// Official bond quotes require an explicitly matched MOT trade and date.
// A 503 is intentional when the public page cannot provide verifiable structured data.
'use strict';
const {ok,fail,validIsin}=require('../lib/market-data');
exports.handler=async event=>{
 if(event.httpMethod&&event.httpMethod!=='GET')return fail('Metodo non consentito',405);
 const isin=String(event.queryStringParameters?.isin||'').toUpperCase();if(!validIsin(isin))return fail('ISIN non valido',400);
 // No known, durable, verified MOT quote API in this deployment.
 // Never report another security's price as an official bond price.
 return fail('Quotazione ufficiale MOT non verificabile automaticamente per '+isin+'. Utilizza le rilevazioni locali oppure la scheda Borsa Italiana.');
};
