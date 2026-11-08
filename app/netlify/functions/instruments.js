// Optional ISIN-to-market reference lookup. Requires a Netlify Functions deployment.
// OpenFIGI provides reference identities but not trade prices. A market quote is verified separately.
const venueSymbols = {
  'US': '', 'LN': '.L', 'LONDON': '.L', 'IM': '.MI', 'MILAN': '.MI',
  'GM': '.DE', 'GY': '.DE', 'FRANKFURT': '.F', 'FP': '.PA',
  'NA': '.AS', 'SW': '.SW', 'SM': '.MC', 'HK': '.HK', 'JP': '.T', 'CN': '.TO'
};
const allowedIsin = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
function checksum(isin){const chars=isin.split('').map(c=>/[A-Z]/.test(c)?String(c.charCodeAt(0)-55):c).join('');let sum=0,twice=false;for(let i=chars.length-1;i>=0;i--){let n=+chars[i];if(twice){n*=2;if(n>9)n-=9}sum+=n;twice=!twice}return sum%10===0}
exports.handler=async event=>{
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
 const isin=String(event.queryStringParameters?.isin||'').trim().toUpperCase();
 if(!allowedIsin.test(isin)||!checksum(isin))return{statusCode:400,headers,body:JSON.stringify({error:'ISIN non valido'})};
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),6500);
 try{
  const resp=await fetch('https://api.openfigi.com/v3/mapping',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify([{idType:'ID_ISIN',idValue:isin}]),signal:ctrl.signal});
  if(!resp.ok)throw Error('OpenFIGI HTTP '+resp.status);
  const list=await resp.json(),records=Array.isArray(list?.[0]?.data)?list[0].data:[];
  const found=[],seen=new Set();
  for(const record of records){
   const exchange=String(record.exchCode||'').toUpperCase();
   const ticker=String(record.ticker||'').trim();
   // These are *candidate* Yahoo symbols, not assertions of a matching listing.
   if(!ticker||!Object.hasOwn(venueSymbols,exchange))continue;
   const symbol=ticker+venueSymbols[exchange],key=symbol+'|'+exchange;
   if(seen.has(key)||!/^[A-Za-z0-9.\-^]{1,22}$/.test(symbol))continue;
   seen.add(key);
   const sector=String(record.marketSector||'').toLowerCase(),stype=String(record.securityType2||record.securityType||'').toLowerCase();
   found.push({symbol,name:record.name||record.securityDescription||ticker,market:exchange,exchange,type:stype.includes('etf')?'ETF':sector.includes('gov')||sector.includes('corp')||stype.includes('bond')?'BOND':'EQUITY',currency:'da verificare',figi:record.figi});
   if(found.length>=25)break;
  }
  return{statusCode:200,headers,body:JSON.stringify({results:found,source:'OpenFIGI',disclaimer:'I simboli sono candidati: verificare ISIN, borsa e valuta con la quotazione selezionata.'})};
 }catch(e){return{statusCode:503,headers,body:JSON.stringify({error:'Ricerca ISIN non disponibile',detail:String(e.message||e)})}}
 finally{clearTimeout(timeout)}
};
