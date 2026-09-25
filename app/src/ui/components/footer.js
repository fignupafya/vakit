import { h, setText } from '../dom.js';

/**
 * Vakitlerin kaynağı ve tazeliği: güncel ya da çevrimdışıyken son alınanlar.
 * Kaynak sağlayıcının `attribution` alanından gelir: veriyi kim yayımlıyor, uygulama onu nereden alıyor.
 * @param {{ dataSource?: string, via?: string, url?: string }} [attribution]
 */
export function createFooter({ dataSource = 'T.C. Diyanet İşleri Başkanlığı', via, url } = {}) {
  const status = h('span', { class: 'footer__status', 'data-tone': 'idle' });
  const viaText = url ? h('a', { href: url, target: '_blank', rel: 'noopener' }, via) : via;
  const el = h('footer', { class: 'footer' },
    h('span', { class: 'footer__src' },
      `Vakitler: ${dataSource}`,
      via ? h('small', { class: 'footer__via' }, ' (', viaText, ' üzerinden)') : null),
    status);

  return {
    el,
    update(vm) {
      if (status.dataset.tone !== vm.source.tone) status.dataset.tone = vm.source.tone;
      setText(status, vm.source.text);
    },
  };
}
