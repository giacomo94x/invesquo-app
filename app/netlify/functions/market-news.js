// Finholdra Beta 10.9.1: trusted server-side RSS retrieval for public market news.
// Only fixed news providers are called; user input is used solely as a bounded search term.
const sources = [
  q => `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:7d')}&hl=it&gl=IT&ceid=IT:it`,
  q => `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&setlang=it`
];
const decode = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(Number(n),0x10ffff))).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(Math.min(parseInt(n,16),0x10ffff))).replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g,m=>({ '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' ' }[m]||m)).replace(/<[^>]+>/g,'').trim();
const field=(block,tag)=>{
  const match=block.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i'));
  return match?decode(match[1]):'';
};
const parse = xml => {
  const blocks=xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi)||[];
  return blocks.slice(0,24).map(b=>{
    const link=field(b,'link');let safe='';
    try{const u=new URL(link);if(u.protocol==='https:'||u.protocol==='http:')safe=u.href;}catch{}
    return {title:field(b,'title').slice(0,350),url:safe,source:field(b,'source').slice(0,120),date:field(b,'pubDate')};
  }).filter(x=>x.title&&x.url).slice(0,10);
};
exports.handler=async event=>{
  const q=String(event.queryStringParameters?.q||'').trim().slice(0,100);
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=180, s-maxage=300','Access-Control-Allow-Origin':'*'};
  if(q.length<2)return {statusCode:400,headers,body:JSON.stringify({articles:[],error:'Inserisci almeno due caratteri.'})};
  let articles=[];let source='';
  for(const makeUrl of sources){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6000);
    try{
      const response=await fetch(makeUrl(q),{signal:controller.signal,headers:{'User-Agent':'Finholdra/10.9.1 (news RSS reader)','Accept':'application/rss+xml, application/xml, text/xml'}});
      if(!response.ok)continue;
      const xml=await response.text();
      if(xml.length>1500000)continue;
      articles=parse(xml);
      if(articles.length){source=makeUrl===sources[0]?'Google News':'Bing News';break;}
    }catch(_){}finally{clearTimeout(timer);}
  }
  return {statusCode:200,headers,body:JSON.stringify({articles,source,query:q})};
};
