import { h, setText } from '../dom.js';
import { createNotice } from '../components/hero.js';
import { createDaysTable } from '../components/days-table.js';
import { button, iconButton } from '../components/buttons.js';

const smoothScroll = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

/**
 * Takvim: bir ayın ya da bütün yılın vakitleri. Ay ay ve yıl yıl gezilir, yazdırılabilir.
 * Adres çubuğu görünümü tutar (#/takvim/2026-09, #/takvim/2026); geri tuşu çalışır.
 */
export const calendarPage = {
  create(actions) {
    const notice = createNotice(actions, { only: ['locating', 'no-location'] });
    const eyebrow = h('p', { class: 'eyebrow' });
    const title = h('h1', { class: 'cal__title' });

    let view = null; // son görünüm modeli; düğmeler bunu kullanır
    const go = (pick) => () => view && actions.navigate(pick(view.calendar));

    const monthTab = h('button', { type: 'button', class: 'seg__btn', onclick: go((c) => c.toMonth) }, 'Ay');
    const yearTab = h('button', { type: 'button', class: 'seg__btn', onclick: go((c) => c.toYear) }, 'Yıl');
    const todayBtn = button('Bugün', () => showToday(), { variant: 'quiet' });
    const controls = h('div', { class: 'cal__controls' },
      h('div', { class: 'seg seg--inline', role: 'group', 'aria-label': 'Görünüm' }, monthTab, yearTab),
      h('div', { class: 'cal__nav' },
        iconButton('chevronLeft', 'Önceki', go((c) => c.prev)),
        iconButton('chevronRight', 'Sonraki', go((c) => c.next)),
        todayBtn),
      button('Yazdır', () => actions.print(), { variant: 'quiet', iconName: 'print' }));
    const head = h('header', { class: 'cal__head' }, eyebrow, title, controls);
    const jump = h('nav', { class: 'cal__jump', 'aria-label': 'Aylar' });
    const body = h('div', { class: 'cal__body' });
    const el = h('div', { class: 'page cal' }, notice.el, head, jump, body);

    let layoutKey = '';
    let blocks = []; // [{ ym, section, table, note, heading? }]
    let scrollTodayPending = false;

    function build(calendar) {
      const yearMode = calendar.mode === 'year';
      blocks = calendar.months.map((m) => {
        const table = createDaysTable({ label: `${m.label} vakitleri`, onRetry: () => actions.retry() });
        const note = h('p', { class: 'month__note' });
        const heading = yearMode ? h('h2', { class: 'cal__month', id: `ay-${m.ym}` }, m.name) : null;
        const section = h('section', { class: 'cal__block', 'aria-label': m.label }, heading, note, table.el);
        return { ym: m.ym, section, table, note };
      });
      body.replaceChildren(...blocks.map((b) => b.section));
      jump.replaceChildren(...(yearMode
        ? calendar.months.map((m, i) => h('button', {
          type: 'button',
          class: m.isCurrent ? 'chip is-current' : 'chip',
          onclick: () => blocks[i].section.scrollIntoView({ behavior: smoothScroll(), block: 'start' }),
        }, m.short))
        : []));
    }

    function showToday() {
      if (!view?.calendar) return;
      if (view.calendar.isCurrent) scrollToToday();
      else { scrollTodayPending = true; actions.navigate(view.calendar.current); }
    }

    function scrollToToday() {
      el.querySelector('tr.is-today')?.scrollIntoView({ behavior: smoothScroll(), block: 'center' });
    }

    return {
      el,
      update(vm) {
        view = vm;
        notice.update(vm);
        const calendar = vm.calendar;
        head.hidden = !calendar;
        body.hidden = !calendar;
        jump.hidden = calendar?.mode !== 'year';
        if (!calendar) return;

        setText(eyebrow, `Takvim · ${vm.location.full}`);
        setText(title, calendar.title);
        const yearMode = calendar.mode === 'year';
        monthTab.setAttribute('aria-pressed', String(!yearMode));
        yearTab.setAttribute('aria-pressed', String(yearMode));
        todayBtn.hidden = calendar.isCurrent && !yearMode;

        const key = `${calendar.mode}|${calendar.months[0].ym}`;
        if (key !== layoutKey) {
          layoutKey = key;
          build(calendar);
        }
        calendar.months.forEach((m, i) => {
          const b = blocks[i];
          setText(b.note, m.note ?? '');
          b.note.hidden = !m.note;
          b.table.update({ rows: m.rows, status: m.status, error: m.error, empty: 'Bu ay için vakitler henüz yayımlanmadı.' });
        });

        if (scrollTodayPending && calendar.isCurrent && calendar.months.some((m) => m.rows.some((r) => r.isToday))) {
          scrollTodayPending = false;
          requestAnimationFrame(scrollToToday);
        }
      },
    };
  },
};
