# Gerbang mutu (WAJIB sebelum render penuh)

Semua aturan desain di skill ini lahir dari penilaian pengguna. Aturannya sudah tertulis di `panduan_warna.md`, `pelajaran.md`, dan `panduan_scene.md`, tapi pernah terlewat saat dikejar waktu (permintaan cepat dari Studio, durasi 20 detik), dan hasilnya dinilai turun. Gerbang ini memaksa semuanya dicek, untuk setiap video, di folder atau perangkat mana pun.

## Cara memakai
1. Sesudah cek frame (Alur langkah 7), buat lembar banding: still video baru di samping gambar patokan.
   `node py.mjs sheet.py qc/banding.png "$K/reference/patokan/<patokan>_1.jpg" "$K/reference/patokan/<patokan>_2.jpg" stills/still_A.png stills/still_B.png stills/still_C.png`
   Pilih patokan terdekat: `pulpen` / `kunci` (benda kecil dibelah), `korek` (mekanisme + momen gelap), `toplist` (beberapa alat di ruang), `generator` (mesin berputar, pembangkit, listrik). Lihat lembarnya.
2. Tulis `qc/mutu.md`: satu baris per poin di bawah, `✓` atau `✗` + bukti singkat (detik still / nama bagian). Jujur: `✗` berarti perbaiki dulu, bukan dicatat lalu dilewati.
3. Render penuh hanya kalau semua `✓`. Di mode Studio, lapor dulu `--tahap "Cek gambar" --teks "Gerbang mutu lolos"`.

## Poin yang dicek

### A. Setara patokan (`pelajaran.md` › Mutu tidak boleh turun)
- A1 Dimulai dari scene terbaik yang sudah ada (proyek lama di folder sesi atau contoh skill terdekat), bukan dari nol.
- A2 Di lembar banding, tingkat detail benda utama tidak kalah dari patokan (jumlah bagian, bevel, sekrup/ulir/gulungan, tekstur potongan).
- A3 Tidak ada benda utama yang hanya kotak/tabung/trapesium polos.

### B. Kemiripan dengan benda asli (`pelajaran.md` › Kemiripan)
- B1 Foto asli tiap benda sudah dilihat; daftar 4–6 ciri pengenal ditulis sebagai komentar di atas modelnya.
- B2 Semua ciri itu terlihat di still close-up (cek berdampingan dengan fotonya).
- B3 Ukuran/proporsi dari angka nyata (mm), bukan tebakan.
- B4 Manusia: `makeHuman()` + tampilan semi-realistis; tangan/jari tidak dari kapsul. Bagian tubuh dibedah: mengikuti foto anatomi.

### C. Warna & cahaya (`panduan_warna.md`)
- C1 Benda utama beda nilai terang-gelap dari latarnya (cek bayangkan hitam-putih).
- C2 Bayangan sejuk ungu-biru, bukan abu-abu kotor; tiga sisi benda bernada beda (satu cahaya kunci kiri-atas).
- C3 Setiap benda yang menapak punya bayangan kontak (SVG blur atau `blob`).
- C4 Hierarki 60–30–10: latar netral, benda warna aslinya, aksen (sorot/merah) ≤ 10% layar.
- C5 Satu warna tegas per bagian benda (gaya bedah); sorotan pakai `glow`, bukan mengganti warna.
- C6 Putih tidak silau; benda gelap tidak berubah hue.

### D. Penyajian (`pelajaran.md` › Pola penyajian)
- D1 Cover hidup: frame 0 = cover lengkap, adegan sudah bergerak; akhir kembali ke adegan pembuka.
- D2 Kamera establish → hold → inspect penyebab → hold; diam saat menjelaskan; orbit halus, hampir tanpa potongan.
- D3 Tiap babak punya satu gerak penyebab yang terlihat (grup berengsel, dihitung dari `t`).
- D4 Label menunjuk penyebab; angka di layar dihitung dari model.
- D5 Efek penjelas: lencana "GERAK LAMBAT/DIPERLAMBAT n×" bila gerak diperlambat, partikel/jalur untuk hal tak terlihat, teks kinetik untuk angka kunci, kartu bertahap dengan angka menghitung naik.
- D6 2 detik pertama memikat (makro/aksi), ada momen gelap atau suasana di babak kunci.

### E. Tata letak & teks
- E1 Tanpa judul/HUD atas selama video; subtitle rendah (±1610 px), dipotong menurut lebar terukur.
- E2 Teks, kartu, stempel, dan pil tidak menutupi benda yang sedang dijelaskan; benda tidak terpotong tepi layar tanpa sengaja.
- E3 Tidak ada benda saling tembus, melayang, atau artefak garis (z-fighting).

### F. Suara
- F1 Narasi pelan dan jelas; musik ±12–15 dB di bawah suara (sidechain bawaan `render.mjs`); gaya musik berbeda dari video sebelumnya bila cocok.
- F2 Efek suara dari peristiwa model (klik, desis, dengung) pada waktu geraknya.

Semua poin tetap berlaku untuk Gaya Saya: gaya hanya mengganti warna antarmuka, huruf, dan bentuk; kontras dicek oleh `cekKontras()` dan tetap harus lolos C1 dan E1–E2 di still akhir.
