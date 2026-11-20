# 빛·소리 작업 인수인계 — 2026-11-20

"학생이 평범한 파이썬으로 빛과 소리를 가장 멋지게 코딩하는 환경"을 만드는 작업의 현재 상태와 남은 일입니다. 이 작업을 이어받는 사람(또는 AI)은 이 문서부터 읽습니다.

## 색상 팔레트

편집기와 공유 HTML에서 `random.choice(색상)`은 30개 색 중 하나를 같은 확률로 뽑습니다. `print(색상)`이 보여주는 대표 한글 이름의 순서는 `색상[0]`부터 시작하는 번호와 같습니다. 이름과 번호 조회, 별칭, 두 실행기의 추첨 결과는 `client/src/utils/export-html.test.js`에서 함께 확인합니다.

## 기초 코스

트레이닝의 첫 작품은 `two-ball-signals`입니다. 여덟 단계 동안 공 하나에서 시작해 클릭, 조건문, 조명, 두 음을 순서대로 더합니다. `client/src/data/two-ball-course.test.js`에서 한·영 예제에 왼쪽 공, 오른쪽 공, 빈 곳 클릭을 전달해 각 단계의 결과를 확인합니다.

## 지금까지

| 무엇 | 어디 | 상태 |
|---|---|---|
| 시네마틱 재질·악기·예제 (ChatGPT) | greatsong/vpylab 초안 PR #1, 커밋 9d00b9b·1b35850·11289fc | 아래 PR에 합쳐짐. 포크의 초안 PR은 더 쓰지 않습니다. |
| 아이폰 흰 화면 수정 | vpylab/vpylab PR #37 | `main`에 병합, 운영 반영 |
| 통합과 연수 전 안정화 | vpylab/vpylab PR #38 (`feat/cinematic-light-sound`) | 이 문서가 들어 있는 PR |

앞으로의 작업은 **vpylab/vpylab의 `main`에서 브랜치를 만들어** 이어갑니다. 포크의 `prototype/cinematic-light-sound`에는 더 올리지 않습니다(두 곳에서 따로 고치면 다시 합쳐야 합니다).

## PR #38에서 바꾼 것과 이유

끄거나 좁힌 것. 다시 켜려면 아래 조건을 먼저 채웁니다.

| 항목 | 지금 | 다시 켜려면 |
|---|---|---|
| 화면 해상도 자동 조절 (`Viewport3D.jsx`) | 뺌 | 그린 프레임 사이의 간격이 아니라 화면 갱신 주기나 GPU 측정값으로 기기 속도를 재고, 녹화 중에는 고정. `rate(20)` 작품에서 흐려지지 않는 것을 브라우저에서 확인. |
| 구 분할 수 자동 교체 (`sphere-detail.js`) | 호출 안 함. 모듈은 배율을 반영하도록 고쳐 둠 | 반지름을 바꾸는 애니메이션에서 geometry를 두 번 만들지 않게 하고, compound 안의 구와 다른 캔버스로 옮긴 구를 처리. |
| 요철·발광 무늬 (`applySurface`) | 새 천체 재질(sun, moon, jupiter, saturn)에만 | 기존 재질에 쓰려면 선택 사항으로. `metal`의 금속성을 올리려면 환경 반사가 먼저 필요(없으면 어두워짐). |
| 지구 KTX2 (`texture-system.js`의 `USE_COMPRESSED_EARTH`) | 끔 | 아이패드에서 변환기 동작 확인, 재실행·장면 정리와의 경쟁 조건과 `whenTexturesReady()` 누락 해결. |

고친 것

- 발음 한도(24)에서 새 음을 버리지 않음: `sound-system.js`의 `freeVoices()`가 가장 오래된 음을 짧게 줄여 자리를 냅니다. `playChord`는 남은 자리를 음 수로 나눕니다.
- 펠트 피아노 녹음을 오디오가 켜질 때 미리 받음(`warmFeltSamples`). 두 세기의 녹음이 모두 준비된 뒤에만 씁니다.
- 정지할 때 잔향 버스를 짧게 줄인 뒤 해제, 태양 후광 예외 방지.

한글 도움말

- `textures.` 자동 완성은 `data/docs.js`의 `textures-presets` 표를 그대로 씁니다. 새 재질은 그 표에 넣으면 됩니다. 엔진(`vpython-api.py`의 `_TexturePresets`)과 어긋나면 `python-completions.test.js`가 실패합니다.
- 낱말 카드는 `data/code-vocabulary.js`. 변수 이름으로 흔히 쓰는 낱말(sun, moon, earth)은 넣지 않았습니다. 변수에 잘못된 뜻이 붙습니다.

## 남은 일 (우선순위 순)

운영 사이트에서 실측한 문제입니다. 연수 직전이라 PR #38에서는 손대지 않았습니다.

1. **박자가 밀리고 흔들림.** `play_note` + `sleep(0.125)` 48회에서 간격 평균 132.2ms(기준 125ms), 범위 128~139ms. 소리 명령에 시각이 없어 메인 스레드가 도착 즉시 재생하고(`beep`), `_sleep_chunked`가 상대 대기라 오차가 쌓입니다. `rate`의 반복 마감과 음악 박자는 누적 보정하되, 표준 `time.sleep`은 호출 시점부터 요청 시간 이상 기다려야 합니다. 완료 기준: 간격 평균 125±1ms, 표준편차 3ms 이하.
2. **`time.sleep`이 소리·화면을 내보내지 않음.** 음 3개 사이에 `time.sleep(2)`를 넣으면 세 음이 4초 뒤 한꺼번에 납니다. 변환기(`student-code-transform.py`)에서 표준 라이브러리 `time.sleep`을 전용 비동기 대기 함수로 연결합니다(`await`만 붙이면 안 됨).
3. **내려받은 HTML과 편집기의 차이.** `standalone-template.js`에 소리 엔진과 파이썬 API가 따로 있습니다. 음 이름 화음(`play_chord(['C4', ...])`)이 주파수로 바뀌지 않고, `volume=0`이 기본 음량이 되고, 리미터·정지 처리·텍스처·위젯·점 목록 조작이 없습니다. 새 예제 4개는 내려받은 HTML과 갤러리에서 같은 모습으로 실행되지 않습니다.
4. **`local_light`가 어두움.** 흰 벽 3칸 앞의 점광원 하나로 벽 중심이 82/255. 예제들이 `intensity=95`, `400` 같은 값으로 우회합니다. GlowScript와 거리별로 비교해 기본 환산을 정하고 예제 값을 되돌립니다.
5. **표면 그림의 이용 조건.** `client/src/assets/planets/SOURCE.md` 참고. `jupiter.jpg`, `saturn.jpg`는 만든 방법이 기록되지 않았습니다.
6. **악기 표기.** `type='felt-room'`처럼 문자열 접미사로 잔향을 켭니다. 키워드 인자(`room=True`)를 추가하고 기존 표기도 받게 하는 안을 검토합니다. 문자열 안에서는 자동 완성이 뜨지 않아 악기 이름은 문서로만 안내됩니다.
7. **혜성 근접 보기의 태블릿 부하.** 반투명 점 6천여 개, 매 프레임 최대 96개 먼지의 파이썬 계산, 네 틱마다 목록 전송. 실기기 측정이 없습니다. 느리면 동적 먼지(`released`)를 빼고, 공전 속도 0일 때 갱신을 건너뜁니다.

## 검증하는 방법

- 운영과 같은 보안 정책으로 보려면 PR을 올린 뒤 Vercel 미리보기 주소(PR 댓글)를 씁니다. 로컬 `vite preview`에는 보안 정책이 없습니다.
- 소리 타이밍은 페이지에서 `OscillatorNode.prototype.start`를 가로채 `context.currentTime`을 기록해 잽니다. 자동 검사(가짜 시계)와 브라우저 측정을 구분해 PR에 적습니다.
- 실행 링크: `/sandbox?view=run#b64=<base64url 코드>`, 예제 링크: `/sandbox?example=<id>`.
- iOS 판정(`sound-system.js`의 `isIOSDevice`)은 `MacIntel` + 터치 점 2개 이상도 iOS로 봅니다. 데스크톱의 휴대폰 흉내로 iOS 경로를 탈 수 있지만 실제 기기 확인을 대신하지는 못합니다.
- `main`에 병합하면 운영 두 사이트에 자동 배포됩니다. 병합은 관리자가 승인한 뒤에만 합니다.

## 11월 20일 후속 초안 검증

| 수업에서 확인할 사항 | 검토용 결과 |
|---|---|
| 표준 대기와 음악 | [#48](https://github.com/vpylab/vpylab/pull/48)에서 세 음을 세 배치로 전송하고 각 화면을 처리한 뒤 표준 대기를 시작합니다. [#45](https://github.com/vpylab/vpylab/pull/45)의 48음은 오디오 시계에서 평균 간격 125.00ms였습니다. 화면 간격 표준편차는 8.25ms였습니다. |
| 모바일 감상 | [#49](https://github.com/vpylab/vpylab/pull/49)의 같은 맥·로컬 gzip·빈 캐시 최종 5회씩에서 첫 장면 중앙값 3,897→1,228ms(초기 비교 3,979→2,522ms), 코드 보기 전 Monaco 요청은 매회 3→0건이었습니다. |
| 조명·표면·혜성 | [#44](https://github.com/vpylab/vpylab/pull/44)는 같은 URL의 실패 후 재시도, [#46](https://github.com/vpylab/vpylab/pull/46)은 점광원의 거리별 명암, [#47](https://github.com/vpylab/vpylab/pull/47)은 지구·목성·토성 그림의 출처를 다룹니다. [#50](https://github.com/vpylab/vpylab/pull/50)은 #39의 고정 핵 모드 전송량을 줄입니다. 실물 태블릿 GPU·발열·배터리는 측정 전입니다. |
| 내려받은 작품 | [#42](https://github.com/vpylab/vpylab/pull/42) 미리보기에서 내려받은 태양·혜성 두 작품과 악기 작품에서 필요한 지도·입자·음색·위젯을 검증했습니다. |
| 국제 수업 | [두 행성의 합주 활동지](../client/public/projects/light-sound-lab/duet.html)는 공식 Web VPython 3.2에서 실행한 시각 모델과 VPyLab 전용 음 확장을 함께 담습니다. Web VPython에는 소리 기능이 없습니다. 교사 검토와 실제 수업 자료 수집은 별도 단계입니다. |

These measurements use desktop browsers and emulated viewports. Each linked draft records its preview, test conditions and remaining classroom checks. The production classroom site is https://vpylab.vercel.app. Use the preview linked from the relevant PR to test proposed changes.

## 터치 취소와 3D 선택

물체를 누른 뒤 3D 교점이 없는 빈 하늘로 이동하다 터치가 취소되면, `mouseup`의 `evt.pos`와 `evt.pick`은 그 손가락의 마지막 유효 교점을 가리킵니다. `evt.clientX`와 `evt.clientY`는 취소 직전의 화면 좌표입니다. 다음 터치는 새로 선택합니다.

## 서울 관측소 수업 자료

[서울에서 본 달](../client/public/projects/seoul-moon/compare.html)에서 서울의 초승달·상현·보름달 사진, 관측 시각으로 고정한 실습, 같은 시각에서 줌을 왕복한 영상을 엽니다. 서울시청 기준 기하 고도와 밝은 면을 NASA JPL Horizons와 대조했습니다. 모바일 너비의 Chromium·WebKit으로 달 추적과 줌을 확인했습니다. 초승달과 상현 사진의 분 단위 촬영 시각은 공개 자료에 없습니다.

관측소에서는 마우스·한 손가락 드래그로 눈의 방향을 돌립니다. 추적 시선의 오프셋은 재생과 확대 중에도 유지하며, 관점을 바꾸면 기본 구도로 돌아갑니다. 태양 추적은 관측 글의 낮 실습 링크에서 바로 엽니다. 지상에서 보이는 광구의 밝기와 후광은 화면 표현이며, 달의 조명은 천체 위치에서 계산합니다.

초승달 실습의 시야 단계 32는 서울 관측소의 1배 하늘입니다. 슬라이더·휠·두 손가락 핀치로 그 아래까지 축소하면 같은 시각의 우주 조망으로 이동합니다. 단계 0에서 태양·지구·달을 함께 비교하며 크기와 거리의 축척을 화면에 표시합니다. 축척을 바꿀 때 달에서 태양을 보는 방향을 보존합니다. 재생 중 줌 복귀와 같은 시각의 독립 실행을 대조한 화면과 영상은 관측 비교 자료에서 확인할 수 있습니다.

## 휴대폰에서 감상하고 편집하기 · Viewing and editing on a phone

공유된 실행 링크를 열고 시작 단추를 한 번 누르면 소리와 장면을 함께 실행합니다. 감상 중에는 편집기를 내려받지 않습니다. **코드 보기**를 누르면 같은 작품을 편집할 수 있습니다. 인터넷 없이 다시 편집할 계획이라면 연결된 동안 한 번 코드 보기를 열어 편집기까지 준비하세요. 학교 기기에서는 수업 전에 소리, 파일 내려받기와 재실행을 확인하세요.

Open the shared run link and tap Start once to enable audio and run the scene. The editor downloads when you choose **View code**. For a later offline class, open the editor once while connected. Check sound, file downloads and rerunning on the school's devices before the lesson.

| 맥의 Chromium 터치 모사 · Chrome touch emulation on Mac | main 1e6be2b | 변경 후 · After |
|---|---:|---:|
| 첫 장면까지 중앙값 · Median navigation to first scene | 3,979 ms | 2,522 ms |
| 첫 탭에서 첫 장면까지 중앙값 · Median tap to first scene | 2,777 ms | 1,962 ms |
| 첫 장면까지 응답 본문 바이트 중앙값 · Median HTTP response body bytes by first scene | 8,000,689 | 6,966,449 |
| 코드 보기 전 편집기 JS·CSS·워커 요청 수 · Editor requests before View code | 3 / run | 0 / run |

각 빌드에서 새 브라우저 컨텍스트로 5회씩 실행했습니다. 같은 맥과 Chrome, 390 × 844 터치 화면 모사, 같은 로컬 HTTP 서버, gzip 레벨 6, LAN 글꼴 설정의 오픈소스 빌드를 사용했습니다. 구 하나와 C4 한 음이 있는 작품의 첫 생성 명령 뒤 첫 WebGL 그리기 호출을 장면 시작으로 기록했습니다. 바이트에는 서비스 워커와 Python 엔진을 포함한 서버 응답 본문이 들어갑니다. 실물 휴대폰·학교 네트워크의 소요 시간은 별도 측정해야 합니다.

Five fresh browser contexts per build used the same Mac, Chrome, emulated 390 × 844 touch screen, local HTTP server, gzip level 6 and open build with local fonts. The first WebGL draw following the first Python object-creation batch marked scene onset. Byte counts include completed response bodies for the page, workers and Python engine. Physical-device and school-network timings remain unmeasured.
