# 수업에서 HTML로 작품 열기 · Opening downloaded HTML in class

만들기 화면의 **도구 → HTML 내려받기**로 작품과 코드를 한 파일에 저장합니다. 파일을 브라우저에서 열고 **시작**을 누르세요. Python과 Three.js를 처음 가져올 때 CDN 연결이 필요합니다. **정지 / Stop**은 실행 문서를 다시 열어 Python, 위젯, 예약음과 화면을 초기화합니다. 다시 시작하려면 시작 버튼을 누르세요.

In Create, use **Tools → Download HTML**. Open the file in a browser and press **Start**. The first load needs network access to the Python and Three.js CDNs. **Stop** resets the document, including Python, widgets and scheduled audio. Press Start for a fresh run.

| 수업에서 쓸 기능 · Classroom task | 저장한 HTML · Downloaded HTML |
| --- | --- |
| 화음·무음 · Chords and silence | 음 이름(C4, 미4), 주파수, 음량 0, 방 잔향을 지원합니다. 코드에 felt가 있으면 피아노 두 세기 녹음과 출처를 파일에 포함합니다. / Note names, frequencies, silence and room reverb. Code containing felt embeds both piano layers with credits. |
| 표면 · Surfaces | 지구 관측 지도와 달·태양·목성·토성의 합성 지도를 작품에 맞춰 파일에 담습니다. 출처는 작품 상단에 표시됩니다. 기본 절차적 무늬와 data 이미지도 쓸 수 있습니다. 외부 URL은 온라인 편집기에서 여세요. / Exports embed the Earth observation map and the Moon, Sun, Jupiter and Saturn model maps used in the code, with credits at the top. Procedural textures and data images also work. Open external image URLs in the online editor. |
| 조작 · Interaction | 슬라이더·버튼·메뉴·체크 상자·입력 위젯, 장면 설명, 장면에 초점을 둔 키 입력, 점 목록 수정. / Sliders, buttons, menus, choice and input widgets, scene captions, focused keyboard events and point-list edits. |
| 빛과 혜성 · Light and comets | 환경광과 조명 목록을 지정하고 부드러운 먼지와 흐르는 꼬리 입자를 그릴 수 있습니다. / Set scene.ambient and scene.lights. Mist and plume points show comet dust and particles flowing along a tail. |
| 고급 작품 · Advanced works | 장면 포인터 이벤트와 2D 그래프를 사용하는 작품은 편집기에서 여세요. / Use the editor for scene pointer events and 2D graphs. |

Web VPython 3.2에서는 공통 도형과 벡터를 이용한 시각 모형을 실행합니다. 이 페이지의 소리 명령은 VPyLab 확장입니다. / Web VPython 3.2 runs the shared visual model. The audio commands here belong to VPyLab.


서울 달 관측소를 내려받으면 작품에서 쓰는 LROC 달 지도와 출처도 파일에 포함됩니다. 날짜·시각 입력에서 한국 시각을 바꾸면 장면 아래에 새 시각과 해·달의 고도가 표시됩니다.

The downloaded Seoul Moon Observatory includes the LROC lunar map and its credit. Change the date and time in KST to see the updated Sun and Moon altitudes in the scene caption.
