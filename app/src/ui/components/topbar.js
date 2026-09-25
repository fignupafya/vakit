import { h, setAttr, setText } from '../dom.js';
import { iconEl } from '../icons.js';
import { iconButton } from './buttons.js';

/** Logo, sayfalar (Bugün · Takvim), konum ve ayarlar. Sayfalar `setExtra` ile düğme ekleyebilir. */
export function createTopbar(actions) {
  const links = {
    today: h('a', { class: 'nav__link', href: '#/' }, 'Bugün'),
    calendar: h('a', { class: 'nav__link', href: '#/takvim' }, 'Takvim'),
  };
  const name = h('span', { class: 'loc__name' });
  const sub = h('span', { class: 'loc__sub' });
  const location = h('button', { type: 'button', class: 'loc', onclick: () => actions.openLocation() },
    iconEl('pin'),
    h('span', { class: 'loc__text' }, name, sub),
    h('span', { class: 'loc__chev' }, iconEl('chevronDown')),
  );
  const extra = h('span', { class: 'topbar__extra' });

  const el = h('header', { class: 'topbar' },
    h('div', { class: 'topbar__start' },
      h('a', { class: 'brand', href: '#/', 'aria-label': 'Vakit, bugün' }, iconEl('mark'), h('span', { class: 'brand__name' }, 'Vakit')),
      h('nav', { class: 'nav', 'aria-label': 'Sayfalar' }, links.today, links.calendar)),
    h('div', { class: 'topbar__end' },
      location,
      extra,
      iconButton('sliders', 'Ayarlar', () => actions.openSettings())),
  );

  return {
    el,
    setExtra(nodes = []) {
      extra.replaceChildren(...nodes);
    },
    update(vm) {
      const page = vm.route?.page === 'calendar' ? 'calendar' : 'today';
      for (const [key, link] of Object.entries(links)) {
        if (key === page) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
      const loc = vm.location;
      setText(name, loc?.name ?? (vm.status === 'locating' ? 'Konum aranıyor…' : 'Konum seç'));
      setText(sub, loc?.sub ?? '');
      sub.hidden = !loc?.sub;
      setAttr(location, 'aria-label', loc ? `Konum: ${loc.full}. Değiştirmek için seçin.` : 'Konum seç');
    },
  };
}
