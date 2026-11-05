// node render.mjs <outdir> "<list|a-b>" [w h] ; env RESUME=1 skips existing; STEP=n
import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd();
const types = { '.js': 'text/javascript', '.html': 'text/html' };
const srv = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); }).listen(0);
const port = srv.address().port;
const [out, spec, w = '1080', h = '1920'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
let frames = [];
for (const part of spec.split(',')) { if (part.includes('-')) { const [a, b] = part.split('-').map(Number); for (let i = a; i <= b; i++) frames.push(i); } else frames.push(+part); }
const step = +(process.env.STEP || 1); frames = frames.filter((_, i) => i % step === 0);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage'] });
const pg = await b.newPage({ viewport: { width: +w, height: +h } });
pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text().slice(0, 300)); });
pg.on('pageerror', (e) => { console.log('PAGEERR', e.message); process.exit(2); });
await pg.goto(`http://localhost:${port}/web/index.html?w=${w}&h=${h}`);
await pg.waitForFunction('window.ready', null, { timeout: 120000 });
const t0 = Date.now(); let n = 0;
for (const f of frames) {
  const file = path.join(out, `f${String(f).padStart(4, '0')}.jpg`);
  if (process.env.RESUME && fs.existsSync(file)) continue;
  const url = await pg.evaluate((f) => window.grab(f), f);
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  n++; if (n % 10 === 0 || n === 1) console.log(`frame ${f} done (${n}/${frames.length}) ${((Date.now() - t0) / n / 1000).toFixed(2)} s/f`);
}
console.log('DONE', n, 'frames', ((Date.now() - t0) / 1000).toFixed(1), 's');
await b.close(); srv.close();
