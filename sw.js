const CACHE='last-city-v5';
const ASSETS=['/','/index.html','/style-core.css','/style-ui.css','/game-data.js','/game-meta.js','/game-state.js','/game-ui.js','/game-wave.js','/game-combat.js','/game-render-world.js','/game-render-units.js','/game-main.js','/manifest.webmanifest','/apple-touch-icon.png','/icon-192.png','/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res;}).catch(()=>caches.match('/index.html'))))});
