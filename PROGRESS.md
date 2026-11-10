# VPy Lab 진행 상황

> 2026-11-10: 이 문서의 아래 내용은 2026-05까지의 기록입니다. 그 뒤의 변경은 `docs/`의 날짜가 붙은 기록 문서와 PR에 있습니다. 현재 상태와 다음 할 일은 `NEXT_SESSION_PROMPT.md`와 `docs/README.md`를 봅니다.

## 2026-11-10 요약

- 저장소를 `vpylab/vpylab` 하나로 정리하고 예전 저장소 `greatsong/vpylab-classroom`을 보관했습니다.
- 영상으로 저장: 3D 화면과 소리를 최대 30초 녹화합니다. 오픈소스 판은 학생 구글 드라이브에도 저장합니다(PR 21, 23, 25).
- 수업용 판: 로그인하면 계정의 미션 통과 기록을 복원하고, 로그아웃하면 기기에서 지웁니다(PR 22).
- 핵심 범위, 기능 동결, 애드온 규칙을 `docs/SCOPE.md`로 정했습니다(PR 26).
- 영어 기여 문서(`CONTRIBUTING.md`, `docs/ARCHITECTURE.md`, `docs/I18N_GUIDE.md`)와 변형·창작 측정 도구(`scripts/research/`)를 더했습니다(PR 26).

**마지막 세션**: 2026-05-04 (VPython API 확장)
**다음 세션 방침**: 내보내기 동기화 → OAuth 활성화 → 실제 배포 → E2E 인증 테스트

---

## ✅ 완료

### Step N: VPython API 확장 v3 (2026-05-04, Tier 1·2·3 전체)

표준 VPython 대비 누락 기능 전부 구현. 양방향 이벤트 채널·DOM 패널·2D 그래프 캔버스 등 새 인프라 추가.

**Tier 1·2 (3D 객체 + 메서드 + scene)**
- 새 프리미티브: `pyramid`, `ellipsoid`, `helix`, `label`/`text`, `curve`, `points`
- 객체 메서드: `.clone(**kwargs)`, `.rotate(angle, axis, origin)`, `.attach_trail()`, `.clear_trail()`
- vector 메서드: `.proj(b)`, `.comp(b)`, `.diff_angle(b)`, `.rotate(angle, axis)`
- scene 객체: `scene.background/range/center/autoscale/title/caption`
- frame 별칭, camera-system 확장(`setExplicitRange/Center/Autoscale`)

**Tier 3 (이벤트 + UI + 2D 그래프 + 저수준 메시)**
- 저수준 메시: `vertex`, `triangle`, `quad`, `extrusion` (BufferGeometry + ExtrudeGeometry)
- 이벤트: `scene.bind('click'/'mousedown'/'mouseup'/'mousemove'/'keydown'/'keyup', handler)`, `scene.mouse.pos`/`pick`
  - Worker 양방향 채널: 메인 → Worker `postEvent`/`postWidgetValue`/`postMouseState`, Worker → Python `js._popEvent`/`_getMousePos` 폴링
  - rate()/sleep() 호출 시점에 등록된 핸들러 자동 디스패치
- UI 위젯: `slider`, `button`, `checkbox`, `radio`, `menu`, `winput`
  - 신규 모듈 [widgets-system.js](client/src/engine/widgets-system.js): DOM 패널 + textContent only (XSS 방지)
- 2D 그래프: `graph`, `gcurve`, `gdots`, `gvbars`, `ghbars`
  - 신규 모듈 [graph2d-system.js](client/src/engine/graph2d-system.js): Canvas2D 자동 스케일 + 4종 시리즈

**관련 모듈 변경**
- [pyodide-worker.js](client/src/engine/pyodide-worker.js): 이벤트 큐 + 새 메시지 타입(`event`/`widget_value`/`mouse`) 처리
- [pyodide-singleton.js](client/src/engine/pyodide-singleton.js): `postEvent`/`postWidgetValue`/`postMouseState` 헬퍼
- [vpython-bridge.js](client/src/engine/vpython-bridge.js): 9종 새 shape + 12종 새 action 처리, `mesh.userData.vpId`로 raycasting 픽 식별, `isEventBound` 노출
- [Viewport3D.jsx](client/src/components/viewport/Viewport3D.jsx): Three.js Raycaster + DOM 이벤트 → Worker postMessage, `data-vpylab-viewport` 컨테이너 마킹
- [export-html.js](client/src/utils/export-html.js): standalone export에 새 프리미티브 + 객체 메서드 동기화. UI 위젯/2D 그래프/이벤트는 export에서 미지원 stub 처리 (콘솔 경고)

**예제 + 문서**
- 14종 v3 쇼케이스 예제 추가([examples.js](client/src/data/examples.js)) — 학생 베이스라인용:
  - 기본 6종: 새 도형 모음, 동적 곡선, clone+rotate 시계, 클릭 이벤트, 키보드 조종, 슬라이더 컨트롤
  - 확장 8종: vertex 무지개 부채, triangle/quad 다면체, extrusion 휘어진 튜브, keysdown 우주선(다중 키), scene.mouse 따라다니기, 슬라이더로 함수 그래프 조절(A·sin(B·x+C)), gdots+gcurve 산점도 회귀, attach_trail 진자 운동
- [docs/VPYTHON_API.md](docs/VPYTHON_API.md) v3 갱신: 저수준 메시 / 이벤트 / 위젯 / 2D 그래프 섹션 + 사용 예제 추가
- 검증 중 발견·수정한 버그:
  - `code-preprocessor.js`: 들여쓴 함수 내부 `import`를 모듈 레벨로 잘못 끌어올려 IndentationError 발생 → `isTopLevel` 체크로 수정 + 회귀 테스트 추가
  - `vector` 클래스: VPython 호환 위해 `__eq__`/`__ne__`/`__hash__` 추가 (예: `vector(1,2,3) == vector(1,2,3)` 이제 True)

**검증**
- vitest 145 tests pass / vite build 성공 / Python AST 파싱 OK
- 보안: textContent only(innerHTML 금지), Worker 격리 유지, 이벤트 페이로드는 JSON 직렬화로 PyProxy 우회

### 계획 및 리뷰
- PLAN.md v4 최종 (5개 영역 병렬 리뷰 + 6개 이슈 결정)
- DESIGN_REVIEW.md (UI/UX 디자인 명세서)
- 6개 결정: Monaco, Supabase Pro, Railway, GitHub App, AGPL v3 + CC BY-NC-SA 4.0, CoC 1인 체제

### Step 1: 스캐폴딩
- React 19 + Vite + Tailwind v4 (client/, 포트 4033)
- Express 5 + helmet + cors + rate-limit (server/, 포트 4034)
- concurrently, .gitignore, CLAUDE.md

### Step 2: 다국어 + UI
- i18n: ko.json(80키) + en.json(80키) + I18nProvider + useI18n()
- Header: 브랜드 로고(SVG 3축), 그라디언트 타이틀, 언어/테마 토글
- Home: 히어로 배경, CTA 버튼, 6대 카테고리 카드(진행률 바)
- 4종 테마 CSS 변수 + 접근성 WCAG AA 대비율 수정

### Step 3: 엔진 코어
- code-preprocessor.js: rate()/sleep() → await (라인 파서)
- pyodide-worker.js: Worker 샌드박스 (로딩 후 위험 API 삭제)
- vpython-api.py: Python API (vector, sphere, box 등 + 커맨드 배칭)
- vpython-bridge.js: JSON → Three.js 메시 생성/업데이트
- object-registry.js: 객체 추적 + 궤적 히스토리
- sound-system.js: Web Audio (6종 효과음)

### Step 4: IDE 레이아웃
- Sandbox.jsx: 3패널 (Monaco 45% | Three.js 60% / 콘솔 40%) + 모바일 탭
- CodeEditor.jsx: Monaco + 테마 연동
- Viewport3D.jsx: Three.js + OrbitControls + 그리드 + XYZ 축
- OutputConsole.jsx: textContent만 (XSS 방지)
- LoadingScreen.jsx: 프로그레스 바 + 교육 팁 8종
- lazy loading 코드 스플리팅 (Home 73KB + Sandbox 147KB gzip)

### Step 5~8: 부분 완료
- grading-engine.js: A등급(정적) + B등급(궤적) 채점
- share.js: LZ-String URL 인코딩 (50KB 상한)
- server/routes/ai.js: Solar Pro 3 프록시 (일일 20회 제한)
- LICENSE (AGPL v3), CODE_OF_CONDUCT.md
- PROJECT_REGISTRY.md 업데이트 (4033, 4034)

### TDD 세션 (2026-04-14 오후)
- **vitest 설정**: vitest + @testing-library/react + jsdom
- **코드 전처리기 테스트**: 18개 (rate/sleep 변환, 문자열·주석·lambda 스킵, import 분리)
- **브릿지 통합 테스트**: 15개 (sphere/box/cylinder/arrow/cone/ring 생성, update, batch, clearScene)
- **채점 엔진 테스트**: 17개 (A등급 assertion 10개, B등급 궤적 7개)
- **미션 데이터 테스트**: 13개 (필수 필드, 다국어, 고유 ID, 카테고리, 채점 조건)
- **총 63개 테스트 전체 통과**

### 버그 수정 (2026-04-14)
- ✅ **P0: 3D 렌더링 연결** — 원인: 코드 전처리기가 `from vpython import *`를 async 함수 안에 넣어 SyntaxError 발생. 해결: import문을 async 함수 바깥(모듈 레벨)으로 분리
- ✅ **stdout 줄바꿈** — Worker에서 `\n`으로 split하여 줄 단위 전송으로 변경

### MVP 미션 데이터 (10개)
- CT-1: 첫 번째 구, CT-2: 신호등 만들기
- CR-1: 눈사람 만들기, CR-2: 로봇 만들기
- MA-1: 좌표 탐험, MA-2: 정다각형 꼭짓점
- SC-1: 등속 직선 운동, SC-2: 자유 낙하
- AR-1: 무지개 구슬, AR-2: 회전하는 큐브

### 미션 시스템 (2026-04-14 오후 2차)
- **Missions.jsx**: 카테고리 필터 탭 + 10개 미션 카드 (ID, 난이도, 설명, 채점 유형)
- **MissionPlay.jsx**: 3패널 + 우측 미션 정보 패널 (설명, 힌트, 채점 결과)
- **채점 UI**: A등급(정적 검사) + B등급(궤적 비교) + A+B(복합) 지원
- 채점 결과: 점수, 통과/실패, 세부 assertion 결과, 다음 미션 링크
- 힌트 시스템: 단계별 잠금 해제 (힌트 1 → 2 → 3)
- Home 카드 → /missions?category=XX 링크 연결
- 라우팅: / | /sandbox | /missions | /mission/:missionId
- **E2E 검증**: CT-1 미션 실행 → 빨간 구 렌더링 → 채점 100점 통과 확인

### UI/UX 개선 (2026-04-14 오후 3차)
- **폰트**: Inter(영문) + Pretendard(한글) + JetBrains Mono(코드) CDN 로드, 무게감/자간 세분화
- **툴바**: 이모지 버튼 → 깔끔한 텍스트 버튼 (toolbar-btn 클래스), 상태 표시 점
- **카메라**: z축 정면 기본 시점 (XY 2차원처럼 보임), OrbitControls로 3D 전환 가능
- **XYZ 축**: 기본 숨김 + 체크박스 토글
- **미션 진행률**: localStorage 저장, Home 카드에 실시간 완료 수/진행률 바 반영
- **다국어**: 채점 유형(정적 검사/궤적 비교/복합 채점) 다국어화

### 엔진 확장 (2026-04-14 오후 3차)
- **local_light**: 점광원 (PointLight) — pos, color, intensity 속성
- **distant_light**: 평행광 (DirectionalLight) — direction, color, intensity 속성
- 브릿지 update에서 light color/intensity/direction 변경 지원

### 기능 완성 (2026-04-14 오후 4차)
- **독립 HTML 내보내기** (`export-html.js`): 학생 코드 → Pyodide + Three.js CDN 포함 단일 HTML
- **공유 URL**: LZ-String 인코딩 → 클립보드 복사 (Sandbox 툴바에 "공유" 버튼)
- **URL 코드 로드**: `#code=` 해시에서 외부 코드 디코딩 + 경고 표시
- **AI 힌트 UI**: MissionPlay 우측 패널에 "AI 힌트 요청" 버튼 + 응답 표시
- **미션 목록 리디자인**: 그리드 → 리스트형, 미니멀 필터 pill, 완료 체크 표시
- **총 67개 테스트 전체 통과, 빌드 성공**

### Supabase 연동 (2026-04-14 오후 5차)
- **Supabase 클라이언트**: `lib/supabase.js` — `persistSession: false` (학교 공유 PC 대응)
- **인증 스토어**: `stores/authStore.js` — Zustand, Google + GitHub OAuth, 프로필 upsert
- **인증 모달**: `components/auth/AuthModal.jsx` — Google/GitHub 소셜 버튼, 모달 UI
- **OAuth 콜백**: `pages/AuthCallback.jsx` — Supabase 자동 세션 처리
- **코드 저장 스토어**: `stores/codeStore.js` — CRUD (saved_code), 미션 제출 기록 (submissions)
- **저장 코드 목록**: `components/code/SavedCodeList.jsx` — 사이드패널, 코드 불러오기/삭제
- **Sandbox 수정**: 저장/내 코드 버튼 추가, SavedCodeList 연동
- **MissionPlay 수정**: 채점 통과 시 submissions 테이블에 자동 기록
- **appStore 수정**: 로그인 시 localStorage 진행률 → Supabase 동기화

### 교사 대시보드 (2026-04-14 오후 5차)
- **Dashboard 페이지**: `pages/Dashboard.jsx` — 교사/학생 뷰 분기
- **학급 관리**: `components/dashboard/ClassManager.jsx` — 학급 생성, 초대 코드 복사
- **학생 현황**: `components/dashboard/StudentProgress.jsx` — 학급별 학생 진행률 테이블
- **학생 뷰**: 초대 코드 입력으로 학급 참여
- **Header 수정**: 교사 메뉴(대시보드) 동적 표시, 로그인/프로필 드롭다운

### DB 스키마 (2026-04-14 오후 5차)
- **4개 테이블**: vpylab_profiles, vpylab_classes, vpylab_saved_code, vpylab_submissions
- **11개 RLS 정책**: 본인 데이터만 CRUD, 교사는 담당 학급 학생 데이터 읽기
- **5개 인덱스**: user_id, mission_id, class_id, teacher_id
- **자동 갱신 트리거**: updated_at 필드 자동 업데이트
- pythink2 Supabase 프로젝트 (fipdcjhtfslinfmalwjn) 공유 사용

### 사운드 시스템 대폭 확장 (2026-04-14 오후 6차)
- **사운드 시스템 v2** (`sound-system.js`): 기본 beep → 완전한 오디오 엔진
  - 노트 이름 → 주파수 변환 (`noteToFreq`): C3~C6, 샵(#), 플랫(b) 지원
  - `playNote()`, `playChord()`, `playSequence()`: 노트 이름 기반 재생
  - **12종 게임 효과음** (슈퍼마리오 스타일): jump, coin, powerup, death, fireball, pipe, 1up, select, warning, explosion, laser + 기존 6종
  - `playSfx(name)`: 이름으로 효과음 호출 (대소문자 무관)
  - **5종 BGM 패턴** (8비트, 저작권 없음): adventure, explore, battle, peaceful, victory
  - `startBgm(name, loop)`, `stopBgm()`, `getCurrentBgm()`
  - `processSoundCommand()`: Python 브릿지 인터페이스
- **Python 사운드 API** (`vpython-api.py`): 8개 함수 추가
  - `play_sound()`, `play_note()`, `play_chord()`, `play_sequence()`
  - `play_sfx()`, `start_bgm()`, `stop_bgm()`
  - `note` 클래스: C3~C6 주파수 상수
- **Bridge 연동**: `vpython-bridge.js`에 `sound` 액션 처리 추가
- **Worker 등록**: `pyodide-worker.js`에 사운드 함수 8개 모듈 등록
- **SN 카테고리 + 미션 5개** (`missions.js`):
  - SN-1: 첫 번째 소리 (Lv.1) — play_sound() 기본
  - SN-2: 게임 효과음 탐험 (Lv.1) — play_sfx() 12종 체험
  - SN-3: 학교 종이 땡땡땡 (Lv.2) — play_note() 멜로디 연주
  - SN-4: 3D 피아노 (Lv.2) — 3D 건반 + 화음 연주
  - SN-5: 움직이는 공 + BGM (Lv.3) — 물리 시뮬레이션 + 효과음 + BGM
- **i18n**: ko/en에 SN(사운드 코딩) 카테고리 추가
- **사운드 테스트** (`sound-system.test.js`): 53개 테스트 신규
- **미션 16개** (CT2 + CR2 + MA2 + SC2 + AR3 + SN5), **120개 테스트 전체 통과, 빌드 성공**
- **E2E 검증**: Sandbox 무한루프 시뮬레이션 + SN-4 3D 피아노 + surface3d numpy 차트

### numpy + 3D 차트 시스템 (2026-04-14 오후 8차)
- **micropip 지연 설치**: `import numpy` 감지 → 자동 `micropip.install()` (첫 사용 시 3~5초)
  - 지원: numpy, matplotlib, pandas, scipy, sympy, scikit-learn
  - 표준 라이브러리(math, random, json 등) 자동 제외
  - 설치 상태 콘솔 표시 ("📦 numpy 설치 중..." → "✅ numpy 설치 완료!")
- **chart-system.js**: Three.js 네이티브 3D 차트 엔진 신규
  - 4종 차트: scatter3d, surface3d, line3d, bar3d
  - 5종 컬러맵: viridis, plasma, rainbow, coolwarm, ocean
  - 미디어아트 스타일: emissive 글로우 재질, 와이어프레임 오버레이
  - 반투명 축/그리드 (RGB 축선)
  - Python API: `scatter3d()`, `surface3d()`, `line3d()`, `bar3d()` + 한글 별칭
- **30색 팔레트**: `color['분홍']`, `색상['갈색']` — 속성/이름 접근 모두 가능
- **기본 리스트**: `음계['도']`, `무지개['빨']` — NamedList 클래스
- **악기 8종**: `악기("피아노", "도")`, `play_instrument("guitar", "C4")`
- **모든 속성 변경 가능**: box.size, cylinder.radius, ring.thickness 등 setter 추가
- **AR-3 미디어아트 미션**: 음악 파동 시각화 (음계+3D 구슬 격자+실시간 파동)
- **Sandbox clearRegistry 추가**: 코드 실행 시 레지스트리 초기화 (메모리 누수 방지)

### 학생 친화적 API 별칭 + BGM 자동 정지 (2026-04-14 오후 6차 추가)
- **짧은 별칭**: `sound()`, `sfx()`, `bgm()`, `chord()` (기존 함수 유지 + 별칭 추가)
- **한글 별칭**: `소리()`, `음표()`, `효과음()`, `배경음악()`, `배경음악정지()`, `화음()`
- **한글 노트 이름**: `음표("도4")`, `음표("솔#5")`, `음표("시b3")` — `_resolve_note_name()` 자동 변환
- **BGM 자동 정지**: 코드 완료(`onDone`), 에러(`onError`), 수동 정지(`handleStop`) 시 `stopBgm()` 자동 호출
  - Sandbox.jsx, MissionPlay.jsx 모두 적용
  - usePyodide 훅에 `onDone` 콜백 추가
- **미션 코드 업데이트**: SN-1~5를 짧은 별칭 + 한글로 전환
  - SN-3: `음표("솔4")` 스타일로 멜로디 입력
  - SN-5: `배경음악()`, `효과음()` 사용 + BGM 자동 정지 안내

### 하이브리드 카메라 시스템 (2026-04-14 오후 6차 추가)
- **camera-system.js**: 하이브리드 카메라 엔진 신규
  - Auto-Fit: 모든 물체를 감싸는 바운딩 박스 → 자동 줌/중심 조절
  - Smooth Follow: 물체 이동 감지 → 부드러운 카메라 추적 (lerp 보간)
  - Manual: 사용자 마우스 조작 시 자동 추적 해제
  - 더블클릭 또는 "📷 자동" 버튼 → Auto-Fit 복귀
- **Viewport3D.jsx 개선**:
  - 기본 카메라 거리 20→8 (가까이에서 시작)
  - CameraSystem 통합 (매 프레임 update)
  - 카메라 모드 뱃지 UI (자동/추적/수동)
  - 더블클릭 Auto-Fit 리셋
- **Sandbox/MissionPlay**: 코드 실행 시 `_cameraSystem.onCodeStart()` 호출

### 타임아웃 로직 개선 (2026-04-14 오후 6차 추가)
- **usePyodide.js**: "시작 후 10초" → "10초간 무응답 시" 타임아웃으로 변경
  - `rate()` 호출 시 batch 메시지가 오면 타이머 리셋
  - 무한 루프 시뮬레이션 (`while True: rate(100)`) 정상 동작
  - 에러 메시지 개선: "rate()가 있는지 확인하세요"

### About 페이지 + 배포 설정 (2026-04-14 오후 5차)
- **About 페이지**: 비전, GlowScript 비교 테이블, 기술 스택 카드, 기여 안내, 라이선스, 크레딧
- **i18n 추가**: auth, code, dashboard, about, common 섹션 (ko + en)
- **배포 준비**: Vercel `_redirects`, Railway `Procfile`, 환경변수 설정
- **67개 테스트 전체 통과, 빌드 성공**
- **라우팅 추가**: /about, /dashboard, /auth/callback

### 내보내기 동기화 v2 (2026-04-14 오후 9차)
- **export-html.js 완전 재작성**: vpython-api.py와 100% 동기화
  - 30색 팔레트(_ColorPalette + 한글 이름) + compound + make_trail + 속성 setter
  - 사운드: beep/note/chord/sequence + SFX 12종 + BGM 5종 + 악기 8종 인라인
  - 3D 차트: scatter3d/surface3d/line3d/bar3d + 5종 컬러맵 인라인
  - NamedList(음계/무지개/파스텔 등) + 한글 API 별칭(음표/효과음/배경음악/악기)
  - numpy 자동 설치(micropip) + stdout 콘솔 표시
  - `from vpython import *` 자동 제거 (독립 HTML에서 ModuleNotFoundError 수정)
  - `vector.clone()` 메서드 추가
- **E2E 테스트 5건 통과**: 30색/compound/trail, 사운드 7종, scatter3d/surface3d, NamedList/setter/rate(), 내보내기 HTML 20항목 검증
- **120개 vitest 테스트 통과, 빌드 성공**

### 갤러리 + GitHub Pages 발행 시스템 (2026-04-14 오후 9차)
- **DB 스키마**: `002_gallery.sql` — vpylab_gallery + vpylab_gallery_likes 테이블
  - RLS 7개 정책, 인덱스 7개, RPC 3개 (조회수/좋아요 토글/Remix 카운트)
  - 보안: 본인 작품만 수정/삭제, 본인 조회수 카운트 안 함, 좋아요 중복 방지
- **서버 API**: `server/routes/publish.js` — GitHub Pages 자동 발행
  - 리포 생성 → index.html 커밋 → Pages 활성화 → URL 반환
  - 보안: rate-limit 분당 3회, 리포명 sanitize, 민감 정보 검사, token DB 미저장
- **galleryStore**: Zustand — 목록/상세/발행/좋아요/Remix/검색/필터/페이지네이션
- **authStore 수정**: `public_repo` scope, `getGitHubToken()`, `isGitHubUser()`
- **UI 컴포넌트**:
  - Gallery.jsx — 갤러리 목록 (검색/카테고리 필터/정렬)
  - GalleryDetail.jsx — 작품 상세 + "영감" 링크 + Remix + 코드 보기
  - GalleryCard.jsx — 작품 카드 (썸네일/통계/Pages 배지)
  - PublishModal.jsx — 발행 모달 (제목/설명/카테고리/GitHub 옵션)
  - thumbnail.js — 3D 뷰포트 캡처
- **라우팅**: `/gallery`, `/gallery/:id` 추가
- **Sandbox**: "🚀 갤러리에 올리기" 버튼, `?remix={id}` 파라미터 → 코드 로드 + Remix 배너
- **Header**: 네비에 "갤러리" 추가
- **Home**: 인기 작품 하이라이트 섹션
- **i18n**: ko/en gallery 섹션 30+키 추가
- **GitHub 오픈소스 인프라**: .github/ (Issue/PR 템플릿, CI, CODEOWNERS 등 16파일) + docs/ (3파일) + CONTRIBUTING.md
- **120개 테스트 통과, 빌드 성공**

---

## 📋 다음 세션 작업 순서

### 우선순위 1: 실제 배포
1. **OAuth 활성화** — Supabase 대시보드에서 Google/GitHub OAuth 설정
2. **배포 실행** — Vercel + Railway 실제 배포
3. **E2E 인증 테스트** — 로그인 → 코드 저장 → 갤러리 발행 → GitHub Pages 확인

### 우선순위 2: 갤러리 고도화
4. **Sandbox 내보내기 파일명** — GitHub ID + 날짜시간 형식 (이미 적용됨)
5. **갤러리 상세에서 3D 미리보기** — 코드 자동 실행 (읽기 전용 Sandbox)
6. **Home 갤러리 하이라이트** — 추천/인기 작품 표시 (구현 완료, 데이터 필요)

### 우선순위 3: 기능 확장
7. **교사 역할 전환** — admin이 교사 역할 부여하는 기능
8. **미션 추가** — 50개 목표 중 16개 완료 → 추가 미션 개발
9. **2D 오버레이 차트** — plot2d() 함수 (캔버스 기반 HUD)
10. **matplotlib 이미지 렌더링** — base64 PNG → 콘솔/뷰포트 표시

---

## 📁 현재 파일 구조

```
vpylab/
├── PLAN.md, DESIGN_REVIEW.md, PROGRESS.md, CLAUDE.md
├── CONTRIBUTING.md
├── LICENSE (AGPL v3), CODE_OF_CONDUCT.md
├── .gitignore, package.json
├── .github/
│   ├── ISSUE_TEMPLATE/ (4개: bug, mission, feature, i18n)
│   ├── PULL_REQUEST_TEMPLATE/ (기본 + mission)
│   ├── workflows/ (ci, mission-review, i18n-check, welcome, stale)
│   ├── CODEOWNERS, SECURITY.md, FUNDING.yml, labels.yml
├── docs/ (MISSION_SCHEMA.md, I18N_GUIDE.md, GALLERY_SYSTEM.md)
├── supabase/
│   ├── config.toml
│   ├── migrations/001_vpylab_schema.sql (4테이블 + 11 RLS)
│   └── migrations/002_gallery.sql (2테이블 + 7 RLS + 3 RPC)
├── client/
│   ├── vite.config.js (포트 4033, vitest 설정 포함)
│   ├── .env, .env.example
│   ├── public/_redirects (Vercel SPA)
│   ├── src/
│   │   ├── index.css (4종 테마 + 브랜드 + 애니메이션)
│   │   ├── App.jsx (라우팅 + lazy loading + Gallery/GalleryDetail 추가)
│   │   ├── lib/supabase.js (Supabase 클라이언트)
│   │   ├── i18n/ (ko.json 180+키, en.json 180+키, index.jsx)
│   │   ├── engine/ (10개 엔진 파일 + 4개 테스트)
│   │   │   ├── sound-system.js, camera-system.js, chart-system.js
│   │   │   ├── vpython-api.py (30색 + NamedList + 한글 API + clone)
│   │   │   ├── thumbnail.js (3D 뷰포트 JPEG 캡처)
│   │   │   └── ... (code-preprocessor, vpython-bridge, grading-engine 등)
│   │   ├── data/missions.js (16개 미션 + 테스트)
│   │   ├── hooks/usePyodide.js
│   │   ├── components/
│   │   │   ├── layout/Header.jsx (갤러리 네비 추가)
│   │   │   ├── auth/AuthModal.jsx (Google + GitHub OAuth)
│   │   │   ├── code/SavedCodeList.jsx
│   │   │   ├── gallery/GalleryCard.jsx, PublishModal.jsx
│   │   │   ├── dashboard/ClassManager.jsx, StudentProgress.jsx
│   │   │   ├── editor/, viewport/, console/, shared/
│   │   ├── pages/ (Home, Sandbox, Missions, MissionPlay, About, Dashboard, Gallery, GalleryDetail, AuthCallback)
│   │   ├── stores/ (appStore.js, authStore.js, codeStore.js, galleryStore.js)
│   │   ├── utils/ (share.js, export-html.js v2)
│   │   └── test/setup.js
├── server/
│   ├── index.js, routes/ai.js, routes/publish.js
│   ├── Procfile (Railway)
│   └── .env, .env.example
```
