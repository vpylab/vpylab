# Scope and feature freeze

English · [한국어](#한국어)

Status: in effect from 2026-11-10 until the maintainer lifts it in this file.

## Why this file exists

VPyLab grew quickly and is maintained by one person. More features now would make it harder to keep working and harder to show that it helps students learn. So new features stop for a while, and this file says what VPyLab is, what is paused, and how anything extra must be built.

## The core

VPyLab is **Python that students write in the browser and see and hear at once as 3D shapes, light and sound.** These parts are the core. They must always work, and work on them continues during the freeze.

| Core part | Where it lives |
|---|---|
| Running student Python safely in the browser (Pyodide in a Web Worker) | `client/src/engine/pyodide-worker.js`, `student-code-transform.py` |
| The VPython-style 3D API and its rendering | `client/src/engine/vpython-api.py`, `vpython-bridge.js` |
| Light and sound from the same code | `client/src/engine/sound-system.js` and the lighting parts of the API |
| The Create screen: editor, 3D view, console, run and stop | `client/src/pages/Sandbox.jsx` |
| Lessons that lead from first run to an original project (Training, Tutorials) and the reference docs | `client/src/data/` |
| Google sign-in and saving to the student's own Google Drive ([plan](GOOGLE_FIRST_PLAN.md)) | `client/src/drive-lab/`, `client/src/drive/` |
| Working without an account: opening and downloading code files, the draft kept in the browser, share links | `client/src/utils/code-file.js`, `sandbox-draft.js`, `share.js` |
| Two editions from one codebase, and the classroom edition's existing sign-in, saving and team flow | `client/src/lib/api-base.js`, `client/src/stores/`, `server/` |
| Interface in Korean and English | `client/src/i18n/` |

Google sign-in and Drive saving are core, not an extra. They are the planned way for the project to keep no student data.

## What is welcome during the freeze

- Bug fixes and tests.
- Faster loading and lower memory use.
- Accessibility.
- Translations, and making it easier to add a language.
- Better lessons, missions and documentation.
- The steps of the [Google-first plan](GOOGLE_FIRST_PLAN.md).
- Work that shows whether students learn: studies, measurement tools kept outside the app (`scripts/research/`).

## What is paused

New features outside the core. This includes new screens, new content types, new integrations, new storage backends beyond the Google-first plan, and new spin-offs inside this repository.

Features that already exist stay. Nothing is removed by this file.

## The add-on rule

Anything that is not core is an add-on, including features that already exist: video recording and saving videos to Drive, the Forge, the gallery, the physical-computing pilot missions, classroom LAN mode, the teacher-training app, GitHub team projects in the open edition.

An add-on must meet all of these:

1. **The core works without it.** If the add-on is switched off, fails to load, or is deleted, running code, the 3D view, sound, and saving still work.
2. **It does not change core behavior.** It may read from the core. It must not change what the core does when the add-on is not being used.
3. **It attaches at one clear point** (a menu item, a route, a build flag), and can be switched off there.
4. **Its failures stay inside it.** An error in the add-on shows a message in the add-on and nothing else stops.
5. **It has its own tests**, including one for "the add-on is unavailable".
6. **It does not add a network origin, a permission, or stored personal data** to the core without a decision recorded in this file or in the pull request.

Existing add-ons were not all written to this rule. Bringing them in line is welcome work during the freeze. Known gaps today:

- Video recording is imported directly by `Sandbox.jsx`. It fails safely when the browser cannot record, but the Create screen would not build if the module were deleted.

## Recorded decisions (rule 6)

- **2026-11-12, GitHub team projects in the open edition** (`client/src/github/`, `functions/api/github/token.js`). The maintainer decided the three-step flow in [GOOGLE_FIRST_PLAN.md](GOOGLE_FIRST_PLAN.md) section 0: no sign-in to start, Google Drive to save, GitHub only for team projects. This add-on adds, only in builds that set `VITE_GITHUB_CLIENT_ID`: the network origin `https://api.github.com` in the main app's CSP, the GitHub permissions `public_repo` and `repo:invite` requested from a student who chooses to connect, and one Pages Function that exchanges the sign-in code for a token and stores nothing. The project stores no student data for it. The token stays in the browser tab's storage.
- **2026-11-12, the Google access token moves from page memory to the browser tab's storage** (`sessionStorage`), so a refresh does not disconnect Drive. It is removed when the tab closes or the student signs out.

## How to propose a feature anyway

Open an issue with: the classroom problem it solves, why it cannot wait, how it meets the add-on rule, and how you would know it helped students. The maintainer decides. The default answer during the freeze is "later".

## Lifting the freeze

The maintainer lifts the freeze by editing this file. Reasonable conditions: a second regular contributor, or published evidence from a classroom study that tells us what to build next.

---

## 한국어

상태: 2026-11-10부터 적용합니다. 관리자가 이 파일을 고쳐 해제할 때까지 유지합니다.

### 이 문서를 두는 까닭

VPyLab은 짧은 기간에 커졌고 한 사람이 유지합니다. 지금 기능을 더 늘리면 유지가 어려워지고, 학생의 학습에 도움이 되는지 보이기도 어려워집니다. 그래서 한동안 새 기능을 멈추고, VPyLab이 무엇인지와 추가 기능을 만드는 규칙을 이 문서에 적습니다.

### 핵심

VPyLab은 **학생이 브라우저에서 파이썬을 작성하면 3D 도형과 빛과 소리로 바로 나타나는 실습실**입니다. 아래는 핵심이며 언제나 동작해야 합니다. 동결 기간에도 핵심 작업은 계속합니다.

- 브라우저에서 학생의 파이썬을 안전하게 실행하기
- VPython 방식의 3D 명령과 화면 표시
- 같은 코드에서 나오는 빛과 소리
- 만들기 화면(편집기, 3D 화면, 출력, 실행과 정지)
- 첫 실행에서 자기 작품까지 이어지는 학습 자료(트레이닝, 튜토리얼)와 문서
- 구글 로그인과 학생 본인의 구글 드라이브 저장([계획](GOOGLE_FIRST_PLAN.md))
- 계정 없이 작업하기(코드 파일 열기와 내려받기, 브라우저에 남는 초안, 공유 링크)
- 코드 하나로 두 판을 배포하는 구조, 수업용 판의 기존 로그인·저장·팀 흐름
- 한국어와 영어 화면

구글 로그인과 드라이브 저장은 추가 기능이 아니라 핵심입니다. 운영자가 학생 데이터를 보관하지 않기 위한 계획된 방식입니다.

### 동결 기간에 받는 작업

- 버그 수정과 테스트
- 불러오기 속도와 메모리 사용 개선
- 접근성
- 번역, 언어를 추가하기 쉽게 만드는 작업
- 학습 자료, 미션, 문서 개선
- 구글 중심 전환 계획의 단계
- 학습 효과를 확인하는 작업(수업 연구, 앱 밖에 두는 측정 도구 `scripts/research/`)

### 멈추는 것

핵심 밖의 새 기능을 멈춥니다. 새 화면, 새 콘텐츠 유형, 새 외부 연동, 구글 중심 전환 계획에 없는 저장 방식, 이 저장소 안의 새 스핀오프가 여기에 해당합니다.

이미 있는 기능은 그대로 둡니다. 이 문서 때문에 지우는 기능은 없습니다.

### 애드온 규칙

핵심이 아닌 것은 모두 애드온입니다. 이미 있는 기능도 포함합니다. 영상 녹화와 영상의 드라이브 저장, 대장간, 갤러리, 피지컬 컴퓨팅 시범 미션, 교실 LAN 모드, 교사 연수용 앱, 오픈소스 판의 GitHub 팀 프로젝트가 애드온입니다.

애드온은 아래를 모두 지켜야 합니다.

1. **애드온이 없어도 핵심이 동작합니다.** 애드온을 끄거나, 불러오지 못하거나, 지워도 코드 실행, 3D 화면, 소리, 저장이 동작합니다.
2. **핵심의 동작을 바꾸지 않습니다.** 핵심의 값을 읽을 수는 있습니다. 애드온을 사용하지 않을 때 핵심이 하는 일은 달라지지 않아야 합니다.
3. **한 지점에서만 연결합니다.** 메뉴 항목, 경로, 빌드 설정 가운데 하나에 연결하고 그곳에서 끌 수 있어야 합니다.
4. **실패가 애드온 안에 머뭅니다.** 애드온의 오류는 애드온 안에서 안내하고 다른 것을 멈추지 않습니다.
5. **자체 테스트가 있습니다.** 애드온을 사용할 수 없는 경우의 테스트를 포함합니다.
6. **핵심에 새 외부 주소, 새 권한, 새 개인정보 저장을 더하지 않습니다.** 필요하면 이 문서나 PR에 결정을 기록합니다.

이미 있는 애드온이 모두 이 규칙대로 만들어진 것은 아닙니다. 규칙에 맞게 고치는 작업은 동결 기간에 받습니다. 지금 알고 있는 차이는 다음과 같습니다.

- 영상 녹화 모듈을 `Sandbox.jsx`가 직접 불러옵니다. 녹화를 지원하지 않는 브라우저에서는 안전하게 안내하지만, 모듈을 지우면 만들기 화면이 빌드되지 않습니다.

### 기록한 결정 (규칙 6)

- **2026-11-12, 오픈소스 판의 GitHub 팀 프로젝트** (`client/src/github/`, `functions/api/github/token.js`). 관리자가 [GOOGLE_FIRST_PLAN.md](GOOGLE_FIRST_PLAN.md) 0절의 세 단계(로그인 없이 시작, 저장은 구글 드라이브, 팀 프로젝트만 GitHub)를 정했습니다. 이 애드온은 `VITE_GITHUB_CLIENT_ID`를 넣은 빌드에서만 다음을 더합니다. 본 앱 CSP의 외부 주소 `https://api.github.com`, 연결을 고른 학생에게 요청하는 GitHub 권한 `public_repo`와 `repo:invite`, 로그인 코드를 토큰으로 바꾸고 아무것도 저장하지 않는 Pages 함수 하나입니다. 운영자가 보관하는 학생 데이터는 없습니다. 토큰은 브라우저 탭 저장소에 둡니다.
- **2026-11-12, 구글 접근 토큰을 페이지 메모리에서 브라우저 탭 저장소**(`sessionStorage`)**로 옮김.** 새로 고침해도 드라이브 연결이 유지됩니다. 탭을 닫거나 로그아웃하면 지워집니다.

### 그래도 기능을 제안하려면

이슈에 다음을 적습니다. 해결하려는 수업의 문제, 미룰 수 없는 이유, 애드온 규칙을 지키는 방법, 학생에게 도움이 되었는지 확인하는 방법입니다. 관리자가 결정합니다. 동결 기간의 기본 답은 "나중에"입니다.

### 동결 해제

관리자가 이 파일을 고쳐 해제합니다. 해제 조건으로는 꾸준히 기여하는 두 번째 사람이 생기는 것, 또는 수업 연구 결과가 발표되어 다음에 만들 것이 분명해지는 것이 알맞습니다.
