import { DAY_SECONDS } from '../../core/time.js';
import { h, setText, setVar } from '../dom.js';

const pct = (seconds) => `${((Math.min(Math.max(seconds, 0), DAY_SECONDS) / DAY_SECONDS) * 100).toFixed(3)}%`;

/**
 * Günün 24 saatlik şeridi. Renkler süs değil: gece, tan, gündüz ve akşam bölümleri
 * o günün gerçek imsak/güneş/akşam/yatsı saatlerinden hesaplanır. Kırmızı çizgi şu an,
 * altındaki ince çizgi de içinde bulunulan vaktin ne kadarının geçtiğini gösterir.
 */
export function createSkyRibbon() {
  const ticks = [];
  const labels = [];
  for (let i = 0; i < 6; i++) {
    ticks.push(h('span', { class: 'ribbon__tick' }));
    labels.push(h('span', { class: 'ribbon__label' },
      h('span', { class: 'ribbon__label-name' }),
      h('span', { class: 'ribbon__label-time num' })));
  }
  const nowLabel = h('span', { class: 'ribbon__now-label num' });
  const needle = h('span', { class: 'ribbon__now' }, nowLabel);
  const span = h('span', { class: 'ribbon__span' }, h('i'));
  const bar = h('div', { class: 'ribbon__bar' }, ...ticks);
  const hours = h('div', { class: 'ribbon__hours num', 'aria-hidden': 'true' },
    ...['00', '06', '12', '18', '24'].map((t, i) => h('span', { style: `--x:${i * 25}%` }, t)));
  const caption = h('figcaption', { class: 'sr-only' });
  const el = h('figure', { class: 'ribbon' },
    h('div', { class: 'ribbon__track', 'aria-hidden': 'true' }, bar, span, needle),
    h('div', { class: 'ribbon__labels', 'aria-hidden': 'true' }, ...labels),
    hours,
    caption,
  );

  let signature = '';

  return {
    el,
    update(vm) {
      const r = vm.ribbon;
      const sig = r.at.join(',');
      if (sig !== signature) {
        signature = sig;
        setVar(bar, '--sky', skyGradient(r.at));
        r.at.forEach((seconds, i) => {
          setVar(ticks[i], '--x', pct(seconds));
          setVar(labels[i], '--x', pct(seconds));
          setText(labels[i].firstChild, r.names[i]);
          setText(labels[i].lastChild, r.times[i]);
        });
        setText(caption, `Gün çizelgesi: ${r.names.map((n, i) => `${n} ${r.times[i]}`).join(', ')}.`);
      }
      r.states.forEach((state, i) => { if (labels[i].dataset.state !== state) labels[i].dataset.state = state; });
      setVar(needle, '--x', pct(r.now));
      setText(nowLabel, vm.now.hhmm);
      setVar(span, '--x', pct(r.span.from));
      setVar(span, '--w', `${(((r.span.to - r.span.from) / DAY_SECONDS) * 100).toFixed(3)}%`);
      setVar(span.firstChild, '--p', r.span.progress.toFixed(4));
    },
  };
}

/** Vakitlerden gökyüzü geçişi üretir; renkler temaya göre CSS değişkenlerinden gelir. */
function skyGradient([imsak, gunes, , , aksam, yatsi]) {
  const p = (s) => `${Math.min(100, Math.max(0, s / (DAY_SECONDS / 100))).toFixed(2)}%`;
  return `linear-gradient(90deg,
    var(--sky-night) 0%,
    var(--sky-night) ${p(imsak - 1800)},
    var(--sky-twilight) ${p(imsak + (gunes - imsak) * 0.5)},
    var(--sky-dawn) ${p(gunes)},
    var(--sky-day) ${p(gunes + 5400)},
    var(--sky-day) ${p(aksam - 5400)},
    var(--sky-dusk) ${p(aksam)},
    var(--sky-twilight) ${p(aksam + (yatsi - aksam) * 0.55)},
    var(--sky-night) ${p(yatsi + 1500)},
    var(--sky-night) 100%)`;
}
