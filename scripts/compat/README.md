# GlowScript 호환성 점검 하네스

GlowScript VPython 코드가 VPyLab에서 어디서 깨지는지 자동으로 전수 점검한다.
결과 보고서는 [docs/GLOWSCRIPT_COMPAT_REPORT.md](../../docs/GLOWSCRIPT_COMPAT_REPORT.md)에 있다.

## 2026년 11월 6일 변경

최신 분석은 [호환성 분석과 개선](../../docs/COMPATIBILITY_AUDIT_2026-11-06.md)에 있습니다. Python 실행 통과와 화면·입력·의미의 일치를 구분합니다.

- 원본을 보존한 33개 작품, 4개 체험, 알려진 원본 오류 5개의 재현을 코퍼스에 포함합니다.
- 같은 코드·코퍼스 해시의 증거만 요약에서 합칩니다. 옛 브라우저 결과나 shim 결과는 현재 결과에 섞지 않습니다.
- `origin-error`는 보존 원본 오류 재현, `empty`는 빈 초안, `fragment-incomplete`는 인자를 생략한 문서 표기입니다.
- `npm --prefix client run test:run`은 위젯 등록 후 이벤트 전달·콜백 오류·공식 키 이름·실제 Canvas 그래프·공유 HTML 색상·31개 작품을 추가 검사합니다.
- Python 3.12를 사용하세요. 3.11은 randint의 실수 인자를 받아 차이를 숨길 수 있습니다. 테스트 실행기에는 `VPYLAB_TEST_PYTHON`으로 인터프리터를 지정할 수 있습니다.

## 빠른 실행

```bash
npm run compat:check          # 코퍼스 생성 → 전처리 → 정적 하네스 → 요약 (브라우저 불필요, 약 2분)
npm run compat:browser        # 브라우저 하네스 (Playwright, 개발 서버를 4095 포트에 띄움, 약 30~40분)
npm run compat:check:all      # 둘 다 실행하고 요약
```

브라우저 하네스는 처음 한 번 준비가 필요하다.

```bash
npm --prefix scripts/compat install
npx --prefix scripts/compat playwright install chromium
```

정적 하네스는 CPython 3.12 를 쓴다(Pyodide 0.27 과 같은 버전). `python3.12` 가 없으면 `PYTHON=python3 npm run compat:check` 처럼 바꿀 수 있다.

## 구성

| 파일 | 역할 |
|---|---|
| `corpus/idioms.mjs` | 수업 관용구 112개 (직접 작성, 결정적인 것은 `assert` 로 의미 검사) |
| `corpus/glowscript-examples.json` | glowscript.org 공식 예제 33개 (`extract-glowscript-examples.py`) |
| `corpus/glowscript-docs.json` | GlowScript 문서 각 페이지의 예제 블록·한 줄 코드 169개 (`extract-docs.py`) |
| `corpus/vpython-demos.json` | vpython-jupyter Demos 노트북 35개 (`extract-demos.py`) |
| `build-corpus.mjs` | 위 코퍼스와 `client/src/data/{examples,courses,missions}.js` 의 모든 코드를 `corpus/corpus.json` 으로 합침 |
| `preprocess.mjs` | 코퍼스 코드와 워커의 vpython 모듈 등록 블록·브릿지 커맨드 목록을 `out/preprocessed.json` 에 저장 (학생 코드 변환은 실행 시 `student-code-transform.py` 가 Worker 와 같이 수행) |
| `static-harness.py` + `runner-child.py` | 코드마다 자식 프로세스에서 `vpython-api.py` 의 `_vpylab_run` 으로 실행(ast 변환 → 모듈 수준 실행) → `out/static-results.json`. `scene.waitfor` 가 기다리는 이벤트와 `input()` 답(`42`)은 js 스텁이 만들어 준다 |
| `browser-harness.mjs` | Playwright 로 `/sandbox` 를 열어 Monaco 에 코드를 넣고 실행 버튼을 눌러 Worker 메시지·브릿지 경고·3D 메시 수를 기록 → `out/browser-results.json` |
| `summarize.mjs` | 두 결과를 합쳐 `out/summary.md`, `out/merged.json` 생성 |
| `fetch-sources.mjs` | 문서·데모·공식 예제 원문을 다시 내려받을 때 사용 (원문은 저장소에 두지 않음) |

## 판정 범주

| 범주 | 뜻 |
|---|---|
| `pass` | 예외 없이 끝남, 또는 `rate()` 루프가 정지 신호로 정상 종료 |
| `unsupported-api` | GlowScript 가 제공하는 전역 이름(`canvas`, `pi`, `sin`, `shapes` …)이 없음 (NameError) |
| `unsupported-attr` | 객체에 속성·메서드가 없거나 setter 가 없음 (AttributeError) |
| `unsupported-arg` | 인자 이름·호출 형식이 다름 (TypeError) |
| `semantic` | 실행은 되지만 값이 GlowScript 와 다름 (`assert` 실패) |
| `silent` | 객체를 만드는 호출이 있는데 커맨드가 하나도 안 나감 |
| `timeout` / `hang` | `rate()` 가 없는 무한 루프 등으로 정지되지 않음 |
| `input` | `input()` 사용 (워커에 표준 입력이 없음) |
| `fragment-undefined` | 문서에서 잘라 온 조각이 가정한 변수가 없음 → VPyLab 문제가 아니므로 집계에서 제외 |
| `glowscript-only` | jQuery 등 JavaScript 를 섞은 Web VPython 전용 코드 → 제외 |

## 옵션

```bash
python3.12 -I scripts/compat/static-harness.py --filter idiom: --jobs 8        # 일부만
python3.12 -I scripts/compat/static-harness.py --api path/to/vpython-api.py     # 다른 API 버전으로
node scripts/compat/browser-harness.mjs --filter gsexample: --headed            # 눈으로 보면서
node scripts/compat/browser-harness.mjs --url http://127.0.0.1:4033             # 떠 있는 서버 사용
```

## 한계

- 정적 하네스는 Python 쪽 의미만 본다. 브릿지(Three.js)가 커맨드를 어떻게 그리는지는 브라우저 하네스가 본다.
- 브라우저 하네스는 Worker 를 재시작하지 않고 코드를 이어서 돌린다. 각 코드가 끝나면 Python 전역을 스냅샷으로 되돌리지만, `scene` 의 카메라·배경 같은 화면 상태는 앱이 실행 시작 때 초기화하는 범위까지만 되돌아간다.
- 마우스·키보드·위젯 이벤트는 실제로 발생시키지 않는다. 핸들러 등록까지만 검사한다. 정적 하네스는 `scene.waitfor()` 가 기다리는 이벤트만 가짜로 한 번 보내고, 브라우저 하네스는 보내지 않으므로 `waitfor`·`pause`·`input()` 코드는 브라우저에서 실행 시간 초과 뒤 정지로 끝난다.
- 메시 수는 React fiber 에서 Three.js 씬을 찾아 센다. 씬을 못 찾으면 `create` 커맨드 수로 대신 판정한다.

## 창작 자료와 복수 canvas의 실제 화면 검사

개발 서버가 실행 중인 상태에서 `node scripts/compat/creative-browser.cjs`를 실행합니다. 프로젝트 또는 기존 전역 Puppeteer 설치를 사용하며 자동 설치는 하지 않습니다. `VPYLAB_TEST_URL`로 서버 주소를, `VPYLAB_TEST_OUT`으로 결과 폴더를 지정합니다. 기본 결과는 OS 임시 폴더의 `vpylab-creative-browser/`입니다.

반구·신호 버튼·팀 상태·복수 canvas의 입력과 반복 실행·나선·Rug를 확인합니다. Python 오류와 좌표뿐 아니라 실제 WebGL 픽셀이 배경과 다르게 그려졌는지 검사하고 스크린샷을 남깁니다. 개발 모드의 재초기화 및 WebGL context 회수, 이전 예제의 카메라 중심이 남는 문제를 재현한 검사입니다. 결과에는 당시 소스 fingerprint가 포함됩니다.

세부 범위와 예외는 `docs/CREATIVE_LEARNING_AND_VPYTHON_2026-11-06.md`에 있습니다. 이 선택 검사를 전체 코퍼스의 브라우저 통과율로 확대하지 않습니다.

## 카메라·compound·이동 UX·도형 AI 검증 (2026-11-07)

아래 선택 검사는 설치된 Puppeteer와 전용 Chrome Headless Shell을 사용합니다. 자동 설치하지 않습니다. 일반 headless Chrome의 프레임/캡처 정지와 앱 오류를 구분해 검사합니다.

```bash
# 개발 서버 실행 중: 목록/안내 왕복, 탭 내 단계별 초안, 모바일, 카메라와 실제 재질
node scripts/compat/review-browser.cjs
# 공유 HTML: 실제 Python 값 읽기·compound 속성·화면 전환
node scripts/compat/standalone-review-browser.cjs
# client/dist 빌드 후 실제 UI에서 HTML 생성: 압축된 함수의 독립 실행 가능성 확인
node scripts/compat/production-export-check.cjs
# 비용이 발생하는 실제 API 평가: 전체 문서+합성 모양 6개. 환경 변수 UPSTAGE_API_KEY 필요
node scripts/compat/solar-shape-eval.mjs --live --out /tmp/vpylab-shapes
```

`VPYLAB_TEST_OUT`으로 브라우저 결과 폴더를 지정할 수 있습니다. `review-browser.cjs`는 `VPYLAB_SOLAR_RESULTS=<solar 결과 results.json>`이면 실제 모델이 제안한 코드를 추가로 실행해 픽셀과 화면을 확인합니다. `standalone-review-browser.cjs`는 `VPYLAB_EXPORT_HTML=<생성된 HTML>`을 검사할 수도 있습니다. 생산 코드의 전역을 열지 않고, 테스트 사본에만 검사용 참조를 넣습니다. CDN 가용성과 분리해 설치된 동일 버전 Three.js/Pyodide로 검사합니다.

결과·한계·모델별 제안 채택 판단은 `docs/SHAPE_CAMERA_UX_REVIEW_2026-11-07.md`에 기록했습니다. 도형이 실행된다는 것과 요청한 모양이라는 것을 구별합니다. 이 원형은 학생 AI 기능을 활성화하지 않습니다.


## 문서 메뉴와 도형 가이드 검사 (2026-11-07)

```bash
# 개발 서버 실행 중: 문서 이동·모바일·복사·초안·계정 상태와 실제 도형 실행
node scripts/compat/docs-browser.cjs
```

`VPYLAB_TEST_URL`과 `VPYLAB_TEST_OUT`으로 서버와 결과 폴더를 지정합니다. 21개 시나리오에서 기본 가이드 7개와 변형 13개를 실제 Pyodide+Three.js로 실행합니다. 컵 구멍은 실제 raycast로 확인하며, 반구 치수·닫힌 면·법선은 `shape-guide-geometry.test.js`가 검사합니다. 합성 계정 상태 검사는 백엔드 요청을 차단하며 실제 OAuth/DB 저장 검증을 대신하지 않습니다. 기본 실행을 사용하세요. `VPYLAB_AUTH_ONLY=1`은 인증 상태 검사만 재현하는 진단 옵션입니다.

`build-corpus.mjs`는 문서의 95개 실행 예제와 가이드 변형 13개도 수집합니다. 제공 함수는 코드에 포함되지만 Solar 평가용 API 목록에서는 가이드를 제외합니다. `standalone-review-browser.cjs`는 원기둥·원뿔의 생성/radius/axis 변경 뒤 기준점도 검사합니다. 컵의 구멍 있는 단면은 현재 공유 HTML의 지원 범위 밖입니다.

구현·Claude 회의·검증·지원 한계는 [문서와 도형 가이드 보고서](../../docs/DOCUMENTATION_AND_SHAPE_GUIDES_2026-11-07.md)에 기록했습니다.


## 대장간 모듈과 포크

대장간의 공개 등록과 포크는 2026-11-12에 GitHub 방식으로 바뀌었습니다. 예전 방식(Supabase)을 검사하던 `forge-browser.cjs`와 `forge-live-browser.cjs`는 지웠습니다. 지금의 동작은 `client/src/forge/github-registry.test.js`와 `client/src/components/forge/ForgeGitHub.test.jsx`가 검사합니다.

