"""교육용 합성 달. 구면 지형의 반사율을 2:1 경위도 지도로 저장합니다."""
from pathlib import Path

import numpy as np
from PIL import Image


WIDTH, HEIGHT = 1024, 512
rng = np.random.default_rng(2718)
longitude = 2 * np.pi * ((np.arange(WIDTH) + 0.5) / WIDTH - 0.5)
latitude = np.pi * (0.5 - (np.arange(HEIGHT) + 0.5) / HEIGHT)
lon, lat = np.meshgrid(longitude, latitude)
surface = np.array([np.cos(lon) * np.cos(lat), np.sin(lat), np.sin(lon) * np.cos(lat)])
field = rng.standard_normal((64, 64, 64)).astype(np.float32)


def noise(scale):
    """구 위의 3차원 격자 잡음. 이음매와 극에서도 한 지점은 한 값입니다."""
    coord = scale * surface
    base = np.floor(coord).astype(int)
    t = coord - base
    blend = t * t * (3 - 2 * t)
    values = np.zeros((HEIGHT, WIDTH))
    for bit in np.ndindex(2, 2, 2):
        corners = tuple((base[i] + bit[i]) % 64 for i in range(3))
        weight = np.prod([blend[i] if bit[i] else 1 - blend[i] for i in range(3)], axis=0)
        values += weight * field[corners]
    return values


# 바다는 낮은 반사율의 완만한 현무암 평원입니다. 불규칙한 연안이 이어지도록 겹칩니다.
broad, medium, coarse, grain, fine = (noise(scale) for scale in (5, 14, 46, 116, 235))
maria = np.zeros((HEIGHT, WIDTH))
for lon_deg, lat_deg, width, height in [
    (-28, 19, .43, .35), (-15, 3, .34, .24), (-39, -4, .27, .31),
    (-2, 30, .23, .28), (20, 18, .28, .26), (33, 8, .18, .16),
    (47, 24, .15, .13), (5, -24, .20, .14), (-70, 8, .19, .22),
    (114, -18, .29, .21), (-147, 27, .34, .24),
]:
    center_lon, center_lat = np.radians([lon_deg, lat_deg])
    delta = lon - center_lon
    east = np.cos(lat) * np.sin(delta)
    north = np.sin(lat) * np.cos(center_lat) - np.cos(lat) * np.sin(center_lat) * np.cos(delta)
    front = np.sin(lat) * np.sin(center_lat) + np.cos(lat) * np.cos(center_lat) * np.cos(delta)
    distance = np.hypot(east / width, north / height) + .19 * broad + .09 * medium
    shore = np.clip((1.1 - distance) / .24, 0, 1)
    maria = np.maximum(maria, shore * (front > 0))

albedo = 175 - 60 * maria + 7 * broad + 5 * medium
albedo += (10 * coarse + 9 * grain + 4 * fine) * (1 - .60 * maria)

# 충돌구는 표면적에 균등하게 놓되 오래된 고지대에 더 많은 흔적을 남깁니다.
# 각 충돌구 근처 행만 계산합니다. 경도는 순환하므로 날짜변경선에도 같은 윤곽이 이어집니다.
for index in range(3000):
    center_lon = rng.uniform(-np.pi, np.pi)
    center_lat = np.arcsin(rng.uniform(-1, 1))
    radius = min(.14, .007 * (1 + rng.pareto(1.45)))
    if index < 3:
        center_lon, center_lat, radius = [(.07, -.70, .069), (-.74, .11, .050), (2.93, .43, .057)][index]
    row = int((.5 - center_lat / np.pi) * HEIGHT)
    col = int((center_lon / (2 * np.pi) + .5) * WIDTH)
    if index >= 3 and rng.random() < .72 * maria[row, col]:
        continue
    is_ray_crater = index < 3
    extent = radius * (6 if is_ray_crater else 1.55)
    band = np.flatnonzero(np.abs(latitude - center_lat) <= extent)
    if not band.size:
        continue
    rows = slice(band[0], band[-1] + 1)
    delta = lon[rows] - center_lon
    half_chord = np.sin((lat[rows] - center_lat) / 2)**2
    half_chord += np.cos(lat[rows]) * np.cos(center_lat) * np.sin(delta / 2)**2
    r = 2 * np.arcsin(np.sqrt(np.clip(half_chord, 0, 1))) / radius
    profile = r + .065 * coarse[rows] * np.minimum(r, 1)
    wall = np.exp(-((profile - .88) / .15)**2)
    floor = np.exp(-(profile / .77)**4)
    amount = rng.uniform(.53, 1.16)
    albedo[rows] += amount * (32 * wall - 23 * floor)
    if radius > .04:
        albedo[rows] += amount * 15 * np.exp(-(r / .17)**2)
    if is_ray_crater:
        east = np.cos(lat[rows]) * np.sin(delta)
        north = np.sin(lat[rows]) * np.cos(center_lat) - np.cos(lat[rows]) * np.sin(center_lat) * np.cos(delta)
        bearing = np.arctan2(north, east) + .012 * medium[rows]
        rays = np.zeros_like(r)
        for angle in rng.uniform(-np.pi, np.pi, 11):
            rays = np.maximum(rays, np.exp(-((np.sin((bearing - angle) / 2) / .047)**2)))
        albedo[rows] += 26 * rays * np.exp(-r / 2) * np.clip(6-r, 0, 1)

rgb = np.stack([albedo + 3 - 3 * maria, albedo, albedo - 4 + 5 * maria], axis=-1)
destination = Path(__file__).resolve().parents[3] / 'client/src/assets/planets/moon.jpg'
Image.fromarray(np.uint8(np.clip(rgb, 0, 255))).save(destination, quality=89, optimize=True)
