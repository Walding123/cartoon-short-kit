#!/bin/bash
# Animantra Studio (Mac): klik dua kali file ini. Studio terbuka di browser, folder video = folder tempat file ini berada.
cd "$(dirname "$0")" || exit 1
STUDIO="$HOME/.claude/skills/animantra-vector/studio/server.mjs"
[ -f "$STUDIO" ] || { echo "Animantra: Vector belum terpasang. Buka aplikasi Claude, pilih folder ini, lalu ketik: pasang"; read -r -p "Tekan Enter untuk menutup."; exit 1; }
NODE=""
for n in "$HOME/.local/share/kita-bongkar/env/bin/node" "$HOME/.local/share/skill-edit-video/env/bin/node" "$HOME/.local/share/video-penjelas/env/bin/node" "$(command -v node)"; do
  [ -x "$n" ] && { NODE="$n"; break; }
done
[ -n "$NODE" ] || { echo "Node tidak ditemukan. Jalankan pemasangan lagi (ketik: pasang di aplikasi Claude)."; read -r -p "Tekan Enter untuk menutup."; exit 1; }
if ! curl -s -o /dev/null http://127.0.0.1:4580/api/status; then
  "$NODE" "$STUDIO" --di "$PWD" > .studio-server.log 2>&1 &
  for _ in 1 2 3 4 5 6 7 8 9 10; do sleep 0.5; curl -s -o /dev/null http://127.0.0.1:4580/api/status && break; done
fi
open "http://localhost:4580"
echo "Animantra Studio berjalan di http://localhost:4580"
echo "Biarkan jendela ini terbuka selama memakai Studio. Tutup jendela ini untuk mematikan Studio."
wait
