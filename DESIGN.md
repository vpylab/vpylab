# Design System — VPyLab

## Product Context
- **What this is:** Python 3D 프로그래밍 교육 플랫폼 (Pyodide + Three.js + Web Audio)
- **Who it's for:** 중/고등학생, 교사
- **Space/industry:** Creative coding education (p5.js, Scratch, Processing 계열)
- **Project type:** Web app (IDE + 미션 + 갤러리 + 대시보드)

## Aesthetic Direction
- **2026-11-06 학생 첫 화면 기준:** 장식과 기능 나열을 줄이고, 한 가지 주동작과 넉넉한 여백을 사용합니다. 홈은 짧은 기능 체험으로 시작하며, 주 메뉴는 트레이닝·만들기·튜토리얼·대장간·갤러리·문서·사용 안내 순서입니다. 문서·사용 안내 앞에는 간격을 두고 좁은 화면은 동일 순서의 메뉴로 접습니다. 소개·설정만 더보기에 둡니다. 튜토리얼은 3~5분 무점수 체험, 트레이닝은 기초→핵심 연습→선택 저장·공유 과정, 갤러리는 확인된 학생 프로젝트입니다. 중복 교재·예제 목록은 학생 기본 메뉴에서 제외합니다.
- **교재:** 한 단의 읽기 폭에서 예상→실행→바꾸기→만들기→확인을 한 단계씩 보여 줍니다. GitHub 절차 교재는 생각→따라 하기→적용→확인의 네 단계입니다. 상세 개념·힌트·차례는 펼쳐 읽습니다.
- **실습:** 실행·저장·프로젝트를 먼저 보여 주고 나머지는 도구에 모읍니다. 도구 안에서 소리 크기·음소거도 제어합니다. 기존 고급 기능은 더 보기와 도구에서 접근합니다.
- **Direction:** Playful-Scientific
- **Decoration level:** Intentional (도트 그리드 패턴, 서브틀한 텍스처)
- **Mood:** 과학관 체험 전시 — 조직적이지만 활기차고, 배움에 진지하지만 시각적으로 신나는
- **Reference sites:** p5js.org, scratch.mit.edu, openprocessing.org

## Typography
- **Display/Hero:** Satoshi (Variable, 700-900) — 기하학적이고 현대적, Inter와 차별화
- **Body:** DM Sans (400-600) — 따뜻하고 가독성 높음
- **UI/Labels:** DM Sans 500
- **Data/Tables:** JetBrains Mono (tabular-nums)
- **Code:** JetBrains Mono
- **Loading:** Google Fonts CDN
- **Scale:** 12 / 13 / 14 / 16 / 18 / 20 / 24 / 32 / 40 / 48 / 64 / 80

## Color
- **Approach:** Expressive — "빛의 분산" 컨셉, 다색 스펙트럼
- **Background:** #F8FAFC (기존 creative-light 테마)
- **Surface:** #FFFFFF
- **Primary text:** #111827
- **Secondary text:** #5F6672
- **Muted text:** #676E7B (모든 테마에서 주 배경·보조 배경·패널 대비 4.5:1 이상)
- **Border:** #E5E7EB
- **기본 강조색:** #2563EB. 화면은 `index.css`의 `--color-*` 테마 변수를 공유합니다.
- **Category colors (스펙트럼):**
  - CT (컴퓨팅): #6C5CE7 (Purple)
  - CR (창작): #FF6B6B (Coral)
  - MA (수학): #00CEC9 (Cyan)
  - SC (과학): #00B894 (Mint)
  - AR (아트): #F0883E (Orange)
  - SN (사운드): #E84393 (Pink)
  - AI (인공지능): #4A6CF7 (Blue)
- **Semantic:** success #00B894, warning #FDCB6E, error #FF6B6B, info #4A6CF7
- **실행·정지 버튼:** 실행 #047857, 정지 #B91C1C(흰 글자 대비 5.48:1·6.47:1, 테마와 무관). 실행 중에는 정지를 채운 빨간 버튼으로 표시합니다.
- **Dark mode:** 배경 #0F172A, 표면 #1E293B, 텍스트 #F8FAFC, 테두리 #334155

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable
- **Scale:** 2(2px) 4(4px) 8(8px) 12(12px) 16(16px) 20(20px) 24(24px) 32(32px) 40(40px) 48(48px) 64(64px) 80(80px)

## Layout
- **Approach:** Grid-disciplined
- **Grid:** 1 col (mobile) → 2 col (tablet) → 3 col (desktop)
- **Max content width:** 일반 페이지 1280px. 에디터·3D 작업 화면은 더 넓게 사용합니다.
- **Border radius:** 작업 카드·버튼·입력·탭·패널은 0. 아바타·상태 점처럼 원형 의미가 있는 요소만 full:9999px.
- **헤더:** 기존 앱과 같은 56px 기본 높이, 1px 하단 테두리와 작은 사각형 활성 메뉴.
- **새 교실:** 기존 화면의 색·작업 밀도를 따릅니다. 공통 브랜드 컴포넌트의 입체 V 심벌과 Satoshi 윤곽선 워드마크를 사용합니다.
- **로고:** `client/public/brand/`의 SVG가 원본입니다. 기본 파랑 `#2563EB`과 청록 면을 쓰고, 어두운 배경에서는 밝은 역상 로고를 사용합니다.
- **파비콘:** 파란 타일과 흰 V. SVG·ICO·32px PNG와 180px Apple 터치 아이콘을 기존 앱과 새 교실에서 공유합니다. 아이콘 타일의 둥근 모서리는 심벌 전용이며 기존 사각형 UI와 구분합니다.

## Motion
- **Approach:** Intentional
- **Easing:** enter(cubic-bezier(0.4, 0, 0.2, 1)) exit(ease-in) move(ease-in-out)
- **Duration:** micro(100ms) short(200ms) medium(300ms) long(500ms)
- **Patterns:** 카드 호버 translateY(-4px), 버튼 호버 scale(1.02), 페이지 입장 slide-up

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-14 | 디자인 시스템 생성 | /design-consultation 기반, p5.js 참고, Playful-Scientific 방향 |
| 2026-04-14 | Satoshi + DM Sans 선택 | Inter 대비 독자적 얼굴, 기하학적이면서 따뜻함 |
| 2026-04-14 | 다색 스펙트럼 컬러 | "빛의 분산" 컨셉, 카테고리별 고유색 |
| 2026-10-28 | 새 교실도 기존 테마·사각형 UI를 공유, 로고 제작 보류 | 사용자 디자인 선호 반영, 기존 `index.css`의 실제 기준과 문서 일치 |
| 2026-10-28 | 입체 V 로고·윤곽선 워드마크·공통 파비콘 첫 시안 제작 | 로고 제작 재개 요청. 기존 파랑·Satoshi·화면 밀도 유지, 두 경로가 만나는 형태로 창작과 협력 표현 |

2026-11-07 사용자 후속 지시: 대장간은 `/forge`의 독립 작업대로 제공한다. 재사용 단일 오브젝트만 제작하며 천체 운동 시스템은 제외한다. 프로젝트 전달은 코드 복사로 충분하다. 공개 목록은 코드를 기본으로 숨기고 포크 기록과 원본·참고 프로젝트 출처를 남긴다. 종은 모양 → 클릭 소리 → 음파로 진행한다.

2026-11-07 환영 캐릭터: 진로 앱의 단순한 사물 친구 모티프를 참고하되, 만두·손전등·공구상자·분홍 친구를 VPython 기본 도형으로 직접 구현합니다. 이름은 보류합니다. 첫 화면의 모양과 실습 코드는 같은 명세를 사용하고, 캐릭터별 전용 모션(만두 꼭지·손전등 점등·뚜껑 떨림·입 확대)·프렌즈의 독립된 통통 뛰기·캐릭터별 3D 무대 조명·모션 감소·WebGL 불가 시 정적 그림을 지원합니다.

2026-11-07 개인 메인: 공통 메뉴를 유지하고 대표 작품·환영 문구·배경색을 사용자별 브라우저 설정으로 제공합니다. 작품은 명시적 실행 후 기존 Worker/Viewport를 사용하며 화면 이탈 시 종료합니다. 기본 화면 복구는 코드 사본을 보존합니다. 기본 환영 장면도 OrbitControls로 회전하며 damping 없이 입력 때만 렌더링하고 시점 초기화와 터치 세로 스크롤을 지원합니다.

2026-11-07 디자인 점검 반영: 홈 오른쪽 열은 친구 고르기·모션 버튼·'이 친구, 내 코드로 만들기'만 펼치고 시점 초기화·무대 조명·조명 조절·모션 코드 링크는 '시점·조명 상세 설정'에 접습니다. WebGL을 만들 수 없으면 3D 화면 영역에만 안내를 표시하고 편집기·콘솔은 유지합니다.
