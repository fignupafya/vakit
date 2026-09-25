const LAST_KEY = 'vakit:theme:last';

/**
 * Tema denetleyicisi. Kipler:
 *   system → işletim sisteminin açık/koyu tercihi (değişince anında izler)
 *   light / dark → sabit
 *   sun → seçili konumda güneş doğmuşsa açık, akşam vaktinden sonra koyu
 * `forced` ('light' | 'dark') verilirse ayar ne olursa olsun o kullanılır (adres çubuğunda ?theme=).
 */
export function createThemeController({ getMode, forced = null }) {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pinned = forced === 'light' || forced === 'dark' ? forced : null;
  let sunUp = null;
  let animTimer = 0;

  function resolve() {
    if (pinned) return pinned;
    const mode = getMode();
    if (mode === 'light' || mode === 'dark') return mode;
    if (mode === 'sun') {
      if (sunUp !== null) return sunUp ? 'light' : 'dark';
      const last = readLast();
      if (last) return last;
    }
    return media.matches ? 'dark' : 'light';
  }

  function apply({ animate = false } = {}) {
    const theme = resolve();
    if (root.dataset.theme !== theme) {
      if (animate && !reducedMotion.matches) {
        root.classList.add('theme-anim');
        clearTimeout(animTimer);
        animTimer = setTimeout(() => root.classList.remove('theme-anim'), 450);
      }
      root.dataset.theme = theme;
      if (!pinned) {
        try { localStorage.setItem(LAST_KEY, theme); } catch { /* depolama kapalı */ }
      }
    }
    // Mobil tarayıcı çubuğunun rengi sayfa arka planıyla aynı olsun (açılışta da).
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(root).getPropertyValue('--bg').trim();
  }

  media.addEventListener('change', () => apply({ animate: true }));

  return {
    apply,
    /** Uygulama her hesaplamada güneşin durumunu bildirir; yalnızca 'sun' kipinde etkisi olur. */
    setSunUp(value) {
      if (value === sunUp) return;
      sunUp = value;
      if (getMode() === 'sun') apply({ animate: true });
    },
  };
}

function readLast() {
  try {
    const v = localStorage.getItem(LAST_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}
