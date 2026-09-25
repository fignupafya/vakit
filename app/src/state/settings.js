import { readJson, safeStorage, writeJson } from '../core/storage.js';

const KEY = 'vakit:settings:v1';
const THEMES = ['system', 'light', 'dark', 'sun'];
const MAX_RECENTS = 6;

const isLocation = (value) =>
  Boolean(value) && typeof value.id === 'string' && typeof value.name === 'string' && typeof value.idScheme === 'string';

function sanitize(value, defaults) {
  return {
    theme: THEMES.includes(value.theme) ? value.theme : defaults.theme,
    layout: typeof value.layout === 'string' ? value.layout : defaults.layout,
    showSeconds: typeof value.showSeconds === 'boolean' ? value.showSeconds : defaults.showSeconds,
    travelCheck: typeof value.travelCheck === 'boolean' ? value.travelCheck : defaults.travelCheck,
    location: isLocation(value.location) ? value.location : null,
    recents: Array.isArray(value.recents) ? value.recents.filter(isLocation).slice(0, MAX_RECENTS) : [],
  };
}

/**
 * Kullanıcı tercihleri: tarayıcıda saklanır, değişince abonelere haber verir.
 * (Anahtar adı index.html'deki tema ön-yükleyicisiyle aynı olmalı.)
 */
export function createSettings({ defaults }) {
  const storage = safeStorage();
  let value = sanitize({ ...defaults, ...readJson(storage, KEY, {}) }, defaults);
  const listeners = new Set();

  return {
    get: () => value,
    set(patch) {
      const previous = value;
      value = sanitize({ ...value, ...patch }, defaults);
      writeJson(storage, KEY, value);
      for (const listener of listeners) listener(value, previous);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    maxRecents: MAX_RECENTS,
  };
}
