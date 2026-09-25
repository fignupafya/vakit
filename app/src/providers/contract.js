/**
 * SAĞLAYICI (ADAPTER) SÖZLEŞMESİ
 * ==============================
 * Uygulama namaz vakitlerini hangi API'den aldığını bilmez; yalnızca aşağıdaki
 * biçimde bir nesneyle konuşur. Yeni bir kaynak eklemek için:
 *   1. Bu klasöre, aşağıdaki nesneyi döndüren bir `createXProvider(options)` fabrikası yazın.
 *      API'nin ham yanıtını burada tanımlanan alan modeline çevirmek adapter'ın işidir.
 *   2. providers/index.js'teki listeye ekleyin. Ayarlar ekranında kendiliğinden görünür.
 *
 * @typedef {{ id: string, name: string }} Country
 * @typedef {{ id: string, name: string, countryId: string }} Region
 *   İl / eyalet.
 * @typedef {{ id: string, name: string, regionId: string, countryId: string, regionName?: string, countryName?: string, timeZone?: string }} District
 *   İlçe. Vakitler ilçe düzeyinde sorulur. timeZone: bilinen IANA saat dilimi.
 * @typedef {{ day: number, month: number, year: number, label?: string }} HijriDate
 * @typedef {{ imsak: string, gunes: string, ogle: string, ikindi: string, aksam: string, yatsi: string }} Times
 *   "HH:mm", konumun yerel saatiyle.
 * @typedef {{ date: string, times: Times, hijri?: HijriDate | null, utcOffsetMinutes?: number }} DayTimes
 *   date: "YYYY-MM-DD". utcOffsetMinutes: kaynak veriyorsa o günün UTC farkı.
 *
 * @typedef {Object} PrayerTimesProvider
 * @property {string} id
 * @property {string} label
 * @property {string} idScheme
 *   Konum kimliklerinin ait olduğu şema. Aynı şemayı paylaşan kaynaklar arasında
 *   geçiş yapılınca seçili konum korunur (Diyanet kimliklerini kullananlar: 'diyanet').
 * @property {{ dataSource: string, via: string, url?: string }} attribution
 * @property {{ searchDistricts: boolean, dateRange: 'any' | 'rolling' }} capabilities
 *   dateRange: 'any' → istenen herhangi bir ay; 'rolling' → yalnızca yakın günler.
 * @property {() => Promise<Country[]>} listCountries
 * @property {(country: Country) => Promise<Region[]>} listRegions
 * @property {(region: Region) => Promise<District[]>} listDistricts
 * @property {(query: string) => Promise<District[]>} [searchDistricts]
 * @property {(districtId: string, range: { from: string, to: string }) => Promise<DayTimes[]>} getTimes
 *   Hata durumunda core/errors.js'teki ProviderError fırlatılmalıdır.
 */

const REQUIRED = ['id', 'label', 'idScheme', 'attribution', 'capabilities', 'listCountries', 'listRegions', 'listDistricts', 'getTimes'];

/** Geliştirme sırasında eksik bir sağlayıcıyı erkenden yakalar. */
export function assertProvider(provider) {
  const missing = REQUIRED.filter((key) => provider?.[key] == null);
  if (missing.length) throw new TypeError(`Sağlayıcı sözleşmesi eksik: ${missing.join(', ')}`);
  if (provider.capabilities.searchDistricts && typeof provider.searchDistricts !== 'function') {
    throw new TypeError(`${provider.id}: searchDistricts yeteneği bildirilmiş ama yöntemi yok`);
  }
  return provider;
}
