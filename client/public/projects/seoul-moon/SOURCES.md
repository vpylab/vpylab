# 서울 관측소 자료

- 달 표면은 NASA Scientific Visualization Studio의 [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/)에서 제공하는 [2048 × 1024 LROC 색상 지도](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg)를 사용합니다. Credit: NASA/Goddard Space Flight Center Scientific Visualization Studio, LROC, Arizona State University.
- 달 중심의 위치·거리는 Jean Meeus, *Astronomical Algorithms*, 제47장의 주기항으로 계산합니다. 계수와 알고리즘은 [astronomia의 moonposition](https://github.com/commenthol/astronomia/blob/master/src/moonposition.js)을 참고했습니다. 라이선스는 아래에 있습니다.
- 달 표면의 북극과 본초 자오선은 [JPL NAIF IAU 회전 요소](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc)를 사용합니다. 평균 적도·춘분점 좌표계에 맞춰 세차를 적용합니다.
- 태양의 근사 궤도는 [Paul Schlyter](https://stjarnhimlen.se/comp/ppcomp.html)를 따릅니다. 서울의 시선은 지구 타원체의 표면에서 계산합니다. 일출·월출은 표준 대기의 평탄한 지평선 위로 원반의 윗가장자리가 나타나는 시각입니다. 산, 건물, 구름, 실제 기온과 기압은 모델에 포함되지 않습니다. 일식·월식의 그림자도 계산하지 않습니다.
- 참고 관측값은 [USNO 일출·월출 자료](https://aa.usno.navy.mil/data/RS_OneDay)와 [NASA의 2026년 달 위상·칭동 자료](https://svs.gsfc.nasa.gov/5587/)에서 확인할 수 있습니다.

## Astronomia license
The MIT License (MIT)

Copyright (c) 2013 Sonia Keys
Copyright (c) 2016 Commenthol

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## 서울 관측 사진 비교

[비교 자료](./compare.html)의 왼쪽 세 이미지는 이 실습을 145배로 실행해 캡처한 것입니다. 영상은 시간을 멈추고 같은 카메라의 시야각을 조절한 화면입니다. 세 시각의 고도와 밝은 면은 JPL Horizons의 지상 관측자 자료(달 301, 서울시청 경위도, 해발 0 km, 대기 굴절 제외, 수량 4·10)로 점검했습니다.

- [서울특별시 서울한컷, 「서울 초승달 월몰」, 세 번째 사진](https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=98131). 2025-03-31 촬영. 공공누리 제4유형. 제공처의 원본을 표시합니다.
- [한성과학고, 2020 과학 동아리 활동 발표대회 보고서, PDF 7쪽](https://www.kofses.or.kr/data/H09.pdf#page=7). 2020-09-24 곽민서 촬영. 보고서에 실린 상현달 사진을 좌우반전과 명암 경계 비교를 위해 인용했습니다.
- [파이낸셜신문 황병우, 「서울 밤하늘에 떠오른 2023년 마지막 보름달」](https://www.efnews.co.kr/news/articleView.html?idxno=108908). 2023-12-27 21:40경 서울 촬영. 기사에 실린 망원 원본을 표시합니다.

관측 사진의 권리는 각 저작자에게 있습니다.
