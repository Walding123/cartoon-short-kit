# Synthesized music bed + SFX stems for "mata-gelap". Writes work/music.wav and work/sfx.wav (48 kHz mono).
import numpy as np, wave
from scipy.signal import butter, sosfilt

SR = 48000
DUR = 59.17
N = int(DUR * SR)
rng = np.random.default_rng(7)

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
def glare(d=1.2):
    n = int(d * SR); x = sum(tone(f, d) for f in [1760, 2217, 2637]) / 3 + 0.3 * hp(noise(d), 4000)
    return x * env(n, 0.002, 0.5) * 0.45

S = np.zeros(N + SR * 3)
F = lambda f: f / 30.0
put(S, F(44), click(), 1.0); put(S, F(46), whoosh(0.9, 2000, 200, False), 0.6)      # lampu padam
put(S, F(68), sparkle(1.0, 5, 1800), 0.35)
for k in range(10): put(S, F(72) + k * 0.28, click(), 0.25)                          # jam "loading"
put(S, F(158), hum(5.8, 55, 0.12))
for k in range(9): put(S, F(246) + k * 0.2, step(), 0.6)
put(S, F(304), thunk(120, 0.3), 0.9); put(S, F(305), boing(300, 0.45), 0.6)          # injak kaki
put(S, F(333), whoosh(0.4, 600, 3500), 0.6)
put(S, F(372), slide(300, 900, 0.9), 0.5)                                            # pupil melebar
put(S, F(404), sparkle(1.4, 6, 2400), 0.5)
put(S, F(476), boing(330, 0.5), 0.45)
put(S, F(522), whoosh(1.0, 300, 2500), 0.7)
for k in range(14): put(S, F(552) + k * 0.06, pop(400 + 40 * k, 900, 0.05), 0.3)    # pasukan sel bangkit
put(S, F(606), ting(1318.5, 0.9), 0.4); put(S, F(655), ting(987.8, 0.9), 0.4)
put(S, F(742), whoosh(0.8, 500, 5000), 0.8); put(S, F(748), glare(1.4), 0.6)        # cahaya terang
put(S, F(790), slide(1100, 300, 1.2), 0.5)
put(S, F(800), pop(500, 1100, 0.1), 0.5)
put(S, F(885), slide(500, 160, 1.3), 0.5)                                            # sel batang lemas
for k in range(16): a = 945 + ((k * 37) % 70) * 1.6; put(S, F(a), pop(700 + 20 * (k % 8), 1300, 0.05), 0.3)
put(S, F(1046), whoosh(0.6, 2500, 400, False), 0.5); put(S, F(1066), boing(260, 0.5), 0.5); put(S, F(1066), sparkle(0.8, 5, 2200), 0.4)
put(S, F(1088), whoosh(0.4, 600, 3500), 0.6)
put(S, F(1094), ting(1760, 1.0), 0.45)
put(S, F(1134), sparkle(1.0, 5, 2000), 0.4)
put(S, F(1176), whoosh(0.4, 600, 3500), 0.6)
put(S, F(1253), whoosh(0.4, 600, 3500), 0.6); put(S, F(1259), ting(1568, 1.0), 0.45)
put(S, F(1290), sparkle(1.2, 7, 1600), 0.45)
put(S, F(1334), whoosh(0.4, 600, 3500), 0.5)
put(S, F(1416), ting(2093, 1.0), 0.45)
put(S, F(1460), whoosh(0.4, 600, 3500), 0.6); put(S, F(1500), sparkle(1.4, 8, 2400), 0.6)
put(S, F(1546), pop(600, 900, 0.06), 0.4)
put(S, F(1589), click(), 1.0); put(S, F(1590), glare(1.6), 0.8); put(S, F(1592), stab(), 0.6)   # HP menyala
put(S, F(1656), boom(1.6), 0.8); put(S, F(1657), whoosh(0.5, 4000, 300, False), 0.6)            # rodopsin pudar
put(S, F(1698), whoosh(0.4, 600, 3500), 0.5)
put(S, F(1708), slide(1400, 200, 0.6), 0.5)                                                      # 100% -> 0%
put(S, F(1752), thunk(70, 0.5), 0.8)
S = S[:N]

# ---------------- MUSIK: misteri lembut, 84 bpm, A minor ----------------
BPM = 84; beat = 60 / BPM; bar = 4 * beat
M = np.zeros(N + SR * 3)
STOP = 56.70
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
prog_ = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]   # Am F C G
arp = [0, 1, 2, 1, 2, 1, 0, 2]
t = 0.0; b = 0
while t < STOP - 0.01:
    ch = prog_[b % 4]
    put(M, t, pad([nf(m) for m in ch], bar), 0.55)
    put(M, t, pluck(nf(ch[0] - 12), 1.2), 0.45)
    for k in range(8):
        tb = t + k * beat / 2
        if tb >= STOP: break
        if t > 5.0: put(M, tb, pluck(nf(ch[arp[k]] + 12), 0.4), 0.18 if k % 2 else 0.24)
        if t > 17.0 and k % 4 == 0: put(M, tb, kick(), 0.4)
        if t > 36.0: put(M, tb + beat / 4, hat(), 0.5)
    t += bar; b += 1
M = M[:N]
i0 = int(STOP * SR); fade = int(0.05 * SR)
M[i0:i0 + fade] *= np.linspace(1, 0, fade); M[i0 + fade:] = 0
dd = DUR - STOP; drone = tone(55, dd) + 0.5 * tone(82.4, dd)
nn = len(drone); drone *= np.minimum(1, np.arange(nn) / (0.3 * SR)) * np.minimum(1, (nn - np.arange(nn)) / (0.5 * SR)) * 0.3
put(M, STOP, lp(drone, 500))
M = M[:N]

def wr(path, x):
    x = x / max(1e-9, np.abs(x).max()) * 0.9
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
wr('work/music.wav', M); wr('work/sfx.wav', S)
print('stems written', N / SR, 's')
