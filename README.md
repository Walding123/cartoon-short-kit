# cartoon-short-kit

Mesin video kartun pendek vertikal 9:16 (kartu 2D "kepala kacang" di dunia 3D three.js, render lewat Chrome + SwiftShader, audio sintetis, subtitle ASS).

## Alur satu video
1. Siapkan folder `examples/<nama>/` berisi `story.js` (daftar shot), `audio.py` (isyarat musik/SFX), `subs.py` (subtitle) dan `voice.wav`.
2. `npm install` lalu `./build.sh examples/<nama>`
3. Lembar kontak: `node render.mjs stills "0-N" 360 640` lalu `python3 sheet.py` (cukup 1x).
4. Render: `node render.mjs frames "0-N" 720 1280` (±1 detik/frame, bisa `RESUME=1`).
5. Audio: `python3 examples/<nama>/audio.py` lalu `MUSIC_DB=-18 SFX_DB=-15 SFX_PEAK=0.3 python3 mix.py voice.wav work/music.wav work/sfx.wav`
6. Subtitle: `python3 examples/<nama>/subs.py`
7. Akhir: `./finish.sh "Judul" nama-file` (naik ke 1080x1920, -14 LUFS, subtitle terbakar, QA otomatis).

Revisi suara/subtitle cukup ulang langkah 5-7, tanpa render ulang.

## Struktur
- `web/` mesin: `toonbase.js` (Pen API, MIT, dari mromidev/claude-animated-shorts), `cast.js` karakter, `paint.js` tekstur, `engine.js`, `world.js` set (lab, jalan, makro, kamar).
- `examples/penisilin/` contoh lengkap (22 shot, 76 detik).
