import { h } from './dom.js';
import { createTopbar } from './components/topbar.js';
import { createFooter } from './components/footer.js';
import { createToaster } from './components/toast.js';
import { createPage, pageKey } from './pages/index.js';

/**
 * Uygulama kabuğu: üst çubuk, etkin sayfa, alt bilgi ve bildirimler.
 * Hangi sayfanın gösterileceğine görünüm modeline bakarak karar verir.
 * attribution: vakitlerin kaynağı (sağlayıcıdan), alt bilgide yazar.
 */
export function createShell(actions, { attribution } = {}) {
  const topbar = createTopbar(actions);
  const footer = createFooter(attribution);
  const toaster = createToaster();
  const outlet = h('main', { class: 'outlet', id: 'icerik' });
  const el = h('div', { class: 'shell' }, topbar.el, outlet, footer.el, toaster.el);
  let current = { key: '', page: null };

  function mount(key) {
    current.page?.destroy?.();
    const page = createPage(key, actions);
    const changedPage = current.key.split(':')[0] !== key.split(':')[0];
    current = { key, page };
    el.className = `shell shell--${key.replace(':', '-')}`;
    outlet.replaceChildren(page.el);
    topbar.setExtra(page.topbarExtra ?? []);
    footer.el.hidden = Boolean(page.hideFooter);
    if (changedPage) window.scrollTo(0, 0);
  }

  return {
    el,
    toast: toaster.show,
    update(vm) {
      const key = pageKey(vm);
      if (key !== current.key) mount(key);
      topbar.update(vm);
      footer.update(vm);
      current.page.update(vm);
    },
  };
}
