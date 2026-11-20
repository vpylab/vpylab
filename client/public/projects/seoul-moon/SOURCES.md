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
