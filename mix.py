# mix.py voice music sfx -> work/mix.wav ; music & sfx at 50% (-6 dB) of the voice's gated RMS, sfx peaks <= 0.7x voice peak
import sys, os, numpy as np, wave, subprocess
MDB=float(os.environ.get('MUSIC_DB','-6')); SDB=float(os.environ.get('SFX_DB','-6')); PK=float(os.environ.get('SFX_PEAK','0.7'))
SR=48000
def load(p):
    raw=subprocess.run(['ffmpeg','-v','error','-i',p,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout
    return np.frombuffer(raw,np.float32).astype(np.float64)
v,m,s=[load(p) for p in sys.argv[1:4]]
N=max(len(v),len(m),len(s)); pad=lambda x:np.pad(x,(0,N-len(x)))
v,m,s=pad(v),pad(m),pad(s)
def grms(x,gate_db=-40):
    w=int(0.05*SR); k=len(x)//w; r=np.sqrt((x[:k*w].reshape(k,w)**2).mean(1)+1e-12)
    g=r[r>r.max()*10**(gate_db/20)]; return np.sqrt((g**2).mean())
db=lambda a:20*np.log10(a)
V=grms(v); vp=np.abs(v).max()
m*=10**(MDB/20)*V/grms(m)
s*=10**(SDB/20)*V/grms(s)
cap=PK*vp
from scipy.ndimage import maximum_filter1d, uniform_filter1d
a=maximum_filter1d(np.abs(s),int(0.02*SR))
g=np.minimum(1,cap/np.maximum(a,1e-9)); g=-maximum_filter1d(-g,int(0.03*SR)); g=uniform_filter1d(g,int(0.01*SR))
s=np.clip(s*g,-cap,cap)
print(f'voice gated RMS {db(V):.1f} dBFS peak {db(vp):.1f}')
print(f'music vs voice: {db(grms(m)/V):+.1f} dB')
print(f'sfx   vs voice: {db(grms(s)/V):+.1f} dB, sfx peak {db(np.abs(s).max()/vp):+.1f} dB vs voice peak')
mix=v+m+s
with wave.open('work/mix.wav','wb') as w:
    w.setnchannels(1); w.setsampwidth(4); w.setframerate(SR)
    w.writeframes((np.clip(mix,-1,1)*2147483647).astype(np.int32).tobytes())
print('peak mix', db(np.abs(mix).max()))
