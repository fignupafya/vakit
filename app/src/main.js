import { startApp } from './app.js';

const root = document.getElementById('app');

try {
  startApp(root);
} catch (error) {
  console.error(error);
  root.innerHTML =
    '<div class="boot-msg"><h1>Vakit başlatılamadı</h1>' +
    '<p>Beklenmeyen bir hata oluştu. Ayrıntılar tarayıcının geliştirici konsolunda.</p></div>';
}

/*
 * Service worker: uygulama dosyalarını cihazda tutar; internet yokken de açılır.
 * Kayıttan sonra, sayfanın o ana kadar yüklediği bütün dosyaların listesi ona gönderilir; böylece
 * ilk açılıştan hemen sonra bile internetsiz çalışılabilir (aksi hâlde ancak ikinci açılışta olurdu).
 */
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js');
      const registration = await navigator.serviceWorker.ready;
      setTimeout(() => registration.active?.postMessage({ type: 'warm', urls: loadedFiles() }), 1500);
    } catch (error) {
      console.warn('[vakit] service worker kaydedilemedi:', error);
    }
  });
}

function loadedFiles() {
  const urls = new Set([new URL('./', window.location.href).href, new URL('./index.html', window.location.href).href]);
  for (const entry of performance.getEntriesByType('resource')) urls.add(entry.name.split('#')[0]);
  return [...urls];
}
