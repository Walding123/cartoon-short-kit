@echo off
rem Animantra Studio (Windows): klik dua kali file ini. Studio terbuka di browser, folder video = folder tempat file ini berada.
cd /d "%~dp0"
set "STUDIO=%USERPROFILE%\.claude\skills\animantra-vector\studio\server.mjs"
if not exist "%STUDIO%" (
  echo Animantra: Vector belum terpasang. Buka aplikasi Claude, pilih folder ini, lalu ketik: pasang
  pause & exit /b 1
)
set "NODE="
for /r "%LOCALAPPDATA%\animantra-vector\env" %%f in (node.exe) do if exist "%%f" if not defined NODE set "NODE=%%f"
if not defined NODE for %%f in (node.exe) do set "NODE=%%~$PATH:f"
if not defined NODE (
  echo Node tidak ditemukan. Jalankan pemasangan lagi ^(ketik: pasang di aplikasi Claude^).
  pause & exit /b 1
)
start "" /min cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:4580"
echo Animantra Studio berjalan di http://localhost:4580
echo Biarkan jendela ini terbuka selama memakai Studio. Tutup jendela ini untuk mematikan Studio.
"%NODE%" "%STUDIO%" --di "%CD%"
