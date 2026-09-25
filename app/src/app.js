import { config } from './config.js';
import { createSettings } from './state/settings.js';
import { createProvider } from './providers/index.js';
import { createCache } from './core/cache.js';
import { createPrayerService } from './core/prayer-service.js';
import { readJson, safeStorage, writeJson } from './core/storage.js';
import { addDays, createClock, monthOf, monthsOfYear } from './core/time.js';
import { LocateError } from './core/errors.js';
import { createGeolocation, distanceKm } from './location/geolocation.js';
import { createReverseGeocoder } from './location/reverse-geocoder.js';
import { createLocator } from './location/locator.js';
import { createRouter } from './router.js';
import { buildViewModel, titleFor } from './ui/view-model.js';
import { createThemeController } from './ui/theme.js';
import { setPhase } from './ui/ambient.js';
import { placeName } from './ui/format.js';
import { createShell } from './ui/shell.js';
import { listTodayLayouts } from './ui/pages/index.js';
import { createLocationPicker } from './ui/components/location-picker.js';
import { createSettingsPanel } from './ui/components/settings-panel.js';
import { createInstaller } from './ui/install.js';

const TRAVEL_KEY = 'vakit:travel:v1';
const INSTALL_KEY = 'vakit:install:v1';
const INSTALL_HINT_DELAY_MS = 15_000;

const roundCoords = ({ lat, lon }) => ({ lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000 });
const deviceTimeZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; } };
const withoutPosition = ({ coords, source, ...rest }) => rest;

/**
 * Kompozisyon kökü. Katmanlar yalnızca burada birbirine bağlanır:
 *
 *   sağlayıcı (providers/*) → servis + önbellek (core/*) → durum → görünüm modeli → sayfa (ui/pages/*)
 *   tarayıcı konumu → yer adları (location/*) → sağlayıcının listesindeki konum
 *
 * Veri kaynağı değişirse arayüz değişmez; arayüz değişirse veri katmanı değişmez.
 */
export function startApp(root) {
  const params = new URLSearchParams(window.location.search);
  const storage = safeStorage();
  const settings = createSettings({ defaults: config.defaults });
  const cache = createCache(storage);
  const clock = createClock({ override: params.get('now') });
  const geo = createGeolocation({ override: params.get('geo') });
  const provider = createProvider(config.provider, config);
  const service = createPrayerService({ provider, cache, ttl: config.cacheTtl });
  const locator = createLocator({ service, geocoder: createReverseGeocoder(config.geocoder) });
  const theme = createThemeController({ getMode: () => settings.get().theme, forced: params.get('theme') });
  theme.apply();

  const compatible = (loc) => (loc && loc.idScheme === provider.idScheme ? loc : null);

  const state = {
    route: null,
    location: compatible(settings.get().location) ?? compatible(config.defaultLocation),
    days: new Map(),    // "YYYY-MM-DD" → DayTimes
    months: new Map(),  // "YYYY-MM"   → { status: 'loading'|'ready'|'empty'|'error', days, error }
    years: new Map(),   // "YYYY"      → { status, error }
    today: null,
    lastMeta: null,     // bugünün verisinin tazeliği (alt bilgide gösterilir)
    generation: 0,      // konum değişince eski isteklerin sonuçlarını yok saymak için
    locating: false,
    locateError: null,
  };

  /* ----------------------------- veri ----------------------------- */

  function resetData() {
    state.generation += 1;
    state.days.clear();
    state.months.clear();
    state.years.clear();
    state.lastMeta = null;
  }

  function putMonth(ym, days, meta) {
    state.months.set(ym, { status: days.length ? 'ready' : 'empty', days, error: null });
    for (const day of days) state.days.set(day.date, day);
    if (state.today && ym === monthOf(state.today)) state.lastMeta = meta;
  }

  function ensureMonth(ym) {
    const loc = state.location;
    if (!loc || !ym) return;
    const existing = state.months.get(ym);
    if (existing && existing.status !== 'error') return;
    const generation = state.generation;
    state.months.set(ym, { status: 'loading', days: [], error: null });

    service.month(loc.id, ym)
      .then(
        ({ value, meta }) => { if (generation === state.generation) putMonth(ym, value, meta); },
        (error) => {
          if (generation !== state.generation) return;
          state.months.set(ym, { status: 'error', days: [], error });
          console.warn(`[vakit] ${ym} alınamadı:`, error);
        },
      )
      .finally(() => { if (generation === state.generation) render(); });
  }

  /** Bütün yıl tek istekle; aylar ayrı ayrı yerleşir. */
  function ensureYear(year) {
    const loc = state.location;
    if (!loc || !year) return;
    const existing = state.years.get(year);
    if (existing && existing.status !== 'error') return;
    const generation = state.generation;
    const months = monthsOfYear(year);
    state.years.set(year, { status: 'loading', error: null });
    for (const ym of months) {
      const m = state.months.get(ym);
      if (!m || m.status === 'error') state.months.set(ym, { status: 'loading', days: [], error: null });
    }

    service.year(loc.id, year)
      .then(
        ({ value, meta }) => {
          if (generation !== state.generation) return;
          state.years.set(year, { status: 'ready', error: null });
          for (const { ym, days } of value) putMonth(ym, days, meta);
        },
        (error) => {
          if (generation !== state.generation) return;
          state.years.set(year, { status: 'error', error });
          for (const ym of months) {
            if (state.months.get(ym)?.status === 'loading') state.months.set(ym, { status: 'error', days: [], error });
          }
          console.warn(`[vakit] ${year} alınamadı:`, error);
        },
      )
      .finally(() => { if (generation === state.generation) render(); });
  }

  /** Bugün, yarın ve önümüzdeki hafta; Takvim açıksa gösterilen ay ya da yıl. */
  function syncData() {
    if (!state.location || !state.today) return;
    for (const iso of [state.today, addDays(state.today, 1), addDays(state.today, 6)]) ensureMonth(monthOf(iso));
    const route = state.route;
    if (route?.page !== 'calendar') return;
    if (route.mode === 'year') ensureYear(route.year);
    else ensureMonth(route.ym ?? monthOf(state.today));
  }

  /** Konumun saat dilimi: bilinen IANA adı, yoksa kaynağın verdiği UTC farkı, o da yoksa cihaz. */
  function zone() {
    const loc = state.location;
    if (!loc) return null;
    if (loc.timeZone) return { timeZone: loc.timeZone };
    for (const day of state.days.values()) {
      if (Number.isFinite(day.utcOffsetMinutes)) return { offsetMinutes: day.utcOffsetMinutes };
    }
    return null;
  }

  /* ----------------------------- konum ----------------------------- */

  function selectLocation(picked, { source = 'list', coords = null } = {}) {
    const location = {
      id: picked.id,
      name: picked.name,
      regionId: picked.regionId,
      regionName: picked.regionName,
      countryId: picked.countryId,
      countryName: picked.countryName,
      // Konumu cihaz bulduysa, cihazın saat dilimi o yerin saat dilimidir.
      timeZone: picked.timeZone ?? (source === 'gps' ? deviceTimeZone() : undefined),
      idScheme: provider.idScheme,
      source,
      coords,
    };
    const recents = [
      withoutPosition(location),
      ...settings.get().recents.filter((r) => !(r.id === location.id && r.idScheme === location.idScheme)),
    ].slice(0, settings.maxRecents);
    state.location = location;
    state.locateError = null;
    resetData();
    settings.set({ location, recents });
  }

  function announce(result) {
    const loc = result.location;
    const chosen = placeName(loc.name, loc.countryId);
    const region = placeName(loc.regionName, loc.countryId);
    if (result.exact) {
      shell.toast(`Konum bulundu: ${chosen === region ? chosen : `${chosen}, ${region}`}.`, { key: 'locate', duration: 4000 });
      return;
    }
    const here = result.place.districtNames[0] ?? result.place.label;
    const center = chosen === region ? `${chosen} (merkez)` : chosen;
    shell.toast(`${here} Diyanet'in listesinde ayrıca yer almadığı için ${center} vakitleri gösteriliyor.`, { key: 'locate', duration: 9000 });
  }

  /** Tarayıcı konumu → en uygun vakit noktası. Sonuç: { ok, result?, error? } */
  async function locateMe() {
    if (state.locating) return { ok: false, error: new LocateError('busy') };
    state.locating = true;
    state.locateError = null;
    render();
    try {
      const coords = await geo.getPosition();
      const result = await locator.locate(coords);
      if (result.location) {
        selectLocation(result.location, { source: 'gps', coords: roundCoords(coords) });
        announce(result);
        return { ok: true, result };
      }
      // Ülke ya da il bulundu ama ilçe seçilemedi: listeyi orada aç.
      picker.open({
        countryId: result.country?.id,
        region: result.region ?? undefined,
        note: `Bulunduğunuz yer: ${result.place.label}. Burası listede ayrıca yok; en yakın noktayı seçin.`,
      });
      return { ok: false, error: new LocateError('partial') };
    } catch (error) {
      if (!(error instanceof LocateError)) console.warn('[vakit] konum bulunamadı:', error);
      state.locateError = error;
      return { ok: false, error };
    } finally {
      state.locating = false;
      render();
    }
  }

  /**
   * Konumu cihaz bulduysa ve izin zaten verilmişse, açılışta başka bir yere gidilip gidilmediğine
   * bakar; gidildiyse yeni yeri önerir (kendiliğinden değiştirmez). Seyrek çalışır, reddedilen
   * öneri bir süre tekrar gösterilmez.
   */
  async function checkTravel() {
    const loc = state.location;
    if (!settings.get().travelCheck || loc?.source !== 'gps' || !loc.coords) return;
    const memo = readJson(storage, TRAVEL_KEY, {});
    if (Date.now() - (memo.checkedAt ?? 0) < config.travel.checkEveryMs) return;
    if ((await geo.permission()) !== 'granted') return;
    writeJson(storage, TRAVEL_KEY, { ...memo, checkedAt: Date.now() });

    let coords;
    let result;
    try {
      coords = await geo.getPosition({ maxAgeMs: 30 * 60_000, timeoutMs: 10_000 });
      if (distanceKm(coords, loc.coords) < config.travel.minDistanceKm) return;
      result = await locator.locate(coords);
    } catch {
      return;
    }
    const target = result.location;
    if (!target || state.location?.id !== loc.id) return;
    if (target.id === loc.id) {
      settings.set({ location: { ...loc, coords: roundCoords(coords) } });
      return;
    }
    if (memo.dismissedId === target.id && Date.now() - (memo.dismissedAt ?? 0) < config.travel.snoozeMs) return;

    const name = placeName(target.name, target.countryId);
    const region = placeName(target.regionName, target.countryId);
    shell.toast(`Başka bir yerde görünüyorsunuz: ${name === region ? name : `${name}, ${region}`}.`, {
      key: 'travel',
      duration: 0,
      actions: [['Buraya geç', () => { selectLocation(target, { source: 'gps', coords: roundCoords(coords) }); announce(result); }]],
      onDismiss: () => writeJson(storage, TRAVEL_KEY, { ...readJson(storage, TRAVEL_KEY, {}), dismissedId: target.id, dismissedAt: Date.now() }),
    });
  }

  /* ---------------------------- eylemler ---------------------------- */
  // Arayüz yalnızca bunları çağırır; durumun nasıl değiştiğini bilmez.

  const router = createRouter((route) => {
    state.route = route;
    syncData();
    render();
  });
  state.route = router.current();

  const actions = {
    openLocation: (context) => picker.open(context),
    openSettings: () => panel.open(),
    openCalendar: () => router.go({ page: 'calendar', mode: 'month', ym: null }),
    navigate: (route) => router.go(route),
    locate: () => locateMe(),
    retry() {
      for (const [ym, entry] of state.months) if (entry.status === 'error') state.months.delete(ym);
      for (const [year, entry] of state.years) if (entry.status === 'error') state.years.delete(year);
      syncData();
      render();
    },
    print: () => window.print(),
    toggleFullscreen() {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.().catch(() => {});
    },
  };

  function refresh() {
    cache.clear();
    resetData();
    syncData();
    render();
  }

  /* ---------------------------- arayüz ---------------------------- */

  const shell = createShell(actions);
  root.replaceChildren(shell.el);

  const picker = createLocationPicker({
    service: () => service,
    provider: () => provider,
    recents: () => settings.get().recents,
    currentLocation: () => state.location,
    defaultCountryId: config.defaultCountryId,
    geoSupported: geo.supported,
    locate: () => locateMe(),
    onSelect: (picked) => selectLocation(picked),
  });
  /* Uygulama olarak yükleme: Ayarlar'da hep, bir kez de kısa bir öneri olarak. */
  let installHintTimer = 0;
  const installer = createInstaller({
    onChange: (installState) => {
      panel.syncInstall();
      if (installState === 'available') scheduleInstallHint();
      if (installState === 'installed') shell.toast('Vakit uygulama olarak yüklendi.', { key: 'install', duration: 4000 });
    },
  });

  function scheduleInstallHint() {
    clearTimeout(installHintTimer);
    installHintTimer = setTimeout(() => {
      const kind = installer.state;
      if (!state.location || readJson(storage, INSTALL_KEY, {}).dismissedAt || (kind !== 'available' && kind !== 'ios')) return;
      shell.toast(
        kind === 'available'
          ? 'Vakit\'i uygulama olarak yükleyebilirsiniz; ana ekrandan açılır, internet yokken de çalışır.'
          : 'Vakit\'i ana ekrana eklemek için Safari\'de Paylaş düğmesine, sonra "Ana Ekrana Ekle"ye dokunun.',
        {
          key: 'install',
          duration: 0,
          actions: kind === 'available' ? [['Yükle', () => installer.install()]] : [],
          onDismiss: () => writeJson(storage, INSTALL_KEY, { dismissedAt: Date.now() }),
        },
      );
    }, INSTALL_HINT_DELAY_MS);
  }

  const panel = createSettingsPanel({ settings, layouts: listTodayLayouts(), installer, onRefresh: refresh, app: config.app });
  document.body.append(picker.el, panel.el);
  if (installer.state === 'ios') scheduleInstallHint();

  settings.subscribe((next, previous) => {
    if (next.theme !== previous.theme) theme.apply({ animate: true });
    syncData();
    render();
  });

  /* ------------------------ saniyelik döngü ------------------------ */

  let title = '';
  function render() {
    const tz = zone();
    const now = clock.now(tz);
    if (now.date !== state.today) {
      state.today = now.date;
      syncData();
    }
    const vm = buildViewModel({
      state,
      now,
      settings: settings.get(),
      zoneKnown: Boolean(tz) || !state.location,
      geoSupported: geo.supported,
    });
    const ready = vm.status === 'ready';
    theme.setSunUp(ready ? vm.sunUp : null);
    setPhase(ready ? vm.phase : null);
    shell.update(vm);
    const nextTitle = titleFor(vm);
    if (nextTitle !== title) document.title = title = nextTitle;
  }

  let timer = 0;
  function loop() {
    render();
    timer = window.setTimeout(loop, 1000 - (Date.now() % 1000) + 15);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    clearTimeout(timer);
    loop();
    checkTravel();
  });
  loop();

  // İlk açılış: kayıtlı konum yoksa bulunduğu yeri sor; varsa yer değişmiş mi diye bak.
  if (!state.location) locateMe();
  else setTimeout(checkTravel, 1500);
}
