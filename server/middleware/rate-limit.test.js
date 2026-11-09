import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import {
  RATE_LIMITS, rateLimitKey, createIpLimiter, createReadLimiter, createWriteLimiter, createPublishLimiter, createAnonymousLimiter,
} from './rate-limit.js';

/** 운영 라우트와 같은 순서(IP 층 → 인증 → 사용자 층)로 조립한 시험용 앱 */
async function appFixture(t, { ip = 600 } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/api', createIpLimiter({ limit: ip }));
  // 시험용 인증: X-User 헤더가 있으면 로그인 사용자로 봅니다.
  const fakeAuth = (req, res, next) => {
    const id = req.headers['x-user'];
    if (!id) return res.status(401).json({ error: '로그인이 필요합니다.' });
    req.supabaseUser = { id: String(id) };
    next();
  };
  const read = createReadLimiter(), write = createWriteLimiter(), publish = createPublishLimiter();
  app.get('/api/read', fakeAuth, read, (req, res) => res.json({ ok: true }));
  app.post('/api/write', fakeAuth, write, (req, res) => res.json({ ok: true }));
  app.post('/api/publish', fakeAuth, publish, (req, res) => res.json({ ok: true }));
  app.post('/api/share', createAnonymousLimiter({ limit: 60, scope: '공유 링크 생성' }), (req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((done) => server.close(done)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const call = (path, { method = 'GET', user, ip: forwarded = '203.0.113.10' } = {}) => fetch(origin + path, {
    method,
    headers: { 'x-forwarded-for': forwarded, ...(user ? { 'x-user': user } : {}) },
  });
  return { call };
}

test('기본 한도는 교실(같은 IP 30명) 기준으로 정해져 있다', () => {
  assert.equal(RATE_LIMITS.ipPerMinute, 600);
  assert.equal(RATE_LIMITS.userReadPerMinute, 120);
  assert.equal(RATE_LIMITS.userWritePerMinute, 30);
  assert.equal(RATE_LIMITS.userPublishPerMinute, 3);
  assert.equal(RATE_LIMITS.anonymousSharePerMinute, 120); // 무작위 주소 + 이름 정하기를 30명이 1분 안에
});

test('키는 로그인 사용자면 사용자 ID, 아니면 IP로 만든다', () => {
  assert.equal(rateLimitKey({ supabaseUser: { id: 'u-1' }, ip: '203.0.113.10' }), 'user:u-1');
  assert.equal(rateLimitKey({ ip: '203.0.113.10' }), 'ip:203.0.113.10');
  // IPv6는 /56 묶음으로 키를 만들어 주소를 바꿔 가며 우회하지 못하게 합니다.
  assert.equal(rateLimitKey({ ip: '2001:db8:abcd:1234::1' }), rateLimitKey({ ip: '2001:db8:abcd:1200::9' }));
});

test('같은 IP의 학생 30명이 각자 20번 저장해도 막히지 않는다', async (t) => {
  const { call } = await appFixture(t);
  const statuses = [];
  for (let student = 0; student < 30; student++) {
    for (let n = 0; n < 20; n++) statuses.push((await call('/api/write', { method: 'POST', user: `student-${student}` })).status);
  }
  assert.ok(statuses.every((status) => status === 200), `429가 ${statuses.filter((s) => s === 429).length}건 발생`);
  // 600회를 넘긴 다음 요청은 IP 층에서 막힙니다.
  const over = await call('/api/write', { method: 'POST', user: 'student-0' });
  assert.equal(over.status, 429);
  assert.match((await over.json()).error, /같은 네트워크/);
});

test('쓰기 한도는 사용자별이라 한 학생이 다 써도 다른 학생은 영향이 없다', async (t) => {
  const { call } = await appFixture(t);
  for (let n = 0; n < 30; n++) assert.equal((await call('/api/write', { method: 'POST', user: 'heavy' })).status, 200);
  const blocked = await call('/api/write', { method: 'POST', user: 'heavy' });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get('ratelimit-policy'), '30;w=60');
  assert.match((await blocked.json()).error, /저장 분당 30회/);
  assert.equal((await call('/api/write', { method: 'POST', user: 'other' })).status, 200);
  // 읽기는 다른 한도(120회)를 쓰므로 쓰기를 다 쓴 학생도 조회는 됩니다.
  assert.equal((await call('/api/read', { user: 'heavy' })).status, 200);
});

test('발행은 사용자별 분당 3회를 유지한다', async (t) => {
  const { call } = await appFixture(t);
  for (let n = 0; n < 3; n++) assert.equal((await call('/api/publish', { method: 'POST', user: 'a' })).status, 200);
  assert.equal((await call('/api/publish', { method: 'POST', user: 'a' })).status, 429);
  assert.equal((await call('/api/publish', { method: 'POST', user: 'b' })).status, 200);
});

test('로그인하지 않은 요청은 401로 끝나고 사용자 한도를 깎지 않는다', async (t) => {
  const { call } = await appFixture(t);
  for (let n = 0; n < 40; n++) assert.equal((await call('/api/write', { method: 'POST' })).status, 401);
  assert.equal((await call('/api/write', { method: 'POST', user: 'late' })).status, 200);
});

test('비로그인 공유 링크 생성은 IP 기준 분당 60회다', async (t) => {
  const { call } = await appFixture(t);
  for (let n = 0; n < 60; n++) assert.equal((await call('/api/share', { method: 'POST' })).status, 200);
  assert.equal((await call('/api/share', { method: 'POST' })).status, 429);
  assert.equal((await call('/api/share', { method: 'POST', ip: '198.51.100.7' })).status, 200);
});

test('운영 라우트는 사용자 층 제한을 인증 뒤에 둔다', () => {
  const read = (name) => readFileSync(fileURLToPath(new URL(`../routes/${name}`, import.meta.url)), 'utf8');
  for (const [file, limiters] of [['projects.js', ['readLimiter', 'writeLimiter']], ['sync.js', ['syncLimiter']], ['publish.js', ['publishLimiter']]]) {
    const source = read(file);
    assert.ok(!source.includes("from 'express-rate-limit'"), `${file}는 공통 미들웨어를 써야 합니다.`);
    for (const line of source.split('\n').filter((l) => /^router\.(get|post|put|delete)\(/.test(l))) {
      for (const limiter of limiters) {
        if (!line.includes(limiter) || !line.includes('requireSupabaseUser')) continue;
        assert.ok(line.indexOf('requireSupabaseUser') < line.indexOf(limiter), `${file}: ${line.slice(0, 60)}`);
      }
    }
  }
  const index = readFileSync(fileURLToPath(new URL('../index.js', import.meta.url)), 'utf8');
  assert.ok(index.includes("app.use('/api', createIpLimiter())"), 'IP 층은 /api 전체에 한 번 적용합니다.');
});
