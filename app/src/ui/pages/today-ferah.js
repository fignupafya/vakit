import { h } from '../dom.js';
import { createDateline, createNotice, createPeriodBlock } from '../components/hero.js';
import { createTodayList } from '../components/today-list.js';
import { createSkyRibbon } from '../components/sky-ribbon.js';
import { createUpcoming } from '../components/upcoming.js';

/**
 * Bugün · Ferah: solda içinde bulunulan vakit ve geri sayım, sağda günün vakitleri;
 * altında gün çizelgesi ve önümüzdeki günler.
 *
 * Her sayfa aynı sözleşmeye uyar: create(actions) → { el, update(vm), topbarExtra?, hideFooter?, destroy?() }
 */
export const ferah = {
  id: 'ferah',
  label: 'Ferah',
  hint: 'İçinde bulunulan vakit, günün vakitleri, gün çizelgesi ve önümüzdeki günler bir arada.',

  create(actions) {
    const dateline = createDateline();
    const notice = createNotice(actions);
    const period = createPeriodBlock();
    const today = createTodayList();
    const ribbon = createSkyRibbon();
    const upcoming = createUpcoming();

    const grid = h('div', { class: 'hero__grid' },
      period.el,
      h('div', { class: 'hero__side' }, h('h2', { class: 'eyebrow' }, 'Bugün'), today.el));
    const day = h('section', { class: 'day', 'aria-label': 'Gün çizelgesi' }, ribbon.el);
    const el = h('div', { class: 'page' },
      h('section', { class: 'hero' }, dateline.el, notice.el, grid),
      day,
      upcoming.el);

    return {
      el,
      update(vm) {
        const ready = vm.status === 'ready';
        dateline.update(vm);
        notice.update(vm);
        grid.hidden = !ready;
        day.hidden = !ready;
        if (ready) {
          period.update(vm);
          today.update(vm);
          ribbon.update(vm);
        }
        upcoming.update(vm);
      },
    };
  },
};
