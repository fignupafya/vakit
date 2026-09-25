import { h, setClass, setText } from '../dom.js';
import { createDateline, createNotice } from '../components/hero.js';
import { createCountdown } from '../components/countdown.js';
import { iconButton } from '../components/buttons.js';

/**
 * Bugün · Odak: tek ekran, büyük yazı. Duvar ekranı, televizyon ya da ikinci monitör için.
 * Ferah ile aynı görünüm modelini kullanır; yalnızca yerleşim farklıdır.
 */
export const odak = {
  id: 'odak',
  label: 'Odak',
  hint: 'Tek ekranda büyük yazı. Duvar ekranı ya da ikinci monitör için; tam ekran düğmesi üst çubukta.',

  create(actions) {
    const dateline = createDateline({ className: 'dateline odak__meta' });
    const notice = createNotice(actions);
    const eyebrow = h('p', { class: 'eyebrow odak__eyebrow' });
    const name = h('span');
    const title = h('h1', { class: 'odak__name' }, name, ' ', h('span', { class: 'period__suffix' }, 'vakti'));
    const countdown = createCountdown();
    const labelText = h('span');
    const labelTime = h('span', { class: 'num' });
    const label = h('p', { class: 'odak__label' }, labelText, ' · ', labelTime);

    const items = Array.from({ length: 6 }, () => {
      const n = h('span', { class: 'odak__n' });
      const t = h('span', { class: 'odak__t num' });
      return { li: h('li', { class: 'odak__item' }, n, t), n, t };
    });
    const strip = h('ol', { class: 'odak__strip', 'aria-label': 'Bugünün vakitleri' }, items.map((i) => i.li));

    const readyOnly = [eyebrow, title, countdown.el, label, strip];
    const el = h('div', { class: 'page page--odak' },
      h('div', { class: 'odak' }, dateline.el, notice.el, eyebrow, title, countdown.el, label),
      strip);

    return {
      el,
      hideFooter: true,
      topbarExtra: [iconButton('expand', 'Tam ekran', () => actions.toggleFullscreen())],
      update(vm) {
        const ready = vm.status === 'ready';
        dateline.update(vm);
        notice.update(vm);
        for (const node of readyOnly) node.hidden = !ready;
        if (!ready) return;

        const { period, next } = vm;
        setText(eyebrow, period.justEntered ? 'Vakit girdi' : 'Şu an');
        eyebrow.classList.toggle('is-flash', period.justEntered);
        setText(name, period.name);
        countdown.update(next, vm.showSeconds);
        setText(labelText, next.label);
        setText(labelTime, next.tomorrow ? `yarın ${next.time}` : next.time);
        vm.rows.forEach((row, i) => {
          setClass(items[i].li, `odak__item is-${row.state}`);
          setText(items[i].n, row.name);
          setText(items[i].t, row.time);
        });
      },
    };
  },
};
