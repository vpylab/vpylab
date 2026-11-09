// Vercel 중계가 보낸 학생 IP를 비밀값이 맞을 때만 믿는지 시험합니다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientIp, proxyClientIp } from './proxy-client-ip.js';
import { rateLimitKey } from './rate-limit.js';

function run(headers, secret) {
  const req = { ip: '76.76.21.1', get: (name) => headers[name.toLowerCase()] };
  let called = false;
  proxyClientIp({ secret })(req, {}, () => { called = true; });
  assert.ok(called);
  return req;
}

test('비밀값이 맞으면 중계가 보낸 학생 IP로 요청 제한 키를 만든다', () => {
  const req = run({ 'x-vpylab-proxy-secret': 's3cret-s3cret', 'x-vpylab-client-ip': '203.0.113.7' }, 's3cret-s3cret');
  assert.equal(clientIp(req), '203.0.113.7');
  assert.equal(rateLimitKey(req), 'ip:203.0.113.7');
});

test('비밀값이 틀리거나 없으면 머리를 무시하고 req.ip를 쓴다', () => {
  assert.equal(clientIp(run({ 'x-vpylab-proxy-secret': 'wrong-wrong-wr', 'x-vpylab-client-ip': '203.0.113.7' }, 's3cret-s3cret')), '76.76.21.1');
  assert.equal(clientIp(run({ 'x-vpylab-client-ip': '203.0.113.7' }, 's3cret-s3cret')), '76.76.21.1');
  // 서버에 비밀값이 설정되지 않았으면 누구의 머리도 믿지 않습니다.
  assert.equal(clientIp(run({ 'x-vpylab-proxy-secret': '', 'x-vpylab-client-ip': '203.0.113.7' }, '')), '76.76.21.1');
});

test('IP 모양이 아닌 값은 받지 않는다', () => {
  assert.equal(clientIp(run({ 'x-vpylab-proxy-secret': 's3cret-s3cret', 'x-vpylab-client-ip': 'not-an-ip' }, 's3cret-s3cret')), '76.76.21.1');
});
