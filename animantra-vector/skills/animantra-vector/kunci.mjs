// Menyimpan API key tanpa lewat chat: key ditulis pengguna sendiri di file teks yang dibuka di TextEdit/Notepad.
//   node kunci.mjs <elevenlabs|gemini>          buat file kunci (kalau belum ada) lalu buka di TextEdit (Mac) / Notepad (Windows)
//   node kunci.mjs <elevenlabs|gemini> --cek    cek key ke layanannya; mencetak hanya status, TIDAK PERNAH mencetak key-nya
// File: ~/.animantra-vector/kunci-<layanan>.txt (Windows: %USERPROFILE%\.animantra-vector\...). gen_vo.mjs membacanya langsung.
import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { FILE_KUNCI, bacaKunci } from './template/alat.mjs';

const LAYANAN = {
  elevenlabs: `# Kunci ElevenLabs untuk Animantra: Vector. File ini rahasia: jangan dibagikan.
# 1. Tempel API key di belakang API_KEY=  (tanpa spasi)
# 2. (Opsional) Tempel Voice ID suara pilihanmu di belakang VOICE_ID=
# 3. Simpan (Cmd+S di Mac, Ctrl+S di Windows), lalu tutup jendela ini.
API_KEY=
VOICE_ID=
`,
  gemini: `# Kunci Gemini (VokaStudio, suara Kore) untuk Animantra: Vector. File ini rahasia: jangan dibagikan.
# 1. Tempel API key dari aistudio.google.com/apikey di belakang API_KEY=  (tanpa spasi)
# 2. Simpan (Cmd+S di Mac, Ctrl+S di Windows), lalu tutup jendela ini.
API_KEY=
`,
};

const [layanan, opsi] = process.argv.slice(2);
if (!LAYANAN[layanan]) { console.log('pakai: node kunci.mjs <elevenlabs|gemini> [--cek]'); process.exit(2); }
const f = FILE_KUNCI(layanan);

if (opsi !== '--cek') {
  mkdirSync(f.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
  if (!existsSync(f)) writeFileSync(f, LAYANAN[layanan]);
  try { chmodSync(f, 0o600); } catch {}
  const p = process.platform === 'darwin' ? spawn('open', ['-e', f], { detached: true, stdio: 'ignore' })
    : process.platform === 'win32' ? spawn('notepad.exe', [f], { detached: true, stdio: 'ignore' }) : null;
  p?.unref();
  console.log(`File kunci dibuka: ${f}`);
  process.exit(0);
}

const k = bacaKunci(layanan);
if (!k.API_KEY) { console.log('BELUM ADA: API key belum diisi (atau file belum disimpan).'); process.exit(3); }
let code = 0, alasan = '';
try {
  if (layanan === 'elevenlabs') {
    const r = await fetch('https://api.elevenlabs.io/v1/user', { headers: { 'xi-api-key': k.API_KEY }, signal: AbortSignal.timeout(15000) });
    code = r.status; alasan = (await r.json().catch(() => ({})))?.detail?.status || '';
    if (code === 401 && alasan === 'missing_permissions') code = 200;   // key sah, hanya izinnya dibatasi (mis. Text to Speech saja)
  } else {
    code = (await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${k.API_KEY}`, { signal: AbortSignal.timeout(15000) })).status;
  }
} catch {}
if (code !== 200) { console.log(`DITOLAK: key tidak diterima (HTTP ${code || 'jaringan'}${alasan ? ', ' + alasan : ''}). Cek lagi isi file kuncinya.`); process.exit(4); }
console.log(`OK: key ${layanan} diterima${k.VOICE_ID ? `, Voice ID ${k.VOICE_ID}` : ''}.`);
