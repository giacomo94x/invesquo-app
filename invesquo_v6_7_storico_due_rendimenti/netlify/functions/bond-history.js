// Euronext MOT historical daily observations only; no invented points.
// Endpoint documented in open-source Euronext R EN_HistData (cran/Euronext).
// This public-facing historical endpoint is not a guaranteed licensed feed.
const PERIOD_DAYS={'1d':7,'5d':14,'1mo':38,'6mo':195,'1y':375,'max':730};
const ALLOWED=new Set(['IT0005735227']); // whitelist: validate market/ISIN before adding others
function send(statusCode,obj){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public,max-age=900'},body:JSON.stringify(obj)}}
function n(raw){let v=String(raw||'').replace(/\s/g,'').replace(/[^0-9.,-]/g,'');if(!v)return NaN;if(v.includes(',')&&v.includes('.'))v=v.replace(/\./g,'').replace(',','.');else if(v.includes(','))v=v.replace(',','.');return Number(v)}
function clean(t){return String(t).replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()}
function parse(html){
 // Parse date/close columns from returned historical table, ignore turnover/volume.
 const tables=html.match(/<table\b[^>]*>[\s\S]*?<\/table>/gi)||[];
 for(const table of tables){
  const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(x=>[...x[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(v=>clean(v[1]))).filter(x=>x.length>=2);
  if(!rows.length)continue;
  const labels=rows[0].map(x=>x.toLowerCase());
  const di=labels.findIndex(x=>/date|data/.test(x));
  const closeIndex=labels.findIndex(x=>/^(close|chiusura|prezzo finale)/.test(x));
  const ci=closeIndex>=0?closeIndex:labels.findIndex(x=>/^(last|ultimo)/.test(x));
  if(di<0||ci<0)continue;
  const pts=[];
  for(const cells of rows.slice(1)){
   const d=cells[di]||'';const m=d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
   if(!m)continue;
   const t=Date.UTC(Number(m[3]),Number(m[2])-1,Number(m[1]),16);
   const p=n(cells[ci]);
   if(Number.isFinite(t)&&t<=Date.now()+86400000&&Number.isFinite(p)&&p>40&&p<170)pts.push({t,p});
  }
  const sorted=pts.sort((a,b)=>a.t-b.t).filter((pt,i,a)=>!i||pt.t!==a[i-1].t);
  if(sorted.length>=2)return sorted;
 }
 return [];
}
exports.handler=async event=>{
 const p=event.queryStringParameters||{},isin=String(p.isin||'').toUpperCase(),range=String(p.range||'1mo');
 if(!ALLOWED.has(isin)||!PERIOD_DAYS[range])return send(400,{error:'ISIN o periodo non supportato'});
 const days=PERIOD_DAYS[range],today=new Date(),from=new Date(Date.now()-days*86400000);
 const fmt=d=>d.toISOString().slice(0,10);
 const form=new URLSearchParams({adjusted:'Y',startdate:fmt(from),enddate:fmt(today),nbSession:'10'});
 const errors=[];
 for(const mic of ['MOTX','XMOT']){
  const url='https://live.euronext.com/en/ajax/getHistoricalPricePopup/'+isin+'-'+mic;
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);
  try{
   const r=await fetch(url,{method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','Accept':'text/html, */*','X-Requested-With':'XMLHttpRequest','User-Agent':'Mozilla/5.0','Referer':'https://live.euronext.com/'},body:form.toString()});
   if(!r.ok){errors.push(mic+' HTTP '+r.status);continue;}
   const html=await r.text();const points=parse(html);
   if(points.length>=2)return send(200,{isin,mic,currency:'EUR',unit:'percentOfNominal',source:'Euronext · storico MOT',points,asOf:new Date(points[points.length-1].t).toISOString().slice(0,10)});
   errors.push(mic+' tabella storica non riconosciuta o meno di 2 prezzi');
  }catch(e){errors.push(mic+' '+String(e.message||e))}finally{clearTimeout(timer)}
 }
 return send(503,{error:'Storico Euronext non disponibile',details:errors.join(' · '),isin});
};
