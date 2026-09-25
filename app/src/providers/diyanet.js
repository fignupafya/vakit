/* Diyanet kimlik şemasını kullanan sağlayıcıların ortak yardımcıları. */

export const DIYANET_SCHEME = 'diyanet';

/**
 * Diyanet ülke kimliği → IANA saat dilimi. Yalnızca kesin bildiklerimiz;
 * diğer ülkelerde kaynağın verdiği UTC farkına, o da yoksa cihaz saatine düşülür.
 */
const ZONES = {
  2: 'Europe/Istanbul',   // Türkiye
  1: 'Asia/Famagusta',    // Kuzey Kıbrıs
};

export const diyanetTimeZone = (countryId) => ZONES[String(countryId)];

/** "8.4.1448" → { day: 8, month: 4, year: 1448 } */
export function parseHijriShort(value, label) {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{3,4})$/.exec(String(value ?? '').trim());
  if (!m) return label ? { day: 0, month: 0, year: 0, label } : null;
  return { day: Number(m[1]), month: Number(m[2]), year: Number(m[3]), label };
}
