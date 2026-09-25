import { h, setText } from '../dom.js';
import { button, iconButton } from './buttons.js';

const THEMES = [['system', 'Sistem'], ['light', 'Açık'], ['dark', 'Koyu'], ['sun', 'Güneşe göre']];
const THEME_HINTS = {
  system: 'Cihazınızın açık/koyu görünüm ayarını izler.',
  light: 'Her zaman açık tema.',
  dark: 'Her zaman koyu tema.',
  sun: 'Bulunduğunuz yerde güneş doğunca açık, akşam vakti girince koyu temaya geçer.',
};

const INSTALL_TEXT = {
  available: 'Vakit\'i bu cihaza uygulama olarak yükleyebilirsiniz: ana ekrandan açılır, internet yokken de son vakitleri gösterir.',
  ios: 'iPhone ve iPad\'de: Safari\'de Paylaş düğmesine, ardından "Ana Ekrana Ekle"ye dokunun.',
  installed: 'Vakit bu cihazda uygulama olarak yüklü.',
  unsupported: 'Tarayıcınızın menüsünde "Uygulamayı yükle" ya da "Ana ekrana ekle" seçeneğini arayın. Chrome, Edge ve Safari destekler.',
};

/** Yan panel: tema, Bugün ekranının düzeni, geri sayım, konum ve uygulama olarak yükleme. */
export function createSettingsPanel({ settings, layouts, installer, onRefresh, app, attribution = {} }) {
  const section = (id, title, ...content) =>
    h('section', { class: 'set', 'aria-labelledby': id }, h('h3', { class: 'set__title', id }, title), ...content);

  const segmented = (name, labelledBy, options) =>
    h('div', { class: 'seg', role: 'radiogroup', 'aria-labelledby': labelledBy },
      options.map(([value, label]) =>
        h('label', { class: 'seg__opt' }, h('input', { type: 'radio', name, value }), h('span', {}, label))));

  const toggle = (name, id, label) => {
    const input = h('input', { type: 'checkbox', class: 'switch', role: 'switch', name, id });
    return { input, row: h('div', { class: 'switch-row' }, h('label', { for: id }, label), input) };
  };

  const themeHint = h('p', { class: 'hint' });
  const layoutHint = h('p', { class: 'hint' });
  const seconds = toggle('seconds', 'opt-seconds', 'Saniyeleri göster');
  const travel = toggle('travel', 'opt-travel', 'Yer değiştirdiğimde haber ver');
  const refreshNote = h('span', { class: 'hint', 'aria-live': 'polite' });
  const installText = h('p', { class: 'hint hint--lead' });
  const installButton = button('Uygulamayı yükle', async () => { await installer.install(); syncInstall(); }, { variant: 'primary' });

  const form = h('form', { class: 'settings', onsubmit: (event) => event.preventDefault() },
    section('set-app', 'Uygulama', installText, h('div', { class: 'set__row' }, installButton)),
    section('set-theme', 'Tema', segmented('theme', 'set-theme', THEMES), themeHint),
    section('set-layout', 'Bugün ekranı', segmented('layout', 'set-layout', layouts.map((l) => [l.id, l.label])), layoutHint),
    section('set-count', 'Geri sayım', seconds.row),
    section('set-location', 'Konum',
      travel.row,
      h('p', { class: 'hint' },
        'Seçtiğiniz konum kendiliğinden değişmez. Başka bir ile gittiğinizde, konum izni daha önce verilmişse, ',
        'uygulama açılışta yeni ili önerir. Konumunuz yalnızca il ve ilçe adını bulmak için BigDataCloud\'a gönderilir; ',
        'uygulama onu yalnızca bu tarayıcıda saklar.')),
    section('set-about', 'Hakkında',
      h('p', { class: 'about' },
        `${app.name} ${app.version}. Namaz vakitleri T.C. Diyanet İşleri Başkanlığı'nın yayımladığı verilerdir. `,
        attribution.via
          ? `Uygulama onları Diyanet'ten doğrudan değil, bu verileri yeniden yayımlayan ${attribution.via} API'sinden alır. `
          : '',
        'İnternet varken seçili ilin bütün ilçelerinin bu ayki ve gelecek ayki vakitleri tarayıcıda saklanır; ',
        'internet yokken de il içinde ilçe değiştirebilirsiniz. Başka bir ile geçmek için internet gerekir.'),
      h('div', { class: 'set__row' },
        button('Vakitleri yenile', () => { onRefresh(); setText(refreshNote, 'Vakitler yeniden alınıyor.'); }),
        refreshNote)),
  );

  const el = h('dialog', { class: 'sheet sheet--side', 'aria-labelledby': 'settings-title' },
    h('div', { class: 'sheet__panel' },
      h('header', { class: 'sheet__head' },
        h('h2', { class: 'sheet__title', id: 'settings-title' }, 'Ayarlar'),
        iconButton('close', 'Kapat', () => el.close())),
      form));

  el.addEventListener('click', (event) => { if (event.target === el) el.close(); });

  form.addEventListener('change', (event) => {
    const { name, value, checked } = event.target;
    if (name === 'theme') settings.set({ theme: value });
    else if (name === 'layout') settings.set({ layout: value });
    else if (name === 'seconds') settings.set({ showSeconds: checked });
    else if (name === 'travel') settings.set({ travelCheck: checked });
    sync();
  });

  function sync() {
    const v = settings.get();
    const selected = { theme: v.theme, layout: v.layout };
    for (const radio of form.querySelectorAll('input[type="radio"]')) radio.checked = radio.value === selected[radio.name];
    seconds.input.checked = v.showSeconds;
    travel.input.checked = v.travelCheck;
    setText(themeHint, THEME_HINTS[v.theme]);
    setText(layoutHint, layouts.find((l) => l.id === v.layout)?.hint ?? '');
    syncInstall();
  }

  function syncInstall() {
    const state = installer.state;
    setText(installText, INSTALL_TEXT[state]);
    installButton.hidden = state !== 'available';
  }

  return {
    el,
    open() {
      sync();
      setText(refreshNote, '');
      if (!el.open) el.showModal();
    },
    /** Yükleme durumu değişince (tarayıcı izin verdi, yüklendi) panel açıksa güncellensin. */
    syncInstall,
  };
}
