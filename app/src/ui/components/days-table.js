import { PRAYER_KEYS, PRAYER_NAMES } from '../../core/prayers.js';
import { h } from '../dom.js';
import { button } from './buttons.js';

/**
 * Günlerin vakit tablosu: aylık, yıllık ve "önümüzdeki günler" görünümleri aynı tabloyu kullanır.
 * Bugün vurgulu, geçmiş günler soluk, cumalar işaretli. Satırlar yalnızca veri değişince yeniden çizilir.
 *
 * Satır: { iso, lead, sub, hijri, times, isToday, isPast, isFriday }
 */
export function createDaysTable({ label, hijri = true, compact = false, onRetry } = {}) {
  const tbody = h('tbody');
  const columns = PRAYER_KEYS.length + (hijri ? 2 : 1);
  const table = h('table', { class: compact ? 'mt mt--compact' : 'mt' },
    h('thead', {}, h('tr', {},
      h('th', { scope: 'col' }, 'Gün'),
      hijri ? h('th', { scope: 'col', class: 'col-hijri' }, 'Hicrî') : null,
      ...PRAYER_KEYS.map((key) => h('th', { scope: 'col' }, PRAYER_NAMES[key])))),
    tbody,
  );
  const el = h('div', { class: 'table-wrap', tabindex: '0', role: 'region', 'aria-label': label ?? 'Vakit çizelgesi' }, table);
  let signature = '';

  const message = (text, withRetry) =>
    h('tr', { class: 'mt__msg' }, h('td', { colspan: columns },
      h('div', {}, text),
      withRetry && onRetry ? button('Tekrar dene', onRetry) : null));

  const row = (r) =>
    h('tr', {
      class: ['mt__row', r.isToday && 'is-today', r.isPast && 'is-past', r.isFriday && 'is-friday'].filter(Boolean).join(' '),
      'aria-current': r.isToday ? 'date' : null,
      'data-date': r.iso,
    },
    h('th', { scope: 'row' }, h('span', { class: 'mt__d num' }, r.lead), h('span', { class: 'mt__wd' }, r.sub)),
    hijri ? h('td', { class: 'col-hijri' }, r.hijri) : null,
    ...PRAYER_KEYS.map((key) => h('td', { class: 'num' }, r.times[key])));

  return {
    el,
    /** @param {{ rows: object[], status?: string, error?: string | null, empty?: string }} data */
    update({ rows, status = 'ready', error = null, empty = 'Bu dönem için vakit bulunmuyor.' }) {
      const sig = `${status}|${error ?? ''}|${rows.map((r) => `${r.iso}${r.isToday ? '*' : r.isPast ? '-' : ''}`).join(',')}`;
      if (sig === signature) return;
      signature = sig;
      if (rows.length) tbody.replaceChildren(...rows.map(row));
      else if (status === 'loading') tbody.replaceChildren(message('Yükleniyor…'));
      else if (status === 'error') tbody.replaceChildren(message(error, true));
      else tbody.replaceChildren(message(empty));
    },
  };
}
