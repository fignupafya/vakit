import { h } from '../dom.js';
import { iconEl } from '../icons.js';
import { createDaysTable } from './days-table.js';

/** Ana sayfada bugün ve sonraki altı gün; tamamı Takvim sayfasında. */
export function createUpcoming() {
  const table = createDaysTable({ label: 'Önümüzdeki günlerin vakitleri', hijri: false, compact: true });
  const el = h('section', { class: 'upcoming', 'aria-labelledby': 'upcoming-title' },
    h('div', { class: 'section-head' },
      h('h2', { class: 'section-title', id: 'upcoming-title' }, 'Önümüzdeki günler'),
      h('a', { class: 'link-more', href: '#/takvim' }, 'Aylık ve yıllık takvim', iconEl('arrowRight'))),
    table.el);

  return {
    el,
    update(vm) {
      const rows = vm.upcoming?.rows ?? [];
      el.hidden = rows.length === 0;
      if (rows.length) table.update({ rows });
    },
  };
}
