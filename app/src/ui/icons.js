/* Tek çizgi kalınlığında, 24×24 ızgaralı simgeler. Rengi currentColor'dan alır. */
const PATHS = {
  // Ufuk çizgisinde yarım güneş: logo
  mark: '<path d="M7.2 16.5a4.8 4.8 0 0 1 9.6 0"/><path d="M3.5 16.5h17"/><path d="M12 6.2v2.1M6.3 8.6l1.4 1.4M17.7 8.6 16.3 10"/>',
  pin: '<path d="M12 20.5s-6.2-5.3-6.2-10.4a6.2 6.2 0 0 1 12.4 0c0 5.1-6.2 10.4-6.2 10.4Z"/><circle cx="12" cy="10.1" r="2.2"/>',
  chevronDown: '<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>',
  chevronLeft: '<path d="m14.5 6.5-5.5 5.5 5.5 5.5"/>',
  chevronRight: '<path d="m9.5 6.5 5.5 5.5-5.5 5.5"/>',
  sliders: '<path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9"/><circle cx="15" cy="7.5" r="2"/><circle cx="9" cy="16.5" r="2"/>',
  search: '<circle cx="11" cy="11" r="6.2"/><path d="m19.5 19.5-4-4"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  print: '<path d="M7 8.5V4h10v4.5"/><rect x="3.5" y="8.5" width="17" height="8" rx="2"/><path d="M7 13.5h10V20H7z"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  // Hedef: "bulunduğum yeri bul"
  locate: '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
  arrowRight: '<path d="M5 12h13.5M13.5 7l5 5-5 5"/>',
};

export function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${PATHS[name] ?? ''}</svg>`;
}

/** Aynı simge, doğrudan eklenebilen bir öğe olarak. */
export function iconEl(name) {
  const template = document.createElement('template');
  template.innerHTML = icon(name);
  return template.content.firstElementChild;
}
