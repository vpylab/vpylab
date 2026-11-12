# VPyLab — Claude Code 가이드

## 프로젝트 개요

브라우저에서 파이썬으로 3D와 빛과 소리를 만드는 교육 플랫폼입니다. Pyodide(Python 3) + Three.js + Web Audio API를 사용합니다.
전 세계 학교를 위한 오픈소스 프로젝트이며, 버전은 하나입니다. 운영 서버와 자체 DB가 없고 계정 로그인도 없습니다. 운영자는 학생 데이터를 보관하지 않습니다.

2026-11-12에 예전 구성(Express 서버, Supabase, Vercel·Railway 배포, 판 구분)을 모두 지웠습니다. 결정과 지운 범위는 `docs/SCOPE.md`의 "하나의 버전" 기록에 있습니다. 예전 구성을 되살리는 코드나 문서를 만들지 않습니다.

## 기술 스택

- **앱**: React 19 + Vite + Tailwind v4 (`client/`, 개발 서버 포트 4033)
- **에디터**: Monaco Editor
- **3D**: Three.js
- **Python**: Pyodide (Web Worker)
- **서버 쪽 코드**: Cloudflare Pages 함수뿐입니다 (`functions/`, 로직과 테스트는 `cloudflare/`). 짧은 공유 주소 `/api/share`, `/api/share/:id`와 GitHub 토큰 교환 `/api/github/token`
- **저장소(DB)**: 공유 주소용 Cloudflare D1 `vpylab-shares` 하나 (`wrangler.toml`, `cloudflare/migrations/`)
- **공용 모듈**: `shared/` (앱, 함수, 스크립트가 함께 사용. `gallery-rules.js`, `forge-rules.js`, `share-names.js`, `camera-system.js`, `standalone-template.js` 등)
- **호스팅**: Cloudflare Pages (`https://vpylab.pages.dev`). `main`에 병합하면 CI(`.github/workflows/ci.yml`)가 실행되고, CI가 성공하면 "Deploy" 워크플로(`.github/workflows/deploy-pages.yml`)가 `client/`에서 `npm run build`를 실행해 `client/dist`를 배포합니다. `vpylab.vercel.app`은 넘기기만 합니다(루트 `vercel.json`). 절차는 `docs/DEPLOY.md`
- **빌드 설정값**: `VITE_GOOGLE_CLIENT_ID`, `VITE_GITHUB_CLIENT_ID`, `VITE_GALLERY_INDEX_URL`, `VITE_FORGE_INDEX_URL` (모두 공개값, `client/.env.example`). 기능 플래그는 `client/src/lib/api-base.js` (`DRIVE_SAVE`, `GITHUB_ADDON`, `GITHUB_GALLERY`, `GITHUB_FORGE`, `FORGE_REGISTRY`)

## 세 가지 작업 방법

1. 로그인 없음: 실행, 편집, `.py`와 내보낸 `.html` 파일 열기·내려받기, 짧은 공유 주소 `/s/<이름>`
2. 구글 드라이브 저장: 학생 본인의 드라이브에 저장 (`client/src/drive/`, Google Identity Services 토큰 방식, `drive.file` 권한)
3. GitHub(선택): 팀 프로젝트(`client/src/github/`), 그 위의 학생 작품 갤러리(`client/src/gallery/`, topic `vpylab-gallery`)와 대장간 모두의 모듈(`client/src/forge/github-registry.js`, 저장소 `<아이디>/vpylab-forge`). 목록은 `.github/workflows/gallery-index.yml`이 `gallery-data` 브랜치에 만들고, 교사가 `approvals.txt`로 승인합니다 (`docs/GALLERY_GITHUB.md`)

## 명령

- `cd client && npm run dev`: Vite 개발 서버(포트 4033). `/api/*`는 없습니다.
- `cd client && npm run build`, `npm run lint`, `npm run test:run`
- 저장소 루트의 `npm test`: `shared/`, `cloudflare/`, `scripts/gallery/` 테스트와 클라이언트 테스트
- Pages 함수까지 로컬에서 확인: 빌드한 뒤 `npx wrangler pages dev client/dist --port 4086 --persist-to /tmp/vpylab-pages-dev-state`. 로컬 비밀값은 커밋되지 않는 `.dev.vars`에 둡니다.

## 코딩 컨벤션

- UI 텍스트와 주석은 한국어
- 코드(변수명, 함수명 등)는 영어
- CSS 변수 기반 2종 테마 시스템 (creative-light / deep-dark)
- 폰트: Satoshi(Display) + DM Sans(Body) + JetBrains Mono(Code)
- 디자인 시스템: DESIGN.md 참조
- 문서에서 지금의 시스템을 "수업용 판", "오픈소스 판", "두 판"으로 부르지 않습니다. 이 말은 기록을 적을 때만 사용합니다.

## 보안 주의사항

- `.env` 파일과 `.dev.vars`는 절대 커밋하지 않음
- 비밀값(`GITHUB_CLIENT_SECRET`, `SHARE_SALT`, `CLOUDFLARE_API_TOKEN`)은 Cloudflare Pages 비밀값과 Actions 비밀값에만 둠. `VITE_` 변수에는 공개값만 넣음
- 모든 콘솔 출력은 textContent로만 렌더링 (innerHTML 금지, CI가 검사)
- Pyodide Worker에서 fetch, WebSocket, IndexedDB 등 위험 API 삭제 필수
- 응답 헤더와 CSP는 `client/public/_headers` 한 곳에서만 고침 (`client/scripts/pages-config.test.mjs`가 검사). 외부 주소를 더하려면 `docs/SCOPE.md` 규칙 6에 따라 결정을 기록
- Pages 함수의 쓰기 요청은 같은 출처만 받고 요청 크기를 제한함. 공유 주소 만들기와 고치기는 요청 횟수도 제한함. 토큰 교환 함수는 토큰을 저장하거나 기록하지 않음
- 구글·GitHub 토큰은 브라우저 탭 저장소(sessionStorage)에만 둠
- LZ-String 디코딩 후 50KB 상한 검증

## 라이선스

- 코드: AGPL v3
- 미션 콘텐츠: CC BY-NC-SA 4.0

## 범위와 애드온 규칙 (2026-11-10, 2026-11-12 고침)

- 작업 전에 `docs/SCOPE.md`를 읽습니다. 지금은 기능 동결 기간입니다. 버그 수정, 테스트, 번역, 학습 자료, 문서, 예전 구성의 남은 흔적 정리만 진행합니다.
- 핵심은 "브라우저에서 파이썬으로 3D와 빛과 소리"이며 구글 로그인과 학생 드라이브 저장, 계정 없이 사용하는 공유 링크를 포함합니다.
- 핵심이 아닌 기능은 애드온입니다(영상 녹화, 대장간, 피지컬 컴퓨팅 시범 미션, GitHub 팀 프로젝트, 갤러리, 모두의 모듈). 애드온이 없어도 핵심이 동작해야 하고, 애드온은 핵심의 동작을 바꾸지 않으며, 한 지점에서만 연결하고, 실패가 애드온 안에 머물러야 합니다.
- 새 기능을 요청받으면 먼저 이 규칙에 맞는지 확인하고, 맞지 않으면 사용자에게 알립니다.
- 연구·측정 도구는 앱 코드가 아니라 `scripts/research/`에 둡니다.
