// Finholdra: minimal function reachability check. This does not verify market providers.
exports.handler = async () => ({
  statusCode: 200,
  headers: {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},
  body: JSON.stringify({ok:true,service:'invesquo-netlify-functions',scope:'endpoint-only'})
});
