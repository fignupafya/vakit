import { h, setText } from '../dom.js';

/** Vakitlerin kaynağı ve tazeliği: güncel ya da çevrimdışıyken son alınanlar. */
export function createFooter() {
  const status = h('span', { class: 'footer__status', 'data-tone': 'idle' });
  const el = h('footer', { class: 'footer' },
    h('span', { class: 'footer__src' }, 'Vakitler: T.C. Diyanet İşleri Başkanlığı'),
    status);

  return {
    el,
    update(vm) {
      if (status.dataset.tone !== vm.source.tone) status.dataset.tone = vm.source.tone;
      setText(status, vm.source.text);
    },
  };
}
