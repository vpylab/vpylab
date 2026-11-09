# 코드 하나, 배포 둘

VPyLab은 저장소 하나(`vpylab/vpylab`)에서 두 판을 배포합니다. 기능 수정은 한 번만 하면 두 배포에 함께 반영됩니다.

| | 수업용 VPyLab Classroom | 오픈소스 VPyLab |
|---|---|---|
| 판 설정 | `VITE_EDITION` 없음(기본 `classroom`) | `VITE_EDITION=open` |
| 호스팅 | Vercel (`vpylab.vercel.app`) | Cloudflare Pages (`vpylab.pages.dev`, 자체 도메인 예정) |
| 빌드 명령 | `vercel.json`의 `cd client && npm install && npm run build:deploy` | `cd client && npm ci && npm run build:open` |
| 출력 폴더 | `client/dist` | `client/dist` |
| 서버·DB | Railway Express + Supabase(로그인·갤러리·팀·GitHub 연동) | 공유 주소용 Pages 함수 + D1(`vpylab-shares`)만. 운영 서버·Supabase에 연결하지 않음 |
| 헤더 | `vercel.json` | `vercel.json`에서 자동 변환(`client/scripts/cloudflare-pages.mjs`가 `_headers`·`_redirects` 생성) |

## 판에 따라 달라지는 것

`client/src/lib/api-base.js`

- `EDITION`: `classroom` 또는 `open`
- `SERVER_FEATURES`: 운영 서버·DB가 필요한 기능을 켤지. 오픈소스 판과 교실 LAN 모드에서는 꺼집니다.
- 오픈소스 판에서 꺼지는 것: 로그인 버튼, 갤러리 메뉴. "저장"을 누르면 로그인 창 대신 드라이브 저장 준비 안내가 뜹니다.
- 오픈소스 판은 커밋된 `client/.env.production`에 Supabase·Railway 값이 있어도 사용하지 않습니다. `build:open`이 이 값을 비우고 빌드하므로 번들에 주소가 남지 않습니다. CSP에서도 두 주소를 뺍니다.

새 기능이 운영 서버나 Supabase를 쓴다면 `SERVER_FEATURES`로 감싸 오픈소스 판에서 꺼지게 합니다.

## Cloudflare Pages 설정 (오픈소스 판)

Cloudflare Pages 프로젝트 `vpylab`은 직접 업로드 방식으로 생성되어 Git 연결로 전환할 수 없습니다. 이 제한 때문에 GitHub Actions 워크플로 `.github/workflows/deploy-pages.yml`이 자동 배포를 수행합니다. main 브랜치에 푸시된 커밋의 CI가 모두 통과하면 오픈소스 판이 빌드되어 vpylab.pages.dev에 배포됩니다. 배포 후에는 첫 화면, 개인정보 화면, 만들기 화면, 드라이브 실험 페이지가 정상적으로 열리는지 확인합니다. GitHub 저장소 Actions 탭에서 이 워크플로를 직접 실행할 수도 있습니다.

저장소 설정의 Actions 비밀값과 변수에는 아래 표의 세 값이 설정되어 있어야 합니다. API 토큰은 Cloudflare Pages에 대한 Edit 권한만 부여하여 생성한 뒤 비밀값으로 등록합니다. 계정 ID와 구글 OAuth 클라이언트 ID는 공개 가능한 값이므로 변수로 등록합니다. 토큰이 없으면 배포 단계가 건너뛰어지고 경고만 남으므로, 포크한 저장소에서는 이 상태가 실패로 표시되지 않습니다.

| 종류 | 이름 | 값 |
|---|---|---|
| 비밀값(Secret) | `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token → Custom token, 권한 `Account · Cloudflare Pages · Edit` |
| 변수(Variable) | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 계정 ID |
| 변수(Variable) | `VITE_GOOGLE_CLIENT_ID` | 구글 OAuth 웹 클라이언트 ID |

로컬에서 바로 올릴 때:

```bash
cd client
VITE_GOOGLE_CLIENT_ID=<클라이언트 ID> npm run build:open
npx wrangler pages deploy dist --project-name vpylab --branch main
```

Cloudflare는 `/drive-lab.html`을 `/drive-lab`으로 넘겨 제공합니다(깔끔한 주소). 그래서 변환기는 `/drive-lab` 경로에도 실험 페이지 전용 헤더를 걸고, 서비스 워커도 `/drive-lab`을 가로채지 않습니다. 맨 위에 404.html을 만들지 않아야 Cloudflare가 SPA 대체(index.html)를 해 줍니다. 대신 `assets/`·`pyodide/`·`projects/`처럼 Vercel이 SPA 대체에서 빼 둔 폴더에는 변환기가 404.html을 넣습니다. 이 폴더의 없는 파일에 index.html이 1년 캐시로 나가지 않고 404가 나가게 하기 위해서입니다.

## 짧은 공유 주소 (오픈소스 판, `/s/<이름>`)

오픈소스 판의 공유 주소는 Cloudflare Pages 함수(`functions/api/share/`)가 만들고 읽으며, 규칙은 `cloudflare/share-core.js` 한 곳에 있습니다. 저장소는 D1 데이터베이스 `vpylab-shares`(아시아·태평양 지역)이고, `wrangler.toml`에서 `DB`라는 이름으로 연결합니다. 따로 운영하는 서버는 없고, 정적 파일과 함께 배포됩니다. IP 주소를 변환할 때 섞는 비밀값 `SHARE_SALT`는 Pages 비밀값으로 넣어 둡니다. 저장소가 응답하지 않으면 앱은 코드를 주소에 담은 링크(`#code=`)로 대신하므로 공유가 막히지 않습니다. 수업용 판은 Railway 서버(`server/routes/share.js`)가 Supabase `vpylab_shares`에 저장합니다. 이름을 정하지 않으면 무작위 8자가 붙고, 이름 규칙은 두 판이 `server/shared/share-names.js` 한 파일을 함께 사용합니다. 수정 열쇠의 해시는 서버만 읽을 수 있는 `vpylab_share_keys` 표에 둡니다(`supabase/migrations/021_share_names.sql`, 2026-11-09 운영 DB 반영).

표 구조는 `cloudflare/migrations/` 폴더에 있고, 바꾼 뒤에는 원격 데이터베이스에 반영하는 명령을 실행합니다. 부적절한 공유 주소나 삭제 요청이 들어온 주소는 지우는 명령으로 처리하며, 명령은 Cloudflare 계정에 로그인한 컴퓨터에서 실행합니다. 무료 사용량은 하루에 쓰기 10만 건, 읽기 500만 건이며 학교 수업 규모로는 비용이 들지 않습니다.

```bash
# 표 구조 반영
npx wrangler d1 migrations apply vpylab-shares --remote
# 공유 주소 지우기(예: /s/bad-name)
npx wrangler d1 execute vpylab-shares --remote --command "DELETE FROM shares WHERE id = 'bad-name'"
```

| 요청 | 하는 일 |
|---|---|
| `POST /api/share` `{ code, title, name? }` | 만들기. 이름이 없으면 무작위 6자. 응답의 `editKey`는 만든 브라우저(localStorage)에만 남김 |
| `GET /api/share/:id` | 읽기 |
| `PUT /api/share/:id` + `Authorization: Bearer <editKey>` | 같은 브라우저에서 내용 바꾸기 |

<!-- 문단 문구: docs/reference/solar/short-share-261109-solar.md 블록 16·17 -->

## 속도 (2026-11-07 측정, 맥북 크롬)

- 다시 방문하면 화면은 0.3초 만에 뜨고, 새로 받는 양은 5KB입니다.
- Python 엔진은 파일이 캐시에 있어도 브라우저에서 띄우는 데 3~4초가 걸립니다. 그래서 첫 화면·문서를 보는 동안 엔진을 미리 띄웁니다(`client/src/engine/idle-prewarm.js`). 문서 화면에서 "만들기"로 들어가면 0.4초 만에 준비가 끝납니다.
- 편집기는 Python 전용 Monaco(`client/src/components/editor/monaco-python.js`)를 사용합니다. 배포 크기는 33MB에서 24MB로 줄었습니다.

로컬에서 Cloudflare 동작을 흉내 내 확인할 때:

```bash
npx wrangler pages dev client/dist --port 4087
```

## 수업용 서버 중계 (/srv, 2026-11-09)

일부 학교·통신사 DNS가 `*.railway.app` 주소를 막습니다. 2026-11-09에 그런 네트워크에서 수업용 판의 공유·저장·팀 기능이 모두 실패한 것을 확인했습니다. 그래서 수업용 화면은 Railway 주소로 직접 요청하지 않고 같은 출처의 `/srv/…`로 요청합니다(`client/.env.production`의 `VITE_API_URL=/srv`). `vercel.json`이 이 요청을 Vercel 함수 `api/srv.mjs`로 보내고, 함수가 Railway 서버로 전달합니다.

요청 제한은 학생 IP 기준이므로, 함수가 실제 학생 IP를 `x-vpylab-client-ip`로 보내고 비밀값 `PROXY_SECRET`을 함께 보냅니다. 서버(`server/middleware/proxy-client-ip.js`)는 비밀값이 맞을 때만 그 IP를 믿습니다. `PROXY_SECRET`은 Vercel(Production·Preview)과 Railway에 같은 값으로 넣어 두었고, 값은 기록하지 않습니다. 바꿀 때는 세 곳을 함께 바꿉니다.

## 수업용 배포를 이 저장소로 옮긴 기록 (2026-11-09)

수업용 배포는 2026-11-09에 `greatsong/vpylab-classroom`에서 이 저장소로 옮겼습니다. 옮기기 전에 두 저장소의 `main`을 비교해 이 저장소가 수업용 저장소의 커밋을 모두 포함하는 것을 확인했습니다.

1. GitHub의 Vercel 앱과 Railway 앱(`railway-app`)을 `vpylab` 조직의 `vpylab/vpylab` 저장소에만 설치했습니다.
2. Vercel: `vercel git connect https://github.com/vpylab/vpylab.git`로 프로젝트 `vpylab`의 연결 저장소를 바꿨습니다.
3. Railway: `railway service source connect --service vpylab-server --repo vpylab/vpylab --branch main`으로 바꿨습니다. 루트 폴더는 그대로 `/server`입니다.
4. 두 서비스 모두 이 저장소 `main`(dfb5985)으로 배포되는 것을 확인했습니다.

남은 일: `greatsong/vpylab-classroom` 보관(archive), 예전 수업용 작업 폴더(`10_수업자료/vpylab`)의 원격 주소 정리. 그 폴더에는 커밋하지 않은 변경이 남아 있어 손대지 않았습니다.
