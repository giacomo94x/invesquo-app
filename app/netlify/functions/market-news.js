// Finholdra market-news endpoint, Netlify Functions (Node 18+).
// Searches Yahoo Finance for headlines, with a Google News RSS fallback.
// Does not store scraped articles, does not return synthetic news or expose credentials.
const JSON_HEADERS = {'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=120, stale-while-revalidate=180'};
const ENTITY = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',euro:'€',rsquo:'’',ldquo:'“',rdquo:'”'};
function decodeEntities(x){return String(x||'').replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(m,k)=>{if(k[0]==='#'){let n=k[1].toLowerCase()==='x'?parseInt(k.slice(2),16):parseInt(k.slice(1),10);return Number.isFinite(n)&&n>0&&n<=0x10ffff?String.fromCodePoint(n):m;}return ENTITY[k.toLowerCase()]??m;});}
function clean(x){return decodeEntities(String(x||'').replace(/<[^>]*>/g,'')).replace(/\s+/g,' ').trim();}
function secureUrl(u){try{let x=new URL(String(u||''));return x.protocol==='https:'?x.href:'';}catch{return '';}}
function freshDate(d){const t=Date.parse(d);return Number.isFinite(t)?new Date(t).toISOString():'';}
async function fetchText(url,limitMs=6500){const c=new AbortController();const timer=setTimeout(()=>c.abort(),limitMs);try{const r=await fetch(url,{signal:c.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (compatible; Finholdra/1.0; news)','Accept':'application/json, application/rss+xml, text/xml;q=0.8, */*;q=0.5'}});if(!r.ok)throw Error('Upstream '+r.status);return await r.text();}finally{clearTimeout(timer)}}
function parseYahoo(json){let items=Array.isArray(json?.news)?json.news:[];return items.map(x=>({title:clean(x.title),url:secureUrl(x.link||x.url),source:clean(x.publisher||'Yahoo Finance'),publishedAt:Number.isFinite(Number(x.providerPublishTime))?new Date(Number(x.providerPublishTime)*1000).toISOString():''})).filter(x=>x.title&&x.url);}
function parseRss(xml){let matches=xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];let field=(body,tag)=>{let m=body.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i'));if(!m)return '';let v=m[1].trim();return v.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/,'$1');};return matches.slice(0,35).map(body=>({title:clean(field(body,'title')),url:secureUrl(clean(field(body,'link'))),source:clean(field(body,'source'))||'Google News',publishedAt:freshDate(clean(field(body,'pubDate')))})).filter(x=>x.title&&x.url);}
function uniq(items){const seen=new Set();return items.filter(n=>{const key=n.title.toLocaleLowerCase('it-IT').replace(/\W+/g,' ').trim();if(!key||seen.has(key))return false;seen.add(key);return true;}).slice(0,12)}
exports.handler = async event => {
 const source=event.queryStringParameters?.source==='investing'?'investing':'yahoo';
 const q=String(event.queryStringParameters?.q||'').trim().slice(0,100);
 if(event.httpMethod && event.httpMethod!=='GET')return {statusCode:405,headers:JSON_HEADERS,body:JSON.stringify({error:'Metodo non consentito'})};
 const query=q.length>=2?q:source==='investing'?'borsa mercati azioni investimenti':'borsa mercati finanza economia';
 let articles=[],provider='',errors=[];
 if(source==='yahoo'){
  const api='https://query1.finance.yahoo.com/v1/finance/search?q='+encodeURIComponent(query)+'&quotesCount=0&newsCount=20&region=IT&lang=it-IT';
  try{articles=parseYahoo(JSON.parse(await fetchText(api)));if(articles.length)provider='Yahoo Finance';}catch(e){errors.push('Yahoo Finance non disponibile');}
 }
 // Independent fallback. Restricting to the selected publisher when possible
 // keeps source preference meaningful even when a publisher RSS has been retired.
 if(!articles.length){
  const filtered=source==='investing'?query+' site:it.investing.com':(q?query+' site:it.finance.yahoo.com':query);
  const rss='https://news.google.com/rss/search?q='+encodeURIComponent(filtered+' when:7d')+'&hl=it&gl=IT&ceid=IT:it';
  try{articles=parseRss(await fetchText(rss));provider=source==='investing'?'Google News · Investing.com Italia':'Google News · finanza italiana';}catch(e){errors.push('RSS non disponibile');}
 }
 // Final broad RSS fallback if publisher restriction contains no current headlines.
 if(!articles.length){
  const rss='https://news.google.com/rss/search?q='+encodeURIComponent(query+' when:7d')+'&hl=it&gl=IT&ceid=IT:it';
  try{articles=parseRss(await fetchText(rss));provider='Google News · economia e mercati';}catch(e){errors.push('Fonte alternativa non disponibile');}
 }
 const payload={articles:uniq(articles),source:provider||(source==='investing'?'Investing.com Italia':'Yahoo Finance'),available:articles.length>0,errors};
 return {statusCode:200,headers:JSON_HEADERS,body:JSON.stringify(payload)};
};
