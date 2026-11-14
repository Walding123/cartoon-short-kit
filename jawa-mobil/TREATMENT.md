# TREATMENT: Apa yang Terjadi Jika Semua Orang di Jawa Punya Mobil (9:16, ±55 s, 3D Map Explainer)

Audio: voice/vo.wav, 50.8 s (Gemini). Film = 1.5 s lead-in + 50.8 s VO + 3 s tail ≈ 55 s, 24 fps.

## Tiga struktur yang dipertimbangkan
1. **Corong** (dipilih): bumi -> Jawa -> Jakarta-Bandung -> tol -> tarik mundur ke bumi. Cocok dengan gaya, angka makin besar mengikuti zoom.
2. Perjalanan satu jalur Anyer-Banyuwangi: kuat untuk panjang barisan, lemah untuk angka penduduk/lahan.
3. Sebelum/sesudah: dua peta bersisian, kurang pas untuk layar vertikal 9:16.

## Peta adegan (waktu mengikuti words.json audio, detik film = detik VO + 1.5)
| VO (s) | Narasi | Visual | Kamera / move |
|---|---|---|---|
| 0-6 | Jawa 7% daratan, 56% penduduk | Globe, push in ke Jawa; Jawa menyala amber, label "±158 jt orang" | dive from orbit, dissolve ke peta |
| 6-12.5 | 158 jt orang; bayangkan satu mobil per orang | Titik-titik amber menyala di kota (Jakarta, Bandung, Semarang, Surabaya) | oblique, drift |
| 13-20 | 16 jt mobil nasional = 6 dari 100 | Pilar kecil teal (16 jt) di samping pilar amber nanti | near-locked oblique |
| 20-24 | hampir 10x | Pilar amber (158 jt) tumbuh slab demi slab, skala sama | crane up around the quantity |
| 24-32 | barisan 790 ribu km = 20x keliling bumi | Garis amber menyala sepanjang Jawa lalu melingkar mengelilingi globe | pull back ke globe |
| 32-41 | tol 1.782 km, 90 ribu mobil/km | Kembali ke Jawa; tol Trans-Jawa menyala, "1.782 km", pulsa padat | low tracking shot sepanjang tol |
| 41-47 | parkir 2.000 km2 = 3x Jakarta | Kotak parkir amber di atas peta vs siluet Jakarta, skala sama | square-on |
| 47-51 | "Jawa kekurangan ruang" | Tarik mundur ke globe, Jawa tetap menyala; kartu penutup | back to the world |

## Teks di layar (Indonesia), sumber di pojok
Subtitle satu baris Indonesia di bawah kiri. Label hitungan: "hitungan, skenario 1 mobil/orang". Sumber: BPS, Kemendagri, PUPR; peta: AWS Terrain Tiles, Sentinel-2 cloudless 2016 by EOX (CC BY 4.0), jalan (bila dipakai) (c) OpenStreetMap (ODbL); vertikal x3.

## Risiko
- Render WebGL tanpa GPU (4 CPU): uji 1 frame dulu, lalu render per potongan.
- ffmpeg 6.1 < 7: cek kompatibilitas mux, jika gagal pasang build statis.
- Jalur tol digambar skematis (diberi label), tidak dari data OSM kecuali Overpass dapat dijangkau (tadi tidak).
