import { h } from '../dom.js';
import { iconEl } from '../icons.js';
import { collateTr, fold } from '../../core/text.js';
import { describeError } from '../../core/errors.js';
import { placeName } from '../format.js';
import { iconButton } from './buttons.js';

const REMOTE_MIN_CHARS = 3;
const REMOTE_DELAY_MS = 350;

/**
 * Konum seçici. Üç yol sunar:
 *   • Bulunduğum yeri bul: tarayıcı konumu → en uygun Diyanet noktası
 *   • Göz atma: il listesi → ilçe listesi (her sağlayıcıda çalışır)
 *   • Arama: iller anında süzülür; sağlayıcı destekliyorsa ilçeler de uzaktan aranır
 * Sağlayıcının neyi desteklediğini `capabilities` alanından okur; arayüz buna göre değişir.
 */
export function createLocationPicker({ service, provider, recents, currentLocation, defaultCountryId, geoSupported, locate, onSelect }) {
  const input = h('input', {
    class: 'search__input',
    type: 'search',
    placeholder: 'İl ya da ilçe ara',
    autocomplete: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
    'aria-label': 'İl ya da ilçe ara',
  });
  const countrySelect = h('select', { class: 'select', 'aria-label': 'Ülke' });
  const body = h('div', { class: 'picker__body' });
  const el = h('dialog', { class: 'sheet sheet--picker', 'aria-labelledby': 'picker-title' },
    h('div', { class: 'sheet__panel' },
      h('header', { class: 'sheet__head' },
        h('h2', { class: 'sheet__title', id: 'picker-title' }, 'Konum seç'),
        iconButton('close', 'Kapat', () => el.close())),
      h('div', { class: 'picker__controls' },
        h('label', { class: 'search' }, iconEl('search'), input),
        h('span', { class: 'select-wrap' }, countrySelect, iconEl('chevronDown'))),
      body));

  const idleRemote = () => ({ q: '', items: [], loading: false, error: null });
  const s = {
    providerId: null,
    countries: [],
    countryId: String(defaultCountryId),
    regions: [],
    regionsById: new Map(),
    region: null,
    districts: [],
    query: '',
    loading: '', // '' | 'regions' | 'districts'
    error: null,
    remote: idleRemote(),
    note: '',
    locating: false,
    locateError: null,
  };
  let seq = 0;
  let remoteTimer = 0;

  const country = () => s.countries.find((c) => c.id === s.countryId) ?? { id: s.countryId, name: currentLocation()?.countryName ?? '' };
  const name = (raw) => placeName(raw, s.countryId);
  const regionsTitle = () => (s.countryId === '2' ? 'İller' : 'Şehirler');

  el.addEventListener('click', (event) => { if (event.target === el) el.close(); }); // arka plana tıklama
  el.addEventListener('close', () => clearTimeout(remoteTimer));
  input.addEventListener('input', () => { s.query = input.value; queueRemote(); render(); });
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    body.querySelector('[data-primary]')?.click();
  });
  countrySelect.addEventListener('change', () => {
    s.countryId = countrySelect.value;
    Object.assign(s, { region: null, remote: idleRemote(), note: '' });
    loadRegions();
  });

  /**
   * @param {{ countryId?: string, region?: { id: string, name: string }, note?: string }} [context]
   *   Konum bulma yarıda kaldıysa liste o ülke/il açık olarak ve bir açıklamayla açılır.
   */
  async function open({ countryId, region, note = '' } = {}) {
    const p = provider();
    if (s.providerId !== p.id) {
      Object.assign(s, { providerId: p.id, countries: [], regions: [], regionsById: new Map(), districts: [] });
      countrySelect.replaceChildren();
    }
    const wanted = String(countryId ?? currentLocation()?.countryId ?? s.countryId);
    if (wanted !== s.countryId) Object.assign(s, { countryId: wanted, regions: [], regionsById: new Map() });
    Object.assign(s, { query: '', region: null, error: null, remote: idleRemote(), note, locateError: null });
    input.value = '';
    if (!el.open) el.showModal();
    render();
    input.focus();
    if (!s.countries.length) loadCountries();
    else countrySelect.value = s.countryId;
    if (!s.regions.length) await loadRegions();
    if (region) openRegion(s.regionsById.get(region.id) ?? region);
  }

  async function loadCountries() {
    try {
      const { value } = await service().countries();
      const pinned = s.countryId;
      s.countries = [...value].sort((a, b) =>
        a.id === pinned ? -1 : b.id === pinned ? 1 : collateTr.compare(a.name, b.name));
    } catch {
      s.countries = []; // ülke listesi olmadan da çalışır: yalnızca şu anki ülke seçilebilir
    }
    const options = s.countries.length ? s.countries : [country()];
    countrySelect.replaceChildren(...options.map((c) => h('option', { value: c.id }, placeName(c.name, c.id) || 'Türkiye')));
    countrySelect.value = s.countryId;
  }

  async function loadRegions() {
    const my = ++seq;
    Object.assign(s, { loading: 'regions', error: null, regions: [], regionsById: new Map() });
    render();
    try {
      const { value } = await service().regions(country());
      if (my !== seq) return;
      s.regions = [...value].sort((a, b) => collateTr.compare(a.name, b.name));
      s.regionsById = new Map(s.regions.map((r) => [r.id, r]));
    } catch (error) {
      if (my === seq) s.error = error;
    } finally {
      if (my === seq) { s.loading = ''; render(); }
    }
  }

  async function openRegion(region) {
    const my = ++seq;
    clearTimeout(remoteTimer);
    Object.assign(s, { region, districts: [], query: '', remote: idleRemote(), loading: 'districts', error: null });
    input.value = '';
    render();
    input.focus();
    try {
      const { value } = await service().districts(region);
      if (my !== seq) return;
      const center = fold(region.name);
      s.districts = [...value].sort((a, b) =>
        (fold(b.name) === center) - (fold(a.name) === center) || collateTr.compare(a.name, b.name));
    } catch (error) {
      if (my === seq) s.error = error;
    } finally {
      if (my === seq) { s.loading = ''; render(); }
    }
  }

  function back() {
    ++seq;
    Object.assign(s, { region: null, query: '', error: null, loading: '' });
    input.value = '';
    render();
    input.focus();
    if (!s.regions.length) loadRegions();
  }

  function pick(district, region = s.regionsById.get(district.regionId) ?? s.region) {
    const c = country();
    onSelect({
      id: district.id,
      name: district.name,
      regionId: district.regionId || region?.id,
      regionName: district.regionName || region?.name,
      countryId: district.countryId || c.id,
      countryName: district.countryName || c.name,
      timeZone: district.timeZone,
    });
    el.close();
  }

  async function locateHere() {
    if (s.locating) return;
    Object.assign(s, { locating: true, locateError: null });
    render();
    const result = await locate();
    s.locating = false;
    if (result.ok) { el.close(); return; }
    if (result.error?.code !== 'partial') s.locateError = result.error;
    render();
  }

  function queueRemote() {
    clearTimeout(remoteTimer);
    const q = fold(s.query).trim();
    if (s.region || !provider().capabilities.searchDistricts || q.length < REMOTE_MIN_CHARS) {
      s.remote = idleRemote();
      return;
    }
    if (s.remote.q === q && !s.remote.error) return;
    s.remote = { q, items: [], loading: true, error: null };
    remoteTimer = setTimeout(async () => {
      try {
        const { value } = await service().search(q);
        if (s.remote.q !== q) return;
        s.remote = { q, items: value.filter((d) => !d.countryId || d.countryId === s.countryId), loading: false, error: null };
      } catch (error) {
        if (s.remote.q !== q) return;
        s.remote = { q, items: [], loading: false, error };
      }
      render();
    }, REMOTE_DELAY_MS);
  }

  /* ---------------------------- çizim ---------------------------- */

  function render() {
    input.placeholder = s.region ? `${name(s.region.name)} ilçelerinde ara` : 'İl ya da ilçe ara';
    const note = s.note ? h('p', { class: 'picker__note' }, s.note) : null;
    let view;
    if (s.region) view = regionView();
    else {
      const q = fold(s.query).trim();
      view = q ? searchView(q) : browseView();
    }
    body.replaceChildren(...[note, view].filter(Boolean));
  }

  const empty = (text) => h('p', { class: 'picker__empty' }, text);
  const group = (title, content) =>
    h('section', { class: 'picker__group' }, h('h3', { class: 'picker__group-title' }, title), content);

  function statusLine() {
    if (s.loading === 'regions') return empty('Yükleniyor…');
    if (!s.error) return null;
    return h('p', { class: 'picker__empty' },
      describeError(s.error), ' ',
      h('button', { type: 'button', class: 'btn btn--quiet', onclick: () => (s.region ? openRegion(s.region) : loadRegions()) }, 'Tekrar dene'));
  }

  function locateRow() {
    if (!geoSupported) return null;
    return h('div', { class: 'picker__locate-wrap' },
      h('button', { type: 'button', class: 'picker__locate', onclick: locateHere, disabled: s.locating },
        iconEl('locate'),
        h('span', { class: 'picker__locate-text' },
          h('span', {}, s.locating ? 'Konumunuz bulunuyor…' : 'Bulunduğum yeri bul'),
          h('small', {}, s.locating ? 'Tarayıcı izin isteyebilir' : 'En yakın vakit noktasını seçer'))),
      s.locateError ? h('p', { class: 'picker__locate-error' }, describeError(s.locateError)) : null);
  }

  function regionGrid(regions) {
    const current = currentLocation();
    return h('div', { class: 'opt-grid' }, regions.map((region) =>
      h('button', {
        type: 'button',
        class: current?.regionId === region.id ? 'opt is-selected' : 'opt',
        'data-primary': '',
        onclick: () => openRegion(region),
      }, h('span', { class: 'opt__name' }, name(region.name)))));
  }

  function districtButton(district, { showRegion }) {
    const current = currentLocation();
    const region = s.regionsById.get(district.regionId) ?? s.region;
    const isCenter = region && fold(region.name) === fold(district.name);
    const sub = showRegion ? (region ? name(region.name) : '') : isCenter ? 'merkez' : '';
    return h('button', {
      type: 'button',
      class: current?.id === district.id ? 'opt is-selected' : 'opt',
      'data-primary': '',
      onclick: () => pick(district, region),
    }, h('span', { class: 'opt__name' }, name(district.name)), sub ? h('span', { class: 'opt__sub' }, sub) : null);
  }

  function browseView() {
    const scheme = provider().idScheme;
    const recent = recents().filter((r) => r.idScheme === scheme);
    return h('div', {},
      locateRow(),
      recent.length
        ? group('Son kullanılanlar', h('div', { class: 'chips' }, recent.map((r) => {
          const region = r.regionName && r.regionName !== r.name ? placeName(r.regionName, r.countryId) : '';
          return h('button', { type: 'button', class: 'chip', onclick: () => { onSelect(r); el.close(); } },
            placeName(r.name, r.countryId), region ? h('small', {}, region) : null);
        })))
        : null,
      group(regionsTitle(), statusLine() ?? regionGrid(s.regions)),
    );
  }

  function searchView(q) {
    const regions = s.regions.filter((r) => fold(r.name).includes(q));
    const parts = [statusLine()];
    if (regions.length) parts.push(group(regionsTitle(), regionGrid(regions)));

    if (provider().capabilities.searchDistricts) {
      const r = s.remote;
      if (q.length < REMOTE_MIN_CHARS) {
        if (!regions.length) parts.push(empty('İlçe aramak için en az üç harf yazın.'));
      } else if (r.loading) {
        parts.push(group('İlçeler', empty('Aranıyor…')));
      } else if (r.error) {
        parts.push(group('İlçeler', empty(describeError(r.error))));
      } else if (r.items.length) {
        parts.push(group('İlçeler', h('div', { class: 'opt-grid' }, r.items.map((d) => districtButton(d, { showRegion: true })))));
      } else if (!regions.length) {
        parts.push(empty('Sonuç yok. İlçe adını tam yazmayı deneyin ya da listeden ilini seçin.'));
      }
    } else if (!regions.length) {
      parts.push(empty('Eşleşen il yok. İli seçip ilçe listesine bakabilirsiniz.'));
    }
    return h('div', {}, parts);
  }

  function regionView() {
    const q = fold(s.query).trim();
    const list = q ? s.districts.filter((d) => fold(d.name).includes(q)) : s.districts;
    let content;
    if (s.loading === 'districts') content = empty('İlçeler yükleniyor…');
    else if (s.error) content = statusLine();
    else if (!list.length) content = empty('Eşleşen ilçe yok.');
    else content = h('div', { class: 'opt-grid' }, list.map((d) => districtButton(d, { showRegion: false })));

    return h('div', {},
      h('div', { class: 'picker__crumb' },
        h('button', { type: 'button', class: 'picker__back', onclick: back }, iconEl('chevronLeft'), regionsTitle()),
        h('h3', { class: 'picker__region' }, name(s.region.name))),
      content);
  }

  return { el, open };
}
