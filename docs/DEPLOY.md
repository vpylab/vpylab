# 배포

VPyLab은 저장소 `vpylab/vpylab` 하나에서 사이트 하나를 빌드해 Cloudflare Pages에 배포합니다. 운영 주소는 https://vpylab.pages.dev 입니다. 운영 서버와 자체 데이터베이스는 없고, 계정 로그인도 없습니다. 이 문서는 빌드, 설정, 배포, 기능을 켜는 순서를 적습니다.

2026-11-12에 예전 구성(Vercel, Railway 서버, Supabase)을 지우고 지금 구성 하나로 정리했습니다. 결정과 지운 범위는 [SCOPE.md](SCOPE.md)의 "2026-11-12, 하나의 버전" 기록에 있습니다. `vpylab.vercel.app`은 `vpylab.pages.dev`로 넘기기만 합니다(저장소 루트의 `vercel.json`).

## 1. 구성

| 항목 | 내용 |
|---|---|
| 호스팅 | Cloudflare Pages 프로젝트 `vpylab` (정적 파일과 Pages 함수) |
| 빌드 | `client/`에서 `npm run build`. 결과는 `client/dist` |
| 배포 | `.github/workflows/deploy-pages.yml`(워크플로 이름 "Deploy")이 wrangler로 `client/dist`를 올립니다 |
| 서버 쪽 코드 | Pages 함수 `functions/`뿐입니다. 로직과 테스트는 `cloudflare/`에 있습니다 |
| 저장소(DB) | 짧은 공유 주소용 D1 데이터베이스 `vpylab-shares` 하나 (`wrangler.toml`) |
| 응답 헤더와 CSP | `client/public/_headers` |

Pages 함수는 아래 세 가지 요청을 처리하고, 그 밖의 `/api/` 주소에는 404를 돌려줍니다(`functions/api/[[path]].js`).

| 경로 | 하는 일 | 필요한 설정 |
|---|---|---|
| `POST /api/share` | 짧은 공유 주소 만들기 | D1 바인딩 `DB`, 비밀값 `SHARE_SALT` |
| `GET`·`PUT`·`DELETE /api/share/:id` | 공유 코드 읽기, 만든 브라우저에서 고치기, 무작위 주소 지우기 | 위와 같음 |
| `POST /api/github/token` | GitHub 로그인 코드를 토큰으로 바꾸기 | 비밀값 `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |

## 2. 빌드 설정값

빌드에 넣는 값은 모두 공개해도 되는 값입니다. 하나도 넣지 않아도 실행, 예제, 파일 내려받기와 열기는 동작합니다. 예시는 `client/.env.example`에 있고, 값을 읽는 코드는 `client/src/lib/api-base.js`입니다.

| 빌드 변수 | 켜지는 기능 | `api-base.js`의 값 |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | 학생 본인의 구글 드라이브 저장, 영상의 드라이브 저장 | `DRIVE_SAVE` |
| `VITE_GITHUB_CLIENT_ID` | GitHub 팀 프로젝트. 갤러리에 올리기와 대장간 공개 등록도 이 값이 있어야 표시됩니다 | `GITHUB_ADDON`, `TEAM_PROJECTS` |
| `VITE_GALLERY_INDEX_URL` | 학생 작품 갤러리 | `GITHUB_GALLERY`, `GALLERY_INDEX_URL` |
| `VITE_FORGE_INDEX_URL` | 대장간의 모두의 모듈 | `GITHUB_FORGE`, `FORGE_INDEX_URL`, `FORGE_REGISTRY`(`github` 또는 `none`) |

목록 주소 두 개는 `https://raw.githubusercontent.com/…`로 시작하는 `.json` 주소이거나 같은 출처의 경로(`/…`)여야 합니다. 다른 주소를 넣으면 그 기능은 꺼진 채로 빌드됩니다(`shared/gallery-rules.js`의 `isAllowedIndexUrl`).

운영 배포의 값은 저장소의 Actions 변수에 넣습니다. 로컬에서는 `client/.env.example`을 `client/.env.local`로 복사해 값을 넣습니다. `.env.local`은 커밋되지 않습니다.

## 3. 자동 배포

`main`에 병합하면 CI(`.github/workflows/ci.yml`)가 실행됩니다. `main`에 푸시된 커밋의 CI가 성공하면 "Deploy" 워크플로가 실행되어 다음을 차례로 합니다.

1. 배포 설정이 있는지 확인합니다. `CLOUDFLARE_API_TOKEN` 또는 `CLOUDFLARE_ACCOUNT_ID`가 없으면 경고를 남기고 배포를 건너뜁니다. 그래서 포크한 저장소에서는 실패로 표시되지 않습니다.
2. `main`에 더 새 커밋이 있으면 그 커밋의 실행에 배포를 맡기고 건너뜁니다.
3. `client/`에서 `npm ci`와 `npm run build`를 실행합니다. 위 표의 빌드 변수 네 개를 Actions 변수에서 읽습니다.
4. `wrangler pages deploy client/dist --project-name=vpylab --branch=main`으로 올립니다.
5. 배포된 주소에서 `/`, `/privacy`, `/sandbox`, `/gallery`가 200으로 열리는지, 정적 폴더의 없는 파일(`/assets/__missing__.js`)과 없는 API 주소(`/api/__missing__`)가 404인지 확인합니다.

Actions 탭에서 "Deploy"를 직접 실행할 수도 있습니다. 이 워크플로는 저장소가 `vpylab/vpylab`일 때만 동작합니다.

저장소 Settings → Secrets and variables → Actions에 넣는 값은 다음과 같습니다.

| 종류 | 이름 | 값 |
|---|---|---|
| 비밀값(Secret) | `CLOUDFLARE_API_TOKEN` | Cloudflare API 토큰. 권한은 `Account · Cloudflare Pages · Edit`만 줍니다 |
| 변수(Variable) | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 계정 ID |
| 변수 | `VITE_GOOGLE_CLIENT_ID` | 구글 OAuth 웹 클라이언트 ID |
| 변수(선택) | `VITE_GITHUB_CLIENT_ID` | GitHub OAuth 앱의 클라이언트 ID |
| 변수(선택) | `VITE_GALLERY_INDEX_URL` | 갤러리 목록 주소 |
| 변수(선택) | `VITE_FORGE_INDEX_URL` | 모두의 모듈 목록 주소 |
| 변수(선택) | `GALLERY_INDEX` | `on`이면 갤러리 목록 워크플로가 동작합니다(6절) |

## 4. Cloudflare 설정

### Pages 프로젝트

Cloudflare Pages 프로젝트 `vpylab`은 직접 업로드 방식으로 만들어져 Git 연결로 바꿀 수 없습니다. 그래서 GitHub Actions가 배포합니다. `wrangler.toml`이 빌드 결과 폴더(`client/dist`)와 D1 바인딩을 정합니다.

Pages 프로젝트의 Settings → Variables and Secrets에 넣는 비밀값은 다음과 같습니다. 저장소나 `VITE_` 변수에는 넣지 않습니다.

| 이름 | 용도 |
|---|---|
| `SHARE_SALT` | 공유 주소의 요청 제한에서 IP 주소를 해시할 때 섞는 값 |
| `GITHUB_CLIENT_ID` | GitHub OAuth 앱의 클라이언트 ID (토큰 교환 함수) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth 앱의 클라이언트 비밀값 (토큰 교환 함수) |

`GITHUB_CLIENT_ID`나 `GITHUB_CLIENT_SECRET`이 없으면 `/api/github/token`은 503을 돌려주고, 다른 기능은 그대로 동작합니다.

### 응답 헤더와 정적 폴더

- 보안 헤더와 CSP는 `client/public/_headers` 한 곳에서 고칩니다. Vite가 이 파일을 `dist/_headers`로 복사합니다. `client/scripts/pages-config.test.mjs`가 내용을 검사하며, 이 검사는 `npm run test:run`에 들어 있습니다.
- `/embed/*`만 다른 사이트의 iframe에 넣을 수 있게 `frame-ancestors *`를 둡니다. 그 밖의 경로는 `frame-ancestors 'self'`와 `X-Frame-Options: DENY`입니다.
- Cloudflare Pages는 맨 위에 `404.html`이 없으면 없는 주소를 `index.html`로 응답합니다. 화면 경로(`/sandbox` 등)에는 이 동작이 필요합니다. 정적 폴더(`assets/`, `pyodide/`, `projects/`)의 없는 파일은 404가 되어야 하므로, `client/scripts/pages-static.mjs`가 빌드가 끝날 때 그 폴더마다 `404.html`을 넣습니다.

### 짧은 공유 주소 (`/s/<이름>`)

공유 주소는 Pages 함수(`functions/api/share/`)가 만들고 읽으며, 규칙은 `cloudflare/share-core.js` 한 곳에 있습니다. 이름 규칙은 화면과 함수가 `shared/share-names.js`를 함께 사용합니다. 저장하는 것은 코드, 제목, 수정 열쇠의 해시뿐이며 로그인은 필요 없습니다. 저장소가 응답하지 않으면 앱은 코드를 주소에 담은 링크(`#code=`)로 대신합니다(`client/src/utils/share.js`).

| 요청 | 하는 일 |
|---|---|
| `POST /api/share` `{ code, title?, name? }` | 만들기. 이름이 없으면 무작위 6자를 붙입니다. 응답의 `editKey`는 만든 브라우저(localStorage)에만 남깁니다 |
| `GET /api/share/:id` | 읽기 |
| `PUT /api/share/:id` + `Authorization: Bearer <editKey>` | 만든 브라우저에서 내용 바꾸기 |
| `DELETE /api/share/:id` + `Authorization: Bearer <editKey>` | 무작위 주소 지우기. 앱은 이 요청을 보내지 않습니다. 공유 창에서 이름을 정해도 앞서 만든 무작위 주소는 그대로 둡니다(이미 전해졌을 수 있고, 공유 링크는 계속 보관합니다). 정한 이름은 이 요청으로 지울 수 없습니다 |

- 이름은 영어 소문자, 숫자, 하이픈(-) 3~30자이며 먼저 정한 사람이 사용합니다.
- 코드는 50,000자까지 받습니다. 만들기와 고치기는 같은 IP에서 1분에 120건까지 받습니다.
- 요청 제한에 사용하는 값은 비밀값, IP 주소, 분을 함께 해시한 값입니다. 2분이 지난 줄은 다음 요청을 처리할 때 지웁니다(요청이 없으면 그때까지 남습니다). IP 주소 자체는 저장하지 않습니다.
- 공유 주소에는 만료가 없습니다(2026-11-12 결정, [SCOPE.md](SCOPE.md)).

테이블 구조는 `cloudflare/migrations/`에 있습니다. 구조를 바꾼 뒤에는 원격 데이터베이스에 반영합니다. 부적절한 공유 주소나 삭제 요청이 들어온 주소는 지우는 명령으로 처리합니다. 두 명령은 Cloudflare 계정에 로그인한 컴퓨터에서 실행합니다.

```bash
# 테이블 구조 반영
npx wrangler d1 migrations apply vpylab-shares --remote
# 공유 주소 지우기(예: /s/bad-name)
npx wrangler d1 execute vpylab-shares --remote --command "DELETE FROM shares WHERE id = 'bad-name'"
```

2026-11-09에 확인한 D1 무료 사용량은 하루에 쓰기 10만 건, 읽기 500만 건입니다. 지금의 한도는 Cloudflare 문서에서 다시 확인합니다.

## 5. 구글 드라이브 저장 켜기

만들기 화면의 "저장"은 학생 본인의 구글 드라이브 `VPyLab` 폴더에 저장합니다. 브라우저가 Google Identity Services 토큰 방식으로 구글에 직접 로그인하며, 요청하는 권한은 `openid email profile`과 `drive.file`입니다. `drive.file`로는 이 앱이 만든 파일만 다룹니다. 클라이언트 보안 비밀번호는 사용하지 않습니다. 코드는 `client/src/drive/`에 있습니다.

### 구글 클라우드 준비 (한 번)

1. [Google Cloud 콘솔](https://console.cloud.google.com/)에서 프로젝트를 만듭니다.
2. **API 및 서비스 → 라이브러리**에서 **Google Drive API**를 사용 설정합니다.
3. **Google 인증 플랫폼(OAuth 동의 화면)**을 설정합니다.
   - 학교 계정으로 만든 프로젝트에서 대상을 **내부**로 두면 같은 도메인 계정만 사용할 수 있고 테스트 사용자 등록이 필요 없습니다.
   - 다른 학교나 개인 계정도 사용하게 하려면 대상을 **외부**로 두고 프로덕션으로 게시합니다. 테스트 중인 상태에서는 등록한 테스트 사용자만 승인할 수 있습니다.
   - 데이터 액세스에 `.../auth/drive.file`을 추가합니다.
4. **클라이언트 → 클라이언트 만들기 → 웹 애플리케이션**을 선택하고 **승인된 JavaScript 원본**에 사이트 주소를 등록합니다.
   - 운영 주소 (`https://vpylab.pages.dev`, 자체 배포라면 자기 주소)
   - 로컬에서 실제 계정으로 확인할 주소 (예: `http://localhost:4086`)
   - 승인된 원본은 와일드카드를 받지 않습니다. 배포마다 주소가 바뀌는 미리보기 배포는 등록할 수 없습니다.
   - 리디렉션 URI는 비워 둡니다. 팝업 토큰 방식이라 사용하지 않습니다.
5. 만들어진 **클라이언트 ID**(`숫자-문자.apps.googleusercontent.com`)를 Actions 변수 `VITE_GOOGLE_CLIENT_ID`에 넣고 다시 배포합니다.

운영 사이트가 사용하는 OAuth 앱은 2026-11-08에 프로덕션으로 게시했습니다. 요청하는 범위가 모두 민감하지 않은 범위여서 구글 인증 심사는 필요하지 않았습니다. 이 클라이언트에는 `http://localhost:4086`이 등록되어 있습니다([DRIVE_LAB_RESULTS_2026-11-08.md](DRIVE_LAB_RESULTS_2026-11-08.md)). `http://localhost:4033`이 등록되어 있는지는 이 문서를 작성하면서 확인하지 않았습니다.

### 학교 구글 워크스페이스 계정

- 관리 콘솔 → 보안 → 액세스 및 데이터 제어 → API 제어 → 앱 액세스 제어에서 클라이언트 ID로 앱을 추가하고 **제한됨(Limited)** 또는 **신뢰함(Trusted)**으로 지정합니다. 학교가 드라이브를 제한된 서비스로 지정했다면 **신뢰함**이어야 합니다. 메뉴 이름은 관리 콘솔 버전에 따라 다를 수 있습니다.
- 교육용 워크스페이스에서 18세 미만으로 지정된 학생 계정은 관리자가 설정하지 않은 앱을 사용할 수 없습니다.
- 2026-11-08 시험에서 당곡고 교사 계정은 관리자 설정 없이 승인되었습니다. 학생 계정은 확인하지 못했습니다. 다른 학교에서 시험하는 방법은 [TESTERS.ko.md](TESTERS.ko.md)에 있습니다.

### 끄기

`VITE_GOOGLE_CLIENT_ID` 변수를 지우고 다시 배포하면 "내 드라이브" 버튼이 사라지고, "저장"을 누르면 드라이브 저장이 설정되지 않았다는 안내와 공유 링크로 보관하는 방법이 출력 창에 표시됩니다. 실행, 공유 링크, 파일 내려받기와 열기는 그대로 동작합니다.

## 6. GitHub 기능 켜기

GitHub 기능은 세 가지입니다. 팀 프로젝트가 바탕이고, 학생 작품 갤러리와 대장간의 모두의 모듈이 그 위에 있습니다. 세 가지 모두 설정이 없으면 꺼지고 다른 기능은 그대로 동작합니다.

2026-11-12 기준으로 확인하지 못한 것은 다음과 같습니다.

- 운영 사이트에서 갤러리 목록과 모두의 모듈 목록은 아직 켜지 않았습니다.
- 실제 GitHub 계정으로 올리기, 승인, 표시까지 이어지는 과정은 확인하지 못했습니다. 화면과 스크립트는 흉내 낸 GitHub로 확인했습니다.

### 6.1 팀 프로젝트

브라우저가 GitHub API(`api.github.com`)를 직접 호출합니다(`client/src/github/`). GitHub의 토큰 발급 주소는 브라우저 호출을 허용하지 않으므로 Pages 함수 `functions/api/github/token.js`가 로그인 코드를 토큰으로 바꿉니다. 함수는 토큰을 저장하거나 기록하지 않습니다.

켜는 순서는 다음과 같습니다.

1. GitHub에서 OAuth 앱을 만듭니다(조직 → Settings → Developer settings → OAuth Apps). Homepage URL은 사이트 주소, Authorization callback URL은 `https://<사이트 주소>/github/callback`입니다. OAuth 앱은 콜백 주소를 하나만 가지므로 로컬 확인용 앱(예: `http://localhost:4086/github/callback`)은 따로 만듭니다.
2. 클라이언트 ID를 저장소 Actions 변수 `VITE_GITHUB_CLIENT_ID`에 넣습니다.
3. Cloudflare Pages 프로젝트의 비밀값에 `GITHUB_CLIENT_ID`와 `GITHUB_CLIENT_SECRET`을 넣습니다(4절).
4. 다시 배포한 뒤 만들기 화면의 "팀 프로젝트"에서 연결, 프로젝트 만들기, 저장, 초대를 실제 계정 두 개로 확인합니다.

알아 둘 점은 다음과 같습니다.

- 요청하는 GitHub 권한은 `public_repo`(공개 저장소 만들기와 커밋)와 `repo:invite`(받은 초대 수락)입니다.
- 프로젝트는 공개 저장소 하나이며 topic `vpylab-project`로 구분합니다. 저장소에는 `main.py`, `history.md`, `index.html`(실행 화면), `README.md`가 들어갑니다.
- 토큰은 브라우저 탭 저장소(sessionStorage)에 두므로 탭을 닫으면 다시 연결해야 합니다.
- GitHub 계정은 13세 이상만 만들 수 있습니다. 그래서 선택 기능으로 둡니다.

### 6.2 학생 작품 갤러리

갤러리는 운영 서버와 DB 없이 동작합니다. 앱은 정적 목록 파일 하나만 읽고, GitHub 검색을 직접 부르지 않습니다. 학교는 한 IP를 함께 사용해 GitHub 검색 한도에 걸리기 쉽고, 검색 결과를 그대로 보이면 승인 단계를 둘 수 없기 때문입니다.

| 단계 | 하는 일 | 위치 |
|---|---|---|
| 올리기(학생) | 팀 프로젝트 창의 "갤러리에 올리기"가 저장소에 topic `vpylab-gallery`를 더하고(`vpylab-project`는 유지), 지금 3D 화면을 `thumbnail.jpg`로 커밋합니다. 그림이 없어도 올릴 수 있습니다 | `client/src/github/github-api.js`의 `setGalleryListing`·`putThumbnail`, `client/src/components/github/GitHubProjectDialog.jsx` |
| 목록 만들기 | 워크플로가 30분마다(직접 실행 가능) topic이 붙은 공개 저장소를 검색해 승인 파일과 대조하고 `gallery-data` 브랜치에 커밋합니다 | `.github/workflows/gallery-index.yml`, `scripts/gallery/` |
| 승인(교사) | `gallery-data` 브랜치의 `approvals.txt`에 줄을 추가합니다. 승인 전 작품은 `PENDING.md`에만 있습니다 | [GALLERY_GITHUB.md](GALLERY_GITHUB.md) |
| 보기 | 앱은 `gallery.json`만 읽습니다 | `client/src/gallery/`, `client/src/pages/GitHubGallery.jsx` |

`gallery-data` 브랜치의 파일은 다음과 같습니다.

| 파일 | 내용 |
|---|---|
| `approvals.txt` | 승인 파일. 한 줄에 하나씩 `approve 아이디/저장소`, `approve @아이디`, `block 아이디/저장소`, `block @아이디`. 차단이 승인보다 우선합니다. 읽지 못한 줄은 승인으로 보지 않습니다. 워크플로는 이 파일이 없을 때만 빈 양식을 넣습니다 |
| `gallery.json` | 승인된 작품. 항목은 `fullName`, `title`, `owner`, `pagesUrl`, `htmlUrl`, `thumbnailUrl`, `stars`, `updatedAt`뿐입니다. 최근에 고친 순서이며 최대 500개입니다 |
| `pending.json`, `PENDING.md` | 승인 대기 작품. 교사가 확인하는 목록이며 앱은 읽지 않습니다 |
| `forge.json`, `forge-pending.json` | 모두의 모듈 목록과 승인 대기 저장소(6.3) |

목록을 만드는 쪽과 읽는 쪽은 같은 규칙(`shared/gallery-rules.js`)으로 항목을 검사합니다. 제목과 아이디는 글자로만 다룹니다. 주소는 저장소 이름에서 다시 만든 `https://github.com/<owner>/<repo>`, `https://<owner>.github.io/<repo>/`, `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/thumbnail.jpg`와 같을 때만 받아들입니다. 보관되거나 비공개가 되거나 삭제된 저장소, topic을 뺀 저장소는 다음 갱신 때 빠집니다. 미리보기 그림은 200KB 이하일 때만 싣습니다.

켜는 순서는 다음과 같습니다.

1. 저장소 Settings → Secrets and variables → Actions → Variables에 `GALLERY_INDEX` = `on`을 넣습니다. 이 값이 없으면 워크플로는 아무것도 하지 않습니다. 예약 실행은 기본 브랜치의 워크플로 파일로만 동작합니다.
2. Actions 탭에서 "Gallery index"를 "Run workflow"로 한 번 실행합니다. `gallery-data` 브랜치가 만들어지고 승인 파일의 빈 양식과 빈 목록이 들어갑니다.
3. `gallery-data` 브랜치에 보호 규칙을 겁니다(강제 푸시와 삭제 금지). 저장소에 쓰기 권한이 있는 사람은 승인 파일을 고칠 수 있으므로, 승인할 교사에게만 쓰기 권한을 줍니다. 보호 규칙이 `github-actions[bot]`의 푸시를 막지 않게 합니다.
4. Actions 변수 `VITE_GALLERY_INDEX_URL`에 `https://raw.githubusercontent.com/vpylab/vpylab/gallery-data/gallery.json`을 넣고 다시 배포합니다("Deploy" 직접 실행 또는 `main` 푸시).
5. "갤러리에 올리기"와 앱에서 스타 누르기는 팀 프로젝트(`VITE_GITHUB_CLIENT_ID`)가 켜진 배포에서만 표시됩니다. 팀 프로젝트가 없는 배포는 갤러리 보기만 됩니다.
6. 승인할 교사에게 [GALLERY_GITHUB.md](GALLERY_GITHUB.md)를 안내합니다.
7. 실제 계정 두 개로 올리기, `PENDING.md` 표시, 승인, 갤러리 표시, 스타, 내리기를 확인합니다.

`VITE_GALLERY_INDEX_URL`이 없는 배포에서 `/gallery`는 GlowScript 원본 프로젝트 목록을 보여 줍니다. 이 목록은 언제나 `/gallery/glowscript`에서도 열립니다.

끄려면 `VITE_GALLERY_INDEX_URL` 변수를 지우고 다시 배포합니다. 목록 갱신까지 멈추려면 `GALLERY_INDEX` 변수를 지웁니다.

다른 학교가 자기 목록을 운영하려면 자기 저장소(포크)에서 1~4번을 하고 주소의 `vpylab/vpylab`을 자기 저장소로 바꿉니다. topic은 모든 배포가 `vpylab-gallery`를 함께 사용하므로, 승인 대기 목록에는 다른 학교 학생이 올린 작품도 나타납니다. 공개 목록에는 그 저장소의 승인 파일에 있는 작품만 들어갑니다.

### 6.3 대장간의 모두의 모듈

대장간의 공개 등록도 같은 구조로 동작합니다.

| 단계 | 하는 일 | 위치 |
|---|---|---|
| 공개 등록(학생) | 작업대의 "모두의 모듈에 공개 등록"이 학생 계정에 공개 저장소 `vpylab-forge`를 만들고(없을 때) topic `vpylab-forge`를 붙인 뒤 `modules/<모듈 ID>.py`를 올립니다. 파일 첫 줄에 모듈 자료(레시피)가 들어 있습니다 | `client/src/github/github-api.js`의 `putForgeModule`, `client/src/forge/github-registry.js`, `client/src/components/forge/ForgeGitHubPublish.jsx` |
| 목록 만들기 | 갤러리와 같은 워크플로가 topic으로 저장소를 찾고, 승인된 저장소의 모듈 파일만 읽어 `forge.json`을 만듭니다. 승인 대기 저장소는 `forge-pending.json`과 `PENDING.md`의 둘째 표에 남습니다 | `scripts/gallery/forge-index.mjs`, `scripts/gallery/build-index.mjs` |
| 승인(교사) | 갤러리와 같은 `approvals.txt`. `approve 아이디/vpylab-forge` 또는 `approve @아이디` | [GALLERY_GITHUB.md](GALLERY_GITHUB.md) 6절 |
| 보기와 가져오기 | 앱은 `forge.json`만 읽습니다. 가져오기는 로그인과 네트워크 요청 없이 이 브라우저의 보관함에 사본을 만들고 원본을 `gh:아이디/모듈 ID`로 기록합니다 | `client/src/forge/forge-index.js`, `client/src/components/forge/ForgeLibrary.jsx` |
| 공개 내리기 | "내 모듈 공개 내리기"가 그 파일을 저장소에서 지웁니다 | `deleteForgeModule` |

켜는 순서: 6.2의 1~3번을 마친 저장소에서 Actions 변수 `VITE_FORGE_INDEX_URL`에 `https://raw.githubusercontent.com/vpylab/vpylab/gallery-data/forge.json`을 넣고 다시 배포합니다. 공개 등록 버튼은 팀 프로젝트(`VITE_GITHUB_CLIENT_ID`)가 켜진 배포에서만 표시되고, 없는 배포는 보기와 가져오기만 됩니다. 변수를 지우고 다시 배포하면 모두의 모듈 탭과 공개 등록이 꺼지며 만들기, 보관함, 내려받기는 그대로 동작합니다.

알아 둘 점은 다음과 같습니다.

- 모듈의 파이썬 코드는 목록에 싣지 않습니다. 목록에는 레시피만 있고, 앱이 대장간의 검사기(`parseModuleFile`)를 통과한 레시피에서 코드를 다시 만듭니다. 학생이 저장소의 `.py` 파일을 손으로 고쳐도 다른 학생의 브라우저에서 실행되지 않습니다.
- 한 저장소에서 50개, 전체 300개까지 싣습니다. 마지막으로 읽은 뒤 푸시가 없는 저장소는 GitHub에 다시 묻지 않고, 푸시가 있으면 내용(sha)이 바뀐 파일만 다시 읽습니다. 저장소 하나를 읽지 못하면 그 저장소의 앞선 모듈을 그대로 두고 다음 실행에서 다시 읽습니다.
- 목록 스크립트는 모듈 파일의 첫 줄만 읽습니다. 카드의 "GitHub에서 보기"는 학생의 저장소 파일을 그대로 엽니다.
- 학생 계정에 같은 이름의 비공개 저장소가 있으면 올리지 않고 안내합니다.
- 필요한 GitHub 권한은 `public_repo`이며 새로 요청하는 권한이 없습니다.

### 6.4 권한과 한계

- 목록 워크플로는 예약 실행과 직접 실행에서만 동작합니다. `pull_request`에서는 동작하지 않으므로 포크의 PR이 실행할 수 없습니다. 검색 결과를 다루는 작업은 `contents: read`, 브랜치에 커밋하는 작업만 `contents: write`입니다.
- GitHub 검색이 실패하거나 결과가 불완전하면 목록을 바꾸지 않습니다. 앞서 만든 목록이 그대로 남습니다.
- 스타와 갤러리에 올리기는 팀 프로젝트가 이미 요청하는 `public_repo`로 동작합니다. topic은 저장소 관리자만 바꿀 수 있어, 올리기와 내리기는 저장소 소유자에게만 표시됩니다.
- GitHub 검색은 1,000건까지만 돌려줍니다. 공개 목록은 500건까지 싣습니다.
- 예약 실행은 GitHub 사정으로 늦어질 수 있습니다. 공개 저장소의 예약 워크플로는 저장소에 60일 동안 활동이 없으면 멈추며 Actions 탭에서 다시 켭니다.
- `raw.githubusercontent.com`은 파일을 몇 분 동안 캐시합니다. 승인한 작품과 바꾼 미리보기 그림은 그만큼 늦게 표시될 수 있습니다.
- 승인은 저장소 단위입니다. 승인한 뒤에 바뀐 코드와 그림, 나중에 올라오는 모듈은 다시 확인하지 않습니다. 문제가 생기면 차단 줄로 내립니다.
- 갤러리의 "코드 보기"는 만들기 화면의 `?repo=owner/repo`로 열며, 저장소 기본 브랜치의 `main.py`를 읽습니다(`raw.githubusercontent.com/<owner>/<repo>/HEAD/main.py`).
- GitHub 계정이 없는 학생은 올릴 수 없습니다.

목록 스크립트는 의존성 없이 동작하며 로컬에서 읽기 전용으로 확인할 수 있습니다.

```bash
# 테스트
node --test scripts/gallery/*.test.mjs
# 실제 GitHub 검색으로 결과만 출력(파일을 만들지 않음)
node scripts/gallery/build-index.mjs --approvals <approvals.txt> --dry-run
```

## 7. 로컬에서 실행하기

화면만 확인할 때는 Vite 개발 서버를 사용합니다. 이 서버에는 `/api/*`가 없으므로 짧은 공유 주소와 GitHub 연결은 동작하지 않습니다.

```bash
cd client
npm install
npm run dev          # http://localhost:4033
```

Pages 함수까지 확인할 때는 빌드한 뒤 wrangler로 실행합니다.

```bash
cd client && npm run build && cd ..
npx wrangler pages dev client/dist --port 4086 --persist-to /tmp/vpylab-pages-dev-state
```

- 로컬 비밀값(`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SHARE_SALT`)은 저장소 루트의 `.dev.vars`에 둡니다. 이 파일은 `.gitignore`에 있어 커밋되지 않습니다.
- 빌드 변수(`VITE_…`)는 빌드할 때 읽습니다. `client/.env.local`에 넣거나 `npm run build` 앞에 적습니다.
- 로컬 D1은 `--persist-to` 폴더에 만들어집니다. 처음 한 번 `npx wrangler d1 migrations apply vpylab-shares --local --persist-to /tmp/vpylab-pages-dev-state`로 테이블을 만듭니다(2026-11-12 확인). 테이블이 없으면 `/api/share`가 500을 돌려주고 앱은 코드를 주소에 담은 긴 링크로 대신합니다.

손으로 바로 올릴 때는 다음과 같이 합니다. Cloudflare 계정에 로그인한 컴퓨터에서 실행합니다.

```bash
cd client && npm run build && cd ..
npx wrangler pages deploy client/dist --project-name vpylab --branch main
```

## 8. 측정 기록

2026-11-07에 맥북 크롬에서 측정한 값입니다. 2026-11-12의 정리 뒤에는 다시 측정하지 않았습니다.

- 다시 방문하면 화면은 0.3초 만에 표시되고, 새로 받는 양은 5KB였습니다.
- 파이썬 엔진은 파일이 캐시에 있어도 브라우저에서 준비하는 데 3~4초가 걸렸습니다. 그래서 첫 화면과 문서를 보는 동안 엔진을 미리 준비합니다(`client/src/engine/idle-prewarm.js`). 문서 화면에서 "만들기"로 들어가면 0.4초 만에 준비가 끝났습니다.
- 편집기는 파이썬 전용 Monaco(`client/src/components/editor/monaco-python.js`)를 사용합니다. 배포 크기는 33MB에서 24MB로 줄었습니다.

## 9. 아직 남아 있는 예전 자원

2026-11-12 기준으로 아래 자원은 아직 남아 있으며 따로 지울 예정입니다. 지금의 사이트는 이 자원을 사용하지 않습니다.

- 예전 Supabase의 VPyLab 데이터
- Railway 서비스
- Vercel 프로젝트 (`vpylab.vercel.app`의 넘기기 설정은 이 프로젝트가 맡고 있습니다)
