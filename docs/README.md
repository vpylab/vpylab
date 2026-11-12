# Documentation index

English · most documents below are in Korean unless marked (EN).

This folder holds two kinds of files. **Living documents** describe how VPyLab works now and are kept up to date. **Historical records** describe a review, test or release on a given day and are not updated afterwards. If a record disagrees with a living document or with the code, the code is right.

On 2026-11-12 VPyLab became one version: one static site on Cloudflare Pages with no server and no database of its own. Records written before that day may describe the removed two-edition setup (a "classroom edition" on Vercel, Railway and Supabase next to an "open edition"). The decision is in [SCOPE.md](SCOPE.md).

## Start here

| If you want to… | Read |
|---|---|
| Know what VPyLab is and run it | [../README.md](../README.md) (EN), [../README.ko.md](../README.ko.md) |
| Contribute | [../CONTRIBUTING.md](../CONTRIBUTING.md) (EN), [../CONTRIBUTING.ko.md](../CONTRIBUTING.ko.md) |
| Know what is in scope and how extras must be built | [SCOPE.md](SCOPE.md) (EN + KO) |
| Understand the code | [ARCHITECTURE.md](ARCHITECTURE.md) (EN) |
| Build, configure and deploy the site | [DEPLOY.md](DEPLOY.md) |
| Translate or add a language | [I18N_GUIDE.md](I18N_GUIDE.md) (EN), [I18N_GUIDE.ko.md](I18N_GUIDE.ko.md) |
| Write a mission | [MISSION_SCHEMA.md](MISSION_SCHEMA.md) |
| See which VPython API is supported | [VPYTHON_API.md](VPYTHON_API.md) |

## Living documents

| Topic | Document |
|---|---|
| Scope, feature freeze, the add-on rule, recorded decisions | [SCOPE.md](SCOPE.md) (EN + KO) |
| Code map: run path, routes, the three ways to work, tests | [ARCHITECTURE.md](ARCHITECTURE.md) (EN) |
| Deployment: Cloudflare Pages, build settings, Google and GitHub OAuth setup, share links, gallery and Forge lists | [DEPLOY.md](DEPLOY.md) |
| Gallery on GitHub: how teachers approve student work and Forge modules | [GALLERY_GITHUB.md](GALLERY_GITHUB.md) |
| Sharing, embedding, installing as an app | [SHARE_EMBED_INSTALL.md](SHARE_EMBED_INSTALL.md) |
| Translations | [I18N_GUIDE.md](I18N_GUIDE.md) (EN), [I18N_GUIDE.ko.md](I18N_GUIDE.ko.md) |
| Mission data format | [MISSION_SCHEMA.md](MISSION_SCHEMA.md) |
| VPython API reference | [VPYTHON_API.md](VPYTHON_API.md) |
| User guides (being revised after 2026-11-12) | [GUIDE.ko.md](GUIDE.ko.md), [USER_GUIDE_KO.md](USER_GUIDE_KO.md), [USER_GUIDE_EN.md](USER_GUIDE_EN.md) (EN) |
| Testing at another school | [TESTERS.ko.md](TESTERS.ko.md) |
| Measuring how far student code moves from starter code (research tool, not part of the app) | [../scripts/research/README.md](../scripts/research/README.md) (EN + KO) |
| GlowScript compatibility harness | [../scripts/compat/README.md](../scripts/compat/README.md) |

## Historical records

These files are records. They explain why something was built the way it was. They are not instructions, and they are not edited. Several describe the two-edition setup that was removed on 2026-11-12, including sign-in, the server, Supabase and the old gallery.

### Reviews and audits

| Date | Document |
|---|---|
| 2026-04-24 | [CONTENT_REVIEW.md](CONTENT_REVIEW.md) |
| 2026-05-08 | [STUDENT_PROJECT_SIMULATION.md](STUDENT_PROJECT_SIMULATION.md) |
| 2026-07-06 | [AUDIT_REPORT_2026-07-06.md](AUDIT_REPORT_2026-07-06.md), [OPENSOURCE_FLOW_REVIEW_2026-07-06.md](OPENSOURCE_FLOW_REVIEW_2026-07-06.md) |
| 2026-10-28 | [READINESS_REVIEW_2026-10-28.md](READINESS_REVIEW_2026-10-28.md), [CONTENT_EDUCATIONAL_REVIEW_2026-10-28.md](CONTENT_EDUCATIONAL_REVIEW_2026-10-28.md), [CONTENT_SCAFFOLDING_REVIEW_2026-10-28.md](CONTENT_SCAFFOLDING_REVIEW_2026-10-28.md), [AI_TA_REFERENCE_REVIEW_2026-10-28.md](AI_TA_REFERENCE_REVIEW_2026-10-28.md) |
| 2026-10-29 | [PYODIDE_LOADING_2026-10-29.md](PYODIDE_LOADING_2026-10-29.md), [GLOWSCRIPT_COMPAT_REPORT.md](GLOWSCRIPT_COMPAT_REPORT.md) |
| 2026-11-06 | [COMPATIBILITY_AUDIT_2026-11-06.md](COMPATIBILITY_AUDIT_2026-11-06.md), [CREATIVE_LEARNING_AND_VPYTHON_2026-11-06.md](CREATIVE_LEARNING_AND_VPYTHON_2026-11-06.md), [LEARNING_SIMPLIFICATION_2026-11-06.md](LEARNING_SIMPLIFICATION_2026-11-06.md) |
| 2026-11-08 | [DRIVE_LAB_RESULTS_2026-11-08.md](DRIVE_LAB_RESULTS_2026-11-08.md): stability results for the Drive storage modules that Create still uses. The test page it mentions has been removed. |

### Releases and feature notes of 2026-11-07

- [AUDIO_STOP_AND_STAGE_LIGHTING_2026-11-07.md](AUDIO_STOP_AND_STAGE_LIGHTING_2026-11-07.md)
- [DEPLOYMENT_AND_GUIDE_2026-11-07.md](DEPLOYMENT_AND_GUIDE_2026-11-07.md)
- [DOCUMENTATION_AND_SHAPE_GUIDES_2026-11-07.md](DOCUMENTATION_AND_SHAPE_GUIDES_2026-11-07.md)
- [FINAL_DEPLOYMENT_CLOSEOUT_2026-11-07.md](FINAL_DEPLOYMENT_CLOSEOUT_2026-11-07.md)
- [FINAL_ENGLISH_RELEASE_2026-11-07.md](FINAL_ENGLISH_RELEASE_2026-11-07.md)
- [FINAL_HOME_TYPING_AUDIO_REVIEW_2026-11-07.md](FINAL_HOME_TYPING_AUDIO_REVIEW_2026-11-07.md)
- [FORGE_MODULES_2026-11-07.md](FORGE_MODULES_2026-11-07.md)
- [FORGE_PROJECT_ASSETS_2026-11-07.md](FORGE_PROJECT_ASSETS_2026-11-07.md)
- [FRIENDS_STAGE_2026-11-07.md](FRIENDS_STAGE_2026-11-07.md)
- [FRIEND_ACTIONS_2026-11-07.md](FRIEND_ACTIONS_2026-11-07.md)
- [KIRBY_MAIN_PARITY_2026-11-07.md](KIRBY_MAIN_PARITY_2026-11-07.md)
- [LIGHT_SOUND_PRACTICE_POLISH_2026-11-07.md](LIGHT_SOUND_PRACTICE_POLISH_2026-11-07.md)
- [LIGHT_SOUND_PRACTICE_RELEASE_2026-11-07.md](LIGHT_SOUND_PRACTICE_RELEASE_2026-11-07.md)
- [PERSONAL_HOME_AND_ORBIT_2026-11-07.md](PERSONAL_HOME_AND_ORBIT_2026-11-07.md)
- [PRACTICE_RUNTIME_REUSE_2026-11-07.md](PRACTICE_RUNTIME_REUSE_2026-11-07.md)
- [SHAPE_CAMERA_UX_REVIEW_2026-11-07.md](SHAPE_CAMERA_UX_REVIEW_2026-11-07.md)
- [WELCOME_MENU_AND_LIVE_VERIFICATION_2026-11-07.md](WELCOME_MENU_AND_LIVE_VERIFICATION_2026-11-07.md)
- [WORD_TIPS_AND_HOME_ACTIONS_2026-11-07.md](WORD_TIPS_AND_HOME_ACTIONS_2026-11-07.md)

### Record folders

| Folder | Contents |
|---|---|
| `content-review/`, `guide-captures/`, `brand/` | Dated review material, screen captures and brand files (2026-10-28) |
| `reports/`, `review-figures/`, `collaboration/` | Evidence files for the 2026-11-07 reports |
| `screenshots/` | Images used by the READMEs and reports |
| `reference/` | Writing briefs and drafts used to produce interface and guide text |

## Adding a document

- Put a living document here and add it to the table above.
- Name a record with its date and do not edit it later; write a new one instead.
- New living documents for contributors should be in English, or English first with a Korean section.
