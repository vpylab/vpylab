"""NASA 원본에서 수업용 JPEG와 KTX2 인코더에 넣을 PNG를 준비합니다."""

import argparse
from hashlib import sha256
from pathlib import Path

from PIL import Image


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("nasa_jpeg", type=Path)
parser.add_argument("ktx_input_png", type=Path)
args = parser.parse_args()
if sha256(args.nasa_jpeg.read_bytes()).hexdigest() != "f55226d46d27e05511f2118dc6aa24f5dbf9b6b2cddc87cc6e0e7dd067c00b11":
    parser.error("NASA Blue Marble July 2004 base map (5400 × 2700) required")
output = Path(__file__).resolve().parents[3] / "client/src/assets/planets/earth_dark.jpg"
with Image.open(args.nasa_jpeg) as image:
    earth = image.convert("RGB").resize((2048, 1024), Image.Resampling.LANCZOS)
    earth.save(output, quality=88, optimize=True)
    earth.resize((1024, 512), Image.Resampling.LANCZOS).save(args.ktx_input_png)
