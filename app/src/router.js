/**
 * Adres çubuğundaki # kısmına dayalı yönlendirme; statik barındırmada da çalışır.
 *   #/                 → Bugün
 *   #/takvim           → Takvim, bu ay
 *   #/takvim/2026-09   → Takvim, belirli bir ay
 *   #/takvim/2026      → Takvim, bütün yıl
 *
 * @typedef {{ page: 'today' } | { page: 'calendar', mode: 'month', ym: string | null } | { page: 'calendar', mode: 'year', year: number }} Route
 */

/** @returns {Route} */
export function parseRoute(hash) {
  const [head, arg = ''] = String(hash ?? '').replace(/^#\/?/, '').split(/[?#]/)[0].split('/');
  if (head !== 'takvim') return { page: 'today' };
  if (/^\d{4}$/.test(arg)) return { page: 'calendar', mode: 'year', year: Number(arg) };
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(arg)) return { page: 'calendar', mode: 'month', ym: arg };
  return { page: 'calendar', mode: 'month', ym: null };
}

/** @param {Route} route */
export function routeHref(route) {
  if (route?.page !== 'calendar') return '#/';
  if (route.mode === 'year') return `#/takvim/${route.year}`;
  return route.ym ? `#/takvim/${route.ym}` : '#/takvim';
}

export function createRouter(onChange) {
  let current = parseRoute(window.location.hash);
  window.addEventListener('hashchange', () => {
    const previous = current;
    current = parseRoute(window.location.hash);
    onChange(current, previous);
  });
  return {
    current: () => current,
    go(route) {
      const href = routeHref(route);
      if (window.location.hash === href || (href === '#/' && !window.location.hash)) return;
      window.location.hash = href;
    },
  };
}
