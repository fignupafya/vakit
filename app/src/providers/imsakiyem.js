import { getJson } from '../core/http.js';
import { ProviderError } from '../core/errors.js';
import { daysBetween } from '../core/time.js';
import { fold } from '../core/text.js';
import { DIYANET_SCHEME, diyanetTimeZone } from './diyanet.js';

/**
 * ezanvakti.imsakiyem.com adapter'ı.
 * Veri: T.C. Diyanet İşleri Başkanlığı (sağlayıcı kendi veritabanından sunuyor; yıllık yükleniyor).
 * Yanıt biçimi: { success, code, message, data: [...], meta }
 * İstek sınırı: 5 dakikada 100 istek; bu yüzden her şey önbelleğe alınır.
 */
export function createImsakiyemProvider({ baseUrl = 'https://ezanvakti.imsakiyem.com', timeoutMs } = {}) {
  async function call(path, params = {}) {
    const url = new URL(path, baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
    const body = await getJson(url.href, { timeoutMs });
    if (!body || body.success !== true || !Array.isArray(body.data)) {
      throw new ProviderError(body?.message || 'Veri kaynağından beklenmeyen bir yanıt geldi.', { code: 'bad_response' });
    }
    return body.data;
  }

  // Bazı uç noktalar ilişkili kaydı nesne olarak, bazıları yalnızca kimlik olarak döndürüyor.
  const idOf = (ref) => String(ref?._id ?? ref ?? '');

  const toCountry = (c) => ({ id: idOf(c._id), name: c.name });
  const toRegion = (s) => ({ id: idOf(s._id), name: s.name, countryId: idOf(s.country_id) });
  const toDistrict = (d) => {
    const countryId = idOf(d.country_id);
    return {
      id: idOf(d._id),
      name: d.name,
      regionId: idOf(d.state_id),
      countryId,
      regionName: d.state_id?.name,
      countryName: d.country_id?.name,
      timeZone: diyanetTimeZone(countryId),
    };
  };
  const toDay = (r) => ({
    date: String(r.date ?? '').slice(0, 10),
    hijri: r.hijri_date
      ? { day: r.hijri_date.day, month: r.hijri_date.month, year: r.hijri_date.year, label: r.hijri_date.full_date }
      : null,
    times: {
      imsak: r.times?.imsak,
      gunes: r.times?.gunes,
      ogle: r.times?.ogle,
      ikindi: r.times?.ikindi,
      aksam: r.times?.aksam,
      yatsi: r.times?.yatsi,
    },
  });

  return {
    id: 'imsakiyem',
    label: 'İmsakiyem API',
    idScheme: DIYANET_SCHEME,
    attribution: { dataSource: 'T.C. Diyanet İşleri Başkanlığı', via: 'ezanvakti.imsakiyem.com', url: 'https://ezanvakti.imsakiyem.com' },
    capabilities: { searchDistricts: true, dateRange: 'any' },

    async listCountries() {
      return (await call('/api/locations/countries')).map(toCountry);
    },
    async listRegions(country) {
      return (await call('/api/locations/states', { countryId: country.id })).map(toRegion);
    },
    async listDistricts(region) {
      return (await call('/api/locations/districts', { stateId: region.id })).map(toDistrict);
    },
    /** Arama tam kelimeyle ve Türkçe karakter olmadan eşleşiyor ("polatlı" değil "polatli"). */
    async searchDistricts(query) {
      const q = fold(query).trim();
      if (q.length < 2) return [];
      return (await call('/api/locations/search/districts', { q })).map(toDistrict);
    },
    async getTimes(districtId, { from, to }) {
      const rows = await call(`/api/prayer-times/${encodeURIComponent(districtId)}/range`, {
        startDate: from,
        endDate: to,
        limit: daysBetween(from, to) + 1,
      });
      return rows.map(toDay);
    },
  };
}
