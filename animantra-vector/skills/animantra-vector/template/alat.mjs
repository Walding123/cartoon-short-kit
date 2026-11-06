// Pembantu lintas OS (Mac & Windows) untuk skrip proyek: Python & ffmpeg milik mesin skill, dan opsi Chrome perekam.
// Lokasinya ditulis setup.mjs ke engine/alat.json; folder proyek menunjuk ke mesin lewat node_modules (symlink/junction).
import { existsSync, readFileSync, writeFileSync, realpathSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { terapkanGaya } from './gaya.mjs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const WIN = process.platform === 'win32';
export const MAC = process.platform === 'darwin';
export const ENGINE = (() => {
  try { return dirname(realpathSync(join(HERE, 'node_modules'))); }
  catch { return join(homedir(), '.claude', 'skills', 'animantra-vector', 'engine'); }
})();
const CFG = (() => { try { return JSON.parse(readFileSync(join(ENGINE, 'alat.json'), 'utf8')); } catch { return {}; } })();
export const PY = process.env.KB_PY || CFG.python || join(ENGINE, '.venv', WIN ? 'Scripts/python.exe' : 'bin/python');
export const FFMPEG = process.env.FFMPEG || CFG.ffmpeg || join(ENGINE, WIN ? 'ffmpeg.exe' : 'ffmpeg');

// API key disimpan pengguna sendiri di ~/.animantra-vector/kunci-<layanan>.txt (dibuat & dibuka kunci.mjs), bukan lewat chat.
// Isi: baris KUNCI=nilai; baris berawalan # diabaikan. Jangan pernah mencetak nilainya.
export const FILE_KUNCI = layanan => join(homedir(), '.animantra-vector', `kunci-${layanan}.txt`);
export function bacaKunci(layanan) {
  try {
    return Object.fromEntries(readFileSync(FILE_KUNCI(layanan), 'utf8').split(/\r?\n/).filter(l => /^\s*[A-Z_]+\s*=/.test(l))
      .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).replace(/\s+/g, '')]));
  } catch { return {}; }
}

// scene.js dirakit ulang tiap render (tanpa `cat`): mode 2.5D = iso_head.js + iso_body.js, mode 3D = scene_head.js [+ papan.js] [+ realis.js] + scene_body.js
export function rakitScene() {
  // gaya bedah (bawaan video benda): bedah.js = scene utuh, bedah.html = tata letaknya (judul besar, pil, subtitle kotak)
  if (existsSync(join(HERE, 'bedah.js'))) {
    const baca = f => (existsSync(join(HERE, f)) ? readFileSync(join(HERE, f), 'utf8') : null);
    let isi = { html: baca('bedah.html'), js: baca('bedah.js'), format: baca('format.js') };
    // Gaya Saya (gaya_saya.json, disalin new_project.mjs dari <folder sesi>/gaya-saya): warna, huruf, bentuk, nama seri, logo
    rmSync(join(HERE, 'format_gaya.js'), { force: true });
    if (existsSync(join(HERE, 'gaya_saya.json'))) {
      const g = JSON.parse(readFileSync(join(HERE, 'gaya_saya.json'), 'utf8'));
      const hasil = terapkanGaya({ ...isi, html: isi.html ?? '' }, g);
      if (!hasil.G.bawaan) {
        isi = hasil;
        if (isi.format != null) writeFileSync(join(HERE, 'format_gaya.js'), isi.format);
        const SUMBER = join(dirname(ENGINE), 'huruf');
        if (hasil.G.hurufInfo.file.length) mkdirSync(join(HERE, 'huruf'), { recursive: true });
        for (const [, f] of hasil.G.hurufInfo.file) if (existsSync(join(SUMBER, f))) copyFileSync(join(SUMBER, f), join(HERE, 'huruf', f));
      }
    }
    writeFileSync(join(HERE, 'scene.js'), isi.js);
    if (isi.html) writeFileSync(join(HERE, 'index.html'), isi.html);
    return;
  }
  for (const [head, body] of [['iso_head.js', 'iso_body.js'], ['scene_head.js', 'scene_body.js']]) {
    const b = join(HERE, body);
    if (!existsSync(b)) continue;
    const isi = readFileSync(b, 'utf8');
    // "@papan" di badan: sisipkan tata letak papan + palet warna (papan.js, membaca tema.json)
    // "@realis": sisipkan tampilan semi-realistis (realis.js: bahan PBR, cahaya ruangan, nada ACES)
    const sisip = f => (isi.includes('@' + f) && existsSync(join(HERE, f + '.js')) ? readFileSync(join(HERE, f + '.js'), 'utf8') : '');
    writeFileSync(join(HERE, 'scene.js'), readFileSync(join(HERE, head), 'utf8') + sisip('papan') + sisip('realis') + isi); return;
  }
}

// Google Chrome terpasang? (kalau tidak, playwright memakai Chromium yang diunduh setup.mjs)
export function hasChrome() {
  if (MAC) return existsSync('/Applications/Google Chrome.app');
  if (WIN) return [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]
    .filter(Boolean).some(d => existsSync(join(d, 'Google', 'Chrome', 'Application', 'chrome.exe')));
  return false;
}
export function chromeOpts(extra = []) {
  return { channel: hasChrome() ? 'chrome' : undefined, headless: true,
    args: [...(MAC ? ['--use-angle=metal'] : []), '--ignore-gpu-blocklist', ...extra] };
}
