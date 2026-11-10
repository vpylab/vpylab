# Internationalization guide

English · [한국어](I18N_GUIDE.ko.md)

This guide describes how interface text and lesson text are translated in the code today, and what it would take to add a third language. It describes the current state, including the parts that are not ready.

**Short version:** VPyLab supports exactly two locales, `ko` and `en`. Korean is the source language. Adding a third language today requires code changes in many files and the ability to read Korean source strings (or to work from the English translations next to them). It is not a matter of adding one JSON file.

## Supported locales

| Locale | Interface | Lessons and docs |
|---|---|---|
| `ko` | source language | source language |
| `en` | translated | translated |

## How the locale is chosen

`client/src/i18n/locale.js` exports `readInitialLocale({ search, storage })`:

1. If the URL has `?lang=ko` or `?lang=en`, that value is used and saved to `localStorage` under `vpylab-locale`.
2. Otherwise the saved `vpylab-locale` value is used, if it is `ko` or `en`.
3. Otherwise the locale is `ko`.

An unsupported `?lang=` value is ignored and does not overwrite the saved value. The browser language (`navigator.language`) is not consulted.

`client/src/stores/appStore.js` holds `locale` and `setLocale(locale)`, which also writes `vpylab-locale`. The language `<select>` is in `client/src/components/layout/Header.jsx` with two hard-coded options. `I18nProvider` (`client/src/i18n/index.jsx`) sets `document.documentElement.lang` when the locale changes.

## Mechanism A: keyed dictionaries (`t()`)

Files: `client/src/i18n/ko.json`, `client/src/i18n/en.json`, `client/src/i18n/context.js`, `client/src/i18n/useI18n.js`.

- Both JSON files have the same nested keys (292 leaf keys each at the time of writing), for example `nav.gallery` or `editor.run`.
- `context.js` imports both files into `messages = { ko, en }` and exports `translate(locale, key, params)`.
- Lookup order: `messages[locale]`, then `messages.en`, then the key itself.
- Interpolation uses double braces: `"missionCount": "{{count}} missions"` with `t('home.missionCount', { count: 8 })`.
- Components call `const { t, locale } = useI18n()`. `useOptionalI18n(fallbackLocale = 'ko')` is for components that may render outside `I18nProvider`.

About 35 source files use this hook. This is the older mechanism.

## Mechanism B: the phrase catalog (`ui()`)

Files: `client/src/i18n/ui-text.js`, `client/src/i18n/catalogs/en-ui-text.json`.

Here the Korean sentence in the source code is the key. The catalog maps it to English:

```json
{
  "새로고침": "Refresh",
  "{0}Hz 종을 울렸습니다.": "Rang the {0}Hz bell."
}
```

The catalog has about 1,800 entries; about 100 contain placeholders. Around 30 source files use it.

How to call it:

```jsx
import { useUiText } from '../i18n/ui-text';

function Panel({ count }) {
  const ui = useUiText();            // subscribes to locale changes
  return <>
    <button>{ui("새로고침")}</button>     {/* plain string form */}
    <p>{ui`코드 ${count}개`}</p>          {/* tagged-template form */}
  </>;
}
```

Outside a component, import `uiText` and call it the same way. `getUiLocale()` returns the current locale.

What `translateUi(locale, source, ...values)` does:

- **Tagged-template form.** The template parts are joined with numbered placeholders, so ``ui`코드 ${count}개` `` produces the key `코드 {0}개`. Whitespace in the key is normalized (runs of whitespace become one space, ends trimmed). If the locale is `en` and the catalog has the key, the English pattern is used; otherwise the Korean pattern is used. Then `{0}`, `{1}`, ... are replaced with the values. A translation may reorder or repeat placeholders but must use the same numbers.
- **Plain string form.** If the locale is not `en`, the string is returned unchanged. If it is `en`, the call goes to `translateSystemMessage`.

What `translateSystemMessage(locale, source)` does (English only):

1. Normalize whitespace and look for an exact catalog key.
2. If there is none, try every catalog key that contains placeholders as a pattern: each `{n}` becomes a non-greedy "match anything" group. On a match, the captured text is put into the English pattern. This is how a message that was already formatted in Korean elsewhere (in the Worker, a store, or the server) can still be translated, for example the Worker's `📦 numpy 설치 중...` matches the key `📦 {0} 설치 중...`.
3. If nothing matches, return the source unchanged.

Rules that follow from this:

- Do not pass student content (code, titles, names, `print` output) through `ui()` or `translateSystemMessage`. They are for text the app itself wrote. The Worker marks its own console notices with `system: true`, and `client/src/hooks/usePyodide.js` translates only those.
- Do not use a translated string as a state value or comparison key.
- The same Korean word can need different English in different places. One case is handled with an explicit branch in `client/src/components/courses/WorkbookCourse.jsx` (`locale==='en'?'Check':'확인'`), because the catalog can hold only one English value per Korean key.
- `useUiText()` returns the same function object every time, so it is safe in effect dependency arrays.
- A missing catalog entry is silent: the Korean text is shown in English mode.

## Content localization

Lesson and reference data in `client/src/data/` uses three different patterns.

1. **Per-locale fields `{ ko, en }`.** `missions.js`, `physical-missions.js`, `tutorials.js`, `training.js`, `creative-labs.js`, `light-sound-labs.js`, `forge-tutorial.js`, `shape-guides.js`, `welcome-friends.js` and `doc-origins.js` define a helper `const text = (ko, en) => ({ ko, en })` and call it with two positional arguments. `docs.js` and course titles in `courses.js` write `{ ko: ..., en: ... }` literally. Components read `value[locale]`, usually with a fallback to `value.ko`.
2. **Korean-only data translated through the catalog.** The two workbook courses (`light-sound-course.js`, `github-project-course.js`) keep lesson text in Korean only. `localizeCourse(course, locale)` in `client/src/i18n/owned-content.js` returns a translated copy for `en`: it walks the object and passes every string through `translateUi`, except fields named `code`, `accessibleCode`, `supportCode`, `copyCode`, `signature`, `url`, `path`, `id`, `ko`, `en`. The original object is not changed. For the two core courses (`beg-light-sound`, `beg-github-project`) `localizeLessonCode` also rewrites lesson code for English: the Korean commands `음표` and `소리` become `play_note_and_wait` and `play_sound`, and Korean note names such as `"도4"` become `"C4"`. Comments and other strings in the code are left as they are. `client/src/pages/Examples.jsx` uses the same catalog approach for example titles and descriptions (`ui(ex.title)`).
3. **Suffix fields.** `EXAMPLE_CATEGORIES` in `examples.js` uses `label` and `labelEn`. `code-vocabulary.js` passes Korean and English as separate positional arguments. `client/src/components/shared/LoadingScreen.jsx` has `ALL_TIPS_KO` and `ALL_TIPS_EN` arrays.

Other localized text outside these patterns: Python error explanations in `client/src/engine/python-error-explainer.js` (tables with `ko` and `en`), grading messages in `client/src/engine/grading-engine.js` (`pickText(value, lang)`, falling back to `ko`), and the default editor code in `client/src/data/default-code.js` (two string replacements for `en`).

Python itself is not localized. Messages raised by `client/src/engine/vpython-api.py` and progress messages from `client/src/engine/pyodide-worker.js` are Korean strings; some are translated on the main thread through the catalog. Korean API aliases (`색상`, `음표`, `소리`, ...) are part of the public Python API and are not translations.

## Adding a third language today

The example below uses Japanese (`ja`). Every item is a code change. Nothing here is automated.

### Where `ko` and `en` are hard-coded

Paths are relative to the repository root. Found by searching `client/src`, `server`, `api`, `functions`, `cloudflare` and the HTML entry files; test files are not listed.

**Locale list and core i18n code**

| File | What is hard-coded |
|---|---|
| `client/src/i18n/locale.js` | `['ko', 'en']` twice; default `'ko'` |
| `client/src/i18n/context.js` | imports `ko.json` and `en.json` only; fallback `messages.en` |
| `client/src/i18n/index.jsx` | fallback `messages['en']` |
| `client/src/i18n/useI18n.js` | default `fallbackLocale = 'ko'` |
| `client/src/i18n/ui-text.js` | imports only `en-ui-text.json`; `locale === 'en'` / `locale !== 'en'` in three places; system patterns built from the English catalog only |
| `client/src/i18n/owned-content.js` | `locale !== 'en'` returns the Korean original; skip list contains `'ko'`, `'en'`; code rewriting is English-specific |
| `client/src/components/layout/Header.jsx` | two `<option>` elements; `ko = locale === 'ko'` |

**Two-way branches where any non-Korean locale gets English** (`locale === 'ko' ? '…' : '…'`, often through a local `const ko = locale === 'ko'` or `lang === 'ko'`)

- Pages: `client/src/pages/Home.jsx`, `Gallery.jsx`, `GalleryDetail.jsx`, `Missions.jsx`, `MissionPlay.jsx`, `Tutorials.jsx`, `Courses.jsx`, `Examples.jsx`, `Docs.jsx`, `SourceProject.jsx`, `Sandbox.jsx`
- `client/src/components/auth/AuthModal.jsx`
- `client/src/components/docs/DocCodeBlock.jsx`, `DocContent.jsx`, `DocSidebar.jsx`
- `client/src/components/editor/CodeEditor.jsx`, `python-completions.js`
- `client/src/components/home/HomePreviewBoundary.jsx`, `HomeProjectPlayer.jsx`, `HomeSettingsDialog.jsx`, `PersonalHomeProject.jsx`, `StageLightEditor.jsx`, `WelcomeFriends.jsx`
- `client/src/components/learning/CodeVocabulary.jsx`, `TypingWordTip.jsx`
- `client/src/components/shared/RuntimeStatus.jsx`, `LoadingScreen.jsx`

**Two-way branches where any non-English locale gets Korean** (`locale === 'en' ? … : …`)

- `client/src/engine/python-error-explainer.js` (`lang = locale === 'en' ? 'en' : 'ko'`)
- `client/src/data/default-code.js`
- `client/src/components/courses/WorkbookCourse.jsx`
- `client/src/i18n/ui-text.js`, `client/src/i18n/owned-content.js` (listed above)

**Fallbacks to the `ko` field or a `'ko'` default parameter**

- `client/src/pages/Courses.jsx` (`title?.[lang] || title?.ko`)
- `client/src/components/docs/DocContent.jsx`, `client/src/components/editor/python-completions.js`
- `client/src/engine/grading-engine.js` (`pickText`, `options.lang || 'ko'`)
- `client/src/data/docs.js` (`searchDocs(query, locale = 'ko')`)
- `client/src/hooks/usePyodide.js` (`locale = 'ko'`)
- `client/src/classroom/curriculum.js`, `client/src/classroom/CurriculumLibrary.jsx` (always read `.ko`)

**Fixed date and number locales**

- `'ko-KR'`: `client/src/stores/projectStore.js`, `client/src/pages/Sandbox.jsx`, `client/src/components/gallery/GalleryCard.jsx`, `client/src/classroom/Workspace.jsx`, `PeerReview.jsx`, `GitHubLearningPanel.jsx`
- `'ko-KR'` or `'en-US'`: `client/src/pages/GalleryDetail.jsx`

**Static files with `lang="ko"` or Korean text**

- `client/index.html`, `classroom.html`, `training.html`, `drive-lab.html`, `month-projects.html`, `brand-preview.html`
- `client/public/manifest.webmanifest` (`"lang": "ko"`, Korean description and shortcut names)
- `server/utils/standalone-template.js`, `server/routes/projects.js`, `api/_lib/og.mjs` (generated HTML)

**Data shape**

- The `text(ko, en)` helper in the data files listed under "Content localization" takes exactly two arguments.
- `labelEn` in `client/src/data/examples.js`; the positional `english` argument in `client/src/data/code-vocabulary.js`; `ALL_TIPS_KO` / `ALL_TIPS_EN` in `LoadingScreen.jsx`.

**Checks and scripts**

- `.github/workflows/ci.yml`: `requiredLangs = ['ko', 'en']` for missions.
- `scripts/compat/english-browser.cjs`: a browser check written for English.

The separate entry apps (`client/src/classroom/`, `client/src/training/`, `client/src/month-projects/`, `client/src/drive-lab/`) do not call `t()` or `ui()` in their main components. They appear to be Korean only and are outside the scope of a new locale unless they are internationalized first.

### What a new locale gets with only the easy steps

If you add `ja.json`, register it in `context.js`, allow `'ja'` in `locale.js` and add the `<option>`:

- `t()` strings are Japanese.
- `ui()` strings are **Korean**, because the catalog code handles only `en`.
- The two-way `ko ? … : …` branches show **English**.
- `{ ko, en }` data shows Korean where the component falls back to `.ko`, and nothing where it does not.

The result is a mixed-language interface. A usable third language needs the refactoring below.

### Suggested order of work

1. **Open an issue first** (the template `.github/ISSUE_TEMPLATE/04-i18n-translation.yml` exists) and agree on scope with the maintainers. Steps 2 to 4 change shared code and are best done as their own pull requests, before any translation.
2. **Make the locale list one constant.** Export a list from `client/src/i18n/locale.js` and use it in `readInitialLocale`, in the `Header.jsx` select, and in the CI mission check.
3. **Generalize the phrase catalog.** In `client/src/i18n/ui-text.js`, load a catalog per locale (`catalogs/<locale>-ui-text.json`) instead of the single English import, build `systemPatterns` per locale, and decide the fallback for a missing entry (English is more useful to most readers than Korean). Do the same for the `locale !== 'en'` checks in `owned-content.js`; the lesson-code rewriting there should stay English-only or become a per-locale choice.
4. **Remove the two-way branches.** Replace each `ko ? '한국어' : 'English'` with `ui("한국어")` plus a catalog entry (or a `t()` key). This is the largest part: about 30 files. It needs someone who can confirm that the existing English text is moved into the catalog unchanged. No Korean reading is needed for this step, because both strings are already in the code.
5. **Decide the data shape.** Either extend `text(ko, en)` and the `{ ko, en }` objects with a third field and give every reader a common fallback helper (`value[locale] ?? value.en ?? value.ko`), or move that text into the catalog as the workbook courses already do. `grading-engine.js` already has `pickText`; the pages do not share one helper.
6. **Translate.** Copy `en.json` to `ja.json` (292 keys). Copy `catalogs/en-ui-text.json` to `catalogs/ja-ui-text.json` and translate the values (about 1,800 entries). The keys are Korean, but each entry already has its English value beside it, so a translator can work from English. Keep every `{0}`, `{1}` placeholder. Then the data files: missions, docs, tutorials, courses, examples.
7. **Fix the rest.** Date formats (`'ko-KR'`), `python-error-explainer.js`, `default-code.js`, `LoadingScreen.jsx` tips, and `manifest.webmanifest` if the installed app name should change.
8. **Add tests** next to the existing ones (see below) for the new locale, and extend the browser check if you can run it.

Do not translate: Python keywords and API names (`sphere`, `vector`, `rate`), `from vpython import *`, or the Korean API aliases. Do translate code comments in starter code where the data has a per-locale field for them.

## How translations are checked

Continuous integration:

- `.github/workflows/ci.yml`, job `validate-i18n`: flattens the keys of every `*.json` file directly in `client/src/i18n/` and fails if a file lacks a key that `en.json` has. Extra keys only produce a warning. The `catalogs/` subfolder is not read by this job, so a new `ja.json` is checked automatically and a new catalog file is not.
- `.github/workflows/ci.yml`, job `validate-mission-i18n`: imports `client/src/data/missions.js` and fails if any mission lacks `ko` or `en` in `title`, `description` or a hint.
- `.github/workflows/i18n-check.yml`: on pull requests that touch `client/src/i18n/**` or `client/src/data/missions.js`, posts a comment with key coverage per language compared with `en.json`. It reports and does not fail the build.
- The Vitest run (`validate-missions` job) includes the i18n tests below.

Nothing in CI checks that every Korean string passed to `ui()` has a catalog entry.

Tests you can run locally:

```bash
# all client tests
npm --prefix client run test:run

# only the i18n tests
npm --prefix client run test:run -- src/i18n

# related tests
npm --prefix client run test:run -- src/components/courses/WorkbookCourse.test.jsx src/hooks/usePyodide.test.jsx
```

- `client/src/i18n/locale.test.js`: `?lang=` handling, unsupported values, blocked storage.
- `client/src/i18n/ui-text.test.jsx`: placeholders are preserved and interpolated text is not re-interpreted; the function identity is stable across a locale switch; both workbook courses localize to English with no Hangul left in guide text or lesson code while the original data is unchanged; unknown output is returned verbatim.
- `client/src/hooks/usePyodide.test.jsx`: only `system` output is translated.
- `scripts/compat/english-browser.cjs`: a Puppeteer check of the English interface against a running app. It is not part of CI, and `scripts/compat/README.md` does not describe it. How to run it was not verified for this guide.

## Not verified

- Whether every Korean message produced by the Worker, the stores and the server has a catalog entry.
- Whether server responses (`server/routes/`) are localized anywhere other than through the catalog on the client.
- The Crowdin or Weblate integration mentioned in the earlier Korean guide: no configuration for either exists in the repository.
