# Contributing to VPyLab

English · [한국어](CONTRIBUTING.ko.md)

Thank you for helping. Teachers, students and developers are all welcome.

**Read [docs/SCOPE.md](docs/SCOPE.md) first.** VPyLab is in a feature freeze. Bug fixes, tests, translations, lessons and documentation are welcome now. New features are not, unless they belong to the core roadmap described there.

## What you can work on

| Contribution | Who it suits | Where it lives |
|---|---|---|
| Fix a bug | Developers | `client/src/`, `shared/`, `cloudflare/` |
| Add or improve tests | Developers | next to the code, `*.test.js` |
| Translate the interface or lessons | Anyone | [docs/I18N_GUIDE.md](docs/I18N_GUIDE.md) |
| Add or improve a mission or lesson | Teachers, students | `client/src/data/`, [docs/MISSION_SCHEMA.md](docs/MISSION_SCHEMA.md) |
| Improve documentation | Anyone | `README.md`, `docs/` |
| Improve the Python or 3D engine | Developers | `client/src/engine/`, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |

If you are not sure where to start, open an issue and ask. Issues labeled `good first issue` are sized for a first contribution.

## Set up

Requirements: Node.js 20 or later. Python 3.12 is needed for the tests that run lesson code (`python3.12` on your PATH; without Python those tests are skipped).

```bash
git clone https://github.com/<your-username>/vpylab.git
cd vpylab/client
npm install
npm run dev                          # http://localhost:4033
```

This needs no accounts, keys or database. VPyLab has no server of its own: the app is a static site, and the only server-side code is a few Cloudflare Pages Functions in `functions/` (logic in `cloudflare/`).

- The Vite dev server does not serve `/api/*`. Sharing then falls back to a long link that carries the code, and GitHub sign-in does not work.
- To run the functions too, build and use wrangler: `npx wrangler pages dev client/dist --port 4086 --persist-to /private/tmp/vpylab-pages-dev-state`. Local secrets go in a git-ignored `.dev.vars`.
- Saving to Google Drive and the GitHub features need public client IDs at build time. Copy `client/.env.example` to `client/.env.local` and fill in your own. See [docs/DEPLOY.md](docs/DEPLOY.md) (Korean).

## Before you open a pull request

Run what CI runs:

```bash
npm --prefix client run lint
npm --prefix client run test:run
npm --prefix client run build
node --test shared/*.test.js cloudflare/*.test.js scripts/gallery/*.test.mjs   # only if you touched shared/, cloudflare/ or scripts/gallery/
```

Then:

1. Keep one topic per pull request.
2. Fill in the pull request template, including what you tested and what you could not test.
3. If the change adds a feature, explain how it follows the add-on rule in [docs/SCOPE.md](docs/SCOPE.md).

## Rules that are easy to miss

- **Languages.** Interface text must exist in Korean and English. Mission `title`, `description` and `hints` need both `ko` and `en`. CI checks this.
- **Code and comments.** Names in JavaScript are English. Most existing comments are Korean; new comments may be English or Korean. Do not rewrite existing comments only to change their language.
- **Student-facing Python.** Lesson code may use the Korean API names (`음표()`, `화음()`) next to the English ones (`play_note()`, `play_chord()`). Keep student code simple: one statement per line, no conditional expressions.
- **Security.**
  - Never write to `innerHTML`, `outerHTML` or `insertAdjacentHTML`. Use `textContent` and DOM methods. CI rejects these.
  - Student Python runs in a Web Worker with network and storage APIs removed. Do not add them back.
  - Never commit `.env` files, `.dev.vars` or keys. Values in `VITE_` variables are public.
  - Response headers and the Content Security Policy live in `client/public/_headers`. Adding a network origin needs a recorded decision ([docs/SCOPE.md](docs/SCOPE.md), rule 6).
- **No server, no database.** VPyLab is one static site and the operator stores no student data. Do not add a feature that needs an application server, a database or VPyLab accounts. Optional features are switched by the build-time flags in `client/src/lib/api-base.js` and must leave the core working when they are off.
- **Lessons must run.** A mission's starter code must not pass its own checks, and its solution must pass. The tests verify this by running the code.

## Commit messages

Use a short type prefix and a description in English or Korean:

```
fix: stop scheduled sounds when the run is stopped
test: cover the empty-editor run
i18n: add missing English hints for SN-3
docs: explain the two i18n mechanisms
mission: add CT-5 loop pattern
```

## Review

A maintainer reviews every pull request. Lessons and missions are also read for teaching quality: is the goal clear, can a beginner do it, does the check test the idea and not the exact wording. Reviews can take a few days. This project has one maintainer today, which is one reason a second contributor matters.

## Code of conduct and license

By contributing you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Code is licensed under AGPL v3. Mission and lesson content is licensed under CC BY-NC-SA 4.0.
