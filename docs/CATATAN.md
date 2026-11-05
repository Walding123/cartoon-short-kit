# Catatan teknis (dibaca hanya saat perlu)

## Jebakan framing
- Bingkai vertikal sempit: setengah lebar = d·tan(hfov/2), hfov = 2·atan(tan(vfov/2)·0,5625). Pada 4 m & fov 40 hanya ±0,8 m. Taruh karakter dalam ±0,7 m dari titik bidik kamera.
- Pusat kepala dewasa ≈ 1,55–1,6 m (bukan 1,8). Close-up: bidik y ≈ 1,55–1,6.
- Lebar label < ~0,4 × jarak kamera, kalau tidak terpotong.
- Kartu di dalam objek 3D tertutup: sembunyikan objeknya atau taruh kartu di depan.
- Periksa: pagar/tiang di wajah, kamera menembus atap/semak, properti depan < 2 m, pilar menutupi tokoh, teks terbalik.
- Adegan malam gelap: naikkan intensitas hemi/matahari preset malam.

## Pemeran (`web/cast.js`)
- Kanvas desain 600x1000, telapak kaki y=975, kartu tinggi 2,25 m (1 unit = 0,00225 m).
- Lengan/properti depan badan digambar SETELAH kepala.
- Pose lengan: hang, spear, point, pointUp, up, wave, hip, belly, temple, lift, reach, cheek, shield, cross, thumb, hold, holdHigh, chin, shrug, magnify, toss, cheer.
- Bangun ulang: `cat web/toonbase.js web/cast.js > web/toon.js` (dilakukan `build.sh`).
- Makhluk gumpal berwajah (`critter`) bagus untuk analogi (bakteri, jamur).

## Gerak
- Kamera: smootherstep 18–45 f, easeOut untuk reveal/whip, tidak ada hold diam 4+ frame. Roll 3–5° untuk drama, guncangan 7 f untuk benturan.
- Potong keras hanya saat pindah tempat/waktu, dengan kilatan putih 6 f.
- Karakter tak pernah beku: `idle(f, seed)`, `blinkAt`, anggukan pada kata tekanan.
- Aksi: antisipasi → overshoot → menetap. DOF di close-up/medium, rack focus ~14 f.
- Cahaya: siang = normal, golden = kemunduran/drama, biru malam = misteri/penjelasan.

## Engine
- Pass: warna → normal/depth → tinta+grade → DOF. Fog include masing-masing di barisnya sendiri.
- Tinta hanya di lompatan kedalaman; langit = kedalaman jauh, bukan kartu.
- Render: Chrome `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --no-sandbox --disable-dev-shm-usage`; 720x1280 ≈ 1 dtk/frame.
- `finish.sh`: `alimiter=limit=0.78` (0.89 menghasilkan +0,3 dBTP).

## Subtitle
Inter Black 78, outline ungu tua `&H00261724`, MarginV 520, kata kunci kuning `&H3AD8FF&`, potongan 2–4 kata, minimal 0,55 dtk.

## Timing tanpa ASR
`silencedetect=noise=-35dB:d=0.18` untuk frasa (jeda ≥ 0,8 dtk = batas paragraf); `-32dB:d=0.07` untuk titik halus; interpolasi suku kata di dalam segmen.
