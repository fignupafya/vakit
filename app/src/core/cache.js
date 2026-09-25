import { readJson, safeStorage, writeJson } from './storage.js';

const PREFIX = 'vakit:c1:';

/**
 * Süreli anahtar-değer önbelleği. Süresi dolan kayıt silinmez, "bayat" olarak işaretlenir:
 * ağ yoksa uygulama bayat veriyle çalışmaya devam edebilir.
 * Depolama değiştirilmek istenirse (ör. IndexedDB) yalnızca bu dosya değişir.
 */
export function createCache(storage = safeStorage(), { now = () => Date.now() } = {}) {
  const keys = () => {
    const out = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k?.startsWith(PREFIX)) out.push(k);
    }
    return out;
  };

  return {
    /** @returns {{ value: any, savedAt: number, stale: boolean } | null} */
    get(key) {
      const rec = readJson(storage, PREFIX + key, null);
      if (!rec || typeof rec !== 'object' || !('v' in rec)) return null;
      return { value: rec.v, savedAt: rec.t, stale: now() > rec.x };
    },

    set(key, value, ttlMs) {
      const rec = { v: value, t: now(), x: now() + ttlMs };
      if (writeJson(storage, PREFIX + key, rec)) return true;
      // Depo doluysa en eski kayıtların yarısını bırakıp bir kez daha dene.
      const byAge = keys()
        .map((k) => [k, readJson(storage, k, null)?.t ?? 0])
        .sort((a, b) => a[1] - b[1]);
      for (const [k] of byAge.slice(0, Math.ceil(byAge.length / 2))) storage.removeItem(k);
      return writeJson(storage, PREFIX + key, rec);
    },

    /** Süresi `graceMs`'ten daha önce dolmuş kayıtları siler (geçmiş aylar, artık kullanılmayan yerler). */
    sweep(graceMs) {
      for (const k of keys()) {
        const expires = readJson(storage, k, null)?.x;
        if (!Number.isFinite(expires) || now() > expires + graceMs) storage.removeItem(k);
      }
    },

    clear() {
      for (const k of keys()) storage.removeItem(k);
    },
  };
}
