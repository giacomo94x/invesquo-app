// Reachability only: health=200 proves Netlify function executed, not external provider success.
'use strict';
const fs=require('node:fs');const path=require('node:path');
exports.handler=async event=>{
 if(event.httpMethod&&event.httpMethod!=='GET')return {statusCode:405,body:'Method not allowed'};
 const names=['health','history','search','gem-search','market-news','live-quote','alphabet','market-indices','instruments','bond-search','bond-quote','bond-history'];
 const result={ok:true,service:'invesquo-netlify-functions',version:'10.9.92',scope:'endpoint-only',note:'Il controllo non garantisce la disponibilità delle fonti di mercato.',expectedFunctions:names.length};
 return {statusCode:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify(result)};
};
