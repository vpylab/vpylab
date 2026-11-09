// 짧은 공유 주소 서버 로직 시험. 실제 SQLite(node:sqlite)에 같은 표를 만들어 D1처럼 감쌉니다.
// 실행: node --test cloudflare/*.test.js (Node 22.13 이상)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  RATE_PER_MINUTE, ShareError, checkRate, createShare, deleteRandomShare, getShare, isValidId, normalizeName, randomId, updateShare,
} from './share-core.js';
import { onRequestPost } from '../functions/api/share/index.js';
import { onRequestDelete, onRequestGet, onRequestPut } from '../functions/api/share/[id].js';

const schema = readFileSync(new URL('./migrations/0001_shares.sql', import.meta.url), 'utf8');

/** node:sqlite를 D1의 prepare().bind().run()/first() 모양으로 감쌉니다. */
function fakeD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(schema);
  return {
    sqlite,
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      const bound = (args) => ({
        run: async () => statement.run(...args),
        first: async () => statement.get(...args) ?? null,
        all: async () => ({ results: statement.all(...args) }),
      });
      return { bind: (...args) => bound(args), ...bound([]) };
    },
  };
}

const rejectsWith = (promise, code) => assert.rejects(promise, (error) => error instanceof ShareError && error.code === code);

test('이름 규칙: 영어 소문자·숫자·하이픈 3~30자만, 대문자는 소문자로', () => {
  assert.equal(normalizeName('  Solar-System '), 'solar-system');
  assert.equal(normalizeName('abc'), 'abc');
  assert.equal(normalizeName('a'.repeat(30)), 'a'.repeat(30));
  for (const bad of ['ab', 'a'.repeat(31), '-abc', 'abc-', 'a--b', '태양계', 'solar_system', 'solar system', 'a.b.c']) {
    assert.throws(() => normalizeName(bad), (e) => e.code === 'name_invalid', bad);
  }
  assert.throws(() => normalizeName('admin'), (e) => e.code === 'name_reserved');
  assert.throws(() => normalizeName('my-sibal-code'), (e) => e.code === 'name_blocked');
  assert.throws(() => normalizeName('f-u-c-k'), (e) => e.code === 'name_blocked');
});

test('무작위 이름은 헷갈리는 글자 없이 6자', () => {
  for (let i = 0; i < 200; i += 1) {
    const id = randomId();
    assert.match(id, /^[a-km-np-z2-9]{6}$/);
    assert.ok(isValidId(id));
  }
  assert.equal(isValidId('../etc'), false);
  assert.equal(isValidId('ab'), false);
});

test('이름 없이 만들면 무작위 6자, 이름을 정하면 그 이름으로 저장되고 읽힌다', async () => {
  const db = fakeD1();
  const random = await createShare(db, { code: 'sphere()', title: '공' });
  assert.match(random.id, /^[a-km-np-z2-9]{6}$/);
  assert.equal(random.url, `/s/${random.id}`);
  assert.equal(random.named, false);
  assert.ok(random.editKey.length >= 30);

  const named = await createShare(db, { code: 'box()', title: '상자', name: 'My-Box' });
  assert.deepEqual({ id: named.id, url: named.url, named: named.named }, { id: 'my-box', url: '/s/my-box', named: true });

  const loaded = await getShare(db, 'MY-BOX');
  assert.equal(loaded.code, 'box()');
  assert.equal(loaded.title, '상자');
  assert.equal(loaded.named, true);
  await rejectsWith(getShare(db, 'nobody-here'), 'not_found');
  await rejectsWith(getShare(db, '../x'), 'not_found');
});

test('수정 열쇠는 해시로만 저장된다', async () => {
  const db = fakeD1();
  const { editKey } = await createShare(db, { code: 'x = 1', name: 'hashed' });
  const row = db.sqlite.prepare('SELECT * FROM shares WHERE id = ?').get('hashed');
  assert.notEqual(row.edit_key_hash, editKey);
  assert.match(row.edit_key_hash, /^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(row).includes(editKey));
});

test('먼저 정한 사람이 이름을 쓰고, 다른 사람은 409', async () => {
  const db = fakeD1();
  await createShare(db, { code: 'a', name: 'taken' });
  await rejectsWith(createShare(db, { code: 'b', name: 'TAKEN' }), 'name_taken');
  assert.equal((await getShare(db, 'taken')).code, 'a');
});

test('고치기는 수정 열쇠가 맞을 때만 된다', async () => {
  const db = fakeD1();
  const { editKey } = await createShare(db, { code: 'old', title: '처음', name: 'mine' });
  await rejectsWith(updateShare(db, 'mine', 'wrong-key-wrong-key-wrong', { code: 'hack' }), 'not_owner');
  await rejectsWith(updateShare(db, 'mine', '', { code: 'hack' }), 'not_owner');
  assert.equal((await getShare(db, 'mine')).code, 'old');
  const updated = await updateShare(db, 'mine', editKey, { code: 'new', title: '고침' });
  assert.equal(updated.url, '/s/mine');
  const loaded = await getShare(db, 'mine');
  assert.equal(loaded.code, 'new');
  assert.equal(loaded.title, '고침');
  await rejectsWith(updateShare(db, 'ghost', editKey, { code: 'x' }), 'not_found');
});

test('무작위 주소는 만든 열쇠로만 지울 수 있고, 정한 이름은 지우지 않는다', async () => {
  const db = fakeD1();
  const random = await createShare(db, { code: 'sphere()' });
  const named = await createShare(db, { code: 'box()', name: 'kept' });
  await rejectsWith(deleteRandomShare(db, random.id, 'wrong-key-wrong-key-wrong'), 'not_owner');
  await rejectsWith(deleteRandomShare(db, random.id, ''), 'not_owner');
  await rejectsWith(deleteRandomShare(db, 'kept', named.editKey), 'named');
  assert.equal((await getShare(db, 'kept')).code, 'box()');

  assert.deepEqual(await deleteRandomShare(db, random.id, random.editKey), { id: random.id, deleted: true });
  await rejectsWith(getShare(db, random.id), 'not_found');
  await rejectsWith(deleteRandomShare(db, random.id, random.editKey), 'not_found');
  await rejectsWith(deleteRandomShare(db, '../x', random.editKey), 'not_found');
});

test('코드 크기와 빈 코드 검사', async () => {
  const db = fakeD1();
  await rejectsWith(createShare(db, { code: '' }), 'code_missing');
  await rejectsWith(createShare(db, { code: 'x'.repeat(50_001) }), 'code_too_large');
  const ok = await createShare(db, { code: 'x'.repeat(50_000) });
  assert.equal((await getShare(db, ok.id)).code.length, 50_000);
});

test('제목은 제어 문자를 지우고 200자로 자른다', async () => {
  const db = fakeD1();
  const { id } = await createShare(db, { code: 'a', title: `줄\n바꿈${'가'.repeat(300)}` });
  const { title } = await getShare(db, id);
  assert.equal(title.length, 200);
  assert.ok(!title.includes('\n'));
});

test('같은 IP는 1분에 RATE_PER_MINUTE(120)개까지, 다음 분에는 다시 된다. IP 원문은 저장하지 않는다', async () => {
  const db = fakeD1();
  const t0 = Date.UTC(2026, 10, 9, 10, 0, 5);
  for (let i = 0; i < RATE_PER_MINUTE; i += 1) await checkRate(db, '203.0.113.7', 'salt', t0);
  await rejectsWith(checkRate(db, '203.0.113.7', 'salt', t0), 'rate_limited');
  await checkRate(db, '198.51.100.1', 'salt', t0); // 다른 IP는 영향 없음
  await checkRate(db, '203.0.113.7', 'salt', t0 + 60_000);
  const rows = db.sqlite.prepare('SELECT * FROM share_rate').all();
  assert.ok(!JSON.stringify(rows).includes('203.0.113.7'));
  await checkRate(db, '203.0.113.7', 'salt', t0 + 5 * 60_000);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM share_rate').get().n, 1); // 지난 분의 줄은 지움
});

// ── Pages 함수(HTTP) ──

const ORIGIN = 'https://vpylab.pages.dev';
const post = (body, headers = {}) => new Request(`${ORIGIN}/api/share`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, 'CF-Connecting-IP': '203.0.113.9', ...headers }, body: JSON.stringify(body),
});

test('HTTP: 만들기 → 읽기 → 열쇠로 고치기', async () => {
  const env = { DB: fakeD1() };
  const created = await onRequestPost({ request: post({ code: 'sphere()', title: '공', name: 'ball' }), env });
  assert.equal(created.status, 201);
  assert.equal(created.headers.get('Cache-Control'), 'no-store');
  const { id, url, editKey } = await created.json();
  assert.equal(url, '/s/ball');

  const read = await onRequestGet({ params: { id }, env });
  assert.equal(read.status, 200);
  assert.equal((await read.json()).code, 'sphere()');

  const put = (key) => onRequestPut({
    request: new Request(`${ORIGIN}/api/share/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Authorization: `Bearer ${key}` }, body: JSON.stringify({ code: 'box()' }),
    }),
    params: { id },
    env,
  });
  assert.equal((await put('x'.repeat(32))).status, 403);
  assert.equal((await put(editKey)).status, 200);
  assert.equal((await (await onRequestGet({ params: { id }, env })).json()).code, 'box()');
});

test('HTTP: 무작위 주소 지우기(DELETE)는 같은 출처와 열쇠를 확인한다', async () => {
  const env = { DB: fakeD1() };
  const { id, editKey } = await (await onRequestPost({ request: post({ code: 'sphere()' }), env })).json();
  const del = (key, origin = ORIGIN) => onRequestDelete({
    request: new Request(`${ORIGIN}/api/share/${id}`, { method: 'DELETE', headers: { Origin: origin, Authorization: `Bearer ${key}` } }),
    params: { id },
    env,
  });
  assert.equal((await del(editKey, 'https://evil.example')).status, 403);
  assert.equal((await del('x'.repeat(32))).status, 403);
  const ok = await del(editKey);
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { id, deleted: true });
  assert.equal((await onRequestGet({ params: { id }, env })).status, 404);
});

test('HTTP: 오류는 상태 코드와 한국어 안내로 돌려준다', async () => {
  const env = { DB: fakeD1() };
  await onRequestPost({ request: post({ code: 'a', name: 'dup' }), env });
  const taken = await onRequestPost({ request: post({ code: 'b', name: 'dup' }), env });
  assert.equal(taken.status, 409);
  assert.equal((await taken.json()).code, 'name_taken');

  const foreign = await onRequestPost({ request: post({ code: 'a' }, { Origin: 'https://evil.example' }), env });
  assert.equal(foreign.status, 403);

  const broken = await onRequestPost({
    request: new Request(`${ORIGIN}/api/share`, { method: 'POST', headers: { Origin: ORIGIN }, body: '{not json' }), env,
  });
  assert.equal(broken.status, 400);

  const missing = await onRequestGet({ params: { id: 'zzzzzz' }, env });
  assert.equal(missing.status, 404);
  assert.match((await missing.json()).error, /찾을 수 없습니다/);

  const noDb = await onRequestGet({ params: { id: 'zzzzzz' }, env: {} });
  assert.equal(noDb.status, 503);
});

test('HTTP: 고치기(PUT)도 IP 요청 제한을 받는다 (3-way #9)', async () => {
  const env = { DB: fakeD1() };
  const created = await (await onRequestPost({ request: post({ code: 'a', name: 'limited' }), env })).json();
  const put = () => onRequestPut({
    request: new Request(`${ORIGIN}/api/share/limited`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Authorization: `Bearer ${created.editKey}`, 'CF-Connecting-IP': '203.0.113.9' }, body: JSON.stringify({ code: 'b' }),
    }),
    params: { id: 'limited' },
    env,
  });
  let last;
  for (let i = 0; i < RATE_PER_MINUTE; i += 1) last = await put(); // 만들기 1회 + 고치기 (한도-1)회까지는 통과
  expect429(last);
});

test('HTTP: 무작위 주소 지우기(DELETE)는 공유 요청 제한을 쓰지 않는다 (아르곤 안정성 점검)', async () => {
  const env = { DB: fakeD1() };
  const made = [];
  const headers = { 'Content-Type': 'application/json', Origin: ORIGIN, 'CF-Connecting-IP': '203.0.113.20' };
  for (let i = 0; i < RATE_PER_MINUTE; i += 1) {
    const res = await onRequestPost({ request: new Request(`${ORIGIN}/api/share`, { method: 'POST', headers, body: JSON.stringify({ code: `c${i}` }) }), env });
    made.push(await res.json());
  }
  const limited = await onRequestPost({ request: new Request(`${ORIGIN}/api/share`, { method: 'POST', headers, body: JSON.stringify({ code: 'over' }) }), env });
  assert.equal(limited.status, 429);
  const del = await onRequestDelete({
    request: new Request(`${ORIGIN}/api/share/${made[0].id}`, { method: 'DELETE', headers: { Origin: ORIGIN, 'CF-Connecting-IP': '203.0.113.20', Authorization: `Bearer ${made[0].editKey}` } }),
    params: { id: made[0].id },
    env,
  });
  assert.equal(del.status, 200);
});

function expect429(response) {
  assert.equal(response.status, 429);
}
