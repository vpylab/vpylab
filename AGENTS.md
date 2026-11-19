# VPyLab — Codex 가이드

## 프로젝트 개요

3D 프로그래밍 교육 플랫폼. Pyodide(Python 3) + Three.js + Web Audio API.
전 세계 학교를 위한 오픈소스 프로젝트.

## 기술 스택

- **프론트엔드**: React 19 + Vite + Tailwind v4 (client/, 포트 4033)
- **백엔드**: Express 5 (server/, 포트 4034)
- **에디터**: Monaco Editor
- **3D**: Three.js
- **Python**: Pyodide (Web Worker)
- **DB/인증**: Supabase Pro
- **AI**: 기본 학습은 AI 없이 진행. Solar Pro 4 도형 제안은 검증 원형만 있으며 공개 라우트·학생 UI에 미연결.
- **호스팅**: 저장소 `vpylab/vpylab` 하나에서 두 판을 배포. 수업용 판은 Vercel(`vpylab.vercel.app`)과 Railway(서버), 오픈소스 판은 Cloudflare Pages(`vpylab.pages.dev`). `main`에 병합하면 Vercel·Railway가 바로 배포하고, CI가 성공하면 `deploy-pages.yml`이 Cloudflare에 배포 (`docs/DEPLOY_TWO_EDITIONS.md`)
- **판 구분**: `VITE_EDITION` (`client/src/lib/api-base.js`). 오픈소스 판은 서버·DB 없이 학생 구글 드라이브에 저장

## 코딩 컨벤션

- UI 텍스트와 주석은 한국어
- 코드(변수명, 함수명 등)는 영어
- CSS 변수 기반 2종 테마 시스템 (creative-light / deep-dark)
- 폰트: Satoshi(Display) + DM Sans(Body) + JetBrains Mono(Code)
- 디자인 시스템: DESIGN.md 참조
- 보안: Express에 helmet, cors, rate-limit 필수. Worker 내 위험 API 삭제 필수.

## 보안 주의사항

- `.env` 파일은 절대 커밋하지 않음
- 모든 콘솔 출력은 textContent로만 렌더링 (innerHTML 금지)
- Pyodide Worker에서 fetch, WebSocket, IndexedDB 삭제 필수
- Supabase RLS 정책 필수 적용
- LZ-String 디코딩 후 50KB 상한 검증

## 라이선스

- 코드: AGPL v3
- 미션 콘텐츠: CC BY-NC-SA 4.0

## 호환성과 학습자료 기준 (2026-11-06 사용자 지시)

- 특별한 논리적 문제가 없으면 표준 Python과 공식 VPython API의 값·인자·이벤트·좌표 의미를 따른다. GlowScript의 JavaScript 확장 때문에 Python 내장 range나 리스트 인덱스 규칙을 느슨하게 바꾸지 않는다.
- VPython API 변경은 Python 래퍼, Worker, 렌더러, 문서·예제와 공유 HTML의 영향을 확인한다. 실행 오류가 없다는 검사만으로 화면·상호작용 호환을 선언하지 않는다. 미지원 기능을 인자를 무시하는 가짜 구현으로 통과시키지 않는다.
- VPyLab의 소리·한글 별칭 등 추가 기능은 확장으로 구분한다. Worker 네트워크·파일 접근 제한과 브라우저 자원 상한 같은 예외는 이유와 대안을 문서에 남긴다.
- 초심자 교육자료는 AI 없이 직접 예상·실행·수정·설명하는 흐름이 기본이다. 짧은 체험은 튜토리얼, 단계 학습은 트레이닝, 실제 작품은 갤러리 안에서 제공하며 추가 최상위 메뉴를 늘리지 않는다.
- 설계와 최근 검증 범위: docs/CREATIVE_LEARNING_AND_VPYTHON_2026-11-06.md.

- 도형 AI·compound·카메라·이동 UX의 최신 원인 분석과 검증: docs/SHAPE_CAMERA_UX_REVIEW_2026-11-07.md.

- 문서 출처 표시·도형 가이드·primitive 기준점의 최신 설계와 검증: docs/DOCUMENTATION_AND_SHAPE_GUIDES_2026-11-07.md.

- 독립 대장간·단일 오브젝트·코드 복사·포크 출처·종 단계·캐릭터 교재: docs/FORGE_MODULES_2026-11-07.md.

## 범위와 애드온 규칙 (2026-11-10)

- 작업 전에 `docs/SCOPE.md`를 읽습니다. 지금은 기능 동결 기간입니다. 버그 수정, 테스트, 번역, 학습 자료, 문서, 구글 중심 전환 계획의 단계만 진행합니다.
- 핵심은 "브라우저에서 파이썬으로 3D와 빛과 소리"이며 구글 로그인과 학생 드라이브 저장을 포함합니다.
- 핵심이 아닌 기능은 애드온입니다. 애드온이 없어도 핵심이 동작해야 하고, 애드온은 핵심의 동작을 바꾸지 않으며, 한 지점에서만 연결하고, 실패가 애드온 안에 머물러야 합니다.
- 새 기능을 요청받으면 먼저 이 규칙에 맞는지 확인하고, 맞지 않으면 사용자에게 알립니다.
- 연구·측정 도구는 앱 코드가 아니라 `scripts/research/`에 둡니다.

## 여럿이(사람·AI) 함께 일할 때 (2026-11-20)

이 저장소가 공통 기준입니다. 규칙과 현재 상태는 각자의 기억이나 컴퓨터 설정이 아니라 **이 저장소의 문서**에 두고, 작업을 시작할 때 최신 `main`을 받아 읽습니다.

- **작업 시작 전**: `git fetch` 후 최신 `origin/main`에서 브랜치를 만듭니다. 열린 PR과 그 댓글을 먼저 읽습니다.
- **역할**: 소리와 그래픽 품질은 Codex(ChatGPT), 안정성과 한글 도움말(자동 완성·낱말 카드·문서)은 Claude가 맡습니다. 관리자가 바꾸면 이 줄을 고칩니다.
- **같은 파일을 동시에 고치지 않습니다.** 남의 영역에서 찾은 문제는 직접 고치지 않고 해당 PR에 의견으로 남깁니다. AI가 남기는 의견은 누구의 것인지 첫 줄에 밝힙니다(예: "Claude의 검토입니다").
- **기능을 추가하거나 바꿀 때 함께 고칠 곳**: `docs/FEATURE_CHANGE_CHECKLIST.md`. PR을 올리기 전에 해당하는 절을 확인합니다.
- **진행 중인 작업의 상태와 남은 일**: 날짜가 붙은 인수인계 문서에 적습니다. 지금은 `docs/LIGHT_SOUND_HANDOFF_2026-11-20.md`.
- **쌓은 PR**: 다른 PR 위에 쌓은 PR은 CI가 일부만 돕니다. base가 `main`이 된 뒤 전체 CI를 확인합니다. 아래쪽 PR은 스쿼시가 아니라 병합 커밋으로 넣습니다.
- **병합은 배포입니다.** `main`에 병합하면 운영 두 사이트에 자동 배포되므로 관리자가 승인한 뒤에만 합니다. 병합 전에 PR의 미리보기 주소에서 실제 화면을 확인합니다.
- PR 본문에는 확인한 것과 확인하지 못한 것을 나눠 적습니다.
