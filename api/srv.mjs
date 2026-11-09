/**
 * /srv/* → 수업용 Express 서버(Railway) 중계.
 *
 * 일부 학교·통신사 DNS가 *.railway.app 주소를 막습니다(2026-11-09 확인: 그 네트워크에서는 공유·저장·팀 기능이 모두 실패).
 * 브라우저는 막히지 않는 같은 출처(vpylab.vercel.app/srv/…)로 요청하고, 이 함수가 서버 쪽에서 Railway로 전달합니다.
 * vercel.json이 /srv/:path*를 /api/srv?__path=:path*로 보냅니다.
 *
 * 요청 제한이 학생 IP 기준이므로, 실제 학생 IP(Vercel이 덮어쓴 x-forwarded-for)를 x-vpylab-client-ip로 보내고
 * 서버만 아는 비밀값(PROXY_SECRET)을 함께 보냅니다. 서버는 비밀값이 맞을 때만 그 IP를 믿습니다
 * (server/middleware/proxy-client-ip.js).
 */

const DEFAULT_ORIGIN = 'https://vpylab-server-production.up.railway.app';
/** 서버가 읽는 요청 머리만 전달합니다. 쿠키·호스트·연결 관련 머리는 보내지 않습니다. */
const FORWARD_REQUEST = ['authorization', 'content-type', 'accept', 'accept-language', 'origin', 'user-agent'];
/** 돌려줄 응답 머리. 요청 제한 안내(Retry-After, RateLimit-*)를 화면이 읽을 수 있게 둡니다. */
const FORWARD_RESPONSE = ['content-type', 'cache-control', 'retry-after', 'ratelimit', 'ratelimit-policy', 'ratelimit-limit', 'ratelimit-remaining', 'ratelimit-reset'];
const MAX_BODY_BYTES = 1024 * 1024; // 서버의 express.json 한도(1mb)와 같습니다.
const TIMEOUT_MS = 55_000;

/** Vercel이 덮어쓴 x-forwarded-for의 첫 값이 실제 접속 IP입니다(사용자가 보낸 값은 Vercel이 지웁니다). */
export function clientIpOf(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || '').trim();
}

/** /srv/api/share?x=1 → /api/share?x=1. 경로 밖으로 나가는 값(.., //, 다른 출처)은 받지 않습니다. */
export function targetPath(req) {
  const url = new URL(req.url, 'http://local');
  const raw = url.searchParams.get('__path') ?? '';
  url.searchParams.delete('__path');
  const segments = String(raw).split('/').filter(Boolean);
  if (!segments.length || segments.some((s) => s === '..' || s === '.' || s.includes('\\'))) return null;
  if (segments[0] !== 'api') return null; // 서버의 공개 경로는 모두 /api 아래입니다.
  const query = url.searchParams.toString();
  return `/${segments.map(encodeURIComponent).join('/')}${query ? `?${query}` : ''}`;
}

async function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('too large');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function createProxyHandler({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const origin = String(env.VPYLAB_SERVER_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, '');
  return async function handler(req, res) {
    const path = targetPath(req);
    if (!path) return sendJson(res, 404, { error: '찾을 수 없는 주소입니다.', code: 'not_found' });

    let body;
    try {
      body = await readBody(req);
    } catch (error) {
      return sendJson(res, error.status || 400, { error: '요청 본문이 너무 큽니다.', code: 'too_large' });
    }

    const headers = {};
    for (const name of FORWARD_REQUEST) {
      const value = req.headers[name];
      if (value) headers[name] = Array.isArray(value) ? value.join(', ') : String(value);
    }
    const ip = clientIpOf(req);
    if (env.PROXY_SECRET && ip) {
      headers['x-vpylab-proxy-secret'] = env.PROXY_SECRET;
      headers['x-vpylab-client-ip'] = ip;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let upstream;
    let buffer;
    try {
      upstream = await fetchImpl(`${origin}${path}`, { method: req.method, headers, body, redirect: 'manual', signal: controller.signal });
      // 응답 본문도 같은 시간 제한 안에서 읽습니다. 읽는 도중 연결이 끊겨도 정해진 JSON 오류로 답합니다.
      buffer = Buffer.from(await upstream.arrayBuffer());
    } catch {
      return sendJson(res, 502, { error: '서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.', code: 'upstream_unreachable' });
    } finally {
      clearTimeout(timer);
    }

    res.statusCode = upstream.status;
    for (const name of FORWARD_RESPONSE) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    if (!upstream.headers.get('cache-control')) res.setHeader('Cache-Control', 'no-store');
    res.end(buffer);
  };
}

export default createProxyHandler();
