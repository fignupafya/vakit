import { PRAYER_KEYS } from './prayers.js';
import { DAY_SECONDS, parseHM } from './time.js';

/**
 * Bugünün vakitleri ve şu anki saniyeye göre hangi vaktin içinde olduğumuzu,
 * sıradakini ve kalan süreyi hesaplar. Saf fonksiyon: ne arayüzü ne sağlayıcıyı bilir.
 *
 * @param {import('../providers/contract.js').DayTimes} today
 * @param {import('../providers/contract.js').DayTimes | null} tomorrow
 * @param {number} now gece yarısından beri saniye (konumun saatiyle)
 */
export function computeSchedule(today, tomorrow, now) {
  const at = PRAYER_KEYS.map((key) => parseHM(today.times[key]));
  const last = at.length - 1;

  let idx = -1;
  for (let i = 0; i < at.length; i++) if (now >= at[i]) idx = i;

  let current;
  let next;
  if (idx === -1) {
    // Gece yarısı ile imsak arası: dünün yatsısı sürüyor.
    current = { key: PRAYER_KEYS[last], start: at[last] - DAY_SECONDS, yesterday: true };
    next = { key: PRAYER_KEYS[0], time: today.times[PRAYER_KEYS[0]], at: at[0], tomorrow: false };
  } else if (idx === last) {
    // Yatsıdan sonra: sıradaki yarının imsakı (yarının verisi yoksa bugünkü yaklaşık değer).
    const time = tomorrow?.times?.imsak ?? today.times.imsak;
    current = { key: PRAYER_KEYS[last], start: at[last], yesterday: false };
    next = { key: PRAYER_KEYS[0], time, at: parseHM(time) + DAY_SECONDS, tomorrow: true };
  } else {
    current = { key: PRAYER_KEYS[idx], start: at[idx], yesterday: false };
    next = { key: PRAYER_KEYS[idx + 1], time: today.times[PRAYER_KEYS[idx + 1]], at: at[idx + 1], tomorrow: false };
  }

  const remaining = Math.max(0, next.at - now);
  const span = next.at - current.start;
  const progress = span > 0 ? Math.min(1, Math.max(0, (now - current.start) / span)) : 0;

  const rows = PRAYER_KEYS.map((key, i) => {
    let state;
    if (idx === -1) state = i === 0 ? 'next' : 'upcoming';
    else if (idx === last) state = i === last ? 'current' : i === 0 ? 'next' : 'past';
    else state = i < idx ? 'past' : i === idx ? 'current' : i === idx + 1 ? 'next' : 'upcoming';
    const isTomorrow = idx === last && i === 0;
    return { key, time: isTomorrow ? next.time : today.times[key], state, tomorrow: isTomorrow };
  });

  const [imsak, gunes, , , aksam, yatsi] = at;
  const phase = now < imsak || now >= yatsi ? 'night' : now < gunes ? 'dawn' : now < aksam ? 'day' : 'dusk';

  return { at, rows, current, next, remaining, progress, phase, sunUp: phase === 'day' };
}
