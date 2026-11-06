# KATALOG Animantra: Vector (baca ini dulu, jangan buka kode besar)

Paket berbayar, **repo harus privat** (lihat `LISENSI.md`). Video 9:16 1080×1920, 30 fps, ±40–60 dtk, gaya bedah flat-toon 3D (three.js) + overlay HTML/SVG.
`$K` = `skills/animantra-vector/`. Proyek baru: `node $K/new_project.mjs <nama> --di <folder> --contoh <x>`, lalu ganti isi `bedah.js` + `PAL`/`:root` di `bedah.html`.

## Format → contoh (salin dari contoh format yang sama)
| Format | `--contoh` | Topik contoh | File scene | Durasi |
|---|---|---|---|---|
| Kita Bongkar | `korek` (terlengkap), `pulpen`, `kunci` | korek gas, pulpen klik, kunci pintu | `bedah.js` | 45–55 |
| Kita Bongkar mesin | `generator` | generator PLTU (patokan mutu "listrik") | `bedah.js` | ±28 |
| Tur Lingkungan | `listrik` | 220 V → charger HP | `bedah.js` | 60–80 |
| Story | `story` | microwave, Percy Spencer 1945 | `bedah.js` (`bab`) | 60–80 |
| POV "Jadi Si…" | `pov` | setetes air dari sumur | `bedah.js` (`pov`) | 45–60 |
| Tutorial | `tutorial` | ganti tabung LPG | `bedah.js` (`langkah`) | 35–50 |
| Mitos vs Fakta | `mitos` | charger dicolok tanpa HP | `bedah.js` (`mitos`) | 35–50 |
| A vs B | `versus` | LED vs pijar | `bedah.js` (`versus`) | 45–60 |
| Top List | `toplist` | 5 alat boros listrik (pola penyajian v4) | `bedah.js` (`topList`) | 35–50 |
| Apa Jadinya Kalau | `kalau` | colokan ditumpuk | `bedah.js` (`kalau`) | 40–55 |
| Evolusi | `evolusi` | telepon engkol → layar sentuh | `bedah.js` (`timeline`) | 45–60 |
| Kuis | `kuis` | lubang kecil di gembok | `bedah.js` (`kuis`) | 20–30 |
| 3D gaya terang (lama) | `stapler` | stapler | `scene_body.js` | — |
| Manusia semi-realis | `legpress` | leg press vs squat (`makeHuman()`, `tema.json` papan) | `scene_body.js` | — |
| 2.5D isometrik (hanya jika diminta) | `ricecooker_25d` | rice cooker | `iso_body.js` | — |
| Gunting (tanpa template baru) | `gunting` | gunting | `scene.js` | — |

Isi tiap contoh: `narasi.txt`, `words.json` (waktu kata), `ucapan.txt`, `caption.txt`, `cover.json`, `jeda_bab.json`, `musik.json`, `tempo.json`, kadang `gaya.txt`/`sfx.py`. Audio contoh **tidak** disimpan di repo (buat suara baru).

## Gaya & tampilan
- Bawaan: **bedah** (toon 3 nada + garis tepi, satu warna per bagian, tanpa HUD atas, subtitle karaoke ±1610 px).
- Gaya Saya preset: bawaan, laut, jeruk, hutan, anggur, poster, malam, neon · huruf: bawaan, bulat, modern, majalah, teknis, poster · subtitle: kotak, garis, pita · stempel: tebal, miring, label · karakter: asli, hangat, dingin, pastel, berani. Mesin: `template/gaya.mjs`.
- `tema.json` (3D non-bedah, hanya diminta): palet malam, neon, senja, hutan, kertas, es · tata letak papan, layar, atas, sinematik, cerita.
- Patokan mutu (still pembanding): `reference/patokan/` → pulpen, kunci, korek, toplist, generator.

## Komponen siap pakai
- `template/format.js`: `topList`, `mitos`, `versus`, `langkah`, `pov`, `timeline`, `kuis`, `kalau`, `bab` + kartu, pil, stempel, teks kinetik.
- `template/scene_head.js` (3D, `gradTex`, garis tepi, potongan belah) · `template/iso_head.js` (2.5D) · `template/papan.js` (tata letak papan) · `template/realis.js` (semi-realis manusia).
- `template/sfx.py`: efek `click whoosh thump blip impact riser swell` + musik `piano pad kick clap snare hat shaker bass chords groove build`.

## Skrip alur (jalankan di folder proyek)
`gen_vo.mjs <elevenlabs|vokastudio|voicestudio|sistem>` suara → `prep.py`/`asr.py` waktu kata → `render.mjs --still t…` cek frame → `render.mjs` MP4 → `cover.mjs` → `selesaikan.mjs` (cover pembuka, versi kecil, cek sinkron). Lain: `exp.mjs` uji cepat, `sheet.py` lembar banding, `cek_sinkron.py`, `gabung_thumbnail.py`. Kunci API: `kunci.mjs <layanan>` (key tidak pernah lewat chat).

## Dokumen (buka hanya bagian yang perlu)
`docs/CATATAN.md` (jebakan, ringkas) · `$K/SKILL.md` alur lengkap · `$K/reference/gerbang_mutu.md` cek wajib sebelum render · `panduan_cerita.md` naskah & format · `panduan_scene.md` 3D · `panduan_iso.md` 2.5D · `panduan_warna.md` · `pelajaran.md` (versi panjang catatan).

## Aturan katalog
Satu baris per item. Tiap menambah contoh/format/komponen baru → tambah satu baris di sini; jebakan baru → `docs/CATATAN.md`.
