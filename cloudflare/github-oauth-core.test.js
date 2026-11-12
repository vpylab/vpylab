// GitHub 토큰 교환 함수 시험. GitHub 호출은 fetch 흉내로 대신합니다.
// 실행: node --test cloudflare/github-oauth-core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GITHUB_TOKEN_URL, MAX_TOKEN_BODY_BYTES, exchangeCode, handleTokenRequest } from './github-oauth-core.js';
import { onRequestPost } from '../functions/api/github/token.js';

const ORIGIN = 'https://vpylab.pages.dev';
const ENV = { GITHUB_CLIENT_ID: 'client-id', GITHUB_CLIENT_SECRET: 'client-secret' };
const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const GOOD = { code: 'abcdef0123456789abcd', redirectUri: `${ORIGIN}/github/callback`, codeVerifier: VERIFIER };

function post(body, headers = {}) {
  return new Request(`${ORIGIN}/api/github/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

/** GitHub 토큰 주소 흉내. 받은 요청을 calls에 남깁니다. */
function fakeGitHub(reply = { access_token: 'gho_token', scope: 'public_repo,repo:invite', token_type: 'bearer' }) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify(reply), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  return { calls, fetchImpl };
}

const run = async (request, env = ENV, github = fakeGitHub()) => {
  const response = await handleTokenRequest(request, env, { fetchImpl: github.fetchImpl });
  return { response, data: await response.json(), github };
};

test('code를 GitHub에 보내 토큰과 범위만 돌려주고, 응답을 캐시하지 않는다', async () => {
  const { response, data, github } = await run(post(GOOD));
  assert.equal(response.status, 200);
  assert.deepEqual(data, { accessToken: 'gho_token', scope: 'public_repo,repo:invite' });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(github.calls.length, 1);
  assert.equal(github.calls[0].url, GITHUB_TOKEN_URL);
  assert.equal(github.calls[0].init.headers.Accept, 'application/json');
  assert.deepEqual(github.calls[0].body, {
    client_id: 'client-id', client_secret: 'client-secret', code: GOOD.code, redirect_uri: GOOD.redirectUri, code_verifier: VERIFIER,
  });
});

test('codeVerifier 없이도 교환하고, GitHub에는 code_verifier를 보내지 않는다', async () => {
  const { response, github } = await run(post({ code: GOOD.code, redirectUri: GOOD.redirectUri }));
  assert.equal(response.status, 200);
  assert.equal('code_verifier' in github.calls[0].body, false);
});

test('다른 출처의 요청과 출처를 알 수 없는 요청은 받지 않는다', async () => {
  for (const headers of [{ Origin: 'https://evil.example' }, { Origin: 'null' }]) {
    const { response, data, github } = await run(post(GOOD, headers));
    assert.equal(response.status, 403);
    assert.equal(data.code, 'bad_origin');
    assert.equal(github.calls.length, 0);
  }
  const noOrigin = new Request(`${ORIGIN}/api/github/token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(GOOD) });
  assert.equal((await run(noOrigin)).response.status, 403);
  const sameSite = new Request(`${ORIGIN}/api/github/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin' }, body: JSON.stringify(GOOD),
  });
  assert.equal((await run(sameSite)).response.status, 200);
});

test('redirectUri가 이 사이트의 /github/callback이 아니면 거절한다', async () => {
  for (const redirectUri of ['https://evil.example/github/callback', `${ORIGIN}/other`, `${ORIGIN}/github/callback?x=1`, undefined]) {
    const { response, data, github } = await run(post({ ...GOOD, redirectUri }));
    assert.equal(response.status, 400, String(redirectUri));
    assert.equal(data.code, 'bad_redirect_uri');
    assert.equal(github.calls.length, 0);
  }
});

test('본문 형식과 크기를 검사한다', async () => {
  const cases = [
    [post('not json'), 400, 'bad_json'],
    [post('[]'), 400, 'bad_json'],
    [post({ ...GOOD, code: '' }), 400, 'bad_code'],
    [post({ ...GOOD, code: 'a b c d e f g h' }), 400, 'bad_code'],
    [post({ ...GOOD, code: 12345678 }), 400, 'bad_code'],
    [post({ ...GOOD, codeVerifier: 'short' }), 400, 'bad_code_verifier'],
    [post({ ...GOOD, codeVerifier: 123 }), 400, 'bad_code_verifier'],
    [post({ ...GOOD, padding: 'x'.repeat(MAX_TOKEN_BODY_BYTES) }), 413, 'body_too_large'],
    [post(GOOD, { 'Content-Type': 'text/plain' }), 415, 'bad_content_type'],
    [post(new URLSearchParams(GOOD).toString(), { 'Content-Type': 'application/x-www-form-urlencoded' }), 415, 'bad_content_type'],
  ];
  for (const [request, status, code] of cases) {
    const { response, data, github } = await run(request);
    assert.equal(response.status, status, code);
    assert.equal(data.code, code);
    assert.equal(github.calls.length, 0);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
});

test('비밀값이 없으면 503과 사유 코드를 돌려주고 GitHub를 호출하지 않는다', async () => {
  for (const env of [{}, { GITHUB_CLIENT_ID: 'only-id' }, { GITHUB_CLIENT_SECRET: 'only-secret' }, undefined]) {
    const github = fakeGitHub();
    const response = await handleTokenRequest(post(GOOD), env, { fetchImpl: github.fetchImpl });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'github_not_configured');
    assert.equal(github.calls.length, 0);
  }
});

test('GitHub가 거절하면 400과 GitHub의 오류 이름만 돌려준다', async () => {
  const github = fakeGitHub({ error: 'bad_verification_code', error_description: 'The code passed is incorrect or expired.' });
  const { response, data } = await run(post(GOOD), ENV, github);
  assert.equal(response.status, 400);
  assert.deepEqual({ code: data.code, reason: data.reason }, { code: 'github_exchange_failed', reason: 'bad_verification_code' });
  assert.equal('accessToken' in data, false);
});

test('클라이언트 비밀값이 틀리면 설정 문제(503)로 알린다', async () => {
  const { response, data } = await run(post(GOOD), ENV, fakeGitHub({ error: 'incorrect_client_credentials' }));
  assert.equal(response.status, 503);
  assert.equal(data.code, 'github_not_configured');
});

test('GitHub에 연결하지 못하면 502', async () => {
  const { response, data } = await run(post(GOOD), ENV, fakeGitHub(new TypeError('fetch failed')));
  assert.equal(response.status, 502);
  assert.equal(data.code, 'github_unreachable');
});

test('토큰·code·비밀값을 기록하지 않고 오류 응답에도 넣지 않는다', async (t) => {
  const logged = [];
  for (const method of ['log', 'error', 'warn', 'info']) t.mock.method(console, method, (...args) => { logged.push(args.join(' ')); });
  const replies = [
    undefined,
    { error: 'bad_verification_code' },
    new TypeError(`network down ${GOOD.code}`),
  ];
  const bodies = [];
  for (const reply of replies) {
    const { data } = await run(post(GOOD), ENV, reply === undefined ? fakeGitHub() : fakeGitHub(reply));
    if (!data.accessToken) bodies.push(JSON.stringify(data));
  }
  const text = `${logged.join('\n')}\n${bodies.join('\n')}`;
  for (const secret of ['gho_token', GOOD.code, 'client-secret', VERIFIER]) assert.equal(text.includes(secret), false, secret);
});

test('D1이 연결되어 있으면 요청 수를 세고, D1에 문제가 있어도 로그인은 진행한다', async () => {
  const counted = [];
  const db = (n) => ({
    prepare: (sql) => ({ bind: (...args) => ({ run: async () => {}, first: async () => { counted.push({ sql, args }); return { n }; } }) }),
  });
  assert.equal((await run(post(GOOD), { ...ENV, DB: db(1) })).response.status, 200);
  assert.equal(counted.length, 1);
  const limited = await run(post(GOOD), { ...ENV, DB: db(121) });
  assert.equal(limited.response.status, 429);
  assert.equal(limited.github.calls.length, 0);
  const broken = { prepare: () => { throw new Error('D1_ERROR: no such table'); } };
  assert.equal((await run(post(GOOD), { ...ENV, DB: broken })).response.status, 200);
});

test('exchangeCode는 범위가 없는 응답도 빈 문자열로 돌려준다', async () => {
  const github = fakeGitHub({ access_token: 'gho_x' });
  assert.deepEqual(await exchangeCode(ENV, GOOD, github.fetchImpl), { accessToken: 'gho_x', scope: '' });
});

test('Pages 함수는 POST만 내보내고 같은 규칙을 적용한다', async () => {
  const response = await onRequestPost({ request: post(GOOD, { Origin: 'https://evil.example' }), env: ENV });
  assert.equal(response.status, 403);
  const unconfigured = await onRequestPost({ request: post(GOOD), env: {} });
  assert.equal(unconfigured.status, 503);
});
