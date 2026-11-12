# VPyLab architecture

This document describes the code as it is in the repository. It is written for a contributor who does not read Korean. Most code comments are in Korean, so file names and function names are given here so you can find your way without them.

## Overview

VPyLab is a single-page React app. A student writes VPython-style Python in a Monaco editor. The code runs in the browser, in Pyodide (CPython compiled to WebAssembly) inside a Web Worker. The Python side does not draw anything. It sends JSON commands to the main thread, where a bridge applies them to a Three.js scene and to a Web Audio sound system. The same codebase is built as two editions: an open edition with no server database for student work, and a classroom edition with Supabase, an Express server and GitHub integration.

## The run path

```
Monaco editor (client/src/components/editor/CodeEditor.jsx)
   | student code (a string, sent unchanged)
   v
usePyodide hook (client/src/hooks/usePyodide.js)
   |   10 s activity timer, 750 ms stop timer, error details
   v
pyodide-singleton.js      one shared Worker per page, run IDs, status
   | postMessage {type:'run', code, runId}
   v
pyodide-worker.js  (Web Worker, classic script)
   |   _vpylab_run(source)                     in vpython-api.py
   |     -> student-code-transform.py          AST transform, compile
   |     -> eval in a fresh student namespace
   |   sphere(), rate(), play_note() ...       append to a command buffer
   | postMessage JSON {type:'batch', runId, commands:[...]}
   v
pyodide-singleton.js -> usePyodide onBatch -> page (for example pages/Sandbox.jsx)
   v
vpython-bridge.js  processBatch(commands, scene)
   |-- Three.js meshes, lights, labels, curves, widgets, 2D graphs, charts
   |-- object-registry.js   (plain record of objects and notes, used by grading)
   `-- sound-system.js      processSoundCommand(cmd)  (Web Audio)
```

All files below are in `client/src/engine/` unless a path is given.

### `student-code-transform.py`

A browser has no blocking wait, so `rate()`, `sleep()`, `input()`, `scene.pause()`, `scene.waitfor()` and the waiting sound calls are coroutines in `vpython-api.py`. Students write ordinary functions, as in GlowScript. Before running, this module parses the code with `ast` and:

1. turns every `def` that calls a waiting function (directly or through other functions) into `async def`;
2. puts `await` on calls to those functions, repeating until nothing changes;
3. awaits module-level calls with top-level await (`PyCF_ALLOW_TOP_LEVEL_AWAIT`). The code is not wrapped in a function, so module globals and `global` work as usual.

Calls it cannot classify (a parameter, a list item, a method on an unknown receiver) become `await __vpylab_rt__.maybe_await(f())`, which awaits only if the result is awaitable. Line numbers are kept, so tracebacks point at the student's own lines. The public functions are `transform_student_code`, `compile_student_code` and `unparse_student_code`. The file does not import `js`, so it also runs under plain CPython in tests. `server/utils/student-code-transform.py` is a byte-identical copy used for exported HTML; `server/utils/export-html.test.js` fails if the two differ.

### `pyodide-singleton.js`

Owns the one Worker that all run screens share. It imports `vpython-api.py`, `student-code-transform.py` and `physical-kit.py` as raw text (`?raw`) and sends them to the Worker in the `init` message. It keeps a status (`idle`, `loading`, `ready`, `running`, `stopping`, `error`), gives each run an increasing `runId`, and drops Worker messages whose `runId` is not the active one. Init fails after 45 seconds. When the last screen unsubscribes it stops the run, asks the Worker to `park` (reset Python state but keep the engine), and keeps the idle Worker for 10 minutes. `resetForSessionChange()` terminates the Worker when the account changes. `idle-prewarm.js` starts the engine early from non-editor pages.

### `pyodide-worker.js`

- Loads `pyodide.js` with `importScripts`, first from the same origin (`/pyodide/v0.27.0/`, copied from the npm package at build time by `client/scripts/pyodide-assets.mjs`), then jsDelivr, then unpkg.
- Loads the transform as a module object in the global `_vpylab_transform` (not in `sys.modules`), runs `vpython-api.py`, then builds a `vpython` module from an explicit name list (`_vpython_names`) plus the public names of `math`. `physical-kit.py` is registered as the module `피지컬키트`.
- Runs code with `_vpylab_run(source, '<student>')`, then flushes remaining commands and output. A new `run` that arrives while code is running sets the stop flag and is queued.
- Detects `import numpy` and similar with a regular expression and installs only from a fixed list (numpy, matplotlib, pandas, scipy, scikit-learn, sympy) through `micropip`.
- Replaces `sys.stdout` and `sys.stderr` with a bounded writer: 16,384 characters per stream per flush, flushed every 75 ms. Extra output is dropped with a notice.
- Parses tracebacks into `{type, message, line, column, frames}` using only frames from the file name `<student>`.

Security measures, applied after Pyodide has loaded (it needs `fetch` and `importScripts` to load):

- `pyodide.http` is removed from the `pyodide` module.
- `self.fetch` is replaced by `guardedFetch` and made non-writable and non-configurable. It rejects every request unless a package install is in progress and the URL is a package source (same-origin `/pyodide/`, the jsDelivr or unpkg Pyodide path, `pypi.org`, `files.pythonhosted.org`). Installs happen before student code starts, so student code cannot fetch.
- `XMLHttpRequest`, `WebSocket`, `indexedDB`, `importScripts`, `Worker`, `SharedWorker`, `EventSource` and `caches` are redefined as `undefined`, non-writable and non-configurable.
- `navigator.sendBeacon` is deleted.

The Worker still exposes the `js` module to Python. The measures above limit what that module can reach; they are not a full sandbox, and this document does not claim more than the list.

### Stop and heartbeat

- Soft stop: the main thread posts `{type:'stop'}`. The Worker sets `shouldStop`. Python reads it through `js._checkStopSignal()` inside every wait (`rate`, `sleep` and the other waiting calls; long sleeps are split into 0.5 s chunks). It then raises `_StopExecution`, which derives from `BaseException` so a student's `except Exception:` cannot swallow it. The Worker reports `done`.
- Hard stop: `usePyodide` waits 750 ms (`STOP_TIMEOUT`) for that `done`. If it does not arrive (for example a `while True:` loop with no `rate()`), `hardStop()` calls `Worker.terminate()` and a new engine is initialized.
- Heartbeat: at each wait Python calls `_heartbeat()`, which posts the pending command batch, or an empty batch if there is nothing to send. `usePyodide` re-arms a 10 s timer (`ACTIVITY_TIMEOUT`) on every `batch`, `stdout` or `stderr` message. If the timer fires, the run is stopped and the student sees a timeout message that suggests adding `rate()`.
- Stopping also calls `stopAllSounds()`, and the singleton filters `sound` commands out of late batches.

### `vpython-api.py`

About 6,200 lines. Defines the VPython-compatible classes and functions (`vector`, `sphere`, `box`, `scene`, `rate`, graphs, widgets, sound), their Korean aliases (`색상`, `음표`, `소리` and others), and the runtime helpers `_vpylab_run`, `_vpylab_dispatch_events` and `_vpylab_reset_runtime`. Objects do not touch the DOM. `_add_command(cmd)` appends a dict to `_command_buffer`, and `_send_commands()` posts the buffer as one JSON string. Batches are sent at each wait and at the end of the run.

### `vpython-bridge.js` and `sound-system.js`

`processBatch(commands, scene)` switches on `cmd.action`: `create`, `update`, `compound`, `scene`, `curve_*`, `trail_*`, `widget_*`, `graph_*`, `chart`, `input_request`, `scene_bind`, `sound` and more. `create` switches again on `cmd.type` (`sphere`, `box`, `cylinder`, ...). Each object is also written to `object-registry.js`. User input goes back the other way through `postEvent`, `postWidgetValue`, `postMouseState`, `postPressedKeys` and `postCameraState` in the singleton.

`sound-system.js` uses only the Web Audio API, with no audio files. `processSoundCommand(cmd)` handles notes, chords, synthesized effects and background music. It caps voices (`MAX_AUDIO_VOICES` = 24) and has one master gain for volume and mute.

## Two editions from one codebase

`client/src/lib/api-base.js` is the single switch.

| Constant | Value |
|---|---|
| `EDITION` | `'open'` if `VITE_EDITION=open`, otherwise `'classroom'` |
| `OPEN_EDITION` | `EDITION === 'open'` |
| `LAN_MODE` | `VITE_LAN_MODE === '1'` |
| `SERVER_FEATURES` | `!LAN_MODE && !OPEN_EDITION` |
| `API_BASE` | `''` in the open edition; otherwise `VITE_API_URL`, or `http://localhost:4034` in development |
| `SHARE_BACKEND` | `'pages'` (open), `'server'` (classroom), `'none'` (LAN) |
| `GITHUB_GALLERY` | open edition with `VITE_GALLERY_INDEX_URL` set to an allowed list address |

| | Open edition | Classroom edition |
|---|---|---|
| Address | https://vpylab.pages.dev | https://vpylab.vercel.app |
| Build | `cd client && npm run build:open` | `cd client && npm run build:deploy` (the `buildCommand` in `vercel.json`) |
| Hosting | Cloudflare Pages, deployed by `.github/workflows/deploy-pages.yml` after CI passes on `main` | Vercel (client, `api/` functions) and Railway (`server/`) |
| Login | none | Supabase Auth |
| Saving | the student's Google Drive | Supabase, with GitHub sync |
| Share links | Pages Functions + D1 | Express + Supabase |
| Gallery menu | hidden, or the GitHub gallery when `VITE_GALLERY_INDEX_URL` is set | shown (Supabase gallery) |
| Sign-in button | hidden | shown |

What the code does for the open edition:

- `build:open` clears `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_API_URL` before building, so the committed `client/.env.production` values do not reach the bundle.
- `client/src/lib/supabase.js` points the Supabase client at `https://no-supabase.invalid` when `OPEN_EDITION` is true.
- `Header.jsx` hides the sign-in button when `SERVER_FEATURES` is false, and shows the gallery link when `SERVER_FEATURES` or `GITHUB_GALLERY` is true. The routes in `client/src/App.jsx` are the same in both editions; they are not removed, only unlinked. The one exception is `/gallery`, which renders `pages/GitHubGallery.jsx` instead of `pages/Gallery.jsx` when `GITHUB_GALLERY` is true.

New code that needs the server or Supabase must be guarded by `SERVER_FEATURES`. Deployment details are in `docs/DEPLOY_TWO_EDITIONS.md` (Korean).

Classroom LAN mode (`npm run classroom:lan`, port 4077) builds with `VITE_LAN_MODE=1`. `server/lan/index.js` serves the built app and the Pyodide files to a classroom Wi-Fi network and answers `/api/*` with 503. Login, gallery, share storage and GitHub are off; share links carry the code in the URL (`#code=`). See `docs/CLASSROOM_LAN_MODE.md` (Korean).

There is also a separate "classroom v2" app: `client/classroom.html`, `client/src/classroom/`, `server/classroom/` (Express `/api/v2`, SQLite). `docs/CLASSROOM_V2_ARCHITECTURE.md` (Korean, dated 2026-10-28) describes it as under local verification. Its current status was not checked for this document.

## Storage paths

Both editions follow three steps (decided 2026-11-12, `docs/GOOGLE_FIRST_PLAN.md` section 0): no sign-in to start, Google Drive to save, GitHub only for team projects. The switches are in `client/src/lib/api-base.js` (`DRIVE_SAVE`, `GITHUB_ADDON`, `TEAM_PROJECTS`) and at the top of `client/src/pages/Sandbox.jsx` (`DRIVE_EDITOR`, `TEAM_PROJECTS`, `ACCOUNT_SAVE`).

Without an account (both editions):

- `client/src/utils/code-file.js`: **Open file** reads a `.py` file, or an HTML file exported by VPyLab. The exported HTML carries the student code as Base64 in one line of `server/utils/standalone-template.js`; `code-file.test.js` fails if that line changes. The file is read as text and never rendered.
- `client/src/utils/sandbox-draft.js`: the free-coding draft in `localStorage`, kept 14 days. Practice drafts from lessons stay per tab (`client/src/utils/practice-drafts.js`) so that the next student on a shared computer does not get them.
- Share links (below).

Google Drive (both editions when `VITE_GOOGLE_CLIENT_ID` is set):

- In the classroom edition Save goes to Drive unless a team project is open; the account auto-save, Save as and personal history are switched off (`ACCOUNT_SAVE`).

Classroom edition:

- Client state is in Zustand stores under `client/src/stores/`: `authStore.js` (Supabase session, GitHub token), `codeStore.js` (saved code), `revisionStore.js` (history), `projectStore.js` (team projects), `galleryStore.js`, `codeShareStore.js`, `githubSyncStore.js`. `appStore.js` (theme, locale, mission progress in `localStorage`) is used by both editions.
- Stores call Supabase directly from the browser with the anon key; access rules are row-level security policies in `supabase/migrations/`.
- Express routes in `server/routes/`: `share.js` (`/api/share`), `publish.js` (`/api/publish`, GitHub Pages), `sync.js` (`/api/sync`, commit `main.py` to GitHub), `projects.js` (`/api/projects`, one GitHub repository per project). `server/index.js` adds `helmet`, CORS and rate limits (`server/middleware/`). The GitHub token is sent by the client with each request and is not stored on the server, according to the route comments.
- In production the client calls `/srv/...` on its own origin; `vercel.json` rewrites that to `api/srv.mjs`, which forwards to Railway.

Open edition:

- `client/src/drive-lab/google-auth.js`: Google Identity Services token flow. Scopes are `openid email profile` and `drive.file`. There is no refresh token. The editor keeps the access token in the tab's `sessionStorage` (`tokenStore`), so a reload does not disconnect; the lab page keeps it in memory.
- `client/src/drive-lab/drive-storage.js`: Drive v3 adapter (`list`, `create`, `open`, `save`, `revisions`, `revisionContent`, `trash`), a `VPyLab` folder, 100 KB code limit, retries, conflict detection.
- `client/src/drive/driveSession.js`: the Zustand store that the editor uses on top of those two modules, plus local drafts from `client/src/drive-lab/lab-state.js`. `resume()` restores the account and the open file after a reload. `renewInGesture()` asks Google for a new token inside the same click when the old one has expired, so Save continues without a separate step. The client ID comes from `VITE_GOOGLE_CLIENT_ID`.
- Share links: `functions/api/share/index.js` (POST) and `functions/api/share/[id].js` (GET, PUT, DELETE) are thin Cloudflare Pages Functions over `cloudflare/share-core.js`. Data is in the D1 database bound as `DB` in `wrangler.toml`; the schema is `cloudflare/migrations/0001_shares.sql`. Name rules are shared with the classroom server through `server/shared/share-names.js`. The client side is `client/src/utils/share.js`.
- GitHub gallery (add-on, only when `VITE_GALLERY_INDEX_URL` is set; no server, no database). Three parts:
  - Publishing: in the team project window, "Add to gallery" adds the topic `vpylab-gallery` to the student's repository and commits the current 3D view as `thumbnail.jpg` (`setGalleryListing` and `putThumbnail` in `client/src/github/github-api.js`, the store action `setGalleryListing` in `githubSession.js`). The Create screen passes the picture through the optional `getThumbnail` prop of `GitHubAddon`; publishing works without it.
  - The list: `.github/workflows/gallery-index.yml` runs every 30 minutes. `scripts/gallery/build-index.mjs` searches GitHub for public repositories with the topic, keeps only those named in the approval file `approvals.txt`, and writes `gallery.json` (approved), `pending.json` and `PENDING.md` (waiting). The workflow commits them to the branch `gallery-data`. Teachers approve by editing `approvals.txt` on that branch in the GitHub web interface (`docs/GALLERY_GITHUB.md`, Korean). Nothing enters `gallery.json` before approval; `scripts/gallery/gallery-index.test.mjs` fixes that rule.
  - Reading: `client/src/gallery/gallery-index.js` fetches that one file from `raw.githubusercontent.com`. The app never calls GitHub search. `client/src/pages/GitHubGallery.jsx` and `client/src/components/gallery/GitHubGalleryView.jsx` show cards (preview image, title, GitHub username, date, star count). A card opens the published page in a new tab or the code in the Create screen (`/sandbox?repo=owner/repo`). A student whose tab is connected to GitHub can star from the app (`public_repo` covers starring); otherwise the app links to the repository.
  - Both sides validate entries with `server/shared/gallery-rules.js`: titles and usernames are plain text, and a URL is accepted only if it equals the address rebuilt from the repository name on `github.com`, `<owner>.github.io` or `raw.githubusercontent.com`.
- Forge shared modules on GitHub (add-on, only when `VITE_FORGE_INDEX_URL` is set; no server, no database). `FORGE_REGISTRY` in `api-base.js` is `server` (classroom edition, Supabase, `client/src/forge/registry.js`), `github`, or `none`.
  - Publishing: `ForgeGitHubPublish.jsx` (lazy, inside `AddonBoundary`) calls `putForgeModule`, which creates the public repository `<username>/vpylab-forge` if needed, adds the topic `vpylab-forge` and writes `modules/<module id>.py`. The first line of the file holds the module recipe.
  - The list: the gallery workflow also runs `scripts/gallery/forge-index.mjs`, which reads the module files of approved repositories and writes `forge.json` and `forge-pending.json` to `gallery-data`. A file is read again only when its blob sha changes.
  - Reading: `client/src/forge/forge-index.js` fetches `forge.json`; `github-registry.js` passes every entry through `parseModuleFile` and rebuilds the code from the recipe. Importing a module is local (no sign-in, no request) and records the source as `gh:<username>/<module id>`.
  - Shared rules: `server/shared/forge-rules.js`.
- GitHub team projects (add-on, only when `VITE_GITHUB_CLIENT_ID` is set): `client/src/github/github-oauth.js` opens the GitHub approval in a pop-up (state and PKCE); `client/src/pages/GitHubCallback.jsx` passes the result back over a `BroadcastChannel`; the Pages Function `functions/api/github/token.js` (rules in `cloudflare/github-oauth-core.js`) exchanges the code for a token with the client secret and stores nothing. `client/src/github/github-api.js` then calls `api.github.com` from the browser: one public repository per project (topic `vpylab-project`) with `main.py`, `history.md`, `index.html` for GitHub Pages and a README. The logic is ported from `server/routes/projects.js`. `client/src/github/githubSession.js` is the store and `client/src/components/github/GitHubProjectDialog.jsx` the window. The token is kept in the tab's `sessionStorage`.

## Content as data

Lessons and reference material are JavaScript modules in `client/src/data/`, not database rows.

| File | Content |
|---|---|
| `missions.js`, `physical-missions.js` | Graded missions: `starterCode`, `solutionCode`, `assertions`, `hints`. Schema: `docs/MISSION_SCHEMA.md` (Korean) |
| `courses.js`, `light-sound-course.js`, `github-project-course.js` | Courses made of lessons |
| `tutorials.js`, `creative-labs.js`, `light-sound-labs.js`, `forge-tutorial.js`, `welcome-friends.js` | Short tutorials and labs |
| `docs.js`, `shape-guides.js`, `doc-origins.js` | In-app API reference |
| `examples.js`, `glowscript-projects.js` | Example programs |
| `code-vocabulary.js` | Word help for the editor |

Grading is `gradeMission(mission, code, options)` in `client/src/engine/grading-engine.js`. It reads `mission.gradeType` and combines `gradeA` (assertions on the object registry snapshot), `gradeB` (trajectory similarity), `gradeNotes` (played notes), `gradeCodeChecks` (regular expressions on the code) and `gradeRun`. The assertion format is documented in the header comment of that file. There is no AI grading.

Tests run real mission code under CPython, not Pyodide:

- `client/src/test/python-runner.js` spawns Python with `-I` and `client/src/test/run-vpython.py`. It tries `python3.12` first, then `python3`; set `VPYLAB_TEST_PYTHON` to override. Pyodide 0.27 is Python 3.12, and a comment notes that 3.11 hides at least one difference.
- `run-vpython.py` loads the same `vpython-api.py`, `student-code-transform.py` and `physical-kit.py` with a fake `js` module. It collects the posted commands, replaces waits with a virtual clock, and stops a job after 20,000 `rate()` calls.
- `client/src/engine/command-replay.js` applies the collected commands to the object registry without Three.js. `client/src/data/missions.grading.test.js` then checks that each mission's starter code fails and its solution passes.

## Directory map

| Path | Contents |
|---|---|
| `client/src/engine/` | Python runtime, worker, bridge, sound, grading, error explainer |
| `client/src/pages/` | Route components (`Sandbox.jsx` is the Create screen) |
| `client/src/components/` | UI by area: `editor/`, `viewport/`, `console/`, `docs/`, `gallery/`, `drive/`, `home/` ... |
| `client/src/data/` | Missions, courses, tutorials, docs, examples |
| `client/src/i18n/` | Locale selection and translations (see `docs/I18N_GUIDE.md`) |
| `client/src/stores/` | Zustand stores (mostly classroom edition) |
| `client/src/drive-lab/`, `client/src/drive/` | Google sign-in and Drive saving |
| `client/src/github/`, `client/src/gallery/` | GitHub team projects and the GitHub gallery (open edition add-ons) |
| `client/src/classroom/`, `training/`, `month-projects/`, `forge/` | Separate entry apps and the Forge data |
| `client/src/test/` | CPython test runner |
| `client/scripts/` | Build helpers: Pyodide assets, service worker plugin, Cloudflare config |
| `server/` | Express server: `routes/`, `middleware/`, `lan/`, `classroom/`, `utils/` |
| `server/shared/` | Modules imported by both the client and the server (geometry, share-name rules), and the gallery list rules shared by the client and `scripts/gallery/` |
| `api/` | Vercel functions: link preview cards (`og.mjs`, `og-image.mjs`) and the Railway proxy (`srv.mjs`) |
| `functions/`, `cloudflare/` | Cloudflare Pages Functions and their core logic and D1 migrations |
| `supabase/migrations/` | Classroom edition database schema |
| `scripts/` | Classroom tools, GlowScript compatibility harness (`scripts/compat/`), gallery list builder (`scripts/gallery/`) |
| `docs/` | Design notes and reports, mostly Korean |

## Where do I change X

| Task | Files |
|---|---|
| Add a mission | Add an object to `client/src/data/missions.js` with `ko` and `en` text. Run `npm --prefix client run test:run`; `missions.test.js` and `missions.grading.test.js` validate it. |
| Add an API function | 1. Define it in `client/src/engine/vpython-api.py` and emit a command with `_add_command`. 2. Add its name to `_vpython_names` in `client/src/engine/pyodide-worker.js`, or `from vpython import *` will not export it. 3. Handle the command in `processBatch` (or the `create` switch) in `client/src/engine/vpython-bridge.js`. 4. If it waits, make it `async def` and add the name to `BLOCKING_NAMES` in both copies of `student-code-transform.py`. 5. If grading should see it, update `registry-props.js` and `command-replay.js`. |
| Add a doc entry | Add an object to `apiDocs` in `client/src/data/docs.js` (`title`, `description` as `{ ko, en }`). `docs.test.js` checks the data. |
| Add an installable package | `INSTALLABLE_PACKAGES` in `pyodide-worker.js`. |
| Change the CSP or other headers | Edit `vercel.json` only. `client/scripts/cloudflare-pages.mjs` reads `vercel.json` and writes `_headers` and `_redirects` into the build output. It converts Vercel paths to Cloudflare paths, and for `--edition open` removes Supabase and Railway hosts from the CSP (`openEditionCsp`) and adds Google sign-in and Drive hosts to the `/*` rule (`withGoogleSignIn`). It also writes a `404.html` into folders excluded from the SPA rewrite. The LAN server has its own CSP in `server/lan/index.js`. |
| Turn a feature off in the open edition | Guard it with `SERVER_FEATURES` from `client/src/lib/api-base.js`. |
| Change share-link rules | `cloudflare/share-core.js` (open), `server/routes/share.js` (classroom), `server/shared/share-names.js` (both). |

## Tests and checks

Commands that exist in the `package.json` files:

| Command | What it runs |
|---|---|
| `npm --prefix client run test:run` | Vitest (jsdom). Some tests need Python; see above |
| `npm --prefix client run lint` | ESLint |
| `npm --prefix client run build` | Vite build of the main app |
| `npm --prefix client run build:classroom` | Build of the classroom v2 entry |
| `npm --prefix server test` | `node --test` over `server/classroom`, `middleware`, `lan`, `routes`, `utils` |
| `npm run test:classroom` | Classroom server tests, client tests and the curriculum check |
| `npm run compat:check` | GlowScript compatibility corpus (uses `python3.12` unless `PYTHON` is set) |
| `node --test scripts/gallery/*.test.mjs` | Gallery list builder: approval rules, URL rules, fake GitHub search |

`.github/workflows/ci.yml` runs on pushes and pull requests to `main`, with Node 24 and Python 3.12:

1. `classroom-v2`: `node --test server/classroom/*.test.js server/middleware/*.test.js server/lan/*.test.js server/routes/*.test.js server/utils/*.test.js scripts/classroom/backup.test.mjs cloudflare/*.test.js`, then `npm --prefix client run build:classroom`, then `node scripts/classroom/check-curriculum.mjs`.
2. `validate-missions`: `npm run test:run` in `client/`.
3. `validate-i18n`: an inline script that compares the keys of every `client/src/i18n/*.json` file with `en.json`.
4. `validate-mission-i18n`: an inline script that requires `ko` and `en` in each mission's `title`, `description` and `hints`.
5. `lint`: `npm run lint` in `client/`.
6. `build`: `npm run build` in `client/`, after jobs 2 to 5 pass.
7. `security`: `grep` for `.innerHTML =`, `.outerHTML =` and `.insertAdjacentHTML(` in `client/src` (test files excluded), and for secret-like strings in the repository.

CI also has two jobs for tools outside the app: `research-tools` (`node --test scripts/research/*.test.mjs`, allowed to fail) and `gallery-index` (`node --test scripts/gallery/*.test.mjs`, must pass).

Other workflows: `gallery-index.yml` (builds the gallery list on a schedule and commits it to the branch `gallery-data`; runs only when the repository variable `GALLERY_INDEX` is `on`), `i18n-check.yml` (translation coverage comment on pull requests), `mission-review.yml` (runs `src/data/missions.test.js` on pull requests that match its path filter), `deploy-pages.yml` (open edition deploy), `stale.yml`, `welcome.yml`.

## Known rough edges

- Most code comments, test names, commit-facing docs and user-facing source strings are Korean. Korean identifiers also appear in Python (`색상`, `음표`, the module `피지컬키트`).
- Several files are dense and hard to read: some components are written with minimal whitespace on very long lines (for example `client/src/components/home/WelcomeFriends.jsx`, `client/src/components/editor/python-completions.js`).
- Large single files: `vpython-api.py` (about 6,200 lines), `server/routes/projects.js` (over 2,000), `vpython-bridge.js` (about 1,500), `pages/Sandbox.jsx` (about 1,500), `data/examples.js` and `data/missions.js` (over 3,000 each).
- The client imports from `server/shared/` (`vpython-bridge.js`, `utils/share.js`), so the client cannot be built without the `server/` folder.
- `student-code-transform.py` exists twice and must be kept identical (a test enforces it).
- Bundle size: Monaco and Three.js are split into their own chunks in `client/vite.config.js`. `docs/DEPLOY_TWO_EDITIONS.md` reports a 24 MB deploy on 2026-11-07, which includes the Pyodide files. This was not re-measured here.
- The i18n system has two mechanisms and many two-way `ko`/`en` branches in components. See `docs/I18N_GUIDE.md`.
- The separate entry apps (`classroom`, `training`, `month-projects`, `drive-lab`) do not call the translation functions in their main components and appear to be Korean only.
- Comments and docs can lag behind the code. When they disagree, trust the code and fix the comment or document in the same pull request.
- The Worker restrictions are a list of removed APIs, not a proven sandbox. No security review was done for this document.
