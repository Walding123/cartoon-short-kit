// Siapkan mesin skill animantra-vector (sekali per komputer, Mac & Windows). Dijalankan oleh installer atau oleh Claude, bukan oleh pengguna.
//   - Node 18+: three.js + playwright-core di engine/node_modules; perekam = Google Chrome, atau Chromium yang diunduh otomatis
//   - Python 3.9+: engine/.venv (faster-whisper untuk waktu tiap kata, numpy, pillow, imageio-ffmpeg)
//   - ffmpeg: ffmpeg sistem kalau ada, kalau tidak dari imageio-ffmpeg; lokasi Python & ffmpeg ditulis ke engine/alat.json
//   - model faster-whisper "small" diunduh sekali (±500 MB)
//   node setup.mjs
import { existsSync, writeFileSync, readFileSync, symlinkSync, rmSync, lstatSync } from 'node:fs';
import { join, dirname, delimiter } from 'node:path';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const K = dirname(fileURLToPath(import.meta.url));
process.chdir(K);
const WIN = process.platform === 'win32', MAC = process.platform === 'darwin';
const ok = s => console.log(`✓ ${s}`), no = s => console.log(`✗ ${s}`);
const die = s => { no(s); process.exit(1); };
const sh = (cmd, args, o = {}) => spawnSync(cmd, args, { encoding: 'utf8', shell: WIN && /\.(cmd|bat)$/i.test(cmd), ...o });
const which = name => { for (const d of (process.env.PATH || '').split(delimiter)) for (const ext of WIN ? ['.exe', '.cmd', ''] : ['']) {
  const p = join(d, name + ext); if (d && existsSync(p)) return p; } return null; };

ok(`node ${process.version}`);
const sysPy = WIN ? (which('python') || which('py')) : which('python3');
const pyv = sysPy && sh(sysPy, ['-V']);
if (!pyv || pyv.status !== 0) die('Python belum ada (jalankan installer dari paketnya)');
ok((pyv.stdout || pyv.stderr).trim());

// npm dijalankan lewat node + npm-cli.js (aman untuk folder pengguna berspasi di Windows)
const nd = dirname(process.execPath);
const npmCli = [join(nd, 'node_modules/npm/bin/npm-cli.js'), join(nd, '../lib/node_modules/npm/bin/npm-cli.js')].find(existsSync);
const npmArgs = ['install', '--no-audit', '--no-fund', '--loglevel=error'];
const ni = npmCli ? sh(process.execPath, [npmCli, ...npmArgs], { cwd: join(K, 'engine'), stdio: 'inherit' })
  : sh(which('npm') || die('npm belum ada (jalankan installer dari paketnya)'), npmArgs, { cwd: join(K, 'engine'), stdio: 'inherit' });
ni.status === 0 ? ok('three.js + playwright-core') : die('npm install gagal (cek internet)');

const chrome = MAC ? existsSync('/Applications/Google Chrome.app')
  : WIN ? [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean).some(d => existsSync(join(d, 'Google', 'Chrome', 'Application', 'chrome.exe')))
  : false;
if (chrome) ok('Google Chrome (perekam)');
else sh(process.execPath, [join(K, 'engine/node_modules/playwright-core/cli.js'), 'install', 'chromium'], { stdio: 'inherit' }).status === 0
  ? ok('Chromium (perekam, karena Google Chrome tidak ada)') : die('Chromium gagal diunduh (cek internet)');

const PY = join(K, 'engine', '.venv', WIN ? 'Scripts/python.exe' : 'bin/python');
if (!existsSync(PY)) sh(sysPy, ['-m', 'venv', join(K, 'engine', '.venv')], { stdio: 'inherit' });
if (!existsSync(PY)) die('lingkungan Python gagal dibuat');
// lewat `python -m pip` (bukan bin/pip): tetap jalan walau folder skill pindah atau ganti nama
sh(PY, ['-m', 'pip', 'install', '-q', '--upgrade', 'pip'], { stdio: 'inherit' });
sh(PY, ['-m', 'pip', 'install', '-q', 'faster-whisper', 'numpy', 'pillow', 'imageio-ffmpeg'], { stdio: 'inherit' }).status === 0
  ? ok('Python (faster-whisper, numpy, pillow, ffmpeg)') : die('paket Python gagal dipasang');

let FF = which('ffmpeg');
if (!FF) { const r = sh(PY, ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())']); FF = r.status === 0 ? r.stdout.trim() : null; }
if (!FF) die('ffmpeg tidak tersedia');
if (!WIN) { const link = join(K, 'engine', 'ffmpeg'); try { lstatSync(link); rmSync(link); } catch {} symlinkSync(FF, link); }   // proyek lama memakai engine/ffmpeg
writeFileSync(join(K, 'engine', 'alat.json'), JSON.stringify({ python: PY, ffmpeg: FF }, null, 1));
ok('ffmpeg');

const WM = process.env.KB_WHISPER || 'small';
sh(PY, ['-c', `from faster_whisper import WhisperModel; WhisperModel('${WM}', device='cpu', compute_type='int8')`]).status === 0
  ? ok(`model pengenal suara (${WM})`) : no('model pengenal suara belum terunduh (dicoba lagi saat dipakai)');

// suara narasi: ElevenLabs / VokaStudio (API key di ~/.animantra-vector/kunci-*.txt, diisi pengguna sendiri) > VoiceStudio lokal > suara bawaan sistem
const adaKunci = l => { try { return /^API_KEY=\S+/m.test(readFileSync(join(homedir(), '.animantra-vector', `kunci-${l}.txt`), 'utf8')); } catch { return false; } };
if (adaKunci('elevenlabs')) ok('ElevenLabs (suara utama)');
let voka = adaKunci('gemini'); try { voka ||= !!JSON.parse(readFileSync(join(homedir(), '.claude.json'), 'utf8')).mcpServers.vokastudio.env.GEMINI_API_KEY; } catch {}
voka ? ok('VokaStudio') : no('VokaStudio belum dipasang (suara utama)');
try { await fetch('http://127.0.0.1:3900/profiles', { signal: AbortSignal.timeout(3000) }); ok('VoiceStudio (127.0.0.1:3900)'); }
catch { no('VoiceStudio tidak terdeteksi (cadangan, opsional)'); }
if (MAC) {
  /Damayanti/.test(sh('say', ['-v', '?']).stdout || '') ? ok('suara Mac Damayanti') : no('suara Mac Damayanti belum diunduh (opsional)');
} else if (WIN) {
  const r = sh('powershell', ['-NoProfile', '-Command', "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'id*' } | ForEach-Object { $_.VoiceInfo.Name }"]);
  (r.stdout || '').trim() ? ok(`suara Windows Bahasa Indonesia (${r.stdout.trim().split(/\r?\n/)[0]})`) : no('suara Windows Bahasa Indonesia belum ada (opsional)');
}
console.log('selesai');
