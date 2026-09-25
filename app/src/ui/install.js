/**
 * "Uygulama olarak yükle" desteği.
 *   • Android / masaüstü Chrome ve Edge: tarayıcı `beforeinstallprompt` olayını verir; kendi
 *     düğmemizden yükleme penceresi açılır.
 *   • iPhone / iPad (Safari): böyle bir olay yok; kullanıcıya Paylaş → Ana Ekrana Ekle anlatılır.
 *   • Zaten yüklü (ana ekrandan açılmış): hiçbir şey gösterilmez.
 *
 * state: 'installed' | 'available' | 'ios' | 'unsupported'
 */
export function createInstaller({ onChange } = {}) {
  let deferred = null;
  let installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // tarayıcının kendi şeridi yerine kendi düğmemiz
    deferred = event;
    onChange?.('available');
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    onChange?.('installed');
  });

  return {
    get state() {
      if (installed) return 'installed';
      if (deferred) return 'available';
      return ios ? 'ios' : 'unsupported';
    },
    /** Yükleme penceresini açar. @returns {Promise<boolean>} kabul edildi mi */
    async install() {
      if (!deferred) return false;
      const prompt = deferred;
      deferred = null;
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      onChange?.(outcome === 'accepted' ? 'installed' : 'unsupported');
      return outcome === 'accepted';
    },
  };
}
