// Eksperimen cepat tanpa mengubah scene.js: jalankan potongan JS lalu render frame.
//   node exp.mjs '__dbg.ST.rotation.z = 2' 12 30.5   -> stills/exp_0.png, stills/exp_1.png
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { FFMPEG, chromeOpts, rakitScene } from './alat.mjs';
rakitScene();
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('.', import.meta.url));
const FPS = 30;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = createServer((req, res) => {
  const p = join(DIR, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(DIR) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await chromium.launch(chromeOpts(['--enable-gpu-rasterization']));
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('PAGE', e.message));
page.on('console', m => m.type() === 'error' && console.error('CONSOLE', m.text()));
await page.goto(url);
await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
const clip = { x: 0, y: 0, width: 1080, height: 1920 };

const run = (args, input) => new Promise((ok, bad) => {
  const p = spawn(FFMPEG, ['-y', '-loglevel', 'error', ...args], { stdio: [input ? 'pipe' : 'ignore', 'inherit', 'inherit'] });
  p.on('exit', c => (c === 0 ? ok() : bad(new Error('ffmpeg ' + c))));
  if (input) input(p.stdin);
});

const ev = await page.evaluate(() => window.EVENTS);
writeFileSync(join(DIR, 'events.json'), JSON.stringify(ev, null, 1));
const DUR = ev.dur;
// narasi diletakkan tepat di jeda awal yang dipakai words.json (subtitle & isyarat kata ikut sinkron)
const LEADMS = Math.round(JSON.parse(readFileSync(join(DIR, 'words.json'), 'utf8')).lead * 1000);

// eksperimen: node exp.mjs '<js sebelum render>' t1 t2 ... -> stills/exp_<i>.png
const pre = process.argv[2];
let i = 0;
for (const s of process.argv.slice(3)) {
  await page.evaluate(([code, x]) => { eval(code); window.renderAt(x); }, [pre, +s]);
  await page.screenshot({ path: join(DIR, `stills/exp_${i++}.png`), clip });
}
await browser.close();
server.close();
