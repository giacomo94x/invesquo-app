// Finholdra shared identity catalogue. Netlify Blobs is site-wide and survives deploys.
// No FIGI request is performed from an interactive user search.
const normalise = value => String(value||'').trim().toLocaleLowerCase('en-US').replace(/\s+/g,' ').slice(0,80);
const keyFor = q => encodeURIComponent(normalise(q));
function store(){try{return require('@netlify/blobs').getStore('finholdra-instruments-v1')}catch(e){return null}}
const safe = v => String(v||'').replace(/[<>]/g,'').trim().slice(0,240);
function valid(row){const symbol=safe(row?.symbol).toUpperCase();return /^[A-Z0-9.\-=^]{1,32}$/.test(symbol) && !!safe(row?.shortname||row?.longname)}
function unique(rows){const seen=new Set();return (rows||[]).filter(valid).filter(x=>{const k=x.symbol.toUpperCase();if(seen.has(k))return false;seen.add(k);return true}).slice(0,70)}
async function read(q){const s=store();if(!s)return null;try{return await s.get('query/'+keyFor(q),{type:'json',consistency:'strong'})}catch{return null}}
async function queue(q){const s=store();if(!s)return false;try{await s.setJSON('pending/'+keyFor(q),{query:normalise(q),requestedAt:Date.now()});return true}catch{return false}}
async function save(q,quotes){const s=store();if(!s)return false;try{await s.setJSON('query/'+keyFor(q),{query:normalise(q),quotes:unique(quotes),updatedAt:Date.now(),source:'Finholdra · OpenFIGI + Yahoo'});return true}catch{return false}}
module.exports={normalise,keyFor,store,safe,valid,unique,read,queue,save};
