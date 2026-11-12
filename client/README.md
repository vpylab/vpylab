# VPyLab client

This folder is the VPyLab app: a React 19 single-page app built with Vite. Student Python runs in Pyodide inside a Web Worker and draws through Three.js and Web Audio. The build output (`dist/`) is the whole site; it is deployed to Cloudflare Pages.

For what VPyLab is, see the [repository README](../README.md). For a map of the code, see [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

## Commands

Run these in `client/`.

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Vite dev server at http://localhost:4033 |
| `npm run build` | Build into `dist/` |
| `npm run lint` | ESLint |
| `npm run test:run` | Vitest, once. Some tests run lesson code with Python 3.12 |
| `npm run test` | Vitest in watch mode |

The dev server does not serve `/api/*` (short share links and the GitHub token exchange are Cloudflare Pages Functions in `../functions/`). To run them locally, build and then run this from the repository root:

```bash
npx wrangler pages dev client/dist --port 4086 --persist-to /tmp/vpylab-pages-dev-state
```

## Build-time settings

All values are public. With none of them set, running code, lessons, share links and file download/open still work. Copy `.env.example` to `.env.local` to set them locally.

| Variable | Turns on |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Saving to the student's own Google Drive |
| `VITE_GITHUB_CLIENT_ID` | GitHub team projects |
| `VITE_GALLERY_INDEX_URL` | The student gallery |
| `VITE_FORGE_INDEX_URL` | Community modules in the Forge |

The flags derived from these values are in `src/lib/api-base.js`. How to obtain and configure the values is in [docs/DEPLOY.md](../docs/DEPLOY.md) (Korean).

## Layout

| Path | Contents |
|---|---|
| `src/engine/` | Python runtime, worker, 3D bridge, sound, grading |
| `src/pages/`, `src/components/` | Screens and UI |
| `src/data/` | Missions, courses, tutorials, reference docs, examples |
| `src/i18n/` | Korean and English interface text |
| `src/drive/` | Google sign-in and Drive saving |
| `src/github/`, `src/gallery/`, `src/forge/` | GitHub team projects, gallery, Forge |
| `public/_headers` | Response headers and Content Security Policy for Cloudflare Pages |
| `scripts/` | Build helpers (Pyodide assets, service worker, static 404 pages) and their tests |

Modules shared with the Pages Functions and the repository scripts are in `../shared/`.
