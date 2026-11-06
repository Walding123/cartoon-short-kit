# Panduan mode 2.5D isometrik (`iso_body.js`)

Mode cepat. Gaya tetap flat toon isometrik dengan garis tepi, tapi digambar sebagai SVG: setiap bentuk dipecah jadi bidang datar, diwarnai 3 nada, diurutkan belakang → depan, lalu digambar. Tidak ada WebGL, bayangan peta, atau masalah permukaan berkedip, sehingga menulis dan mengecek adegan jauh lebih cepat. Render per frame juga lebih ringan.

`scene.js = iso_head.js + iso_body.js` (dirakit otomatis oleh `render.mjs`/`cover.mjs`/`exp.mjs` kalau `iso_body.js` ada). Kepala sudah berisi **semua overlay**: judul babak, progres, HUD, chip, callout, stempel, kartu diagram, subtitle karaoke, getar, peristiwa suara dasar. Badan cukup berisi model, timeline, gambar, dan daftar definisi. Contoh lengkap: `reference/contoh_ricecooker_25d/iso_body.js` (salin kerangkanya, jangan mulai dari nol).

## Kapan dipakai

- Pengguna minta "versi 2D", "2.5D", "yang cepat", atau "versi ringan" → mode ini. Selain itu default 3D.
- Cocok untuk benda yang bisa dibangun dari kotak, tabung, benda putar (lathe), prisma tuas/pelat, per, dan gelembung: hampir semua alat dapur, saklar, pompa, katup, termos, pulpen, gembok.
- Kurang cocok kalau ceritanya butuh kamera berputar bebas mengelilingi benda atau bentuk organik melengkung bebas: pakai 3D.

## Koordinat & kamera

- Satuan mm, meja z = 0, z ke atas. Benda biasanya di pusat (0, 0). Kamera melihat dari sisi -y; potongan belah membuang separuh dekat kamera (y < 0).
- `SC.camKeys = [[t, [x, y, z, tinggiPandang, elevasi, yaw]]]`. Elevasi dalam radian (0,35 hampir menyamping untuk interior, 0,5 normal, 1,2 mata elang). Yaw ±0,4 memberi sudut 3/4 (positif = sisi +x/depan ikut terlihat).
- `proj([x, y, z])` → `[X px, Y px, kedalaman]` untuk overlay sendiri.

## Menggambar (di dalam `SC.build = t => { … }`, dipanggil tiap frame)

| Fungsi | Guna |
|---|---|
| `face(pts, pal, o)` | bidang datar dari titik `[x,y,z]` (urutan berlawanan jarum jam dilihat dari luar) |
| `box(x0,x1,y0,y1,z0,z1, pal, o)` | kotak |
| `prism([[x,z],…], y0, y1, pal, o)` | poligon di bidang x-z ditebalkan sepanjang y (tuas, pelat, bilah) |
| `lathe(cx, cy, [[r,z],…], pal, o)` | benda putar dari profil **tertutup** (badan, panci, tutup, elemen cincin). `o.cut` 0..1 = potongan belah, irisannya digambar pucat otomatis |
| `cyl`, `frustum`, `tube` | pintasan `lathe` untuk tabung pejal, kerucut terpancung, pipa berongga |
| `coil(cx, cy, r, z0, z1, lilitan, pal, o)` | per spiral (`o.w` tebal kawat mm) |
| `blob(p, r, pal, o)` | lingkaran (gelembung, uap, lampu, kepala sekrup) |
| `label3(p, teks, o)` | teks kecil di titik dunia |
| `shadow(cx, cy, rx, ry)` | bayangan jatuh lembut di meja |
| `slab(denah, z0, z1, pal, o)` | poligon denah `[x,y]` ditebalkan sepanjang z (pelat, lengan, tuas dilihat dari atas); `o.top` opsi khusus muka atas |
| `stadium(p, q, w)` | denah batang berujung bulat dari `p` ke `q` (setengah lebar `w`), pakai dengan `slab` |
| `cylY(x, z, r, y0, y1, pal, o)` | tabung tidur bersumbu y (peredam, pin, baut) |
| `coilY(x, z, r, y0, y1, lilitan, pal, o)` | per tidur bersumbu y |
| `arc(cu, cz, r, a0, a1, n)` | titik-titik busur untuk profil face/prism (lubang, cekungan, ujung bulat) |
| `pathSVG(titik, warna, tebal, dash)` | jejak/garis bantu titik dunia untuk `SC.arrows` |
| `camLow(x, y, z, h, el, yaw)` | kunci kamera dengan titik bidik diturunkan, benda naik menjauhi subtitle |

Opsi `o` yang umum: `hl` (0..1 sorot kuning; `hlPal` ganti warna sorot), `tint: [hex, k]`, `tf` (transformasi titik untuk bagian bergerak), `n` (jumlah segmen benda putar), `bias` (geser urutan gambar: negatif = digambar lebih belakang, jadi tampil di depan), `layer` (-2 meja, -1 bayangan, 0 benda, 1 uap/di atas segalanya), `op` (opasitas).

Transformasi: `TF.move(dx,dy,dz)`, `TF.rotY(px,pz,sudut)` (engsel dengan poros sejajar y, mis. tuas), `TF.rotZ(px,py,sudut)`, `TF.then(f1, f2)`.

Palet: nama dari `PAL` (3 nada). Tambah sendiri di badan: `PAL.rice = ['#fff6dc', '#f0e2bd', '#d8c393'];`.

## Aturan supaya urutan gambar benar

1. **Bagian dalam hanya digambar saat dibelah** (`if (S.cut > 0.02)`); kalau tidak, painter bisa menggambarnya di atas badan.
2. Bagian kecil di dalam rongga yang menembus bidang belah (magnet, batang, per) beri `bias` negatif (-1 … -3) supaya tidak tertutup irisan badan.
3. Hindari dua permukaan berimpit di z yang sama persis; beri jarak 0,5 mm.
4. Benda yang selalu di depan (kenop, konsol) beri `bias` -4 … -6. Uap pakai `layer: 1`.
5. Benda putar: profil harus tertutup (titik terakhir kembali ke awal tanpa ditulis ulang). Arah urutan bebas; normal dihitung sendiri.

## Definisi lain di badan

```
SC.model = t => { … }                 // hitung keadaan dari t, isi objek S (deterministik)
SC.chap = 'Kita bongkar · <benda>';
SC.titles = [[t, 'Babak 1 · …', 'Teks <em>sorot</em>'], …];
SC.chips = [[t, 'Masak', RED], …];     // RED, GRN, GRY, YEL
SC.stamps = [[mulai, akhir, 'Klek!', 'snd' | ''], …];
SC.shakes = [t, …];
SC.segs = [[a, b], …];                 // 6 segmen progres
SC.readout = t => ['103 °C', 'suhu panci'];
SC.arrows = t => arrow3(a, b, warna, tebal, pudar) + …;   // panah gaya (string SVG)
SC.cards = [{ on: t => hlw(t, s, e), kicker: 'JUDUL KARTU', svg: t => '…' }];   // SVG 952×360, pakai txt()
SC.events = (ev, cue) => { ev.push({ t, type: 'clack' }); cue('heart', 0); … };  // bunyi model + cue musik wajib
SC.coverPoint = () => [x, y, z];       // titik tunjuk pil di cover
tagAdd(mulai, akhir, 'Teks', () => [x, y, z], 'r' | 'l', '' | 'hi' | 'warn');
mulai();                               // wajib di baris terakhir
```

`T(baris, 'awalan')`, `L[i].s/.e`, `DUR`, `track`, `lin`, `hlw`, `smooth`, `easeIO`, `clamp`, `lerp`, `deg`, `TAU` sama dengan mode 3D. Cue musik dan tipe suara sama (lihat `panduan_scene.md`).

## Cover

`cover.json` sama, tapi `cam` berisi 6 angka kamera iso: `[x, y, z, tinggiPandang, elevasi, yaw]`.
