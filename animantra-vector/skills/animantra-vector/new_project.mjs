// Folder proyek video baru dari template (Mac & Windows). Dijalankan oleh Claude.
//   node new_project.mjs <nama> --di <folder sesi>             -> <folder sesi>/<nama> (kosong: Claude menulis narasi & scene)
//   node new_project.mjs <nama> --di <folder sesi> --contoh kunci    -> salinan contoh lengkap gaya bedah (bawaan; juga: pulpen, korek)
//     generator: pembangkit listrik 28 dtk (patokan mutu mesin berputar)
//     contoh per format: listrik (tur), story, pov, tutorial, mitos, versus, toplist, kalau, evolusi, kuis
//   node new_project.mjs <nama> --di <folder sesi> --contoh stapler  -> contoh 3D gaya terang lama
//   node new_project.mjs <nama> --di <folder sesi> --contoh ricecooker_25d   -> contoh mode 2.5D isometrik
//   --gaya <id>: pakai Gaya Saya tertentu (<folder sesi>/gaya-saya/<id>.json); tanpa itu gaya aktif (gaya-saya/aktif.json); --gaya bawaan = tanpa gaya
//   Tanpa --di: folder KB_DIR, atau folder tempat perintah dijalankan. <nama> boleh berupa path lengkap.
import { existsSync, mkdirSync, cpSync, readdirSync, symlinkSync, rmSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { FFMPEG } from './template/alat.mjs';
import { join, dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const K = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : undefined; };
const di = opt('--di'), gayaId = opt('--gaya'), contoh = argv.includes('--contoh') ? (opt('--contoh') || 'kunci') : null;
const nama = argv[0];
if (!nama) { console.log('pakai: node new_project.mjs <nama> --di <folder sesi> [--contoh kunci]'); process.exit(1); }
const D = isAbsolute(nama) ? nama : resolve(di || process.env.KB_DIR || process.cwd(), nama);
const NM = join(K, 'engine', 'node_modules');
if (!existsSync(NM)) { console.log(`Mesin belum siap: jalankan node ${join(K, 'setup.mjs')}`); process.exit(1); }
for (const d of ['vo', 'stills', 'qc']) mkdirSync(join(D, d), { recursive: true });
for (const f of readdirSync(join(K, 'template'))) cpSync(join(K, 'template', f), join(D, f));
const link = join(D, 'node_modules');
try { lstatSync(link); rmSync(link, { recursive: false, force: true }); } catch {}
symlinkSync(NM, link, 'junction');                       // Windows: junction (tanpa hak admin); Mac: symlink biasa
if (contoh) {
  const C = join(K, 'reference', `contoh_${contoh}`);
  // bedah.js (gaya bedah), scene_body.js (3D lain) atau iso_body.js (2.5D); scene.js dirakit sendiri oleh render.mjs
  for (const f of ['bedah.js', 'bedah.html', 'scene_body.js', 'iso_body.js', 'tema.json', 'ucapan.txt', 'gaya.txt', 'musik.json', 'tempo.json', 'narasi.txt', 'caption.txt', 'words.json', 'cover.json', 'jeda_bab.json', 'sfx.py']) if (existsSync(join(C, f))) cpSync(join(C, f), join(D, f));
  // narasi contoh disimpan sebagai .m4a (paket kecil); diubah kembali ke WAV pakai ffmpeg milik mesin skill
  if (existsSync(join(C, 'vo', 'narasi.wav'))) cpSync(join(C, 'vo', 'narasi.wav'), join(D, 'vo', 'narasi.wav'));
  else if (existsSync(join(C, 'vo', 'narasi.m4a'))) {
    const r = spawnSync(FFMPEG, ['-v', 'error', '-y', '-i', join(C, 'vo', 'narasi.m4a'), join(D, 'vo', 'narasi.wav')], { stdio: 'inherit' });
    if (r.status !== 0) console.log('PERINGATAN: narasi contoh gagal diubah ke WAV (ffmpeg). Jalankan setup.mjs dulu.');
  }
}
// Gaya Saya: salinan beku di proyek, jadi mengedit gaya nanti tidak mengubah video yang sudah dibuat
const GD = join(di || process.env.KB_DIR || dirname(D), 'gaya-saya');
const idGaya = gayaId || (() => { try { return JSON.parse(readFileSync(join(GD, 'aktif.json'), 'utf8')).id; } catch { return null; } })();
if (idGaya && idGaya !== 'bawaan' && existsSync(join(GD, idGaya + '.json'))) {
  const g = JSON.parse(readFileSync(join(GD, idGaya + '.json'), 'utf8'));
  if (g.logo && existsSync(join(GD, g.logo))) cpSync(join(GD, g.logo), join(D, 'logo_gaya.png')); else g.logo = '';
  writeFileSync(join(D, 'gaya_saya.json'), JSON.stringify(g, null, 1));
  console.error(`Gaya Saya: ${g.nama || idGaya}`);
}
console.log(D);
