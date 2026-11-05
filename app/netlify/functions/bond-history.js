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
// Optional public CSV history, independently validated for the requested ISIN.
// Source may be rate-limited or withdrawn; never infer prices from yields.
function splitCsv(line,sep){let out=[],buf='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){buf+='"';i++}else quoted=!quoted}else if(c===sep&&!quoted){out.push(buf.trim());buf=''}else buf+=c}out.push(buf.trim());return out}
function csvDate(v){const x=String(v||'').trim();let m=x.match(/^(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);if(m)return Date.UTC(+m[1],+m[2]-1,+m[3],16);m=x.match(/^(\d{1,2})[/.](\d{1,2})[/.](20\d{2})/);return m?Date.UTC(+m[3],+m[2]-1,+m[1],16):NaN}
function parseCsv(csv){
 const lines=csv.replace(/^\ufeff/,'').split(/\r?\n/).filter(Boolean);if(lines.length<2)return [];
 const sep=[';',',','\t'].sort((a,b)=>lines[0].split(b).length-lines[0].split(a).length)[0];
 const headers=splitCsv(lines[0],sep).map(x=>x.toLowerCase().replace(/[^a-z0-9]/g,''));
 const di=headers.findIndex(x=>/^(date|data|pricedate|observationdate|timestamp)$/.test(x));
 const ci=headers.findIndex(x=>/^(price|close|closingprice|lastprice|marketprice|cleanprice|priceeur|bondprice)$/.test(x));
 if(di<0||ci<0)return [];
 const pts=[];for(const row of lines.slice(1)){
  const cells=splitCsv(row,sep),t=csvDate(cells[di]),p=n(cells[ci]);
  if(Number.isFinite(t)&&t<=Date.now()+86400000&&p>=50&&p<=160)pts.push({t,p});
 }
 return pts.sort((a,b)=>a.t-b.t).filter((p,i,a)=>!i||p.t!==a[i-1].t);
}
async function publicCsv(isin){
 const url='https://atlantisdatasolutions.com/bond/'+isin+'/history.csv';
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);
 try{const r=await fetch(url,{signal:ctrl.signal,headers:{Accept:'text/csv,text/plain,*/*','User-Agent':'Mozilla/5.0 (compatible; Invesquo/6.8)'}});
  if(!r.ok)throw Error('CSV HTTP '+r.status);
  const txt=await r.text();if(txt.length>2000000||/^\s*<(!doctype|html)/i.test(txt))throw Error('Risposta non CSV');
  return parseCsv(txt);
 }finally{clearTimeout(timer)}
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
 try{
  const all=await publicCsv(isin),cutoff=Date.now()-days*86400000,points=all.filter(pt=>pt.t>=cutoff);
  if(points.length)return send(200,{isin,currency:'EUR',unit:'percentOfNominal',source:'Atlantis Data Solutions · CSV pubblico',points,asOf:new Date(points[points.length-1].t).toISOString().slice(0,10)});
  errors.push('CSV: nessuna rilevazione nel periodo');
 }catch(e){errors.push('CSV: '+String(e.message||e))}
 return send(503,{error:'Storico BTP non disponibile dalle fonti esterne',details:errors.join(' · '),isin});
};
