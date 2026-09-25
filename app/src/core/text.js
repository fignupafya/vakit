/**
 * Arama için sadeleştirme: küçük harf, Türkçe karakterler ve aksanlar düz harfe.
 * "ŞİLE" → "sile", "Polatlı" → "polatli"
 * (ş, ğ, ç, ö, ü, â… ayrıştırılınca işaretleri atılır; noktasız ı'nın ayrışımı yoktur, elle çevrilir.)
 */
export function fold(value = '') {
  return String(value)
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Türkçe alfabetik sıralama (ç, ğ, ı, ö, ş, ü doğru yerde). */
export const collateTr = new Intl.Collator('tr-TR', { sensitivity: 'base' });
