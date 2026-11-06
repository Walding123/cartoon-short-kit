// Rekam index.html per frame lewat Chrome headless, lalu gabungkan dengan narasi + efek suara.
//   node render.mjs                 -> <nama-folder>.mp4 (1080×1920, 30 fps, narasi + sfx.wav)
//     frame dibagi ke 4 jendela Chrome sekaligus (ubah dengan KB_JENDELA=n), tiap bagian
//     disimpan terpisah lalu disambung tanpa encode ulang. renderAt(t) harus murni fungsi waktu (tanpa sisa frame sebelumnya).
//   node render.mjs --still 1 12.5  -> stills/still_1.png, ...
//   node render.mjs --events        -> events.json saja (buat sfx.py)
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { extname, join, basename } from 'node:path';
import { cpus } from 'node:os';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { FFMPEG, chromeOpts, rakitScene } from './alat.mjs';
rakitScene();
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('.', import.meta.url));
const FPS = 30;
const OUT = basename(DIR.replace(/\/$/, '')) + '.mp4';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = createServer((req, res) => {
  const p = join(DIR, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(DIR) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await chromium.launch(chromeOpts(['--enable-gpu-rasterization']));
const bukaHalaman = async () => {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGE', e.message));
  page.on('console', m => m.type() === 'error' && !m.text().includes('404') && console.error('CONSOLE', m.text()));
  await page.goto(url);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  await page.evaluate(() => Promise.all([...document.fonts].map(f => f.load().catch(() => {}))));   // huruf Gaya Saya siap sebelum frame pertama
  return page;
};
const page = await bukaHalaman();
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

const si = process.argv.indexOf('--still');
if (process.argv.includes('--events')) {
  console.log('events.json, durasi', DUR);
} else if (si > 0) {
  mkdirSync(join(DIR, 'stills'), { recursive: true });
  for (const s of process.argv.slice(si + 1)) {
    await page.evaluate(x => window.renderAt(x), +s);
    await page.screenshot({ path: join(DIR, `stills/still_${s}.png`), clip });
  }
} else {
  const n = Math.round(DUR * FPS);
  const silent = join(DIR, 'video_tanpa_suara.mp4');
  const J = Math.max(1, Math.min(+process.env.KB_JENDELA || 4, cpus().length, Math.ceil(n / 60)));
  const pages = [page, ...await Promise.all(Array.from({ length: J - 1 }, bukaHalaman))];
  const bagian = pages.map((_, k) => join(DIR, `qc/_bagian_${k}.mp4`));
  mkdirSync(join(DIR, 'qc'), { recursive: true });
  let jadi = 0;
  const t0 = Date.now();
  await Promise.all(pages.map((pg, k) => {
    const a = Math.floor(n * k / J), b = Math.floor(n * (k + 1) / J);
    return run(['-f', 'image2pipe', '-c:v', 'mjpeg', '-r', String(FPS), '-i', '-',
      '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', bagian[k]], async stdin => {
      // pemanasan: 1 detik sebelum bagian ini diputar tanpa direkam, supaya transisi CSS overlay sama dengan render berurutan
      for (let f = Math.max(0, a - FPS); f < a; f++) { await pg.evaluate(x => window.renderAt(x), f / FPS); await pg.screenshot({ type: 'jpeg', quality: 10, clip }); }
      for (let f = a; f < b; f++) {
        await pg.evaluate(x => window.renderAt(x), f / FPS);
        const img = await pg.screenshot({ type: 'jpeg', quality: 94, clip });
        if (!stdin.write(img)) await new Promise(r => stdin.once('drain', r));
        if (++jadi % 150 === 0) console.log(`${jadi}/${n}`);
      }
      stdin.end();
    });
  }));
  const daftar = join(DIR, 'qc/_bagian.txt');
  writeFileSync(daftar, bagian.map(f => `file '${f.replaceAll('\\', '/').replaceAll("'", "'\\''")}'`).join('\n'));
  await run(['-f', 'concat', '-safe', '0', '-i', daftar, '-c', 'copy', silent]);
  for (const f of [...bagian, daftar]) rmSync(f, { force: true });
  console.log(`${n} frame, ${J} jendela, ${((Date.now() - t0) / 1000).toFixed(0)} dtk`);
  // narasi mulai di detik 0 (lead sudah dihitung di words.json), sfx+musik dari sfx.py
  // narasi: buang dengung rendah, hangat + jernih, kurangi desis, kompresi lembut. Musik (musik.wav) dirundukkan oleh narasi
  // dan diberi ruang di frekuensi suara; efek (efek.wav) tetap utuh. Tanpa musik.wav: campuran lama dari sfx.wav.
  const VOK = `aresample=48000,adelay=${LEADMS}|${LEADMS},highpass=f=75,equalizer=f=180:t=q:w=1:g=1.5,equalizer=f=3400:t=q:w=1.2:g=2.5,` +
    `deesser=i=0.35,acompressor=threshold=-22dB:ratio=3:attack=6:release=140:makeup=4,apad`;
  const pisah = existsSync(join(DIR, 'musik.wav')) && existsSync(join(DIR, 'efek.wav'));
  const audioIn = pisah ? ['-i', join(DIR, 'efek.wav'), '-i', join(DIR, 'musik.wav')] : ['-i', join(DIR, 'sfx.wav')];
  const graf = pisah
    ? `[1:a]${VOK},asplit=2[vo][vosc];[2:a]aresample=48000,volume=0.9[fx];` +
      `[3:a]aresample=48000,highpass=f=60,lowpass=f=9500,equalizer=f=2800:t=q:w=1.5:g=-5,volume=${process.env.KB_MUSIK || 0.5}[mu0];` +
      `[mu0][vosc]sidechaincompress=threshold=0.015:ratio=7:attack=25:release=450[mu];` +
      `[vo][fx][mu]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.0:LRA=11[mix]`
    : `[1:a]aresample=48000,adelay=${LEADMS}|${LEADMS},volume=1.5,apad[vo];[2:a]aresample=48000[fx];` +
      `[vo][fx]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.0:LRA=14[mix]`;
  await run(['-i', silent, '-i', join(DIR, 'vo/narasi.wav'), ...audioIn, '-filter_complex', graf,
    '-map', '0:v', '-map', '[mix]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-ar', '48000',
    '-t', String(DUR), '-movflags', '+faststart', join(DIR, OUT)]);
  console.log('selesai: ' + OUT);
}
await browser.close();
server.close();
