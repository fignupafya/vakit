import { h, setAttr, setText, setVar } from '../dom.js';
import { createCountdown } from './countdown.js';
import { button } from './buttons.js';

/** "Cuma  25 Eylül 2026  14 Rebiülahir 1448  [Ramazan'ın 12. günü]" */
export function createDateline({ className = 'dateline' } = {}) {
  const weekday = h('span', { class: 'dateline__wd' });
  const greg = h('time', { class: 'dateline__greg' });
  const hijri = h('span', { class: 'dateline__hijri' });
  const tag = h('span', { class: 'dateline__tag' });
  const el = h('p', { class: className }, weekday, greg, hijri, tag);

  return {
    el,
    update(vm) {
      const d = vm.date;
      setText(weekday, d.weekday);
      weekday.classList.toggle('is-friday', d.isFriday);
      setText(greg, d.long);
      setAttr(greg, 'datetime', d.iso);
      setText(hijri, d.hijri);
      hijri.hidden = !d.hijri;
      setText(tag, d.ramadanDay ? `Ramazan'ın ${d.ramadanDay}. günü` : '');
      tag.hidden = !d.ramadanDay;
    },
  };
}

/**
 * İçinde bulunulan vakit. Tek bakışta üç soruyu yanıtlar:
 *   hangi vakitteyiz? (Öğle vakti) · ne zamana kadar? (13:01 → 16:24 İkindi) · ne kadar kaldı? (1 sa 24 dk)
 * Geri sayım hem bu vaktin çıkmasına hem sıradaki vaktin girmesine kalan süredir; ikisi aynı andır.
 */
export function createPeriodBlock() {
  const eyebrow = h('p', { class: 'eyebrow period__eyebrow' });
  const name = h('span', { class: 'period__name' });
  const title = h('h1', { class: 'period__title' }, name, ' ', h('span', { class: 'period__suffix' }, 'vakti'));
  const start = h('time', { class: 'span__start num' });
  const fill = h('span', { class: 'span__fill' });
  const dot = h('span', { class: 'span__dot' });
  const endTime = h('time', { class: 'span__time num' });
  const endName = h('span', { class: 'span__name' });
  const span = h('div', { class: 'span', 'aria-hidden': 'true' },
    start,
    h('span', { class: 'span__track' }, fill, dot),
    h('span', { class: 'span__end' }, endTime, endName));
  const label = h('p', { class: 'period__label' });
  const countdown = createCountdown();
  const tzNote = h('p', { class: 'tz-note' }, 'Bu konumun saat dilimi bilinmiyor; geri sayım bu cihazın saatine göre yapılıyor.');
  const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  const el = h('div', { class: 'period' }, eyebrow, title, span, label, countdown.el, tzNote, live);
  let announced = '';

  return {
    el,
    update(vm) {
      const p = vm.period;
      const next = vm.next;
      setText(eyebrow, p.justEntered ? 'Vakit girdi' : 'Şu an');
      eyebrow.classList.toggle('is-flash', p.justEntered);
      setText(name, p.name);
      setText(start, p.start);
      setText(endTime, p.endTomorrow ? `yarın ${p.end}` : p.end);
      setText(endName, p.endName);
      const progress = p.progress.toFixed(4);
      setVar(fill, '--p', progress);
      setVar(dot, '--p', progress);
      setText(label, next.label);
      countdown.update(next, vm.showSeconds);
      tzNote.hidden = vm.zoneKnown;

      const say = `Şu an ${p.name} vakti. Sıradaki ${next.name}, saat ${next.time}.`;
      if (say !== announced) { announced = say; setText(live, say); }
    },
  };
}

const NOTICES = {
  locating: {
    title: 'Konumunuz bulunuyor',
    text: 'Tarayıcınız konum izni isteyebilir. Vakitler bulunduğunuz yere göre gösterilecek.',
    actions: [['Listeden seç', 'openLocation']],
  },
  'no-location': {
    title: 'Hoş geldiniz',
    text: 'Vakitleri bulunduğunuz yere göre gösterebilmek için konumunuzu seçin.',
    actions: [['Konumumu bul', 'locate', 'primary', 'geo'], ['Listeden seç', 'openLocation']],
  },
  loading: { title: '', text: 'Vakitler alınıyor', actions: [] },
  error: {
    title: 'Vakitler alınamadı',
    text: null, // hatanın kendi açıklaması kullanılır
    actions: [['Tekrar dene', 'retry', 'primary']],
  },
  'no-data': {
    title: 'Bugün için vakit yok',
    text: 'Bu günün vakitleri henüz yayımlanmamış olabilir.',
    actions: [['Tekrar dene', 'retry', 'primary'], ['Takvime git', 'openCalendar']],
  },
};

/**
 * Hazır olmayan her durum için tek bir yer: konum aranıyor, ilk açılış, yükleniyor, hata, veri yok.
 * `only` verilirse yalnızca o durumlarda görünür (ör. Takvim sayfası bugünün hatasını göstermez).
 */
export function createNotice(actions, { only } = {}) {
  const el = h('div', { class: 'notice', role: 'status' });
  let signature = '';

  return {
    el,
    update(vm) {
      const copy = !only || only.includes(vm.status) ? NOTICES[vm.status] : null;
      el.hidden = !copy;
      if (!copy) { signature = ''; return; }

      const failed = vm.status === 'no-location' && vm.error;
      const title = failed ? 'Konum bulunamadı' : copy.title;
      const text = (failed ? vm.error : copy.text) ?? vm.error ?? '';
      const buttons = copy.actions.filter(([, , , needs]) => needs !== 'geo' || vm.geoSupported);
      const sig = `${vm.status}|${title}|${text}|${buttons.length}`;
      if (sig === signature) return;
      signature = sig;

      el.className = `notice notice--${vm.status}`;
      el.replaceChildren(
        title ? h('h1', { class: 'notice__title' }, title) : '',
        h('p', { class: 'notice__text' }, text),
        buttons.length
          ? h('div', { class: 'notice__actions' },
            buttons.map(([label, action, variant]) => button(label, () => actions[action](), { variant })))
          : '',
      );
    },
  };
}
