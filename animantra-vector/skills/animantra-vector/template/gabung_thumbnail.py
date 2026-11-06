"""Gabung thumbnail ke video: thumbnail tampil di awal (HOLD detik), lalu silang-pudar ke video; audio digeser.
Thumbnail juga ditanam sebagai cover art MP4.
  node py.mjs gabung_thumbnail.py video.mp4 thumbnail.png keluar.mp4 [hold=1.2] [fade=0.4]   (hold 0 fade 0 = cover hidup: hanya cover art)"""
import re, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image

HERE = Path(__file__).parent
from alat import ffmpeg
FF = ffmpeg()
src, thumb, dst = sys.argv[1:4]
HOLD = float(sys.argv[4]) if len(sys.argv) > 4 else 1.2
FADE = float(sys.argv[5]) if len(sys.argv) > 5 else 0.4
def video_size(path):
    err = subprocess.run([FF, '-i', path], capture_output=True, text=True).stderr
    m = re.search(r'Video: .*?, (\d{3,5})x(\d{3,5})', err)
    return int(m.group(1)), int(m.group(2))
W, H = video_size(src); FPS = 30
th = np.asarray(Image.open(thumb).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32)
cover = HERE / 'qc/_cover.jpg'; Image.fromarray(th.astype(np.uint8)).save(cover, quality=92)

ms = int(HOLD * 1000)
dec = subprocess.Popen([FF, '-loglevel', 'error', '-i', src, '-f', 'image2pipe', '-c:v', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
# piksel mentah lewat pipa (tanpa PNG): jauh lebih cepat
enc = subprocess.Popen([FF, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', src, '-i', str(cover),
                        '-filter_complex', f'[1:a]adelay={ms}|{ms}[a]', '-map', '0:v', '-map', '[a]', '-map', '2:v',
                        '-c:v:0', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p',
                        '-c:v:1', 'mjpeg', '-disposition:v:1', 'attached_pic',
                        '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', dst], stdin=subprocess.PIPE)
hold_n, fade_n = round(HOLD * FPS), round(FADE * FPS)
thb = th.astype(np.uint8).tobytes()
for _ in range(hold_n): enc.stdin.write(thb)
size, k = W * H * 3, 0
while True:
    buf = dec.stdout.read(size)
    if len(buf) < size: break
    if k < fade_n:                                   # silang-pudar thumbnail -> video (hanya frame ini yang dihitung ulang)
        f = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32)
        x = (k + 1) / (fade_n + 1); x = x * x * (3 - 2 * x)
        buf = (th * (1 - x) + f * x).astype(np.uint8).tobytes()
    enc.stdin.write(buf); k += 1
enc.stdin.close(); enc.wait(); dec.wait()
if enc.returncode or dec.returncode: sys.exit(f'gagal: ffmpeg berhenti dengan kode {enc.returncode or dec.returncode}')
print('selesai:', dst, hold_n + k, 'frame')
