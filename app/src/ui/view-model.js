import {
  PERIOD_NAMES, PRAYER_KEYS, PRAYER_NAMES, RAMADAN_ALT, RAMADAN_MONTH, hijriLabel, towards, untilPhrase,
} from '../core/prayers.js';
import { computeSchedule } from '../core/schedule.js';
import { DAY_SECONDS, addDays, addMonths, daysInMonth, monthOf, monthsOfYear, weekdayOf } from '../core/time.js';
import { describeError } from '../core/errors.js';
import {
  longDate, monthLabel, monthName, monthShort, placeName, shortDate, stamp, weekdayName, weekdayShort,
} from './format.js';

/**
 * Görünüm modeli: uygulama durumunu, sayfaların doğrudan basabileceği hazır metinlere ve
 * bayraklara çevirir. Sayfalar yalnızca bu nesneyi okur, hesap yapmaz; yeni bir arayüz
 * seçeneği yazmak için bu nesnenin şeklini bilmek yeter.
 *
 * status: 'ready' | 'loading' | 'error' | 'no-data' | 'locating' | 'no-location'
 */
export function buildViewModel({ state, now, settings, zoneKnown, geoSupported }) {
  const location = state.location;
  const today = state.days.get(now.date) ?? null;
  const vm = {
    status: 'ready',
    route: state.route ?? { page: 'today' },
    layout: settings.layout,
    now,
    showSeconds: settings.showSeconds,
    zoneKnown,
    geoSupported,
    locating: state.locating,
    location: location ? locationView(location) : null,
    date: dateView(now.date, today),
    source: sourceView(state.lastMeta),
    error: null,
    upcoming: null,
    calendar: null,
  };

  if (!location) {
    vm.status = state.locating ? 'locating' : 'no-location';
    vm.error = state.locateError ? describeError(state.locateError) : null;
    return vm;
  }

  vm.upcoming = upcomingView(state, now.date);
  if (vm.route.page === 'calendar') vm.calendar = calendarView(state, vm.route, now.date);

  if (!today) {
    const entry = state.months.get(monthOf(now.date));
    vm.status = !entry || entry.status === 'loading' ? 'loading' : entry.status === 'error' ? 'error' : 'no-data';
    vm.error = entry?.error ? describeError(entry.error) : null;
    return vm;
  }

  const tomorrow = state.days.get(addDays(now.date, 1)) ?? null;
  const yesterday = state.days.get(addDays(now.date, -1)) ?? null;
  const s = computeSchedule(today, tomorrow, now.seconds);
  const ramadan = today.hijri?.month === RAMADAN_MONTH;
  const sinceStart = now.seconds - s.current.start;

  return {
    ...vm,
    ramadan,
    rows: s.rows.map((r) => ({
      key: r.key,
      name: PRAYER_NAMES[r.key],
      alt: ramadan ? RAMADAN_ALT[r.key] ?? '' : '',
      time: r.time,
      state: r.state,
      tag: r.state === 'current' ? 'şimdi' : r.state === 'next' ? (r.tomorrow ? 'yarın' : 'sıradaki') : '',
    })),
    /** İçinde bulunulan vakit aralığı: "Öğle vakti, 13:01 → 16:24 İkindi". */
    period: {
      key: s.current.key,
      name: PERIOD_NAMES[s.current.key],
      start: s.current.yesterday ? (yesterday?.times.yatsi ?? today.times.yatsi) : today.times[s.current.key],
      end: s.next.time,
      endName: ramadan && s.next.key === 'aksam' ? RAMADAN_ALT.aksam : PRAYER_NAMES[s.next.key],
      endTomorrow: s.next.tomorrow,
      progress: s.progress,
      justEntered: !s.current.yesterday && sinceStart >= 0 && sinceStart < 120,
    },
    /** Sıradaki vakit ve ona kalan süre. */
    next: {
      key: s.next.key,
      name: PRAYER_NAMES[s.next.key],
      time: s.next.time,
      tomorrow: s.next.tomorrow,
      label: `${untilPhrase(s.next.key, { ramadan })} kalan süre`,
      towards: towards(s.next.key, { ramadan }),
      ...countdown(s.remaining, settings.showSeconds),
    },
    phase: s.phase,
    sunUp: s.sunUp,
    ribbon: ribbonView(s, today, now.seconds),
  };
}

/** Kalan süreyi parçalara ve cümlelere böler. Saniye gösterilmiyorsa dakika yukarı yuvarlanır. */
export function countdown(remaining, showSeconds) {
  const total = Math.max(0, Math.floor(remaining));
  const minutes = Math.ceil(total / 60);
  const parts = showSeconds
    ? { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 }
    : { h: Math.floor(minutes / 60), m: minutes % 60, s: 0 };
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const short = h ? `${h} sa${m ? ` ${m} dk` : ''}` : minutes ? `${minutes} dk` : 'şimdi';
  const aria = h ? `${h} saat${m ? ` ${m} dakika` : ''}` : minutes ? `${minutes} dakika` : 'şimdi';
  return { parts, short, aria };
}

/** Sekme başlığı: arka plandaki sekmede de kalan süre görünsün. */
export function titleFor(vm) {
  if (vm.status !== 'ready') return vm.route?.page === 'calendar' ? 'Takvim · Vakit' : 'Vakit';
  return `${vm.next.towards} ${vm.next.short} · Vakit`;
}

function locationView(loc) {
  const name = placeName(loc.name, loc.countryId);
  const region = loc.regionName ? placeName(loc.regionName, loc.countryId) : '';
  const country = loc.countryName ? placeName(loc.countryName, loc.countryId) : '';
  const sub = [region && region !== name ? region : '', country].filter(Boolean).join(', ');
  return { name, sub, full: [name, sub].filter(Boolean).join(', '), region: region || name };
}

function dateView(iso, day) {
  const ramadan = day?.hijri?.month === RAMADAN_MONTH;
  return {
    iso,
    long: longDate(iso),
    weekday: weekdayName(iso),
    isFriday: weekdayOf(iso) === 5,
    hijri: day?.hijri ? hijriLabel(day.hijri) : '',
    ramadanDay: ramadan ? day.hijri.day : null,
  };
}

function sourceView(meta) {
  if (!meta) return { tone: 'idle', text: '' };
  if (meta.stale) return { tone: 'warn', text: `Çevrimdışı · son alınan vakitler (${stamp(meta.savedAt)})` };
  return { tone: 'ok', text: `Güncel · ${stamp(meta.savedAt)}` };
}

function ribbonView(s, today, now) {
  const from = Math.max(0, s.current.start);
  const to = Math.min(DAY_SECONDS, s.next.at);
  return {
    at: s.at,
    names: PRAYER_KEYS.map((k) => PRAYER_NAMES[k]),
    times: PRAYER_KEYS.map((k) => today.times[k]),
    states: s.rows.map((r) => r.state),
    now,
    span: { from, to, progress: to > from ? Math.min(1, Math.max(0, (now - from) / (to - from))) : 0 },
  };
}

/* ---------------------------- günler ve takvim ---------------------------- */

function dayRow(day, todayIso, lead, sub) {
  return {
    iso: day.date,
    lead,
    sub,
    hijri: hijriLabel(day.hijri, { withYear: false }),
    times: day.times,
    isToday: day.date === todayIso,
    isPast: day.date < todayIso,
    isFriday: weekdayOf(day.date) === 5,
    isRamadan: day.hijri?.month === RAMADAN_MONTH,
  };
}

/** Bugün ve sonraki altı gün. */
function upcomingView(state, todayIso) {
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const iso = addDays(todayIso, i);
    const day = state.days.get(iso);
    if (day) rows.push(dayRow(day, todayIso, i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : weekdayName(iso), shortDate(iso)));
  }
  return { rows };
}

function monthBlock(ym, entry, todayIso) {
  const rows = (entry?.days ?? []).map((d) => dayRow(d, todayIso, String(Number(d.date.slice(8))), weekdayShort(d.date)));
  return {
    ym,
    name: monthName(ym),
    short: monthShort(ym),
    label: monthLabel(ym),
    status: entry?.status ?? 'loading',
    error: entry?.error ? describeError(entry.error) : null,
    rows,
    isCurrent: ym === monthOf(todayIso),
    note: rows.length && rows.length < daysInMonth(ym) ? 'Bu ayın vakitlerinin bir kısmı henüz yayımlanmadı.' : null,
  };
}

// Yıllık görünümde 365 satır var; veri değişmedikçe her saniye yeniden kurulmasın.
let calendarMemo = { key: '', value: null };

function calendarView(state, route, todayIso) {
  const thisYear = Number(todayIso.slice(0, 4));
  const thisMonth = monthOf(todayIso);
  const yearMode = route.mode === 'year';
  const yms = yearMode ? monthsOfYear(route.year) : [route.ym ?? thisMonth];
  const entries = yms.map((ym) => state.months.get(ym));
  const key = [route.mode, yms[0], todayIso, ...entries.map((e) => `${e?.status}:${e?.days?.length ?? 0}`)].join('|');
  if (key === calendarMemo.key) return calendarMemo.value;

  const months = yms.map((ym, i) => monthBlock(ym, entries[i], todayIso));
  const year = Number(yms[0].slice(0, 4));
  const value = yearMode
    ? {
      mode: 'year',
      year,
      title: String(year),
      isCurrent: year === thisYear,
      prev: { page: 'calendar', mode: 'year', year: year - 1 },
      next: { page: 'calendar', mode: 'year', year: year + 1 },
      current: { page: 'calendar', mode: 'year', year: thisYear },
      toMonth: { page: 'calendar', mode: 'month', ym: year === thisYear ? null : `${year}-01` },
      toYear: { page: 'calendar', mode: 'year', year },
      months,
    }
    : {
      mode: 'month',
      year,
      ym: yms[0],
      title: monthLabel(yms[0]),
      isCurrent: yms[0] === thisMonth,
      prev: { page: 'calendar', mode: 'month', ym: addMonths(yms[0], -1) },
      next: { page: 'calendar', mode: 'month', ym: addMonths(yms[0], 1) },
      current: { page: 'calendar', mode: 'month', ym: null },
      toMonth: { page: 'calendar', mode: 'month', ym: route.ym },
      toYear: { page: 'calendar', mode: 'year', year },
      months,
    };
  calendarMemo = { key, value };
  return value;
}
