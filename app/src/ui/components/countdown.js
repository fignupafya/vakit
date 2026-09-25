import { h, setAttr, setText } from '../dom.js';

/**
 * "1 sa 23 dk 45 sn" — rakamlar büyük, birimler küçük. Rakamlar sabit genişlikte
 * (tabular) olduğu için saniye değişirken yazı titremez.
 */
export function createCountdown({ className = '' } = {}) {
  const group = (unit) => {
    const num = h('span', { class: 'cd__num' });
    return { num, el: h('span', { class: 'cd__grp' }, num, h('span', { class: 'cd__unit' }, unit)) };
  };
  const hours = group('sa');
  const minutes = group('dk');
  const seconds = group('sn');
  const el = h('div', { class: `cd num ${className}`.trim(), role: 'timer' }, hours.el, minutes.el, seconds.el);

  return {
    el,
    /** @param {{ parts: { h: number, m: number, s: number }, aria: string }} next */
    update(next, showSeconds) {
      const { h: hh, m, s } = next.parts;
      hours.el.hidden = hh === 0;
      setText(hours.num, hh);
      minutes.el.hidden = hh === 0 && m === 0 && showSeconds;
      setText(minutes.num, hh > 0 ? String(m).padStart(2, '0') : m);
      seconds.el.hidden = !showSeconds;
      setText(seconds.num, hh > 0 || m > 0 ? String(s).padStart(2, '0') : s);
      setAttr(el, 'aria-label', `Kalan süre: ${next.aria}`);
    },
  };
}
