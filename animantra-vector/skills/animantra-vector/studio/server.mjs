// Animantra Studio: aplikasi web lokal untuk membuat & melihat video.
//   node server.mjs --di "<folder kerja>" [--port 4580] [--mode chat|headless]      lalu buka http://localhost:4580
// Riwayat = subfolder proyek di folder kerja. Mode chat (bawaan): permintaan dari Studio dikirim ke Claude di chat lewat
// GET /api/chat-stream (Claude memantau aliran ini dengan Monitor), Claude mengerjakan di chat dan melapor lewat lapor.mjs.
// Mode headless: Claude Code dijalankan sendiri (`claude -p`). Render ulang selalu oleh Studio. Hanya mendengar 127.0.0.1.
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, createReadStream, appendFileSync, rmSync } from 'node:fs';
import { hitungGaya, cekKontras, terapkanGaya, PRESET, HURUF, PILIHAN, GAYA_KOSONG } from '../template/gaya.mjs';
import { join, dirname, extname, resolve, sep } from 'node:path';
import { homedir, platform } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const K = resolve(HERE, '..');
const KE = existsSync(join(K, 'engine', 'node_modules')) ? K : join(homedir(), '.claude', 'skills', 'animantra-vector');   // skill yang mesinnya terpasang
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const WS = resolve(arg('--di', process.cwd()));
const PORT = +arg('--port', 4580);
const MODE = arg('--mode', 'chat');
const pendengar = new Set();   // koneksi /api/chat-stream dari Claude di chat
const ST = join(WS, '.studio'); mkdirSync(ST, { recursive: true });
const MAC = platform() === 'darwin', WIN = platform() === 'win32';
const SKIP = new Set(['skills', 'contoh-video', 'node_modules', 'qc', 'stills', 'gaya-saya']);

// ---------- Claude Code CLI ----------
function claudeBin() {
  if (process.env.CLAUDE_BIN && existsSync(process.env.CLAUDE_BIN)) return process.env.CLAUDE_BIN;
  const w = spawnSync(WIN ? 'where' : 'which', ['claude'], { encoding: 'utf8' });
  if (w.status === 0 && w.stdout.trim()) return w.stdout.trim().split(/\r?\n/)[0];
  const cand = [join(homedir(), '.claude', 'local', WIN ? 'claude.exe' : 'claude'), join(homedir(), '.local', 'bin', WIN ? 'claude.exe' : 'claude')];
  if (MAC) {   // salinan bawaan aplikasi Claude desktop (versi terbaru)
    const base = join(homedir(), 'Library', 'Application Support', 'Claude', 'claude-code');
    try { for (const v of readdirSync(base).sort().reverse()) for (const h of readdirSync(join(base, v))) cand.push(join(base, v, h, 'claude.app', 'Contents', 'MacOS', 'claude')); } catch {}
  }
  return cand.find(existsSync) || null;
}
function authStatus() {
  const bin = claudeBin();
  if (!bin) return { ada: false, login: false };
  const r = spawnSync(bin, ['auth', 'status'], { encoding: 'utf8', timeout: 20000 });
  try { return { ada: true, login: !!JSON.parse(r.stdout).loggedIn }; } catch { return { ada: true, login: false }; }
}

// ---------- riwayat video ----------
const readJSON = (f, d) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return d; } };
const strip = s => String(s || '').replace(/<[^>]+>/g, '');
function videos() {
  const jobs = loadJobs();
  return readdirSync(WS, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.') && !SKIP.has(d.name) && (existsSync(join(WS, d.name, 'bedah.js')) || existsSync(join(WS, d.name, 'narasi.txt'))))
    .map(d => {
      const p = join(WS, d.name), f = n => existsSync(join(p, n)) ? n : null;
      const cov = readJSON(join(p, 'cover.json'), {}), w = readJSON(join(p, 'words.json'), {});
      const mp4 = f(`${d.name}_kecil.mp4`) || f(`${d.name}.mp4`);
      const waktu = Math.max(...[mp4, 'cover.png', 'bedah.js', 'narasi.txt'].filter(Boolean).map(n => { try { return statSync(join(p, n)).mtimeMs; } catch { return 0; } }));
      const job = [...jobs].reverse().find(j => j.project === d.name);
      return { name: d.name, title: strip(cov.title) || (readFileSync(join(p, 'narasi.txt'), 'utf8').split('\n')[0] || d.name).slice(0, 90),
        kicker: cov.kicker || '', mp4, cover: f('cover.png'), lembar: f('qc/lembar_akhir.png') || f('qc/lembar.png'), caption: f('caption.txt'),
        durasi: w.voDur ? Math.round(w.voDur) : null, waktu, job: job ? { id: job.id, status: job.status, tahap: job.tahap } : null };
    })
    .sort((a, b) => b.waktu - a.waktu);
}


// ---------- Gaya Saya ----------
// <folder kerja>/gaya-saya/<id>.json + aktif.json; logo <id>-logo.png. Proyek baru menyalin gaya aktif (new_project.mjs).
const GD = join(WS, 'gaya-saya');
const idAman = s => slug(s || 'gaya');
function daftarGaya() {
  mkdirSync(GD, { recursive: true });
  const aktif = readJSON(join(GD, 'aktif.json'), {}).id || 'bawaan';
  const daftar = readdirSync(GD).filter(f => f.endsWith('.json') && f !== 'aktif.json').map(f => readJSON(join(GD, f), null)).filter(Boolean)
    .map(g => { const G = hitungGaya(g); return { ...g, contoh: [G.warna.latar, G.warna.aksen, G.warna.sorot, G.warna.tinta] }; })
    .sort((a, b) => (b.diubah || 0) - (a.diubah || 0));
  return { aktif, daftar };
}
function simpanGaya(g) {
  mkdirSync(GD, { recursive: true });
  const id = g.id && existsSync(join(GD, idAman(g.id) + '.json')) ? idAman(g.id) : (() => { let b = idAman(g.nama), id = b, n = 2; while (existsSync(join(GD, id + '.json'))) id = `${b}-${n++}`; return id; })();
  const bersih = Object.fromEntries(Object.keys(GAYA_KOSONG).map(k => [k, g[k] ?? GAYA_KOSONG[k]]));
  bersih.id = id; bersih.diubah = Date.now();
  if (g.warna && typeof g.warna === 'object') bersih.warna = Object.fromEntries(Object.entries(g.warna).filter(([, v]) => /^#[0-9a-f]{6}$/i.test(v)));
  writeFileSync(join(GD, id + '.json'), JSON.stringify(bersih, null, 1));
  return bersih;
}
const PRATINJAU = join(HERE, 'pratinjau.html'), PRATINJAU_JS = join(HERE, 'pratinjau.js');
function pratinjau(g, adegan) {
  const G = hitungGaya(g);
  const seri = G.seri || 'KITA BONGKAR', panah = '<svg viewBox="0 0 13 10"><path d="M12 5H1.5M5 1.2 1.2 5 5 8.8" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const isi = adegan === 'cover'
    ? `<div id="cvlive"><div class="fade"></div><div class="in"><span class="k">KITA BONGKAR</span><h1>Kok pulpen klik bisa <mark>gantian?</mark></h1></div></div>`
    : `<div class="tag" style="left:96px;top:930px">Pegas ${panah}</div><div class="tag hi" style="left:600px;top:700px">Cincin gigi ${panah}</div>
       <div class="ov" id="stamp"><span class="snd" data-t="Klik!">Klik!</span></div>
       <div class="card"><i>BAIK</i>Ujung keluar<span class="u">+4 mm</span></div>
       <div class="ov" id="cap"><span class="pill"><b class="past">Pegasnya</b> <b class="past">tertekan,</b> <b class="cur">cincin</b> <b>berputar</b> <b>sedikit</b></span></div>`;
  const html = readFileSync(PRATINJAU, 'utf8').replace('<!--ISI-->', isi), js = readFileSync(PRATINJAU_JS, 'utf8');
  const g2 = { ...g, logo: g.logo && existsSync(join(GD, g.logo)) ? g.logo : '' };
  const out = terapkanGaya({ html, js, format: null }, g2);
  let h = out.html.replace('/*ADEGAN*/', out.js).replaceAll("url('huruf/", "url('/huruf/");
  if (g2.logo && !out.G.bawaan) h = h.replace('src="logo_gaya.png"', `src="/file/gaya-saya/${encodeURIComponent(g2.logo)}?${Date.now()}"`);
  return h;
}
// uji di video sungguhan: salinan contoh pulpen di .studio/uji-gaya, still adegan + cover.png
let ujiJalan = null;
function ujiGaya(g) {
  if (ujiJalan) return ujiJalan;
  const D = join(ST, 'uji-gaya'), node = process.execPath;
  ujiJalan = new Promise(ok => {
    const lanjut = () => {
      const g2 = { ...g }; if (g2.logo && existsSync(join(GD, g2.logo))) writeFileSync(join(D, 'logo_gaya.png'), readFileSync(join(GD, g2.logo))); else g2.logo = '';
      writeFileSync(join(D, 'gaya_saya.json'), JSON.stringify(g2));
      const cov = readJSON(join(D, 'cover.json'), {}); delete cov.kicker; writeFileSync(join(D, 'cover.json'), JSON.stringify(cov));
      rmSync(join(D, 'stills'), { recursive: true, force: true });
      const log = { stdio: ['ignore', 'ignore', 'pipe'] }, catat = p => (p.stderr.on('data', d => appendFileSync(join(ST, 'uji-gaya.log'), d)), p);
      const r = catat(spawn(node, ['render.mjs', '--still', '9.2', '16.4'], { cwd: D, ...log }));
      r.on('close', c1 => catat(spawn(node, ['cover.mjs'], { cwd: D, ...log })).on('close', c2 => {
        ujiJalan = null; const v = Date.now();
        ok(c1 === 0 && c2 === 0 ? { gambar: ['cover.png', 'stills/still_9.2.png', 'stills/still_16.4.png'].map(f => `/file/.studio/uji-gaya/${f}?${v}`) } : { error: 'Gagal membuat gambar uji.' });
      }));
    };
    if (existsSync(join(D, 'bedah.js'))) return lanjut();
    const np = spawn(node, [join(KE, 'new_project.mjs'), D, '--contoh', 'pulpen', '--gaya', 'bawaan'], { stdio: ['ignore', 'ignore', 'pipe'] });
    let galat = ''; np.stderr.on('data', d => (galat += d));
    np.on('close', c => (c === 0 ? lanjut() : (ujiJalan = null, appendFileSync(join(ST, 'uji-gaya.log'), galat), ok({ error: 'Mesin video belum siap.' }))));
  });
  return ujiJalan;
}

// ---------- pekerjaan (antrean satu per satu) ----------
const JF = join(ST, 'jobs.json');
const loadJobs = () => readJSON(JF, []);
const saveJobs = js => writeFileSync(JF, JSON.stringify(js, null, 1));
function patch(id, fn) { const js = loadJobs(), j = js.find(x => x.id === id); if (j) { fn(j); j.updated = Date.now(); saveJobs(js); } return j; }
const step = (id, text) => patch(id, j => { j.langkah = [...(j.langkah || []), { t: Date.now(), text: String(text).slice(0, 240) }].slice(-60); });
const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'video';

const TAHAP = ['Riset', 'Naskah', 'Suara', 'Model 3D', 'Cek gambar', 'Render', 'Selesai'];
function tahapDari(tool, input) {   // dari pemanggilan tool Claude -> tahap yang dimengerti pengguna
  const cmd = String(input?.command || ''), file = String(input?.file_path || '');
  if (tool === 'WebSearch' || tool === 'WebFetch') return 'Riset';
  if (/narasi\.txt|ucapan\.txt/.test(file)) return 'Naskah';
  if (/gen_vo|asr\.py|prep\.py/.test(cmd)) return 'Suara';
  if (/bedah\.(js|html)/.test(file)) return 'Model 3D';
  if (/render\.mjs --still|sheet\.py/.test(cmd)) return 'Cek gambar';
  if (/render\.mjs --events|sfx\.py/.test(cmd)) return 'Cek gambar';
  return null;
}

let running = null;
function antre() {
  if (running) return;
  const j = loadJobs().find(x => x.status === 'antre');
  if (!j) return;
  running = j.id;
  (j.fase === 'render' ? jalankanRender(j) : jalankanClaude(j)).finally(() => { running = null; antre(); });
}

const TOOLS = ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Skill', 'TodoWrite'].join(',');
function promptBaru(j) {
  return `Pakai skill animantra-vector untuk membuat SATU video dari awal. Kamu berjalan di Animantra Studio (mode tanpa chat): JANGAN bertanya apa pun, ambil keputusan sendiri yang paling masuk akal, dan tulis keputusan penting dalam satu kalimat.
Format: ${j.format}. Topik: ${j.topik}. Durasi target: ±${j.durasi} detik. Suara: ${j.suara} (Otomatis = urutan di SKILL.md). Musik: ${j.musik}.
Buat proyek bernama "${j.project}" dengan --di "${WS}" --gaya ${j.gaya || 'bawaan'}. Ikuti SKILL.md, reference/pelajaran.md (termasuk Pola penyajian & Kemiripan dengan benda asli), panduan_warna.md, dan contoh format yang sama.
Untuk riset bentuk benda, unduh 2–3 foto produk dengan curl ke ${j.project}/qc/ref/ lalu lihat dengan Read.
Kerjakan sampai: still lolos cek, \`node render.mjs --events\` dan \`node py.mjs sfx.py\` sudah jalan, cover.json (dengan "pembuka": "hidup") dan caption.txt sudah ditulis.
JANGAN jalankan \`node render.mjs\` tanpa --still dan JANGAN jalankan selesaikan.mjs: render dan finishing dikerjakan Studio sesudah kamu selesai.
Tutup dengan ringkasan 2–3 kalimat berbahasa Indonesia untuk pengguna.`;
}
function promptRevisi(j, catatan) {
  return `Revisi video proyek "${j.project}" (folder ${join(WS, j.project)}) sesuai catatan pengguna: "${catatan}". Jangan bertanya; ubah bagian yang relevan, cek ulang still yang terdampak, jalankan ulang \`node render.mjs --events\` dan \`node py.mjs sfx.py\` kalau waktu/peristiwa berubah. JANGAN jalankan \`node render.mjs\` tanpa --still atau selesaikan.mjs: Studio yang merender. Tutup dengan ringkasan 1–2 kalimat.`;
}

function jalankanClaude(j) {
  return new Promise(done => {
    const bin = claudeBin();
    if (!bin) { patch(j.id, x => { x.status = 'gagal'; x.error = 'Claude Code belum terpasang.'; }); return done(); }
    const args = ['-p', j.prompt, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits', '--allowedTools', TOOLS];
    if (j.resume) args.push('--resume', j.resume);
    patch(j.id, x => { x.status = 'jalan'; x.mulai = Date.now(); x.tahap = x.tahap || 'Riset'; });
    const log = join(ST, `${j.id}.log`);
    const p = spawn(bin, args, { cwd: WS, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ANIMANTRA_STUDIO: '1' } });
    patch(j.id, x => { x.pid = p.pid; });
    let buf = '';
    p.stdout.on('data', d => {
      appendFileSync(log, d); buf += d;
      let k; while ((k = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, k); buf = buf.slice(k + 1);
        let e; try { e = JSON.parse(line); } catch { continue; }
        if (e.type === 'system' && e.subtype === 'init') patch(j.id, x => { x.sessionId = e.session_id; });
        if (e.type === 'assistant') for (const c of e.message?.content || []) {
          if (c.type === 'text' && c.text.trim()) step(j.id, c.text.trim().split('\n')[0]);
          if (c.type === 'tool_use') {
            const t = tahapDari(c.name, c.input); if (t) patch(j.id, x => { if (TAHAP.indexOf(t) > TAHAP.indexOf(x.tahap || 'Riset')) x.tahap = t; });
            if (c.input?.description) step(j.id, '› ' + c.input.description);
          }
        }
        if (e.type === 'result') patch(j.id, x => { x.ringkasan = e.result; x.biaya = e.total_cost_usd; x.claudeGagal = !!e.is_error; });
      }
    });
    p.stderr.on('data', d => appendFileSync(log, d));
    p.on('close', code => {
      const x = patch(j.id, x => { x.pid = null; });
      const siap = existsSync(join(WS, x.project, 'events.json')) && existsSync(join(WS, x.project, 'cover.json'));
      if (x.status === 'dibatalkan') return done();
      if (code === 0 && !x.claudeGagal && siap) patch(j.id, y => { y.status = 'antre'; y.fase = 'render'; y.tahap = 'Render'; });
      else patch(j.id, y => { y.status = 'gagal'; y.error = y.claudeGagal ? (y.ringkasan || 'Claude berhenti dengan galat.') : (siap ? `Claude berhenti (kode ${code}).` : 'Proyek belum siap dirender (events.json/cover.json belum ada).'); });
      done();
    });
  });
}

function jalankanRender(j) {
  return new Promise(done => {
    const dir = join(WS, j.project), node = process.execPath;
    patch(j.id, x => { x.status = 'jalan'; x.tahap = 'Render'; x.persen = 0; });
    step(j.id, '› Merender video');
    const p = spawn(node, ['render.mjs'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    patch(j.id, x => { x.pid = p.pid; });
    const log = join(ST, `${j.id}.log`);
    p.stdout.on('data', d => { appendFileSync(log, d); const m = [...String(d).matchAll(/(\d+)\/(\d+)/g)].pop(); if (m) patch(j.id, x => { x.persen = Math.round(100 * m[1] / m[2]); }); });
    p.stderr.on('data', d => appendFileSync(log, d));
    p.on('close', code => {
      if (loadJobs().find(x => x.id === j.id)?.status === 'dibatalkan') return done();
      if (code !== 0) { patch(j.id, x => { x.status = 'gagal'; x.error = 'Render gagal. Lihat log.'; x.pid = null; }); return done(); }
      step(j.id, '› Cover, versi kecil, cek sinkron');
      const f = spawn(node, ['selesaikan.mjs'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
      f.stdout.on('data', d => { appendFileSync(log, d); const m = /selisih median ([+-]?[\d.]+)/.exec(String(d)); if (m) step(j.id, `Sinkron suara: selisih ${m[1]} dtk`); });
      f.stderr.on('data', d => appendFileSync(log, d));
      f.on('close', c2 => { patch(j.id, x => { x.pid = null; x.persen = 100; if (c2 === 0) { x.status = 'selesai'; x.tahap = 'Selesai'; } else { x.status = 'gagal'; x.error = 'Finishing gagal. Lihat log.'; } }); done(); });
    });
  });
}

function buatJob(b) {
  const js = loadJobs(), base = slug(b.topik), names = new Set(readdirSync(WS));
  let project = base, n = 2; while (names.has(project) || js.some(x => x.project === project && !x.revisiDari)) project = `${base}-${n++}`;
  const j = { id: Date.now().toString(36), project, format: b.format, topik: b.topik, durasi: b.durasi || 50, suara: b.suara || 'Otomatis', musik: b.musik || 'Pilihkan', gaya: b.gaya || readJSON(join(GD, 'aktif.json'), {}).id || 'bawaan',
    status: 'antre', fase: 'claude', tahap: 'Riset', created: Date.now(), langkah: [] };
  j.prompt = promptBaru(j); return masuk(j, js);
}
function buatRevisi(project, catatan) {
  const js = loadJobs(), prev = [...js].reverse().find(x => x.project === project && x.sessionId);
  const j = { id: Date.now().toString(36), project, format: prev?.format || '', topik: `Revisi: ${catatan}`, revisiDari: prev?.id || null, status: 'antre', fase: 'claude',
    tahap: 'Model 3D', created: Date.now(), langkah: [], resume: prev?.sessionId || null };
  j.catatan = catatan; j.prompt = promptRevisi(j, catatan); return masuk(j, js);
}
function masuk(j, js) {   // mode chat: tunggu Claude di chat; mode headless: antre ke `claude -p`
  if (MODE === 'chat') { j.status = 'menunggu-chat'; js.push(j); saveJobs(js); siarkan(j); }
  else { js.push(j); saveJobs(js); antre(); }
  return j;
}
const ringkas = ({ prompt, langkah, ...j }) => j;
function siarkan(j) { for (const res of pendengar) res.write(`STUDIO ${JSON.stringify(ringkas(j))}\n`); }
function persenRender(j) {   // mode chat: Claude merender dengan keluaran ke <proyek>/qc/render.log
  try { const t = readFileSync(join(WS, j.project, 'qc', 'render.log'), 'utf8').slice(-4000), m = [...t.matchAll(/(\d+)\/(\d+)/g)].pop(); return m ? Math.round(100 * m[1] / m[2]) : null; } catch { return null; }
}
function batal(id) {
  const j = patch(id, x => { x.status = 'dibatalkan'; });
  if (j?.pid) { try { process.kill(j.pid); } catch {} }
  return j;
}

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const json = (res, o, code = 200) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
const body = req => new Promise(r => { let s = ''; req.on('data', d => (s += d)); req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { r({}); } }); });
function kirimFile(req, res, f) {
  if (!existsSync(f)) { res.writeHead(404); return res.end(); }
  const size = statSync(f).size, type = MIME[extname(f)] || 'application/octet-stream', m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (m) {   // video perlu Range supaya bisa digeser
    const a = m[1] ? +m[1] : 0, b = m[2] ? +m[2] : size - 1;
    res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${a}-${b}/${size}`, 'accept-ranges': 'bytes', 'content-length': b - a + 1 });
    return createReadStream(f, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' });
  createReadStream(f).pipe(res);
}

createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), p = decodeURIComponent(u.pathname);
  try {
    if (p === '/' ) return kirimFile(req, res, join(HERE, 'index.html'));
    if (p === '/api/status') return json(res, { folder: WS, mode: MODE, pendengar: pendengar.size, claude: MODE === 'headless' ? authStatus() : null, berjalan: running, tahap: TAHAP });
    if (p === '/api/chat-stream') {   // satu baris per permintaan; Claude di chat memantaunya dengan Monitor (curl -sN)
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-cache' }); pendengar.add(res);
      for (const j of loadJobs().filter(x => x.status === 'menunggu-chat')) res.write(`STUDIO ${JSON.stringify(ringkas(j))}\n`);
      req.on('close', () => pendengar.delete(res)); return;
    }
    if (p === '/api/lapor' && req.method === 'POST') {   // laporan Claude di chat: status, tahap, langkah, proyek
      const b = await body(req), j = patch(b.id, x => { if (b.status) x.status = b.status; if (b.tahap) x.tahap = b.tahap; if (b.proyek) x.project = b.proyek; if (b.error) x.error = b.error; if (b.status === 'selesai') { x.tahap = 'Selesai'; x.persen = 100; } });
      if (j && b.teks) step(b.id, b.teks); return json(res, j ? ringkas(j) : { error: 'pekerjaan tidak ada' }, j ? 200 : 404);
    }
    if (p === '/api/gaya') return json(res, { ...daftarGaya(), preset: Object.fromEntries(Object.entries(PRESET).map(([k, v]) => [k, { ...v, contoh: (w => [w.latar, w.aksen, w.sorot, w.tinta])(hitungGaya({ preset: k, gelap: !!v.gelap }).warna) }])),
      huruf: Object.fromEntries(Object.entries(HURUF).map(([k, v]) => [k, { nama: v.nama, ket: v.ket, sans: v.sans, file: v.file }])), pilihan: PILIHAN, kosong: GAYA_KOSONG });
    if (p === '/api/gaya/hitung' && req.method === 'POST') { const g = await body(req), G = hitungGaya(g); return json(res, { warna: G.warna, kontras: cekKontras(G.warna), gelap: G.gelap }); }
    if (p === '/api/gaya/simpan' && req.method === 'POST') { const b = await body(req), g = simpanGaya(b.gaya || {}); if (b.aktifkan) writeFileSync(join(GD, 'aktif.json'), JSON.stringify({ id: g.id })); return json(res, { gaya: g, ...daftarGaya() }); }
    if (p === '/api/gaya/aktif' && req.method === 'POST') { const b = await body(req); mkdirSync(GD, { recursive: true }); writeFileSync(join(GD, 'aktif.json'), JSON.stringify({ id: b.id === 'bawaan' ? 'bawaan' : idAman(b.id) })); return json(res, daftarGaya()); }
    if (p === '/api/gaya/hapus' && req.method === 'POST') {
      const b = await body(req), id = idAman(b.id); rmSync(join(GD, id + '.json'), { force: true }); rmSync(join(GD, id + '-logo.png'), { force: true });
      if (readJSON(join(GD, 'aktif.json'), {}).id === id) writeFileSync(join(GD, 'aktif.json'), JSON.stringify({ id: 'bawaan' })); return json(res, daftarGaya());
    }
    if (p === '/api/gaya/logo' && req.method === 'POST') {   // { id, data: "data:image/png;base64,..." } -> gaya-saya/<id>-logo.png
      const b = await body(req), m = /^data:image\/png;base64,(.+)$/.exec(b.data || '');
      if (!m) return json(res, { error: 'Logo harus berupa file PNG.' }, 400);
      const buf = Buffer.from(m[1], 'base64'); if (buf.length > 3e6) return json(res, { error: 'Logo terlalu besar (maks 3 MB).' }, 400);
      mkdirSync(GD, { recursive: true }); const f = `${idAman(b.id)}-logo.png`; writeFileSync(join(GD, f), buf); return json(res, { logo: f });
    }
    if (p === '/api/gaya/pratinjau' && req.method === 'POST') { const b = await body(req); res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(pratinjau(b.gaya || {}, b.adegan)); }
    if (p === '/api/gaya/uji' && req.method === 'POST') { const b = await body(req); return json(res, await ujiGaya(b.gaya || {})); }
    if (p.startsWith('/huruf/')) return kirimFile(req, res, join(K, 'huruf', p.slice(7).replace(/[^a-z0-9.]/gi, '')));
    if (p === '/api/videos') return json(res, videos());
    if (p === '/api/jobs') return json(res, loadJobs().slice(-30).reverse().map(({ prompt, ...j }) => (MODE === 'chat' && j.status === 'jalan' && j.tahap === 'Render' && j.fase !== 'render' ? { ...j, persen: persenRender(j) ?? j.persen } : j)));
    if (p === '/api/jobs/new' && req.method === 'POST') { const b = await body(req); if (!b.topik || !b.format) return json(res, { error: 'Format dan topik wajib diisi.' }, 400); return json(res, buatJob(b)); }
    if (p === '/api/revisi' && req.method === 'POST') { const b = await body(req); if (!b.project || !b.catatan) return json(res, { error: 'Catatan revisi kosong.' }, 400); return json(res, buatRevisi(b.project, b.catatan)); }
    if (p === '/api/batal' && req.method === 'POST') { const b = await body(req); return json(res, batal(b.id) || {}); }
    if (p === '/api/render' && req.method === 'POST') {   // render ulang proyek yang sudah siap, tanpa Claude
      const b = await body(req), js = loadJobs(), j = { id: Date.now().toString(36), project: b.project, topik: 'Render ulang', status: 'antre', fase: 'render', tahap: 'Render', created: Date.now(), langkah: [] };
      js.push(j); saveJobs(js); antre(); return json(res, j);
    }
    if (p === '/api/login' && req.method === 'POST') {   // membuka halaman masuk Claude di browser
      const bin = claudeBin(); if (!bin) return json(res, { error: 'Claude Code belum terpasang.' }, 400);
      spawn(bin, ['auth', 'login', '--claudeai'], { cwd: WS, stdio: 'ignore', detached: true }).unref(); return json(res, { ok: true });
    }
    if (p === '/api/buka' && req.method === 'POST') {   // tampilkan di Finder / Explorer
      const b = await body(req), f = resolve(WS, b.project || '', b.file || '');
      if (!f.startsWith(WS + sep)) return json(res, { error: 'jalur tidak sah' }, 400);
      spawn(MAC ? 'open' : WIN ? 'explorer' : 'xdg-open', MAC ? ['-R', f] : WIN ? [`/select,${f}`] : [dirname(f)], { stdio: 'ignore', detached: true }).unref(); return json(res, { ok: true });
    }
    if (p.startsWith('/log/')) return kirimFile(req, res, join(ST, p.slice(5).replace(/[^a-z0-9]/gi, '') + '.log'));
    if (p.startsWith('/file/')) {   // /file/<proyek>/<jalur> — hanya di dalam folder kerja
      const f = resolve(WS, p.slice(6));
      if (!f.startsWith(WS + sep)) { res.writeHead(403); return res.end(); }
      return kirimFile(req, res, f);
    }
    res.writeHead(404); res.end();
  } catch (e) { json(res, { error: e.message }, 500); }
}).listen(PORT, '127.0.0.1', () => {
  // pekerjaan yang terputus saat Studio ditutup: Claude dilanjutkan dari sesi terakhir, render diulang
  const js = loadJobs(); js.forEach(j => { if (j.status === 'jalan' && (MODE === 'headless' || j.fase === 'render')) { j.status = 'antre'; if (j.fase === 'claude' && j.sessionId) { j.resume = j.sessionId; j.prompt = 'Lanjutkan pekerjaan sebelumnya yang terputus, sampai titik yang diminta di instruksi awal.'; } } }); saveJobs(js);
  console.log(`Animantra Studio: http://localhost:${PORT}  (folder: ${WS}, mode ${MODE})`);
  antre();
});
