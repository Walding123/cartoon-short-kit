// Laporan progres dari Claude di chat ke Animantra Studio (mode chat).
//   node lapor.mjs <id> [--status jalan|selesai|gagal] [--tahap Riset|Naskah|Suara|"Model 3D"|"Cek gambar"|Render|Selesai] [--proyek <nama>] [--teks "<satu kalimat>"] [--error "<alasan>"]
// Saat tahap Render, Studio membaca persen dari <proyek>/qc/render.log, jadi render dijalankan: node render.mjs > qc/render.log 2>&1
const [id, ...rest] = process.argv.slice(2);
if (!id) { console.log('pakai: node lapor.mjs <id> [--status ...] [--tahap ...] [--proyek ...] [--teks ...]'); process.exit(2); }
const b = { id };
for (let i = 0; i < rest.length; i += 2) b[rest[i].replace(/^--/, '')] = rest[i + 1];
const port = process.env.STUDIO_PORT || 4580;
try {
  const r = await fetch(`http://127.0.0.1:${port}/api/lapor`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b), signal: AbortSignal.timeout(5000) });
  const j = await r.json();
  console.log(r.ok ? `studio: ${j.status} · ${j.tahap}` : `studio: ${j.error}`);
} catch { console.log('studio: tidak berjalan (laporan dilewati)'); }
