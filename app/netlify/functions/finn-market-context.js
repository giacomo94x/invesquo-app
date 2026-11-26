/* Finn market context. Yahoo Finance is an unlicensed/unofficial best-effort source; never create prices or volumes. */
const HEAD={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=120'};
const result=(status,body)=>({statusCode:status,headers:HEAD,body:JSON.stringify(body)});
const ALIASES={'1NVDA':'NVDA','1TSLA':'TSLA','1AAPL':'AAPL','1MSFT':'MSFT','1GOOG':'GOOG','1GOOGL':'GOOGL','1FB':'META','1NFLX':'NFLX','1AMZN':'AMZN'};
function series(raw){
 const a=raw?.chart?.result?.[0];if(!a)return null;
 const candle=a.indicators?.quote?.[0]||{},ts=a.timestamp||[];
 const candles=ts.map((t,i)=>({t:t*1000,p:Number(candle.close?.[i]),h:Number(candle.high?.[i]),l:Number(candle.low?.[i]),v:candle.volume?.[i]==null?null:Number(candle.volume[i])})).filter(p=>Number.isFinite(p.p)&&p.p>0);
 return {symbol:String(a.meta?.symbol||''),currency:String(a.meta?.currency||''),exchange:String(a.meta?.exchangeName||''),timezone:a.meta?.exchangeTimezoneName||'',previousClose:Number(a.meta?.chartPreviousClose)||null,candles};
}
async function yahoo(symbol,range,interval){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6500);
 try {const u='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?range='+range+'&interval='+interval+'&includePrePost=false';
 const r=await fetch(u,{signal:ctrl.signal,headers:{'Accept':'application/json','User-Agent':'Mozilla/5.0 (compatible; Finholdra/1.0)'}});
 if(!r.ok)return null;const data=await r.json();const s=series(data);return s&&s.symbol.toUpperCase()===symbol.toUpperCase()?s:null;
 }catch(_){return null}finally{clearTimeout(timer)}
}
function dateKey(ms,tz){return new Intl.DateTimeFormat('en-CA',{timeZone:tz||'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));}
function minutes(ms,tz){const v=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(ms));return Number(v.find(p=>p.type==='hour')?.value)*60+Number(v.find(p=>p.type==='minute')?.value)}
function opening(data){
 if(!data||data.candles.length<4)return {status:'unavailable',reason:'Dati intraday insufficienti'};
 const tz=data.timezone||'America/New_York';const c=data.candles;const today=dateKey(c.at(-1).t,tz);const todayPts=c.filter(p=>dateKey(p.t,tz)===today);if(today!==dateKey(Date.now(),tz))return {status:'unavailable',reason:'L’ultima seduta disponibile non è quella di oggi.',date:today};
 const us=/New_York/i.test(tz);const italy=/Rome|Milan/i.test(tz);if(!us&&!italy)return {status:'unavailable',reason:'Orario di apertura non identificato per questo mercato.'};const start=us?570:540;
 // We require first fifteen minutes from actual exchange open; no simulated OHLC or volume.
 const opens=todayPts.filter(p=>minutes(p.t,tz)>=start&&minutes(p.t,tz)<start+15);
 const after=todayPts.filter(p=>minutes(p.t,tz)>=start+15);
 if(opens.length<3||!after.length)return {status:'unavailable',reason:'Non è disponibile una serie completa dei primi 15 minuti e almeno un dato successivo.',date:today,points:todayPts.length};
 // Yahoo close-derived proxy range, not exact true high/low if fields are missing.
 const high=Math.max(...opens.map(p=>Number.isFinite(p.h)&&p.h>0?p.h:p.p));const low=Math.min(...opens.map(p=>Number.isFinite(p.l)&&p.l>0?p.l:p.p));const last=after.at(-1);
 const openVolume=opens.every(p=>Number.isFinite(p.v)&&p.v>=0)?opens.reduce((a,p)=>a+p.v,0):null;
 const laterVolume=after.slice(0,opens.length).every(p=>Number.isFinite(p.v)&&p.v>=0)?after.slice(0,opens.length).reduce((a,p)=>a+p.v,0):null;
 return {status:'available',date:today,windowMinutes:15,high,low,last:last.p,lastTime:last.t,openingVolume:openVolume,laterVolume,signal:last.p>high?'above':last.p<low?'below':'inside',source:'Yahoo Finance · serie intraday',candlesUsed:opens.length,volumeAvailable:openVolume!==null&&laterVolume!==null};
}
function usAfterMilan(data){
 if(!data||!data.candles.length)return null;
 const tz='America/New_York',now=Date.now();
 const dates=[...new Set(data.candles.map(c=>dateKey(c.t,tz)))].reverse();
 for(const date of dates){
  // Exclude an unfinished US regular session (New York 16:00).
  if(date===dateKey(now,tz)&&minutes(now,tz)<960)continue;
  const pts=data.candles.filter(c=>dateKey(c.t,tz)===date&&minutes(c.t,tz)>=570&&minutes(c.t,tz)<960);
  if(pts.length<5)continue;
  // Italy close is 17:30 Europe/Rome; day-light savings gap can vary.
  const after=pts.filter(c=>minutes(c.t,'Europe/Rome')>=1050);
  if(after.length<2)continue;
  const first=after[0],last=after.at(-1);
  if((last.t-first.t)<60*60*1000)continue;
  return {sessionDate:date,fromTime:first.t,toTime:last.t,from:first.p,to:last.p,changePct:(last.p/first.p-1)*100,source:'Yahoo Finance · 15 minuti',approximate:true};
 }
 return null;
}
function closeChange(data){
 if(!data||data.candles.length<2)return null;
 const last=data.candles.at(-1);const prev=data.candles.at(-2);
 return {symbol:data.symbol,currency:data.currency,close:last.p,sessionDate:dateKey(last.t,data.timezone),previousClose:prev.p,changePct:(last.p/prev.p-1)*100,exchange:data.exchange};
}
const clean=x=>String(x||'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\b(INC|CORPORATION|CORP|PLC|LTD|CLASS|CLASSE|ORDINARY|COMMON|STOCK|SPA|S P A)\b/g,' ').trim();
async function usCandidate(name){
 if(!name||name.length<4)return null;
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),5500);
 try{const r=await fetch('https://query1.finance.yahoo.com/v1/finance/search?q='+encodeURIComponent(name.slice(0,80))+'&quotesCount=20&newsCount=0',{signal:ctrl.signal,headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}});if(!r.ok)return null;
 const j=await r.json(),tokens=clean(name).split(/\s+/).filter(t=>t.length>2).slice(0,3);
 const us=(j.quotes||[]).filter(q=>q.quoteType==='EQUITY'&&/^(NMS|NYQ|NGM|NCM|NASDAQ|NYSE|ASE|PCX|BATS)$/.test(q.exchange||'')&&/^[A-Z]{1,6}$/.test(q.symbol||''));
 return us.find(q=>tokens.length&&tokens.every(t=>clean(q.longname||q.shortname).includes(t)))?.symbol||null;
 }catch(_){return null}finally{clearTimeout(timer)}
}
exports.handler=async event=>{
 if(event.httpMethod!=='GET')return result(405,{error:'GET required'});
 const q=event.queryStringParameters||{};const symbol=String(q.symbol||'').trim().toUpperCase(),kind=String(q.kind||'');
 if(!/^[A-Z0-9.^=\-]{1,25}$/.test(symbol)||!['opening','us'].includes(kind))return result(400,{error:'Richiesta non valida'});
 if(kind==='opening'){
  // 5 minute intervals avoid falsely implying precision when 1m points are unavailable.
  const d=await yahoo(symbol,'1d','5m');return result(200,{kind,marketData:opening(d),sourceAvailable:!!d});
 }
 if(!symbol.endsWith('.MI'))return result(200,{kind,status:'not_italian'});
 const base=symbol.slice(0,-3),mapped=ALIASES[base];const candidate=mapped||await usCandidate(String(q.name||'').slice(0,90));
 if(!candidate)return result(200,{kind,status:'no_match',reason:'Nessuna quotazione USA corrispondente verificabile trovata.'});
 const [it,us,usIntraday]=await Promise.all([yahoo(symbol,'5d','1d'),yahoo(candidate,'5d','1d'),yahoo(candidate,'5d','15m')]);
 const usData=closeChange(us),itData=closeChange(it);
 return result(200,{kind,status:usData?'available':'unavailable',italy:itData,usa:usData,afterMilan:usAfterMilan(usIntraday),matching: mapped?'verified_alias':'name_match',note:mapped?'Ticker USA associato a un simbolo GEM noto':'Possibile quotazione USA della stessa società individuata per nome: verificare la corrispondenza prima di considerarla equivalente.'});
};
