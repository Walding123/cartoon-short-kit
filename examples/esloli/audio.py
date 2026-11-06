# Synthesized music bed + SFX stems for "esloli". Writes work/music.wav and work/sfx.wav (48 kHz mono).
import numpy as np, wave
from scipy.signal import butter, sosfilt

SR = 48000
DUR = 47.53
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

def sprinkle(d=0.6):
    n = int(d * SR); x = hp(noise(d), 4000) * (rng.random(n) > 0.97) * 3 + bp(noise(d), 3000, 9000) * 0.15
    return x * np.sin(np.pi * np.linspace(0, 1, n)) * 0.5
def steps(k=6, gap=0.13):
    out = np.zeros(int((k * gap + 0.3) * SR))
    for i in range(k): put(out, i * gap, thunk(140 + 20 * (i % 2), 0.12), 0.5)
    return out
def chirp(f=3200, d=0.12):
    n = int(d * SR); fr = np.linspace(f, f * 1.4, n); return tone(fr, d) * np.sin(np.pi * np.linspace(0, 1, n)) * 0.3
def wind(d):
    n = int(d * SR); t = np.arange(n) / SR; x = bp(noise(d), 200, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.35 * t))
    e = np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.6); return x * e * 0.3
def ice(d=1.4):
    out = np.zeros(int(d * SR) + SR)
    for k in range(10): put(out, k * d / 10 + 0.02 * (k % 3), ting(3000 + 500 * ((k * 3) % 5), 0.25), 0.35)
    return out

S = np.zeros(N + SR * 3)
F = lambda f: f / 30.0
put(S, 0.15, sparkle(1.8, 7, 2400), 0.6); put(S, 0.3, ting(1568, 1.2), 0.4)
put(S, F(73), whoosh(0.45, 600, 3000), 0.7)
put(S, F(128), boing(300, 0.5), 0.5)
put(S, F(183), whoosh(0.55, 2500, 300, False), 0.7); put(S, F(185), amb(1.9, 100, 900, 0.18))
put(S, F(241), whoosh(0.4), 0.6); put(S, F(282), ting(2093, 0.9), 0.5)
put(S, F(316), sprinkle(1.4), 0.8)
put(S, F(376), whoosh(0.35), 0.5)
for k in range(4): put(S, F(392 + k * 20), clink(3000 + 200 * (k % 2)), 0.4)
put(S, F(465), stab(), 0.5); put(S, F(466), boing(260, 0.4), 0.5)
put(S, F(482), whoosh(0.5, 400, 2000), 0.6); put(S, F(484), steps(7, 0.11), 0.6)
put(S, F(563), whoosh(0.55, 2200, 250, False), 0.7)
put(S, F(565), crickets(2.9) + wind(2.9), 1.0)
put(S, F(604), ice(1.4), 0.6)
put(S, F(648), whoosh(0.4, 600, 4000), 0.7)
for k in range(5): put(S, F(660) + k * 0.35 + 0.1 * (k % 2), chirp(3000 + 400 * (k % 3)), 0.5)
put(S, F(690), thunk(160, 0.25), 0.7); put(S, F(691), clink(2600), 0.4)
put(S, F(748), sparkle(0.9, 5, 2600), 0.5)
put(S, F(788), whoosh(0.35), 0.5)
put(S, F(832), slide(300, 1300, 0.8), 0.5); put(S, F(856), pop(500, 1300, 0.12), 0.8); put(S, F(858), sparkle(0.9, 6, 2400), 0.5)
put(S, F(893), whoosh(0.35), 0.5)
put(S, F(927), ting(2093, 1.2), 0.6); put(S, F(928), sparkle(0.9, 6, 2800), 0.5)
put(S, F(958), whoosh(0.4, 600, 3500), 0.6)
put(S, F(975), pop(600, 1100, 0.08), 0.6); put(S, F(985), pop(700, 1200, 0.08), 0.6); put(S, F(978), cheer(1.6), 0.45)
put(S, F(1028), whoosh(0.5, 500, 3000), 0.6); put(S, F(1032), cheer(1.6), 0.35)
put(S, F(1085), whoosh(0.4, 600, 4000), 0.7)
put(S, F(1090), scribble(0.85), 0.7); put(S, F(1112), scribble(0.7), 0.7)
put(S, F(1141), whoosh(0.35), 0.5)
put(S, F(1166), thunk(70, 0.5), 1.0); put(S, F(1166), stab(), 0.4)
put(S, F(1208), whoosh(0.5), 0.5); put(S, F(1212), cheer(1.8), 0.7)
put(S, F(1260), whoosh(0.4, 2000, 400, False), 0.6); put(S, F(1274), boing(220, 0.6), 0.5)
put(S, F(1308), whoosh(0.4, 600, 3000), 0.6)
put(S, F(1393), sparkle(1.3, 8, 2400), 0.7); put(S, F(1393), ting(1046.5, 1.4), 0.5); put(S, F(1396), cheer(1.3), 0.5)
S = S[:N]

# ---------------- MUSIC (bouncy porch shuffle, 104 bpm) ----------------
BPM = 104; beat = 60 / BPM; bar = 4 * beat
M = np.zeros(N + SR * 3)
STOP = 45.42
NIGHT = (F(565), F(650))
def kick():
    d = 0.3; n = int(d * SR); return tone(np.linspace(140, 50, n), d) * env(n, 0.001, 0.12)
def snare():
    d = 0.2; n = int(d * SR); return (hp(noise(d), 1500) * 0.5 + tone(190, d) * 0.3) * env(n, 0.001, 0.06)
def hat():
    d = 0.05; n = int(d * SR); return hp(noise(d), 7000) * env(n, 0.0005, 0.015) * 0.4
def pluck(f, d=0.35):
    n = int(d * SR); x = tone(f, d, 'tri') + 0.3 * tone(2 * f, d); return lp(x, 1800) * env(n, 0.002, 0.15)
def glock(f, d=0.5): return ting(f, d) * 1.2
def pad(fs, d):
    n = int(d * SR); x = sum(tone(f, d, 'saw') + tone(f * 1.006, d, 'saw') for f in fs) / (2 * len(fs))
    e = np.minimum(1, np.arange(n) / (0.15 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.2 * SR)); return lp(x, 1400) * e * 0.35
def nf(m): return 440 * 2 ** ((m - 69) / 12)
prog_ = [[53, 57, 60], [58, 62, 65], [48, 52, 55], [53, 57, 60]]  # F Bb C F
mel = [77, 81, 84, 81, 79, 77, 79, 72, 74, 77, 81, 79, 77, 76, 77, 72]
t = 0.0; b = 0
while t < STOP - 0.01:
    ch = prog_[b % 4]
    put(M, t, pad([nf(m + 12) for m in ch], bar), 0.45)
    for k in range(4):
        tb = t + k * beat
        if tb >= STOP: break
        night = NIGHT[0] <= tb < NIGHT[1]
        if not night:
            put(M, tb, kick() if k % 2 == 0 else snare(), 0.5 if k % 2 == 0 else 0.35)
            put(M, tb + beat * 0.66, hat(), 0.5)
            put(M, tb, pluck(nf(ch[0] - 12 if k % 2 == 0 else ch[2] - 12)), 0.5)
            put(M, tb + beat * 0.66, pluck(nf(ch[1]), 0.2), 0.25)
        if b >= 1:
            put(M, tb, glock(nf(mel[(b * 4 + k) % 16])), 0.16 if night else 0.22)
    t += bar; b += 1
M = M[:N]
i0 = int(STOP * SR); fade = int(0.05 * SR)
M[i0:i0 + fade] *= np.linspace(1, 0, fade); M[i0 + fade:] = 0
for k, m in enumerate([77, 81, 84, 89]): put(M, 46.45 + k * 0.1, glock(nf(m), 1.0), 0.22)
put(M, 46.45, pad([nf(m + 12) for m in [53, 57, 60]], 1.08), 0.35)
M = M[:N]

def wr(path, x):
    x = x / max(1e-9, np.abs(x).max()) * 0.9
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
wr('work/music.wav', M); wr('work/sfx.wav', S)
print('stems written', N / SR, 's')
