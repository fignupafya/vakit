import { PRAYER_KEYS } from './prayers.js';
import { daysInMonth, isHM, monthRange, monthsOfYear } from './time.js';
import { ProviderError } from './errors.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const DEFAULT_TTL = {
  places: 30 * DAY,   // ülke / il / ilçe listeleri neredeyse hiç değişmez
  search: 7 * DAY,
  times: 30 * DAY,    // tam bir ayın vakitleri
  partial: 6 * HOUR,  // eksik gelen ay (ör. yalnızca yakın günleri veren kaynak)
  empty: 6 * HOUR,    // veri yok (ör. henüz yayımlanmamış yıl)
};

/**
 * Uygulamanın veri kapısı: sağlayıcıyı (adapter) önbellekle sarar.
 * Arayüz hiçbir zaman sağlayıcıyı doğrudan çağırmaz; hep bu servisi kullanır.
 *
 * Her yöntem `{ value, meta }` döndürür. meta.from: 'cache' | 'network';
 * meta.stale = true ise ağ başarısız oldu ve süresi geçmiş önbellek kullanıldı.
 *
 * @param {{ provider: import('../providers/contract.js').PrayerTimesProvider, cache: ReturnType<import('./cache.js').createCache>, ttl?: Partial<typeof DEFAULT_TTL> }} deps
 */
export function createPrayerService({ provider, cache, ttl = {} }) {
  const T = { ...DEFAULT_TTL, ...ttl };
  const inflight = new Map();
  const keyOf = (key) => `${provider.id}:${key}`;
  const monthKey = (districtId, ym) => keyOf(`times:${districtId}:${ym}`);
  const monthTtl = (days, ym) => (days.length >= daysInMonth(ym) ? T.times : days.length ? T.partial : T.empty);

  /** Aynı anahtar için aynı anda tek istek; ağ yoksa bayat önbelleğe düş. */
  function once(key, task) {
    if (inflight.has(key)) return inflight.get(key);
    const promise = task().finally(() => inflight.delete(key));
    inflight.set(key, promise);
    return promise;
  }

  function load(key, loader, ttlFor) {
    const cacheKey = keyOf(key);
    const hit = cache.get(cacheKey);
    if (hit && !hit.stale) return Promise.resolve({ value: hit.value, meta: { from: 'cache', savedAt: hit.savedAt } });
    return once(cacheKey, async () => {
      try {
        const value = await loader();
        const ms = typeof ttlFor === 'function' ? ttlFor(value) : ttlFor;
        if (ms > 0) cache.set(cacheKey, value, ms);
        return { value, meta: { from: 'network', savedAt: Date.now() } };
      } catch (error) {
        if (hit) return { value: hit.value, meta: { from: 'cache', savedAt: hit.savedAt, stale: true, error } };
        throw error;
      }
    });
  }

  /**
   * Art arda gelen ayların vakitleri, aylara bölünmüş: [{ ym, days }]. Tek istekle alınır ve her ay
   * ayrı önbelleğe yazılır; böylece aylık görünüm de aynı veriyi kullanır. Hepsi önbellekte tazeyse
   * istek atılmaz.
   * @param {string[]} yms  sıralı, art arda aylar; ör. ['2026-09', '2026-10']
   */
  function months(districtId, yms) {
    const hits = yms.map((ym) => cache.get(monthKey(districtId, ym)));
    const fromCache = (stale, error) => ({
      value: yms.map((ym, i) => ({ ym, days: hits[i]?.value ?? [] })),
      meta: { from: 'cache', savedAt: Math.min(...hits.filter(Boolean).map((h) => h.savedAt)), stale, error },
    });
    if (hits.every((h) => h && !h.stale)) return Promise.resolve(fromCache(false));

    const from = monthRange(yms[0]).from;
    const to = monthRange(yms[yms.length - 1]).to;
    return once(keyOf(`times:${districtId}:${from}:${to}`), async () => {
      try {
        const days = sanitizeDays(await provider.getTimes(districtId, { from, to }), from, to);
        const byMonth = new Map(yms.map((ym) => [ym, []]));
        for (const day of days) byMonth.get(day.date.slice(0, 7))?.push(day);
        const value = yms.map((ym) => {
          const list = byMonth.get(ym);
          cache.set(monthKey(districtId, ym), list, monthTtl(list, ym));
          return { ym, days: list };
        });
        return { value, meta: { from: 'network', savedAt: Date.now() } };
      } catch (error) {
        if (hits.some(Boolean)) return fromCache(true, error);
        throw error;
      }
    });
  }

  return {
    provider,
    countries: () => load('countries', () => provider.listCountries(), T.places),
    regions: (country) => load(`regions:${country.id}`, () => provider.listRegions(country), T.places),
    districts: (region) => load(`districts:${region.id}`, () => provider.listDistricts(region), T.places),

    search(query) {
      if (!provider.capabilities.searchDistricts) return Promise.resolve({ value: [], meta: { from: 'cache' } });
      return load(`search:${query}`, () => provider.searchDistricts(query), T.search);
    },

    /** Bir ayın vakitleri. @param {string} ym "YYYY-MM" */
    month(districtId, ym) {
      const { from, to } = monthRange(ym);
      return load(
        `times:${districtId}:${ym}`,
        async () => sanitizeDays(await provider.getTimes(districtId, { from, to }), from, to),
        (days) => monthTtl(days, ym),
      );
    },

    months,

    /** Bir yılın vakitleri, aylara bölünmüş: [{ ym, days }] (tek istek). */
    year: (districtId, year) => months(districtId, monthsOfYear(year)),
  };
}

/** Sağlayıcıdan gelen günleri doğrular: aralık dışı, bozuk ya da tekrar eden kayıtları eler. */
export function sanitizeDays(days, from, to) {
  if (!Array.isArray(days)) throw new ProviderError('Veri kaynağı vakit listesi döndürmedi.', { code: 'bad_response' });
  const byDate = new Map();
  for (const day of days) {
    if (!day || typeof day.date !== 'string' || day.date < from || day.date > to) continue;
    if (!PRAYER_KEYS.every((key) => isHM(day.times?.[key]))) continue;
    byDate.set(day.date, day);
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}
