/**
 * Küçük DOM yardımcıları. Çerçeve yok: bileşenler öğeleri bir kez kurar,
 * sonra her saniye yalnızca değişen metni/sınıfı günceller.
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'html') el.innerHTML = value; // yalnızca kendi simge SVG'lerimiz için
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  appendAll(el, children);
  return el;
}

function appendAll(el, children) {
  for (const child of children) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) appendAll(el, child);
    else el.append(child instanceof Node ? child : String(child));
  }
}

export function setText(el, text) {
  const value = String(text ?? '');
  if (el.textContent !== value) el.textContent = value;
}

export function setClass(el, className) {
  if (el.className !== className) el.className = className;
}

export function setAttr(el, name, value) {
  const v = String(value);
  if (el.getAttribute(name) !== v) el.setAttribute(name, v);
}

export function setVar(el, name, value) {
  const v = String(value);
  if (el.style.getPropertyValue(name) !== v) el.style.setProperty(name, v);
}
