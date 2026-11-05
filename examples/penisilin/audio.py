# Synthesized music bed + SFX stems for "penisilin". Writes work/music.wav and work/sfx.wav (48 kHz mono).
import numpy as np, wave
from scipy.signal import butter, sosfilt

SR = 48000
DUR = 76.05
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

S = np.zeros(N + SR * 3)
F = lambda f: f / 30.0
put(S, 0.25, sparkle(1.6, 6, 2200), 0.6)
put(S, F(108), whoosh(0.6, 400, 2500), 0.8)
put(S, F(168), creak(0.6), 0.7)
put(S, F(196), whoosh(0.55, 2500, 300, False), 0.7)
put(S, F(198), amb(3.4, 100, 900, 0.18))
put(S, F(300), whoosh(0.4), 0.6)
put(S, F(336), ting(2093, 1.0), 0.7)
put(S, F(366), whoosh(0.7, 2500, 400, False), 0.9)
for k in range(9): put(S, F(374) + k * 0.09 + 0.03 * (k % 3), clink(2600 + 400 * (k % 4)), 0.35)
put(S, F(433), whoosh(0.35), 0.5)
put(S, F(485), whoosh(1.0, 300, 900), 0.4)
put(S, F(586), whoosh(0.35), 0.5)
put(S, F(616), creak(0.5, 200), 0.7)
put(S, F(650), thunk(85), 0.8)
put(S, F(664), crickets(5.6) + amb(5.6, 60, 300, 0.1))
put(S, 23.6, sparkle(2.4, 10, 2600), 0.45)
put(S, F(741), whoosh(1.6, 1500, 250, False), 0.7)
put(S, F(829), whoosh(0.4, 600, 4000), 0.8)
put(S, F(831), creak(0.4, 210), 0.5); put(S, F(866), thunk(90), 0.6)
for k in range(3): put(S, F(880 + k * 24), whoosh(0.5, 600, 2000), 0.4); put(S, F(902 + k * 24), clink(2800 + 300 * k), 0.6)
put(S, F(969), stab(), 0.8); put(S, F(969), thunk(60, 0.6), 0.5)
put(S, F(1015), whoosh(0.5, 300, 2500), 0.7)
put(S, F(1045), boing(160, 0.6), 0.6); put(S, F(1048), pop(500, 200, 0.15), 0.6)
for k in range(14): put(S, F(1115) + k * 0.12, pop(1200 - 30 * k, 500, 0.06), 0.35)
put(S, F(1170), sparkle(1.2, 6, 2400), 0.55)
put(S, F(1198), ting(1568, 1.6), 0.5); put(S, F(1200), amb(1.8, 2000, 6000, 0.05))
put(S, F(1256), whoosh(0.35), 0.5)
put(S, F(1288), whoosh(0.5, 500, 2200), 0.6); put(S, F(1305), thunk(110, 0.4), 0.7); put(S, F(1306), clink(2400), 0.4)
put(S, F(1326), whoosh(0.35), 0.5)
put(S, F(1356), boing(330, 0.5), 0.5)

for k in range(8): put(S, F(1410) + k * 0.22, pop(700 + 60 * k, 500, 0.05), 0.25)  # bubbling
put(S, F(1455), pop(600, 1200, 0.08), 0.6)
put(S, F(1514), whoosh(0.4), 0.5)
put(S, F(1522), scribble(1.2), 0.7)
put(S, F(1574), whoosh(0.4), 0.5)
put(S, F(1612), pop(400, 1400, 0.12), 0.7); put(S, F(1613), sparkle(1.0, 6, 2600), 0.5)
put(S, F(1667), whoosh(0.5, 2000, 300, False), 0.6)
for k in range(8): put(S, F(1692) + k * 0.07, pop(900, 700, 0.04), 0.3)
put(S, F(1795), whoosh(0.9, 200, 1800), 0.8)
put(S, F(1808), boing(200, 0.6), 0.6); put(S, F(1812), boing(260, 0.5), 0.4)
put(S, F(1855), slide(1300, 280, 1.2), 0.6)
put(S, F(1925), whoosh(0.4, 600, 4000), 0.8)
for k in range(7): put(S, F(1972 + k * 5), pop(500 + 70 * k, 1100 + 70 * k, 0.07), 0.45)
put(S, F(1999), sparkle(1.0, 6, 2200), 0.5)
put(S, F(2025), whoosh(0.5), 0.5); put(S, F(2030), cheer(2.9), 0.8)
put(S, F(2120), boom(2.5), 1.0)
put(S, F(2187), whoosh(0.5, 400, 2600), 0.6)
put(S, F(2216), whoosh(0.9, 200, 900), 0.4)
put(S, F(2243), whoosh(0.45, 500, 3000), 0.6)
put(S, F(2247), sparkle(1.5, 8, 2400), 0.7); put(S, F(2247), ting(1046.5, 2.0), 0.5)
S = S[:N]

# ---------------- MUSIC (cheeky lab march, 112 bpm) ----------------
BPM = 112; beat = 60 / BPM; bar = 4 * beat
M = np.zeros(N + SR * 3)
STOP = 70.68
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
prog_ = [[48, 52, 55], [53, 57, 60], [55, 59, 62], [48, 52, 55]]  # C F G C
mel = [72, 74, 76, 79, 77, 76, 74, 72, 74, 76, 77, 79, 81, 79, 77, 76]
t = 0.0; b = 0
while t < STOP - 0.01:
    ch = prog_[b % 4]
    put(M, t, pad([nf(m + 12) for m in ch], bar), 0.5)
    for k in range(4):
        tb = t + k * beat
        if tb >= STOP: break
        put(M, tb, kick() if k % 2 == 0 else snare(), 0.55 if k % 2 == 0 else 0.4)
        put(M, tb, pluck(nf(ch[0] - 12 if k % 2 == 0 else ch[2] - 12)), 0.5)
        put(M, tb + beat / 2, hat(), 0.6)
        if b % 2 == 1 or b >= 4:
            put(M, tb, glock(nf(mel[(b * 4 + k) % 16])), 0.22)
            if k % 2 == 1: put(M, tb + beat / 2, glock(nf(mel[(b * 4 + k + 3) % 16] + 12) ), 0.1)
    t += bar; b += 1
M = M[:N]
# hard stop at the twist + low drone after
i0 = int(STOP * SR); fade = int(0.04 * SR)
M[i0:i0 + fade] *= np.linspace(1, 0, fade); M[i0 + fade:] = 0
dd = DUR - STOP; drone = (tone(55, dd) + 0.5 * tone(82.4, dd) + 0.3 * tone(110 * 1.003, dd, 'tri'))
nn = len(drone); drone *= np.minimum(1, np.arange(nn) / (0.6 * SR)) * np.minimum(1, (nn - np.arange(nn)) / (0.6 * SR)) * 0.25
put(M, STOP, lp(drone, 600))
# twinkle ending over the drone
for k, m in enumerate([84, 88, 91, 96]): put(M, 74.9 + k * 0.12, glock(nf(m), 0.9), 0.18)
M = M[:N]

def wr(path, x):
    x = x / max(1e-9, np.abs(x).max()) * 0.9
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
wr('work/music.wav', M); wr('work/sfx.wav', S)
print('stems written', N / SR, 's')
