/** Vakitlerin sabit sırası. Bütün katmanlar bu anahtarlarla konuşur. */
export const PRAYER_KEYS = Object.freeze(['imsak', 'gunes', 'ogle', 'ikindi', 'aksam', 'yatsi']);

export const PRAYER_NAMES = Object.freeze({
  imsak: 'İmsak',
  gunes: 'Güneş',
  ogle: 'Öğle',
  ikindi: 'İkindi',
  aksam: 'Akşam',
  yatsi: 'Yatsı',
});

/**
 * Bir vakitten sonrakine kadar süren aralığın adı ("Şu an ___ vakti").
 * İmsak ile güneş arası sabah namazının vaktidir; güneş ile öğle arasında farz namaz yoktur (kuşluk).
 */
export const PERIOD_NAMES = Object.freeze({
  imsak: 'Sabah',
  gunes: 'Kuşluk',
  ogle: 'Öğle',
  ikindi: 'İkindi',
  aksam: 'Akşam',
  yatsi: 'Yatsı',
});

/** Geri sayım cümlesinin başı: "İkindi vaktine kalan süre". */
const UNTIL = {
  imsak: 'İmsak vaktine',
  gunes: 'Güneşin doğuşuna',
  ogle: 'Öğle vaktine',
  ikindi: 'İkindi vaktine',
  aksam: 'Akşam vaktine',
  yatsi: 'Yatsı vaktine',
};
const UNTIL_RAMADAN = { imsak: 'İmsaka', aksam: 'İftara' };

export function untilPhrase(key, { ramadan = false } = {}) {
  return (ramadan && UNTIL_RAMADAN[key]) || UNTIL[key];
}

/** Kısa yönelme hâli, sekme başlığı için: "İkindiye 1 sa 24 dk". */
const TOWARDS = {
  imsak: 'İmsaka',
  gunes: 'Güneşin doğuşuna',
  ogle: 'Öğleye',
  ikindi: 'İkindiye',
  aksam: 'Akşama',
  yatsi: 'Yatsıya',
};

export function towards(key, { ramadan = false } = {}) {
  return (ramadan && key === 'aksam' && 'İftara') || TOWARDS[key];
}

/** Ramazan'da vakit adının yanında gösterilen ikinci ad. */
export const RAMADAN_ALT = Object.freeze({ imsak: 'Sahur', aksam: 'İftar' });
export const RAMADAN_MONTH = 9;

/** Diyanet takvimindeki yazımıyla hicrî aylar (1 = Muharrem). */
export const HIJRI_MONTHS = Object.freeze([
  'Muharrem', 'Safer', 'Rebiülevvel', 'Rebiülahir', 'Cemaziyelevvel', 'Cemaziyelahir',
  'Recep', 'Şaban', 'Ramazan', 'Şevval', 'Zilkade', 'Zilhicce',
]);

/** Sağlayıcıdan gelen hicrî tarihi tek tip yazar: "14 Rebiülahir 1448". */
export function hijriLabel(hijri, { withYear = true } = {}) {
  if (!hijri) return '';
  const month = HIJRI_MONTHS[hijri.month - 1];
  if (!month || !hijri.day) return hijri.label ?? '';
  return withYear && hijri.year ? `${hijri.day} ${month} ${hijri.year}` : `${hijri.day} ${month}`;
}
