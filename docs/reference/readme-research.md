# README and guide research (2026-11-08)

Purpose: find README and teacher/student guide patterns in well-known open-source education projects that VPyLab can reuse. All READMEs were read from the default branch on 2026-11-08. Quotes are kept under 15 words; everything else is summarized.

## Projects reviewed

| # | Project | What was read | Why it fits VPyLab |
|---|---|---|---|
| 1 | p5.js | [README.md](https://github.com/processing/p5.js/blob/main/README.md), [contributor_docs/ko](https://github.com/processing/p5.js/tree/main/contributor_docs/ko), [translations/](https://github.com/processing/p5.js/tree/main/translations) | Creative coding for beginners, strong community and translation model |
| 2 | Scratch GUI | [README.md](https://github.com/scratchfoundation/scratch-gui/blob/develop/README.md), [Scratch Wiki: Teacher Accounts](https://en.scratch-wiki.info/wiki/Scratch_Teacher_Accounts) | Browser editor for schools, separate teacher flow |
| 3 | Thonny | [README.rst](https://github.com/thonny/thonny/blob/master/README.rst), [thonny.org](https://thonny.org) | Python for beginners, split between end-user site and contributor repo |
| 4 | GlowScript / VPython | [glowscript README.md](https://github.com/vpython/glowscript/blob/master/README.md), [LICENSE.txt](https://github.com/vpython/glowscript/blob/master/LICENSE.txt) | VPyLab's compatibility target and upstream code source |
| 5 | JupyterLite | [README.md](https://github.com/jupyterlite/jupyterlite/blob/main/README.md), [Using JupyterLite](https://jupyterlite.readthedocs.io/en/stable/quickstart/using.html) | Pyodide in the browser, static hosting, no server: same architecture as the open edition |
| 6 | Hedy | [README.md](https://github.com/hedyorg/hedy/blob/main/README.md), [Teacher manual](https://hedy.org/for-teachers/manual) | Classroom Python, translations via Weblate, a full teacher manual |
| 7 | freeCodeCamp | [README.md](https://github.com/freeCodeCamp/freeCodeCamp/blob/main/README.md) | Clear license split between software and learning content |

Also looked at, not adopted as a main model: [Code.org README](https://github.com/code-dot-org/code-dot-org/blob/staging/README.md). Its README is a developer map of a large Rails monorepo (setup, architecture, folder landmarks). Useful only for the "what's in this repo" table idea.

Note: p5.js no longer has a `README.ko.md` on `main`. Its Korean material lives in `contributor_docs/ko` and library `translations/ko`. The README itself lists i18n stewards per language (including Korean).

## What each project does well

### p5.js
- Opens with a short welcome and a one-sentence definition (free, open-source, accessible creative coding).
- Shows a tiny code sample next to the image it produces, in a two-column table. This is the fastest way to show what the tool does.
- One row of links right under it: Get Started, Reference, Tutorials, Examples, Libraries.
- Separate sections for community values, issues (with links to each related repo), contributors, and stewards per area.
- Has an explicit AI usage policy for contributions ("does not accept fully AI-generated contributions").
- Credits translators by language inside the README.

### Scratch GUI
- The first block is a migration notice. When the repo state changes, the README says so at the top.
- The rest is developer-only: install, run, test, troubleshooting, publishing to GitHub Pages.
- Teacher material is not in the repo. It lives on the website (teacher accounts, class creation, closing a class). Lesson: keep the README short and send teachers to a dedicated guide.

### Thonny
- README is tiny: one-line pitch ("Python IDE meant for learning programming"), then "End users → website", "Contributors → CONTRIBUTING", "Sponsors".
- The website does the selling: tagline, one large screenshot, then a feature list where each item is a bold phrase, a short paragraph, and its own screenshot.
- Lesson: split audiences early. Students and teachers should not have to read developer setup.

### GlowScript / VPython
- Pitch: write VPython in the browser and get navigable 3D animations.
- Links to a live example program and to documentation on glowscript.org.
- Names the people and history behind the project and points to the sister project (VPython 7).
- License is a short MIT file. VPyLab uses MIT code from vpython-jupyter and uses GlowScript as a specification, so the README must credit both with copyright holders.

### JupyterLite
- Bold first sentence: it **runs entirely in the browser**.
- "Try it in your browser" table with two live links and screenshots.
- A status note says not every feature of the full product works. This matches VPyLab's open edition, where some classroom features are off.
- Separate "Build your own" and "Ease of deployment" sections: static hosting, no application server.
- The user docs state plainly where files live (browser storage), that storage is limited, and that users should download important files. This is the closest model for VPyLab's privacy and saving sections.

### Hedy
- README: badges, logo, one-paragraph pitch, quick links (bug report, content issue), a screenshot, link to the live site and an offline option.
- Translation call-to-action with a live Weblate status widget. No programming needed to translate.
- Asks issue reporters to use neutral, kind wording.
- The teacher manual is a separate document with three parts: background (what it is, devices, GDPR, community), common mistakes per level, and "How to..." task guides (create a class, add students, prepare a lesson). No FAQ section; the task guides play that role.

### freeCodeCamp
- One sentence on who runs it and why.
- License section separates the software license (BSD-3-Clause) from the curriculum content, which is stated separately with its own terms and path (`/curriculum`).
- Separate links for bug reports and for security reports (responsible disclosure).

## Patterns adopted for VPyLab

| Pattern | Source | How VPyLab uses it |
|---|---|---|
| One-line pitch, then "runs entirely in the browser" | p5.js, JupyterLite | First lines of README: browser 3D Python lab, nothing to install, no account needed in the open edition |
| Live demo link above the fold | JupyterLite, Hedy | Link to https://vpylab.pages.dev in the first screen, plus the classroom URL in an editions table |
| Code sample + result image | p5.js | Short VPython sample (sphere, label, three notes), screenshot marked TODO |
| Status note about what does not work yet | Scratch GUI, JupyterLite | "Saving is in progress" note, Drive saving described as an experiment page only |
| Audience split | Thonny, Scratch | README sections "For students and teachers" and "For developers"; teachers and students go to `docs/GUIDE.ko.md` |
| Plain statement of where data lives | JupyterLite | Privacy section: no VPyLab server or DB in the open edition; browser storage; Drive experiment uses `drive.file` |
| Admin/IT notes | Hedy (GDPR, devices), Scratch (teacher flow) | School IT section: domains to allow, Google Workspace app access control, test-user limit while unverified |
| Teacher guide as a separate task-based document | Hedy | `docs/GUIDE.ko.md` organized by tasks (start, features, saving, Workspace setup, privacy, troubleshooting, FAQ) |
| License split between code and content | freeCodeCamp | AGPL v3 for code, CC BY-NC-SA 4.0 for mission content, MIT for imported upstream code |
| Upstream credits with names | GlowScript, p5.js | Acknowledgments: vpython-jupyter (MIT), GlowScript (MIT), Pyodide, Three.js, Monaco |
| Translations credited and invited | p5.js, Hedy | Link to `docs/I18N_GUIDE.md` and the i18n issue template; README is in English with a Korean README |
| Separate security reporting | freeCodeCamp | Ask for private reports instead of public issues. GitHub private vulnerability reporting is off for `vpylab/vpylab` (checked with `gh api` on 2026-11-08), so the README marks enabling it as a maintainer TODO. `.github/SECURITY.md` still names `security@vpylab.org` (domain does not resolve) and the old `greatsong/vpylab` advisory page, so the README does not repeat those |
| Migration notice at the top when the repo changes | Scratch GUI | Short note that the classroom repo is moving into `vpylab/vpylab` (from `docs/DEPLOY_TWO_EDITIONS.md`) |

## Patterns not adopted

- Badge rows (p5.js, Hedy, freeCodeCamp). The repo has no published package, coverage or docs build to point badges at, and GitHub's license detection shows "Other" for the AGPL file because of the added header. No badges until they can be verified.
- Sponsor and donation sections. `.github/FUNDING.yml` points to `https://vpylab.org/donate`, and `vpylab.org` did not resolve on 2026-11-08 (NXDOMAIN).
- Contributor avatar grids (p5.js all-contributors). Not set up in this repo.
- An AI usage policy (p5.js). Worth discussing, but it is a project policy decision, not a documentation task.
