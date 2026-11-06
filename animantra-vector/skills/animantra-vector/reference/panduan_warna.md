# Panduan warna, cahaya & desain 3D

Wajib dibaca sebelum menulis palet atau lingkungan. Pengguna menolak versi yang "kurang oke warna dan visualnya": semuanya krem pucat, benda putih tenggelam di dinding krem, bayangan cuma versi gelap dari warna yang sama (kotor/abu-abu), sorotan kuning membuat benda gelap jadi hijau zaitun, benda melayang tanpa bayangan.

## 1. Nilai (terang–gelap) dulu, baru warna
- Benda yang dibahas harus beda **nilai** dari latarnya. Benda putih/terang → dinding nada menengah (mis. biru-abu `#c5d4d3`). Benda gelap → latar terang.
- Cek cepat: bayangkan frame hitam-putih. Benda utama harus terbaca jelas tanpa warna.
- Putih tidak pernah 100% (`* .97` di shader) supaya bentuk tetap terbaca dan tidak "silau".

## 2. Suhu warna: cahaya hangat, bayangan sejuk
- Sisi terang sedikit hangat, sisi bayangan bergeser ke ungu-biru (`c2 * (.80, .86, 1.16)`), bukan hanya digelapkan. Bayangan satu-hue terlihat kotor dan muram (Gooch dkk. 1998; praktik shading webtoon).
- Dinding/latar sejuk dan lantai/kayu hangat. Kontras suhu ini membuat ruang terasa dalam.

## 3. Satu cahaya kunci yang konsisten
- Arah cahaya kunci: kiri-atas layar `L = (.35, .9, .65)` (+z = kiri layar). Dengan begitu tiga sisi benda punya nada berbeda (terang, tengah, bayangan) dan bentuknya terbaca.
- Bayangan di SVG (dinding, lantai) jatuh ke kanan-bawah, searah cahaya ini.
- Cahaya langit: bidang atas sedikit lebih terang, bidang bawah sedikit lebih gelap (`N.y`).
- Rim light sejuk tipis di sisi gelap memisahkan siluet dari latar.

## 4. Bahan = kilap
- `GLOSS[palet]`: logam/kaca/plastik mengilap 0,6–0,9; plastik doff 0,3–0,45; kain/kayu/kertas 0,1–0,2. Kilap kecil dan tajam, tidak menutupi seluruh bidang.

## 5. Bayangan kontak (grounding)
- Setiap benda yang berdiri di lantai, menempel di dinding, atau di atas meja wajib punya bayangan kontak lembut:
  - lantai/dinding: elips/kotak `#2a2440` diblur (`filter="url(#soft)"`, stdDeviation ±45) di SVG lingkungan;
  - di atas benda 3D (meja): `blob(x, y, z, rx, rz)` (bidang bertekstur gradien radial).
- Tanpa ini benda terlihat melayang.

## 6. Hierarki warna 60–30–10
- 60% dominan = latar (dinding/lantai) netral, saturasi rendah.
- 30% sekunder = benda-benda (warna aslinya).
- 10% aksen = kuning emas `#e3bf62` untuk fokus (label, sorotan, kata aktif) + merah untuk peringatan/angka besar. Jangan memakai kuning/merah jenuh untuk elemen lingkungan (karpet, gorden) supaya aksen tidak bersaing.

## 7. Sorotan tanpa merusak warna asli
- `m.glow(k)`: pinggir menyala emas + sedikit terang; warna benda tetap. Pakai untuk "benda yang sedang dibahas".
- `m.hl(palet, k)`: mengganti warna bagian (mis. pin jadi kuning). Pakai hanya kalau bagian itu memang berubah warna dalam cerita.

## 8. Garis tepi
- Siluet & lipatan: tinta biru-tua `#1a1c2a`. Batas antar warna di satu bidang: versi gelap warnanya sendiri, bukan hitam, supaya tidak ramai.

## 9. Kedalaman & mood (color script)
- Latar diburamkan saat close-up (DOF) dan diberi vignet biru-tua tipis.
- Rencanakan suasana per babak: hook boleh lebih gelap/kontras, isi terang netral, momen "bahaya" lebih hangat/merah, penutup hangat. Ubah lewat warna lingkungan atau `dim`, bukan dengan mengubah warna benda.

## Daftar periksa still
1. Benda utama beda nilai dari latar? 2. Bayangan sejuk, bukan abu-abu kotor? 3. Tiga sisi benda bernada beda? 4. Ada bayangan kontak? 5. Aksen ≤ 10% layar? 6. Putih tidak silau, benda gelap tidak berubah hue?
