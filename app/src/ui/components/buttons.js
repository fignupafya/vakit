import { h } from '../dom.js';
import { icon } from '../icons.js';

export function iconButton(name, label, onClick) {
  return h('button', { type: 'button', class: 'icon-btn', 'aria-label': label, title: label, onclick: onClick, html: icon(name) });
}

/** @param {{ variant?: 'primary' | 'quiet', iconName?: string }} [options] */
export function button(text, onClick, { variant, iconName } = {}) {
  const el = h('button', { type: 'button', class: variant ? `btn btn--${variant}` : 'btn', onclick: onClick });
  if (iconName) el.insertAdjacentHTML('beforeend', icon(iconName));
  el.append(text);
  return el;
}
