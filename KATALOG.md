# KATALOG kit video pendek (baca ini dulu, jangan buka kode besar)

Dua jenis video, satu repo. Output keduanya 9:16, 1080x1920, 30 fps.
Satu baris per item. Tiap menambah set, pose, properti, format, atau komponen baru, tambahkan satu baris di sini. Jebakan baru: `docs/CATATAN.md` (kartun) atau `docs/CATATAN-BEDAH.md` (bedah).

## 1. Pilih jenis video
| Jenis | Cocok untuk | Mesin | Mulai dari |
|---|---|---|---|
| **Kartun tokoh** | kisah/legenda dengan tokoh berkepala bulat, voice over dari pengguna | root repo (`web/`, `render.mjs`) | bagian 2 |
| **Bedah benda** | membongkar cara kerja benda, tur, tutorial, kuis, daftar, dan format edukasi lain | `bedah/` | bagian 3 |

Kalau pengguna belum menyebut jenisnya, tawarkan dua ini dan, untuk bedah, tabel format di bagian 3. Pilihkan sendiri bila ceritanya jelas (tokoh bercerita = kartun; benda/mekanik = bedah).

## 2. Kartun tokoh
Alur: salin `examples/penisilin` atau `examples/esloli` ke `examples/<nama>/`, ubah `story.js` (shot per frasa), `audio.py` (isyarat SFX), `subs.py` (teks + waktu). Lalu `./build.sh examples/<nama>` -> `node render.mjs stills "..." 360 640` -> `sheet.py` -> render penuh -> `mix.py` -> `finish.sh`. Detail alur: `README.md`.

### Set (lokasi)
| Nama | Ada di | Isi / cocok untuk |
|---|---|---|
| `lab` | `web/world.js` | laboratorium, meja, rak botol, papan tulis |
| `street` | `web/world.js` | jalan kota 1900-an, menara, lampu, tempat banner tahun |
| `room` | `web/world.js` | ruang keluarga, poster, karpet merah |
| `macro` | `web/world.js` | dunia mikro (bakteri, cawan petri) |
| `lower`, `facade` | `web/world.js` | ruang bawah tanah dan fasad bangunan |
| `porch` (teras) | `examples/esloli/story.js` | teras rumah kayu, meja bulat, gelas, pohon. Salin blok `porch` jika perlu |

Pilih set dengan `showSets('street')`. Cahaya: `applyLight('day' | 'night' | 'golden', titikFokus)`.

### Pose tangan (`armR` / `armL`)
`hang` (turun), `hip` (pinggang), `wave` (melambai), `cheer` (bersorak), `up` (angkat), `lift` (angkat sedang, aman untuk memegang properti), `hold`, `holdHigh`, `pointUp`, `point`, `thumb`, `chin`, `shrug`, `toss`, `magnify`.

### Ekspresi (`expr`)
`neutral`, `smile`, `smile_closed`, `grin`, `laugh`, `whistle`, `shock`, `nervous`, `stern`, `lick`.

### Properti (`propR` / `propL`)
`popsicle` (es loli oranye), `popsicleRed` (merah), `packet` (bungkus bubuk soda), `magnifier`, `suitcase`, `dishMold`, `bottle`, `flask`, `dish`, `medal`.

### Tokoh
Kepala bulat, `T.figure(p, opsi, s)`. Opsi: `jacket`, `pants`, `boots`, `hat` (`cap`, `bun`, `hair`), `moustache`, `skin`, `build: 'kid'` untuk anak. Contoh di `examples/esloli/story.js` (`FRANK_KID`, `FRANK`, `DAUGHTER`, `SON`). Pejalan kaki: `T.FOLK[0..3]`.

### Stickman berisi berwarna
`T.stickman(p, opsi, s)`: kepala bulat, badan kapsul terisi, lengan/kaki tebal berkontur tinta. Memakai pose tangan, ekspresi, properti, dan `mode` (stand/walk/sit) yang sama dengan `T.figure`. Opsi: `color` (badan), `head` (kepala), `limb`, `hand`, `boots`, `belt`, `shirt`, `build: 'kid'`, plus topi `hat` (`cap`, `bun`, `hair`, `boater`) dan `moustache`. Preset warna: `T.STICK.merah | biru | hijau | kuning | ungu | oranye` (sebar: `{ ...T.STICK.merah, hat: 'cap', cap: '#2b2f3a' }`). Pakai: `new Card((p, s) => T.stickman(p, o, s))`. Contoh: `examples/stickman-demo/`.

### Jebakan kartun yang sudah terjadi
- `holdHigh` dengan properti menutupi wajah di close-up. Pakai `lift` atau `pointUp`.
- Teks papan tulis dan stempel yang lebar terpotong. Pakai lebar bidang sekitar 1,6 dan kamera lebih jauh.
- Cahaya halo/lampu titik terlalu terang membuat objek menguning. Turunkan intensitas.
- Kaca transparan penuh tampak hilang. Beri warna dan opasitas sekitar 0,28.
- Lompatan waktu: awali shot baru dengan `look.flash = 1 - prog(f, a, a + 6)`.
- Render penuh 1426 frame di 720x1280 sekitar 50 menit (sekitar 2 dtk per frame).

### Contoh kartun
- `examples/penisilin`: kisah penisilin (76 dtk).
- `examples/esloli`: "Es Punya Papa" (47,5 dtk, Indonesia). Pembuka di porch, twist di `room`.

## 3. Bedah benda (folder `bedah/`)
Gaya bedah flat-toon 3D (three.js) + overlay HTML/SVG, ±20–80 dtk. `$K` = `bedah/`.
Proyek baru: `node $K/new_project.mjs <nama> --di <folder kerja> --contoh <x>`, lalu ganti isi `bedah.js` + `PAL`/`:root` di `bedah.html`.
Pertama kali di ruang kerja baru: `cd $K/engine && npm install`, tulis `engine/alat.json` `{"python": "...", "ffmpeg": "..."}` (jalur python3 dan ffmpeg sistem). Di Linux mesin otomatis memakai Chrome sistem (`/usr/bin/google-chrome`, atau `KB_CHROME`).

### Format video: pilih salah satu, salin contoh yang formatnya sama
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
| Top List | `toplist` | 5 alat boros listrik | `bedah.js` (`topList`) | 35–50 |
| Apa Jadinya Kalau | `kalau` | colokan ditumpuk | `bedah.js` (`kalau`) | 40–55 |
| Evolusi | `evolusi` | telepon engkol → layar sentuh | `bedah.js` (`timeline`) | 45–60 |
| Kuis | `kuis` | lubang kecil di gembok | `bedah.js` (`kuis`) | 20–30 |
| 3D gaya terang (lama) | `stapler` | stapler | `scene_body.js` | — |
| Manusia semi-realis | `legpress` | leg press vs squat (`makeHuman()`) | `scene_body.js` | — |
| 2.5D isometrik (hanya jika diminta) | `ricecooker_25d` | rice cooker | `iso_body.js` | — |
| Gunting (tanpa template baru) | `gunting` | gunting | `scene.js` | — |

Isi tiap contoh: `narasi.txt`, `words.json` (waktu kata), `ucapan.txt`, `caption.txt`, `cover.json`, `jeda_bab.json`, `musik.json`, `tempo.json`, kadang `gaya.txt`/`sfx.py`. Audio contoh **tidak** disimpan (pakai voice over baru).

### Suara dan waktu kata (beda dari kartun)
- Voice over dari pengguna: taruh di `vo/narasi.wav`. Bedah butuh `words.json` (waktu tiap kata) lewat `asr.py` (Whisper). **Belum diuji di ruang kerja cloud**: model Whisper mungkin tidak bisa diunduh. Cadangan: turunkan waktu kata dari naskah + `silencedetect`, seperti `subs.py` di contoh kartun.
- Tanpa voice over: `gen_vo.mjs <elevenlabs|vokastudio|voicestudio|sistem>` (butuh API key lewat `kunci.mjs`; key tidak pernah lewat chat).

### Gaya dan tampilan
- Bawaan: **bedah** (toon 3 nada + garis tepi, satu warna per bagian, tanpa HUD atas, subtitle karaoke).
- Gaya Saya: preset bawaan, laut, jeruk, hutan, anggur, poster, malam, neon · huruf: bawaan, bulat, modern, majalah, teknis, poster · subtitle: kotak, garis, pita · stempel: tebal, miring, label · karakter: asli, hangat, dingin, pastel, berani. Mesin: `bedah/template/gaya.mjs`; file JSON di `<folder kerja>/gaya-saya/`.
- `tema.json` (3D non-bedah, hanya jika diminta): palet malam, neon, senja, hutan, kertas, es · tata letak papan, layar, atas, sinematik, cerita.
- Patokan mutu (still pembanding): `bedah/reference/patokan/` → pulpen, kunci, korek, toplist, generator.

### Komponen siap pakai
- `bedah/template/format.js`: `topList`, `mitos`, `versus`, `langkah`, `pov`, `timeline`, `kuis`, `kalau`, `bab` + kartu, pil, stempel, teks kinetik.
- `bedah/template/scene_head.js` (3D, garis tepi, potongan belah) · `iso_head.js` (2.5D) · `papan.js` · `realis.js` (semi-realis manusia).
- `bedah/template/sfx.py`: efek `click whoosh thump blip impact riser swell` + musik `piano pad kick clap snare hat shaker bass chords groove build`.

### Skrip alur bedah (jalankan di folder proyek)
suara -> `prep.py`/`asr.py` waktu kata -> `render.mjs --still t…` cek frame -> `render.mjs` MP4 -> `cover.mjs` -> `selesaikan.mjs` (cover pembuka, versi kecil, cek sinkron). Lain: `exp.mjs` uji cepat, `sheet.py` lembar banding, `cek_sinkron.py`, `gabung_thumbnail.py`.

### Dokumen bedah (buka hanya bagian yang perlu)
`bedah/SKILL.md` alur lengkap · `bedah/reference/gerbang_mutu.md` cek wajib sebelum render · `panduan_cerita.md` naskah dan format · `panduan_scene.md` 3D · `panduan_iso.md` 2.5D · `panduan_warna.md` · `pelajaran.md` (versi panjang catatan).
Catatan: `bedah/SKILL.md` ditulis dulu untuk pengguna awam di komputernya sendiri; abaikan bagian pemasangan, API key, dan "jangan suruh buka Terminal". Di sini Claude menjalankan semuanya sendiri.

## 4. Contoh video
Kartun: `examples/penisilin`, `examples/esloli`. Bedah: `bedah/reference/contoh_*`.
