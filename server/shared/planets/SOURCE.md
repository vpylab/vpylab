# 내려받은 작품의 표면 지도 · Maps for exported projects

| 지도 | 출처와 사용 조건 |
|---|---|
| Earth | [three-globe day map](https://github.com/vasturiano/three-globe/blob/46eb4aaa1837311ab0df3f02b35129e041c11e2f/example/img/earth-day.jpg). Copyright © 2019 Vasco Asturiano. [Upstream MIT notice](../earth-day-license.js). |
| Earth Dark | Reto Stöckli, NASA Earth Observatory. The July 2004 Blue Marble Next Generation composite shows surface color. Keep this credit when sharing. [NASA base maps](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/) · [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) |
| Jupiter and Saturn | VPyLab procedural cloud models, AGPL-3.0-or-later. [Generator, seed 611/612](https://github.com/vpylab/vpylab/blob/bf68ac432ea40eeab26fa73b9fac2dc313944b3f0/scripts/research/cinematic-preview/generate-gas-giants.py) |
| Seoul Moon (lroc-color.jpg) | NASA/Goddard Space Flight Center Scientific Visualization Studio, LROC, Arizona State University. [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/) · [Source image](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg) · [Original project credits](../../../client/public/projects/seoul-moon/SOURCES.md). Packaged unchanged from the exercise at 2048 × 1024, SHA-256 `f7130a1822681fa7512d7dcfd40db8c10b9ba4f06777910348698260ed7a2170`. |
| Moon | VPyLab procedural lunar surface, AGPL-3.0-or-later. [Generator, seed 2718](https://github.com/vpylab/vpylab/blob/cd1e52b84aaf4f424723794b5616769c5d84d12e/scripts/research/cinematic-preview/generate-moon.py) |
| Sun | VPyLab procedural photosphere, AGPL-3.0-or-later. [Generator, seed 470](https://github.com/vpylab/vpylab/blob/cd1e52b84aaf4f424723794b5616769c5d84d12e/scripts/research/cinematic-preview/generate-sun.py) |

해당 작품에서 쓰는 지도를 HTML에 포함합니다. 동적으로 재질을 선택하는 코드는 기본 천체 지도 여섯 장을 받습니다. 서울 관측소의 LROC 관측 지도는 작품 코드가 해당 경로를 사용할 때만 포함합니다.

The HTML includes the maps used by the project. Dynamic preset selection includes the six default planet maps. The separate LROC observation map is embedded when the code uses the Seoul exercise image path. Earth Dark and the LROC lunar map use observations.
