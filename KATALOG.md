# KATALOG kit kartun pendek

Baca file ini dulu. Jangan membuka `web/*.js` penuh kecuali perlu menambah sesuatu yang belum ada.
Satu baris per item. Tambahkan baris baru setiap kali membuat set, pose, atau properti baru.

## Alur singkat
1. Salin `examples/penisilin` atau `examples/esloli` ke `examples/<nama>/`.
2. Ubah `story.js` (shot per frasa), `audio.py` (isyarat SFX), `subs.py` (teks + waktu).
3. `./build.sh examples/<nama>` -> `node render.mjs stills "..." 360 640` -> `sheet.py` -> render penuh -> `mix.py` -> `finish.sh`.

## Set (lokasi)
| Nama | Ada di | Isi / cocok untuk |
|---|---|---|
| `lab` | `web/world.js` | laboratorium, meja, rak botol, papan tulis |
| `street` | `web/world.js` | jalan kota 1900-an, menara, lampu, tempat banner tahun |
| `room` | `web/world.js` | ruang keluarga, poster, karpet merah |
| `macro` | `web/world.js` | dunia mikro (bakteri, cawan petri) |
| `lower`, `facade` | `web/world.js` | ruang bawah tanah dan fasad bangunan |
| `porch` (teras) | `examples/esloli/story.js` | teras rumah kayu, meja bulat, gelas, pohon. Salin blok `porch` jika perlu |

Pilih set dengan `showSets('street')`. Cahaya: `applyLight('day' | 'night' | 'golden', titikFokus)`.

## Pose tangan (`armR` / `armL`)
`hang` (turun), `hip` (pinggang), `wave` (melambai), `cheer` (bersorak), `up` (angkat), `lift` (angkat sedang, aman untuk memegang properti), `hold`, `holdHigh`, `pointUp`, `point`, `thumb`, `chin`, `shrug`, `toss`, `magnify`.

## Ekspresi (`expr`)
`neutral`, `smile`, `smile_closed`, `grin`, `laugh`, `whistle`, `shock`, `nervous`, `stern`, `lick`.

## Properti (`propR` / `propL`)
`popsicle` (es loli oranye), `popsicleRed` (merah), `packet` (bungkus bubuk soda), `magnifier`, `suitcase`, `dishMold`, `bottle`, `flask`, `dish`, `medal`.

## Tokoh
Kepala bulat, `T.figure(p, opsi, s)`. Opsi: `jacket`, `pants`, `boots`, `hat` (`cap`, `bun`, `hair`), `moustache`, `skin`, `build: 'kid'` untuk anak. Contoh di `examples/esloli/story.js` (`FRANK_KID`, `FRANK`, `DAUGHTER`, `SON`). Pejalan kaki: `T.FOLK[0..3]`.

## Jebakan yang sudah terjadi
- `holdHigh` dengan properti menutupi wajah di close-up. Pakai `lift` atau `pointUp`.
- Teks papan tulis dan stempel yang lebar terpotong. Pakai lebar bidang sekitar 1,6 dan kamera lebih jauh.
- Cahaya halo/lampu titik terlalu terang membuat objek menguning. Turunkan intensitas.
- Kaca transparan penuh tampak hilang. Beri warna dan opasitas sekitar 0,28.
- Lompatan waktu: awali shot baru dengan `look.flash = 1 - prog(f, a, a + 6)`.
- Durasi render penuh 1426 frame di 720x1280 sekitar 50 menit (sekitar 2 dtk per frame).
- Detail teknis lain: `docs/CATATAN.md`.

## Contoh video
- `examples/penisilin` : kisah penisilin (76 dtk).
- `examples/esloli` : "Es Punya Papa", kisah es loli (47,5 dtk, Indonesia). Pembuka di porch, twist di `room`.
