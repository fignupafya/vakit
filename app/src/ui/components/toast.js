import { h } from '../dom.js';
import { button, iconButton } from './buttons.js';

/**
 * Ekranın altında kısa bildirimler. `key` verilen bildirim aynı anahtarlı eskisinin yerini alır.
 * duration 0 ise kullanıcı kapatana ya da bir eylem seçene kadar kalır.
 */
export function createToaster() {
  const el = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
  const byKey = new Map();

  function show(text, { key, duration = 6000, actions = [], onDismiss } = {}) {
    if (key && byKey.has(key)) byKey.get(key)(false);

    let closed = false;
    let timer = 0;
    const close = (dismissed = true) => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      if (key && byKey.get(key) === close) byKey.delete(key);
      if (dismissed) onDismiss?.();
      item.classList.add('is-leaving');
      setTimeout(() => item.remove(), 200);
    };

    const item = h('div', { class: 'toast' },
      h('p', { class: 'toast__text' }, text),
      actions.length
        ? h('div', { class: 'toast__actions' },
          actions.map(([label, run]) => button(label, () => { close(false); run(); }, { variant: 'quiet' })))
        : null,
      iconButton('close', 'Kapat', () => close(true)),
    );

    el.append(item);
    if (key) byKey.set(key, close);
    if (duration > 0) timer = setTimeout(() => close(false), duration);
    return close;
  }

  return { el, show };
}
