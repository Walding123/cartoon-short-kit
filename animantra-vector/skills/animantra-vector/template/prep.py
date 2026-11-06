"""Rapikan jeda narasi, beri jeda napas di awal bab, lalu cocokkan kata naskah (narasi.txt) ke timing ASR.
  node py.mjs prep.py vo/take_s12      -> vo/narasi.wav (24 kHz mono), words.json
Butuh <take>.wav dan <take>_words.json (dari asr.py). Teks layar = narasi.txt (satu baris = satu babak).
Jeda tambahan sebelum babak penting: jeda_bab.json, mis. {"2": 0.4, "7": 0.6} (nomor baris mulai 0)."""
import difflib, json, re, subprocess, sys, wave
from pathlib import Path
import numpy as np

HERE = Path(__file__).parent
from alat import ffmpeg
FFMPEG = ffmpeg()
TAKE = sys.argv[1] if len(sys.argv) > 1 else "vo/take_s11"
TEMPO = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
MAXGAP, LINEGAP = 0.42, 0.62           # jeda maksimal di dalam baris / antar baris (detik): beri waktu mencerna
# tempo.json (opsional) memperpanjang jeda supaya narasi terasa lebih pelan, mis. {"jedaKata": 0.6, "jedaBaris": 1.0}
if (HERE / 'tempo.json').exists():
    _tp = json.load(open(HERE / 'tempo.json')); MAXGAP = _tp.get('jedaKata', MAXGAP); LINEGAP = _tp.get('jedaBaris', LINEGAP)
CHAPTERS = {int(k): v for k, v in json.load(open(HERE / 'jeda_bab.json')).items()} if (HERE / 'jeda_bab.json').exists() else {}
LEAD = 0.9   # jeda sebelum suara pertama; tempo.json "lead" menimpanya (cover hidup: suara mulai ±0,35 dtk)
if (HERE / 'tempo.json').exists(): LEAD = json.load(open(HERE / 'tempo.json')).get('lead', LEAD)

with wave.open(str(HERE / f"{TAKE}.wav")) as w:
    sr = w.getframerate()
    a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
asr = json.load(open(HERE / f"{TAKE}_words.json"))
lines = (HERE / "narasi.txt").read_text().strip().split("\n")

# --- cocokkan kata layar ke kata ASR; bentang 'replace' dibagi proporsional (mis. "40" <-> "empat puluh") ---
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
script = [(li, w) for li, l in enumerate(lines) for w in l.split()]
A, B = [norm(w) for _, w in script], [norm(w[0]) for w in asr]
times = [None] * len(A)
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
    m, k = i2 - i1, j2 - j1
    if tag == "equal" or (tag == "replace" and k > 0):
        for d in range(m):
            ja = j1 + (d * k) // m
            jb = max(ja, j1 + ((d + 1) * k) // m - 1)
            times[i1 + d] = [asr[ja][1], asr[jb][2]]
for i in range(len(times)):
    if times[i] is None:
        p = next((times[k] for k in range(i - 1, -1, -1) if times[k]), [0, 0])
        n = next((times[k] for k in range(i + 1, len(times)) if times[k]), [p[1] + .3, p[1] + .6])
        times[i] = [p[1], max(p[1] + .05, n[0])]
line_start = {}
for i, (li, _) in enumerate(script): line_start.setdefault(li, times[i][0])

# --- deteksi hening (blok 10 ms) lalu potong ---
hop = sr // 100
rms = np.sqrt(np.convolve(a ** 2, np.ones(hop) / hop, "same"))[::hop]
quiet = rms < 0.012
runs, k = [], 0
while k < len(quiet):
    if quiet[k]:
        j = k
        while j < len(quiet) and quiet[j]: j += 1
        runs.append((k / 100, j / 100)); k = j
    else: k += 1
cuts = []
for s, e in runs:
    if s <= 0.01: cuts.append((0, max(0, e - 0.02))); continue
    near_line = any(abs(e - t) < 0.35 for t in line_start.values())
    keep = LINEGAP if near_line else MAXGAP
    if e - s > keep: cuts.append((s + keep / 2, e - keep / 2))
# sisipan jeda bab: sebelum awal baris pembuka bab
inserts = sorted((line_start[li] - 0.05, g) for li, g in CHAPTERS.items() if li in line_start)

def remap(t):
    t2 = t - sum(min(e, t) - s for s, e in cuts if t > s)
    return t2 + sum(g for at, g in inserts if t >= at)

keep = np.ones(len(a), bool)
for s, e in cuts: keep[int(s * sr):int(e * sr)] = False
# rakit ulang dengan sisipan hening
pieces, last = [], 0
for at_, g in inserts:
    i = int(at_ * sr)
    pieces += [a[last:i][keep[last:i]], np.zeros(int(g * sr), np.float32)]; last = i
pieces.append(a[last:][keep[last:]])
b = np.concatenate(pieces)
tmp = HERE / "vo/_trim.wav"
with wave.open(str(tmp), "w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((np.clip(b, -1, 1) * 32767).astype(np.int16).tobytes())
if abs(TEMPO - 1) > 1e-3:
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(tmp), "-af", f"atempo={TEMPO}", str(HERE / "vo/narasi.wav")], check=True)
    tmp.unlink()
else:
    tmp.replace(HERE / "vo/narasi.wav")

words = [{"w": w, "l": li, "s": round(LEAD + remap(t[0]) / TEMPO, 3), "e": round(LEAD + remap(t[1]) / TEMPO, 3)}
         for (li, w), t in zip(script, times)]
dur = LEAD + len(b) / sr / TEMPO
json.dump({"words": words, "voDur": round(dur, 3), "lead": LEAD, "take": TAKE}, open(HERE / "words.json", "w"), ensure_ascii=False, indent=0)
print(f"{TAKE}: mentah {len(a)/sr:.1f}s -> {dur:.1f}s, {len(words)} kata")
