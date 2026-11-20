# 천체 표면 그림의 출처

| 파일 | 출처 | 비고 |
|---|---|---|
| `earth.jpg`, `earth.ktx2` | Three.js r170 예제의 `examples/textures/planets/earth_atmos_2048.jpg` | `earth.ktx2`는 같은 그림을 변환한 것이며 지금은 쓰지 않습니다(`texture-system.js`의 `USE_COMPRESSED_EARTH`). |
| `moon.jpg` | 구면 위에 직접 합성한 달의 바다·고지대·충돌구·방사무늬 | `scripts/research/cinematic-preview/generate-moon.py` (NumPy, Pillow, 고정 시드 2718). 교육용 지형 모형이며 실제 지명과 대조할 때는 관측 지도를 사용합니다. |
| `sun.jpg` | 외부 사진 없이 구면 좌표에서 직접 합성한 광구의 입상반과 흑점 | `scripts/research/cinematic-preview/generate-sun.py` (NumPy, Pillow, 고정 시드 470) |
| `jupiter.jpg`, `saturn.jpg` | 커밋 11289fc에서 추가. PR 설명은 "위도별 구름 띠와 타원형 폭풍을 합성한 교육용 표면"이라고 적었습니다. | **만든 방법과 원본이 기록되지 않았습니다. 확인이 필요합니다.** |

## 확인이 필요한 것

- Three.js 저장소는 MIT 라이선스지만, 지구 그림 자체의 원저작자와 이용 조건은 이 저장소에서 확인하지 못했습니다. 조건이 맞지 않으면 출처와 이용 조건이 명확한 지구 그림으로 교체합니다.
- `jupiter.jpg`, `saturn.jpg`를 만든 방법(생성 스크립트 또는 원본)을 여기에 적어야 합니다.
