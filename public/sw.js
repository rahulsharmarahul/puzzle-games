const VERSION = /*VERSION*/"dev";
const CACHE = `puzzle-zone-${VERSION}`;
const FILES = /*PRECACHE*/[];
const root = new URL('./', self.location.href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(f => new URL(f, root).href))));
});
self.addEventListener('message', event => { if (event.data === 'ACTIVATE') self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('puzzle-zone-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return;
  // Only precached application files: cache growth is bounded and no user data enters it.
  event.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(event.request, { ignoreSearch: true, ignoreVary: true });
    if (hit) return hit;
    try { return await fetch(event.request); }
    catch (error) { if (event.request.mode === 'navigate') return (await cache.match(new URL('index.html', root))) || Response.error(); throw error; }
  }));
});
