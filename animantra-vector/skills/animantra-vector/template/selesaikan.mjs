// Setelah `node render.mjs`: cover -> cover jadi pembuka 1,2 dtk + cover art -> versi kecil -> cek sinkron.
//   node selesaikan.mjs            (jalankan di folder proyek; Mac & Windows sama)
import { existsSync, mkdirSync, renameSync, rmSync, statSync, readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PY, FFMPEG } from './alat.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
process.chdir(DIR);
const NAMA = basename(DIR);
const run = (cmd, args) => { const r = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  if (r.status !== 0) { console.error(`gagal: ${basename(cmd)} ${args[0] ?? ''}`); process.exit(1); } };
mkdirSync('qc', { recursive: true });
run(process.execPath, ['cover.mjs']);
const mentah = join('qc', `${NAMA}_mentah.mp4`);
// hanya render baru (lebih baru dari hasil finishing terakhir) yang dipindah jadi mentah; dijalankan ulang tidak menggandakan pembuka
const kecil = `${NAMA}_kecil.mp4`, baru = existsSync(`${NAMA}.mp4`) && (!existsSync(kecil) || statSync(`${NAMA}.mp4`).mtimeMs > statSync(kecil).mtimeMs);
if (baru || !existsSync(mentah)) { rmSync(mentah, { force: true }); renameSync(`${NAMA}.mp4`, mentah); }
// cover.json "pembuka": "hidup" = scene sudah membuka dengan cover bergerak (frame 0 = komposisi cover), jadi tidak ada cover diam di depan
const HIDUP = (() => { try { return JSON.parse(readFileSync('cover.json', 'utf8')).pembuka === 'hidup'; } catch { return false; } })();
run(PY, ['gabung_thumbnail.py', mentah, 'cover.png', `${NAMA}.mp4`, ...(HIDUP ? ['0', '0'] : [])]);
run(FFMPEG, ['-y', '-loglevel', 'error', '-i', `${NAMA}.mp4`, '-map', '0', '-c:v:0', 'libx264', '-crf', '27', '-preset', 'medium', '-tune', 'animation', '-pix_fmt', 'yuv420p',
  '-c:v:1', 'copy', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', `${NAMA}_kecil.mp4`]);
for (const f of [`${NAMA}.mp4`, `${NAMA}_kecil.mp4`]) console.log(f, (statSync(f).size / 1048576).toFixed(1) + ' MB');
run(PY, ['cek_sinkron.py', `${NAMA}_kecil.mp4`, HIDUP ? '0' : '1.2']);
