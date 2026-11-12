# VPyLab architecture

This document describes the code as it is in the repository. It is written for a contributor who does not read Korean. Most code comments are in Korean, so file names and function names are given here so you can find your way without them.

## Overview

VPyLab is a single-page React app. A student writes VPython-style Python in a Monaco editor. The code runs in the browser, in Pyodide (CPython compiled to WebAssembly) inside a Web Worker. The Python side does not draw anything. It sends JSON commands to the main thread, where a bridge applies them to a Three.js scene and to a Web Audio sound system. The app is deployed as one static site on Cloudflare Pages. It has no server and no database of its own, and no account sign-in. Saving to the student's own Google Drive is built in; GitHub team projects, a student gallery and shared Forge modules are optional add-ons.

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

Calls it cannot classify (a parameter, a list item, a method on an unknown receiver) become `await __vpylab_rt__.maybe_await(f())`, which awaits only if the result is awaitable. Line numbers are kept, so tracebacks point at the student's own lines. The public functions are `transform_student_code`, `compile_student_code` and `unparse_student_code`. The file does not import `js`, so it also runs under plain CPython in tests. Exported HTML embeds the same file. `shared/export-html.js` reads it when Node tools build a standalone page, and `shared/export-html.test.js` checks that the Node and browser exports use the same template and transform.

### `pyodide-singleton.js`

Owns the one Worker that all run screens share. It imports `vpython-api.py`, `student-code-transform.py` and `physical-kit.py` as raw text (`?raw`) and sends them to the Worker in the `init` message. It keeps a status (`idle`, `loading`, `ready`, `running`, `stopping`, `error`), gives each run an increasing `runId`, and drops Worker messages whose `runId` is not the active one. Init fails after 45 seconds. When the last screen unsubscribes it stops the run, asks the Worker to `park` (reset Python state but keep the engine), and keeps the idle Worker for 10 minutes. `idle-prewarm.js` starts the engine early from non-editor pages.

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

## One site, no server

VPyLab is built once and deployed as one static site on Cloudflare Pages (https://vpylab.pages.dev). There is no application server, no database of its own and no account sign-in. The operator stores no student data. Until 2026-11-12 the same codebase was also built as a second "classroom edition" with an Express server and Supabase; that setup was deleted, and `docs/SCOPE.md` records the decision. `vpylab.vercel.app` only redirects to the Pages site (root `vercel.json`).

The only server-side code is three Cloudflare Pages Functions in `functions/`, thin wrappers over modules in `cloudflare/`:

| Request | File | Purpose | State |
|---|---|---|---|
| `POST /api/share` | `functions/api/share/index.js` | Create a short share link | D1 database `vpylab-shares`, bound as `DB` in `wrangler.toml` |
| `GET`, `PUT`, `DELETE /api/share/:id` | `functions/api/share/[id].js` | Read a share, update it from the browser that made it, delete an unused random link | same |
| `POST /api/github/token` | `functions/api/github/token.js` | Exchange a GitHub sign-in code for a token | none; the token is not stored or logged |

`client/src/lib/api-base.js` holds the feature flags. Each one is derived from a public build-time value (`client/.env.example`). With none of them set, running code, lessons, share links and file download/open still work.

| Constant | True when | Turns on |
|---|---|---|
| `DRIVE_SAVE` | `VITE_GOOGLE_CLIENT_ID` is set | Saving to the student's Google Drive |
| `GITHUB_ADDON`, `TEAM_PROJECTS` | `VITE_GITHUB_CLIENT_ID` is set | GitHub team projects; also required for publishing to the gallery and to Community modules |
| `GITHUB_GALLERY` (`GALLERY_INDEX_URL`) | `VITE_GALLERY_INDEX_URL` is an allowed list address | The student gallery at `/gallery` |
| `GITHUB_FORGE` (`FORGE_INDEX_URL`) | `VITE_FORGE_INDEX_URL` is an allowed list address | Community modules in the Forge |
| `FORGE_REGISTRY` | `'github'` when `GITHUB_FORGE`, otherwise `'none'` | Where the Forge looks for shared modules |

An allowed list address starts with `https://raw.githubusercontent.com/` and ends in `.json`, or is a same-origin path (`isAllowedIndexUrl` in `shared/gallery-rules.js`). Anything else leaves the feature off.

Build, deployment and how to turn each feature on are in `docs/DEPLOY.md` (Korean).

### Routes

Routes are declared in `client/src/App.jsx`.

| Route | Page |
|---|---|
| `/` | Home |
| `/tutorials`, `/tutorials/:tutorialId` | Tutorials |
| `/courses`, `/courses/:courseId`, `/courses/:courseId/:lessonId` | Courses |
| `/sandbox` | Create (`pages/Sandbox.jsx`) |
| `/examples`, `/missions`, `/mission/:missionId` | Examples, missions |
| `/docs`, `/forge`, `/guide`, `/about`, `/privacy` | Reference, Forge, in-app guide, about, privacy |
| `/gallery` | The GitHub gallery when `GITHUB_GALLERY` is true, otherwise the GlowScript originals |
| `/gallery/glowscript`, `/gallery/glowscript/:projectId` | GlowScript originals and one original |
| `/s/:id` | A short share link, opened in Create |
| `/embed/:id` | View-only page for iframes; share links only |
| `/github/callback` | Receives the GitHub sign-in result |

### Headers and static files

Response headers and the Content Security Policy are in `client/public/_headers`, which Vite copies to `dist/_headers`. `client/scripts/pages-config.test.mjs` checks the file. `/embed/*` is the only path that other sites may frame. `client/scripts/pages-static.mjs` is a Vite plugin that writes a `404.html` into `assets/`, `pyodide/` and `projects/` at the end of a build, so a missing file there returns 404 and not the single-page fallback. There must be no `404.html` at the top level, or Cloudflare Pages stops serving `index.html` for app routes.

## Three ways to work

A student starts with no sign-in and connects an account only when needed (decided 2026-11-12).

### 1. No sign-in

- `client/src/utils/code-file.js`: **Open file** reads a `.py` file, or an HTML file exported by VPyLab. The exported HTML carries the student code as Base64 in one line of `shared/standalone-template.js`. The file is read as text and never rendered.
- `client/src/utils/export-html.js`: **Download HTML** builds a standalone page from `shared/standalone-template.js`. The page loads Pyodide and Three.js from a CDN when opened.
- `client/src/utils/sandbox-draft.js`: the free-coding draft in `localStorage`, kept 14 days. Practice drafts from lessons stay per tab (`client/src/utils/practice-drafts.js`) so that the next student on a shared computer does not get them.
- `client/src/stores/appStore.js` (Zustand): theme, locale and mission progress in `localStorage`. It is the only store under `client/src/stores/`.
- Share links: `client/src/utils/share.js` calls `/api/share`. The rules are in `cloudflare/share-core.js`: a random 6-character id or a chosen name, code up to 50,000 characters, an edit key whose hash is stored and whose value stays in the browser that made the link, and a per-IP rate limit keyed by a salted hash. The schema is `cloudflare/migrations/0001_shares.sql`. Name rules are shared with the client through `shared/share-names.js`. If the share API does not answer, the client falls back to a link that carries the code in the URL (`#code=`). Links have no expiry.

### 2. Google Drive (core, when `VITE_GOOGLE_CLIENT_ID` is set)

All files are in `client/src/drive/`.

- `google-auth.js`: Google Identity Services token flow. Scopes are `openid email profile` and `drive.file`. There is no refresh token. The access token is kept in the tab's `sessionStorage`, so a reload does not disconnect.
- `drive-storage.js`: Drive v3 adapter (`list`, `create`, `open`, `save`, `revisions`, `revisionContent`, `trash`), a `VPyLab` folder, a 100 KB code limit, retries and conflict detection. It also uploads recorded videos in chunks to a `영상` folder.
- `driveSession.js`: the Zustand store that the editor uses on top of those two modules, plus local drafts from `lab-state.js`. `resume()` restores the account and the open file after a reload. `renewInGesture()` asks Google for a new token inside the same click when the old one has expired, so Save continues without a separate step.
- UI: `client/src/components/drive/DriveDialog.jsx` and `VideoSaveDialog.jsx`.

Results of the 2026-11-08 stability run of these modules are in `docs/DRIVE_LAB_RESULTS_2026-11-08.md` (Korean). The separate test page that run used has been removed.

### 3. GitHub (optional add-ons)

**Team projects** (only when `VITE_GITHUB_CLIENT_ID` is set). `client/src/github/github-oauth.js` opens the GitHub approval in a pop-up (state and PKCE). `client/src/pages/GitHubCallback.jsx` passes the result back over a `BroadcastChannel`. The Pages Function `functions/api/github/token.js` (rules in `cloudflare/github-oauth-core.js`) exchanges the code for a token with the client secret. `client/src/github/github-api.js` then calls `api.github.com` from the browser: one public repository per project (topic `vpylab-project`) with `main.py`, `history.md`, `index.html` for GitHub Pages and a README. `client/src/github/githubSession.js` is the store, `client/src/components/github/GitHubAddon.jsx` the entry point in Create and `GitHubProjectDialog.jsx` the window. The token is kept in the tab's `sessionStorage` (`tab-session.js`). The requested permissions are `public_repo` and `repo:invite`.

**Student gallery** (only when `VITE_GALLERY_INDEX_URL` is set). Three parts:

- Publishing: in the team project window, "Add to gallery" adds the topic `vpylab-gallery` to the student's repository and commits the current 3D view as `thumbnail.jpg` (`setGalleryListing` and `putThumbnail` in `github-api.js`). Publishing works without the picture.
- The list: `.github/workflows/gallery-index.yml` runs every 30 minutes when the repository variable `GALLERY_INDEX` is `on`. `scripts/gallery/build-index.mjs` searches GitHub for public repositories with the topic, keeps only those named in the approval file `approvals.txt`, and writes `gallery.json` (approved), `pending.json` and `PENDING.md` (waiting). The workflow commits them to the branch `gallery-data`. Teachers approve by editing `approvals.txt` on that branch in the GitHub web interface (`docs/GALLERY_GITHUB.md`, Korean). Nothing enters `gallery.json` before approval; `scripts/gallery/gallery-index.test.mjs` fixes that rule.
- Reading: `client/src/gallery/gallery-index.js` fetches that one file from `raw.githubusercontent.com`. The app never calls GitHub search. `client/src/pages/GitHubGallery.jsx` and `client/src/components/gallery/GitHubGalleryView.jsx` show the cards. A card opens the published page in a new tab or the code in Create (`/sandbox?repo=owner/repo`).
- Both sides validate entries with `shared/gallery-rules.js`: titles and usernames are plain text, and a URL is accepted only if it equals the address rebuilt from the repository name on `github.com`, `<owner>.github.io` or `raw.githubusercontent.com`.

**Forge Community modules** (only when `VITE_FORGE_INDEX_URL` is set).

- Publishing: `client/src/components/forge/ForgeGitHubPublish.jsx` calls `putForgeModule`, which creates the public repository `<username>/vpylab-forge` if needed, adds the topic `vpylab-forge` and writes `modules/<module id>.py`. The first line of the file holds the module recipe.
- The list: the gallery workflow also runs `scripts/gallery/forge-index.mjs`, which reads the module files of approved repositories and writes `forge.json` and `forge-pending.json` to `gallery-data`. A file is read again only when its blob sha changes.
- Reading: `client/src/forge/forge-index.js` fetches `forge.json`; `client/src/forge/github-registry.js` passes every entry through `parseModuleFile` and rebuilds the code from the recipe. Importing a module is local (no sign-in, no request) and records the source as `gh:<username>/<module id>`.
- Shared rules: `shared/forge-rules.js`.

Status on 2026-11-12: the gallery list and the Community modules list are not turned on in production yet, and publishing with real GitHub accounts has not been verified end to end. The screens and scripts were checked against a fake GitHub.

## Content as data

Lessons and reference material are JavaScript modules in `client/src/data/`, not database rows.

| File | Content |
|---|---|
| `missions.js`, `physical-missions.js` | Graded missions: `starterCode`, `solutionCode`, `assertions`, `hints`. Schema: `docs/MISSION_SCHEMA.md` (Korean) |
| `courses.js`, `training.js`, `light-sound-course.js`, `github-project-course.js` | Courses and training steps made of lessons |
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
| `client/` | The app. `npm run dev` (Vite, port 4033), `npm run build`, `npm run lint`, `npm run test:run` |
| `client/src/engine/` | Python runtime, worker, bridge, sound, grading, error explainer, video recorder |
| `client/src/pages/` | Route components (`Sandbox.jsx` is the Create screen) |
| `client/src/components/` | UI by area: `editor/`, `viewport/`, `console/`, `docs/`, `drive/`, `github/`, `gallery/`, `forge/`, `home/` ... |
| `client/src/data/` | Missions, courses, tutorials, docs, examples |
| `client/src/i18n/` | Locale selection and translations (see `docs/I18N_GUIDE.md`) |
| `client/src/stores/` | `appStore.js` (theme, locale, mission progress) |
| `client/src/drive/` | Google sign-in and Drive saving |
| `client/src/github/` | GitHub sign-in, team projects, and the calls used by the gallery and the Forge |
| `client/src/gallery/` | Reading the gallery list |
| `client/src/forge/` | Forge recipes, module code generation, Community modules |
| `client/src/test/` | CPython test runner |
| `client/scripts/` | Build helpers: Pyodide assets, service worker plugin, static 404 pages, and the header checks |
| `client/public/_headers` | Response headers and CSP |
| `functions/`, `cloudflare/` | Cloudflare Pages Functions, their logic and tests, and the D1 migrations |
| `shared/` | Modules used by the app, the functions and the scripts: `gallery-rules.js`, `forge-rules.js`, `share-names.js`, `camera-system.js`, `primitive-geometry.js`, `compound-appearance.js`, `standalone-template.js`, `shape-spec.js` and others |
| `scripts/gallery/` | Builder for the gallery and Forge lists |
| `scripts/compat/` | VPython and GlowScript compatibility harness |
| `scripts/research/` | Research tools kept outside the app |
| `docs/` | Design notes and reports, mostly Korean |
| `wrangler.toml` | Cloudflare Pages settings and the D1 binding |
| `vercel.json` | Redirect from `vpylab.vercel.app` to the Pages site |

## Where do I change X

| Task | Files |
|---|---|
| Add a mission | Add an object to `client/src/data/missions.js` with `ko` and `en` text. Run `npm --prefix client run test:run`; `missions.test.js` and `missions.grading.test.js` validate it. |
| Add an API function | 1. Define it in `client/src/engine/vpython-api.py` and emit a command with `_add_command`. 2. Add its name to `_vpython_names` in `client/src/engine/pyodide-worker.js`, or `from vpython import *` will not export it. 3. Handle the command in `processBatch` (or the `create` switch) in `client/src/engine/vpython-bridge.js`. 4. If it waits, make it `async def` and add the name to `BLOCKING_NAMES` in `student-code-transform.py`. 5. If grading should see it, update `registry-props.js` and `command-replay.js`. |
| Add a doc entry | Add an object to `apiDocs` in `client/src/data/docs.js` (`title`, `description` as `{ ko, en }`). `docs.test.js` checks the data. |
| Add an installable package | `INSTALLABLE_PACKAGES` in `pyodide-worker.js`. |
| Change the CSP or other headers | Edit `client/public/_headers` only, then run the client tests (`client/scripts/pages-config.test.mjs`). Adding a network origin needs a recorded decision (`docs/SCOPE.md`, rule 6). |
| Turn a feature on or off for a deployment | The build-time values in `client/.env.example` and the flags in `client/src/lib/api-base.js`. |
| Change share-link rules | `cloudflare/share-core.js` (storage and limits), `shared/share-names.js` (names, used by both sides), `client/src/utils/share.js` (client). |
| Change gallery or Forge list rules | `shared/gallery-rules.js`, `shared/forge-rules.js`, then `scripts/gallery/`. |

## Tests and checks

Commands that exist in the `package.json` files:

| Command | What it runs |
|---|---|
| `npm test` (repository root) | `node --test` over `shared/`, `cloudflare/` and `scripts/gallery/`, then the client tests |
| `npm --prefix client run test:run` | Vitest (jsdom). Some tests need Python; see above |
| `npm --prefix client run lint` | ESLint |
| `npm --prefix client run build` | Vite build into `client/dist` |
| `node --test shared/*.test.js cloudflare/*.test.js` | Shared modules and the Pages Functions logic |
| `node --test scripts/gallery/*.test.mjs` | List builder: approval rules, URL rules, fake GitHub search |
| `npm run compat:check` | GlowScript compatibility corpus (uses `python3.12` unless `PYTHON` is set) |

`.github/workflows/ci.yml` runs on pushes and pull requests to `main`, with Node 24 and Python 3.12:

1. `shared-and-functions`: `node --test shared/*.test.js cloudflare/*.test.js`.
2. `research-tools`: `node --test scripts/research/*.test.mjs`. Allowed to fail, because the tools are outside the app.
3. `gallery-index`: `node --test scripts/gallery/*.test.mjs`. Must pass.
4. `validate-missions`: `npm run test:run` in `client/`.
5. `validate-i18n`: an inline script that compares the keys of every `client/src/i18n/*.json` file with `en.json`.
6. `validate-mission-i18n`: an inline script that requires `ko` and `en` in each mission's `title`, `description` and `hints`.
7. `lint`: `npm run lint` in `client/`.
8. `build`: `npm run build` in `client/`, after jobs 4 to 7 pass.
9. `security`: `grep` for `.innerHTML =`, `.outerHTML =` and `.insertAdjacentHTML(` in `client/src` (test files excluded), and for secret-like strings in the repository.

Other workflows: `deploy-pages.yml` (named "Deploy"; builds and deploys to Cloudflare Pages after CI passes on `main`), `gallery-index.yml` (builds the gallery and Forge lists on a schedule and commits them to the branch `gallery-data`; runs only when the repository variable `GALLERY_INDEX` is `on`), `i18n-check.yml` (translation coverage comment on pull requests), `mission-review.yml` (runs the mission tests on pull requests that change `client/src/data/missions.js`), `stale.yml`, `welcome.yml`.

To run the whole site locally including the functions, build and then run `npx wrangler pages dev client/dist --port 4086 --persist-to /private/tmp/vpylab-pages-dev-state`, with local secrets in a git-ignored `.dev.vars`. The Vite dev server on port 4033 does not serve `/api/*`.

## Known rough edges

- Most code comments, test names, commit-facing docs and user-facing source strings are Korean. Korean identifiers also appear in Python (`색상`, `음표`, the module `피지컬키트`).
- Several files are dense and hard to read: some components are written with minimal whitespace on very long lines (for example `client/src/components/home/WelcomeFriends.jsx`, `client/src/components/editor/python-completions.js`).
- Large single files: `vpython-api.py` (about 6,200 lines), `data/examples.js` and `data/missions.js` (over 3,000 each), `vpython-bridge.js` (about 1,500), `pages/Sandbox.jsx` and `github/github-api.js` (over 1,000 each).
- The client imports from `shared/` with relative paths that leave `client/` (for example `client/src/lib/api-base.js`), so the client cannot be built without the `shared/` folder.
- Video recording is imported directly by `Sandbox.jsx`; see the known gap in `docs/SCOPE.md`.
- Bundle size: Monaco and Three.js are split into their own chunks in `client/vite.config.js`. `docs/DEPLOY.md` reports a 24 MB deploy on 2026-11-07, which includes the Pyodide files. This was not re-measured after the 2026-11-12 cleanup.
- The i18n system has two mechanisms and many two-way `ko`/`en` branches in components. See `docs/I18N_GUIDE.md`.
- Comments and docs can lag behind the code. When they disagree, trust the code and fix the comment or document in the same pull request. Dated reports in `docs/` describe the day they were written and may describe the removed two-edition setup.
- The Worker restrictions are a list of removed APIs, not a proven sandbox. No security review was done for this document.
