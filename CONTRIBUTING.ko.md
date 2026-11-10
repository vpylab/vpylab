# VPy Lab 기여 가이드 (Contributing Guide)

[한국어](#한국어) | [English](#english)

---

## 한국어

VPy Lab에 기여해 주셔서 감사합니다! 이 가이드는 교사, 학생, 개발자 모두를 위한 기여 안내서입니다.

### 기여 유형

| 유형 | 난이도 | 적합 대상 | 레이블 |
|------|--------|-----------|--------|
| 미션 콘텐츠 추가 | 쉬움 | 교사, 학생 | `mission` |
| 번역 (i18n) | 쉬움 | 누구나 | `i18n` |
| 버그 수정 | 보통 | 개발자 | `bug` |
| 새 기능 제안 | 보통 | 누구나 | `enhancement` |
| 엔진 개선 | 어려움 | 개발자 | `engine` |
| 문서 개선 | 쉬움 | 누구나 | `docs` |

### 빠른 시작

#### 1. 로컬 개발 환경 설정

```bash
# 리포지토리 포크 & 클론
git clone https://github.com/<your-username>/vpylab.git
cd vpylab

# 의존성 설치
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# 환경변수 설정
cp .env.example .env
# .env 파일을 편집하여 Supabase 키 등을 입력합니다

# 개발 서버 시작
npm run dev
# 클라이언트: http://localhost:4033
# 서버: http://localhost:4034
```

#### 2. 브랜치 생성

```bash
# 최신 main에서 브랜치 생성
git checkout main
git pull upstream main
git checkout -b <type>/<short-description>

# 브랜치 이름 예시:
# mission/add-pendulum-simulation
# i18n/add-japanese
# fix/editor-crash-on-empty-code
# feat/gallery-sharing
```

#### 3. 변경 후 PR 제출

```bash
# 테스트 실행
cd client && npm test && cd ..

# 커밋
git add .
git commit -m "mission: 진자 운동 시뮬레이션 미션 추가"

# 푸시 & PR 생성
git push origin mission/add-pendulum-simulation
```

GitHub에서 Pull Request를 생성하면 자동으로 CI 검사가 실행됩니다.

---

### 미션 콘텐츠 기여 (교사/학생용)

미션을 새로 만들거나 개선하려면 아래 워크플로우를 따라주세요.

#### 미션 스키마

`client/src/data/missions.js`에 아래 형식으로 미션을 추가합니다:

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

#### 카테고리

| ID | 이름 | 설명 |
|----|------|------|
| CT | 컴퓨팅 사고 | 기초 프로그래밍 개념 |
| CR | 3D 창작 | 자유로운 3D 모델링 |
| MA | 수학 시각화 | 수학 개념의 시각적 탐구 |
| SC | 과학 시뮬레이션 | 물리/화학 시뮬레이션 |
| AR | 코드 아트 | 미디어아트, 생성 예술 |
| SN | 사운드 코딩 | 음악, 효과음 프로그래밍 |
| AI | 인공지능 원리 | 기초 AI/ML 개념 |

#### 미션 기여 체크리스트

- [ ] `id`가 기존 미션과 중복되지 않는가?
- [ ] `title`, `description`, `hints`에 한국어(`ko`)와 영어(`en`)가 모두 있는가?
- [ ] `starterCode`에 학생이 채워야 할 부분이 주석으로 표시되어 있는가?
- [ ] `solutionCode`가 실제로 실행 가능한가?
- [ ] `assertions`/`codeChecks`/`expectedNotes`가 정답을 올바르게 검증하는가?
- [ ] 시작 코드는 바로 통과하지 않고, 모범 답안은 통과하는가?
- [ ] `level`이 적절한가? (1=따라하기, 2=변형하기, 3=설계하기, 4=창작하기)
- [ ] B등급 미션이면 `referenceTrajectory`가 있는가?
- [ ] 콘텐츠가 교육적으로 적절한가? (폭력적/차별적 내용 없음)

---

### 번역(i18n) 기여

VPy Lab은 JSON 기반 i18n을 사용합니다.

#### 새 언어 추가 방법

1. `client/src/i18n/en.json`을 복사하여 `<언어코드>.json` 생성 (예: `ja.json`)
2. 모든 값을 번역
3. `client/src/i18n/index.jsx`에 import 추가
4. PR 제출

#### 미션 내 텍스트 번역

미션의 `title`, `description`, `hints`에 새 언어 키를 추가합니다:

```javascript
title: {
  ko: '첫 번째 구',
  en: 'Your First Sphere',
  ja: '最初の球',  // 새로 추가
},
```

#### 번역 가이드라인

- `sphere`, `vector` 같은 VPython 기본 용어는 원문을 유지하되, `음표()`, `효과음()`, `색상`, `음계`, `무지개`처럼 VPyLab이 공식 제공하는 한글 API는 그대로 사용
- 자연스러운 표현 사용 (직역보다 의역)
- 코드 주석의 번역은 해당 언어 사용자가 이해할 수 있도록 작성
- `starterCode`/`solutionCode` 내 주석도 번역 대상

---

### 코드 기여

#### 코드 컨벤션

- UI 텍스트와 주석은 한국어 (영문 병기 가능)
- 앱/서버 JavaScript 코드의 변수명/함수명은 영어
- 학생용 Python 예제와 미션 코드는 한글 변수명과 공식 한글 API 사용 가능 (`크기`, `구슬들`, `음표()`, `화음()` 등)
- React 함수형 컴포넌트 + Hooks 사용
- Tailwind CSS (v4) 사용
- ESLint 규칙 준수

#### 보안 규칙

- `innerHTML` 사용 금지 (XSS 방지 — `textContent` 사용)
- Pyodide Worker에서 `fetch`, `WebSocket`, `IndexedDB` 접근 불가
- Supabase RLS 정책 필수 적용
- `.env` 파일은 절대 커밋하지 않음

#### 테스트

```bash
# 미션 데이터 무결성 테스트
cd client && npx vitest run src/data/missions.test.js

# 전체 테스트
cd client && npm test
```

---

### PR 가이드라인

- PR은 하나의 주제만 다룹니다 (미션 1개, 버그 1개 등)
- 관련 Issue가 있으면 `Closes #123` 형식으로 연결합니다
- CI 검사를 통과해야 머지됩니다
- 미션 PR은 교육 전문가의 리뷰를 받습니다
- 코드 PR은 메인테이너의 코드 리뷰를 받습니다

### 커밋 메시지 형식

```
<type>: <description>

# 예시:
mission: CT-3 피보나치 시각화 미션 추가
fix: 에디터 빈 코드 실행 시 크래시 수정
i18n: 일본어 번역 추가
feat: 갤러리 공유 기능 구현
docs: 기여 가이드 업데이트
refactor: Worker 메시지 핸들링 개선
```

---

## English

Thank you for contributing to VPy Lab! This guide is for teachers, students, and developers.

### Types of Contributions

| Type | Difficulty | For | Label |
|------|-----------|-----|-------|
| Add mission content | Easy | Teachers, Students | `mission` |
| Translation (i18n) | Easy | Anyone | `i18n` |
| Bug fix | Medium | Developers | `bug` |
| Feature proposal | Medium | Anyone | `enhancement` |
| Engine improvement | Hard | Developers | `engine` |
| Documentation | Easy | Anyone | `docs` |

### Quick Start

```bash
# Fork & clone
git clone https://github.com/<your-username>/vpylab.git
cd vpylab

# Install dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Set up environment
cp .env.example .env

# Start dev server
npm run dev
# Client: http://localhost:4033
# Server: http://localhost:4034
```

### Mission Contribution

See the mission schema and category table above (in Korean section). All missions require both Korean (`ko`) and English (`en`) text for `title`, `description`, and `hints`.

### Translation (i18n)

1. Copy `client/src/i18n/en.json` to `<lang-code>.json`
2. Translate all values
3. Add import to `client/src/i18n/index.jsx`
4. Submit a PR

### Code Conventions

- UI text and comments: Korean (English accepted)
- Variable/function names: English
- React functional components + Hooks
- Tailwind CSS v4
- No `innerHTML` (use `textContent` for XSS prevention)

### Commit Messages

```
<type>: <description>

# Examples:
mission: add Fibonacci visualization mission CT-3
fix: prevent crash on empty code execution
i18n: add Japanese translation
feat: implement gallery sharing
```

---

## 라이선스 (License)

- 코드(Code): [AGPL v3](LICENSE)
- 미션 콘텐츠(Mission Content): [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)

기여하신 코드는 AGPL v3, 미션 콘텐츠는 CC BY-NC-SA 4.0 라이선스가 적용됩니다.
PR 제출 시 이에 동의하는 것으로 간주합니다.
