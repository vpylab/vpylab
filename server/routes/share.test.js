// 수업용 판 공유 API 시험. Supabase REST를 메모리 표로 흉내 냅니다.
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';

const nativeFetch = globalThis.fetch;
const prior = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY, limit: process.env.RATE_LIMIT_SHARE_PER_MINUTE };
process.env.SUPABASE_URL = 'https://share-route-test.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.RATE_LIMIT_SHARE_PER_MINUTE = '1000';

let tables;
let failKeyInsert = false;

const json = (body, status = 200) => new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** PostgREST 필터(?col=eq.value)만 해석하는 작은 흉내 */
function filters(url) {
  return [...url.searchParams.entries()].filter(([k]) => !['select', 'columns', 'on_conflict'].includes(k)).map(([k, v]) => [k, v.replace(/^eq\./, '')]);
}
const matches = (row, fs) => fs.every(([k, v]) => String(row[k]) === v);

globalThis.fetch = async (input, options = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (url.hostname === '127.0.0.1') return nativeFetch(input, options);
  const table = url.pathname.split('/').pop();
  const rows = tables[table];
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  const single = (headers.get('accept') || '').includes('vnd.pgrst.object');
  const pick = (list) => {
    if (!single) return json(list);
    if (list.length === 1) return json(list[0]);
    return json({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: 'The result contains 0 rows' }, 406);
  };
  const fs = filters(url);
  if (method === 'POST') {
    const body = JSON.parse(options.body);
    const items = Array.isArray(body) ? body : [body];
    if (table === 'vpylab_share_keys' && failKeyInsert) return json({ code: 'XX000', message: 'fixture failure' }, 500);
    const pk = table === 'vpylab_shares' ? 'id' : 'share_id';
    for (const item of items) {
      if (rows.some((r) => r[pk] === item[pk])) return json({ code: '23505', message: 'duplicate key value violates unique constraint' }, 409);
    }
    rows.push(...items.map((i) => ({ ...i })));
    return json(null, 201);
  }
  if (method === 'GET') return pick(rows.filter((r) => matches(r, fs)));
  if (method === 'PATCH') {
    const patch = JSON.parse(options.body);
    const hit = rows.filter((r) => matches(r, fs));
    hit.forEach((r) => Object.assign(r, patch));
    return pick(hit);
  }
  if (method === 'DELETE') {
    tables[table] = rows.filter((r) => !matches(r, fs));
    return json(null, 204);
  }
  return json({ message: 'unexpected' }, 400);
};

const { default: share } = await import('./share.js');
let server, base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/share', share);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api/share`;
});
after(() => {
  server?.close();
  globalThis.fetch = nativeFetch;
  for (const [k, v] of Object.entries({ SUPABASE_URL: prior.url, SUPABASE_SERVICE_ROLE_KEY: prior.key, RATE_LIMIT_SHARE_PER_MINUTE: prior.limit })) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});
beforeEach(() => { tables = { vpylab_shares: [], vpylab_share_keys: [] }; failKeyInsert = false; });

const post = (body) => nativeFetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const put = (id, key, body) => nativeFetch(`${base}/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify(body) });

test('이름 없이 만들면 지금처럼 무작위 8자 주소를 주고, 수정 열쇠는 해시로만 남긴다', async () => {
  const res = await post({ code: 'sphere()', title: '공' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.match(data.id, /^[A-Za-z0-9_-]{8}$/);
  assert.equal(data.url, `/s/${data.id}`);
  assert.equal(data.named, false);
  assert.ok(data.editKey.length >= 30);
  assert.equal(tables.vpylab_shares[0].named, false);
  assert.match(tables.vpylab_share_keys[0].edit_key_hash, /^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(tables).includes(data.editKey));
});

test('이름을 정하면 그 이름으로 저장되고, 같은 이름은 409, 규칙 위반은 400', async () => {
  const res = await post({ code: 'box()', title: '상자', name: ' My-Box ' });
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json().then(({ id, url, named }) => ({ id, url, named })), { id: 'my-box', url: '/s/my-box', named: true });

  const taken = await post({ code: 'x', name: 'my-box' });
  assert.equal(taken.status, 409);
  assert.equal((await taken.json()).code, 'name_taken');
  assert.equal(tables.vpylab_shares.find((r) => r.id === 'my-box').code, 'box()');

  for (const [name, code] of [['ab', 'name_invalid'], ['admin', 'name_reserved'], ['my-sibal', 'name_blocked']]) {
    const bad = await post({ code: 'x', name });
    assert.equal(bad.status, 400, name);
    assert.equal((await bad.json()).code, code);
  }
});

test('수정 열쇠가 맞을 때만 내용을 바꾼다', async () => {
  const { editKey } = await (await post({ code: 'old', title: '처음', name: 'mine' })).json();
  assert.equal((await put('mine', 'wrong-wrong-wrong-wrong', { code: 'hack' })).status, 403);
  assert.equal((await put('mine', '', { code: 'hack' })).status, 403);
  assert.equal(tables.vpylab_shares[0].code, 'old');

  const ok = await put('mine', editKey, { code: 'new', title: '고침' });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { id: 'mine', url: '/s/mine', named: true });
  assert.equal(tables.vpylab_shares[0].code, 'new');
  assert.equal(tables.vpylab_shares[0].title, '고침');

  assert.equal((await put('ghost', editKey, { code: 'x' })).status, 404);
});

test('열쇠를 남기지 못하면 공유 행도 지워 이름이 묶이지 않는다', async () => {
  failKeyInsert = true;
  const res = await post({ code: 'x', name: 'orphan' });
  assert.equal(res.status, 500);
  assert.equal(tables.vpylab_shares.length, 0);
});

test('코드 검사는 그대로: 빈 코드 400, 50KB 초과 400', async () => {
  assert.equal((await post({ code: '' })).status, 400);
  assert.equal((await post({ code: 'x'.repeat(50_001) })).status, 400);
});
