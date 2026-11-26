// Fast public catalogue lookup; no OpenFIGI calls here. New queries queued asynchronously.
const C=require('./catalog-core');
exports.handler=async event=>{
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=60'};
 if(event.httpMethod!=='GET')return {statusCode:405,headers,body:JSON.stringify({error:'Method not allowed'})};
 const q=C.normalise(event.queryStringParameters?.q);
 if(q.length<2||q.length>80)return {statusCode:400,headers,body:JSON.stringify({quotes:[],error:'Ricerca non valida'})};
 const data=await C.read(q);
 // Each query is queued at most once per 24h when absent or stale.
 if(!data||Date.now()-data.updatedAt>86400000)await C.queue(q);
 return {statusCode:200,headers,body:JSON.stringify({quotes:C.unique(data?.quotes||[]),source:'Finholdra · catalogo',updatedAt:data?.updatedAt||null,queued:!data||Date.now()-data.updatedAt>86400000,persistent:!!C.store()})};
};
