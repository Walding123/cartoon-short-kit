# Installer Animantra: Vector (skill animantra-vector) untuk Windows 10/11 (Mac: install.sh). Tidak butuh hak admin atau password.
# Biasanya dijalankan oleh Claude sendiri saat pembeli mengetik "pasang" di chat (lihat MULAI-DI-SINI.md).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1            pasang atau perbarui
#   powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1 -DryRun    tampilkan apa yang akan dilakukan, tanpa mengubah apa pun
#
# Node dan Python dipasang dari conda-forge (micromamba) ke %LOCALAPPDATA%\animantra-vector\, skill disalin ke
# %USERPROFILE%\.claude\skills\animantra-vector, lalu three.js, perekam video, Python dan model pengenal suara disiapkan.
# Aman dijalankan ulang. Proyek video (di folder sesi Claude) tidak pernah disentuh.
# File ini sengaja hanya berisi huruf ASCII supaya terbaca benar oleh Windows PowerShell 5.1.

param([switch]$DryRun)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

function Bold($m) { Write-Host ""; Write-Host $m }
function Info($m) { Write-Host "  $m" }
function Warn($m) { Write-Host "  ! $m" }
function Fail($m) { Write-Host ""; Write-Host "Berhenti: $m"; exit 1 }
function Run([scriptblock]$b, $label) { if ($DryRun) { Write-Host "  [dry-run] $label" } else { & $b } }

$KIT        = $PSScriptRoot
$SkillsDir  = Join-Path $HOME '.claude\skills'
$Target     = Join-Path $SkillsDir 'animantra-vector'
$OldTarget  = Join-Path $SkillsDir 'kita-bongkar'
$BackupDir  = Join-Path $HOME '.claude\skills-backup'
$Base       = Join-Path $env:LOCALAPPDATA 'animantra-vector'
$EnvDir     = Join-Path $Base 'env'
$Mamba      = Join-Path $Base 'micromamba.exe'
$Stamp      = Get-Date -Format 'yyyyMMdd-HHmmss'
$Stash      = Join-Path ([IO.Path]::GetTempPath()) "avkit-$Stamp"

if ($DryRun) { Bold 'Dry run: tidak ada yang diubah.' }

# ------------------------------------------------------------------ 1. komputer ini
Bold '1/4  Mengecek komputer kamu'
if ($env:OS -ne 'Windows_NT') { Fail 'installer ini untuk Windows. Di Mac pakai install.sh.' }
if (-not [Environment]::Is64BitOperatingSystem) { Fail 'butuh Windows 64-bit.' }
Info ("Windows {0}, {1}" -f [Environment]::OSVersion.Version, $env:PROCESSOR_ARCHITECTURE)
$drive = (Get-Item $HOME).PSDrive.Name
$freeGB = [math]::Floor((Get-PSDrive $drive).Free / 1GB)
Info "ruang kosong: $freeGB GB (butuh sekitar 2,5 GB, plus sekitar 300 MB per video)"
if ($freeGB -lt 3) { Warn "ruang kosong kurang dari 3 GB di drive ${drive}:. Instalasi bisa gagal." }
if (-not (Test-Path (Join-Path $KIT 'skills\animantra-vector\SKILL.md'))) { Fail 'folder skills\ tidak ditemukan di samping install.ps1. Ekstrak ulang paketnya.' }

# ------------------------------------------------------------------ 2. Node dan Python (tanpa hak admin)
Bold '2/4  Node dan Python (sekali saja, sekitar 400 MB)'
function Find-Exe($name) { Get-ChildItem -Path $EnvDir -Filter $name -Recurse -Depth 2 -ErrorAction SilentlyContinue | Select-Object -First 1 }
if ((Test-Path (Join-Path $EnvDir 'python.exe')) -and (Find-Exe 'node.exe')) {
  Info 'sudah terpasang'
} else {
  if (-not (Test-Path $Mamba)) {
    Info 'mengunduh micromamba dari github.com/mamba-org'
    Run { New-Item -ItemType Directory -Force -Path $Base | Out-Null
          Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/mamba-org/micromamba-releases/releases/latest/download/micromamba-win-64' -OutFile $Mamba } 'unduh micromamba'
  }
  Info 'memasang dari conda-forge (bisa 2 sampai 5 menit)'
  Run { $env:MAMBA_ROOT_PREFIX = Join-Path $Base 'root'
        & $Mamba create -y -q -p $EnvDir -c conda-forge 'python=3.12' 'nodejs=20'
        if ($LASTEXITCODE -ne 0) { Fail 'Node dan Python gagal dipasang (cek internet).' }
        & $Mamba clean -a -y -q | Out-Null } 'micromamba create python=3.12 nodejs=20 (lalu hapus cache unduhan)'
}
if (-not $DryRun) {
  $node = Find-Exe 'node.exe'
  if (-not $node) { Fail 'node.exe tidak ditemukan setelah instalasi.' }
  $paths = @($EnvDir, (Join-Path $EnvDir 'Scripts'), (Join-Path $EnvDir 'Library\bin'), $node.DirectoryName) | Select-Object -Unique
  $env:Path = (($paths -join ';') + ';' + $env:Path)
  # PATH pengguna (permanen, tanpa admin), hanya ditambah kalau belum ada
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User'); if (-not $userPath) { $userPath = '' }
  $add = $paths | Where-Object { ($userPath -split ';') -notcontains $_ }
  if ($add) { [Environment]::SetEnvironmentVariable('Path', ((@($add) + @($userPath)) -join ';').TrimEnd(';'), 'User') }
}
Info 'PATH: siap'

# ------------------------------------------------------------------ 3. skill
Bold "3/4  Skill ($Target)"
Run { New-Item -ItemType Directory -Force -Path $SkillsDir | Out-Null } 'buat folder skills'
# versi lama (nama skill dulu: kita-bongkar) dan versi sekarang disimpan ke cadangan;
# bagian yang sudah disiapkan dibawa supaya tidak diunduh ulang
foreach ($old in @($OldTarget, $Target)) {
  if (-not (Test-Path $old)) { continue }
  Run { New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
        foreach ($keep in @('engine\.venv', 'engine\node_modules')) {
          $src = Join-Path $old $keep; $dst = Join-Path $Stash $keep
          if ((Test-Path $src) -and -not (Test-Path $dst)) { New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null; Move-Item $src $dst }
        }
        Move-Item $old (Join-Path $BackupDir ((Split-Path $old -Leaf) + "-$Stamp")) } "cadangkan $old"
  Info "versi lama disimpan di $BackupDir"
}
Run { Copy-Item -Recurse (Join-Path $KIT 'skills\animantra-vector') $Target
      if (Test-Path $Stash) { foreach ($keep in @('engine\.venv', 'engine\node_modules')) { $s = Join-Path $Stash $keep; if (Test-Path $s) { $d = Join-Path $Target $keep; if (Test-Path $d) { Remove-Item -Recurse -Force $d }; Move-Item $s $d } }
                              Remove-Item -Recurse -Force $Stash -ErrorAction SilentlyContinue } } 'salin skill'

# ------------------------------------------------------------------ 4. siapkan dan cek
Bold '4/4  Menyiapkan three.js, perekam video, Python dan pengenal suara (3 sampai 8 menit)'
Run { & node (Join-Path $Target 'setup.mjs'); if ($LASTEXITCODE -ne 0) { Fail 'menyiapkan mesin gagal (lihat pesan di atas).' } } 'node setup.mjs'
if (-not $DryRun) {
  if (Test-Path (Join-Path $Target 'engine\node_modules\three')) { Info 'three.js: ok' } else { Fail 'three.js tidak terpasang.' }
  & (Join-Path $Target 'engine\.venv\Scripts\python.exe') -c 'import numpy, PIL, faster_whisper'
  if ($LASTEXITCODE -eq 0) { Info 'python: ok' } else { Fail 'paket Python tidak lengkap.' }
  if (Test-Path (Join-Path $Target 'engine\alat.json')) { Info 'ffmpeg: ok' } else { Fail 'ffmpeg tidak tersedia.' }
}

Bold 'Selesai.'
if ($DryRun) { Write-Host '  (dry run: tidak ada yang diubah)' }
Write-Host ''
Write-Host 'Sekarang langsung lanjut di chat yang sama, tulis misalnya:'
Write-Host '  buat video kita bongkar cara kerja payung otomatis'
Write-Host ''
Write-Host 'Hasil video tersimpan di folder sesi Claude ini: <folder>\<nama-benda>\'
