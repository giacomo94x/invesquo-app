// Simple infrastructure heartbeat: no account or portfolio data is accessed.
exports.handler = async () => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify({service:'invesquo-netlify-functions',ok:true,checkedAt:new Date().toISOString()}),
});
