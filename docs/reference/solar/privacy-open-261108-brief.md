# 브리프 — 공개판 개인정보 처리방침 화면 (2026-11-08)

독자: VPyLab 공개판(vpylab.pages.dev)을 사용하는 중·고등학생, 교사, 학부모
문체: 합쇼체(~합니다), 평서형. 청유("~해 보세요")·구어체 금지. 은유·의인화·과장 금지. 대시(—)로 문장 잇기 금지
맥락: 웹 화면의 처리방침. 소제목은 따로 들어가고, 블록마다 소제목 아래 본문 문단 하나를 쓴다
형식: 블록 하나의 출력은 문단 하나. 빈 줄로 나누지 말 것. 목록 기호 금지. "쓰다"(사용 의미) 대신 "사용하다", "단추" 대신 "버튼". KEEP 조각은 철자 그대로(굵게 표시 없이)
공통 사실: 공개판에는 VPyLab 서버와 데이터베이스가 없다. 사이트는 Cloudflare Pages가 정적 파일로 제공한다

[블록 1] 소제목: 1. 수집하는 개인정보 / 역할: 수집하지 않는다는 것을 밝힘
- 사실: 공개판은 회원 가입과 로그인이 없음
- 사실: VPyLab 서버와 데이터베이스가 없어 VPyLab이 개인정보를 수집하거나 저장하지 않음
- 사실: 작성한 코드는 사용자의 브라우저 안에서 실행되며 VPyLab 서비스에 저장되지 않음
- 분량: 3문장

[블록 2] 소제목: 2. 브라우저에 남는 정보 / 역할: 기기 안에 남는 것
- 사실: 학습 진행 상황, 화면 테마, 언어, 홈 설정은 이 브라우저의 저장 공간(localStorage)에 남음
- 사실: 연습 중인 초안은 브라우저 탭의 저장 공간(sessionStorage)에 남음
- 사실: 이 정보는 VPyLab으로 전송되지 않음. 브라우저 데이터를 지우면 사라지고 다른 기기로 옮겨지지 않음
- KEEP: localStorage, sessionStorage
- 분량: 3문장

[블록 3] 소제목: 3. 공유 링크 / 역할: 공유할 때 무엇이 어디로 가는지
- 사실: 공유 링크는 코드를 압축해 링크 주소 안에 담으며 서버에 저장하지 않음
- 사실: 링크를 받은 사람은 누구나 그 코드를 볼 수 있으므로 코드에 이름, 연락처 같은 개인정보를 넣지 않아야 함
- 분량: 2문장

[블록 4] 소제목: 4. 외부 서비스 / 역할: 브라우저가 접속하는 곳
- 사실: 사이트는 Cloudflare Pages가 제공하며, 접속 과정의 기록은 Cloudflare의 정책에 따라 처리됨
- 사실: 웹 글꼴은 Google Fonts와 Fontshare에서 불러옴
- 사실: 파이썬 실행 환경(Pyodide)은 vpylab.pages.dev에서 받고, 받지 못했을 때만 jsDelivr나 unpkg에서 받음
- 사실: 내려받은 HTML 파일은 열 때 jsDelivr나 unpkg에서 Pyodide와 Three.js를 불러옴
- KEEP: Cloudflare Pages, Google Fonts, Fontshare, Pyodide, jsDelivr, unpkg, Three.js, vpylab.pages.dev
- 분량: 4문장

[블록 5] 소제목: 5. 구글 드라이브 저장 실험 / 역할: 실험 페이지에서 구글 계정을 사용할 때
- 사실: 실험 페이지(vpylab.pages.dev/drive-lab)는 구글 로그인으로 openid, email, profile, drive.file 권한을 요청함
- 사실: drive.file 권한으로는 이 앱이 만든 파일만 볼 수 있고 드라이브의 다른 파일은 볼 수 없음
- 사실: 파일은 사용자 본인의 구글 드라이브 VPyLab 폴더에 저장되며 VPyLab 관리자는 볼 수 없음
- 사실: 구글 접근 토큰은 페이지 메모리에만 있고 새로 고침하면 사라짐
- 사실: 저장하지 못한 초안은 계정별로 브라우저에 남고, 14일이 지나면 그 컴퓨터에서 페이지를 다시 열 때 지워짐
- 사실: 권한은 페이지의 권한 철회 버튼이나 myaccount.google.com/connections에서 거둘 수 있음
- KEEP: vpylab.pages.dev/drive-lab, openid, email, profile, drive.file, VPyLab, 권한 철회, myaccount.google.com/connections
- 분량: 5~6문장

[블록 6] 소제목: 6. 수업용 판 / 역할: 다른 판과 구분
- 사실: 학교 수업에 사용하는 수업용 판(vpylab.vercel.app)은 계정과 코드를 Supabase에 저장함
- 사실: 수업용 판은 그 사이트의 개인정보 처리방침을 따름
- KEEP: vpylab.vercel.app, Supabase
- 분량: 2문장

[블록 7] 소제목: 7. 개인정보 보호책임자와 문의 / 역할: 연락처
- 사실: 개인정보 보호책임자는 석리송(당곡고등학교 정보과 교사)
- 사실: 문의는 GitHub 이슈(github.com/vpylab/vpylab/issues)로 받음
- 사실: 이슈는 누구나 볼 수 있으므로 개인정보를 적지 않아야 함
- KEEP: 석리송, github.com/vpylab/vpylab/issues
- 분량: 3문장

[블록 8] 소제목: 8. 변경 / 역할: 근거와 갱신
- 사실: 이 처리방침은 「개인정보 보호법」에 따라 작성했으며, 법령이나 운영 방식이 바뀌면 갱신함
- KEEP: 「개인정보 보호법」
- 분량: 1문장
