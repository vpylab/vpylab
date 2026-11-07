# VPy Lab — 다음 세션 프롬프트

아래 내용을 복사하여 다음 세션의 첫 메시지로 사용하세요.

---

VPy Lab 프로젝트를 이어서 진행합니다.

1. 먼저 다음 파일들을 읽어주세요:
   - /Users/greatsong/greatsong-project/10_수업자료/vpylab/PROGRESS.md
   - /Users/greatsong/greatsong-project/10_수업자료/vpylab/CLAUDE.md

2. 현재 상태:
   - 엔진 코어 + 미션 16개 + 사운드/차트/카메라 + 채점 시스템 완성
   - 내보내기 v2: 모든 기능 동기화 (사운드/차트/30색/NamedList/악기/한글API/clone)
   - 갤러리 시스템: 목록/상세/Remix/좋아요/발행모달/Fork/Update
   - GitHub Pages 자동 발행 API: 서버에 publish/fetch/update/fork 엔드포인트
   - GitHub 오픈소스 인프라: .github/ 19파일 + docs/ 3파일
   - Supabase: 6테이블 + 18 RLS + 3 RPC + GitHub OAuth 활성화 완료
   - **배포 완료**:
     - Vercel: https://vpylab.vercel.app (프론트엔드)
     - Railway: https://vpylab-server-production.up.railway.app (백엔드)
     - GitHub: https://github.com/greatsong/vpylab
   - 120개 vitest 테스트 통과, 빌드 성공

3. 다음 세션 작업 (우선순위 순):

   **[긴급] 배포 문제 수정**
   - Vercel 빌드 시 VITE_API_URL이 인라인되지 않음 → Home에서 "서버 오프라인" 표시
   - 해결: Vercel에서 환경변수 포함 재빌드, 또는 .env.production 파일 생성
   - Railway CORS: ALLOWED_ORIGINS에 https://vpylab.vercel.app 확인

   **[중요] 인증 E2E 테스트**
   - GitHub 로그인 → 코드 저장 → 갤러리 발행 → GitHub Pages 생성 전체 플로우
   - Google OAuth Provider 설정 (아직 미완료, GitHub만 완료됨)

   **[보완] 갤러리 고도화**
   - 갤러리 상세에서 3D 미리보기 (코드 자동 실행, 읽기 전용)
   - 갤러리 카드 썸네일 (발행 시 3D 뷰포트 캡처 연결)
   - Home 갤러리 하이라이트 동작 확인

   **[향후] 기능 확장**
   - 교사 역할 전환, 미션 추가 (50개 목표), 2D 차트, matplotlib 렌더링
   - 프로젝트 쇼케이스 등록 (project-showcase)

4. 방침:
   - 기능 구현 후 반드시 vitest 테스트 통과 확인
   - 화면이 있는 기능은 preview로 시각적 확인
   - UI 텍스트는 한국어, 코드는 영어
   - 보안: GitHub token DB 미저장, rate-limit, RLS, 민감정보 검사
