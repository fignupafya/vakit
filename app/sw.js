/*
 * Vakit — service worker. Uygulamanın kendi dosyalarını saklar; internet yokken de açılır.
 *
 *  • Uygulama dosyaları: önce ağ, olmazsa saklanan kopya. Yeni sürüm yayınlanınca hemen gelir;
 *    eski ve yeni dosyalar karışmaz.
 *  • Yazı tipleri: saklanan kopya hemen, arkada tazelenir.
 *  • Vakit ve konum API'leri buradan geçmez; uygulama onları kendisi saklıyor.
 */

const CACHE = 'vakit-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './assets/icon-192.png', './assets/favicon.svg'];
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) event.respondWith(networkFirst(request));
  else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') event.respondWith(cacheFirstRefresh(request, event));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const navigation = request.mode === 'navigate';
    const hit = (await cache.match(request, { ignoreSearch: navigation })) ?? (navigation ? await cache.match('./') : undefined);
    return hit ?? Response.error();
  }
}

async function cacheFirstRefresh(request, event) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => { if (response.ok) cache.put(request, response.clone()); return response; })
    .catch(() => hit);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return (await refresh) ?? Response.error();
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}
