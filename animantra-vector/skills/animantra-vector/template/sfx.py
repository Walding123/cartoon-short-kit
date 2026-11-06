"""Efek suara + musik sintetis -> sfx.wav (48 kHz stereo). Waktu dari events.json (render.mjs --events).
  node py.mjs sfx.py
Bunyi dikunci ke peristiwa di events.json (type = pop, stamp, stampSnd, whoosh, snip, clack, snap, ...), musik dari isyarat cue.
Cue wajib: heart, mystery, act1, danger, drop, build, reveal, warm, dark, resolve, end."""
import json, wave
from pathlib import Path
import numpy as np

SR = 48000
HERE = Path(__file__).parent
EV = json.loads((HERE / "events.json").read_text())
DUR = EV["dur"]
N = int((DUR + 1) * SR)
out = np.zeros((N, 2), np.float32)
rng = np.random.default_rng(7)
tt = lambda sec: np.arange(int(sec * SR)) / SR


def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i < 0: sig, i = sig[-i:], 0
    sig = sig[: max(0, N - i)]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    out[i:i + len(sig), 0] += sig * gain * l * 1.414
    out[i:i + len(sig), 1] += sig * gain * r * 1.414


def hp(x, a=0.9):  # high-pass satu kutub
    y = np.empty_like(x); prev_x = prev_y = 0.0
    for i, v in enumerate(x):
        prev_y = a * (prev_y + v - prev_x); prev_x = v; y[i] = prev_y
    return y


def click(f=3400, dur=0.03, bright=1.0):
    t = tt(dur)
    ping = np.sin(2 * np.pi * f * t) * np.exp(-t * 260) + 0.6 * np.sin(2 * np.pi * f * 1.73 * t) * np.exp(-t * 380)
    n = hp(rng.standard_normal(len(t)).astype(np.float32)) * np.exp(-t * 900) * bright
    return (ping * 0.55 + n * 0.8).astype(np.float32)


def whoosh(dur=0.35, rise=True):
    t = tt(dur); n = rng.standard_normal(len(t)).astype(np.float32)
    k = 40; n = np.convolve(n, np.ones(k) / k, "same")  # low-pass kasar
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return n * env * 3.0


def thump(f=70, dur=0.28):
    t = tt(dur); fr = f * (1 + 1.5 * np.exp(-t * 30))
    return (np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 14)).astype(np.float32)


def blip(f0=880, f1=1320, dur=0.07):
    t = tt(dur); fr = np.linspace(f0, f1, len(t))
    return (np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 45)).astype(np.float32)


# --- peristiwa dari model: dengung PLN, desing switching, letupan tahap, bip LED, langkah tegangan ---
def chord_soft(freqs, dur):
    t = tt(dur); env = np.clip(t / 0.6, 0, 1) * np.clip((dur - t) / 0.8, 0, 1)
    return (sum(np.sin(2 * np.pi * f * t) for f in freqs) / len(freqs) * env).astype(np.float32)
def tone(f0, f1, dur, decay=10.0):
    t = tt(dur); fr = np.linspace(f0, f1, len(t))
    return (np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * decay)).astype(np.float32)

for e in EV["events"]:
    t, ty = e["t"], e["type"]
    if ty == "pop": add(blip(), t, 0.12, 0.2)
    elif ty == "stamp": add(thump(), t, 0.45); add(blip(520, 380, 0.12), t, 0.1)
    elif ty == "stampSnd": add(thump(60, 0.35), t + 0.03, 0.42)
    elif ty == "whoosh": add(whoosh(0.4), t - 0.1, 0.1, -0.2)
    elif ty == "lid": add(whoosh(0.6), t, 0.25); add(click(1300, 0.05, 1.8), t + 0.05, 0.4)
    elif ty == "hum":
        d = e["dur"]; tw = tt(d); env = np.clip(tw / 0.5, 0, 1) * np.clip((d - tw) / 0.8, 0, 1)
        hum = sum(np.sin(2 * np.pi * 50 * k * tw) / k for k in (2, 3, 4, 6)) * 0.35
        add((hum * env).astype(np.float32), t, 0.12)
    elif ty == "whine":
        d = e["dur"]; tw = tt(d); env = np.clip(tw / 0.6, 0, 1) * np.clip((d - tw) / 0.8, 0, 1)
        wh = np.sin(2 * np.pi * (7800 + 60 * np.sin(2 * np.pi * 3 * tw)) * tw) * 0.25 + np.sign(np.sin(2 * np.pi * 120 * tw)) * 0.03
        add((wh * env).astype(np.float32), t, 0.05)
    elif ty == "zap": add(tone(1800, 600, 0.18, 14), t, 0.18); add(hp(rng.standard_normal(int(0.08 * SR)).astype(np.float32), 0.5) * np.exp(-tt(0.08) * 50), t, 0.12)
    elif ty == "blip": add(tone(2600, 2600, 0.07, 30), t, 0.14, 0.3)
    elif ty == "step": add(tone(500, 900, 0.25, 8), t, 0.25); add(click(2000, 0.03, 1.4), t, 0.3)
    elif ty == "snip":                                    # bilah bergeser: desis logam + "cris" saat bertemu
        d = max(0.15, e["dur"]); tw = tt(d)
        sh = hp(rng.standard_normal(len(tw)).astype(np.float32), 0.75) * (0.35 + 0.65 * (tw / d)) * 0.5
        ring_ = np.sin(2 * np.pi * (3200 + 1800 * tw / d) * tw) * 0.08
        add((sh + ring_).astype(np.float32), t, 0.35, 0.15)
        add(click(5200, 0.05, 2.2), t + d, 0.55, 0.1); add(click(2600, 0.04, 1.8), t + d + 0.012, 0.35)
    elif ty == "fold":                                    # kertas tertekuk: kresek pelan, tanpa "cris"
        d = max(0.2, e["dur"]); tw = tt(d + 0.25)
        cr = np.convolve(rng.standard_normal(len(tw)).astype(np.float32), np.ones(12) / 12, 'same') * (rng.random(len(tw)) > 0.985) * 6
        add((cr * np.exp(-((tw - d) ** 2) / 0.02)).astype(np.float32), t, 0.35); add(thump(110, 0.15), t + d, 0.2)
    elif ty == "screw":                                   # baut diputar: klik ulir
        for k in range(7): add(click(1800 + 300 * (k % 2), 0.025, 1.5), t + k * 0.06, 0.28, 0.2)
    elif ty == "crack":                                   # tusuk sate patah
        add(click(1500, 0.06, 3.0), t, 0.7); add(thump(140, 0.18), t, 0.4)
        for k in range(5): add(click(900 * rng.uniform(0.8, 1.3), 0.04, 2.0), t + 0.02 + k * 0.025, 0.25)
    elif ty == "tear":                                    # serat putus / kertas terbelah
        tw = tt(0.5); n = hp(rng.standard_normal(len(tw)).astype(np.float32), 0.5) * (rng.random(len(tw)) > 0.6) * np.exp(-tw * 5)
        add((n * 0.8).astype(np.float32), t, 0.4)
    elif ty == "heart":                                   # lub-dub
        add(thump(52, 0.22), t, 0.75); add(thump(46, 0.2), t + 0.24, 0.5)
    elif ty == "flatline":
        d = max(0.6, e["dur"]); tw = tt(d); add((np.sin(2 * np.pi * 1000 * tw) * 0.22 * np.clip((d - tw) / 0.3, 0, 1)).astype(np.float32), t + 0.05, 0.22)
    elif ty == "mystery": add(chord_soft([220, 261.6, 329.6, 493.9], 2.2), t, 0.12)
    elif ty == "reveal":
        for k, f in enumerate([392, 493.9, 587.3, 784]): add(tone(f, f, 1.4, 2.6), t + k * 0.07, 0.16)
        add(thump(70, 0.4), t, 0.3)
    elif ty == "drone":
        d = e["dur"]; tw = tt(d); env = np.clip(tw / 0.4, 0, 1) * np.clip((d - tw) / 0.5, 0, 1)
        dr = (np.sin(2 * np.pi * 55 * tw) + 0.3 * np.sin(2 * np.pi * 110 * tw)) * env * (0.6 + 0.4 * np.sin(2 * np.pi * 1.6 * tw)) * 0.3
        add(dr.astype(np.float32), t, 0.12)
    elif ty == "glitch":
        for k in range(8): add(hp(rng.standard_normal(int(0.04 * SR)).astype(np.float32), 0.3) * 0.5, t + k * 0.035, 0.18, rng.uniform(-0.6, 0.6))
        add(tone(400, 80, 0.4, 6), t, 0.3)
    elif ty == "hit": add(thump(58, 0.45), t, 0.65); add(click(1400, 0.05, 2.2), t, 0.25)
    elif ty == "shrink": add(tone(900, 220, 0.9, 3), t, 0.18); add(whoosh(0.8), t, 0.15)
    elif ty == "squeeze":
        tq = tt(0.6); add((np.sign(np.sin(2 * np.pi * (30 + 30 * tq) * tq)) * np.exp(-tq * 4) * 0.25).astype(np.float32), t, 0.3)
    elif ty == "arc":
        for k in range(14): add(hp(rng.standard_normal(int(0.025 * SR)).astype(np.float32), 0.2) * rng.uniform(0.4, 1.0), t + k * 0.03 + rng.uniform(0, 0.02), 0.35, rng.uniform(-0.5, 0.5))
        add(thump(48, 0.5), t, 0.5)
    elif ty == "snap":                                    # lem staples putus: tik logam kecil
        add(click(4200, 0.03, 2.4), t, 0.45, 0.1); add(click(2600, 0.02, 1.6), t + 0.015, 0.25)
    elif ty == "pierce":                                  # kaki menembus kertas: kresek pendek
        tw = tt(0.18); n = hp(rng.standard_normal(len(tw)).astype(np.float32), 0.6) * (rng.random(len(tw)) > 0.7) * np.exp(-tw * 18)
        add((n * 0.9).astype(np.float32), t, 0.45)
    elif ty == "clack":                                   # klak stapler: pukulan logam + dentang pendek
        add(click(1700, 0.06, 2.0), t, 0.42); add(thump(120, 0.16), t, 0.4); add(tone(2400, 2300, 0.25, 18), t + 0.005, 0.12)
    elif ty == "spring":                                  # per balik: boing pendek
        tw = tt(0.35); add((np.sin(2 * np.pi * (180 + 90 * np.sin(2 * np.pi * 9 * tw)) * tw) * np.exp(-tw * 9) * 0.5).astype(np.float32), t, 0.25)
        add(click(1500, 0.03, 1.5), t, 0.2)
    elif ty == "twist":                                   # landasan diputar: klik ratchet
        for k in range(6): add(click(2200 + 200 * (k % 2), 0.025, 1.5), t + k * 0.1, 0.3, -0.1)
    elif ty == "chime":
        for k, f in enumerate([523.3, 659.3, 784.0, 1046.5]): add(tone(f, f, 1.8, 2.2), t + k * 0.12, 0.15)

    # --- bunyi gaya bedah (contoh kunci & pulpen) ---
    elif ty == "pin": add(click(4200 + 260 * e.get("i", 0), 0.025, 1.1), t, 0.32, -0.3 + 0.15 * e.get("i", 0))       # pin lewat puncak gerigi
    elif ty == "pinDrop": add(click(3300 + 200 * e.get("i", 0), 0.02, 0.8), t, 0.2, -0.3 + 0.15 * e.get("i", 0))  # pin jatuh ke dasar potongan
    elif ty == "cut": add(whoosh(0.3), t - 0.2, 0.16)                                                              # potong kamera
    elif ty == "cekrek":                                  # kunci diputar: pengait lepas, lidah masuk
        add(click(2600, 0.05, 2.0), t - 0.12, 0.7); add(click(1900, 0.06, 2.2), t - 0.02, 0.8); add(thump(110, 0.18), t, 0.45)
    elif ty == "jiggle":
        for k in range(4): add(click(1500, 0.04, 1.6), t + k * 0.13, 0.45, (-1) ** k * 0.2)
    elif ty == "oil":
        tq = tt(0.6); add(hp(rng.standard_normal(len(tq)).astype(np.float32), 0.3) * np.exp(-tq * 4) * (1 + 0.5 * np.sin(2 * np.pi * 30 * tq)), t, 0.25)
    elif ty == "sprinkle":
        for k in range(14): add(click(5200 + rng.uniform(-600, 600), 0.012, 1.5), t + k * 0.035 + rng.uniform(0, 0.02), 0.08, rng.uniform(-0.5, 0.5))
    elif ty == "rub":
        tq = tt(0.22); n = np.convolve(rng.standard_normal(len(tq)).astype(np.float32), np.ones(6) / 6, "same")
        add(n * np.sin(np.pi * tq / 0.22) ** 2 * 1.2, t, 0.12)
    elif ty == "clickDown": add(click(2200, 0.03, 1.6), t, 0.55); add(thump(160, 0.08), t, 0.25)          # tombol pulpen ditekan
    elif ty == "clickOut": add(click(3800, 0.035, 2.0), t, 0.8); add(click(3100, 0.03, 1.4), t + 0.02, 0.4)
    elif ty == "clickIn":
        tw = tt(0.35); add(click(3300, 0.035, 2.0), t, 0.8)
        add((np.sin(2 * np.pi * (180 + 60 * np.exp(-tw * 12)) * tw) * np.exp(-tw * 9) * 0.6).astype(np.float32), t + 0.01, 0.35)
    elif ty == "card": add(blip(700, 1100, 0.09), t, 0.2); add(thump(90, 0.15), t, 0.25)

    # --- bunyi korek (lebih nyata): klik plastik, tsek piezo, gemeretak percikan, desis gas, fwoomp api, dengung api ---
    elif ty == "klikTombol":                              # tombol plastik ditekan: knock badan + klik tinggi
        tq = tt(0.08); body = np.sin(2 * np.pi * 190 * tq) * np.exp(-tq * 60)
        add(body.astype(np.float32), t, 0.35); add(click(2600, 0.02, 1.2), t, 0.35); add(click(4200, 0.015, 0.8), t + 0.012, 0.18)
    elif ty == "cetek":                                   # palu kena kristal: transien sangat tajam + dering logam
        tq = tt(0.12); n = hp(hp(rng.standard_normal(len(tq)).astype(np.float32), 0.2), 0.2) * np.exp(-tq * 260)
        ring = (np.sin(2 * np.pi * 6800 * tq) + 0.6 * np.sin(2 * np.pi * 9100 * tq)) * np.exp(-tq * 55)
        add((n * 1.3 + ring * 0.35).astype(np.float32), t, 0.9); add(thump(140, 0.07), t, 0.3)
    elif ty == "percik":                                  # percikan listrik: gemeretak mikro 0,1–0,6 dtk
        d = e.get("dur", 0.18); k = 0.0
        while k < d:
            add(click(rng.uniform(5000, 9000), 0.006, 2.0), t + k, rng.uniform(0.15, 0.35), rng.uniform(-0.3, 0.3)); k += rng.uniform(0.008, 0.03)
    elif ty == "desis":                                   # gas keluar: noise pita tinggi, naik pelan
        d = e.get("dur", 0.8); tq = tt(d)
        n = hp(hp(rng.standard_normal(len(tq)).astype(np.float32), 0.6), 0.6)
        env = np.clip(tq / 0.12, 0, 1) * np.clip((d - tq) / 0.15, 0, 1)
        add((n * env * 0.5).astype(np.float32), t, 0.22, 0.15)
    elif ty == "nyala":                                   # api menyambar: fwoomp rendah
        tq = tt(0.55); n = np.convolve(rng.standard_normal(len(tq)).astype(np.float32), np.ones(28) / 28, "same")
        env = np.clip(tq / 0.05, 0, 1) * np.exp(-tq * 5)
        add((n * env * 4.0).astype(np.float32), t, 0.5); add(thump(75, 0.3), t, 0.4)
    elif ty == "api":                                     # api menyala terus: gemuruh lembut berkedip
        d = e.get("dur", 1.0); tq = tt(d)
        n = np.convolve(rng.standard_normal(len(tq)).astype(np.float32), np.ones(40) / 40, "same")
        fl = 1 + 0.35 * np.sin(2 * np.pi * 7 * tq) * np.sin(2 * np.pi * 1.3 * tq)
        env = np.clip(tq / 0.2, 0, 1) * np.clip((d - tq) / 0.25, 0, 1)
        add((n * fl * env * 2.2).astype(np.float32), t, 0.28)
    elif ty == "gelap":                                   # layar meredup: sub-drop pelan
        tq = tt(1.2); add((np.sin(2 * np.pi * np.cumsum(70 - 35 * tq / 1.2) / SR) * np.exp(-tq * 2) * 0.8).astype(np.float32), t, 0.45)

# --- skor explainer sinematik: calm -> groove -> build -> (hening) PUNCH -> energi -> KLIMAKS -> tegang ringan -> calm ---
C = {e["name"]: e["t"] for e in EV["events"] if e["type"] == "cue"}
note = lambda m: 440 * 2 ** ((m - 69) / 12)
T = np.arange(N) / SR
# gaya musik per video (musik.json di folder proyek, opsional): {"gaya": "misteri", "transpose": 0}
# sinematik (bawaan) · misteri (minor, pelan, lonceng) · ceria (mayor, cepat) · lofi (jazzy, santai) · elektronik (pulsa, rapat)
_MJ = json.loads((HERE / "musik.json").read_text()) if (HERE / "musik.json").exists() else {}
_PRE = {
    "sinematik": dict(bpm=104, ramai=1.0, prog=None),
    "misteri": dict(bpm=90, ramai=0.75, prog=([(50, [50, 53, 57, 64]), (46, [46, 50, 53, 57]), (43, [43, 46, 50, 57]), (45, [45, 49, 52, 55])],
                                             [(53, [53, 57, 60, 64]), (48, [48, 52, 55, 62]), (46, [46, 50, 53, 57]), (50, [50, 53, 57, 64])])),
    "ceria": dict(bpm=116, ramai=1.1, prog=([(48, [48, 52, 55, 62]), (55, [55, 59, 62, 67]), (57, [57, 60, 64, 71]), (53, [53, 57, 60, 64])],
                                           [(53, [53, 57, 60, 69]), (55, [55, 59, 62, 71]), (52, [52, 55, 59, 64]), (57, [57, 60, 64, 72])])),
    "lofi": dict(bpm=80, ramai=0.65, prog=([(53, [53, 57, 60, 64]), (52, [52, 55, 59, 62]), (50, [50, 53, 57, 60]), (48, [48, 52, 55, 59])],
                                          [(50, [50, 53, 57, 64]), (55, [55, 59, 62, 65]), (48, [48, 52, 55, 59]), (57, [57, 60, 64, 67])])),
    "elektronik": dict(bpm=122, ramai=1.25, prog=([(52, [52, 55, 59, 66]), (48, [48, 52, 55, 62]), (55, [55, 59, 62, 66]), (50, [50, 54, 57, 64])],
                                                 [(55, [55, 59, 62, 67]), (50, [50, 54, 57, 62]), (52, [52, 55, 59, 64]), (48, [48, 52, 55, 64])])),
}
MUSIK = _PRE.get(_MJ.get("gaya", "sinematik"), _PRE["sinematik"]); TR = int(_MJ.get("transpose", 0))
BPM = MUSIK["bpm"]; BEAT = 60 / BPM; BAR = BEAT * 4
mus = np.zeros((N, 2), np.float32)
def put(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or len(sig) == 0: return
    if i < 0: sig, i = sig[-i:], 0
    sig = sig[: N - i]; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    mus[i:i + len(sig), 0] += sig * gain * l * 1.414; mus[i:i + len(sig), 1] += sig * gain * r * 1.414
x_ = lambda d: np.arange(int(d * SR)) / SR
# --- instrumen ---
def piano(m, d=2.2, vel=1.0):
    x = x_(d); f = note(m)
    s = sum(a * np.sin(2 * np.pi * f * k * (1 + 0.0004 * k * k) * x) * np.exp(-x * (1.6 + 0.9 * k)) for k, a in [(1, 1), (2, 0.45), (3, 0.22), (4, 0.12), (5, 0.06)])
    return (s * np.clip(x / 0.004, 0, 1) * vel * 0.5).astype(np.float32)
def pad_note(m, d, att=0.8):
    x = x_(d); f = note(m)
    s = sum(np.sin(2 * np.pi * f * k * (1 + dt) * x) / k for k in range(1, 6) for dt in (-0.003, 0.003)) / 5
    env = np.clip(x / att, 0, 1) * np.clip((d - x) / 0.9, 0, 1)
    return (s * env * 0.35).astype(np.float32)
def kick(v=1.0):
    x = x_(0.45); f = 48 + 110 * np.exp(-x * 30)
    return ((np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 7) + 0.3 * np.exp(-x * 400) * rng.standard_normal(len(x))) * v).astype(np.float32)
def clap(v=1.0):
    x = x_(0.25); n = hp(rng.standard_normal(len(x)).astype(np.float32), 0.6)
    env = sum(np.exp(-np.clip(x - o, 0, None) * 60) * (x >= o) for o in (0, 0.011, 0.023)) * 0.6 + np.exp(-x * 18) * 0.5
    return (n * env * v * 0.5).astype(np.float32)
def snare(v=1.0):
    x = x_(0.22); n = hp(rng.standard_normal(len(x)).astype(np.float32), 0.5)
    return ((n * np.exp(-x * 22) * 0.6 + np.sin(2 * np.pi * 190 * x) * np.exp(-x * 30) * 0.5) * v).astype(np.float32)
def hat(v=1.0, open_=False):
    x = x_(0.3 if open_ else 0.06); n = hp(hp(rng.standard_normal(len(x)).astype(np.float32), 0.3), 0.3)
    return (n * np.exp(-x * (12 if open_ else 70)) * v * 0.35).astype(np.float32)
def shaker(v=1.0):
    x = x_(0.09); n = hp(rng.standard_normal(len(x)).astype(np.float32), 0.4)
    return (n * np.sin(np.pi * np.clip(x / 0.09, 0, 1)) ** 2 * v * 0.2).astype(np.float32)
def bass(m, d, v=1.0):
    x = x_(d); f = note(m)
    s = np.sin(2 * np.pi * f * x) + 0.35 * np.sin(4 * np.pi * f * x) + 0.12 * np.sin(6 * np.pi * f * x)
    return (s * np.clip(x / 0.01, 0, 1) * np.exp(-x * 2.5) * np.clip((d - x) / 0.03, 0, 1) * v * 0.45).astype(np.float32)
def bellnote(m, d=2.5, v=1.0):
    x = x_(d); f = note(m)
    return ((np.sin(2 * np.pi * f * x) + 0.5 * np.sin(2 * np.pi * f * 2.0 * x) * np.exp(-x * 3) + 0.25 * np.sin(2 * np.pi * f * 3.01 * x) * np.exp(-x * 5)) * np.exp(-x * 1.4) * v * 0.3).astype(np.float32)
def riser(d, v=1.0):
    x = x_(d); k = (x / d) ** 2
    n = np.convolve(rng.standard_normal(len(x)).astype(np.float32), np.ones(4) / 4, 'same')
    return ((hp(n, 0.2 + 0.7 * 0.5) * k * 0.6 + np.sin(2 * np.pi * np.cumsum(300 + 900 * k) / SR) * k * 0.15) * v).astype(np.float32)
def impact(v=1.0):
    x = x_(2.4); boom_ = np.sin(2 * np.pi * np.cumsum(36 + 80 * np.exp(-x * 9)) / SR) * np.exp(-x * 1.8)
    crash = hp(rng.standard_normal(len(x)).astype(np.float32), 0.4) * np.exp(-x * 1.6) * 0.35
    return ((boom_ + crash) * v).astype(np.float32)
def swell(d, v=1.0):   # reverse cymbal
    x = x_(d); n = hp(rng.standard_normal(len(x)).astype(np.float32), 0.4)
    return (n * (x / d) ** 3 * v * 0.4).astype(np.float32)
# --- progresi ---
AM = [(57, [57, 60, 64, 71]), (53, [53, 57, 60, 67]), (48, [48, 52, 55, 62]), (55, [55, 59, 62, 69])]   # Am9 Fmaj9 Cadd9 Gadd9
BRIGHT = [(53, [53, 57, 60, 64]), (48, [48, 52, 55, 64]), (55, [55, 59, 62, 67]), (57, [57, 60, 64, 72])]   # F C G Am (terang)
if MUSIK["prog"]: AM, BRIGHT = MUSIK["prog"]
if TR: AM, BRIGHT = ([(r + TR, [m + TR for m in ch]) for r, ch in p] for p in (AM, BRIGHT))
def bars(a, b):
    k, out_ = 0, []
    while a + k * BAR < b - 0.2: out_.append((k, a + k * BAR)); k += 1
    return out_
def chords(a, b, prog, pad_v=0.0, piano_v=0.0, arp=False, piano_oct=12):
    for k, t0 in bars(a, b):
        root, ch = prog[k % len(prog)]; d = min(BAR, b - t0)
        if pad_v: [put(pad_note(m, d + 0.6), t0, pad_v / len(ch), (i - 1.5) * 0.3) for i, m in enumerate(ch)]
        if piano_v:
            if arp:
                for j in range(8):
                    if t0 + j * BEAT / 2 < b: put(piano(ch[[0, 2, 1, 3, 2, 1, 3, 2][j]] + piano_oct, 1.6, 0.8 if j % 2 else 1.0), t0 + j * BEAT / 2, piano_v, 0.25 * (j % 3 - 1))
            else:
                put(piano(ch[0] + piano_oct - 12, 3.0), t0, piano_v); put(piano(ch[2] + piano_oct, 2.4, 0.7), t0 + BEAT * 1.5, piano_v * 0.8, 0.3); put(piano(ch[3] + piano_oct, 2.4, 0.6), t0 + BEAT * 2.5, piano_v * 0.7, -0.3)
def groove(a, b, prog, kick_pat, clap_on=False, hats=0, shaker_on=False, bass_v=0.0, snare_roll=False, v=1.0):
    for k, t0 in bars(a, b):
        root = prog[k % len(prog)][0]
        for j in range(16):
            tt0 = t0 + j * BEAT / 4
            if tt0 >= b: break
            if j in kick_pat: put(kick(), tt0, 0.55 * v)
            if clap_on and j in (4, 12): put(clap(), tt0, 0.5 * v, 0.1)
            if hats == 2 and j % 2 == 0: put(hat(0.9 if j % 4 == 2 else 0.5), tt0, 0.5 * v, 0.35)
            if hats == 1 and j % 4 == 2: put(hat(0.8), tt0, 0.45 * v, 0.35)
            if shaker_on and j % 2 == 1: put(shaker(1.0 if j % 4 == 3 else 0.6), tt0, 0.6 * v, -0.35)
            if bass_v and j % 2 == 0: put(bass(root - 12 - (0 if j % 8 else 0), BEAT / 2 * 0.92, 1.0 if j % 4 == 0 else 0.7), tt0, bass_v * v)
        if snare_roll:   # snare makin rapat di bar terakhir
            pass
_groove = groove
def groove(*a, **k): k['v'] = k.get('v', 1.0) * MUSIK['ramai']; return _groove(*a, **k)

def build(a, b, v=1.0):   # snare roll dipercepat + riser
    d = b - a; n = 0; tt0 = a
    while tt0 < b - 0.05:
        p = (tt0 - a) / d; put(snare(0.4 + 0.6 * p), tt0, 0.45 * v * (0.4 + 0.6 * p)); step = BEAT / (1 if p < 0.4 else (2 if p < 0.75 else 4)); tt0 += step
    put(riser(d), a, 0.5 * v)
# --- susunan per babak ---
s_hook, s_myst, s_act1, s_dang, s_drop, s_build, s_rev, s_warm, s_dark, s_res, s_end = (C[k] for k in ['heart', 'mystery', 'act1', 'danger', 'drop', 'build', 'reveal', 'warm', 'dark', 'resolve', 'end'])
# 1. CALM: hook, piano jarang + pad lembut (setelah garis datar)
chords(s_hook + 3.0, s_myst, AM, pad_v=0.10, piano_v=0.0)
chords(s_myst, s_act1, AM, pad_v=0.14, piano_v=0.22)
# 2. GROOVE ringan: babak 1
chords(s_act1, s_drop - 2.0, AM, pad_v=0.12, piano_v=0.18, arp=True)
groove(s_act1, s_dang, AM, kick_pat={0, 8}, hats=1, shaker_on=True, bass_v=0.35, v=0.8)
groove(s_dang, s_drop - 2.0, AM, kick_pat={0, 6, 8}, hats=2, shaker_on=True, bass_v=0.4, v=0.9)
# 3. BUILD menuju twist
build(s_drop - 2.0, s_drop - 0.05, v=0.9)
# 4. HENING lalu PUNCH
put(impact(), s_drop + 0.85, 0.55)
chords(s_drop + 0.85, s_rev - 2.6, AM, pad_v=0.14, piano_v=0.16, arp=True)
groove(s_drop + 0.85, s_build + 2.0, AM, kick_pat={0, 8}, hats=1, bass_v=0.45, v=0.95)
groove(s_build + 2.0, s_rev - 2.6, AM, kick_pat={0, 4, 8, 12}, clap_on=True, hats=2, shaker_on=True, bass_v=0.55, v=1.0)
build(s_rev - 2.6, s_rev - 0.05, v=1.0); put(swell(2.4), s_rev - 2.4, 0.5)
# 5. KLIMAKS: rahasia terjawab
put(impact(), s_rev, 0.7)
for i, m in enumerate([76, 79, 84]): put(bellnote(m, 3.0), s_rev + 0.05 + i * 0.09, 0.45)
chords(s_rev, s_dark - 1.5, BRIGHT, pad_v=0.2, piano_v=0.2, arp=True)
groove(s_rev, s_dark - 1.5, BRIGHT, kick_pat={0, 4, 8, 12}, clap_on=True, hats=2, shaker_on=True, bass_v=0.55, v=1.0)
for k, t0 in bars(s_rev, s_dark - 1.5):   # melodi lonceng di klimaks
    mel = [[72, 76, 79], [72, 74, 76], [74, 79, 83], [76, 79, 84]][k % 4]
    for j, m in enumerate(mel): put(bellnote(m, 1.6, 0.8), t0 + j * BEAT * 1.0, 0.18, 0.3 * (j - 1))
# 6. Tegang ringan: charger abal-abal (bukan seram: minor, kick setengah, bass berdenyut)
put(swell(1.5), s_dark - 1.5, 0.35)
chords(s_dark, s_res - 0.4, AM[:2], pad_v=0.14, piano_v=0.0)
groove(s_dark, s_res - 0.4, AM[:2], kick_pat={0, 8}, hats=1, bass_v=0.5, v=0.85)
build(s_res - 1.6, s_res - 0.05, v=0.6)
# 7. CALM penutup: resolusi mayor
put(impact(), s_res, 0.3)
chords(s_res, s_end - 0.2, [(53, [53, 57, 60, 64]), (48, [48, 52, 55, 64])], pad_v=0.18, piano_v=0.24)
put(bellnote(84, 4.0), s_end - 2.6, 0.35); put(bellnote(76, 4.0), s_end - 2.6, 0.25)
# --- reverb sederhana (konvolusi FFT dengan ekor eksponensial) ---
L_ = int(1.6 * SR); xr = np.arange(L_) / SR
for ch_ in (0, 1):
    ir = rng.standard_normal(L_).astype(np.float32) * np.exp(-xr * 3.2); ir[0] = 0
    n2 = 1 << int(np.ceil(np.log2(N + L_)))
    wet = np.fft.irfft(np.fft.rfft(mus[:, ch_], n2) * np.fft.rfft(ir, n2), n2)[:N]
    mus[:, ch_] = mus[:, ch_] * 0.85 + wet.astype(np.float32) * 0.035
# duck halus di bawah narasi
duck = np.ones(N, np.float32)
for l in EV["lines"]:
    a, b = int((l["s"] - 0.1) * SR), int((l["e"] + 0.15) * SR); duck[max(a, 0):b] = 0.55
k = int(0.3 * SR); duck = np.convolve(duck, np.ones(k) / k, mode="same")
mus *= duck[:, None]
# hening total di jeda twist (setelah build, sebelum punch)
mus[int((s_drop) * SR):int((s_drop + 0.85) * SR)] = 0
# simpan terpisah: efek.wav (bunyi) dan musik.wav (latar) supaya render.mjs bisa merundukkan musik di bawah narasi
def _tulis(nama, x):
    with wave.open(str(HERE / nama), "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
_tulis("efek.wav", np.tanh(out * 1.1) * 0.95)
_tulis("musik.wav", np.tanh(mus * 0.55 * 1.1) * 0.95)
out += mus * 0.55

peak = np.abs(out).max()
out = np.tanh(out * 1.1) * 0.95   # limiter lembut, klik rapat tidak bikin semuanya mengecil
with wave.open(str(HERE / "sfx.wav"), "w") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("sfx.wav", round(DUR, 2), "dtk, peak", round(float(peak), 2))
