import { describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import { clientIpOf, createProxyHandler, targetPath } from '../../api/srv.mjs';

function fakeReq({ url, method = 'GET', headers = {}, body }) {
  const req = Readable.from(body ? [Buffer.from(body)] : []);
  Object.assign(req, { url, method, headers });
  return req;
}
function fakeRes() {
  const res = { statusCode: 0, headers: {}, body: null };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.end = (b) => { res.body = Buffer.isBuffer(b) ? b.toString() : b; };
  return res;
}

describe('Vercel → Railway 중계(/srv)', () => {
  it('경로는 /api 아래만, 상위 이동은 막는다', () => {
    expect(targetPath({ url: '/api/srv?__path=api/share' })).toBe('/api/share');
    expect(targetPath({ url: '/api/srv?__path=api/share/abc&x=1' })).toBe('/api/share/abc?x=1');
    expect(targetPath({ url: '/api/srv?__path=api/../../etc' })).toBeNull();
    expect(targetPath({ url: '/api/srv?__path=health' })).toBeNull();
    expect(targetPath({ url: '/api/srv' })).toBeNull();
  });

  it('필요한 머리·본문과 함께, 비밀값과 실제 학생 IP를 보낸다', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"id":"solar"}', { status: 201, headers: { 'content-type': 'application/json', 'retry-after': '3', 'set-cookie': 'x=1' } }));
    const handler = createProxyHandler({ env: { PROXY_SECRET: 'sec-sec-sec', VPYLAB_SERVER_ORIGIN: 'https://srv.example' }, fetchImpl });
    const res = fakeRes();
    await handler(fakeReq({
      url: '/api/srv?__path=api/share', method: 'POST', body: '{"code":"x"}',
      headers: { 'content-type': 'application/json', authorization: 'Bearer t', cookie: 'secret=1', 'x-forwarded-for': '203.0.113.9, 10.0.0.1', host: 'vpylab.vercel.app' },
    }), res);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://srv.example/api/share');
    expect(init.method).toBe('POST');
    expect(init.body.toString()).toBe('{"code":"x"}');
    expect(init.headers).toMatchObject({ 'content-type': 'application/json', authorization: 'Bearer t', 'x-vpylab-proxy-secret': 'sec-sec-sec', 'x-vpylab-client-ip': '203.0.113.9' });
    expect(init.headers.cookie).toBeUndefined();
    expect(init.headers.host).toBeUndefined();
    expect(res.statusCode).toBe(201);
    expect(res.body).toBe('{"id":"solar"}');
    expect(res.headers['retry-after']).toBe('3');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('비밀값이 설정되지 않았으면 IP 머리를 보내지 않는다', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok', { status: 200 }));
    await createProxyHandler({ env: {}, fetchImpl })(fakeReq({ url: '/api/srv?__path=api/health', headers: { 'x-forwarded-for': '203.0.113.9' } }), fakeRes());
    expect(fetchImpl.mock.calls[0][1].headers['x-vpylab-client-ip']).toBeUndefined();
  });

  it('서버에 닿지 않으면 502, 다른 경로는 404, 큰 본문은 413', async () => {
    const down = createProxyHandler({ env: {}, fetchImpl: async () => { throw new TypeError('fail'); } });
    const res = fakeRes();
    await down(fakeReq({ url: '/api/srv?__path=api/share' }), res);
    expect(res.statusCode).toBe(502);

    const res404 = fakeRes();
    await down(fakeReq({ url: '/api/srv?__path=etc/passwd' }), res404);
    expect(res404.statusCode).toBe(404);

    const res413 = fakeRes();
    await down(fakeReq({ url: '/api/srv?__path=api/share', method: 'POST', body: 'x'.repeat(1024 * 1024 + 1) }), res413);
    expect(res413.statusCode).toBe(413);
  });

  it('학생 IP는 Vercel이 덮어쓴 x-forwarded-for의 첫 값', () => {
    expect(clientIpOf({ headers: { 'x-forwarded-for': '198.51.100.4, 76.76.21.1' } })).toBe('198.51.100.4');
    expect(clientIpOf({ headers: { 'x-real-ip': '198.51.100.5' } })).toBe('198.51.100.5');
  });

  it('응답 본문을 읽다가 연결이 끊겨도 502 JSON으로 답한다 (아르곤 안정성 점검)', async () => {
    const broken = { status: 200, headers: new Headers({ 'content-type': 'application/json' }), arrayBuffer: async () => { throw new TypeError('terminated'); } };
    const handler = createProxyHandler({ env: {}, fetchImpl: async () => broken });
    const res = fakeRes();
    await handler(fakeReq({ url: '/api/srv?__path=api/share' }), res);
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).code).toBe('upstream_unreachable');
  });
});
