// Cover 1080×1920 dari scene yang sama (frame + kamera pilihan), judul besar, pil penunjuk, stempel.
//   node cover.mjs -> cover.png (+ cover_feed.png potongan 4:5 tengah buat grid)
// Isi cover.json:
//   { "t": 52.4, "cam": [x, y, z, tinggi, kemiringan], "kicker": "KITA BONGKAR",
//     "title": "Yang menekuk staples <mark>bukan tanganmu</mark>", "pill": "Rahasianya di sini", "stamp": "Cekungan!" }
// Pil menunjuk window.coverPoint() (Vector3 dunia) kalau scene mendefinisikannya.
// Scene boleh mendefinisikan window.coverCustom(cfg) untuk menggambar cover sendiri (gaya papan gelap).
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-core';
import { chromeOpts, rakitScene } from './alat.mjs';
rakitScene();
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('.', import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = createServer((req, res) => {
  const p = join(DIR, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(DIR) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(0);
const browser = await chromium.launch(chromeOpts());
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => console.error('PAGE', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
await page.waitForFunction(() => window.READY === true);
await page.evaluate(() => Promise.all([...document.fonts].map(f => f.load().catch(() => {}))));

const CFG = JSON.parse(readFileSync(join(DIR, 'cover.json'), 'utf8'));
await page.evaluate((cfg) => {
  window.CAM_OVERRIDE = cfg.cam || null;
  window.renderAt(cfg.t);
  if (window.coverCustom) { window.coverCustom(cfg); return; }   // scene dengan tata letak sendiri (mis. papan gelap)
  for (const id of ['hud', 'cap', 'tags', 'stamp', 'dim', 'inset', 'capband', 'card', 'fmt']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  const st = document.getElementById('stage');
  const css = document.createElement('style');
  css.textContent = `
    #cv { position: absolute; left: 72px; right: 72px; top: 250px; }
    #cv .k { display: inline-block; font: 700 30px var(--mono); letter-spacing: .14em; color: var(--teksAksen, #fff); background: var(--red);
      padding: 14px 24px 12px; border-radius: 999px; }
    #cv h1 { margin: 26px 0 0; font: 900 132px/1.12 var(--sans); letter-spacing: -.035em; color: var(--teksLatar, var(--ink)); }
    #cv h1 mark { background: var(--yellow); color: var(--ink); padding: 0 14px; margin: 0 -6px; border-radius: 18px;
      box-shadow: 0 0 0 6px var(--ink); box-decoration-break: clone; -webkit-box-decoration-break: clone; }
    #cvfade { position: absolute; left: 0; right: 0; top: 0; height: 760px;
      background: linear-gradient(var(--paper) 80%, rgba(243,243,240,0)); }
    .ctag { position: absolute; display: flex; align-items: center; gap: 14px; background: var(--pita, #2b2b30); color: #fff;
      font: 800 40px var(--sans); letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; padding: 18px 28px 16px; border-radius: 999px;
      box-shadow: 0 0 0 5px var(--ink), 0 14px 36px rgba(0,0,0,.22); }
    .ctag svg { width: 44px; height: 34px; }
    #cvstamp { position: absolute; left: 0; right: 0; top: 1390px; text-align: center; }
    #cvstamp span { position: relative; display: inline-block; font: 900 120px var(--sans); color: var(--yellow);
      transform: rotate(-8deg); text-transform: uppercase; }
    #cvstamp span::before { content: attr(data-t); position: absolute; inset: 0; z-index: -1; color: var(--ink);
      -webkit-text-stroke: 28px var(--ink); text-shadow: 0 12px 0 var(--ink); }`;
  document.head.appendChild(css);
  const d = document.createElement('div');
  d.innerHTML = `<div id="cvfade"></div>
    <div id="cv">${window.GAYA?.logo ? `<img class="glogo" src="${window.GAYA.logo}" alt="">` : ''}<span class="k">${cfg.kicker || window.GAYA?.seri || 'KITA BONGKAR'}</span><h1>${cfg.title}</h1></div>` +
    (cfg.pill ? `<div class="ctag" id="ctag">${cfg.pill}<svg viewBox="0 0 13 10" style="transform:scaleX(-1)"><path d="M12 5H1.5M5 1.2 1.2 5 5 8.8" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>` : '') +
    (cfg.stamp ? `<div id="cvstamp"><span data-t="${cfg.stamp}">${cfg.stamp}</span></div>` : '');
  [...d.children].forEach(c => st.appendChild(c));
}, CFG);
const pt = await page.evaluate(() => {
  if (window.coverPx) return window.coverPx();           // mode 2.5D
  if (!window.coverPoint) return [700, 1150];
  const v = window.coverPoint().project(window.__dbg.camera);
  return [(v.x + 1) / 2 * 1080, (1 - v.y) / 2 * 1920];
});
await page.evaluate(([x, y]) => { const e = document.getElementById('ctag'); if (!e) return; e.style.left = Math.max(30, x - 16 - e.offsetWidth) + 'px'; e.style.top = (y - e.offsetHeight / 2) + 'px'; }, pt);
await page.screenshot({ path: join(DIR, 'cover.png'), clip: { x: 0, y: 0, width: 1080, height: 1920 } });
await page.screenshot({ path: join(DIR, 'cover_feed.png'), clip: { x: 0, y: 220, width: 1080, height: 1350 } });
console.log('cover.png, cover_feed.png; pil di', pt.map(Math.round));
await browser.close(); server.close();
