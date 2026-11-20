"""합성 광구. 구면상의 입상반과 흑점을 2:1 경위도 지도로 굽습니다."""
from pathlib import Path

import numpy as np
from PIL import Image

w, h = 1536, 768
lon = 2*np.pi*(np.arange(w)+0.5)/w
lat = np.pi*(0.5-(np.arange(h)+0.5)/h)[:,None]
x = np.cos(lat)*np.cos(lon)
y = np.broadcast_to(np.sin(lat),(h,w))
z = np.cos(lat)*np.sin(lon)

# 구면 위의 같은 점은 경도 이음매 양쪽에서 같은 값을 갖습니다.
rng = np.random.default_rng(470)
field = rng.random((64,64,64)).astype('float32')
def noise(a,b,c):
    xyz = [np.broadcast_to(v,(h,w)) for v in (a,b,c)]
    base = [np.floor(v).astype(int) for v in xyz]
    blend = [v-n for v,n in zip(xyz,base)]
    blend = [t*t*(3-2*t) for t in blend]
    value = np.zeros((h,w))
    for i,j,k in np.ndindex(2,2,2):
        weights = [(s if bit else 1-s) for s,bit in zip(blend,(i,j,k))]
        value += np.prod(weights,axis=0)*field[(base[0]+i)%64,(base[1]+j)%64,(base[2]+k)%64]
    return value
large = noise(6*x,6*y,6*z)
medium = noise(19*x+large,19*y,19*z-large)
grain = noise(116*x+2*medium,116*y+large,116*z)
fine = noise(255*x,255*y,255*z)
heat = 0.27*large+0.20*medium+0.43*grain+0.10*fine
spots = np.zeros_like(heat)
for lon0,lat0,r in [(0.8,.24,.031),(.85,.22,.013),(3.6,-.31,.027),(3.65,-.30,.017),(5.1,.18,.018)]:
    u=(x-np.cos(lat0)*np.cos(lon0))**2+(y-np.sin(lat0))**2+(z-np.cos(lat0)*np.sin(lon0))**2
    spots += .52*np.exp(-u/r**2)+.35*np.exp(-u/(r*.43)**2)
rgb = np.stack([239+17*heat,150+103*heat,57+108*heat],axis=-1)*(1-.67*spots[:,:,None])
Image.fromarray(np.uint8(np.clip(rgb,0,255))).save(Path(__file__).resolve().parents[3] / 'client/src/assets/planets/sun.jpg',quality=90,optimize=True)
