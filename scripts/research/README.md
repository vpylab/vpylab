# Research tools: creation stage

`creation-stage.mjs` is a standalone, offline script for teacher-researchers. It classifies student programs by how far they have moved from the code that VPyLab itself provides (starter code, mission solutions, examples, course and documentation snippets, gallery projects). The intended use is a report such as "what share of students moved from modifying provided code to writing their own".

It is not part of the app. It does not change app code, does not connect to any database or network, and needs no dependencies beyond Node 24.

## What it measures

Each program is compared with a reference corpus harvested from `client/src/data/*.js` and `client/public/projects/glowscript/*.json`.

| Stage | Korean label | Rule |
|---|---|---|
| `empty` | 빈 코드 | No tokens after comments and blank lines are removed. |
| `short` | 판정 보류(너무 짧음) | Not identical to a reference, and fewer than `MIN_DISTINCT_SHINGLES` shingles remain after common boilerplate is removed. Not judged. |
| `unchanged` | 그대로 실행 | Tokens are identical to a reference. Comments, blank lines, spacing and indentation are ignored. |
| `tweak` | 값 바꾸기 | Identical to a reference once number and string literals are masked. Only values changed. |
| `remix` | 구조 변형 | Not identical, but the similarity to the nearest reference is at or above `REMIX_MIN_SIMILARITY`. |
| `original` | 창작 | Similarity to the nearest reference is below the threshold. |

Similarity is containment over 5-token shingles: the share of the student's shingles that also occur in the nearest reference. Two things keep this from misleading:

- **Common boilerplate is removed first.** Shingles that occur in at least `COMMON_SHINGLE_SHARE` (3%) of the references, such as `from vpython import *` or `while True:` followed by `rate(...)`, are left out of the comparison. Otherwise hand-written code looks copied.
- **Two views are compared and the higher similarity is used.** The masked view hides numbers and strings. The renamed view also hides the names the program defines itself (variables, loop variables, functions, parameters). Otherwise renaming every variable would look like original work.

`novel_share` is the share of the student's masked shingles that occur in no reference at all, boilerplate included.

## What it does NOT measure

- It measures distance from provided code. It does not measure creativity, quality, correctness or understanding.
- `original` only means "not close to code the platform ships". The code may have been copied from a classmate, a website, an AI assistant or a teacher handout. Add handouts with `--extra-ref`.
- The thresholds (`SHINGLE_K = 5`, `REMIX_MIN_SIMILARITY = 0.5`, `COMMON_SHINGLE_SHARE = 0.03`, `MIN_DISTINCT_SHINGLES = 8`) are provisional. They were chosen by inspection of a few synthetic cases, not by validation. No real student code has been run through this tool yet.
- Before reporting any percentage, draw a sample, have two people code it by hand with the same stage definitions, report inter-rater agreement (for example Cohen's kappa), and then compare the tool with the agreed human codes. Adjust the thresholds with `--remix-threshold`, `--shingle-k` and `--common-share` and report the values used.
- Known weak points:
  - The renamed view finds defined names from token order only (`name =` at the start of a line, `for … in`, `def name(params)`, `as name`). Names bound in other ways, such as tuple assignment or attributes, are not hidden.
  - Lessons build on each other, so the shipped programs resemble one another. A student who writes from scratch in the style of the course can still land in `remix`.
  - Short programs are held back as `short`. Report how many there were.
  - Mission solutions are references. A student who solves a mission independently and arrives at the model answer is classified as `unchanged` or `tweak`. Use `--no-solutions` to compare both ways.
  - Indentation is ignored, so moving a line in or out of a block is not detected.
  - The tokenizer is not a full Python parser.
- The per-author summary uses the highest stage among that author's programs. It ignores time order. `savedAt` is accepted in the input but is not used yet.

## Preparing input

The teacher exports data from their own class by hand. The tool never connects to Supabase, GitHub or Google Drive.

- A folder of `.py` files (`--dir`). The file name without `.py` becomes the id.
- Or a JSON file (`--json`) with an array of `{ "id": "...", "author": "...", "code": "...", "savedAt": "..." }`. `author` and `savedAt` are optional.

Keep exported files outside the repository and delete them when the analysis is finished.

## Commands

Run from the repository root.

```bash
# How many reference programs were harvested, per module, and which modules were skipped
node scripts/research/creation-stage.mjs --list-refs

# A folder of .py files
node scripts/research/creation-stage.mjs --dir ~/export/class-a --out ~/export/class-a.csv

# A JSON export with authors (salt required)
node scripts/research/creation-stage.mjs --json ~/export/class-a.json --salt "a long private phrase" \
  --out ~/export/class-a.csv --summary-json ~/export/class-a-summary.json

# Add a teacher's handout code as references, exclude mission solutions, try another threshold
node scripts/research/creation-stage.mjs --dir ~/export/class-a --extra-ref ~/handouts \
  --no-solutions --remix-threshold 0.6 --out ~/export/class-a.csv

# Tests
node --test scripts/research/*.test.mjs
```

Other flags: `--shingle-k <n>`, `--no-gallery` (leave gallery projects out of the references), `--hash-ids` (hash the id column too; needs `--salt`).

## Output

CSV (`--out`), one row per program:

| Column | Meaning |
|---|---|
| `id` | Input id (file name or `id` field). Hashed with `--hash-ids`. |
| `author_hash` | First 12 hex characters of HMAC-SHA256(salt, author). Empty when no author was given. |
| `stage` | `empty`, `short`, `unchanged`, `tweak`, `remix` or `original`. |
| `nearest_ref` | Source tag of the nearest reference, such as `missions:CT-1:starterCode`. Identical references are stored once, under the first module that provides them. |
| `similarity` | Containment against the nearest reference, 0 to 1. |
| `novel_share` | Share of the program's shingles found in no reference, 0 to 1. |
| `token_count` | Number of tokens, excluding comments and line breaks. |

The summary on stdout and in `--summary-json` gives counts and percentages per stage, and per author the highest stage reached. Programs without an author are left out of the per-author table.

## Privacy

- Code text is never printed or written. Outputs hold only ids, hashes, stage names, reference tags and numbers.
- Raw author names are never written. If any row has an `author`, the tool refuses to run without `--salt`.
- Keep the salt private and use the same salt across runs that must be linked. A short hash of a small class list can be reversed by anyone who knows the salt.
- If file names or ids contain student names or numbers, use `--hash-ids`.
- The tool reads only the paths given on the command line and the repository's own data files.

---

# 연구 도구: 창작 단계 분류 (한국어 요약)

`creation-stage.mjs`는 교사 연구자가 사용하는 오프라인 스크립트입니다. 학생 코드가 VPyLab이 제공하는 코드(시작 코드, 미션 모범 답안, 예제, 코스와 문서의 코드, 갤러리 프로젝트)에서 얼마나 달라졌는지를 다섯 단계로 분류합니다. 앱 코드를 수정하지 않으며 데이터베이스나 네트워크에 접속하지 않습니다.

## 단계

| 단계 | 이름 | 기준 |
|---|---|---|
| `empty` | 빈 코드 | 주석과 빈 줄을 제외하면 남는 내용이 없습니다. |
| `short` | 판정 보류(너무 짧음) | 제공 코드와 같지 않고, 흔한 조각을 제외하면 비교할 조각이 너무 적습니다. 판정하지 않습니다. |
| `unchanged` | 그대로 실행 | 제공 코드와 토큰이 같습니다. 주석, 빈 줄, 띄어쓰기는 비교하지 않습니다. |
| `tweak` | 값 바꾸기 | 숫자와 문자열만 다릅니다. |
| `remix` | 구조 변형 | 가장 가까운 제공 코드와의 유사도가 기준값 이상입니다. |
| `original` | 창작 | 가장 가까운 제공 코드와의 유사도가 기준값 미만입니다. |

유사도는 학생 코드의 5토큰 조각 가운데 가장 가까운 제공 코드에도 있는 조각의 비율입니다. 계산할 때 두 가지를 적용합니다.

- 제공 코드의 3% 이상에 나오는 흔한 조각(`from vpython import *`, `while True:`와 `rate(...)` 등)은 비교에서 제외합니다. 제외하지 않으면 직접 작성한 코드도 제공 코드와 비슷하다고 나옵니다.
- 숫자와 문자열만 가린 경우와, 프로그램이 스스로 정한 이름(변수, 함수, 매개변수)까지 가린 경우를 각각 계산해 높은 값을 사용합니다. 이름까지 가리지 않으면 변수 이름만 바꾼 코드가 창작으로 분류됩니다.

`novel_share`는 어떤 제공 코드에도 없는 조각의 비율입니다.

## 측정하지 않는 것

- 이 도구는 제공 코드와의 거리를 측정합니다. 창의성, 완성도, 이해 수준은 측정하지 않습니다.
- `original`은 플랫폼이 제공한 코드와 다르다는 뜻입니다. 다른 곳에서 복사한 코드도 `original`로 분류됩니다. 교사가 나눠 준 코드는 `--extra-ref`로 추가합니다.
- 기준값(`SHINGLE_K = 5`, `REMIX_MIN_SIMILARITY = 0.5`, `COMMON_SHINGLE_SHARE = 0.03`, `MIN_DISTINCT_SHINGLES = 8`)은 잠정값입니다. 검증을 거치지 않았고, 실제 학생 코드로 실행해 본 적이 없습니다.
- 결과를 보고하기 전에 표본을 뽑아 두 사람이 같은 정의로 직접 분류하고, 평정자 간 일치도를 계산한 뒤, 도구의 분류와 비교해야 합니다. 기준값을 바꾸었다면 사용한 값을 함께 보고합니다.
- 수업 자료의 코드는 서로 비슷합니다. 수업에서 배운 방식으로 처음부터 작성한 코드가 `remix`로 분류될 수 있습니다. 짧은 코드는 `short`로 두고 판정하지 않으므로 그 수를 함께 보고합니다. 미션을 스스로 풀어 모범 답안과 같아진 코드는 `unchanged`로 분류됩니다. `--no-solutions`로 모범 답안을 제외한 결과와 비교할 수 있습니다.
- 학생별 요약은 그 학생의 코드 가운데 가장 높은 단계를 사용합니다. 저장 시각의 순서는 반영하지 않습니다.

## 입력과 실행

교사가 자신의 학급 자료를 직접 내보냅니다. 입력은 `.py` 파일 폴더(`--dir`) 또는 `{ id, author?, code, savedAt? }` 배열이 담긴 JSON 파일(`--json`)입니다. 내보낸 파일은 저장소 밖에 보관하고 분석이 끝나면 삭제합니다.

```bash
node scripts/research/creation-stage.mjs --list-refs
node scripts/research/creation-stage.mjs --dir <폴더> --out <결과.csv>
node scripts/research/creation-stage.mjs --json <파일.json> --salt "<비공개 문구>" --out <결과.csv> --summary-json <요약.json>
```

## 개인정보

- 코드 본문과 작성자 이름은 출력하지 않습니다. 결과에는 id, 해시, 단계, 참조 이름, 수치만 있습니다.
- `author`가 있으면 `--salt` 없이는 실행되지 않습니다. 솔트는 공개하지 않습니다.
- 파일 이름이나 id에 학생 이름이나 학번이 있으면 `--hash-ids`를 사용합니다.
