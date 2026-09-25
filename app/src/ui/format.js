/* Türkçe biçimlendirme: tarih etiketleri ve yer adları. */

const utc = (iso) => new Date(`${iso}T00:00:00Z`);
const LONG_DATE = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const WEEKDAY = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', timeZone: 'UTC' });
const WEEKDAY_SHORT = new Intl.DateTimeFormat('tr-TR', { weekday: 'short', timeZone: 'UTC' });
const MONTH = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const MONTH_NAME = new Intl.DateTimeFormat('tr-TR', { month: 'long', timeZone: 'UTC' });
const MONTH_SHORT = new Intl.DateTimeFormat('tr-TR', { month: 'short', timeZone: 'UTC' });
const SHORT_DATE = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const STAMP = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const longDate = (iso) => LONG_DATE.format(utc(iso));            // 25 Eylül 2026
export const shortDate = (iso) => SHORT_DATE.format(utc(iso));          // 25 Eyl
export const weekdayName = (iso) => WEEKDAY.format(utc(iso));           // Cuma
export const weekdayShort = (iso) => WEEKDAY_SHORT.format(utc(iso));    // Cum
export const monthLabel = (ym) => MONTH.format(utc(`${ym}-01`));        // Eylül 2026
export const monthName = (ym) => MONTH_NAME.format(utc(`${ym}-01`));    // Eylül
export const monthShort = (ym) => MONTH_SHORT.format(utc(`${ym}-01`));  // Eyl
export const stamp = (ms) => STAMP.format(new Date(ms));                // 25 Eyl 14:56

const ACRONYMS = new Set(['ABD', 'KKTC']);
const TURKISH_COUNTRIES = new Set(['1', '2']);

/**
 * Kaynaklardan BÜYÜK HARFLE gelen yer adlarını okunur yazar: "KÜÇÜKÇEKMECE" → "Küçükçekmece".
 * Türkiye ve KKTC'de Türkçe kurallar (I → ı, İ → i), diğer ülkelerde genel kurallar uygulanır;
 * böylece "KIZILCAHAMAM" → "Kızılcahamam", "IDANNINA" → "Idannina" olur.
 */
export function placeName(raw, countryId) {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  const locale = TURKISH_COUNTRIES.has(String(countryId)) || /[İŞĞÇÖÜ]/.test(text) ? 'tr-TR' : 'en-US';
  return text
    .split(/(\s+|-|\/|\(|\))/)
    .map((part) => {
      if (ACRONYMS.has(part) || !/\p{L}/u.test(part)) return part;
      const lower = part.toLocaleLowerCase(locale);
      return lower.charAt(0).toLocaleUpperCase(locale) + lower.slice(1);
    })
    .join('');
}
