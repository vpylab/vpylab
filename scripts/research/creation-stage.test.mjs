import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  tokenize, exactTokens, maskedTokens, shingles, buildCorpus, classify, classifyAll, summarize, toCsv,
  hashAuthor, harvestStrings, harvestAppReferences, looksLikePython, main, parseArgs,
  STAGES, STAGE_ORDER, REMIX_MIN_SIMILARITY, SHINGLE_K, DATA_DIR, definedNames, renamedTokens, MIN_DISTINCT_SHINGLES,
} from './creation-stage.mjs';

const texts = (code) => exactTokens(tokenize(code));

const REF_BALL = `from vpython import *

# 공을 만들고 움직입니다
ball = sphere(pos=vector(0, 0, 0), radius=0.5, color=color.cyan)
ball.velocity = vector(1, 0, 0)
dt = 0.01
while True:
    rate(100)
    ball.pos = ball.pos + ball.velocity * dt
    if abs(ball.pos.x) > 5:
        ball.velocity.x = -ball.velocity.x
`;
const REF_SOUND = `from vpython import *
음표("도", 0.5)
음표("미", 0.5)
화음(["도", "미", "솔"], 1)
label(text="끝", pos=vector(0, 1, 0))
`;
const corpus = () => buildCorpus([
  { ref: 'synthetic:ball:code', code: REF_BALL },
  { ref: 'synthetic:sound:code', code: REF_SOUND },
]);

test('tokenizer drops comments and blank lines', () => {
  assert.deepEqual(texts('# 주석\n\nx = 1  # 뒤쪽 주석\n\n\ny = 2\n'), ['x', '=', '1', 'NL', 'y', '=', '2']);
  assert.deepEqual(texts('x = 1\ny = 2'), texts('x   =   1\n\n\n# c\ny=2\n'));
});

test('tokenizer keeps # inside strings', () => {
  const t = tokenize('c = "#ff0000"  # 빨강\nprint(\'a # b\')');
  assert.deepEqual(t.filter((x) => x.type === 'str').map((x) => x.text), ['"#ff0000"', "'a # b'"]);
  assert.equal(t.some((x) => x.text.includes('빨강')), false);
});

test('tokenizer treats triple-quoted and prefixed strings as one token', () => {
  const t = tokenize('s = """여러 줄\n# 주석 아님\n"끝" """\nname = f"{x:>3} # {y}"\nr = rb\'\\d+\'\nq = "a\\"b"');
  const strs = t.filter((x) => x.type === 'str');
  assert.equal(strs.length, 4);
  assert.ok(strs[0].text.startsWith('"""') && strs[0].text.endsWith('"""'));
  assert.ok(strs[1].text.startsWith('f"'));
  assert.ok(strs[2].text.startsWith('rb'));
  assert.equal(strs[3].text, '"a\\"b"');
  assert.deepEqual(t.filter((x) => x.type === 'id').map((x) => x.text), ['s', 'name', 'r', 'q']);
});

test('tokenizer handles Korean identifiers and Korean API names', () => {
  assert.deepEqual(texts('공 = sphere()\n음표("도", 0.5)\n화음(["도", "미"])\n반지름_2 = 3'),
    ['공', '=', 'sphere', '(', ')', 'NL', '음표', '(', '"도"', ',', '0.5', ')', 'NL', '화음', '(', '[', '"도"', ',', '"미"', ']', ')', 'NL', '반지름_2', '=', '3']);
});

test('tokenizer handles numbers, operators and bracket continuation', () => {
  assert.deepEqual(texts('a **= 2\nb = 0x1F + 1e-3 + .5 + 1_000\nc = a // 2 != b'),
    ['a', '**=', '2', 'NL', 'b', '=', '0x1F', '+', '1e-3', '+', '.5', '+', '1_000', 'NL', 'c', '=', 'a', '//', '2', '!=', 'b']);
  // 괄호 안 줄바꿈은 논리 줄을 나누지 않습니다.
  assert.deepEqual(texts('box(pos=vector(0,\n    1, 2),\n  size=s)'), texts('box(pos=vector(0, 1, 2), size=s)'));
  assert.deepEqual(texts('a.b.c(1)'), ['a', '.', 'b', '.', 'c', '(', '1', ')']);
});

test('masking replaces number and string literals only', () => {
  const t = tokenize('ball = sphere(radius=0.5, texture="wood")\nflag = True');
  assert.deepEqual(maskedTokens(t), ['ball', '=', 'sphere', '(', 'radius', '=', 'NUM', ',', 'texture', '=', 'STR', ')', 'NL', 'flag', '=', 'True']);
  assert.deepEqual(maskedTokens(tokenize('x = 1')), maskedTokens(tokenize('x = 99.5')));
  assert.notDeepEqual(maskedTokens(tokenize('x = 1')), maskedTokens(tokenize('y = 1')));
});

test('shingles: short programs become one shingle', () => {
  assert.equal(shingles(['a', 'b'], 5).size, 1);
  assert.equal(shingles(['a', 'b', 'c', 'd', 'e', 'f'], 5).size, 2);
  assert.equal(shingles([], 5).size, 0);
});

test('stage unchanged: same tokens, different comments and spacing', () => {
  const student = REF_BALL.replace('# 공을 만들고 움직입니다', '# 내가 실행해 봄').replace('dt = 0.01', 'dt=0.01   # 시간 간격');
  const r = classify(student, corpus());
  assert.equal(r.stage, 'unchanged');
  assert.equal(r.nearestRef, 'synthetic:ball:code');
  assert.equal(r.similarity, 1);
  assert.equal(r.novelShare, 0);
});

test('stage tweak: only numbers or strings changed', () => {
  const r1 = classify(REF_BALL.replace('radius=0.5', 'radius=2').replace('rate(100)', 'rate(30)'), corpus());
  assert.equal(r1.stage, 'tweak');
  assert.equal(r1.nearestRef, 'synthetic:ball:code');
  const r2 = classify(REF_SOUND.replace('"도", 0.5', '"레", 1'), corpus());
  assert.equal(r2.stage, 'tweak');
  assert.equal(r2.nearestRef, 'synthetic:sound:code');
});

test('stage remix: structure changed but most of the code comes from a reference', () => {
  const student = `${REF_BALL}    if abs(ball.pos.y) > 5:\n        ball.velocity.y = -ball.velocity.y\n`;
  const r = classify(student, corpus());
  assert.equal(r.stage, 'remix');
  assert.equal(r.nearestRef, 'synthetic:ball:code');
  assert.ok(r.similarity >= REMIX_MIN_SIMILARITY && r.similarity < 1);
  assert.ok(r.novelShare > 0 && r.novelShare < 0.5);
});

test('stage original: little overlap with any reference', () => {
  const student = `from vpython import *
import random
별들 = []
for i in range(40):
    별 = sphere(pos=vector(random.uniform(-5, 5), random.uniform(-5, 5), 0), radius=0.1)
    별들.append(별)
def 반짝(목록):
    for 항목 in 목록:
        항목.opacity = random.random()
while True:
    rate(10)
    반짝(별들)
`;
  const r = classify(student, corpus());
  assert.equal(r.stage, 'original');
  assert.ok(r.similarity < REMIX_MIN_SIMILARITY);
  assert.ok(r.novelShare > 0.5);
});

test('threshold override moves the remix/original boundary; empty code has its own stage', () => {
  const student = `${REF_BALL}    if abs(ball.pos.y) > 5:\n        ball.velocity.y = -ball.velocity.y\n`;
  assert.equal(classify(student, corpus(), { remixThreshold: 0.99 }).stage, 'original');
  assert.equal(classify('# 주석만\n\n', corpus()).stage, 'empty');
  assert.deepEqual(STAGE_ORDER, ['empty', 'short', 'unchanged', 'tweak', 'remix', 'original']);
  for (const s of STAGE_ORDER) assert.ok(STAGES[s].ko && STAGES[s].en);
  assert.ok(SHINGLE_K >= 4 && SHINGLE_K <= 5);
});

test('harvestStrings finds code in nested, per-locale and step structures', () => {
  const data = [{ id: 'm1', title: '설명만 있는 글\n(코드 아님)', starterCode: REF_BALL, steps: [{ id: 's1', code: { ko: REF_SOUND, en: REF_SOUND.replace('끝', 'end') } }], signature: 'sphere(\n pos=vector\n)' }];
  const found = harvestStrings(data, 'mod');
  assert.deepEqual(found.map((f) => f.ref), ['mod:m1:starterCode', 'mod:m1/s1:code.ko', 'mod:m1/s1:code.en']);
  assert.equal(looksLikePython('그냥 문장입니다.\n두 번째 줄 (괄호).', 'description'), false);
});

test('author hashing is salted, stable and refuses to run without a salt', () => {
  const h = hashAuthor('김학생', 'salt-a');
  assert.match(h, /^[0-9a-f]{12}$/);
  assert.equal(h, hashAuthor('김학생', 'salt-a'));
  assert.notEqual(h, hashAuthor('김학생', 'salt-b'));
  assert.notEqual(h, hashAuthor('이학생', 'salt-a'));
  assert.throws(() => hashAuthor('김학생', ''), /--salt/);
  assert.throws(() => classifyAll([{ id: 'a', author: '김학생', code: REF_BALL }], corpus()), /--salt/);
  // 작성자가 없으면 솔트 없이 실행됩니다.
  assert.equal(classifyAll([{ id: 'a', code: REF_BALL }], corpus())[0].author_hash, '');
});

test('CSV and summary contain no code text or raw author names', () => {
  const subs = [
    { id: 'p1', author: '김학생', code: REF_BALL },
    { id: 'p2', author: '김학생', code: REF_BALL.replace('0.5', '3') },
    { id: 'p3', author: '이학생', code: `${REF_BALL}    if abs(ball.pos.y) > 5:\n        ball.velocity.y = -ball.velocity.y\n` },
    { id: 'p4', author: '박학생', code: 'secret_marker_variable = "비밀문자열"\nprint(secret_marker_variable, 12345.678)\nfor secret_index in range(3):\n    print(secret_index * 12345.678, secret_marker_variable)\n' },
    { id: 'p5', code: REF_SOUND },
  ];
  const rows = classifyAll(subs, corpus(), { salt: 's' });
  const csv = toCsv(rows);
  const summary = summarize(rows);
  const all = csv + JSON.stringify(summary);
  for (const leak of ['김학생', '이학생', '박학생', 'secret_marker_variable', '비밀문자열', '12345.678', 'sphere(', 'velocity']) assert.equal(all.includes(leak), false, leak);
  const lines = csv.trim().split('\n');
  assert.equal(lines[0], 'id,author_hash,stage,nearest_ref,similarity,novel_share,token_count');
  assert.equal(lines.length, 6);
  assert.deepEqual(rows.map((r) => r.stage), ['unchanged', 'tweak', 'remix', 'original', 'unchanged']);
  // 학생별 최고 단계: 김학생=tweak, 이학생=remix, 박학생=original. 작성자 없는 p5는 제외.
  assert.equal(summary.authors.total, 3);
  const best = Object.fromEntries(summary.authors.byHighestStage.map((r) => [r.stage, r.count]));
  assert.deepEqual([best.tweak, best.remix, best.original, best.unchanged], [1, 1, 1, 0]);
  assert.equal(summary.programs.byStage.find((r) => r.stage === 'unchanged').percent, 40);
});

test('CLI refuses authors without --salt and writes outputs with it', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'creation-stage-'));
  try {
    const json = path.join(dir, 'in.json');
    const out = path.join(dir, 'out.csv');
    const sum = path.join(dir, 'sum.json');
    fs.writeFileSync(json, JSON.stringify([{ id: 'a', author: '김학생', code: 'x_unique_name = 1\nprint(x_unique_name)\n' }]));
    const logs = [];
    const io = { log: (m) => logs.push(m), error: (m) => logs.push(m) };
    assert.equal(await main(['--json', json, '--out', out], io), 2);
    assert.equal(fs.existsSync(out), false);
    assert.match(logs.join('\n'), /--salt/);
    assert.equal(await main(['--json', json, '--salt', 'pepper', '--out', out, '--summary-json', sum], io), 0);
    const text = fs.readFileSync(out, 'utf8') + fs.readFileSync(sum, 'utf8') + logs.join('\n');
    assert.equal(text.includes('김학생'), false);
    assert.equal(text.includes('x_unique_name'), false);
    assert.equal(JSON.parse(fs.readFileSync(sum, 'utf8')).provisional, true);
    assert.throws(() => parseArgs(['--remix-threshold', '2']));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('real corpus: harvest is non-trivial; a shipped starter is unchanged, a changed number is tweak', async () => {
  const harvest = await harvestAppReferences();
  const real = buildCorpus(harvest.items);
  assert.ok(real.refs.length > 50, `references: ${real.refs.length}`);
  const modules = new Set(real.refs.map((r) => r.module));
  for (const m of ['missions', 'examples', 'docs', 'courses', 'default-code']) assert.ok(modules.has(m), m);

  const { DEFAULT_CODE } = await import(new URL(`file://${path.join(DATA_DIR, 'default-code.js')}`).href);
  const same = classify(DEFAULT_CODE, real);
  assert.equal(same.stage, 'unchanged');
  assert.match(same.nearestRef, /^default-code/);
  const changed = classify(DEFAULT_CODE.replace('radius=0.5', 'radius=1.75').replace('rate(100)', 'rate(60)'), real);
  assert.equal(changed.stage, 'tweak');

  const missions = (await import(new URL(`file://${path.join(DATA_DIR, 'missions.js')}`).href)).default;
  const starter = missions.find((m) => typeof m.starterCode === 'string' && tokenize(m.starterCode).length > 20).starterCode;
  assert.equal(classify(`# 학생이 주석만 추가\n${starter}`, real).stage, 'unchanged');

  // 해법을 빼면 참조 수가 줄어듭니다.
  const noSolutions = buildCorpus((await harvestAppReferences({ solutions: false })).items);
  assert.ok(noSolutions.refs.length < real.refs.length);
  assert.equal(noSolutions.refs.some((r) => /solution/i.test(r.ref)), false);
});

test('definedNames finds assigned names, loop variables, functions and parameters but not keyword arguments', () => {
  const names = definedNames(tokenize(`공 = sphere(pos=vector(0, 0, 0), radius=1)
for i, 항목 in enumerate(목록):
    항목.color = color.red
def 반짝(대상, 세기=1, *나머지):
    return 대상
import math as m
`));
  assert.deepEqual([...names].sort(), ['i', 'm', '공', '나머지', '대상', '반짝', '세기', '항목'].sort());
  assert.equal(names.has('pos'), false);
  assert.equal(names.has('radius'), false);
  assert.equal(names.has('목록'), false);
  assert.equal(renamedTokens(tokenize('공 = 1\n공.x = 2')).join(' '), 'ID = NUM NL ID . x = NUM');
});

test('renaming every variable is still remix, not original', () => {
  const renamed = REF_BALL.replaceAll('ball', '공').replaceAll('dt', '간격').replace('0.5', '2');
  const r = classify(renamed, corpus());
  assert.equal(r.stage, 'remix');
  assert.equal(r.nearestRef, 'synthetic:ball:code');
  assert.equal(r.similarity, 1);
});

test('boilerplate shared by many references does not make hand-written code look copied', () => {
  // 모든 참조가 같은 머리(가져오기, 장면 설정, 반복 틀)를 갖고 몸통만 다릅니다.
  const head = 'from vpython import *\nscene.background = color.black\nscene.range = 5\n';
  const loop = (body) => `${head}while True:\n    rate(100)\n${body}`;
  const items = ['box', 'cone', 'ring', 'arrow', 'cylinder', 'pyramid'].map((shape, n) => ({
    ref: `synthetic:${shape}`,
    code: loop(`    ${shape}_${n} = ${shape}(pos=vector(${n}, 0, 0))\n    ${shape}_${n}.rotate(angle=0.1, axis=vector(0, ${n + 1}, 0))\n    ${shape}_${n}.visible = ${shape}_${n}.pos.x > ${n}\n`),
  }));
  const student = loop(`    별 = sphere(radius=random())\n    별.opacity = sin(scene.range) / 2 + 0.5\n    목록 = [별.opacity, 별.radius]\n    print(max(목록), min(목록), len(목록))\n    sleep(max(목록) * 0.2 + 0.1)\n`);
  const withFilter = classify(student, buildCorpus(items, { commonShare: 0.5 }));
  const withoutFilter = classify(student, buildCorpus(items, { commonShare: 1.1 }));
  assert.equal(withFilter.stage, 'original');
  assert.ok(withFilter.similarity < withoutFilter.similarity, `${withFilter.similarity} < ${withoutFilter.similarity}`);
});

test('very short programs are held back as short instead of being judged', () => {
  const r = classify('from vpython import *\nbox()\n', corpus());
  assert.equal(r.stage, 'short');
  assert.ok(MIN_DISTINCT_SHINGLES >= 5);
  assert.equal(STAGES.short.rank, 0);
});

