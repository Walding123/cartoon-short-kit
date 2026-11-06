# Pelajaran dari revisi user (wajib dipatuhi)

Semua poin di sini dicek lewat `gerbang_mutu.md` sebelum render penuh (lembar banding dengan `patokan/` + `qc/mutu.md`).

## Mutu tidak boleh turun (WAJIB, setiap video, termasuk permintaan cepat dari Studio)
Pengguna (2 Nov 2026): "ko kualitas videonya berkurang ya? terakhir yang bagus video 'listrik datang dari mana?' 28 detik". Video generator 28 detik (`contoh_generator`) dinilai bagus; tiga video sesudahnya dinilai turun karena mesinnya dibangun ulang dari bentuk dasar (kotak, setengah tabung, kipas pipih) supaya cepat. Aturannya:
1. **Mulai dari scene terbaik yang sudah ada, jangan dari nol.** Urutan cari: (a) proyek di folder sesi untuk benda/topik serupa (`ls */bedah.js`, judul di `cover.json`/`bedah.html`), (b) contoh skill terdekat (`contoh_generator` untuk pembangkit/motor/listrik, `contoh_korek`, `contoh_pulpen`, `contoh_kunci`, contoh per format). Salin model & efeknya, lalu ubah. Contoh-contoh ini ikut terpasang di skill, jadi tersedia di folder atau perangkat mana pun.
2. **Durasi pendek = lebih sedikit adegan, bukan model lebih murah.** Target 20 detik tetap memakai model sedetail video 60 detik.
3. **Larangan "model mainan"**: mesin atau benda utama tidak boleh hanya berupa kotak/tabung/trapesium polos. Setiap benda punya minimal 4–6 ciri pengenal dari foto (mis. generator: stator bercelah berlapis, ujung gulungan kawat tembaga, poros bertingkat + bantalan, rotor berlilit; turbin uap: banyak tingkat sudu + rumah turbin; ketel PLTU: dinding pipa, cerobong, burner; bendungan: lengkung/pelimpah + pintu air + pipa pesat).
4. **Efek penjelas wajib** (contoh di `contoh_generator`): lencana "DIPERLAMBAT n×" saat gerak cepat diperlambat, partikel/jalur yang memperlihatkan hal tak terlihat (elektron, uap, arus), teks kinetik angka besar ("3.000 putaran/menit"), penutup yang merangkum sebab → akibat ("Gerak → Listrik").
5. **Cek berdampingan dengan patokan sebelum render penuh**: taruh satu still video baru di samping still `contoh_generator`/`contoh_pulpen` (sheet.py). Kalau tingkat detailnya kalah jelas, perbaiki dulu.

## Pola penyajian (WAJIB, disetujui pengguna setelah diskusi dengan Codex, uji top list v4)
Contoh lengkap: `contoh_toplist/bedah.js` (cari `HOOK`, `DETAIL`, `SEBAB`, `updateCoverHidup`, `capW`, `fokus`/`bahaya`).
1. **Cover hidup**: frame 0 = cover lengkap, adegan sudah bergerak, judul memudar di 1,25–1,7 dtk. Tidak ada cover diam.
2. **Bahasa kamera**: establish (benda utuh) → hold (kartu dibaca) → inspect (dekati bagian *penyebab*) → hold. Kamera **diam** saat menjelaskan; tanpa "napas" kamera.
3. **Sebab sebelum akibat**: tiap benda punya satu gerak penyebab yang terlihat (kenop berputar → tapak memanas; tuas naik → lampu berganti; pintu terbuka → udara dingin keluar; sirip membuka → angin dingin). Bagian yang bergerak dibuat sebagai grup berengsel (pivot di engselnya).
4. **Label menunjuk penyebab**, bukan nama benda (nama sudah ada di judul format/kartu).
5. **Kartu bertahap**: peringkat/nama dulu → rumus → hasil antara → angka akhir yang menghitung naik (angka tabular). Satu kartu, satu pesan.
6. **Subtitle diukur lebarnya** (`measureText`, pil ≤ 860 px), dipotong di tanda baca; jangan hanya hitung kata.
7. **Suasana cahaya di latar saja**: fokus (latar meredup saat inspect), bahaya (semburat merah di momen angka besar). Warna benda tidak diubah.
8. **Bunyi dari peristiwa yang sama** dengan geraknya (klik tuas, putar kenop, pintu, dengung AC); chime saat angka akhir selesai menghitung.
9. **Akhir kembali ke adegan pembuka** supaya video berputar mulus.

## Warna & cahaya (WAJIB)
Ikuti `panduan_warna.md`: nilai benda beda dari latar, bayangan sejuk (bukan abu-abu), satu cahaya kunci kiri-atas, bayangan kontak untuk setiap benda, aksen ≤ 10%, sorotan pakai `glow` supaya warna asli tetap. Versi krem-pucat tanpa bayangan dinilai "kurang oke warna dan visualnya".

## Kemiripan dengan benda asli (WAJIB, setiap video, setiap benda)
Setiap benda di video harus langsung dikenali sebagai benda aslinya. Kotak membulat atau silinder polos yang diberi warna tidak cukup. Top list alat listrik ditolak ("ini ko jauh dari bentuk real ya?") karena AC dan kulkas hanya kotak, galon dispenser terbalik bentuknya, dan rice cooker tanpa gagang.
1. **Lihat foto dulu, sebelum menulis model.** Buka 1–2 pencarian gambar per benda di browser (Bing Images: merek umum di Indonesia + "side view"/"dibongkar" kalau isi dalamnya dibahas) dan lihat screenshot-nya.
2. **Tulis daftar ciri per benda** sebagai komentar di atas modelnya: siluet/profil, proporsi (ukuran mm), warna nyata tiap bagian, dan 3–6 ciri pengenal yang wajib ada. Contoh: dispenser berdiri = badan putih ±1 m, galon 19 L biru muda terbalik dengan rusuk dan leher masuk dudukan, ceruk keran merah (kiri) + biru, nampan tetes berkisi, 3 lampu, pintu kabinet berwarna; AC split = profil samping melengkung (panel depan cembung, bawah membulat), sirip miring terbuka, layar suhu di ujung kanan; kulkas 2 pintu = abu gelap, freezer atas ±1/3, gagang tegak, kisi bawah; magic com = badan gentong bermotif, tutup kubah, gagang angkat, panel tuas + 2 lampu; setrika kering = tapak krom runcing, badan hitam, gagang tertutup, kenop suhu, kabel di belakang.
3. **Bangun dari profil, bukan kotak**: profil samping/denah yang diekstrusi (`prismXY`, ekstrusi berbasis matriks), `LatheGeometry` untuk benda bulat (galon, panci, tutup), lalu tambahkan ciri pengenal sebagai bagian terpisah.
4. **Cek berdampingan sebelum render penuh**: render still close-up tiap benda, bandingkan dengan screenshot fotonya, perbaiki sampai semua ciri di daftar terlihat. Baru render penuh.
5. **Close-up harus memperlihatkan benda utuh** di area yang tidak tertutup kartu/label (kartu di atas, benda di 33–95% tinggi layar). Benda gelap: sorotan `hl` kecil (±0,08) supaya warnanya tidak berubah. Hindari sudut kamera yang melihat bidang atas sangat miring (bidang jadi hitam oleh garis tepi): elevasi 0° atau ≥ 12°.
6. Benda transparan (`celA`) bisa hilang di kanvas transparan: untuk galon/botol pakai warna tembus pandang buatan (badan biru muda + pita air lebih tua) yang opak.

## Gaya
- **Gaya bedah adalah patokan** (`contoh_kunci`, `contoh_pulpen`): toon + garis tepi, satu warna tegas per bagian, benda memenuhi layar, angka langsung, pil label, stempel bunyi, subtitle kotak, ±40–60 detik.
- **Flat toon, bukan fotorealistik/semi-realistis** untuk benda. Versi "lebih real" ditolak dua kali ("jelek, bagus yang sebelumnya"; kunci pintu kuningan semi-real: "ko jelek ya … ko bisa bagus ini?"). Penyebabnya: semua bagian satu warna logam, benda kecil dengan ruang kosong, teks tipis, video terlalu panjang.
- **Manusia harus berproporsi nyata.** Orang dari tabung polos dinilai "kurang real dan g natural" (leg press). Pakai `makeHuman()` dari `contoh_legpress` (paha/betis berotot, kaos, celana, sepatu, sendi dihitung) dan tampilan semi-realistis untuk adegan dengan manusia.
- **3D, bukan 2.5D.** Versi 2.5D (SVG) gunting dinilai "jelek ya, tetep lebih bagus pakai 3D": bidang datar tanpa bayangan dan bilah yang tipis terlihat murah dibanding 3D. Pakai 2.5D hanya kalau pengguna sendiri memintanya.
- Tata letak bawaan = `bedah.html` **tanpa judul/HUD atas selama video** (pengguna: "text atas itu hapus aja … ganggu banget"); subtitle rendah (±1610 px), kartu hitungan di atas saat benda di bawah. Layout sinematik/papan hanya kalau diminta. **Teks tidak boleh menutupi objek** yang sedang dijelaskan.
- Kartu diagram (inset) di bawah (top ≈ 1150–1180 px) atau di atas (top 300 px) kalau objek ada di bawah. Bingkai kamera harus menyisakan ruang untuknya.
- Teks SVG wajib `font-family="Helvetica Neue, Helvetica, Arial, sans-serif"` (kalau tidak, Chrome jatuh ke serif). Beri `paint-order="stroke"` supaya label tidak tertimpa garis.

## Model & detail
- **Cari foto benda asli dulu (luar & dalam/dibongkar)** sebelum memodelkan, lalu ikuti bentuk dan warna tiap komponen. Korek gas ditolak tiga kali ("kurang mirip real") sampai mengikuti foto: badan plastik bening berwarna (isi terlihat), tutup tombol hitam melengkung, tudung krom bercelah, unit piezo persegi + kabel biru berselubung yang ujung tembaganya jadi elektroda, sumbu putih di gas cair, tuas baja perak.
- **Bentuk harus presisi dan proporsional**: cari ukuran nyata (mm). User mengeluh "kurang detail objek dan mekaniknya" dan "bentuk masih beda banget".
- Bagian penting dibuat dengan detail nyata: bevel, sekrup + ring + mur, ulir, per, lem staples, grafir tulisan, gagang satu kontur tanpa sambungan.
- **Perhatikan detail kecil**: kabel tidak boleh menembus meja, kertas tidak boleh melayang (beri penyangga), bagian tidak boleh saling tembus, objek tidak boleh hilang di bawah alas saat diledakkan.
- Tunjukkan bagian dalam dengan potongan belah (clipping plane) atau buka/ledakkan; sisi dalam yang terbelah diberi warna pucat (lihat `celC` di contoh stapler).
- Angka di HUD harus **dihitung dari model** (sudut, mm, jumlah), bukan ditulis tangan.
- Gerak penting harus terlihat rata dan sesuai narasi (contoh: titik potong gunting harus berjalan rata dari baut ke ujung, bukan diam lalu melompat; posisi digerakkan linear, sudut diturunkan darinya).

## Bikin memikat (bukan sekadar benar)
- **2 detik pertama = makro dramatis** (percikan/benturan di ruang gelap + teks kinetik besar), bukan benda diam.
- **Momen gelap**: saat aksi kunci, latar jadi gelap dan objek diredupkan (uniform `dim` di shader garis — filter CSS kanvas TIDAK ikut terekam), bagian penting bercahaya (glow SVG), lalu cahaya kembali (contoh: api menerangi).
- **Durasi ±45–50 detik**, ±10 baris, tempo naik-turun; satu momen "waktu membeku" untuk menjelaskan prinsip.
- **Angka abstrak dibandingkan dengan yang dikenal** (ribuan volt vs stopkontak 220 V) dalam grafik batang.
- **Kaitkan ke kehidupan penonton** di penutup (pemantik kompor di dapur).
- **Teks kinetik** per kata (jatuh + membal) untuk kata kunci, menggantikan stempel biasa.
- **Efek suara nyata** dari model: `klikTombol`, `cetek`, `percik` (dur), `desis` (dur), `nyala`, `api` (dur), `gelap` di `sfx.py`.

## Tata letak layar
- **Tanpa teks di atas** (judul, angka, chip, penanda alur disembunyikan: `#hud { display: none }`): dinilai "ganggu banget". Informasi cukup dari label pil, stempel, kartu, dan subtitle.
- **Subtitle di bawah** (`#cap` top ±1610 px), objek memakai zona 240–1560 px.

## Kamera
- **Mainkan sudut kamera** (rendah/hero, samping, atas, makro) tapi pindah dengan orbit halus, bukan potongan. Tambah efek di momen kunci: kilat layar, gelombang kejut, listrik berjalan di kabel, latar menghangat saat api menyala, punch-in kecil saat benturan.
- **Kamera bergerak halus, hampir tanpa potongan** (contoh korek awal: satu potongan saja, di penutup). Video korek gas v1 dengan banyak potongan ke sudut berbeda dinilai "transisinya bikin bingung". Pindah bagian = geser + zoom pelan dari arah pandang yang sama.
- Belahan kanan cukup digeser sedikit (±30 mm ke samping, 6 mm naik), jangan dilempar jauh.
- **Jangan menggambar jari/tangan** dari kapsul sederhana: dinilai "jari tidak terlihat seperti jari". Tunjukkan tekanan lewat gerak tombol, angka, dan kartu; manusia hanya dengan `makeHuman()`.
- Bentuk benda harus mirip aslinya dulu (korek: badan elips, tudung logam berlubang), baru dibelah. Kalau sudah ada video lama untuk benda serupa (`~/Downloads/tes video/<benda>`), mulai dari kodenya.
- Mulai dari mata elang (eagle eye) lalu turun ke objek; jangan membosankan. Tiap babak punya bidikan untuk bagian yang sedang dijelaskan, tidak terlalu zoom.
- Untuk interior, kamera lebih menyamping (kemiringan > 1 di `camKeys`), untuk landasan/permukaan dari atas (0,4–0,6).

## Suara
- **Campuran audio**: musik harus ±12–15 dB di bawah narasi. Dulu musik hampir sama keras dengan suara (−17 vs −16 LUFS). Sekarang `sfx.py` menulis `efek.wav` + `musik.wav` terpisah, dan `render.mjs` mengolah narasi (high-pass, hangat 180 Hz, jernih 3,4 kHz, de-esser, kompresor), memberi ruang frekuensi suara di musik, lalu merundukkan musik setiap ada narasi (sidechain). Atur keras musik dengan `KB_MUSIK=0.4` (bawaan 0,5).
- **Suara VoiceStudio terbaik untuk bedah benda**: profil "Narator Premium · Bedah Benda" (tenang, hangat) dengan `--bagus`. Pakai ini kalau Kore (VokaStudio) kuotanya habis.
- **Musik jangan selalu sama**: pilih gaya di `musik.json` sesuai suasana (misteri untuk teka-teki, ceria untuk benda lucu, lofi untuk santai, elektronik untuk gadget).
- **VO jangan terlalu cepat**: pakai `tempo.json` (jeda kata ±0,55 s, antar baris ±0,95 s) dan `gaya.txt` yang meminta tempo lambat.
- **Naskah bermain psikologi penonton**: hook kontradiksi di 2 detik pertama ("api butuh listrik, tapi nggak ada baterai"), pertanyaan yang jawabannya ditunda, penanda "ini bagian paling ajaib", fakta kejutan di tengah, penutup yang menyambung ke awal supaya ditonton ulang.
- Musik **tidak boleh seram**: harus ada calm → punch → klimaks → calm (sudah di `sfx.py`, dikendalikan cue).
- Efek suara diturunkan dari peristiwa model (kapan bilah bertemu, kapan kaki menembus kertas, dsb.).
- Narasi pelan (lihat panduan cerita).

## Teknis
- Sinkron subtitle: narasi di-`adelay` tepat `lead` dari `words.json` (sudah di `render.mjs`). Cek akhir dengan `cek_sinkron.py` → selisih median 0,00 s.
- Gradien toon (`gradTex`) berisi `Uint8Array`: nilai > 255 meluap jadi gelap. Jangan pakai 256.
- `renderAt(t)` harus deterministik: semua keadaan dihitung dari `t` (pakai larik pra-hitung untuk hal yang "mengingat", seperti sobekan kertas atau staples yang sudah ditekuk).
- Cover = **cover hidup**: frame 0 sudah komposisi cover lengkap (judul + adegan pembuka), lalu langsung bergerak; suara mulai ±0,35 dtk; cover art MP4 tetap ditanam (supaya Threads/IG menampilkan cover). Disetujui pengguna di uji top list v4. Versi kecil: x264 CRF 27 `-tune animation`.

## Daftar periksa QC frame (sebelum render penuh)
1. Objek utama terbaca jelas di setiap babak; tidak tertutup judul, kartu, atau stempel.
2. Tidak ada benda saling tembus, melayang, atau terpotong tepi layar tanpa sengaja.
3. Label/callout tidak bertumpuk; garis callout menunjuk bagian yang benar.
4. Angka HUD masuk akal dan bergerak sesuai narasi.
5. Kartu diagram konsisten dengan model 3D (pakai fungsi geometri yang sama).
6. Warna tidak terlalu gelap; sisi dalam potongan terbaca.
