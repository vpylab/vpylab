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
- `DRIVE_SAVE`: 구글 클라이언트 ID(`VITE_GOOGLE_CLIENT_ID`)가 있는 배포. 두 판 모두 개인 코드를 학생 본인의 구글 드라이브에 저장하고, 머리글의 로그인 버튼을 감춥니다.
- `GITHUB_ADDON`: 오픈소스 판에 GitHub 클라이언트 ID(`VITE_GITHUB_CLIENT_ID`)를 넣은 배포. 서버 없는 GitHub 팀 프로젝트가 켜집니다.
- `TEAM_PROJECTS`: 만들기 화면에 팀 프로젝트가 있는 배포(수업용 판의 운영 서버 방식 또는 위 애드온).
- `GITHUB_GALLERY`: 오픈소스 판에 갤러리 목록 주소(`VITE_GALLERY_INDEX_URL`)를 넣은 배포. 서버 없는 GitHub 연동 갤러리와 머리글의 갤러리 메뉴가 켜집니다.
- 오픈소스 판에서 꺼지는 것: 로그인 버튼, 갤러리 메뉴(목록 주소를 넣지 않은 배포). 구글 클라이언트 ID가 없는 배포에서 "저장"을 누르면 드라이브 저장 준비 안내가 표시됩니다.
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
| `DELETE /api/share/:id` + `Authorization: Bearer <editKey>` | 무작위 주소 지우기. 공유 창에서 이름을 정하면 창을 열 때 만든 무작위 주소를 지움(그 창에서 복사·QR·임베드·열기를 사용했으면 남김). 정한 이름은 409로 거절. 공유 요청 제한(같은 IP 1분 120건)에서 빠짐 |

<!-- 문단 문구: docs/reference/solar/short-share-261109-solar.md 블록 16·17 -->

## 속도 (2026-11-07 측정, 맥북 크롬)

- 다시 방문하면 화면은 0.3초 만에 뜨고, 새로 받는 양은 5KB입니다.
- Python 엔진은 파일이 캐시에 있어도 브라우저에서 띄우는 데 3~4초가 걸립니다. 그래서 첫 화면·문서를 보는 동안 엔진을 미리 띄웁니다(`client/src/engine/idle-prewarm.js`). 문서 화면에서 "만들기"로 들어가면 0.4초 만에 준비가 끝납니다.
- 편집기는 Python 전용 Monaco(`client/src/components/editor/monaco-python.js`)를 사용합니다. 배포 크기는 33MB에서 24MB로 줄었습니다.

로컬에서 Cloudflare 동작을 흉내 내 확인할 때:

```bash
npx wrangler pages dev client/dist --port 4087
```

## 개인 코드의 드라이브 저장 (두 판, 2026-11-12)

빌드에 `VITE_GOOGLE_CLIENT_ID`가 있으면 만들기 화면의 "저장"은 학생 본인의 구글 드라이브에 저장합니다. 오픈소스 판은 이미 켜져 있습니다. 수업용 판(Vercel)은 이 값을 넣기 전까지 예전 방식(계정 로그인과 GitHub 프로젝트)으로 동작합니다.

수업용 판에서 켜면 달라지는 것은 다음과 같습니다.

- 저장: 팀 프로젝트를 열어 두지 않았으면 구글 드라이브에 저장합니다. 팀 프로젝트를 열어 둔 동안에는 예전처럼 GitHub 커밋입니다. 판단 위치는 `client/src/pages/Sandbox.jsx`의 `handleSave`입니다.
- 로그인: 머리글의 로그인 버튼을 감춥니다. 로그인 창은 팀 프로젝트, 갤러리, 교사 화면에서 필요할 때 열리고 GitHub 로그인을 먼저 보여 줍니다. 교사 계정을 위해 구글 로그인 링크는 남깁니다.
- 운영 계정에 하던 개인 코드 자동 저장, "다른 이름으로 저장", 개인 코드의 "저장 이력"은 꺼집니다. 이미 계정에 저장된 코드는 지우지 않습니다.
- 개인정보 처리방침에 드라이브 저장 구역이 표시됩니다(`client/src/pages/Privacy.jsx`).

켜는 순서는 아래 "수업용 판의 영상 드라이브 저장"의 3~5번과 같습니다(승인된 원본 추가, Vercel 환경변수, 실제 계정 확인). 끄려면 환경변수를 지우고 다시 배포합니다.

2026-11-12에 구글 클라우드 OAuth 웹 클라이언트의 승인된 자바스크립트 원본에 `https://vpylab.vercel.app`을 추가했고(`vercel.app` 하위 주소가 받아들여짐), Vercel 운영 환경변수 `VITE_GOOGLE_CLIENT_ID`를 등록했습니다. 다음 운영 배포부터 수업용 판의 개인 저장이 드라이브로 바뀝니다. 수업용 주소에서의 실제 계정 확인은 그 배포 뒤에 합니다.

## GitHub 팀 프로젝트 애드온 (오픈소스 판, 2026-11-12)

오픈소스 판은 운영 서버 없이 브라우저가 GitHub API를 직접 호출합니다(`client/src/github/`). GitHub의 토큰 발급 주소는 브라우저 호출을 허용하지 않으므로 Pages 함수 `functions/api/github/token.js`가 로그인 코드를 토큰으로 바꿉니다. 함수는 토큰을 저장하거나 기록하지 않습니다. 설정이 없으면 애드온은 꺼지고 실행과 드라이브 저장은 그대로 동작합니다.

켜는 순서는 다음과 같습니다.

1. GitHub에서 OAuth 앱을 만듭니다(조직 `vpylab` → Settings → Developer settings → OAuth Apps). Homepage URL은 사이트 주소, Authorization callback URL은 `https://<사이트 주소>/github/callback`입니다. OAuth 앱은 콜백 주소를 하나만 가지므로 로컬 확인용 앱(`http://localhost:4086/github/callback`)은 따로 만듭니다.
2. 클라이언트 ID를 저장소 Actions 변수 `VITE_GITHUB_CLIENT_ID`에 넣습니다(공개해도 되는 값).
3. Cloudflare Pages 프로젝트 `vpylab`의 Settings → Variables and Secrets에 `GITHUB_CLIENT_ID`와 `GITHUB_CLIENT_SECRET`(비밀값)을 넣습니다. 비밀값은 저장소나 `VITE_` 변수에 넣지 않습니다.
4. 배포한 뒤 만들기 화면의 "팀 프로젝트"에서 연결, 프로젝트 만들기, 저장, 초대를 실제 계정 두 개로 확인합니다.

요청하는 GitHub 권한은 `public_repo`(공개 저장소 만들기와 커밋)와 `repo:invite`(받은 초대 수락)입니다. 프로젝트 저장소는 공개 저장소이며 topic `vpylab-project`로 구분합니다. 토큰은 브라우저 탭 저장소에 두므로 탭을 닫으면 다시 연결해야 합니다. 본 앱 CSP에는 `VITE_GITHUB_CLIENT_ID`가 있는 빌드에서만 `https://api.github.com`이 들어갑니다(`client/scripts/cloudflare-pages.mjs`의 `withGitHubApi`).

수업용 판의 팀 프로젝트는 기존 운영 서버 방식(Supabase 로그인, `server/routes/projects.js`)을 그대로 사용합니다. 두 방식의 프로젝트는 서로 보이지 않습니다.

## GitHub 연동 갤러리 (오픈소스 판, 2026-11-12)

오픈소스 판의 갤러리는 운영 서버와 DB 없이 동작합니다. 수업용 판의 기존 갤러리(Supabase)와는 별개이며 서로 보이지 않습니다. 설정이 없으면 갤러리는 꺼지고 다른 기능은 그대로 동작합니다.

구조는 다음과 같습니다.

| 단계 | 하는 일 | 위치 |
|---|---|---|
| 올리기(학생) | 팀 프로젝트 창의 "갤러리에 올리기"가 저장소에 topic `vpylab-gallery`를 더하고(`vpylab-project`는 유지), 지금 3D 화면을 `thumbnail.jpg`로 커밋합니다. 그림이 없어도 올리기는 됩니다. | `client/src/github/github-api.js`의 `setGalleryListing`·`putThumbnail`, `GitHubProjectDialog.jsx` |
| 목록 만들기 | 워크플로가 30분마다(직접 실행 가능) topic이 붙은 공개 저장소를 검색해 승인 파일과 대조하고 `gallery-data` 브랜치에 커밋합니다. | `.github/workflows/gallery-index.yml`, `scripts/gallery/` |
| 승인(교사) | `gallery-data` 브랜치의 `approvals.txt`에 줄을 추가합니다. 승인 전 작품은 `PENDING.md`에만 있습니다. | [GALLERY_GITHUB.md](GALLERY_GITHUB.md) |
| 보기 | 앱은 `gallery.json`만 읽습니다. GitHub 검색을 직접 부르지 않습니다. | `client/src/gallery/`, `client/src/pages/GitHubGallery.jsx` |

실시간 검색을 하지 않는 까닭은 두 가지입니다. 학교는 한 IP를 함께 사용해 GitHub 검색 한도에 걸리기 쉽고, 검색 결과를 그대로 보이면 승인 단계를 둘 수 없습니다.

`gallery-data` 브랜치의 파일은 다음과 같습니다.

| 파일 | 내용 |
|---|---|
| `approvals.txt` | 승인 파일. 한 줄에 하나씩 `approve 아이디/저장소`, `approve @아이디`, `block 아이디/저장소`, `block @아이디`. 차단이 승인보다 우선합니다. 읽지 못한 줄은 승인으로 보지 않습니다. 워크플로는 이 파일이 없을 때만 빈 양식을 넣습니다. |
| `gallery.json` | 승인된 작품. 항목은 `fullName`, `title`, `owner`, `pagesUrl`, `htmlUrl`, `thumbnailUrl`, `stars`, `updatedAt`뿐입니다. 최근에 고친 순서, 최대 500개. |
| `pending.json`, `PENDING.md` | 승인 대기 작품. 교사가 확인하는 목록입니다. 앱은 읽지 않습니다. |

목록을 만드는 쪽과 읽는 쪽은 같은 규칙(`server/shared/gallery-rules.js`)으로 항목을 검사합니다. 제목과 아이디는 글자로만 다루고, 주소는 저장소 이름에서 다시 만든 `https://github.com/<owner>/<repo>`, `https://<owner>.github.io/<repo>/`, `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/thumbnail.jpg`와 같을 때만 받아들입니다. 보관되거나 비공개가 되거나 삭제된 저장소, topic을 뺀 저장소는 다음 갱신 때 빠집니다. 미리보기 그림은 200KB 이하일 때만 싣습니다.

켜는 순서는 다음과 같습니다.

1. 이 기능이 든 커밋을 `main`에 병합합니다. 예약 실행은 기본 브랜치의 워크플로 파일로만 돕니다.
2. 저장소 Settings → Secrets and variables → Actions → Variables에 `GALLERY_INDEX` = `on`을 넣습니다. 이 값이 없으면 워크플로는 아무것도 하지 않습니다.
3. Actions 탭에서 "Gallery index"를 "Run workflow"로 한 번 실행합니다. `gallery-data` 브랜치가 만들어지고 승인 파일의 빈 양식과 빈 목록이 들어갑니다.
4. `gallery-data` 브랜치에 보호 규칙을 겁니다(강제 푸시와 삭제 금지). 저장소에 쓰기 권한이 있는 사람은 승인 파일을 고칠 수 있으므로, 승인할 교사에게만 쓰기 권한을 줍니다. 보호 규칙이 `github-actions[bot]`의 푸시를 막지 않게 합니다.
5. Actions 변수 `VITE_GALLERY_INDEX_URL`에 `https://raw.githubusercontent.com/vpylab/vpylab/gallery-data/gallery.json`을 넣고 오픈소스 판을 다시 배포합니다("Deploy open edition" 직접 실행 또는 `main` 푸시). 로컬 빌드는 `VITE_GALLERY_INDEX_URL=<주소> npm run build:open`입니다.
6. "갤러리에 올리기"와 앱에서 스타 누르기는 GitHub 팀 프로젝트 애드온(`VITE_GITHUB_CLIENT_ID`)이 켜진 배포에서만 보입니다. 애드온이 없는 배포는 갤러리 보기만 됩니다.
7. 승인할 교사에게 [GALLERY_GITHUB.md](GALLERY_GITHUB.md)를 안내합니다.
8. 실제 계정 두 개로 올리기, `PENDING.md` 표시, 승인, 갤러리 표시, 스타, 내리기를 확인합니다.

끄려면 `VITE_GALLERY_INDEX_URL` 변수를 지우고 다시 배포합니다(화면이 꺼짐). 목록 갱신까지 멈추려면 `GALLERY_INDEX` 변수를 지웁니다.

목록 주소는 본 앱의 CSP가 허용하는 두 가지만 받습니다. `https://raw.githubusercontent.com/…`로 시작하는 `.json` 주소, 또는 같은 출처의 경로(`/…`)입니다. 다른 주소를 넣으면 갤러리는 꺼진 채로 빌드됩니다. 이 기능 때문에 CSP에 더한 주소는 없습니다. 실행 화면은 새 탭으로 엽니다.

다른 학교가 자기 목록을 운영하려면 자기 저장소(포크)에서 2~5번을 하고 주소의 `vpylab/vpylab`을 자기 저장소로 바꿉니다. topic은 모든 배포가 `vpylab-gallery`를 함께 사용하므로, 승인 대기 목록에는 다른 학교 학생이 올린 작품도 나타납니다. 공개 목록에는 그 저장소의 승인 파일에 있는 작품만 들어갑니다.

권한과 한계는 다음과 같습니다.

- 워크플로는 예약 실행과 직접 실행에서만 돕니다. `pull_request`에서는 돌지 않으므로 포크의 PR이 실행할 수 없습니다. 검색 결과를 다루는 작업은 `contents: read`, 브랜치에 커밋하는 작업만 `contents: write`입니다. 다른 비밀값은 사용하지 않습니다.
- GitHub 검색이 실패하거나 결과가 불완전하면 목록을 바꾸지 않습니다. 앞서 만든 목록이 그대로 남습니다.
- 스타와 갤러리에 올리기에 필요한 GitHub 권한은 애드온이 이미 요청하는 `public_repo`입니다(GitHub 문서 "Scopes for OAuth apps"). topic은 저장소 관리자만 바꿀 수 있어, 올리기와 내리기는 저장소 소유자에게만 보입니다.
- GitHub 검색은 1,000건까지만 돌려줍니다. 공개 목록은 500건까지 싣습니다.
- 예약 실행은 GitHub 사정으로 늦어질 수 있습니다. 공개 저장소의 예약 워크플로는 저장소에 60일 동안 활동이 없으면 멈추며 Actions 탭에서 다시 켭니다.
- `raw.githubusercontent.com`은 파일을 5분쯤 캐시합니다. 승인한 작품과 바꾼 미리보기 그림은 그만큼 늦게 보일 수 있습니다.
- 승인은 저장소 단위입니다. 승인한 뒤에 바뀐 코드와 그림은 다시 확인하지 않습니다. 문제가 생기면 차단 줄로 내립니다.
- "코드 보기"는 만들기 화면의 `?repo=owner/repo`로 열며, 이 경로는 저장소 `main` 브랜치의 `main.py`를 읽습니다. 기본 브랜치 이름이 다른 저장소는 코드가 열리지 않습니다.
- GitHub 계정이 없는 학생은 올릴 수 없습니다. 화면과 처리방침에 밝혀 두었습니다.

스크립트는 의존성 없이 동작하며 로컬에서 읽기 전용으로 확인할 수 있습니다.

```bash
# 테스트
node --test scripts/gallery/*.test.mjs
# 실제 GitHub 검색으로 결과만 출력(파일을 쓰지 않음)
node scripts/gallery/build-index.mjs --approvals <approvals.txt> --dry-run
```

## 수업용 판의 영상 드라이브 저장 (2026-11-10, 꺼져 있음)

영상으로 저장은 두 판에서 모두 동작합니다. 드라이브에 저장하는 선택지는 빌드에 `VITE_GOOGLE_CLIENT_ID`가 있을 때만 나타납니다. 오픈소스 판은 이 값이 있어 켜져 있고, 수업용 판(Vercel)은 값이 없어 내려받기만 동작합니다.

- 판단 위치: `client/src/pages/Sandbox.jsx`의 `DRIVE_VIDEO`. 2026-11-12부터 같은 환경변수가 개인 코드의 드라이브 저장(`DRIVE_EDITOR`)도 함께 켭니다(위 구역).
- 보안 정책: `vercel.json`의 본 앱 CSP에 구글 로그인과 드라이브 주소가 들어 있습니다(임베드 경로 제외). `vercel.json`은 환경변수에 따라 달라질 수 없어서, 클라이언트 ID가 없는 배포에도 이 주소가 허용됩니다.
- 드라이브 연결은 Supabase 로그인과 별개의 구글 승인입니다. 구글로 로그인한 학생은 그 계정이 승인 요청에 전달되어 계정 선택을 건너뜁니다. GitHub로 로그인한 학생은 계정을 직접 고릅니다.

수업용 판에서 켜는 순서는 다음과 같습니다.

1. 학교 구글 관리 콘솔에서 외부 앱의 드라이브 접근이 허용되는지 확인합니다.
2. 수업용 판 개인정보 처리방침에 영상이 학생 본인의 드라이브에 저장된다는 내용을 더합니다.
3. 구글 클라우드의 OAuth 웹 클라이언트에 승인된 자바스크립트 원본 `https://vpylab.vercel.app`을 추가합니다.
4. Vercel 프로젝트 환경변수에 `VITE_GOOGLE_CLIENT_ID`를 넣고 다시 배포합니다.
5. 구글 로그인 학생과 GitHub 로그인 학생 계정으로 각각 녹화와 저장을 확인합니다.

끄려면 4번의 환경변수를 지우고 다시 배포합니다. 2026-11-10 기준으로 3번에서 `vercel.app` 하위 주소가 받아들여지는지는 확인하지 않았습니다.

실제 계정 확인 기록(오픈소스 판, 2026-11-10): 0.1MB 영상 한 조각 저장 성공, 6.4MB 영상(30초)이 2MB 조각 4개로 나뉘어 저장 성공. 업로드 도중 연결이 끊겼다 이어지는 경우는 단위 테스트로만 검증했습니다.

## 수업용 서버 중계 (/srv, 2026-11-09)

일부 학교·통신사 DNS가 `*.railway.app` 주소를 막습니다. 2026-11-09에 그런 네트워크에서 수업용 판의 공유·저장·팀 기능이 모두 실패한 것을 확인했습니다. 그래서 수업용 화면은 Railway 주소로 직접 요청하지 않고 같은 출처의 `/srv/…`로 요청합니다(`client/.env.production`의 `VITE_API_URL=/srv`). `vercel.json`이 이 요청을 Vercel 함수 `api/srv.mjs`로 보내고, 함수가 Railway 서버로 전달합니다.

요청 제한은 학생 IP 기준이므로, 함수가 실제 학생 IP를 `x-vpylab-client-ip`로 보내고 비밀값 `PROXY_SECRET`을 함께 보냅니다. 서버(`server/middleware/proxy-client-ip.js`)는 비밀값이 맞을 때만 그 IP를 믿습니다. `PROXY_SECRET`은 Vercel(Production·Preview)과 Railway에 같은 값으로 넣어 두었고, 값은 기록하지 않습니다. 바꿀 때는 세 곳을 함께 바꿉니다.

Vercel 프로젝트 환경변수 `VITE_API_URL`은 `client/.env.production`보다 우선합니다. 그래서 Vercel 환경변수도 `/srv`로 바꿔 두었습니다(2026-11-09, 예전 값은 Railway 주소). 서비스 워커가 예전 화면을 저장해 두므로, 사용자는 다음 방문부터 새 주소를 사용합니다.

## 수업용 배포를 이 저장소로 옮긴 기록 (2026-11-09)

수업용 배포는 2026-11-09에 `greatsong/vpylab-classroom`에서 이 저장소로 옮겼습니다. 옮기기 전에 두 저장소의 `main`을 비교해 이 저장소가 수업용 저장소의 커밋을 모두 포함하는 것을 확인했습니다.

1. GitHub의 Vercel 앱과 Railway 앱(`railway-app`)을 `vpylab` 조직의 `vpylab/vpylab` 저장소에만 설치했습니다.
2. Vercel: `vercel git connect https://github.com/vpylab/vpylab.git`로 프로젝트 `vpylab`의 연결 저장소를 바꿨습니다.
3. Railway: `railway service source connect --service vpylab-server --repo vpylab/vpylab --branch main`으로 바꿨습니다. 루트 폴더는 그대로 `/server`입니다.
4. 두 서비스 모두 이 저장소 `main`(dfb5985)으로 배포되는 것을 확인했습니다.

남은 일: `greatsong/vpylab-classroom` 보관(archive), 예전 수업용 작업 폴더(`10_수업자료/vpylab`)의 원격 주소 정리. 그 폴더에는 커밋하지 않은 변경이 남아 있어 손대지 않았습니다.

2026-11-10에 `greatsong/vpylab-classroom`을 보관했습니다. 2026-11-12에 로컬 폴더 이름을 저장소와 같게 통일했습니다. 이 저장소의 작업 폴더는 `10_수업자료/vpylab`이고, 예전 수업용 작업 폴더는 `10_수업자료/_보관/vpylab-classroom`으로 옮겼습니다.
