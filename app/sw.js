// Finholdra beta 9.9.42: refresh versioned icons after a new deployment.
const CACHE='finholdra-beta-9.9.42';
const FILES=['./','./index.html','./privacy.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./finholdra-blu.svg','./finholdra-bianco.svg','./finholdra-header-bianco.svg','./finholdra-header-blu.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 const u=new URL(e.request.url);
 if(e.request.mode==='navigate'||/\/(icon-192|icon-512)\.png$/.test(u.pathname)){
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request)));
  return;
 }
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
