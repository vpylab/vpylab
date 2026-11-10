# Contributing to VPyLab

English · [한국어](CONTRIBUTING.ko.md)

Thank you for helping. Teachers, students and developers are all welcome.

**Read [docs/SCOPE.md](docs/SCOPE.md) first.** VPyLab is in a feature freeze. Bug fixes, tests, translations, lessons and documentation are welcome now. New features are not, unless they belong to the core roadmap described there.

## What you can work on

| Contribution | Who it suits | Where it lives |
|---|---|---|
| Fix a bug | Developers | `client/src/`, `server/` |
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
cd vpylab
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

Run the open edition. It needs no accounts, keys or database, so start here:

```bash
cd client
VITE_EDITION=open npm run dev        # http://localhost:4033
```

The classroom edition needs your own Supabase project. See the `.env.example` files and [README.md](README.md#for-developers).

## Before you open a pull request

Run what CI runs:

```bash
npm --prefix client run lint
npm --prefix client run test:run
npm --prefix client run build
npm --prefix server test             # only if you touched server/
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
  - Never commit `.env` files or keys.
- **Two editions.** Anything that needs the server or database must be behind `SERVER_FEATURES` (`client/src/lib/api-base.js`) so the open edition keeps working without it.
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
