/* Tarih ve saat yardımcıları. Günler her yerde "YYYY-MM-DD" metni olarak taşınır;
   böylece saat dilimi kaymaları (gece yarısı bir gün geri gitmek gibi) yaşanmaz. */

export const DAY_SECONDS = 86400;

/** "05:22" → 19320 (gece yarısından beri saniye). Geçersizse NaN. */
export function parseHM(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? '').trim());
  if (!m) return NaN;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  return hours < 24 && minutes < 60 ? hours * 3600 + minutes * 60 : NaN;
}

export const isHM = (value) => Number.isFinite(parseHM(value));

/** 19320 → "05:22" */
export function formatHM(seconds) {
  const total = ((Math.floor(seconds / 60) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const utcDate = (iso) => new Date(`${iso}T00:00:00Z`);

export function addDays(iso, days) {
  const d = utcDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const daysBetween = (fromIso, toIso) => Math.round((utcDate(toIso) - utcDate(fromIso)) / 86_400_000);
export const monthOf = (iso) => iso.slice(0, 7);

export function addMonths(ym, months) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + months, 1)).toISOString().slice(0, 7);
}

export function daysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export const monthRange = (ym) => ({ from: `${ym}-01`, to: `${ym}-${String(daysInMonth(ym)).padStart(2, '0')}` });

/** 2026 → ["2026-01", …, "2026-12"] */
export const monthsOfYear = (year) => Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);

/** 0 = Pazar … 5 = Cuma */
export const weekdayOf = (iso) => utcDate(iso).getUTCDay();

/* ------------------------------------------------------------------ */
/* Saat: seçili konumun duvar saatini verir (cihazın saat diliminden   */
/* bağımsız). Test için `?now=2026-03-01T18:30` ile sabitlenebilir.    */
/* ------------------------------------------------------------------ */

const formatters = new Map();

function zonedParts(timeZone, date) {
  let format = formatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-CA', {
      timeZone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    formatters.set(timeZone, format);
  }
  const p = {};
  for (const { type, value } of format.formatToParts(date)) p[type] = value;
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    seconds: (Number(p.hour) % 24) * 3600 + Number(p.minute) * 60 + Number(p.second),
  };
}

const localIso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const reading = (date, seconds) => ({ date, seconds, hhmm: formatHM(seconds) });

function parseOverride(value) {
  const m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(value ?? '').trim());
  if (!m) return null;
  return { date: m[1], seconds: Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0) };
}

/**
 * @param {{ override?: string | null }} [options]
 * @returns {{ overridden: boolean, now: (zone?: { timeZone?: string, offsetMinutes?: number } | null) => { date: string, seconds: number, hhmm: string } }}
 */
export function createClock({ override } = {}) {
  const fixed = parseOverride(override);
  const startedAt = performance.now();

  return {
    overridden: Boolean(fixed),
    now(zone) {
      if (fixed) {
        const total = fixed.seconds + (performance.now() - startedAt) / 1000;
        const shift = Math.floor(total / DAY_SECONDS);
        return reading(addDays(fixed.date, shift), total - shift * DAY_SECONDS);
      }
      const d = new Date();
      const fraction = d.getMilliseconds() / 1000;
      if (zone?.timeZone) {
        try {
          const z = zonedParts(zone.timeZone, d);
          return reading(z.date, z.seconds + fraction);
        } catch {
          /* tarayıcı bu saat dilimini tanımıyor: aşağıdaki yollara düş */
        }
      }
      if (Number.isFinite(zone?.offsetMinutes)) {
        const s = new Date(d.getTime() + zone.offsetMinutes * 60_000);
        return reading(s.toISOString().slice(0, 10), s.getUTCHours() * 3600 + s.getUTCMinutes() * 60 + s.getUTCSeconds() + fraction);
      }
      return reading(localIso(d), d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + fraction);
    },
  };
}
