# VPyLab — 다음 세션 안내

2026-11-10에 갱신했습니다. 이전 내용(2026-05 기준)은 저장소와 배포 구조가 바뀌어 맞지 않아 지웠습니다.

다음 세션은 아래 순서로 시작합니다.

1. `CLAUDE.md`(또는 `AGENTS.md`)와 `docs/SCOPE.md`를 읽습니다. 지금은 기능 동결 기간이며, 추가 기능은 애드온 규칙을 따릅니다.
2. 문서 색인 `docs/README.md`에서 필요한 문서를 찾습니다. 코드 구조는 `docs/ARCHITECTURE.md`, 배포는 `docs/DEPLOY_TWO_EDITIONS.md`, 방향은 `docs/GOOGLE_FIRST_PLAN.md`에 있습니다.
3. 작업은 `main`에서 브랜치를 만들어 PR로 올립니다. `main`에 병합하면 수업용 판(Vercel, Railway)과 오픈소스 판(Cloudflare Pages)에 자동 배포됩니다.

## 현재 상태 (2026-11-10)

- 저장소: `vpylab/vpylab`. 예전 저장소 `greatsong/vpylab-classroom`은 보관했습니다.
- 배포: 수업용 판 https://vpylab.vercel.app , 오픈소스 판 https://vpylab.pages.dev
- 최근 변경: 영상으로 저장(녹화, 드라이브 저장), 로그인 시 미션 진도 복원, 핵심 범위와 애드온 규칙, 영어 기여 문서, 변형·창작 측정 도구(`scripts/research/`)

## 남은 일

- 수업 연구 준비: 연구 계획의 결정 사항 확정, 측정 도구를 실제 학생 코드로 검증
- 애드온 규칙에 맞추기: 영상 녹화 모듈을 지연 불러오기로 바꾸기
- 세 번째 언어를 코드 수정 없이 추가할 수 있게 하기(`docs/I18N_GUIDE.md`의 목록)
- 편집기 의존성(`monaco-editor` 안의 `dompurify`) 취약점 해결
- 수업용 판의 영상 드라이브 저장은 꺼져 있습니다. 켜는 순서는 `docs/DEPLOY_TWO_EDITIONS.md`에 있습니다.
- 구글 중심 전환 계획의 다음 단계

## 방침

- 기능을 고치면 테스트를 통과시키고, 화면이 있는 변경은 실제 화면에서 확인합니다.
- 화면 문구는 한국어와 영어를 함께 넣습니다. 코드의 이름은 영어입니다.
- 확인하지 못한 것은 PR 본문에 적습니다.
