// Finholdra · OpenFIGI v3 keyword discovery. Identity metadata only: never a price source.
// No API key is required. OPENFIGI_API_KEY is optional; respect minute limits and cache responses.
const cache = new Map();
let nextAllowed = 0;
const normalize = s => String(s ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
const result = (body, statusCode=200, maxAge=1800) => ({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':`public, max-age=${maxAge}`},body:JSON.stringify(body)});
const clean = s => String(s??'').replace(/[<>]/g,'').trim();
const codeCountry = ex => /^(?:IM|MI|IT|BIT|MIL|MTAA|MT)$/.test(ex);
async function apiSearch(query, headers) {
  const ctl = new AbortController(); const timeout=setTimeout(()=>ctl.abort(),3400);
  try {const res=await fetch('https://api.openfigi.com/v3/search',{method:'POST',headers,body:JSON.stringify({query}),signal:ctl.signal});
    if(res.status===429){nextAllowed=Date.now()+60000;return {limited:true,rows:[]};}
    if(!res.ok)return {rows:[],limited:false};
    const payload=await res.json();return {rows:Array.isArray(payload.data)?payload.data:[],limited:false};
  }finally{clearTimeout(timeout)}
}
// FIGI exchange codes do not map one-to-one to Yahoo suffixes; verify any proposed .MI ticker
// against Yahoo's own chart metadata before presenting it as a selectable listing.
async function verifiedMilan(ticker){
  if(!/^[A-Z0-9]{1,18}$/.test(ticker))return false;
  const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),1800);
  try{const u='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(ticker+'.MI')+'?range=5d&interval=1d';
    const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'},signal:ctl.signal});
    if(!r.ok)return false;const d=await r.json();const meta=d?.chart?.result?.[0]?.meta;
    return String(meta?.symbol||'').toUpperCase()===(ticker+'.MI') && !!meta?.currency;
  }catch(_){return false}finally{clearTimeout(timeout)}
}
exports.handler=async event=>{
  if(event.httpMethod!=='GET')return result({quotes:[],error:'Method not allowed'},405,0);
  const q=normalize(event.queryStringParameters?.q);
  if(q.length<2)return result({quotes:[],error:'Inserisci almeno due caratteri'},400,0);
  const key=q.toLocaleLowerCase('it-IT');const found=cache.get(key);
  if(found&&found.expires>Date.now())return result({...found.data,cached:true});
  if(Date.now()<nextAllowed)return result({quotes:[],available:false,limited:true,source:'OpenFIGI'},200,30);
  const headers={'Content-Type':'application/json','Accept':'application/json','User-Agent':'Finholdra/1.0'};
  if(process.env.OPENFIGI_API_KEY)headers['X-OPENFIGI-APIKEY']=process.env.OPENFIGI_API_KEY;
  let response;
  try{response=await apiSearch(q,headers)}catch(_){return result({quotes:[],available:false,source:'OpenFIGI'},200,60)}
  if(response.limited)return result({quotes:[],available:false,limited:true,source:'OpenFIGI'},200,60);
  const rows=response.rows.filter(x=>x && x.ticker && x.name && /^(equity|index|corporate|govt|mtge|muni|comdty|fund)/i.test(String(x.marketSector||'Equity')));
  // Keep small work; unverified local listings are NOT synthesized.
  const milan=rows.filter(x=>codeCountry(String(x.exchCode||'').toUpperCase())).slice(0,6);
  const checked=await Promise.all(milan.map(async x=>[x,await verifiedMilan(clean(x.ticker).toUpperCase())]));
  const okMilano=new Set(checked.filter(x=>x[1]).map(x=>x[0]));
  const output=[];const seen=new Set();
  for(const item of rows){
    const ex=clean(item.exchCode).toUpperCase(),ticker=clean(item.ticker).toUpperCase(),italian=codeCountry(ex);
    // Allow plainly identified US ticker and checked Milan listing. Other listings require a
    // provider-qualified ticker and are left to existing Yahoo/market directory discovery.
    if(italian&&!okMilano.has(item))continue;
    if(!italian && !['US','UN','UQ','UW','UA','UF','UR'].includes(ex))continue;
    if(!/^[A-Z0-9.\-]{1,24}$/.test(ticker))continue;
    const symbol=italian?ticker+'.MI':ticker;
    if(seen.has(symbol))continue;seen.add(symbol);
    const desc=clean(item.name||item.securityDescription||ticker);
    output.push({symbol,shortname:desc,longname:desc,exchange:italian?'MIL':'US',exchDisp:italian?'Borsa Italiana · Milano':'USA · '+(ex||'quotazione da verificare'),currency:italian?'EUR':undefined,quoteType:/fund/i.test(item.securityType2||'')?'ETF':'EQUITY',figi:clean(item.figi),source:'OpenFIGI · identificazione',referenceOnly:true});
    if(output.length>=30)break;
  }
  const data={quotes:output,available:true,source:'OpenFIGI',limited:false};cache.set(key,{data,expires:Date.now()+1800000});
  if(cache.size>250)cache.delete(cache.keys().next().value);
  return result(data);
};
