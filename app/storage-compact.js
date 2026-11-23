/* Finholdra 10.9.40 — opt-in, lossless, account-scoped storage compaction.
   No user data or transactions are discarded.  Existing compact keys remain
   readable on future updates; old installations cannot read compacted keys,
   therefore an external JSON backup is required before enabling it. */
(function(){
 'use strict';
 const PREFIX='FH_LZW1:';
 const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
 function compress(input){
  const bytes=encoder.encode(input);
  if(bytes.length===0)return PREFIX;
  const codes=[],dict=new Map();let next=256,w=String.fromCharCode(bytes[0]);
  for(let i=1;i<bytes.length;i++){
   const c=String.fromCharCode(bytes[i]),candidate=w+c;
   if(dict.has(candidate)){w=candidate;continue;}
   codes.push(w.length===1?w.charCodeAt(0):dict.get(w));
   if(next<65535)dict.set(candidate,next++);
   w=c;
  }
  codes.push(w.length===1?w.charCodeAt(0):dict.get(w));
  let out=PREFIX;
  for(let i=0;i<codes.length;i+=8192)out+=String.fromCharCode(...codes.slice(i,i+8192));
  return out;
 }
 function expand(packed){
  if(typeof packed!=='string'||!packed.startsWith(PREFIX))return packed;
  const raw=packed.slice(PREFIX.length);if(!raw)return '';
  let dictionary=[],next=256,w=String.fromCharCode(raw.charCodeAt(0)),pieces=[w],total=1;
  if(raw.charCodeAt(0)>255)throw Error('Archivio compresso non valido.');
  for(let i=1;i<raw.length;i++){
   const code=raw.charCodeAt(i);
   const entry=code<256?String.fromCharCode(code):dictionary[code-256]||(code===next?w+w[0]:null);
   if(entry===null||entry===undefined)throw Error('Codice archivio non valido: '+code);
   pieces.push(entry);total+=entry.length;
   if(next<65535)dictionary[next++-256]=w+entry[0];
   w=entry;
  }
  const bytes=new Uint8Array(total);let at=0;
  for(const part of pieces){for(let j=0;j<part.length;j++)bytes[at++]=part.charCodeAt(j)}
  return decoder.decode(bytes);
 }
 function storedSize(s){return 2*(s?.length||0)}
 function matches(key){return key==='patrimonio_iphone_v2'||key==='patrimonio_history_v36'||key==='patrimonio_trades_v36'||key==='finholdra_observations_v9930'||key==='invesquo_asset_prices_v58'||key==='invesquo_auto_recovery_b712'||key==='finholdra_daily_closes_v1020'||key==='finholdra_first_verified_day_v1020'||/^(?:finholdra_verified_closes_|invesquo_.*(?:price|close|history|quotes|audit))/.test(key)}
 function decode(raw){return expand(raw)}
 function encode(key,value,force=false){const str=String(value);if(str.startsWith(PREFIX))return str;if(!matches(key))return str;if(!force&&str.length<12000)return str;
  const packed=compress(str);return packed.length<str.length*.94?packed:str;}
 function preview(accountPrefix){let original=0,potential=0,keys=0;
  for(let i=0;i<localStorage.length;i++){
   const full=localStorage.key(i);if(!full?.startsWith(accountPrefix))continue;
   const key=full.slice(accountPrefix.length),raw=localStorage.getItem(full);
   if(!matches(key)||!raw||raw.startsWith(PREFIX)||raw.length<12000)continue;
   const packed=encode(key,raw,true);
   if(packed.length>=raw.length)continue;
   keys++;original+=storedSize(raw);potential+=storedSize(raw)-storedSize(packed);
  }
  return {keys,original,potential};
 }
 function compact(accountPrefix){let freed=0,count=0;const failed=[];
  const keys=[];for(let i=0;i<localStorage.length;i++){const full=localStorage.key(i);if(full?.startsWith(accountPrefix))keys.push(full)}
  keys.sort((a,b)=>(localStorage.getItem(b)?.length||0)-(localStorage.getItem(a)?.length||0));
  for(const full of keys){
   const key=full.slice(accountPrefix.length),original=localStorage.getItem(full);
   if(!matches(key)||!original||original.startsWith(PREFIX)||original.length<12000)continue;
   const packed=encode(key,original,true);if(packed===original)continue;
   try{
    if(expand(packed)!==original)throw Error('Verifica di compressione non superata.');
    localStorage.setItem(full,packed);
    const reread=localStorage.getItem(full);
    if(reread!==packed||expand(reread)!==original){localStorage.setItem(full,original);throw Error('Verifica di rilettura non superata.');}
    count++;freed+=storedSize(original)-storedSize(packed);
   }catch(e){failed.push(key+': '+(e?.message||e));}
  }
  return {count,freed,failed};
 }
 window.FinholdraCompact={PREFIX,compress,expand,decode,encode,preview,compact,matches};
})();
