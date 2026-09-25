import { ferah } from './today-ferah.js';
import { odak } from './today-odak.js';
import { calendarPage } from './calendar.js';

/**
 * Sayfalar. "Bugün" sayfasının birden çok düzeni olabilir; kullanıcı Ayarlar'dan seçer.
 * Yeni bir düzen için aynı sözleşmeye uyan bir nesne yazıp TODAY_LAYOUTS'a ekleyin
 * ({ id, label, hint, create(actions) }); stilleri styles/layouts.css içinde toplayın.
 */
const TODAY_LAYOUTS = [ferah, odak];

export const listTodayLayouts = () => TODAY_LAYOUTS.map(({ id, label, hint }) => ({ id, label, hint }));

/** Görünüm modeline göre hangi sayfanın gösterileceği: 'calendar' ya da 'today:<düzen>'. */
export function pageKey(vm) {
  if (vm.route?.page === 'calendar') return 'calendar';
  const layout = TODAY_LAYOUTS.find((l) => l.id === vm.layout) ?? TODAY_LAYOUTS[0];
  return `today:${layout.id}`;
}

export function createPage(key, actions) {
  if (key === 'calendar') return calendarPage.create(actions);
  const id = key.split(':')[1];
  return (TODAY_LAYOUTS.find((l) => l.id === id) ?? TODAY_LAYOUTS[0]).create(actions);
}
