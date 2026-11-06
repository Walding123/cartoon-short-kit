# Panduan scene 3D

## Gaya bedah (bawaan untuk video benda): `bedah.js` + `bedah.html`

> **Pola wajib terbaru** (lihat `pelajaran.md` › Pola penyajian): mulai dari `contoh_toplist` atau contoh format yang sama, lalu pakai polanya:
> - **Cover hidup**: `<div id="cvlive">` di `bedah.html` (kicker + judul `<mark>`, gradasi atas), `updateCoverHidup(t)` di awal `updateOverlay`; `tempo.json` `"lead": 0.35`; `cover.json` `"pembuka": "hidup"`. Kamera pembuka sudah bergerak sejak t = 0 (`HOOK`, mis. tinggi 300 → 240).
> - **Kamera**: tiap benda punya `SHOT` (utuh) dan `DETAIL` (bagian penyebab); jadwal `[t+0.6 SHOT] [it.i SHOT] [it.i+0.7 DETAIL] [e−0.15 DETAIL]`, `it.i` = 45% durasi baris. Tinggi pandang tetap (tanpa sinus).
> - **Gerak penyebab**: grup berengsel (`new THREE.Group()` di titik engsel, geometri digeser −engsel), dihitung dari `t` di `updateModel` (mis. `ALAT.fridgeDoor.rotation.y = 1.45 * pulse(...)`). Label `SEBAB` muncul di `it.i + 0.8` dan menunjuk bagian itu.
> - **Kartu bertahap**: baris muncul satu per satu (naik 18 px + memudar), angka akhir `Math.round(nilai * smooth(...))`, `font-variant-numeric: tabular-nums`.
> - **Subtitle**: `capW()` dengan `measureText` (800 58px) + padding 52; potong bila > 860 px atau di tanda baca.
> - **Suasana**: dua `<rect>` layar penuh di `updateBg` (biru-tua 0,16 saat fokus, merah 0,14 saat bahaya), di belakang kanvas.
> - **Gaya Saya**: tulis warna antarmuka, huruf, dan label seri dengan nilai asli gaya bedah (lihat SKILL.md › Gaya Saya), warna bagian benda di blok `const PAL`. Jangan menulis warna gaya pengguna langsung ke `bedah.js`/`bedah.html`; `gaya.mjs` yang memasangnya saat dirakit.
> - **Bahan transparan**: `celA(palet, alpha)` memakai uniform `al` (bukan mengganti teks shader).

Patokan mutu dari pengguna: `contoh_kunci` (silinder pin tumbler) dan `contoh_pulpen` (pulpen klik). Keduanya scene utuh dalam satu file: `bedah.js` dipakai apa adanya sebagai `scene.js`, dan `bedah.html` disalin ke `index.html` setiap render. Mulai dari contoh yang bendanya paling mirip (`new_project.mjs <nama> --contoh kunci|pulpen`), lalu ganti isinya bagian demi bagian. Jangan menulis ulang render, garis tepi, atau tata letak.

Urutan bagian di `bedah.js`:
1. **Kata & waktu**: `LN(i)` (mulai/akhir baris), `LS`/`L` = daftar baris, `DUR = baris terakhir.e + 0,9–1,2`. Ubah `length: 10` dan indeks baris terakhir sesuai jumlah baris naskah. `T(baris, 'awalan', n)` = waktu kata.
2. **Renderer & pass**: cel 3 nada + garis tinta dari loncatan kedalaman/normal/warna. `setClearColor` = warna kertas (sama dengan `--paper`). Jangan diubah selain warnanya.
3. **Palet `PAL`**: tiap bagian benda punya palet 3 nada sendiri yang kontras dengan tetangganya. Bidang potong memakai nada datar terang (`cutH`, `cutP`, `cutL`). Kuning (`yellow`/`hl`) dipakai untuk sorotan `m.hl(...)`.
4. **Model** (mm nyata): setengah benda + muka potong (`halfExtrude`, `halfLathe`, `cutRects`). Benda dibelah di satu bidang yang menghadap kamera.
5. **Timeline**: jadwal peristiwa (kunci masuk, klik) → `stateAt(t)`/`mech(t)`. `camKeys` = `[t, [x, y, z, zoom], 'c'?]` (`'c'` = potong kamera + bunyi `cut`). Kamera dekat, benda memenuhi layar.
6. **Overlay** (`bedah.html`): `titleDefs` (judul besar per baris, `<em>` = warna merah), baris angka `#rn/#ru` dihitung dari model, `chipDefs` (chip status berwarna), `tagDefs` (pil label + panah ke titik model), `stampDefs` (stempel bunyi), `cardDefs`/inset diagram (pulpen), subtitle karaoke per frasa dalam kotak gelap.
7. **`window.EVENTS`**: bunyi dari model (pin `pin`/`pinDrop`, `clickDown/clickOut/clickIn`, `cekrek`, `jiggle`, `oil`, `sprinkle`, `rub`, `card`) + `pop`, `stamp`, `cut`, `whoosh`. Di **akhir file** ada blok isyarat musik (`cue('heart', 0)` … `cue('end', DUR)`) dan `window.coverPx` (titik pil cover dalam piksel). Sesuaikan indeks barisnya.
8. **Warna tampilan**: variabel `:root` di `bedah.html` (`--paper`, `--ink`, `--red`, `--green`, `--yellow`, …). `--yellow` wajib ada (dipakai cover).
9. `cover.json`: `t` (detik), `cam` (format `camKeys`), `kicker` ("DIBELAH"), `title` dengan `<mark>`, `pill`, `stamp`.

### Contoh terlengkap: `contoh_korek` (mulai dari sini untuk video baru)
Korek gas piezo, 12 baris ±77 detik. Selain ciri di atas, contoh ini punya:
- **Kamera berkomposisi**: `camKeys` = `[t, [z, y, tinggi, azimut°, elevasi°, ax, ay, sorot]]`. Titik fokus (z, y) di bidang potong ditaruh di titik komposisi layar (ax, ay pecahan 1080×1920): sepertiga `R1/R2` (0,333/0,667) atau golden `G1/G2` (0,382/0,618). Zona aman objek y 450–1400 px (di atas: judul + penanda alur, di bawah: subtitle). Rentang komponen yang harus terlihat × px/mm harus muat di zona itu.
- **Zoom fokus per komponen**: tiap kali narasi menyebut satu bagian, kamera mendekat ke bagian itu (tinggi pandang 30–60 mm), lalu mundur lagi ke bidikan lebar. Sudut berganti lewat orbit halus (azimut 25–66°, elevasi 16–58°), bukan potongan.
- **Sorot** (0–1): pinggiran layar diredupkan halus ke warna kertas. Maksimal ±0,22 opacity; lebih dari itu gambar jadi berkabut.
- **Latar SVG** (`#bg`): kanvas WebGL transparan (`alpha: true`, piksel latar alfa 0 di pass garis), di belakangnya kertas blueprint SVG yang kisinya ikut zoom, nama komponen besar samar, cahaya hangat saat api, vinyet. Murah dirender.
- **Efek**: kilat layar dan punch-in + guncang saat benturan, gelombang kejut, listrik berjalan di sepanjang kabel (titik kurva diproyeksikan), percikan zig-zag + sinar, latar menghangat saat api.
- **Penanda alur** (`#steps`) di atas judul: tahap yang sedang dibahas menyala emas.
- **Kartu "diperbesar"** untuk prinsip yang tak terlihat (kisi muatan kristal) dan kartu perbandingan dari angka model.
- **Lingkungan SVG** (`updateBg`): benda diletakkan di tempat nyatanya (contoh: meja dapur). Karena kamera ortografis = proyeksi affine, tiap bidang datar (meja `y = 0`, dinding) digambar dalam mm lalu dipetakan persis dengan `planeM(asal, u, v)` → `matrix(...)`; kotak (`boxSVG`, sisi dipilih dari normal · arah kamera) dan silinder (`cylSVG`, selubung cembung) dari titik yang diproyeksikan. Semua properti diletakkan di belakang/samping benda supaya tidak menutupi model 3D. Hidupkan dengan uap, daun bergoyang, debu di berkas cahaya, bayangan kontak di bawah benda. Kedalaman fokus: `feGaussianBlur` sebanding zoom. Penutup bisa mundur ke bidikan lebar yang memperlihatkan benda terkait di lingkungan yang sama (kompor).
- Belahan kanan selesai terbuka **sebelum** kamera mendekat (kalau tidak, badan merah lewat di depan kamera).

### Patokan mutu mesin: `contoh_generator`
"Listrik datang dari mana?" (±28 dtk, dinilai bagus oleh pengguna): stopkontak (cover hidup) → ruang turbin → rumah generator dibuka → uap memutar turbin bertingkat & rotor → magnet di dalam stator bercelah dengan ujung gulungan tembaga → elektron terdorong saat kutub lewat (jalur partikel) → arus keluar → kembali ke stopkontak. Punya lencana "DIPERLAMBAT 80×", teks kinetik "3.000 putaran/menit", penutup "Gerak → Listrik". Mulai dari sini untuk video pembangkit, motor, dinamo, kipas, atau mesin berputar lain; jangan membangun ulang generator/turbin dari bentuk dasar.

### Tur lingkungan: `contoh_listrik`
Beberapa benda dalam satu ruang (dinding ruang tamu dibelah: tiang PLN → meteran → MCB → kabel di tembok → stopkontak → charger → HP). Kamera berkeyframe `[z, y, tinggi, azimut, elevasi, ax, ay, sorot, x]` berpindah dari bidikan lebar (tinggi ±2.900 mm) ke makro (±100 mm). Tiap benda punya "tutup" yang digeser saat dibongkar (`mcbOpenKeys`, `sockOpenKeys`, `chgOpenKeys`). Benang cerita = titik bercahaya di sepanjang jalur kabel (AC bergetar kuning, DC mengalir biru). Kamera jauh (4.000 mm, FAR 9.000) supaya bidikan lebar tidak terpotong.

### Contoh format Mitos vs Fakta: `contoh_mitos`
"Charger dicolok terus bikin boros?" (±59 dtk) memakai ulang ruang & model `contoh_listrik`: kartu klaim (`format.js` mitos.klaim) → charger dibuka, IC berjaga → kartu aturan 0,1 W → kartu hitung rupiah di depan meteran → pembanding lampu LED → stempel putusan → charger murahan memanas (gelap + gelombang panas) → dicabut. Pola ini bisa dipakai untuk format lain: salin `bedah.js` contoh terdekat, ganti bagian jadwal/kamera/kartu, dan panggil `FMT.gambar` di `renderAt`.

### Contoh format Top List: `contoh_toplist`
"5 alat yang bikin token cepat habis" (±58 dtk): ruang `contoh_listrik` diperluas + 5 alat (AC split, kulkas 2 pintu, dispenser + galon, rice cooker, setrika berprofil samping). Daftar `ITEMS` (daya, jam, kWh/hari) → biaya dihitung otomatis; kamera mengunjungi #5 → #1 (`SHOT` per alat), `format.js` topList (#angka + Rp/bulan), kartu hitungan per alat, grafik ringkasan, tips. Efek per alat: uap, embusan dingin AC, kabut kulkas.

### Komponen format (`format.js`)
`template/format.js` (tersalin ke tiap proyek) berisi komponen SVG murni fungsi waktu untuk format selain Kita Bongkar. Di `bedah.js`:
```js
const FMT = await import('./format.js'); FMT.pasang();          // sekali; membuat lapisan #fmt di bawah subtitle
const FORMAT = {                                                   // isi hanya yang dipakai; waktu dari kata (T(baris, 'kata'))
  topList: { total: 5, items: [{ t, e, rank: 3, judul: 'Setrika', sub: '350 W · 1,6 A' }] },
  mitos: { klaim: { t, e, teks }, putusan: { t, e, jenis: 'mitos'|'fakta'|'sebagian', alasan } },
  versus: { t, e, a: { nama, titik: () => [x, y, z] }, b: {...}, ukuran: [{ t, nama, nilaiA, nilaiB, satuan, makin: 'kecil'|'besar' }] },
  langkah: { e, items: [{ t, teks }], jangan: { t, e, teks } },
  pov: { t, e, nama: 'Aku, elektron', titik: t => [x, y, z], ucapan: [{ t, e, teks }] },
  timeline: { t, e, era: [{ t, tahun, nama }] },
  kuis: { t, e, tanya, pilihan: [...], benar: 0, buka },
  kalau: { t, e, kondisi, tahap: [{ t, nama, level: 0..1 }] },
  bab: { pita: [[t, 0|1]...], items: [{ t, label: 'BAB 1 · 1891', judul }] },
};
// di akhir updateOverlay(t):  FMT.gambar(t, FORMAT, project);
```
Penempatan sudah mengikuti aturan tata letak (tanpa teks atas; kartu di zona 470–970 px; lencana/pengukur di sepertiga bawah di atas subtitle). Galeri uji: semua komponen di atas adegan `contoh_listrik`.

Ciri yang wajib dipertahankan: garis tepi tegas, warna per bagian, benda besar di layar, tanpa judul atas selama video (judul hanya di cover hidup), angka langsung + chip, pil label, stempel bunyi, subtitle kotak, ±10 baris (±40–60 detik).

## Gaya lain (`scene_body.js`)

Mode cepat 2.5D isometrik punya panduan sendiri: `panduan_iso.md`.

`scene.js = scene_head.js + scene_body.js`. Kepala sudah menyediakan renderer, pass garis tepi, material toon, cahaya, bayangan, dan pembantu. Badan berisi dunia, model per waktu, kamera, overlay, render, dan `EVENTS`. Salin kerangka dari `contoh_stapler/scene_body.js` lalu ganti isinya; jangan mulai dari nol.

## Dari kepala (`scene_head.js`)

| Nama | Guna |
|---|---|
| `words`, `L[i].s/.e`, `NL`, `DUR` | kata & baris dari `words.json`; durasi = akhir narasi + 2 s |
| `T(baris, 'awalan', n)` / `TE(...)` | waktu mulai/akhir kata ke-n di baris itu yang diawali `awalan` (huruf kecil tanpa tanda baca; "Staples-nya" → `'staplesnya'`). Salah ketik = error "kata tidak ada" |
| `track(keys, t)` | interpolasi key `[t, nilai]` (angka atau larik) dengan easeIO; `[t, v, 'c']` = potong langsung |
| `lin`, `smooth`, `easeIO`, `backOut`, `clamp`, `lerp`, `deg`, `TAU`, `V` | pembantu |
| `hlw(t, s, e)` | jendela sorotan 0→1→0 |
| `cel('palet')` | material toon 3 nada dari `PAL` (tambah palet sendiri di `PAL`); `m.hl('yellow', k)` = sorot |
| `glow(hex)` | material tanpa bayangan (titik bercahaya, garis) |
| `mesh`, `cylZ`, `extr`, `annulus`, `RoundedBoxGeometry` | geometri |
| `gradTex`, `sun`, `renderer`, `camera`, `edge`, `out`, `rtCol`, `rtNor`, `rtComp` | render |

## Badan: urutan bagian (lihat contoh)

1. **Dunia**: `root` → `base` (orientasi isometrik) → `W0` (mm, meja z = 0). Benda utama di grup sendiri (contoh `ST`) supaya kamera & label bisa memakai koordinat lokal benda. Meja + 2–3 properti konteks (pensil, catatan, buku penyangga).
2. **Ukuran** sebagai konstanta bernama (mm nyata). Semua posisi diturunkan dari konstanta ini.
3. **Model**: bagian bergerak dalam grup ber-poros (engsel/baut): `G.position = poros`, anak `GI.position = -poros`. Material yang ikut terbelah: `celC(...)` + `cutPlane`.
4. **Fungsi geometri bersama** (mis. `legPts` jalur kaki staples, `contactX` titik potong gunting) dipakai oleh 3D, kartu SVG, angka HUD, dan peristiwa suara. Ini yang membuat semuanya konsisten.
5. **Timeline**: key yang dikunci ke kata: `pressKeys`, `papKeys`, `cutKeys`, `camKeys`, `openKeys`… Keadaan yang "mengingat" dihitung di larik pra-hitung (contoh `ZCS`, `CUT`).
6. **Kamera**: `camKeys = [[t, [x, y, z, tinggiPandang, kemiringan]]]` dalam koordinat lokal benda. Kemiringan 0 = mata elang, 1 = isometrik, > 1 = makin menyamping (sampai 2).
7. **Callout** `tagAdd(mulai, akhir, teks, anchorFn, 'l'|'r', ''|'hi'|'warn')`, **judul** `titleDefs`, **chip status** `chipDefs`, **stempel** `stampDefs`, **getar** `shakeAt`.
8. **updateModel(t)**: hitung semua dari `t`; isi `S` (nilai untuk HUD).
9. **updateOverlay(t)**: judul, progres 6 segmen, angka HUD (dari `S`), callout + panah gaya, stempel, **kartu diagram** (SVG 952×360, ditulis ulang tiap frame), subtitle karaoke.
10. **draw()**: warna → normal (bahan terbelah pakai `normalMatClip`; decal & lapisan tembus pandang disembunyikan) → garis tepi → layar.
11. **`window.EVENTS`**: `pop` tiap callout, `stamp/stampSnd`, peristiwa model (cari dengan memindai `t` dari 0 sampai `DUR` per 1/120 s), `whoosh`, `chime`, dan **cue musik wajib**: `heart`(0), `mystery`(baris 1), `act1`(bagian), `danger`, `drop`(sebelum aksi, ada hening lalu punch), `build`, `reveal`(twist), `warm`, `dark`(bonus), `resolve`(penutup), `end`(DUR).
12. `window.DUR`, `window.TW = T`, `window.__dbg = { camera, … }`, `window.coverPoint` (opsional), `renderAt(0); window.READY = true`.

Tipe suara yang tersedia di `sfx.py`: `pop, stamp, stampSnd, whoosh, lid, hum, whine, zap, blip, step, snip, fold, screw, crack, tear, heart, flatline, mystery, reveal, drone, glitch, hit, shrink, squeeze, arc, chime, snap, pierce, clack, spring, twist`. Tambah tipe baru di `sfx.py` kalau perlu (dengan `dur` kalau suaranya berdurasi).

## Cek kata per baris

```
node -e "const w=require('./words.json');const L={};for(const x of w.words){(L[x.l]??=[]).push(x)};for(const k in L)console.log(k, L[k].map(x=>x.w+'@'+x.s.toFixed(1)).join(' '))"
```

## Tata letak papan + palet warna (`papan.js`, `tema.json`)

Tulis `@papan` di baris pertama `scene_body.js`; `render.mjs`/`cover.mjs` lalu merakit `scene_head.js + papan.js + scene_body.js`. `papan.js` membaca `tema.json` di folder proyek:

```
{ "palet": "malam", "tata": "papan", "kicker": "ANATOMI ALAT GYM", "judul": "Leg press", "warna": { "aksen": "#ff5a36" } }
```

- **palet**: `malam` (gelap, oranye), `neon` (biru tua, cyan), `senja` (ungu, koral), `hutan` (hijau tua, lime), `kertas` (krem terang, merah bata), `es` (putih kebiruan, biru). `warna` menimpa kunci palet mana pun: `bg, panel, garis, teks, redup, sisa, aksen, baik, buruk, pil, pilTeks, lantai, langit, grid`.
- **tata**: `papan` (judul + kartu di atas, adegan di tengah, subtitle besar di bawah), `layar` (adegan penuh layar, kartu & subtitle melayang di atas gradasi), `atas` (adegan besar di atas, kartu + subtitle di bawah), `sinematik` (adegan penuh, judul & kartu kecil di pojok, subtitle film), `cerita` (pita layar lebar atas-bawah, judul bab besar berhuruf serif, tanpa kartu).
- Yang disediakan untuk badan: `PP` (warna palet, pakai untuk panah/teks SVG: `PP.aksen`, `PP.baik`, `PP.buruk`, `PP.redup`), `PAPAN` (`top`, `bot`, `cy` zona adegan), `setStats([[label, nilai, satuan, '' | g | o | r]])`, `pill(mulai, akhir, teks, () => titik, dx, dy, '' | hi | y | warn | g)`, `updatePapan(t)` (subtitle + pil, kembalikan SVG), `forceArrow`, `tagPx`, `arrowSVG`, `F`, `setBab([[t, 'Bab 1 · Bagian', 'Judul <em>sorot</em>']])` (judul bab ±3 detik), `window.coverCustom` (cover sesuai tema).
- Badan wajib: warna latar 3D & lantai dari `PP.langit`/`PP.lantai` (lewat `preTone` kalau ada nada ACES), kamera menaruh benda di `PAPAN.cy` (`-h * (H / 2 - PAPAN.cy) / H`), dan `$('ppSvg').innerHTML = svg` tiap frame.
- Pakai kalau pengguna minta "gaya papan", "gaya gelap", "anatomi alat", palet/warna tertentu, atau mengirim contoh seperti itu. Tanpa `@papan` tampilannya gaya terang biasa.

## Tampilan semi-realistis (`realis.js`, penanda `@realis`)

Tulis `@realis` di baris pertama `scene_body.js` (boleh bersama `@papan`). Tersedia: `std(hex, kekasaran, logam)`, `BAHAN` (kuningan, kuninganPotong, baja, bajaKasar, krom, nikel, aluminium, tembaga, besiCor, per, karetHitam, plastikPutih, plastikHitam, kayu, kaca, cat(hex), vinyl; tiap panggilan membuat bahan baru dengan `.hl(palet, k)`), `lantaiRealis(induk, x, y, ukuran)` (lantai warna tema + bayangan), `preTone(hex)`, `drawRealis()` (panggil di `draw()`), `renderer.localClippingEnabled` sudah aktif untuk potongan belah. Bidang potong: `THREE.Plane` dihitung tiap frame dari koordinat benda; permukaan irisan digambar sebagai bentuk datar (`capGeo`). Hanya untuk adegan dengan manusia atau kalau pengguna sendiri meminta "lebih nyata". Benda saja tetap gaya bedah: kunci pintu semi-real (kuningan semua, benda kecil di tengah) dinilai jelek dibanding versi bedah.

Contoh leg press juga memakai **tampilan semi-realistis** (versi tertulis langsung di badan): bahan PBR (`std(hex, kekasaran, logam)`) + `RoomEnvironment` + bayangan lembut, tanpa garis tepi, nada ACES di pass akhir (`fin`), lantai warna tetap + `ShadowMaterial`. Orang dibuat dengan `makeHuman()` (segmen profil putar, kaos/celana/sepatu, `ik()` untuk lutut & siku, napas pelan). Pakai tampilan ini kalau ada manusia di adegan atau pengguna minta lebih nyata.

Aturan papan: kartu angka selalu dari model (nilai "?" sampai diungkap narasi); satu sorotan oranye/kuning per kalimat; label adegan berupa pil (`pill(...)`), bukan callout bergaris panjang; tidak ada judul babak (judul tetap di atas).

## Contoh

- `contoh_stapler/scene_body.js`: potongan belah, engsel bertingkat (wadah lalu kepala), staples dengan jalur kaki mengikuti alur landasan, kartu irisan, landasan berputar, kertas dibalik/tembus pandang.
- `contoh_kunci/bedah.js` (gaya bedah, bawaan): silinder pin tumbler dibelah, 5 pasang pin & per digerakkan profil gerigi, angka "x/5 pin pas garis potong", kunci tetangga (satu pin kurang/lebih), cekrek, tips grafit.
- `contoh_pulpen/bedah.js` (gaya bedah): pulpen klik dibelah memanjang, cincin bergigi berputar dari jadwal klik, angka sudut cincin, inset "dinding dibuka jadi datar", kartu tips bernomor, badge gerak lambat.
- `contoh_legpress/scene_body.js` (+ `tema.json`): tata letak papan, rel berputar (θ) dengan kereta luncur, kaki dengan lutut dihitung (dua lingkaran), dekomposisi gaya berlabel, orang squat sebagai pembanding (kamera pindah bingkai), grafik batang, cover gelap.
- `contoh_gunting/scene.js` (versi gabungan lama): bilah loft dengan bevel, gagang satu kontur, baut + ring + mur, titik potong `x = e / sin(a)`, ledakan bagian, kartu irisan geser, tampak samping, tampak ujung (kidal).
