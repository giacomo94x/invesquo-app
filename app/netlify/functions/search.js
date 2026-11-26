// Public security-symbol keyword search for Netlify deployments.
// Uses two independent market directories; prices are never synthesized here.
const clean = s => String(s ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
const venueSuffix = { MIL: '.MI', MILAN: '.MI', BIT: '.MI', XETR: '.DE', FWB: '.F', LSE: '.L', EURONEXT_PARIS: '.PA', SIX: '.SW', TSX: '.TO', ASX: '.AX', BME: '.MC' };
function convert(r) {
  const venue = clean(r.exchange || r.source_id), ticker = clean(r.ticker || String(r.symbol || '').split(':').at(-1));
  if (!ticker) return null;
  const suffix = venueSuffix[venue.toUpperCase()] || '', symbol = /\.[A-Z]{1,4}$|[=^]/i.test(ticker) ? ticker : ticker + suffix;
  const type = clean(r.type).toLowerCase();
  const currency = clean(r.currency_code || r.currency) || (['.MI', '.DE', '.PA'].includes(suffix) ? 'EUR' : undefined);
  return { symbol, shortname: clean(r.description || r.name || ticker), longname: clean(r.description || r.name || ticker), exchange: venue, exchDisp: venue, currency, isin: clean(r.isin), quoteType: type === 'stock' ? 'EQUITY' : type === 'fund' || type === 'etf' ? 'ETF' : type === 'crypto' ? 'CRYPTOCURRENCY' : type === 'futures' ? 'FUTURE' : type === 'bond' ? 'BOND' : type === 'forex' ? 'CURRENCY' : type.toUpperCase(), referenceOnly: true, source: 'TradingView' };
}
async function json(url, headers, ms = 5200) {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), ms);
  try { const response = await fetch(url, { headers, signal: controller.signal }); if (!response.ok) throw Error(`HTTP ${response.status}`); return await response.json(); }
  finally { clearTimeout(timeout); }
}
exports.handler = async event => {
  const q = String(event.queryStringParameters?.q || '').trim().slice(0, 90);
  const headers = { 'Cache-Control': 'public, max-age=90', 'Content-Type': 'application/json; charset=utf-8' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  if (q.length < 2) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Inserisci almeno due caratteri' }) };
  const yahoo = 'https://query1.finance.yahoo.com/v1/finance/search?q=' + encodeURIComponent(q) + '&quotesCount=50&newsCount=0';
  const yahooIT = yahoo + '&region=IT&lang=it-IT';
  const tvBase = 'https://symbol-search.tradingview.com/symbol_search/v3/?text=' + encodeURIComponent(q) + '&hl=1&lang=en&search_type=undefined&domain=production';
  const tv = tvBase+'&exchange=';
  const tvItalia = tvBase+'&exchange=MIL';
  const tvItalianETF = tvBase+'&exchange=BIT';
  const calls = await Promise.allSettled([
    json(yahoo, { 'User-Agent': 'Mozilla/5.0 (compatible; Finholdra/1.0)', 'Accept': 'application/json' }),
    json(yahooIT, { 'User-Agent': 'Mozilla/5.0 (compatible; Finholdra/1.0)', 'Accept': 'application/json' }),
    json(tv, { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }),
    json(tvItalia, { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }),
    json(tvItalianETF, { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' })
  ]);
  const results = [];
  for (const result of calls.slice(0,2)) if (result.status === 'fulfilled' && Array.isArray(result.value.quotes)) results.push(...result.value.quotes);
  for (const result of calls.slice(2)) if (result.status === 'fulfilled' && Array.isArray(result.value.symbols)) results.push(...result.value.symbols.map(convert).filter(Boolean));
  const unique = new Map(); for (const r of results) { const id = String(r.symbol || '').toUpperCase(); if (!id) continue; if (!unique.has(id) || (unique.get(id).referenceOnly && !r.referenceOnly)) unique.set(id, r); }
  const quotes = [...unique.values()].slice(0, 90);
  return { statusCode: quotes.length ? 200 : calls.every(x => x.status === 'rejected') ? 503 : 200, headers, body: JSON.stringify({ quotes, sources: calls.map((r, i) => ({ name: i < 2 ? (i ? 'Yahoo Italia' : 'Yahoo') : 'TradingView', available: r.status === 'fulfilled' })) }) };
};
