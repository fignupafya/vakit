#!/usr/bin/env node
// README ve yükleme penceresi için ekran görüntüleri. Chrome/Edge'i görünmez modda açar ve
// DevTools protokolüyle yönetir (ek paket yok). Önce yerel sunucu çalışmalı: node serve.mjs --no-open
//
//   node tools/screenshots.mjs
//   BROWSER="C:/Program Files/Google/Chrome/Application/chrome.exe" node tools/screenshots.mjs
//
// Saat ve konum adres parametreleriyle sabitlenir (?now=, ?geo=, ?theme=); görüntüler her seferinde aynı çıkar.

import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BROWSER = process.env.BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const APP = process.env.APP_URL ?? 'http://127.0.0.1:5317/';
const OUT = fileURLToPath(new URL('../app/assets/screenshots/', import.meta.url));
const PORT = 9333;
const PLACE = 'geo=40.9903,29.0289'; // Kadıköy → İstanbul (merkez)

const SHOTS = [
  { file: 'desktop-light.png', width: 1280, height: 900, scale: 1, query: `${PLACE}&now=2026-09-25T15:10&theme=light`, hash: '#/' },
  { file: 'mobile-dark.png', width: 390, height: 844, scale: 2, mobile: true, query: `${PLACE}&now=2026-09-25T19:40&theme=dark`, hash: '#/' },
  { file: 'calendar-light.png', width: 1280, height: 900, scale: 1, query: `${PLACE}&now=2026-09-25T15:10&theme=light`, hash: '#/takvim' },
  { file: 'focus-dark.png', width: 1280, height: 800, scale: 1, query: `${PLACE}&now=2026-09-25T12:36&theme=dark`, hash: '#/', layout: 'odak' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function devtools(path) {
  for (let i = 0; i < 60; i++) {
    try { return await (await fetch(`http://127.0.0.1:${PORT}${path}`)).json(); } catch { await sleep(250); }
  }
  throw new Error('Tarayıcıya bağlanılamadı');
}

const profile = mkdtempSync(join(tmpdir(), 'vakit-shots-'));
const browser = spawn(BROWSER, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' });

try {
  const page = (await devtools('/json/list')).find((t) => t.type === 'page');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let seq = 0;
  const waiting = new Map();
  socket.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    const done = waiting.get(msg.id);
    if (!done) return;
    waiting.delete(msg.id);
    msg.error ? done.reject(new Error(msg.error.message)) : done.resolve(msg.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    waiting.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  // Isınma turu: ilk açılışta konum bulunur ve kaydedilir; bilgi kutusu sonraki görüntülere karışmaz.
  await send('Page.navigate', { url: `${APP}?${PLACE}#/` });
  await sleep(8000);

  mkdirSync(OUT, { recursive: true });
  for (const shot of SHOTS) {
    await send('Emulation.setDeviceMetricsOverride', { width: shot.width, height: shot.height, deviceScaleFactor: shot.scale, mobile: Boolean(shot.mobile) });
    if (shot.layout) {
      await send('Runtime.evaluate', {
        expression: `(() => { const k = 'vakit:settings:v1'; const s = JSON.parse(localStorage.getItem(k) || '{}'); s.layout = '${shot.layout}'; localStorage.setItem(k, JSON.stringify(s)); })()`,
      });
    }
    await send('Page.navigate', { url: `${APP}?${shot.query}${shot.hash}` });
    await sleep(5000);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(OUT, shot.file), Buffer.from(data, 'base64'));
    console.log(`${shot.file.padEnd(20)} ${shot.width * shot.scale}×${shot.height * shot.scale}`);
  }
  await send('Browser.close').catch(() => {}); // alt süreçlerle birlikte düzgün kapansın
  socket.close();
} finally {
  await sleep(1500);
  browser.kill();
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  } catch {
    console.warn(`Geçici profil silinemedi (tarayıcı hâlâ kapanıyor olabilir): ${profile}`);
  }
}
