// Discover Italian equity listings for *any* issuer rather than relying on a hand-curated GEM list.
// TradingView is a symbol directory, not an authorized historical-price feed.
const clean = v => String(v ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
const norm = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const stops = new Set(['inc','corporation','corp','company','co','class','classe','plc','limited','ltd','the','group','holdings','holding','sa','spa','ag','nv','se','ordinary','shares']);
function issuerWords(v){return norm(v).split(' ').filter(w=>w.length>=3&&!stops.has(w));}
function matchIssuer(row, q) {
  const query=norm(q), name=norm(row.shortname+' '+row.longname), symbol=String(row.symbol||'').toUpperCase();
  if (!query) return false;
  if (/^[a-z]{2}[a-z0-9]{9}\d$/i.test(q)) return String(row.isin||'').toUpperCase()===q.toUpperCase();
  if (query.length>=4 && name.includes(query)) return true;
  if (query.length>=3 && symbol.replace(/\.(MI|BIT)$/,'').toLowerCase().includes(query)) return true;
  const words=issuerWords(q);
  return words.length>0 && words.every(w=>name.split(' ').includes(w));
}
function fromTV(r){
  const exchange=clean(r.exchange||r.source_id).toUpperCase(), ticker=clean(r.ticker||String(r.symbol||'').split(':').pop());
  if (!['MIL','BIT','MILAN'].includes(exchange)||!ticker) return null;
  const type=clean(r.type).toLowerCase();
  if (type && !['stock','equity','common_stock'].includes(type)) return null;
  return {symbol:/\.MI$/i.test(ticker)?ticker:ticker+'.MI',shortname:clean(r.description||r.name||ticker),longname:clean(r.description||r.name||ticker),exchange:'MIL',exchDisp:'Borsa Italiana · Milano',currency:clean(r.currency_code||r.currency)||'EUR',isin:clean(r.isin),quoteType:'EQUITY',source:'TradingView · directory',referenceOnly:true};
}
async function get(url){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),3800);try{const res=await fetch(url,{signal:ctl.signal,headers:{'Accept':'application/json','User-Agent':'Mozilla/5.0'}});if(!res.ok)throw Error('HTTP '+res.status);return await res.json();}finally{clearTimeout(timer);}}
exports.handler=async event=>{
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=300'};
 if(event.httpMethod!=='GET')return {statusCode:405,headers,body:JSON.stringify({error:'Method not allowed'})};
 const q=clean(event.queryStringParameters?.q).slice(0,90);
 if(q.length<2)return {statusCode:400,headers,body:JSON.stringify({error:'Query too short'})};
 const queries=['MIL','BIT'].map(ex=>'https://symbol-search.tradingview.com/symbol_search/v3/?text='+encodeURIComponent(q)+'&exchange='+ex+'&lang=en&hl=1&search_type=undefined&domain=production');
 const result=await Promise.allSettled(queries.map(get));
 const matches=new Map();for(const r of result){if(r.status!=='fulfilled')continue;for(const item of r.value.symbols||[]){const row=fromTV(item);if(row&&matchIssuer(row,q))matches.set(row.symbol.toUpperCase(),row);}}
 return {statusCode:200,headers,body:JSON.stringify({quotes:[...matches.values()].slice(0,25),available:result.some(x=>x.status==='fulfilled')})};
};
