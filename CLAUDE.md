# VPyLab — Claude Code 가이드

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
