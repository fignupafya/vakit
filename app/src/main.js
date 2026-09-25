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

// Service worker: uygulama dosyalarını saklar; ana ekrana eklenen uygulama internet yokken de açılır.
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('[vakit] service worker kaydedilemedi:', error));
  });
}
