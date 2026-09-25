#!/usr/bin/env node
// Uygulama simgelerini (PWA, iPhone ana ekranı) üretir. Bağımlılık yok: şekiller mesafe alanlarıyla
// kenar yumuşatmalı çizilir, PNG elle kodlanır.   Kullanım: node tools/make-icons.mjs
//
// Şekil, arayüzdeki logonun aynısı (app/src/ui/icons.js → mark): ufuk çizgisinde yarım güneş ve üç ışın.

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../app/assets/', import.meta.url));
const TEAL = [11, 107, 102];   // --accent (açık tema)
const PAPER = [243, 240, 232]; // --bg (açık tema)

// Logo, 24 birimlik ızgarada (icons.js ile aynı ölçüler)
const MARK = {
  arc: { cx: 12, cy: 16.5, r: 4.8 },
  lines: [[3.5, 16.5, 20.5, 16.5], [12, 6.2, 12, 8.3], [6.3, 8.6, 7.7, 10], [17.7, 8.6, 16.3, 10]],
  stroke: 1.9,
  center: [12, 11.35], // çizgi kalınlığıyla birlikte görünen kutunun ortası
  width: 18.9,
};

const ICONS = [
  { file: 'icon-192.png', size: 192, shape: 'rounded', mark: 0.6 },
  { file: 'icon-512.png', size: 512, shape: 'rounded', mark: 0.6 },
  { file: 'icon-maskable-512.png', size: 512, shape: 'square', mark: 0.5 }, // Android şekli kendi keser
  { file: 'apple-touch-icon.png', size: 180, shape: 'square', mark: 0.58 }, // iOS köşeleri kendi yuvarlar
];

const clamp01 = (v) => Math.min(1, Math.max(0, v));

function segmentDistance(px, py, [ax, ay, bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Üst yarım çember yayına uzaklık. */
function arcDistance(px, py, { cx, cy, r }) {
  if (py <= cy) return Math.abs(Math.hypot(px - cx, py - cy) - r);
  return Math.min(Math.hypot(px - cx + r, py - cy), Math.hypot(px - cx - r, py - cy));
}

/** Köşeleri yuvarlatılmış kare (işaretli uzaklık; içeride negatif). */
function roundedSquare(px, py, size, radius) {
  const half = size / 2;
  const qx = Math.abs(px - half) - (half - radius);
  const qy = Math.abs(py - half) - (half - radius);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

function render({ size, shape, mark }) {
  const scale = (mark * size) / MARK.width;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const bg = shape === 'rounded' ? clamp01(0.5 - roundedSquare(px, py, size, size * 0.225)) : 1;

      const ux = MARK.center[0] + (px - size / 2) / scale;
      const uy = MARK.center[1] + (py - size / 2) / scale;
      let d = arcDistance(ux, uy, MARK.arc);
      for (const line of MARK.lines) d = Math.min(d, segmentDistance(ux, uy, line));
      const fg = clamp01(0.5 - (d - MARK.stroke / 2) * scale) * bg;

      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) rgba[i + c] = Math.round(TEAL[c] * (1 - fg) + PAPER[c] * fg);
      rgba[i + 3] = Math.round(bg * 255);
    }
  }
  return encodePng(size, size, rgba);
}

/* ------------------------------- PNG ------------------------------- */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8 bit, RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
for (const icon of ICONS) {
  const png = render(icon);
  writeFileSync(new URL(icon.file, `file:///${OUT.replace(/\\/g, '/')}`), png);
  console.log(`${icon.file.padEnd(24)} ${icon.size}×${icon.size}  ${(png.length / 1024).toFixed(1)} KB`);
}
