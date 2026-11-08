# Documentation design brief (2026-11-08)

Covers three documents:

- (a) `README.md`, in English
- (b) `README.ko.md`, in Korean
- (c) `docs/GUIDE.ko.md`, a Korean guide for teachers and students

Research behind the structure: [readme-research.md](readme-research.md).

Every fact below was checked against the repository or the live site on 2026-11-08. The repo was on branch `feat/open-edition-cloudflare` at `d60556f`. A fact ID (F1, F2, ...) points to its source. Each document section lists the fact IDs it must contain.

UI labels are quoted from the working tree on 2026-11-08. Another session is editing `client/src/drive-lab/` at the same time. Re-check the drive-lab labels (F40–F49) before publishing.

## 1. Verified facts

### Product and editions

| ID | Fact | Source |
|---|---|---|
| F1 | Browser 3D Python learning platform built on Pyodide (Python in a Web Worker), Three.js, Web Audio and Monaco. Follows standard Python and the official VPython API; sound and Korean aliases are marked VPyLab extensions | `AGENTS.md`, `client/package.json`, `client/src/engine/` |
| F2 | One codebase, two editions, selected by `VITE_EDITION` (`open` or default `classroom`) | `client/src/lib/api-base.js`, `docs/DEPLOY_TWO_EDITIONS.md` |
| F3 | Open edition: https://vpylab.pages.dev on Cloudflare Pages. No server and no DB. Build: `cd client && npm ci && npm run build:open`, output `client/dist` | `docs/DEPLOY_TWO_EDITIONS.md`, `client/package.json`, live HTTP 200 |
| F4 | Classroom edition: VPyLab Classroom, https://vpylab.vercel.app (Vercel) + Railway Express server + Supabase (login, gallery, teams, GitHub). Build: `vercel.json` → `cd client && npm install && npm run build:deploy` | `vercel.json`, `docs/DEPLOY_TWO_EDITIONS.md`, live HTTP 200 |
| F5 | `build:open` blanks `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, so the bundle holds no server addresses; CSP for the open edition drops Supabase and Railway | `client/package.json`, live CSP header |
| F6 | Open edition turns off: login button, Gallery menu. `SERVER_FEATURES` is false in the open edition and in classroom LAN mode | `client/src/lib/api-base.js`, `Header.jsx` |
| F7 | Open edition **Save** (also Ctrl/Cmd+S, Save as, Save history, Publish to gallery) opens a dialog titled "저장 기능 준비 중" / "Saving is coming soon". It tells users to use **Tools → HTML 내려받기 (Download HTML)** and links to `/drive-lab` ("드라이브 저장 실험 열기") | `AuthModal.jsx`, `Sandbox.jsx`, checked live |
| F8 | Open edition **Tools → 공유 (Share)** does not work yet: it posts to `/api/share`, which returns 405 on Cloudflare Pages | `client/src/utils/share.js`, live network log |
| F9 | Repo: https://github.com/vpylab/vpylab (public). Classroom deploys are still connected to `greatsong/vpylab-classroom` until the move in `DEPLOY_TWO_EDITIONS.md` is done | GitHub API, `docs/DEPLOY_TWO_EDITIONS.md`, `docs/GOOGLE_FIRST_PLAN.md` |

### Features in the open edition

| ID | Fact | Source |
|---|---|---|
| F10 | Top menu (Korean / English): 트레이닝 Training `/missions`, 만들기 Create `/sandbox`, 튜토리얼 Tutorials `/tutorials`, 대장간 Forge `/forge`, 문서 Docs `/docs`, 사용 안내 Guide `/guide`. **More** menu: About `/about`, Language (한국어 / English), Theme (9 themes), Install as app (only when the browser offers it) | `Header.jsx`, `appStore.js`, `InstallPrompt.jsx` |
| F11 | Training: 8-lesson foundation course "처음 만드는 빛과 소리" (First light and sound project); an optional 6-step core practice (variables, loops, conditions, lists, light + sound, your own project) with automatic condition checks; 4 optional lessons "작품 저장과 공유" (Save and share), which rely on classroom-edition saving and GitHub | `Missions.jsx`, `data/training.js`, `data/github-project-course.js` |
| F12 | Tutorials: 4 short experiences (Create in 3D, Connect light and sound, Watch code move, Make a button respond) plus "만들며 탐구하기" (Explore by making) projects | `Tutorials.jsx`, `data/tutorials.js` |
| F13 | Create: Run / Stop, editor, 3D view, console. Phone layout has Code / Screen / Output tabs. Stop also ends scheduled sounds | `Sandbox.jsx`, `docs/USER_GUIDE_EN.md` |
| F14 | Completion without AI: Ctrl+Space or **자동 완성**, Tab accepts, Esc closes. A small word card explains unfamiliar words like `sphere`, `radius`, `opacity`, `compound`. Code is not sent to any AI service | `docs/USER_GUIDE_EN.md`, `docs/USER_GUIDE_KO.md` |
| F15 | Examples: 57 examples in 8 categories (space, sound, science, art, game, creative, math, interactive). Opened from **Tools → 예제 (Examples)** in Create, or `/examples` | `data/examples.js`, `Sandbox.jsx` |
| F16 | Docs: 97 entries in 12 categories (shape guides, 3D objects, meshes, vectors, scene, events, widgets, 2D graphs, colors, materials, sound, 3D charts) | `data/docs.js` |
| F17 | Forge: build one reusable object with sliders (characters, a bell, project assets, basic shapes), keep it in the browser library, copy the module code or download a `.py` file. Publishing and forking community modules need login, so they are not available in the open edition | `pages/Forge.jsx`, `forge/registry.js` |
| F18 | **Tools → HTML 내려받기** downloads one standalone HTML file with the code. The file loads Pyodide and Three.js from CDNs (jsDelivr, unpkg) when opened, so it needs internet | `Sandbox.jsx`, `server/utils/standalone-template.js` |
| F19 | Progress, theme, language, home settings and word-help history are kept in this browser (localStorage). Practice drafts are kept in the browser tab (sessionStorage) | `stores/appStore.js`, `utils/practice-drafts.js` |
| F20 | English UI: `?lang=en` or More → Language → English | `i18n/locale.js`, `docs/USER_GUIDE_EN.md` |
| F21 | Sample code verified live in the open edition: red glowing sphere, label "Hello!", three notes | run on https://vpylab.pages.dev/sandbox on 2026-11-08 |

### Network origins (privacy and school IT)

| ID | Fact | Source |
|---|---|---|
| F30 | Main app, observed on a live load: requests to `vpylab.pages.dev`, `fonts.googleapis.com`, `api.fontshare.com` (web fonts). CSP also allows `fonts.gstatic.com`, `cdn.fontshare.com`, `cdn.jsdelivr.net`, `unpkg.com` | browser performance entries, live CSP |
| F31 | Pyodide loads from the same site first; jsDelivr and unpkg are fallbacks if that fails | `client/src/engine/pyodide-worker.js` |
| F32 | Drive lab CSP allows only the page itself, `accounts.google.com/gsi/`, `www.googleapis.com`, `oauth2.googleapis.com`, `*.googleusercontent.com` | live CSP on `/drive-lab` |

### Drive saving experiment

| ID | Fact | Source |
|---|---|---|
| F40 | https://vpylab.pages.dev/drive-lab (`/drive-lab.html` redirects there with 308). It is an experiment page, not the main editor. It has a plain text box and does not run Python | live, `DriveLabApp.jsx` |
| F41 | Google Identity Services token model. Scopes: `openid email profile` + `https://www.googleapis.com/auth/drive.file`. `drive.file` lets the app see only files it created | `google-auth.js`, `docs/DRIVE_LAB.md` |
| F42 | Files go to a `VPyLab` folder in the student's own Drive. Moving or renaming the folder is fine; the app finds it by a marker | `drive-storage.js`, `docs/DRIVE_LAB.md` |
| F43 | Access token is kept only in memory. No refresh token. It lasts about 1 hour. A **승인 연장** (extend) button appears in the last 5 minutes. After expiry, saving fails with a message that the code is kept as a browser draft; **다시 승인** continues the save | `google-auth.js`, `DriveLabApp.jsx`, `docs/GOOGLE_FIRST_PLAN.md` |
| F44 | Unsaved drafts stay in this browser per account (localStorage). Drafts older than 14 days are removed the next time the page is opened on that computer | `lab-state.js`, `docs/DRIVE_LAB.md` |
| F45 | Version history uses Drive's version history. Conflicts between two devices are detected and shown | `docs/DRIVE_LAB.md` |
| F46 | Shared computers: **로그아웃** asks whether to delete that account's drafts; the page then offers a "구글 계정에서도 로그아웃" link. Logging out of the page does not log out of Google | `docs/DRIVE_LAB.md`, `DriveLabApp.jsx` |
| F47 | Revoke: **권한 철회** button or https://myaccount.google.com/connections | `docs/DRIVE_LAB.md` |
| F48 | Messages: popup blocked → "승인 창을 열지 못했습니다. 브라우저의 팝업 차단을 해제하세요."; popup closed → "승인 창이 닫혔습니다. 다시 시도하세요."; denied → "승인을 거부했습니다…"; admin policy → "학교 관리자가 이 앱을 아직 허용하지 않았습니다…"; Drive box unchecked → "드라이브 권한이 없습니다…" with a **드라이브 권한 다시 요청** button | `google-auth.js`, `DriveLabApp.jsx` |
| F49 | Test results as of 2026-11-08, personal Gmail account: save and reopen, version history, re-approval after token expiry with the draft kept, 30 consecutive saves (average 3.0 s, 0 errors), network origins limited to Google plus the page | maintainer report in the task request (not recorded in a repo file) |
| F50 | OAuth app status: "Testing". Only registered test users (max 100 per Google) can approve. Other accounts are blocked by Google with error 403 `access_denied` | task request; Google Cloud help [15549945](https://support.google.com/cloud/answer/15549945) |
| F51 | School Workspace accounts: the admin may need to allow the app in Admin console → Security → Access and data control → API controls → App access control, as **Limited** or **Trusted** by client ID. If Drive is a restricted service, it must be **Trusted**. Menu names vary by console version | `docs/DRIVE_LAB.md` |
| F52 | Google Workspace for Education: users designated under 18 are blocked from unconfigured third-party apps. Parental consent, where the law requires it, is the school's responsibility | Google Workspace help (manage access to unconfigured third-party apps for users designated as under 18), `docs/GOOGLE_FIRST_PLAN.md` |
| F53 | Self-hosting the Drive lab: create your own OAuth client (Web), add your site to Authorized JavaScript origins, set `VITE_GOOGLE_CLIENT_ID`. The client ID is public; no client secret. A school project with audience **Internal** needs no test users but only same-domain accounts can use it. Production builds hide the client-ID input on purpose | `docs/DRIVE_LAB.md` |
| F55 | Google Workspace app access changes can take up to 24 hours to apply | Google Workspace help (same page as F52) |
| F54 | Drive-lab local dev: `cd client && npm run dev:drive-lab` → http://localhost:4086/drive-lab.html | `client/vite.drivelab.config.js`, `docs/DRIVE_LAB.md` |

### Development

| ID | Fact | Source |
|---|---|---|
| F60 | Ports: client 4033 (Vite), server 4034 (Express), drive lab 4086, Cloudflare local check 4087 (`npx wrangler pages dev client/dist --port 4087`), classroom LAN 4077 | `client/vite.config.js`, `package.json`, `docs/DEPLOY_TWO_EDITIONS.md`, project registry |
| F61 | Install: `npm install` at root, `npm --prefix client ci` (or `cd client && npm install`), `cd server && npm install`. Full stack dev: `npm run dev` (client + server). Client only: `npm run dev:client` | `package.json`, `CONTRIBUTING.md` |
| F62 | Open edition locally: `cd client && VITE_EDITION=open npm run dev` (no server needed; Vite reads `VITE_*` from the shell) | `api-base.js`, `build:open` script |
| F63 | Tests: `npm --prefix client run test:run` (Vitest). Lint: `npm --prefix client run lint`. CI uses Node 20 and 24 | `client/package.json`, `.github/workflows/ci.yml` |
| F64 | Env templates: `.env.example`, `client/.env.example`, `server/.env.example`. `client/.env.production` is committed with public values (ignored by `build:open`) | repo files, `docs/DEPLOY_TWO_EDITIONS.md` |
| F65 | Dependencies in this tree: React 19, Vite 8, Tailwind 4, Three.js 0.183, Monaco 0.55.1, Pyodide 0.27.0 | `client/package.json` |
| F66 | Content in data: 10 courses, 54 missions in 6 categories, 57 examples, 97 docs entries, 33 GlowScript showcase projects | `client/src/data/*.js` (counted with Node) |
| F67 | Related docs that exist: `docs/DEPLOY_TWO_EDITIONS.md`, `docs/DRIVE_LAB.md`, `docs/GOOGLE_FIRST_PLAN.md`, `docs/VPYTHON_API.md`, `docs/GLOWSCRIPT_COMPAT_REPORT.md`, `docs/I18N_GUIDE.md`, `docs/MISSION_SCHEMA.md`, `docs/CLASSROOM_LAN_MODE.md`, `docs/USER_GUIDE_KO.md`, `docs/USER_GUIDE_EN.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` | file listing |

### License and credits

| ID | Fact | Source |
|---|---|---|
| F70 | Code: AGPL v3 (`LICENSE`, copyright 2026 석리송 (Seok Ri-song) / 당곡고등학교 수리정보교육부) | `LICENSE` |
| F71 | Mission content: CC BY-NC-SA 4.0. Stated in README, AGENTS.md, CONTRIBUTING.md and the mission issue template; there is no separate content license file | grep |
| F72 | Imported MIT code: `shapes`/`paths` from vpython-jupyter `shapespaths.py`; `compound` transforms and `text` positioning from vpython-jupyter `vpython.py` (Copyright (C) 2015 John Coady, Ruth Chabay, Bruce Sherwood). `group` follows GlowScript `lib/glow/primitives.js` (MIT) as a specification. Notices in `client/src/engine/vpython-api.py` | previous `README.md` |
| F73 | Upstream libraries: Pyodide, Three.js (MIT), Monaco Editor (MIT), React (MIT) | `node_modules/*/package.json` |

## 2. Facts not verified, and inconsistencies found

Do not state these as facts in the documents.

1. **Security contact.** `.github/SECURITY.md` names `security@vpylab.org` and a `greatsong/vpylab` advisory link. `vpylab.org` did not resolve (NXDOMAIN). Private vulnerability reporting is off on `vpylab/vpylab`. Keep both out of the README; mark as a maintainer TODO.
2. **`vpylab.org`.** `FUNDING.yml` and the plans mention a custom domain. It does not exist yet. Use `vpylab.pages.dev` only.
3. **License detection.** GitHub shows the license as "Other" because `LICENSE` has a custom header and only a link to the full AGPL text. No license badge.
4. **In-app pages.** `/privacy` and `/guide` are not edition-aware. The privacy page describes Supabase storage and OAuth login, which do not apply to the open edition. Fix in code later; the new docs describe the open edition accurately.
5. **Content license scope.** Which files count as "mission content" under CC BY-NC-SA 4.0 is not defined in a file. The docs repeat the existing wording only.
6. **Drive test results (F49).** Given by the maintainer; no repo file records them yet.
7. **Who manages test users.** The Google Cloud project owner for the `vpylab.pages.dev` client is not recorded in the repo. The docs say "ask the VPyLab maintainers" through GitHub issues.
8. **Google token lifetime.** "About 1 hour" comes from the repo plan and Google's token model; Google's page only says tokens are short-lived.
9. **Old README deploy guide.** It uses Render for the server, while the running classroom edition uses Railway. The Vercel build settings there (`npx vite build`) differ from the root `vercel.json`. It is kept as `docs/DEPLOY_CLASSROOM.ko.md` with a note on top, not rewritten.

## 3. Document (a): `README.md` (English)

Audience: teachers, students, school IT and developers worldwide. Written directly by Claude.

| # | Section | Must contain |
|---|---|---|
| 1 | Title + pitch | "VPyLab", one sentence: browser 3D Python lab for schools, with light and sound (F1). Second line: runs in the browser, nothing to install, no account in the open edition (F3). Language links: English · [한국어](../../README.ko.md) |
| 2 | Try it | Link to https://vpylab.pages.dev (F3), `?lang=en` (F20). Screenshot TODO: Create screen with the sample running |
| 3 | Code sample | The F21 sample in a code block and one line saying what it shows. Note that `play_note_and_wait` is a VPyLab extension (F1) |
| 4 | Status note | Saving in the open edition is in progress (F7); Share link does not work yet (F8); Drive saving is an experiment page (F40, F49, F50) |
| 5 | Two editions | Table: open vs. classroom. Host, URL, server/DB, login, saving, gallery and teams (F2–F6, F9) |
| 6 | For students and teachers | Where to start (Training → Create → Tutorials → Forge → Docs) (F10–F17), saving today (F7, F18), link to `docs/GUIDE.ko.md` (Korean), `docs/USER_GUIDE_EN.md` (written for the classroom edition, F67) |
| 7 | Privacy | No VPyLab server or DB in the open edition; code runs in the browser; browser storage (F19); third-party origins (F30, F31); Drive lab: only Google, `drive.file`, token in memory, revoke link (F32, F41–F47) |
| 8 | For school IT | Domains to allow (F30–F32); Workspace admin allowing the OAuth app (F51, F52); Testing status and test users (F50); self-hosting with an own client ID (F53) |
| 9 | For developers | Tech stack (F65), quick start commands (F61, F62), ports table (F60), tests (F63), env (F64), build both editions (F3, F4), project layout, links to deploy docs (F67) |
| 10 | Contributing | `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, translations (`docs/I18N_GUIDE.md`, i18n issue template), mission schema; security: report privately, maintainer TODO (section 2, item 1) |
| 11 | License | Code AGPL v3 (F70); mission content CC BY-NC-SA 4.0 (F71); imported MIT code (F72) |
| 12 | Acknowledgments | GlowScript and VPython authors (F72), Pyodide, Three.js, Monaco (F73) |

Screenshots: placeholders only, as HTML comments plus a visible "Screenshot coming soon" line. Suggested shots: (1) Create screen running the sample; (2) Training page; (3) Forge with a character; (4) Drive lab after a save, with personal data cropped.

No badges (section 2, item 3).

## 4. Document (b): `README.ko.md` (Korean)

Audience: Korean teachers and students first, then developers. Same order as the English README, shorter developer part.

- Prose paragraphs are written by Solar Pro 4 from the section briefs below.
- Headings, table cells, commands and link text are written by Claude, following the Korean style rules (no em-dash chaining, no metaphors, 사용하다 instead of 쓰다, 버튼 instead of 단추).

| # | 제목 | Prose by Solar | Facts |
|---|---|---|---|
| 1 | VPyLab | 2–3 sentences: what it is, open edition needs no install or account | F1, F3 |
| 2 | 바로 사용하기 | 1 paragraph: open the link, Training first lesson | F3, F11 |
| 3 | 예제 코드 | 1 sentence before the code: what appears and what sounds play | F21, written with the Korean aliases `색상` and `음표` (also verified live on 2026-11-08) |
| 4 | 지금 상태 | 1 paragraph: saving in progress, HTML download, share not working, Drive experiment | F7, F8, F40, F49, F50 |
| 5 | 두 가지 판 | table only (Claude) | F2–F6 |
| 6 | 학생과 교사 | 1 paragraph + link to `docs/GUIDE.ko.md` | F10–F17 |
| 7 | 개인정보 | 1 paragraph | F19, F30, F31, F41, F43 |
| 8 | 학교 정보 담당자 | 1 paragraph + domain list (Claude) | F30–F32, F50–F53 |
| 9 | 개발자 | commands and ports (Claude), 1 sentence intro | F60–F65 |
| 10 | 기여·라이선스·감사의 말 | lists (Claude) | F70–F73 |

## 5. Document (c): `docs/GUIDE.ko.md` (Korean guide for teachers and students)

Audience: middle and high school students using VPyLab for the first time, and teachers preparing a class. Style: 합쇼체, declarative, short paragraphs. Organized by tasks (Hedy model).

- Prose: Solar Pro 4, one block per paragraph.
- Headings, tables, button names, URLs and messages: Claude, copied exactly from the UI.

| # | 제목 | Blocks | Must contain |
|---|---|---|---|
| 1 | VPyLab은 무엇인가요 | 2 | F1, F3; no install, no account; works on school computers and tablets with a modern browser (only claim "browser"; no device list was tested) |
| 2 | 시작하기 | 2 + numbered steps | Open https://vpylab.pages.dev; first course 8 lessons; English via More → Language (F10, F11, F20) |
| 3 | 주요 기능 | 1 per feature: 편집기·실행, 3D 화면, 소리, 트레이닝, 튜토리얼, 예제, 문서, 대장간, 내보내기 | F12–F18; say that Share and Gallery are not available in the open edition (F6, F8) |
| 4 | 저장하기 | 3 | Today: no save button in the open edition (F7); HTML download (F18); browser keeps progress and tab drafts (F19); Drive experiment (F40–F45, F49); code stays in the student's own Drive |
| 5 | 교사가 준비할 것 (학교 구글 계정) | 3 + checklist | Admin allows the app (F51); under-18 rule (F52); Testing status, test users, max 100 (F50); option to self-host with an Internal client (F53) |
| 6 | 개인정보 | 2 | No VPyLab server or DB; `drive.file`; token in memory; drafts in browser; revoke (F19, F30–F32, F41–F47) |
| 7 | 문제가 생겼을 때 | 1 per item | Popup blocked; access_denied for unregistered accounts; admin blocked; Drive checkbox off; token expiry after about 1 hour with the draft kept; save takes about 3 seconds (F43, F48–F50) |
| 8 | 자주 묻는 질문 | Q/A pairs | Cost and accounts; does code go to a server; can teachers see student code (no: only the student's Drive); offline use (exported HTML needs internet, F18); what happens on a shared computer (F46); where is the gallery (classroom edition only) |

Out of scope for the guide: classroom-edition features (login, gallery, teams, GitHub). The guide links to `USER_GUIDE_KO.md` for those.

## 6. Korean prose: Solar Pro 4 provenance

Briefs, raw Solar output and retries are kept in [solar/](solar/) (model `solar-pro4`, `~/.claude/skills/solar-write`).

| Document | Solar blocks | Written by Claude |
|---|---|---|
| `README.ko.md` | blocks 1–14 of `solar/readme-ko-brief.md` (lead, sample explanation, status bullets, editions intro, students and teachers, privacy, Drive experiment, Workspace, acknowledgments) | title line, headings, tables, commands, link lines, the three-line "수업용 판" privacy note, contributing list; license section moved from the old README with endings changed to 합쇼체 |
| `docs/GUIDE.ko.md` | blocks 1–34 of `solar/guide-ko-brief.md`; blocks 14, 22, 26 from `guide-ko-solar-retry.md`; blocks 4, 34 from `guide-ko-solar-retry2.md` | title, date line, headings, numbered steps, tables, quoted UI messages (copied from code), related-docs list |

Corrections made to Solar output (facts, meaning, links only):

1. README block 8: "외부 요청은 웹 글꼴(…)에 대해서만 이루어집니다" said fonts were the only external requests, which contradicts the jsDelivr/unpkg fallback in the next sentence. Changed to "웹 글꼴(…)을 받을 때 이루어집니다".
2. README block 13: removed the space between the `[GitHub 이슈](…)` link and the particle 로.
3. Guide block 4: two Solar attempts kept "학생이 … 제출받습니다" (wrong subject); the third, raw-mode attempt fixed the sentence but dropped the bold. Restored `**HTML 내려받기**`.
4. Guide block 34: the third attempt fixed the misplaced link but dropped the Markdown link. Restored `[USER_GUIDE_KO.md](USER_GUIDE_KO.md)`.
5. Guide block 32: "지울지 묻으며" is the wrong verb form (묻다 "bury"); changed to "물으며".
6. Guide block 21: wrapped the URL as `<https://myaccount.google.com/connections>` because the Korean particle right after it would otherwise become part of the GitHub autolink.
