
'use strict';
const SIM_MODE=new URLSearchParams(location.search).get('simulation')==='1';
// v7.5: strictly isolated local portfolios; legacy anonymous keys are never read.
const ACCOUNT_ID=window.INVESQUO_ACCOUNT_ID||null;
const ACCOUNT_PREFIX=ACCOUNT_ID?'invesquo_account_'+ACCOUNT_ID+'_':null;
const store={
 getItem:k=>{
  if(!ACCOUNT_PREFIX)return null;
  const raw=localStorage.getItem(ACCOUNT_PREFIX+(SIM_MODE?'invesquo_sim_':'')+k);
  return raw===null?null:window.FinholdraCompact.decode(raw);
 },
 setItem:(k,v)=>{
  if(!ACCOUNT_PREFIX)return;
  const full=ACCOUNT_PREFIX+(SIM_MODE?'invesquo_sim_':'')+k;
  const old=localStorage.getItem(full);
  const compactMode=localStorage.getItem(ACCOUNT_PREFIX+'finholdra_compact_mode_v1')==='1';
  // Do not start converting an existing portfolio without prior explicit backup.
  const value=(old?.startsWith(window.FinholdraCompact.PREFIX)||compactMode)&&window.FinholdraCompact.matches(k)
   ?window.FinholdraCompact.encode(k,v,true):v;
  localStorage.setItem(full,value);
 },
 removeItem:k=>{if(ACCOUNT_PREFIX)localStorage.removeItem(ACCOUNT_PREFIX+(SIM_MODE?'invesquo_sim_':'')+k)}
};
const STORAGE='patrimonio_iphone_v2',OLD_STORAGE='patrimonio_iphone_v1',FILTER_KEY='patrimonio_filters_v2',HISTORY_KEY='patrimonio_history_v36',TRADES_KEY='patrimonio_trades_v36';
const DEFAULTS=[];

// Product-specific branding. Icons use issuer logos, not a logo for the underlying index.
// A text fallback remains visible when an external branding service is blocked/offline.
const ISSUER_ICONS={
  bfp:{src:'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22%23f8e600%22/%3E%3Cpath%20d%3D%22M18%2014h15c8.5%200%2015%206%2015%2014%200%207.7-5.8%2013.7-14.3%2014.1H27V50H18V14zm9%208v12h7.1c3.4%200%205.9-2.5%205.9-6s-2.5-6-5.9-6H27z%22%20fill%3D%22%231958aa%22/%3E%3C/svg%3E',short:'Poste',alt:'Logo Poste Italiane, simbolo P'},
  btp:{src:'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22%23ffffff%22/%3E%3Cg%20transform%3D%22translate%2832%2032%29%22%3E%3Cpath%20d%3D%22M-19%2012%20A22%2022%200%200%201%20-6%20-21%22%20fill%3D%22none%22%20stroke%3D%22%230aa24f%22%20stroke-width%3D%2210%22%20stroke-linecap%3D%22round%22/%3E%3Cpath%20d%3D%22M6%20-21%20A22%2022%200%200%201%2019%2012%22%20fill%3D%22none%22%20stroke%3D%22%23f0402f%22%20stroke-width%3D%2210%22%20stroke-linecap%3D%22round%22/%3E%3Cpath%20d%3D%22M-6%2021%20L6%20-21%22%20stroke%3D%22%23d9d9dd%22%20stroke-width%3D%229%22%20stroke-linecap%3D%22round%22/%3E%3C/g%3E%3C/svg%3E',short:'BTP',alt:'Simbolo BTP Valore'},
  goog:{src:'https://www.google.com/s2/favicons?domain=google.com&sz=256',short:'G',alt:'Logo Google'},
  vwce:{src:'https://www.google.com/s2/favicons?domain=vanguard.com&sz=256',short:'V',alt:'Logo Vanguard'},
  xdev:{src:'https://www.google.com/s2/favicons?domain=etf.dws.com&sz=256',short:'X',alt:'Logo Xtrackers / DWS'},
  rbot:{src:'https://www.google.com/s2/favicons?domain=ishares.com&sz=256',short:'iS',alt:'Logo iShares'},
  ing:{src:'https://www.google.com/s2/favicons?domain=ing.it&sz=256',short:'ING',alt:'Logo ING'}
};
function cryptoIcon(symbol,name){
 const s=String(symbol||'').toUpperCase(),n=String(name||'').toLowerCase();
 const options=[[/^(ETH)(-|$)|ethereum|ether\b/,'ethereum.org','Ξ'],[/^(BTC)(-|$)|bitcoin/,'bitcoin.org','₿'],[/^(SOL)(-|$)|solana/,'solana.com','SOL'],[/^(XRP)(-|$)|ripple|xrp/,'xrpl.org','XRP'],[/^(ADA)(-|$)|cardano/,'cardano.org','ADA'],[/^(DOGE)(-|$)|dogecoin/,'dogecoin.com','Ð']];
 const chosen=options.find(([rx])=>rx.test(s+' '+n));
 return chosen?{src:'https://www.google.com/s2/favicons?domain='+chosen[1]+'&sz=256',short:chosen[2],alt:'Logo '+chosen[2]}:{src:'',short:s.split('-')[0].slice(0,4)||'₿',alt:'Logo crypto'};
}
function futureGenericIcon(){return {src:'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2264%22%20height%3D%2264%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2213%22%20fill%3D%22%236341B5%22%2F%3E%3Cpath%20d%3D%22M18%2014h25l9%209v27a4%204%200%200%201-4%204H18a5%205%200%200%201-5-5V19a5%205%200%200%201%205-5Z%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%223.5%22%20stroke-linejoin%3D%22round%22%2F%3E%3Cpath%20d%3D%22M43%2014v10h9%22%20stroke%3D%22%23fff%22%20stroke-width%3D%223%22%20stroke-linejoin%3D%22round%22%20fill%3D%22none%22%2F%3E%3Ctext%20x%3D%2220%22%20y%3D%2232%22%20font-size%3D%2212%22%20font-family%3D%22Arial%2Csans-serif%22%20fill%3D%22%23fff%22%20font-weight%3D%22bold%22%3EFUT%3C%2Ftext%3E%3Cpath%20d%3D%22M20%2044l7-5%207%202%2010-11m-6%200h6v6%22%20stroke%3D%22%23fff%22%20stroke-width%3D%223.5%22%20stroke-linejoin%3D%22round%22%20stroke-linecap%3D%22round%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E',short:'FUT',alt:'Icona futures'}}
function goldBarIcon(){return {src:'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2264%22%20height%3D%2264%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2213%22%20fill%3D%22%23E9A600%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%223.7%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m18%2037%206-9h15l6%209-4%208H22z%22%2F%3E%3Cpath%20d%3D%22m8%2048%206-10h12l5%2010-4%206H12z%22%2F%3E%3Cpath%20d%3D%22m34%2048%206-10h12l5%2010-4%206H38z%22%2F%3E%3Cpath%20d%3D%22M18%2037h27M8%2048h23m3%200h23%22%2F%3E%3C%2Fg%3E%3Cpath%20d%3D%22m49%2011%202%206%206%202-6%202-2%206-2-6-6-2%206-2z%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E',short:'Au',alt:"Icona lingotto d'oro"}}
function isGoldLinkedAsset(a){
 if(!a)return false;
 const txt=((a.symbol||'')+' '+(a.name||'')+' '+(a.isin||'')).toLowerCase();
 if(!['ETF','ETC/ETN','Oro','Materie prime'].includes(a.cat))return false;
 return /\bwgld\b/.test(txt)||/\bgold\b/.test(txt)||/\boro\b/.test(txt)||/bullion/.test(txt)||/physical gold/.test(txt)||/precious gold/.test(txt)||/xetra.?gold/.test(txt)||/gold etf/.test(txt)||/gold ect/.test(txt)||/gold etc/.test(txt);
}
function specialInstrumentIcon(a){
 if(!a)return null;
 if(String(a.cat||'').toLowerCase()==='futures'||futuresType(a))return futureGenericIcon();
 if(isGoldLinkedAsset({...a,cat:['ETF','ETC/ETN','Oro','Materie prime'].includes(a.cat)?a.cat:'ETC/ETN'}))return goldBarIcon();
 return null;
}
function specialIconHtml(icon,cssClass){
 if(!icon)return '';
 return '<span class="'+cssClass+'" role="img" aria-label="'+svgEscape(icon.alt)+'"><img src="'+icon.src+'" alt="" loading="eager" decoding="async"></span>';
}
function categoryGlyph(cat){
 // The exact same SVG artwork used by the Academy, displayed at icon size.
 const shapes={'Azioni':'stock','ETF':'basket','ETF monetari':'clock','Obbligazioni':'bond','Oro':'gold','Materie prime':'commodity','Crypto':'crypto','ETC/ETN':'note','Conto deposito':'bank','Risparmio postale':'bank','Valute':'fx'};
 const tone=(CAT.find(x=>x[0]===cat)||[])[1]||'#9db3ca';
 return '<span class="instrument-academy-icon" title="'+svgEscape(cat)+'" aria-label="Categoria: '+svgEscape(cat)+'">'+educationIcon(shapes[cat]||'stock',tone)+'</span>';
}
function issuerIcon(id,previewAsset){const a=previewAsset||state.assets.find(x=>x.id===id)||window.finholdraPreviewAsset;let b=ISSUER_ICONS[id];
 if(a&&a.cat==='Crypto')b=cryptoIcon(a.symbol,a.name);
 if(a&&a.cat==='Futures')b=futureGenericIcon();
 if(a&&isGoldLinkedAsset(a))b=goldBarIcon();
 if(!b&&a){const n=(a.name||'').toLowerCase(),vendors=[[/\b(vanguard)\b/,'vanguard.com'],[/\b(ishares|blackrock)\b/,'ishares.com'],[/\b(xtrackers|dws)\b/,'etf.dws.com'],[/\b(google|alphabet)\b/,'google.com'],[/\b(microsoft)\b/,'microsoft.com'],[/\b(apple inc)\b/,'apple.com'],[/\b(amundi)\b/,'amundietf.com'],[/\b(spdr|state street)\b/,'ssga.com'],[/\b(invesco)\b/,'invesco.com'],[/\b(amazon|amazon.com)\b/,'amazon.com'],[/\b(nvidia)\b/,'nvidia.com'],[/\b(tesla)\b/,'tesla.com'],[/\b(meta platforms|facebook)\b/,'meta.com'],[/\b(berkshire hathaway)\b/,'berkshirehathaway.com'],[/\b(nestl[eé])\b/,'nestle.com'],[/\b(coca.cola)\b/,'coca-cola.com'],[/\b(samsung)\b/,'samsung.com'],[/\b(lvmh)\b/,'lvmh.com'],[/\b(asml)\b/,'asml.com'],[/\b(intel)\b/,'intel.com'],[/\b(visa inc)\b/,'visa.com'],[/\b(mastercard)\b/,'mastercard.com']];const domain=vendors.find(([pattern])=>pattern.test(n))?.[1];const initial=a.cat==='Crypto'?String(a.symbol||'CR').split('-')[0].slice(0,4):a.cat==='Futures'?'FUT':a.cat==='Oro'?'Au':a.cat==='Valute'?'FX':a.cat==='ETC/ETN'?'ETN':String(a.symbol||a.name||'•').slice(0,2).toUpperCase();b={src:domain?'https://www.google.com/s2/favicons?domain='+domain+'&sz=256':'',short:initial,alt:'Simbolo '+a.name};}
 b=b||{src:'',short:'✦',alt:'Simbolo titolo'};if(!b.src)return '<span class="asset-logo"><span class="asset-logo-fallback">'+svgEscape(b.short)+'</span></span>';return '<span class="asset-logo" data-asset="'+id+'" role="img" aria-label="'+b.alt+'"><span class="asset-logo-fallback">'+b.short+'</span><img src="'+b.src+'" alt="" loading="eager" decoding="async" onload="this.style.opacity=1" onerror="this.remove()"></span>'}

const CAT=[['Conto deposito','#00B8D9'],['Risparmio postale','#F0B83D'],['Obbligazioni','#8E6EF0'],['ETF','#23C884'],['ETF monetari','#79cba5'],['Materie prime','#d99764'],['ETC/ETN','#4197cf'],['Oro','#e7bd4d'],['Crypto','#e5a467'],['Valute','#56bace'],['Futures','#b68df4'],['Azioni','#EF687B']];
const $=id=>document.getElementById(id);
const eur=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n);
const currencyOf=a=>String(a.currency||'EUR').toUpperCase();
const localMoney=(v,c='EUR')=>{try{return new Intl.NumberFormat('it-IT',{style:'currency',currency:c,maximumFractionDigits:c==='JPY'?1:4}).format(v)}catch(_){return number(v)+' '+c}};
const assetFx=a=>currencyOf(a)==='EUR'?1:(Number(a.fxRate)>0?Number(a.fxRate):NaN);
const euroValue=(a,p,qty)=>qty*p/(a.cat==='Obbligazioni'?100:1)*assetFx(a);

const pct=n=>new Intl.NumberFormat('it-IT',{style:'percent',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const number=n=>new Intl.NumberFormat('it-IT',{maximumFractionDigits:4}).format(n);
const cloneDefaults=()=>DEFAULTS.map(a=>Object.assign({},a));
const num=(v,backup=0)=>Number.isFinite(Number(v))?Math.max(0,Number(v)):backup;
function migrate(){
 let saved=null;
 try{saved=JSON.parse(store.getItem(STORAGE));if(!saved||!Array.isArray(saved.assets))saved=null}catch(e){}
 return saved||{assets:[],lastUpdate:'Portafoglio nuovo'};
}
let state=SIM_MODE?(()=>{try{const q=JSON.parse(store.getItem(STORAGE)||'null');return q&&Array.isArray(q.assets)?q:{assets:[],lastUpdate:'Profilo test senza titoli'}}catch(e){return {assets:[],lastUpdate:'Profilo test senza titoli'}}})():migrate();for(const a of state.assets){if(a.id==='goog'){a.symbol='1GOOG.MI';a.isin='US02079K1079'}if(a.id==='btp'){a.symbol='';a.isin='IT0005735227';a.name='Btp Valore Insieme Oc Oct31 Eur'}if(a.id==='vwce'){a.isin='IE00BK5BQT80';a.exchangeMic='ETFP'}if(a.id==='xdev'){a.isin='IE00BL25JM42';a.exchangeMic='ETFP'}if(a.id==='rbot'){a.isin='IE00BYZK4552';a.exchangeMic='ETFP'}}// ING: historical dated transfers, rather than treating the bank's NET interest as gross.
// The displayed balance is 50,000 EUR; the documented dated transfers sum to 49,999 EUR.
// The unexplained EUR 1 is retained in capital but excluded from historical interest estimates.
// Do not overwrite any other deposit or historic portfolio readings.
let depositMigrationDirty=false;
for(const a of state.assets){if(a.id==='ing'&&!a.depositFlowsV20261109){
 a.depositStart='2026-08-08';a.annualRate=4;
 a.depositFlows=[{date:'2026-08-19',amount:19150},{date:'2026-08-20',amount:15925},{date:'2026-08-20',amount:14924}];
 a.interestBase=0;a.interestAnchor='2026-08-08';
 a.accrualFrequency='daily';a.depositFlowsV20261109=true;depositMigrationDirty=true;
}}
let mode='now',editing=false,filter={};try{filter=JSON.parse(store.getItem(FILTER_KEY))||{}}catch(e){};CAT.forEach(([cat])=>{if(typeof filter[cat]!=='boolean')filter[cat]=true});
function save(){try{store.setItem(STORAGE,JSON.stringify(state));window.dispatchEvent(new Event('finholdra:changed'))}catch(e){notice('I dati non sono stati salvati. Controlla lo spazio disponibile.',true)}}
function saveFilters(){try{store.setItem(FILTER_KEY,JSON.stringify(filter));window.dispatchEvent(new Event('finholdra:changed'))}catch(e){}}

let snapshots=[],trades=[],historyRange='30',buyPriceEdited=false,historySelectedDay=null,historyPointData=[];
const RETURN_METHOD_KEY='invesquo_return_method_v57';let returnMethod='daily';try{const savedMethod=store.getItem(RETURN_METHOD_KEY);if(['daily','twrr','mwrr','roi','archive','stats'].includes(savedMethod))returnMethod=savedMethod;}catch(_){}
function updateMethodButtons(){
 document.querySelectorAll('[data-history-method]').forEach(b=>{const active=b.dataset.historyMethod===(['daily','archive','stats'].includes(returnMethod)?returnMethod:'roi');b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));b.setAttribute('aria-selected',String(active))});
 document.querySelectorAll('.method-picker .method-label').forEach(el=>{el.textContent='ROI · TWRR · MWRR · confronto su scala percentuale comune'});
}
document.querySelectorAll('[data-history-method]').forEach(b=>b.addEventListener('click',()=>{returnMethod=b.dataset.historyMethod;try{store.setItem(RETURN_METHOD_KEY,returnMethod)}catch(_){}historySelectedDay=null;renderHistory()}));
const fh73VisibleSeries=new Set(['roi','twrr','mwrr']);
document.querySelectorAll('[data-fh73-series]').forEach(b=>b.addEventListener('change',()=>{
 if(b.checked)fh73VisibleSeries.add(b.dataset.fh73Series);else fh73VisibleSeries.delete(b.dataset.fh73Series);
 renderHistory();
}));
try{snapshots=JSON.parse(store.getItem(HISTORY_KEY))||[];if(!Array.isArray(snapshots))snapshots=[]}catch(e){snapshots=[]}
try{trades=JSON.parse(store.getItem(TRADES_KEY))||[];if(!Array.isArray(trades))trades=[]}catch(e){trades=[]}
// Finholdra 7.4: Never preload another user's historical balances. Historical
// screenshots already saved on older installations remain in storage/exports,
// but incomplete category-only entries cannot be used as full-portfolio history.

// 7.2: convert old positions without dated opening transactions to dated opening lots.
// Do not overwrite actual dated trades. Derive original quantities/costs by reversing
// purchases and sales already recorded, avoiding a duplicate opening position.
const LEGACY_TRANSACTION_DATE='2026-11-03';
function tradeAssetName(t){return t.assetName||state.assets.find(a=>a.id===t.asset)?.name||String(t.asset)}
function tradeFx(t,a){let rate=Number(t.fxExecution);if(rate>0)return rate;
 const denominator=Number(t.quantity)*Number(t.price)/(t.cat==='Obbligazioni'?100:1);
 rate=denominator>0?Math.abs(Number(t.spent))/denominator:NaN;
 return rate>0&&Number.isFinite(rate)?rate:(a?assetFx(a):1)}
function normalizeLegacyTrades(){let changed=false;
 for(let i=0;i<trades.length;i++){
  const t=trades[i];const a=state.assets.find(v=>v.id===t.asset);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(t.date||''))){t.date=LEGACY_TRANSACTION_DATE;t.assumedDate=true;changed=true}
  if(!t.id){t.id='legacy-tx-'+i+'-'+t.asset;changed=true}
  if(!t.assetName&&a){t.assetName=a.name;changed=true}
  if(!t.cat&&a){t.cat=a.cat;changed=true}
  if(!Number(t.fxExecution)&&a){t.fxExecution=tradeFx(t,a);changed=true}
 }
 for(const a of state.assets){
  if(trades.some(t=>t.asset===a.id&&t.legacyOpening))continue;
  const existing=trades.filter(t=>t.asset===a.id);
  let quantity=Number(a.q),cost=cap(a);
  for(const t of existing.slice().reverse()){
   if(t.kind==='buy'){quantity-=Number(t.quantity||0);cost-=Number(t.spent||0)}
   if(t.kind==='sale'){quantity+=Number(t.quantity||0);cost+=Number(t.costBasis||0)}
  }
  // On portfolios created in old versions, the opening is not present in trades.
  if(quantity>1e-8&&cost>=-0.01){
   const fx=assetFx(a),factor=a.cat==='Obbligazioni'?100:1;
   const price=fx>0?Math.max(0,cost)/quantity*factor/fx:Number(a.pmc);
   trades.unshift({id:'opening-'+a.id,kind:'buy',date:LEGACY_TRANSACTION_DATE,asset:a.id,assetName:a.name,cat:a.cat,quantity,price,spent:Math.max(0,cost),fxExecution:fx,legacyOpening:true,assumedDate:true});changed=true;
  }
 }
 if(changed)saveTimeline();
}
function orderAssetTrades(assetId,updated){const list=updated||trades;const exact=list.filter(t=>t.asset===assetId);let matched=exact; if(!matched.length&&!updated){const asset=state.assets.find(a=>a.id===assetId);if(asset){const clean=x=>String(x||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');const names=new Set([clean(asset.name),clean(asset.symbol),clean(asset.isin)].filter(Boolean));const candidates=list.filter(t=>t.cat===asset.cat&&[t.assetName,t.symbol,t.isin].some(v=>names.has(clean(v))));const duplicateAssets=state.assets.filter(a=>a.cat===asset.cat&&a.id!==assetId&&[a.name,a.symbol,a.isin].some(v=>names.has(clean(v))));if(!duplicateAssets.length)matched=candidates;}}return matched.map((t,i)=>({...t,__seq:i})).sort((a,b)=>a.date.localeCompare(b.date)||((a.legacyOpening?0:1)-(b.legacyOpening?0:1))||a.__seq-b.__seq)}
// Recompute from the operations ledger, with average purchase cost and proportional
// attribution to sales. Fails atomically on overselling or invalid edits.
function computeLedger(assetId,list){const asset=state.assets.find(a=>a.id===assetId);if(!asset)return{error:'Il titolo non è più in portafoglio. I movimenti restano consultabili nello Storico generale.'};
 let qty=0,cost=0,nativeBasis=0;
 const updated=new Map();
 for(const t of orderAssetTrades(assetId,list)){
  const q=Number(t.quantity),p=Number(t.price),fx=tradeFx(t,asset),factor=asset.cat==='Obbligazioni'?100:1;
  if(!(q>0)||!(p>0)||!(fx>0)||!/\d{4}-\d{2}-\d{2}/.test(t.date)||t.date>today())return{error:'Data, prezzo, quantità o cambio non validi.'};
  const amount=q*p*fx/factor;
  if(t.kind==='buy'){
   qty+=q;cost+=amount;nativeBasis+=q*p;
   updated.set(t.id,{spent:amount,fxExecution:fx,costBasis:undefined,realized:undefined});
  } else if(t.kind==='sale'){
   if(q>qty+1e-8)return{error:'La vendita del '+shortDate(t.date)+' supera le quote disponibili in quella data.'};
   const basis=cost*(q/qty),nativeSold=nativeBasis*(q/qty);
   qty-=q;cost-=basis;nativeBasis-=nativeSold;
   if(qty<1e-9){qty=0;cost=0;nativeBasis=0}
   updated.set(t.id,{spent:-amount,fxExecution:fx,costBasis:basis,realized:amount-basis});
  }
 }
 return{qty,cost,pmc:qty>0?nativeBasis/qty:Number(asset.pmc),updates:updated};
}
function commitLedger(assetId,changedTrades){const r=computeLedger(assetId,changedTrades);if(r.error)return r.error;
 const asset=state.assets.find(a=>a.id===assetId);if(!asset)return 'Titolo non trovato';
 const oldQuote=asset.p;
 trades=changedTrades.map(t=>{
  if(t.asset!==assetId)return t;
  const u=r.updates.get(t.id);return {...t,...u};
 });
 asset.q=r.qty;asset.closed=r.qty===0;asset.costEur=r.cost;if(r.qty>0)asset.pmc=r.pmc;
 // Preserve identity and quote even when all shares were sold, to allow correcting
 // a mistaken sale without losing the instrument metadata.
 asset.p=oldQuote;
 save();saveTimeline();trackSnapshot();refreshBuyOptions();render();
 return null;
}

function saveTimeline(){try{store.setItem(HISTORY_KEY,JSON.stringify(snapshots));store.setItem(TRADES_KEY,JSON.stringify(trades));window.dispatchEvent(new Event('finholdra:changed'))}catch(e){notice('Impossibile salvare storico o acquisti: spazio sul dispositivo esaurito.',true)}}
// Beta 10.9.40: financial transactions are never acknowledged without a durable,
// read-back-verified write of both portfolio and ledger in the active account.
function persistVerifiedPurchase(nextAssets,nextTrades,expectedTrade){
 if(!ACCOUNT_PREFIX)throw new Error('Profilo non attivo: accedi prima di registrare acquisti.');
 const previousAssets=store.getItem(STORAGE),previousTrades=store.getItem(TRADES_KEY);
 const proposedState=JSON.stringify({...state,assets:nextAssets});
 const proposedTrades=JSON.stringify(nextTrades);
 try{
  store.setItem(TRADES_KEY,proposedTrades);
  store.setItem(STORAGE,proposedState);
  const diskTrades=JSON.parse(store.getItem(TRADES_KEY)||'null');
  const diskState=JSON.parse(store.getItem(STORAGE)||'null');
  const persistedTrade=Array.isArray(diskTrades)?diskTrades.find(t=>t.id===expectedTrade.id):null;
  if(!persistedTrade||persistedTrade.asset!==expectedTrade.asset||persistedTrade.kind!=='buy'||
     persistedTrade.date!==expectedTrade.date||
     !/^\d{4}-\d{2}-\d{2}$/.test(persistedTrade.date)||
     !['quantity','price','spent'].every(k=>Number.isFinite(Number(persistedTrade[k]))&&
       Math.abs(Number(persistedTrade[k])-Number(expectedTrade[k]))<=Math.max(1e-8,Math.abs(Number(expectedTrade[k]))*1e-10))||
     !diskState||!Array.isArray(diskState.assets))
    throw new Error('Acquisto non confermato: data, quantità, prezzo o importo non coincidono con i valori salvati.');
  const savedAsset=diskState.assets.find(a=>a.id===expectedTrade.asset);
  const expectedAsset=nextAssets.find(a=>a.id===expectedTrade.asset);
  if(!savedAsset||!expectedAsset||!Number.isFinite(Number(savedAsset.q))||Math.abs(Number(savedAsset.q)-Number(expectedAsset.q))>1e-8)
   throw new Error('Quantità del titolo non confermata nel salvataggio.');
  state=diskState;
  trades=diskTrades;
  window.dispatchEvent(new Event('finholdra:changed'));
  return true;
 }catch(err){
  try{if(previousAssets===null)store.removeItem(STORAGE);else store.setItem(STORAGE,previousAssets)}catch(_){}
  try{if(previousTrades===null)store.removeItem(TRADES_KEY);else store.setItem(TRADES_KEY,previousTrades)}catch(_){}
  throw new Error('Acquisto NON registrato: '+(err?.message||'scrittura non riuscita')+'. Verifica lo spazio disponibile e riprova.');
 }
}
/* 10.9.40 — Profile storage quota recovery. No financial history is deleted.
   The only cleanup target is the optional local auto-recovery DUPLICATE;
   backup export and explicit user approval are mandatory. */
function localStorageUsedBytes(){
 let bytes=0;
 try{for(let i=0;i<localStorage.length;i++){
  const k=localStorage.key(i);if(k!==null)bytes+=2*(k.length+(localStorage.getItem(k)||'').length);
 }}catch(_){return null}
 return bytes;
}
function purchaseQuotaRecovery(box){
 if(!box)return;
 box.querySelector('.fh10939-recovery')?.remove();
 const used=localStorageUsedBytes();
 const wrap=document.createElement('div');wrap.className='fh10939-recovery';
 wrap.innerHTML='<strong>Spazio browser esaurito: recupero sicuro</strong><p>Non è stato registrato alcun acquisto. Scarica prima una copia JSON normale, poi ottimizza senza cancellare posizioni, transazioni, chiusure o prezzi.</p><div class="fh10939-buttons"><button type="button" class="btn primary" data-fh10939="backup">1 · Scarica backup JSON</button><button type="button" class="btn" data-fh10939="compact" disabled>2 · Comprimi archivi senza eliminarli</button></div><p class="sub" data-fh10939="info" role="status" aria-live="polite"></p>';
 const info=wrap.querySelector('[data-fh10939="info"]');
 const compact=wrap.querySelector('[data-fh10939="compact"]');
 info.textContent=used!==null?'Spazio locale stimato: '+(used/1048576).toLocaleString('it-IT',{maximumFractionDigits:2})+' MB.':'Spazio locale non misurabile.';
 let downloaded=false;
 wrap.querySelector('[data-fh10939="backup"]').addEventListener('click',()=>{
  try{
   const text=JSON.stringify(makePortableBundle(),null,2),check=JSON.parse(text);
   if(!Array.isArray(check.assets)||!Array.isArray(check.trades)||!Array.isArray(check.snapshots))throw Error('Backup non valido');
   const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='finholdra-backup-integrale-'+today()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
   downloaded=true;compact.disabled=false;
   info.textContent='Download richiesto. Controlla in File → Download che il JSON sia presente, poi usa il secondo pulsante.';
  }catch(e){compact.disabled=true;info.textContent='Backup non riuscito: '+String(e?.message||e)}
 });
 compact.addEventListener('click',()=>{
  if(!downloaded||!ACCOUNT_PREFIX)return;
  if(!confirm('Confermi di avere un backup JSON completo fuori dall’app? Ottimizzerò i dati esistenti senza eliminarli. I backup sono leggibili anche da altre versioni, ma per aprire i dati compressi direttamente in questo browser sarà necessaria la Beta 10.9.40 o successiva.'))return;
  compact.disabled=true;info.textContent='Ottimizzazione in corso. Non chiudere l’app.';
  // Allow the status text to render before CPU-intensive lossless compaction.
  setTimeout(()=>{
   try{
    const result=window.FinholdraCompact.compact(ACCOUNT_PREFIX);
    if(result.count){localStorage.setItem(ACCOUNT_PREFIX+'finholdra_compact_mode_v1','1');}
    const freed=(result.freed/1048576).toLocaleString('it-IT',{maximumFractionDigits:2});
    info.textContent=(result.count?`Ottimizzati ${result.count} archivi, liberati circa ${freed} MB. `:'Nessun archivio comprimibile trovato. ')+(result.failed.length?'Alcuni archivi non sono stati ottimizzati. ':'')+'Controlla le quote e riprova UNA volta l’acquisto. Nessuna transazione è stata eliminata.';
    // A write/read check using the existing holdings and trades, not a fabricated purchase.
    const checkAssets=JSON.parse(store.getItem(STORAGE)||'null');
    const checkTrades=JSON.parse(store.getItem(TRADES_KEY)||'null');
    if(!checkAssets||!Array.isArray(checkAssets.assets)||!Array.isArray(checkTrades))throw Error('Verifica archivio non superata. Conserva il backup esterno.');
    updateBackupControls();
   }catch(e){info.textContent='Ottimizzazione non completata: '+String(e?.message||e)+'. Conserva il JSON scaricato.'}
   finally{compact.disabled=false}
  },30);
 });
 box.appendChild(wrap);
 // On iPhone the recovery panel lives at the bottom of a long purchase form.
 // Reveal it instead of leaving the user staring at an alert without actions.
 requestAnimationFrame(()=>wrap.scrollIntoView({behavior:'smooth',block:'center'}));
}
function showVerifiedPurchaseInHistory(){
 try{renderHistory()}catch(err){console.warn('Storico non aggiornato',err)}
}

function trackSnapshot(){
 // Observation begins only after first instrument is recorded. Backdated
 // transactions do not create unverifiable backdated market prices.
 if(!state.assets.length)return;
 const day=today(),stamp=Date.now(),byCat={},byAsset={};
 CAT.forEach(([cat])=>{const list=state.assets.filter(a=>a.cat===cat);
  byCat[cat]={value:list.reduce((s,a)=>s+val(a),0),capital:list.reduce((s,a)=>s+cap(a),0)};
  for(const a of list)byAsset[a.id]={cat,quantity:Number(a.q)||0,value:val(a),capital:cap(a),price:Number(a.p),currency:currencyOf(a),fxRate:assetFx(a)};
 });
 const snap={date:day,stamp,byCat,byAsset,coverage:'all-assets',source:'observed'};
 // Append real changed observations without replacing historical daily summaries.
 // Financial data stays profile-scoped and participates in the JSON backup.
 const compact={date:day,stamp,byAsset:Object.fromEntries(Object.entries(byAsset).map(([id,v])=>[id,{cat:v.cat,quantity:v.quantity,value:v.value,capital:v.capital,price:v.price,currency:v.currency,fxRate:v.fxRate}]))};
 try{
  const old=JSON.parse(store.getItem('finholdra_observations_v9930')||'[]');
  const journal=Array.isArray(old)?old:[];
  const last=journal[journal.length-1];
  if(!last||last.date!==day||JSON.stringify(last.byAsset)!==JSON.stringify(compact.byAsset)){
   journal.push(compact);
   store.setItem('finholdra_observations_v9930',JSON.stringify(journal.slice(-4000)));
  }
 }catch(_){/* Existing daily history is still saved even if journal storage is full. */}
 const i=snapshots.findIndex(x=>x.date===day&&!x.legacySource);
 if(i>=0)snapshots[i]=snap;else snapshots.push(snap);
 snapshots.sort((a,b)=>a.date.localeCompare(b.date));
 if(snapshots.length>1800)snapshots=snapshots.slice(-1800);
 saveTimeline();
}
const svgEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Only the five securities (Obbligazioni, ETF, Azioni) have a supported
// 3/11 and 4/11 total. Compare the same scope across ALL plotted dates.
// Other portfolio categories stay untouched in the dashboard.
let historyComparableScope=null,historyCategory='ETF',dailyHistorySelectedDate='';
try{const savedCategory=store.getItem('finholdra_history_category_v10946');if(savedCategory&&CAT.some(([cat])=>cat===savedCategory))historyCategory=savedCategory;}catch(_){}
function historySelectedCats(){return CAT.filter(([cat])=>cat!=='Crypto'&&filter[cat]&&historyCategory===cat).map(([cat])=>cat)}
function historyCatIncluded(cat){return historySelectedCats().includes(cat)}
function refreshHistoryCategoryOptions(){
 const sel=document.getElementById('historyCategory');if(!sel)return;
 const active=CAT.filter(([cat])=>cat!=='Crypto'&&filter[cat]).map(([cat])=>cat);
 if(!active.includes(historyCategory))historyCategory=active.includes('ETF')?'ETF':active[0]||'';
 const opts=active.length?active.map(x=>[x,x]):[['','Nessuna categoria attiva']];
 sel.innerHTML='';opts.forEach(([v,label])=>{const o=document.createElement('option');o.value=v;o.textContent=label;sel.appendChild(o)});
 sel.value=historyCategory;
}
$('historyCategory').onchange=e=>{historyCategory=e.target.value;try{store.setItem('finholdra_history_category_v10946',historyCategory)}catch(_){}historySelectedDay=null;renderHistory()};
function trackedValue(s){
 // A valid portfolio-wide observation contains every category (even disabled
 // dashboard categories). Partial legacy totals lack an asset breakdown; they
 // cannot be compared against all categories without misleading returns.
 if(!s?.byCat||typeof s.byCat!=='object')return NaN;
 const selected=CAT.filter(([cat])=>historySelectedCats().includes(cat));
 if(!selected.length)return NaN;
 const values=selected.map(([cat])=>Number(s.byCat?.[cat]?.value));
 if(values.some(v=>!Number.isFinite(v)))return NaN;
 // Never compare a partial legacy observation with a different selection.
 if(s.legacyTotal!=null&&!s.byAsset)return NaN;
 if(s.source==='reconstructed'&&selected.some(([cat])=>!s.selectedCategories?.includes(cat)))return NaN;
 return values.reduce((a,v)=>a+v,0);
}
function trackedCapital(s){return CAT.filter(([cat])=>historySelectedCats().includes(cat)).reduce((n,[cat])=>n+Number(s.byCat?.[cat]?.capital||0),0)}
function shortDate(date){const m=String(date||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+'/'+m[2]+'/'+m[1].slice(2):String(date||'')}
// A historical capital flow can be verified either from the ledger or from
// two stored positions with unchanged asset identity and a documented increase
// in cost basis. This prevents backdated/late-added ledger entries from being
// counted as market performance, without inventing any market prices.
function historyAssetFlow(from,to,id){
 const before=from?.byAsset?.[id],after=to?.byAsset?.[id];
 const q0=Number(before?.quantity||0),q1=Number(after?.quantity||0);
 const c0=Number(before?.capital),c1=Number(after?.capital);
 const ops=trades.filter(t=>t.asset===id&&t.date>from.date&&t.date<=to.date&&['buy','sale'].includes(t.kind));
 const validOps=ops.every(t=>Number.isFinite(Number(t.spent))&&Number.isFinite(Number(t.quantity)));
 const ledgerQ=validOps?ops.reduce((n,t)=>n+(t.kind==='buy'?1:-1)*Number(t.quantity),0):NaN;
 const ledgerCash=validOps?ops.reduce((n,t)=>n+Number(t.spent),0):NaN;
 const tolerance=Math.max(1e-6,Math.abs(q1)*1e-6);
 const delta=q1-q0;
 const sameQty=Number.isFinite(delta)&&Math.abs(delta)<=tolerance;
 const basisValid=Number.isFinite(c0)&&Number.isFinite(c1)&&c0>=0&&c1>=0;
 // A ledger flow can always be used when its traded quantity matches the observed change.
 if(validOps&&Math.abs(delta-ledgerQ)<=tolerance)return {flow:ledgerCash,source:'registro',ops};
 // Existing saved cost bases are more reliable than a backdated/misaligned transaction.
 // A pure purchase adds its actual invested capital; market appreciation does not.
 if(delta>tolerance&&basisValid&&c1>c0)return {flow:c1-c0,source:'capitale registrato',ops};
 if(sameQty&&basisValid&&Math.abs(c1-c0)<.02)return {flow:0,source:'posizione invariata',ops:[]};
 // For sales, only a matching ledger contains exact cash proceeds. If missing,
 // estimate the cash flow from the *observed* closing value per unit.
 // This is not presented as the actual brokerage execution price.
 if(delta < -tolerance && validOps && ops.some(t=>t.kind==='sale'))return {flow:ledgerCash,source:'vendita registrata',ops};
 if(sameQty&&validOps&&ops.length)return {flow:ledgerCash,source:'registro non allineato',ops};
 // A position may be re-priced or have its cost basis corrected without new shares.
 // Neither event is itself a cash deposit.
 if(sameQty)return {flow:0,source:basisValid&&Math.abs(c1-c0)>.02?'quantità stabile / base rettificata':'quantità stabile',ops:[]};
 // Legacy snapshots often have a purchase date which differs from the ledger date.
 // Use saved cost basis when it is consistent; otherwise use actual saved valuations
 // to estimate transfer cash. No invented time series prices are added.
 const v0=Number(before?.value||0),v1=Number(after?.value||0);
 if(delta>tolerance){
  if(basisValid&&c1>c0)return {flow:c1-c0,source:'capitale registrato',ops};
  if(q1>0&&Number.isFinite(v1)&&v1>=0)return {flow:delta*(v1/q1),source:'flusso stimato da quantità e valore osservati',ops};
 }
 if(delta < -tolerance){
  if(q1>0&&Number.isFinite(v1)&&v1>=0)return {flow:delta*(v1/q1),source:'vendita stimata da prezzo osservato',ops};
  if(q0>0&&Number.isFinite(v0)&&v0>=0)return {flow:-v0,source:'uscita posizione · prezzo finale ignoto',ops};
 }
 return null;
}
function historyFlowsReconcile(from,to){
 const ids=new Set([...Object.keys(from?.byAsset||{}),...Object.keys(to?.byAsset||{})]);
 for(const id of ids){const cat=to?.byAsset?.[id]?.cat||from?.byAsset?.[id]?.cat;
  if(historyCatIncluded(cat)&&!historyAssetFlow(from,to,id))return false;
 }
 return true;
}
function historyEffectiveFlows(from,to){
 if(!from||!to)return null;
 const ids=new Set([...Object.keys(from.byAsset||{}),...Object.keys(to.byAsset||{})]);
 let flow=0,estimated=false,complete=true;
 if(ids.size){for(const id of ids){const cat=to.byAsset?.[id]?.cat||from.byAsset?.[id]?.cat;
  if(!historyCatIncluded(cat))continue;
  const item=historyAssetFlow(from,to,id);
  if(!item){complete=false;break}
  flow+=item.flow;if(item.source!=='registro'&&item.source!=='posizione invariata')estimated=true;
 }}else complete=false;
 if(complete)return {flow,estimated,source:'per titolo'};
 // Unified fallback for old snapshots: category-level cost basis and movements.
 // These are stored historical observations, not reconstructed market prices.
 const c0=trackedCapital(from),c1=trackedCapital(to);
 const ops=periodFlows(from,to),ledger=ops.reduce((n,t)=>n+Number(t.spent),0);
 const delta=c1-c0;
 if(ops.length&&ops.every(t=>Number.isFinite(Number(t.spent)))){
  // For purchase-only intervals an increase in cost basis is a verifiable cash flow.
  if(!ops.some(t=>t.kind==='sale')&&Number.isFinite(delta)&&delta>=0)return {flow:Math.max(0,delta,ledger),estimated:true,source:'capitale categoria / registro'};
  return {flow:ledger,estimated:true,source:'registro categoria'};
 }
 if(Number.isFinite(delta)&&Math.abs(delta)<.02)return {flow:0,estimated:true,source:'capitale categoria invariato'};
 if(Number.isFinite(delta)&&delta>0)return {flow:delta,estimated:true,source:'capitale categoria'};
 // Older snapshots may have negative cost-basis changes even though proceeds are
 // absent from the ledger. Prefer a per-asset observed-price approximation if possible.
 if(Number.isFinite(delta)&&delta<0){
  const before=from.byAsset||{},after=to.byAsset||{};
  let estimatedFlow=0,hasHolding=false;
  for(const id of new Set([...Object.keys(before),...Object.keys(after)])){
   const cat=after[id]?.cat||before[id]?.cat;
   if(!historyCatIncluded(cat))continue;
   const q0=Number(before[id]?.quantity||0),q1=Number(after[id]?.quantity||0);
   const v0=Number(before[id]?.value||0),v1=Number(after[id]?.value||0);
   if(![q0,q1,v0,v1].every(Number.isFinite))return null;
   hasHolding=true;
   if(q1<q0){estimatedFlow-=(q0-q1)*(q1>0?v1/q1:q0>0?v0/q0:0)}
   if(q1>q0)estimatedFlow+=(q1-q0)*(q1>0?v1/q1:0);
  }
  if(hasHolding)return {flow:estimatedFlow,estimated:true,source:'quantità e valori osservati'};
 }
 return null;
}
function historyInterval(from,to){
 if(!from||!to||days(to.date)<=days(from.date))return null;
 const net=historyEffectiveFlows(from,to);if(!net)return null;
 const fromDay=days(from.date),toDay=days(to.date),duration=toDay-fromDay;
 const registered=trades.filter(t=>t.date>from.date&&t.date<=to.date&&historyCatIncluded(t.cat)&&Number.isFinite(Number(t.spent))&&Number(t.spent)!==0);
 const registeredSum=registered.reduce((sum,t)=>sum+Number(t.spent),0);
 // For same-day purchases exact transaction times are unavailable; the time
 // weighting is an estimate, never a claim of transaction-exact TWRR.
 const weightedRegistered=registered.reduce((sum,t)=>sum+Number(t.spent)*Math.max(0,Math.min(1,(toDay-days(t.date))/duration)),0);
 const inferred=net.flow-registeredSum;
 const weighted=weightedRegistered+(inferred!==0?inferred*.5:0);
 const baseline=trackedValue(from),ending=trackedValue(to),gain=ending-baseline-net.flow;
 const denominator=baseline+weighted;
 return {from:from.date,to:to.date,days:duration,gain,pct:denominator>0?gain/denominator:null,flow:net.flow,ending,estimated:net.estimated};
}

function historyPeriodNetFlows(first,last,series=null){
 const ordered=(Array.isArray(series)&&series.length?series:historyCanonicalObservations()).filter(s=>s.date>=first.date&&s.date<=last.date);
 if(ordered.length<2)return null;
 let total=0;
 for(let i=1;i<ordered.length;i++){
  const iv=historyEffectiveFlows(ordered[i-1],ordered[i]);if(!iv)return null;
  total+=iv.flow;
 }
 return total;
}
// Merge a verified reconstructed observation into an observed one on the same date.
// Observed asset valuations always win; add only missing asset IDs, never invent trades.
function mergeDailySnapshots(observed,reconstructed){
 if(!observed||!reconstructed)return observed||reconstructed;
 const byAsset={...reconstructed.byAsset,...observed.byAsset};
 const byCat={...reconstructed.byCat};
 for(const [cat,entry] of Object.entries(observed.byCat||{})){
  const recoveredEntry=byCat[cat];
  const recoveredAssets=Object.entries(reconstructed.byAsset||{}).filter(([id,v])=>v.cat===cat&&!observed.byAsset?.[id]);
  // Base observed category totals plus only the missing recovered assets.
  if(Number.isFinite(Number(entry?.value))){
   const value=Number(entry.value)+recoveredAssets.reduce((sum,[,v])=>sum+Number(v.value||0),0);
   const capital=Number(entry.capital||0)+recoveredAssets.reduce((sum,[,v])=>sum+Number(v.capital||0),0);
   byCat[cat]={...entry,value,capital};
  }else if(recoveredEntry){byCat[cat]=recoveredEntry}
 }
 const cats=CAT.map(([cat])=>cat);
 const selectedCategories=cats.filter(cat=>Number.isFinite(Number(byCat[cat]?.value))&&
  (observed.coverage==='all-assets'||reconstructed.selectedCategories?.includes(cat)));
 const full=selectedCategories.length===cats.length;
 return {...observed,byAsset,byCat,source:'merged',coverage:full?'all-assets':'verified-selected',selectedCategories,
  recoveryVersion:reconstructed.recoveryVersion,hasRecoveredValues:true};
}
/* Beta 10.9.45 — Portable historical graph from backed-up DAILY closes.
   A daily quote has no meaning without dated holdings. Never invent holdings, FX,
   missing closes or trades. Observed snapshots take precedence below. */
let fh10945ArchiveCache=null;
function fh10945ArchivedSnapshots(){
 const raw=store.getItem('finholdra_daily_closes_v1020')||'';
 if(!raw)return [];
 const signature=[raw.length,raw.slice(-96),trades.length,snapshots.length,state.assets.length,
   state.assets.map(a=>[a.id,a.q,a.pmc]).join('|')].join('~');
 if(fh10945ArchiveCache?.signature===signature)return fh10945ArchiveCache.records;
 let archive;try{archive=JSON.parse(raw)}catch(_){return []}
 if(!archive?.assets||typeof archive.assets!=='object')return [];
 const byDay=new Set();
 for(const rec of Object.values(archive.assets)){
  for(const date of Object.keys(rec?.days||{}))if(/^\d{4}-\d\d-\d\d$/.test(date)&&date<=today())byDay.add(date);
 }
 const records=[];
 for(const date of [...byDay].sort().slice(-730)){
  const byAsset={},byCat={},incomplete=new Set(),known=new Set();
  CAT.forEach(([cat])=>{byCat[cat]={value:0,capital:0};known.add(cat)});
  for(const a of state.assets){
   const pos=fh1096PositionAt(a,date);
   if(!pos||pos.qty===null||!Number.isFinite(Number(pos.capital))){incomplete.add(a.cat);continue}
   const q=Number(pos.qty);if(!(q>0))continue;
   let p=null,fx=1,value=null,quality='close',source='';
   if(a.cat==='Conto deposito'||a.cat==='Risparmio postale'){
    const non=fh102NonMarketValue(a,date,q,pos);
    if(!non||!Number.isFinite(Number(non.value))){incomplete.add(a.cat);continue}
    value=Number(non.value);p=1;quality='estimated';source=non.source||'';
   }else{
    const rec=fh102Closest(archive,a,date);
    p=Number(rec?.price);
    if(!(p>0)){incomplete.add(a.cat);continue}
    fx=currencyOf(a)==='EUR'?1:fh102HistoricFx(archive,currencyOf(a),date);
    if(!(Number.isFinite(fx)&&fx>0)){incomplete.add(a.cat);continue}
    value=q*p*fx/(a.cat==='Obbligazioni'?100:1);
    quality=rec.quality||'observed';source=rec.source||'';
   }
   if(!Number.isFinite(value)){incomplete.add(a.cat);continue}
   byAsset[a.id]={cat:a.cat,quantity:q,value,capital:Number(pos.capital),price:p,currency:currencyOf(a),fxRate:fx,
     recovery:'daily-close-archive',quality,source};
   byCat[a.cat].value+=value;byCat[a.cat].capital+=Number(pos.capital);
  }
  if(!Object.keys(byAsset).length)continue;
  for(const cat of incomplete){delete byCat[cat];known.delete(cat)}
  // Incomplete categories must not masquerade as fully reconstructed returns.
  for(const [id,v] of Object.entries(byAsset))if(incomplete.has(v.cat))delete byAsset[id];
  if(!Object.keys(byAsset).length)continue;
  records.push({date,stamp:Date.parse(date+'T12:00:00Z'),source:'reconstructed',
   coverage:incomplete.size?'verified-selected':'all-assets',selectedCategories:[...known],
   byAsset,byCat,recoveryVersion:3,hasRecoveredValues:true,
   recoveryNote:'Ricostruito da quotazioni giornaliere archiviate e movimenti datati; nessuna quotazione inventata.'});
 }
 fh10945ArchiveCache={signature,records};return records;
}
window.addEventListener('finholdra:changed',()=>{fh10945ArchiveCache=null});
function dailySnapshotsByDate(){
 const daysMap=new Map();
 for(const snap of [...snapshots,...(prefs.showReconstructed===false?[]:fh10945ArchivedSnapshots())]){
  if(!snap||!snap.date)continue;
  if(prefs.showReconstructed===false&&snap.source==='reconstructed')continue;
  const pair=daysMap.get(snap.date)||{};
  if(snap.source==='reconstructed'){
   if(!pair.reconstructed)pair.reconstructed=snap;
   else{
    // Supplement an existing reconstructed day only with missing verified assets.
    const previous=pair.reconstructed;
    const merged={...previous,byAsset:{...snap.byAsset,...previous.byAsset},byCat:{...snap.byCat,...previous.byCat}};
    const categories=[...new Set([...(previous.selectedCategories||[]),...(snap.selectedCategories||[])])];
    merged.selectedCategories=categories;
    merged.coverage=previous.coverage==='all-assets'||snap.coverage==='all-assets'?'all-assets':'verified-selected';
    pair.reconstructed=merged;
   }
  }
  else if(!pair.observed||Number(snap.stamp||0)>=Number(pair.observed.stamp||0))pair.observed=snap;
  daysMap.set(snap.date,pair);
 }
 return [...daysMap.values()].map(pair=>mergeDailySnapshots(pair.observed,pair.reconstructed));
}
function historyCanonicalObservations(){
 return dailySnapshotsByDate().filter(s=>Number.isFinite(trackedValue(s))).sort((a,b)=>a.date.localeCompare(b.date));
}
function periodFlows(from,to){return trades.filter(t=>t.date>from.date&&t.date<=to.date&&historyCatIncluded(t.cat)&&Number.isFinite(Number(t.spent))&&Number(t.spent)!==0)}
// TWRR: chain returns across each observed subperiod. Trades between daily observations
// are time-weighted with Dietz, so this is an approximation rather than transaction-exact TWRR.
function twrrEstimate(series){
 if(series.length<2)return null;
 let factor=1;
 for(let i=1;i<series.length;i++){
  const interval=historyInterval(series[i-1],series[i]);
  if(!interval||interval.pct===null||interval.pct<=-1)return null;
  factor*=1+interval.pct;
 }
 return factor-1;
}
// Money-weighted return for the chosen *period*, not annualised. Bisection on the
// future value equation (starting balance + dated cash inflows = ending balance).
function mwrrForPeriod(first,last,series=null){
 const ordered=(Array.isArray(series)&&series.length?series:historyCanonicalObservations()).filter(s=>s.date>=first.date&&s.date<=last.date);
 const span=days(last.date)-days(first.date),initial=trackedValue(first),ending=trackedValue(last);
 if(!(span>0)||!(initial>0)||!(ending>=0)||ordered.length<2)return null;
 const flows=[];
 for(let i=1;i<ordered.length;i++){
  const r=historyEffectiveFlows(ordered[i-1],ordered[i]);if(!r)return null;
  if(Math.abs(r.flow)>1e-8)flows.push({date:ordered[i].date,amount:r.flow});
 }
 const balance=r=>initial*(1+r)+flows.reduce((n,t)=>n+t.amount*Math.pow(1+r,(days(last.date)-days(t.date))/span),0)-ending;
 let lo=-.999999999,hi=1;
 if(balance(lo)>0)return null;
 while(balance(hi)<0&&hi<1e8)hi=hi*2+1;
 if(balance(hi)<0)return null;
 for(let i=0;i<100;i++){const mid=(lo+hi)/2;if(balance(mid)<0)lo=mid;else hi=mid}
 return (lo+hi)/2;
}
function roiSimpleForPeriod(first,last,series=null){
 if(!first||!last||days(last.date)<=days(first.date))return null;
 const initial=trackedValue(first),ending=trackedValue(last);
 if(!Number.isFinite(initial)||!Number.isFinite(ending))return null;
 const net=historyPeriodNetFlows(first,last,series);
 if(net===null)return null;
 const denominator=initial+Math.max(0,net);
 return denominator>0?(ending-initial-net)/denominator:null;
}
function methodResult(series){
 const first=series[0],last=series[series.length-1];
 if(returnMethod==='portfolio'){
  // Patrimonio is a VALUE chart: deposits/purchases and sales affect the balance.
  const initial=trackedValue(first),ending=trackedValue(last);
  return initial>0?(ending-initial)/initial:null;
 }
 return twrrEstimate(series);
}
function methodDescription(){
 if(returnMethod==='portfolio')return 'Patrimonio: valore in euro dei titoli selezionati. Gli acquisti fanno salire il valore anche senza un guadagno di mercato; le vendite lo riducono.';
 return returnMethod==='roi'?'ROI semplice del periodo: (valore finale − valore iniziale − flussi netti) / (valore iniziale + acquisti aggiuntivi). Non considera quando sono stati effettuati gli acquisti; è diverso dal ROI delle sole quote ancora possedute.':returnMethod==='mwrr'?'MWRR (TIR del periodo): rendimento del capitale ponderato secondo data e importo degli acquisti e delle vendite; non annualizzato. Richiede valori e flussi verificabili.':'TWRR: rendimento concatenato della categoria, neutralizzando gli acquisti e le vendite. Il calcolo per intervalli usa Modified Dietz: è una stima, non un TWRR rigoroso intraday.';
}
function showMethodHelp(maxMode=false,series=null){
 if(maxMode){$('methodHelp').textContent='MAX: dalla prima rilevazione verificabile del portafoglio (non dalla data del primo acquisto). '+methodDescription();return}
 $('methodHelp').textContent=methodDescription();
}
function renderHistoryDay(){
 const detail=$('historyDayDetail');if(!detail)return;
 const day=historyPointData.find(p=>p.date===historySelectedDay);
 if(!day||!day.interval){detail.classList.add('hidden');detail.innerHTML='';return}
 const d=day.interval,positive=d.gain>=0,cls=positive?'gain':'loss',sgn=positive?'+':'';
 const shownPct=d.pct;
 detail.classList.remove('hidden');
 detail.innerHTML='<div class="hist-period">'+(d.days===1?'Performance del '+shortDate(d.to):'Variazione '+shortDate(d.from)+' – '+shortDate(d.to)+' ('+d.days+' giorni)')+'</div><div class="hist-figures"><strong class="'+cls+'">'+sgn+eur(d.gain)+'</strong><strong class="'+cls+'">'+(shownPct===null?'n.d.':(shownPct>=0?'+':'')+pct(shownPct))+'</strong></div><span class="sub">'+(returnMethod==='twrr'?'TWRR cumulato nel periodo: '+(day.twrr===null?'n.d.':(day.twrr>=0?'+':'')+day.twrr.toLocaleString('it-IT',{maximumFractionDigits:2})+'%')+' · ':'')+'Patrimonio alla rilevazione: '+eur(d.ending)+(d.flow?' · Acquisti registrati: '+eur(d.flow):'')+'</span>';
}
function renderTradeEvents(){const el=$('tradeEventList');if(!el)return;
 const completed=(returnMethod==='archive'?trades:trades.filter(t=>historyCatIncluded(t.cat))).slice().sort((a,b)=>a.date.localeCompare(b.date));
 el.innerHTML=completed.length?'<div class="eyebrow" style="margin:14px 0 8px">Acquisti e vendite · categorie visualizzate</div>'+completed.slice().reverse().map(t=>{
  const buy=t.kind==='buy',name=tradeAssetName(t);
  return '<div class="transaction-history-row" data-fh8-cat="'+svgEscape(t.cat)+'"><div class="fh1015-entry-ident"><div class="fh1015-entry-badges">'+issuerIcon(t.asset)+categoryGlyph(t.cat)+'</div><div class="fh1015-entry-details"><strong style="color:'+(buy?'#55d5b0':'#efb76e')+'">'+(buy?'＋ Acquisto':'− Vendita')+'</strong> · '+shortDate(t.date)+' · '+svgEscape(name)+(t.assumedDate?' *':'')+'<div class="sub">'+entryDecimal(Number(t.quantity))+' '+(t.cat==='Obbligazioni'?'€ nominali':'quote')+' · '+eur(Math.abs(Number(t.spent||0)))+(buy?'':' · '+(Number(t.realized)>=0?'+':'')+eur(Number(t.realized||0))+' realizzati')+'</div></div></div><button type="button" class="btn" data-history-ledger="'+svgEscape(t.asset)+'">Dettagli</button></div>';
 }).join('')+'<p class="hint">* Le posizioni importate senza data sono attribuite al 03/11/2026. Le modifiche ai movimenti non ricreano prezzi di mercato storici che non erano stati rilevati.</p>':'<p class="hint">Ancora nessuna operazione registrata.</p>';
 renderTransactionTimeline(completed);
}
function renderTransactionTimeline(items){const target=$('transactionTimeline');if(!target)return;
 if(!items.length){target.innerHTML='';return}
 const totals=new Map();for(const t of items){const x=totals.get(t.date)||{date:t.date,buy:0,sale:0,count:0};x[t.kind==='buy'?'buy':'sale']+=Math.abs(Number(t.spent||0));x.count++;totals.set(t.date,x)}
 const arr=[...totals.values()].sort((a,b)=>a.date.localeCompare(b.date)),max=Math.max(1,...arr.map(a=>Math.max(a.buy,a.sale))),w=340,h=170,L=38,R=12,base=141;
 const bw=Math.min(14,(w-L-R)/Math.max(arr.length,1)/2.5),x=i=>L+(w-L-R)*(i+.5)/arr.length;
 const bars=arr.map((a,i)=>{const xx=x(i),bh=a.buy/max*108,sh=a.sale/max*108;
 return '<g><rect x="'+(xx-bw-1).toFixed(2)+'" y="'+(base-bh).toFixed(2)+'" width="'+bw+'" height="'+bh.toFixed(2)+'" fill="#49d5ac" rx="2"><title>'+shortDate(a.date)+' acquisti '+eur(a.buy)+'</title></rect><rect x="'+(xx+1).toFixed(2)+'" y="'+(base-sh).toFixed(2)+'" width="'+bw+'" height="'+sh.toFixed(2)+'" fill="#efb469" rx="2"><title>'+shortDate(a.date)+' vendite '+eur(a.sale)+'</title></rect></g>';}).join('');
 target.innerHTML='<div class="transaction-timeline-title">Movimenti di capitale registrati</div><svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Acquisti in verde e vendite in arancione per data"><line x1="'+L+'" y1="'+base+'" x2="'+(w-R)+'" y2="'+base+'" stroke="#52627c"/>'+bars+'<text x="'+L+'" y="161" fill="#9eb1c9" font-size="10">'+shortDate(arr[0].date)+'</text><text x="'+(w-R)+'" y="161" text-anchor="end" fill="#9eb1c9" font-size="10">'+shortDate(arr[arr.length-1].date)+'</text></svg><p class="hint">Verde: euro investiti · Arancione: euro incassati. Questo grafico mostra le transazioni, non l’andamento delle quotazioni né il rendimento.</p>';
}


function dailyHistoryRecords(){
 // Preserve existing historic snapshots and use their last recorded observation of each day.
 // Weekends are excluded for the securities panel; Friday -> Monday stays adjacent.
 // Use the same canonical, merged, day-by-day observations as the other charts.
 // Recovered closes and observed prices coexist; original observations win.
 // Unlike the previous version, a verified partial day is not discarded.
 return dailySnapshotsByDate().filter(s=>s&&s.byAsset&&s.byCat&&
  /^\d{4}-\d\d-\d\d$/.test(s.date)&&
  ![0,6].includes(new Date(s.date+'T12:00:00Z').getUTCDay())&&
  (s.date!==today()||new Date().getHours()>=9)&&
  Object.values(s.byAsset).some(v=>v&&Number.isFinite(Number(v.value))))
  .sort((a,b)=>a.date.localeCompare(b.date));
}
function dailySignedEuro(n){return (n>=0?'+':'')+eur(n)}
function dailySignedPct(n){return (n>=0?'+':'')+pct(n)}
function dailyMovement(prev,curr,id){
 const b=prev.byAsset?.[id],e=curr.byAsset?.[id];
 // An absent security on a *partial reconstructed* day is not a sale.
 // It is only safe to infer an opening or closure if both days have full
 // portfolio coverage or the dated trade ledger documents the movement.
 if(!b||!e){
  const hasDatedMove=trades.some(t=>t.asset===id&&t.date>prev.date&&t.date<=curr.date&&['buy','sale'].includes(t.kind));
  if(!hasDatedMove&&(prev.coverage!=='all-assets'||curr.coverage!=='all-assets'))
   return {error:'Prezzo non recuperato per questa giornata'};
 }
 const q0=Number(b?.quantity||0),q1=Number(e?.quantity||0),v0=Number(b?.value||0),v1=Number(e?.value||0);
 if(![q0,q1,v0,v1].every(Number.isFinite))return {error:'Rilevazione incompleta'};
 const reconciled=historyAssetFlow(prev,curr,id);
 if(!reconciled)return {error:'Operazioni e capitale da verificare'};
 const net=reconciled.flow;
 const buys=Math.max(0,net);
 const gain=v1-v0-net,base=v0+buys;
 return {id,gain,pct:base>0?gain/base:null,net,buys,v0,v1,q0,q1,ops:reconciled.ops,estimated:reconciled.source==='capitale registrato'};
}

function renderDailyHistory(){
 const el=$('dailyHistoryView');if(!el)return;
 const rows=dailyHistoryRecords();
 const pairs=rows.slice(1).map((to,i)=>({from:rows[i],to}));
 if(!pairs.length){el.innerHTML='<div class="history-empty">Servono almeno due rilevazioni in giornate di mercato differenti. Non vengono inventati prezzi mancanti.</div>';return}
 const dates=pairs.map(p=>p.to.date);
 if(!dates.includes(dailyHistorySelectedDate))dailyHistorySelectedDate=dates[dates.length-1];
 const pair=pairs.find(p=>p.to.date===dailyHistorySelectedDate);
 const active=CAT.map(c=>c[0]).filter(cat=>cat!=='Crypto'&&filter[cat]);
 const ids=[...new Set([...Object.keys(pair.from.byAsset||{}),...Object.keys(pair.to.byAsset||{})])];
 const results=ids.map(id=>{const ref=state.assets.find(a=>a.id===id),cat=pair.to.byAsset?.[id]?.cat||pair.from.byAsset?.[id]?.cat||ref?.cat||'';
  return {id,ref,cat,name:ref?.name||trades.find(t=>t.asset===id)?.assetName||id,...dailyMovement(pair.from,pair.to,id)};
 }).filter(r=>active.includes(r.cat)&&(r.v0>0||r.v1>0||r.ops?.length||r.error));
 const good=results.filter(r=>!r.error),bad=results.filter(r=>r.error);
 const gain=good.reduce((n,r)=>n+r.gain,0),base=good.reduce((n,r)=>n+r.v0+r.buys,0);
 const rowHtml=results.map(r=>{
  const badRow=!!r.error,cls=badRow?'':r.gain>=0?'gain':'loss';
  return '<div class="daily-asset-row"><div class="daily-asset-name">'+(r.ref?issuerIcon(r.id):'<span class="asset-logo"><span class="asset-logo-fallback">•</span></span>')+'<div class="daily-asset-text"><strong>'+svgEscape(r.name)+'</strong><small>'+svgEscape(r.cat)+(r.ref?.symbol?' · '+svgEscape(r.ref.symbol):'')+'</small></div></div><div class="daily-asset-change '+cls+'"><strong>'+(badRow?'n.d.':dailySignedEuro(r.gain))+'</strong><small>'+(badRow?svgEscape(r.error==='Prezzo non recuperato per questa giornata'?'Prezzo non disponibile':r.error):r.pct===null?'n.d.':dailySignedPct(r.pct))+'</small></div></div>';
 }).join('');
 el.innerHTML='<div class="daily-history-title"><h3>Risultato dell’ultima giornata</h3><label for="dailyHistoryDate">Giornata</label><select id="dailyHistoryDate" aria-label="Scegli una giornata precedente">'+dates.slice().reverse().map(d=>'<option value="'+d+'"'+(d===dailyHistorySelectedDate?' selected':'')+'>'+shortDate(d)+'</option>').join('')+'</select></div>'+
 '<p class="sub">Confronto tra '+shortDate(pair.from.date)+' e '+shortDate(pair.to.date)+'. '+(pair.to.source==='reconstructed'?'Chiusure ricostruite da fonti storiche. ':pair.to.source==='merged'?'Rilevazione osservata integrata con chiusure ricostruite. ':'')+'Le giornate senza contrattazioni sono saltate per i titoli quotati.</p>'+
 '<div class="daily-total"><span>Risultato di mercato'+(bad.length?' verificabile':'')+'</span><strong class="'+(gain>=0?'gain':'loss')+'">'+(good.length?dailySignedEuro(gain):'n.d.')+'</strong><strong class="'+(gain>=0?'gain':'loss')+'">'+(base>0?dailySignedPct(gain/base):'n.d.')+'</strong></div>'+
 (bad.length?'<p class="hint">'+bad.length+' titoli non verificabili: non sono inclusi nel totale, per evitare di considerare versamenti come rendimenti.</p>':'')+
 '<div class="daily-assets">'+(results.length?rowHtml:'<p class="hint">Nessun titolo nelle categorie attive.</p>')+'</div>'+
 '<p class="hint">Guadagno giornaliero = variazione del valore − versamenti netti. Il recupero usa chiusure storiche verificate e quantità documentate; le giornate parziali possono mostrare titoli senza prezzo. Le quotazioni recuperate non attestano compravendite non registrate.</p>';
 $('dailyHistoryDate').onchange=e=>{dailyHistorySelectedDate=e.target.value;renderDailyHistory()};
}

// Beta 9.9.31: A/B comparison metadata remains read-only and uses actual plotted values.
function abSeriesAttribute(records,kind,currency='EUR'){
 if(!Array.isArray(records)||records.length<2)return '';
 const pts=records.filter(p=>p&&Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y))&&Number.isFinite(Number(p.value)))
  .map(p=>({x:Number(p.x),y:Number(p.y),value:Number(p.value),label:String(p.label||'')}));
 if(pts.length<2)return '';
 return ' data-ab-series="'+encodeURIComponent(JSON.stringify({kind,currency,pts}))+'"';
}
// 9.9.77: Single comparison chart, independent ROI/TWRR/MWRR toggles.
// Each point is derived from dated verified observations and reconciled flows.
function fh73Roi(initial,ending,net,invested){
 const base=initial+Math.max(0,invested);
 return base>0 ? 100*(ending-initial-net)/base : null;
}
function fh73Irr(initial,ending,flows,startDay,endDay){
 const span=endDay-startDay;
 if(!(initial>0)||!(span>0)||!Number.isFinite(ending)||ending<0)return null;
 const eq=r=>{
  if(r<=-1)return NaN;
  let value=initial*(1+r)-ending;
  for(const f of flows){
   const exp=(endDay-f.day)/span;
   const term=f.amount*Math.pow(1+r,exp);
   if(!Number.isFinite(term))return NaN;
   value+=term;
  }
  return value;
 };
 // Bracket a period-specific MWRR, including substantial declines or gains.
 const test=[-.999999,-.999,-.99,-.9,-.75,-.5,-.25,-.1,-.01,0,.01,.1,.25,.5,1,2,5,10,100,1000];
 let left=null,right=null,fl=null,fr=null;
 for(let i=1;i<test.length;i++){
  const a=test[i-1],b=test[i],fa=eq(a),fb=eq(b);
  if(!Number.isFinite(fa)||!Number.isFinite(fb))continue;
  if(fa===0)return a*100;
  if(fb===0)return b*100;
  if((fa<0&&fb>0)||(fa>0&&fb<0)){left=a;right=b;fl=fa;fr=fb;break}
 }
 if(left===null)return null;
 for(let j=0;j<55;j++){
  const mid=(left+right)/2,fmid=eq(mid);
  if(!Number.isFinite(fmid))return null;
  if(Math.abs(fmid)<1e-8) return mid*100;
  if((fl<0&&fmid>0)||(fl>0&&fmid<0)){right=mid;fr=fmid}
  else {left=mid;fl=fmid}
 }
 return (left+right)*50;
}
function fh73FormatPercent(value){return Number.isFinite(value)?(value>=0?'+':'')+value.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+'%':'n.d.'}
function fh73SeriesBuild(observations){
 const ordered=observations.filter(s=>Number.isFinite(trackedValue(s))).sort((a,b)=>a.date.localeCompare(b.date));
 if(!ordered.length)return [];
 let baseIndex=ordered.findIndex(s=>trackedValue(s)>0);
 if(baseIndex<0)baseIndex=0;
 const anchor=ordered[baseIndex];
 const anchorValue=trackedValue(anchor), anchorDay=days(anchor.date);
 let cumNet=0,cumBuys=0,twFactor=1,twValid=anchorValue>0;
 let allFlows=[],unverified=0;
 const points=[];
 const sampleStep=Math.max(1,Math.ceil((ordered.length-baseIndex)/240));
 for(let i=baseIndex;i<ordered.length;i++){
  const current=ordered[i],ending=trackedValue(current),day=days(current.date);
  let verified=true,wasEstimated=false;
  if(i>baseIndex){
   const prev=ordered[i-1];
   const interval=historyInterval(prev,current);
   const net=historyEffectiveFlows(prev,current);
   if(!net||!Number.isFinite(net.flow)){verified=false;unverified++}
   else {
    const intervalTrades=periodFlows(prev,current).filter(t=>Number.isFinite(Number(t.spent)));
    const known=intervalTrades.reduce((n,t)=>n+Number(t.spent),0);
    const inferred=net.flow-known;
    for(const t of intervalTrades)allFlows.push({day:days(t.date),amount:Number(t.spent)});
    if(Math.abs(inferred)>1e-6){
     allFlows.push({day:(days(prev.date)+day)/2,amount:inferred});wasEstimated=true;
    }
    cumNet+=net.flow;
    cumBuys+=Math.max(0,net.flow);
    wasEstimated=wasEstimated||net.estimated;
   }
   if(!interval||!Number.isFinite(interval.pct)||interval.pct<=-1||!twValid)twValid=false;
   else twFactor*=1+interval.pct;
  }
  const roi=verified&&unverified===0?fh73Roi(anchorValue,ending,cumNet,cumBuys):null;
  const twrr=twValid?(twFactor-1)*100:null;
  let mwrr=null;
  // The MWRR solver is costly. Compute all points up to one year; for long
  // histories, sample along the chart and always include the final observation.
  if(i!==baseIndex&&i!==ordered.length-1&&(i-baseIndex)%sampleStep!==0)continue;
  if(i===baseIndex)mwrr=0;
  else if(verified&&unverified===0 && anchorValue>0)mwrr=fh73Irr(anchorValue,ending,allFlows,anchorDay,day);
  points.push({date:current.date,day,value:ending,roi,twrr,mwrr,estimated:wasEstimated,unverified:unverified>0});
 }
 return points;
}
function renderHistory(){
 const el=$('historyGraph'),start=$('historyStart'),summary=$('historySummary'),perf=$('historyPerformance'),detail=$('historyDayDetail'),section=$('historySection');
 refreshHistoryCategoryOptions();
 const daily=returnMethod==='daily',archive=returnMethod==='archive',stats=returnMethod==='stats';
 section.classList.toggle('daily-mode',daily);
 section.classList.toggle('fh1067-stats-mode',stats);
 $('fh1067StatsView').classList.toggle('hidden',!stats);
 section.classList.toggle('fh73-return-mode',!daily&&!archive);
 section.classList.toggle('fh73-archive-mode',archive);
 $('dailyHistoryView').classList.toggle('hidden',!daily);
 updateMethodButtons();
 if(stats){if(typeof renderHistoryStatistics==='function')renderHistoryStatistics();return}
 if(daily){renderDailyHistory();return}
 if(archive){
  renderTradeEvents();
  start.textContent='Tutte le operazioni registrate';
  return;
 }
 // Performance tab. All three return curves use one shared percent scale.
 historyComparableScope=null;
 const observed=historyCanonicalObservations();
 if(!historySelectedCats().length){el.innerHTML='<div class="history-empty">Attiva almeno una categoria nella Dashboard.</div>';summary.innerHTML='';perf.innerHTML='';detail.classList.add('hidden');return}
 if(!observed.length){el.innerHTML='<div class="history-empty">Nessuna rilevazione confrontabile. Usa «Ricostruisci chiusure» per tentare il recupero delle quotazioni.</div>';summary.innerHTML='';perf.innerHTML='';detail.classList.add('hidden');return}
 start.textContent='Dal '+shortDate(observed[0].date);
 const end=days(today()),within=observed.filter(s=>historyRange==='all'||end-days(s.date)<=Number(historyRange));
 // For 1G a single daily snapshot is insufficient for a rate of return.
 // Beta 10.1.3: never count a recovered crypto holding before an actual,
 // documented ownership anchor. A historical QUOTE is not proof that the
 // investor owned that quantity on that day.
 let selected=within.length?within:[observed[observed.length-1]];
 const fh80Crypto=historyCategory==='Crypto';
 if(fh80Crypto){
  const firstObserved=observed.filter(s=>s.source!=='reconstructed'&&Number(s.byCat?.Crypto?.value)>0).map(s=>s.date).sort()[0];
  const firstDatedBuy=trades.filter(t=>t.cat==='Crypto'&&t.kind==='buy'&&!t.assumedDate&&!t.legacyOpening&&/^\d{4}-\d\d-\d\d$/.test(t.date)).map(t=>t.date).sort()[0];
  const documented=[firstObserved,firstDatedBuy].filter(Boolean).sort()[0];
  // If no verified anchor exists, reconstructed crypto dates are unsafe.
  selected=selected.filter(s=>(documented ? s.date>=documented : s.source!=='reconstructed') && Number.isFinite(Number(s.byCat?.Crypto?.value)));
 }

 if(selected.length<2){el.innerHTML='<div class="history-empty">'+(historyRange==='1'?'Per 1G servono almeno due rilevazioni confrontabili. Nessun prezzo intraday viene inventato.':'Servono almeno due rilevazioni nel periodo selezionato.')+'</div>';summary.innerHTML='';perf.innerHTML='';detail.classList.add('hidden');return}
 const full=fh73SeriesBuild(selected),points=full.filter(p=>p&&Number.isFinite(p.day));
 // Do not quote a percentage before a verified ownership anchor for crypto.
 if(fh80Crypto && selected[0].source==='reconstructed'){
  for(const p of points){p.roi=null;p.twrr=null;p.mwrr=null;}
 }
 if(points.length<2){el.innerHTML='<div class="history-empty">Mancano valori iniziali positivi o osservazioni verificabili sufficienti.</div>';summary.innerHTML='';perf.innerHTML='';detail.classList.add('hidden');return}
 const names={roi:'ROI',twrr:'TWRR',mwrr:'MWRR'},colors={roi:'#56d6ae',twrr:'#79aaff',mwrr:'#f4bd68'};
 const seriesKeys=['roi','twrr','mwrr'];const visible=seriesKeys.filter(k=>fh73VisibleSeries.has(k));
 const last=points.at(-1),first=points[0];
 const finalValues=Object.fromEntries(seriesKeys.map(k=>[k,last[k]]));
 // Same definition as the Home donut: value minus invested capital.
 // Its change between two comparable snapshots gives the period gain/loss
 // shown in this view; no guessed external flows are subtracted.
 const firstHomeGain=trackedValue(selected[0])-trackedCapital(selected[0]);
 const lastHomeGain=trackedValue(selected.at(-1))-trackedCapital(selected.at(-1));
 // The Home shows value minus cost basis of positions held NOW; this is
 // cumulative unrealised P/L, not the return since an arbitrary chart start.
 // For TODAY, use the same live state as Home, not a stale/merged snapshot.
 const currentHomeGross=state.assets.filter(a=>a.cat===historyCategory).reduce((sum,a)=>sum+val(a)-cap(a),0);
 const latestIsToday=selected.at(-1).date===today();
 const endGross=latestIsToday?currentHomeGross:lastHomeGain;
 const gain=[firstHomeGain,endGross].every(Number.isFinite)?endGross-firstHomeGain:NaN;
 // Crypto: require a real first owned position. If there are no comparable
 // dated holdings, do not invent a period profit.
 const gainVerified=!fh80Crypto || (selected.length>=2&&selected[0].byAsset&&selected.at(-1).byAsset&&
  selected[0].source!=='reconstructed'&&
  selected[0].source!=='merged');
 const displayedGain=gainVerified?gain:NaN;
 perf.classList.add('fh73-performance');
 perf.innerHTML='<div><small>Guadagno/perdita nel periodo (€)</small><strong class="'+(displayedGain>=0?'gain':'loss')+'">'+(Number.isFinite(displayedGain)?(displayedGain>=0?'+':'')+eur(displayedGain):'n.d.')+'</strong></div>'+seriesKeys.map(k=>'<div><small>'+names[k]+' · rendimento nel periodo</small><strong style="color:'+colors[k]+'">'+fh73FormatPercent(finalValues[k])+'</strong></div>').join('');
 const vals=points.flatMap(p=>visible.map(k=>p[k]).filter(Number.isFinite));
 if(!visible.length){el.innerHTML='<div class="history-empty">Seleziona almeno un indicatore: ROI, TWRR o MWRR.</div>';summary.innerHTML='';detail.classList.add('hidden');return}
 if(vals.length<2){el.innerHTML='<div class="history-empty">Rendimenti non verificabili per gli indicatori selezionati.</div>';summary.innerHTML='';detail.classList.add('hidden');return}
 const low=Math.min(0,...vals),high=Math.max(0,...vals),range=Math.max(.05,high-low),lo=low-range*.12,hi=high+range*.12;
 const W=350,H=238,L=44,R=12,T=25,B=29;
 const day0=first.day,day1=last.day;
 const x=p=>L+(W-L-R)*(p.day-day0)/Math.max(1,day1-day0);
 const y=v=>T+(H-T-B)*(hi-v)/(hi-lo);
 const tickvals=[lo,(lo+hi)/2,hi];
 const ticks=tickvals.map(v=>'<line x1="'+L+'" y1="'+y(v).toFixed(2)+'" x2="'+(W-R)+'" y2="'+y(v).toFixed(2)+'" stroke="#40516b" stroke-dasharray="3 6"/><text x="'+(L-5)+'" y="'+(y(v)+4).toFixed(2)+'" text-anchor="end" font-size="9" fill="#b7c8dc">'+(v>=0?'+':'')+v.toLocaleString('it-IT',{maximumFractionDigits:1})+'%</text>').join('');
 const zero='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(0).toFixed(2)+'" y2="'+y(0).toFixed(2)+'" stroke="#879ab5" stroke-width="1" stroke-dasharray="4 5" />';
 const lines=visible.map(k=>{let d='',open=false;
  points.forEach(p=>{const z=p[k];if(!Number.isFinite(z)){open=false;return}d+=(open?' L':' M')+x(p).toFixed(2)+' '+y(z).toFixed(2);open=true});
  return '<path d="'+d.trim()+'" fill="none" stroke="'+colors[k]+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-label="'+names[k]+'" />';
 }).join('');
 const axis='<text x="'+L+'" y="'+(H-7)+'" fill="#b8c5da" font-size="10">'+shortDate(first.date)+'</text><text x="'+(W-R)+'" y="'+(H-7)+'" text-anchor="end" fill="#b8c5da" font-size="10">'+shortDate(last.date)+'</text>';
 const legend=visible.map(k=>'<span><i style="background:'+colors[k]+'"></i>'+names[k]+' · '+fh73FormatPercent(finalValues[k])+'</span>').join('');
 el.innerHTML='<div class="fh73-legend">'+legend+'</div><svg class="fh73-comparison history-plot" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="ROI, TWRR e MWRR nello stesso grafico con scala percentuale condivisa">'+ticks+zero+lines+axis+'<g id="fh73FocusMarker"></g><rect id="fh73TouchArea" x="0" y="0" width="'+W+'" height="'+H+'" fill="transparent" style="touch-action:none;cursor:crosshair" /></svg><div id="fh73Tooltip" class="fh73-tooltip" role="status">Tocca o trascina sul grafico per confrontare i tre rendimenti nello stesso giorno.</div>';
 const svg=el.querySelector('.fh73-comparison'),overlay=el.querySelector('#fh73FocusMarker'),tooltip=el.querySelector('#fh73Tooltip'),touch=el.querySelector('#fh73TouchArea');
 let selecting=false;
 // Use the actual SVG viewBox transform: rendered SVGs can have blank margins from preserveAspectRatio.
 function pointerX(ev){const matrix=svg.getScreenCTM();if(matrix){const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;return pt.matrixTransform(matrix.inverse()).x;}const r=svg.getBoundingClientRect();return (ev.clientX-r.left)*W/Math.max(1,r.width);}
 function focus(ev){const cx=Math.min(W-R,Math.max(L,pointerX(ev)));let best=points[0],gap=Infinity;for(const p of points){const dist=Math.abs(x(p)-cx);if(dist<gap){best=p;gap=dist}}const xx=x(best).toFixed(2);overlay.innerHTML='<line x1="'+xx+'" x2="'+xx+'" y1="'+T+'" y2="'+(H-B)+'" stroke="#b8cfe7" stroke-dasharray="4 5" stroke-width="1.3"/>'+visible.filter(k=>Number.isFinite(best[k])).map(k=>'<circle cx="'+xx+'" cy="'+y(best[k]).toFixed(2)+'" r="4.2" fill="'+colors[k]+'" stroke="#f0f6ff" stroke-width="1.5"/>').join('');tooltip.textContent=shortDate(best.date)+' · '+visible.map(k=>names[k]+' '+fh73FormatPercent(best[k])).join(' · ');}
 touch.addEventListener('pointerdown',e=>{selecting=true;try{touch.setPointerCapture(e.pointerId)}catch(_){}focus(e);if(e.cancelable)e.preventDefault()});
 touch.addEventListener('pointermove',e=>{if(selecting||e.pointerType==='mouse')focus(e)});
 const stop=()=>{selecting=false};touch.addEventListener('pointerup',stop);touch.addEventListener('pointercancel',stop);touch.addEventListener('lostpointercapture',stop);
 // Keyboard-accessible first/last observations, independent of drag precision.
 svg.setAttribute('tabindex','0');svg.setAttribute('aria-label','Grafico ROI, TWRR e MWRR. Frecce sinistra e destra per selezionare le date, Inizio e Fine per gli estremi.');
 let focusIndex=points.length-1;
 svg.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();focusIndex=e.key==='Home'?0:e.key==='End'?points.length-1:Math.max(0,Math.min(points.length-1,focusIndex+(e.key==='ArrowLeft'?-1:1)));const p=points[focusIndex];const xx=x(p).toFixed(2);overlay.innerHTML='<line x1="'+xx+'" x2="'+xx+'" y1="'+T+'" y2="'+(H-B)+'" stroke="#b8cfe7" stroke-dasharray="4 5" stroke-width="1.3"/>'+visible.filter(k=>Number.isFinite(p[k])).map(k=>'<circle cx="'+xx+'" cy="'+y(p[k]).toFixed(2)+'" r="4.2" fill="'+colors[k]+'" stroke="#f0f6ff" stroke-width="1.5"/>').join('');tooltip.textContent=shortDate(p.date)+' · '+visible.map(k=>names[k]+' '+fh73FormatPercent(p[k])).join(' · ')});
 historyPointData=points.map(p=>({...p}));detail.classList.add('hidden');
 summary.innerHTML='<span>Categoria: '+svgEscape(historyCategory)+'</span><span>Dal '+shortDate(first.date)+' al '+shortDate(last.date)+'</span><span>Scala condivisa · nessuna interpolazione di rendimenti mancanti</span>';
 $('methodHelp').textContent='Home: guadagno lordo cumulato delle posizioni correnti. Storico: variazione del guadagno lordo fra la prima e l’ultima rilevazione confrontabili; non coincide necessariamente con il totale della Home. ROI = risultato percentuale sul capitale impiegato nel periodo. TWRR = rendimento che cerca di neutralizzare i flussi (stima Modified Dietz). MWRR = rendimento ponderato per importi e date. Per le Crypto lo storico ricostruito prima del primo possesso documentato non viene usato. Dati insufficienti: n.d.';
 if(fh80Crypto){
  let pane=document.getElementById('fh80CryptoAudit');
  if(!pane){pane=document.createElement('div');pane.id='fh80CryptoAudit';pane.className='fh80-crypto-audit';perf.insertAdjacentElement('afterend',pane)}
  const src=selected[0].source||'sconosciuta',startDate=shortDate(selected[0].date),endDate=shortDate(selected.at(-1).date);
  const moneyValue=v=>Number.isFinite(v)?(v>=0?'+':'')+eur(v):'n.d.';
  pane.replaceChildren();
  const head=document.createElement('strong');head.textContent='Crypto · riconciliazione con la Home';
  const body=document.createElement('p');body.textContent='Home oggi: '+moneyValue(currentHomeGross)+' · Risultato iniziale ('+startDate+'): '+moneyValue(firstHomeGain)+' · Variazione del periodo ('+startDate+' – '+endDate+'): '+moneyValue(displayedGain)+'.';
  const foot=document.createElement('small');foot.textContent=Number.isFinite(displayedGain)?'Una perdita nel periodo può coesistere con un guadagno cumulato positivo; controlla qui il risultato iniziale.':'Periodo non confrontabile con certezza: mancano rilevazioni iniziali del possesso effettivo. Nessuna perdita è stimata.';
  pane.append(head,body,foot);
 }else document.getElementById('fh80CryptoAudit')?.remove();
}

// b.7.7: reconstruct dated positions from the ledger and independent daily market closes.
// It is deliberately strict: incomplete instruments/days are NOT fabricated.
async function historicYahooCloses(symbol,currency){
 const url='/.netlify/functions/history?symbol='+encodeURIComponent(symbol)+'&currency='+encodeURIComponent(currency)+'&range=1y';
 const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(symbol+': fonte storica '+r.status);
 const d=await r.json(),a=d.chart?.result?.[0];
 if(String(a?.meta?.symbol||'').toUpperCase()!==String(symbol).toUpperCase()||String(a?.meta?.currency||'').toUpperCase()!==currency)throw Error(symbol+': mercato o valuta non corrispondenti');
 const times=a.timestamp||[],prices=a.indicators?.quote?.[0]?.close||[],result=new Map();
 times.forEach((t,i)=>{const p=Number(prices[i]);if(Number.isFinite(p)&&p>0&&Number(t)>0)result.set(new Intl.DateTimeFormat('sv-SE',{timeZone:a.meta?.exchangeTimezoneName||'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Number(t)*1000)),p)});
 // Intl locale en-CA format not guaranteed in all browsers: use formatToParts below if needed.
 if(!result.size)throw Error(symbol+': nessuna chiusura verificata');
 try{store.setItem('finholdra_verified_closes_'+symbol+'_'+currency,JSON.stringify({savedAt:new Date().toISOString(),symbol,currency,prices:[...result.entries()]}))}catch(_){}
 return result;
}
async function historicBondCloses(isin){
 let map=new Map(),historyError='';
 try{
  const response=await fetch('/.netlify/functions/bond-history?isin='+encodeURIComponent(isin)+'&range=1y',{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const d=await response.json();if(d.isin!==isin||d.unit!=='percentOfNominal'||!Array.isArray(d.points))throw Error('storico MOT incompatibile');
  for(const item of d.points){const t=Number(item.t),price=Number(item.p);if(t>0&&price>40&&price<170)map.set(new Date(t).toISOString().slice(0,10),price)}
 }catch(e){historyError=String(e.message||e)}
 // A verified official reference is attached ONLY to its actual date, never to other dates.
 try{const official=await officialBondQuote(isin);if(official.priceDate&&official.price>0)map.set(official.priceDate,official.price)}catch(e){if(!map.size)historyError+='; '+String(e.message||e)}
 if(!map.size)throw Error('Storico '+isin+' non disponibile: '+historyError);
 return map;
}
// Beta 9.9.44 — verified DAILY close recovery. No artificial trades or quantities.
function snapshotTradePosition(assetId,date){
 let qty=0,cost=0;
 for(const t of orderAssetTrades(assetId)){
  if(t.date>date)break;
  const q=Number(t.quantity),p=Number(t.price),fx=tradeFx(t,state.assets.find(a=>a.id===assetId)),factor=t.cat==='Obbligazioni'?100:1;
  if(!(q>0&&p>0&&fx>0))return null;
  if(t.kind==='buy'){qty+=q;cost+=q*p*fx/factor}
  else if(t.kind==='sale'){
   if(q>qty+1e-8)return null;
   const basis=qty?cost*q/qty:0;qty-=q;cost-=basis;
  }
 }
 return {q:qty<1e-8?0:qty,capital:Math.max(0,cost)};
}
function bondObservedCarryForward(asset,date){
 // Valuation proxy, NOT a verified market close. Use only recent earlier observation.
 const candidate=snapshots.filter(sn=>sn.source==='observed'&&sn.date<=date&&sn.byAsset?.[asset.id])
   .sort((a,b)=>b.date.localeCompare(a.date)||Number(b.stamp||0)-Number(a.stamp||0))[0];
 if(!candidate||days(date)-days(candidate.date)>4)return null;
 const item=candidate.byAsset[asset.id],p=Number(item.price);
 if(!(p>40&&p<170))return null;
 return {price:p,sourceDate:candidate.date};
}
function historicCloseOn(map,date,crypto){
 if(map?.has(date))return map.get(date);
 if(crypto)return null; // 24/7 trading: no synthetic crypto closes
 // Exchanges may be closed over weekends or longer holidays.
 for(let n=1;n<=7;n++){
  const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-n);
  const previous=d.toISOString().slice(0,10);
  if(map?.has(previous))return map.get(previous);
 }
 return null;
}
function recoveryPastPosition(asset,date){
 const anchors=snapshots.filter(sn=>sn.source==='observed'&&sn.date<=date&&sn.byAsset?.[asset.id]&&Number.isFinite(Number(sn.byAsset[asset.id].quantity)))
  .sort((x,y)=>y.date.localeCompare(x.date)||Number(y.stamp||0)-Number(x.stamp||0));
 if(anchors.length){
  const anchor=anchors[0],item=anchor.byAsset[asset.id];
  let q=Number(item.quantity),capital=Number(item.capital);
  if(!(q>=0&&capital>=0))return null;
  for(const tx of orderAssetTrades(asset.id).filter(t=>t.date>anchor.date&&t.date<=date)){
   const quantity=Number(tx.quantity),amount=Number(tx.spent),fx=tradeFx(tx,asset);
   if(!(quantity>0&&Number.isFinite(amount)))return null;
   if(tx.kind==='buy'){
    q+=quantity;capital+=Math.abs(amount);
   }else if(tx.kind==='sale'){
    if(quantity>q+1e-8)return null;
    const basis=q>0?capital*quantity/q:0;
    q-=quantity;capital-=basis;
   }
  }
  return {q:Math.max(0,q),capital:Math.max(0,capital),source:'rilevazione osservata e movimenti registrati'};
 }
 // Ledger-only recovery is permitted only if its opening position and dates are documented.
 const ledger=orderAssetTrades(asset.id);
 if(!ledger.length||ledger.some(t=>t.assumedDate||t.legacyOpening))return null;
 if(ledger[0].date>date)return {q:0,capital:0,source:'acquisto futuro registrato'};
 const pos=snapshotTradePosition(asset.id,date);
 return pos?{...pos,source:'registro degli acquisti'}:null;
}
function recoveryLocalDate(epoch){return new Date(epoch*86400000).toISOString().slice(0,10)}
function recoveryFxForDate(currency,date,maps){
 if(currency==='EUR')return 1;
 const inverse=historicCloseOn(maps.get(currency),date,false);
 return inverse>0?1/inverse:NaN;
}
function recoveryMarketDay(date){const w=new Date(date+'T12:00:00Z').getUTCDay();return w!==0&&w!==6;}
function recoveryDepositPosition(asset,date){
 const start=asset.depositStart||asset.interestAnchor||null;
 if(!start||date<start)return null;
 const pos=recoveryPastPosition(asset,date);
 if(!pos||pos.q<=0)return pos;
 // Deposits are valued with documented opening principal and ACT/365 gross accrual.
 // The interest curve is NOT a compounded return unless the banking contract says so.
 const interest=depositAccrued(asset,date);
 const principal=depositPrincipal(asset);
 if(!(principal>=0&&Number.isFinite(interest)))return null;
 return {q:pos.q,capital:principal,value:principal+interest,price:1,interest,source:'interessi lordi calcolati (ACT/365)'};
}
function recoverySaveClosePoints(asset,map){
 // Recovered official closes are usable later in the investment/PMC charts.
 try{
  const key='invesquo_asset_prices_v58',all=JSON.parse(store.getItem(key)||'{}');
  const old=Array.isArray(all[asset.id])?all[asset.id]:[];
  const byDay=new Map();
  for(const v of old){if(Number(v.t)>0&&Number(v.p)>0)byDay.set(new Date(v.t).toISOString().slice(0,10),v)}
  for(const [date,price] of map){if(!(price>0))continue;
   // Daily chart: close is an observation on the actual trading date, not a trade execution price.
   byDay.set(date,{t:Date.parse(date+'T20:00:00Z'),p:price,historicalClose:true});
  }
  all[asset.id]=[...byDay.values()].sort((a,b)=>Number(a.t)-Number(b.t)).slice(-1500);
  store.setItem(key,JSON.stringify(all));
 }catch(_){/* portfolio history still persists if local price cache is full */}
}
let historyBackfillBusy=false;
async function backfillTransactionHistory(categories=null){
 if(historyBackfillBusy)return;
 historyBackfillBusy=true;
 for(const id of ['wealthBackfill','historyBackfill']){const x=$(id);if(x)x.disabled=true;}
 const labels=['wealthBackfillStatus','historyBackfillStatus'].map(id=>$(id)).filter(Boolean);
 const status=msg=>labels.forEach(el=>el.textContent=msg);
 status('Recupero chiusure giornaliere del portafoglio…');
 try{
  const assets=state.assets.filter(a=>a.cat!=='Futures'&&Number(a.q)>=0);
  if(!assets.length){status('Il portafoglio non contiene titoli da ricostruire.');return}
  const observed=snapshots.filter(s=>s.source==='observed'&&s.byAsset&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s.date));
  const datedLedger=trades.filter(t=>!t.assumedDate&&!t.legacyOpening&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(t.date));
  const firstAnchor=[...observed.map(s=>s.date),...datedLedger.map(t=>t.date)].sort()[0];
  if(!firstAnchor){status('Non ci sono posizioni datate: importa prima un backup con quantità e date degli acquisti.');return}
  const end=days(today())-1,start=Math.max(days(firstAnchor),end-365);
  if(end<start){status('Nessuna giornata trascorsa da recuperare.');return}
  const markets=new Map(),fxMaps=new Map(),errors=[];
  // Fetch each symbol once; use the exact same historical prices across every chart.
  for(const a of assets){
   if(a.cat==='Conto deposito'||a.cat==='Risparmio postale')continue;
   if(a.cat==='Crypto'&&(!a.symbol||!/-/.test(a.symbol))){errors.push(a.name+': ticker crypto non riconosciuto');continue}
   try{
    status('Recupero prezzi storici: '+a.name+'…');
    const quotes=a.cat==='Obbligazioni'&&a.isin?await historicBondCloses(a.isin):await historicYahooCloses(a.symbol,currencyOf(a));
    markets.set(a.id,quotes);
    recoverySaveClosePoints(a,quotes);
    const currency=currencyOf(a);
    if(currency!=='EUR'&&!fxMaps.has(currency))fxMaps.set(currency,await historicYahooCloses('EUR'+currency+'=X',currency));
   }catch(e){
    // A previously verified close can be reused, but a current quote must never
    // masquerade as a historical close.
    let cached=new Map();
    try{const storage=JSON.parse(store.getItem('invesquo_asset_prices_v58')||'{}');
     for(const point of storage[a.id]||[])if(point.historicalClose&&Number(point.p)>0)
      cached.set(new Date(Number(point.t)).toISOString().slice(0,10),Number(point.p));
    }catch(_){}
    if(cached.size){markets.set(a.id,cached);errors.push(a.name+': fonte offline; usate '+cached.size+' chiusure storiche già verificate')}
    else errors.push(a.name+': '+String(e.message||e).slice(0,100));
   }
  }
  let created=0,partial=0,skipped=0;
  const allCategories=CAT.map(([c])=>c);
  for(let epoch=start;epoch<=end;epoch++){
   const date=recoveryLocalDate(epoch),existing=snapshots.find(s=>s.date===date&&s.source==='observed');
   // Even if an incomplete observed snapshot exists, reconstruct a separate companion.
   // Never overwrite the observed data; merging is performed only for display.
   const isTradingDay=recoveryMarketDay(date),byAsset={},byCat={};
   allCategories.forEach(cat=>byCat[cat]={value:0,capital:0});
   const incompleteCats=new Set(),completeCats=new Set(allCategories);
   for(const a of assets){
    const cat=a.cat;
    const pos=recoveryPastPosition(a,date);
    if(!pos){incompleteCats.add(cat);continue}
    if(pos.q<=0)continue;
    let record=null;
    if(cat==='Conto deposito'){
     const d=recoveryDepositPosition(a,date);
     if(d)record={cat,quantity:pos.q,value:d.value,capital:d.capital,price:1,currency:'EUR',fxRate:1,interest:d.interest,recovery:'daily-interest'};
    }else if(cat==='Risparmio postale'){
     // Post-office savings require the contract/series. Do not invent annual accruals.
     const existingValue=Number(a.maturityValue||0);
     if(Number.isFinite(pos.capital))record={cat,quantity:pos.q,value:pos.capital,capital:pos.capital,price:1,currency:'EUR',fxRate:1,recovery:'principal-only',valuationNotice:'Interessi postali non verificabili dalla sola serie'};
    }else{
     const quotes=markets.get(a.id),price=historicCloseOn(quotes,date,cat==='Crypto');
     const fx=recoveryFxForDate(currencyOf(a),date,fxMaps);
     if(price>0&&fx>0){
      const value=pos.q*price*fx/(cat==='Obbligazioni'?100:1);
      record={cat,quantity:pos.q,value,capital:pos.capital,price,currency:currencyOf(a),fxRate:fx,recovery:cat==='Crypto'?'daily-utc-close':'market-close'};
     }else if(cat==='Obbligazioni'&&fx>0){
      const proxy=bondObservedCarryForward(a,date);
      if(proxy){record={cat,quantity:pos.q,value:pos.q*proxy.price/100,capital:pos.capital,price:proxy.price,currency:'EUR',fxRate:1,recovery:'last-observed-valuation',estimated:true,valuationNotice:'Valore indicativo: ultimo prezzo osservato il '+proxy.sourceDate+'; nessuna chiusura verificata per '+date};}
     }
    }
    if(record){byAsset[a.id]=record;byCat[cat].value+=record.value;byCat[cat].capital+=record.capital}
    else incompleteCats.add(cat);
   }
   incompleteCats.forEach(cat=>{completeCats.delete(cat);delete byCat[cat]});
   if(!Object.keys(byAsset).length){skipped++;continue}
   const full=completeCats.size===allCategories.length;
   const sn={date,stamp:epoch*86400000,source:'reconstructed',coverage:full?'all-assets':'verified-selected',byAsset,byCat,
    selectedCategories:[...completeCats],recoveryVersion:2,recoveryNote:'Prezzi di chiusura, quantità documentate; interessi giornalieri per conti deposito. Nessuna operazione inventata.',isTradingDay};
   const oldIndex=snapshots.findIndex(s=>s.date===date&&s.source==='reconstructed');
   if(oldIndex>=0)snapshots[oldIndex]=sn;else snapshots.push(sn);
   created++;if(!full)partial++;
  }
  snapshots.sort((a,b)=>a.date.localeCompare(b.date));
  saveTimeline();
  if(typeof renderHistory==='function')renderHistory();
  if(typeof renderDailyHistory==='function'&&returnMethod==='daily')renderDailyHistory();
  if(typeof renderWealthGraph==='function')renderWealthGraph();
  const yesterday=recoveryLocalDate(end),yesterdayRecord=dailySnapshotsByDate().find(s=>s.date===yesterday);
  const yesterdayMessage=yesterdayRecord&&Object.keys(yesterdayRecord.byAsset||{}).length?'Chiusure '+yesterday+' ricostruite per '+Object.keys(yesterdayRecord.byAsset).length+' strumenti. ':'Chiusura '+yesterday+' non ricostruibile con le fonti e posizioni disponibili. ';
  status(yesterdayMessage+created+' giornate recuperate ('+partial+' parziali; '+skipped+' senza valori). '+
   (errors.length?errors.length+' strumenti con prezzi non disponibili: '+errors.slice(0,2).join(' · '):'Fonti storiche disponibili.')+
   ' I giorni recuperati sono salvati nel profilo e nel prossimo backup.');
 }catch(e){status('Recupero non completato: '+String(e.message||e).slice(0,180))}
 finally{historyBackfillBusy=false;for(const id of ['wealthBackfill','historyBackfill']){const x=$(id);if(x)x.disabled=false}}
}
$('historyBackfill').onclick=()=>void backfillTransactionHistory(CAT.filter(([c])=>filter[c]).map(([c])=>c));

$('historyGraph').addEventListener('click',e=>{const n=e.target.closest('[data-history-date]');if(!n)return;historySelectedDay=n.dataset.historyDate;renderHistory();});
$('historyGraph').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const n=e.target.closest('[data-history-date]');if(!n)return;e.preventDefault();historySelectedDay=n.dataset.historyDate;renderHistory()});

function days(date){const d=String(date||'2026-11-03').split('-').map(Number);return Date.UTC(d[0],d[1]-1,d[2])/86400000}
function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function firstAppDay(){const recorded=snapshots.map(x=>String(x.date||'')).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).sort();return recorded[0]||today()}
function validEntryDate(id){const d=String($(id)?.value||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||d>today())return null;const t=new Date(d+'T12:00:00');return Number.isFinite(t.getTime())&&[t.getFullYear(),String(t.getMonth()+1).padStart(2,'0'),String(t.getDate()).padStart(2,'0')].join('-')===d?d:null}
function entryMode(name){return document.querySelector('input[name="'+name+'"]:checked')?.value||'qty'}
function entryDecimal(n){return new Intl.NumberFormat('it-IT',{maximumFractionDigits:10}).format(n)}
function initInvestmentDates(){for(const id of ['buyDate','newAssetDate']){if($(id)){$(id).value=today();$(id).max=today()}}}
// Date shortcuts use the earliest recorded observation; never invent an earlier start date.
document.addEventListener('click',e=>{const b=e.target.closest('[data-first-date]');if(!b)return;const field=$(b.dataset.firstDate);if(field){field.value=firstAppDay();field.dispatchEvent(new Event('change',{bubbles:true}))}});

function cap(a){return Number.isFinite(Number(a.costEur))?Number(a.costEur):euroValue(a,a.pmc,a.q)}
function depositPrincipal(a){return a.id==='ing'?num(a.q)*num(a.p):num(a.costEur||a.pmc||a.p)}
function depositAccrued(a,asOf=today()){
 const annual=Math.max(0,num(a.annualRate))/100;
 if(Array.isArray(a.depositFlows)&&a.depositFlows.length){
  // Calculate simple GROSS daily interest from each dated movement (ACT/365).
  // Do not mistakenly use the net banking amount as the gross accrued amount.
  const gross=a.depositFlows.reduce((sum,m)=>sum+Number(m.amount||0)*Math.max(0,days(asOf)-days(m.date))*annual/365,0);
  return Math.round((gross+Number.EPSILON)*100)/100;
 }
 const start=a.depositStart||'2026-08-08',anchor=a.interestAnchor||start,elapsed=Math.max(0,days(asOf)-days(start));
 if(!elapsed)return 0;
 const base=Math.max(0,num(a.interestBase));
 if(days(asOf)<=days(anchor))return days(anchor)>days(start)?base*elapsed/(days(anchor)-days(start)):base;
 const extra=Math.max(0,days(asOf)-days(anchor));
 return base+extra*depositPrincipal(a)*annual/365;
}
function ingInterest(a){return depositAccrued(a)}
function val(a){return a.cat==='Conto deposito'?depositPrincipal(a)+depositAccrued(a):euroValue(a,a.p,a.q)}
function activeAssets(){return state.assets.filter(a=>filter[a.cat]&&Number(a.q)>0)}
function totalCapital(){return activeAssets().reduce((s,a)=>s+cap(a),0)}
function totalValue(){return activeAssets().reduce((s,a)=>s+val(a),0)}
function notice(msg,warning){$('notice').textContent=msg;$('notice').className='notice'+(warning?' warn':'')}
function groups(){return CAT.filter(([c])=>filter[c]).map(([name,defaultColor])=>{const custom=prefs.categoryColors?.[name],color=validColor(custom)?custom:defaultColor;const list=state.assets.filter(a=>a.cat===name),c=list.reduce((s,a)=>s+cap(a),0),v=list.reduce((s,a)=>s+val(a),0);return{name,color,capital:c,value:v,ret:c?(v-c)/c:0}})}

let donutRotationDeg=0,donutGesture=null,donutSuppressClick=false;
function donutArcPath(cx,cy,outer,inner,startDeg,endDeg){
 const point=(r,d)=>{const a=(d-90)*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)]};
 const a=point(outer,startDeg),b=point(outer,endDeg),c=point(inner,endDeg),d=point(inner,startDeg),large=endDeg-startDeg>180?1:0;
 return `M ${a[0].toFixed(3)} ${a[1].toFixed(3)} A ${outer} ${outer} 0 ${large} 1 ${b[0].toFixed(3)} ${b[1].toFixed(3)} L ${c[0].toFixed(3)} ${c[1].toFixed(3)} A ${inner} ${inner} 0 ${large} 0 ${d[0].toFixed(3)} ${d[1].toFixed(3)} Z`;
}
function applyDonutOutline(){const donut=$('donut');if(!donut)return;donut.style.removeProperty('box-shadow');donut.style.removeProperty('border');}
function renderInteractiveDonut(full,den){
 const donut=$('donut');if(!donut)return;
 let offset=0;
 const slices=full.filter(g=>(mode==='now'?g.value:g.capital)>0).map(g=>{
  const weight=(mode==='now'?g.value:g.capital)/den,from=offset,to=offset+weight*360;offset=to;
  const selected=g.name===allocationSelectedCategory;
  // Expand only the selected slice radially: no white outline, glow, or offset geometry.
  return `<path class="donut-slice${selected?' is-selected':''}" d="${donutArcPath(130,130,selected?128:125,63,from,Math.min(to,359.99999))}" fill="${g.color}" stroke="none" stroke-width="0"/>`;
 });
 let svg=donut.querySelector('.donut-slices');if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 260 260');svg.setAttribute('class','donut-slices');svg.setAttribute('aria-hidden','true');donut.insertBefore(svg,donut.firstChild)}
 svg.innerHTML=slices.join('');donut.style.setProperty('--donut-rotation',donutRotationDeg+'deg');applyDonutOutline();
}
function donutCategoryAt(clientX,clientY){
 const rect=$('donut').getBoundingClientRect(),dx=clientX-(rect.left+rect.width/2),dy=clientY-(rect.top+rect.height/2),radius=Math.min(rect.width,rect.height)/2,dist=Math.hypot(dx,dy);
 if(dist<radius*.48||dist>radius*1.08)return null;
 const full=groups().filter(g=>(mode==='now'?g.value:g.capital)>0),den=full.reduce((s,g)=>s+(mode==='now'?g.value:g.capital),0);if(!den)return null;
 const degrees=(((Math.atan2(dx,-dy)*180/Math.PI)-donutRotationDeg)%360+360)%360;
 let cursor=0;
 for(const g of full){cursor+=(mode==='now'?g.value:g.capital)/den*360;if(degrees<=cursor+1e-6)return g.name}
 return null;
}
let allocationSelectedCategory=null;
function allocationSigned(v){return (v>=0?'+':'')+eur(v)}
function allocationBreakdown(category){
 const el=$('allocationDetail');if(!el)return;
 const group=groups().find(g=>g.name===category);
 if(!group||!filter[category]){el.classList.add('hidden');el.innerHTML='';allocationSelectedCategory=null;return;}
 const titles=state.assets.filter(a=>a.cat===category&&Number(a.q)>0).sort((a,b)=>val(b)-val(a));
 const totalNow=totalValue(),totalCost=totalCapital();
 const ret=group.value-group.capital;
 const metric=(label,value)=>'<div class="allocation-detail-metric"><span>'+label+'</span><strong>'+value+'</strong></div>';
 el.innerHTML='<div class="allocation-detail-head"><div><h3>'+svgEscape(category)+'</h3><div class="sub">'+titles.length+' '+(titles.length===1?'titolo':'titoli')+' · rendimento lordo non realizzato</div></div><button type="button" class="allocation-detail-close" id="allocationDetailClose" aria-label="Chiudi dettaglio categoria">×</button></div>'+
 '<div class="allocation-detail-summary">'+metric('Peso sul valore oggi',pct(totalNow?group.value/totalNow:0))+metric('Peso sul capitale investito',pct(totalCost?group.capital/totalCost:0))+metric('Valore oggi',eur(group.value))+metric('Investito',eur(group.capital))+metric('Rendimento lordo', '<span class="'+(ret>=0?'gain':'loss')+'">'+allocationSigned(ret)+' · '+(group.capital?(ret>=0?'+':'')+pct(ret/group.capital):'—')+'</span>')+'</div>'+
 (titles.length?titles.map(a=>{const c=cap(a),v=val(a),r=v-c,meta=[a.symbol,a.isin].filter(Boolean).join(' · ');return '<div class="allocation-detail-item allocation-detail-clickable" role="button" tabindex="0" data-home-detail-id="'+svgEscape(a.id)+'" aria-label="Apri dettaglio investimento '+svgEscape(a.name)+'"><div class="allocation-detail-name-row">'+issuerIcon(a.id)+'<div class="allocation-detail-name-wrap"><div class="allocation-detail-name">'+svgEscape(a.name)+'</div>'+(meta?'<div class="allocation-detail-symbol">'+svgEscape(meta)+'</div>':'')+'</div></div><div class="allocation-detail-fields"><div><span>Valore oggi · peso totale</span><strong>'+eur(v)+' · '+pct(totalNow?v/totalNow:0)+'</strong></div><div><span>Investito · peso totale</span><strong>'+eur(c)+' · '+pct(totalCost?c/totalCost:0)+'</strong></div><div style="grid-column:1/-1"><span>Rendimento lordo</span><strong class="'+(r>=0?'gain':'loss')+'">'+allocationSigned(r)+' · '+(c?(r>=0?'+':'')+pct(r/c):'—')+'</strong></div></div></div>'}).join(''):'<p class="hint">Nessun titolo presente in questa categoria.</p>');
 el.classList.remove('hidden');
 $('allocationDetailClose').onclick=()=>{allocationSelectedCategory=null;updateAllocationSelection()};
}
function updateAllocationSelection(){
 const legend=$('legend');
 if(legend)legend.querySelectorAll('[data-allocation-category]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.allocationCategory===allocationSelectedCategory)));
 const dgroups=groups().filter(g=>(mode==='now'?g.value:g.capital)>0);const dtotal=dgroups.reduce((v,g)=>v+(mode==='now'?g.value:g.capital),0);renderInteractiveDonut(dgroups,dtotal);
 if(allocationSelectedCategory)allocationBreakdown(allocationSelectedCategory);
 else{const el=$('allocationDetail');if(el){el.classList.add('hidden');el.innerHTML=''}}
}
function selectAllocationCategory(category){
 if(!groups().some(g=>g.name===category)||!filter[category])return;
 allocationSelectedCategory=allocationSelectedCategory===category?null:category;
 updateAllocationSelection();
}
$('legend').addEventListener('click',e=>{const b=e.target.closest('[data-allocation-category]');if(b)selectAllocationCategory(b.dataset.allocationCategory)});
$('donut').setAttribute('role','group');
$('donut').setAttribute('tabindex','0');
$('donut').setAttribute('aria-label','Grafico di allocazione interattivo: trascina per ruotare, tocca una fetta per visualizzare i titoli');
function donutAngleAt(e){const r=$('donut').getBoundingClientRect();return Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2)*180/Math.PI}
$('donut').addEventListener('touchmove',e=>{if(e.cancelable)e.preventDefault()},{passive:false});
$('donut').addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;donutGesture={id:e.pointerId,startX:e.clientX,startY:e.clientY,lastAngle:donutAngleAt(e),moved:false};donutSuppressClick=false;try{$('donut').setPointerCapture(e.pointerId)}catch(_){};});
$('donut').addEventListener('pointermove',e=>{const g=donutGesture;if(!g||g.id!==e.pointerId)return;if(Math.hypot(e.clientX-g.startX,e.clientY-g.startY)>7)g.moved=true;if(!g.moved)return;if(e.cancelable)e.preventDefault();const angle=donutAngleAt(e);let delta=angle-g.lastAngle;if(delta>180)delta-=360;if(delta< -180)delta+=360;donutRotationDeg=(donutRotationDeg+delta)%360;g.lastAngle=angle;$('donut').classList.add('is-dragging');$('donut').style.setProperty('--donut-rotation',donutRotationDeg+'deg');});
$('donut').addEventListener('pointerup',e=>{const g=donutGesture;if(!g||g.id!==e.pointerId)return;donutGesture=null;$('donut').classList.remove('is-dragging');if(!g.moved){const cat=donutCategoryAt(e.clientX,e.clientY);if(cat)selectAllocationCategory(cat)}donutSuppressClick=true;});
$('donut').addEventListener('pointercancel',()=>{donutGesture=null;$('donut').classList.remove('is-dragging')});
$('donut').addEventListener('click',e=>{if(donutSuppressClick){donutSuppressClick=false;return}const cat=donutCategoryAt(e.clientX,e.clientY);if(cat)selectAllocationCategory(cat)});
$('donut').addEventListener('keydown',e=>{if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft'&&e.key!=='Enter')return;e.preventDefault();if(e.key==='Enter'){const cats=groups().filter(g=>(mode==='now'?g.value:g.capital)>0);if(cats.length)selectAllocationCategory(cats[0].name);return}donutRotationDeg=(donutRotationDeg+(e.key==='ArrowRight'?15:-15))%360;$('donut').style.setProperty('--donut-rotation',donutRotationDeg+'deg');});

let facePanelOpen=false;
function renderFacePanel(){const box=$('faceAnalysis');if(!facePanelOpen){box.classList.add('hidden');$('faceButton').setAttribute('aria-expanded','false');return}const c=totalCapital(),v=totalValue(),gain=v-c,ratio=c?gain/c:0;const g=groups().sort((a,b)=>(b.value-b.capital)-(a.value-a.capital));const status=ratio>0.02?'Positiva':ratio<-.02?'Negativa':'Stabile';box.classList.remove('hidden');$('faceButton').setAttribute('aria-expanded','true');box.innerHTML='<h3>Performance '+status.toLowerCase()+'</h3><p class="hint">Il colore deriva dal rendimento lordo del patrimonio selezionato, non da un segnale di acquisto o vendita.</p><div class="face-line"><span>Rendimento totale</span><strong class="'+(gain>=0?'gain':'loss')+'">'+(gain>=0?'+':'')+eur(gain)+' · '+(ratio>=0?'+':'')+pct(ratio)+'</strong></div>'+g.map(x=>'<div class="face-line"><span>'+x.name+'</span><strong class="'+(x.value>=x.capital?'gain':'loss')+'">'+(x.value>=x.capital?'+':'')+eur(x.value-x.capital)+'</strong></div>').join('');}
$('faceButton').onclick=()=>{
 const face=$('faceButton');
 face.classList.remove('touch','finn-waving');void face.offsetWidth;
 // A tap gently wakes Finn (open eyes) even when the market is closed.
 if(finnMarketClosed||finnCurrentEmotion(mascotMood||'neutral',currentMascotEmotion(mascotMood||'neutral'))==='sleeping'||finnCurrentEmotion(mascotMood||'neutral',currentMascotEmotion(mascotMood||'neutral'))==='dozing'){
  finnSceneStart('awake','hopeful',2600);
 }
 if(invesquoActiveView==='dashboard'){
  // In Home Finn opens only the existing performance panel: no greeting toast.
  facePanelOpen=!facePanelOpen;
  face.classList.add('touch');
  renderFacePanel();
 }else{
  // In other app sections Finn greets the user without opening the performance panel.
  facePanelOpen=false;
  renderFacePanel();
  face.classList.add('finn-waving');
  showFinnGreeting();
 }
};
const MASCOT_EXPRESSIONS={neutral:['thinking','neutral','calm'],positive:['satisfied','positive','celebrate'],negative:['angry','sad','crying']};
const MASCOT_LABELS={concerned:'preoccupato',scared:'spaventato',sweating:'suda',radar:'investigatore',thinking:'pensierosa',neutral:'neutra',calm:'tranquilla',satisfied:'soddisfatta',positive:'positiva',celebrate:'festeggia',angry:'arrabbiata',sad:'triste',crying:'piange',sleeping:'addormentato',waking:'si sveglia',dozing:'si addormenta',praying:'in attesa di Wall Street',doubtful:'dubbioso',hopeful:'speranzoso',anxious:'angosciato',watching:'controlla l’orologio aspettando Wall Street'};
let mascotMood=null,mascotIndex=0;
let finnMarketClosed=false;
function currentMascotEmotion(mood){return MASCOT_EXPRESSIONS[mood][mascotIndex%3]}
let finnScene=null,finnSceneTimer=null,finnSceneTick=null,finnSceneToken=0;
let finnMarketSample=null,finnAppWasVisible=(document.visibilityState==='visible');
let finnUSSample=null,finnScenePlayed=new Set();
function finnHomeTone(){const b=document.body;return b.classList.contains('fh-home-active')&&b.dataset.marketColorScope!=='off'?(b.dataset.favoriteTint||'neutral'):'neutral'}
function finnIsClosedTone(tone){return tone==='weekend'||(/^closed-/.test(tone||''));}
function finnCurrentEmotion(mood,fallback){if(document.body.classList.contains('fh-radar-active'))return 'radar';const tone=finnHomeTone();if(finnIsClosedTone(tone))return Math.floor(Date.now()/6000)%8===7?'thinking':'sleeping';if(tone==='down')return ['concerned','scared','sweating'][mascotIndex%3];if(tone==='up')return ['positive','celebrate','satisfied'][mascotIndex%3];return finnScene?finnScene.emotion:(finnMarketClosed?'sleeping':fallback)}
function finnSceneClass(){return ['up','down'].includes(finnHomeTone())||finnIsClosedTone(finnHomeTone())?'':finnScene?' finn-scene finn-scene-'+finnScene.type:''}
function finnUpdateFigure(){
 const face=$('performanceFace');if(!face)return;
 const mood=mascotMood||'neutral',emotion=finnCurrentEmotion(mood,currentMascotEmotion(mood));
 face.innerHTML=mascotSVG(mood,prefs.colors[mood]||PREF_DEFAULTS.colors[mood],false,emotion);
 face.className='performance-face '+mood+(emotion==='sleeping'?' sleeping':'')+' expression-'+emotion+finnSceneClass();
 face.setAttribute('aria-label','Finn: '+(MASCOT_LABELS[emotion]||emotion));
 face.title=face.getAttribute('aria-label');
 const playground=$('mascotPlayArt');
 // Mirror the scene in the interactive mascot area without interfering with its local controls.
 if(playground&&finnScene&&!mascotPreviewScene){const chosen=mascotPlayChosenEmotion;mascotPlayChosenEmotion=emotion;mascotPlayRender();mascotPlayChosenEmotion=chosen;playground.classList.add('finn-scene','finn-scene-'+finnScene.type)}
 else if(playground){if(!mascotPreviewScene)playground.classList.remove('finn-scene','finn-scene-awake','finn-scene-doze','finn-scene-party','finn-scene-tears','finn-scene-prayer','finn-scene-anticipation');mascotPlayRender()}
}
function finnSceneStart(type,emotion,ms,followUp){
 if(prefs.motion==='off'||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){if(followUp)followUp();else{finnScene=null;finnUpdateFigure()}return;}
 clearTimeout(finnSceneTimer);const token=++finnSceneToken;
 finnScene={type,emotion};finnUpdateFigure();
 finnSceneTimer=setTimeout(()=>{if(token!==finnSceneToken)return;finnScene=null;finnUpdateFigure();if(followUp)followUp()},ms);
}
const FINN_STORE_COSTUMES=[
{id:'none',name:'Look classico',emoji:'✨',group:'Base'},
{id:'cap',name:'Cappellino',emoji:'🧢',group:'Sport'},
{id:'crown',name:'Corona',emoji:'👑',group:'Fantasy'},
{id:'cowboy',name:'Cowboy',emoji:'🤠',group:'Mestieri'},
{id:'wizard',name:'Mago',emoji:'🧙',group:'Fantasy'},
{id:'scarf',name:'Sciarpa',emoji:'🧣',group:'Stagioni'},
{id:'beanie',name:'Berretto invernale',emoji:'❄️',group:'Stagioni'},
{id:'santa',name:'Babbo Natale',emoji:'🎅',group:'Stagioni'},
{id:'pirate',name:'Pirata',emoji:'🏴‍☠️',group:'Fantasy'},
{id:'astronaut',name:'Astronauta',emoji:'🚀',group:'Mestieri'},
{id:'chef',name:'Chef',emoji:'👨‍🍳',group:'Mestieri'},
{id:'graduate',name:'Laureato',emoji:'🎓',group:'Mestieri'},
{id:'detective',name:'Detective',emoji:'🕵️',group:'Mestieri'},
{id:'viking',name:'Vichingo',emoji:'⚔️',group:'Fantasy'},
{id:'knight',name:'Cavaliere',emoji:'🛡️',group:'Fantasy'},
{id:'ninja',name:'Ninja',emoji:'🥷',group:'Fantasy'},
{id:'sailor',name:'Marinaio',emoji:'⚓',group:'Mestieri'},
{id:'surfer',name:'Surfista',emoji:'🏄',group:'Sport'},
{id:'cyclist',name:'Ciclista',emoji:'🚴',group:'Sport'},
{id:'football',name:'Calciatore',emoji:'⚽',group:'Sport'},
{id:'pilot',name:'Pilota',emoji:'✈️',group:'Mestieri'},
{id:'gardener',name:'Giardiniere',emoji:'🌱',group:'Mestieri'},
{id:'party',name:'Festa',emoji:'🥳',group:'Eventi'},
{id:'pumpkin',name:'Halloween',emoji:'🎃',group:'Stagioni'},
{id:'bunny',name:'Coniglietto',emoji:'🐰',group:'Eventi'},
{id:'flower',name:'Primavera',emoji:'🌸',group:'Stagioni'},
{id:'summer',name:'Estate',emoji:'☀️',group:'Stagioni'},
{id:'winter',name:'Neve',emoji:'⛄',group:'Stagioni'},
{id:'royal',name:'Principino',emoji:'💎',group:'Fantasy'},
{id:'robot',name:'Cyber Finn',emoji:'🤖',group:'Fantasy'},
{id:'beret',name:'Artista',emoji:'🎨',group:'Mestieri'},
{id:'fedora',name:'Jazz',emoji:'🎷',group:'Eventi'}
];
const FINN_STORE_GADGETS=[
{id:'none',name:'Nessuno',emoji:'✨',group:'Base'},
{id:'glasses',name:'Occhiali da sole',emoji:'🕶️',group:'Accessori'},
{id:'bowtie',name:'Papillon',emoji:'🎀',group:'Accessori'},
{id:'coffee',name:'Caffè',emoji:'☕',group:'Oggetti'},
{id:'star',name:'Stella',emoji:'⭐',group:'Effetti'},
{id:'headset',name:'Cuffie',emoji:'🎧',group:'Tecnologia'},
{id:'monocle',name:'Monocolo',emoji:'🧐',group:'Accessori'},
{id:'reading',name:'Occhiali da lettura',emoji:'👓',group:'Accessori'},
{id:'tie',name:'Cravatta',emoji:'👔',group:'Accessori'},
{id:'medal',name:'Medaglia',emoji:'🏅',group:'Accessori'},
{id:'diamond',name:'Diamante',emoji:'💎',group:'Effetti'},
{id:'heart',name:'Cuore',emoji:'❤️',group:'Effetti'},
{id:'sparkles',name:'Scintille',emoji:'✨',group:'Effetti'},
{id:'music',name:'Note musicali',emoji:'🎵',group:'Effetti'},
{id:'book',name:'Libro',emoji:'📖',group:'Oggetti'},
{id:'phone',name:'Smartphone',emoji:'📱',group:'Tecnologia'},
{id:'laptop',name:'Laptop',emoji:'💻',group:'Tecnologia'},
{id:'controller',name:'Controller',emoji:'🎮',group:'Tecnologia'},
{id:'camera',name:'Fotocamera',emoji:'📷',group:'Tecnologia'},
{id:'umbrella',name:'Ombrello',emoji:'☂️',group:'Oggetti'},
{id:'icecream',name:'Gelato',emoji:'🍦',group:'Oggetti'},
{id:'pizza',name:'Pizza',emoji:'🍕',group:'Oggetti'},
{id:'flowerpot',name:'Pianta',emoji:'🪴',group:'Oggetti'},
{id:'trophy',name:'Trofeo',emoji:'🏆',group:'Oggetti'},
{id:'shield',name:'Scudo',emoji:'🛡️',group:'Oggetti'},
{id:'compass',name:'Bussola',emoji:'🧭',group:'Oggetti'},
{id:'coin',name:'Moneta',emoji:'🪙',group:'Oggetti'},
{id:'butterfly',name:'Farfalla',emoji:'🦋',group:'Effetti'},
{id:'balloon',name:'Palloncino',emoji:'🎈',group:'Eventi'},
{id:'gift',name:'Regalo',emoji:'🎁',group:'Eventi'},
{id:'confetti',name:'Coriandoli',emoji:'🎊',group:'Eventi'},
{id:'candy',name:'Caramella',emoji:'🍬',group:'Oggetti'},
{id:'santa_beard',name:'Barba di Babbo Natale',emoji:'🧔',group:'Accessori'}
];
function finnStoreDecorations(){
 const costume=FINN_STORE_COSTUMES.some(i=>i.id===prefs.finnStoreCostume)?prefs.finnStoreCostume:'none';
 const gadget=FINN_STORE_GADGETS.some(i=>i.id===prefs.finnStoreGadget)?prefs.finnStoreGadget:'none';
 const border='#10263c';
 const simpleHat=(color,trim=color)=>`<path d="M27 22Q29 3 50 3Q71 3 73 22Z" fill="${color}" stroke="${border}" stroke-width="2.8"/><path d="M26 23Q50 19 74 23" fill="none" stroke="${trim}" stroke-width="7"/>`;
 const brim=(color)=>`<path d="M19 22Q50 30 81 22" fill="none" stroke="${border}" stroke-width="8"/><path d="M19 22Q50 28 81 22" fill="none" stroke="${color}" stroke-width="5"/>`;
 const topHat=(color,accent)=>`<path d="M34 22V-3Q50 -8 66 -3V22Z" fill="${color}" stroke="${border}" stroke-width="3"/><path d="M34 16H66" stroke="${accent}" stroke-width="5"/>${brim(color)}`;
 const circle=(x,y,r,color)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="${border}" stroke-width="2"/>`;
 const hat={
 cap:'<path d="M28 22Q30 4 50 5Q69 6 72 22Z" fill="#f1bd40" stroke="#10263c" stroke-width="3"/><path d="M51 20Q75 14 83 20Q75 28 51 25" fill="#dca42c" stroke="#10263c" stroke-width="2.5"/>',
 crown:'<path d="M30 23L27 3L39 12L50 0L61 12L73 3L70 23Z" fill="#f9cd55" stroke="#10263c" stroke-width="2.5"/><circle cx="50" cy="15" r="3" fill="#ff618c"/>',
 cowboy:'<path d="M33 18L37 2Q50 10 63 2L67 18Z" fill="#9d673a" stroke="#10263c" stroke-width="2.8"/><path d="M16 19Q50 29 84 19" stroke="#10263c" stroke-width="8" fill="none"/><path d="M16 19Q50 27 84 19" stroke="#bc8955" stroke-width="5" fill="none"/>',
 wizard:'<path d="M33 23L51 -8L70 23Z" fill="#7757c9" stroke="#10263c" stroke-width="3"/><path d="M27 22Q50 16 75 22" fill="none" stroke="#dcbcfb" stroke-width="6"/><path d="M51 5l2 4l4 1l-4 3l-2 4l-3 -4l-4 -3l5 -1z" fill="#ffdc66"/>',
 scarf:'<path d="M31 75Q49 83 70 74" fill="none" stroke="#e66d83" stroke-width="9"/><path d="M58 78L66 103L77 100L71 77" fill="#e66d83" stroke="#10263c" stroke-width="2"/>',
 beanie:simpleHat('#5aa9e8','#2a6baf')+circle(50,1,6,'#f9d77c'),
 santa:'<path d="M29 17Q31 0 47 -3Q64 -7 72 6L78 9Q72 14 68 16Q49 10 29 19Z" fill="#d9414e" stroke="#10263c" stroke-width="2.6"/><rect x="28" y="14" width="44" height="9" rx="4.5" fill="#fff9f1" stroke="#10263c" stroke-width="1.8"/>'+circle(79,10,6.5,'#ffffff'),
 pirate:topHat('#273349','#edbd54')+'<path d="M44 8h12m-6 -6v12" stroke="#fafafa" stroke-width="3"/>',
 astronaut:simpleHat('#dce9f6','#acc9dd')+'<path d="M29 28Q50 11 71 28" stroke="#85bde8" stroke-width="6" fill="none"/>',
 chef:'<path d="M29 22V8Q22 -3 34 -7Q42 -14 50 -6Q61 -15 69 -6Q80 1 70 12V22Z" fill="#f9ffff" stroke="#10263c" stroke-width="3"/><rect x="29" y="16" width="42" height="9" rx="3" fill="#d6e8fa" stroke="#10263c" stroke-width="2"/>',
 graduate:'<path d="M17 10L50 -6L83 10L50 25Z" fill="#10263c" stroke="#f4d17d" stroke-width="2.5"/><path d="M30 18V24Q50 39 70 24V18" fill="none" stroke="#10263c" stroke-width="5"/><path d="M82 10V29" stroke="#f4d17d" stroke-width="2.5"/>',
 detective:topHat('#576777','#a7c7db'),
 viking:simpleHat('#bcbfc9','#9c7d51')+'<path d="M29 18Q10 9 18 -8Q22 5 35 7M71 18Q91 9 82 -8Q78 5 65 7" fill="#f1ebd5" stroke="#10263c" stroke-width="3"/>',
 knight:simpleHat('#acbbc9','#708aa4')+'<path d="M31 24H69" stroke="#10263c" stroke-width="4"/><path d="M50 4V-7" stroke="#ee5c66" stroke-width="5"/>',
 ninja:'<path d="M29 24Q29 -4 50 -4Q71 -4 71 24Z" fill="#273247" stroke="#10263c" stroke-width="3"/><path d="M30 21H70" stroke="#e94e69" stroke-width="6"/>',
 sailor:simpleHat('#f4faff','#25499e')+'<path d="M39 9h22" stroke="#25499e" stroke-width="3"/>',
 surfer:simpleHat('#f5bd5c','#ff6c78')+'<path d="M61 7q-7 7 -15 7" stroke="#2a7ba7" stroke-width="3" fill="none"/>',
 cyclist:simpleHat('#f34e5d','#f8d13d')+'<path d="M31 9H69" stroke="#fff" stroke-width="2"/>',
 football:simpleHat('#2bbb85','#f0f7fc')+'<path d="M47 3v13h6V3" fill="#fff"/>',
 pilot:simpleHat('#243c73','#f7cf58')+'<path d="M38 13H62" stroke="#ffc74e" stroke-width="3"/>',
 gardener:simpleHat('#3d9355','#cce592')+brim('#72a65c'),
 party:'<path d="M36 23L55 -12L69 23Z" fill="#ff6395" stroke="#10263c" stroke-width="3"/><path d="M44 12l15 -4" stroke="#ffd65b" stroke-width="5"/><circle cx="55" cy="-12" r="5" fill="#ffd65b"/>',
 pumpkin:simpleHat('#e88b34','#f0ba55')+'<path d="M47 -6V4" stroke="#419752" stroke-width="5"/>',
 bunny:'<path d="M34 21L32 -10Q42 -16 47 21M53 21L58 -10Q69 -15 67 21" fill="#fff2f6" stroke="#10263c" stroke-width="3"/>'+simpleHat('#f9dbe8','#f9dbe8'),
 flower:simpleHat('#ed89b5','#f6c7dc')+'<path d="M73 11q14 -15 17 2q-9 12 -17 -2" fill="#f5cb5a" stroke="#bb4e86" stroke-width="2"/>',
 summer:simpleHat('#efdc92','#f2ab58')+brim('#e9ca75'),
 winter:simpleHat('#e9f8ff','#8bd4ff')+circle(50,0,6,'#f8ffff'),
 royal:topHat('#603e9b','#f2c75d')+'<circle cx="50" cy="17" r="4" fill="#8fe8f1"/>',
 robot:simpleHat('#758da8','#44d6dc')+'<path d="M50 6V-8" stroke="#10263c" stroke-width="4"/>'+circle(50,-9,5,'#52f1d0'),
 beret:'<path d="M26 20Q23 -1 48 -3Q74 -1 76 20Z" fill="#bf3d52" stroke="#10263c" stroke-width="3"/><path d="M30 22H72" stroke="#10263c" stroke-width="5"/>',
 fedora:topHat('#315867','#e0ba71')
 };
 const props={
 glasses:'<path d="M32 44h15m6 0h15" stroke="#10263c" stroke-width="2"/><rect x="34" y="39" width="14" height="12" rx="4" fill="#10263c" opacity=".86"/><rect x="52" y="39" width="14" height="12" rx="4" fill="#10263c" opacity=".86"/>',
 bowtie:'<path d="M36 78L50 82L64 78L64 91L50 86L36 91Z" fill="#ef597e" stroke="#10263c" stroke-width="2"/><circle cx="50" cy="84" r="4" fill="#ffdd87"/>',
 coffee:'<path d="M81 67v18h14V67Z" fill="#fff6e8" stroke="#10263c" stroke-width="2"/><path d="M94 71h5v9h-5" fill="none" stroke="#10263c" stroke-width="2"/><path d="M85 64q-3 -5 0 -9m6 9q-3 -5 0 -9" stroke="#e3b887" fill="none" stroke-width="2"/>',
 star:'<path d="M87 13l4 9l10 1l-8 7l2 10l-8 -5l-9 5l3 -10l-7 -7l10 -1z" fill="#ffce4e" stroke="#10263c" stroke-width="2"/>',
 headset:'<path d="M27 52Q23 20 50 20Q77 20 73 52" fill="none" stroke="#10263c" stroke-width="5"/><rect x="23" y="42" width="9" height="17" rx="4" fill="#8eaaf8" stroke="#10263c" stroke-width="2"/><rect x="68" y="42" width="9" height="17" rx="4" fill="#8eaaf8" stroke="#10263c" stroke-width="2"/>',
 monocle:'<circle cx="58" cy="46" r="10" stroke="#b58538" stroke-width="3" fill="none"/><path d="M68 52Q80 65 69 77" fill="none" stroke="#b58538" stroke-width="2"/>',
 reading:'<rect x="32" y="40" width="16" height="12" rx="4" fill="#b9e5fd66" stroke="#10263c" stroke-width="2.5"/><rect x="52" y="40" width="16" height="12" rx="4" fill="#b9e5fd66" stroke="#10263c" stroke-width="2.5"/><path d="M48 45H52" stroke="#10263c" stroke-width="3"/>',
 tie:'<path d="M46 75L54 75L57 83L50 98L43 83Z" fill="#3a78cc" stroke="#10263c" stroke-width="2"/>',
 medal:'<path d="M42 73L50 83L58 73" stroke="#5b95cf" stroke-width="7" fill="none"/>'+circle(50,87,9,'#f6c647'),
 diamond:'<path d="M83 15L90 7L99 15L91 29Z" fill="#82e1f0" stroke="#10263c" stroke-width="2"/>',
 heart:'<path d="M86 20Q78 8 72 21Q71 29 86 39Q101 29 100 21Q95 8 86 20Z" fill="#ed5e86" stroke="#10263c" stroke-width="2"/>',
 sparkles:'<path d="M87 3l3 10l10 3l-10 3l-3 10l-3 -10l-10 -3l10 -3Z" fill="#f8d759"/>'+circle(76,33,3,'#8ae1eb'),
 music:'<path d="M83 20V5l13 -4v19" stroke="#7860b6" stroke-width="3" fill="none"/>'+circle(80,21,5,'#7860b6')+circle(93,21,5,'#7860b6'),
 book:'<path d="M78 64Q85 60 92 65V88Q86 83 78 87Z" fill="#fff6d3" stroke="#10263c" stroke-width="2"/><path d="M78 64Q70 60 64 65V88Q70 83 78 87" fill="#dbe9ff" stroke="#10263c" stroke-width="2"/>',
 phone:'<rect x="80" y="62" width="15" height="26" rx="3" fill="#243c59" stroke="#10263c" stroke-width="2"/><path d="M83 67H92V82H83Z" fill="#86dadd"/>',
 laptop:'<rect x="76" y="67" width="22" height="17" rx="2" fill="#91bcd3" stroke="#10263c" stroke-width="2"/><path d="M72 87h30" stroke="#10263c" stroke-width="5"/>',
 controller:'<path d="M74 72Q86 65 97 72l5 13q-2 8 -12 2l-5 -5l-6 5q-9 6 -11 -2Z" fill="#d4a9e2" stroke="#10263c" stroke-width="2"/><path d="M76 78h10m-5 -5v10" stroke="#10263c" stroke-width="2"/>',
 camera:'<rect x="77" y="67" width="24" height="18" rx="4" fill="#3c5974" stroke="#10263c" stroke-width="2"/>'+circle(89,76,6,'#91e0eb'),
 umbrella:'<path d="M78 44Q90 26 102 44Z" fill="#df6f98" stroke="#10263c" stroke-width="2"/><path d="M90 44V78q0 10 8 5" stroke="#10263c" stroke-width="3" fill="none"/>',
 icecream:'<path d="M81 68L97 68L89 94Z" fill="#d4a075" stroke="#10263c" stroke-width="2"/>'+circle(89,65,9,'#f6bdca'),
 pizza:'<path d="M77 67L100 70L87 94Z" fill="#f1cf74" stroke="#10263c" stroke-width="2"/>'+circle(88,76,3,'#e55b57'),
 flowerpot:'<path d="M82 78H97L94 94H85Z" fill="#c48a63" stroke="#10263c" stroke-width="2"/><path d="M90 80V61m0 9Q75 59 79 56Q89 55 90 70m0 -4Q101 51 103 58Q102 64 90 66" stroke="#4ea96a" stroke-width="4" fill="none"/>',
 trophy:'<path d="M82 65H98V78Q90 90 82 78Z" fill="#ebbd45" stroke="#10263c" stroke-width="2"/><path d="M82 69H76Q74 82 84 81M98 69h6Q106 82 96 81M90 86v8" stroke="#e3b248" stroke-width="3" fill="none"/>',
 shield:'<path d="M88 61L101 66L99 82Q93 93 88 95Q78 88 76 82L75 66Z" fill="#84b9e6" stroke="#10263c" stroke-width="2"/>',
 compass:circle(89,75,13,'#e7d2a2')+'<path d="M88 68L96 69L89 83L82 83Z" fill="#d7585a"/>',
 coin:circle(89,75,11,'#f3c35b')+'<path d="M89 67V83m-5 -13h9m-9 9h9" stroke="#a57922" stroke-width="2"/>',
 butterfly:'<path d="M88 24Q72 5 76 30Q88 35 88 24Q104 5 103 30Q88 35 88 24Z" fill="#d593e8" stroke="#10263c" stroke-width="2"/><path d="M88 22v18" stroke="#10263c" stroke-width="2"/>',
 balloon:circle(89,22,10,'#f37185')+'<path d="M89 32Q98 44 87 55" fill="none" stroke="#10263c" stroke-width="2"/>',
 gift:'<rect x="77" y="70" width="24" height="22" rx="3" fill="#e86d8c" stroke="#10263c" stroke-width="2"/><path d="M89 70v22M77 78h24" stroke="#ffdf81" stroke-width="4"/>',
 confetti:'<path d="M82 10l8 5m1 16l7 -5M75 30l-3 9M97 4l-3 6" stroke="#f8c65f" stroke-width="4" fill="none"/>',
 santa_beard:'<path d="M34 57Q31 67 38 77Q42 83 50 85Q58 83 62 77Q69 67 66 57Q62 61 58 61Q54 59 50 60Q46 59 42 61Q38 61 34 57Z" fill="#fffaf1" stroke="#10263c" stroke-width="2.1"/><path d="M39 59Q43 52 50 58Q57 52 61 59Q55 63 50 60Q45 63 39 59Z" fill="#ffffff" stroke="#d9e4ed" stroke-width="1"/><path d="M42 67Q46 72 49 76M58 67Q54 72 51 77" stroke="#d2dee7" stroke-width="1.8" fill="none"/>' ,
 candy:'<path d="M81 69L95 73L93 84L79 80Z" fill="#e990bf" stroke="#10263c" stroke-width="2"/><path d="M80 69l-8 -5l-3 10l10 6m15 -6l9 -4l4 11l-14 3" fill="#f9dc9c" stroke="#10263c" stroke-width="2"/>'
 };
 return {hat:hat[costume]||'',gadget:props[gadget]||''};
}
const FINN_STORE_GROUPS={costume:['Tutti','Base','Sport','Stagioni','Mestieri','Fantasy','Eventi'],gadget:['Tutti','Base','Accessori','Oggetti','Effetti','Tecnologia','Eventi']};
let finnStoreCurrentGroup={costume:'Tutti',gadget:'Tutti'};
let finnStoreTab='costume';
const FINN_STORE_PAGE_SIZE=8;
let finnStorePage={costume:0,gadget:0};
function finnStoreUnlocked(kind,id){
 return id==='none'||(kind==='costume'&&id===prefs.finnStoreCostume)||(kind==='gadget'&&id===prefs.finnStoreGadget)||!!(prefs.finnStoreUnlocked?.[kind]?.includes(id));
}
function renderFinnStore(){
 const categories=kind=>FINN_STORE_GROUPS[kind].map(g=>`<button type="button" class="finn-store-filter${finnStoreCurrentGroup[kind]===g?' active':''}" data-finn-store-filter="${kind}" data-finn-store-group="${g}" aria-pressed="${finnStoreCurrentGroup[kind]===g}">${g}</button>`).join('');
 const costumes=document.getElementById('finnStoreCostumes'),gadgets=document.getElementById('finnStoreGadgets');
 if(!costumes||!gadgets)return;
 for(const tab of document.querySelectorAll('#finnStoreSettings [data-finn-store-tab]')){
  const active=tab.dataset.finnStoreTab===finnStoreTab;
  tab.classList.toggle('active',active);tab.setAttribute('aria-pressed',String(active));
 }
 for(const pane of document.querySelectorAll('#finnStoreSettings [data-finn-store-pane]'))pane.hidden=pane.dataset.finnStorePane!==finnStoreTab;
 for(const [kind,items,selected,gridId,filterId,pagesId] of [
  ['costume',FINN_STORE_COSTUMES,prefs.finnStoreCostume||'none','finnStoreCostumes','finnStoreCostumeFilters','finnStoreCostumePages'],
  ['gadget',FINN_STORE_GADGETS,prefs.finnStoreGadget||'none','finnStoreGadgets','finnStoreGadgetFilters','finnStoreGadgetPages']]){
  const group=finnStoreCurrentGroup[kind];
  const matching=items.filter(item=>group==='Tutti'||item.group===group);
  const pages=Math.max(1,Math.ceil(matching.length/FINN_STORE_PAGE_SIZE));
  finnStorePage[kind]=Math.max(0,Math.min(finnStorePage[kind],pages-1));
  const offset=finnStorePage[kind]*FINN_STORE_PAGE_SIZE;
  const visible=matching.slice(offset,offset+FINN_STORE_PAGE_SIZE);
  const grid=document.getElementById(gridId),filters=document.getElementById(filterId),pager=document.getElementById(pagesId);
  if(filters)filters.innerHTML=categories(kind);
  if(grid)grid.innerHTML=visible.map(item=>{
   const unlocked=finnStoreUnlocked(kind,item.id),equipped=item.id===selected;
   return `<button type="button" class="finn-store-item" data-finn-store-kind="${kind}" data-finn-store-id="${item.id}" aria-pressed="${equipped}" aria-label="${item.name}: ${equipped?'equipaggiato':unlocked?'equipaggia':'sblocca ed equipaggia gratis'}"><span class="finn-store-emoji">${item.emoji}</span><strong>${item.name}</strong><span class="finn-store-equip">${equipped?'✓ Indossato':unlocked?'Equipaggia':'🔓 Gratis'}</span></button>`;
  }).join('');
  if(pager)pager.innerHTML=pages>1?`<button type="button" data-finn-store-page="${kind}" data-finn-store-step="-1" ${finnStorePage[kind]===0?'disabled':''} aria-label="Pagina precedente">‹</button><span>${finnStorePage[kind]+1} / ${pages} · ${matching.length} oggetti</span><button type="button" data-finn-store-page="${kind}" data-finn-store-step="1" ${finnStorePage[kind]>=pages-1?'disabled':''} aria-label="Pagina successiva">›</button>`:`<span>${matching.length} oggetti</span>`;
 }
 const preview=document.getElementById('finnStorePreview');if(preview)preview.innerHTML=mascotSVG('positive',prefs.colors?.positive||'#5cdda4',false,'positive');
 const label=document.getElementById('finnStoreEquipped');if(label)label.textContent=[FINN_STORE_COSTUMES.find(i=>i.id===(prefs.finnStoreCostume||'none'))?.name,FINN_STORE_GADGETS.find(i=>i.id===(prefs.finnStoreGadget||'none'))?.name].filter(x=>x&&x!=='Nessuno').join(' · ')||'Nessun oggetto equipaggiato';
}
document.getElementById('finnStoreSettings')?.addEventListener('click',e=>{
 const tab=e.target.closest('button[data-finn-store-tab]');
 if(tab){finnStoreTab=tab.dataset.finnStoreTab;renderFinnStore();return;}
 const filter=e.target.closest('button[data-finn-store-filter]');
 if(filter){const kind=filter.dataset.finnStoreFilter;finnStoreCurrentGroup[kind]=filter.dataset.finnStoreGroup;finnStorePage[kind]=0;renderFinnStore();return;}
 const page=e.target.closest('button[data-finn-store-page]');
 if(page){const kind=page.dataset.finnStorePage;finnStorePage[kind]=Math.max(0,finnStorePage[kind]+Number(page.dataset.finnStoreStep));renderFinnStore();return;}
 const btn=e.target.closest('button[data-finn-store-kind]');if(!btn)return;
 const kind=btn.dataset.finnStoreKind,id=btn.dataset.finnStoreId;
 if(kind==='costume'&&!FINN_STORE_COSTUMES.some(x=>x.id===id))return;
 if(kind==='gadget'&&!FINN_STORE_GADGETS.some(x=>x.id===id))return;
 if(!finnStoreUnlocked(kind,id)){
  if(!prefs.finnStoreUnlocked||typeof prefs.finnStoreUnlocked!=='object')prefs.finnStoreUnlocked={costume:[],gadget:[]};
  if(!Array.isArray(prefs.finnStoreUnlocked[kind]))prefs.finnStoreUnlocked[kind]=[];
  if(!prefs.finnStoreUnlocked[kind].includes(id))prefs.finnStoreUnlocked[kind].push(id);
 }
 // Sblocco ed equipaggiamento insieme: un solo tocco per entrambi.
 prefs[kind==='costume'?'finnStoreCostume':'finnStoreGadget']=id;
 savePreferences();renderFinnStore();mascotPlayRender();finnUpdateFigure();
});
function mascotSVG(mood,color,alertMode=false,emotionOverride){
 const emotion=emotionOverride||(alertMode?'concerned':currentMascotEmotion(mood));
 const safe=/^#[0-9a-fA-F]{6}$/.test(color||'')?color:(mood==='negative'?'#ef4444':mood==='neutral'?'#a7f3d0':'#22c55e');
 const dark='#10263c',white='#f5fcff';
 let eyeA='<ellipse class="eye-blink" cx="42" cy="47" rx="4" ry="5.3" fill="'+dark+'"/><ellipse class="eye-blink" cx="58" cy="47" rx="4" ry="5.3" fill="'+dark+'"/>';
 let eyebrows='',mouth='',extras='',rightArm='',leftArm='';
 if(emotion==='radar'){eyeA='<ellipse class="mr-squint" cx="42" cy="47" rx="4" ry="5.3" fill="'+dark+'"/><ellipse cx="58" cy="47" rx="4.8" ry="5.8" fill="'+dark+'"/>'; eyebrows='<path d="M36 39Q42 35 47 39M53 38Q58 34 64 38"/>'; mouth='<path d="M43 64Q50 70 57 64"/>'; extras='<g class="mr-lens" stroke="#d6b96c" stroke-width="3" fill="none"><circle cx="75" cy="53" r="10" fill="#a8d9ff44"/><path d="M82 61l9 11" stroke-linecap="round"/></g>'; }else if(emotion==='waking'){
  eyeA='<path d="M37 47 Q42 53 47 47 M53 47 Q58 53 63 47" fill="none" stroke="'+dark+'" stroke-width="3.2" stroke-linecap="round"/>';
  eyebrows='<path d="M37 37 Q42 35 47 37 M53 37 Q58 35 63 37"/>';
  mouth='<ellipse cx="50" cy="65" rx="4" ry="5.5" fill="'+dark+'" stroke="none"/>';
  extras='<path d="M78 18l6 -6M80 27h8" fill="none" stroke="#f8d779" stroke-width="3" stroke-linecap="round"/>';
 }else if(emotion==='dozing'){
  eyeA='<path d="M37 48q5 5 10 0M53 48q5 5 10 0" fill="none" stroke="'+dark+'" stroke-width="3" stroke-linecap="round"/>';
  eyebrows='<path d="M37 39h10 M53 39h10"/>';
  mouth='<path d="M46 63q4 3 8 0"/>';
  extras='<path d="M78 20h7l-7 8h7" fill="none" stroke="#c8eaff" stroke-width="2" stroke-linecap="round"/>';
 }else if(emotion==='doubtful'){
  eyebrows='<path d="M36 38Q42 33 47 39M53 38Q59 37 64 34"/>';
  mouth='<path d="M43 64Q51 61 57 65"/>';
  extras='<path d="M77 27q7 -9 12 0m-10 -11q5 -2 8 2" fill="none" stroke="#a9d8f2" stroke-width="2.3" stroke-linecap="round"/>';
 }else if(emotion==='hopeful'){
  eyebrows='<path d="M36 38Q42 34 47 37M53 37Q58 34 64 38"/>';
  eyeA='<ellipse cx="42" cy="46" rx="4.5" ry="5.7" fill="'+dark+'"/><ellipse cx="58" cy="46" rx="4.5" ry="5.7" fill="'+dark+'"/>';
  mouth='<path d="M42 62Q50 71 58 62"/>';
  extras='<path d="M79 20l4 -5m0 12l6 -2" fill="none" stroke="#f8d779" stroke-width="2.8" stroke-linecap="round"/>';
 }else if(emotion==='anxious'){
  eyebrows='<path d="M36 39Q41 32 47 39M53 39Q59 32 64 39"/>';
  eyeA='<ellipse cx="42" cy="47" rx="5" ry="6" fill="'+dark+'"/><ellipse cx="58" cy="47" rx="5" ry="6" fill="'+dark+'"/>';
  mouth='<ellipse cx="50" cy="65" rx="4.5" ry="6" fill="'+dark+'" stroke="none"/>';
  extras='<path d="M77 28q-5 8 0 11q6 1 0 -11" fill="#64c8f6"/>';
 }else if(emotion==='watching'){
  eyebrows='<path d="M36 36Q42 34 47 37M53 37Q58 34 64 35"/>';
  eyeA='<ellipse cx="44" cy="47" rx="3.4" ry="4.8" fill="'+dark+'"/><ellipse cx="60" cy="47" rx="3.4" ry="4.8" fill="'+dark+'"/>';
  mouth='<path d="M45 65q5 3 10 0"/>';
  // His wristwatch is actually attached to his raised arm, not a free-floating clock.
  extras='<circle cx="85" cy="42" r="10" fill="#f6fafc" stroke="'+dark+'" stroke-width="2.5"/><path d="M85 35v8l4 2" stroke="'+dark+'" stroke-width="2" stroke-linecap="round" fill="none"/><circle cx="85" cy="42" r="1.3" fill="'+dark+'"/>';
 }else if(emotion==='praying'){
  eyebrows='<path d="M37 37 Q41 32 47 38 M53 38 Q59 32 63 37"/>';
  eyeA='<ellipse cx="42" cy="47" rx="4" ry="5.3" fill="'+dark+'"/><ellipse cx="58" cy="47" rx="4" ry="5.3" fill="'+dark+'"/>';
  mouth='<path d="M44 66 Q50 59 56 66"/>';
  extras='<path d="M76 28q8 -13 8 1q-1 5 -6 7" fill="none" stroke="#86cfff" stroke-width="3" stroke-linecap="round"/><path d="M79 17q4 -4 8 0" fill="none" stroke="#f8d779" stroke-width="2.5" stroke-linecap="round"/>';
 }else if(emotion==='sleeping'){
  eyeA='<path d="M37 48 Q42 53 47 48 M53 48 Q58 53 63 48" fill="none" stroke="'+dark+'" stroke-width="3.2" stroke-linecap="round"/>';
  eyebrows='<path d="M37 38 Q42 40 47 38 M53 38 Q58 40 63 38"/>';
  mouth='<path d="M45 63 Q50 67 55 63"/>';
  extras='<g class="finn-zzz" fill="#c8eaff" font-family="Montserrat,system-ui,sans-serif" font-weight="800" text-anchor="middle"><text class="finn-z finn-z-one" x="78" y="37" font-size="12">'+(finnIsClosedTone(finnHomeTone())?'€':'Z')+'</text><text class="finn-z finn-z-two" x="85" y="27" font-size="10">'+(finnIsClosedTone(finnHomeTone())?'$':'Z')+'</text><text class="finn-z finn-z-three" x="91" y="17" font-size="8">'+(finnIsClosedTone(finnHomeTone())?'¥':'Z')+'</text></g>';
 }else if(emotion==='thinking'){
  eyebrows='<path d="M37 37 Q42 35 47 37"/><path d="M53 37 Q58 35 63 37"/>';
  mouth='<path d="M44 62q6 -2 12 1"/>';
  // Keep decorative thought marks away from the forehead: the old circle at (68,23)
  // crossed the candle outline and looked like a malformed eyebrow/horn.
  extras=finnIsClosedTone(finnHomeTone())?'<g class="finn-zzz" fill="#f9d98d" font-family="Montserrat,system-ui,sans-serif" font-weight="800" text-anchor="middle"><text class="finn-z finn-z-one" x="82" y="28" font-size="11">€</text><text class="finn-z finn-z-two" x="89" y="17" font-size="9">$</text></g>':'';
 }else if(emotion==='neutral'){
  eyebrows='<path d="M37 37 H47 M53 37 H63"/>';mouth='<path d="M43 62h14"/>';
 }else if(emotion==='calm'){
  eyeA='<path class="eye-blink" d="M37 47q5 5 10 0M53 47q5 5 10 0" fill="none" stroke="'+dark+'" stroke-width="3" stroke-linecap="round"/>';
  eyebrows='<path d="M37 37 Q42 35 47 37 M53 37 Q58 35 63 37"/>';mouth='<path d="M42 61q8 8 16 0"/>';
 }else if(emotion==='satisfied'){
  eyeA='<path class="eye-blink" d="M36 47q6 7 12 0M52 47q6 7 12 0" fill="none" stroke="'+dark+'" stroke-width="3.3" stroke-linecap="round"/>';
  eyebrows='<path d="M37 37 Q42 33.5 47 37 M53 37 Q58 33.5 63 37"/>';mouth='<path d="M40 61q10 12 20 0"/>';
 }else if(emotion==='positive'){
  eyebrows='<path d="M37 37 Q42 33 47 37 M53 37 Q58 33 63 37"/>';
  mouth='<path d="M40 60q10 13 20 0" fill="none" stroke="'+dark+'" stroke-width="3.3" stroke-linecap="round"/>';
 }else if(emotion==='celebrate'){
  eyebrows='<path d="M37 36 Q42 32 47 36 M53 36 Q58 32 63 36"/>';
  mouth='<path d="M39 60q11 15 22 0" fill="none" stroke="'+dark+'" stroke-width="3.5" stroke-linecap="round"/>';
  extras='<path d="M19 21l-5 -5M76 19l5 -7M78 29l8 -2" stroke="#f8d779" stroke-width="3.2" stroke-linecap="round"/>';
 }else if(emotion==='concerned'){
  eyebrows='<path d="M37 37 L47 39 M63 37 L53 39"/>';
  mouth='<path d="M41 68 Q50 59 59 68"/>';
  extras='';
 }else if(emotion==='scared'){
  eyeA='<ellipse cx="42" cy="47" rx="5.6" ry="7.1" fill="'+white+'"/><ellipse cx="58" cy="47" rx="5.6" ry="7.1" fill="'+white+'"/><circle cx="42" cy="47" r="3" fill="'+dark+'"/><circle cx="58" cy="47" r="3" fill="'+dark+'"/>';
  eyebrows='<path d="M36 36Q42 29 47 35M53 35Q58 29 64 36"/>';mouth='<ellipse cx="50" cy="65" rx="5" ry="7" fill="'+dark+'" stroke="none"/>';
 }else if(emotion==='sweating'){
  eyebrows='<path d="M36 39Q42 33 47 36M53 36Q58 33 64 39"/>';mouth='<path d="M42 68Q50 59 58 68"/>';
  extras='<g fill="#64c8f6"><path class="fh-sweat" d="M78 26q-7 10 0 13q7-3 0-13z"/><path class="fh-sweat fh-sweat-two" d="M85 43q-5 8 0 10q5-2 0-10z"/></g>';
 }else if(emotion==='angry'){
  eyebrows='<path d="M37 36 L47 40 M63 36 L53 40"/>';
  mouth='<path d="M40 69q10 -13 20 0"/>';
  extras='';
 }else if(emotion==='sad'){
  eyebrows='<path d="M37 39 Q42 34 47 37 M53 37 Q58 34 63 39"/>';
  mouth='<path d="M40 69q10 -12 20 0"/>';
  extras='<path d="M36 55q4 2 7 0M57 55q4 2 7 0" stroke="#236388" stroke-width="1.7"/>';
 }else if(emotion==='crying'){
  eyebrows='<path d="M37 39 Q42 34 47 37 M53 37 Q58 34 63 39"/>';
  mouth='<ellipse cx="50" cy="66" rx="6" ry="8" fill="'+dark+'" stroke="'+dark+'" stroke-width="2"/>';
  extras='<path class="tear" d="M35 54q-9 13 0 13q9 0 0 -13z" fill="#64c8f6"/><path class="tear" d="M65 54q-9 13 0 13q9 0 0 -13z" fill="#64c8f6"/>';
 }
 // Guard against unsupported emotion labels accidentally clearing the mouth.
 if(!mouth)mouth='<path d="M40 60q10 13 20 0"/>';
 // Curled arms with round mitten-like hands; in the celebration state both arms lift.
 const cheer=emotion==='celebrate';
 leftArm=cheer?'<path d="M30 58Q13 51 16 32"/><circle cx="16" cy="31" r="5.2" fill="'+white+'"/>':'<path d="M30 60Q13 58 16 76"/><circle cx="16" cy="76" r="5.2" fill="'+white+'"/>';
 rightArm=cheer?'<path d="M70 58Q87 45 84 27"/><circle cx="84" cy="27" r="5.2" fill="'+white+'"/>':'<path d="M70 60Q87 58 84 76"/><circle cx="84" cy="76" r="5.2" fill="'+white+'"/>';
 if(emotion==='scared'){leftArm='<path d="M30 60Q16 48 15 43"/><circle cx="15" cy="43" r="5.2" fill="'+white+'"/>';rightArm='<path d="M70 60Q84 48 85 43"/><circle cx="85" cy="43" r="5.2" fill="'+white+'"/>';}
 if(emotion==='watching'){rightArm='<path d="M70 60Q80 58 85 42"/><circle cx="85" cy="42" r="6" fill="'+white+'"/>'; }
 if(emotion==='praying'){leftArm='<path d="M30 62Q37 66 47 67"/><circle cx="47" cy="67" r="5" fill="'+white+'"/>';rightArm='<path d="M70 62Q63 66 53 67"/><circle cx="53" cy="67" r="5" fill="'+white+'"/>'; }
 const finnStoreWear=finnStoreDecorations();
 const santaHat=false&&prefs.finnStoreCostume!=='santa'?'<g class="finn-santa-hat"><path d="M29 18Q39 -3 56 2Q69 5 73 14L82 18Q76 21 70 20Q49 12 30 23Z" fill="#c9223c" stroke="'+dark+'" stroke-width="2.8" stroke-linejoin="round"/><rect x="27" y="15" width="47" height="9" rx="4.5" fill="#fff9f0" stroke="'+dark+'" stroke-width="2"/><circle cx="82" cy="18" r="6.5" fill="#fff9f0" stroke="'+dark+'" stroke-width="2"/><path d="M37 12Q45 4 55 6" stroke="#ff8291" stroke-width="2.7" fill="none" stroke-linecap="round"/></g>':'',holidayTrim=false?'<g class="finn-holly"><circle cx="23" cy="24" r="3" fill="#be1f33"/><path d="M16 24q6 -8 11 0q-6 2 -11 0zm7 -8q8 3 4 10q-5 -2 -4 -10z" fill="#1f6b47" opacity=".9"/></g>':'';
 return `<svg viewBox="0 0 100 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g class="candle-character"><ellipse cx="50" cy="103" rx="29" ry="4" fill="#041428" opacity=".16"/>${holidayTrim}<g fill="none" stroke="${dark}" stroke-width="4.2" stroke-linecap="round"><g class="finn-left-arm">${leftArm}</g><g class="finn-right-arm">${rightArm}</g></g><path d="M50 12V5M50 91v10" stroke="${dark}" stroke-width="8" stroke-linecap="round"/><path d="M50 12V5M50 91v10" stroke="${safe}" stroke-width="4.6" stroke-linecap="round"/><rect x="29" y="13" width="42" height="78" rx="14" fill="${safe}" stroke="${dark}" stroke-width="4"/>${santaHat}${finnStoreWear.hat}<path d="M35 27q3 -8 10 -8" stroke="#fff" stroke-opacity=".38" stroke-width="5" stroke-linecap="round" fill="none"/><g class="mascot-brows" stroke="${dark}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">${eyebrows}</g><g class="mascot-mouth" stroke="${dark}" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round" fill="none">${mouth}</g>${eyeA}${extras}${finnStoreWear.gadget}</g></svg>`;
}

const VISIT_COUNTER_KEY='my_patrimonio_daily_opens_v1';
const VISIT_SUPPRESS_KEY='my_patrimonio_visit_alert_disabled_v1';

const PREF_KEY='invesquo_preferences_v50';
const PREF_DEFAULTS={weekendYellow:true,closedMarketColor:'gold',closedMarketCustom:'#245a49',marketColorScope:'home',marketColorBasis:'favorite',moodNeutral:1,moodPositive:2,moodExtreme:5,mainMarket:'MIL',newsSource:'yahoo',palette:'classic',mascotStyle:'rounded',showHeaderFinn:true,finnStoreCostume:'none',finnStoreGadget:'none',finnStoreUnlocked:{costume:[],gadget:[]},glow:true,theme:'dark',appearanceMode:'flat',categoryColors:{},motion:'lively',warnings:true,limit:4,privacy:false,refreshMinutes:1,historyDefault:'30',educationDetails:true,showQuoteTime:true,showLogos:true,showBackfill:true,favoriteEnabled:false,favoriteAssets:[],compact:false,autoOpenSettings:true,colors:{positive:'#09d66b',neutral:'#72e59d',negative:'#ef4444'}};
let prefs={...PREF_DEFAULTS,colors:{...PREF_DEFAULTS.colors}};
try{const x=JSON.parse(store.getItem(PREF_KEY));if(x&&typeof x==='object'){prefs={...prefs,...x,colors:{...PREF_DEFAULTS.colors,...(x.colors||{})}}}}catch(e){}
// Preserve legacy opt-out, but offer an accessible toggle to re-enable alerts.
try{if(store.getItem(VISIT_SUPPRESS_KEY)==='true')prefs.warnings=false}catch(e){}
if(prefs.colors.positive==='#22c55e')prefs.colors.positive='#09d66b';if(prefs.colors.neutral==='#9fe870')prefs.colors.neutral='#72e59d';
const validColor=v=>/^#[0-9a-fA-F]{6}$/.test(v);
function renderCategoryColorSettings(){
 const host=$('settingCategoryColors');if(!host)return;
 const current=CAT.map(([cat,defaultColor])=>{const picked=prefs.categoryColors?.[cat];return {cat,color:validColor(picked)?picked:defaultColor}});
 if(!current.length)return;
 if(!host.dataset.dropdownReady){
  host.innerHTML='<div class="category-color-picker"><select id="settingCategoryColorChoice" aria-label="Categoria di investimento">'+current.map(({cat})=>'<option value="'+svgEscape(cat)+'">'+svgEscape(cat)+'</option>').join('')+'</select><label class="category-color-swatch" for="settingCategoryColorValue">Colore <input type="color" id="settingCategoryColorValue" data-category-color="'+svgEscape(current[0].cat)+'" aria-label="Colore della categoria selezionata"></label></div>';
  host.dataset.dropdownReady='true';
  host.querySelector('#settingCategoryColorChoice').addEventListener('change',()=>renderCategoryColorSettings());
 }
 const selector=host.querySelector('#settingCategoryColorChoice');
 const input=host.querySelector('#settingCategoryColorValue');
 if(!selector||!input)return;
 const active=current.find(c=>c.cat===selector.value)||current[0];
 input.dataset.categoryColor=active.cat;
 input.setAttribute('aria-label','Colore della categoria '+active.cat);
 if(document.activeElement!==input)input.value=active.color;
}

function effectiveTheme(){return prefs.theme==='system'?(window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):prefs.theme}
function applyPreferences(){
 const scope=['all','home','off'].includes(prefs.marketColorScope)?prefs.marketColorScope:'home';document.body.dataset.marketColorScope=scope;$('settingMarketColorScope').value=scope;const basisSetting=$('settingMarketColorBasis');if(basisSetting)basisSetting.value=prefs.marketColorBasis==='portfolio'?'portfolio':'favorite';const colorPicker=$('settingClosedMarketCustom');if(colorPicker)colorPicker.value=validColor(prefs.closedMarketCustom)?prefs.closedMarketCustom:'#245a49';const cmc=$('settingClosedMarketColor');if(cmc)cmc.value=['theme','gold','blue','plum','forest','custom'].includes(prefs.closedMarketColor)?prefs.closedMarketColor:(prefs.weekendYellow===false?'blue':'gold');
 renderCategoryColorSettings();document.body.dataset.theme=effectiveTheme();document.body.dataset.appearance=['glass','studio','moderno','fiducia','tradizionale','arcade','editorial'].includes(prefs.appearanceMode)?prefs.appearanceMode:'flat';const appearanceControl=$('settingAppearanceMode');if(appearanceControl)appearanceControl.value=document.body.dataset.appearance;document.body.classList.toggle('mascot-glow',prefs.glow!==false);document.body.dataset.mascotStyle=prefs.mascotStyle||'rounded';document.body.classList.toggle('finn-header-hidden',prefs.showHeaderFinn===false);const headerFinnCheck=$('settingShowHeaderFinn');if(headerFinnCheck)headerFinnCheck.checked=prefs.showHeaderFinn!==false;document.body.classList.toggle('motion-normal',prefs.motion==='normal');document.body.classList.toggle('motion-off',prefs.motion==='off');document.body.classList.toggle('privacy-on',!!prefs.privacy);document.body.classList.toggle('compact-cards',!!prefs.compact);/* Backup shortcut icon remains static; privacy setting is available in Impostazioni. */
 document.querySelector('meta[name="theme-color"]').content=effectiveTheme()==='light'?'#edf2f8':effectiveTheme()==='ocean'?'#091b2a':effectiveTheme()==='nero'?'#080b11':effectiveTheme()==='modern'?'#f3f5f7':effectiveTheme()==='aurora'?'#112531':effectiveTheme()==='sunset'?'#24151d':'#0b1426';
 $(`settingTheme`).value=prefs.theme;$(`settingMotion`).value=prefs.motion;$(`settingWarnings`).checked=prefs.warnings;$(`settingLimit`).value=String([4,6,10].includes(Number(prefs.limit))?prefs.limit:4);$(`settingPrivacy`).checked=!!prefs.privacy;$(`settingRefreshMinutes`).value=String([1,5,15,30].includes(Number(prefs.refreshMinutes))?prefs.refreshMinutes:1);$(`settingHistoryDefault`).value=prefs.historyDefault||'30';$(`settingShowQuoteTime`).checked=!!prefs.showQuoteTime;$(`settingWealthGraph`).checked=prefs.wealthGraph!==false;$(`settingShowLogos`).checked=prefs.showLogos!==false;$(`settingCompact`).checked=!!prefs.compact;$(`settingAutoOpenSettings`).checked=prefs.autoOpenSettings!==false;
 for(const [id,key] of [['settingMoodNeutral','moodNeutral'],['settingMoodPositive','moodPositive'],['settingMoodExtreme','moodExtreme']]){const field=$(id);if(field)field.value=String(prefs[key]??PREF_DEFAULTS[key]);} $('settingMarketNewsSource').value=prefs.newsSource==='investing'?'investing':'yahoo';$('settingPalette').value=prefs.palette||'classic';$('settingMascotStyle').value=prefs.mascotStyle||'rounded';$('settingGlow').checked=prefs.glow!==false;
 const visitMascot=$('visitMascot');if(visitMascot)visitMascot.innerHTML=mascotSVG('negative',prefs.colors.negative,true);
 updateVisitStatus();renderFinnStore();
}
// b.7.22: graph backfill visibility and favorite configuration
function syncBackfillVisibility(){const enabled=prefs.showBackfill!==false;document.querySelectorAll('.wealth-backfill-row,.history-rebuild-controls').forEach(x=>x.classList.toggle('hidden',!enabled));const check=$('settingShowBackfill');if(check)check.checked=enabled}
$('settingShowBackfill').addEventListener('change',e=>{prefs.showBackfill=e.target.checked;savePreferences();syncBackfillVisibility()});
// b.7.15 settings for historic reconstruction and quote-market filter
function updateHistoryAndSearchSettings(){
 const t=document.getElementById('settingShowReconstructed'),r=document.getElementById('settingSearchRegion');
 if(t)t.checked=prefs.showReconstructed!==false;
 if(r)r.value=prefs.searchRegion||'world';
}
document.getElementById('settingShowReconstructed').addEventListener('change',e=>{prefs.showReconstructed=e.target.checked;savePreferences();renderHistory();renderWealthGraph()});
document.getElementById('settingSearchRegion').addEventListener('change',e=>{prefs.searchRegion=e.target.value;savePreferences()});
updateHistoryAndSearchSettings();syncBackfillVisibility();
function savePreferences(){try{store.setItem(PREF_KEY,JSON.stringify(prefs));store.setItem(VISIT_SUPPRESS_KEY,String(!prefs.warnings));window.dispatchEvent(new Event('finholdra:changed'))}catch(e){}applyPreferences();render();$('settingsSaved').textContent='Preferenze salvate sul dispositivo.'}
function updateVisitStatus(){let n=0;try{const x=JSON.parse(store.getItem(VISIT_COUNTER_KEY));if(x&&x.date===getVisitDay())n=Number(x.count)||0}catch(e){}$('visitToday').textContent='Ingressi oggi: '+n}
$('settingMarketColorScope').onchange=e=>{prefs.marketColorScope=e.target.value;savePreferences()};$('settingMarketColorBasis').onchange=e=>{prefs.marketColorBasis=e.target.value==='portfolio'?'portfolio':'favorite';savePreferences();updateFavoriteHomeTint()};$('settingClosedMarketColor').onchange=e=>{prefs.closedMarketColor=['theme','gold','blue','plum','forest','custom'].includes(e.target.value)?e.target.value:'gold';prefs.weekendYellow=prefs.closedMarketColor==='gold';savePreferences();updateFavoriteHomeTint();finnUpdateFigure()};
$('settingClosedMarketCustom').oninput=e=>{if(!validColor(e.target.value))return;prefs.closedMarketCustom=e.target.value;prefs.closedMarketColor='custom';savePreferences();updateFavoriteHomeTint();finnUpdateFigure()};$('settingTheme').onchange=e=>{prefs.theme=e.target.value;savePreferences()};
$('settingAppearanceMode').onchange=e=>{prefs.appearanceMode=['flat','glass','studio','moderno','fiducia','tradizionale','arcade','editorial'].includes(e.target.value)?e.target.value:'flat';savePreferences()};
$('settingMarketNewsSource').onchange=e=>{prefs.newsSource=e.target.value==='investing'?'investing':'yahoo';savePreferences()};
$('settingCategoryColors').addEventListener('input',e=>{const control=e.target.closest('[data-category-color]');if(!control||!validColor(control.value))return;const category=control.dataset.categoryColor;if(!CAT.some(c=>c[0]===category))return;prefs.categoryColors={...(prefs.categoryColors||{}),[category]:control.value};savePreferences();});
$('settingCategoryColorsReset').onclick=()=>{prefs.categoryColors={};savePreferences()};
$('settingMotion').onchange=e=>{prefs.motion=e.target.value;savePreferences()};
$('settingWarnings').onchange=e=>{prefs.warnings=e.target.checked;savePreferences()};
$('settingLimit').onchange=e=>{prefs.limit=Number(e.target.value)||4;savePreferences()};
$('settingPrivacy').onchange=e=>{prefs.privacy=e.target.checked;savePreferences()};
$('privacyShortcut').onclick=()=>{
 const chooser=document.getElementById('fhBackupDestinationDialog');
 if(!chooser)return;
 if(typeof chooser.showModal==='function')chooser.showModal();
 else {chooser.setAttribute('open','');}
};
(function(){
 const chooser=document.getElementById('fhBackupDestinationDialog');if(!chooser)return;
 const close=()=>{if(chooser.open&&typeof chooser.close==='function')chooser.close();else chooser.removeAttribute('open')};
 document.getElementById('fhBackupCancelChoice').onclick=close;
 chooser.addEventListener('click',event=>{if(event.target===chooser)close()});
 document.getElementById('fhBackupLocalChoice').onclick=()=>{close();document.getElementById('backup')?.click()};
 document.getElementById('fhBackupDriveChoice').onclick=()=>{
  close();
  const driveButton=document.getElementById('fhDriveSave');
  if(!driveButton){alert('Backup Google Drive non ancora disponibile. Apri Impostazioni → Backup e sicurezza e verifica la connessione.');return}
  driveButton.click();
 };
})();
$('settingRefreshMinutes').onchange=e=>{prefs.refreshMinutes=Number(e.target.value)||1;savePreferences()};
$('settingMainMarket').onchange=e=>{prefs.mainMarket=e.target.value;savePreferences();updateMarketStatus()};
$('settingEduDetails').onchange=e=>{prefs.educationDetails=e.target.checked;savePreferences();renderEducation()};
$('settingOpenEducation').onclick=()=>invesquoShowView('education');
$('settingHistoryDefault').onchange=e=>{prefs.historyDefault=e.target.value;historyRange=prefs.historyDefault;document.querySelectorAll('#historyRanges button').forEach(b=>{const active=b.dataset.range===historyRange;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});savePreferences();renderHistory()};$('settingShowQuoteTime').onchange=e=>{prefs.showQuoteTime=e.target.checked;savePreferences()};$('settingWealthGraph').onchange=e=>{prefs.wealthGraph=e.target.checked;savePreferences()};$('settingShowLogos').onchange=e=>{prefs.showLogos=e.target.checked;savePreferences()};$('settingCompact').onchange=e=>{prefs.compact=e.target.checked;savePreferences()};$('settingAutoOpenSettings').onchange=e=>{prefs.autoOpenSettings=e.target.checked;savePreferences()};
const MASCOT_PALETTES={classic:['#09d66b','#72e59d','#ef4444'],ocean:['#0ccba6','#91e8f6','#377ed3'],royal:['#346bd2','#9bd8ff','#5e50a6'],forest:['#04b982','#cbf37c','#f16b75']};
for(const [id,key] of [['settingMoodNeutral','moodNeutral'],['settingMoodPositive','moodPositive'],['settingMoodExtreme','moodExtreme']]){
 $(id).addEventListener('change',e=>{const v=Number(e.target.value);if(!Number.isFinite(v)||v<0){e.target.value=String(prefs[key]);return}const vals={moodNeutral:Number(prefs.moodNeutral),moodPositive:Number(prefs.moodPositive),moodExtreme:Number(prefs.moodExtreme),[key]:v};if(!(vals.moodNeutral<vals.moodPositive&&vals.moodPositive<vals.moodExtreme)){alert('Imposta soglie crescenti: zona neutra < felice < super felice.');e.target.value=String(prefs[key]);return}prefs[key]=v;savePreferences()});
}
$('settingPalette').onchange=e=>{prefs.palette=e.target.value;const c=MASCOT_PALETTES[prefs.palette]||MASCOT_PALETTES.classic;prefs.colors={positive:c[0],neutral:c[1],negative:c[2]};savePreferences();mascotPlayRender()};
$('settingMascotStyle').onchange=e=>{prefs.mascotStyle=e.target.value;savePreferences();mascotPlayRender()};
$('settingGlow').onchange=e=>{prefs.glow=e.target.checked;savePreferences()};
$('settingShowHeaderFinn').onchange=e=>{prefs.showHeaderFinn=e.target.checked;savePreferences();};
$('resetVisitCounter').onclick=()=>{if(!confirm('Azzerare il conteggio degli ingressi di oggi?'))return;store.removeItem(VISIT_COUNTER_KEY);visitAlertShown=false;lastVisitAttempt=Date.now();updateVisitStatus();$('settingsSaved').textContent='Conteggio giornaliero azzerato.'};
let dashboardScrollY=0;
function openSettings(){
 invesquoCheckServer();
 dashboardScrollY=window.scrollY||0;
 $('dashboardView').classList.add('hidden');
 $('settingsView').classList.remove('hidden');
 document.body.classList.toggle('settings-no-transition',prefs.autoOpenSettings===false);
 document.title='Impostazioni · Finholdra';
 window.scrollTo({top:0,left:0,behavior:'instant'});
 $('settingsScreenTitle').focus({preventScroll:true});
}
function closeSettings(){
 $('settingsView').classList.add('hidden');
 $('dashboardView').classList.remove('hidden');
 document.title='Finholdra';
 window.scrollTo({top:dashboardScrollY,left:0,behavior:'instant'});
 $('settingsShortcut').focus({preventScroll:true});
}
$('settingsShortcut').onclick=openSettings;
$('backDashboard').onclick=closeSettings;
$('backDashboardBottom').onclick=closeSettings;
if(window.matchMedia){const mq=matchMedia('(prefers-color-scheme: light)');if(mq.addEventListener)mq.addEventListener('change',()=>{if(prefs.theme==='system')applyPreferences()})}
applyPreferences();
if(['1','7','30','183','365','all'].includes(prefs.historyDefault)){historyRange=prefs.historyDefault;document.querySelectorAll('#historyRanges button').forEach(b=>{const active=b.dataset.range===historyRange;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});}

const VISIT_COOLDOWN_MS=3500; // Prevent accidental double counts while still counting real reopenings.
let lastVisitPageVisible=Date.now();
let visitWasHidden=false;
let lastVisitAttempt=0;
let visitAlertShown=false;
function getVisitDay(){const now=new Date();return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-')}
function countPortfolioVisit(){
 const now=Date.now();if(now-lastVisitAttempt<2000)return;lastVisitAttempt=now;
 let data={date:getVisitDay(),count:0,last:0};
 try{const existing=JSON.parse(store.getItem(VISIT_COUNTER_KEY));if(existing&&existing.date===data.date)data=existing}catch(e){}
 if(now-(Number(data.last)||0)<VISIT_COOLDOWN_MS)return;
 data.count=(Number(data.count)||0)+1;data.last=now;updateVisitStatus();
 try{store.setItem(VISIT_COUNTER_KEY,JSON.stringify(data))}catch(e){}
 if(!SIM_MODE&&data.count>Number(prefs.limit||4)&&prefs.warnings){showVisitAlert(data.count)}
}
function showVisitAlert(count,preview=false){
 const counter=$('visitCount');counter.textContent=count+' volte';
 $('visitAlert').classList.remove('hidden');
 $('performanceFace').classList.remove('overchecking');void $('performanceFace').offsetWidth;$('performanceFace').classList.add('overchecking');
 $('visitClose').focus();
}
function closeVisitAlert(){
 $('visitAlert').classList.add('hidden');$('performanceFace').classList.remove('overchecking');
 $('faceButton').focus();
}
$('visitClose').onclick=closeVisitAlert;
$('testVisitAlert').onclick=()=>showVisitAlert(Number(prefs.limit||4)+1,true);
$('visitAlert').addEventListener('click',e=>{if(e.target.id==='visitAlert')closeVisitAlert()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('visitAlert').classList.contains('hidden'))closeVisitAlert()});



/* Finholdra Beta 10.7.4 — Daily closing ledger and dated portfolio valuations.
 * Quotes are kept separate from historical quantities; NO snapshot quantity is
 * treated as authoritative after a later transaction is recorded. */
const FH102_CLOSE_KEY='finholdra_daily_closes_v1020';
const FH102_AUDIT_KEY='finholdra_first_verified_day_v1020';
const FH102_REFRESH_KEY='finholdra_daily_close_refresh_v1020';
let fh102Busy=false;
function fh102ValidDay(s){return /^\d{4}-\d{2}-\d{2}$/.test(String(s||''))}
function fh102FirstDay(){
  const observed=snapshots.filter(s=>s?.source==='observed'&&s?.coverage==='all-assets'&&fh102ValidDay(s.date)).map(s=>s.date).sort();
  // The earliest full, observed portfolio is the first verifiable app day.
  const created=String(window.invesquoLocalAccount?.createdAt||'').slice(0,10);
  const historicalStart=snapshots.filter(s=>s?.source==='reconstructed'&&s.coverage==='all-assets'&&fh102ValidDay(s.date)).map(s=>s.date).sort()[0];
  const known=[observed[0],historicalStart,fh102ValidDay(created)?created:null].filter(Boolean).sort()[0]||today();
  const stored=store.getItem(FH102_AUDIT_KEY);
  const first=fh102ValidDay(stored)?(stored<known?stored:known):known;
  if(first!==stored)store.setItem(FH102_AUDIT_KEY,first);
  return first;
}
function fh102Read(){try{const j=JSON.parse(store.getItem(FH102_CLOSE_KEY)||'{}');return j&&typeof j==='object'&&j.assets&&typeof j.assets==='object'?j:{version:1,assets:{}}}catch(_){return {version:1,assets:{}}}}
function fh102Write(archive){try{archive.updatedAt=new Date().toISOString();store.setItem(FH102_CLOSE_KEY,JSON.stringify(archive));window.dispatchEvent(new Event('finholdra:changed'));return true}catch(_){return false}}
function fh102Put(archive,a,date,price,source,quality='close'){
  if(!fh102ValidDay(date)||!(Number(price)>0&&Number.isFinite(Number(price)))||date>today())return false;
  const record=archive.assets[a.id]||(archive.assets[a.id]={symbol:a.symbol||'',isin:a.isin||'',cat:a.cat,currency:currencyOf(a),days:{}});
  if(!record.days||typeof record.days!=='object')record.days={};
  // Close verified > actual-day observation > reconstruction. Never replace a close with an intraday quote.
  const rank={close:3,observed:2,estimated:1},old=record.days[date];
  if(old&&rank[old.quality||'estimated']>rank[quality])return false;
  if(old&&rank[old.quality||'estimated']===rank[quality]&&Math.abs(Number(old.price)-Number(price))<1e-9)return false;
  record.days[date]={price:Number(price),source:String(source).slice(0,100),quality};return true;
}
function fh102ImportKnown(archive){
  const historical=(()=>{try{return JSON.parse(store.getItem('invesquo_asset_prices_v58')||'{}')}catch(_){return {}}})();
  let added=0;
  for(const a of state.assets){
    const prefix='finholdra_verified_closes_'+a.symbol+'_'+currencyOf(a);
    if(a.symbol){try{
      const data=JSON.parse(store.getItem(prefix)||'{}');
      if(data.symbol===a.symbol&&data.currency===currencyOf(a)&&Array.isArray(data.prices))for(const pair of data.prices){
        if(Array.isArray(pair)&&fh102Put(archive,a,pair[0],pair[1],'Chiusura storica verificata','close'))added++;
      }
    }catch(_){}}
    for(const v of Array.isArray(historical[a.id])?historical[a.id]:[]){
      const stamp=Number(v.t),p=Number(v.p);
      if(v.historicalClose&&stamp>0&&p>0&&fh102Put(archive,a,new Date(stamp).toISOString().slice(0,10),p,'Chiusura storica salvata','close'))added++;
    }
    // The BTP ledger contains dated MOT quotations, but these are not guaranteed closing prints.
    if(a.cat==='Obbligazioni'){
      const quotes=Array.isArray(historical[a.id])?historical[a.id]:[];
      for(const v of quotes){const stamp=Number(v.t),p=Number(v.p);if(stamp>0&&p>0&&fh102Put(archive,a,new Date(stamp).toISOString().slice(0,10),p,'Quotazione MOT osservata','observed'))added++}
    }
  }
  // Full portfolio observations can supply instrument-specific daily values
  // only as observations, never as exchange closes.
  const localObs=(()=>{try{return JSON.parse(store.getItem('finholdra_observations_v9930')||'[]')}catch(_){return []}})();
  for(const sn of [...snapshots.filter(x=>x?.source==='observed'||(x?.source==='reconstructed'&&x?.byAsset)),...localObs]){if(!fh102ValidDay(sn.date))continue;
    for(const [id,r] of Object.entries(sn.byAsset||{})){
      const a=state.assets.find(item=>item.id===id);if(!a||!r)continue;
      if(['Conto deposito','Risparmio postale'].includes(a.cat))continue;
      if(fh102Put(archive,a,sn.date,r.price,sn.source==='reconstructed'?'Prezzo da storico ricostruito':'Rilevazione portafoglio',sn.source==='reconstructed'?'estimated':'observed'))added++;
    }
  }
  return added;
}
/* Build historical holdings from Storico > Archivio, not from past screenshots.
   Legacy opening lots dated 03/11 by migration are NOT actual evidence of ownership
   before that day; require the real transaction date for reliable earlier points. */
/* Beta 10.9.25: holdings are dated purchases minus sales. A legacy opening
   is not proof of a holding before its presumed import day. If earlier actual
   observations exist, retain them; avoid forcing unowned assets into totals. */
function fh1099ObservedPosition(a,date){
 const candidates=snapshots.filter(sn=>sn.date<=date&&sn.byAsset?.[a.id]&&Number.isFinite(Number(sn.byAsset[a.id].quantity)))
  .sort((x,y)=>y.date.localeCompare(x.date)||Number(y.stamp||0)-Number(x.stamp||0));
 const sn=candidates[0],row=sn?.byAsset?.[a.id];
 if(!row)return null;
 const qty=Number(row.quantity);return qty>=0?{qty,capital:Number(row.capital||row.cost||0),source:'Rilevazione storica portafoglio',estimated:true}:null;
}
function fh1096PositionAt(a,date){
 const ledger=trades.filter(t=>t.asset===a.id&&['buy','sale'].includes(t.kind)).slice()
  .sort((x,y)=>String(x.date).localeCompare(String(y.date))||Number(!!y.legacyOpening)-Number(!!x.legacyOpening));
 const valid=ledger.filter(t=>fh102ValidDay(t.date)&&Number(t.quantity)>0);
 const assumed=valid.filter(t=>t.assumedDate||t.legacyOpening);
 const actual=valid.filter(t=>!t.assumedDate&&!t.legacyOpening);
 const bad=ledger.filter(t=>!fh102ValidDay(t.date)||!(Number(t.quantity)>0));
 if(bad.length)return {qty:null,reason:'Operazione con data o quantità non valida'};
 // For this subscribed BTP the user confirms ownership in October 2026.
 // Subscription closed 23 October and MOT opened 27 October: use 23 Oct only as
 // a display anchor for an imported opening, never change the stored trade date.
 const isOctBtp=(a.isin==='IT0005735227'||a.id==='btp');
 const adjusted=valid.map(t=>(isOctBtp&&(t.assumedDate||t.legacyOpening)&&t.kind==='buy'&&t.date>='2026-10-27')?
  {...t,date:'2026-10-23',_graphAnchor:true}:t).sort((x,y)=>x.date.localeCompare(y.date));
 if(!adjusted.length){const observed=fh1099ObservedPosition(a,date);return observed||{qty:0,capital:0,source:'Nessuna operazione documentata'};}
 let qty=0,capital=0,estimated=false;
 for(const t of adjusted){if(t.date>date)break;const n=Number(t.quantity);
  if(t.kind==='buy'){qty+=n;const cost=Number(t.spent);capital+=Number.isFinite(cost)?Math.abs(cost):0;}
  else{if(n>qty+1e-7)return {qty:null,reason:'Vendita superiore alle quote registrate'};
   const before=qty;qty=Math.max(0,qty-n);capital=before>0?capital*qty/before:0;}
  if(t._graphAnchor)estimated=true;
 }
 // Prior to an imported opening, only a real historical observation can
 // justify a positive holding; otherwise its contribution is zero, not missing.
 const earliest=adjusted[0]?.date;
 if(date<earliest){const observed=fh1099ObservedPosition(a,date);return observed||{qty:0,capital:0,source:'Nessuna posizione alla data'};}
 return {qty:qty<1e-7?0:qty,capital:Math.max(0,capital),source:'Storico → Archivio',estimated,
  note:estimated?'BTP: data iniziale ricostruita dal collocamento; verifica la data acquisto effettiva':''};
}
function fh1099EffectiveTradeDate(t){
 const a=state.assets.find(x=>x.id===t.asset);
 if(a?.isin==='IT0005735227'&&t.kind==='buy'&&(t.legacyOpening||t.assumedDate)&&t.date>='2026-10-27')return '2026-10-23';
 return t.date;
}
function fh102QtyAt(a,date){return fh1096PositionAt(a,date).qty}
function fh102Closest(archive,a,date){
  const r=archive.assets[a.id],ds=r?.days||{},exact=ds[date];if(exact?.price>0)return {...exact,marketDate:date};
  // Calendar dates with no exchange close use the preceding market session,
  // retaining its REAL date and marking the fact that it was carried forward.
  if(a.cat==='Crypto')return null;
  for(let d=1;d<=7;d++){
    const previous=new Date(Date.parse(date+'T12:00:00Z')-d*86400000).toISOString().slice(0,10);
    const c=ds[previous];if(c?.price>0)return {...c,marketDate:previous,carried:true};
  }
  return null;
}
function fh102ObservedValue(a,date){
  const list=snapshots.filter(s=>s?.date===date&&s.source==='observed'&&s.byAsset?.[a.id]&&Number.isFinite(Number(s.byAsset[a.id].value)));
  list.sort((x,y)=>Number(y.stamp||0)-Number(x.stamp||0));
  if(list.length)return Number(list[0].byAsset[a.id].value);
  try{const obs=JSON.parse(store.getItem('finholdra_observations_v9930')||'[]');
    const same=obs.filter(s=>s.date===date&&Number.isFinite(Number(s.byAsset?.[a.id]?.value))).sort((x,y)=>Number(y.stamp||0)-Number(x.stamp||0));
    if(same.length)return Number(same[0].byAsset[a.id].value);
  }catch(_){}return null;
}
function fh102NonMarketValue(a,date,q,position){
 if(a.cat==='Conto deposito'){
  const start=a.depositStart||a.interestAnchor;
  if(fh102ValidDay(start)&&date<start)return null;
  const flows=Array.isArray(a.depositFlows)?a.depositFlows.filter(x=>fh102ValidDay(x.date)&&x.date<=date):[];
  const hasFlows=Array.isArray(a.depositFlows)&&a.depositFlows.length>0;
  // Dated flows are authoritative. An undated balance must not be projected backward.
  const principal=hasFlows?flows.reduce((n,x)=>n+Number(x.amount||0),0):Number(position?.capital);
  if(!(Number.isFinite(principal)&&principal>=0))return null;
  const interest=hasFlows?flows.reduce((n,m)=>n+Number(m.amount||0)*Math.max(0,days(date)-days(m.date))*Math.max(0,Number(a.annualRate)||0)/36500,0):
   (fh102ValidDay(start)?principal*Math.max(0,days(date)-days(start))*Math.max(0,Number(a.annualRate)||0)/36500:0);
  if(!Number.isFinite(interest))return null;
  return {value:principal+interest,source:hasFlows?'Movimenti conto datati + interessi lordi':'Capitale da Archivio + interessi lordi stimati',quality:'estimated'};
 }
 if(a.cat==='Risparmio postale'){
  const nominal=Number(position?.capital);
  if(Number.isFinite(nominal)&&nominal>=0)return {value:nominal,source:'Capitale sottoscritto dai movimenti (interessi non verificati)',quality:'estimated'};
 }
 return null;
}
function fh102HistoricFx(archive,currency,date){
 if(currency==='EUR')return 1;
 const rates=archive.forex?.[currency]||{};
 for(let d=0;d<=7;d++){
   const back=new Date(Date.parse(date+'T12:00:00Z')-d*86400000).toISOString().slice(0,10);
   const rate=Number(rates[back]);if(Number.isFinite(rate)&&rate>0)return 1/rate;
 }
 return null;
}
async function fh102FetchForex(archive,currency){
 if(!currency||currency==='EUR')return false;
 const symbol='EUR'+currency+'=X',from=Math.floor(Date.parse('2026-01-01T00:00:00Z')/1000),to=Math.floor(Date.parse(today()+'T00:00:00Z')/1000)+86400;const url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?period1='+from+'&period2='+to+'&interval=1d';
 for(const uri of [url,...relayUrls(url)]){try{
  const payload=JSON.parse(await readUrl(uri,6500)),item=payload?.chart?.result?.[0];
  if(String(item?.meta?.symbol||'').toUpperCase()!==symbol.toUpperCase())continue;
  const list=archive.forex||(archive.forex={});const pairs=list[currency]||(list[currency]={});
  const times=item.timestamp||[],closes=item.indicators?.quote?.[0]?.close||[];
  times.forEach((t,i)=>{const price=Number(closes[i]),day=new Date(Number(t)*1000).toISOString().slice(0,10);if(price>0&&day>='2026-01-01'&&day<today())pairs[day]=price});
  return Object.keys(pairs).length>0;
 }catch(_){}}return false;
}

function fh102Valuation(archive,date,selectedCats){
 let total=0,provisional=0,held=0;const missing=[],details=[];
 for(const a of state.assets){if(!selectedCats.includes(a.cat))continue;
  const position=fh1096PositionAt(a,date),qty=position.qty;
  if(qty===null){missing.push(a.name+': '+(position.reason||'possesso non verificato'));continue}
  if(qty<=0)continue;
  held++;
  let quote=fh102NonMarketValue(a,date,qty,position);
  if(!quote&&date===today()&&Number(a.p)>0){quote={value:val(a),quality:'observed',source:'Quotazione attuale'};}
  if(!quote){
   const close=fh102Closest(archive,a,date);
   if(!close){
    if(a.cat==='Obbligazioni'&&a.isin==='IT0005735227'){
     quote={value:qty,quality:'estimated',source:'Valore nominale del BTP, in assenza della chiusura storica',nominalFallback:true};
    }else{missing.push(a.name+': quotazione mancante');continue}
   }
   if(quote){ /* nominal BTP fallback already calculated */ }
   else{
   const fx=currencyOf(a)==='EUR'?1:fh102HistoricFx(archive,currencyOf(a),date);
   if(!(Number.isFinite(fx)&&fx>0)){missing.push(a.name+': cambio storico '+currencyOf(a)+' mancante');continue}
   quote={value:qty*close.price*fx/(a.cat==='Obbligazioni'?100:1),quality:close.quality,source:close.source,marketDate:close.marketDate,carried:!!close.carried};
   }
  }
  if(!Number.isFinite(quote.value)){missing.push(a.name+': valore non valido');continue}
  if(quote.quality!=='close'||quote.carried)provisional++;
  total+=quote.value;details.push({id:a.id,name:a.name,quantity:qty,value:quote.value,...quote});
 }
 return {date,value:total,valid:missing.length===0&&held>0,missing,provisional,details,held};
}
/* Historic starting dates: previously the graph was anchored to the first app snapshot,
   dropping verified closes saved before November 8 even when the user selected 1A.
   Never fabricate a position before its first documented purchase. */
function fh1089ChartFirstDay(archive,cats){
 const dates=trades.filter(t=>cats.includes(t.cat)&&t.kind==='buy'&&fh102ValidDay(t.date)&&!t.assumedDate&&!t.legacyOpening).map(t=>t.date).sort();
 // Only dated transactions are evidence of when holdings started. Imported
 // legacy entries may hide older investments, which the UI flags separately.
 const btpAnchor=trades.some(t=>t.kind==='buy'&&fh1099EffectiveTradeDate(t)==='2026-10-23')?'2026-10-23':null;
 const first=[dates[0],btpAnchor,fh102FirstDay()].filter(Boolean).sort()[0]||today();
 return first<'2026-01-01'?'2026-01-01':first;
}
function fh102CalendarSeries(){
  const archive=fh102Read();fh102ImportKnown(archive);const cats=CAT.filter(([cat])=>filter[cat]).map(([cat])=>cat),start=fh1089ChartFirstDay(archive,cats),end=today();
  const records=[];for(let epoch=days(start);epoch<=days(end);epoch++){
    const date=new Date(epoch*86400000).toISOString().slice(0,10);
    records.push(fh102Valuation(archive,date,cats));
  }
  return {cats,records,start,archive};
}
async function fh102FetchRemote(a){
 if(a.cat==='Conto deposito'||a.cat==='Risparmio postale')return new Map();
 if(a.cat==='Obbligazioni'&&a.isin)return historicBondCloses(a.isin);
 if(!a.symbol)return new Map();
 const symbol=a.symbol,currency=currencyOf(a),from=Math.floor(Date.parse('2026-01-01T00:00:00Z')/1000);
 const through=Math.floor((Date.parse(today()+'T00:00:00Z')+86400000)/1000);
 const base='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol);
 const year='period1='+from+'&period2='+through+'&interval=1d&includePrePost=false';
 const direct=base+'?'+year;
 const remotePaths=[
   '/.netlify/functions/history?symbol='+encodeURIComponent(symbol)+'&currency='+encodeURIComponent(currency)+'&range=1y',
   direct,...relayUrls(direct)
 ];
 let best=new Map();
 for(const uri of remotePaths){try{
  const payload=JSON.parse(await readUrl(uri,8000)),item=payload?.chart?.result?.[0];
  if(!item||String(item.meta?.symbol||'').toUpperCase()!==String(symbol).toUpperCase()||String(item.meta?.currency||'').toUpperCase()!==currency)continue;
  const times=item.timestamp||[],closes=item.indicators?.quote?.[0]?.close||[],map=new Map();
  times.forEach((t,i)=>{const price=Number(closes[i]);if(!(price>0&&Number.isFinite(price)&&Number(t)>0))return;
   // Trading session date in the exchange timezone, not UTC date, matters for US markets.
   let date;try{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:item.meta?.exchangeTimezoneName||'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(Number(t)*1000));const get=key=>parts.find(x=>x.type===key)?.value;date=get('year')+'-'+get('month')+'-'+get('day');}catch(_){date=new Date(Number(t)*1000).toISOString().slice(0,10)}
   if(date>='2026-01-01'&&date<today())map.set(date,price);
  });
  if(map.size>best.size)best=map;
  if(best.size>160)break;
 }catch(_){}}
 return best;
}
function fh102Deadline(p,ms){let timer;return Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Tempo di attesa scaduto')),ms)})]).finally(()=>clearTimeout(timer));}
function fh102SafeRender(){try{fh102RenderArchive()}catch(e){console.warn('Archivio:',e);const el=document.getElementById('fh102CloseList');if(el)el.textContent='Archivio non disponibile: '+String(e.message||e)}try{renderWealthGraph()}catch(e){console.warn('Patrimonio:',e);const el=document.getElementById('wealthGraph');if(el)el.textContent='Grafico non disponibile: '+String(e.message||e)}}
async function fh102Refresh(force=false){
 if(!window.INVESQUO_ACCOUNT_ID||SIM_MODE)return;
 if(fh102Busy)return;
 const labels=['fh102CloseStatus','wealthBackfillStatus'].map(id=>document.getElementById(id)).filter(Boolean);
 const message=t=>labels.forEach(el=>el.textContent=t);
 const controls=['fh102RefreshCloses','wealthBackfill'].map(id=>document.getElementById(id)).filter(Boolean);
 let fetched=0,missing=[],imported=0;fh102Busy=true;
 try{
  const archive=fh102Read();imported=fh102ImportKnown(archive);if(imported)fh102Write(archive);fh102SafeRender();
  if(!force&&Date.now()-Number(store.getItem(FH102_REFRESH_KEY)||0)<18*3600000)return;
  controls.forEach(b=>b.disabled=true);message('Recupero chiusure 2026 dal 01/01 a ieri · aggiornamento online…');
  const assets=state.assets.filter(a=>!['Conto deposito','Risparmio postale'].includes(a.cat));
  const currencies=[...new Set(assets.map(currencyOf).filter(c=>c!=='EUR'))];
  const jobs=currencies.map(c=>async()=>{try{await fh102Deadline(fh102FetchForex(archive,c),12000)}catch(e){missing.push('Cambio '+c)}}).concat(assets.map(a=>async()=>{
    try{const remote=await fh102Deadline(fh102FetchRemote(a),16000);for(const [day,price] of remote){if(fh102Put(archive,a,day,price,a.cat==='Obbligazioni'?'Quotazione storica MOT':'Yahoo Finance · chiusura giornaliera',a.cat==='Obbligazioni'?'observed':'close'))fetched++}if(!remote.size)missing.push(a.symbol||a.name)}catch(e){missing.push(a.symbol||a.name)}
  }));
  let completed=0;for(let i=0;i<jobs.length;i+=3){await Promise.allSettled(jobs.slice(i,i+3).map(f=>f()));completed+=Math.min(3,jobs.length-i);fh102Write(archive);fh102SafeRender();message('Recupero 2026 '+completed+'/'+jobs.length+' fonti · '+fetched+' nuove chiusure. Mancanti: '+missing.length);}
  if(fetched||!missing.length)store.setItem(FH102_REFRESH_KEY,String(Date.now()));
  const years=state.assets.filter(a=>!['Conto deposito','Risparmio postale'].includes(a.cat));const coverage=years.map(a=>({name:a.symbol||a.name,n:Object.keys(archive.assets?.[a.id]?.days||{}).filter(d=>d>='2026-01-01'&&d<today()).length}));const noHistory=coverage.filter(x=>!x.n).map(x=>x.name);message('Archivio 2026: '+(imported+fetched)+' nuove chiusure/rilevazioni · '+coverage.map(x=>x.name+' '+x.n+' giorni').join(' · ')+(missing.length||noHistory.length?' · Fonti mancanti: '+[...new Set([...missing,...noHistory])].join(', '):' · Dati disponibili salvati.'));
 }catch(e){message('Dati locali disponibili · recupero online non riuscito: '+String(e.message||e))}
 finally{fh102Busy=false;controls.forEach(b=>b.disabled=false);fh102SafeRender()}
}
function fh102RenderArchive(){
 const box=document.getElementById('fh102CloseList'),select=document.getElementById('fh102CloseDay');if(!box||!select)return;
 const archive=fh102Read();fh102ImportKnown(archive);const date=select.value||today();
 const dayList=[];
 for(const a of state.assets){const q=fh102QtyAt(a,date);if(!(q>0))continue;
   const quote=fh102Closest(archive,a,date),non=fh102NonMarketValue(a,date,q),c=non||quote;
   dayList.push({a,q,c});
 }
 box.innerHTML=dayList.length?dayList.map(({a,q,c})=>'<div class="fh102-close-row"><span>'+svgEscape(a.name)+'</span><span>'+ (c?(nonNumericClose(a,c)?eur(c.value):number(c.price)+' '+(a.cat==='Obbligazioni'?'%':currencyOf(a)))+'<small>'+svgEscape(c.source||'')+(c.marketDate&&c.marketDate!==date?' · chiusura '+shortDate(c.marketDate):'')+'</small>':'n.d.<small>Chiusura non disponibile</small>')+'</span></div>').join(''):'<p class="hint">Nessuna posizione documentata a questa data.</p>';
}
function nonNumericClose(a,c){return ['Conto deposito','Risparmio postale'].includes(a.cat)}

async function fh102ImportJson(ev){
 const file=ev.target?.files?.[0],status=document.getElementById('fh102CloseStatus');if(!file)return;
 if(file.size>6000000){if(status)status.textContent='Archivio troppo grande.';ev.target.value='';return}
 try{
  const obj=JSON.parse(await file.text());
  if(obj?.format!=='finholdra-daily-closes'||!obj.assets||typeof obj.assets!=='object')throw Error('File chiusure non riconosciuto');
  const archive=fh102Read();let imported=0;
  for(const a of state.assets){
   const source=Object.values(obj.assets).find(x=>x&&x.cat===a.cat&&(a.symbol&&x.symbol===a.symbol||a.isin&&x.isin===a.isin));
   if(!source||!source.days||typeof source.days!=='object'||String(source.currency||'EUR')!==currencyOf(a))continue;
   const entries=Object.entries(source.days);if(entries.length>5000)throw Error('Archivio troppo lungo');
   for(const [date,item] of entries){const q=item?.quality;if(!['close','observed'].includes(q))continue;
    if(fh102Put(archive,a,date,item.price,item.source||'Archivio importato',q))imported++;
   }
  }
  if(!fh102Write(archive))throw Error('Spazio di archiviazione locale insufficiente');
  if(status)status.textContent=imported+' chiusure e rilevazioni importate; nessun acquisto o investimento modificato.';
  fh102RenderArchive();renderWealthGraph();
 }catch(err){if(status)status.textContent='Importazione non riuscita: '+String(err.message||err)}
 finally{ev.target.value=''}
}

function fh102SetupUI(){
 const archiveBox=document.getElementById('fh102CloseArchive');if(archiveBox){
   const input=archiveBox.querySelector('#fh102CloseDay');if(input.dataset.fh102Ready)return;input.dataset.fh102Ready='1';input.max=today();input.min='2026-01-01';input.value=today();
   input.addEventListener('change',fh102RenderArchive);
   archiveBox.querySelector('#fh102CloseImport')?.addEventListener('change',e=>void fh102ImportJson(e));
   archiveBox.querySelector('#fh102RefreshCloses')?.addEventListener('click',()=>void fh102Refresh(true));
 }
 document.getElementById('wealthFromDate')?.setAttribute('min','2026-01-01');
 fh102ImportKnownAndRender();
 archiveBox?.closest('details')?.addEventListener('toggle',()=>{if(archiveBox.closest('details').open)fh102SafeRender()});
}
function fh102ImportKnownAndRender(){const archive=fh102Read();const n=fh102ImportKnown(archive);if(n)fh102Write(archive);fh102SafeRender();}

let wealthRange='30';
let wealthSelectedDate=null;
function wealthSeriesForCurrentFilters(){
 const {cats,records,start}=fh102CalendarSeries();
 // Never copy an earlier portfolio total over a day missing one or more holdings.
 // Non-trading days are carried per instrument by fh102Closest(), and remain labelled provisional.
 return {cats,records:records.filter(p=>p.valid),start,allRecords:records};
}
function renderWealthGraph(){
 try{window.renderHomeCapitalChart?.()}catch(err){console.warn('Grafico capitale / valore:',err)}
 try{if(typeof reportPopulatePeriods==='function')reportPopulatePeriods()}catch(e){console.warn('Report:',e)}
 const panel=document.getElementById('dashboardWealthCard'),target=document.getElementById('wealthGraph');if(!panel||!target)return;
 panel.classList.toggle('hidden',prefs.wealthGraph===false);if(prefs.wealthGraph===false)return;
 document.querySelectorAll('#wealthRanges button').forEach(b=>{const active=b.dataset.wealthRange===wealthRange;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
 const {cats,records,allRecords,start}=wealthSeriesForCurrentFilters();const end=days(today());
 const customFrom=document.getElementById('wealthFromDate')?.value||'';
 const arr=records; // 10.9.25 unified graph owns view filtering; use all historically valid points
 if(arr.length===0){const firstMissing=allRecords.find(p=>!p.valid&&p.missing.length);target.innerHTML='<p class="history-empty">Nessuna giornata completa ricostruibile'+(firstMissing?': '+svgEscape(firstMissing.missing.slice(0,2).join(' · ')):'')+'. Controlla le date degli acquisti in Storico → Archivio e le chiusure in Impostazioni → Archivio quotazioni giornaliere.</p>';return}
 if(!arr.some(p=>p.date===wealthSelectedDate))wealthSelectedDate=arr.at(-1).date;
 const vals=arr.map(p=>p.value),mn=Math.min(...vals),mx=Math.max(...vals),pad=Math.max((mx-mn)*.15,Math.max(1,mx*.004));
 const lo=mn-pad,hi=mx+pad,W=340,H=165,L=14,R=14,T=14,B=30;
 const first=days(arr[0].date),last=days(arr.at(-1).date);
 const x=p=>L+(W-L-R)*(days(p.date)-first)/Math.max(1,last-first),y=v=>T+(H-T-B)*(hi-v)/(hi-lo);
 const flowFor=(a,b)=>{const ops=trades.filter(t=>cats.includes(t.cat)&&fh1099EffectiveTradeDate(t)>a&&fh1099EffectiveTradeDate(t)<=b&&['buy','sale'].includes(t.kind));const valid=ops.every(t=>Number.isFinite(Number(t.spent)));const buys=ops.filter(t=>t.kind==='buy').reduce((n,t)=>n+Math.abs(Number(t.spent)||0),0),sales=ops.filter(t=>t.kind==='sale').reduce((n,t)=>n+Math.abs(Number(t.spent)||0),0);return {buys,sales,net:buys-sales,valid};};
 const intervals=arr.map((p,i)=>{const prev=i?arr[i-1]:null,f=flowFor(prev?prev.date:'',p.date);return {...f,gain:prev&&f.valid?p.value-prev.value-f.net:null,delta:prev?p.value-prev.value:null};});
 const segmentColor=i=>intervals[i].gain===null?'#a9b9ce':intervals[i].gain>=0?'#45dbae':'#fa8090';
 const path=arr.slice(1).map((p,j)=>{const a=arr[j],i=j+1;return '<path d="M'+x(a)+' '+y(a.value)+' L'+x(p)+' '+y(p.value)+'" fill="none" stroke="'+segmentColor(i)+'" stroke-width="2.6" stroke-linecap="round"'+(days(p.date)-days(a.date)>1?' stroke-dasharray="4 4"':'')+'/>';}).join('');
 const moneyMarks=arr.map((p,i)=>i&&intervals[i].buys>0?'<g pointer-events="none"><title>Acquisti registrati '+eur(intervals[i].buys)+'</title><text x="'+x(p)+'" y="'+Math.max(12,y(p.value)-9)+'" text-anchor="middle" font-size="12">💰</text></g>':'').join('');
 const dots=arr.map((p,i)=>'<g data-wealth-day="'+p.date+'" role="button" tabindex="0" aria-label="'+shortDate(p.date)+' '+eur(p.value)+'"><circle cx="'+x(p)+'" cy="'+y(p.value)+'" r="'+(p.date===wealthSelectedDate?4.1:2.8)+'" fill="'+segmentColor(i)+'"/>'+(p.date===wealthSelectedDate?'<circle cx="'+x(p)+'" cy="'+y(p.value)+'" r="8" fill="none" stroke="#ffffff" stroke-opacity=".7" stroke-width="1"/>':'')+'<circle cx="'+x(p)+'" cy="'+y(p.value)+'" r="10" fill="transparent"/></g>').join('');
 const chosen=arr.find(p=>p.date===wealthSelectedDate)||arr.at(-1);const ci=arr.indexOf(chosen),iv=intervals[ci];const signed=n=>(n>=0?'+':'')+eur(n);
 const wealthCutoff = customFrom || (wealthRange==='all'?'':new Date((end-Math.max(0,Number(wealthRange||0)-1))*86400000).toISOString().slice(0,10));
 const dailyObserved=arr.map((p,i)=>({date:p.date,gain:intervals[i].gain})).filter(p=>Number.isFinite(p.gain)&&(!wealthCutoff||p.date>=wealthCutoff));
 const bestDay=dailyObserved.filter(p=>p.gain>0).sort((a,b)=>b.gain-a.gain)[0];
 const worstDay=dailyObserved.filter(p=>p.gain<0).sort((a,b)=>a.gain-b.gain)[0];
 const peakDayHtml='<div class="fh10969-day-extremes" aria-label="Miglior guadagno e maggior perdita giornaliera nel periodo">'+
 '<div class="fh10969-day-best"><span>Maggior guadagno giornaliero</span><strong>'+(bestDay?signed(bestDay.gain):'n.d.')+'</strong><small>'+(bestDay?shortDate(bestDay.date):'Nessun guadagno rilevato')+'</small></div>'+
 '<div class="fh10969-day-worst"><span>Maggiore perdita giornaliera</span><strong>'+(worstDay?signed(worstDay.gain):'n.d.')+'</strong><small>'+(worstDay?shortDate(worstDay.date):'Nessuna perdita rilevata')+'</small></div></div>';
 const indicativeCount=arr.filter(p=>p.provisional>0).length;
 const gaps=arr.slice(1).reduce((n,p,i)=>n+(days(p.date)-days(arr[i].date)>1?days(p.date)-days(arr[i].date)-1:0),0);
 // Pass the already verified daily valuation and transaction-derived flow metrics to fullscreen view;
 // no second valuation engine, no changes to historical calculations.
 target.dataset.wealthPoints=JSON.stringify(arr.map((p,i)=>({date:p.date,value:Number(p.value),gain:intervals[i].gain,buys:intervals[i].buys,sales:intervals[i].sales,provisional:!!p.provisional})));
 // Detailed diagnostics stay in Settings → Archivio quotazioni, never in Home.
 target.innerHTML='<button class="fh1084-capital-expand" type="button" id="fhWealthFullscreenOpen" aria-label="Ingrandisci grafico andamento patrimonio"><span>Valore totale nel tempo</span><span>Ingrandisci ↗</span></button><svg class="history-plot wealth-plot"'+abSeriesAttribute(arr.map(p=>({x:x(p),y:y(p.value),value:p.value,label:shortDate(p.date)})),'wealth')+' viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Valore giornaliero del patrimonio da '+shortDate(arr[0].date)+' a '+shortDate(arr.at(-1).date)+'">'+path+''+dots+moneyMarks+'<text x="'+L+'" y="'+(H-7)+'" fill="#a9b9ce" font-size="10">'+shortDate(arr[0].date)+'</text><text x="'+(W-R)+'" y="'+(H-7)+'" text-anchor="end" fill="#a9b9ce" font-size="10">'+shortDate(arr.at(-1).date)+'</text></svg><div class="wealth-day-focus"><span>'+shortDate(chosen.date)+(chosen.provisional?' · indicativo':'')+'</span><strong>'+eur(chosen.value)+'</strong></div>'+(ci>0?'<div class="fh103-flow"><span>Variazione patrimonio <b>'+signed(iv.delta)+'</b></span><span>💰 Acquisti <b>'+eur(iv.buys)+'</b></span><span>Vendite <b>'+eur(iv.sales)+'</b></span><span>Risultato al netto dei movimenti <b style="color:'+segmentColor(ci)+'">'+(iv.gain===null?'n.d.':signed(iv.gain))+'</b></span></div>':'')+peakDayHtml+'<div class="sub">Verde: rendimento positivo · Rosso: negativo · 💰 acquisti.</div>';
}
document.getElementById('wealthRanges').addEventListener('click',e=>{const b=e.target.closest('button[data-wealth-range]');if(!b)return;wealthRange=b.dataset.wealthRange;document.getElementById('wealthFromDate').value='';wealthSelectedDate=null;renderWealthGraph()});
document.getElementById('wealthFromDate').addEventListener('change',e=>{if(e.target.value>today())e.target.value=today();wealthSelectedDate=null;renderWealthGraph()});

document.getElementById('wealthGraph').addEventListener('click',e=>{const g=e.target.closest('[data-wealth-day]');if(g){wealthSelectedDate=g.dataset.wealthDay;renderWealthGraph()}});
document.getElementById('wealthGraph').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const g=e.target.closest('[data-wealth-day]');if(g){e.preventDefault();wealthSelectedDate=g.dataset.wealthDay;renderWealthGraph()}});

function invesquoLastPriceUpdateLabel(){
 const times=(state.assets||[]).map(a=>Date.parse(a.quoteUpdatedAt||'')).filter(t=>Number.isFinite(t));
 const last=times.length?Math.max(...times):NaN;
 if(Number.isFinite(last))return 'Ultimo aggiornamento: '+new Date(last).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
 const legacy=String(state.lastUpdate||'');
 const match=legacy.match(/(\d{1,2}\/\d{1,2}\/\d{4})[,\s]+(\d{1,2}:\d{2})/);
 return match?'Ultimo aggiornamento: '+match[1]+' · '+match[2]:'Ultimo aggiornamento: non disponibile';
}
function invesquoUpdateStamp(message){const el=$('stamp');if(el)el.textContent=message||invesquoLastPriceUpdateLabel()}

function render(){const capital=totalCapital(),value=totalValue(),unrealized=value-capital,realized=saleRealizedGain(),profit=unrealized+realized,soldBasis=trades.filter(t=>t.kind==='sale'&&filter[t.cat]).reduce((n,t)=>n+Number(t.costBasis||0),0),grossBasis=capital+soldBasis,performanceRatio=grossBasis?profit/grossBasis:0;
$('total').textContent=eur(value);$('invested').textContent=eur(capital);$('profit').textContent=(profit>=0?'+':'')+eur(profit);$('profit').className=profit>=0?'gain nums':'loss nums';$('returnPct').textContent=(profit>=0?'+':'')+pct(performanceRatio);$('returnPct').className='num nums '+(profit>=0?'gain':'loss');$('stamp').textContent=invesquoLastPriceUpdateLabel();$('count').textContent=activeAssets().length+' / '+state.assets.length+' strumenti';const neutralBand=Math.max(0,Number(prefs.moodNeutral??1))/100;const positiveBand=Math.max(neutralBand+.001,Number(prefs.moodPositive??2)/100);const extremeBand=Math.max(positiveBand+.001,Number(prefs.moodExtreme??5)/100);const faceMood=performanceRatio>neutralBand?'positive':performanceRatio< -neutralBand?'negative':'neutral';const moodStatus=$('headerMoodStatus');moodStatus.className='header-mood-status '+faceMood;$('headerMoodText').textContent=faceMood==='positive'?'Positivo':faceMood==='negative'?'Negativo':'Stabile';moodStatus.title='Rendimento lordo del patrimonio selezionato: '+pct(performanceRatio);
const face=$('performanceFace');
if(mascotMood!==faceMood){mascotMood=faceMood;mascotIndex=0}
const faceColor=prefs.colors[faceMood]||PREF_DEFAULTS.colors[faceMood];const emotion=finnCurrentEmotion(faceMood,performanceRatio>=extremeBand?'celebrate':performanceRatio<=-extremeBand?'crying':performanceRatio>=positiveBand?'positive':performanceRatio<=-positiveBand?'angry':faceMood==='positive'?'satisfied':faceMood==='negative'?'sad':'neutral');
face.innerHTML=mascotSVG(faceMood,faceColor,false,emotion);
face.className='performance-face '+faceMood+(emotion==='sleeping'?' sleeping':'')+' expression-'+emotion+finnSceneClass()+(!$('visitAlert').classList.contains('hidden')?' overchecking':'');
if(facePanelOpen)renderFacePanel();
face.setAttribute('aria-label','Mascotte '+MASCOT_LABELS[emotion]+'. Performance lorda '+pct(performanceRatio));face.title=face.getAttribute('aria-label');
const visible=groups(),den=visible.reduce((s,x)=>s+(mode==='now'?x.value:x.capital),0);let offset=0;const parts=visible.filter(g=>(mode==='now'?g.value:g.capital)>0).map(g=>{let from=offset;offset+=den?(mode==='now'?g.value:g.capital)/den*100:0;return `${g.color} ${from}% ${offset}%`});$('donut').style.background='var(--panel)';renderInteractiveDonut(visible,den);$('donutLabel').textContent=mode==='now'?'Patrimonio oggi':'Patrimonio investito';$('donutAmount').textContent=eur(den);$('legend').innerHTML=visible.length?visible.map(g=>`<button type="button" class="legend-row" data-allocation-category="${svgEscape(g.name)}" aria-expanded="${allocationSelectedCategory===g.name}" aria-label="Apri dettagli ${svgEscape(g.name)}"><span class="swatch" style="background:${g.color}"></span><div><div class="legend-title">${g.name}</div><div class="legend-label">${eur(mode==='now'?g.value:g.capital)}</div></div><div class="legend-col"><span class="legend-label">Peso</span><strong>${pct(den?(mode==='now'?g.value:g.capital)/den:0)}</strong></div><div class="legend-col"><span class="legend-label">Rend. lordo</span><strong data-pct-basis="Questa percentuale è calcolata rispetto al capitale investito nella categoria." class="${g.ret>=0?'gain':'loss'}">${g.ret>=0?'+':''}${pct(g.ret)}</strong><strong class="legend-euro ${g.value-g.capital>=0?'gain':'loss'}">${g.value-g.capital>=0?'+':''}${eur(g.value-g.capital)}</strong></div></button>`).join(''):'<p class="hint">Nessuna categoria selezionata.</p>';$('modeNow').classList.toggle('selected',mode==='now');$('modeCost').classList.toggle('selected',mode==='cost');$('filters').innerHTML=CAT.map(([cat,color])=>`<button class="chip ${filter[cat]?'':'off'}" data-filter="${cat}" aria-pressed="${filter[cat]}"><i class="dot" style="background:${color}"></i>${cat} ${filter[cat]?'✓':'+'}</button>`).join('');updateAllocationSelection();
const displayed=state.assets.filter(a=>filter[a.cat]&&Number(a.q)>0);$('assetList').innerHTML=displayed.length?displayed.map(a=>{const c=cap(a),v=val(a),g=v-c;return `<div class="asset"><div class="flex"><div class="asset-ident">${prefs.showLogos!==false?issuerIcon(a.id):''}<div class="asset-ident-copy"><div class="asset-name"><button type="button" class="asset-name-button" data-detail-id="${svgEscape(a.id)}" aria-label="Apri grafico di ${svgEscape(a.name)}"><span>${svgEscape(a.name)}</span><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 3 8-8"/><path d="M15 6h6v6"/></svg></button></div><div class="asset-meta">${categoryGlyph(a.cat)} <strong class="category-name">${svgEscape(a.cat)}</strong> · ${a.id==='btp'?eur(a.q)+' nominali':a.cat==='Conto deposito'?'Tasso '+pct(a.annualRate/100):number(a.q)+' quote'}${a.id==='goog'?' · GEM Milano EUR':a.id==='btp'?' · MOT EUR':''}${currencyOf(a)!=='EUR'?' · '+currencyOf(a)+' · cambio '+number(assetFx(a))+' EUR':''}${prefs.showQuoteTime&&a.quoteAt?' · Quotazione '+a.quoteAt:''}</div><div class="asset-topstats"><span>Quote: <b>${a.id==='btp'?eur(a.q)+' nominali':number(a.q)}</b></span><span>Peso selezione: <b data-pct-basis="Peso sul patrimonio delle categorie selezionate">${pct(value?v/value:0)}</b></span></div></div></div><strong class="${g>=0?'gain':'loss'} nums" data-pct-basis="${['Conto deposito','Risparmio postale'].includes(a.cat)?'Rispetto al capitale investito · rendimento lordo maturato':'Rispetto al PMC · rendimento lordo della posizione'}">${g>=0?'+':''}${pct(c?g/c:0)}</strong></div><div class="asset-cols"><div class="asset-col"><span>Investito</span><strong>${eur(c)}</strong></div><div class="asset-col"><span>Valore oggi</span><strong>${eur(v)}</strong></div><div class="asset-col"><span>${a.id==='btp'?'PMC (% nominale)':'PMC'}</span><strong>${a.cat==='Obbligazioni'?number(a.pmc)+' / 100':localMoney(a.pmc,currencyOf(a))}</strong></div><div class="asset-col"><span>${a.cat==='Conto deposito'?'Tasso annuo lordo':a.id==='btp'?'Prezzo oggi / 100 €':a.id==='bfp'?'Quotazione':'Prezzo attuale'}</span><strong>${a.cat==='Conto deposito'?pct(a.annualRate/100):a.id==='bfp'?'Non quotato':a.cat==='Obbligazioni'?number(a.p)+' / 100':localMoney(a.p,currencyOf(a))}</strong>${currencyOf(a)!=='EUR'?`<span class="currency-help">≈ ${eur(Number(a.p)*assetFx(a))} / unità</span>`:''}</div></div><div class="asset-profit ${g>=0?'gain':'loss'}">${g>=0?'+':''}${eur(g)} lordi</div>${(['ETF','ETF monetari','Materie prime','Azioni','Obbligazioni','ETC/ETN','Oro','Crypto','Valute'].includes(a.cat))?`<div class="asset-actions"><button class="btn" data-buy-id="${a.id}">+ Registra acquisto</button><button class="btn" data-sale-id="${a.id}">− Registra vendita</button><button class="btn" data-transactions-id="${a.id}">◷ Storico transazioni</button><button class="asset-delete" aria-label="Elimina ${svgEscape(a.name)} inserito per errore" data-delete-id="${a.id}">×</button></div>`:`<div class="asset-actions"><button class="btn" data-transactions-id="${a.id}">◷ Storico transazioni</button><button class="asset-delete" data-delete-id="${a.id}" aria-label="Elimina ${svgEscape(a.name)} inserito per errore">×</button></div>`}</div>`}).join(''):'<p class="hint">Nessuna posizione visibile. Riattiva una categoria per mostrarla.</p>';
const deposits=state.assets.filter(a=>a.cat==='Conto deposito'&&Number(a.q)>0);
$('ingSection').classList.toggle('hidden',!deposits.length||!filter['Conto deposito']);
$('depositSummary').innerHTML=deposits.map(a=>{const freq=a.accrualFrequency||'daily',n=freq==='yearly'?365:freq==='monthly'?30:1;const rate=depositPrincipal(a)*num(a.annualRate)/100/365;
const principal=depositPrincipal(a),gross=depositAccrued(a),elapsed=Math.max(0,days(today())-days(a.depositStart||a.interestAnchor||today()));
const percent=principal>0?gross/principal:0;
// When deposits were made on different dates, annualise over the actual invested-capital days.
const weightedDays=Array.isArray(a.depositFlows)&&a.depositFlows.length?
 a.depositFlows.reduce((sum,m)=>sum+Number(m.amount||0)*Math.max(0,days(today())-days(m.date)),0):principal*elapsed;
const equivalentRate=weightedDays>0?gross*365/weightedDays:0;
return `<div class="deposit-summary-item"><strong>${svgEscape(a.name)}</strong><div class="rowline"><span class="sub">Capitale</span><strong>${eur(depositPrincipal(a))}</strong></div><div class="rowline"><span class="sub">Interessi lordi maturati</span><strong class="gain">${eur(depositAccrued(a))}</strong></div><div class="rowline"><span class="sub">Totale stimato</span><strong>${eur(val(a))}</strong></div><div class="rowline"><span class="sub">Rendimento lordo maturato</span><strong class="gain">${pct(percent)}</strong></div><div class="rowline"><span class="sub">Tasso annuo equivalente (su ${elapsed} giorni)</span><strong>${weightedDays>0?pct(equivalentRate):"n.d."}</strong></div><div class="rowline"><span class="sub">Tasso lordo · ${svgEscape(freq==='yearly'?'annuale':freq==='monthly'?'mensile':'giornaliero')}</span><strong>${eur(rate*n)}</strong></div><p class="sub">${svgEscape(a.depositStart||'')}${a.maturityDate?' · Scadenza '+shortDate(a.maturityDate):''} · Tasso ${pct(num(a.annualRate)/100)}</p></div>`}).join(''); $('maturities').innerHTML=state.assets.filter(a=>(a.maturity!=null||a.maturityDate)&&filter[a.cat]).map(a=>`<div class="box"><strong>${svgEscape(a.name)}</strong>${a.maturityDate?`<p class="sub" style="margin:7px 0 0">Scadenza: <strong>${shortDate(a.maturityDate)}</strong></p>`:''}<div class="maturity-grid" style="margin-top:9px"><div><span>Investito</span><strong>${eur(cap(a))}</strong></div><div><span>A scadenza lordo</span><strong>${a.maturity!=null?eur(a.maturity):'Da inserire'}</strong></div></div>${a.maturity!=null?`<div class="gain" style="margin-top:7px;font-size:13px;font-weight:700">${a.maturity>=cap(a)?'+':''}${eur(a.maturity-cap(a))} (${pct(cap(a)?(a.maturity-cap(a))/cap(a):0)})</div>`:''}</div>`).join('');
if(!editing)$('editor').classList.remove('open');renderHistory();try{renderWealthGraph()}catch(e){console.warn('Patrimonio:',e);const target=document.getElementById('wealthGraph');if(target)target.textContent='Grafico non disponibile: '+String(e.message||e)}if(typeof updateMascotMarket==='function')updateMascotMarket();}
function renderEditor(){ $('editor').classList.toggle('open',editing);$('editToggle').textContent=editing?'Chiudi':'Rettifica dati'; if(!editing)return;const list=state.assets.filter(a=>filter[a.cat]);$('editItems').innerHTML=list.map(a=>`<div class="editrow"><strong>${svgEscape(a.name)}</strong><div class="field" style="margin-top:10px"><label>Nome visualizzato del titolo (personalizzabile)</label><input type="text" maxlength="90" data-id="${svgEscape(a.id)}" data-key="name" value="${svgEscape(a.name)}" placeholder="Es. Il mio ETF globale"/><p class="entry-explain">Modifica solo il nome nell’app, non ticker, ISIN, quotazione o storico transazioni.</p></div><div class="editgrid"><div class="field"><label>${a.id==='btp'?'Nominale (€)':'Quantità / unità'}</label><input type="number" inputmode="decimal" step="any" min="0" data-id="${a.id}" data-key="q" value="${a.q}"></div><div class="field"><label>${a.id==='btp'?'PMC (% del nominale)':'Prezzo medio carico (€)'}</label><input type="number" inputmode="decimal" step="any" min="0" data-id="${a.id}" data-key="pmc" value="${a.pmc}"></div><div class="field"><label>${a.id==='btp'?'Prezzo attuale (%)':'Prezzo attuale (€)'}</label><input type="number" inputmode="decimal" step="any" min="0" data-id="${a.id}" data-key="p" value="${a.p}"></div><div class="field"><label>Capitale investito (€)</label><div style="padding-top:10px;font-weight:800" id="computed-${a.id}">${eur(cap(a))}</div></div>${currencyOf(a)!=='EUR'?`<div class="field"><label>Cambio EUR per 1 ${currencyOf(a)}</label><input data-id="${a.id}" data-key="fxRate" type="number" inputmode="decimal" step="any" min="0.000001" value="${assetFx(a)}"/></div>`:''}</div>${a.cat==='Conto deposito'?`<div class="editgrid"><div class="field"><label>Tasso annuo lordo (%)</label><input data-id="${a.id}" data-key="annualRate" type="number" inputmode="decimal" step="any" min="0" value="${a.annualRate||0}"></div>${Array.isArray(a.depositFlows)&&a.depositFlows.length?`<div class="field" style="grid-column:1/-1"><label>Interessi lordi: calcolo dai versamenti registrati</label><p class="sub">19/08: 19.150 € · 20/08: 15.925 € + 14.924 €</p></div>`:`<div class="field"><label>Interessi lordi al riferimento (€)</label><input data-id="${a.id}" data-key="interestBase" type="number" inputmode="decimal" step="any" min="0" value="${a.interestBase||0}"></div><div class="field"><label>Data inizio maturazione</label><input data-id="${a.id}" data-key="depositStart" type="date" value="${a.depositStart||'2026-08-08'}"></div><div class="field"><label>Data riferimento interessi</label><input data-id="${a.id}" data-key="interestAnchor" type="date" value="${a.interestAnchor||today()}"></div>`}<div class="field"><label>Riepilogo</label><select class="order-select" data-id="${a.id}" data-key="accrualFrequency"><option value="daily" ${(!a.accrualFrequency||a.accrualFrequency==='daily')?'selected':''}>Giornaliero</option><option value="monthly" ${a.accrualFrequency==='monthly'?'selected':''}>Mensile</option><option value="yearly" ${a.accrualFrequency==='yearly'?'selected':''}>Annuale</option></select></div></div>`:''}${(a.cat==='Obbligazioni'||a.cat==='Risparmio postale'||a.cat==='Conto deposito'||a.maturity!=null)?`<div class="editgrid"><div class="field"><label>Data scadenza / rimborso</label><input data-id="${a.id}" data-key="maturityDate" type="date" value="${a.maturityDate||''}"></div><div class="field"><label>Valore lordo complessivo a scadenza (€), se noto</label><input data-id="${a.id}" data-key="maturity" type="number" inputmode="decimal" step="any" min="0" value="${a.maturity??''}" placeholder="Non disponibile"></div></div>`:''}</div>`).join('');}
$('editItems').addEventListener('change',function(e){const node=e.target;if(!node.dataset.id)return;const a=state.assets.find(x=>x.id===node.dataset.id);if(!a)return;const k=node.dataset.key;let v=k==='interestAnchor'||k==='depositStart'||k==='accrualFrequency'||k==='name'||k==='maturityDate'?node.value:(k==='maturity'&&!String(node.value).trim()?null:Number(String(node.value).replace(',','.')));if(k==='name'){v=String(v).trim().replace(/\s+/g,' ');if(!v||v.length>90){alert('Inserisci un nome valido (massimo 90 caratteri).');renderEditor();return}}else if(k==='maturityDate'){if(v&&!/^\d{4}-\d{2}-\d{2}$/.test(v))return}else if(k!=='interestAnchor'&&v!==null&&(!Number.isFinite(v)||v<0))return;if(['interestAnchor','depositStart'].includes(k)&&!/^\d{4}-\d{2}-\d{2}$/.test(v))return;if(k==='accrualFrequency'&&!['daily','monthly','yearly'].includes(v))return;if(a.cat==='Conto deposito'&&['interestAnchor','depositStart'].includes(k)){const start=k==='depositStart'?v:(a.depositStart||'2026-08-08'),anchor=k==='interestAnchor'?v:(a.interestAnchor||today());if(anchor<start||anchor>today()){alert('Il riferimento deve essere compreso tra inizio e oggi.');renderEditor();return}}a[k]=v;if(k==='name'){trades.forEach(t=>{if(t.asset===a.id)t.assetName=v});saveTimeline()}if(k==='p'){a.quoteAt=new Date().toLocaleString('it-IT')+' · manuale';a.quoteSource='Prezzo inserito manualmente';a.quoteUpdatedAt=null}save();trackSnapshot();render();renderEditor();if(k==='p'&&buyTarget()?.id===a.id&&!buyPriceEdited)syncBuyPrice()});
$('modeNow').onclick=()=>{mode='now';render()};$('modeCost').onclick=()=>{mode='cost';render()};$('filters').onclick=e=>{const b=e.target.closest('button[data-filter]');if(!b)return;filter[b.dataset.filter]=!filter[b.dataset.filter];historySelectedDay=null;saveFilters();render();if(editing)renderEditor()};$('editToggle').onclick=()=>{editing=!editing;renderEditor()};$('editDone').onclick=()=>{editing=false;renderEditor()};
// Universal, portable backup. Store existing quote observations as well as
// positions, transactions and daily full-portfolio readings.
const PRICE_HISTORY_KEY='invesquo_asset_prices_v58';
const RESET_UNDO_KEY='invesquo_reset_undo_v74';
const BUNDLE_FORMAT='invesquo-portable';
function accountDataForBundle(){
 const result={};if(!ACCOUNT_PREFIX)return result;
 for(let i=0;i<localStorage.length;i++){
  const k=localStorage.key(i);if(!k?.startsWith(ACCOUNT_PREFIX))continue;
  const short=k.slice(ACCOUNT_PREFIX.length);
  if(short.startsWith('invesquo_sim_')||['invesquo_auto_recovery_b712','invesquo_reset_undo_v74'].includes(short))continue;
  result[short]=window.FinholdraCompact.decode(localStorage.getItem(k));
 }
 return result;
}

function makePortableBundle(){
 let observedPrices={};try{observedPrices=JSON.parse(store.getItem(PRICE_HISTORY_KEY)||'{}')}catch(_){}
 const profileStorage=accountDataForBundle();
 // Store a portable graph-ready series, not only isolated saved snapshots.
 const portableSnapshots=(()=>{
  const byDay=new Map();
  for(const item of [...fh10945ArchivedSnapshots(),...snapshots]){
   if(!item?.date)continue;
   const key=item.date+'|'+(item.source==='reconstructed'?'reconstructed':'observed');
   if(!byDay.has(key)||Number(item.stamp||0)>=Number(byDay.get(key).stamp||0))byDay.set(key,item);
  }
  return [...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-20000);
 })();
 const historicalKeys=Object.keys(profileStorage).filter(k=>k==='patrimonio_history_v36'||k==='patrimonio_trades_v36'||k==='finholdra_observations_v9930'||k==='finholdra_daily_closes_v1020'||k==='finholdra_first_verified_day_v1020'||k==='invesquo_asset_prices_v58'||k.startsWith('finholdra_verified_closes_'));
 const historyInventory={keys:Object.fromEntries(historicalKeys.map(k=>[k,profileStorage[k].length])),snapshots:portableSnapshots.length,trades:trades.length,observationDays:(()=>{try{return (JSON.parse(profileStorage.finholdra_observations_v9930||'[]')||[]).length}catch(_){return 0}})(),hasDailyArchive:!!profileStorage.finholdra_daily_closes_v1020,generatedAt:new Date().toISOString()};
 return {format:BUNDLE_FORMAT,version:6,createdAt:new Date().toISOString(),historyInventory,
  profile:{name:window.invesquoLocalAccount?.name||'Profilo',sourceId:ACCOUNT_ID},profileStorage,
  assets:JSON.parse(JSON.stringify(state.assets)),lastUpdate:state.lastUpdate,
  filters:{...filter},snapshots:JSON.parse(JSON.stringify(portableSnapshots)),
  trades:JSON.parse(JSON.stringify(trades)),preferences:JSON.parse(JSON.stringify(prefs)),
  pacSchedules:readPacSchedules(),etfHoldingsLookthrough:(()=>{try{return JSON.parse(store.getItem('finholdra_etf_holdings_9955')||'[]')}catch(_){return []}})(),dailyObservations:(()=>{try{return JSON.parse(store.getItem('finholdra_observations_v9930')||'[]')}catch(_){return []}})(),quoteHistory:observedPrices,detailQuoteHistory:(()=>{try{return JSON.parse(store.getItem('invesquo_asset_prices_v58')||'{}')}catch(_){return {}}})(),returnMethod,historyRange,
  note:'Solo rilevazioni effettivamente salvate. Le transazioni retrodatate non generano prezzi storici mancanti.'};
}
function applyPortableBundle(json){
 if(!json||!Array.isArray(json.assets)||!Array.isArray(json.trades||[])||!Array.isArray(json.snapshots||[]))throw Error('Archivio incompleto o non valido.');
 if(json.assets.length>10000||json.trades?.length>100000||json.snapshots?.length>20000)throw Error('Archivio troppo grande.');
 const unique=new Set();for(const a of json.assets){
  if(!a||typeof a.id!=='string'||!a.id||unique.has(a.id)||!CAT.some(([c])=>c===a.cat))throw Error('Titolo non valido o duplicato nel file.');
  if(!Number.isFinite(Number(a.q))||Number(a.q)<0||!Number.isFinite(Number(a.p))||Number(a.p)<0)throw Error('Quote o prezzo non validi per '+a.id);
  unique.add(a.id);
 }
 const incoming=json.assets.map(a=>({...a}));
 const importedTrades=Array.isArray(json.trades)?json.trades.map(t=>({...t})):[];
 for(const t of importedTrades){if(!t||!t.asset||!['buy','sale'].includes(t.kind)||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isFinite(Number(t.quantity)))throw Error('Transazione non valida.');}
 const importedSnapshots=Array.isArray(json.snapshots)?json.snapshots.map(x=>({...x})):[];
 for(const x of importedSnapshots){if(!x||!/^\d{4}-\d{2}-\d{2}$/.test(x.date))throw Error('Data di una rilevazione non valida.');}
 // validate first, then publish the whole state in the same operation
 state={assets:incoming,lastUpdate:String(json.lastUpdate||'Archivio importato')};
 snapshots=importedSnapshots;trades=importedTrades;writePacSchedules(Array.isArray(json.pacSchedules)?json.pacSchedules:[]);
 filter={};CAT.forEach(([c])=>{filter[c]=typeof json.filters?.[c]==='boolean'?json.filters[c]:true});
 if(Array.isArray(json.etfHoldingsLookthrough)&&json.etfHoldingsLookthrough.length<=15000){try{store.setItem('finholdra_etf_holdings_9955',JSON.stringify(json.etfHoldingsLookthrough))}catch(_){}}
 if(Array.isArray(json.dailyObservations)){try{store.setItem('finholdra_observations_v9930',JSON.stringify(json.dailyObservations.filter(x=>x&&/^\d{4}-\d\d-\d\d$/.test(x.date)&&x.byAsset).slice(-4000)))}catch(_){}}
 if(json.preferences&&typeof json.preferences==='object')prefs={...PREF_DEFAULTS,...json.preferences,colors:{...PREF_DEFAULTS.colors,...json.preferences.colors}};
 returnMethod=['daily','twrr','mwrr','roi','archive','stats'].includes(json.returnMethod)?json.returnMethod:'daily';
 historyRange=['1','7','30','183','365','all'].includes(String(json.historyRange))?String(json.historyRange):'7';
 try{store.setItem(PRICE_HISTORY_KEY,JSON.stringify(json.quoteHistory&&typeof json.quoteHistory==='object'?json.quoteHistory:{}));if(json.detailQuoteHistory&&typeof json.detailQuoteHistory==='object')store.setItem('invesquo_asset_prices_v58',JSON.stringify(json.detailQuoteHistory))}catch(_){}
 for(const [k,v] of Object.entries(json.profileStorage||{})){if((k.startsWith('finholdra_verified_closes_')||k===FH102_CLOSE_KEY||k===FH102_AUDIT_KEY)&&typeof v==='string'){try{store.setItem(k,v)}catch(_){}}}
 save();saveTimeline();saveFilters();savePreferences();
 store.setItem(RETURN_METHOD_KEY,returnMethod);
 normalizeLegacyTrades();
 // Never overwrite imported past observations with current prices on import.
 refreshBuyOptions();applyPreferences();render();if(editing)renderEditor();
 updateMethodButtons();
}
// Cloud integration receives the exact same validated JSON used by local backup.
window.FINHOLDRA_CLOUD_BRIDGE={exportBundle:makePortableBundle,importBundle:applyPortableBundle,accountId:()=>ACCOUNT_ID,profileName:()=>window.invesquoLocalAccount?.name||'Profilo'};
function showResetUndo(){const bar=$('resetUndoBar');if(bar)bar.classList.toggle('hidden',!store.getItem(RESET_UNDO_KEY))}
$('reset').onclick=()=>{
 if(!confirm('Azzerare TUTTI i titoli, le transazioni e le rilevazioni del portafoglio? La schermata diventerà vuota. Subito dopo potrai premere «Annulla reset».'))return;
 try{store.setItem(RESET_UNDO_KEY,JSON.stringify(makePortableBundle()))}catch(e){alert('Impossibile salvare una copia di sicurezza per annullare. Reset interrotto.');return}
 state={assets:[],lastUpdate:'Portafoglio vuoto'};snapshots=[];trades=[];writePacSchedules([]);historySelectedDay=null;filter={};CAT.forEach(([c])=>filter[c]=true);
 store.removeItem(PRICE_HISTORY_KEY);save();saveTimeline();saveFilters();refreshBuyOptions();render();if(editing)renderEditor();showResetUndo();
 $('settingsSaved').textContent='Portafoglio azzerato. Se è stato un errore, premi «Annulla reset» qui sotto.';
};
$('undoReset').onclick=()=>{
 try{const raw=store.getItem(RESET_UNDO_KEY);if(!raw)throw Error('Copia di annullamento non disponibile.');
  applyPortableBundle(JSON.parse(raw));store.removeItem(RESET_UNDO_KEY);showResetUndo();
  $('settingsSaved').textContent='Reset annullato: portafoglio, transazioni e rilevazioni ripristinati.';
 }catch(e){alert('Impossibile annullare il reset: '+e.message)}
};
$('backup').onclick=()=>{
 try{const bundle=makePortableBundle(),blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='finholdra-dati-'+today()+'.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);store.setItem('invesquo_last_backup_time',new Date().toISOString());showBackupReminder();
 $('settingsSaved').textContent='Backup esportato con movimenti, rilevazioni, chiusure storiche e archivi delle quotazioni presenti sul dispositivo.';
 }catch(e){alert('Esportazione non riuscita: '+e.message)}
};
$('import').onclick=()=>$('fileInput').click();
$('fileInput').onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  if(file.size>40*1024*1024)throw Error('Il file supera 40 MB.');
  const json=JSON.parse(await file.text());
  if(!json||!Array.isArray(json.assets))throw Error('Il file non contiene un portafoglio valido.');
  // Use the same complete account-scoped restore path as Google Drive login.
  // That path checks every historical key and reloads only after verified storage.
  await window.finholdraRestoreLoginFile(file,ACCOUNT_ID);
 }catch(err){alert('Importazione fallita: '+err.message)}finally{e.target.value=''}
};
showResetUndo();
$('currentAccountName').textContent=window.invesquoLocalAccount?.name||'Profilo locale';
$('switchLocalAccount').onclick=()=>{
 if(!confirm('Vuoi scaricare un JSON aggiornato e uscire? Premi OK per salvare il backup, Annulla per restare nel profilo.'))return;
 try{
  const b=makePortableBundle();const blob=new Blob([JSON.stringify(b,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='finholdra-profilo-'+String(window.invesquoLocalAccount?.name||'backup').toLowerCase().replace(/[^a-z0-9_-]+/g,'-')+'-'+today()+'.json';document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),12000);store.setItem('invesquo_last_backup_time',new Date().toISOString());
  // Give mobile Safari time to hand off the file before navigating.
  setTimeout(()=>window.invesquoLocalAccount.logout(),650);
 }catch(e){alert('Backup non riuscito; accesso mantenuto: '+e.message)}
};
$('openLocalPrivacy').onclick=()=>window.invesquoLocalAccount.showPrivacy();
$('deleteLocalAccount').onclick=()=>window.invesquoLocalAccount.deleteProfile();
const AUTO_KEY='patrimonio_auto_refresh_60s';let auto=!SIM_MODE;try{auto=SIM_MODE?store.getItem(AUTO_KEY)==='true':store.getItem(AUTO_KEY)!=='false'}catch(e){}$('auto').checked=auto;let busy=false,lastAttempt=0;
// Version 3.2: Investing.com Milano for Alphabet via HTTPS CORS relays; other quotes unchanged.
// Some public relays refuse financial sites; never replace valid local prices on failure.
const BTP_URL='https://www.borsaitaliana.it/borsa/obbligazioni/mot/btp/grafico.html?isin=IT0005735227&mic=MOTX&lang=it';
const API_TIMEOUT=6500;
async function readUrl(url,timeoutMs){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs||API_TIMEOUT);try{const response=await fetch(url,{signal:controller.signal,cache:'no-store',headers:{'Accept':'application/json,text/html,*/*'}});if(!response.ok)throw Object.assign(Error('HTTP '+response.status),{httpStatus:response.status});return await response.text()}finally{clearTimeout(timer)}}
function relayUrls(url){return [
  'https://api.allorigins.win/raw?url='+encodeURIComponent(url),
  'https://corsproxy.io/?url='+encodeURIComponent(url),
  'https://proxy.cors.dev/'+url
]}
function parseYahoo(text,a){const payload=JSON.parse(text);const r=payload&&payload.chart&&payload.chart.result&&payload.chart.result[0],meta=r&&r.meta;if(!meta)throw Error('risposta Yahoo vuota');const currency=String(meta.currency||'').toUpperCase();if(currency!=='EUR')throw Error('valuta inattesa: '+currency);const symbol=String(meta.symbol||'').toUpperCase();if(symbol!==a.symbol.toUpperCase())throw Error('ticker diverso: '+symbol);const price=Number(meta.regularMarketPrice);if(!Number.isFinite(price)||price<=0)throw Error('prezzo non valido');const epoch=Number(meta.regularMarketTime);if(!epoch||Math.abs(Date.now()/1000-epoch)>7*86400)throw Error('prezzo non recente');return{price,source:'Yahoo Finance Milano',when:new Date(epoch*1000).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}}
async function yahooQuote(a){
 const server=await quoteFromNetlify(a);if(server)return server;
 const endpoint='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(a.symbol)+'?interval=1d&range=5d';const errors=[];for(const url of [endpoint,...relayUrls(endpoint)]){try{return parseYahoo(await readUrl(url,API_TIMEOUT),a)}catch(e){errors.push(e.message)}}throw Error('Yahoo: '+errors.slice(-2).join(' / '))}
const ALPHABET_INVESTING_URL='https://it.investing.com/equities/google-inc-c?cid=1122334';
function parseInvestingAlphabet(html){
 const doc=new DOMParser().parseFromString(html,'text/html');
 doc.querySelectorAll('script,style,svg,nav,footer').forEach(n=>n.remove());
 const raw=(doc.body?doc.body.textContent:doc.documentElement.textContent||'').replace(/\s+/g,' ').trim();
 // Ensure the requested Milan listing, not NASDAQ, and EUR, not USD.
 const lead=raw.slice(0,5500);if(!/Alphabet\s+Inc\s+Class\s+C/i.test(lead)||!/Milano|Milan/i.test(lead)||!/Valuta\s+in\s+EUR|Currency\s+in\s+EUR/i.test(lead))throw Error('strumento Milano EUR non identificato');
 const marker=lead.search(/Valuta\s+in\s+EUR|Currency\s+in\s+EUR/i);let part=lead.slice(marker+13,marker+750);
 const m=part.match(/(?:^|\s)(\d{2,4}[,.]\d{2,4})(?=\s|$)/);
 if(!m)throw Error('prezzo Investing non disponibile');
 const price=Number(m[1].replace(',','.'));
 if(!Number.isFinite(price)||price<50||price>1000)throw Error('prezzo Investing anomalo');
 const tail=part.slice(m.index+m[0].length,320);
 const clock=tail.match(/(?:Dati\s+in\s+tempo\s+reale|Real-time\s+Data|Tempo\s+reale)[·\s:]*([0-2]?\d:[0-5]\d(?::[0-5]\d)?)/i);
 const closed=tail.match(/(?:Chiuso|Closed)[·\s]*(\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?)/i);
 if(!clock&&!closed)throw Error('orario/data Investing non leggibile');
 if(closed){const d=closed[1].split(/[\/.-]/).map(Number);if(d.length>=2){let year=d[2]||new Date().getFullYear();if(year<100)year+=2000;const ts=new Date(year,d[1]-1,d[0]);if(!Number.isFinite(ts.getTime())||Math.abs(Date.now()-ts.getTime())>7*86400000)throw Error('prezzo Investing non recente')}}
 return {price,source:'Investing.com · Alphabet C Milano EUR',when:clock?today()+' '+clock[1]:closed[1]+' (chiusura)'};
}
async function investingAlphabetQuote(){
 // Price is read by a same-origin Netlify serverless function, same as the 3.6 working build.
 const response=await fetch('/.netlify/functions/alphabet',{cache:'no-store',headers:{'Accept':'application/json'}});
 if(!response.ok){let reason='HTTP '+response.status;try{const e=await response.json();reason=e.error||reason}catch(_){}if(response.status===404)reason='Funzione server non installata o deploy incompleto';throw Error('Alphabet Milano: '+reason)}
 const d=await response.json();if(d.isin!=='US02079K1079'||d.currency!=='EUR'||d.symbol!=='1GOOG'||!Number.isFinite(Number(d.price))||Number(d.price)<=0)throw Error('Dati Alphabet non verificati');
 const stamp=new Date(d.asOf);if(!Number.isFinite(stamp.getTime())||Math.abs(Date.now()-stamp.getTime())>5*86400000)throw Error('Quotazione Alphabet non recente');
 return {price:Number(d.price),source:d.source,when:stamp.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+(d.delayed?' · differita':'')};
}
function cleanText(html){const doc=new DOMParser().parseFromString(html,'text/html');doc.querySelectorAll('script,style,svg,nav,footer').forEach(n=>n.remove());return(doc.body?doc.body.textContent:doc.documentElement.textContent||'').replace(/\s+/g,' ').trim()}
function parseBtp(text){if(!/IT0005735227/i.test(text))throw Error('ISIN BTP non riconosciuto');const content=cleanText(text);if(!/Btp Valore Insieme/i.test(content))throw Error('Strumento BTP non riconosciuto');
 // Heading area carries the last traded price. Do not use official/reference prices instead.
 const m=content.match(/Btp Valore Insieme Oc Oct31 Eur\s+(\d{2,3}[,.]\d{1,5})\s+[+−-]?\d{1,3}[,.]\d+\s*%/i);if(!m)throw Error('ultimo prezzo BTP non leggibile');const price=Number(m[1].replace(',','.'));
 const t=content.match(/Ultimo Contratto:\s*(\d{2})\/(\d{2})\/(\d{2,4})\s+(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?/i);if(!t)throw Error('data quotazione BTP non leggibile');const year=Number(t[3])<100?2000+Number(t[3]):Number(t[3]);const ts=new Date(year,Number(t[2])-1,Number(t[1]),Number(t[4]),Number(t[5]),Number(t[6]||0));if(!Number.isFinite(ts.getTime())||Math.abs(Date.now()-ts.getTime())>7*86400000)throw Error('quotazione BTP troppo vecchia');if(price<40||price>160)throw Error('prezzo BTP anomalo');return{price,source:'Borsa Italiana · MOT',when:ts.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}}
async function btpQuote(){const errs=[];for(const url of relayUrls(BTP_URL)){try{return parseBtp(await readUrl(url,API_TIMEOUT))}catch(e){errs.push(e.message)}}throw Error('Borsa Italiana non raggiungibile: '+errs.slice(-2).join(' / '))}
async function quoteFromNetlify(a){
 if(!a?.symbol||!currencyOf(a))return null;
 // Same-origin server can access Yahoo when Safari/Chrome blocks cross-origin requests.
 for(const url of [
  '/.netlify/functions/live-quote?symbol='+encodeURIComponent(a.symbol)+'&currency='+encodeURIComponent(currencyOf(a)),
  '/.netlify/functions/history?symbol='+encodeURIComponent(a.symbol)+'&range=5d&currency='+encodeURIComponent(currencyOf(a))
 ]){
  try{
   const response=await fetch(url,{cache:'no-store'});if(!response.ok)continue;
   const data=await response.json();
   if(data.symbol){
    const ts=new Date(data.asOf),p=Number(data.price);
    if(data.symbol.toUpperCase()===a.symbol.toUpperCase()&&data.currency===currencyOf(a)&&p>0&&Number.isFinite(ts.getTime())&&Math.abs(Date.now()-ts.getTime())<7*86400000)
     return {price:p,source:data.source||'Yahoo Finance · Server Netlify',when:ts.toLocaleString('it-IT')+(data.delayed?' · differita':'')};
   }else{
    const r=data.chart?.result?.[0],m=r?.meta,p=Number(m?.regularMarketPrice),epoch=Number(m?.regularMarketTime);
    if(String(m?.symbol||'').toUpperCase()===a.symbol.toUpperCase()&&String(m?.currency||'').toUpperCase()===currencyOf(a)&&p>0&&epoch>0&&Math.abs(Date.now()/1000-epoch)<7*86400)
     return {price:p,source:'Yahoo Finance · Netlify',when:new Date(epoch*1000).toLocaleString('it-IT')};
   }
  }catch(_){}
 }
 return null;
}
async function quoteAnyCurrency(a){
 const server=await quoteFromNetlify(a);if(server)return server;
 const endpoint='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(a.symbol)+'?interval=1d&range=5d';
 const urls=[endpoint,...relayUrls(endpoint)];const issues=[];
 for(const u of urls){try{const payload=JSON.parse(await readUrl(u,6500)),meta=payload?.chart?.result?.[0]?.meta;
  if(!meta||String(meta.symbol||'').toUpperCase()!==a.symbol.toUpperCase()||currencyOf(a)!==String(meta.currency||'').toUpperCase())throw Error('Ticker/valuta non corrispondenti');
  const p=Number(meta.regularMarketPrice);if(!(p>0))throw Error('Prezzo non disponibile');
  const ts=Number(meta.regularMarketTime);if(ts&&Math.abs(Date.now()-ts*1000)>7*86400000)throw Error('Prezzo troppo vecchio');
  return {price:p,source:'Yahoo Finance · '+a.symbol,when:ts?new Date(ts*1000).toLocaleString('it-IT'):'data non disponibile'};
 }catch(e){issues.push(e.message)}}throw Error(issues.slice(-2).join('; '));
}
async function bondQuoteFromHistory(a){
 if(!a.isin||!isinFormat(a.isin)||currencyOf(a)!=='EUR')throw Error('ISIN e valuta EUR necessari per lo storico MOT');
 const response=await fetch('/.netlify/functions/bond-history?isin='+encodeURIComponent(a.isin)+'&range=1mo',{cache:'no-store'});
 if(!response.ok)throw Error('Fonte MOT non disponibile: HTTP '+response.status);
 const data=await response.json();if(data.isin!==a.isin||data.unit!=='percentOfNominal'||!Array.isArray(data.points))throw Error('ISIN o unità di quotazione non corrispondenti');
 const prices=data.points.filter(p=>Number(p.t)>0&&Number(p.p)>40&&Number(p.p)<170).sort((x,y)=>x.t-y.t);if(!prices.length)throw Error('Manca il prezzo di mercato');
 const last=prices.at(-1),date=new Date(Number(last.t));if(Math.abs(Date.now()-date.getTime())>7*86400000)throw Error('Prezzo obbligazione non recente');
 return{price:Number(last.p),source:data.source||'MOT · Fonte storica',when:date.toLocaleDateString('it-IT')+' · chiusura'};
}
async function officialBondQuote(isin){
 const response=await fetch('/.netlify/functions/bond-quote?isin='+encodeURIComponent(isin),{cache:'no-store'});
 if(!response.ok){let info='HTTP '+response.status;try{const d=await response.json();info=d.error||info}catch(_){}throw Error('Borsa Italiana: '+info)}
 const d=await response.json();if(d.isin!==isin||d.currency!=='EUR'||!(Number(d.price)>40&&Number(d.price)<170)||!/^20\d{2}-\d\d-\d\d$/.test(d.priceDate||''))throw Error('Risposta ufficiale non verificata');
 if(Math.abs(Date.now()-Date.parse(d.priceDate+'T12:00:00Z'))>8*86400000)throw Error('Quotazione BTP non recente');
 return {price:Number(d.price),source:d.source,when:d.priceDate.split('-').reverse().join('/')+' · '+(d.priceType==='official-close'?'ufficiale':'riferimento'),priceDate:d.priceDate};
}
async function quote(a){return a.id==='goog'?investingAlphabetQuote():a.id==='btp'?officialBondQuote(a.isin||'IT0005735227'):a.cat==='Obbligazioni'&&a.isin?bondQuoteFromHistory(a):a.symbol?(currencyOf(a)==='EUR'?yahooQuote(a):quoteAnyCurrency(a)):Promise.reject(Error('Nessuna fonte prezzo automatico per questo strumento'))}
// Refresh FX independently from equity quotes: EURUSD=X is USD per EUR, hence invert.
let lastFxCheck=0;
async function refreshFxRates(){
 if(SIM_MODE||Date.now()-lastFxCheck<20*60000)return;
 const held=[...new Set(state.assets.map(currencyOf).filter(x=>x!=='EUR'))];if(!held.length)return;
 lastFxCheck=Date.now();let updated=false;
 await Promise.all(held.map(async currency=>{
  const sym='EUR'+currency+'=X',endpoint='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?range=5d&interval=1d';
  for(const url of [endpoint,...relayUrls(endpoint).slice(0,2)]){
   try{const d=JSON.parse(await readUrl(url,2900)),m=d?.chart?.result?.[0]?.meta;
    if(String(m?.symbol||'').toUpperCase()!==sym||String(m?.currency||'').toUpperCase()!==currency)continue;
    const rate=Number(m?.regularMarketPrice),stamp=Number(m?.regularMarketTime);
    if(!(rate>0)||!stamp||Math.abs(Date.now()-stamp*1000)>7*86400000)continue;
    for(const a of state.assets){if(currencyOf(a)===currency){a.fxRate=1/rate;a.fxQuoteAt=new Date(stamp*1000).toLocaleDateString('it-IT');updated=true}}
    break;
   }catch(_){}}
 }));
 if(updated){save();trackSnapshot();if(!editing)render()}
}

async function refresh(manual){
 if(busy||(!manual&&(!auto||document.visibilityState==='hidden'||!navigator.onLine||Date.now()-lastAttempt<(Number(prefs.refreshMinutes)||1)*60000)))return false;
 busy=true;lastAttempt=Date.now();$('refresh').disabled=true;$('refresh').textContent='Aggiorno…';const navRefresh=$('navRefreshQuotes');if(navRefresh){navRefresh.disabled=true;navRefresh.title='Aggiornamento in corso…'}
 invesquoUpdateStamp('Aggiornamento in corso…');
 try{
  const selected=state.assets.filter(a=>(a.symbol||a.id==='btp')&&a.cat!=='Risparmio postale'&&a.cat!=='Conto deposito'&&!a.postalKind);
  const results=await Promise.all(selected.map(async a=>{try{return{a,quote:await quote(a)}}catch(e){return{a,error:e.message||'rete non disponibile'}}}));
  let good=0;const failures=[];const checkedAt=new Date();
  for(const r of results){if(r.quote){r.a.p=r.quote.price;r.a.quoteAt=r.quote.when;r.a.quoteSource=r.quote.source;r.a.quoteUpdatedAt=checkedAt.toISOString();good++}else failures.push(r.a.name+': '+r.error)}
  if(good){state.lastUpdate=checkedAt.toLocaleString('it-IT')+' · '+good+'/'+selected.length+' quotazioni';recordDetailPrices();save();trackSnapshot();render();if(editing)renderEditor();if(!buyPriceEdited)syncBuyPrice()}
  $('refreshInfo').textContent='Ultimo controllo: '+checkedAt.toLocaleString('it-IT')+' · '+good+'/'+selected.length+' aggiornati';
  notice(good?good+' quotazioni aggiornate su '+selected.length+'.'+(failures.length?' Non aggiornati: '+failures.join(' | '):' Tutti i dati ricevuti.'):'Nessuna quotazione aggiornata. Prezzi precedenti conservati. '+failures.slice(0,2).join(' | '),good===0||failures.length>0);
  return good>0;
 }catch(err){notice('Aggiornamento non riuscito. Prezzi precedenti conservati. '+(err.message||''),true);return false}
 finally{busy=false;$('refresh').disabled=false;$('refresh').textContent='↻ Aggiorna';const navRefresh=$('navRefreshQuotes');if(navRefresh){navRefresh.disabled=false;navRefresh.title='Aggiorna quotazioni'}invesquoUpdateStamp();void refreshFxRates();void refreshFavoriteQuotes(true)}
}

// New buys: preview does not mutate positions. Confirmation updates quantity and weighted-average cost.
const tradeables=()=>state.assets.filter(a=>['Azioni','ETF','ETF monetari','Materie prime','Obbligazioni','ETC/ETN','Oro','Crypto','Valute'].includes(a.cat));
function buyTarget(){return state.assets.find(a=>a.id===$('buyAsset').value)}
function refreshBuyOptions(){const prior=$('buyAsset').value;$('buyAsset').innerHTML=tradeables().map(a=>'<option value="'+svgEscape(a.id)+'">'+svgEscape(a.name)+'</option>').join('');if(tradeables().some(a=>a.id===prior))$('buyAsset').value=prior;else $('buyAsset').value=tradeables()[0]?.id||'';syncBuyPrice();if(typeof refreshSaleOptions==='function')refreshSaleOptions()}
function syncBuyPrice(){const a=buyTarget(),el=$('buyPrice'),day=$('buyDate')?.value;const verifiedClose=!!(a&&el?.dataset?.closeAsset===String(a.id)&&el.dataset.closeDate===day);if(a&&!buyPriceEdited&&!verifiedClose)el.value=a.p;renderBuy()}
function computeBuy(){const a=buyTarget(),price=Number($('buyPrice').value);if(!a||!Number.isFinite(price)||price<=0)return null;
 const asAmount=entryMode('buyInputMode')==='eur',amount=Number($('buyAmount').value);const factor=assetFx(a)/(a.cat==='Obbligazioni'?100:1);
 const count=asAmount?(amount>0&&Number.isFinite(factor)&&factor>0?amount/(price*factor):NaN):Number($('buyQuantity').value);
 if(!Number.isFinite(count)||count<=0)return null;
 const spent=asAmount?amount:euroValue(a,price,count),prevQty=a.q,prevCapital=cap(a),newQty=prevQty+count,newPmc=(a.pmc*prevQty+price*count)/newQty;return{a,price,count,spent,newQty,newPmc,prevCapital}}
function renderBuy(){const t=computeBuy(),el=$('buyPreview'),warning=$('buyStale');if(!t){el.innerHTML='<div class="notice warn">Inserisci una quantità e un prezzo maggiori di zero.</div>';$('buyCommit').disabled=true;warning.classList.add('hidden');return}const a=t.a,last=a.quoteUpdatedAt?new Date(a.quoteUpdatedAt):null,age=last&&Number.isFinite(last.getTime())?(Date.now()-last.getTime())/3600000:Infinity;const isCurrent=age>=0&&age<=24;warning.classList.toggle('hidden',isCurrent);warning.textContent=isCurrent?'':'La quotazione automatica non è verificata nelle ultime 24 ore. Controlla il prezzo effettivo di acquisto sul broker.';
el.innerHTML='<div class="preview-cols"><div><small>Nuove quote</small><strong>'+entryDecimal(t.count)+'</strong></div><div><small>Prezzo per quota</small><strong>'+localMoney(t.price,currencyOf(a))+'</strong></div><div><small>Totale acquisto</small><strong>'+eur(t.spent)+'</strong></div><div><small>Quote totali dopo</small><strong>'+number(t.newQty)+'</strong></div><div><small>PMC precedente</small><strong>'+localMoney(a.pmc,currencyOf(a))+'</strong></div><div><small>Nuovo PMC ponderato</small><strong>'+localMoney(t.newPmc,currencyOf(a))+'</strong></div><div><small>Investito prima</small><strong>'+eur(t.prevCapital)+'</strong></div><div><small>Investito dopo</small><strong>'+eur(t.prevCapital+t.spent)+'</strong></div></div><p class="order-note">Fonte prezzo suggerito: '+svgEscape(a.quoteSource||'valore salvato')+' · '+svgEscape(a.quoteAt||'senza orario verificato')+'</p>';
$('buyCommit').disabled=!$('buyVerify').checked||!validEntryDate('buyDate')}
document.querySelectorAll('input[name="buyInputMode"]').forEach(r=>r.addEventListener('change',()=>{$('buyQuantityWrap').classList.toggle('entry-field-hidden',entryMode('buyInputMode')==='eur');$('buyAmountWrap').classList.toggle('entry-field-hidden',entryMode('buyInputMode')!=='eur');$('buyVerify').checked=false;renderBuy()}));
 $('buyAmount').addEventListener('input',renderBuy);$('buyDate').addEventListener('change',()=>{$('buyVerify').checked=false;renderBuy()});
 $('buyAsset').onchange=()=>{buyPriceEdited=false;$('buyVerify').checked=false;syncBuyPrice()};$('buyQuantity').oninput=renderBuy;$('buyPrice').oninput=()=>{buyPriceEdited=true;renderBuy()};$('buyVerify').onchange=renderBuy;

// v5.8 — Portfolio instrument detail. This feature is READ ONLY and never alters
// the quote adapter for 1GOOG or the saved portfolio; 3.6 remains unchanged.
const DETAIL_RANGES={
 '1d':{range:'1d',interval:'5m'},
 '5d':{range:'5d',interval:'60m'},
 '1mo':{range:'1mo',interval:'1d'},
 '3mo':{range:'3mo',interval:'1d'},
 '6mo':{range:'6mo',interval:'1d'},
 '1y':{range:'1y',interval:'1d'},
 'max':{range:'max',interval:'1mo'}
};
const MARKET_LABELS={goog:'GEM · Milano',vwce:'Borsa Italiana · Milano',xdev:'Borsa Italiana · Milano',rbot:'Borsa Italiana · Milano',btp:'MOT · Borsa Italiana'};
let assetDetailScrollY=0;let assetDetailId=null,assetDetailRange='1d',assetDetailRequest=0,assetDetailPoints=[],assetDetailMeta=null,assetDetailPreviousFocus=null;let pmcHistoryRange='week',pmcHistoryYear='';
let detailBaseSeries=null, detailLiveInterval=null, detailLiveBusy=false;
let assetCustomFrom='',assetCustomTo='';
function customDetailBounds(){if(!assetCustomFrom||!assetCustomTo||assetCustomFrom>assetCustomTo)return null;const from=Date.parse(assetCustomFrom+'T00:00:00Z'),to=Date.parse(assetCustomTo+'T23:59:59Z');return Number.isFinite(from)&&Number.isFinite(to)?{from,to}:null;}
function customDetailCut(points){const b=customDetailBounds();return b?points.filter(p=>p.t>=b.from&&p.t<=b.to):[];}

const detailCache=new Map();
function detailDate(epoch,intraday=false){return new Date(epoch).toLocaleString('it-IT',intraday?{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}:{day:'2-digit',month:'2-digit',year:'2-digit'})}
function detailIsMarketAsset(a){return ['ETF','ETF monetari','Materie prime','Azioni','ETC/ETN','Oro','Crypto','Valute','Futures'].includes(a.cat)||(a.cat==='Obbligazioni'&&!!a.symbol)}
function safePrice(v){return Number.isFinite(Number(v))&&Number(v)>0?Number(v):null}
function detailMarketLabel(a){return MARKET_LABELS[a.id]||(a.symbol?.endsWith('.MI')?'Borsa Italiana · Milano':a.exchange||'Mercato da verificare')}
function detailRangeChange(){
 const a=getDetailAsset();
 // Yahoo does not consistently supply verified daily/intraday history for shares on GEM/Milan.
 // Hide 1G and 1S for equities instead of silently showing 1M or one isolated point.
 const equities=a&&a.cat==='Azioni';
 const bonds=a&&a.cat==='Obbligazioni';
 $('assetDetailRanges').classList.toggle('equity-ranges',!!equities);
 // Beta 9.9.22: all bond periods can request actual historical MOT data.
 // In previous versions this class forcibly hid 1S/1M/1A/MAX for the BTP.
 $('assetDetailRanges').classList.toggle('btp-ranges',false);
 // One-week and one-day trading ranges may be requested for equities/ETCs. Missing historical candles remain explicitly unavailable.
 $('assetCustomDates').classList.toggle('hidden',assetDetailRange!=='custom');
 if(assetDetailRange==='custom'&&!$('assetCustomTo').value){const d=new Date(Date.now()-30*86400000);$('assetCustomFrom').value=d.toISOString().slice(0,10);$('assetCustomTo').value=today();}
 document.querySelectorAll('#assetDetailRanges button').forEach(b=>{
  const unavailable=false;
  b.hidden=unavailable;b.disabled=unavailable;
  let yes=b.dataset.assetRange===assetDetailRange;
  b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));
 });
}
function detailSetDelta(v){$('assetDetailDelta').textContent=v===null?'n.d.':(v>=0?'+':'')+pct(v);$('assetDetailDelta').className=v===null?'':(v>=0?'gain':'loss')}
function detailEmpty(text){$('assetDetailChart').innerHTML='<div class="asset-chart-empty">'+svgEscape(text)+'</div>'; $('assetDetailSelected').textContent='';detailSetDelta(null)}
function getDetailAsset(){return state.assets.find(a=>a.id===assetDetailId)||(window.finholdraPreviewAsset&&window.finholdraPreviewAsset.id===assetDetailId?window.finholdraPreviewAsset:null)}
// PMC ricostruito esclusivamente dal registro delle operazioni, in valuta di negoziazione.
// La vendita riduce le quantità senza modificare il costo medio delle quote residue.
function assetPmcEvents(a){
 if(!a||a.finholdraWatchOnly)return [];
 let qty=0,nativeCost=0;
 const events=[];
 for(const t of orderAssetTrades(a.id)){
  const q=Number(t.quantity),p=Number(t.price);
  if(!(q>0)||!(p>0)||!/^\d{4}-\d{2}-\d{2}$/.test(String(t.date||'')))continue;
  if(t.kind==='buy'){
   nativeCost+=q*p;qty+=q;
  }else if(t.kind==='sale'){
   if(q>qty+1e-7)continue;
   nativeCost-=qty>0?nativeCost*(q/qty):0;
   qty-=q;
   if(qty<1e-8){qty=0;nativeCost=0}
  }else continue;
  events.push({date:t.date,kind:t.kind,quantity:q,pmc:qty>0?nativeCost/qty:null,
   holdings:qty,assumed:!!t.assumedDate,price:p});
 }
 return events;
}
function formatPmcHistoryValue(n,a){return a.cat==='Obbligazioni'?number(n)+' / 100 '+currencyOf(a):localMoney(n,currencyOf(a));}
function pmcEventYears(events){return Array.from(new Set(events.map(e=>String(e.date||'').slice(0,4)).filter(Boolean))).sort((a,b)=>Number(b)-Number(a));}
function pmcIsoDate(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function pmcChangeEvents(events){const changed=[];let previous=null;for(const e of events){if(e.pmc===null){previous=null;continue}if(previous===null||Math.abs(previous-e.pmc)>1e-8)changed.push(e);previous=e.pmc;}return changed;}
function pmcPeriodBounds(){const now=new Date(),end=pmcIsoDate(now);if(pmcHistoryRange==='sixmonths'){const start=new Date(now.getFullYear(),now.getMonth()-6,now.getDate());return {start:pmcIsoDate(start),end,title:'Ultimi 6 mesi'};}if(pmcHistoryRange==='year'){const year=Number(pmcHistoryYear||now.getFullYear());return {start:year+'-01-01',end:year+'-12-31',title:String(year)};}if(pmcHistoryRange==='month'){return {start:now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01',end,title:'Mese corrente'};}const dow=(now.getDay()+6)%7,monday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-dow),sunday=new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+6);return {start:pmcIsoDate(monday),end:pmcIsoDate(sunday),title:'Settimana corrente'};}
function pmcSetRangeControls(events){const years=pmcEventYears(events),curr=String(new Date().getFullYear());if(!years.includes(curr))years.unshift(curr);const el=$('pmcHistoryYear'),wrap=$('pmcHistoryYearWrap');if(!pmcHistoryYear||!years.includes(pmcHistoryYear))pmcHistoryYear=years[0];if(el){el.innerHTML=years.map(y=>'<option value="'+y+'"'+(y===pmcHistoryYear?' selected':'')+'>'+y+'</option>').join('');}wrap?.classList.toggle('hidden',pmcHistoryRange!=='year');document.querySelectorAll('#pmcHistoryRanges [data-pmc-range]').forEach(b=>{const on=b.dataset.pmcRange===pmcHistoryRange;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});}
function pmcDateOffset(date){return Date.parse(date+'T12:00:00')}
function pmcGraphWithMarket(prices,events,a){const box=$('pmcHistoryGraph');if(!box)return;
 const bounds=pmcPeriodBounds(),start=pmcDateOffset(bounds.start),end=pmcDateOffset(bounds.end)+86400000-1,validPrices=(prices||[]).filter(x=>x&&Number.isFinite(x.t)&&Number.isFinite(x.p)&&x.p>0&&x.t>=start&&x.t<=end).sort((a,b)=>a.t-b.t);
 const changes=events.filter(e=>e.pmc!==null&&e.date>=bounds.start&&e.date<=bounds.end),marks=changes.map(e=>({ ...e,t:pmcDateOffset(e.date)}));
 if(!validPrices.length){const operations=events.filter(e=>e.date>=bounds.start&&e.date<=bounds.end);box.innerHTML='<div class="pmc-history-empty">Quotazioni del periodo non disponibili. '+(operations.length?'Sono presenti '+operations.length+' transazioni registrate:':'Nessun movimento datato in questo periodo.')+'</div>'+(operations.length?'<div class="fh-buy-ledger-entries">'+operations.map(e=>'<div class="fh-buy-ledger-entry">'+svgEscape(e.date)+' · '+(e.kind==='buy'?'Acquisto':'Vendita')+' · PMC '+(e.pmc===null?'—':svgEscape(formatPmcHistoryValue(e.pmc,a)))+'</div>').join('')+'</div>':'');return;}
 const W=342,H=174,L=13,R=13,T=21,B=31,span=Math.max(1,end-start),values=[...validPrices.map(x=>x.p),...marks.map(x=>x.pmc),...(!events.length&&Number(a.pmc)>0?[Number(a.pmc)]:[])],minimum=Math.min(...values),maximum=Math.max(...values),margin=(maximum-minimum)*.18||Math.max(.01,maximum*.01),lo=minimum-margin,hi=maximum+margin;
 const x=t=>L+(W-L-R)*Math.min(1,Math.max(0,(t-start)/span)),y=v=>T+(H-T-B)*(hi-v)/(hi-lo);
 const path=validPrices.map((pt,i)=>(i?'L':'M')+x(pt.t).toFixed(1)+' '+y(pt.p).toFixed(1)).join(' '),up=validPrices[validPrices.length-1].p>=validPrices[0].p,color=up?'#47dba9':'#fa8090';
 let grid='';for(let i=0;i<3;i++){const yy=T+i*(H-T-B)/2;grid+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy.toFixed(1)+'" y2="'+yy.toFixed(1)+'" stroke="rgba(150,176,210,.2)" stroke-dasharray="4 5"/>';}
 let axis='';if(pmcHistoryRange==='week'){for(let i=0;i<7;i++){const d=new Date(start+i*86400000),label=['L','M','M','G','V','S','D'][i];const xx=x(start+(i+.5)*86400000);axis+='<text x="'+xx.toFixed(1)+'" y="'+(H-9)+'" text-anchor="middle" font-size="10" fill="var(--muted)">'+label+' '+String(d.getDate()).padStart(2,'0')+'</text>';}}else{const ticks=pmcHistoryRange==='month'?5:7;for(let i=0;i<ticks;i++){const xx=L+(W-L-R)*(i/(ticks-1)),d=new Date(start+(end-start)*i/(ticks-1)),label=pmcHistoryRange==='month'?String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'):new Intl.DateTimeFormat('it-IT',{month:'short'}).format(d);axis+='<text x="'+xx.toFixed(1)+'" y="'+(H-9)+'" text-anchor="middle" font-size="10" fill="var(--muted)">'+svgEscape(label)+'</text>';}}
 let dots='';for(let i=0;i<marks.length;i++){const e=marks[i],xx=x(e.t),yy=y(e.pmc);dots+='<g class="pmc-event-dot" role="button" tabindex="0" aria-label="'+(e.kind==='sale'?'Vendita':'Acquisto')+' del '+svgEscape(shortDate(e.date))+' PMC '+svgEscape(formatPmcHistoryValue(e.pmc,a))+'" data-pmc-index="'+i+'"><circle cx="'+xx.toFixed(1)+'" cy="'+yy.toFixed(1)+'" r="5.5"/><circle class="hit-area" cx="'+xx.toFixed(1)+'" cy="'+yy.toFixed(1)+'" r="16"/></g>';}
 box.innerHTML='<div class="pmc-history-plot"><svg class="pmc-history-chart"'+abSeriesAttribute(validPrices.map(p=>({x:x(p.t),y:y(p.p),value:p.p,label:detailDate(p.t)})),'price',currencyOf(a))+' viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Prezzi di mercato con indicatori PMC degli acquisti">'+grid+(!events.length&&Number(a.pmc)>0?'<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(Number(a.pmc)).toFixed(1)+'" y2="'+y(Number(a.pmc)).toFixed(1)+'" stroke="#f3bb63" stroke-width="1.8" stroke-dasharray="5 5"/>':'')+'<path d="'+path+'" fill="none" stroke="'+color+'" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>'+dots+axis+'</svg><div class="pmc-event-info" id="pmcEventInfo" role="status" aria-live="polite"><span>● Prezzo di mercato</span><span style="color:#f3bb63">● PMC all’acquisto</span></div></div>';
 const info=$('pmcEventInfo');const show=(node)=>{const idx=Number(node.dataset.pmcIndex),e=marks[idx];if(!e)return;box.querySelectorAll('.pmc-event-dot').forEach(n=>n.classList.remove('selected'));node.classList.add('selected');info.innerHTML='<strong>'+(e.kind==='sale'?'Vendita':'Acquisto')+' · '+svgEscape(shortDate(e.date))+'</strong><span>PMC '+svgEscape(formatPmcHistoryValue(e.pmc,a))+'</span>';};
 box.querySelectorAll('.pmc-event-dot').forEach(n=>{n.addEventListener('click',()=>show(n));n.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();show(n)}});});
}
let pmcCompareRequest=0;
async function renderAssetPmcHistory(a){const panel=$('assetDetailPmcHistory');if(!panel)return;if(a.finholdraWatchOnly){panel.classList.add('hidden');return;}panel.classList.remove('hidden');
 const cats=['Azioni','ETF','ETF monetari','Materie prime','Obbligazioni','ETC/ETN','Oro','Crypto','Valute'],events=assetPmcEvents(a),changes=events.filter(e=>e.pmc!==null);const graph=$('pmcHistoryGraph'),latest=$('pmcHistoryLatest'),info=$('pmcHistoryInfo');
 latest.textContent=Number(a.pmc)>0?formatPmcHistoryValue(Number(a.pmc),a):'—';pmcSetRangeControls(events);
 if(!cats.includes(a.cat)){info.textContent='Valore di carico attuale';graph.innerHTML='';return;}
 const request=++pmcCompareRequest;const bounds=pmcPeriodBounds();const inPeriod=changes.filter(e=>e.date>=bounds.start&&e.date<=bounds.end);
 info.textContent=bounds.title+' · '+inPeriod.length+' '+(inPeriod.length===1?'operazione registrata':'operazioni registrate')+' · PMC ricostruito dagli acquisti e dalle vendite';if(!events.length&&Number(a.pmc)>0)info.textContent=bounds.title+' · PMC attuale disponibile, ma nessun acquisto con data verificata nello storico. Aggiungi le operazioni effettive in Acquisti e vendite per ricostruirlo.';graph.innerHTML='<div class="pmc-history-empty">Caricamento prezzi…</div>';
 let prices=[];
 try{
  if(a.symbol&&detailIsMarketAsset(a)){
   const range=pmcHistoryRange==='week'?'5d':pmcHistoryRange==='month'?'1mo':pmcHistoryRange==='sixmonths'?'6mo':'1y';
   const feed=await fetchDetailHistory(a,range);prices=feed.points||[];
   if(range!=='5d'&&pmcPeriodBounds().end>=today()){
    try{const recent=await fetchDetailHistory(a,'5d');prices=mergeRecentVerifiedHistory(prices,recent.points);}catch(_){}
   }
   if(pmcPeriodBounds().end>=today()){
    try{const current=await fetchDetailLiveQuote(a);prices=mergeRecentVerifiedHistory(prices,[current]);}catch(_){}
   }
  }else prices=localDetailSeries(a);
 }catch(_){prices=localDetailSeries(a);}
 if(request!==pmcCompareRequest||assetDetailId!==a.id)return;
 pmcGraphWithMarket(prices,events,a);
}

function latestBuyTradeForAsset(id){const trades=orderAssetTrades(id).filter(t=>t&&t.kind==='buy'&&Number(t.quantity)>0&&Number(t.price)>0&&/^\d{4}-\d{2}-\d{2}$/.test(String(t.date||'')));return trades.length?trades[trades.length-1]:null;}
function populateAssetInsight(a){
 const box=$('assetDetailInsight');if(!box||!a)return;
 const badge=$('assetInsightBadge'),headline=$('assetInsightHeadline'),text=$('assetInsightText'),progress=$('assetInsightProgress'),pos=$('assetInsightPosition'),weight=$('assetInsightWeight'),last=$('assetInsightLastBuy');
 const invested=!a.finholdraWatchOnly?cap(a):0,current=!a.finholdraWatchOnly?val(a):0,position=!a.finholdraWatchOnly?(current-invested):null,ratio=!a.finholdraWatchOnly&&invested>0?((current-invested)/invested)*100:null,total=totalValue(),weightPct=!a.finholdraWatchOnly&&total>0?(current/total)*100:null,lastBuy=latestBuyTradeForAsset(a.id),fromLast=(lastBuy&&safePrice(a.p)&&safePrice(lastBuy.price))?((Number(a.p)-Number(lastBuy.price))/Number(lastBuy.price))*100:null;
 box.classList.remove('hidden');
 if(a.finholdraWatchOnly){badge.textContent='Solo mercato';headline.textContent='Titolo osservato';text.textContent='Stai monitorando questo strumento senza averlo in portafoglio. Il peso sul patrimonio resta a zero e l’insight non genera segnali operativi.';pos.textContent='—';weight.textContent='0,00%';last.textContent='—';progress.style.width='0%';return;}
 badge.textContent='Insight posizione';
 if(ratio===null){headline.textContent='Dati incompleti';text.textContent='Servono prezzo attuale e capitale investito per generare una lettura della posizione.';}
 else if(ratio>=12){headline.textContent='Posizione in forte vantaggio';text.textContent='Il titolo è ben sopra il tuo prezzo medio. '+(fromLast!==null?('Dall’ultimo acquisto segna '+(fromLast>=0?'+':'')+pct(fromLast/100)+'. '):'')+'Valuta il peso sul patrimonio prima di aggiungere altra concentrazione.';}
 else if(ratio>=0){headline.textContent='Posizione sopra il PMC';text.textContent='Il rendimento è positivo ma ancora controllabile. '+(fromLast!==null?('Rispetto all’ultimo acquisto sei a '+(fromLast>=0?'+':'')+pct(fromLast/100)+'. '):'')+'Puoi usarlo come promemoria rapido, non come consiglio di investimento.';}
 else if(ratio>-7){headline.textContent='Piccolo drawdown';text.textContent='La posizione è sotto il PMC ma in una fascia ancora contenuta. '+(fromLast!==null?('Dall’ultimo acquisto sei a '+(fromLast>=0?'+':'')+pct(fromLast/100)+'. '):'')+'Controlla se il peso in portafoglio resta coerente.';}
 else{headline.textContent='Pressione elevata';text.textContent='Il titolo è molto sotto il PMC. Prima di mediare osserva dimensione della posizione, orizzonte temporale e rischio complessivo.';}
 pos.textContent=position===null?'—':((position>=0?'+':'')+eur(position)+' · '+(ratio>=0?'+':'')+pct(ratio/100));
 weight.textContent=weightPct===null?'—':pct(weightPct/100);
 last.textContent=lastBuy?shortDate(lastBuy.date):'—';
 const fill=invested>0?Math.max(0,Math.min(100,(current/invested)*100)):0;progress.style.width=fill.toFixed(1)+'%';
}
function getDetailAssetById(id){return state.assets.find(x=>x.id===id)||(window.finholdraPreviewAsset&&window.finholdraPreviewAsset.id===id?window.finholdraPreviewAsset:null)} function openAssetDetail(id){const a=getDetailAssetById(id);if(!a)return;const external=$('assetDetailExternal');external.classList.toggle('hidden',!(detailIsMarketAsset(a)||a.id==='btp'));

if(a.cat!=='Obbligazioni'&&detailIsMarketAsset(a)&&a.symbol&&/^[A-Za-z0-9.^=\-]{1,22}$/.test(a.symbol)){external.href='https://it.finance.yahoo.com/quote/'+encodeURIComponent(a.symbol)+'/chart/';external.textContent='Apri grafico Yahoo Finance ↗'}else if(a.cat==='Obbligazioni'&&a.isin){external.href='https://www.borsaitaliana.it/borsa/obbligazioni/mot/btp/scheda/'+encodeURIComponent(a.isin)+'-MOTX.html';external.textContent='Consulta strumento su Borsa Italiana ↗'}else{external.classList.add('hidden')}if(detailLiveInterval){clearInterval(detailLiveInterval);detailLiveInterval=null}detailBaseSeries=null;assetCustomFrom='';assetCustomTo='';$('assetCustomFrom').value='';$('assetCustomTo').value='';assetDetailPreviousFocus=document.activeElement;assetDetailScrollY=window.scrollY||0;assetDetailId=id;assetDetailRange=(a.cat==='Azioni'||a.cat==='Obbligazioni'?'1mo':'1d');pmcHistoryRange='week';pmcHistoryYear='';$('assetDetailProvider').innerHTML=a.id==='btp'?'<option value="mot">Euronext · MOT</option>':a.cat==='Obbligazioni'?'<option value="yahoo">Yahoo Finance</option>': '<option value="yahoo">Yahoo Finance · dati verificati</option>'+(a.cat==='Crypto'?'<option value="kraken">Kraken · API pubblica</option>':'');$('assetDetailOverlay').classList.remove('hidden');document.body.classList.add('asset-detail-open');$('assetDetailSheet').scrollTop=0;const matPanel=$('assetDetailMaturityEditor');const matAvailable=a.cat==='Obbligazioni'||a.cat==='Risparmio postale'||a.cat==='Conto deposito';matPanel.classList.toggle('hidden',!matAvailable);if(matAvailable){$('assetDetailMaturityDate').value=a.maturityDate||'';$('assetDetailMaturityValue').value=a.maturity??'';$('assetDetailMaturityFeedback').textContent='';} $('assetDetailTitle').textContent=a.name;const detailIcon=$('assetDetailIcon');if(detailIcon)detailIcon.innerHTML=issuerIcon(a.id,a);$('assetDetailSub').textContent=[a.symbol||a.cat,a.isin||'',detailMarketLabel(a),a.cat==='Obbligazioni'?currencyOf(a)+' / 100 nominali':currencyOf(a)].filter(Boolean).join(' · ');$('assetDetailPmc').textContent=a.finholdraWatchOnly?'—':a.cat==='Obbligazioni'?number(a.pmc)+' / 100 '+currencyOf(a):localMoney(a.pmc,currencyOf(a));populateAssetInsight(a);renderAssetPmcHistory(a);$('assetDetailQty').textContent=a.finholdraWatchOnly?'Non posseduto':a.id==='btp'?eur(a.q)+' nominali':a.cat==='Conto deposito'||a.id==='bfp'?'1 posizione':a.cat==='Risparmio postale'&&a.postalKind?eur(a.q)+' nominali':number(a.q)+' quote';$('assetDetailInvested').textContent=a.finholdraWatchOnly?'—':eur(cap(a));$('assetDetailValue').textContent=a.finholdraWatchOnly?'—':eur(val(a));$('assetDetailPrice').textContent=a.cat==='Obbligazioni'?number(a.p)+' / 100 '+currencyOf(a):a.id==='bfp'||a.postalKind?'Non quotato':a.cat==='Conto deposito'?eur(val(a)):localMoney(a.p,currencyOf(a));$('assetDetailPriceLabel').textContent=a.finholdraWatchOnly?'Prezzo di mercato':a.cat==='Conto deposito'?'Valore stimato':a.id==='bfp'||a.postalKind?'Valore nominale':'Ultimo prezzo salvato';$('assetDetailSource').textContent=a.postalKind?'Buono postale non quotato · importo di rimborso da verificare':a.quoteAt?'Ultima quotazione: '+a.quoteAt:'Ultima quotazione: non verificata';detailRangeChange();$('assetDetailClose').focus();loadAssetDetail();detailLiveInterval=setInterval(()=>{if(assetDetailId&&document.visibilityState!=='hidden'&&navigator.onLine)void updateDetailLiveQuote(assetDetailRequest)},60000);}
function closeAssetDetail(){window.finholdraPreviewAsset=null;if(detailLiveInterval){clearInterval(detailLiveInterval);detailLiveInterval=null}detailBaseSeries=null;assetDetailRequest++;assetDetailId=null;$('assetDetailOverlay').classList.add('hidden');document.body.classList.remove('asset-detail-open');window.scrollTo(0,assetDetailScrollY);assetDetailPoints=[];if(assetDetailPreviousFocus&&assetDetailPreviousFocus.isConnected)assetDetailPreviousFocus.focus()}
$('assetDetailMaturitySave').onclick=()=>{const a=getDetailAsset();if(!a||!['Obbligazioni','Risparmio postale','Conto deposito'].includes(a.cat))return;const d=$('assetDetailMaturityDate').value;const v=$('assetDetailMaturityValue').value.trim();if(d&&!/^\d{4}-\d{2}-\d{2}$/.test(d)){alert('Data di scadenza non valida.');return}if(v&&(!Number.isFinite(Number(v))||Number(v)<0)){alert('Valore previsto non valido.');return}a.maturityDate=d;a.maturity=v?Number(v):null;save();trackSnapshot();render();if(editing)renderEditor();$('assetDetailMaturityFeedback').textContent='Scadenza salvata nel portafoglio.';};
$('assetDetailClose').onclick=closeAssetDetail;$('assetDetailProvider').onchange=()=>loadAssetDetail();
$('assetDetailOverlay').addEventListener('click',e=>{if(e.target===$('assetDetailOverlay'))closeAssetDetail()});
$('assetDetailRanges').addEventListener('click',e=>{const b=e.target.closest('[data-asset-range]');if(!b||!assetDetailId||b.disabled||b.hidden)return;assetDetailRange=b.dataset.assetRange;detailRangeChange();if(assetDetailRange==='custom'&&!customDetailBounds()){ $('assetDetailNote').textContent='Seleziona le date e premi Mostra.';return;}loadAssetDetail()});
$('assetCustomApply').addEventListener('click',()=>{const from=$('assetCustomFrom').value,to=$('assetCustomTo').value||today();if(!from||!to||from>to||to>today()){ $('assetDetailNote').textContent='Seleziona due date valide, in ordine cronologico e non future.';return;}assetCustomFrom=from;assetCustomTo=to;assetDetailRange='custom';detailRangeChange();loadAssetDetail();});
$('pmcHistoryRanges').addEventListener('click',e=>{const b=e.target.closest('[data-pmc-range]');if(!b||!assetDetailId)return;pmcHistoryRange=b.dataset.pmcRange;const a=getDetailAsset();if(a)renderAssetPmcHistory(a)});
$('pmcHistoryYear').addEventListener('change',e=>{pmcHistoryYear=e.target.value;const a=getDetailAsset();if(a)renderAssetPmcHistory(a)});
document.addEventListener('keydown',e=>{if($('assetDetailOverlay').classList.contains('hidden'))return;if(e.key==='Escape'){e.preventDefault();closeAssetDetail()}if(e.key==='Tab'){const fs=Array.from($('assetDetailSheet').querySelectorAll('button:not([disabled]),[tabindex="0"]'));if(!fs.length)return;const first=fs[0],last=fs[fs.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
function parseHistoryPayload(data,symbol){
 // No silent fallback to another exchange, another currency or another class of shares.
 const r=data?.chart?.result?.[0],m=r?.meta,quotes=r?.indicators?.quote?.[0]?.close,times=r?.timestamp;
 if(!r||!m||!Array.isArray(times)||!Array.isArray(quotes))throw Error('Serie storica non disponibile');
 if(String(m.symbol||'').toUpperCase()!==symbol.toUpperCase())throw Error('Ticker restituito diverso da quello richiesto');
 if(String(m.currency||'').toUpperCase()!==currencyOf(getDetailAsset()||{currency:'EUR'}))throw Error('Valuta inattesa per lo strumento: '+m.currency);
 const items=times.map((t,i)=>({t:Number(t)*1000,p:Number(quotes[i])})).filter(pt=>Number.isFinite(pt.t)&&Number.isFinite(pt.p)&&pt.p>0&&pt.t<=Date.now()+3600000).sort((a,b)=>a.t-b.t);
 const pts=items.filter((pt,i)=>!i||pt.t!==items[i-1].t);
 if(!pts.length)throw Error('Nessuna quotazione utilizzabile');
 return {points:pts,previousClose:safePrice(m.chartPreviousClose)||safePrice(m.previousClose),currency:m.currency,source:'Yahoo Finance · '+symbol,market:String(m.exchangeName||m.fullExchangeName||'')};
}
async function fetchDetailHistory(a,range){
 const custom=range==='custom'?customDetailBounds():null;
 if(range==='custom'&&!custom)throw Error('Seleziona la data di inizio e fine');
 const duration=custom?(custom.to-custom.from)/86400000:0;
 const settings=custom?{interval:duration>750?'1wk':'1d'}:DETAIL_RANGES[range],key=a.symbol+'|'+range+'|'+(custom?assetCustomFrom+'|'+assetCustomTo:'')+'|'+currencyOf(a),previous=detailCache.get(key);
 if(previous&&Date.now()-previous.at<(range==='1d'&&/=F$/i.test(String(a.symbol||''))?20000:range==='1d'?60000:240000))return previous.data;
 // If a longer verified daily range was already loaded, reuse it instantly for 3M/1M.
 if(!custom&&['1mo','3mo','6mo'].includes(range)){
  const months={ '1mo':31,'3mo':93,'6mo':183 },start=Date.now()-months[range]*86400000;
  const longer=range==='1mo'?['3mo','6mo','1y','max']:range==='3mo'?['6mo','1y','max']:['1y','max'];
  for(const span of longer){const cached=detailCache.get(a.symbol+'|'+span+'||'+currencyOf(a));
   if(cached&&Date.now()-cached.at<3600000&&cached.data?.points?.length>=5){
    const pts=cached.data.points.filter(x=>x.t>=start);
    if(pts.length>=5&&pts[0].t<=start+10*86400000)return {...cached.data,points:pts,source:cached.data.source+' · periodo filtrato'};
   }
  }
 }
 const isFuture=/=F$/i.test(String(a.symbol||''))||a.cat==='Futures';
 const isFutureDay=isFuture&&range==='1d'&&!custom;
 const base='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(a.symbol);
 const uri=base+'?'+(custom?'period1='+Math.floor(custom.from/1000)+'&period2='+Math.floor((custom.to+1000)/1000):isFutureDay?'range=5d':'range='+settings.range)+'&interval='+(isFutureDay?'1m':settings.interval)+'&includePrePost='+(isFuture?'true':'false');
 const server='/.netlify/functions/history?symbol='+encodeURIComponent(a.symbol)+'&range='+encodeURIComponent(range)+'&currency='+encodeURIComponent(currencyOf(a));
 const sources=[['server',server],['Yahoo',uri],...relayUrls(uri).map((url,i)=>['proxy'+i,url])];
 // The CME session can include hours outside the ordinary US cash session.
 // If the 1-minute endpoint is unavailable, retain a genuine 5-minute fallback.
 if(isFutureDay){
  // 1-day and 5-day Yahoo feeds can have different update cadence and session
  // coverage. Query both, retaining only real candles for this symbol/currency.
  sources.push(['Yahoo 1d 1m',base+'?range=1d&interval=1m&includePrePost=true']);
  sources.push(['Yahoo 5d 2m',base+'?range=5d&interval=2m&includePrePost=true']);
  sources.push(['Yahoo 5d 5m',base+'?range=5d&interval=5m&includePrePost=true']);
 }
 const failures=[];
 try{
  const contenders=sources.map(async ([source,url])=>{
   try{
    const parsed=JSON.parse(await readUrl(url,source==='server'?7500:6500));
    const data=parseHistoryPayload(parsed,a.symbol);
    const cutoff=range==='1d'?Date.now()-25*3600000:range==='5d'?Date.now()-7*86400000:null;
    if(custom)data.points=customDetailCut(data.points);
    if(cutoff!==null)data.points=data.points.filter(p=>p.t>=cutoff);
    if(!data.points.length)throw Error('Nessuna rilevazione nel periodo richiesto');
    data.source+=' · '+(source==='server'?'server':'web');return data;
   }catch(e){failures.push(source+': '+(e.message||'errore'));throw e}
  });
  // For futures, a quick but truncated response is NOT preferable to a slightly
  // slower, complete Yahoo series. Compare the last verified timestamp and
  // candle coverage; all responses must pass identity/currency checks above.
  let data;
  if(isFutureDay){
   const settled=await Promise.allSettled(contenders);
   const good=settled.filter(s=>s.status==='fulfilled').map(s=>s.value);
   if(!good.length)throw Error('Storico futures non disponibile');
   const freshness=d=>d.points.at(-1)?.t||0;
   const score=d=>{const last=freshness(d),now=Date.now();return last>=now-30*60000?1000000+d.points.length:last/60000+d.points.length/5};
   good.sort((a,b)=>score(b)-score(a));data=good[0];
   // Merge only actual matching-timestamp Yahoo observations, not synthetic
   // interpolation, avoiding sparse gaps when one feed has extra bars.
   // Use all verified real candles, even when one Yahoo response ends earlier.
   // Prefer higher-resolution data (1m > 2m > 5m) on duplicate timestamps.
   const merged=new Map();
   const ordered=good.slice().sort((a,b)=>{
    const granularity=d=>d.points.length>1?Math.min(...d.points.slice(1,Math.min(d.points.length,90)).map((p,i)=>p.t-d.points[i].t).filter(n=>n>0)):Infinity;
    return granularity(b)-granularity(a);
   });
   for(const feed of ordered)for(const point of feed.points){
    if(Number.isFinite(point.t)&&Number.isFinite(point.p)&&point.p>0)merged.set(point.t,point);
   }
   const full=[...merged.values()].sort((a,b)=>a.t-b.t);
   if(full.length>data.points.length||full.at(-1)?.t>freshness(data))
    data={...data,points:full,source:'Yahoo Finance · '+a.symbol+' · candele verificate integrate'};
  }else data=await Promise.any(contenders);
  detailCache.set(key,{at:Date.now(),data});return data;
 }catch(_){/* Fall through to real, locally observed quote history. */}
 // Use actual locally observed quotes in the selected period, not fictional intraday candles.
 const observed=localDetailSeries(a),lookback={'1d':1.04,'5d':7,'1mo':31,'3mo':93,'6mo':183,'1y':366,'max':3650}[range]||31;
 const points=custom?customDetailCut(observed):observed.filter(pt=>pt.t>=Date.now()-lookback*86400000);
 if(points.length)return {points,source:'Quotazioni verificate salvate sul dispositivo',previousClose:null,local:true};
 throw Error('Dati del periodo non disponibili: '+failures.slice(0,2).join(' · '));
}
// Integrate observed short-range prices with older charts, keeping one verified observation per day.
// Never fabricate timestamps, prices, or update the asset's saved quote.
function mergeRecentVerifiedHistory(base,recent){
 const combined=new Map();
 for(const point of [...(base||[]),...(recent||[])]){
  const t=Number(point?.t),p=Number(point?.p);
  if(!(t>0&&p>0&&Number.isFinite(t)&&Number.isFinite(p))||t>Date.now()+3600000)continue;
  const date=new Date(t).toISOString().slice(0,10),old=combined.get(date);
  if(!old||t>old.t)combined.set(date,{t,p});
 }
 return [...combined.values()].sort((x,y)=>x.t-y.t);
}
async function refreshDetailRecentHistory(request){
 const a=getDetailAsset(),base=detailBaseSeries;
 if(!a||!base||request!==assetDetailRequest||!['1mo','3mo','6mo','1y','max'].includes(assetDetailRange))return;
 try{
  const short=await fetchDetailHistory(a,'5d');
  if(request!==assetDetailRequest||assetDetailId!==a.id||detailBaseSeries!==base)return;
  const combined=mergeRecentVerifiedHistory(base.points,short.points);
  const prior=base.points[base.points.length-1]?.t||0;
  const newest=combined[combined.length-1]?.t||0;
  if(newest>prior+60000){
   detailBaseSeries={points:combined,previousClose:base.previousClose,source:base.source+' + rilevazioni recenti'};
   plotAssetDetail(combined,a,{previousClose:base.previousClose});
   $('assetDetailSource').textContent=detailBaseSeries.source+' · '+currencyOf(a);
   $('assetDetailNote').textContent='Storico integrato con l’ultima rilevazione verificata del periodo breve ('+detailDate(newest)+'). Nessun prezzo ricostruito.';
  }
 }catch(_){/* An older range remains valid if shorter history is unavailable. */}
 if(request===assetDetailRequest&&assetDetailId===a.id)void updateDetailLiveQuote(request);
}
function localDetailSeries(a){
 // A BTP without an authenticated historical feed can use only future local observations.
 // Never backfill the past or treat the redemption/coupon value as market price.
 const key='invesquo_asset_prices_v58',all=(()=>{try{return JSON.parse(store.getItem(key))||{}}catch(_){return {}}})();
 const entries=Array.isArray(all[a.id])?all[a.id]:[];
 return entries.filter(q=>Number.isFinite(Number(q.p))&&q.p>0&&Number.isFinite(Number(q.t))).map(q=>({t:Number(q.t),p:Number(q.p)})).sort((x,y)=>x.t-y.t);
}
function recordDetailPrices(){
 // Save only observed market values with verified timestamps; never save old defaults as fresh history.
 const key='invesquo_asset_prices_v58',all=(()=>{try{return JSON.parse(store.getItem(key))||{}}catch(_){return {}}})();
 for(const a of state.assets){if(!a.quoteUpdatedAt||!a.quoteSource||!Number.isFinite(Date.parse(a.quoteUpdatedAt)))continue;
  const time=Date.parse(a.quoteUpdatedAt),price=Number(a.p),ok=price>0&&Math.abs(Date.now()-time)<86400000;
  if(!ok||a.quoteSource==='Prezzo inserito manualmente')continue;
  if(!Array.isArray(all[a.id]))all[a.id]=[];
  if(!all[a.id].some(v=>Math.abs(v.t-time)<3600000))all[a.id].push({t:time,p:price});
  all[a.id]=all[a.id].slice(-1500);
 }
 try{store.setItem(key,JSON.stringify(all))}catch(_){/* keep portfolio untouched */}
}
function syntheticAccrualSeries(a,range){
 const start=Date.parse((a.depositStart||a.interestAnchor||today())+'T12:00:00'),daysBack={'1d':1,'5d':5,'1mo':30,'6mo':182,'1y':365,'max':730}[range],from=Math.max(start,Date.now()-daysBack*86400000),end=Date.now();
 const pts=[];for(let i=0;i<=24;i++){const t=from+(end-from)*i/24;const day=new Date(t),date=[day.getFullYear(),String(day.getMonth()+1).padStart(2,'0'),String(day.getDate()).padStart(2,'0')].join('-');pts.push({t,p:depositPrincipal(a)+depositAccrued(a,date)})}return pts;
}
function fh1069PriorClose(a,points,provided){
 const explicit=Number(provided);if(Number.isFinite(explicit)&&explicit>0)return explicit;
 if(!Array.isArray(points)||!points.length)return null;
 const sessionDate=new Date(points.at(-1).t).toLocaleDateString('en-CA',{timeZone:'Europe/Rome'});
 try{const archive=fh102Read(),rec=archive.assets?.[a.id]?.days||{};
  const prior=Object.entries(rec).filter(([date,r])=>date<sessionDate&&Number(r?.price)>0&&/close|verified|official|yahoo|stooq|borsa|histor/i.test(String(r?.quality||'')+' '+String(r?.source||''))).sort((x,y)=>x[0].localeCompare(y[0])).at(-1);
  if(prior)return Number(prior[1].price);
 }catch(_){}
 const previous=points.filter(p=>Number.isFinite(p.t)&&p.p>0&&new Date(p.t).toLocaleDateString('en-CA',{timeZone:'Europe/Rome'})<sessionDate).at(-1);
 return previous?Number(previous.p):null;
}
function plotAssetDetail(points,a,opts={}){
 const chart=$('assetDetailChart');assetDetailPoints=points;
 if(!points.length){detailEmpty('Non ci sono ancora rilevazioni sufficienti per questo periodo.');return}
 const sessionPoints=points;const close=assetDetailRange==='1d'?fh1069PriorClose(a,points,opts.previousClose):null;const hasPrior=assetDetailRange==='1d'&&(detailIsMarketAsset(a)||a.cat==='Obbligazioni')&&Number.isFinite(close)&&close>0;
 if(hasPrior){const gap=Math.max(60000,Math.min(15*60000,(points.at(-1).t-points[0].t)*.025));points=[{t:points[0].t-gap,p:close,priorClose:true},...points];}
 const W=360,H=215,L=18,R=18,T=22,B=27;
 const values=points.map(p=>p.p),pmc=(detailIsMarketAsset(a)||a.id==='btp')?Number(a.pmc):null;
 const limits=pmc&&Number.isFinite(pmc)&&pmc>0?[...values,pmc]:values;
 let low=Math.min(...limits),high=Math.max(...limits),margin=(high-low)*.13||Math.max(.01,high*.006);low-=margin;high+=margin;
 const left=points[0].t,right=points[points.length-1].t;
 const x=t=>L+(W-L-R)*(t-left)/Math.max(1,right-left),y=v=>T+(H-T-B)*(high-v)/Math.max(.001,high-low);
 const historical=points.filter(p=>!p.live);const drawHistorical=(historical.length?historical:points).filter(p=>!p.priorClose);
 const singleBond=a.cat==='Obbligazioni'&&points.length===1;
 // A single BTP quote is a horizontal reference LEVEL, not a fabricated
 // historical line. We do not imply that this price held throughout the range.
 const d=singleBond?'M'+L+' '+y(points[0].p).toFixed(2)+' L'+(W-R)+' '+y(points[0].p).toFixed(2):
  drawHistorical.map((p,i)=>(i&&!(assetDetailRange==='1d'&&/=(?:F|f)$/.test(String(a.symbol||''))&&p.t-drawHistorical[i-1].t>25*60000)?'L':'M')+x(p.t).toFixed(2)+' '+y(p.p).toFixed(2)).join(' ');
 const liveLast=points[points.length-1].live?points[points.length-1]:null;
 const isFutures=a.cat==='Futures'||/=(?:F|f)$/.test(String(a.symbol||a.ticker||''));
 // Futures: restore the dashed orange link between the last intraday candle
 // and the latest quote, matching the display used through beta 10.9.68.
 // For other asset classes the live quote remains an isolated observation.
 const futureGap=liveLast&&historical.length?liveLast.t-historical[historical.length-1].t:Infinity;
 const tail=liveLast&&historical.length?(isFutures&&futureGap>=0&&futureGap<=6*60000?'<line x1="'+x(historical[historical.length-1].t).toFixed(2)+'" y1="'+y(historical[historical.length-1].p).toFixed(2)+'" x2="'+x(liveLast.t).toFixed(2)+'" y2="'+y(liveLast.p).toFixed(2)+'" stroke="'+color+'" stroke-width="2.8"><title>Ultima quotazione collegata alla candela recente</title></line>':isFutures?'<line x1="'+x(historical[historical.length-1].t).toFixed(2)+'" y1="'+y(historical[historical.length-1].p).toFixed(2)+'" x2="'+x(liveLast.t).toFixed(2)+'" y2="'+y(liveLast.p).toFixed(2)+'" stroke="#f3c15a" stroke-width="2.4" stroke-dasharray="5 5"><title>Tra le due rilevazioni mancano candele Yahoo: nessuna interpolazione</title></line>':'<circle cx="'+x(liveLast.t).toFixed(2)+'" cy="'+y(liveLast.p).toFixed(2)+'" r="5.8" fill="#f3c15a" stroke="#fff" stroke-width="1.5"><title>Ultima quotazione isolata; dati intermedi non disponibili</title></circle>'):'';
 const borderTop='<line x1="'+L+'" y1="'+T+'" x2="'+(W-R)+'" y2="'+T+'" stroke="#52647a" stroke-opacity=".5" stroke-dasharray="3 6"/>',borderBottom='<line x1="'+L+'" y1="'+(H-B)+'" x2="'+(W-R)+'" y2="'+(H-B)+'" stroke="#52647a" stroke-opacity=".5" stroke-dasharray="3 6"/>';
 const mc=pmc&&Number.isFinite(pmc)&&pmc>0?'<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(pmc).toFixed(2)+'" y2="'+y(pmc).toFixed(2)+'" stroke="#f3c15a" stroke-width="1.6" stroke-dasharray="5 5"/><text x="'+(W-R)+'" y="'+Math.max(11,y(pmc)-6).toFixed(2)+'" fill="#f3c15a" font-size="10" text-anchor="end">PMC '+(a.cat==='Obbligazioni'?number(pmc):localMoney(pmc,currencyOf(a)))+'</text>':'';
 const upward=sessionPoints.at(-1).p>=sessionPoints[0].p,color=upward?'#45dbae':'#fa8090';
 const priorConnector=hasPrior&&points[1]?'<line x1="'+x(points[0].t).toFixed(2)+'" y1="'+y(close).toFixed(2)+'" x2="'+x(points[1].t).toFixed(2)+'" y2="'+y(points[1].p).toFixed(2)+'" stroke="#f3c15a" stroke-width="2.2" stroke-dasharray="5 5" stroke-linecap="round"><title>Raccordo tra chiusura precedente e prima quotazione disponibile della seduta</title></line>':'';
 const priorMark=hasPrior?'<g><circle cx="'+x(points[0].t)+'" cy="'+y(close)+'" r="5" fill="#f3c15a"><title>Chiusura precedente: '+number(close)+' (riferimento, non candela intraday)</title></circle></g>':'';
 const marks=singleBond||(liveLast&&!isFutures)?'': '<circle cx="'+x(points[points.length-1].t).toFixed(2)+'" cy="'+y(points[points.length-1].p).toFixed(2)+'" r="'+(liveLast?'5.8':'4.4')+'" fill="'+(liveLast?'#f3c15a':color)+'" stroke="#0c192b" stroke-width="2"/>';
 const axis=singleBond?'<text x="'+(W/2)+'" y="'+(H-7)+'" text-anchor="middle" fill="#a9b9ce" font-size="10">Ultima rilevazione: '+svgEscape(detailDate(left,false))+'</text>':
 '<text x="'+L+'" y="'+(H-7)+'" fill="#a9b9ce" font-size="10">'+svgEscape(hasPrior?'Chiusura prec.':detailDate(left,assetDetailRange==='1d'))+'</text><text x="'+(W-R)+'" y="'+(H-7)+'" text-anchor="end" fill="#a9b9ce" font-size="10">'+svgEscape(detailDate(right,assetDetailRange==='1d'))+'</text>';
 const area=!singleBond&&drawHistorical.length>1?'<path d="'+d+' L'+x(drawHistorical[drawHistorical.length-1].t).toFixed(2)+' '+(H-B)+' L'+x(drawHistorical[0].t).toFixed(2)+' '+(H-B)+' Z" fill="url(#fhDetailFill)"/>':'';
 const chartDefs='<defs><linearGradient id="fhDetailFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+color+'" stop-opacity=".22"/><stop offset="100%" stop-color="'+color+'" stop-opacity=".015"/></linearGradient></defs>';
 // Markers come directly from the transaction ledger, for all instrument types (including crypto).
 // Each dated operation remains individually available in the detail panel; nearby positions are visually grouped.
 const ledgerBuys=orderAssetTrades(a.id).filter(tr=>tr.kind==='buy'&&/^\d{4}-\d{2}-\d{2}$/.test(String(tr.date||'')));
 const chartStart=new Date(left).toISOString().slice(0,10),chartEnd=new Date(right).toISOString().slice(0,10);
 const inRange=ledgerBuys.filter(tr=>tr.date>=chartStart&&tr.date<=chartEnd);
 const verifiedPoints=points.filter(p=>Number.isFinite(p.t)&&Number.isFinite(p.p)&&p.p>0&&!p.live&&!p.priorClose);
 const individual=[];const withoutQuotation=[];
 for(const tr of inRange){
   const t=Date.parse(tr.date+'T12:00:00Z');
   const execution=Number(tr.price),isIntraday=assetDetailRange==='1d';
   // On 1G use the documented execution price for the vertical coordinate.
   // If the ledger has no time, choose the closest observed price of that session,
   // and explicitly mark the horizontal point as indicative, never an executed timestamp.
   const quoteDay=p=>new Date(p.t).toLocaleDateString('en-CA',{timeZone:'Europe/Rome'});
   const todayPoints=isIntraday?verifiedPoints.filter(p=>quoteDay(p)===tr.date):[];
   const timeText=String(tr.time||tr.executionTime||tr.executedAt||'');
   const timeMatch=timeText.match(/(?:T|^|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
   let executedTime=NaN;
   if(isIntraday&&timeMatch){const hh=Number(timeMatch[1]),mm=Number(timeMatch[2]);if(hh<24&&mm<60){const d=new Date(tr.date+'T00:00:00');d.setHours(hh,mm,Number(timeMatch[3]||0),0);executedTime=d.getTime();}}
   if(isIntraday&&todayPoints.length&&execution>0){
     const candidate=Number.isFinite(executedTime)?todayPoints.slice().sort((q,r)=>Math.abs(q.t-executedTime)-Math.abs(r.t-executedTime))[0]:todayPoints.slice().sort((q,r)=>Math.abs(q.p-execution)-Math.abs(r.p-execution))[0];
     individual.push({trade:tr,x:x(Number.isFinite(executedTime)?Math.max(left,Math.min(right,executedTime)):candidate.t),y:y(execution),quoteDate:tr.date,approxTime:!Number.isFinite(executedTime),executionOnly:true});continue;
   }
   // Longer ranges keep observed timestamps; the execution price always sets the mark height.
   const quote=verifiedPoints.filter(p=>Math.abs(p.t-t)<=5*86400000).sort((q,r)=>Math.abs(q.t-t)-Math.abs(r.t-t))[0];
   if(!quote){withoutQuotation.push(tr);if(execution>0){individual.push({trade:tr,x:x(Math.max(left,Math.min(right,t))),y:y(execution),quoteDate:null,executionOnly:true})}continue}
   individual.push({trade:tr,x:x(quote.t),y:y(execution>0?execution:quote.p),quoteDate:new Date(quote.t).toISOString().slice(0,10),executionOnly:execution>0});
 }
 individual.sort((a,b)=>a.x-b.x);
 const groups=[];
 for(const entry of individual){const lastGroup=groups[groups.length-1];if(lastGroup&&Math.abs(entry.x-lastGroup.x)<=13){lastGroup.ops.push(entry);lastGroup.x=lastGroup.ops.reduce((n,e)=>n+e.x,0)/lastGroup.ops.length;}else groups.push({x:entry.x,y:entry.y,ops:[entry]})}
 const buyMarks=singleBond?'':groups.map((g,i)=>{
   const xx=Number(g.x),yy=Number(g.y),count=g.ops.reduce((n,o)=>n+Number(o.trade.quantity||0),0);const qtyLabel=count.toLocaleString("it-IT",{maximumFractionDigits:6});const badgeWidth=Math.max(14,qtyLabel.length*5.4+6);
   const content=g.ops.map(o=>o.trade.date+' · '+Number(o.trade.quantity||0).toLocaleString('it-IT',{maximumFractionDigits:8})+' quote'+(o.executionOnly?' · marker al prezzo di esecuzione':'')+(o.approxTime?' · orario non registrato: posizione temporale indicativa':'')).join(' | ');
   const cx=Math.max(L+7,Math.min(W-R-7,xx));
   const labelY=16+(i%3)*14;
   // A slim vertical dashed guide avoids obscuring the plotted price curve.
   const color=g.ops.some(o=>o.executionOnly)?'#f1bb65':'#38dabb';const cy=Math.max(T+4,Math.min(H-B-4,yy));
   return '<g class="fh-buy-marker" data-buy-cluster="'+i+'" role="button" tabindex="0" aria-label="'+svgEscape(content)+'"><title>'+svgEscape(content)+'</title><line x1="'+cx.toFixed(2)+'" y1="'+(T+labelY)+'" x2="'+cx.toFixed(2)+'" y2="'+cy.toFixed(2)+'" stroke="'+color+'" stroke-dasharray="2 4" stroke-opacity=".37"/><circle cx="'+cx.toFixed(2)+'" cy="'+cy.toFixed(2)+'" r="3.4" fill="'+color+'" stroke="#092136" stroke-width="1.5"/><rect x="'+(cx-badgeWidth/2).toFixed(2)+'" y="'+(T+labelY-12)+'" width="'+badgeWidth+'" height="14" rx="7" fill="'+color+'"/><text x="'+cx.toFixed(2)+'" y="'+(T+labelY-2)+'" text-anchor="middle" font-size="9" font-weight="800" fill="#092136">'+svgEscape(qtyLabel)+'</text><circle cx="'+cx.toFixed(2)+'" cy="'+(T+labelY-5)+'" r="11" fill="transparent"/></g>';
 }).join('');
 const buyDetails=ledgerBuys.slice().reverse().map(tr=>'<div class="fh-buy-ledger-entry"><b>'+svgEscape(tr.date)+'</b> · '+Number(tr.quantity||0).toLocaleString('it-IT',{maximumFractionDigits:8})+' quote'+(tr.date<chartStart||tr.date>chartEnd?' · fuori intervallo':'')+'</div>').join('');
 const buyInventory='<details class="fh-buy-ledger"><summary>Acquisti registrati: '+ledgerBuys.length+' · nel grafico: '+individual.length+(withoutQuotation.length?' · '+withoutQuotation.length+' con prezzo di acquisto (nessuna quotazione)':'')+'</summary><div class="fh-buy-ledger-entries">'+(buyDetails||'Nessuna transazione registrata')+'</div></details>';
 const highlighted='<g id="assetHoverDot" style="display:none"><line id="detailCrosshair" class="chart-crosshair" x1="0" y1="'+T+'" x2="0" y2="'+(H-B)+'"/><circle id="detailTargetDot" cx="0" cy="0" r="5.8" fill="'+color+'" stroke="#fff" stroke-width="2"/><rect class="chart-tooltip-bg" id="detailTipBg" x="0" y="0" width="138" height="'+(hasPrior?49:33)+'" rx="7"/><text class="chart-tooltip-label" id="detailTipText" x="0" y="0" text-anchor="middle">—</text></g>';
 const singleBondLabel=singleBond?'<text x="'+(W-R)+'" y="'+Math.max(T+11,y(points[0].p)-8).toFixed(2)+'" text-anchor="end" font-size="10.5" fill="#45dbae">Ultimo prezzo '+number(points[0].p)+'/100</text>':'';
 chart.innerHTML='<svg id="detailSvg"'+abSeriesAttribute(points.map(p=>({x:x(p.t),y:y(p.p),value:p.p,label:p.priorClose?'Chiusura precedente':detailDate(p.t,assetDetailRange==='1d'||!!p.live)})),'price',currencyOf(a))+' data-fh81-buys="'+encodeURIComponent(JSON.stringify(individual.map(o=>({x:o.x,y:o.y,label:o.trade.date+' · '+Number(o.trade.quantity||0).toLocaleString('it-IT',{maximumFractionDigits:8})+' quote',date:o.trade.date,quantity:Number(o.trade.quantity||0)})))).replace(/'/g,'%27')+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Prezzi osservati per '+svgEscape(a.name)+'">'+chartDefs+'<g>'+borderTop+borderBottom+'</g>'+area+mc+priorConnector+'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+(singleBond?'2.4':'2.8')+'" stroke-dasharray="'+(singleBond?'7 4':'none')+'" stroke-linejoin="round" stroke-linecap="round"/>'+singleBondLabel+tail+priorMark+marks+buyMarks+highlighted+axis+'</svg>'+buyInventory;
 // Beta 9.9.11: the percentage must describe the SAME endpoints drawn in the graph.
 // Yahoo's chartPreviousClose is a prior-session reference, not the first plotted
 // intraday point. Comparing it with the last plot point made declining curves
 // appear positive. Never report a period change with fewer than two observations.
 const intraday=assetDetailRange==='1d';
 const first=Number(sessionPoints[0].p),last=Number(sessionPoints.at(-1).p);
 const hasComparablePeriod=sessionPoints.length>=2&&Number.isFinite(first)&&first>0&&Number.isFinite(last)
  &&points[points.length-1].t>points[0].t;
 detailSetDelta(hasComparablePeriod?(last-first)/first:null);
 $('assetDetailDelta').dataset.pctBasis=intraday?'Rispetto alla prima quotazione della seduta mostrata ('+detailDate(sessionPoints[0].t,true)+')':'Rispetto alla prima quotazione del periodo ('+detailDate(sessionPoints[0].t,false)+')';
 $('assetDetailPrice').textContent=a.cat==='Obbligazioni'?number(a.p)+' / 100 '+currencyOf(a):localMoney(a.p,currencyOf(a));$('assetDetailPriceLabel').textContent='Ultima quotazione del portafoglio';
 $('assetDetailSelected').textContent=(liveLast?'Ultima quotazione'+(liveLast.delayed?' differita':'')+': ':'Ultima rilevazione: ')+detailDate(points[points.length-1].t,true);
 function onPoint(ev){const svg=$('detailSvg');if(!svg)return;const bounds=svg.getBoundingClientRect();let px=(ev.clientX-bounds.left)/Math.max(1,bounds.width)*W;
  try{const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;px=pt.matrixTransform(svg.getScreenCTM().inverse()).x}catch(_){/* fallback */}
  let closest=points[0],dist=Infinity;for(const pt of points){const dx=Math.abs(x(pt.t)-px);if(dx<dist){dist=dx;closest=pt}}
  const dot=$('assetHoverDot');dot.setAttribute('style','display:block');
  const xx=x(closest.t),yy=y(closest.p),tipX=Math.max(70,Math.min(W-70,xx)),tipY=yy<(hasPrior?84:70)?yy+16:yy-(hasPrior?61:45);
  $('detailCrosshair').setAttribute('x1',xx);$('detailCrosshair').setAttribute('x2',xx);
  $('detailTargetDot').setAttribute('cx',xx);$('detailTargetDot').setAttribute('cy',yy);
  $('detailTipBg').setAttribute('x',tipX-69);$('detailTipBg').setAttribute('y',tipY);
  $('detailTipText').setAttribute('x',tipX);$('detailTipText').setAttribute('y',tipY+13);
  $('detailTipText').textContent=number(closest.p)+' '+currencyOf(a)+(a.cat==='Obbligazioni'?'/100':'');
  const textDate=document.createElementNS('http://www.w3.org/2000/svg','text');
  let dateText=dot.querySelector('#detailTipDate');if(!dateText){dateText=textDate;dateText.id='detailTipDate';dateText.setAttribute('class','chart-tooltip-label');dateText.setAttribute('text-anchor','middle');dot.appendChild(dateText)}
  dateText.setAttribute('x',tipX);dateText.setAttribute('y',tipY+26);dateText.textContent=(closest.priorClose?'Chiusura precedente':detailDate(closest.t,intraday||!!closest.live))+(closest.live?' · quotazione':'');
  let dailyDeltaLabel='';
  if(hasPrior){
   const referencePoint=closest.priorClose?sessionPoints.at(-1):closest;
   const dailyDelta=referencePoint.p-close,dailyPct=100*dailyDelta/close;
   dailyDeltaLabel=(closest.priorClose?'Oggi: ':'')+(dailyDelta>0?'+':'')+number(dailyDelta)+' '+currencyOf(a)+' · '+(dailyPct>0?'+':'')+dailyPct.toFixed(2).replace('.',',')+'%';
   let changeText=dot.querySelector('#detailTipDaily');
   if(!changeText){changeText=document.createElementNS('http://www.w3.org/2000/svg','text');changeText.id='detailTipDaily';changeText.setAttribute('text-anchor','middle');changeText.setAttribute('font-size','9');changeText.setAttribute('font-weight','750');dot.appendChild(changeText)}
   changeText.setAttribute('x',tipX);changeText.setAttribute('y',tipY+41);changeText.setAttribute('fill',dailyDelta>=0?'#58e0b2':'#ff8799');changeText.textContent=dailyDeltaLabel;
  }
  const detailLabel=(closest.priorClose?'Chiusura precedente':detailDate(closest.t,intraday||!!closest.live))+(closest.live?' · quotazione'+(closest.delayed?' differita':''):'');
  const detailValue=(a.cat==='Obbligazioni'?number(closest.p)+'/100 '+currencyOf(a):localMoney(closest.p,currencyOf(a)));
  if(Number.isFinite(pmc)&&pmc>0){
   const diff=closest.p-pmc,diffPct=diff/pmc,deltaValue=(a.cat==='Obbligazioni'?((diff>=0?'+':'')+number(diff)+'/100 '+currencyOf(a)):(diff>=0?'+':'')+localMoney(diff,currencyOf(a)));
   $('assetDetailSelected').innerHTML=svgEscape(detailLabel)+' · '+svgEscape(detailValue)+' <span class="'+(diff>=0?'gain':'loss')+'">· Δ vs PMC '+svgEscape(deltaValue)+' · '+(diffPct>=0?'+':'')+pct(diffPct)+'</span>';
  }else $('assetDetailSelected').textContent=detailLabel+' · '+detailValue;
  if(hasPrior){const el=$('assetDetailSelected');const dailyDelta=(closest.priorClose?sessionPoints.at(-1).p:closest.p)-close;const summary=document.createElement('span');summary.className=dailyDelta>=0?'gain':'loss';summary.textContent=' · Δ giornaliero '+dailyDeltaLabel;el.appendChild(summary)}
 }
 const chartSvg=chart.querySelector('#detailSvg');
 chartSvg?.addEventListener('pointerdown',ev=>{if(ev.cancelable)ev.preventDefault();try{chartSvg.setPointerCapture?.(ev.pointerId)}catch(_){}onPoint(ev)});
 let fh66ScrubFrame=0,fh66LatestEvent=null;chartSvg?.addEventListener('pointermove',ev=>{if(ev.buttons===1||ev.pointerType==='touch'||ev.pointerType==='pen'||ev.pointerType==='mouse'){if(ev.cancelable)ev.preventDefault();const samples=typeof ev.getCoalescedEvents==='function'?ev.getCoalescedEvents():[];fh66LatestEvent=samples.length?samples[samples.length-1]:ev;if(!fh66ScrubFrame)fh66ScrubFrame=requestAnimationFrame(()=>{fh66ScrubFrame=0;if(fh66LatestEvent)onPoint(fh66LatestEvent)})}});
 chartSvg?.addEventListener('click',onPoint);
 chartSvg?.addEventListener('touchstart',ev=>{if(ev.touches[0]){if(ev.cancelable)ev.preventDefault();onPoint(ev.touches[0])}},{passive:false});
}
// v6.6: A market quote can be appended as an independently timestamped observation.
// It is NOT a Yahoo historical close, NOT a fabricated candle, and is never saved as one.
async function fetchDetailLiveQuote(a){
 const alphabet=a.id==='goog'||(String(a.symbol||'').toUpperCase()==='1GOOG.MI'&&a.isin==='US02079K1079');
 const endpoint=alphabet?'/.netlify/functions/alphabet':'/.netlify/functions/live-quote?symbol='+encodeURIComponent(a.symbol)+'&currency='+encodeURIComponent(currencyOf(a));
 const r=await fetch(endpoint,{cache:'no-store',headers:{Accept:'application/json'}});
 if(!r.ok)throw Error('Quotazione HTTP '+r.status);
 const d=await r.json();
 if(alphabet&&(d.symbol!=='1GOOG'||d.isin!=='US02079K1079'))throw Error('Identità Alphabet non verificata');
 if(!alphabet&&String(d.symbol||'').toUpperCase()!==String(a.symbol||'').toUpperCase())throw Error('Ticker diverso');
 if(String(d.currency||'').toUpperCase()!==currencyOf(a))throw Error('Valuta diversa');
 const t=Date.parse(d.asOf),p=Number(d.price);
 if(!(p>0)||!Number.isFinite(t)||t>Date.now()+3600000||Date.now()-t>7*86400000)throw Error('Prezzo o data non validi');
 return {t,p,live:true,delayed:!!d.delayed,source:d.source||'Quotazione di mercato'};
}
async function updateDetailLiveQuote(req){
 const a=getDetailAsset(),base=detailBaseSeries;
 if(!a||!a.symbol||!base||req!==assetDetailRequest||detailLiveBusy)return;
 detailLiveBusy=true;
 try{
  const obs=await fetchDetailLiveQuote(a);
  if(req!==assetDetailRequest||a.id!==assetDetailId||detailBaseSeries!==base)return;
  const pts=base.points.slice(),last=pts[pts.length-1];
  // Do not draw an earlier quote after newer historical prices.
  // Same-day end-of-day candles might be dated at market open: replace with actual observed quote only if newer.
  if(!last||obs.t>last.t+60000){
   pts.push(obs);plotAssetDetail(pts,a,{previousClose:base.previousClose});
   $('assetDetailSource').textContent=base.source+' + '+obs.source+' · '+detailDate(obs.t,true)+(obs.delayed?' (differita)':'');
   $('assetDetailNote').textContent='Ultima quotazione'+(obs.delayed?' differita':'')+' con orario effettivo. Il futures usa le candele intraday Yahoo (anche sessione elettronica); un eventuale tratteggio segnala soltanto rilevazioni mancanti. PMC: linea gialla orizzontale.';
  }else{
   $('assetDetailNote').textContent='Lo storico è più recente o coincide con la quotazione disponibile: nessun punto aggiunto per evitare prezzi cronologicamente errati. Fonte quotazione: '+obs.source+'.';
  }
 }catch(e){if(req===assetDetailRequest&&detailBaseSeries===base){$('assetDetailNote').textContent='Grafico storico disponibile; ultima quotazione separata non raggiungibile ('+String(e.message).slice(0,80)+'). Nessun dato artificiale aggiunto.';}}
 finally{detailLiveBusy=false}
}
async function loadAssetDetail(){
 const a=getDetailAsset();if(!a)return;const request=++assetDetailRequest,range=assetDetailRange;detailBaseSeries=null;
 detailRangeChange();$('assetDetailChart').innerHTML='<div class="asset-chart-empty">Carico le rilevazioni del periodo…</div>';const fhWatch=setTimeout(()=>{if(request===assetDetailRequest&&$('assetDetailChart')?.textContent?.includes('Carico le rilevazioni'))$('assetDetailChart').innerHTML='<div class="asset-chart-empty">Fonte storica lenta: sto verificando un’alternativa. Il prezzo corrente resta disponibile.</div>';},11000);
 detailSetDelta(null);$('assetDetailSelected').textContent='';

 if($('assetDetailProvider')?.value==='kraken'){
  clearTimeout(fhWatch);
  if(a.cat!=='Crypto'){detailEmpty('Kraken è disponibile solo per le criptovalute.');return;}
  const sym=String(a.symbol||a.id||a.name||'').toUpperCase();
  const coin=/BTC|XBT|BITCOIN/.test(sym)?'XBT':/ETH|ETHEREUM/.test(sym)?'ETH':/SOL|SOLANA/.test(sym)?'SOL':/XRP|RIPPLE/.test(sym)?'XRP':/ADA|CARDANO/.test(sym)?'ADA':null;
  const currency=String(currencyOf(a)||'EUR').toUpperCase();
  const quote=currency==='USD'?'USD':currency==='EUR'?'EUR':null;
  if(!coin||!quote){detailEmpty('Coppia Kraken non disponibile per questo titolo o valuta.');$('assetDetailSource').textContent='Kraken · coppia non supportata';return;}
  const pair=coin+quote;
  const interval=range==='1d'?5:range==='5d'?15:range==='1mo'?60:range==='3mo'?240:range==='6mo'?240:1440;
  const days={'1d':1,'5d':5,'1mo':31,'3mo':93,'6mo':183,'1y':365,'max':730}[range]||31;
  try{
    const url='https://api.kraken.com/0/public/OHLC?pair='+encodeURIComponent(pair)+'&interval='+interval;
    const resp=await fetch(url,{cache:'no-store',mode:'cors'});if(!resp.ok)throw Error('HTTP '+resp.status);
    const feed=await resp.json();if(feed.error?.length)throw Error(feed.error.join('; '));
    const rows=feed.result?.[Object.keys(feed.result||{}).find(k=>k!=='last')];if(!Array.isArray(rows))throw Error('Nessuna serie disponibile');
    const since=Date.now()-days*86400000;
    const pts=rows.map(v=>({t:Number(v[0])*1000,p:Number(v[4])})).filter(v=>Number.isFinite(v.t)&&Number.isFinite(v.p)&&v.p>0&&(range==='custom'?customDetailCut([{t:v.t,p:v.p}]).length:v.t>=since)).sort((x,y)=>x.t-y.t);
    if(request!==assetDetailRequest)return;
    if(pts.length<2)throw Error('Periodo non disponibile: Kraken limita lo storico OHLC alle ultime 720 candele');
    plotAssetDetail(pts,a);$('assetDetailSource').textContent='Kraken · '+pair+' · '+pts.length+' osservazioni';
    $('assetDetailNote').textContent='Quotazioni Kraken nella stessa valuta del titolo. La serie OHLC pubblica è limitata alle ultime 720 candele.';
  }catch(error){if(request!==assetDetailRequest)return;detailEmpty('Kraken: '+String(error.message||'connessione indisponibile').slice(0,130));$('assetDetailSource').textContent='Kraken · fonte non raggiungibile';}
  return;
 }
 // Alternative verified local source: observations already recorded by this profile.
 if($('assetDetailProvider')?.value==='saved'){
  clearTimeout(fhWatch);
  const duration={'1d':86400000,'5d':7*86400000,'1mo':31*86400000,'3mo':93*86400000,'6mo':183*86400000,'1y':366*86400000,'max':Infinity}[range]||31*86400000;
  const local=localDetailSeries(a).filter(point=>Number.isFinite(point.t)&&Number.isFinite(point.p)&&(duration===Infinity||point.t>=Date.now()-duration));
  if(local.length){plotAssetDetail(local,a);$('assetDetailSource').textContent='Rilevazioni salvate sul dispositivo · '+local.length+' punti';}
  else{detailEmpty('Nessuna rilevazione salvata in questo intervallo.');$('assetDetailSource').textContent='Rilevazioni locali non disponibili';}
  return;
 }

 if(a.cat==='Conto deposito'){
  const pts=syntheticAccrualSeries(a,range);if(request!==assetDetailRequest)return;
  plotAssetDetail(pts,a);$('assetDetailSource').textContent='Stima di interessi contrattuali · non quotazioni';$('assetDetailNote').textContent='Curva stimata degli interessi lordi: non rappresenta un prezzo negoziato.';return;
 }
 if(a.id==='bfp'){
  detailEmpty('Buono non quotato: non è disponibile un grafico di mercato.');$('assetDetailSource').textContent='Valore nominale · scadenza da dati inseriti';$('assetDetailNote').textContent='Per i buoni postali il rimborso dipende dalle condizioni e dalla data di riscatto.';return;
 }
 if(a.cat==='Obbligazioni'&&/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(String(a.isin||''))){
  const local=localDetailSeries(a);
  try{
    const address='/.netlify/functions/bond-history?isin='+encodeURIComponent(a.isin||'IT0005735227')+'&range='+encodeURIComponent(range);
    const feed=JSON.parse(await readUrl(address,9500));
    if(request!==assetDetailRequest)return;
    if(!Array.isArray(feed.points)||feed.points.length<1)throw Error(feed.error||'Prezzi storici insufficienti');
    const points=feed.points.map(x=>({t:Number(x.t),p:Number(x.p)})).filter(x=>Number.isFinite(x.t)&&x.t>0&&Number.isFinite(x.p)&&x.p>0).sort((x,y)=>x.t-y.t);
    if(!points.length)throw Error('Serie storica non valida');
    plotAssetDetail(points,a,{previousClose:fh1069PriorClose(a,points,feed.previousClose)});$('assetDetailSource').textContent=(feed.source||'Euronext MOT')+' · '+(feed.asOf||'date disponibili');
    $('assetDetailNote').textContent='Andamento e variazione del prezzo di mercato (% del nominale), non rendimento a scadenza. Cedole e ratei esclusi. Fonte esterna, soggetta a disponibilità.';
  }catch(e){if(request!==assetDetailRequest)return;
    const days={'1d':1,'5d':7,'1mo':31,'3mo':93,'6mo':183,'1y':366,'max':3650}[range]||31;
    const recent=local.filter(x=>x.t>=Date.now()-days*86400000);
    if(recent.length>=1){plotAssetDetail(recent,a,{previousClose:fh1069PriorClose(a,recent,null)});$('assetDetailSource').textContent='Rilevazioni verificate salvate nell’app';
     if(recent.length===1)$('assetDetailNote').textContent='Linea tratteggiata: riferimento visivo fra rilevazioni, NON andamento storico. Per una curva servono almeno due prezzi con date diverse. La linea gialla è il PMC.';
    }
    else{detailEmpty('Prezzi storici MOT non disponibili per questo periodo. Prova un altro intervallo: nessun prezzo viene inventato.');$('assetDetailSource').textContent='Euronext · recupero non disponibile';}
    $('assetDetailNote').textContent=(recent.length===1?'Linea verde: solo riferimento dell’ultima quotazione, non storico. ':'')+'Fonte storico BTP non disponibile: '+String(e.message||'errore').slice(0,120)+'. Prezzo corrente non modificato.';
  }
  return;
 }
 if(!detailIsMarketAsset(a)){
  const pts=localDetailSeries(a),back={'1d':1,'5d':7,'1mo':31,'3mo':93,'6mo':183,'1y':366,'max':100000}[range]||31,start=Date.now()-back*86400000,selected=range==='custom'?customDetailCut(pts):pts.filter(p=>p.t>=start);
  if(request!==assetDetailRequest)return;
  if(selected.length>=2){plotAssetDetail(selected,a);$('assetDetailSource').textContent='Rilevazioni salvate sul dispositivo';$('assetDetailNote').textContent='Prezzi BTP osservati nell’app; cedole escluse. Nessun dato storico inventato.'}
  else{detailEmpty('Storico BTP non ancora disponibile: servono almeno 2 prezzi osservati, su date/ore diverse.');$('assetDetailSource').textContent='Rilevazioni locali: '+selected.length;$('assetDetailNote').textContent='Il valore attuale resta visibile sopra. Non viene disegnata una curva storica ipotetica.'}
  return;
 }
 if(!a.symbol||!/^[A-Za-z0-9.^=\-]{1,22}$/.test(a.symbol)){detailEmpty('Ticker di mercato assente o non valido.');return}
 $('assetDetailNote').textContent='Prezzi storici verificati nella valuta dello strumento; tocca il tracciato per leggere data e prezzo. La linea gialla è il PMC. Per Alphabet il prezzo corrente proviene dalla funzione separata GEM Milano.';
 try{
  const data=await fetchDetailHistory(a,range);if(request!==assetDetailRequest)return;
  const pts=data.points;
  if(!pts.length){detailEmpty('Nessuna quotazione disponibile in questo periodo.');$('assetDetailSource').textContent=data.source;return}
  detailBaseSeries={points:pts,previousClose:data.previousClose,source:data.source};
  plotAssetDetail(pts,a,{previousClose:data.previousClose});if(['1mo','3mo','6mo','1y','max'].includes(range))void refreshDetailRecentHistory(request);else void updateDetailLiveQuote(request);
  $('assetDetailSource').textContent=data.source+' · '+currencyOf(a)+' · '+detailMarketLabel(a);if(data.alternativeRange)$('assetDetailNote').textContent='I dati intraday non sono disponibili per questo titolo: viene mostrato lo storico reale di 1 mese. Tocca la curva per data e prezzo. Il prezzo del portafoglio resta indipendente.';
 }catch(e){if(request!==assetDetailRequest)return;
  // Intraday can be unavailable on Yahoo GEM. Show a verified, timestamped quote as
  // ONE observed point (never a fake line); additional observations accumulate.
  if(range==='1d'||range==='5d'){
   try{
    const obs=await fetchDetailLiveQuote(a);if(request!==assetDetailRequest)return;
    const days=range==='1d'?1.04:7;
    const valid=localDetailSeries(a).filter(p=>p.t>=Date.now()-days*86400000&&p.t<=obs.t);
    const pts=[...valid,obs].sort((x,y)=>x.t-y.t).filter((p,i,arr)=>i===0||p.t!==arr[i-1].t);
    detailBaseSeries={points:pts.filter(p=>!p.live),source:'Osservazioni reali · '+obs.source,previousClose:fh1069PriorClose(a,pts,null)};
    plotAssetDetail(pts,a,{previousClose:detailBaseSeries.previousClose});$('assetDetailSource').textContent=obs.source+' · '+detailDate(obs.t,true)+(obs.delayed?' (differita)':'');
    $('assetDetailNote').textContent=pts.length===1?'Un solo prezzo osservato in questo periodo. Il grafico crescerà con nuove quotazioni reali; nessuna curva 1M mostrata al posto di 1G/1S.':'Quotazioni effettivamente osservate nel periodo; nessun dato mensile sostituito.';
    return;
   }catch(_){/* no verified quote */}
  }
  if(range==='1d'){
   try{
    const week=await fetchDetailHistory(a,'5d');if(request!==assetDetailRequest)return;
    const newest=week.points[week.points.length-1];
    const sessionDate=new Date(newest.t).toLocaleDateString('en-CA',{timeZone:'Europe/Rome'});
    const session=week.points.filter(p=>new Date(p.t).toLocaleDateString('en-CA',{timeZone:'Europe/Rome'})===sessionDate);
    if(session.length){detailBaseSeries={points:session,previousClose:fh1069PriorClose(a,week.points,week.previousClose),source:week.source};plotAssetDetail(session,a,{previousClose:detailBaseSeries.previousClose});$('assetDetailSource').textContent=week.source+' · ultima seduta verificata '+sessionDate;$('assetDetailNote').textContent='Storico 1G non disponibile: visualizzate soltanto le quotazioni effettive dell’ultima seduta con dati orari. Nessun prezzo ricostruito.';return;}
   }catch(_){/* no historical data: show transparent fallback message */}
  }
  detailEmpty('Non ci sono prezzi verificati sufficienti per '+(range==='1d'?'1G':range==='5d'?'1S':'questo periodo')+'. Nessun grafico mensile sostitutivo.');
  $('assetDetailSource').textContent='Storico non disponibile · prezzo del portafoglio invariato';
 }
}
$('assetList').addEventListener('click',e=>{const btn=e.target.closest('[data-detail-id]');if(btn){openAssetDetail(btn.dataset.detailId);return}});
// The Home allocation breakdown opens the same investment detail as the Investments tab.
document.getElementById('allocationDetail')?.addEventListener('click',e=>{const row=e.target.closest('[data-home-detail-id]');if(row)openAssetDetail(row.dataset.homeDetailId)});
document.getElementById('allocationDetail')?.addEventListener('keydown',e=>{const row=e.target.closest('[data-home-detail-id]');if(row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openAssetDetail(row.dataset.homeDetailId)}});

$('assetList').addEventListener('click',e=>{const btn=e.target.closest('[data-buy-id]');if(!btn)return;$('buyAsset').value=btn.dataset.buyId;buyPriceEdited=false;$('buyVerify').checked=false;$('buyStatus').classList.add('hidden');syncBuyPrice();$('purchaseSection').scrollIntoView({behavior:'smooth',block:'start'});});
$('buyCommit').onclick=()=>{
 const displayedDate=String($('buyDate')?.value||''),t=computeBuy(),purchaseDate=validEntryDate('buyDate');
 if(!t||!$('buyVerify').checked||!purchaseDate||displayedDate!==purchaseDate){alert('Verifica data, importo e prezzo effettivo. La data non può essere futura.');return}
 const latest=state.assets.find(a=>a.id===t.a.id);if(!latest)return;
 const oldCapital=cap(latest),newQty=Number(latest.q)+t.count;
 if(!Number.isFinite(newQty)||newQty<=0){alert('Quantità non valida.');return}
 if($('buyDate').value!==purchaseDate){alert('La data è cambiata durante la registrazione. Verificala e conferma nuovamente.');return;}
 const now=Date.now(),recorded={id:now+'-'+latest.id+'-'+Math.random().toString(36).slice(2,8),kind:'buy',date:purchaseDate,asset:latest.id,assetName:latest.name,cat:latest.cat,spent:t.spent,quantity:t.count,price:t.price,fxExecution:assetFx(latest),recordedAt:new Date(now).toISOString()};
 const nextAssets=state.assets.map(a=>a.id===latest.id?{...a,q:newQty,closed:false,pmc:t.newPmc,costEur:oldCapital+t.spent}:a);
 const status=$('buyStatus');status.classList.remove('hidden');
 const button=$('buyCommit');button.disabled=true;
 try{
  persistVerifiedPurchase(nextAssets,[...trades,recorded],recorded);
  trackSnapshot();refreshBuyOptions();render();showVerifiedPurchaseInHistory();if(editing)renderEditor();
  $('buyVerify').checked=false;renderBuy();
  status.classList.remove('warn');status.textContent='✓ Acquisto salvato e verificato nel dispositivo: '+shortDate(purchaseDate)+' · '+entryDecimal(t.count)+' quote di '+latest.name+' · '+eur(t.spent)+'. Presente in Storico → Archivio.';
 }catch(err){status.classList.add('warn');status.textContent=err.message;if(/quota|spazio|storage|exceed/i.test(err.message||''))purchaseQuotaRecovery(status);else alert(err.message)}
 finally{if($('buyVerify').checked)renderBuy()}
};
function syncHistoryRangeButtons(){document.querySelectorAll('#historyRanges button[data-range]').forEach(b=>{const active=b.dataset.range===historyRange;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))})}
$('historyRanges').onclick=e=>{const b=e.target.closest('button[data-range]');if(!b)return;historyRange=b.dataset.range;try{prefs.historyDefault=historyRange;savePreferences();}catch(_){}syncHistoryRangeButtons();renderHistory()};
refreshBuyOptions();


// Rotate the three reactions within the current return band every six seconds.
setInterval(()=>{
 if(document.visibilityState==='hidden'||prefs.motion==='off'||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches))return;
 mascotIndex=(mascotIndex+1)%3;
 const mood=mascotMood||'neutral';
 if(document.body.classList.contains('fh-radar-active'))return;
 if(mood!==mascotMood){mascotMood=mood;mascotIndex=0}
 const emotion=finnCurrentEmotion(mood,currentMascotEmotion(mood)),face=$('performanceFace');
 if(!face)return;
 face.innerHTML=mascotSVG(mood,prefs.colors[mood]||PREF_DEFAULTS.colors[mood],false,emotion);
 face.className='performance-face '+mood+(emotion==='sleeping'?' sleeping':'')+' expression-'+emotion+finnSceneClass()+(!$('visitAlert').classList.contains('hidden')?' overchecking':'');
 face.setAttribute('aria-label','Mascotte '+MASCOT_LABELS[emotion]+'. '+face.getAttribute('aria-label').replace(/^Mascotte [^.]+\. /,''));
 face.title=face.getAttribute('aria-label');
},6000);
$('refresh').onclick=()=>refresh(true);$('navRefreshQuotes').onclick=()=>{if(!busy)void refresh(true)};$('auto').onchange=e=>{auto=e.target.checked;try{store.setItem(AUTO_KEY,String(auto))}catch(err){}if(auto)refresh(false)};setInterval(()=>{trackSnapshot();if(!editing)render();refresh(false)},60000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){lastVisitPageVisible=Date.now();visitWasHidden=true}else{render();if(visitWasHidden){visitWasHidden=false;if(!SIM_MODE)refresh(true);countPortfolioVisit()}else refresh(false)}});
window.addEventListener('pageshow',e=>{if(e.persisted){countPortfolioVisit();if(!SIM_MODE)refresh(true)}});

// Finholdra 6: isolated test workspace; no implicit copy of the real portfolio.
if(SIM_MODE){$('simulationBanner').classList.remove('hidden');document.title='TEST · Finholdra';}
$('simulationToggle').textContent=SIM_MODE?'Sei nella simulazione · torna ai dati reali':'Avvia simulazione';
$('simulationToggle').onclick=()=>{location.href=location.pathname+(SIM_MODE?'':'?simulation=1')};
$('exitSimulation').onclick=()=>{location.href=location.pathname};

// Buy overlay reuses the existing, tested weighted-PMC purchase editor.
$('purchaseMount').appendChild($('purchaseSection'));
function openBuyModal(id){$('buyDate').value=today();if(id&&state.assets.some(x=>x.id===id))$('buyAsset').value=id;buyPriceEdited=false;$('buyVerify').checked=false;$('buyStatus').classList.add('hidden');syncBuyPrice();$('purchaseOverlay').classList.remove('hidden')}
function closeBuyModal(){$('purchaseOverlay').classList.add('hidden')}
$('purchaseOpen').onclick=()=>openBuyModal();$('purchaseClose').onclick=closeBuyModal;
$('purchaseOverlay').addEventListener('click',e=>{if(e.target===$('purchaseOverlay'))closeBuyModal()});
// Existing quick-buy handlers are replaced via capture, ahead of old bubble listeners.
$('assetList').addEventListener('click',e=>{const buy=e.target.closest('[data-buy-id]');if(buy){e.preventDefault();e.stopImmediatePropagation();openBuyModal(buy.dataset.buyId)}},true);

// Sales are recorded exclusively via the guided sale dialog; the × is error removal only.
const badRemovalKey='invesquo_bad_removals_v6';
function saleRealizedGain(){return trades.filter(t=>t.kind==='sale'&&filter[t.cat]).reduce((n,t)=>n+(Number(t.realized)||0),0)}
let removeTargetId=null;
function closeRemoveModal(){$('removeAssetOverlay').classList.add('hidden')}
$('removeAssetClose').onclick=closeRemoveModal;
$('assetList').addEventListener('click',e=>{const b=e.target.closest('[data-delete-id]');if(!b)return;e.preventDefault();e.stopPropagation();const a=state.assets.find(v=>v.id===b.dataset.deleteId);if(!a)return;removeTargetId=a.id;$('removeAssetTitle').textContent='Elimina per errore · '+a.name;$('removeAssetOverlay').classList.remove('hidden')},true);

let transactionAssetId=null,transactionEditId=null;
function closeTradeHistory(){$('tradeOverlay').classList.add('hidden');$('tradeEditPanel').classList.add('hidden');transactionEditId=null}
$('tradeClose').onclick=closeTradeHistory;
$('tradeOverlay').addEventListener('click',e=>{if(e.target===$('tradeOverlay'))closeTradeHistory()});
function openTradeHistory(id){transactionAssetId=id;transactionEditId=null;const sample=trades.find(t=>t.asset===id);const asset=state.assets.find(a=>a.id===id);
 $('tradeTitle').textContent='Storico transazioni · '+(asset?.name||sample?.assetName||id);
 $('tradeEditPanel').classList.add('hidden');renderTradeRows();$('tradeOverlay').classList.remove('hidden');
}
function historicPmcPerPurchase(assetId){
 const a=state.assets.find(v=>v.id===assetId);
 if(!a)return new Map();
 let qty=0,base=0;const pmcById=new Map();
 for(const t of orderAssetTrades(assetId)){
  const q=Number(t.quantity),p=Number(t.price);
  if(!(q>0)||!(p>0))continue;
  if(t.kind==='buy'){
   base+=q*p;qty+=q;
   if(qty>0)pmcById.set(String(t.id),base/qty);
  }else if(t.kind==='sale'&&q<=qty+1e-7){
   base-=qty>0?base*q/qty:0;qty-=q;
   if(qty<1e-8){qty=0;base=0;}
  }
 }
 return pmcById;
}
function renderTradeRows(){
 const chronological=orderAssetTrades(transactionAssetId),pmcs=historicPmcPerPurchase(transactionAssetId);
 const items=chronological.slice().reverse();
 $('tradeRows').innerHTML=items.length?items.map(t=>{
  const buy=t.kind==='buy',a=state.assets.find(x=>x.id===t.asset),unit=a?.cat==='Obbligazioni'?' € nominali':' quote';
  const pmc=pmcs.get(String(t.id));
  const pmcCaption=buy&&Number.isFinite(pmc)?'<span class="trade-pmc-tag">PMC dopo acquisto: <strong>'+svgEscape(formatPmcHistoryValue(pmc,a))+'</strong></span>':'';
  return '<div class="transaction-row"><div class="transaction-info"><strong style="color:'+(buy?'#56d6b3':'#f0ba75')+'">'+(buy?'Acquisto':'Vendita')+'</strong> · '+shortDate(t.date)+(t.assumedDate?' <small>Data assegnata: 03/11/2026 (da verificare)</small>':'')+pmcCaption+'<small>'+entryDecimal(Number(t.quantity)) +unit+' · '+localMoney(t.price,currencyOf(a||{currency:'EUR'}))+' / quota · '+eur(Math.abs(Number(t.spent||0)))+'</small>'+(buy?'': '<small>Utile/perdita realizzato: '+(Number(t.realized)>=0?'+':'')+eur(Number(t.realized||0))+'</small>')+'</div><div class="transaction-controls"><button type="button" class="btn" data-edit-trade="'+svgEscape(t.id)+'">Modifica</button><button type="button" class="btn danger-outline" data-delete-trade="'+svgEscape(t.id)+'">Elimina</button></div></div>';
 }).join(''):'<p class="hint">Nessuna transazione registrata.</p>';
}
function editTransaction(id){const t=trades.find(v=>v.id===id&&v.asset===transactionAssetId);if(!t)return;
 transactionEditId=id;$('tradeEditPanel').classList.remove('hidden');$('tradeEditTitle').textContent=(t.kind==='buy'?'Modifica acquisto':'Modifica vendita')+' · '+shortDate(t.date);
 $('tradeEditDate').value=t.date;$('tradeEditDate').max=today();$('tradeEditQty').value=t.quantity;$('tradeEditPrice').value=t.price;
 $('tradeEditAmount').value=Math.abs(Number(t.spent||0)).toFixed(2);
 document.querySelector('input[name="tradeEditMode"][value="qty"]').checked=true;syncTradeEditMode();renderTradeEditPreview();
 $('tradeEditPanel').scrollIntoView({block:'nearest',behavior:'smooth'});
}
function syncTradeEditMode(){const inEuro=entryMode('tradeEditMode')==='eur';$('tradeEditQtyWrap').classList.toggle('entry-field-hidden',inEuro);$('tradeEditAmountWrap').classList.toggle('entry-field-hidden',!inEuro)}
function readEditedTrade(){const old=trades.find(v=>v.id===transactionEditId),asset=state.assets.find(a=>a.id===old?.asset);
 if(!old||!asset)return null;
 const date=validEntryDate('tradeEditDate'),price=Number($('tradeEditPrice').value),fx=tradeFx(old,asset),factor=asset.cat==='Obbligazioni'?100:1;
 const inEuro=entryMode('tradeEditMode')==='eur',amount=Number($('tradeEditAmount').value);
 const qty=inEuro?(amount>0?amount*factor/(price*fx):NaN):Number($('tradeEditQty').value);
 if(!date||!(price>0)||!(qty>0)||!(fx>0)||!Number.isFinite(qty))return null;
 return{...old,date,price,quantity:qty,spent:(old.kind==='sale'?-1:1)*qty*price*fx/factor,assumedDate:false,fxExecution:fx};
}
function renderTradeEditPreview(){if(!transactionEditId)return;const t=readEditedTrade(),box=$('tradeEditPreview');if(!t){box.textContent='Inserisci data, prezzo e quantità/importo validi.';$('tradeEditSave').disabled=true;return}
 const proposed=trades.map(x=>x.id===t.id?t:x),result=computeLedger(t.asset,proposed);
 box.innerHTML=result.error?'<span class="loss">'+svgEscape(result.error)+'</span>':'<div><strong>'+shortDate(t.date)+'</strong> · '+entryDecimal(t.quantity)+' quote · '+eur(Math.abs(t.spent))+'</div><div>Posizione ricalcolata: '+entryDecimal(result.qty)+' quote · costo residuo '+eur(result.cost)+'</div>';
 $('tradeEditSave').disabled=!!result.error;
}
$('tradeRows').addEventListener('click',e=>{
 const edit=e.target.closest('[data-edit-trade]'),del=e.target.closest('[data-delete-trade]');
 if(edit){editTransaction(edit.dataset.editTrade);return}
 if(del){const id=del.dataset.deleteTrade,t=trades.find(v=>v.id===id);if(!t)return;
  if(!confirm('Eliminare per errore la '+(t.kind==='buy'?'compravendita di acquisto':'vendita')+' del '+shortDate(t.date)+'? Verranno ricalcolati quote, PMC e guadagni realizzati. Esporta prima un backup.'))return;
  const proposed=trades.filter(x=>x.id!==id),err=commitLedger(t.asset,proposed);
  if(err){alert(err);return}renderTradeRows();renderTradeEvents();
 }
});
$('assetList').addEventListener('click',e=>{const b=e.target.closest('[data-transactions-id]');if(b){e.preventDefault();e.stopImmediatePropagation();openTradeHistory(b.dataset.transactionsId)}},true);
$('tradeEditCancel').onclick=()=>{$('tradeEditPanel').classList.add('hidden');transactionEditId=null};
for(const id of ['tradeEditDate','tradeEditPrice','tradeEditQty','tradeEditAmount'])$(id).addEventListener('input',renderTradeEditPreview);
document.querySelectorAll('input[name="tradeEditMode"]').forEach(r=>r.addEventListener('change',()=>{syncTradeEditMode();renderTradeEditPreview()}));
$('tradeEditSave').onclick=()=>{const edited=readEditedTrade();if(!edited)return;
 if(!confirm('Salvare la modifica del '+shortDate(edited.date)+'? Tutte le operazioni di questo titolo saranno ricalcolate in ordine cronologico.'))return;
 const proposed=trades.map(t=>t.id===edited.id?edited:t),err=commitLedger(edited.asset,proposed);
 if(err){alert(err);return}transactionEditId=null;$('tradeEditPanel').classList.add('hidden');renderTradeRows();renderTradeEvents();
};
$('tradeEventList').addEventListener('click',e=>{const b=e.target.closest('[data-history-ledger]');if(b)openTradeHistory(b.dataset.historyLedger)});

function saleTarget(){return state.assets.find(a=>a.id===$('saleAsset').value)}
function refreshSaleOptions(){const previous=$('saleAsset').value;const arr=tradeables().filter(a=>Number(a.q)>0);$('saleAsset').innerHTML=arr.map(a=>'<option value="'+svgEscape(a.id)+'">'+svgEscape(a.name)+'</option>').join('');$('saleAsset').value=arr.some(a=>a.id===previous)?previous:(arr[0]?.id||'')}
function computeSale(){const a=saleTarget(),price=Number($('salePrice').value);if(!a||!Number.isFinite(price)||price<=0||!(Number(a.q)>0))return null;
 const byEur=entryMode('saleInputMode')==='eur',amount=Number($('saleAmount').value);const factor=assetFx(a)/(a.cat==='Obbligazioni'?100:1);
 if(!Number.isFinite(factor)||factor<=0)return null;
 const qty=byEur?(amount>0?amount/(price*factor):NaN):Number($('saleQty').value);
 if(!Number.isFinite(qty)||qty<=0||qty>Number(a.q)+1e-9)return null;
 const proceeds=byEur?amount:euroValue(a,price,qty),cost=cap(a)*(qty/Number(a.q)),gain=proceeds-cost;
 if(!Number.isFinite(proceeds)||!Number.isFinite(cost)||!Number.isFinite(gain))return null;
 return{a,qty,price,proceeds,cost,gain,remaining:Math.max(0,Number(a.q)-qty)};
}
function renderSale(){const t=computeSale(),date=validEntryDate('saleDate');$('saleCommit').disabled=!t||!date||!$('saleVerify').checked;
 if(!t){$('salePreview').innerHTML='<div class="notice warn">Inserisci prezzo e quantità o importo positivi. Non puoi vendere più quote di quelle possedute.</div>';return}
 $('salePreview').innerHTML='<div class="preview-cols"><div><small>Quote vendute</small><strong>'+entryDecimal(t.qty)+'</strong></div><div><small>Prezzo di vendita per quota</small><strong>'+localMoney(t.price,currencyOf(t.a))+'</strong></div><div><small>Incasso lordo</small><strong>'+eur(t.proceeds)+'</strong></div><div><small>Costo attribuito</small><strong>'+eur(t.cost)+'</strong></div><div><small>Plus/minusvalenza realizzata</small><strong class="'+(t.gain>=0?'gain':'loss')+'">'+(t.gain>=0?'+':'')+eur(t.gain)+'</strong></div><div><small>Quote rimanenti</small><strong>'+entryDecimal(t.remaining)+'</strong></div></div><p class="order-note">La vendita non modifica il PMC delle quote rimaste. Commissioni e imposte escluse.</p>';
}
function openSaleModal(id){refreshSaleOptions();if(id&&tradeables().some(a=>a.id===id&&Number(a.q)>0))$('saleAsset').value=id;if(!$('saleAsset').value){alert('Non ci sono strumenti negoziabili da vendere.');return}
 const a=saleTarget();$('saleDate').value=today();document.querySelector('input[name="saleInputMode"][value="qty"]').checked=true;$('saleQtyWrap').classList.remove('entry-field-hidden');$('saleAmountWrap').classList.add('entry-field-hidden');$('saleQty').value=Number(a.q);$('saleAmount').value='';$('salePrice').value=Number(a.p);$('saleVerify').checked=false;$('saleStatus').classList.add('hidden');renderSale();$('saleOverlay').classList.remove('hidden')}
function closeSaleModal(){$('saleOverlay').classList.add('hidden')}
$('saleClose').onclick=closeSaleModal;$('saleOpen').onclick=()=>openSaleModal();
$('saleOverlay').addEventListener('click',e=>{if(e.target===$('saleOverlay'))closeSaleModal()});
$('assetList').addEventListener('click',e=>{const b=e.target.closest('[data-sale-id]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();openSaleModal(b.dataset.saleId)},true);
$('saleAsset').onchange=()=>{const a=saleTarget();if(!a)return;$('saleQty').value=Number(a.q);$('salePrice').value=Number(a.p);$('saleAmount').value='';$('saleVerify').checked=false;renderSale()};
for(const id of ['saleQty','salePrice','saleAmount'])$(id).addEventListener('input',()=>{$('saleVerify').checked=false;renderSale()});
$('saleDate').addEventListener('change',()=>{$('saleVerify').checked=false;renderSale()});
$('saleVerify').addEventListener('change',renderSale);
document.querySelectorAll('input[name="saleInputMode"]').forEach(r=>r.addEventListener('change',()=>{$('saleQtyWrap').classList.toggle('entry-field-hidden',entryMode('saleInputMode')==='eur');$('saleAmountWrap').classList.toggle('entry-field-hidden',entryMode('saleInputMode')!=='eur');$('saleVerify').checked=false;renderSale()}));
$('saleCommit').onclick=()=>{const t=computeSale(),date=validEntryDate('saleDate');if(!t||!date||!$('saleVerify').checked){alert('Controlla e conferma tutti i dati della vendita.');return}
 const a=state.assets.find(v=>v.id===t.a.id);if(!a)return;
 if(!confirm('Confermare la vendita del '+shortDate(date)+' di '+entryDecimal(t.qty)+' quote di '+a.name+' per '+eur(t.proceeds)+'? '+(t.gain>=0?'Utile':'Perdita')+' lordo: '+eur(Math.abs(t.gain))+'.'))return;
 trackSnapshot();trades.push({id:Date.now()+'-sale-'+a.id,kind:'sale',date,asset:a.id,assetName:a.name,cat:a.cat,quantity:t.qty,price:t.price,fxExecution:assetFx(a),spent:-t.proceeds,realized:t.gain,costBasis:t.cost});
 const oldCap=cap(a);a.q=Math.max(0,Number(a.q)-t.qty);if(a.q<1e-10)a.q=0;a.costEur=a.q>0?Math.max(0,oldCap-t.cost):0;
 if(!a.q)a.closed=true;
 save();saveTimeline();trackSnapshot();refreshBuyOptions();render();closeSaleModal();alert('Vendita registrata: '+eur(t.proceeds)+' incassati; '+(t.gain>=0?'utile':'perdita')+' lordo di '+eur(Math.abs(t.gain))+'.');
};
$('removeAsError').onclick=()=>{const a=state.assets.find(v=>v.id===removeTargetId);if(!a)return;
 if(!confirm('Eliminare '+a.name+' perché inserito per errore? Verrà rimosso anche dagli acquisti registrati. Poiché il vecchio storico registra solo totali per categoria, per evitare rendimenti falsi saranno cancellate TUTTE le rilevazioni storiche precedenti (compreso il 3 e 4 novembre). Esporta prima un backup.'))return;
 state.assets=state.assets.filter(x=>x.id!==a.id);trades=trades.filter(t=>t.asset!==a.id);
 snapshots=[];save();saveTimeline();trackSnapshot();refreshBuyOptions();render();closeRemoveModal();alert('Strumento rimosso. Storico riavviato senza valori ricostruiti artificialmente.');};

// Catalogo non quotato; solo identificazione del prodotto, senza stima automatica dei rendimenti.
// Le tipologie storiche servono a registrare buoni già detenuti, non sono un'offerta di vendita.
const POSTAL_BONDS=[
 {id:'minori',name:'Buono dedicato ai minori',years:null,group:'Tipologie principali'},
 {id:'ordinario',name:'Buono Ordinario',years:20,group:'Tipologie principali'},
 {id:'4plus',name:'Buono 4 anni Plus',years:4,group:'Tipologie principali'},
 {id:'3x4-premio',name:'Buono 3x4 con Premio',years:12,group:'Tipologie principali'},
 {id:'rinnova-3x4-premio',name:'Buono Rinnova 3x4 con Premio',years:12,group:'Tipologie principali'},
 {id:'rinnova-prima-3x4',name:'Buono Rinnova Prima 3x4 Premio',years:12,group:'Tipologie principali'},
 {id:'risparmiosemplice',name:'Buono 4 anni risparmiosemplice',years:4,group:'Tipologie principali'},
 {id:'3x4',name:'Buono 3x4 (serie storica)',years:12,group:'Buoni storici / non più in emissione'},
 {id:'3x2',name:'Buono 3x2 (serie storica)',years:6,group:'Buoni storici / non più in emissione'},
 {id:'4x4',name:'Buono 4x4 (serie storica)',years:16,group:'Buoni storici / non più in emissione'},
 {id:'5x5',name:'Buono 5x5 (serie storica)',years:25,group:'Buoni storici / non più in emissione'},
 {id:'2plus',name:'Buono 2 anni Plus (serie storica)',years:2,group:'Buoni storici / non più in emissione'},
 {id:'3plus',name:'Buono 3 anni Plus (serie storica)',years:3,group:'Buoni storici / non più in emissione'},
 {id:'rinnova4',name:'Buono Rinnova 4 anni (serie storica)',years:4,group:'Buoni storici / non più in emissione'},
 {id:'inflazione',name:'Buono indicizzato all’inflazione italiana (serie storica)',years:null,group:'Buoni storici / non più in emissione'},
 {id:'cedola',name:'Buono a cedola (serie storica)',years:null,group:'Buoni storici / non più in emissione'},
 {id:'altro',name:'Altro Buono Fruttifero Postale / serie da verificare',years:null,group:'Altro'}
];
function initPostalBonds(){const sel=$('postalPreset');if(!sel)return;const groups=[...new Set(POSTAL_BONDS.map(b=>b.group))];sel.innerHTML='<option value="">Scegli un Buono...</option>'+groups.map(g=>'<optgroup label="'+svgEscape(g)+'">'+POSTAL_BONDS.filter(b=>b.group===g).map(b=>'<option value="'+b.id+'">'+svgEscape(b.name)+'</option>').join('')+'</optgroup>').join('');}
function choosePostalBond(){const id=$('postalPreset').value;const b=POSTAL_BONDS.find(x=>x.id===id);if(!b){alert('Seleziona una tipologia di Buono.');return;}
 const date=today();
 pendingQuote={symbol:'BFP-'+b.id.toUpperCase()+'-'+Date.now(),name:b.name,market:'Poste Italiane · Cassa Depositi e Prestiti',exchange:'POSTE',price:null,isin:'',currency:'EUR',kind:'POSTAL',verifiedPrice:false,postalKind:b.id,postalYears:b.years};
 $('chosenAssetName').textContent=b.name;$('chosenAssetExchange').textContent='Risparmio postale · EUR · non quotato';
 $('newAssetType').value='Risparmio postale';$('newAssetIsin').value='';$('newAssetCurrency').value='EUR';$('newAssetFx').value='1';$('newAssetDate').value=date;
 document.querySelector('input[name="newAssetInputMode"][value="eur"]').checked=true;
 $('newAssetAmount').value='';$('newAssetQuantity').value='';$('newAssetPmc').value='1';$('newAssetPostalAnnualFee').value='0';$('newAssetPostalYieldPct').value='';$('newAssetQuantityWrap').querySelector('label').textContent='Quote nominali (1 quota = 1 €)';$('newAssetPmc').closest('.field').classList.add('hidden');
 $('newAssetMaturityValue').value='';$('newAssetMaturityDate').value='';
 $('assetNewFields').classList.remove('hidden');$('assetSearchResults').classList.add('hidden');$('assetSearchHint').classList.add('hidden');$('assetSearch').closest('.field').classList.add('hidden');
 syncNewAssetMaturity();updateNewAssetEntryPreview();$('addAssetOverlay').querySelector('.app-modal-card').scrollTop=0;}
initPostalBonds();$('postalPresetChoose').addEventListener('click',choosePostalBond);
$('postalPreset').addEventListener('change',e=>{if(e.target.value)choosePostalBond();});

// Search for a quote; search results can be ambiguous and must be checked against the selected exchange and EUR currency.
let pendingQuote=null;
function closeAddAsset(){window.__pacAddingInstrument=false;$('addToPacOnly').classList.add('hidden');$('addAssetOverlay').classList.add('hidden');$('assetSearchResults').classList.remove('hidden');$('assetSearchHint').classList.remove('hidden');$('assetSearch').closest('.field').classList.remove('hidden')}
$('depositAddOpen').onclick=()=>{
 $('depositName').value='';$('depositCapital').value='';$('depositRate').value='';$('depositStart').value=today();$('depositEnd').value='';$('depositAccrued').value='0';$('depositAnchor').value=today();$('depositFrequency').value='daily';$('depositAddError').textContent='';$('depositAddOverlay').classList.remove('hidden');$('depositName').focus();
};
function closeDepositAdd(){$('depositAddOverlay').classList.add('hidden')}
$('depositAddClose').onclick=closeDepositAdd;
$('depositAddOverlay').addEventListener('click',e=>{if(e.target.id==='depositAddOverlay')closeDepositAdd()});
function updateDepositPreview(){const cap=Number($('depositCapital').value),r=Number($('depositRate').value),n=$('depositFrequency').value==='yearly'?365:$('depositFrequency').value==='monthly'?30:1;
 $('depositPreview').textContent=cap>0&&r>=0?'Interesse lordo stimato per '+(n===365?'anno':n===30?'30 giorni':'giorno')+': '+eur(cap*r/100*n/365):'Inserisci capitale e tasso lordo annuo.';}
for(const id of ['depositCapital','depositRate','depositFrequency'])$(id).addEventListener('input',updateDepositPreview);
$('depositAddCommit').onclick=()=>{
 const name=$('depositName').value.trim(),capital=Number($('depositCapital').value),rate=Number($('depositRate').value),start=$('depositStart').value,end=$('depositEnd').value,base=Number($('depositAccrued').value),anchor=$('depositAnchor').value,freq=$('depositFrequency').value;
 const error=msg=>{$('depositAddError').textContent=msg};
 if(!name||name.length>90){error('Inserisci un nome valido.');return}
 if(!Number.isFinite(capital)||capital<=0||!Number.isFinite(rate)||rate<0||!Number.isFinite(base)||base<0){error('Controlla capitale, tasso e interessi.');return}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(anchor)||start>anchor||anchor>today()){error('Controlla le date di inizio e riferimento.');return}
 if(end&&(!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<start)){error('La scadenza deve essere successiva all’inizio.');return}
 if(!['daily','monthly','yearly'].includes(freq)){error('Seleziona una frequenza valida.');return}
 const a={id:'deposit_'+Date.now(),name,cat:'Conto deposito',q:1,p:capital,pmc:capital,costEur:capital,annualRate:rate,interestBase:base,interestAnchor:anchor,depositStart:start,accrualFrequency:freq,maturityDate:end,maturity:null,currency:'EUR',fxRate:1,symbol:'',quoteSource:'Calcolo interessi lordo',quoteAt:'Non quotato'};
 trackSnapshot();state.assets.push(a);trades.push({id:Date.now()+'-deposit',kind:'buy',date:start,asset:a.id,assetName:a.name,cat:a.cat,spent:capital,quantity:1,price:capital,fxExecution:1});save();saveTimeline();trackSnapshot();refreshBuyOptions();render();if(editing)renderEditor();closeDepositAdd();
};
$('newAssetOpen').onclick=()=>{$('postalPreset').value='';$('newAssetQuantityWrap').querySelector('label').textContent='Quantità di quote (anche frazionate; BTP: nominale in €)';$('newAssetPmc').closest('.field').classList.remove('hidden');window.__pacAddingInstrument=false;$('addToPacOnly').classList.add('hidden');$('newAssetDate').value=today();$('assetSearchResults').classList.remove('hidden');$('assetSearchHint').classList.remove('hidden');$('assetSearch').closest('.field').classList.remove('hidden');$('assetNewFields').classList.add('hidden');$('addAssetOverlay').classList.remove('hidden');$('assetSearch').focus()};
$('addAssetClose').onclick=closeAddAsset;
const isinFormat=s=>/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(s);
function isinChecksum(isin){const digits=isin.toUpperCase().split('').map(c=>/[A-Z]/.test(c)?String(c.charCodeAt(0)-55):c).join('');let sum=0,twice=false;for(let i=digits.length-1;i>=0;i--){let n=Number(digits[i]);if(twice){n*=2;if(n>9)n-=9}sum+=n;twice=!twice}return sum%10===0}
// Search multiple variants so "Amazon" also tries 1AMZN.MI; all candidates must be verified after selection.
function venueRank(r){const sym=String(r.symbol||'').toUpperCase(),ex=String((r.exchDisp||'')+' '+(r.exchange||'')).toUpperCase();
 if(sym.endsWith('.MI')||sym.endsWith('.BIT')||/MILAN|MILANO|BORSA ITALIANA|MOT|ETFP|GEM|EXM|EGM|IDEM|MTAA|MOTX|EXGM|ETFX|XDMI/.test(ex))return 0;
 if(sym.endsWith('.DE')||/XETRA|GERMAN|FRANKFURT|DEUTSCHE/.test(ex))return 1;
 if(/NASDAQ|NYSE|NMS|NYQ|USA|AMERICAN|CME|CBOT|COMEX|NYMEX/.test(ex)||/^[A-Z]{1,5}$/.test(sym))return 2;
 return 3;
}
function guessYahooCode(s){return /^[A-Z0-9.\-=^]{1,24}$/i.test(s)&&/\.|=|\^/.test(s)}
// All app searches use the same live providers; never silently return a curated-only catalog.
const FIN_SEARCH_CACHE=new Map();
function searchResultObjects(payload){
 if(Array.isArray(payload))return payload;
 if(Array.isArray(payload?.quotes))return payload.quotes;
 if(Array.isArray(payload?.results))return payload.results;
 if(Array.isArray(payload?.symbols))return payload.symbols;
 return [];
}
function stripSearchMarkup(v){return String(v||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim()}
function tradingviewToYahoo(r){
 const venue=stripSearchMarkup(r.exchange||r.source_id||''),full=stripSearchMarkup(r.symbol),ticker=stripSearchMarkup(r.ticker||full.split(':').at(-1));
 if(!ticker)return null;
 const exchange=venue.toUpperCase(),suffix=({MIL:'.MI',MILAN:'.MI',BIT:'.MI',BME:'.MC',XETR:'.DE',FWB:'.F',EURONEXT:'.PA',EURONEXT_PARIS:'.PA',LSE:'.L',SIX:'.SW',TSX:'.TO',ASX:'.AX',TSE:'.T'})[exchange]||'';
 const alreadyQualified=/\.[A-Z]{1,4}$|[=^]/i.test(ticker),symbol=alreadyQualified?ticker:(suffix?ticker+suffix:ticker);
 const type=String(r.type||'').toLowerCase();
 return {symbol,shortname:stripSearchMarkup(r.description||r.name||ticker),longname:stripSearchMarkup(r.description||r.name||ticker),exchange:exchange||'NMS',exchDisp:venue||'Mercato da verificare',currency:stripSearchMarkup(r.currency_code||r.currency||'')||(suffix==='.MI'||suffix==='.DE'||suffix==='.PA'?'EUR':undefined),isin:stripSearchMarkup(r.isin),quoteType:type==='stock'?'EQUITY':type==='fund'||type==='etf'?'ETF':type==='crypto'?'CRYPTOCURRENCY':type==='futures'?'FUTURE':type==='bond'?'BOND':type==='forex'?'CURRENCY':type.toUpperCase(),source:'TradingView',referenceOnly:true};
}
async function tradingviewSearchTerm(q){
 const u='https://symbol-search.tradingview.com/symbol_search/v3/?text='+encodeURIComponent(q)+'&hl=1&exchange=&lang=en&search_type=undefined&domain=production';
 const endpoints=[u,...relayUrls(u)];
 const errors=[];
 for(const url of endpoints){try{
  const data=JSON.parse(await readUrl(url,4000));
  if(!Array.isArray(data?.symbols))throw Error('Directory titoli non disponibile');
  return data.symbols.map(tradingviewToYahoo).filter(Boolean);
 }catch(e){errors.push(e.message)}}
 throw Error('TradingView non raggiungibile: '+errors.slice(-2).join('; '));
}
async function yahooSearchTerm(q){
 const key=q.trim().toLocaleLowerCase('it-IT'),cached=FIN_SEARCH_CACHE.get(key);
 if(cached&&Date.now()-cached.at<120000)return cached.rows;
 const y='https://query1.finance.yahoo.com/v1/finance/search?q='+encodeURIComponent(q)+'&quotesCount=50&newsCount=0';
 const tv='https://symbol-search.tradingview.com/symbol_search/v3/?text='+encodeURIComponent(q)+'&hl=1&exchange=&lang=en&search_type=undefined&domain=production';
 const requests=[
  {url:'/.netlify/functions/search?q='+encodeURIComponent(q),type:'mixed'},
  {url:'https://api.allorigins.win/raw?url='+encodeURIComponent(y),type:'yahoo'},
  {url:'https://api.allorigins.win/raw?url='+encodeURIComponent(tv),type:'tv'}
 ];
 // Combine sources rather than returning the first successful but possibly incomplete source.
 const answers=await Promise.allSettled(requests.map(async ({url,type})=>{
  const data=JSON.parse(await readUrl(url,4200));
  if(type==='tv')return Array.isArray(data.symbols)?data.symbols.map(tradingviewToYahoo).filter(Boolean):[];
  return searchResultObjects(data).filter(x=>x&&x.symbol);
 }));
 const unique=new Map();for(const answer of answers){if(answer.status!=='fulfilled')continue;
  for(const item of answer.value){const id=String(item.symbol||'').toUpperCase();if(id&&!unique.has(id))unique.set(id,item)}
 }
 const rows=[...unique.values()];
 if(rows.length){FIN_SEARCH_CACHE.set(key,{at:Date.now(),rows});window.__invesquoSearchIssue='';return rows;}
 window.__invesquoSearchIssue='Fonti Yahoo/TradingView temporaneamente indisponibili; mostro gli strumenti noti quando presenti.';
 return [];
}

function invesquoRegion(result){
 const region=String(prefs.searchRegion||'world');if(region==='world')return true;
 const flag=exchangeFlag(result),exchange=String(result.exchange||'').toUpperCase(),sym=String(result.symbol||'').toUpperCase();
 const italy=flag==='🇮🇹'||exchange==='MIL'||/\.MI$/.test(sym),usa=flag==='🇺🇸'||/^(NMS|NYQ|NAS|ASE|NASDAQ|NYSE|CME|CBOT|COMEX|NYMEX)$/.test(exchange);
 const europe=italy||['🇩🇪','🇫🇷','🇬🇧','🇳🇱','🇨🇭','🇪🇸','🇧🇪','🇸🇪','🇩🇰','🇳🇴','🇫🇮','🇦🇹','🇮🇪','🇵🇹'].includes(flag);
 return region==='it'?italy:region==='us'?usa:europe;
}
// Known, explicitly identified issuer/listing candidates used if external search omits common names.
// These are identifiers only: prices and exchange eligibility are verified independently.
const ISSUER_SEARCH_FALLBACK=[
 {words:['microsoft','msft','us5949181045'],name:'Microsoft Corporation',isin:'US5949181045',listings:[['1MSFT.MI','MIL','Borsa Italiana · GEM','EUR'],['MSFT','NMS','Nasdaq','USD']]},
 {words:['amazon','amzn','us0231351067'],name:'Amazon.com Inc.',isin:'US0231351067',listings:[['1AMZN.MI','MIL','Borsa Italiana · GEM','EUR'],['AMZN','NMS','Nasdaq','USD']]},
 {words:['alphabet','google','goog','us02079k1079'],name:'Alphabet Inc. Classe C',isin:'US02079K1079',listings:[['1GOOG.MI','MIL','Borsa Italiana · GEM','EUR'],['GOOG','NMS','Nasdaq','USD']]},
 {words:['apple','aapl','1aapl','us0378331005'],name:'Apple Inc.',isin:'US0378331005',listings:[['1AAPL.MI','MIL','Borsa Italiana · GEM Milano','EUR'],['AAPL','NMS','Nasdaq','USD']]},
 {words:['nvidia','nvda','1nvda','us67066g1040'],name:'NVIDIA Corporation',isin:'US67066G1040',listings:[['1NVDA.MI','MIL','Borsa Italiana · GEM Milano','EUR'],['NVDA','NMS','Nasdaq','USD']]},
 {words:['tesla','tsla','1tsla','us88160r1014'],name:'Tesla Inc.',isin:'US88160R1014',listings:[['1TSLA.MI','MIL','Borsa Italiana · GEM Milano','EUR'],['TSLA','NMS','Nasdaq','USD']]},
 {words:['intel','intc','us4581401001'],name:'Intel Corporation',isin:'US4581401001',listings:[['INTC','NMS','Nasdaq','USD']]},
 {words:['sandisk','sndk','bw9'],name:'SanDisk Corporation',isin:'',listings:[['SNDK','NMS','Nasdaq','USD'],['BW9.DE','XETR','Xetra','EUR']]},
 {words:['meta','facebook','1fb','us30303m1027'],name:'Meta Platforms Inc.',isin:'US30303M1027',listings:[['1FB.MI','MIL','Borsa Italiana · GEM Milano','EUR'],['META','NMS','Nasdaq','USD']]},
 {words:['netflix','nflx','1nflx','us64110l1061'],name:'Netflix Inc.',isin:'US64110L1061',listings:[['1NFLX.MI','MIL','Borsa Italiana · GEM Milano','EUR'],['NFLX','NMS','Nasdaq','USD']]},
 {words:['broadcom','avgo','1avgo','us11135f1012'],name:'Broadcom Inc.',isin:'US11135F1012',listings:[['1AVGO.MI','MIL','Borsa Italiana · GEM Milano','EUR'],['AVGO','NMS','Nasdaq','USD']]},
 {words:['strategy','microstrategy','mstr','1mstr','us5949724083'],name:'Strategy Inc.',isin:'US5949724083',listings:[['1MSTR.MI','MIL','Borsa Italiana · GEM Milano','EUR'],['MSTR','NMS','Nasdaq','USD']]},
 {words:['block inc','square inc','1sq','us8522341036'],name:'Block Inc.',isin:'US8522341036',listings:[['1SQ.MI','MIL','Borsa Italiana · GEM Milano','EUR'],['XYZ','NYQ','NYSE','USD']]},
 {words:['visa','us92826c8394'],name:'Visa Inc.',isin:'US92826C8394',listings:[['V','NYQ','NYSE','USD']]}
];
function knownIssuerMatches(term){const q=String(term||'').toLowerCase().trim();if(q.length<2)return [];
 const results=[];for(const issuer of ISSUER_SEARCH_FALLBACK){if(!issuer.words.some(w=>w===q||(!isinFormat(q.toUpperCase())&&q.length>=3&&(w.includes(q)||q.includes(w)))))continue;
  for(const [symbol,exchange,exchDisp,currency] of issuer.listings)results.push({symbol,longname:issuer.name,shortname:issuer.name,isin:issuer.isin,exchange,exchDisp,currency,quoteType:'EQUITY',referenceOnly:true});
 }return results;
}
// Finholdra Beta 9.5: aliases for Yahoo Finance continuous futures indicators.
// =F identifies Yahoo's rolling/front-month chart, NOT a specific tradeable expiry.
const FUTURES_SEARCH_INDEX=[
 {s:'ES=F',name:'E-mini S&P 500 futures',keywords:['s&p futures','sp500 futures','s&p 500 future','es futures','future sp500','future s&p','futures sp500','futures s&p','e-mini s&p'] ,venue:'CME'},
 {s:'NQ=F',name:'E-mini Nasdaq-100 futures',keywords:['nasdaq futures','nasdaq 100 futures','future nasdaq','futures nasdaq','e-mini nasdaq','nq futures'],venue:'CME'},
 {s:'YM=F',name:'Mini Dow Jones futures',keywords:['dow futures','dow jones futures','future dow','futures dow','ym futures'],venue:'CBOT'},
 {s:'RTY=F',name:'E-mini Russell 2000 futures',keywords:['russell futures','russell 2000 futures','future russell','rty futures'],venue:'CME'},
 {s:'CL=F',name:'WTI crude oil futures',keywords:['petrolio futures','future petrolio','futures petrolio','wti future','wti futures','crude oil futures','cl futures'],venue:'NYMEX'},
 {s:'BZ=F',name:'Brent crude oil futures',keywords:['brent futures','brent future','future brent','futures brent'],venue:'NYMEX'},
 {s:'GC=F',name:'Gold futures',keywords:['oro futures','future oro','futures oro','gold futures','gold future','gc futures'],venue:'COMEX'},
 {s:'SI=F',name:'Silver futures',keywords:['argento futures','future argento','futures argento','silver futures','si futures'],venue:'COMEX'},
 {s:'HG=F',name:'Copper futures',keywords:['rame futures','future rame','futures rame','copper futures','hg futures'],venue:'COMEX'},
 {s:'NG=F',name:'Natural gas futures',keywords:['gas naturale futures','future gas naturale','natural gas futures','ng futures'],venue:'NYMEX'},
 {s:'ZC=F',name:'Corn futures',keywords:['mais futures','future mais','futures mais','corn futures','zc futures'],venue:'CBOT'},
 {s:'ZW=F',name:'Wheat futures',keywords:['grano futures','frumento futures','wheat futures','zw futures'],venue:'CBOT'},
 {s:'ZS=F',name:'Soybean futures',keywords:['soia futures','future soia','soybean futures','zs futures'],venue:'CBOT'},
 {s:'ZN=F',name:'10-Year US Treasury Note futures',keywords:['treasury 10 futures','treasury note futures','10 year treasury futures','zn futures'],venue:'CBOT'},
 {s:'ZB=F',name:'US Treasury Bond futures',keywords:['bond futures','treasury bond futures','zb futures'],venue:'CBOT'}
];
function futuresSearchCandidates(term){
 const q=String(term||'').trim().toLowerCase().replace(/\s+/g,' ');
 if(!q)return [];
 const direct=/^[a-z0-9]{1,8}=f$/i.test(q);
 return FUTURES_SEARCH_INDEX.filter(f=>f.s.toLowerCase()===q||(!direct&&f.keywords.some(k=>k===q||q.length>=5&&k.includes(q)&&/future|futures/.test(q))))
 .map(f=>({symbol:f.s,longname:f.name,shortname:f.name,quoteType:'FUTURE',currency:'USD',exchange:f.venue,exchDisp:f.venue+' · futures (serie continua)',referenceOnly:true,futuresContinuous:true}));
}
function futuresType(r){return String(r?.quoteType||'').toUpperCase().includes('FUTURE')||/^[A-Z0-9]{1,8}=F$/i.test(String(r?.symbol||''));}
function futuresResultLabel(r){return futuresType(r)?'Futures · serie continua, non contratto a scadenza specifica':String(r.quoteType||'');}

/* Beta 9.9.3 — classify every selected instrument consistently across browse and search. */
function inferNewAssetCategory(r){
 const symbol=String(r?.symbol||'').trim().toUpperCase();
 const name=String(r?.longname||r?.shortname||'').toLowerCase();
 const type=String(r?.quoteType||'').toUpperCase();
 const browse=String(r?.browseCategory||'');
 const allowed=new Set(CAT.map(x=>x[0]));
 if(futuresType(r))return 'Futures';
 if(r?.postalKind||browse==='Risparmio postale')return 'Risparmio postale';
 if(browse==='Conto deposito')return 'Conto deposito';
 // Recognize crypto with quoteType or the complete currency-pair symbol, not loose substrings.
 if(type==='CRYPTOCURRENCY'||/^(BTC|ETH|SOL|XRP|ADA|DOGE|DOT|AVAX|LINK|LTC|BCH|BNB)-(EUR|USD|GBP)$/.test(symbol))return 'Crypto';
 if(browse&&allowed.has(browse)&&browse!=='Crypto'&&browse!=='Futures')return browse;
 if(type==='ETF'||type==='MUTUALFUND'||/\b(?:UCITS|ETF)\b/i.test(name)||/^(VWCE|VUAA|SWDA|CSSPX|XEON|XDWD|EQQQ|ERNE|CSH2)(?:\.|$)/.test(symbol)){
  if(/^(XEON|ERNE|CSH2)(?:\.|$)/.test(symbol)||/overnight|ultrashort|monetary|monetari|\bestr\b|\bstr\b/.test(name))return 'ETF monetari';
  return 'ETF';
 }
 if(type==='ETN'||type==='ETC'||/^(PHAU|PHAG|SGLN)(?:\.|$)/.test(symbol))return 'ETC/ETN';
 if(type==='BOND')return 'Obbligazioni';
 if(type==='CURRENCY'||/=X$/i.test(symbol))return /^(XAU|XAG)/.test(symbol)?'Oro':'Valute';
 if(/\b(?:physical gold|physical silver)\b/.test(name))return 'ETC/ETN';
 if(browse&&allowed.has(browse))return browse;
 return 'Azioni';
}
function setNewAssetCategoryFromQuote(r){
 const category=inferNewAssetCategory(r);
 const select=$('newAssetType');
 if(!Array.from(select.options).some(o=>o.value===category))throw Error('Categoria non prevista: '+category);
 pendingQuote.detectedCategory=category;
 select.value=category;
 select.dataset.detectedCategory=category;
 select.dataset.manualCategoryChange='false';
 syncNewAssetMaturity();
 updateNewAssetEntryPreview();
 return category;
}
function correctAccidentalCryptoCategory(){
 const select=$('newAssetType');
 const detected=pendingQuote?.detectedCategory;
 if(select.value==='Crypto'&&detected&&detected!=='Crypto'){
  select.value=detected;
  syncNewAssetMaturity();
  updateNewAssetEntryPreview();
 }
 return select.value;
}

// Discovery for every equity: ask the exchange-scoped Italian directory, not just the static GEM aliases.
// No guessed Italian ticker is created. Only actual scoped directory results are displayed.
// Ricerca live Yahoo/TradingView con directory italiana e fallback identificativi locali.
const FIN_GEM_SEARCH_CACHE=new Map();
async function discoverItalianListings(q){
 const query=String(q||'').trim();
 if(query.length<2||/\b(?:futures?|bitcoin|ethereum|forex|obbligazion|btp|crypto)\b/i.test(query))return [];
 const key=query.toLowerCase(),cached=FIN_GEM_SEARCH_CACHE.get(key);
 if(cached&&Date.now()-cached.at<300000)return cached.rows;
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),4800);
 try{
  const res=await fetch('/.netlify/functions/gem-search?q='+encodeURIComponent(query),{signal:ctl.signal});
  if(!res.ok)return [];
  const data=await res.json();const rows=Array.isArray(data.quotes)?data.quotes.filter(r=>/\.MI$/i.test(String(r.symbol))&&['EQUITY','STOCK','ETF','FUND'].includes(String(r.quoteType).toUpperCase())):[];
  FIN_GEM_SEARCH_CACHE.set(key,{at:Date.now(),rows});return rows;
 }catch(_){return []}finally{clearTimeout(timer)}
}
async function searchYahooQuotes(term){
 const word=term.trim(),t=word.toUpperCase(),isin=isinFormat(t)&&isinChecksum(t);
 const lookups=[word]; // Le ricerche per nome non devono generare varianti non pertinenti.
 const futureAliases=futuresSearchCandidates(word);
 for(const f of futureAliases)if(f.symbol.toLowerCase()!==word.toLowerCase())lookups.push(f.symbol);
 if(/amazon|amzn/i.test(word))lookups.push('1AMZN.MI','AMZN');
 if(/google|alphabet|goog/i.test(word))lookups.push('1GOOG.MI');
 // Confirmed GEM/Milan listings are queried explicitly; an Italian listing must be DISCOVERED,
 // not merely ranked above the foreign exchanges returned by the generic issuer lookup.
 for(const issuer of ISSUER_SEARCH_FALLBACK){
  if(issuer.words.some(w=>w===word.toLowerCase()||(word.length>=3&&w.includes(word.toLowerCase())))){
   for(const [symbol,exchange] of issuer.listings)if(exchange==='MIL'&&!lookups.includes(symbol))lookups.push(symbol);
  }
 }
 if(/bitcoin|btc/i.test(word))lookups.push('BTC-EUR','BTC-USD');
 if(/ethereum|ether|eth/i.test(word))lookups.push('ETH-EUR','ETH-USD');
 if(/^(xeon|lu0290358497)$/i.test(word)||/overnight|monetari|\bestr\b|\bstr\b/i.test(word))lookups.push('XEON.MI','XEON.DE','Xtrackers EUR Overnight');
 if(/^(qqq|us46090e1038)$/i.test(word)||/invesco qqq/i.test(word))lookups.push('QQQ','Invesco QQQ Trust');
 if(/gold|oro|gld/i.test(word))lookups.push('gold ETC Milan','GLD');
 if(/silver|argento/i.test(word))lookups.push('silver ETC Milan');
 let candidates=[...knownIssuerMatches(word),...futureAliases];
 // Hint sourced from the user's explicitly supplied Milan ticker. This is only a search candidate, NOT a verified price.
 if(/^(xeon|lu0290358497)$/i.test(word))candidates.push({symbol:'XEON.MI',shortname:'Xtrackers II EUR Overnight Rate Swap UCITS ETF 1C',longname:'Xtrackers II EUR Overnight Rate Swap UCITS ETF 1C',exchDisp:'Borsa Italiana · ETF',exchange:'MIL',currency:'EUR',quoteType:'ETF',isin:'LU0290358497'});
 if(/^(qqq|us46090e1038)$/i.test(word))candidates.push({symbol:'QQQ',shortname:'Invesco QQQ Trust Series 1',longname:'Invesco QQQ Trust Series 1',exchDisp:'Nasdaq',exchange:'NMS',currency:'USD',quoteType:'ETF',isin:'US46090E1038'});
 if(/amazon|amzn/i.test(word))candidates.push({symbol:'1AMZN.MI',shortname:'Amazon · quotazione Milano (da verificare)',longname:'Amazon.com · GEM Milano',exchDisp:'Borsa Italiana Milano',exchange:'MIL',currency:'EUR',quoteType:'EQUITY'});
 if(/^(goog|googl|1goog)$/i.test(word))candidates.push({symbol:'1GOOG.MI',shortname:'Alphabet C · Milano',longname:'Alphabet Inc. Classe C',exchDisp:'GEM Milano',exchange:'MIL',currency:'EUR',quoteType:'EQUITY',isin:'US02079K1079'});
 if(isin&&t.startsWith('IT')&&!knownIssuerMatches(t).length){candidates.push({symbol:t,shortname:'Titolo di Stato / obbligazione IT · ISIN '+t,longname:'Obbligazione '+t+' (identità, tipo e mercato da verificare)',exchDisp:'Obbligazione · mercato da indicare',exchange:'BOND',currency:'EUR',quoteType:'BOND',isin:t,manual:true});}
 if(/\b(btp|btp valore|obbligazioni|bond|moti|mot)\b/i.test(word)&&!isin)candidates.push({symbol:'',shortname:'Per i BTP inserisci l’ISIN da 12 caratteri',quoteType:'BOND'});
 if(isin){try{const r=await fetch('/.netlify/functions/instruments?isin='+encodeURIComponent(t),{cache:'no-store'});if(r.ok){const d=await r.json();candidates.push(...(d.results||[]).map(x=>({symbol:x.symbol,shortname:x.name,longname:x.name,exchDisp:x.market,exchange:x.exchange,quoteType:x.type,currency:x.currency,isin:t})))}}catch(_){}}
 // MOT catalogue is searched independently of Yahoo: Yahoo omits many government/corporate bonds.
 if(isin||/\b(?:btp|bond|obbligazion|mot|titolo di stato|bund|treasury)\b/i.test(word)){
  try{const r=await fetch('/.netlify/functions/bond-search?q='+encodeURIComponent(word),{cache:'no-store'});if(r.ok){const d=await r.json();candidates.push(...(d.results||[]))}}catch(_){}
 }
 const found=await Promise.allSettled([...lookups.map(q=>yahooSearchTerm(q)),discoverItalianListings(word)]);
 found.forEach(r=>{if(r.status==='fulfilled')candidates.push(...r.value)});
 if(guessYahooCode(t)&&!candidates.some(c=>String(c.symbol).toUpperCase()===t))candidates.unshift({symbol:t,shortname:t,longname:t,quoteType:/=F$/i.test(t)?'FUTURE':'EQUITY'});
 const map=new Map();for(const c of candidates){if(!c.symbol)continue;const key=String(c.symbol).toUpperCase();if(!map.has(key)||futuresType(c)&&!futuresType(map.get(key)))map.set(key,c)}
 // The configured region is a RANKING preference, not an exclusion: e.g. searches
 // for 'sandisk' must show the US listing even when Italy is selected.
 const original=[...map.values()];
 const keyQuery=word.toLocaleLowerCase('it-IT');
 const matchedIsins=new Set(original.filter(x=>{
  const name=String(x.longname||x.shortname||'').toLocaleLowerCase('it-IT');const ticker=String(x.symbol||'').toLowerCase();
  return (name.includes(keyQuery)||ticker===keyQuery||ticker.split('.')[0]===keyQuery)&&/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/i.test(String(x.isin||''));
 }).map(x=>String(x.isin).toUpperCase()));
 // Only emit matched securities, not unrelated results returned by broad provider searches.
 const all=original.filter(x=>{
   const symbol=String(x.symbol||'').toLowerCase(),name=String(x.longname||x.shortname||'').toLocaleLowerCase('it-IT'),ticker=symbol.replace(/\.[a-z]{1,4}$/i,'');
   const identifier=String(x.isin||'').toLowerCase();
   return name.includes(keyQuery)||symbol.includes(keyQuery)||ticker===keyQuery||identifier===keyQuery||(identifier&&matchedIsins.has(identifier.toUpperCase()))||
     knownIssuerMatches(word).some(k=>String(k.symbol).toLowerCase()===symbol)||futureAliases.some(k=>String(k.symbol).toLowerCase()===symbol)||
     (isin&&identifier===keyQuery);
 });
 window.__invesquoOffRegionCount=all.filter(x=>!invesquoRegion(x)).length;
 const wordKey=word.toLocaleLowerCase('it-IT');
 const relevance=x=>{const sym=String(x.symbol||'').toLowerCase(),name=String(x.longname||x.shortname||'').toLowerCase();return sym===wordKey?0:name===wordKey?1:name.startsWith(wordKey)?2:sym.startsWith(wordKey)?3:name.includes(wordKey)?4:5};
 const priorityFutures=futureAliases.length>0||/=F$/i.test(word)||/\bfutures?\b/i.test(word);
 // Italian listings (GEM included) first among meaningful, same-issuer matches.
 // A deliberately qualified ticker, e.g. NVDA or NVDA.MI, still matches exactly.
 const explicitVenue=/\.[a-z]{1,4}$/i.test(word)||/[=^]/.test(word);
 const italianFirst=x=>['EQUITY','STOCK','ETF','FUND',''].includes(String(x.quoteType||'').toUpperCase());
 const preferredVenue=x=>italianFirst(x)?venueRank(x):venueRank(x)+1;
 const relevantTier=x=>{const n=relevance(x);return n<=4?0:1};
 return all.sort((a,b)=>priorityFutures?(Number(futuresType(b))-Number(futuresType(a))||relevance(a)-relevance(b)):explicitVenue?(relevance(a)-relevance(b)||preferredVenue(a)-preferredVenue(b)):(relevantTier(a)-relevantTier(b)||preferredVenue(a)-preferredVenue(b)||relevance(a)-relevance(b)||Number(!invesquoRegion(a))-Number(!invesquoRegion(b))||String(a.symbol).localeCompare(String(b.symbol)))).slice(0,45);
}

function exchangeFlag(r){
 const sym=String(r.symbol||'').toUpperCase(),ex=String((r.exchDisp||'')+' '+(r.exchange||'')).toUpperCase();
 const suffix=sym.includes('.')?sym.split('.').pop():'';
 const flags={MI:'🇮🇹',BIT:'🇮🇹',DE:'🇩🇪',F:'🇩🇪',PA:'🇫🇷',L:'🇬🇧',AS:'🇳🇱',SW:'🇨🇭',TO:'🇨🇦',V:'🇨🇦',AX:'🇦🇺',HK:'🇭🇰',T:'🇯🇵',SA:'🇧🇷',MC:'🇪🇸',BR:'🇧🇪',ST:'🇸🇪',CO:'🇩🇰',OL:'🇳🇴',HE:'🇫🇮',VI:'🇦🇹',IR:'🇮🇪',LS:'🇵🇹'};
 if(flags[suffix])return flags[suffix];
 if(/MILAN|MILANO|BORSA ITALIANA|MOT|ETFP|GEM|EXM|EGM|IDEM|MTAA|MOTX|EXGM|ETFX|XDMI/.test(ex))return '🇮🇹';
 if(/XETRA|FRANKFURT|GERMAN/.test(ex))return '🇩🇪';
 if(/NASDAQ|NYSE|NMS|NYQ|USA|AMERICAN|NEW YORK|CME|CBOT|COMEX|NYMEX/.test(ex))return '🇺🇸';
 if(/LONDON|LSE/.test(ex))return '🇬🇧';
 if(/PARIS|EURONEXT PARIS/.test(ex))return '🇫🇷';
 if(/AMSTERDAM/.test(ex))return '🇳🇱';
 if(/TORONTO/.test(ex))return '🇨🇦';
 if(/TOKYO/.test(ex))return '🇯🇵';
 if(/CRYPTO/.test(ex)||/-USD$|-EUR$/.test(sym))return '🌐';
 if(/^[A-Z]{1,5}$/.test(sym))return '🇺🇸';
 return '🌐';
}
function searchIssuerLogo(r){
 const special=specialInstrumentIcon({symbol:r.symbol,name:r.longname||r.shortname,cat:futuresType(r)?'Futures':(r.cat||r.category||(r.quoteType==='ETF'?'ETF':'ETC/ETN')),quoteType:r.quoteType});
 if(special)return specialIconHtml(special,'asset-search-logo');
 const crypto=/CRYPTO|-(EUR|USD)$/.test(String(r.quoteType||'')+' '+String(r.symbol||''));if(crypto){const ico=cryptoIcon(r.symbol,r.longname||r.shortname);return '<span class="asset-search-logo">'+svgEscape(ico.short)+(ico.src?'<img alt="" loading="lazy" src="'+ico.src+'" onerror="this.remove()">':'')+'</span>';}
 const n=String((r.longname||'')+' '+(r.shortname||'')+' '+(r.symbol||'')).toLowerCase();
 const brands=[[/alphabet|google|1goog/, 'google.com'],[/amazon|1amzn|amzn/, 'amazon.com'],[/microsoft|msft/, 'microsoft.com'],[/apple inc|aapl/, 'apple.com'],[/nvidia|nvda/, 'nvidia.com'],[/tesla|tsla/, 'tesla.com'],[/meta platforms|facebook|meta\b/, 'meta.com'],[/vanguard|vwce/, 'vanguard.com'],[/ishares|blackrock|rbot/, 'ishares.com'],[/xtrackers|dws|xdev/, 'etf.dws.com'],[/amundi/, 'amundietf.com'],[/invesco/, 'invesco.com'],[/spdr|state street/, 'ssga.com'],[/intel|intc/, 'intel.com'],[/asml/, 'asml.com'],[/netflix|nflx/, 'netflix.com'],[/disney|dis\b/, 'disney.com'],[/coca.cola/, 'coca-cola.com'],[/visa inc/, 'visa.com'],[/mastercard/, 'mastercard.com']];
 const brand=futuresType(r)?null:brands.find(x=>x[0].test(n));const initials=String(r.symbol||'•').replace(/[^A-Z0-9]/gi,'').slice(0,2).toUpperCase()||'•';
 return '<span class="asset-search-logo">'+svgEscape(initials)+(brand?'<img alt="" loading="lazy" src="https://www.google.com/s2/favicons?domain='+brand[1]+'&sz=256" onerror="this.remove()">':'')+'</span>';
}
function formatSearchResult(a){return svgEscape((a.longname||a.shortname||a.symbol)+' · '+a.symbol)}
/* Beta 9.7 — curated instruments as discoverable search suggestions; no invented volume ranking. */
const FINHOLDRA_BROWSE_CATALOG={
 'Azioni':[['NVIDIA · GEM Milano','1NVDA.MI','GEM Milano · Italia'],['Tesla · GEM Milano','1TSLA.MI','GEM Milano · Italia'],['NVIDIA','NVDA','Nasdaq · USA'],['Apple','AAPL','Nasdaq · USA'],['Microsoft','MSFT','Nasdaq · USA'],['Amazon','AMZN','Nasdaq · USA'],['Alphabet C','GOOG','Nasdaq · USA'],['Tesla','TSLA','Nasdaq · USA'],['Meta Platforms','META','Nasdaq · USA'],['Intesa Sanpaolo','ISP.MI','Milano · Italia'],['Enel','ENEL.MI','Milano · Italia'],['Ferrari','RACE.MI','Milano · Italia']],
 'ETF':[['Vanguard FTSE All-World','VWCE.MI','Borsa Italiana'],['iShares Core MSCI World','SWDA.MI','Borsa Italiana'],['iShares Core S&P 500','CSSPX.MI','Borsa Italiana'],['Vanguard S&P 500','VUAA.MI','Borsa Italiana'],['Xtrackers MSCI World','XDWD.DE','Xetra'],['Invesco Nasdaq 100','EQQQ.MI','Borsa Italiana']],
 'ETF monetari':[['Xtrackers EUR Overnight Rate','XEON.MI','Borsa Italiana'],['Amundi Smart Overnight Return','CSH2.PA','Euronext Parigi'],['iShares EUR Ultrashort Bond','ERNE.MI','Borsa Italiana']],
 'Obbligazioni':[['BTP Valore','BTP Valore ISIN','Titoli di Stato italiani · cerca ISIN'],['BTP Italia','BTP Italia','Titoli indicizzati · cerca ISIN'],['BTP ordinari','BTP','Titoli di Stato italiani'],['Bund tedeschi','Bund','Titoli di Stato Germania'],['Treasury USA','US Treasury Bond','Titoli di Stato USA'],['Obbligazioni societarie','corporate bond','Emittenti privati']],
 'Risparmio postale':[['Buono dedicato ai Minori','Buono Minori','Poste Italiane'],['Buono Ordinario','Buono Ordinario','Poste Italiane'],['Buono 4 anni Plus','Buono 4 anni Plus','Poste Italiane'],['Buono 3x4','Buono 3x4','Poste Italiane'],['Altri Buoni Fruttiferi Postali','buoni postali','Scegli dal menu dedicato']],
 'Conto deposito':[['Conto deposito libero','conto deposito libero','Tasso e saldo manuali'],['Conto deposito vincolato','conto deposito vincolato','Tasso e scadenza manuali']],
 'Materie prime':[['Oro','GC=F','Future di riferimento'],['Petrolio WTI','CL=F','Future di riferimento'],['Gas naturale','NG=F','Future di riferimento'],['Rame','HG=F','Future di riferimento']],
 'ETC/ETN':[['WisdomTree Physical Gold','PHAU.MI','ETC · Borsa Italiana'],['iShares Physical Gold','SGLN.L','ETC · Londra'],['WisdomTree Physical Silver','PHAG.MI','ETC · Borsa Italiana']],
 'Oro':[['Oro in EUR','XAUEUR=X','Cambio spot indicativo'],['Oro spot','XAUUSD=X','Spot · USD'],['Argento spot','XAGUSD=X','Spot · USD']],
 'Crypto':[['Bitcoin','BTC-EUR','EUR'],['Ethereum','ETH-EUR','EUR'],['Solana','SOL-EUR','EUR'],['XRP','XRP-EUR','EUR'],['Cardano','ADA-EUR','EUR']],
 'Valute':[['Euro / Dollaro USA','EURUSD=X','Forex'],['Euro / Franco svizzero','EURCHF=X','Forex'],['Euro / Sterlina','EURGBP=X','Forex'],['Euro / Yen','EURJPY=X','Forex']],
 'Futures':[['E-mini S&P 500','ES=F','CME · serie continua'],['E-mini Nasdaq 100','NQ=F','CME · serie continua'],['Mini Dow Jones','YM=F','CBOT · serie continua'],['Oro','GC=F','COMEX · serie continua'],['Petrolio WTI','CL=F','NYMEX · serie continua'],['Gas naturale','NG=F','NYMEX · serie continua']]
};
function browseQuoteCandidate(name,term,detail,category){
 const symbol=String(term||'').trim();
 // Avoid registering a generic bond name, label, or ISIN placeholder as a tradable security.
 if(category==='Obbligazioni'||!(/^[A-Z0-9.^=\-]{1,28}$/i.test(symbol)||/^[A-Z0-9]{1,14}\.[A-Z]{1,4}$/i.test(symbol)))return null;
 if(!/[.=\-]/.test(symbol)&&symbol.includes(' '))return null;
 const future=category==='Futures'||/=F$/i.test(symbol);
 const crypto=category==='Crypto'||/^(BTC|ETH|SOL|XRP|ADA)-/i.test(symbol);
 const currency=crypto?symbol.endsWith('USD')?'USD':'EUR':category==='Valute'||category==='Oro'&&/=X$/i.test(symbol)?'USD':/\.(MI|DE|PA|AS)$/i.test(symbol)?'EUR':/\.(L)$/i.test(symbol)?'GBP':'USD';
 const typ=future?'FUTURE':crypto?'CRYPTOCURRENCY':category==='ETF'||category==='ETF monetari'?'ETF':category==='ETC/ETN'?'ETN':category==='Valute'?'CURRENCY':'EQUITY';
 return {symbol,longname:name,shortname:name,exchDisp:detail||'Mercato da verificare',exchange:detail||'',currency,quoteType:typ,browseCategory:category,browseSelected:true,manual:true};
}
function setupBrowseCategories(prefix,inputId,buttonId){
 const tabs=$(prefix+'BrowseTabs'),items=$(prefix+'BrowseList');if(!tabs||!items)return;
 const browse=tabs.closest('.browse-categories'),queryInput=$(inputId);
 const tools=document.createElement('div');tools.className='fh-browse-scroll-tools';
 tools.innerHTML='<button class="btn" type="button" data-fh-dir="-1" aria-label="Categorie precedenti">‹</button><button class="btn" type="button" data-fh-dir="1" aria-label="Categorie successive">›</button>';
 tabs.parentNode.insertBefore(tools,tabs);
 tools.addEventListener('click',e=>{const b=e.target.closest('[data-fh-dir]');if(!b)return;tabs.scrollBy({left:Number(b.dataset.fhDir)*Math.max(180,tabs.clientWidth*.7),behavior:'smooth'});});
 // Desktop wheel: scroll the horizontal category strip without needing Shift.
 tabs.addEventListener('wheel',e=>{if(tabs.scrollWidth<=tabs.clientWidth+2)return;if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){e.preventDefault();tabs.scrollLeft+=e.deltaY;}},{passive:false});
 const toggle=document.createElement('button');toggle.type='button';toggle.className='btn fh-browse-toggle';toggle.textContent='Esplora categorie';toggle.setAttribute('aria-expanded','false');
 browse.parentNode.insertBefore(toggle,browse);
 function browseVisibility(){const filled=Boolean(queryInput?.value.trim());browse.classList.toggle('fh-browse-collapsed',filled&&!browse.classList.contains('fh-browse-forced-open'));toggle.hidden=!filled;toggle.setAttribute('aria-expanded',String(!browse.classList.contains('fh-browse-collapsed')));}
 toggle.addEventListener('click',()=>{browse.classList.toggle('fh-browse-forced-open');browseVisibility();});
 queryInput?.addEventListener('input',()=>{browse.classList.remove('fh-browse-forced-open');browseVisibility();});
 browseVisibility();
 const categories=CAT.map(x=>x[0]).filter(cat=>FINHOLDRA_BROWSE_CATALOG[cat]);
 let chosen='Azioni';
 function render(){tabs.innerHTML=categories.map(cat=>'<button type="button" class="browse-tab'+(cat===chosen?' active':'')+'" data-browse-category="'+svgEscape(cat)+'" aria-pressed="'+(cat===chosen)+'">'+svgEscape(cat)+'</button>').join('');
 items.innerHTML=(FINHOLDRA_BROWSE_CATALOG[chosen]||[]).map(([name,term,detail],i)=>'<button class="browse-item" type="button" data-browse-index="'+i+'"><span><strong>'+svgEscape(name)+'</strong><small>'+svgEscape(detail)+'</small></span><span class="browse-symbol">'+svgEscape(term)+'</span></button>').join('');
 if(prefix==='asset')$('postalPresets')?.classList.toggle('hidden',chosen!=='Risparmio postale');}
 tabs.addEventListener('click',e=>{const b=e.target.closest('[data-browse-category]');if(!b)return;chosen=b.dataset.browseCategory;render();tabs.querySelector('[data-browse-category].active')?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});});
 items.addEventListener('click',e=>{const b=e.target.closest('[data-browse-index]');if(!b)return;
  const entry=(FINHOLDRA_BROWSE_CATALOG[chosen]||[])[Number(b.dataset.browseIndex)];if(!entry)return;
  const [name,term,detail]=entry;
  if(chosen==='Conto deposito'){if(prefix==='asset'){$('addAssetOverlay').classList.add('hidden');$('depositAddOpen').click();}else $(inputId).value=name;return;}
  if(chosen==='Risparmio postale'){
   if(prefix==='asset'){
    const sel=$('postalPreset'),opt=Array.from(sel?.options||[]).find(o=>o.value&&o.textContent.toLowerCase().includes(name.replace('Altri Buoni Fruttiferi Postali','Altro Buono').toLowerCase()));
    if(opt){sel.value=opt.value;$('postalPresetChoose').click();return;}
    sel?.focus();$('postalPresets')?.scrollIntoView({block:'nearest'});
   }else{$('favoriteSearchResults').innerHTML='<p class="hint">I Buoni Fruttiferi Postali non hanno quotazioni di mercato né grafico giornaliero. Registrali dal portafoglio.</p>';}
   return;
  }
  const candidate=browseQuoteCandidate(name,term,detail,chosen);
  if(candidate){
   if(prefix==='asset'){
    window.__invesquoSearchResults=[candidate];
    const results=$('assetSearchResults');results.innerHTML='<button type="button" class="search-row" data-choice="0">'+svgEscape(name)+' · '+svgEscape(candidate.symbol)+'</button>';
    results.classList.remove('hidden');results.querySelector('[data-choice]')?.click();
   }else{
    favoriteResults=[candidate];const results=$('favoriteSearchResults');results.innerHTML='<button type="button" data-fav-choice="0">'+svgEscape(name)+'</button>';results.querySelector('[data-fav-choice]')?.click();
   }
   return;
  }
  // Ambiguous instruments are not fabricated. Let the user search by a real ISIN/ticker.
  $(inputId).value=term;
  const box=$(prefix==='asset'?'assetSearchResults':'favoriteSearchResults');
  if(box)box.innerHTML='<p class="hint">Per '+svgEscape(name)+' inserisci un ticker esatto o l’ISIN dello strumento. Il nome generico non identifica un titolo acquistabile.</p>';
  $(inputId).focus();
 });
 render();
}
setupBrowseCategories('asset','assetSearch','assetSearchBtn');
setupBrowseCategories('favorite','favoriteQuery','favoriteSearch');
$('assetSearchBtn').onclick=async()=>{const q=$('assetSearch').value.trim(),results=$('assetSearchResults'),hint=$('assetSearchHint');if(!q)return;results.innerHTML='<p class="sub">Cerco nei mercati e nel catalogo obbligazioni MOT…</p>';$('assetNewFields').classList.add('hidden');$('assetSearchError').classList.add('hidden');
 try{const data=await searchYahooQuotes(q);if(q!==$('assetSearch').value.trim())return;results.innerHTML=data.map((a,i)=>'<button type="button" class="search-row" data-choice="'+i+'"><span class="asset-search-main">'+searchIssuerLogo(a)+'<strong>'+formatSearchResult(a)+'</strong></span><small><span class="search-exchange-flag">'+exchangeFlag(a)+'</span>'+svgEscape([a.exchDisp||a.exchange||'Borsa non indicata',futuresResultLabel(a),a.currency||'Valuta da verificare'].join(' · '))+'</small></button>').join('')||'<p class="hint">Nessun risultato disponibile dai servizi online. Prova anche il ticker o l’ISIN e controlla la connessione.</p>';window.__invesquoSearchResults=data;
 if(isinFormat(q.toUpperCase()))hint.textContent='Ricerca ISIN: Yahoo Finance può non riconoscere il codice. Verifica sempre l’ISIN del risultato.';else hint.textContent='Ricerca per nome, ticker e ISIN. Scegli borsa e valuta corrette. ';
 }catch(e){results.innerHTML='<p class="hint">Ricerca esterna non disponibile. Per un’obbligazione puoi inserire direttamente un ISIN valido, anche senza storico di mercato.</p>';$('assetSearchError').classList.remove('hidden');$('assetSearchError').textContent='La ricerca dipende da un servizio esterno, e non è garantita. '}};
$('assetSearch').addEventListener('keydown',e=>{if(e.key==='Enter')$('assetSearchBtn').click()});
let fhSearchDebounce;
$('assetSearch').addEventListener('input',()=>{clearTimeout(fhSearchDebounce);const v=$('assetSearch').value.trim();if(v.length>=3)fhSearchDebounce=setTimeout(()=>{if(!$('addAssetOverlay').classList.contains('hidden'))$('assetSearchBtn').click();},650);});
$('assetChooseAnother').onclick=()=>{$('newAssetQuantityWrap').querySelector('label').textContent='Quantità di quote (anche frazionate; BTP: nominale in €)';$('newAssetPmc').closest('.field').classList.remove('hidden');pendingQuote=null;$('assetNewFields').classList.add('hidden');$('assetSearchResults').classList.remove('hidden');$('assetSearchHint').classList.remove('hidden');$('assetSearch').closest('.field').classList.remove('hidden');$('assetSearch').focus();};
$('assetSearchResults').onclick=async e=>{ $('newAssetQuantityWrap').querySelector('label').textContent='Quantità di quote (anche frazionate; BTP: nominale in €)';$('newAssetPmc').closest('.field').classList.remove('hidden'); const b=e.target.closest('[data-choice]');if(!b)return;
 const r=(window.__invesquoSearchResults||[])[Number(b.dataset.choice)];if(!r)return;
 const code=String(r.symbol||''),rawCurrency=String(r.currency||'EUR').toUpperCase();
 const known=['EUR','USD','GBP','CHF','JPY','CAD','AUD'];
 const cur=known.includes(rawCurrency)?rawCurrency:'EUR';
 pendingQuote={symbol:code,name:r.longname||r.shortname||code,market:r.exchDisp||r.exchange||'Borsa da verificare',exchange:r.exchange,price:null,isin:r.isin||'',currency:cur,kind:r.quoteType||'',verifiedPrice:false};
 $('chosenAssetName').textContent=pendingQuote.name;
 $('chosenAssetExchange').textContent=exchangeFlag(r)+' '+code+' · '+pendingQuote.market+' · '+cur+(futuresType(r)?' · SERIE CONTINUA: solo monitoraggio, non un contratto negoziabile':' · verifica prima di aggiungere')+(String(r.quoteType||'').toUpperCase()==='BOND'?' · grafico solo se disponibile storico verificato':'');
 $('newAssetType').setAttribute('autocomplete','off');
 $('newAssetIsin').value=pendingQuote.isin;
 $('newAssetCurrency').value=cur;
 const ty=String(r.quoteType||'').toUpperCase(),nm=pendingQuote.name.toLowerCase();
 const gold=/\b(gold|gld|oro|silver|argento|physical gold|physical silver)\b/i.test(nm+' '+code);
 setNewAssetCategoryFromQuote(r);
 $('assetSearchHint').textContent=futuresType(r)?'Futures: prezzo della serie continua a fini informativi. Margini, moltiplicatori, scadenza e P/L non sono gestiti: aggiungilo ai Preferiti per seguirlo.':'Inserisci il prezzo di acquisto. Verifica ticker, borsa e valuta.';syncNewAssetMaturity();$('newAssetQuantity').value='1';$('newAssetMaturityDate').value='';$('newAssetMaturityValue').value='';syncNewAssetMaturity();$('newAssetPmc').value='';$('newAssetDate').value=today();$('newAssetAmount').value='';updateNewAssetEntryPreview();
 $('newAssetFx').value=cur==='EUR'?'1':'';
 $('assetNewFields').classList.remove('hidden');
 $('assetSearchResults').classList.add('hidden');$('assetSearchHint').classList.add('hidden');
 $('assetSearch').closest('.field').classList.add('hidden');
 $('addAssetOverlay').querySelector('.app-modal-card').scrollTop=0;
 $('assetNewFields').scrollIntoView({block:'nearest',behavior:'instant'});
 // Safeguard against browser form restoration when the selected result opens.
 queueMicrotask(()=>{if(pendingQuote?.symbol===code&&$('newAssetType').dataset.manualCategoryChange!=='true')setNewAssetCategoryFromQuote(r);});
 if(!futuresType(r))$('assetSearchHint').textContent='Inserisci il prezzo di acquisto. Verifica ticker, borsa e valuta; ISIN facoltativo.';
 if(cur!=='EUR')$('newAssetCurrency').dispatchEvent(new Event('change'));
 // Non bloccare la selezione per timeout/CORS della quotazione: ricerca e verifica sono separate.
 (async()=>{if(r.manual||ty==='BOND')return;try{const u='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(code)+'?range=5d&interval=1d';
   let m=null;for(const addr of ['/.netlify/functions/history?symbol='+encodeURIComponent(code)+'&range=5d&currency='+encodeURIComponent(cur),u,...relayUrls(u)]){try{const data=JSON.parse(await readUrl(addr,5000));m=data?.chart?.result?.[0]?.meta;if(m)break}catch(_){}}
   if(!m||String(m.symbol||'').toUpperCase()!==code.toUpperCase()||pendingQuote?.symbol!==code)return;
   const verifiedCur=String(m.currency||cur).toUpperCase(),p=Number(m.regularMarketPrice);
   if(!(p>0)||verifiedCur!==cur)return;
   pendingQuote.price=p;pendingQuote.verifiedPrice=true;
   if($('newAssetDate').value===today()&&!$('newAssetPmc').value)$('newAssetPmc').value=String(p);updateNewAssetEntryPreview();
   $('chosenAssetExchange').textContent=exchangeFlag(r)+' '+code+' · '+pendingQuote.market+' · '+cur+' · prezzo mercato verificato';
  }catch(_){}})();
};
// A fresh FX quote is optional; never invent a conversion rate.
async function fetchFxEuro(currency){
 if(currency==='EUR')return 1;
 const symbol='EUR'+currency+'=X',u='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?range=5d&interval=1d';
 for(const addr of [u,...relayUrls(u)]){try{const d=JSON.parse(await readUrl(addr,5500)),m=d?.chart?.result?.[0]?.meta;
  const rate=Number(m?.regularMarketPrice);if(rate>0&&String(m.currency||'').toUpperCase()===currency)return 1/rate}catch(_){}}
 return null;
}
$('newAssetCurrency').onchange=async e=>{const c=e.target.value;if(!pendingQuote)return;pendingQuote.currency=c;
 $('newAssetFx').value='';$('assetSearchHint').textContent='Carico il cambio '+c+' / EUR…';
 const fx=await fetchFxEuro(c);if(fx){if(!$('newAssetFx').value.trim())$('newAssetFx').value=fx.toFixed(7);updateNewAssetEntryPreview();$('assetSearchHint').textContent='Cambio indicativo: verifica quello effettivo del broker.'}else $('assetSearchHint').textContent='Cambio non disponibile: inserisci un valore verificato (1 '+c+' in EUR).';
};
function isNewPostalAsset(){return $('newAssetType').value==='Risparmio postale';}
function newAssetEnteredQty(){
 const postal=isNewPostalAsset(),price=postal?1:Number($('newAssetPmc').value),fx=postal?1:Number($('newAssetFx').value),cat=$('newAssetType').value;
 if(!(price>0&&fx>0))return NaN;
 const factor=cat==='Obbligazioni'?100:1;
 return entryMode('newAssetInputMode')==='eur'?Number($('newAssetAmount').value)*factor/(price*fx):Number($('newAssetQuantity').value);
}
function newAssetPostalProjection(qty){
 const capital=qty, date=$('newAssetDate').value,end=$('newAssetMaturityDate').value;
 const raw=$('newAssetMaturityValue').value.trim(),rawYield=$('newAssetPostalYieldPct').value.trim(),yieldPct=rawYield===''?null:Number(rawYield),maturity=raw!==''?Number(raw):(yieldPct!==null&&Number.isFinite(yieldPct)&&yieldPct>=0?capital*(1+yieldPct/100):null);
 const feePct=Number($('newAssetPostalAnnualFee').value),years=(date&&end&&end>date)?(Date.parse(end+'T12:00:00Z')-Date.parse(date+'T12:00:00Z'))/(365.2425*864e5):null;
 const feeValid=Number.isFinite(feePct)&&feePct>=0&&feePct<=100;
 const fee=feeValid&&years!==null?capital*feePct/100*years:null;
 const profit=maturity===null||!Number.isFinite(maturity)?null:maturity-capital;
 return {capital,maturity,profit,fee,feePct,feeValid,years,yieldPct};
}
function updateNewAssetEntryPreview(){
 const amtMode=entryMode('newAssetInputMode')==='eur',postal=isNewPostalAsset();
 $('newAssetQuantityWrap').classList.toggle('entry-field-hidden',amtMode);
 $('newAssetAmountWrap').classList.toggle('entry-field-hidden',!amtMode);
 $('newAssetPmc').closest('.field').classList.toggle('hidden',postal);
 $('newAssetQuantityWrap').querySelector('label').textContent=postal?'Quote nominali (1 quota = 1 €)':'Quantità di quote (anche frazionate; BTP: nominale in €)';
 $('newAssetAmountWrap').querySelector('label').textContent=postal?'Euro investiti / capitale nominale (€)':'Importo totale acquistato (€)';
 const qty=newAssetEnteredQty(),price=postal?1:Number($('newAssetPmc').value),fx=postal?1:Number($('newAssetFx').value),bond=$('newAssetType').value==='Obbligazioni',cur=$('newAssetCurrency').value;
 const spent=qty*price*fx/(bond?100:1),valid=qty>0&&price>0&&fx>0&&Number.isFinite(spent)&&validEntryDate('newAssetDate');
 if(postal){
  const x=newAssetPostalProjection(qty);
  if(!valid){$('newAssetEntryPreview').innerHTML='Inserisci gli euro investiti oppure il numero di quote nominali e la data effettiva di sottoscrizione.';return;}
  const lines=['<strong>Prospetto del Buono · anteprima</strong> · '+shortDate($('newAssetDate').value),
   '<div>Capitale nominale: <strong>'+eur(x.capital)+'</strong></div>',
   '<div>Quote nominali: <strong>'+entryDecimal(qty)+'</strong> (1 € ciascuna)</div>',
   '<div>Importo investito: <strong>'+eur(spent)+'</strong></div>',
   '<div>Valore lordo a scadenza: <strong>'+(x.maturity!==null&&x.maturity>0?eur(x.maturity):'Da indicare')+'</strong></div>',
   '<div>Interessi lordi previsti: <strong>'+(x.profit!==null?eur(x.profit):'Non calcolabili senza valore o rendimento a scadenza')+'</strong></div>',
   '<div>Rendimento lordo complessivo: <strong>'+(x.profit!==null&&x.capital>0?((x.profit/x.capital)*100).toFixed(2).replace('.',',')+'%':'Da indicare')+'</strong></div>',
   '<div>Commissioni annue: <strong>'+(x.feeValid?String(x.feePct).replace('.',',')+'%':'Valore non valido')+'</strong></div>',
   '<div>Costi annui complessivi stimati: <strong>'+(x.fee!==null?eur(x.fee):'Indicare la scadenza per la stima')+'</strong></div>'];
  if(x.profit!==null&&x.fee!==null)lines.push('<div>Guadagno stimato dopo commissioni (ante imposte): <strong>'+eur(x.profit-x.fee)+'</strong></div>');
  lines.push('<p class="entry-explain">Stima informativa: le condizioni reali dipendono dalla specifica serie; non sono calcolate imposte o bollo. Conferma solo dopo aver confrontato i dati con il documento di sottoscrizione.</p>');
  $('newAssetEntryPreview').innerHTML=lines.join('');return;
 }
 $('newAssetEntryPreview').innerHTML=valid?'<strong>Anteprima acquisto</strong> · '+shortDate($('newAssetDate').value)+'<div>Quantità calcolata: <strong>'+entryDecimal(qty)+(bond?' € nominali':' quote')+'</strong></div><div>Prezzo di acquisto: <strong>'+localMoney(price,cur)+(bond?' / 100 nominali':' / quota')+'</strong></div><div>Capitale investito: <strong>'+eur(spent)+'</strong></div><div class="entry-explain">I valori sono lordi; commissioni escluse. Il prezzo corrente del titolo resta indipendente dal prezzo di acquisto.</div>':'Inserisci un prezzo effettivo, '+(amtMode?'l’importo in €':'la quantità')+' e una data valida per vedere il calcolo prima della conferma.';
}
function syncNewAssetMaturity(){const typ=$('newAssetType').value;const active=['Obbligazioni','Risparmio postale'].includes(typ);$('newAssetMaturityFields').classList.toggle('hidden',!active);$('newAssetPostalFeeWrap').classList.toggle('hidden',typ!=='Risparmio postale');const futures=typ==='Futures';$('postalTrackNotice').classList.toggle('hidden',!(pendingQuote?.postalKind&&typ==='Risparmio postale'));$('futureTrackNotice').classList.toggle('hidden',!futures);$('addAssetCommit').disabled=futures;$('addToPacOnly').disabled=futures;updateNewAssetEntryPreview();}
$('newAssetType').addEventListener('change',()=>{ $('newAssetType').dataset.manualCategoryChange='true';syncNewAssetMaturity(); });
for(const id of ['newAssetQuantity','newAssetAmount','newAssetPmc','newAssetFx','newAssetDate','newAssetType','newAssetMaturityDate','newAssetMaturityValue','newAssetPostalAnnualFee','newAssetPostalYieldPct'])$(id).addEventListener('input',updateNewAssetEntryPreview);
for(const id of ['newAssetCurrency','newAssetType'])$(id).addEventListener('change',updateNewAssetEntryPreview);
document.querySelectorAll('input[name="newAssetInputMode"]').forEach(r=>r.addEventListener('change',updateNewAssetEntryPreview));
$('addToPacOnly').onclick=()=>{const a=pendingQuote;if(!a)return;correctAccidentalCryptoCategory();
 if($('newAssetType').value==='Futures'){alert('I futures possono essere monitorati nei Preferiti. I PAC su contratti futures non sono supportati.');return;}
 const isin=String($('newAssetIsin').value||'').trim().toUpperCase(),currency=$('newAssetCurrency').value,cat=$('newAssetType').value;
 if(isin&&(!isinFormat(isin)||!isinChecksum(isin))){alert('Controlla il codice ISIN.');return}
 if(!a.symbol&&!isin){alert('Per il PAC è necessario ticker o ISIN.');return}
 const known=state.assets.find(x=>(isin&&x.isin===isin)||(a.symbol&&x.symbol===a.symbol&&currencyOf(x)===currency));
 let selected=known;
 if(!selected){
  selected={id:'pac-watch-'+Date.now(),name:a.name,cat,q:0,pmc:0,p:0,currency,fxRate:currency==='EUR'?1:0,costEur:0,symbol:a.symbol||isin,isin,exchange:a.market,quoteSource:'In attesa della prima chiusura verificata',quoteAt:'Non disponibile',quoteUpdatedAt:null};
  state.assets.push(selected);save();refreshBuyOptions();render();
 }
 window.__pacAddingInstrument=false;closeAddAsset();pacRefreshLists();$('pacAsset').value=selected.id;$('pacOverlay').classList.remove('hidden');
 $('pacMessage').classList.remove('hidden');$('pacMessage').textContent='Titolo selezionato per il PAC. Nessun acquisto iniziale è stato registrato.';
};
$('addAssetCommit').onclick=()=>{const a=pendingQuote;if(!a)return;correctAccidentalCryptoCategory();
 if($('newAssetType').value==='Futures'){alert('I futures sono disponibili per ricerca, grafici e preferiti. La registrazione di posizioni futures richiede gestione di margini, moltiplicatori e regolamento: non è ancora supportata per evitare un patrimonio inesatto.');return;}
 const isin=$('newAssetIsin').value.trim().toUpperCase(),qty=newAssetEnteredQty(),cat=$('newAssetType').value,postal=cat==='Risparmio postale',pmc=postal?1:Number($('newAssetPmc').value),currency=$('newAssetCurrency').value,fx=postal?1:Number($('newAssetFx').value),purchaseDate=validEntryDate('newAssetDate');
 if(isin&&(!isinFormat(isin)||!isinChecksum(isin))){alert('Se inserisci un ISIN, deve essere formalmente valido. Puoi anche lasciarlo vuoto.');return}
 if(!(qty>0&&pmc>0&&Number.isFinite(qty))){alert('Inserisci importo o quantità e prezzo di acquisto validi.');return}if(!purchaseDate){alert('Indica una data di acquisto valida, non futura.');return}
 if(!(fx>0&&Number.isFinite(fx))){alert('Indica un cambio in EUR valido per questa valuta.');return}
 if(state.assets.some(x=>x.symbol===a.symbol&&currencyOf(x)===currency)){alert('La stessa quotazione è già presente: usa Registra acquisto.');return}
 
 const enteredMaturityDate=$('newAssetMaturityDate').value;const enteredMaturityValue=$('newAssetMaturityValue').value.trim();
 if(['Obbligazioni','Risparmio postale'].includes(cat)&&enteredMaturityDate&&!/^\d{4}-\d{2}-\d{2}$/.test(enteredMaturityDate)){alert('Data di scadenza non valida');return}
 if(['Obbligazioni','Risparmio postale'].includes(cat)&&enteredMaturityValue&&(!(Number(enteredMaturityValue)>0))){alert('Valore previsto a scadenza non valido');return}
 const feeProjection=postal?newAssetPostalProjection(qty):null;
 if(postal&&(!feeProjection.feeValid||currency!=='EUR')){alert('Verifica commissioni annue (da 0 a 100%) e valuta EUR del buono.');return}
 if(postal&&$('newAssetPostalYieldPct').value.trim()!==''&&(!(Number($('newAssetPostalYieldPct').value)>=0)||!Number.isFinite(Number($('newAssetPostalYieldPct').value)))){alert('Indica un rendimento percentuale complessivo valido.');return}
 if(postal&&enteredMaturityDate&&enteredMaturityDate<=purchaseDate){alert('La data di rimborso deve essere successiva alla sottoscrizione.');return}
 const confirmation=postal?('PROSPETTO BUONO POSTALE\n'+a.name+'\nData acquisto: '+shortDate(purchaseDate)+'\nCapitale nominale: '+eur(qty)+'\nQuote nominali: '+entryDecimal(qty)+'\nValore lordo a scadenza: '+(feeProjection.maturity===null?'Non indicato':eur(feeProjection.maturity))+'\nInteressi lordi: '+(feeProjection.profit===null?'Non calcolabili':eur(feeProjection.profit))+'\nCommissioni annue: '+feeProjection.feePct+'%'+(feeProjection.fee===null?'':' · costi stimati '+eur(feeProjection.fee))+(feeProjection.fee!==null&&feeProjection.profit!==null?'\nGuadagno dopo commissioni, ante imposte: '+eur(feeProjection.profit-feeProjection.fee):'')+'\n\nConfermi la registrazione?'):('Conferma acquisto del '+shortDate(purchaseDate)+' di '+a.name+' · '+a.symbol+' · '+a.market+'? Quantità '+entryDecimal(qty)+(cat==='Obbligazioni'?' nominali':' quote')+', investito '+eur(qty*pmc/(cat==='Obbligazioni'?100:1)*fx)+'. Verifica ticker, cambio e prezzo prima di confermare.');
 if(!confirm(confirmation))return;
 const newAsset={id:'custom_'+Date.now(),name:a.name,cat,q:qty,pmc,postalKind:a.postalKind||null,postalSeriesUnverified:!!a.postalKind,postalNominal:postal?qty:null,postalAnnualFeePct:postal?feeProjection.feePct:0,postalEstimatedFees:postal?feeProjection.fee:null,maturityDate:['Obbligazioni','Risparmio postale'].includes(cat)?enteredMaturityDate:'',maturity:postal?feeProjection.maturity:cat==='Obbligazioni'&&enteredMaturityValue?Number(enteredMaturityValue):null,p:postal?1:(a.price||pmc),currency,fxRate:fx,costEur:qty*pmc/(cat==='Obbligazioni'?100:1)*fx,symbol:a.symbol,isin,exchange:a.market,quoteSource:a.postalKind?'Capitale nominale · il valore di rimborso va verificato presso Poste':a.verifiedPrice?'Yahoo Finance · '+a.market:'Prezzo iniziale inserito manualmente',quoteAt:a.postalKind?'Valore nominale, non quotazione':a.verifiedPrice?'Ricerca '+new Date().toLocaleString('it-IT'):'Prezzo manuale',quoteUpdatedAt:a.verifiedPrice?new Date().toISOString():null};
 const addTrade={id:Date.now()+'-add-'+Math.random().toString(36).slice(2,8),kind:'buy',date:purchaseDate,asset:newAsset.id,assetName:newAsset.name,cat:newAsset.cat,spent:newAsset.costEur,quantity:qty,price:pmc,fxExecution:fx,recordedAt:new Date().toISOString()};
 try{
  persistVerifiedPurchase([...state.assets,newAsset],[...trades,addTrade],addTrade);
  trackSnapshot();refreshBuyOptions();render();showVerifiedPurchaseInHistory();closeAddAsset();
  notice('Titolo e acquisto salvati e verificati. Visibili in Storico → Archivio.');
 }catch(err){alert(err.message)}
};

if(ACCOUNT_ID){try{if(depositMigrationDirty)save();normalizeLegacyTrades();initInvestmentDates();trackSnapshot();render();renderEditor();renderBuy();countPortfolioVisit()}catch(e){notice('Errore nel cruscotto: '+e.message,true)}if(!SIM_MODE)refresh(true);}if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});



// Finholdra Beta 9.2: mouse-wheel scrolling on desktop without affecting touch devices.
(function setupDesktopWheelScroll(){
 const desktop=window.matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)');
 document.addEventListener('wheel',function(ev){
  if(!desktop.matches||ev.ctrlKey||ev.metaKey||ev.shiftKey||ev.defaultPrevented)return;
  // Do not interfere with select menus or independently scrollable controls.
  if(ev.target.closest('select,textarea,[contenteditable="true"]'))return;
  const delta=ev.deltaY*(ev.deltaMode===1?16:ev.deltaMode===2?window.innerHeight:1);
  if(!delta)return;
  let scroller=null;
  const detail=document.getElementById('assetDetailOverlay');
  if(detail&&!detail.classList.contains('hidden')){
   scroller=detail.querySelector('.asset-detail-sheet');
  }else{
   const activeModal=Array.from(document.querySelectorAll('.app-modal:not(.hidden)')).find(el=>getComputedStyle(el).display!=='none');
   if(activeModal)scroller=activeModal.querySelector('.app-modal-card')||activeModal;
  }
  if(!scroller){
   let el=ev.target;
   while(el&&el!==document.body){
    if(el instanceof HTMLElement&&el.scrollHeight>el.clientHeight+1&&getComputedStyle(el).overflowY.match(/auto|scroll/)){
     scroller=el;break;
    }
    el=el.parentElement;
   }
  }
  if(!scroller)scroller=document.scrollingElement||document.documentElement;
  if(scroller.scrollHeight<=scroller.clientHeight+1)return;
  ev.preventDefault();
  scroller.scrollTop+=delta;
 },{passive:false});
})();

// Finholdra v5.9: independent views, sharing the same portfolio state.
let invesquoActiveView='dashboard';
let invesquoSavedScroll={dashboard:0,history:0,portfolio:0,settings:0,education:0};
function invesquoShowView(name){
 if(!['dashboard','history','portfolio','settings','education','radar'].includes(name))return;
 invesquoSavedScroll[invesquoActiveView]=window.scrollY||0;
 invesquoActiveView=name;
 if(name!=='dashboard'&&facePanelOpen){facePanelOpen=false;renderFacePanel();}
 const nodes={dashboard:'dashboardView',history:'historyView',portfolio:'portfolioView',settings:'settingsView',education:'educationView',radar:'radarView'};
 for(const [key,id] of Object.entries(nodes))$(id).classList.toggle('hidden',key!==name);
 for(const [key,id] of Object.entries({dashboard:'navDashboard',history:'navHistory',portfolio:'navPortfolio',settings:'settingsShortcut',education:'navEducation',radar:'navRadar'})){
  const el=$(id);el.classList.toggle('active',key===name);
  if(key===name)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
 }
 document.title=(name==='dashboard'?'Finholdra':({history:'Storico',portfolio:'Investimenti',settings:'Impostazioni',education:'Educational',radar:'Finn Radar'}[name]+' · Finholdra'));
 if(name==='settings')invesquoCheckServer(); document.body.classList.toggle('fh-radar-active',name==='radar'); document.body.classList.toggle('fh-home-active',name==='dashboard'); finnUpdateFigure(); if(name==='radar')window.finnRadarOpen?.();
 window.scrollTo({top:invesquoSavedScroll[name]||0,left:0,behavior:'instant'});
}
$('navDashboard').onclick=()=>invesquoShowView('dashboard');
$('navHistory').onclick=()=>invesquoShowView('history');
$('navPortfolio').onclick=()=>invesquoShowView('portfolio');
$('navEducation').onclick=()=>invesquoShowView('education'); $('navRadar').onclick=()=>invesquoShowView('radar');
$('settingsShortcut').onclick=()=>{invesquoShowView('settings');showBackupReminder()};
// b.7.19: pull down from the top of Dashboard to check prices without reloading local data.
(function setupDashboardPullRefresh(){
 const indicator=$('pullRefreshIndicator'),label=$('pullRefreshLabel');
 if(!indicator||!label)return;
 let initialY=0,initialX=0,distance=0,tracking=false,vertical=false,loading=false,hideHandle=null;
 const eligible=e=>invesquoActiveView==='dashboard'&&document.visibilityState!=='hidden'&&window.scrollY<=2&&!document.querySelector('.modal:not(.hidden),.overlay:not(.hidden)')&&!e.target.closest('input,textarea,select,button,a,[contenteditable="true"]');
 function show(text,spinning=false){if(hideHandle){clearTimeout(hideHandle);hideHandle=null}label.textContent=text;indicator.classList.add('is-visible');indicator.classList.toggle('is-loading',spinning);indicator.setAttribute('aria-hidden','false')}
 function hide(){indicator.classList.remove('is-visible','is-loading');indicator.setAttribute('aria-hidden','true')}
 document.addEventListener('touchstart',e=>{
  if(loading||e.touches.length!==1||!eligible(e)){tracking=false;return}
  initialY=e.touches[0].clientY;initialX=e.touches[0].clientX;distance=0;tracking=true;vertical=false;
 },{passive:true});
 document.addEventListener('touchmove',e=>{
  if(!tracking||e.touches.length!==1)return;
  const dy=e.touches[0].clientY-initialY,dx=e.touches[0].clientX-initialX;
  if(!vertical&&Math.abs(dx)>Math.abs(dy)){tracking=false;hide();return}
  if(dy<=0||window.scrollY>2||invesquoActiveView!=='dashboard'){tracking=false;hide();return}
  if(dy>9)vertical=true;
  if(!vertical)return;
  if(e.cancelable)e.preventDefault();
  distance=Math.min(130,dy);
  show(distance>=76?'Rilascia per aggiornare':'Trascina per aggiornare');
 },{passive:false});
 async function finish(){
  if(!tracking)return;
  tracking=false;
  const trigger=vertical&&distance>=76;distance=0;
  if(!trigger){hide();return}
  if(busy){show('Aggiornamento già in corso',true);hideHandle=setTimeout(hide,900);return}
  loading=true;show('Aggiornamento quotazioni…',true);
  try{const ok=await refresh(true);show(ok?'Prezzi controllati':'Nessuna nuova quotazione disponibile');updateMarketStatus()}
  finally{loading=false;indicator.classList.remove('is-loading');hideHandle=setTimeout(hide,1250)}
 }
 document.addEventListener('touchend',finish,{passive:true});
 document.addEventListener('touchcancel',()=>{tracking=false;distance=0;if(!loading)hide()},{passive:true});
})();
$('backDashboard').onclick=()=>invesquoShowView('dashboard');
$('backDashboardBottom').onclick=()=>invesquoShowView('dashboard');
// In case the user registered a purchase from a shortcut, make that screen visible.
$('assetList').addEventListener('click',e=>{if(e.target.closest('[data-buy-id]'))invesquoShowView('portfolio')});

// Mascot workshop: a purely local toy. It never changes prices, categories, or returns.
let mascotHatOn=false,mascotPlayChosenEmotion=null;let mascotPlayTaps=0,mascotPlayWick=-5,mascotPlayDragging=false,mascotPlayMoved=false;
let mascotPreviewScene=null,mascotPreviewTimer=null;
const mascotPlayContainer=$('mascotPlayground'),mascotPlayArt=$('mascotPlayArt');
function mascotPlayMood(){return mascotPlayTaps>=8?'negative':mascotPlayTaps>=4?'neutral':'positive'}
function mascotPlayEmotion(){const m=mascotPlayMood();return m==='negative'?'concerned':m==='neutral'?'thinking':mascotPlayTaps%3===0?'celebrate':'positive'}
function mascotPlayAnimate(name){
 mascotPlayArt.classList.remove('is-reacting','is-overloaded','is-stretched','is-squashed','is-dancing','is-spin','is-wiggle','is-flip');
 void mascotPlayArt.offsetWidth;
 if(prefs.motion!=='off')mascotPlayArt.classList.add(['is-reacting','is-overloaded'].includes(name)?(['is-reacting','is-dancing','is-spin','is-wiggle','is-flip'][mascotPlayTaps%5]):name);
}
function mascotPlayRender(){
 const chosen=mascotPreviewScene?mascotPreviewScene.emotion:mascotPlayChosenEmotion;const mood=['crying','angry','sad','concerned','praying','anxious','doubtful'].includes(chosen)?'negative':chosen==='neutral'?'neutral':chosen?'positive':mascotPlayMood();const color=prefs.colors[mood]||PREF_DEFAULTS.colors[mood];
 let svg=mascotSVG(mood,color,false,chosen||mascotPlayEmotion());
 // A separate movable wick overlays the normal, fixed candlestick. Keep the body unchanged.
 svg=svg.replace('viewBox="0 0 100 112"','viewBox="0 -23 100 143"')
        .replace(/M50 12V5M50 91v10/g,'M50 91v10');
 const wickMarkup='<g id="playWick" aria-label="Stoppino trascinabile">'+
  '<line x1="50" y1="12" x2="50" y2="'+mascotPlayWick+'" stroke="#10263c" stroke-width="8" stroke-linecap="round"/>'+
  '<line x1="50" y1="12" x2="50" y2="'+mascotPlayWick+'" stroke="'+color+'" stroke-width="4.6" stroke-linecap="round"/>'+
  '<circle id="wickTip" cx="50" cy="'+mascotPlayWick+'" r="6" fill="'+color+'" stroke="#10263c" stroke-width="2"/>'+
  '<rect id="wickHit" x="38" y="-23" width="24" height="39" fill="transparent"/></g>';
 svg=svg.replace('<g class="candle-character">', '<g class="candle-character">'+wickMarkup);
 mascotPlayArt.innerHTML=svg+(typeof mascotHatOn!=='undefined'&&mascotHatOn?'<span class="mascot-hat-overlay">IPF</span>':'')+(window.__monkeyShoulder?'<span class="shoulder-monkey">'+(document.querySelector('#toyMonkey svg')?.outerHTML||'')+'</span>':'');
 if(mascotPreviewScene){mascotPlayArt.classList.remove('finn-scene','finn-scene-awake','finn-scene-doze','finn-scene-party','finn-scene-tears','finn-scene-prayer','finn-scene-anticipation','expression-watching','finn-scene-sleep');mascotPlayArt.classList.add('finn-scene','finn-scene-'+mascotPreviewScene.type);if(mascotPreviewScene.key==='watch')mascotPlayArt.classList.add('expression-watching');}
 document.querySelectorAll('[data-finn-preview]').forEach(b=>{const on=mascotPreviewScene?.key===b.dataset.finnPreview;b.classList.toggle('selected',!!on);b.setAttribute('aria-pressed',String(!!on));});
 $('mascotTapCount').textContent=mascotPlayTaps+' '+(mascotPlayTaps===1?'tocco':'tocchi');
}
function mascotPlayTap(){
 mascotPreviewStop();mascotPlayTaps++;mascotPlayChosenEmotion=null;
 mascotPlayRender();
 if(mascotPlayTaps>=8){mascotPlayAnimate('is-overloaded');$('mascotPlayStatus').textContent='😵‍💫 ◉ ◉ ◉'}
 else if(mascotPlayTaps>=4){mascotPlayAnimate('is-reacting');$('mascotPlayStatus').textContent='🌿 ✨'}
 else {mascotPlayAnimate('is-reacting');$('mascotPlayStatus').textContent='✨ ☝️'}
}
function mascotPlayY(event){const svg=mascotPlayArt.querySelector('svg');if(!svg)return -5;const b=svg.getBoundingClientRect();return -23+(event.clientY-b.top)/b.height*143}
mascotPlayContainer.addEventListener('pointerdown',e=>{
 if(!e.target.closest('#wickHit,#wickTip'))return;
 mascotPlayDragging=true;mascotPlayMoved=false;
 mascotPlayContainer.setPointerCapture(e.pointerId);
 e.preventDefault();
});
mascotPlayContainer.addEventListener('pointermove',e=>{
 if(!mascotPlayDragging)return;
 const next=Math.min(11,Math.max(-19,mascotPlayY(e)));
 if(Math.abs(next-mascotPlayWick)>1)mascotPlayMoved=true;
 mascotPlayWick=next;mascotPlayContainer.style.background='radial-gradient(circle at '+(50+next)+'% 45%,rgba(60,195,162,.2),transparent 62%),var(--bg)';
 for(const line of mascotPlayArt.querySelectorAll('#playWick line'))line.setAttribute('y2',String(next));
 const tip=mascotPlayArt.querySelector('#wickTip');if(tip)tip.setAttribute('cy',String(next));
 e.preventDefault();
});
function mascotPlayEnd(){if(!mascotPlayDragging)return;mascotPlayDragging=false;
 if(mascotPlayMoved){
  mascotPlayAnimate(mascotPlayWick<-5?'is-stretched':'is-squashed');
  $('mascotPlayStatus').textContent=mascotPlayWick<-5?'✨ ↗':'💫 ↘';
 }
}
mascotPlayContainer.addEventListener('pointerup',mascotPlayEnd);
mascotPlayContainer.addEventListener('pointercancel',mascotPlayEnd);
mascotPlayContainer.addEventListener('click',e=>{if(e.target.closest('.mascot-toys'))return;if(mascotPlayMoved){mascotPlayMoved=false;return}mascotPlayTap()});
mascotPlayContainer.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();mascotPlayTap()}});
function mascotPreviewStop(){clearTimeout(mascotPreviewTimer);mascotPreviewTimer=null;mascotPreviewScene=null;mascotPlayArt.classList.remove('finn-scene','finn-scene-awake','finn-scene-doze','finn-scene-party','finn-scene-tears','finn-scene-prayer','finn-scene-anticipation','expression-watching','finn-scene-sleep');}
function mascotPreviewRun(key){
 mascotPreviewStop();
 const variants={awake:{type:'awake',emotion:'waking',text:'☀️ Finn si sveglia'},prayer:{type:'anticipation',emotion:'anxious',text:'⏳ Wall Street apre alle 15:30 · Finn è in attesa'},watch:{type:'anticipation',emotion:'watching',text:'⌚ Finn controlla l’orologio aspettando Wall Street'},party:{type:'party',emotion:'celebrate',text:'🎉 Chiusura positiva: Finn festeggia'},tears:{type:'tears',emotion:'crying',text:'💧 Chiusura negativa: Finn piange'},doze:{type:'doze',emotion:'dozing',text:'🌙 Finn si addormenta'},sleep:{type:'sleep',emotion:'sleeping',text:'💤 Finn dorme con tre Z animate'}};
 const config=variants[key];if(!config)return;
 mascotPreviewScene={key,...config};mascotPlayArt.classList.remove('fh-idle-look','fh-idle-stretch','fh-idle-tiptoe','fh-idle-nod','fh-idle-wave','fh-idle-slow-bounce');mascotPlayRender();
 // Restart CSS animation even when the same action is requested twice.
 void mascotPlayArt.offsetWidth;
 $('mascotPlayStatus').textContent=config.text+' · anteprima';
 if(key!=='sleep')mascotPreviewTimer=setTimeout(()=>{if(!mascotPreviewScene||mascotPreviewScene.key!==key)return;if(key==='party'||key==='tears'||key==='doze'){mascotPreviewScene={key:'sleep',type:'sleep',emotion:'sleeping'};mascotPlayRender();$('mascotPlayStatus').textContent='💤 Finn dorme dopo la chiusura · anteprima';}else{mascotPreviewStop();mascotPlayRender();}},(key==='prayer'||key==='watch')?3500:key==='awake'?2200:3100);
}
document.querySelectorAll('[data-finn-preview]').forEach(b=>b.addEventListener('click',()=>mascotPreviewRun(b.dataset.finnPreview)));
document.querySelectorAll('[data-toy-emotion]').forEach(b=>b.addEventListener('click',()=>{mascotPreviewStop();mascotPlayChosenEmotion=b.dataset.toyEmotion;mascotPlayRender();document.getElementById('mascotPlayStatus').textContent='Espressione: '+b.textContent}));
$('mascotPlayReset').onclick=()=>{mascotPreviewStop();mascotPlayChosenEmotion=null;mascotPlayTaps=0;mascotPlayWick=-5;mascotPlayRender();$('mascotPlayStatus').textContent='👆 Tocca · ↕ Stoppino · ◉ Premi'};

let bananaHold=null,bananaTriggered=false,bananaStart=null;
function bananaRain(){bananaTriggered=true;for(let i=0;i<24;i++){const b=document.createElement('span');b.className='banana';b.textContent='🍌';b.style.setProperty('--x',(5+Math.random()*88)+'%');b.style.setProperty('--d',(1.4+Math.random()*1.1)+'s');b.style.setProperty('--dx',(-65+Math.random()*130)+'px');mascotPlayContainer.appendChild(b);setTimeout(()=>b.remove(),2900)}mascotPlayAnimate('is-dancing');$('mascotPlayStatus').textContent='🍌 🍌 🍌'}
mascotPlayContainer.addEventListener('pointerdown',e=>{if(e.target.closest('.mascot-toys')||e.target.closest('#wickHit,#wickTip'))return;bananaTriggered=false;bananaStart={x:e.clientX,y:e.clientY};clearTimeout(bananaHold);bananaHold=setTimeout(()=>{window.finholdraChooseGame?.()},850)},true);
mascotPlayContainer.addEventListener('pointermove',e=>{if(bananaStart&&Math.hypot(e.clientX-bananaStart.x,e.clientY-bananaStart.y)>16){clearTimeout(bananaHold);bananaHold=null}},true);
for(const eventName of ['pointerup','pointercancel','pointerleave'])mascotPlayContainer.addEventListener(eventName,()=>{clearTimeout(bananaHold);bananaHold=null;bananaStart=null},true);
mascotPlayContainer.addEventListener('click',e=>{if(bananaTriggered||window.__finnArcadeLongHold){e.stopImmediatePropagation();bananaTriggered=false;window.__finnArcadeLongHold=false}},true);

mascotPlayRender();


/* b.7.22: up to 3 watchlist quotes, independent of holdings. */
const FAVORITES_MAX=3;
let favoriteCache=new Map(),favoriteResults=[],favoritePollBusy=false,favoriteLastPoll=0;
function favoriteAssets(){return Array.isArray(prefs.favoriteAssets)?prefs.favoriteAssets.slice(0,FAVORITES_MAX):[]}
function favoriteSafe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function favoriteLogo(asset){
 const special=specialInstrumentIcon(asset);
 if(special)return specialIconHtml(special,'favorite-logo');
 const name=String(asset.name||'').toLowerCase();
 const known=[[/alphabet|google/,'google.com'],[/amazon/,'amazon.com'],[/microsoft/,'microsoft.com'],[/apple/,'apple.com'],[/vanguard/,'vanguard.com'],[/ishares|blackrock/,'ishares.com'],[/xtrackers/,'etf.dws.com'],[/nvidia/,'nvidia.com'],[/tesla/,'tesla.com'],[/amundi/,'amundietf.com'],[/invesco/,'invesco.com'],[/intel/,'intel.com']];
 const domain=known.find(([rx])=>rx.test(name))?.[1];
 const fallback=favoriteSafe((asset.symbol||asset.name||'--').slice(0,2).toUpperCase());
 return '<span class="favorite-logo">'+fallback+(domain?'<img alt="" loading="eager" src="https://www.google.com/s2/favicons?domain='+domain+'&sz=64" onload="this.parentElement.firstChild.textContent=\'\'" onerror="this.remove()">':'')+'</span>';
}

function favoriteSpark(points,negative){if(!Array.isArray(points)||points.length<2)return '<div class="favorite-placeholder">1G n.d.</div>';const v=points.map(p=>p.p),min=Math.min(...v),max=Math.max(...v),span=Math.max(max-min,1e-9),coords=points.map((p,i)=>(2+96*i/(points.length-1)).toFixed(1)+','+(31-26*(p.p-min)/span).toFixed(1)).join(' ');return '<svg class="favorite-spark" viewBox="0 0 100 34" preserveAspectRatio="none" aria-label="Andamento 1 giorno"><polyline fill="none" stroke="'+(negative?'var(--red)':'var(--green)')+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="'+coords+'"/></svg>'}
function fh117CustomPalette(){
 const hex=validColor(prefs.closedMarketCustom)?prefs.closedMarketCustom:'#245a49';
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 const blend=(target,q)=>'#'+rgb.map(v=>Math.round(v*(1-q)+target*q).toString(16).padStart(2,'0')).join('');
 const b=document.body;
 b.style.setProperty('--fh117-bg',blend(0,.45));b.style.setProperty('--fh117-panel',blend(255,.04));
 b.style.setProperty('--fh117-panel2',blend(255,.14));b.style.setProperty('--fh117-border',blend(255,.43));
 b.style.setProperty('--fh117-muted',blend(255,.72));b.style.setProperty('--fh117-blue',blend(255,.64));
 b.style.setProperty('--fh117-choice',hex);
}
function updateFavoriteHomeTint(){
 const root=document.body;
 root.classList.toggle('fh-home-active',!$('dashboardView').classList.contains('hidden'));
 const first=prefs.favoriteEnabled?favoriteAssets()[0]:null;
 const q=first?favoriteCache.get(first.symbol):null;
 const valid=!!(q&&Number.isFinite(q.change)&&Number.isFinite(q.asOf)&&Date.now()-q.asOf<4*86400000);
 let cached=null;try{cached=JSON.parse(localStorage.getItem('finholdra_home_tint_v106_'+ACCOUNT_ID)||'null')}catch(_){}
 const fallback=!!(first&&cached?.symbol===first.symbol&&Number.isFinite(cached.asOf)&&Date.now()-cached.asOf<4*86400000&&Number.isFinite(cached.delta));
 const usePortfolio=prefs.marketColorBasis==='portfolio';
 let delta=valid?q.change:fallback?cached.delta:0;
 let tone=delta>0?'up':delta<0?'down':'neutral';
 if(usePortfolio){
   const capital=totalCapital(),profit=totalValue()-capital+saleRealizedGain();
   const sold=trades.filter(t=>t.kind==='sale'&&filter[t.cat]).reduce((n,t)=>n+Number(t.costBasis||0),0);
   const basis=capital+sold,rate=basis?100*profit/basis:0;
   tone=rate>0?'up':rate<0?'down':'neutral';delta=rate;
 }
 const weekend=[0,6].includes(new Date().getDay());
 const closedTone='closed-'+(['theme','gold','blue','plum','forest','custom'].includes(prefs.closedMarketColor)?prefs.closedMarketColor:(prefs.weekendYellow===false?'blue':'gold'));
 fh117CustomPalette();const next=weekend?closedTone:tone,changed=root.dataset.favoriteTint!==next;
 try{if(ACCOUNT_ID&&!usePortfolio){if(valid)localStorage.setItem('finholdra_home_tint_v106_'+ACCOUNT_ID,JSON.stringify({symbol:first.symbol,asOf:q.asOf,delta,tone:next}));else if(!fallback)localStorage.removeItem('finholdra_home_tint_v106_'+ACCOUNT_ID)}}catch(_){}
 root.dataset.favoriteTint=next;
 if(changed&&root.classList.contains('fh-home-active')){mascotIndex=0;finnUpdateFigure();}
 root.style.setProperty('--fh-tint-strength',Math.min(30,14+Math.abs(delta)*3)+'%');
}
setInterval(()=>{if(document.visibilityState==='visible'){try{updateFavoriteHomeTint();if(finnIsClosedTone(finnHomeTone()))finnUpdateFigure()}catch(_){}}},60000);
function renderFavoriteBanner(){updateFavoriteHomeTint();const el=$('favoriteBanner');if(!el)return;const assets=favoriteAssets();el.classList.toggle('hidden',!prefs.favoriteEnabled||!assets.length);if(!prefs.favoriteEnabled||!assets.length){el.innerHTML='';return}el.innerHTML=assets.map(a=>{const d=favoriteCache.get(a.symbol),value=d&&Number.isFinite(d.price)?d.price.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:4})+' '+favoriteSafe(a.currency||''): '—',pct=d&&Number.isFinite(d.change)?(d.change>=0?'+':'')+d.change.toFixed(2).replace('.',',')+'%':'—',negative=!!d&&d.change<0;return '<article class="favorite-row" role="button" tabindex="0" data-fav-open="'+favoriteSafe(a.symbol)+'" aria-label="Apri '+favoriteSafe(a.name||a.symbol)+'"><div class="favorite-name">'+favoriteLogo(a)+'<span class="favorite-name-text" title="'+favoriteSafe(a.name)+'">'+favoriteSafe(a.name||a.symbol)+'</span></div>'+favoriteSpark(d?.points,negative)+'<div class="favorite-numbers">'+value+'<small data-pct-basis="Rispetto alla chiusura della seduta precedente all’ultima rilevazione" class="'+(!d?'':negative?'loss':'gain')+'">'+pct+'</small></div></article>'}).join('')}
function renderFavoriteSettings(){const box=$('favoriteSelected');if(!box)return;const a=favoriteAssets();box.innerHTML=a.length?a.map((x,i)=>'<div class="favorite-chosen"><span>'+favoriteSafe(x.name||x.symbol)+' · '+favoriteSafe(x.symbol)+'</span><button class="btn" type="button" data-fav-remove="'+i+'">Rimuovi</button></div>').join(''):'<div class="favorite-empty">Nessun titolo selezionato.</div>';box.querySelectorAll('[data-fav-remove]').forEach(b=>b.addEventListener('click',()=>{prefs.favoriteAssets=favoriteAssets().filter((_,i)=>i!==Number(b.dataset.favRemove));savePreferences();renderFavoriteSettings();renderFavoriteBanner()}));$('favoriteEnabled').checked=!!prefs.favoriteEnabled;$('favoriteSettingsBody').classList.toggle('hidden',!prefs.favoriteEnabled)}
async function fetchFavoriteQuote(a){
 const symbol=String(a.symbol||'').toUpperCase(),currency=String(a.currency||'EUR').toUpperCase();
 if(!symbol||!currency)throw Error('Ticker assente');
 let lastError=null;
 // 1d intraday can be empty before the local market opens. Never erase a
 // previously valid quote solely because today's candles are not yet available.
 for(const range of ['1d','5d','1mo']){
  const interval=range==='1d'?'5m':range==='5d'?'30m':'1d';
  const query='?symbol='+encodeURIComponent(symbol)+'&range='+range+'&currency='+encodeURIComponent(currency);
  const urls=['/.netlify/functions/history'+query,'https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?range='+range+'&interval='+interval];
  for(const url of urls){try{
   const r=JSON.parse(await readUrl(url,6500)),x=r?.chart?.result?.[0];
   if(!x||String(x.meta?.symbol||'').toUpperCase()!==symbol||String(x.meta?.currency||'').toUpperCase()!==currency)continue;
   const times=x.timestamp||[],values=x.indicators?.quote?.[0]?.close||[];
   const all=times.map((t,i)=>({t:Number(t),p:Number(values[i])})).filter(p=>Number.isFinite(p.t)&&Number.isFinite(p.p)&&p.p>0&&p.t*1000<=Date.now()+3600000).sort((a,b)=>a.t-b.t);
   if(!all.length)continue;
   let start=0;
   if(range==='5d'||range==='1mo'){
    // Use last quoted session, not an artificial line across overnight gaps.
    const gap=range==='5d'?6*3600:20*3600;
    for(let i=all.length-1;i>0;i--)if(all[i].t-all[i-1].t>gap){start=i;break;}
   }
   const points=all.slice(start).slice(-140),last=points.at(-1).p;
   const prevRecorded=Number(x.meta?.chartPreviousClose||x.meta?.previousClose||x.meta?.regularMarketPreviousClose);
   const previousSession=start>0?all[start-1].p:NaN;
   const reference=Number.isFinite(previousSession)&&previousSession>0?previousSession:prevRecorded>0?prevRecorded:NaN;
   const price=Number(x.meta?.regularMarketPrice)>0?Number(x.meta.regularMarketPrice):last;
   const change=Number.isFinite(reference)&&reference>0?(price/reference-1)*100:NaN;
   if(!Number.isFinite(price)||price<=0||Date.now()-points.at(-1).t*1000>8*86400000)continue;
   return {price,change,points,asOf:points.at(-1).t*1000,previousClose:reference,sourceRange:range};
  }catch(e){lastError=e}
  }
 }
 throw lastError||Error('Storico prezzi non disponibile');
}

async function refreshFavoriteQuotes(force=false){const current=favoriteAssets();if(!prefs.favoriteEnabled||!current.length||favoritePollBusy||(!force&&Date.now()-favoriteLastPoll<60000)||document.visibilityState==='hidden')return;favoritePollBusy=true;favoriteLastPoll=Date.now();try{await Promise.all(current.map(async a=>{try{const q=await fetchFavoriteQuote(a);favoriteCache.set(a.symbol,q)}catch(_){/* Mantieni l'ultima quotazione salvata; non sostituirla con trattini per una chiusura di mercato. */}}));renderFavoriteBanner()}finally{favoritePollBusy=false}}
$('favoriteEnabled').addEventListener('change',e=>{prefs.favoriteEnabled=e.target.checked;savePreferences();renderFavoriteSettings();renderFavoriteBanner();void refreshFavoriteQuotes(true)});
// Preferiti: stesso motore, ordinamento, filtri geografici, nomi e icone usati in Investimenti.
$('favoriteSearch').addEventListener('click',async()=>{
 const term=$('favoriteQuery').value.trim(),box=$('favoriteSearchResults');
 if(!term)return;
 box.innerHTML='<p class="sub">Ricerca in corso…</p>';
 try{
  const loaded=await searchYahooQuotes(term);if(term!==$('favoriteQuery').value.trim())return;favoriteResults=loaded;
  box.innerHTML=favoriteResults.length?favoriteResults.map((a,i)=>'<button type="button" class="search-row" data-fav-choice="'+i+'"><span class="asset-search-main">'+searchIssuerLogo(a)+'<strong>'+formatSearchResult(a)+'</strong></span><small><span class="search-exchange-flag">'+exchangeFlag(a)+'</span>'+svgEscape([a.exchDisp||a.exchange||'Borsa non indicata',futuresResultLabel(a),a.currency||'Valuta da verificare'].join(' · '))+'</small></button>').join(''):'<p class="hint">Nessun risultato online. Prova nome, ticker o ISIN; controlla la connessione.</p>';
 }catch(e){favoriteResults=[];box.innerHTML='<p class="sub">Ricerca non disponibile.</p>'}
});
$('favoriteSearchResults').addEventListener('click',e=>{
 const b=e.target.closest('[data-fav-choice]');if(!b)return;
 const a=favoriteResults[Number(b.dataset.favChoice)],xs=favoriteAssets(),box=$('favoriteSearchResults');
 if(!a||!a.symbol)return;
 if(xs.some(x=>x.symbol.toUpperCase()===String(a.symbol).toUpperCase())){box.innerHTML='<p class="sub">Titolo già presente nei preferiti.</p>';return}
 if(xs.length>=FAVORITES_MAX){box.innerHTML='<p class="sub">Massimo 3 titoli. Rimuovine uno.</p>';return}
 prefs.favoriteAssets=[...xs,{symbol:a.symbol,name:a.longname||a.shortname||a.symbol,currency:a.currency||'EUR',quoteType:futuresType(a)?'FUTURE':a.quoteType||'',cat:futuresType(a)?'Futures':undefined,exchange:a.exchange||'',isin:a.isin||''}];
 savePreferences();renderFavoriteSettings();renderFavoriteBanner();box.innerHTML='';$('favoriteQuery').value='';void refreshFavoriteQuotes(true);
});
$('favoriteQuery').addEventListener('keydown',e=>{if(e.key==='Enter')$('favoriteSearch').click()});
let fhFavoriteDebounce;
$('favoriteQuery').addEventListener('input',()=>{clearTimeout(fhFavoriteDebounce);if($('favoriteQuery').value.trim().length>=3)fhFavoriteDebounce=setTimeout(()=>$('favoriteSearch').click(),700);});
renderFavoriteSettings();renderFavoriteBanner();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refreshFavoriteQuotes(true)});
setInterval(()=>{if(document.visibilityState==='visible')void refreshFavoriteQuotes()},60000);
setTimeout(()=>void refreshFavoriteQuotes(true),1200);

/* b.7.16: Clock-based indication, not live exchange feed. */
const MARKET_LIST={
 MIL:{label:'Milano',tz:'Europe/Rome',start:9*60,end:17*60+30},
 PAR:{label:'Parigi',tz:'Europe/Paris',start:9*60,end:17*60+30},
 XETRA:{label:'Xetra',tz:'Europe/Berlin',start:9*60,end:17*60+30},
 NYSE:{label:'USA',tz:'America/New_York',start:9*60+30,end:16*60},
 LSE:{label:'Londra',tz:'Europe/London',start:8*60,end:16*60+30}
};
function marketLocalParts(tz){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:tz,weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
 return Object.fromEntries(parts.map(p=>[p.type,p.value]));
}
function isMarketHoliday(key,p){
 const md=p.month+'-'+p.day,yr=Number(p.year);
 // Fixed full-session holidays: conservative for known market calendars.
 if(['MIL','PAR','XETRA'].includes(key)){
  if(md==='01-01'||md==='12-25'||md==='12-26')return true;
  if(key==='MIL'&&yr===2026&&md==='12-24')return true; // Milano 2026 closed
 }
 if(key==='NYSE'&&['01-01','07-04','12-25'].includes(md))return true;
 if(key==='LSE'&&['01-01','12-25','12-26'].includes(md))return true;
 // Easter (Good Friday and Easter Monday) depending on calendar market; market specific.
 function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),n=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;return Date.UTC(y,n-1,day)}
 const e=easter(yr),d=Date.UTC(yr,Number(p.month)-1,Number(p.day)),delta=Math.round((d-e)/86400000);
 return (['MIL','PAR','XETRA','LSE','NYSE'].includes(key)&&delta===-2)||(['MIL','PAR','XETRA','LSE'].includes(key)&&delta===1);
}
function finnFirstFavoriteDailyChange(){
 try{const preferred=favoriteAssets();if(!prefs.favoriteEnabled||!preferred.length)return null;
  const data=favoriteCache.get(preferred[0].symbol);
  return data&&Number.isFinite(data.change)?Number(data.change):null;
 }catch(_){return null}
}
function finnMinuteKey(prefix,parts){return prefix+':'+parts.year+'-'+parts.month+'-'+parts.day}
function finnSceneOnce(key,fn){if(finnScenePlayed.has(key))return;finnScenePlayed.add(key);fn();}
function finnOnMarketTransition(nowActive,previousActive,parts,key){
 if(previousActive===null||previousActive===nowActive)return;
 const day=finnMinuteKey('market:'+key,parts);
 if(nowActive){finnSceneOnce(day+':open',()=>finnSceneStart('awake','waking',2200));}
 else{
  const delta=finnFirstFavoriteDailyChange();const kind=delta!==null&&delta>0.000001?'party':delta!==null&&delta< -0.000001?'tears':null;
  finnSceneOnce(day+':close',()=>{
   if(kind)finnSceneStart(kind,kind==='party'?'celebrate':'crying',3100,()=>finnSceneStart('doze','dozing',1800));
   else finnSceneStart('doze','dozing',1800);
  });
 }
}
// Countdown based on the requested Italian clock window; never replay after resuming a hidden tab.
let finnWallStreetMinuteShown=new Set();
let finnWallStreetWindowActive=false;
function finnholdraPlaceCompactNotice(message){
 const host=document.querySelector('header.top'),nav=host?.querySelector('.new-header-nav');
 if(!host||!nav)return false;
 host.appendChild(message); // Out of normal document flow; no movement of tabs or content.
 const navTop=nav.getBoundingClientRect().top-host.getBoundingClientRect().top;
 const noteHeight=message.getBoundingClientRect().height;
 message.style.top=Math.max(0,Math.floor(navTop-noteHeight-2))+'px';
 return true;
}
function finnWallStreetMessage(){
 document.querySelector('.wallstreet-countdown-note')?.remove();
 document.getElementById('finholdraFinnToast')?.remove();
 const message=document.createElement('div');message.className='wallstreet-countdown-note';message.textContent='Apertura Wall Street alle 15:30';message.setAttribute('role','status');
 if(finnholdraPlaceCompactNotice(message))setTimeout(()=>{if(message.isConnected)message.remove()},3600);
}
function finnCheckWallStreetCountdown(){
 const p=marketLocalParts('Europe/Rome');
 const minute=Number(p.hour)*60+Number(p.minute);
 const workday=!['Sat','Sun'].includes(p.weekday);
 // Respect Wall Street market holidays where the existing calendar can identify them.
 const ny=marketLocalParts('America/New_York');
 const eligible=workday&&!isMarketHoliday('NYSE',ny)&&minute>=14*60+30&&minute<15*60+30;
 if(!eligible){
  finnWallStreetWindowActive=false;
  if(finnScene?.type==='anticipation'){
   finnScene=null;++finnSceneToken;clearTimeout(finnSceneTimer);finnUpdateFigure();
  }
  document.querySelector('.wallstreet-countdown-note')?.remove();
  return;
 }
 // Preserve an opening/closing scene if one is running.
 if(!finnScene||finnScene.type==='anticipation'){
  const emotions=['doubtful','hopeful','anxious','watching'];
  const slot=Math.floor(Date.now()/12000)%emotions.length;
  if(finnScene?.type!=='anticipation'||finnScene.emotion!==emotions[slot]){
   finnScene={type:'anticipation',emotion:emotions[slot]};finnUpdateFigure();
  }
 }
 // Preserve the greeting shown when the app opens in the waiting window,
 // and the original reminders at ten-minute intervals.
 const justEntered=!finnWallStreetWindowActive;
 finnWallStreetWindowActive=true;
 if(justEntered||Number(p.minute)%10===0){
  const key=finnMinuteKey('wallstreet-notice',p)+':'+p.hour+':'+p.minute;
  if(!finnWallStreetMinuteShown.has(key)){
   finnWallStreetMinuteShown.add(key);finnWallStreetMessage();
  }
 }
}
function updateMarketStatus(){
 const key=MARKET_LIST[prefs.mainMarket]?prefs.mainMarket:'MIL',m=MARKET_LIST[key],p=marketLocalParts(m.tz);
 const minute=Number(p.hour)*60+Number(p.minute),businessDay=!['Sat','Sun'].includes(p.weekday);
 const active=businessDay&&!isMarketHoliday(key,p)&&minute>=m.start&&minute<m.end;
 const previous=finnMarketSample;
 finnMarketClosed=!active;
 finnMarketSample=active;
 const box=$('marketStatus');if(!box)return;
 if(document.visibilityState==='visible'){
  if(previous!==null&&previous!==active){
   const boundary=active?m.start:m.end;
   // Only animate actual session boundaries, not a manual market switch or a late tab wake-up.
   if(minute>=boundary&&minute<=boundary+2)finnOnMarketTransition(active,previous,p,key);
   else if(!finnScene)finnUpdateFigure();
  }else if(previous===null&&!finnScene){finnUpdateFigure();}
  finnCheckWallStreetCountdown();
 }
 box.className='market-status '+(active?'open':'closed');
 $('marketText').textContent=active?'Mercati aperti':'Mercati chiusi';
 box.title=m.label+' · '+(active?'negoziazione ordinaria prevista':'fuori dalla negoziazione ordinaria')+' · '+p.hour+':'+p.minute+' (ora locale). Festività straordinarie e sospensioni non verificate.';
 const select=$('settingMainMarket');if(select&&select.value!==key)select.value=key;
}
updateMarketStatus();setInterval(()=>{if(document.visibilityState==='visible')updateMarketStatus()},15000);
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='hidden'){
  finnMarketSample=null;finnUSSample=null;
  ++finnSceneToken;clearTimeout(finnSceneTimer);finnScene=null;
 }else{
  finnMarketSample=null;finnUSSample=null;updateMarketStatus();
 }
});

// v7.6: Server LED reflects only Netlify Functions reachability, not market-data health.
const FINHOLDRA_VERSION_FALLBACK='Beta 10.9.74';
async function updateFinholdraVersion(){
 const versionLabel=document.getElementById('appBuildVersion');
 if(!versionLabel)return;
 versionLabel.textContent=FINHOLDRA_VERSION_FALLBACK;
 try{
  const response=await fetch('./version.json?v='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('File versione non disponibile');
  const data=await response.json();
  if(data&&(!data.app||data.app==='Finholdra')&&data.channel==='beta'&&/^\d+\.\d+(?:\.\d+)?$/.test(String(data.version||''))){
   versionLabel.textContent='Beta '+data.version;
   versionLabel.title='Canale: beta · Build '+String(data.version);
  }
 }catch(_){ /* Il valore incorporato resta leggibile anche offline. */ }
}
updateFinholdraVersion();
let invesquoHealthToken=0;
async function invesquoCheckServer(){
 const token=++invesquoHealthToken,led=document.getElementById('netlifyServerLed'),status=document.getElementById('netlifyServerState'),detail=document.getElementById('netlifyServerDetail');
 if(!led||!status||!detail)return;
 led.className='server-led checking';status.textContent='Verifica in corso';detail.textContent='Controllo delle funzioni server…';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6000);
 try{
  const response=await fetch('/.netlify/functions/health?ts='+Date.now(),{cache:'no-store',headers:{'Accept':'application/json'},signal:controller.signal});
  if(!response.ok)throw Object.assign(Error('HTTP '+response.status),{httpStatus:response.status});
  const data=await response.json();
  if(data?.service!=='invesquo-netlify-functions'||data?.ok!==true)throw Error('Risposta inattesa');
  if(token!==invesquoHealthToken)return;
  led.className='server-led online';status.textContent='Operativo';detail.textContent='Funzioni Netlify raggiungibili · '+new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
 }catch(err){if(token!==invesquoHealthToken)return;led.className='server-led '+(err.httpStatus===401||err.httpStatus===403?'checking':'offline');status.textContent=err.httpStatus===401||err.httpStatus===403?'Funzioni limitate':'Funzioni non verificate';detail.textContent=err.httpStatus===401||err.httpStatus===403?'HTTP '+err.httpStatus+': accesso alla funzione di controllo limitato; le quotazioni possono funzionare.':err.name==='AbortError'?'Controllo scaduto; i dati locali restano disponibili.':String(err.message||'Errore di collegamento').slice(0,85);}
 finally{clearTimeout(timeout)}
}

document.getElementById('checkNetlifyServer').addEventListener('click',invesquoCheckServer);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!document.getElementById('settingsView').classList.contains('hidden'))invesquoCheckServer()});
window.addEventListener('online',()=>{if(!document.getElementById('settingsView').classList.contains('hidden'))invesquoCheckServer()});

/* b.7.15: quotes from backend (never sample values). Exchanges are often delayed. */
const INDEX_TICKER=[['FTSE MIB','^FTSEMIB','EUR'],['S&P 500','^GSPC','USD'],['NASDAQ','^IXIC','USD'],['DAX','^GDAXI','EUR'],['VWCE','VWCE.MI','EUR'],['BTC','BTC-USD','USD']];
async function fetchTickerItem(name,symbol,currency){
 try{
  const url='/.netlify/functions/history?symbol='+encodeURIComponent(symbol)+'&range=5d';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5500);
  let r;try{r=await fetch(url,{signal:controller.signal,cache:'no-store'})}finally{clearTimeout(timer)}
  if(!r.ok)throw Error('HTTP '+r.status);
  const j=await r.json(),z=j.chart?.result?.[0],meta=z?.meta,arr=z?.indicators?.quote?.[0]?.close||[];
  if(String(meta?.currency||'').toUpperCase()!==currency)throw Error('valuta');
  const vals=arr.map(Number).filter(x=>Number.isFinite(x)&&x>0);
  if(vals.length<2)throw Error('chiusure mancanti');
  const old=vals.at(-2),last=vals.at(-1),change=(last/old-1)*100;
  const quoteDate=Number(meta?.regularMarketTime||0);
  if(quoteDate&&Date.now()/1000-quoteDate>10*86400)throw Error('dato vecchio');
  return {name,change,source:'Yahoo · chiusure'};
 }catch(e){return{name,change:null,source:'non disponibile'}}
}
let tickerRunning=false;
async function refreshMarketTicker(){
 if(tickerRunning)return;tickerRunning=true;
 try{const a=await Promise.all(INDEX_TICKER.map(x=>fetchTickerItem(...x))),container=document.getElementById('marketTicker');if(!container)return;
  const html=a.map(x=>'<span class="ticker-item" title="'+x.source+'">'+x.name+' <small style="color:'+(x.change===null?'#aebed4':x.change>=0?'#45dbae':'#fa8090')+'">'+(x.change===null?'n.d.':(x.change>=0?'+':'')+x.change.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+'%')+'</small></span>').join('');
  container.innerHTML=html+html;
 }finally{tickerRunning=false}
}
// Ticker removed on request: no index polling in Dashboard.
/* b.7.15: interactive, strictly local mascot props */
document.getElementById('toyHat')?.addEventListener('click',()=>{mascotHatOn=!mascotHatOn;mascotPlayRender();document.getElementById('mascotPlayStatus').textContent=mascotHatOn?'🎩 Cappello IPF indossato':'Cappello riposto'});
document.getElementById('toyMonkey')?.addEventListener('pointerdown',e=>{clearTimeout(window.__monkeyHold);window.__monkeyHold=setTimeout(()=>bananaRain(),750)});
for(const eName of ['pointerup','pointercancel','pointerleave'])document.getElementById('toyMonkey')?.addEventListener(eName,()=>clearTimeout(window.__monkeyHold));

let monkeyReaction=0;window.__monkeyShoulder=false;
document.getElementById('toyMonkey')?.addEventListener('click',()=>{monkeyReaction=(monkeyReaction+1)%3;window.__monkeyShoulder=!window.__monkeyShoulder;mascotPlayRender();const m=document.getElementById('toyMonkey');m.dataset.expression=['allegra','curiosa','dispettosa'][monkeyReaction];document.getElementById('mascotPlayStatus').textContent=['🐒 Scimmietta allegra','🐒 Scimmietta curiosa','🐒 Scimmietta dispettosa'][monkeyReaction];});

document.getElementById('toyBull')?.addEventListener('click',()=>{mascotPlayChosenEmotion='positive';mascotPlayRender();mascotPlayAnimate('is-reacting');const e=document.getElementById('toyBull');e.classList.remove('toy-bounce');void e.offsetWidth;e.classList.add('toy-bounce');document.getElementById('mascotPlayStatus').textContent='🐂 Il toro porta ottimismo alla mascotte!'});
document.getElementById('toyBear')?.addEventListener('click',()=>{mascotPlayChosenEmotion='sad';mascotPlayRender();mascotPlayAnimate('is-reacting');const e=document.getElementById('toyBear');e.classList.remove('toy-bounce');void e.offsetWidth;e.classList.add('toy-bounce');document.getElementById('mascotPlayStatus').textContent='🐻 Il bear market rende triste la mascotte';});
function updateMascotMarket(){
 const bull=document.getElementById('toyBull'),bear=document.getElementById('toyBear'),txt=document.getElementById('mascotMarketSpot');if(!bull||!bear||!txt)return;
 bull.classList.remove('spotlight');bear.classList.remove('spotlight');
 const c=totalCapital(),v=totalValue(),gain=(v-c)+saleRealizedGain(),basis=c+trades.filter(t=>t.kind==='sale'&&filter[t.cat]).reduce((n,t)=>n+Number(t.costBasis||0),0);
 if(!basis){txt.textContent='Nessun investimento selezionato';return}
 const result=gain/basis*100;
 if(result>0.00001)bull.classList.add('spotlight');else if(result< -0.00001)bear.classList.add('spotlight');
 txt.textContent='Rendimento del portafoglio: '+(result>=0?'+':'')+result.toFixed(2).replace('.',',')+'%';
}
updateMascotMarket();
function showBackupReminder(){const el=document.getElementById('lastBackupReminder');if(!el)return;const raw=store.getItem('invesquo_last_backup_time');if(!raw){el.textContent='Nessun backup esportato da questa versione sul dispositivo. È consigliato salvare periodicamente il file JSON.';return}const days=Math.floor((Date.now()-new Date(raw).getTime())/86400000);el.textContent='Ultimo backup richiesto '+(days===0?'oggi':days+' giorni fa')+(days>=14?' · È consigliabile esportare una nuova copia.':' · Conserva il file in un luogo sicuro.')}
/* b.7.15: Educational - original inline SVG illustrations, local-only reading preferences */
const EDUCATION=[
 {id:'azioni',name:'Azioni',tone:'#52b8ff',shape:'stock',short:'Una piccola quota di proprietà di un’impresa.',long:'Un’azione rappresenta una partecipazione al capitale di un’azienda. Il prezzo varia secondo utili attesi, tassi, domanda e rischio. Alcune società pagano dividendi, senza alcuna garanzia di continuità.',risk:'Alto: il prezzo può scendere molto e non esiste rimborso garantito.',example:'Esempio: acquisti due azioni a 100 €; se il prezzo va a 110 €, il valore sale a 220 € prima di costi e imposte.',terms:'Prezzo, dividendo, capitalizzazione, volatilità'},
 {id:'etf',name:'ETF',tone:'#6ac8a4',shape:'basket',short:'Fondi quotati che replicano indici o strategie.',long:'Un ETF detiene o replica un paniere di strumenti: può investire in azioni, obbligazioni, mercato monetario o altre esposizioni. Diversificare riduce il rischio specifico, ma non elimina quello di mercato. Controlla indice, metodo di replica, TER e dimensione.',risk:'Variabile: un ETF azionario può perdere molto; uno monetario in genere oscilla meno, ma non è un deposito garantito.',example:'Un ETF mondiale offre un’esposizione a molte società con un solo strumento.',terms:'Indice, UCITS, replica, TER, accumulazione, distribuzione'},
 {id:'monetari',name:'ETF monetari',tone:'#86e5c2',shape:'clock',short:'Espongono a tassi monetari o obbligazioni brevissime.',long:'Gli ETF monetari, come prodotti legati a tassi overnight, mirano a seguire rendimenti monetari a brevissimo termine. Il rendimento cambia con i tassi e l’ETF resta soggetto a rischi di mercato, emittente o controparte a seconda della struttura.',risk:'Di solito inferiore a quello azionario, ma il capitale non è garantito come in un deposito coperto.',example:'XEON è un esempio di ETF che segue un indice monetario in euro, tramite replica sintetica.',terms:'€STR, duration, swap, tracking difference'},
 {id:'bond',name:'Obbligazioni',tone:'#e4bc74',shape:'bond',short:'Prestiti a Stati o imprese che prevedono interessi.',long:'Un’obbligazione è un prestito all’emittente. Il prezzo sul mercato secondario si muove anche al variare dei tassi: in generale, tassi in salita penalizzano i titoli a tasso fisso. Alla scadenza il rimborso dipende dalla solvibilità dell’emittente.',risk:'Rischio emittente, tasso, inflazione e liquidità; maggiore durata significa spesso maggiore sensibilità ai tassi.',example:'Un BTP quotato a 101,5 costa circa 101,50 € per 100 € nominali, esclusi ratei e costi.',terms:'Cedola, rendimento a scadenza, duration, rateo, spread'},
 {id:'oro',name:'Oro',tone:'#e9cb64',shape:'gold',short:'Metallo prezioso, spesso usato come diversificante.',long:'L’oro non genera interessi né dividendi. Puoi esporti al prezzo tramite strumenti fisici o ETC, con struttura, custodia e spese differenti. Il prezzo dipende anche da valuta e aspettative sui tassi reali.',risk:'Può subire forti ribassi e il cambio USD/EUR modifica il rendimento espresso in euro.',example:'Un ETC sull’oro non equivale necessariamente alla proprietà diretta di lingotti.',terms:'Spot, oncia troy, ETC, custodia, valuta'},
 {id:'commodities',name:'Materie prime',tone:'#e49a6e',shape:'commodity',short:'Energia, metalli e prodotti agricoli.',long:'Petrolio, rame, gas e grano risentono di offerta, domanda e geopolitica. Molti strumenti replicano futures, non il prezzo spot: costo di rinnovo dei contratti e curva futures possono produrre rendimenti diversi dal sottostante.',risk:'Volatilità elevata e strutture talvolta complesse.',example:'Un ETC sul petrolio basato su futures può differire dal movimento del barile spot.',terms:'Futures, contango, backwardation, rollover'},
 {id:'crypto',name:'Crypto',tone:'#b7a0ff',shape:'crypto',short:'Asset digitali basati su reti crittografiche.',long:'Bitcoin ed Ether funzionano su reti differenti e hanno finalità differenti. L’accesso passa da wallet, piattaforme o prodotti quotati. Sono possibili perdita della chiave privata, attacchi, insolvenza dell’intermediario e cambiamenti normativi.',risk:'Molto elevato; grandi variazioni anche in poche ore e protezioni differenti dagli strumenti tradizionali.',example:'500 € in Bitcoin possono rappresentare una piccola frazione di BTC; Finholdra calcola le quote frazionate.',terms:'Wallet, chiave privata, blockchain, staking, volatilità'},
 {id:'etn',name:'ETC/ETN',tone:'#f09cc8',shape:'note',short:'Strumenti quotati legati a materie prime o indici.',long:'ETC ed ETN possono offrire esposizione a oro, crypto o strategie. Spesso sono titoli di debito e non fondi UCITS: struttura e garanzie cambiano da emissione a emissione. Leggi sempre KID e prospetto.',risk:'Rischi di sottostante, emittente/controparte, liquidità e possibile leva.',example:'Due strumenti sullo stesso indice possono avere costi e rischi strutturali diversi.',terms:'Emittente, collateral, KID, leva, spread denaro-lettera'},
 {id:'liquidita',name:'Conto deposito',tone:'#83cae4',shape:'bank',short:'Denaro disponibile e depositi remunerati.',long:'Conti correnti e depositi offrono disponibilità e, in alcuni casi, interessi. Verifica vincoli, condizioni promozionali, imposte e la protezione dei depositi applicabile all’intermediario. Un conto non è un’obbligazione quotata.',risk:'Inflazione, rischio dell’intermediario oltre i limiti di tutela e perdita di rendimento dopo promozioni.',example:'Un 3% lordo annuo su 1.000 € produce circa 30 € lordi in un anno, prima di imposte.',terms:'TAN, interessi lordi/netti, vincolo, tutela dei depositi'},
 {id:'postale',name:'Risparmio postale',tone:'#dfbb6e',shape:'bank',short:'Buoni postali, condizioni di riscatto e rendimento.',long:'I buoni fruttiferi postali prevedono condizioni proprie di emissione, interessi e rimborso. Non sono ETF, né titoli negoziati sul MOT. Il valore di rimborso dipende dal buono e dalla durata.',risk:'Vincoli temporali, inflazione e rendimento netto dopo imposte.',example:'Controlla sempre il valore di riscatto della tua specifica serie, non utilizzare una quotazione di mercato inventata.',terms:'Riscatto, durata, interessi, garanzia'},
 {id:'valute',name:'Valute',tone:'#95b8f2',shape:'fx',short:'Rapporti di cambio fra monete.',long:'Il valore di un investimento in USD convertito in EUR dipende sia dal prezzo del titolo sia dal cambio. Il mercato Forex è liquido ma alcune modalità operative usano leva finanziaria, che amplifica i rischi.',risk:'Rischio cambio; con leva, rischio di perdite rapide e superiori alle attese.',example:'Un titolo USA può salire in dollari ma perdere valore in euro se il dollaro si indebolisce abbastanza.',terms:'EUR/USD, conversione, copertura valutaria, leva'}
];
function educationIcon(kind,tone){
 const shapes={
 stock:'<path d="M13 52V33l13-11 12 9 13-19v40"/><path d="M10 54h48"/>',
 basket:'<path d="M14 29h36l-5 24H19zM22 29l10-16 10 16"/><path d="M28 36v10m8-10v10"/>',
 clock:'<circle cx="32" cy="32" r="23"/><path d="M32 17v16l12 7"/>',
 bond:'<rect x="11" y="14" width="42" height="36" rx="5"/><path d="M17 23h30M17 41h30"/><circle cx="32" cy="32" r="7"/>',
 gold:'<path d="M15 43l7-22h20l7 22-6 5H21zM22 21l5 17h17M17 43h31"/>',
 commodity:'<path d="M20 52V29h24v23M15 29l17-19 17 19M27 52V37h10v15"/>',
 crypto:'<circle cx="32" cy="32" r="23"/><path d="M26 19h12c10 0 11 12 0 13H25h15c10 0 10 13 0 13H25M32 14v36M39 14v36"/>',
 note:'<rect x="16" y="10" width="32" height="44" rx="4"/><path d="M23 21h18m-18 9h18m-18 9h11"/>',
 bank:'<path d="M8 25l24-15 24 15M11 28h42M14 51h36M10 55h44M20 29v20m12-20v20m12-20v20"/>',
 fx:'<path d="M12 22h40m-11-9 11 9-11 9M52 42H12m11-9-11 9 11 9"/>'
 };
 return '<svg class="education-illustration" viewBox="0 0 64 64" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="16" fill="'+tone+'" fill-opacity=".14"/><g fill="none" stroke="'+tone+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'+(shapes[kind]||shapes.stock)+'</g></svg>';
}

const EDUCATION_LEVELS={
 azioni:[['Tipologie di azioni',[['Ordinarie e privilegiate','Diritto di voto, dividendi e priorità di rimborso dipendono dalla classe e dallo statuto.'],['Growth e value','Growth privilegia la crescita degli utili; value confronta prezzo e fondamentali. Nessuna etichetta assicura rendimento.'],['Large, mid e small cap','La capitalizzazione misura il valore totale delle azioni: le small cap sono spesso meno liquide.'],['Dividendi e buyback','La distribuzione di utili non è gratuita: il prezzo può adeguarsi allo stacco.']]],['Valutazione e rischio',[['P/E, P/B e free cash flow','Rapporti di valutazione da interpretare con settore, debito e ciclo economico.'],['Beta e volatilità','Beta misura sensibilità al benchmark; volatilità misura oscillazioni, non tutta la rischiosità.'],['Mercati e classi azionarie','Ticker e ISIN sono distinti; l’azione può negoziare su più borse e in valute diverse.']]]],
 etf:[['Tipologie e strategie',[['Globali e regionali','ETF globali, emergenti, Europa, USA e mercati di frontiera.'],['Value','Seleziona imprese valutate relativamente a sconto rispetto ai fondamentali. Un ETF value può privilegiare multipli bassi e società mature.'],['Momentum','Seleziona titoli con tendenze di prezzo positive misurate nei mesi precedenti; i ribilanciamenti possono essere frequenti.'],['Quality','Seleziona società con indicatori di qualità finanziaria, come redditività elevata e indebitamento sostenibile.'],['Small Cap','Espone a società a bassa capitalizzazione, spesso più sensibili a liquidità e ciclo economico.'],['Minimum / Low Volatility','Ottimizza il paniere per contenere la volatilità storica relativa; non garantisce assenza di perdite.'],['Dividend','Seleziona società tramite dividendi e altri criteri di qualità e sostenibilità della distribuzione.'],['Settoriali e tematici','Concentrano il portafoglio in specifici settori come tecnologia, salute, energia e difesa; il rischio di concentrazione aumenta.'],['Equal Weight','Assegna pesi più uniformi alle componenti dell’indice e richiede ribilanciamenti periodici.'],['Azionari, obbligazionari, settoriali e tematici','Il contenuto dell’ETF conta più del nome; verifica concentrazione e indice.']]],['Indici principali',[['S&P 500','Circa 500 società USA a grande capitalizzazione, con regole di inclusione specifiche.'],['Nasdaq-100','Grandi società non finanziarie quotate al Nasdaq; non equivale all’intero mercato tecnologico.'],['MSCI World','Mercati sviluppati, senza emergenti; metodologia free float.'],['FTSE All-World / MSCI ACWI','Paesi sviluppati ed emergenti, ma con coperture e metodologie non identiche.'],['STOXX Europe 600, FTSE MIB, DAX','Benchmark regionali e nazionali: composizione e dividendi vanno verificati.']]],['Struttura del fondo',[['UCITS, TER e tracking difference','Normativa europea, costi annui e scarto effettivo dalla performance dell’indice.'],['Fisico, campionamento, sintetico','La replica cambia esposizione, controparte e gestione del collaterale.'],['Accumulo e distribuzione','I dividendi possono essere reinvestiti o distribuiti; la fiscalità dipende dalla residenza.']]]],
 monetari:[['Tassi e struttura',[['€STR e overnight','Rendimento legato ai tassi monetari; si muove quando la banca centrale modifica la politica.'],['ETF overnight sintetici','Il rendimento passa anche attraverso swap e collaterale: va valutato il rischio di controparte.'],['BOT e fondi monetari','Durata, liquidità, tassazione e garanzie sono differenti da un ETF monetario.']]],['Quando usarli',[['Parcheggio della liquidità','Possibili oscillazioni e costi; non sono equivalenti a denaro garantito in banca.'],['Rischio tassi e inflazione','I rendimenti si adeguano rapidamente, ma possono diventare bassi o negativi.']]]],
 bond:[['Emittenti e strutture',[['BTP, BOT, CCTeu, BTP Italia e BTP Valore','Titoli di Stato con cedole, indicizzazione, durata e condizioni diverse.'],['Corporate investment grade e high yield','Il rating sintetizza rischio di credito; high yield comporta maggiore rischio insolvenza.'],['Zero coupon, callable, subordinate','Prezzi, rischi di rimborso anticipato e subordinazione possono modificare il rendimento.']]],['Misure essenziali',[['Cedola, prezzo secco e tel quel','Sul MOT il prezzo è spesso per 100 nominali; il rateo interessi va aggiunto al prezzo secco.'],['Yield to maturity e duration','Il rendimento a scadenza assume condizioni e flussi; la duration misura sensibilità ai tassi.'],['Spread e rischio emittente','Le differenze nei rendimenti riflettono anche rischio di credito e liquidità.']]],['Grafici e quotazioni',[['ISIN e MOT','Un ISIN identifica lo strumento; non garantisce che esista uno storico pubblico gratuito.'],['Prezzi vs cedole','Un grafico del solo prezzo non include automaticamente i flussi cedolari.']]]],
 oro:[['Esposizioni',[['Lingotti e monete','Custodia, autenticità, spread e costi assicurativi.'],['ETC su oro fisico','Controlla struttura giuridica, garanzie, commissioni e condizioni di rimborso.'],['Azioni minerarie','Non replicano il prezzo dell’oro: aggiungono rischi d’impresa e borsa.']]],['Variabili del prezzo',[['Tassi reali e dollaro','Non è una relazione meccanica: il prezzo può rispondere anche a rischio geopolitico e flussi.'],['Cambio EUR/USD','L’oro è spesso quotato in USD; il ritorno in euro può differire.']]]],
 commodities:[['Energia',[['Petrolio Brent e WTI','Benchmark petroliferi diversi, influenzati da scorte, offerta e domanda.'],['Gas naturale','Mercati regionali con logiche di stoccaggio e stagionalità.']]],['Metalli e agricoli',[['Rame, alluminio e litio','Influenza di ciclo industriale, produzione e tecnologia.'],['Grano, mais e caffè','Clima, raccolti, logistica e stagionalità.']]],['Strumenti',[['Futures e rollover','Contango e backwardation possono far divergere l’ETC dal prezzo spot.'],['Leva e rischi','Leva e reinvestimento quotidiano possono produrre risultati inattesi.']]]],
 crypto:[['Principali reti',[['Bitcoin (BTC)','Rete PoW, offerta programmata e rischio di custodia.'],['Ethereum (ETH)','Ecosistema di smart contract, gas fee e rischi degli applicativi.'],['Solana e altre L1','Differenze in decentralizzazione, throughput, infrastruttura e incidenti.']]],['Sicurezza e strumenti',[['Wallet e chiavi private','La perdita delle chiavi può comportare perdita irreversibile dei fondi.'],['Custodial, exchange ed ETP','Rischi di intermediario, custodia, regolamentazione e liquidità.'],['Staking e stablecoin','Rendimenti e peg non garantiti, rischi smart contract e controparte.']]]],
 etn:[['Strutture',[['ETC fisici e sintetici','Esposizione al sottostante con strutture, collaterale e costi differenti.'],['ETN e rischio emittente','Titolo di debito quotato: attenzione al merito creditizio dell’emittente.'],['Leva e short','L’effetto compounding quotidiano può creare scostamenti di lungo periodo.']]],['Analisi',[['KID e prospetto','Informazioni su rischio, perdita massima, liquidità, costi e rimborso.'],['Spread e volumi','Bassa liquidità può rendere oneroso acquistare e vendere.']]]],
 liquidita:[['Tipologie',[['Conto corrente','Disponibilità, spese e condizioni economiche.'],['Conto deposito libero o vincolato','Durata, penali, svincolo, tasso promozionale e rischio banca.'],['Buoni fruttiferi postali','Prodotti distinti da fondi ed ETF; verificare condizioni della specifica serie.']]],['Protezione e rendimento',[['Garanzie e limiti','La tutela dipende dal tipo di intermediario e dalle norme vigenti.'],['TAN, imposte e rendimento netto','Il tasso nominale non equivale al rendimento netto di costi e imposte.']]]],
 postale:[['Tipologie',[['Buoni ordinari','La remunerazione dipende dalla serie e dal tempo di mantenimento.'],['Buoni per minori','Condizioni di scadenza legate alla maggiore età e alla specifica emissione.']]],['Rendimento e liquidità',[['Riscatto anticipato','Verifica periodi minimi di maturazione degli interessi.'],['Imposte e valore netto','Il rendimento netto differisce da quello lordo.']]]],
 valute:[['Mercato FX',[['EUR/USD, EUR/GBP e USD/JPY','Un cambio è il prezzo relativo fra due monete.'],['Spot e forward','Un forward blocca un cambio futuro con costi e differenziali tassi.'],['Rischio di conversione','Anche ETF e azioni in valuta estera cambiano valore in euro.']]],['Gestione rischio',[['Hedged vs unhedged','La copertura può ridurre oscillazioni del cambio ma costa e non è perfetta.'],['Leva e margini','Prodotti Forex a leva sono molto rischiosi.']]]]
};
const ACADEMY_EXTRA={
 'ETF monetari':{id:'monetari',name:'ETF monetari',short:'Tassi a brevissimo termine.'},
 'Materie prime':{id:'commodities',name:'Materie prime',short:'Energia, metalli e agricoli.'},
 'Conto deposito':{id:'liquidita',name:'Conto deposito',short:'Conti, vincoli e garanzie.'},
 'Risparmio postale':{id:'liquidita',name:'Risparmio postale',short:'Buoni postali e condizioni di riscatto.'}
};
let learningSubtopic='';
const INVESQUO_DEEP={
 'Value':'Un approccio value cerca aziende scambiate a multipli relativamente contenuti rispetto a utili, patrimonio o flussi di cassa. Prezzi bassi non significano automaticamente convenienza: debito e qualità del business possono spiegare lo sconto. Confronta P/E, P/B, free cash flow e concentrazione settoriale.',
 'Momentum':'Il fattore momentum privilegia titoli che hanno mostrato forza relativa su un periodo, spesso 6–12 mesi, escludendo talvolta l’ultimo mese. Può subire brusche inversioni. Verifica frequenza di ribilanciamento, turnover, costi e rischio di sovrapposizione.',
 'Quality':'Seleziona tipicamente aziende con redditività elevata, bilanci solidi e utili più stabili. I criteri cambiano tra gli indici: ROE, indebitamento, variabilità degli utili. La qualità può risultare costosa e non elimina il rischio azionario.',
 'Small cap':'Comprende imprese a bassa capitalizzazione rispetto alle grandi quotate. Offre un universo ampio ma spesso con spread maggiori, liquidità inferiore e volatilità più alta. Valuta la copertura geografica e la metodologia dell’indice.',
 'S&P 500':'Indice di grandi aziende statunitensi selezionate secondo regole di dimensione, redditività e liquidità. È ponderato per capitalizzazione flottante; i principali titoli possono pesare molto. Non rappresenta l’intero mercato globale.',
 'Nasdaq-100':'Indice di grandi società non finanziarie quotate al Nasdaq. Non equivale a tutte le aziende tecnologiche e presenta concentrazioni settoriali e di singoli emittenti. Confronta versione price e total return.',
 'MSCI World':'Indice azionario di mercati sviluppati, con ampio peso degli Stati Uniti e senza la maggior parte dei mercati emergenti. Un ETF che lo replica dipende da costi, tracking difference, fiscalità e politica dei dividendi.',
 'FTSE All-World':'Indice che include large e mid cap di mercati sviluppati ed emergenti. Rispetto a un indice solo sviluppati cambia l’esposizione ai Paesi emergenti. Controlla classe ad accumulazione/distribuzione e replica.',
 'Duration':'Misura la sensibilità indicativa del prezzo di un’obbligazione alle variazioni dei rendimenti. Una duration modificata di 5 implica approssimativamente un -5% di prezzo per +1 punto percentuale nei tassi, a parità delle altre condizioni; convessità e spread modificano la stima.',
 'BTP':'Titolo di Stato italiano con cedole e rimborso regolati dalle condizioni di emissione. Quotazioni per 100 di nominale; attenzione a rateo, prezzo tel quel, rendimento a scadenza, rischio emittente e variazioni del prezzo prima della scadenza.'
};

const INVESQUO_ETF_EXPLAINS={
 'Value':{icon:'💎',body:'Il fattore value confronta il prezzo di un’azienda con metriche fondamentali come utili, patrimonio contabile o flussi di cassa. Può selezionare banche, industriali e società mature sottopesando imprese con multipli elevati. Non significa comprare automaticamente aziende sottovalutate: prezzi bassi possono riflettere problemi reali. Le metriche utilizzate, il peso dei settori e i ribilanciamenti possono differire molto tra indici.',example:'Esempio di approccio: ETF su MSCI World Value Factor o MSCI Europe Value. Controlla indice effettivamente seguito, ISIN e disponibilità della classe UCITS.',risk:'Value trap, concentrazione settoriale, periodi prolungati di sottoperformance.'},
 'Momentum':{icon:'🚀',body:'Il momentum punta sui titoli che hanno mostrato una forza relativa negli ultimi mesi, spesso misurata su finestre di 6–12 mesi. Non ricerca necessariamente le azioni più economiche. Quando il mercato cambia bruscamente direzione, la strategia può subire inversioni rapide. I ribilanciamenti modificano l’esposizione e possono aumentare i costi impliciti.',example:'Esempio verificabile: iShares Edge MSCI World Momentum Factor UCITS ETF (IWMO, IE00BP3QZ825); verifica sempre la borsa e la classe di quotazione.',risk:'Momentum crash, turnover, concentrazione in pochi stili di mercato.'},
 'Quality':{icon:'🛡️',body:'Gli indici quality usano indicatori quali ritorno sul capitale, stabilità degli utili e leva finanziaria. Un ETF può favorire aziende profittevoli, ma ciò non impedisce di pagarle troppo care. Alcuni metodi pesano molto la qualità di bilancio, altri incorporano revisioni degli utili o la stabilità dei flussi.',example:'Esempio di categoria: ETF che replicano MSCI World Quality Factor; confronta le varianti di metodologia e replica.',risk:'Valutazioni elevate, concentrazione settoriale, criteri di qualità eterogenei.'},
 'Small Cap':{icon:'🏢',body:'Le small cap sono imprese a capitalizzazione relativamente ridotta; la soglia dipende dall’indice. Rispetto alle mega-cap possono offrire diversificazione, ma spesso hanno minore liquidità e maggiore sensibilità al credito. La selezione geografica è fondamentale: USA, Europa e globali sono universi molto diversi.',example:'Esempio: Xtrackers MSCI Europe Small Cap UCITS ETF 1C, presente nelle classificazioni justETF europee.',risk:'Spread più elevati, liquidità, volatilità, maggiore vulnerabilità nelle recessioni.'},
 'Minimum / Low Volatility':{icon:'🌊',body:'Gli indici minimum volatility costruiscono un paniere che prova a contenere la volatilità stimata, spesso con vincoli su peso e settore. Gli ETF low volatility che selezionano singole azioni poco volatili non sempre seguono lo stesso metodo. Minore volatilità storica non equivale a protezione garantita del capitale.',example:'Esempio di struttura: ETF su MSCI World Minimum Volatility. Verifica se il benchmark usa ottimizzazione o semplice selezione di titoli.',risk:'Modelli basati sul passato, concentrazione difensiva, possibili cadute quando cambiano le correlazioni.'},
 'Dividend':{icon:'🪙',body:'Un ETF dividend si concentra su società che distribuiscono utili agli azionisti. Può selezionare dividendi elevati, crescita delle distribuzioni o sostenibilità dei pagamenti. Un rendimento da dividendo molto alto può essere il segnale di una forte discesa del titolo. La distribuzione non è un guadagno aggiuntivo rispetto al rendimento totale.',example:'Esempio: WisdomTree Europe SmallCap Dividend UCITS ETF; verifica classe a distribuzione o accumulazione.',risk:'Dividend trap, concentrazione in utilities e finanziari, rischio di taglio della cedola.'},
 'Settoriali e tematici':{icon:'🏭',body:'Gli ETF settoriali investono in comparti definiti, per esempio tecnologia, energia, farmaceutica o finanziari; i tematici seguono idee come robotica, cyber-security e semiconduttori. Gli universi possono essere concentrati e sovrapporsi molto agli ETF globali. Le regole di inclusione e il peso dei singoli emittenti cambiano il rischio.',example:'Esempi di categorie: ETF su MSCI World Information Technology, STOXX Europe 600 Health Care o indici semiconduttori.',risk:'Concentrazione, valutazioni elevate, ciclicità, sovrapposizione con altre posizioni.'},
 'Equal Weight':{icon:'⚖️',body:'Invece di assegnare più peso alle società grandi, un indice equal weight distribuisce il peso in modo più uniforme fra i componenti. Riduce la dipendenza dalle mega-cap, ma aumenta spesso il peso delle aziende più piccole e comporta ribilanciamenti periodici.',example:'Esempio di indice: S&P 500 Equal Weight. Va distinto dal normale S&P 500 ponderato per capitalizzazione.',risk:'Costi di ribilanciamento, esposizione dimensionale, sottoperformance quando dominano poche grandi società.'}
};
const INVESQUO_ACADEMY_DETAILED={"Ordinarie e privilegiate":{"body":"Le azioni ordinarie attribuiscono normalmente voto e partecipazione ai risultati; quelle privilegiate possono prevedere priorità nei dividendi o nel rimborso, con diritti di voto diversi. Non tutte le società emettono entrambe le classi. In liquidazione gli azionisti sono generalmente dopo i creditori: la priorità fra classi non rende sicuro il capitale.","example":"Due classi della stessa società possono avere prezzi diversi perché i diritti incorporati non coincidono.","check":"Leggere statuto, diritti patrimoniali e volumi della specifica classe."},"Growth e value":{"body":"Una società growth è valutata soprattutto per la crescita attesa dei ricavi e degli utili; una value presenta multipli relativamente contenuti rispetto ai fondamentali. La classificazione cambia con prezzo, utili e metodo dell'indice. Le growth possono soffrire quando salgono i tassi di sconto; le value possono essere economiche per problemi strutturali.","example":"Un titolo a P/E 12 non è necessariamente migliore di uno a P/E 25 se le prospettive e il rischio differiscono.","check":"Confrontare margini, flussi di cassa, debito e crescita sostenibile."},"Large, mid e small cap":{"body":"La capitalizzazione è prezzo per azioni in circolazione, non il fatturato dell'impresa. Large, mid e small cap sono fasce definite in modo diverso dai fornitori degli indici. Le aziende piccole hanno spesso scambi meno frequenti e maggiore dipendenza dal credito, ma possono offrire esposizioni settoriali meno presenti negli indici dominati dalle mega-cap.","example":"Una società da 2 miliardi può essere small cap in un indice globale e avere una categoria diversa altrove.","check":"Controllare flottante, volumi e criteri di ingresso nell'indice."},"Dividendi e buyback":{"body":"Il dividendo è denaro distribuito agli azionisti; il riacquisto di azioni proprie riduce potenzialmente il numero di azioni in circolazione. Entrambe le operazioni impiegano risorse aziendali e non creano automaticamente valore. Il dividend yield va rapportato al prezzo e il buyback va confrontato con valutazioni e indebitamento.","example":"Con un dividendo di 2 € su un prezzo di 100 €, il rendimento da dividendo indicativo è 2% lordo.","check":"Esaminare sostenibilità del flusso di cassa e politica di remunerazione."},"P/E, P/B e free cash flow":{"body":"Il P/E rapporta prezzo e utile per azione, il P/B prezzo e patrimonio netto per azione, mentre il free cash flow misura la liquidità dopo investimenti operativi. Settori diversi richiedono metriche diverse: il P/B è più usato per alcune banche, meno per imprese ricche di intangibili. Un P/E basso può dipendere da utili temporaneamente eccezionali.","example":"Un'azione a 60 € con utile per azione di 5 € ha P/E 12, non un rendimento garantito dell'8,3%.","check":"Distinguere dati trailing e prospettici, eventi straordinari e debito."},"Beta e volatilità":{"body":"Il beta descrive la sensibilità storica del rendimento di un titolo rispetto a un benchmark; la volatilità misura la dispersione dei rendimenti nel tempo. Un beta di 1,3 non significa che l'azione salirà sempre del 30% in più, né fotografa il rischio di fallimento. Entrambe le grandezze dipendono dal periodo osservato.","example":"Con mercato a −10%, beta 1,3 suggerisce una sensibilità media ipotetica di circa −13%, non una previsione.","check":"Considerare anche drawdown, liquidità e rischio specifico."},"Mercati e classi azionarie":{"body":"La medesima società può avere più classi di azioni e lo stesso strumento può essere scambiato su mercati differenti. Il ticker identifica una quotazione su una piazza, mentre l'ISIN identifica normalmente lo strumento finanziario. Prezzi in euro e dollari possono cambiare anche per effetto del cambio e degli orari di negoziazione.","example":"Un titolo USA negoziato anche a Milano può oscillare mentre la borsa americana è chiusa.","check":"Verificare ISIN, classe, valuta, spread e orari della piazza scelta."},"Globali e regionali":{"body":"Un ETF globale segue un indice con più aree geografiche, mentre uno regionale concentra l'investimento in una zona. «Globale» non significa necessariamente includere tutti i Paesi: alcuni indici escludono gli emergenti o le società più piccole. Il peso dei Paesi è spesso determinato dalla capitalizzazione flottante.","example":"Un ETF MSCI World non include gli emergenti; FTSE All-World include sviluppati ed emergenti.","check":"Confrontare composizione per area, settore, concentrazione e benchmark."},"Azionari, obbligazionari, settoriali e tematici":{"body":"ETF è il contenitore, non il livello di rischio. Un ETF azionario globale possiede partecipazioni, uno obbligazionario titoli di debito, uno settoriale un comparto specifico e uno tematico una selezione legata a un'idea industriale. La diversificazione reale dipende dagli strumenti sottostanti e dalla metodologia.","example":"Un ETF su semiconduttori può avere pochi titoli che compaiono già in un ETF mondiale.","check":"Verificare prime dieci posizioni, duration per i bond e sovrapposizioni di portafoglio."},"S&P 500":{"body":"L'S&P 500 comprende circa 500 società statunitensi selezionate secondo criteri di quotazione, capitalizzazione, flottante e redditività. È ponderato per capitalizzazione flottante: poche aziende grandi possono influenzare molto il risultato. Non rappresenta tutte le società quotate americane e può essere concentrato in tecnologia e servizi di comunicazione.","example":"Se una società pesa il 7%, un suo movimento del 10% incide per circa 0,7 punti sull'indice, a parità del resto.","check":"Distinguere indice price return e total return con dividendi."},"Nasdaq-100":{"body":"Il Nasdaq-100 raccoglie cento tra le maggiori società non finanziarie quotate al Nasdaq, secondo regole proprie di selezione e ponderazione. Non è un indice di tutte le società tecnologiche: comprende anche consumi e sanità, ed esclude alcune grandi società quotate altrove. L'elevata esposizione a titoli growth può accentuare le oscillazioni.","example":"Un ETF Nasdaq-100 e uno S&P 500 possono sovrapporsi molto nelle grandi società USA.","check":"Controllare concentrazione, ribilanciamenti e diversificazione effettiva."},"MSCI World":{"body":"MSCI World copre azioni large e mid cap dei mercati sviluppati; la parola World non include automaticamente mercati emergenti o small cap. Le azioni sono pesate per capitalizzazione flottante, spesso con un'incidenza elevata degli Stati Uniti. Il rendimento in euro risente dei cambi se l'esposizione non è coperta.","example":"Un ETF MSCI World può contenere oltre mille imprese, ma con pesi molto diseguali.","check":"Confrontare indice netto/lordo, valuta, TER e tracking difference."},"FTSE All-World / MSCI ACWI":{"body":"Entrambi gli indici cercano di rappresentare azioni dei mercati sviluppati ed emergenti, ma classificano i Paesi e scelgono i titoli con criteri differenti. Hanno pesi dominati dalle grandi aziende e non includono necessariamente l'intero universo small cap. Sono utilizzati come benchmark azionari ampi, non come portafogli privi di rischio.","example":"Due ETF su FTSE All-World e MSCI ACWI possono seguire traiettorie simili ma non identiche.","check":"Controllare schede degli indici e le esposizioni per Paese."},"STOXX Europe 600, FTSE MIB, DAX":{"body":"STOXX Europe 600 copre un paniere europeo ampio; FTSE MIB rappresenta grandi e liquide società italiane; DAX grandi società tedesche. Un benchmark nazionale può essere molto concentrato in alcuni settori. Bisogna inoltre verificare se il grafico mostra prezzi o performance con dividendi reinvestiti.","example":"DAX performance index incorpora dividendi, mentre un indice solo prezzo può mostrarli separatamente.","check":"Confrontare metodologia, valuta e versione dell'indice."},"UCITS, TER e tracking difference":{"body":"UCITS è un quadro normativo europeo per fondi, non un'etichetta di rendimento garantito. Il TER rappresenta parte dei costi ricorrenti del fondo, mentre la tracking difference misura lo scostamento effettivo fra ETF e indice su un periodo. Possono influire anche spread, imposte, prestito titoli e replica.","example":"Un ETF con TER 0,20% può seguire il benchmark meglio di uno con TER 0,10%, a seconda degli altri fattori.","check":"Leggere KID e report annuali, confrontando rendimenti sullo stesso periodo."},"Fisico, campionamento, sintetico":{"body":"La replica fisica completa acquista i titoli dell'indice, il campionamento una selezione rappresentativa, la sintetica usa tipicamente contratti derivati per ottenere il rendimento. Non tutte le repliche sintetiche sono uguali: contano controparte, collaterale e regole di sostituzione. I costi reali possono differire dai costi dichiarati.","example":"Un ETF su mercati poco liquidi può usare campionamento per ridurre la negoziazione di molti titoli.","check":"Valutare rischio controparte e tracking difference, non solo il metodo."},"Accumulo e distribuzione":{"body":"Una classe ad accumulazione reinveste nel fondo gli eventuali proventi; una classe a distribuzione li versa all'investitore. A parità di esposizione, ricevere un dividendo non aggiunge rendimento rispetto alla crescita della quota: cambia la gestione dei flussi e potenzialmente la fiscalità. Il trattamento fiscale dipende dal Paese di residenza.","example":"Una distribuzione di 1 € può accompagnarsi a una riduzione comparabile del valore quota ex-dividendo.","check":"Controllare ISIN della classe, calendario e politica distributiva."},"€STR e overnight":{"body":"€STR misura il costo all'ingrosso dei prestiti overnight non garantiti in euro fra banche e altri istituti. Un prodotto che lo segue risente rapidamente delle decisioni della BCE e dei tassi monetari. Il rendimento passato non resta fisso: se i tassi scendono, anche la remunerazione attesa tende a ridursi.","example":"Un rendimento annualizzato del 3% non equivale a incassare il 3% in un mese.","check":"Distinguere benchmark giornaliero, capitalizzazione e costi."},"ETF overnight sintetici":{"body":"Questi ETF mirano a replicare un indice monetario attraverso un portafoglio di garanzie e uno o più swap. Il prezzo della quota incorpora l'andamento dell'indice al netto di costi e scostamenti; non è un deposito bancario. Il rischio è generalmente diverso dall'azionario ma esistono rischi di controparte e struttura.","example":"Un ETF sintetico su un indice €STR può usare un paniere di titoli diverso dall'esposizione ottenuta con lo swap.","check":"Leggere politica del collaterale, controparte e KID."},"BOT e fondi monetari":{"body":"I BOT sono titoli di Stato a breve scadenza tipicamente senza cedola, acquistati sotto o sopra la pari secondo mercato; i fondi monetari detengono strumenti di breve durata. A differenza del deposito, entrambi possono mostrare prezzi variabili e rischi specifici. Il rendimento effettivo dipende da costo, imposte e momento di vendita.","example":"Un BOT acquistato a 98 e rimborsato a 100 genera 2 di differenza lorda su 100 nominali, se rimborsato integralmente.","check":"Controllare scadenza, liquidità e fiscalità applicata."},"Parcheggio della liquidità":{"body":"Per un obiettivo vicino servono strumenti coerenti con tempi di utilizzo e possibilità di rimborso. ETF monetari, BOT e depositi vincolati offrono caratteristiche diverse di protezione, oscillazione e accesso ai fondi. Un capitale destinato a un pagamento certo non dovrebbe dipendere da una vendita in condizioni sfavorevoli.","example":"Per un anticipo casa entro sei mesi, una scadenza certa può essere più importante di pochi decimali di rendimento.","check":"Valutare tempi di disinvestimento, spread e garanzie."},"Rischio tassi e inflazione":{"body":"I prodotti monetari si adeguano in genere più velocemente ai tassi rispetto alle obbligazioni lunghe, ma possono remunerare poco quando i tassi scendono. L'inflazione riduce il potere d'acquisto anche se il saldo nominale cresce. Conta il rendimento reale dopo imposte e costi.","example":"Con interesse netto 2% e inflazione 3%, il potere d'acquisto diminuisce di circa l'1% annuo.","check":"Distinguere rendimento lordo, netto e reale."},"BTP, BOT, CCTeu, BTP Italia e BTP Valore":{"body":"I BTP tradizionali hanno normalmente cedole fisse; i BOT sono a breve durata senza cedola periodica; i CCTeu hanno cedole variabili; BTP Italia include meccanismi di indicizzazione all'inflazione italiana; BTP Valore può prevedere cedole step-up e premi per determinate condizioni. Ogni emissione è regolata dal proprio prospetto.","example":"Due titoli dello Stato italiano con uguale scadenza possono avere cedole e prezzi differenti, quindi rendimenti diversi.","check":"Leggere ISIN, data rimborso, cedole, rateo e condizioni dei premi."},"Corporate investment grade e high yield":{"body":"Le obbligazioni societarie investment grade hanno rating considerati più solidi rispetto all'high yield, ma anche un rating elevato non elimina il rischio di insolvenza. L'high yield offre spesso rendimenti nominali maggiori proprio per compensare più rischio di credito e liquidità. Rating e spread possono cambiare rapidamente.","example":"Una cedola al 7% non garantisce rendimento del 7% se il prezzo supera 100 o se l'emittente non rimborsa.","check":"Verificare bilanci, seniority, rating e probabilità di recupero."},"Zero coupon, callable, subordinate":{"body":"Uno zero coupon non paga cedole periodiche e concentra il rendimento nella differenza fra prezzo e rimborso. Una callable può essere rimborsata anticipatamente dall'emittente; una subordinata viene pagata dopo altri creditori in caso di crisi. Queste clausole cambiano duration e profilo di rischio.","example":"Una callable con cedola alta può essere richiamata proprio quando per l'investitore sarebbe utile mantenerla.","check":"Controllare prospetto, date di call, prezzo di rimborso e gerarchia creditori."},"Cedola, prezzo secco e tel quel":{"body":"La cedola è il flusso contrattuale, il prezzo secco è il prezzo di mercato senza rateo, il tel quel comprende il rateo di interessi maturati dall'ultimo pagamento. Nei mercati obbligazionari il prezzo è spesso espresso per 100 di valore nominale. Confondere questi elementi altera il calcolo della spesa effettiva.","example":"Per 1.000 € nominali e prezzo secco 102, il controvalore base è 1.020 €, cui possono aggiungersi rateo e commissioni.","check":"Verificare frequenza cedolare e convenzione di calcolo giorni."},"Yield to maturity e duration":{"body":"Lo yield to maturity è il tasso interno che uguaglia prezzo e flussi contrattuali ipotizzando rimborso secondo contratto; non è una garanzia in caso di default o vendita anticipata. La duration modificata approssima la sensibilità percentuale del prezzo a una variazione dei rendimenti. Maggiore durata implica spesso maggiore oscillazione.","example":"Con duration 6, un aumento di un punto percentuale dei rendimenti implica circa −6% di prezzo, come stima locale.","check":"Distinguere yield lordo/netto e duration dalle scadenze dei flussi."},"Spread e rischio emittente":{"body":"Lo spread è la differenza tra due rendimenti comparabili, spesso usata per misurare premio di rischio e liquidità. Può ampliarsi quando peggiora la fiducia nell'emittente, anche a tassi generali invariati. Un rendimento alto può compensare un rischio maggiore, non segnalare necessariamente un'opportunità.","example":"Se un titolo rende il 4,5% e il benchmark simile il 3%, lo spread è circa 150 punti base.","check":"Confrontare durata, valuta, seniority e qualità del credito."},"ISIN e MOT":{"body":"L'ISIN è il codice internazionale dello strumento; MOT è un mercato italiano di negoziazione obbligazionaria. Una stessa emissione può essere accessibile su piazze differenti, con volumi e spread diversi. Avere un ISIN valido non assicura che un servizio gratuito offra quotazioni continue o grafici storici.","example":"Un BTP può essere negoziato sul MOT mentre un provider internazionale ne mostra dati incompleti.","check":"Controllare listino ufficiale, data quotazione, lotto minimo e orari."},"Prezzi vs cedole":{"body":"Un grafico del prezzo di un'obbligazione mostra l'andamento delle quotazioni, ma non necessariamente le cedole già ricevute. Il rendimento totale combina variazione del capitale, cedole e talvolta reinvestimento, al netto dei costi in una simulazione personale. Perciò l'apparente calo del prezzo non equivale da solo a una perdita totale.","example":"Un titolo comprato a 100 e ora a 98 può aver corrisposto 4 di cedole lorde nello stesso periodo.","check":"Confrontare total return e prezzo, distinguendo lordo/netto."},"Lingotti e monete":{"body":"L'oro fisico richiede scelta di purezza, forma, custodia e autenticazione. Il prezzo effettivo di acquisto include spesso un premio sul valore spot e il rivenditore propone un prezzo di riacquisto inferiore. Piccoli tagli possono comportare spread percentuali maggiori.","example":"Una moneta acquistata al 5% sopra lo spot parte con un costo implicito da recuperare.","check":"Considerare custodia, assicurazione e documentazione di provenienza."},"ETC su oro fisico":{"body":"Un ETC sull'oro mira a seguire il prezzo del metallo tramite una struttura quotata, spesso con garanzia in oro custodito. Non è necessariamente un fondo UCITS; occorre controllare il diritto legale dell'investitore, le garanzie e le commissioni. Il prezzo in euro dipende anche da dollaro ed eventuale copertura valutaria.","example":"Un ETC può muoversi come l'oro in USD ma divergere in EUR quando cambia il cambio.","check":"Esaminare prospetto, garanzia, custode e costo annuo."},"Azioni minerarie":{"body":"Le società minerarie sono imprese operative: i profitti dipendono da prezzo dell'oro, costi di estrazione, capitale investito, debito e rischi politici. Le loro azioni possono oscillare più dell'oro e non replicarne fedelmente il prezzo. Anche il mercato azionario generale influisce sulle valutazioni.","example":"Con oro stabile, costi energetici più alti possono ridurre i margini di una miniera.","check":"Confrontare riserve, costo di produzione e debito."},"Tassi reali e dollaro":{"body":"L'oro tende a essere sensibile al rendimento reale delle attività alternative e al dollaro, ma non esiste un rapporto matematico costante. Crisi geopolitiche, acquisti delle banche centrali e domanda di investimento possono prevalere in alcune fasi. Prevedere il prezzo da una sola variabile è rischioso.","example":"Tassi reali in rialzo possono rendere più attraenti i bond, ma l'oro può salire per domanda difensiva.","check":"Guardare scenari multipli, non correlazioni di breve periodo."},"Cambio EUR/USD":{"body":"La quotazione internazionale dell'oro è comunemente in dollari per oncia troy. Il valore in euro dipende sia dal movimento dell'oro sia dal cambio USD/EUR, con effetto anche quando il prezzo in dollari è fermo. Un ETC coperto dal cambio ha costi e meccanismi ulteriori.","example":"Se l'oro in USD resta invariato e il dollaro si apprezza rispetto all'euro, il valore in EUR può salire.","check":"Controllare valuta di esposizione anziché sola valuta di negoziazione."},"Petrolio Brent e WTI":{"body":"Brent e WTI sono riferimenti per greggi con caratteristiche e punti di consegna differenti. Domanda globale, decisioni dei produttori, scorte e trasporti influenzano i prezzi; la differenza fra i due benchmark varia. Gli ETC utilizzano spesso futures, che aggiungono effetti di rollover.","example":"Il prezzo di un future Brent per consegna futura può differire dal prezzo spot odierno.","check":"Distinguere sottostante, mese del contratto e struttura dei futures."},"Gas naturale":{"body":"Il gas viene negoziato su mercati regionali, per esempio TTF europeo e Henry Hub statunitense, con infrastrutture e prezzi differenti. Stoccaggi, clima, flussi di gas liquefatto e tensioni di rete influenzano le quotazioni. La stagionalità può essere forte e i derivati hanno rischio elevato.","example":"Un inverno mite può ridurre la domanda di riscaldamento e modificare i futures.","check":"Verificare mercato di riferimento, scadenze e struttura del prodotto."},"Rame, alluminio e litio":{"body":"I metalli industriali dipendono da ciclo produttivo, offerta mineraria, energia e trasformazioni tecnologiche. «Investire nel litio» può significare azioni di produttori o derivati su contratti, con rischi completamente diversi. L'offerta può reagire lentamente ai prezzi perché aprire miniere richiede anni.","example":"L'espansione delle reti elettriche può aumentare la domanda di rame senza assicurare crescita continua dei prezzi.","check":"Studiare inventari, produzione, sostituti e veicolo d'investimento."},"Grano, mais e caffè":{"body":"Le commodity agricole hanno domanda relativamente stabile ma offerta soggetta a meteo, fitopatie, raccolti e logistica. Le quotazioni futures incorporano costi di trasporto e stoccaggio e possono differire dal prezzo spot. L'investitore in ETF/ETC non riceve necessariamente la merce fisica.","example":"Una gelata nei Paesi produttori può provocare variazioni rapide sui futures del caffè.","check":"Analizzare calendario dei raccolti, concentrazione geografica e rollover."},"Futures e rollover":{"body":"Un future è un contratto standard per acquistare o vendere un sottostante a scadenza. Un prodotto che mantiene l'esposizione deve periodicamente sostituire il contratto in scadenza: in contango compra futures più cari, in backwardation può accadere il contrario. Questo effetto può produrre rendimenti diversi dal prezzo spot.","example":"Petrolio spot invariato non implica ETC sui futures invariato dopo molti rollover.","check":"Leggere metodologia dell'indice e frequenza dei cambi contratto."},"Leva e rischi":{"body":"La leva amplifica il movimento del sottostante e può generare perdite rapide; su prodotti a leva giornaliera il ribilanciamento comporta effetti di compounding. In mercati oscillanti il risultato cumulato può essere molto diverso dalla leva moltiplicata per il rendimento del periodo. Il rischio di azzeramento è concreto.","example":"Con +10% un giorno e −9,09% il successivo il sottostante torna circa al punto iniziale; un prodotto a leva può no.","check":"Verificare orizzonte giornaliero, costi finanziari e meccanismo di reset."},"Bitcoin (BTC)":{"body":"Bitcoin è una rete con consenso proof of work e regole di emissione prestabilite; il numero massimo teorico è circa 21 milioni di BTC. La scarsità programmata non garantisce valore o stabilità. Quotazione, custodia delle chiavi, commissioni di rete e intermediari sono rischi distinti.","example":"Con 500 € si può acquistare una frazione di BTC, non serve un bitcoin intero.","check":"Valutare custodia, volatilità e possibilità di perdita totale."},"Ethereum (ETH)":{"body":"Ethereum consente smart contract e applicazioni decentralizzate e utilizza un meccanismo di consenso proof of stake. Le operazioni pagano gas fee, variabili secondo congestione, e interagire con protocolli aggiunge rischio di bug e attacchi. ETH e token creati sulla rete non sono la stessa attività.","example":"Uno smart contract può custodire fondi, ma un errore nel codice può renderli irrecuperabili.","check":"Distinguere asset di rete, token, commissioni e sicurezza del protocollo."},"Solana e altre L1":{"body":"Le blockchain layer 1 differiscono per architettura, consenso, capacità, costi e livello di decentralizzazione. Una maggiore velocità di esecuzione non implica automaticamente più sicurezza o affidabilità. Interruzioni operative, vulnerabilità e dipendenza dall'ecosistema sono rischi specifici.","example":"Due reti che elaborano transazioni in tempi diversi possono avere anche diversi requisiti hardware dei validatori.","check":"Esaminare resilienza, distribuzione dei validatori e uso effettivo."},"Wallet e chiavi private":{"body":"Un wallet custodisce o gestisce credenziali per firmare operazioni sulla blockchain; i token restano registrati sulla rete. Con autocustodia l'utente controlla le chiavi ma assume il rischio di perderle o divulgarle. La frase di recupero non va mai condivisa e un trasferimento errato può essere irreversibile.","example":"Perdere una seed phrase può significare non poter più accedere ai fondi.","check":"Usare procedure di backup offline e verificare indirizzi e reti."},"Custodial, exchange ed ETP":{"body":"Con un exchange custodial, un intermediario detiene le chiavi per conto dell'utente; con un ETP si acquista un titolo quotato esposto al prezzo di asset digitali. Sono modelli con rischi diversi: fallimento dell'intermediario, esposizione legale, custode, regolamento e spread. La proprietà del titolo non equivale necessariamente al controllo dei token.","example":"Un ETP su Bitcoin può seguire il prezzo ma non permettere di trasferire BTC su un wallet personale.","check":"Leggere prospetto, sede di custodia e protezioni applicabili."},"Staking e stablecoin":{"body":"Lo staking contribuisce alla sicurezza di alcune reti PoS in cambio di compensi variabili e possibili penalità. Le stablecoin mirano a mantenere un riferimento, spesso a una valuta, tramite riserve o algoritmi; il peg può rompersi. Rendimenti pubblicizzati elevati implicano rischi aggiuntivi di liquidità, controparte o smart contract.","example":"Una stablecoin da 1 USD può perdere la parità in caso di crisi delle riserve.","check":"Controllare riserve, meccanismo di riscatto e vincoli operativi."},"ETC fisici e sintetici":{"body":"Gli ETC sono titoli quotati che danno esposizione a un sottostante, spesso una materia prima. Una struttura fisica detiene normalmente metallo o garanzie reali; una sintetica utilizza derivati. Le garanzie giuridiche cambiano molto tra emissioni, quindi la dicitura non basta per dedurne il rischio.","example":"Due ETC sull'oro possono avere stesso benchmark ma garanzie e commissioni differenti.","check":"Esaminare collaterale, agente di custodia e diritti in caso di insolvenza."},"ETN e rischio emittente":{"body":"Un ETN è normalmente una nota di debito che promette una prestazione collegata a indice o strategia. Se l'emittente diventa insolvente, l'investitore può subire perdite anche se il sottostante si è comportato bene. Alcuni prodotti sono collateralizzati, altri no; il rischio di credito dipende dalla struttura.","example":"Un ETN con indice +10% non garantisce pagamento se l'emittente non adempie.","check":"Verificare rating, garanzie, clausole di rimborso e spread."},"Leva e short":{"body":"I prodotti short mirano a beneficiare di una discesa del sottostante; quelli a leva amplificano variazioni, spesso su base giornaliera. Su più giornate i rendimenti composti e i costi di finanziamento possono discostarsi dal semplice −1x o +2x del periodo. Gli scenari avversi possono generare perdite molto veloci.","example":"Un +5% seguito da −5% non riporta esattamente al prezzo iniziale; con leva la divergenza aumenta.","check":"Considerare reset giornaliero, limite di perdita e scopo speculativo."},"KID e prospetto":{"body":"Il KID presenta informazioni sintetiche su prodotto, costi, rischi e scenari; il prospetto descrive in dettaglio struttura giuridica, rimborso ed eventuali garanzie. Gli scenari di performance non sono previsioni e le ipotesi possono essere diverse dalla situazione reale.","example":"Due ETP apparentemente simili possono avere condizioni di rimborso anticipato diverse.","check":"Leggere versione e data del documento, costi a più orizzonti e condizioni straordinarie."},"Spread e volumi":{"body":"Lo spread denaro-lettera è la differenza fra migliore prezzo di acquisto e vendita disponibile. Volumi e presenza di market maker influiscono sulla negoziabilità, ma il volume giornaliero non è l'unica misura di liquidità. Nei momenti di stress lo spread può ampliarsi rapidamente.","example":"Prezzo denaro 99 e lettera 101 significa circa il 2% di differenza rispetto al prezzo medio.","check":"Usare ordini limite e confrontare spread in orario di mercato."},"Conto corrente":{"body":"Un conto corrente serve soprattutto a pagamenti e disponibilità immediata, non necessariamente a rendimento. Può avere canoni, commissioni e condizioni promozionali; la tutela dei depositi dipende dall'istituto e dal sistema di garanzia applicabile. La liquidità è utile per spese ed emergenze.","example":"Tenere un fondo per spese imminenti evita vendite forzate di strumenti volatili.","check":"Verificare costi, remunerazione e coperture applicabili."},"Conto deposito libero o vincolato":{"body":"Nel deposito libero il denaro può generalmente essere prelevato secondo le condizioni, mentre in quello vincolato può essere limitato o penalizzato lo svincolo anticipato. Il tasso annunciato è spesso lordo e può valere solo per una promozione. Il depositante è esposto anche al rischio della banca, mitigato dai regimi applicabili.","example":"Un 4% lordo per sei mesi non significa 4% incassato nel semestre: il periodo dimezza circa la remunerazione annua.","check":"Controllare decorrenza, svincolo, bollo e trattamento fiscale."},"Buoni fruttiferi postali":{"body":"I buoni sono prodotti di risparmio postale con rendimenti stabiliti dalle condizioni della serie sottoscritta. Possono avere scadenze, finestre di maturazione degli interessi e regole di rimborso anticipate differenti; non sono ETF o obbligazioni negoziate sul MOT. La disponibilità del capitale non implica che ogni rimborso anticipato maturi interessi.","example":"Un buono può rimborsare il capitale prima di alcuni anni senza riconoscere tutti gli interessi indicati a scadenza.","check":"Conservare serie, data sottoscrizione e condizioni ufficiali."},"Garanzie e limiti":{"body":"Le tutele dipendono dal prodotto: un deposito bancario, un buono postale e un investimento quotato non condividono lo stesso meccanismo. Per depositi bancari nell'UE la protezione armonizzata è normalmente fino a 100.000 € per depositante e banca, con eccezioni specifiche. Le oscillazioni dei titoli sul mercato non sono coperte da garanzie sui depositi.","example":"Due conti nella stessa banca possono concorrere allo stesso limite di copertura.","check":"Verificare istituto, intestazioni, normativa e soggetti garanti."},"TAN, imposte e rendimento netto":{"body":"Il TAN esprime un interesse nominale annuale, non necessariamente ciò che rimane dopo tassazione, bollo e commissioni. Per confrontare strumenti con durate diverse conta anche il momento in cui vengono corrisposti gli interessi e se c'è capitalizzazione. Il rendimento reale considera infine l'inflazione.","example":"100 € di interessi lordi diventano meno di 100 € disponibili dopo le imposte applicabili.","check":"Confrontare rendimento netto annuo effettivo e condizioni complete."},"Buoni ordinari":{"body":"I buoni ordinari sono serie con una durata contrattuale e una struttura di interessi definita al momento della sottoscrizione. Il rendimento può maturare per scaglioni temporali e il riscatto prima della scadenza può ridurre gli interessi rispetto all'obiettivo finale. Le condizioni cambiano tra serie emesse in anni diversi.","example":"Due buoni ordinari sottoscritti in periodi diversi possono avere tassi e date di scadenza diversi.","check":"Registrare data sottoscrizione, serie, scadenza e valore previsto."},"Buoni per minori":{"body":"I buoni per minori sono intestati al minore e prevedono condizioni connesse alla sua età e al raggiungimento della maggiore età, secondo la specifica emissione. Il tasso o il valore indicato alla scadenza non va confrontato senza considerare durata effettiva e vincoli di rimborso. Le regole sul rimborso prima della maggiore età richiedono attenzione.","example":"Un buono sottoscritto a pochi mesi dalla nascita ha una durata potenzialmente molto diversa da uno comprato a 15 anni.","check":"Conservare data di nascita, serie, scadenza e procedure di rimborso."},"Riscatto anticipato":{"body":"Riscattare prima della scadenza può ridurre il rendimento maturato in base alle finestre temporali previste dalla serie del buono. Il valore rimborsabile non coincide sempre con il montante proiettato alla data finale. È importante distinguere possibilità legale di rimborso e convenienza economica.","example":"Un buono che matura interessi solo dopo un periodo minimo può restituire prima di allora il solo capitale.","check":"Simulare il rimborso alla data effettiva sui canali ufficiali."},"Imposte e valore netto":{"body":"Gli interessi lordi di buoni e titoli possono essere assoggettati a regole fiscali differenti; per i buoni postali italiani la tassazione agevolata degli interessi è in genere 12,5%, oltre alle eventuali regole sull'imposta di bollo. Il valore netto dipende da durata, intestazione e norme applicabili.","example":"Una proiezione lorda di 12.000 € su capitale 10.000 € non rappresenta automaticamente 12.000 € incassati.","check":"Separare capitale, interessi lordi, imposte e bollo."},"EUR/USD, EUR/GBP e USD/JPY":{"body":"Una coppia valutaria esprime quante unità della seconda moneta servono per acquistare una unità della prima. I cambi reagiscono a tassi, inflazione, bilance economiche e aspettative; i movimenti possono essere rapidi. Un investimento estero ha rischio di cambio anche quando è acquistato da una borsa italiana.","example":"EUR/USD a 1,10 significa circa 1,10 USD per 1 EUR; un suo calo indica euro più debole rispetto al dollaro.","check":"Attenzione a direzione della coppia, commissioni e spread."},"Spot e forward":{"body":"Il cambio spot riguarda lo scambio con regolamento vicino, mentre un forward fissa oggi un cambio per una data futura. Il forward incorpora differenziali di tasso e condizioni di mercato: non è una previsione certa del cambio futuro. Le operazioni possono richiedere garanzie e introdurre rischio controparte.","example":"Un'azienda che incasserà dollari fra tre mesi può usare un forward per stabilizzare il valore in euro.","check":"Verificare costi, scadenza e rischio controparte."},"Rischio di conversione":{"body":"Quando un'attività è esposta a un'altra valuta, il controvalore in euro cambia anche a prezzo locale invariato. La valuta in cui un ETF viene quotato non determina da sola il rischio valutario: conta la valuta degli strumenti sottostanti e l'eventuale copertura.","example":"Un'azione USA ferma a 100 USD vale meno euro se il dollaro si indebolisce.","check":"Distinguere valuta del titolo, valuta base del fondo e copertura."},"Hedged vs unhedged":{"body":"Una classe hedged usa strumenti derivati per cercare di attenuare il movimento del cambio rispetto a una valuta scelta. La copertura non è perfetta e ha un costo economico legato anche ai differenziali dei tassi. Unhedged lascia esposta la componente valutaria, che può favorire o penalizzare i risultati.","example":"Un ETF azionario USA hedged EUR può attenuare l'effetto EUR/USD ma continua a oscillare per il mercato azionario.","check":"Valutare orizzonte, costi della copertura e metodo del fondo."},"Leva e margini":{"body":"Nel forex a margine si controllano importi superiori al capitale depositato. Variazioni apparentemente piccole dei cambi possono quindi produrre forti guadagni o perdite, richieste di margine e liquidazioni. Spread e costi overnight rendono ancora più difficile mantenerlo a lungo.","example":"Con leva 20, una variazione avversa del 5% può teoricamente esaurire il margine iniziale, prima degli altri costi.","check":"Comprendere margine, stop-out, leva effettiva e rischio di perdita totale."}};
function academyDetailText(title,brief){
 const factor=INVESQUO_ETF_EXPLAINS[title];
 if(factor)return '<p style="font-size:22px" aria-hidden="true">'+factor.icon+'</p><p>'+svgEscape(brief)+'</p><p>'+svgEscape(factor.body)+'</p><p><strong>Esempio:</strong> '+svgEscape(factor.example)+'</p><p><strong>Rischi:</strong> '+svgEscape(factor.risk)+'</p><p><strong>Come approfondire:</strong> confronta le metodologie dei benchmark, la composizione e i documenti della classe specifica.</p>';
 const detailed=INVESQUO_ACADEMY_DETAILED[title];
 if(detailed)return '<p>'+svgEscape(brief)+'</p><p>'+svgEscape(detailed.body)+'</p><p><strong>Esempio pratico:</strong> '+svgEscape(detailed.example)+'</p><p><strong>Elementi da approfondire:</strong> '+svgEscape(detailed.check)+'</p>';
 return '<p>'+svgEscape(brief)+'</p><p>Approfondisci come funziona lo strumento, il benchmark, la liquidità e i costi specifici.</p>';
}
function academyTree(a){
 const levels=EDUCATION_LEVELS[a.id]||[];
 return '<div class="academy-tree"><p class="academy-intro">Esplora gli approfondimenti per argomento:</p>'+levels.map((lv,li)=>'<details class="academy-level"><summary>'+svgEscape(lv[0])+' <span>'+lv[1].length+' voci</span></summary><div class="academy-nodes">'+lv[1].map((item,si)=>'<details class="academy-node"><summary>'+svgEscape(item[0])+'</summary>'+academyDetailText(item[0],item[1])+'</details>').join('')+'</div></details>').join('')+'</div>';
}

let learningExpanded=new Set();
const INVESQUO_ACADEMY_OVERVIEW={"azioni":"Le azioni non hanno una data di rimborso obbligatoria: il loro prezzo riflette aspettative su profitti, tassi e rischio dell’impresa. Il rendimento totale combina eventuali dividendi e variazione di quotazione. Diversificare fra aziende e Paesi attenua il rischio specifico ma non evita ribassi di mercato.","etf":"Prima di scegliere un ETF bisogna partire dall’indice e dalle regole di costruzione del portafoglio: due ETF azionari possono avere esposizioni e rischi molto differenti. Per valutare un ETF considera replica, concentrazione, costi totali, trattamento dei dividendi e liquidità. Le strategie fattoriali non garantiscono di battere il mercato.","monetari":"Gli strumenti monetari seguono tassi di brevissimo termine e vengono spesso utilizzati per una gestione temporanea della liquidità. La loro remunerazione non è fissa e può calare rapidamente insieme ai tassi ufficiali. Vanno distinti dai depositi bancari protetti da specifici sistemi di garanzia.","bond":"La distinzione cruciale è fra conservare un’obbligazione fino al rimborso e venderla prima della scadenza: nel secondo caso conta il prezzo di mercato. Anche alla scadenza il pagamento dipende dall’emittente. Per comprendere il rendimento occorre combinare prezzo pagato, cedole, durata, tasse e rischio di credito.","oro":"L’oro è un’attività senza flussi di cassa: non esiste una cedola o un utile da stimare come per un’azienda. Può diversificare un portafoglio, ma non è una garanzia nei periodi di crisi. La modalità di detenzione, fisica o tramite strumento quotato, aggiunge costi e rischi diversi.","commodities":"Le materie prime sono mercati molto eterogenei: energia, metalli e prodotti agricoli reagiscono a driver economici differenti. Chi investe tramite prodotti quotati spesso ottiene esposizione a futures piuttosto che acquistare la merce. Scadenze e rinnovo dei contratti possono modificare sensibilmente il rendimento.","crypto":"Gli asset digitali possono avere funzioni tecniche profondamente differenti: rete di pagamento, smart contract, token di piattaforma o stablecoin. Il rischio comprende quotazioni, custodia e vulnerabilità operative. La possibilità di trasferire direttamente i token dipende dal tipo di strumento acquistato.","etn":"ETC ed ETN sono prodotti di mercato che possono assumere forma di titoli di debito, con rischi dell’emittente e garanzie da verificare. Due strumenti che replicano lo stesso sottostante non sono per forza equivalenti. Prima dell’acquisto è fondamentale distinguere fondo UCITS, ETP collateralizzato e nota non garantita.","liquidita":"La liquidità serve a mantenere disponibili risorse per spese ed emergenze, ma un saldo stabile non protegge automaticamente dall’inflazione. Depositi, conti correnti e buoni hanno differenti limiti, condizioni e tassazione. La scelta dipende soprattutto da quando il denaro sarà necessario e dalla certezza del rimborso.","postale":"Nel risparmio postale la serie sottoscritta determina durata, tassi e regole di maturazione degli interessi. Il valore finale mostrato nelle simulazioni è diverso da quello ottenibile con un riscatto anticipato. È utile registrare in Finholdra data di emissione, data di scadenza e valore previsto.","valute":"Il mercato valutario esprime rapporti fra due monete: il risultato di un investimento dipende anche dalla direzione della coppia. Il rischio di cambio si presenta nelle azioni e negli ETF internazionali indipendentemente dalla borsa di acquisto. Coprire il cambio attenua alcune oscillazioni ma introduce costi."};
function renderEducation(){
 const grid=document.getElementById('learningGrid');if(!grid)return;
 const term=(document.getElementById('learningSearch')?.value||'').trim().toLocaleLowerCase('it');
 const shown=EDUCATION.filter(a=>{const levels=EDUCATION_LEVELS[a.id]||[];const nested=levels.map(lv=>lv[0]+' '+lv[1].map(it=>it.join(' ')).join(' ')).join(' ');return (a.name+' '+a.short+' '+a.long+' '+a.terms+' '+nested).toLocaleLowerCase('it').includes(term)});
 document.getElementById('learningCount').textContent=shown.length+' argomenti';
 grid.innerHTML=shown.map(a=>'<article class="education-card"><button type="button" class="education-toggle" data-edu="'+a.id+'" aria-expanded="'+learningExpanded.has(a.id)+'">'+educationIcon(a.shape,a.tone)+'<span class="edu-heading"><strong>'+a.name+'</strong><small>'+a.short+'</small></span><span class="edu-chevron">'+(learningExpanded.has(a.id)?'−':'+')+'</span></button>'+(learningExpanded.has(a.id)?'<div class="education-body"><p>'+a.long+'</p><p>'+svgEscape(INVESQUO_ACADEMY_OVERVIEW[a.id]||'')+'</p>'+(prefs.educationDetails!==false?'<p><strong>Rischi:</strong> '+a.risk+'</p><p><strong>In pratica:</strong> '+a.example+'</p><p class="edu-terms">Parole chiave: '+a.terms+'</p>':'')+academyTree(a)+'</div>':'')+'</article>').join('')||'<p class="hint">Nessun argomento trovato.</p>';
}
document.getElementById('learningGrid')?.addEventListener('click',e=>{const b=e.target.closest('[data-edu]');if(!b)return;learningExpanded.has(b.dataset.edu)?learningExpanded.delete(b.dataset.edu):learningExpanded.add(b.dataset.edu);renderEducation()});
document.getElementById('learningSearch')?.addEventListener('input',renderEducation);
document.querySelectorAll('[data-quiz]').forEach(b=>b.addEventListener('click',()=>{document.getElementById('learningQuizFeedback').textContent=b.dataset.quiz==='0'?'Esatto! I 500 € aggiunti non costituiscono rendimento di mercato.':'Non proprio: l’aumento viene dall’acquisto, non dal mercato. Il TWRR è 0%.'}));
renderEducation();

/* b.7.15: honest local recovery backups. These are not background jobs. */
let backupDirectoryHandle=null,backupInProgress=false;
const AUTOBACKUP_KEY='invesquo_auto_recovery_b712';
function selectedBackupHours(){return Number(prefs.backupHours)||0}
function updateBackupControls(){
 const selector=$('settingBackupSchedule');if(selector)selector.value=String(selectedBackupHours());
 const reduce=$('settingReduceChartMotion');if(reduce)reduce.checked=!!prefs.reduceChartMotion;
 const dense=$('settingDenseCharts');if(dense)dense.checked=!!prefs.denseCharts;
 const scale=$('settingTextScale');if(scale)scale.value=prefs.textScale==='large'?'large':'normal';
 document.body.classList.toggle('reduced-chart-motion',!!prefs.reduceChartMotion);
 document.body.classList.toggle('dense-chart-points',!!prefs.denseCharts);
 document.body.classList.toggle('large-reading',prefs.textScale==='large');
 const inf=$('autoBackupInfo');if(inf){let saved=null;try{saved=JSON.parse(store.getItem(AUTOBACKUP_KEY)||'null')}catch(_){}inf.textContent=(saved?.createdAt?'Ultima copia locale: '+new Date(saved.createdAt).toLocaleString('it-IT'):'Nessuna copia creata')+(backupDirectoryHandle?' · Cartella selezionata per questa sessione':' · Nessuna cartella esterna autorizzata')+(selectedBackupHours()?' · Ogni '+selectedBackupHours()+' h quando l’app è aperta':' · Salvataggio automatico disattivato');}
}
async function writeBackupFolder(bundle){
 if(!backupDirectoryHandle)return false;
 try{
  const status=await backupDirectoryHandle.queryPermission({mode:'readwrite'});
  if(status!=='granted')return false;
  const name='finholdra-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
  const file=await backupDirectoryHandle.getFileHandle(name,{create:true}),w=await file.createWritable();
  await w.write(JSON.stringify(bundle,null,2));await w.close();return true;
 }catch(e){return false}
}
async function makeLocalRecoveryCopy(force=false){
 if(backupInProgress||!selectedBackupHours()&&!force)return;
 let last=null;try{last=JSON.parse(store.getItem(AUTOBACKUP_KEY)||'null')}catch(_){}
 if(!force&&last?.createdAt&&Date.now()-Date.parse(last.createdAt)<selectedBackupHours()*3600000)return;
 backupInProgress=true;
 try{
  const bundle=makePortableBundle(),record={createdAt:new Date().toISOString(),bundle};
  const size=localStorageUsedBytes();
  const recoveryBytes=2*(AUTOBACKUP_KEY.length+JSON.stringify(record).length);
  if(size===null||size+recoveryBytes<3.6*1024*1024){store.setItem(AUTOBACKUP_KEY,JSON.stringify(record));}
  else {const inf=$('autoBackupInfo');if(inf)inf.textContent='Spazio locale vicino al limite: copia automatica interna saltata. Esporta un backup JSON esterno.';}
  await writeBackupFolder(bundle);updateBackupControls();
 }catch(e){const inf=$('autoBackupInfo');if(inf)inf.textContent='Salvataggio locale fallito: '+String(e.message||e).slice(0,90)}finally{backupInProgress=false}
}
$('settingBackupSchedule').onchange=e=>{prefs.backupHours=Number(e.target.value);savePreferences();updateBackupControls();if(prefs.backupHours)void makeLocalRecoveryCopy(true)};
$('chooseBackupFolder').onclick=async()=>{
 if(typeof window.showDirectoryPicker!=='function'){alert('Questo browser non supporta la selezione automatica della cartella. Usa il download JSON manuale.');return}
 try{backupDirectoryHandle=await window.showDirectoryPicker({mode:'readwrite'});await makeLocalRecoveryCopy(true)}catch(e){if(e.name!=='AbortError')alert('Cartella non autorizzata: '+e.message)}updateBackupControls();
};
$('backupNowFolder').onclick=()=>{void makeLocalRecoveryCopy(true)};
$('downloadRecoveryCopy').onclick=()=>{try{const v=JSON.parse(store.getItem(AUTOBACKUP_KEY)||'null');if(!v?.bundle)throw Error('Non esiste una copia locale');const blob=new Blob([JSON.stringify(v.bundle,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='finholdra-recupero-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),4000)}catch(e){alert(e.message)}};
for(const [id,key] of [['settingReduceChartMotion','reduceChartMotion'],['settingDenseCharts','denseCharts']])$(id).onchange=e=>{prefs[key]=e.target.checked;savePreferences();updateBackupControls()};
$('settingTextScale').onchange=e=>{prefs.textScale=e.target.value;savePreferences();updateBackupControls()};
updateBackupControls();
setInterval(()=>{if(document.visibilityState==='visible')void makeLocalRecoveryCopy()},60000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void makeLocalRecoveryCopy()});

/* Finholdra b.7.15 — PAC ledger schedules, not broker orders. */
const PAC_STORAGE_KEY='invesquo_pac_schedules_b713';
function readPacSchedules(){try{const v=JSON.parse(store.getItem(PAC_STORAGE_KEY)||'[]');return Array.isArray(v)?v.filter(x=>x&&typeof x.id==='string').slice(0,200):[]}catch(_){return []}}
function writePacSchedules(list){try{store.setItem(PAC_STORAGE_KEY,JSON.stringify(list))}catch(e){const status=document.getElementById('pacMessage');if(status){status.classList.remove('hidden');status.textContent='Impossibile salvare il PAC: '+e.message}}}
function pacDayList(raw){const a=[...new Set(String(raw).split(/[,; ]+/).map(Number))].sort((x,y)=>x-y);return a.length&&a.length<=20&&a.every(n=>Number.isInteger(n)&&n>=1&&n<=31)?a:null}
function pacRollWeekend(ymd){const d=new Date(ymd+'T12:00:00Z');if(!Number.isFinite(d.getTime()))return null;while([0,6].includes(d.getUTCDay()))d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)}
function pacDueDates(program,limit=today()){
 const out=[],start=String(program.from||''),end=String(program.until||'')||limit;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start))return out;
 const d=new Date(start+'T12:00:00Z'),last=new Date((end<limit?end:limit)+'T12:00:00Z');
 if(!(d<=last))return out;
 d.setUTCDate(1);
 // Avoid long scans after malformed or artificially ancient dates
 let count=0;
 while(d<=last&&count++<144){
  for(const day of program.days){
   const date=new Date(d);date.setUTCDate(day);
   if(date.getUTCMonth()!==d.getUTCMonth())continue;const raw=date.toISOString().slice(0,10),effective=pacRollWeekend(raw);
   if(raw>=start&&effective<=end&&effective<=limit)out.push({scheduled:raw,date:effective});
  }
  d.setUTCMonth(d.getUTCMonth()+1);
 }
 return out.sort((a,b)=>a.date.localeCompare(b.date)||a.scheduled.localeCompare(b.scheduled));
}
function pacRefreshLists(){
 const select=$('pacAsset');if(!select)return;
 const current=select.value;
 const eligible=state.assets.filter(a=>a.symbol&&Number(a.q)>=0&&a.cat!=='Conto deposito'&&a.cat!=='Risparmio postale'&&a.cat!=='Obbligazioni');
 select.innerHTML=eligible.map(a=>'<option value="'+svgEscape(a.id)+'">'+svgEscape(a.name)+' · '+svgEscape(a.symbol)+' · '+svgEscape(a.cat)+'</option>').join('');
 if(eligible.some(a=>a.id===current))select.value=current;
 const programs=readPacSchedules();
 $('pacSchedules').innerHTML=programs.length?programs.map(p=>'<div class="pac-event"><span><strong>'+svgEscape(state.assets.find(a=>a.id===p.asset)?.name||p.asset)+'</strong><small>'+p.days.join(', ')+' del mese · '+(p.mode==='eur'?eur(p.amount):entryDecimal(p.amount)+' quote')+' · dal '+shortDate(p.from)+(p.until?' al '+shortDate(p.until):'')+'</small></span><button type="button" class="btn" data-pac-remove="'+svgEscape(p.id)+'">Elimina</button></div>').join(''):'<p class="hint">Nessun PAC programmato.</p>';
 const upcoming=[];const horizon=new Date();horizon.setDate(horizon.getDate()+70);const dateLimit=horizon.toISOString().slice(0,10);
 for(const p of programs){
  const monthEvents=[];let d=new Date(p.from+'T12:00:00Z');d.setUTCDate(1);
  for(let m=0;m<24&&d.toISOString().slice(0,10)<=dateLimit;m++,d.setUTCMonth(d.getUTCMonth()+1))for(const day of p.days){
   const dt=new Date(d);dt.setUTCDate(day);if(dt.getUTCMonth()!==d.getUTCMonth())continue;const raw=dt.toISOString().slice(0,10),when=pacRollWeekend(raw);
   if(raw>=p.from&&when>=today()&&when<=dateLimit&&(!p.until||when<=p.until))monthEvents.push({date:when,label:state.assets.find(a=>a.id===p.asset)?.name||p.asset,mode:p.mode,amount:p.amount});
  }
  upcoming.push(...monthEvents);
 }
 upcoming.sort((a,b)=>a.date.localeCompare(b.date));
 $('pacEvents').innerHTML=upcoming.slice(0,12).map(x=>'<div class="pac-event"><span>'+shortDate(x.date)+' · '+svgEscape(x.label)+'<small>'+(x.mode==='eur'?eur(x.amount):entryDecimal(x.amount)+' quote')+'</small></span></div>').join('')||'<p class="hint">Nessuna prossima scadenza nei 70 giorni.</p>';
}
$('pacPanelOpen').onclick=()=>{pacRefreshLists();$('pacFrom').value=today();$('pacOverlay').classList.remove('hidden')};
$('pacAddNewAsset').onclick=()=>{$('pacOverlay').classList.add('hidden');$('newAssetOpen').click();window.__pacAddingInstrument=true;$('addToPacOnly').classList.remove('hidden');$('assetSearch').focus()};
$('pacClose').onclick=()=>{$('pacOverlay').classList.add('hidden')};
$('pacOverlay').addEventListener('click',e=>{if(e.target.id==='pacOverlay')$('pacOverlay').classList.add('hidden')});
$('pacSchedules').onclick=e=>{const b=e.target.closest('[data-pac-remove]');if(!b)return;if(!confirm('Eliminare questo programma PAC? Le transazioni già registrate rimangono.'))return;writePacSchedules(readPacSchedules().filter(p=>p.id!==b.dataset.pacRemove));pacRefreshLists()};
$('pacSave').onclick=()=>{
 const asset=state.assets.find(a=>a.id===$('pacAsset').value),mode=$('pacMode').value,amount=Number($('pacAmount').value),from=$('pacFrom').value,until=$('pacUntil').value,days=pacDayList($('pacDays').value);
 if(!asset||!asset.symbol||!['eur','qty'].includes(mode)||!(amount>0)||!Number.isFinite(amount)||!days||!/^\d{4}-\d{2}-\d{2}$/.test(from)||(until&&until<from)){alert('Controlla titolo, giorni (1–31), importo e date del PAC.');return}
 if(from<today()&&!confirm('Stai inserendo una data passata. Le vecchie operazioni verranno registrate solo se sono disponibili chiusure giornaliere verificate. Continuare?'))return;
 const list=readPacSchedules();list.push({id:'pac-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),asset:asset.id,mode,amount,days,from,until,createdAt:new Date().toISOString(),status:'active'});writePacSchedules(list);pacRefreshLists();$('pacMessage').classList.remove('hidden');$('pacMessage').textContent='PAC salvato. Quando apri Finholdra, verranno verificate le scadenze; nessun ordine reale verrà inviato.';
};
let pacCheckBusy=false,pacCheckLast=0;
async function pacCheckDue(showMessage=false){
 if(pacCheckBusy||!ACCOUNT_ID||!readPacSchedules().length)return;
 if(!showMessage&&Date.now()-pacCheckLast<300000)return;
 pacCheckLast=Date.now();pacCheckBusy=true;let done=0,pending=0;const errors=[];
 try{
  const programs=readPacSchedules(),quotes=new Map(),fxmaps=new Map();
  const now=new Date(),milanParts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now),milanHour=Number(milanParts.find(v=>v.type==='hour')?.value||0),milanMinute=Number(milanParts.find(v=>v.type==='minute')?.value||0);
  for(const p of programs){
   const asset=state.assets.find(a=>a.id===p.asset);if(!asset||!asset.symbol){errors.push('Titolo '+p.asset+' non più presente');continue}
   const due=pacDueDates(p).slice(-72);
   const unfinished=due.filter(v=>!trades.some(t=>t.pacId===p.id&&t.pacScheduled===v.scheduled));
   if(!unfinished.length)continue;
   // Trading-day close, fetched from verified historical chart only. No guessed quote.
   if(!quotes.has(asset.id))try{quotes.set(asset.id,await historicYahooCloses(asset.symbol,currencyOf(asset)))}catch(e){errors.push(asset.symbol+': '+e.message);pending+=unfinished.length;continue}
   if(currencyOf(asset)!=='EUR'&&!fxmaps.has(currencyOf(asset)))try{fxmaps.set(currencyOf(asset),await historicYahooCloses('EUR'+currencyOf(asset)+'=X',currencyOf(asset)))}catch(e){errors.push('Cambio '+currencyOf(asset)+' non disponibile');pending+=unfinished.length;continue}
   for(const occurrence of unfinished){
    const when=occurrence.date;
    // Same date: wait until after European/US session close, as applicable.
    if(when===today()){const m=/(\.MI$|\.DE$|\.PA$|\.AS$|\.L$)/i.test(asset.symbol||'');const waitUntil=m?18*60:23*60;if(milanHour*60+milanMinute<waitUntil){pending++;continue}}
    const closing=quotes.get(asset.id).get(when);
    if(!(closing>0)){pending++;continue}
    const fx=currencyOf(asset)==='EUR'?1:(()=>{const x=historicCloseOn(fxmaps.get(currencyOf(asset)),when,false);return x>0?1/x:NaN})();
    if(!(fx>0)){pending++;continue}
    const factor=asset.cat==='Obbligazioni'?100:1,qty=p.mode==='eur'?p.amount*factor/(closing*fx):p.amount;
    if(!(qty>0&&Number.isFinite(qty))){pending++;continue}
    const euro=qty*closing*fx/factor;
    const latest=state.assets.find(a=>a.id===p.asset);
    if(!latest){pending++;continue}
    // Trading ledger only. Reconcile chronologically, preserving later sales and cost basis.
    const operation={id:'pac-exec-'+p.id+'-'+occurrence.scheduled,kind:'buy',date:when,asset:latest.id,assetName:latest.name,cat:latest.cat,spent:euro,quantity:qty,price:closing,fxExecution:fx,pacId:p.id,pacScheduled:occurrence.scheduled,pacRecordedAt:new Date().toISOString(),pacPriceSource:'Yahoo Finance · chiusura giornaliera disponibile (può differire dal prezzo d’asta; NON eseguito broker)'};
    const validation=computeLedger(latest.id,[...trades,operation]);
    if(validation.error){pending++;errors.push(validation.error);continue}
    const failure=commitLedger(latest.id,[...trades,operation]);
    if(failure){pending++;errors.push(failure);continue}
    done++;
   }
  }
  if(done){save();saveTimeline();refreshBuyOptions();render()}
  if(showMessage){const status=$('pacMessage');status.classList.remove('hidden');status.textContent=done+' acquisti contabili registrati, '+pending+' scadenze in attesa del prezzo di chiusura. '+errors.slice(0,2).join(' · ')}
  pacRefreshLists();
 }finally{pacCheckBusy=false}
}
$('pacVerify').onclick=()=>void pacCheckDue(true);
if(ACCOUNT_ID){setTimeout(()=>void pacCheckDue(),6000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void pacCheckDue()});setInterval(()=>{if(document.visibilityState==='visible')void pacCheckDue()},900000)}

/* b.7.20 - full-calendar, snapshot-backed portfolio reports.
   Incomplete observations never become invented performances. */
const REPORT_WEEK=7,REPORT_MONTH=31;
function reportDateUTC(iso){return new Date(iso+'T12:00:00Z')}
function reportIso(d){return d.toISOString().slice(0,10)}
function reportWeekStart(iso){const d=reportDateUTC(iso);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return reportIso(d)}
function reportWeekEnd(iso){const d=reportDateUTC(iso);d.setUTCDate(d.getUTCDate()+6);return reportIso(d)}
function reportMonthStart(iso){return iso.slice(0,7)+'-01'}
function reportMonthEnd(iso){const d=reportDateUTC(iso.slice(0,7)+'-01');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);return reportIso(d)}
function reportCalendarWindows(kind){
 const unique=[...new Set(snapshots.filter(s=>s&&s.coverage==='all-assets'&&s.byCat&&s.byAsset&&/^\d{4}-\d\d-\d\d$/.test(s.date)).map(s=>s.date))].sort();
 if(!unique.length)return [];
 const from=kind==='week'?reportWeekStart(unique[0]):reportMonthStart(unique[0]),ends=kind==='week'?reportWeekStart(today()):reportMonthStart(today());
 const windows=[];let current=from;
 for(let i=0;current<=ends&&i<1500;i++){
  const end=kind==='week'?reportWeekEnd(current):reportMonthEnd(current);
  const n=unique.filter(d=>d>=current&&d<=end).length;
  if(n)windows.push({start:current,end,label:kind==='week'?shortDate(current)+' – '+shortDate(end):new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric',timeZone:'UTC'}).format(reportDateUTC(current)),count:n,kind});
  const next=reportDateUTC(current);if(kind==='week')next.setUTCDate(next.getUTCDate()+7);else next.setUTCMonth(next.getUTCMonth()+1);current=reportIso(next);
 }
 return windows.reverse();
}
function reportSnapshotRecords(win){
 const map=new Map();snapshots.filter(s=>s&&s.coverage==='all-assets'&&s.byCat&&s.byAsset&&s.date>=win.start&&s.date<=win.end).sort((a,b)=>a.date.localeCompare(b.date)).forEach(s=>map.set(s.date,s));
 return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function reportEntry(s,id){const x=s?.byAsset?.[id];return x&&Number.isFinite(Number(x.value))&&Number.isFinite(Number(x.quantity))?x:null}
function reportAmount(n){return Number.isFinite(n)?eur(n):'n.d.'}
function reportPercent(n){return Number.isFinite(n)?(n>=0?'+':'')+(n*100).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+'%':'n.d.'}
function reportMovements(firstDate,lastDate){return trades.filter(t=>t&&t.date>firstDate&&t.date<=lastDate&&['buy','sale'].includes(t.kind));}
function reportPerf(first,last,ops){
 if(!Number.isFinite(first)||!Number.isFinite(last))return {gain:NaN,pct:NaN,net:NaN};
 if(ops.some(t=>!Number.isFinite(Number(t.spent))))return {gain:NaN,pct:NaN,net:NaN};
 const net=ops.reduce((n,t)=>n+Number(t.spent),0),buys=ops.filter(t=>t.kind==='buy').reduce((n,t)=>n+Number(t.spent),0);
 const gain=last-first-net,base=first+buys;
 return {gain,pct:base>0?gain/base:NaN,net};
}
function reportPmcAt(id,lastDate,asset){
 if(!asset||!['ETF','ETF monetari','Azioni','Obbligazioni','ETC/ETN','Oro','Materie prime','Crypto','Valute'].includes(asset.cat))return null;
 // Current PMC is not a historical PMC when there were later trades.
 if(trades.some(t=>t.asset===id&&t.date>lastDate))return null;
 return Number.isFinite(Number(asset.pmc))?Number(asset.pmc):null;
}
function reportBuild(win){
 const all=reportSnapshotRecords(win),first=all[0],last=all.at(-1);
 if(!first||!last||all.length<2)return {error:'Servono almeno due giornate osservate nella settimana o nel mese selezionato.'};
 const scope=CAT.map(x=>x[0]); // ALL categories, including hidden ones.
 const sum=(s,cat)=>Number(s.byCat?.[cat]?.value);
 if(scope.some(cat=>!Number.isFinite(sum(first,cat))||!Number.isFinite(sum(last,cat))))return {error:'Rilevazioni incomplete: il report completo non può essere calcolato.'};
 const begin=scope.reduce((n,c)=>n+sum(first,c),0),finish=scope.reduce((n,c)=>n+sum(last,c),0),ops=reportMovements(first.date,last.date);
 const total=reportPerf(begin,finish,ops),categories=scope.map(cat=>{
  const b=sum(first,cat),e=sum(last,cat),mov=ops.filter(t=>t.cat===cat),p=reportPerf(b,e,mov);
  return {name:cat,begin:b,end:e,ops:mov,...p};
 }).filter(x=>x.begin||x.end||x.ops.length);
 const ids=new Set([...Object.keys(first.byAsset||{}),...Object.keys(last.byAsset||{}),...ops.map(x=>x.asset)]);
 const assets=[...ids].map(id=>{
  const a=state.assets.find(x=>x.id===id),before=reportEntry(first,id),after=reportEntry(last,id),mov=ops.filter(t=>t.asset===id);
  const cat=a?.cat||after?.cat||before?.cat||mov[0]?.cat||'Altro';
  const name=a?.name||mov[0]?.assetName||id;
  // Missing asset in one observation can mean deleted or untracked, not zero.
  // Exception: documented acquisition with no earlier position, or disposal with no later position.
  const bought=mov.some(t=>t.kind==='buy'),sold=mov.some(t=>t.kind==='sale');
  const b=before?Number(before.value):(!before&&bought?0:NaN);
  const e=after?Number(after.value):(!after&&sold?0:NaN);
  const p=reportPerf(b,e,mov),q0=before?Number(before.quantity):(bought?0:NaN),q1=after?Number(after.quantity):(sold?0:NaN);
  const pmc=reportPmcAt(id,last.date,a),currency=a?currencyOf(a):'EUR';
  return {id,name,cat,begin:b,end:e,q0,q1,pmc,currency,mov,...p};
 }).filter(x=>x.mov.length||Number(x.begin)||Number(x.end));
 const missing=all.slice(1).reduce((n,p,i)=>n+Math.max(0,days(p.date)-days(all[i].date)-1),0);
 return {win,first,last,begin,finish,ops,...total,categories,assets,count:all.length,missing};
}
function reportColorClass(n){return Number.isFinite(n)?(n>=0?'gain':'loss'):''}
function reportPreviewRender(){
 const sel=document.getElementById('reportCalendar'),target=document.getElementById('reportPreview'),btn=document.getElementById('reportDownload');if(!sel||!target)return;
 const kind=document.getElementById('reportKind').value,win=reportCalendarWindows(kind).find(w=>w.start===sel.value);
 if(!win){target.textContent='Non ci sono periodi con rilevazioni complete. Salva almeno una rilevazione e riprova.';btn.disabled=true;return}
 const r=reportBuild(win);if(r.error){target.textContent=r.error;btn.disabled=true;return}btn.disabled=false;
 const pct=reportPercent(r.pct),amount=reportAmount(r.gain);
 target.innerHTML='<div class="sub">'+svgEscape(win.label)+' · osservazioni '+shortDate(r.first.date)+' → '+shortDate(r.last.date)+'</div><div class="report-metrics"><div><span>Inizio osservato</span><strong>'+reportAmount(r.begin)+'</strong></div><div><span>Fine osservata</span><strong>'+reportAmount(r.finish)+'</strong></div><div><span>Risultato netto flussi</span><strong class="'+reportColorClass(r.gain)+'">'+amount+'</strong></div><div><span>ROI semplice</span><strong class="'+reportColorClass(r.pct)+'">'+pct+'</strong></div></div><div class="sub">'+r.ops.filter(t=>t.kind==='buy').length+' acquisti · '+r.ops.filter(t=>t.kind==='sale').length+' vendite · '+r.count+' giornate rilevate'+(r.missing?' · '+r.missing+' giornate mancanti':'')+'</div>';
}
function reportPopulatePeriods(){
 const sel=document.getElementById('reportCalendar'),kind=document.getElementById('reportKind').value,old=sel.value,windows=reportCalendarWindows(kind);
 sel.innerHTML=windows.map(w=>'<option value="'+w.start+'">'+svgEscape(w.label)+' ('+w.count+' rilev.)</option>').join('');
 if(windows.some(w=>w.start===old))sel.value=old;reportPreviewRender();
}
// Fully local, printable, MULTI-PAGE PDF. Color denotes signed performance.
function detailedPdfReport(r){
 const clean=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,' ');
 const q=s=>clean(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
 const euro=n=>Number.isFinite(n)?n.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+' EUR':'n.d.';
 const signed=n=>Number.isFinite(n)?(n>=0?'+':'')+euro(n):'n.d.';
 const fraction=n=>Number.isFinite(n)?(n>=0?'+':'')+(n*100).toFixed(2)+'%':'n.d.';
 const color=n=>!Number.isFinite(n)?'0.68 0.75 0.82':n>=0?'0.18 0.72 0.49':'0.91 0.30 0.38';
 const fh8PdfLogoHex='ffd8ffe000104a46494600010100000100010000ffdb004300090607080706090807080a0a090b0d160f0d0c0c0d1b14151016201d2222201d1f1f2428342c242631271f1f2d3d2d3135373a3a3a232b3f443f384334393a37ffdb0043010a0a0a0d0c0d1a0f0f1a37251f253737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737373737ffc0001108004f017c03012200021101031101ffc4001c0000020203010100000000000000000000000705060204080103ffc4004c10000103030102080908090204070000000100020304051106213107121341516171b11422323673748191d10816355594a1b2c11517333442527293d223546392c2f0244453626482e1ffc4001b01000203010101000000000000000000000304000205010607ffc400341100010302030506030901000000000000010002030411051221133132417122335161c1d114a1b106233442728191e1f1f0ffda000c03010002110311003f0053d353cd57511d3d2c4f96691c1ac8d832e713cc0269dbf810b94f450cb5b75869677b72f84425fc4eae371864abef075c1f51694a66d554712a6eb237c79b1b2307f859d5d7bcfdcaf08ae93c15037c524bf51753f5fc5f653fe48fd45d4fd7f17d94ff009276a15768e5dca124bf51553f5fc5f653fe48fd45d4fd7f17d94ff9276a84d697e8f4de9bacb9bf05f1b38b0b4ff14876347bfee054cee2a650b9935559e3b05f2a2d7156b6b0d390d7cad671471b1b4632776eedcadbd0801be8040239276c3ec5033cd2544f24f33cbe591c5ef71dee24e4953da13e9e1e89df92bcbdd94857fe164e8542d76caea8f4aeef2be0bef5ff00bf547a577795f0571b930ce1084210baae84210a2884210a28b382096a656c5046e92476e6b4649574b1e8b0d2d9aee78c778818767ff63f0535a468e9e0b2d34d0c2d6cb2b3323f1b5ded53406d484d52e24b5ba2f2b5f8bca5ce8a2ec81a5f9ff492aed8e2074af17aff002dddabc4faf5210842145d42108514421085144210851459d3c32d4ccc860617c8f386b46f254f5368cbbcc0191b0c03fe23f27eecad3d2be70d0fa4fc8a6b14ad44ce8c80161e2988cd4af0c8eda8ba59df74cbecd6f654cb54d95ee903388d6600c8277e7a940261f085f4245eb0dfc2e4bc4481e5ecb94de193c93d3e790dcdca1084232d142dba0b656dc1dc5a3a6925e62e03c51da772d44cad07e6fb7d2bd0a690c6db84862156ea58768d1737b288b6e85792d75caa03473c70ed3ef3f0556bac11d35ceae9e2cf2714cf637273b0121389286fbf4dd7facc9f88a0d3cae7b8e659f84d64d5333f68792d142109b5be84210a2884210a2884210a2884210a28bb2a3f21bd8b258c7e437b16495464abd71c2dbec37d9ad56db7475069886cb2ccf201763380074677aaf7ebcaebf53d1ff71ca9dc2583f3eef5b0fef079ba82ad714f41f7238636c865c6e9ac7872bafd4f45ff003b955f5cebfb86b182960a9a78a9a081c5fc9c4e243dc460139e819f79551e29e83ee5e1046f0ac1a02e5ca91d3b14735f28e3958d7b1d200e6b86414d1a7b751d33f94a7a48227e31c664601fb92c34c79c143e9426ca46ac9cc1795c79ee133403a5bd545dc2d76ef04a890d0d371f9371e3724dce7076ee4b3b4daabef355e0b6ba592a67e29772718db81bcfde9b15ff00b8d47a2777155ee02bcf83ea9277b55e95c72b8a6b00739ed7e63e1eaa07f57fab7ea2acff00947c5465e74fddac7c97e97a09a9396cf27ca0c71b18ce3de175d28bba582d976afa2acb8d336a24a3e3185b26d6b4bb1938e73e28c23893c57a2c8b9a6cba1b52dee26cd6fb4cee85c32d964c46d70e905c467d8a56a3828d61047c716e8e5d992d8ea184fde574a0181b372f57368577205c7b71b756daea4d35c6926a5987f04cc2d3dbb7996aaeb6d4ba76dba92dcfa2ba40d91a41e248078f11e969e62b97352d92a34f5eeaad757b5f03f01e06c7b4ed6b8768c2235f9950b6c98ba5fcdfa1f4414a73a8bd2fe6fd0fa20a5164bf88af9ed4f7efea7ea933153cd55398a9a27caf276358dc952d1692bd48dcf82b59fd52347e69876cb6d2db2010d2c61b9f29e7ca71e9256e269d566fd90b666c7a4cd689a2de694d5d61ba50b4bea28e40c1bdedc380f68dca353ad5235b58238a3372a28c3003feb31a3036ff0010fcd5e2a9cc6ce4d50e33b6788e51627710a96859471be591b1c6d2e7bc80d68de494c5d39a5a9edf1b67ae6366ab3b7076b63ece93d68f2cad8c5cad1acad8e91977ea4ee0a954561ba56b43a9e8e42c3b9cef141f7add768ebc86e44319ea128ca662f5266adfc82c0763d504f65a00fdd27abad95d407ff194b2c43f98b761f6ee5a89d5231b230b246b5cd70c16b8641546d53a55b046faeb63711b7c69211fc23a5bd5d48d154871b3b45a1458cb267064a2c4f3e5fd283d2de70d0fa4fc8a6ba54696f38687d27e4535ca155f184863ddfb7a7a9557e10be858bd61bf85c976987c217d0917ac37f0b954b4e5924bcd596e4b29e3c19641cdd43aca353b8362b95a184cac8a873bcd802547d2d2d4564bc952c324afe86372a5e3d21797b7269d8cea748dca6350d1535053b60a485b1b0740da7ac9e72b6105d56ebf642466c7a42efba6803cd28ee165b8db9bc6aba57b59fce3c66fbc2bde82f37dbe95eac0f635ed2c7b439ae182d232085af6fa082dd0ba1a5696c65e5e1bd19e61d4a924fb46588d52f558a1aaa7d9bc58dc1d372da4a5bb412546a1ad860617c8faa9035a3793c629b496b49e7d9f5d7f7956a636cc7c91306796195c3936eb47e6e5e3eaf9bdcb5eb6d35f431096b29648985dc50e70d99e8fb93816a5c6df05c1b032a5bc78e2944bc43b9c402003d5b55855bafa8458f1e9330ced16f2ba5850586e77060929a91e633b9ee21a0f6677adb9348de9832299affe991bf14cd0000001803700a1f55dd3f45da9ee8dd89e5f123ea3ce7d9f05054c8e75805198cd4cd28646d1af5f74b16534ef99d0c713df234905ac6f18fdca460d37789c65941281ff00bf0def574d156a1436c13c831515187bb3bc37987e7ed5625692a88366845aac6dd1c8591341b7329663475e48cf2118ea3285af51a62f34ede33e85ee1ff0c87fdc0a6aa10c55bd2adc76a41d40f9fba4a3d8e8dc58f696b86c21c3042f1366f365a3bb40e6cf186cb8f12668f19a7f31d495b70a39682b25a5a818923760f41e829a8a612755b94188b2ac10059c392ec38fc86f62c9631f90dec5921ad75e6074046074051d51a82cb4b33e0a9bbd0432b0e1d1c952c6b9a7ac12be7f39f4ff00d796cfb5c7f15db1514ae074048ef9428c5d6d1e824fc41373e73e9ffaf2d9f6b8fe2935c3bdca86e373b53adf5b4f54d642f0e304ad7869c8df82acc1da5576e541d31e7050fa509b094fa63ce0a1f4a1360a5eaf882f218f77ede9ea56bd7fee351e89ddc557f80af3e0faa49ded560aff00dc6a3d13bb8aaff013e7c1f5393bdaad4dc2e4dfd9ee17f51eaba2543eacd4547a5ecb2dcebb2e6b486c71b7ca91e77347fdee054c24efca22678a6b2420ff00a6e7cce23a480d03bcfbd15a2e6cbd29360abb59c346a496a8c94b0d0c1083b223197eceb39dbecc267706daf62d634d3453c2da7b8d380648d872d7b4ff001373b77ef1cdb1734a60f0192399ae9ad69c07d2c8d7758d87f245734595038dd745ef48df94250b22bada6bd8dc3a685f13cf4f10823f194f249bf944fecec5fd53f74686ce25676e51fa5fcdfa1f4414a28ad2fe6fd0fa20a55673f88af9d54f7efea7eaaa3a8f571a0aa7d25be364924671248fda01e8039d46dbb5c55b2768b8471c9093e3160e2b9bf91556a87ba59e491e72e7bcb8f692b05a4da7606d885eba3c2a99b10639b73e3cd3aa37b658db2308731c039a47382be35f00a9a1a881c32248dcdf785a9a69c5d60a124e4f2207bb62913b8acd232b978f78314a40e47e8a89c1f5b5b354cd5f2b7221f123cff31de7d83bd5f1406866359a7e3237be47b8f6e71f929e27009449dc5d214de272ba5aa7df969fc280d45a9e0b43fc1e2672d538c96e7019dbf055d8b5cdc5b2e648299ecfe5008fbf2ab7593beaaae69e524be47971cf595f24eb29d81b6217a3a7c26999180f6dcf329b564bcd35e698cb4e4b5edd9246eded3f0eb52246761da12cb43d43e1d410c6c278b335cc70e91827bc2669494f188df60bce62548da59f23771d425f9b6b6d7ae29a2886217c8248c74020ecf61ca602aedfe30351d8a41e517bda7b001f12ac4a4aecc1a4f8295d3199913ddbf2fd090aafc217d0b17ac37f0b94ae9bb78b6da20871891c38f21e971f86ef62d2d64c6c947431bbc9757460f61cab0951cefbb0d5c925228d918dc492b17bdb1b1cf7b835ad19249d802a4dd35c3c4ce65b20616038e565c9e3760e652daeaa1f0585cd61239591b1b88e8da7f24b546a685ae199cb4b08c3e299865945f900ae96bd72f333597381823271ca440f8bda39d5da37b248db246e0e63802d703b084954cad0950f9ac2d6c849e4a4731a4f46c3f9a9530b5a33354c5f0f8a16096216d6c42b125ad2f9f67d75fde53292d697cfb3ebafef2a94fb9dd12d84f0cdfa4a652c259190c4f965706b180b9ce3b800b355ed7333a2d3f2061c72923587b37fe480c6e6700b369e2db4ad8fc4a86b8eb99795736dd4cce4c1c07cb925dec1b9405caf75173ad82a2b238dcd871889b90d3b727dea31651b1f2c8d8e36973dc70d681924ad46c4c66e0bdb43434d06ac6d8f8ab2d46b7b8bff00630d3c43fa4b8f7ad09b545e65df5ae68e8635adee0ac167d11188db2dd64739e76f2319c01da79fd8ac10e9eb444dc36df01feb6f1bbd2c65819a017590facc36039591e6fdbd4a5c32fd7663b8c2e1519eb7923dc55c747ea39ee923e8eb78ae998ce3b64031c61cf91d3b54cbec76a70c1b752fb220114564b750d4f845253362978a5b96b8ee3d59c2a492c6f6db2ea95aaafa39e22dd9d9dc8e8a40aacea3b0c772af6ce720f261a71cf8255957c2a3cb1d880c7169b85994d33e17e661b14e78fc86f62c962cf21bd8b24eafa32e58e12bcfbbd7ac9ee0ab4acbc25f9f77af583dc15693237209de84210baa293d31e7050fa509b094fa6486dfa84b88004a3694d56cd13cf15b231c7a03814855f105e571e076cde9eabe55ff00b8d47a2777155fe02bcf83ea9277b54edc258fc12a1a64603c9bb671874282e02bcf83ea9277b55a9b85c9afb3e2cd7fedeaba2526be513e4d8bb67ffa139526be513e4d8bb67ffa1199c4bd23b724c2bff01fe7e45eaf277054057fe03fcfc8bd5e4ee08cedc5506f5d1a937f289fd9d8bfaa7ee8d39126fe513fb3b17f54fdd1a0b3895ddb947e97f37e87d10528145e97f37e87d10529ceb39fc457ceaa7bf7f53f54947f96eed5e2f5fe5bbb578b617d006e4d8d2fe6fd0fa20a4cee2a334bf9bf43e8bf3524edc5643f88af9fd4f7efea7eaab1c1fd4b65b54b4e4f8f0ca76751da3efcab4255e9abb7e88ba095f9303fc4940e8e9f62694523268db244e0f63865ae0720845a8616befc8a7b17a6745505fc9dafba57ea8b3cb6bb8c8e0c3e0d2b8ba27f36dfe1ed0a193a268629e37473c6c92376f6bdb907d8a3a3d3b688e4e519410f1b39da323dc7622b2ac06d9c13f4f8e86c61b2b4923c39aace83b44be106e73b0b636b4b61c8f289de7b31deaf28000181b82d4badc60b5d1bea6a1db1a3c56f3b8f300977bccaebac7a99e4ad9f35b53a00a02f554d9758da699a73c8e4bba8bbff00c015ad2bec7552d6eaca6aa9ce64926e31ead8762681579d9932b7c93389c1b0d9c7e0df52ab5af24315aa9e46f94caa6387b03958a09995104734672c91a1cd3d4556b842fa122f586fe172f9e84bcb26a5fd1b3bb134593167f89bd1da3b942c2610e1c94753ba4c3db237f2937e854dea1b6fe94b54d4cd2049e5464ff30ddf0f6a544f0c94f2ba29d8e648c38735c304274ad3aeb65157e3c32962948dce2dda3dbbd4867d9e8772ee1d89fc202c70bb4fc928a18649e56450b1cf91e70d6b464929ada76dc6d56a8699c41936ba423f98ff00de3d8bef436ba1a0c9a3a58a2277b80dbefdeb6d49a7da68372988e27f16031a2cd1f3425b52f9f67d75fde53252da97cfb3ebafef2bb4fb9dd15b09e19bf494ca55ad7ff408f4cdee2acaab5aff00e811e9dbdc50a1ef024f0ffc547d425c2b4f07d46c9ee9354bc67c1d9e2f539db33ee055595af83cab6c5729e99e4033c796f596f37b89f72d19efb3365ebb12cdf08fcbbedfefc930154754eaa9edf5a68a858ce3b002f91e3382467002b7955cd43a562bb547854531827200765b96bb1bbdab3e12c0eedee5e4f0f753b66bd40ecfaaaa0d617a076d430f5189bf0564d2178b9dda798d572669e36e38cd660971dc3dd95a749a0c0783575bc668ded899827da7e0add4547050d3b29e96311c4ddc0779eb4699f15acc0b4310a9a1319640c049e76b597d97c2a0f8e3b16c2d6a8f2c762542c466f5706f0b3a3835a0dc65ce3fdb49fe2bd3c2d68ee6b8cbf6693fc5736216b6cc2fa3e72a6f5adc69aedaaee75f44f2fa79e62e8dc5a46460731508842b85542108514429cd15e71d2f63ff0009506a574b5543477ba79ea1fc48da1d97609ded2399524d5852d560ba9de06fb1fa2f85f8e6f75e7ff90ffc4558f82abf5bb4eea9f0ebb4c62a7f077b38c185db4918d806799566f12b27bad64b11e331f33dcd38c6412b5175a3b2022c1711b7a05d27fad9d1df594bf6593fc52db863d5d66d502d42cd50f9bc1ccbca71a27331c6e2e3781d052d50a06006e8a5c4a15b782ebe5069ed571d7dd657454c217b0b830bb69ddb06d55242b117165c5d27fad9d1bf5949f6593fc52df863d5d66d50cb50b354ba6f0732f29c689ccc71b898de07414b442a86006eba5c4abfd8b535aa8ed14b4f3d439b246cc38726e383ee5bff003becbfee9dfda77c12c508269584df558cfc129dee2e24ebe63d97ae397123a578842616babfd8f53daa8ed1494f3d4384b1b30e02371c1f72df76afb2e36553b3d1c93be096284b9a56137d5643f04a77b8b893aebbc7b20ef2a6ec3a96aecf88bf6d4d9c989c77761e65088477343858ad39618e6664905c267d16adb4553471e7303f9db2b71f7ee5b6ebeda5ade31b8d363aa404a52a12c6919c8ac7760301370e21312e3ad2df4ed7368c3ea64e62016b7de7e0a9175bad5dd6a395ab9338f2583635a3a82d2422c70b19b93f4b87c14dab06be277adfb0d4c54778a5a8a8771628df971c67015fc6afb29df54efed3be0962852485b21b955abc3a1aa7073c9b8d34ff0015c757dfadf73b6320a399cf904c1c41611b304738eb5508a57c3236589e58f61cb5cd3820ac50acc8c31b9423d352b29e3d9b7779abc59f5bb388d8aeb190e1b3968c641ed1f05618f505a246f19970a7c1fe67f14fde94c841752b09b8d167cd8253c8eccdbb7a6e4cbb96aeb65246ee424f09979991eef6bb72d2b26afa4f047bae9505b50e95cee2b637101bcc0615050ba29596b2b3705a611e4d7af34cef9df65ff74efed3be0a95057d3b3559af73cf83f853a4e3714f9249c1c6f50c856640d65edcd169f0c8600e0d27b42dff006899df3becbfee9dfda77c142eaebfdb6e569f07a39cbe4e55aec16386c19e90a968556d331a410870e0f4f1482469371d3d90b28659209592c2f2c918439ae1bc158a130b548be855fad1ada9a48db1dd1a62946c32b1b96bbaf0368538dbf5a5ede30b85363ae400fb8a52a12cea561371a2c69703a77bb33496a6756eacb4d2b4f12733bf99b1373f7ee50343abdd3de84d5cf34f44d638363682eda77138de553d0acda66016448b07a68da46a49e7ec99bf3beca7ff0032efed3be0be336acb3b9f96d43cecff00d377c12e10abf08cf354181d30e67f91ecbfffd9';const fh8PdfLogoW=380;const fh8PdfLogoH=79;
 const pages=[];let commands=[],y=0;
 const add=(x,t,size=9,c='0.88 0.92 0.98')=>{commands.push(c+' rg BT /F1 '+size+' Tf 1 0 0 1 '+x+' '+y+' Tm ('+q(t)+') Tj ET')};
 const newPage=()=>{if(commands.length)pages.push(commands.join('\n'));commands=['0.045 0.088 0.15 rg 0 0 595 842 re f'];commands.push('q 175 0 0 36 36 782 cm /Im1 Do Q');y=795;add(228,'REPORT '+(r.win.kind==='week'?'SETTIMANALE':'MENSILE')+' / '+r.win.label.toUpperCase(),13,'0.28 0.86 0.73');y-=33;add(36,'Periodo calendario: '+r.win.start+' / '+r.win.end+'   |   Osservato: '+r.first.date+' / '+r.last.date,9);y-=17;add(36,'Generato '+new Date().toLocaleString('it-IT')+'  -  Valori lordi in EUR, salvo indicazioni',9);y-=30;};
 const ensure=(h=20)=>{if(y<h+43)newPage()};
 const heading=t=>{ensure(45);y-=8;add(36,t,12,'0.30 0.83 0.91');y-=23};
 const line=(left,right,clr)=>{ensure(17);add(40,clean(left).slice(0,47),9);add(361,clean(right).slice(0,35),9,clr||'0.87 0.91 0.98');y-=17};
 const wrapped=(txt,clr)=>{const words=clean(txt).split(' ');let l='';for(const w of words){if((l+' '+w).length>98){ensure(16);add(42,l,8,clr||'0.73 0.79 0.87');y-=14;l=w}else l+=(l?' ':'')+w}if(l){ensure(16);add(42,l,8,clr||'0.73 0.79 0.87');y-=16}};
 newPage();heading('FOTOGRAFIA DELL INTERO PATRIMONIO');
 line('Valore a inizio osservazione',euro(r.begin));line('Valore a fine osservazione',euro(r.finish));line('Acquisti',euro(r.ops.filter(t=>t.kind==='buy').reduce((a,t)=>a+Number(t.spent||0),0)));
 line('Vendite',euro(r.ops.filter(t=>t.kind==='sale').reduce((a,t)=>a+Math.abs(Number(t.spent||0)),0)));
 line('Risultato netto dei flussi',signed(r.gain),color(r.gain));line('ROI semplice del periodo',fraction(r.pct),color(r.pct));
 line('Rilevazioni / giorni non osservati',r.count+' / '+r.missing);
 wrapped('Il rendimento esclude acquisti e vendite documentati, ma non e un TWRR. Per periodi incompleti usa solo le prime e ultime osservazioni disponibili. Non stima prezzi mancanti.');
 heading('RENDIMENTO PER CATEGORIA');
 for(const c of r.categories){ensure(46);line(c.name+' - Inizio / Fine',euro(c.begin)+' / '+euro(c.end));line('  Flussi netti / Risultato',euro(c.net)+' / '+signed(c.gain),color(c.gain));line('  ROI categoria',fraction(c.pct),color(c.pct));y-=6}
 heading('DETTAGLIO PER TITOLO');
 for(const a of r.assets){ensure(110);wrapped(a.name+'  ['+a.cat+']', '0.95 0.97 1');line('Inizio / Fine',euro(a.begin)+' / '+euro(a.end));line('Quote inizio / fine',Number.isFinite(a.q0)?String(a.q0):'n.d.');line('  Quote finali',Number.isFinite(a.q1)?String(a.q1):'n.d.');line('Risultato al netto flussi',signed(a.gain),color(a.gain));line('ROI / PMC',fraction(a.pct)+' / '+(a.pmc===null?'n.d.':a.pmc.toLocaleString('it-IT',{maximumFractionDigits:6})+' '+a.currency),color(a.pct));
  for(const t of a.mov){ensure(22);wrapped('  '+t.date+' '+(t.kind==='buy'?'ACQUISTO':'VENDITA')+'  '+Number(t.quantity||0).toLocaleString('it-IT',{maximumFractionDigits:8})+' quote  -  '+euro(Math.abs(Number(t.spent||0))))}
  y-=9;
 }
 heading('CRITERI E LIMITI');
 wrapped('Rendimento netto flussi = valore finale - valore iniziale - acquisti + vendite. ROI semplice = risultato / (valore iniziale + acquisti). Non e un rendimento time-weighted e non considera correttamente l effetto del tempo dei flussi.');
 wrapped('PMC riportato quando disponibile e quando nessuna operazione successiva alla fine osservata ne modifica il significato storico. Le posizioni prive di osservazioni complete sono indicate n.d.');
 wrapped('Trasferimenti fra categorie, rettifiche manuali, interessi, dividendi e spese non registrati come movimenti possono alterare il risultato; non interpretare il report come rendiconto fiscale.');
 pages.push(commands.join('\n'));
 const objs=[null,'<< /Type /Catalog /Pages 2 0 R >>',null],kids=[];
 objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');const font=3;
 const fh8PdfImId=objs.length;objs.push('<< /Type /XObject /Subtype /Image /Width '+fh8PdfLogoW+' /Height '+fh8PdfLogoH+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length '+(fh8PdfLogoHex.length+1)+' >>\nstream\n'+fh8PdfLogoHex+'>\nendstream');
 for(let i=0;i<pages.length;i++){
  const pageId=objs.length,streamId=pageId+1,kid=pageId+' 0 R';kids.push(kid);
  objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 '+font+' 0 R >> /XObject << /Im1 '+fh8PdfImId+' 0 R >> >> /Contents '+streamId+' 0 R >>');
  const v=pages[i]+'\n';objs.push('<< /Length '+v.length+' >>\nstream\n'+v+'endstream');
 }
 objs[2]='<< /Type /Pages /Count '+pages.length+' /Kids ['+kids.join(' ')+'] >>';
 let pdf='%PDF-1.4\n';const offsets=[0];for(let i=1;i<objs.length;i++){offsets[i]=pdf.length;pdf+=i+' 0 obj\n'+objs[i]+'\nendobj\n'}
 const xref=pdf.length;pdf+='xref\n0 '+objs.length+'\n0000000000 65535 f \n';for(let i=1;i<objs.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';pdf+='trailer\n<< /Size '+objs.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 return new Blob([new TextEncoder().encode(pdf)],{type:'application/pdf'});
}
document.getElementById('reportKind').addEventListener('change',reportPopulatePeriods);
document.getElementById('reportCalendar').addEventListener('change',reportPreviewRender);
document.getElementById('reportDownload').addEventListener('click',()=>{
 const kind=document.getElementById('reportKind').value,sel=document.getElementById('reportCalendar').value,win=reportCalendarWindows(kind).find(w=>w.start===sel),status=document.getElementById('reportFeedback');
 if(!win){status.textContent='Non esistono osservazioni per questo periodo.';return}
 const r=reportBuild(win);if(r.error){status.textContent=r.error;return}
 try{const blob=detailedPdfReport(r),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='finholdra_'+kind+'_'+win.start+'.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000);status.textContent='Report scaricato: '+win.label+' ('+r.count+' rilevazioni).';}catch(e){status.textContent='Impossibile generare il PDF: '+String(e?.message||e)}
});
reportPopulatePeriods();
window.finholdraPublicView=()=>({assets:state.assets.filter(a=>filter[a.cat]).map(a=>({id:a.id,name:a.name,cat:a.cat,symbol:a.symbol||'',isin:a.isin||'',value:val(a),cost:cap(a),currency:a.currency||'EUR',country:a.country||''})),total:totalValue(),capital:activeAssets().reduce((sum,a)=>sum+cap(a),0),today:new Date().toISOString()});
