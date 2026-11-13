// Finholdra BTP official quote source. Only price and date explicitly identified on Borsa Italiana.
const ISIN='IT0005735227';
const respond=(code,data)=>({statusCode:code,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=300'},body:JSON.stringify(data)});
function clean(html){return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()}
function parseNumber(value){return Number(String(value).replace(/\./g,'').replace(',','.'))}
function isoDate(m){const year=+m[4]<100?2000+Number(m[4]):Number(m[4]);const mm=Number(m[3]),dd=Number(m[2]);const d=new Date(Date.UTC(year,mm-1,dd));return d.getUTCFullYear()===year&&d.getUTCMonth()===mm-1&&d.getUTCDate()===dd?d.toISOString().slice(0,10):null}
function findPrice(content){
 // Official close preferred for reproducible history; reference only as fallback.
 const patterns=[[/Prezzo ufficiale\s*([0-9]{2,3}[,.][0-9]{1,7})\s*Data Pr Ufficiale\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i,'official-close'],[/Prezzo di riferimento\s*([0-9]{2,3}[,.][0-9]{1,7})\s*Data di riferimento\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i,'reference']];
 for(const [rx,priceType] of patterns){const m=content.match(rx);if(!m)continue;const date=isoDate(m);const price=parseNumber(m[1]);if(date&&price>=50&&price<=160)return {price,priceDate:date,priceType};}
 return null;
}
exports.handler=async event=>{
 const isin=String(event.queryStringParameters?.isin||'').toUpperCase();if(isin!==ISIN)return respond(400,{error:'ISIN non supportato'});
 const url='https://www.borsaitaliana.it/borsa/obbligazioni/mot/btp/scheda/'+ISIN+'-MOTX.html?lang=it';
 const ctl=new AbortController();const timeout=setTimeout(()=>ctl.abort(),8500);
 try{const r=await fetch(url,{signal:ctl.signal,headers:{Accept:'text/html','User-Agent':'Mozilla/5.0 (compatible; Finholdra/9.9.49)'}});
  if(!r.ok)throw Error('Borsa Italiana HTTP '+r.status);
  const html=await r.text();if(html.length<800||html.length>3000000)throw Error('Risposta Borsa non valida');
  const txt=clean(html);if(!txt.includes(ISIN)||!txt.toLowerCase().includes('btp valore insieme'))throw Error('ISIN o nome BTP non verificato');
  const result=findPrice(txt);if(!result)throw Error('Prezzo ufficiale e data non identificabili');
  return respond(200,{isin,currency:'EUR',source:'Borsa Italiana · MOT',...result,asOf:new Date().toISOString()});
 }catch(e){return respond(503,{error:String(e.message||e)})}finally{clearTimeout(timeout)}
};
