# Synthesized music bed + SFX stems for "gps". Writes work/music.wav and work/sfx.wav (48 kHz mono).
import numpy as np, wave
from scipy.signal import butter, sosfilt

SR = 48000
DUR = 60.21
N = int(DUR * SR)
rng = np.random.default_rng(11)

def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def env(n, a, r, shape=3.0):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(r, 1e-4) * shape / 3)
    return e
def put(buf, t, x, g=1.0):
    i = int(t * SR); j = min(len(buf), i + len(x))
    if i < len(buf): buf[i:j] += g * x[: j - i]
def tone(f, d, wav='sin'):
    t = np.arange(int(d * SR)) / SR; ph = 2 * np.pi * np.cumsum(np.broadcast_to(f, t.shape)) / SR if np.ndim(f) else 2 * np.pi * f * t
    if wav == 'sin': return np.sin(ph)
    if wav == 'tri': return 2 / np.pi * np.arcsin(np.sin(ph))
    if wav == 'saw': return 2 * ((ph / (2 * np.pi)) % 1) - 1
    if wav == 'sq': return np.sign(np.sin(ph))
def noise(d): return rng.standard_normal(int(d * SR))

# ---------------- SFX ----------------
def whoosh(d=0.7, lo=300, hi=2500, up=True):
    n = int(d * SR); x = noise(d); t = np.linspace(0, 1, n)
    out = np.zeros(n); seg = 8
    for k in range(seg):
        a, b = k * n // seg, (k + 1) * n // seg; c = lo + (hi - lo) * ((k + 0.5) / seg if up else 1 - (k + 0.5) / seg)
        out[a:b] = bp(x, c * 0.6, min(c * 1.6, 20000))[a:b]
    e = np.sin(np.pi * t) ** 1.5
    return out * e * 0.6
def ting(f=1760, d=1.2):
    x = sum(tone(f * m, d) * a for m, a in [(1, 1), (2.76, 0.4), (5.4, 0.2)]); return x * env(len(x), 0.002, d * 0.35) * 0.4
def sparkle(d=1.0, n=7, base=2000):
    out = np.zeros(int(d * SR) + SR)
    for k in range(n): put(out, k * d / n, ting(base * (1 + 0.25 * ((k * 5) % 7)), 0.6), 0.45)
    return out
def pop(f0=900, f1=300, d=0.09):
    n = int(d * SR); f = np.linspace(f0, f1, n); return tone(f, d) * env(n, 0.001, d * 0.5) * 0.7
def clink(f=3200):
    x = ting(f, 0.35) * 0.9; n = int(0.05 * SR); x[:n] += bp(noise(0.05), 3000, 9000) * env(n, 0.0005, 0.01) * 0.3; return x
def thunk(f=90, d=0.35):
    n = int(d * SR); x = tone(np.linspace(f * 1.6, f, n), d) * env(n, 0.001, 0.12) + lp(noise(d), 600) * env(n, 0.001, 0.04) * 0.6; return x * 0.9
def creak(d=0.6, f=180):
    n = int(d * SR); t = np.arange(n) / SR; fr = f * (1 + 0.15 * np.sin(2 * np.pi * 3 * t) + 0.3 * t / d)
    x = bp(tone(fr, d, 'saw'), 300, 2200) * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.7; return x * 0.35
def boing(f=220, d=0.5):
    n = int(d * SR); t = np.arange(n) / SR; fr = f * (1 + 0.5 * np.exp(-t * 6) * np.sin(2 * np.pi * 14 * t)); return tone(fr, d) * env(n, 0.002, 0.25) * 0.6
def slide(f0=1400, f1=300, d=1.0):
    n = int(d * SR); fr = np.geomspace(f0, f1, n) * (1 + 0.02 * np.sin(np.arange(n) / SR * 2 * np.pi * 6)); return tone(fr, d) * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.5 * 0.35
def scribble(d=1.2):
    n = int(d * SR); x = bp(noise(d), 1500, 6000); t = np.arange(n) / SR; m = (np.sin(2 * np.pi * 7 * t) > -0.2).astype(float); return lp(m, 60) * x * 0.25
def cheer(d=2.6):
    n = int(d * SR); x = bp(noise(d), 300, 3000) * 0.5
    for k in range(6): x += bp(noise(d), 500 + k * 230, 600 + k * 260) * (0.5 + 0.5 * np.sin(2 * np.pi * (2 + k * 0.7) * np.arange(n) / SR + k))
    e = np.minimum(1, np.arange(n) / (0.25 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.8 * SR)); return x * e * 0.35
def boom(d=2.5):
    n = int(d * SR); return (tone(np.linspace(70, 42, n), d) * env(n, 0.003, 1.0) + lp(noise(d), 200) * env(n, 0.002, 0.2) * 0.5) * 0.9
def stab():
    d = 0.7; n = int(d * SR); x = sum(tone(f, d, 'saw') for f in [196, 233.1, 277.2]) / 3; return lp(x, 2500) * env(n, 0.003, 0.25) * 0.6
def amb(d, lo=80, hi=500, g=0.15):
    n = int(d * SR); x = bp(noise(d), lo, hi); e = np.minimum(1, np.arange(n) / (0.5 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.5 * SR)); return x * e * g
def crickets(d):
    n = int(d * SR); t = np.arange(n) / SR; ch = (np.sin(2 * np.pi * 2.3 * t) > 0.6) * (np.sin(2 * np.pi * 28 * t) > 0)
    return tone(4600, d) * lp(ch.astype(float), 300) * 0.06

def hum(d, f=60, g=0.12):  # dengung proyektor/bioskop
    n = int(d * SR); x = lp(tone(f, d, 'saw'), 300) * 0.5 + bp(noise(d), 200, 900) * 0.4
    e = np.minimum(1, np.arange(n) / (0.4 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.4 * SR)); return x * e * g
def click():
    d = 0.06; n = int(d * SR); return (bp(noise(d), 1500, 6000) + tone(1800, d) * 0.4) * env(n, 0.0005, 0.01)
def step():
    d = 0.12; n = int(d * SR); return lp(noise(d), 700) * env(n, 0.001, 0.03) * 0.8
def buzz(d=0.35):
    n = int(d * SR); return lp(tone(140, d, 'sq') * 0.5 + tone(147, d, 'saw') * 0.5, 1500) * env(n, 0.003, 0.25) * 0.5
def ping(f=1320, d=0.9):
    n = int(d * SR); x = tone(f, d) + 0.3 * tone(f * 1.5, d); return x * env(n, 0.002, 0.35) * 0.35
def zap(d=0.6):
    return slide(2600, 500, d) * 1.2
def putt(d):
    n = int(d * SR); t = np.arange(n) / SR; g = (np.sin(2 * np.pi * 11 * t) > 0.3).astype(float)
    return lp(noise(d), 260) * lp(g, 80) * 0.9 + lp(tone(55, d, 'saw'), 200) * 0.25 * lp(g, 80)
def ocean(d, g=0.18):
    n = int(d * SR); t = np.arange(n) / SR; m = 0.55 + 0.45 * np.sin(2 * np.pi * 0.13 * t) * np.sin(2 * np.pi * 0.07 * t + 1)
    e = np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4); return bp(noise(d), 120, 1400) * m * e * g

S = np.zeros(N + SR * 3)
F = lambda f: f / 30.0
for a, b in [(0, 143), (228, 489), (570, 628), (1112, 1199), (1402, 1442), (1557, 1646), (1772, 1806)]:
    put(S, F(a), ocean(F(b - a) + 0.2), 1.0)
for a in (38, 75, 107): put(S, F(a), pop(500, 1100, 0.08), 0.6); put(S, F(a) + 0.05, buzz(0.25), 0.4)
put(S, F(141), whoosh(0.4, 600, 3500), 0.6); put(S, F(152), ting(1568, 1.0), 0.45); put(S, F(186), pop(600, 1200, 0.07), 0.5)
put(S, F(226), whoosh(0.4, 600, 3500), 0.5); put(S, F(230), boing(330, 0.5), 0.45)
put(S, F(262), whoosh(0.4, 600, 3500), 0.5); put(S, F(264), putt(F(340 - 264)), 0.55); put(S, F(266), pop(600, 1200, 0.07), 0.5)
put(S, F(338), putt(0.5) * np.linspace(1, 0, int(0.5 * SR)), 0.6); put(S, F(340), thunk(80, 0.5), 0.9); put(S, F(342), boing(180, 0.6), 0.5)
put(S, F(361), whoosh(0.6, 400, 2500), 0.5)
put(S, F(436), whoosh(0.4, 600, 3500), 0.5); put(S, F(452), click(), 0.9); put(S, F(453), ping(1760, 0.5), 0.3)
put(S, F(487), whoosh(0.4, 600, 3500), 0.5); put(S, F(493), ting(1318.5, 1.1), 0.5); put(S, F(530), pop(600, 1200, 0.07), 0.5)
put(S, F(570), whoosh(1.9, 200, 4000), 0.7); put(S, F(628), boom(1.6), 0.5); put(S, F(636), slide(400, 1400, 0.5), 0.35); put(S, F(640), pop(600, 1200, 0.07), 0.5)
put(S, F(679), whoosh(0.5, 500, 3000), 0.5); put(S, F(690), pop(600, 1200, 0.07), 0.5)
put(S, F(769), whoosh(0.9, 300, 3000), 0.5); put(S, F(771), pop(700, 1300, 0.07), 0.5)
put(S, F(802), whoosh(0.4, 600, 3500), 0.5)
for k in range(8): put(S, F(812) + k * 0.25, click(), 0.35)
for k in range(5): put(S, F(870) + k * 0.73, ping(1320, 0.8), 0.45)
put(S, F(918), pop(600, 1200, 0.07), 0.5); put(S, F(944), pop(700, 1300, 0.07), 0.5)
put(S, F(981), whoosh(0.4, 600, 3500), 0.5); put(S, F(986), pop(600, 1200, 0.07), 0.4)
put(S, F(1000), zap(1.2), 0.6); put(S, F(1036), ting(1760, 1.0), 0.45)
put(S, F(1046), click(), 0.8); put(S, F(1047), ting(2093, 0.9), 0.4)
put(S, F(1110), whoosh(0.4, 600, 3500), 0.5); put(S, F(1153), pop(600, 1200, 0.07), 0.5); put(S, F(1156), scribble(1.0), 0.5)
put(S, F(1197), whoosh(0.4, 600, 3500), 0.5)
for a in (1202, 1276, 1341): put(S, F(a), scribble(0.8), 0.5); put(S, F(a), pop(500, 1000, 0.07), 0.4)
put(S, F(1367), ting(1568, 1.2), 0.5); put(S, F(1367), sparkle(1.0, 6, 2200), 0.45)
put(S, F(1400), whoosh(0.4, 600, 3500), 0.5); put(S, F(1404), boing(260, 0.5), 0.5)
put(S, F(1440), whoosh(0.4, 600, 3500), 0.5); put(S, F(1444), pop(600, 1200, 0.07), 0.5); put(S, F(1452), buzz(0.3), 0.45)
put(S, F(1458), zap(0.9), 0.45); put(S, F(1492), ting(1760, 1.0), 0.5); put(S, F(1492), sparkle(0.8, 5, 2400), 0.4); put(S, F(1506), pop(700, 1300, 0.07), 0.5)
put(S, F(1555), whoosh(0.4, 600, 3500), 0.5); put(S, F(1560), buzz(0.4), 0.5); put(S, F(1608), thunk(90, 0.4), 0.8); put(S, F(1608), stab(), 0.45)
put(S, F(1644), whoosh(0.4, 600, 3500), 0.5); put(S, F(1660), ting(1568, 1.0), 0.5); put(S, F(1660), sparkle(1.0, 6, 2000), 0.45)
put(S, F(1698), boom(1.8), 0.7); put(S, F(1698), stab(), 0.5)
put(S, F(1712), slide(500, 1500, 0.4), 0.4); put(S, F(1728), buzz(0.35), 0.5); put(S, F(1744), pop(600, 1200, 0.07), 0.5)
put(S, F(1770), whoosh(0.5, 2500, 400, False), 0.4)
for k in range(2): put(S, F(1776) + k * 0.6, ping(1046.5 * (1 + 0.5 * k), 0.8), 0.3)
S = S[:N]

# ---------------- MUSIK: penasaran ringan, 96 bpm, C mayor ----------------
BPM = 96; beat = 60 / BPM; bar = 4 * beat
M = np.zeros(N + SR * 3)
STOP = 56.55
def nf(m): return 440 * 2 ** ((m - 69) / 12)
def pad(fs, d):
    n = int(d * SR); x = sum(tone(f, d, 'tri') + tone(f * 1.004, d, 'saw') * 0.4 for f in fs) / (1.4 * len(fs))
    e = np.minimum(1, np.arange(n) / (0.5 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.4 * SR)); return lp(x, 1100) * e * 0.4
def pluck(f, d=0.6):
    n = int(d * SR); x = tone(f, d, 'tri') + 0.25 * tone(2 * f, d); return lp(x, 2200) * env(n, 0.002, 0.25)
def kick():
    d = 0.3; n = int(d * SR); return tone(np.linspace(110, 45, n), d) * env(n, 0.001, 0.12)
def hat():
    d = 0.04; n = int(d * SR); return hp(noise(d), 7000) * env(n, 0.0005, 0.012) * 0.35
prog_ = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]   # C G Am F
arp = [0, 2, 1, 2, 0, 2, 1, 2]
t = 0.0; b = 0
while t < STOP - 0.01:
    ch = prog_[b % 4]
    put(M, t, pad([nf(m) for m in ch], bar), 0.5)
    put(M, t, pluck(nf(ch[0] - 12), 1.2), 0.45)
    for k in range(8):
        tb = t + k * beat / 2
        if tb >= STOP: break
        if t > 4.5: put(M, tb, pluck(nf(ch[arp[k]] + 12), 0.35), 0.17 if k % 2 else 0.23)
        if t > 19.0 and k % 4 == 0: put(M, tb, kick(), 0.4)
        if t > 32.5: put(M, tb + beat / 4, hat(), 0.5)
    t += bar; b += 1
M = M[:N]
i0 = int(STOP * SR); fade = int(0.05 * SR)
M[i0:i0 + fade] *= np.linspace(1, 0, fade); M[i0 + fade:] = 0
put(M, 59.1, pad([nf(m) for m in [60, 64, 67, 72]], DUR - 59.1 + 0.2), 0.5)
M = M[:N]

def wr(path, x):
    x = x / max(1e-9, np.abs(x).max()) * 0.9
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
wr('work/music.wav', M); wr('work/sfx.wav', S)
print('stems written', N / SR, 's')
