import { getJson } from '../core/http.js';

/**
 * Koordinat → yer adları (ülke, il/eyalet, ilçe…). BigDataCloud'un tarayıcıdan kullanım için
 * ücretsiz, anahtarsız servisi kullanılır. Aynı `reverse` biçimini döndüren başka bir servis
 * (kendi sunucumuz, Nominatim…) bu dosyanın yerine konabilir.
 *
 * Gizlilik: koordinat ~100 m hassasiyete yuvarlanarak gönderilir; il/ilçe adı için bu yeterli.
 *
 * @typedef {{
 *   countryCode: string,
 *   countryNames: string[],   ülke adı ve üst yönetim birimleri ("Hollanda Krallığı", "Hollanda")
 *   regionNames: string[],    il / eyalet
 *   districtNames: string[],  ilçe ve daha küçük birimler, genelden özele
 *   cityNames: string[],      şehir (ilçe bulunamazsa yedek)
 *   label: string             kullanıcıya gösterilecek kısa ad: "Kadıköy, İstanbul"
 * }} Place
 */
export function createReverseGeocoder({ baseUrl = 'https://api.bigdatacloud.net', language = 'tr', timeoutMs = 10_000 } = {}) {
  return {
    /** @returns {Promise<Place>} */
    async reverse({ lat, lon }, { language: lang = language } = {}) {
      const url = new URL('/data/reverse-geocode-client', baseUrl);
      url.searchParams.set('latitude', lat.toFixed(3));
      url.searchParams.set('longitude', lon.toFixed(3));
      url.searchParams.set('localityLanguage', lang);
      const data = await getJson(url.href, { timeoutMs });

      const admin = (data?.localityInfo?.administrative ?? []).filter((a) => a?.name);
      const level = (test) => admin.filter((a) => test(a.adminLevel)).sort((a, b) => a.adminLevel - b.adminLevel).map((a) => a.name);
      const regionNames = unique([data.principalSubdivision, ...level((l) => l === 4)]);
      const districtNames = unique([...level((l) => l >= 5), data.locality]);

      return {
        countryCode: data.countryCode ?? '',
        countryNames: unique([data.countryName, ...level((l) => l === 2 || l === 3)]),
        regionNames,
        districtNames,
        cityNames: unique([data.city]),
        label: unique([districtNames[0] ?? data.city, regionNames[0]]).join(', '),
      };
    },
  };
}

const unique = (list) => [...new Set(list.filter(Boolean))];
