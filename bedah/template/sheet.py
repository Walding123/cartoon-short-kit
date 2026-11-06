"""Gabungkan still jadi satu lembar kontak: node py.mjs sheet.py out.png a.png b.png ...
Pola seperti stills/still_*.png diperluas di sini (PowerShell tidak memperluasnya), urut menurut waktu."""
import glob, re, sys
from PIL import Image, ImageDraw
fs = [g for a in sys.argv[2:] for g in (sorted(glob.glob(a), key=lambda f: float((re.findall(r"_([\d.]+)\.png$", f) or ["0"])[0])) if any(c in a for c in "*?[") else [a])]; cols = min(5, len(fs)); rows = (len(fs) + cols - 1) // cols
w, h = 360, 640
sheet = Image.new("RGB", (cols * w, rows * h), "white")
for i, f in enumerate(fs):
    im = Image.open(f).convert("RGB").resize((w, h))
    ImageDraw.Draw(im).text((8, 8), f.split("_")[-1], fill="red")
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(sys.argv[1])
