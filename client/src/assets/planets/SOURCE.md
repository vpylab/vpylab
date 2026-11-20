# 천체 표면 그림의 출처

| 파일 | 출처 | 비고 |
|---|---|---|
| `earth.jpg` | [three-globe day map](https://github.com/vasturiano/three-globe/blob/46eb4aaa1837311ab0df3f02b35129e041c11e2f/example/img/earth-day.jpg) | Bright daytime classroom map, bundled unchanged at 1600 × 800. [Upstream MIT notice](../../../../server/shared/earth-day-license.js). |
| `earth_dark.jpg`, `earth_dark.ktx2` | Reto Stöckli, NASA Earth Observatory, Blue Marble Next Generation, July 2004 | 원본을 축소한 2:1 경위도 지도. JPEG를 쓰며 KTX2는 실물 태블릿 검증 전까지 비활성입니다. |
| `moon.jpg` | 구면 위에 직접 합성한 달의 바다·고지대·충돌구·방사무늬 | `scripts/research/cinematic-preview/generate-moon.py` (NumPy, Pillow, 고정 시드 2718). 교육용 지형 모형이며 실제 지명과 대조할 때는 관측 지도를 사용합니다. |
| `sun.jpg` | 외부 사진 없이 구면 좌표에서 직접 합성한 광구의 입상반과 흑점 | `scripts/research/cinematic-preview/generate-sun.py` (NumPy, Pillow, 고정 시드 470) |
| `jupiter.jpg`, `saturn.jpg` | VPyLab에서 합성한 교육용 구름 모형 | 외부 사진 없이 구면의 위도·경도 함수로 구름 띠와 목성의 타원형 폭풍을 그립니다. 생성기 시드 611, 612. |

## 기존 지구 지도 · Dark Earth map

Credits: **Reto Stöckli, NASA Earth Observatory**. The July 2004 monthly composite represents surface color. NASA permits educational and informational use with acknowledgement under its media guidelines. Preserve the credit when sharing the map. NASA endorsement must not be implied. [Blue Marble base maps](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/) · [July source JPEG, 5400 × 2700](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x5400x2700.jpg) · [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)

7월 합성 관측 자료의 육지·바다 색을 나타냅니다. 교재·발표에 옮길 때도 위 출처를 표시하세요. 제작 스크립트는 원본의 SHA-256을 검사합니다.

## 목성·토성 · Gas giants

The two maps are original procedural assets distributed with VPyLab under [AGPL-3.0-or-later](../../../../LICENSE). Students can change the palettes, band frequencies and storm shape in the generator. Observational studies need a dated telescope or spacecraft image. 두 행성 그림을 사용하거나 수정할 때는 VPyLab의 같은 라이선스와 출처를 보존하세요.

## 재현 · Reproduction

프로젝트 루트에서 NumPy와 Pillow를 사용합니다. KTX2는 Khronos KTX-Software 4.4.2의 ETC1S 인코더로 생성합니다.

```sh
python3 scripts/research/cinematic-preview/generate-gas-giants.py
python3 scripts/research/cinematic-preview/prepare-earth.py world.200407.3x5400x2700.jpg /tmp/earth-input.png
toktx --t2 --encode etc1s --genmipmap --threads 1 client/src/assets/planets/earth_dark.ktx2 /tmp/earth-input.png
ktx validate client/src/assets/planets/earth_dark.ktx2
```

## 달 · Moon

달 그림은 외부 사진 없이 `scripts/research/cinematic-preview/generate-moon.py`로 합성한 교육용 지형 모형입니다(PR #39). 실제 지명과 대조할 때는 관측 지도를 사용합니다.
