"""목성과 토성의 구름 띠를 구면에 합성해 2:1 지도로 저장합니다."""

from pathlib import Path

import numpy as np
from PIL import Image


OUTPUT = Path(__file__).resolve().parents[3] / "client/src/assets/planets"
WIDTH, HEIGHT = 1024, 512
longitude = (np.arange(WIDTH) + 0.5) * (2 * np.pi / WIDTH) - np.pi
latitude = np.pi / 2 - (np.arange(HEIGHT) + 0.5) * (np.pi / HEIGHT)
lon, lat = np.meshgrid(longitude, latitude)


def draw_giant(name, seed, palette):
    rng = np.random.default_rng(seed)
    # 경도를 정수 주기로 감싸고 극에서는 와류를 줄여 이음새를 피합니다.
    warp = sum(
        np.cos(lat) * np.sin(k * lon + 4 * np.sin(lat * 9 + k) + rng.uniform(0, 2 * np.pi)) / k
        for k in (2, 3, 5, 9, 17)
    )
    flow = lat + 0.055 * warp
    band = (0.47 * np.cos(30 * flow) + 0.23 * np.cos(54 * flow + 1.1)
            + 0.17 * np.sin(87 * flow) + 0.09 * np.cos(166 * flow + warp))
    # 남위 22도 부근에 타원형 폭풍을 더합니다.
    storm = np.zeros_like(flow)
    if name == "jupiter":
        dx = np.arctan2(np.sin(lon - 0.4), np.cos(lon - 0.4)) / 0.24
        dy = (lat + np.radians(22)) / 0.09
        radius = np.hypot(dx, dy)
        band += 0.26 * np.exp(-((radius - 1.20) / 0.18) ** 2)
        storm = np.clip((1.1 - radius) * 5, 0, 1)
    palette = np.array(palette)
    values = np.stack([
        np.interp(band, [-0.95, -0.4, 0.1, 0.5, 0.95], channel)
        for channel in palette.T
    ], axis=-1)
    cloud_detail = (np.sin(280 * flow + 8 * warp) + 0.8 * np.sin(105 * flow - 4 * warp))
    values += cloud_detail[..., None] * (2.6 if name == "jupiter" else 1.6)
    if name == "jupiter":
        vortex = np.array([185, 99, 72]) + (12 * np.sin(15 * radius + 2 * np.arctan2(dy, dx)))[..., None]
        values = values * (1 - storm[..., None]) + vortex * storm[..., None]
    image = Image.fromarray(np.uint8(np.clip(values, 0, 255)))
    image.save(OUTPUT / f"{name}.jpg", quality=91, optimize=True)


draw_giant("jupiter", 611, [(115, 80, 69), (170, 118, 84), (212, 174, 138),
                           (239, 216, 186), (251, 236, 215)])
draw_giant("saturn", 612, [(157, 145, 116), (190, 172, 131), (216, 196, 153),
                          (230, 214, 177), (243, 232, 203)])
