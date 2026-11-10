# 다국어(i18n) 기여 가이드

[English](I18N_GUIDE.md) · 한국어

VPy Lab의 다국어 지원 구조와 새 언어 추가 방법을 설명합니다. 코드 기준의 자세한 설명과 언어 코드가 고정된 파일 목록은 영문 문서 [I18N_GUIDE.md](I18N_GUIDE.md)에 있습니다.

> 2026-11-10 정정: 현재 코드는 `ko`와 `en` 두 언어만 지원합니다. 세 번째 언어는 번역 파일을 추가하는 것만으로는 동작하지 않으며 코드 수정이 필요합니다. 아래 절차에 필요한 수정 위치를 추가했습니다.

## 현재 지원 언어

| 언어 | 코드 | UI | 미션 | 상태 |
|------|------|----|----|------|
| 한국어 | ko | 완료 | 완료 | 기본 언어 |
| English | en | 완료 | 완료 | 완료 |

## 아키텍처

### UI 텍스트

```
client/src/i18n/
  index.jsx         # I18nProvider
  context.js        # 언어 메시지 등록, translate()
  useI18n.js        # t/locale hook
  locale.js         # 시작 언어 결정(?lang=, 저장된 선택, 기본 ko)
  ui-text.js        # 보조 사전용 ui() / useUiText()
  owned-content.js  # 서비스 교재의 영문 표시 사본(localizeCourse)
  catalogs/
    en-ui-text.json # 한국어 원문이 키인 보조 사전(영어)
  ko.json           # 한국어
  en.json           # 영어 (CI 키 비교의 기준 파일)
```

- JSON 키-값 구조, 중첩 지원
- `useI18n()` hook의 `t('key.path')` 함수로 접근
- fallback 순서: 선택 언어 -> 영어 -> 키 이름
- 템플릿 변수는 `{{count}}` 형태입니다.
- 이 방식과 별도로 한국어 원문을 키로 사용하는 보조 사전(`ui()`, `catalogs/en-ui-text.json`)이 있습니다. 아래 "2026-11-07 영문판 구현 기준"에서 설명합니다.

### 미션 텍스트

미션 데이터(`missions.js`) 내에 직접 다국어 텍스트를 포함합니다. 파일 안의 도우미 `text(ko, en)`이 `{ ko, en }` 객체를 만듭니다:

```javascript
const text = (ko, en) => ({ ko, en });

title: text('...', '...'),
description: text('...', '...'),
hints: [
  text('...', '...'),
],
```

`text()`는 인자를 두 개만 받습니다. 세 번째 언어를 넣으려면 이 도우미와 값을 읽는 화면 코드를 함께 고쳐야 합니다. `docs.js`와 `courses.js`의 제목은 `{ ko: '...', en: '...' }`를 직접 적습니다. 기초 교재 두 개(`light-sound-course.js`, `github-project-course.js`)의 본문은 한국어만 있고, 영어 화면에서는 `localizeCourse()`가 보조 사전으로 번역한 사본을 보여 줍니다.

## 새 언어 추가 절차

아래 Step 1~3만으로는 새 언어가 완성되지 않습니다. `ui()`로 표시하는 문구는 한국어로, `locale === 'ko' ? … : …` 형태로 나눈 문구는 영어로 표시되어 화면에 세 언어가 섞입니다. Step 2-1의 코드 수정이 함께 필요합니다.

### Step 1: UI 번역 파일 생성

```bash
# en.json을 기준으로 복사
cp client/src/i18n/en.json client/src/i18n/ja.json
```

`ja.json`의 모든 값(value)을 일본어로 번역합니다.
키(key)는 변경하지 않습니다.

### Step 2: i18n 모듈에 등록

`client/src/i18n/context.js`에 import를 추가합니다:

```javascript
import ko from './ko.json';
import en from './en.json';
import ja from './ja.json';   // 추가

const messages = { ko, en, ja };  // 추가
```

### Step 2-1: 언어 코드가 고정된 코드 수정

- `client/src/i18n/locale.js`: 허용 목록 `['ko', 'en']`에 새 코드를 추가합니다.
- `client/src/components/layout/Header.jsx`: 언어 선택 `<option>`을 추가합니다.
- `client/src/i18n/ui-text.js`: 영어 사전만 불러오고 `locale === 'en'`일 때만 번역합니다. 언어별 사전(`catalogs/<언어>-ui-text.json`)을 불러오도록 고칩니다.
- `client/src/i18n/owned-content.js`: `locale !== 'en'`이면 한국어 원본을 그대로 돌려줍니다.
- 화면 코드 약 30개 파일에 `locale === 'ko' ? '한국어' : 'English'` 형태의 분기가 있습니다. `ui()` 또는 `t()`로 바꿔야 합니다. 파일 목록은 영문 문서에 있습니다.
- 날짜 형식 `'ko-KR'`, `python-error-explainer.js`, `default-code.js`, `LoadingScreen.jsx`의 도움말 배열도 두 언어로 고정되어 있습니다.

### Step 3: 미션 텍스트 번역

`client/src/data/missions.js`의 `text(ko, en)` 도우미를 세 번째 언어를 받도록 고친 뒤 각 미션에 번역을 추가합니다:

```javascript
const text = (ko, en, ja) => ({ ko, en, ja });   // 도우미 수정

title: text('첫 번째 구', 'Your First Sphere', '最初の球'),
```

값을 읽는 화면은 대부분 `value[locale] || value.ko` 형태이므로 번역이 없는 항목은 한국어로 표시됩니다.

### Step 4: PR 제출

브랜치: `i18n/add-japanese`
커밋 메시지: `i18n: add Japanese translation`

## 번역 규칙

### 번역하지 않는 것

- 프로그래밍 키워드: `sphere`, `box`, `vector`, `color`, `rate`
- VPy Lab API: `from vpython import *`
- 함수명: `sphere()`, `cylinder()`, `math.sin()`
- 변수명: `ball`, `v`, `dt`, `g`

### 번역하는 것

- UI 텍스트 (버튼, 메뉴, 안내 문구)
- 미션 제목, 설명, 힌트
- 코드 내 주석 (`# 여기에 코드를 작성하세요`)
- 에러 메시지, 콘솔 출력 안내

### 한국어 특수 함수명 처리

VPy Lab은 한국어 함수명도 지원합니다 (Python alias):

| 한국어 | 영어 | 설명 |
|--------|------|------|
| 소리() | sound() / play_sound() | 주파수 소리 재생 |
| 음표() | play_note_and_wait() | 음표를 재생하고 길이만큼 기다림. `play_note()`는 기다리지 않음 |
| 효과음() | sfx() | 효과음 재생 |
| 배경음악() | bgm() | BGM 재생 |
| 배경음악정지() | stop_bgm() | BGM 정지 |
| 화음() | chord() | 화음 재생. 한국어 이름은 길이만큼 기다림 |
| 악기() | play_instrument() | 악기 음색으로 음표 재생. 한국어 이름은 길이만큼 기다림 |

한국어 변수/상수도 공식 API입니다:

| 한국어 | 영어 | 설명 |
|--------|------|------|
| 색상 | color | 30색 색상 팔레트 |
| 음계 | scale | C4~C5 기본 음계 |
| 높은음계 | high_scale | C5~C6 높은 음계 |
| 낮은음계 | low_scale | C3~C4 낮은 음계 |
| 무지개 | rainbow | 무지개 7색 |
| 따뜻한색 | warm_colors | 빨강/주황/노랑 계열 |
| 차가운색 | cool_colors | 하늘/파랑/보라 계열 |
| 기본색 | basic_colors | 흰/검/빨/초/파 |
| 파스텔 | pastel_colors | 부드러운 파스텔 색상 |

다른 언어 번역 시에도 예제 코드의 한국어 함수명은 유지할 수 있습니다. 필요한 경우 주석에서 영어 별칭을 병기합니다:

```python
# 음표("솔4", 0.4)  또는  play_note("G4", 0.4)
음표("솔4", 0.4)
```

## CI 자동 검증

PR 제출 시 자동으로 다음을 검사합니다:

1. **키 완전성**: en.json 대비 누락 키 검출 (`ci.yml`의 `validate-i18n`). `client/src/i18n/` 바로 아래의 JSON 파일만 비교하며 `catalogs/` 폴더는 비교하지 않습니다.
2. **미션 i18n**: 모든 미션의 title/description/hints에 필수 언어(ko, en) 존재 (`ci.yml`의 `validate-mission-i18n`)
3. **커버리지 리포트**: PR 코멘트로 번역 진행률 표시 (`i18n-check.yml`, 실패로 처리하지 않음)

`ui()`에 넘긴 한국어 문구가 보조 사전에 모두 있는지는 CI가 검사하지 않습니다. 사전에 없는 문구는 영어 화면에서 한국어로 표시됩니다.

## Crowdin 연동 (계획)

Crowdin 또는 Weblate 연동은 계획 단계이며, 현재 저장소에는 두 서비스의 설정 파일이 없습니다. 계획한 흐름은 다음과 같습니다:

1. `en.json`을 소스 파일로 설정
2. 번역자가 Crowdin 웹 에디터에서 번역
3. GitHub Action이 번역 결과를 자동으로 PR 생성
4. 리뷰 후 머지

이 방식은 비개발자(교사, 학부모)도 번역에 쉽게 참여할 수 있게 합니다.

## 2026-11-07 영문판 구현 기준

- `?lang=en` / `?lang=ko`는 명시된 공유 링크 언어를 선택하고 브라우저에 기억합니다. 잘못된 값은 저장된 유효 언어로 돌아갑니다. `I18nProvider`는 문서의 `html.lang`도 갱신합니다.
- 기존 키 기반 UI는 `t()`와 `ko.json`/`en.json`을 유지합니다. 추가된 고정 UI는 `useUiText()`와 `catalogs/en-ui-text.json`을 사용합니다. 한국어 원문이 키이며 동적 문자열은 ``ui`원문 ${value}` `` 형태입니다. 사전의 `{0}`, `{1}` 등 자리표시자 개수와 번호를 보존해야 합니다.
- `useUiText()`는 언어를 구독하지만 반환 함수의 참조는 유지합니다. 소스 로드·Worker 수명 효과에 언어 변경 때문에 불필요한 재실행을 만들지 않습니다.
- 사용자 제목·설명·이름·코드·stdout에 번역기를 일괄 적용하지 않습니다. `translateSystemMessage()`는 서비스가 만든 안내·오류 전용입니다. Worker의 패키지 안내는 `system:true`로 구분하며 같은 문자열을 학생이 print해도 번역하지 않습니다.
- `localizeCourse()`는 서비스 교재의 표시 사본만 만듭니다. 원본 데이터는 변경하지 않습니다. 기초 8차시·GitHub 4차시의 영문 사본에는 동등한 `play_note_and_wait`/C4 등의 표기를 사용하고, 만들기에서 처음 여는 해당 차시에도 같은 코드를 제공합니다. 기존 수정 초안은 그대로 보존합니다.
- 문맥에 따라 번역을 구분합니다. 예를 들어 대화상자의 `확인`은 OK, 학습 확인 단계는 Check입니다. 일반 고정 문구 사전을 내부 상태 값·비교용 키로 사용하지 않습니다.
- 번역 검증: `ui-text.test.jsx`, `locale.test.js`, 영문 `WorkbookCourse.test.jsx`, `usePyodide.test.jsx`의 출력 보존 검사와 실제 브라우저 `scripts/compat/english-browser.cjs`를 사용합니다. 학생 원문과 실행 코드는 고정 UI의 한글 잔존 검사에서 구분합니다.

영문 사용자 안내: [USER_GUIDE_EN.md](USER_GUIDE_EN.md).

언어별 같은 키를 가진 `ko.json`/`en.json`과 한국어 원문 키의 보조 사전 `catalogs/en-ui-text.json`은 구조가 다릅니다. 보조 사전은 하위 폴더에 두고 자체 자리표시자·교재 검사를 적용하며, 기존 언어 키 비교 검사는 그대로 유지합니다.

새 언어를 추가할 때는 `locale.js`의 허용 코드, Header의 언어 선택, `ui-text.js`의 보조 사전 연결도 함께 준비합니다. 현재 공개 지원 언어는 한국어와 영어입니다. 수정이 필요한 파일의 전체 목록과 권장 작업 순서는 영문 문서 [I18N_GUIDE.md](I18N_GUIDE.md)의 "Adding a third language today"에 있습니다.
