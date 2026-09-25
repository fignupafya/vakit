/**
 * Uygulamanın kod tarafındaki ayarları. Kullanıcının seçtikleri (tema, konum, …)
 * ayrıca tarayıcıda saklanır; bkz. state/settings.js.
 */
export const config = {
  app: { name: 'Vakit', version: '0.2.0' },

  /**
   * Vakitlerin alındığı kaynak (providers/index.js'teki kimlik). Arayüzde seçilmez;
   * başka bir API'ye geçmek için yalnızca burayı değiştirmek yeter.
   */
  provider: 'imsakiyem',
  providers: {
    imsakiyem: { baseUrl: 'https://ezanvakti.imsakiyem.com' },
    ezanvakti: { baseUrl: 'https://ezanvakti.emushaf.net' },
  },

  /** Koordinattan il/ilçe adını bulan servis (location/reverse-geocoder.js). */
  geocoder: { baseUrl: 'https://api.bigdatacloud.net', language: 'tr' },

  /** Kullanıcının değiştirebildiği ayarların ilk değerleri. */
  defaults: {
    theme: 'system',     // 'system' | 'light' | 'dark' | 'sun'
    layout: 'ferah',     // Bugün ekranının düzeni: ui/pages/index.js
    showSeconds: true,
    travelCheck: true,   // yer değişince yeni konumu öner
  },

  /**
   * Konum yokken gösterilecek yer. `null`: ilk açılışta konum izni istenir, olmazsa listeden seçtirilir.
   * Örnek: { id: '9541', name: 'İSTANBUL', regionId: '539', regionName: 'İSTANBUL', countryId: '2',
   *          countryName: 'TÜRKİYE', idScheme: 'diyanet', timeZone: 'Europe/Istanbul' }
   */
  defaultLocation: null,

  /** Konum seçicide ilk açılan ülke (Diyanet kimliği; 2 = Türkiye). */
  defaultCountryId: '2',

  /** Yer değişikliği önerisi: bu kadar uzaklaşınca, en fazla bu sıklıkla kontrol edilir. */
  travel: { minDistanceKm: 20, checkEveryMs: 3 * 3_600_000, snoozeMs: 7 * 24 * 3_600_000 },

  /** Önbellek süreleri (ms). Boş bırakılanlar core/prayer-service.js'teki varsayılanları kullanır. */
  cacheTtl: {},
};
