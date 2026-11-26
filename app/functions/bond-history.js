// Bond history must only contain exchange-verified observations, never interpolations.
'use strict';
const {fail,validIsin}=require('./market-data');
exports.handler=async event=>{
 if(event.httpMethod&&event.httpMethod!=='GET')return fail('Metodo non consentito',405);
 const isin=String(event.queryStringParameters?.isin||'').toUpperCase();if(!validIsin(isin))return fail('ISIN non valido',400);
 return fail('Storico ufficiale MOT per '+isin+' non disponibile: nessuna curva ricostruita artificialmente.');
};
