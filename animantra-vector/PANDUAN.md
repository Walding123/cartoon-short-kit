# Animantra: Vector · Panduan

Skill ini membuat **video edukasi vertikal (9:16), 20–80 detik, dalam 11 format**: membongkar cara kerja benda, tur satu ruangan, kisah penemuan, sudut pandang benda, tutorial, mitos vs fakta, perbandingan, top list, apa jadinya kalau, evolusi, dan kuis. Claude mengerjakan semuanya: mengecek fakta, menulis naskah yang bercerita, membuat suara narasi, membangun model 3D benda itu lengkap dengan potongan belah dan close-up mekaniknya, mengecek setiap babak, lalu merender video dengan subtitle, musik, efek suara, dan cover.

Kamu cukup mengobrol dengan Claude. Tidak perlu Terminal, tidak perlu password.

---

## 1. Yang dibutuhkan

* **Mac** (Apple Silicon atau Intel) atau **Windows 10/11 64-bit**, dengan ruang kosong sekitar 3 GB.
* **Aplikasi Claude** untuk Mac atau Windows, dengan akun yang bisa memakai tab **Code**.

Opsional, tapi membuat suaranya lebih natural:

* **API key ElevenLabs** (akun elevenlabs.io) atau **API key Gemini** (gratis, dari akun Google, untuk suara **VokaStudio**/Kore) untuk suara narasi utama. Claude memandu cara membuatnya.
* **VoiceStudio** yang berjalan di komputermu, sebagai cadangan. Tanpa keduanya, Claude memakai suara bawaan sistem (Mac: *Damayanti*; Windows: suara Bahasa Indonesia).
* **Google Chrome** untuk merekam video. Kalau tidak ada, installer mengunduh Chromium sendiri.

## 2. Pasang (sekali saja, ±10 menit)

1. Unzip `animantra-vector.zip` di folder Downloads. Mac: klik dua kali. Windows: klik kanan › **Extract All…**.
2. Buka aplikasi **Claude**, pilih tab **Code**.
3. Pilih folder **animantra-vector**.
4. Ketik di chat: **pasang**
5. Kalau Claude minta izin menjalankan perintah, klik **Izinkan**.
6. Tunggu sampai Claude bilang **selesai**. Claude juga merender satu gambar contoh (stapler) supaya kamu tahu mesinnya jalan.

## 2b. Suara narasi (sekali saja)

* **API key tidak ditempel di chat.** Claude membukakan file kunci di **TextEdit** (Mac) atau **Notepad** (Windows). Tempel key di belakang `API_KEY=`, tekan **Simpan** (Cmd+S / Ctrl+S), tutup, lalu bilang "sudah" di chat. Claude mengecek key-nya tanpa pernah menampilkannya.
* **ElevenLabs** (pilihan utama kalau punya akun): di **elevenlabs.io** › profil › **API Keys**, buat key baru. Sebaiknya aktifkan hanya izin **Text to Speech** dan pasang **batas kredit**. Mau suara tertentu? Pilih di **Voice Library**, tambahkan ke **My Voices**, lalu salin **Voice ID**-nya ke baris `VOICE_ID=` di file kunci. Paket gratis ElevenLabs tidak boleh untuk konten komersial. Ketik di chat: **pasang ElevenLabs**.
* **VokaStudio** (suara Kore): buat API key gratis di **aistudio.google.com/apikey** (masuk dengan akun Google, klik **Create API key**, salin), lalu simpan lewat file kunci seperti di atas. Ketik di chat: **pasang VokaStudio**.
* Key itu rahasia, jangan dibagikan. Kalau curiga bocor, hapus key-nya di situs layanan dan buat yang baru. Butuh internet saat membuat suara.
* **VoiceStudio** (cadangan): buka aplikasinya sebelum membuat video. Claude memakainya kalau ElevenLabs/VokaStudio belum dipasang atau sedang gagal.
* Tanpa keduanya, Claude memakai suara bawaan sistem, yang terdengar lebih kaku. Mac: *Damayanti*. Windows: tambahkan suara lewat **Pengaturan › Waktu & bahasa › Ucapan › Tambah suara › Bahasa Indonesia**.

## 3. Video pertamamu

1. Di chat yang sama tempat kamu memasang, tulis bendanya, misalnya:
   > buat video kita bongkar cara kerja payung otomatis
2. Claude bekerja sendiri, berurutan:
   1. Riset cara kerja dan ukuran asli bendanya dari beberapa sumber.
   2. Menulis naskah ±15 kalimat: dibuka dengan teka-teki, "Yuk, kita bongkar", bagian-bagiannya, rahasia mekanismenya, bonus, lalu rangkuman.
   3. Membuat suara narasi yang pelan dan jelas, lalu mengukur waktu tiap kata supaya subtitle dan animasi pas.
   4. Membangun model 3D, kamera, label, dan kartu diagram, semuanya dikunci ke kata yang sedang diucapkan.
   5. Mengecek gambar di setiap babak dan memperbaiki yang belum jelas.
   6. Efek suara, musik (tenang → menghentak → klimaks → tenang), render, cover, versi kecil, cek sinkron, caption.
3. Satu video **3D** biasanya butuh **sekitar 30–40 menit**, tergantung bendanya.

### Versi cepat: 2.5D isometrik

Mau lebih cepat? Tambahkan **"versi 2.5D"** atau **"yang cepat"**, misalnya:
> buat video kita bongkar cara kerja termos, versi 2.5D

Gayanya tetap gambar isometrik bergaris tepi dengan potongan belah, tapi digambar datar (tanpa bayangan 3D dan kamera berputar). Claude jauh lebih cepat membangun adegannya, jadi satu video biasanya selesai **sekitar 15–20 menit**. Narasi, subtitle, musik, cover, dan caption sama dengan versi 3D. Kamu juga bisa minta versi lain dari video yang sudah jadi: "buat juga versi 2.5D-nya" (narasinya dipakai ulang).

Hasilnya, di folder benda:

| File | Untuk |
|---|---|
| `<benda>.mp4` | Video utama (cover tampil 1,2 detik di awal, jadi cover otomatis di Threads/IG) |
| `<benda>_kecil.mp4` | Versi ringan untuk diunggah dari HP |
| `cover.png` | Cover / thumbnail |
| `caption.txt` | Caption utama, versi pendek, judul Shorts, dan sumber |

## 4. Jenis video (11 format)

Satu video memakai **satu format**. Semua format digambar dengan gaya 3D yang sama: model benda yang mirip aslinya, garis tepi, cahaya dan bayangan, subtitle di bawah. Sebut formatnya di kalimat permintaanmu. Kalau tidak disebut, Claude memakai **Kita Bongkar** untuk satu benda dan **Tur Lingkungan** untuk beberapa benda.

Contoh video tiap format ada di folder **contoh-video** (buka file `.mp4`-nya untuk melihat hasilnya).

| No | Format | Cocok untuk | Contoh perintah | Durasi | Contoh video |
|---|---|---|---|---|---|
| 1 | **Kita Bongkar** | cara kerja satu benda | "buat video kita bongkar cara kerja korek gas" | 45–55 dtk | `01-kita-bongkar-korek-gas.mp4` |
| 2 | **Tur Lingkungan** | beberapa benda dalam satu tempat atau aliran | "buat video tur lingkungan: perjalanan listrik di rumah" | 60–80 dtk | `02-tur-lingkungan-listrik-rumah.mp4` |
| 3 | **Story / Kisah** | sejarah penemuan, tokoh, peristiwa | "buat video story: kisah ditemukannya microwave" | 60–80 dtk | `03-story-microwave.mp4` |
| 4 | **POV "Jadi Si…"** | perjalanan dari sudut pandang benda | "buat video POV jadi setetes air dari tandon sampai keran" | 45–60 dtk | `04-pov-setetes-air.mp4` |
| 5 | **Tutorial** | langkah aman/benar melakukan sesuatu | "buat video tutorial cara aman ganti tabung gas 3 kg" | 35–50 dtk | `05-tutorial-ganti-gas-lpg.mp4` |
| 6 | **Mitos vs Fakta** | klaim populer yang perlu diuji | "buat video mitos vs fakta: charger dicolok terus boros?" | 35–50 dtk | `06-mitos-charger.mp4` |
| 7 | **A vs B** | membandingkan dua pilihan | "buat video perbandingan lampu LED vs lampu pijar" | 45–60 dtk | `07-versus-lampu-led-pijar.mp4` |
| 8 | **Top List** | daftar 3–5 hal, hitung mundur | "buat video top list 5 alat paling boros listrik" | 35–50 dtk | `08-top-list-alat-boros.mp4` |
| 9 | **Apa Jadinya Kalau…** | akibat situasi ekstrem atau salah pakai | "buat video apa jadinya kalau colokan terminal ditumpuk banyak alat" | 40–55 dtk | `09-kalau-colokan-ditumpuk.mp4` |
| 10 | **Evolusi** | perubahan benda dari masa ke masa | "buat video evolusi telepon dari engkol sampai smartphone" | 45–60 dtk | `10-evolusi-telepon.mp4` |
| 11 | **Kuis / Tebak** | seri pendek pemancing komentar | "buat video kuis: lubang kecil di bawah gembok buat apa?" | 20–30 dtk | `11-kuis-lubang-gembok.mp4` |

### Cara meminta, langkah demi langkah

1. **Pilih format dan topik**, lalu tulis dalam satu kalimat: *"buat video <format> <topik>"*. Contoh: "buat video top list 5 kebiasaan yang bikin HP cepat panas".
2. **Tambah detail kalau perlu** (boleh dilewati): siapa penontonnya ("untuk ibu rumah tangga"), durasi ("maksimal 40 detik"), suasana musik ("musik santai"), atau merek umum yang dipakai di Indonesia.
3. **Claude menunjukkan naskahnya** dalam bentuk daftar singkat, lalu lanjut sendiri. Kalau ada kalimat yang mau diubah, bilang saja.
4. **Claude mengirim lembar cuplikan** (beberapa gambar dari video). Di sini waktu terbaik untuk komentar soal bentuk benda, warna, atau posisi kamera.
5. **Video jadi**: Claude mengirim versi kecil, cover, dan caption. Semua file ada di folder baru bernama sesuai topik.

### Tips memilih topik per format

* **Kita Bongkar**: benda dengan satu "rahasia" (gembok angka, termos, payung otomatis, resleting).
* **Tur Lingkungan**: aliran yang melewati beberapa benda (air dari PDAM ke keran, gas dari tabung ke kompor).
* **Story**: penemuan yang punya momen kebetulan atau kegagalan (microwave, lampu pijar, kulkas).
* **POV**: sesuatu yang "berjalan" (setetes air, arus listrik, sinyal WiFi).
* **Tutorial**: hal yang sering salah dilakukan (ganti gas, pasang regulator, pakai APAR).
* **Mitos vs Fakta**: kepercayaan yang sering diperdebatkan (charger dicolok terus, HP dicas semalaman).
* **A vs B**: dua pilihan yang sering dibandingkan (kipas vs AC, rice cooker vs panci).
* **Top List**: peringkat yang bikin penasaran nomor 1-nya.
* **Apa Jadinya Kalau**: salah pakai yang berbahaya (colokan ditumpuk, kulkas penuh sesak).
* **Evolusi**: benda yang berubah drastis (telepon, setrika, kamera).
* **Kuis**: detail kecil pada benda sehari-hari (lubang di gembok, lubang di tutup pulpen).

## 4b. Animantra Studio: buat & lihat video tanpa chat

Studio adalah halaman di browser komputermu (tidak diunggah ke internet) untuk:
* melihat **riwayat semua video**: cover, putar video langsung, salin caption, lihat cuplikan, tampilkan di Finder;
* membuat **video baru** dari form: pilih format, tulis topik, atur durasi, suara, dan musik, lalu klik **Buat video**;
* memantau **progres** per tahap (riset, naskah, suara, model 3D, cek gambar, render dengan persen);
* mengirim **revisi** ("musiknya kurang nendang") atau **render ulang**.

Cara membuka:
* Klik dua kali **Buka Studio.command** (Mac) atau **Buka Studio.bat** (Windows) di folder ini. Di Mac, kalau muncul peringatan keamanan, klik kanan file itu › **Open** › **Open**.
* Atau ketik di chat: **buka studio**.

Studio hanya tampilan; **videonya tetap dikerjakan Claude di chat**. Jadi:
* Paling mudah: ketik **buka studio** di chat. Studio terbuka dan chat langsung "mendengarkan" (di Studio tertulis **Chat Claude terhubung**). Tombol **Buat video** di Studio akan dikerjakan Claude di chat itu, dan progresnya tampil di Studio.
* Kalau Studio dibuka lewat file **Buka Studio**, kamu tetap bisa melihat riwayat dan memutar video. Permintaan video baru menunggu sampai kamu membuka chat Claude di folder ini dan mengetik **buka studio**.
* Biarkan aplikasi Claude terbuka selama video dikerjakan. Satu video sekitar 30–60 menit, dikerjakan satu per satu. Video yang dibuat lewat chat biasa juga muncul di riwayat Studio.

### Gaya Saya: warna dan karakter videomu sendiri

Di Studio, buka tab **Gaya Saya**. Di sana kamu bisa:
* mulai dari contoh warna (Laut, Jeruk, Hutan, Anggur, Poster merah, Malam, Neon), atau cukup pilih **satu warna merek**: warna lain dihitung otomatis dan dicek supaya teks tetap mudah dibaca;
* memilih **huruf** (Tegas, Bulat ramah, Modern, Majalah, Teknis, Poster), bentuk sudut, model subtitle, model stempel bunyi, dan tebal garis tepi benda;
* menggeser nuansa warna benda 3D (hangat, dingin, pastel, berani);
* mengganti label **KITA BONGKAR** dengan nama seri sendiri, menambah kalimat penutup khas, logo (PNG), dan musik bawaan.

Pratinjau langsung berubah saat kamu mengatur. Klik **Buat gambar uji** untuk melihat gayanya di video contoh sungguhan. Klik **Simpan & pakai**: semua video baru memakai gaya itu. Kamu boleh punya beberapa gaya dan memilihnya per video di form **Video baru**. Video yang sudah jadi tidak ikut berubah.

Lewat chat juga bisa, misalnya: **"buat gaya baru warna hijau tosca, huruf bulat, nama seri BONGKAR YUK"**.

## 5. Revisi

Bilang saja seperti ke animator manusia:

* "musiknya kurang nendang"
* "kameranya terlalu dekat di bagian rahasia"
* "suaranya terlalu cepat"
* "modelnya kurang detail, bautnya tambah ring"
* "ganti judul cover jadi *Ternyata bukan karena tajam*"
* "pasang logoku sebagai watermark" (lalu kirim file PNG logomu)

Claude mengubah videonya, mengecek ulang, lalu merender ulang.

## 6. Tips

* **Benda dengan satu "rahasia"** paling enak ditonton: ada hal yang orang kira, padahal ternyata lain.
* **Cek angka.** Claude mengecek fakta dan mencantumkan sumber di caption; tetap baca ulang sebelum memposting.
* **Brand.** Model dibuat generik, bukan merek tertentu. Jangan minta meniru logo merek.

## 7. Kalau ada masalah

| Masalah | Tulis di chat |
|---|---|
| Skill tidak dikenali | "cek apakah skill animantra-vector sudah terpasang" |
| Instalasi gagal di tengah | Buka folder paketnya, ketik "pasang" lagi. Aman diulang |
| Suaranya kaku | "pasang ElevenLabs" atau "pasang VokaStudio", atau buka aplikasi VoiceStudio lalu "buat ulang suaranya pakai VoiceStudio" |
| Ada benda yang menembus / melayang | "di detik 30 kabelnya menembus meja, perbaiki" |
| Render gagal | "render gagal, cek dan perbaiki" |

## 8. Penting

* **Video buatanmu milikmu** dan boleh dipakai untuk konten komersial.
* Naskah dan model dibuat baru untuk tiap video. Jangan minta Claude menyalin video orang lain.
* Lisensi lengkap ada di `LISENSI.md`.
