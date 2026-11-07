# 코드 하나, 배포 둘

VPyLab은 저장소 하나(`vpylab/vpylab`)에서 두 판을 배포합니다. 기능 수정은 한 번만 하면 두 배포에 함께 반영됩니다.

| | 수업용 VPyLab Classroom | 오픈소스 VPyLab |
|---|---|---|
| 판 설정 | `VITE_EDITION` 없음(기본 `classroom`) | `VITE_EDITION=open` |
| 호스팅 | Vercel (`vpylab.vercel.app`) | Cloudflare Pages (`vpylab.pages.dev`, 자체 도메인 예정) |
| 빌드 명령 | `vercel.json`의 `cd client && npm install && npm run build:deploy` | `cd client && npm ci && npm run build:open` |
| 출력 폴더 | `client/dist` | `client/dist` |
| 서버·DB | Railway Express + Supabase(로그인·갤러리·팀·GitHub 연동) | 없음. 운영 서버·Supabase에 연결하지 않음 |
| 헤더 | `vercel.json` | `vercel.json`에서 자동 변환(`client/scripts/cloudflare-pages.mjs`가 `_headers`·`_redirects` 생성) |

## 판에 따라 달라지는 것

`client/src/lib/api-base.js`

- `EDITION`: `classroom` 또는 `open`
- `SERVER_FEATURES`: 운영 서버·DB가 필요한 기능을 켤지. 오픈소스 판과 교실 LAN 모드에서는 꺼집니다.
- 오픈소스 판에서 꺼지는 것: 로그인 버튼, 갤러리 메뉴. "저장"을 누르면 로그인 창 대신 드라이브 저장 준비 안내가 뜹니다.
- 오픈소스 판은 커밋된 `client/.env.production`에 Supabase·Railway 값이 있어도 사용하지 않습니다. `build:open`이 이 값을 비우고 빌드하므로 번들에 주소가 남지 않습니다. CSP에서도 두 주소를 뺍니다.

새 기능이 운영 서버나 Supabase를 쓴다면 `SERVER_FEATURES`로 감싸 오픈소스 판에서 꺼지게 합니다.

## Cloudflare Pages 설정 (오픈소스 판)

Cloudflare 대시보드 → Workers & Pages → 만들기 → Pages → Git에 연결 → `vpylab/vpylab`

| 항목 | 값 |
|---|---|
| 프로덕션 브랜치 | `main` |
| 프레임워크 | 없음 |
| 빌드 명령 | `cd client && npm ci && npm run build:open` |
| 빌드 출력 폴더 | `client/dist` |
| 환경변수 | `NODE_VERSION=20`(CI와 같음), `VITE_GOOGLE_CLIENT_ID=<구글 OAuth 클라이언트 ID>` |

Git 연결 없이 로컬에서 바로 올릴 때:

```bash
cd client
VITE_GOOGLE_CLIENT_ID=<클라이언트 ID> npm run build:open
npx wrangler pages deploy dist --project-name vpylab
```

Cloudflare는 `/drive-lab.html`을 `/drive-lab`으로 넘겨 제공합니다(깔끔한 주소). 그래서 변환기는 `/drive-lab` 경로에도 실험 페이지 전용 헤더를 걸고, 서비스 워커도 `/drive-lab`을 가로채지 않습니다. 404.html을 만들지 않아야 Cloudflare가 SPA 대체(index.html)를 해 줍니다.

로컬에서 Cloudflare 동작을 흉내 내 확인할 때:

```bash
npx wrangler pages dev client/dist --port 4087
```

## 수업용 배포를 이 저장소로 옮기기 (한 번)

지금 수업용 배포는 `greatsong/vpylab-classroom`에 연결되어 있습니다. 두 저장소의 `main`이 같을 때 옮깁니다.

1. Vercel: GitHub의 Vercel 앱이 `vpylab` 조직에 접근하도록 허용한 뒤, 프로젝트 `vpylab` → Settings → Git에서 연결 저장소를 `vpylab/vpylab`으로 바꿉니다.
2. Railway: 서비스 `vpylab-server` → Settings → Source에서 저장소를 `vpylab/vpylab`으로 바꿉니다.
3. 로컬 작업 폴더의 원격 주소를 바꿉니다: `git remote set-url origin https://github.com/vpylab/vpylab.git`
4. 다음 푸시에서 Vercel·Railway 배포가 생기는지 확인합니다.
5. `greatsong/vpylab-classroom`은 보관(archive)하고 README에 새 저장소 주소를 적습니다.

순서가 중요합니다. 1·2를 하기 전에 3을 하면, 새 커밋이 수업용 배포에 반영되지 않습니다.
