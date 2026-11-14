"""Score + SFX + voice mix for the Java film. Pure numpy/scipy, original synthesis (no samples). usage: python -I mix.py -> out/mix.wav"""
import numpy as np, wave, os
from scipy.signal import resample_poly, butter, sosfilt
from scipy.io import wavfile
SR = 44100; LEAD = 1.5; DUR = 55.3; N = int(SR*DUR)
rng = np.random.default_rng(7)
t_all = np.arange(N)/SR
def add(buf, x, t0, gain=1.0, pan=0.0):
    i = int(t0*SR); 
    if i >= len(buf) or i+len(x) <= 0: return
    a = max(0, -i); b = min(len(x), len(buf)-i)
    l = np.cos((pan+1)*np.pi/4); r = np.sin((pan+1)*np.pi/4)
    buf[i+a:i+b, 0] += x[a:b]*gain*l; buf[i+a:i+b, 1] += x[a:b]*gain*r
def env(n, a, r):
    e = np.ones(n); na = max(1, int(a*SR)); nr = max(1, int(r*SR))
    e[:na] = np.linspace(0,1,na); e[-nr:] *= np.linspace(1,0,nr)[:len(e[-nr:])]; return e
def pluck(f, dur=1.4, bright=.5):
    n = int(dur*SR); p = int(SR/f); buf = rng.uniform(-1,1,p)
    buf = np.convolve(buf, np.ones(3)/3, 'same') if bright < .5 else buf
    out = np.zeros(n); out[:p] = buf
    for i in range(p, n): out[i] = .5*(out[i-p]+out[i-p+1 if i-p+1 < i else i-p])*.9985
    return out*env(n, .002, .25)
def chime(f, dur=1.8):
    t = np.arange(int(dur*SR))/SR
    x = sum(a*np.sin(2*np.pi*f*m*t)*np.exp(-t*d) for m, a, d in [(1,1,2.2),(2.76,.45,3.5),(5.4,.2,6),(8.9,.08,9)])
    return x*env(len(t), .001, .3)
def thump(f0=70, dur=.9):
    t = np.arange(int(dur*SR))/SR; f = f0*(1+1.8*np.exp(-t*14))
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*4.5)
def whoosh(dur, up=True, lo=300, hi=5000):
    n = int(dur*SR); x = rng.normal(0,1,n); out = np.zeros(n); seg = 2048
    for i in range(0, n, seg):
        k = i/n; c = lo*(hi/lo)**(k if up else 1-k)
        sos = butter(2, [max(60,c*.6), min(c*1.6, SR/2-100)], 'band', fs=SR, output='sos'); out[i:i+seg] = sosfilt(sos, x[i:i+seg])
    return out*np.sin(np.pi*np.arange(n)/n)**1.5
def tick(): 
    t = np.arange(int(.05*SR))/SR; return np.sin(2*np.pi*2400*t)*np.exp(-t*90)

music = np.zeros((N,2)); sfx = np.zeros((N,2))
# pedal: A1 + harmonics, slow swell, breathes with the camera
ped = sum(a*np.sin(2*np.pi*f*t_all + ph) for f, a, ph in [(55,.5,0),(110,.25,1),(165,.12,2),(82.4,.18,.5)])
swell = .55 + .45*np.sin(2*np.pi*t_all/13.0 - 1.2)
ped *= swell*np.clip(t_all/3,0,1)*np.clip((DUR-t_all)/3,0,1)
music[:,0] += ped*.32; music[:,1] += ped*.32
# pulse: plucked bass on quarters at 96 bpm, minor feel (A E C D), accents on beats
BEAT = 60/96; notes = [55, 82.4, 65.4, 73.4]
for k, tt in enumerate(np.arange(1.5, DUR-3, BEAT)):
    f = notes[(k//2) % 4]*(2 if k % 8 == 7 else 1)
    add(music, pluck(f, 1.2), tt, .45 if k % 2 == 0 else .3, pan=-.1)
# high drift: bowed-ish pad chord in the middle of the film
for t0, fs in [(14.5,[220,277.2,329.6]),(26,[196,246.9,293.7]),(34,[220,261.6,329.6]),(44,[174.6,220,261.6])]:
    for f in fs:
        n = int(8*SR); t = np.arange(n)/SR; x = np.sin(2*np.pi*f*t)+.4*np.sin(2*np.pi*2*f*t+.5); add(music, x*env(n,2.5,3.5)*.045, t0, 1, pan=rng.uniform(-.5,.5))
# SFX events (voice time + LEAD)
V = lambda s: s+LEAD
for i in range(5): add(sfx, chime([659,784,880,988,1175][i]), V(6.6+i*.45), .26, pan=[-.5,-.3,0,.3,.5][i])
for i in range(2): add(sfx, chime(523+i*196), V(13.8+i*.5), .22, pan=-.4); add(sfx, thump(90,.5), V(13.8+i*.5), .35)
for i in range(16): add(sfx, chime(392+ (i%5)*88), V(20.8+i*.2), .13, pan=.4); add(sfx, tick(), V(20.8+i*.2), .5, pan=.4)
add(sfx, thump(60,1.4), V(22.4), .6)
for tt, d, up in [(4.8,1.5,True),(25.1,1.5,True),(33.0,1.4,False),(49.6,1.4,True)]: add(sfx, whoosh(d, up), tt, .35)
add(sfx, whoosh(1.2, True, 200, 3000), V(0.0)-1.5+1.5, .2)
for i in range(8): add(sfx, chime(440*(1.5**(i%4))/ (1 if i<4 else 2), 1.4), V(24.2+i*.9), .1, pan=np.sin(i))   # helix: shimmer per loop group
add(sfx, thump(55,1.6), V(32.4), .7); add(sfx, whoosh(1.6, True, 150, 2500), V(32.4), .3)
for i in range(40): add(sfx, tick(), V(33.2+i*.18), .12+.3*(i/40), pan=rng.uniform(-.7,.7))
add(sfx, thump(55,1.3), V(44.4), .55); add(sfx, chime(523,2), V(44.4), .25)
for i in range(3): add(sfx, chime(659+i*100, 1.8), V(46.0+i*.35), .26, pan=-.4+i*.15); add(sfx, thump(75,.6), V(46.0+i*.35), .35)
add(sfx, thump(45,3.0), V(47.9), .6); add(sfx, chime(440,3.5), V(47.9), .3); add(sfx, chime(659,3.5), V(48.4), .22)
# voice
sr0, v = wavfile.read('voice/vo.wav'); v = v.astype(np.float64)
if v.ndim > 1: v = v.mean(1)
v = v/ (np.abs(v).max()+1e-9)
v = resample_poly(v, 441, 240)                 # 24 kHz -> 44.1 kHz
# gentle compression: soft-knee on a smoothed envelope
e = np.sqrt(np.convolve(v**2, np.ones(2205)/2205, 'same'))+1e-4
v = v*np.clip(.18/e, .35, 2.2)**.6
v = np.tanh(v*1.4)/np.tanh(1.4)
voice = np.zeros((N,2)); add(voice, v, LEAD, 1.0)
# duck music+sfx under the voice (300 Hz-4 kHz dip approximated with broadband duck)
vm = np.abs(voice[:,0]); k = int(.25*SR); smooth = np.convolve(vm, np.ones(k)/k, 'same'); duck = 1-.55*np.clip(smooth/.08,0,1)
duck = np.convolve(duck, np.ones(int(.15*SR))/int(.15*SR), 'same')
bed = (music*.9+sfx*.9)*duck[:,None]
# RMS balance: voice ~10 dB over the bed during speech
sp = np.abs(voice[:,0]) > .02
rv = np.sqrt(np.mean(voice[sp,0]**2)); rb = np.sqrt(np.mean(bed[sp,0]**2)); g = rv/(rb*10**(10/20)+1e-9)
mix = voice + bed*min(g, 1.6)
mix *= .89/np.abs(mix).max()
os.makedirs('out', exist_ok=True)
wavfile.write('out/mix.wav', SR, (mix*32767).astype(np.int16))
print('mix ok', DUR, 'voice RMS', rv, 'bed gain', min(g,1.6))
