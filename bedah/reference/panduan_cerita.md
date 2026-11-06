# Panduan cerita & narasi

Video harus bikin orang bertahan: buka dengan teka-teki, tunda jawabannya, jawab dengan twist yang terasa "oh, ternyata!", lalu tutup dengan rangkuman yang memuaskan.

## Struktur bawaan gaya bedah (±10 baris, ±40–60 detik)

Patokan: `contoh_kunci/narasi.txt` dan `contoh_pulpen/narasi.txt`. Padat, satu gerak per baris:

| Baris | Fungsi | Contoh (kunci) |
|---|---|---|
| 0 | Hook dengan bunyi | "Kunci dicolok, diputer… cekreeek! Pintu kebuka." |
| 1 | Keanehan + "Yuk, intip/bongkar" | "Padahal kunci tetangga bentuknya mirip. Kok cuma kunci ini yang bisa?" |
| 2 | Isi dalam, dengan angka nyata | "Di dalamnya ada 5 pasang pin, tebalnya nggak sampai 3 mm…" |
| 3 | Aksi dasar | "Kunci masuk. Tiap gerigi ngangkat satu pasang pin." |
| 4 | "Nah, rahasianya…" | "Tingginya beda-beda, pas sama dalamnya gerigi kunci." |
| 5 | Bukti | "Semua celah pin jatuh di satu garis lurus: garis potong." |
| 6 | Pembanding yang gagal | "Kunci tetangga? Satu pin aja kurang tinggi… keblok." |
| 7 | Klimaks dengan bunyi | "Lima celah sejajar, silinder bebas muter… cekreeek!" |
| 8 | Tips praktis ("Makanya, …") | "Kunci seret jangan disemprot oli… pakai serbuk grafit." |
| 9 | Penutup kembali ke hook | "Jadi, tiap kali kamu puter kunci… cekreeek!" |

## Struktur panjang (13–15 baris, kalau pengguna minta video ±90 detik)

| Baris | Fungsi | Contoh (stapler) |
|---|---|---|
| 0 | **Hook**: tunjukkan keanehan nyata dalam 5–8 detik | "Di dalam stapler, kakinya lurus. Tapi begitu ditekan, dua kakinya menekuk rapi ke dalam." |
| 1 | **Loop terbuka** + ajakan | "Padahal nggak ada yang menekuknya. Atau, ada? Yuk, kita bongkar." |
| 2 | Bagian-bagian (maks 3–4) | "Stapler punya empat bagian penting…" |
| 3–4 | Cara kerja dasar, satu ide per baris | "Staples-nya berjajar rapat, ditempel lem tipis…" |
| 5–6 | Aksi utama, pelan dan jelas | "Saat kamu menekan, pisau tipis ini turun…" |
| 7 | **Twist / rahasia** ("Nah, ini rahasianya.") | "Lihat landasan logam di bawah…" |
| 8–9 | Klimaks: mekanisme rahasia + pembuktian (bandingkan dengan / tanpa) | "Jadi yang menekuk bukan tekananmu…" |
| 10–12 | **Bonus** yang memancing komentar (kidal, mode sementara, bahaya produk palsu) | "Terus, kenapa landasannya bisa diputar?" |
| 13 | (opsional) Kembali ke awal / siklus | "Lepas tekanan, per mengangkat kepala…" |
| 14 | **Rangkuman 3 kata kunci** | "Ia pemotong, pendorong, dan landasan kecil…" |

Aturan:
- Diksi pembuka bab tetap: "Yuk, kita bongkar." (bukan "kita bedah").
- Kalimat pendek (≤ 12 kata), bahasa lisan ("nggak", "aja"), satu ide per kalimat.
- Setiap kalimat harus bisa digambar. Kata kerja di narasi = gerak di layar pada kata itu.
- Angka hanya kalau benar; kalau angka berasal dari model (mis. perbandingan lengan tuas), sebutkan di caption.
- Ucapan untuk VO: sama dengan narasi, tambahkan `...` di jeda dramatis ("Atau... ada?", "Nah... ini rahasianya").

## Format video (11)

Format menentukan struktur naskah. Semua format digambar dengan gaya bedah (3D toon + garis, lingkungan SVG, tanpa teks atas, subtitle di bawah). Komponen tampilan khusus format ada di `template/format.js` (lihat `panduan_scene.md` › Komponen format). Kalau pengguna tidak menyebut format, pakai Kita Bongkar untuk satu benda dan Tur Lingkungan untuk beberapa benda.

| Format | Kapan | Struktur naskah | Komponen `format.js` | Durasi |
|---|---|---|---|---|
| **Kita Bongkar / Explainer** | cara kerja satu benda | hook kontradiksi → buka → bagian → rahasia (momen gelap) → pembuktian → tips → loop | (kartu & stempel bawaan) | 45–55 dtk |
| **Tur Lingkungan** | beberapa benda dalam satu tempat/aliran | hook → "ikuti perjalanannya" → bidikan lebar → tiap benda dibongkar berurutan, diikat aliran bercahaya → momen dramatis → rangkuman → tips | (aliran titik) — contoh `contoh_listrik` | 60–80 dtk |
| **Story / Kisah** | sejarah penemuan, tokoh, peristiwa | adegan pembuka (tempat/tahun) → masalah zaman itu → percobaan & gagal → titik balik → dampak → kini → penutup reflektif | `bab` (pita layar lebar + kartu "BAB n · tahun") | 60–80 dtk |
| **POV "Jadi Si…"** | perjalanan dari sudut pandang benda/partikel | "Aku…" + tujuan → rintangan 1, 2, 3 (tiap tempat) → momen genting → sampai → refleksi | `pov` (tokoh bermata mengikuti jalur + gelembung ucapan) | 45–60 dtk |
| **Tutorial / Cara** | langkah aman/benar melakukan sesuatu | masalah → "jangan begini" → langkah 1..N (tiap langkah satu gerak) → hasil → kesalahan umum | `langkah` (LANGKAH n/N + centang + kartu JANGAN) | 35–50 dtk |
| **Mitos vs Fakta** | klaim populer yang perlu diuji | "Katanya…" → kenapa orang percaya → uji di model → putusan MITOS/FAKTA/SEBAGIAN → alasan → yang benar → tips | `mitos` (kartu klaim + stempel putusan) | 35–50 dtk |
| **Perbandingan A vs B** | dua pilihan | pertanyaan → kenalkan A → kenalkan B → ukuran 1, 2, 3 (sama untuk keduanya) → pemenang tergantung kondisi | `versus` (label A/B di objek + papan skor per ukuran) | 45–60 dtk |
| **Top List** | daftar 3–5 hal | hook ("nomor 1 bikin kaget") → #5 → … → #1 (paling kuat) → ajakan komentar | `topList` (#angka raksasa + judul + titik kemajuan) | 35–50 dtk |
| **Apa Jadinya Kalau…** | akibat situasi ekstrem/salah pakai | "Kalau…" → normal → akibat bertahap (makin parah) → puncak (momen gelap/api) → pelajaran | `kalau` (pita kondisi + pengukur bahaya bertahap) | 40–55 dtk |
| **Evolusi / Timeline** | perubahan benda dari masa ke masa | dulu (masalahnya) → versi 2 → versi 3 → kini → masa depan? | `timeline` (garis tahun + penanda meluncur + nama era) | 45–60 dtk |
| **Kuis / Tebak** | seri pendek pemancing komentar | close-up misterius → pertanyaan + pilihan → hitung mundur 3-2-1 → jawaban → penjelasan singkat | `kuis` (kartu TEBAK + hitung mundur + buka jawaban) | 20–30 dtk |

**Contoh siap pakai per format** (`node $K/new_project.mjs <nama> --contoh <x> --di "<folder sesi>"`, lalu ganti isinya): Kita Bongkar `korek`/`pulpen`/`kunci`, Tur Lingkungan `listrik`, Story `story` (microwave), POV `pov` (setetes air), Tutorial `tutorial` (ganti gas LPG), Mitos vs Fakta `mitos` (charger), A vs B `versus` (LED vs pijar), Top List `toplist` (alat boros), Apa Jadinya Kalau `kalau` (colokan ditumpuk), Evolusi `evolusi` (telepon), Kuis `kuis` (lubang gembok). Mulai selalu dari contoh format yang sama.

Semua angka di kartu, papan skor, dan pengukur dihitung dari model; klaim dan tahun diberi sumber di caption. Anatomi Alat = Kita Bongkar dengan fokus satu angka aneh di alat.

## Voiceover

Utama: VokaStudio suara Kore, `node gen_vo.mjs vokastudio` (seluruh `ucapan.txt` sekali panggil). Gaya bawaannya: "Narator konten edukasi berbahasa Indonesia, hangat dan penasaran seperti teman yang sedang membongkar rahasia, tempo pelan dan jelas dengan jeda dramatis di titik-titik, penutup tenang dan puas". Untuk menonjolkan kalimat tertentu, tulis `gaya.txt` berisi gaya itu ditambah misalnya "nada antusias di 'Yuk, kita bongkar' dan '<kalimat twist>'".

Cadangan: VoiceStudio lokal, `node gen_vo.mjs voicestudio <profile_id>` (profil Indonesia paling natural).

Tempo harus pelan: user pernah komplain "VO terlalu cepat, belum sampai dicerna otak". `prep.py` merapikan jeda (maks 0,42 s dalam baris, 0,62 s antar baris) dan menambah jeda bab dari `jeda_bab.json` (0,4–0,6 s sebelum babak bagian, aksi, twist, bonus, penutup).

## Caption

Tiga bagian: CAPTION UTAMA (hook + penjelasan 3 poin + bonus + pertanyaan pancingan komentar + sumber & catatan + hashtag), VERSI PENDEK (Threads/Shorts), JUDUL YOUTUBE SHORTS. Selalu tulis catatan penyederhanaan ("ilustrasi disederhanakan, bukan merek tertentu", "lengkungan dilebih-lebihkan").
