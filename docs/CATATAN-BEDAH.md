# Catatan jebakan (ringkas, satu baris per masalah)

Versi lengkap beserta alasannya: `bedah/reference/pelajaran.md`. Tambahkan jebakan baru di bagian paling bawah.

## Mutu & model
- Jangan bangun benda dari kotak/tabung polos: mulai dari contoh terdekat, minimal 4–6 ciri pengenal dari foto asli.
- Durasi pendek = adegan lebih sedikit, bukan model lebih murah.
- Lihat foto benda asli (luar + dibongkar) dulu, tulis daftar ciri + ukuran mm di komentar atas model.
- Bangun dari profil (`prismXY`, `LatheGeometry`), bukan kotak membulat.
- Bandingkan still baru dengan `reference/patokan/` (`sheet.py`) sebelum render penuh.
- Flat toon, bukan semi-realis untuk benda; semi-realis hanya untuk manusia (`makeHuman()`).
- 3D, bukan 2.5D, kecuali pengguna minta. Jangan gambar jari dari kapsul.
- Satu warna tegas per bagian; jangan semua bagian satu warna logam.
- Benda tidak boleh tembus, melayang, atau hilang di bawah alas saat diledakkan.
- Angka di kartu/HUD dihitung dari model, bukan ditulis tangan.
- Benda transparan (`celA`) bisa hilang: pakai warna tembus pandang buatan yang opak.
- Hindari elevasi kamera 1–11° (bidang atas jadi hitam oleh garis tepi): pakai 0° atau ≥ 12°.

## Tata letak & teks
- Tanpa judul/HUD di atas selama video (dinilai "ganggu banget"); judul hanya di cover hidup 0–1,5 dtk.
- Teks tidak boleh menutupi objek yang dijelaskan; objek di zona 240–1560 px.
- Subtitle diukur lebarnya (`measureText`, pil ≤ 860 px), potong di tanda baca.
- Teks SVG wajib `font-family="Helvetica Neue, Helvetica, Arial, sans-serif"` + `paint-order="stroke"`.
- Label menunjuk penyebab, bukan nama benda.

## Kamera & cerita
- Kamera bergerak halus, hampir tanpa potongan (banyak potongan = "bikin bingung").
- Kamera diam saat menjelaskan; establish → hold → inspect → hold.
- Sebab sebelum akibat: satu gerak penyebab yang terlihat per benda (grup berengsel).
- 2 detik pertama = makro dramatis + hook kontradiksi; akhir kembali ke adegan pembuka.
- Momen gelap pakai uniform `dim` di shader (filter CSS kanvas tidak ikut terekam).

## Suara
- Musik ±12–15 dB di bawah narasi (`KB_MUSIK`, bawaan 0,5); musik tidak boleh seram.
- VO jangan cepat: `tempo.json` (jeda kata ±0,55 s, antar baris ±0,95 s).
- Hapus `vo/`, `words.json`, `narasi.txt` contoh sebelum membuat suara baru.
- Musik jangan selalu sama: pilih gaya di `musik.json` sesuai suasana.

## Teknis
- `renderAt(t)` harus deterministik; keadaan yang "mengingat" pakai larik pra-hitung.
- `gradTex` berisi `Uint8Array`: nilai 256 meluap jadi gelap, maksimal 255.
- Sinkron subtitle dicek dengan `cek_sinkron.py` → median selisih 0,00 s.
- API key tidak pernah lewat chat; jangan baca/cetak file kunci.

## Jebakan baru
<!-- tambahkan di sini: - <masalah>: <solusi> -->
