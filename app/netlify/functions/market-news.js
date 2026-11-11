/* Finholdra beta 9.9.18 — Yahoo Finance market headlines via RSS.
   Live news only; no generated articles or stored personal data. */
'use strict';
const xmlDecode = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (full, name) => {
  const v = name.toLowerCase(); if(v==='amp')return '&';if(v==='lt')return '<';if(v==='gt')return '>';if(v==='quot')return '"';if(v==='apos')return "'";if(v==='nbsp')return ' ';
  if(v[0]==='#'){const n=v[1]==='x'?parseInt(v.slice(2),16):parseInt(v.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}return full;
}).replace(/<[^>]+>/g,'').trim();
const getTag=(source,tag)=>{const m=source.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i'));return m?xmlDecode(m[1]):''};
function entries(xml){const values=[];const rx=/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi;let m;while((m=rx.exec(xml))&&values.length<40){const raw=m[0];const title=getTag(raw,'title');const url=getTag(raw,'link');const publishedAt=getTag(raw,'pubDate');if(!title||!/^https:\/\//i.test(url))continue;const d=Date.parse(publishedAt);if(!Number.isFinite(d)||d>Date.now()+3600000||d<Date.now()-8*86400000)continue;values.push({title,url,publishedAt:new Date(d).toISOString(),source:'Yahoo Finance'});}return values;}
async function load(uri){const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),7000);try{const res=await fetch(uri,{signal:abort.signal,headers:{Accept:'application/rss+xml, application/xml, text/xml;q=0.8','User-Agent':'Finholdra/1.0 (RSS headline reader)'}});if(!res.ok)throw Error('Feed returned '+res.status);const str=await res.text();if(str.length>750000)throw Error('Oversized feed');return entries(str);}finally{clearTimeout(timeout)}}
exports.handler=async function(){
 const headers={'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=300, s-maxage=600','access-control-allow-origin':'*'};
 const feeds=[
  'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,%5EIXIC,%5EDJI&region=US&lang=en-US',
  'https://feeds.finance.yahoo.com/rss/2.0/headline?s=MSFT,AAPL,NVDA&region=US&lang=en-US'
 ];
 const items=(await Promise.allSettled(feeds.map(load))).filter(r=>r.status==='fulfilled').flatMap(r=>r.value);
 const seen=new Set();const articles=items.filter(n=>{const key=n.title.toLowerCase();if(seen.has(key))return false;seen.add(key);return true}).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,4);
 return {statusCode:200,headers,body:JSON.stringify({articles})};
};
