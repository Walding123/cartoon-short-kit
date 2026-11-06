#!/usr/bin/env bash
# Installer Animantra: Vector (skill animantra-vector) untuk macOS (Windows: install.ps1). Tidak butuh Homebrew, sudo atau password.
# Biasanya dijalankan oleh Claude sendiri saat pembeli mengetik "pasang" di chat (lihat MULAI-DI-SINI.md).
#
#   bash install.sh             pasang atau perbarui
#   bash install.sh --dry-run   tampilkan apa yang akan dilakukan, tanpa mengubah apa pun
#
# Node dan Python dipasang dari conda-forge (micromamba) ke ~/.local/share/kita-bongkar/ (atau memakai ulang
# alat dari paket Skill Edit Video / Video Penjelas bila sudah ada), skill disalin ke ~/.claude/skills/animantra-vector, lalu
# three.js, perekam video, Python dan model pengenal suara disiapkan. Aman dijalankan ulang.
# Proyek video (di folder sesi Claude) tidak pernah disentuh.

set -euo pipefail

DRY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY=1 ;;
    --help|-h) sed -n '2,11p' "$0"; exit 0 ;;
    *) echo "Opsi tidak dikenal: $arg (pakai --dry-run atau --help)"; exit 2 ;;
  esac
done

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$HOME/.claude/skills"
TARGET="$SKILLS_DIR/animantra-vector"
OLD_TARGET="$SKILLS_DIR/kita-bongkar"
BACKUP_DIR="$HOME/.claude/skills-backup"
BASE="$HOME/.local/share/kita-bongkar"
OLD_ENV="$HOME/.local/share/skill-edit-video/env"
OLD_ENV2="$HOME/.local/share/video-penjelas/env"
ENV="$BASE/env"
MAMBA="$BASE/bin/micromamba"
STAMP="$(date +%Y%m%d-%H%M%S)"
STASH="$(mktemp -d -t kbkit)"
trap 'rm -rf "$STASH"' EXIT

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
warn() { printf '  \033[33m! %s\033[0m\n' "$*"; }
fail() { printf '\n\033[31mBerhenti: %s\033[0m\n' "$*"; exit 1; }
run() { if [ "$DRY" = 1 ]; then printf '  [dry-run] %s\n' "$*"; else "$@"; fi; }

[ "$DRY" = 1 ] && bold "Dry run: tidak ada yang diubah."

# ------------------------------------------------------------------ 1. Mac ini
bold "1/4  Mengecek Mac kamu"
[ "$(uname -s)" = "Darwin" ] || fail "installer ini untuk macOS. Di Windows pakai install.ps1."
case "$(uname -m)" in arm64) PLAT=osx-arm64 ;; x86_64) PLAT=osx-64 ;; *) fail "jenis Mac tidak dikenal: $(uname -m)" ;; esac
info "macOS $(sw_vers -productVersion), $(uname -m)"
mkdir -p "$HOME/.local"
FREE_GB=$(df -g "$HOME" | awk 'NR==2 {print $4}')
info "ruang kosong: ${FREE_GB} GB (butuh sekitar 2 GB, plus sekitar 300 MB per video)"
[ "${FREE_GB:-0}" -ge 3 ] || warn "ruang kosong kurang dari 3 GB. Instalasi bisa gagal."
[ -f "$KIT/skills/animantra-vector/SKILL.md" ] || fail "folder skills/ tidak ditemukan di samping install.sh. Unzip ulang paketnya."

# ------------------------------------------------------------------ 2. Node dan Python (tanpa Homebrew)
bold "2/4  Node dan Python (sekali saja, sekitar 400 MB)"
if [ -x "$OLD_ENV/bin/node" ] && [ -x "$OLD_ENV/bin/python3" ]; then
  ENV="$OLD_ENV"; info "memakai alat yang sudah ada dari Skill Edit Video"
elif [ -x "$OLD_ENV2/bin/node" ] && [ -x "$OLD_ENV2/bin/python3" ]; then
  ENV="$OLD_ENV2"; info "memakai alat yang sudah ada dari Skill Video Penjelas"
elif [ -x "$ENV/bin/node" ] && [ -x "$ENV/bin/python3" ]; then
  info "sudah terpasang"
else
  if [ ! -x "$MAMBA" ]; then
    info "mengunduh micromamba dari micro.mamba.pm"
    run mkdir -p "$BASE"
    if [ "$DRY" = 0 ]; then curl -fsSL "https://micro.mamba.pm/api/micromamba/$PLAT/latest" | tar -xj -C "$BASE" bin/micromamba; fi
  fi
  info "memasang dari conda-forge (bisa 2 sampai 5 menit)"
  run env MAMBA_ROOT_PREFIX="$BASE/root" "$MAMBA" create -y -q -p "$ENV" -c conda-forge "python=3.12" "nodejs=20"
fi
export PATH="$ENV/bin:$PATH"
LINE="export PATH=\"$ENV/bin:\$PATH\"  # kita-bongkar"
for rc in "$HOME/.zprofile" "$HOME/.zshrc"; do
  if ! grep -qs "# kita-bongkar" "$rc" && ! grep -qs "# video-penjelas" "$rc" && ! grep -qs "# skill-edit-video" "$rc"; then
    if [ "$DRY" = 1 ]; then printf '  [dry-run] tambah PATH ke %s\n' "$rc"; else printf '\n%s\n' "$LINE" >> "$rc"; fi
  fi
done
info "PATH: siap"

# ------------------------------------------------------------------ 3. skill
bold "3/4  Skill ($TARGET)"
run mkdir -p "$SKILLS_DIR"
# versi lama (nama skill dulu: kita-bongkar) dan versi sekarang disimpan ke cadangan;
# bagian yang sudah disiapkan dibawa supaya tidak diunduh ulang
for OLDT in "$OLD_TARGET" "$TARGET"; do
  [ -d "$OLDT" ] || continue
  run mkdir -p "$BACKUP_DIR"
  for keep in engine/.venv engine/node_modules engine/ffmpeg; do
    if [ -e "$OLDT/$keep" ] && [ ! -e "$STASH/$keep" ]; then run mkdir -p "$(dirname "$STASH/$keep")"; run mv "$OLDT/$keep" "$STASH/$keep"; fi
  done
  run mv "$OLDT" "$BACKUP_DIR/$(basename "$OLDT")-$STAMP"
  info "versi lama disimpan di $BACKUP_DIR"
done
run cp -R "$KIT/skills/animantra-vector" "$TARGET"
if [ "$DRY" = 0 ]; then rsync -a "$STASH/" "$TARGET/"; fi

# ------------------------------------------------------------------ 4. siapkan dan cek
bold "4/4  Menyiapkan three.js, perekam video, Python dan pengenal suara (3 sampai 8 menit)"
run node "$TARGET/setup.mjs"
if [ "$DRY" = 0 ]; then
  [ -d "$TARGET/engine/node_modules/three" ] && info "three.js: ok" || fail "three.js tidak terpasang."
  "$TARGET/engine/.venv/bin/python" -c "import numpy, PIL, faster_whisper" && info "python: ok" || fail "paket Python tidak lengkap."
  [ -f "$TARGET/engine/alat.json" ] && [ -x "$TARGET/engine/ffmpeg" ] && info "ffmpeg: ok" || fail "ffmpeg tidak tersedia."
fi

bold "Selesai."
[ "$DRY" = 1 ] && echo "  (dry run: tidak ada yang diubah)"
cat <<MSG

Sekarang langsung lanjut di chat yang sama, tulis misalnya:
  buat video kita bongkar cara kerja payung otomatis

Hasil video tersimpan di folder sesi Claude ini: <folder>/<nama-benda>/
MSG
