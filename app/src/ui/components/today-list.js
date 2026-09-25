import { PRAYER_KEYS } from '../../core/prayers.js';
import { h, setAttr, setClass, setText } from '../dom.js';

/** Günün altı vakti: geçenler soluk, içinde bulunulan vurgulu, sıradaki belirgin. */
export function createTodayList() {
  const rows = new Map();
  const el = h('ol', { class: 'today', 'aria-label': 'Bugünün vakitleri' });

  for (const key of PRAYER_KEYS) {
    const name = h('span', { class: 'today__name' });
    const alt = h('span', { class: 'today__alt' });
    const tag = h('span', { class: 'today__tag' });
    const time = h('time', { class: 'today__time num' });
    const li = h('li', { class: 'today__row' },
      h('span', { class: 'today__mark', 'aria-hidden': 'true' }),
      h('span', { class: 'today__label' }, name, alt),
      tag,
      time,
    );
    rows.set(key, { li, name, alt, tag, time });
    el.append(li);
  }

  return {
    el,
    update(vm) {
      for (const row of vm.rows) {
        const n = rows.get(row.key);
        setClass(n.li, `today__row is-${row.state}`);
        setText(n.name, row.name);
        setText(n.alt, row.alt);
        n.alt.hidden = !row.alt;
        setText(n.tag, row.tag);
        n.tag.hidden = !row.tag;
        setText(n.time, row.time);
        setAttr(n.time, 'datetime', row.time);
        if (row.state === 'current') n.li.setAttribute('aria-current', 'time');
        else n.li.removeAttribute('aria-current');
      }
    },
  };
}
