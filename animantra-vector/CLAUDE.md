# Paket Animantra: Vector: petunjuk untuk Claude

Folder ini adalah paket instalasi. Penggunanya awam: jangan minta mereka membuka Terminal atau mengetik perintah. Kerjakan semuanya sendiri lewat chat, dan jelaskan dengan bahasa sederhana.

## Saat pengguna minta "pasang", "install", "mulai" atau sejenisnya

1. **Sapa singkat dan jelaskan rencananya** dalam satu kalimat: kamu akan memasang Animantra: Vector, butuh sekitar 5–10 menit, dan tidak perlu password.
2. **Jalankan installer yang cocok dengan komputernya** di background dan simpan log-nya di folder ini. Paket ini jalan di **Mac dan Windows 10/11 (64-bit)**.
   * Mac:
     ```
     bash install.sh > animantra-vector-install.log 2>&1
     ```
   * Windows: pakai **install.ps1**, jangan pernah install.sh. **Git, Git Bash, dan Python tidak perlu dipasang pengguna**: installer memasang Node dan Python sendiri, tanpa hak admin. Jangan minta pengguna memasang apa pun.
     * Kalau yang tersedia tool PowerShell (biasanya begitu di Windows tanpa Git Bash), jalankan dari folder ini:
       ```
       powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 *> animantra-vector-install.log
       ```
     * Kalau yang tersedia tool Bash (Git Bash):
       ```
       powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1 > animantra-vector-install.log 2>&1
       ```
   Kabari kemajuannya per tahap dengan bahasa awam. Tahapnya ada di log: `1/4` sampai `4/4`. Contoh: "Sedang memasang Node dan Python (2/4)…". Jangan tempel log mentah.
3. **Ruang disk**: instalasi butuh sekitar 2,5 GB kosong di drive tempat folder pengguna (biasanya C:), plus sekitar 300 MB per video. Kalau kurang dari itu, jangan mulai dulu: bilang berapa GB lagi yang perlu dikosongkan, dengan contoh sederhana (hapus file besar di Downloads, kosongkan Recycle Bin, atau jalankan **Disk Cleanup**). Setelah pengguna bilang sudah, cek lagi lalu lanjutkan.
4. **Kalau gagal**, baca log-nya, perbaiki penyebabnya kalau bisa, lalu jalankan ulang. Installer aman dijalankan ulang. Penyebab yang paling umum: ruang disk penuh, atau internet putus.
5. **Kalau sudah muncul `Selesai.`**:
   * Uji mesinnya sekali: `node ~/.claude/skills/animantra-vector/new_project.mjs contoh-stapler --contoh stapler --di "<path lengkap folder ini>"` (Windows: `node "%USERPROFILE%\.claude\skills\animantra-vector\new_project.mjs" …`, atau `$HOME` di PowerShell), lalu di folder yang dicetak jalankan `node render.mjs --still 5 38 53` dan kirim satu gambarnya ke pengguna ("Mesin videonya sudah jalan, ini contohnya").
   * Suara utama adalah **VokaStudio** (suara Kore). Kalau log menyebut VokaStudio belum dipasang, tawarkan memasangnya sekarang: pengguna membuat API key Gemini gratis lalu menempelkannya sendiri di file kunci yang Claude bukakan di TextEdit/Notepad (ikuti petunjuk di skill; key tidak pernah lewat chat). Kalau pengguna punya akun ElevenLabs, tawarkan itu juga dengan cara yang sama. Kalau mereka tidak mau, pakai **VoiceStudio** (minta mereka membuka aplikasinya); tanpa keduanya, suara bawaan Mac/Windows yang dipakai.
   * Beri tahu pengguna bahwa mereka bisa langsung lanjut **di chat ini**, misalnya dengan menulis **"buat video kita bongkar cara kerja payung otomatis"**. Jangan menyuruh membuka sesi baru, menekan **＋ New**, atau pindah folder.
   * Contoh lain ada di `PANDUAN.md`.

## Membuat video

Kalau pengguna minta video di chat ini, pakai skill **animantra-vector** langsung di sini. Semua file yang dibuat (proyek video, gambar uji, log) disimpan di folder sesi ini, satu subfolder per benda.

## Suara narasi

* **ElevenLabs** (kalau pengguna punya akun) atau **VokaStudio** (suara Kore) adalah sumber suara utama: butuh internet dan API key. **API key tidak pernah lewat chat**: pengguna mengisinya sendiri di file kunci yang dibuka di TextEdit/Notepad (`node $K/kunci.mjs elevenlabs|gemini`). Jangan minta key di chat, jangan membaca atau mengulang isinya.
* **VoiceStudio** adalah cadangan, juga saat ElevenLabs/VokaStudio gagal (kuota habis atau internet putus). Cukup buka aplikasinya.
* Tanpa keduanya, suara bawaan sistem dipakai: Mac *Damayanti*, Windows suara Bahasa Indonesia (kalau sudah ditambahkan di Pengaturan).

## Animantra Studio

Kalau pengguna minta "buka studio" (atau aplikasi/portal/riwayat video), ikuti skill › Animantra Studio: jalankan server Studio, buka http://localhost:4580, lalu pasang pendengar (Monitor) supaya permintaan dari tombol Studio dikerjakan di chat ini. Studio juga bisa dibuka dengan klik dua kali **Buka Studio.command** (Mac) atau **Buka Studio.bat** (Windows), tapi video baru baru dikerjakan setelah chat ini mendengarkan.

## Gaya Saya

Pengguna bisa membuat gaya sendiri (warna, huruf, bentuk, nama seri, logo) di Studio › **Gaya Saya**, atau minta lewat chat. Ikuti skill › Gaya Saya. Gaya aktif otomatis dipakai video baru.

## Pertanyaan lain

Jawab dari `PANDUAN.md`. Jangan mempublikasikan apa pun.
