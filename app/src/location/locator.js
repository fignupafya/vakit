import { fold } from '../core/text.js';
import { LocateError } from '../core/errors.js';

/** Ülke adı eşleşmezse ISO koduna göre Diyanet ülkesi (Kıbrıs'ın kuzeyi Diyanet'te ayrı ülke). */
const COUNTRY_BY_CODE = { TR: '2', CY: '1' };

/** Yurt dışında il/eyalet adlarının yerel yazımı için ikinci deneme dili (Diyanet yerel adları kullanıyor). */
const LOCAL_LANGUAGE = {
  DE: 'de', AT: 'de', CH: 'de', LI: 'de', NL: 'nl', BE: 'nl', FR: 'fr', LU: 'fr', GB: 'en', IE: 'en',
  US: 'en', CA: 'en', AU: 'en', NZ: 'en', SE: 'sv', DK: 'da', NO: 'nb', IT: 'it', ES: 'es', PT: 'pt',
};

/** Karşılaştırma için: Türkçe/aksanlı harfler düzleşir, tire ve boşluklar birleşir, "ili/merkez" gibi ekler düşer. */
const clean = (name) =>
  fold(name).replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+(merkez|merkezi|ili|ilcesi|kazasi|province|district)$/, '');

function findByNames(items, names) {
  for (const wanted of names.map(clean).filter(Boolean)) {
    const hit = items.find((item) => clean(item.name) === wanted);
    if (hit) return hit;
  }
  return null;
}

/**
 * Koordinattan veri kaynağındaki konuma. Koordinat önce yer adlarına çevrilir, sonra bu adlar
 * sağlayıcının ülke → il → ilçe listeleriyle eşleştirilir (Diyanet'in kendi sitesi de böyle yapar).
 * Diyanet'in listesi idari ilçelerin tamamı değil, vakit noktalarıdır: ilçenin kendi kaydı yoksa
 * (ör. Kadıköy) ilin merkez kaydı (İstanbul) seçilir ve `exact` false döner.
 *
 * Sonuç: { place, country, region, location, exact }. `location` boşsa ülke ya da il bulunmuş ama
 * ilçe seçilememiştir; arayüz listeyi o noktada açar.
 */
export function createLocator({ service, geocoder }) {
  async function match(place) {
    const countries = (await service.countries()).value;
    const country = findByNames(countries, place.countryNames)
      ?? countries.find((c) => c.id === COUNTRY_BY_CODE[place.countryCode]);
    if (!country) throw new LocateError('no_country', { place });

    const regions = (await service.regions(country)).value;
    const region = findByNames(regions, [...place.regionNames, ...place.districtNames, ...place.cityNames])
      ?? (regions.length === 1 ? regions[0] : null);
    if (!region) return { place, country, region: null, location: null, exact: false };

    const districts = (await service.districts(region)).value;
    const exact = findByNames(districts, place.districtNames);
    const district = exact
      ?? districts.find((d) => clean(d.name) === clean(region.name))
      ?? findByNames(districts, place.cityNames)
      ?? (districts.length === 1 ? districts[0] : null);
    if (!district) return { place, country, region, location: null, exact: false };

    return {
      place,
      country,
      region,
      exact: Boolean(exact),
      location: {
        ...district,
        regionId: district.regionId || region.id,
        regionName: district.regionName || region.name,
        countryId: district.countryId || country.id,
        countryName: district.countryName || country.name,
      },
    };
  }

  return {
    async locate(coords) {
      const place = await geocoder.reverse(coords);
      const first = await match(place);
      const local = LOCAL_LANGUAGE[place.countryCode];
      if (first.location || !local) return first;
      // Yurt dışı: adları o ülkenin kendi diliyle bir kez daha dene ("Bavyera" → "Bayern").
      const native = await geocoder.reverse(coords, { language: local });
      const second = await match({ ...native, countryNames: place.countryNames, label: place.label });
      return second.location || (second.region && !first.region) ? second : first;
    },
  };
}
