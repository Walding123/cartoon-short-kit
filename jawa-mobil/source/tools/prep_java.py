"""Java terrain assets: height.bin (float32 m), albedo.jpg (graded S2 + depth-shaded sea), meta.json. usage: python -I prep_java.py <film dir>"""
import sys, os, json, math
import numpy as np
from PIL import Image
from scipy import ndimage
D = sys.argv[1]; RAW = os.path.join(D, 'raw'); OUT = os.path.join(D, 'assets')
Image.MAX_IMAGE_PIXELS = None
m = json.load(open(os.path.join(RAW, 'wbbox.json'))); W, S, E, N = m['bbox']
def merc(lon, lat, z):
    n = 2 ** z * 256
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
s2 = m['s2']; z = s2['z']
x0, y0 = merc(W, N, z); x1, y1 = merc(E, S, z)
img = Image.open(os.path.join(RAW, f'ws2_z{z}.jpg')).convert('RGB').crop((int(x0 - s2['tx0']*256), int(y0 - s2['ty0']*256), int(x1 - s2['tx0']*256), int(y1 - s2['ty0']*256)))
IW, IH = img.size
tm = m['terrain']; zt = tm['z']
tx0, ty0 = merc(W, N, zt); tx1, ty1 = merc(E, S, zt)
t = np.asarray(Image.open(os.path.join(RAW, f'wterrain_z{zt}.png')).convert('RGB'), np.float64)
h = t[..., 0]*256 + t[..., 1] + t[..., 2]/256 - 32768
ys = (np.arange(IH)+.5)/IH*(ty1-ty0)+ty0-tm['ty0']*256-.5; xs = (np.arange(IW)+.5)/IW*(tx1-tx0)+tx0-tm['tx0']*256-.5
X, Y = np.meshgrid(xs, ys)
hi = ndimage.map_coordinates(h, [Y, X], order=3, mode='nearest').astype(np.float32)
a = np.asarray(img, np.float32)/255
lin = a**2.2
lum = (lin*[.2126,.7152,.0722]).sum(-1, keepdims=True)
L = lum + (lin-lum)*.8
L = np.clip(L*np.array([1.06,1.0,.86])*.95, 0, 1)**1.1*1.05
water = ndimage.binary_opening(hi <= 1.0, iterations=1)
dist = ndimage.distance_transform_edt(water)
depth = np.clip(-hi, 0, 200)/200
deep = np.array([.006,.026,.058]); shallow = np.array([.03,.17,.19])
shore = np.exp(-dist/9.0)[..., None]*.8
sea = deep*(1-np.clip(depth*2.2,0,1))[...,None] + np.array([.012,.05,.09])*np.clip(depth*2.2,0,1)[...,None]
sea = sea*(1-shore) + shallow*shore
wm = ndimage.gaussian_filter(water.astype(np.float32), .8)[..., None]
alb = L*(1-wm) + sea*wm
rgb = (np.clip(alb,0,1)**(1/2.2)*255+.5)
# fade the borders into the open-ocean navy so the map has no visible rectangle edge
yy = np.minimum(np.arange(IH), IH-1-np.arange(IH))[:,None]; xx = np.minimum(np.arange(IW), IW-1-np.arange(IW))[None,:]
e = np.clip(np.minimum(yy/200.0, xx/450.0), 0, 1); e = (e*e*(3-2*e))[...,None]
navy = np.array([10,29,42], np.float32)
rgb = rgb*e + navy*(1-e)
Image.fromarray(np.clip(rgb,0,255).astype(np.uint8)).save(os.path.join(OUT,'albedo.jpg'), quality=92)
hi.astype(np.float32).tofile(os.path.join(OUT,'height.bin'))
lat0 = (S+N)/2; kmlon = 111.32*math.cos(math.radians(lat0)); kmlat = 110.6
json.dump({'GW':IW,'GH':IH,'bbox':[W,S,E,N],'kmlon':kmlon,'kmlat':kmlat,'width_km':(E-W)*kmlon,'height_km':(N-S)*kmlat}, open(os.path.join(OUT,'meta.json'),'w'))
print(IW, IH, (E-W)*kmlon, (N-S)*kmlat, float(hi.max()), float(hi.min()))
