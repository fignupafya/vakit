/*
 * Vakit — service worker. Uygulamanın kendi dosyalarını cihazda tutar; internet yokken de açılır.
 *
 *  • Uygulama dosyaları: önce ağ, olmazsa cihazdaki kopya. Yeni sürüm yayınlanınca hemen gelir;
 *    eski ve yeni dosyalar karışmaz.
 *  • İlk açılışta sayfa, yüklediği bütün dosyaların listesini gönderir ("warm"); hepsi hemen kaydedilir.
 *    Böylece uygulama ilk açılıştan sonra bile internetsiz çalışır.
 *  • Yazı tipleri: cihazdaki kopya hemen, arkada tazelenir.
 *  • Vakit ve konum API'leri buradan geçmez; uygulama onları kendisi saklıyor.
 */

const CACHE = 'vakit-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './assets/icon-192.png', './assets/favicon.svg'];
const NETWORK_TIMEOUT_MS = 4000;
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'warm' && Array.isArray(event.data.urls)) event.waitUntil(warm(event.data.urls));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) event.respondWith(networkFirst(request));
  else if (FONT_HOSTS.includes(url.hostname)) event.respondWith(cacheFirstRefresh(request, event));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const navigation = request.mode === 'navigate';
    const hit = (await cache.match(request, { ignoreSearch: navigation, ignoreVary: true }))
      ?? (navigation ? await cache.match('./', { ignoreVary: true }) : undefined);
    return hit ?? Response.error();
  }
}

async function cacheFirstRefresh(request, event) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, { ignoreVary: true });
  const refresh = fetch(request)
    .then((response) => { if (response.ok) cache.put(request, response.clone()); return response; })
    .catch(() => hit);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return (await refresh) ?? Response.error();
}

/** Sayfanın yüklediği dosyaları kaydeder (zaten kayıtlı olanları atlar). */
async function warm(urls) {
  const cache = await caches.open(CACHE);
  await Promise.all(urls.map(async (href) => {
    try {
      const url = new URL(href);
      const sameOrigin = url.origin === self.location.origin;
      if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;
      if (await cache.match(href, { ignoreVary: true })) return;
      const response = await fetch(href, sameOrigin ? {} : { mode: 'cors', credentials: 'omit' });
      if (response.ok) await cache.put(href, response);
    } catch {
      /* internet yoksa bir dahaki açılışta */
    }
  }));
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}
