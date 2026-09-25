#!/usr/bin/env node
// Vakit — yerel sunucu. Bağımlılığı yok; yalnızca `app/` klasörünü sunar.
//   node serve.mjs              → http://127.0.0.1:5317 adresinde başlatır ve tarayıcıyı açar
//   node serve.mjs --port 8080  → başka port
//   node serve.mjs --no-open    → tarayıcıyı açmaz

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const ROOT = resolve(fileURLToPath(new URL('./app/', import.meta.url)));
const args = process.argv.slice(2);
const portArg = args.indexOf('--port');
const START_PORT = portArg >= 0 ? Number(args[portArg + 1]) : 5317;
const OPEN_BROWSER = !args.includes('--no-open');

// Windows'ta sistem kayıt defteri .js için yanlış tür bildirebiliyor; ES modülleri doğru tür ister.
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(ROOT, `.${path}`);
    if (file !== ROOT && !file.startsWith(ROOT + sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Yasak');
      return;
    }
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bulunamadı');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Sunucu hatası');
  }
});

function listen(port, retries = 10) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && retries > 0) listen(port + 1, retries - 1);
    else {
      console.error(`Sunucu başlatılamadı: ${err.message}`);
      process.exit(1);
    }
  });
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}/`;
    console.log(`Vakit çalışıyor: ${url}`);
    console.log('Durdurmak için bu pencerede Ctrl+C.');
    if (OPEN_BROWSER) openBrowser(url);
  });
}

function openBrowser(url) {
  const command =
    process.platform === 'win32' ? `start "" "${url}"` :
    process.platform === 'darwin' ? `open "${url}"` :
    `xdg-open "${url}"`;
  exec(command, () => {});
}

listen(START_PORT);
