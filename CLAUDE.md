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
- **호스팅**: Railway (백엔드), Vercel (프론트)

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
