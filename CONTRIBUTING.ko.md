# VPyLab 기여 가이드

[English](CONTRIBUTING.md) · 한국어

교사, 학생, 개발자 모두 기여할 수 있습니다.

**먼저 [docs/SCOPE.md](docs/SCOPE.md)를 읽습니다.** 지금은 기능 동결 기간입니다. 버그 수정, 테스트, 번역, 학습 자료, 문서는 받고, 새 기능은 그 문서의 핵심 범위에 해당할 때만 받습니다. 추가 기능은 애드온 규칙을 따릅니다.

## 기여 유형

| 유형 | 적합 대상 | 위치 | 레이블 |
|------|-----------|------|--------|
| 버그 수정 | 개발자 | `client/src/`, `shared/`, `cloudflare/` | `bug` |
| 테스트 추가와 개선 | 개발자 | 코드 옆의 `*.test.js` | |
| 번역 (i18n) | 누구나 | [docs/I18N_GUIDE.ko.md](docs/I18N_GUIDE.ko.md) | `i18n` |
| 미션과 학습 자료 | 교사, 학생 | `client/src/data/`, [docs/MISSION_SCHEMA.md](docs/MISSION_SCHEMA.md) | `mission` |
| 문서 개선 | 누구나 | `README.ko.md`, `docs/` | `docs` |
| 엔진 개선 | 개발자 | `client/src/engine/`, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | `engine` |
| 새 기능 제안 | 누구나 | 이슈로 제안합니다. 동결 기간의 기본 답은 "나중에"입니다 | `enhancement` |

어디서 시작할지 모르면 이슈를 열어 묻습니다. `good first issue` 레이블이 붙은 이슈는 첫 기여에 알맞은 크기입니다.

## 개발 환경

필요한 것은 Node.js 20 이상입니다. 학습 자료의 코드를 실행하는 테스트에는 Python 3.12가 필요합니다(PATH에 `python3.12`. Python이 없으면 그 테스트는 건너뜁니다).

```bash
# vpylab/vpylab을 포크한 저장소를 받습니다
git clone https://github.com/<your-username>/vpylab.git
cd vpylab/client
npm install
npm run dev                          # http://localhost:4033
```

계정, 키, 데이터베이스 없이 실행됩니다. VPyLab에는 자체 서버가 없습니다. 앱은 정적 사이트이고, 서버 쪽 코드는 `functions/`의 Cloudflare Pages 함수 몇 개뿐입니다(로직은 `cloudflare/`).

- Vite 개발 서버에는 `/api/*`가 없습니다. 이때 공유는 코드를 담은 긴 링크로 대신하고, GitHub 연결은 동작하지 않습니다.
- 함수까지 실행하려면 빌드한 뒤 wrangler를 사용합니다. `npx wrangler pages dev client/dist --port 4086 --persist-to /private/tmp/vpylab-pages-dev-state`. 로컬 비밀값은 커밋되지 않는 `.dev.vars`에 둡니다.
- 구글 드라이브 저장과 GitHub 기능은 빌드할 때 공개 클라이언트 ID가 필요합니다. `client/.env.example`을 `client/.env.local`로 복사해 자기 값을 넣습니다. 설정 방법은 [docs/DEPLOY.md](docs/DEPLOY.md)에 있습니다.

## 브랜치와 PR

```bash
# 최신 main에서 브랜치를 만듭니다
git checkout main
git pull upstream main
git checkout -b <type>/<short-description>

# 브랜치 이름 예시
# mission/add-pendulum-simulation
# i18n/add-japanese
# fix/editor-crash-on-empty-code
```

PR을 올리기 전에 CI가 실행하는 검사를 먼저 실행합니다.

```bash
npm --prefix client run lint
npm --prefix client run test:run
npm --prefix client run build
# shared/, cloudflare/, scripts/gallery/를 고쳤을 때만
node --test shared/*.test.js cloudflare/*.test.js scripts/gallery/*.test.mjs
```

- PR 하나는 주제 하나만 다룹니다(미션 1개, 버그 1개 등).
- PR 양식을 채웁니다. 확인한 것과 확인하지 못한 것을 함께 적습니다.
- 관련 이슈가 있으면 `Closes #123` 형식으로 연결합니다.
- 기능을 더하는 변경이면 [docs/SCOPE.md](docs/SCOPE.md)의 애드온 규칙을 어떻게 지키는지 적습니다.
- CI 검사를 통과해야 병합됩니다.

## 미션 콘텐츠 기여 (교사·학생)

`client/src/data/missions.js`에 아래 형식으로 미션을 추가합니다. 자세한 규칙은 [docs/MISSION_SCHEMA.md](docs/MISSION_SCHEMA.md)에 있습니다.

```javascript
{
  id: 'CT-3',              // 카테고리-번호 (고유)
  category: 'CT',           // CT|CR|MA|SC|AR|SN|AI
  level: 1,                 // 1=따라하기, 2=변형하기, 3=설계하기, 4=창작하기
  title: {
    ko: '미션 제목 (한국어)',
    en: 'Mission Title (English)',
  },
  description: {
    ko: '미션 설명 (한국어)',
    en: 'Mission description (English)',
  },
  gradeType: 'A',           // 'A'=정적 검사, 'B'=궤적 비교, 'A+B'=복합, 'notes'|'code'|'run'
  starterCode: `from vpython import *\n\n# 시작 코드`,
  solutionCode: `from vpython import *\n\n# 정답 코드`,
  assertions: [
    // A등급 채점 조건
    { type: 'sphere', property: 'color.r', operator: '==', value: 1 },
  ],
  // B등급 미션만: referenceTrajectory (좌표 배열)
  hints: [
    { ko: '힌트 (한국어)', en: 'Hint (English)' },
  ],
}
```

### 카테고리

| ID | 이름 | 설명 |
|----|------|------|
| CT | 컴퓨팅 사고 | 기초 프로그래밍 개념 |
| CR | 3D 창작 | 자유로운 3D 모델링 |
| MA | 수학 시각화 | 수학 개념의 시각적 탐구 |
| SC | 과학 시뮬레이션 | 물리/화학 시뮬레이션 |
| AR | 코드 아트 | 미디어아트, 생성 예술 |
| SN | 사운드 코딩 | 음악, 효과음 프로그래밍 |
| AI | 인공지능 원리 | 기초 AI/ML 개념 |

### 미션 기여 체크리스트

- [ ] `id`가 기존 미션과 중복되지 않는가?
- [ ] `title`, `description`, `hints`에 한국어(`ko`)와 영어(`en`)가 모두 있는가?
- [ ] `starterCode`에 학생이 채워야 할 부분이 주석으로 표시되어 있는가?
- [ ] `solutionCode`가 실제로 실행 가능한가?
- [ ] `assertions`/`codeChecks`/`expectedNotes`가 정답을 올바르게 검증하는가?
- [ ] 시작 코드는 바로 통과하지 않고, 모범 답안은 통과하는가?
- [ ] `level`이 적절한가? (1=따라하기, 2=변형하기, 3=설계하기, 4=창작하기)
- [ ] B등급 미션이면 `referenceTrajectory`가 있는가?
- [ ] 콘텐츠가 교육적으로 적절한가? (폭력적/차별적 내용 없음)

## 번역(i18n) 기여

화면 문구는 한국어와 영어가 모두 있어야 합니다. 번역 방식과 새 언어를 추가하는 절차는 [docs/I18N_GUIDE.ko.md](docs/I18N_GUIDE.ko.md)에 있습니다. 새 언어를 추가하려면 먼저 이슈를 열어 범위를 정합니다.

미션의 `title`, `description`, `hints`에는 언어별 키를 둡니다.

```javascript
title: {
  ko: '첫 번째 구',
  en: 'Your First Sphere',
},
```

번역할 때 지킬 점은 다음과 같습니다.

- `sphere`, `vector` 같은 VPython 기본 용어는 원문을 유지합니다. `음표()`, `효과음()`, `색상`, `음계`, `무지개`처럼 VPyLab이 제공하는 한글 API는 그대로 사용합니다.
- 직역보다 자연스러운 표현을 사용합니다.
- `starterCode`와 `solutionCode` 안의 주석도 번역 대상입니다.

## 코드 기여

### 코드 컨벤션

- UI 텍스트와 주석은 한국어입니다(영문 병기 가능). 이미 있는 주석을 언어만 바꾸려고 다시 작성하지 않습니다.
- 앱과 함수의 JavaScript 코드에서 변수명과 함수명은 영어입니다.
- 학생용 Python 예제와 미션 코드는 한글 변수명과 한글 API를 사용할 수 있습니다(`크기`, `구슬들`, `음표()`, `화음()` 등). 학생 코드는 한 줄에 문장 하나로 작성하고 조건 표현식을 사용하지 않습니다.
- React 함수형 컴포넌트와 Hooks, Tailwind CSS v4를 사용하고 ESLint 규칙을 지킵니다.

### 보안 규칙

- `innerHTML`, `outerHTML`, `insertAdjacentHTML`에 값을 넣지 않습니다. `textContent`와 DOM 메서드를 사용합니다. CI가 검사합니다.
- 학생의 Python은 네트워크와 저장소 API를 지운 Web Worker에서 실행됩니다. 지운 API를 되살리지 않습니다.
- `.env` 파일, `.dev.vars`, 키는 커밋하지 않습니다. `VITE_` 변수의 값은 공개값입니다.
- 응답 헤더와 CSP는 `client/public/_headers`에 있습니다. 외부 주소를 더하려면 결정을 기록해야 합니다([docs/SCOPE.md](docs/SCOPE.md) 규칙 6).

### 서버와 데이터베이스를 더하지 않습니다

VPyLab은 정적 사이트 하나이며 운영자는 학생 데이터를 보관하지 않습니다. 운영 서버, 데이터베이스, VPyLab 계정이 필요한 기능은 더하지 않습니다. 선택 기능은 `client/src/lib/api-base.js`의 빌드 설정으로 켜고 끄며, 꺼져 있을 때 핵심이 그대로 동작해야 합니다.

### 테스트

```bash
# 미션 데이터 검사
cd client && npx vitest run src/data/missions.test.js

# 전체 클라이언트 테스트
npm --prefix client run test:run
```

미션의 시작 코드는 자기 검사를 통과하지 않아야 하고, 모범 답안은 통과해야 합니다. 테스트가 코드를 실제로 실행해 확인합니다.

## 커밋 메시지 형식

```
<type>: <description>

# 예시
mission: CT-3 피보나치 시각화 미션 추가
fix: 에디터 빈 코드 실행 시 크래시 수정
test: 빈 편집기 실행 검사 추가
i18n: SN-3 영어 힌트 추가
docs: 기여 가이드 업데이트
refactor: Worker 메시지 처리 정리
```

## 리뷰

관리자가 모든 PR을 검토합니다. 미션과 학습 자료는 수업에 알맞은지도 함께 봅니다. 목표가 분명한지, 초보자가 할 수 있는지, 검사가 문구가 아니라 개념을 확인하는지를 봅니다. 검토에는 며칠이 걸릴 수 있습니다. 지금 관리자는 한 사람입니다.

## 행동 강령과 라이선스

기여하면 [행동 강령](CODE_OF_CONDUCT.md)에 동의하는 것으로 봅니다. 코드는 AGPL v3, 미션과 학습 자료는 CC BY-NC-SA 4.0으로 배포됩니다.
