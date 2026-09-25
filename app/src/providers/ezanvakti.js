import { getJson } from '../core/http.js';
import { ProviderError } from '../core/errors.js';
import { DIYANET_SCHEME, diyanetTimeZone, parseHijriShort } from './diyanet.js';

const WINDOW_TTL = 6 * 3_600_000;

/**
 * ezanvakti.emushaf.net (EzanVaktiAPI) adapter'ı.
 * Veri: T.C. Diyanet İşleri Başkanlığı. Uç noktalar düz dizi döndürür.
 * Kısıt: /vakitler/{ilçe} yalnızca yakın ~30 günü verir; istenen ay bu pencereyle
 * kesişen kısmıyla döner (capabilities.dateRange = 'rolling').
 */
export function createEzanVaktiProvider({ baseUrl = 'https://ezanvakti.emushaf.net', timeoutMs } = {}) {
  const windows = new Map(); // ilçe → { at, promise }: aynı pencere için tekrar istek atma

  async function call(path) {
    const body = await getJson(new URL(path, baseUrl).href, { timeoutMs });
    if (!Array.isArray(body)) throw new ProviderError('Veri kaynağından beklenmeyen bir yanıt geldi.', { code: 'bad_response' });
    return body;
  }

  const toDay = (r) => {
    const [d, m, y] = String(r.MiladiTarihKisa ?? '').split('.');
    const offset = Number(r.GreenwichOrtalamaZamani);
    return {
      date: `${y}-${m}-${d}`,
      hijri: parseHijriShort(r.HicriTarihKisa, r.HicriTarihUzun),
      times: { imsak: r.Imsak, gunes: r.Gunes, ogle: r.Ogle, ikindi: r.Ikindi, aksam: r.Aksam, yatsi: r.Yatsi },
      utcOffsetMinutes: Number.isFinite(offset) ? Math.round(offset * 60) : undefined,
    };
  };

  function timesWindow(districtId) {
    const hit = windows.get(districtId);
    if (hit && Date.now() - hit.at < WINDOW_TTL) return hit.promise;
    const promise = call(`/vakitler/${encodeURIComponent(districtId)}`).then((rows) => rows.map(toDay));
    windows.set(districtId, { at: Date.now(), promise });
    promise.catch(() => windows.delete(districtId));
    return promise;
  }

  return {
    id: 'ezanvakti',
    label: 'EzanVakti API',
    idScheme: DIYANET_SCHEME,
    attribution: { dataSource: 'T.C. Diyanet İşleri Başkanlığı', via: 'ezanvakti.emushaf.net', url: 'https://ezanvakti.emushaf.net' },
    capabilities: { searchDistricts: false, dateRange: 'rolling' },

    async listCountries() {
      return (await call('/ulkeler')).map((c) => ({ id: String(c.UlkeID), name: c.UlkeAdi }));
    },
    async listRegions(country) {
      return (await call(`/sehirler/${encodeURIComponent(country.id)}`)).map((s) => ({
        id: String(s.SehirID),
        name: s.SehirAdi,
        countryId: String(country.id),
      }));
    },
    async listDistricts(region) {
      return (await call(`/ilceler/${encodeURIComponent(region.id)}`)).map((d) => ({
        id: String(d.IlceID),
        name: d.IlceAdi,
        regionId: String(region.id),
        countryId: region.countryId,
        timeZone: diyanetTimeZone(region.countryId),
      }));
    },
    async getTimes(districtId, { from, to }) {
      const days = await timesWindow(districtId);
      return days.filter((day) => day.date >= from && day.date <= to);
    },
  };
}
