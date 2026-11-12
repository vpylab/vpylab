/**
 * GitHub 로그인 토큰 교환(POST /api/github/token)의 핵심 로직. Cloudflare Pages 함수(functions/api/github/token.js)가 사용합니다.
 *
 * github.com의 토큰 발급 주소는 브라우저 호출을 허용하지 않고 client_secret이 필요합니다.
 * 그래서 이 함수 하나만 code를 토큰으로 바꿉니다. 그 밖의 GitHub API는 브라우저가 직접 호출합니다.
 *
 * 요청과 응답
 *   POST /api/github/token  { code, redirectUri, codeVerifier? } → 200 { accessToken, scope }
 *
 * 규칙
 *   - 같은 출처의 요청만 받습니다(Origin이 사이트와 같거나, Origin이 없으면 Sec-Fetch-Site가 same-origin).
 *   - redirectUri는 이 사이트의 /github/callback이어야 합니다.
 *   - 토큰과 code는 저장하지 않고 기록(log)하지 않습니다. 응답은 캐시하지 않습니다(no-store).
 *   - 비밀값 GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET이 없으면 503(github_not_configured)을 돌려줍니다.
 *     애드온이 꺼진 상태이며 사이트의 다른 기능에는 영향이 없습니다.
 *   - D1(DB)이 연결되어 있으면 짧은 공유 주소와 같은 방식으로 IP마다 1분에 120회까지 받습니다.
 *     D1에 문제가 있으면 제한 없이 진행합니다.
 */
import { ShareError, assertSameOrigin, checkRate, handle, json } from './share-core.js';

export const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
export const CALLBACK_PATH = '/github/callback';
export const MAX_TOKEN_BODY_BYTES = 4 * 1024;
export const GITHUB_TIMEOUT_MS = 10_000;

const CODE_PATTERN = /^[A-Za-z0-9_-]{8,200}$/;
/** PKCE code_verifier(RFC 7636): 43~128자 */
const VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;

/** 브라우저의 같은 출처 요청만 받습니다. Origin을 보내지 않는 요청은 Sec-Fetch-Site로 확인합니다. */
export function assertSameSite(request) {
  assertSameOrigin(request);
  if (!request.headers.get('Origin') && request.headers.get('Sec-Fetch-Site') !== 'same-origin') {
    throw new ShareError(403, 'bad_origin', '허용되지 않은 요청입니다.');
  }
}

export async function readTokenRequest(request) {
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') throw new ShareError(415, 'bad_content_type', '요청 형식이 올바르지 않습니다.');
  if (Number(request.headers.get('Content-Length') || 0) > MAX_TOKEN_BODY_BYTES) {
    throw new ShareError(413, 'body_too_large', '요청이 너무 큽니다.');
  }
  const text = await request.text();
  if (text.length > MAX_TOKEN_BODY_BYTES) throw new ShareError(413, 'body_too_large', '요청이 너무 큽니다.');
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ShareError(400, 'bad_json', '요청 형식이 올바르지 않습니다.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ShareError(400, 'bad_json', '요청 형식이 올바르지 않습니다.');

  const { code, redirectUri, codeVerifier } = body;
  if (typeof code !== 'string' || !CODE_PATTERN.test(code)) throw new ShareError(400, 'bad_code', '요청 형식이 올바르지 않습니다.');
  if (redirectUri !== `${new URL(request.url).origin}${CALLBACK_PATH}`) {
    throw new ShareError(400, 'bad_redirect_uri', '요청 형식이 올바르지 않습니다.');
  }
  if (codeVerifier !== undefined && codeVerifier !== null && (typeof codeVerifier !== 'string' || !VERIFIER_PATTERN.test(codeVerifier))) {
    throw new ShareError(400, 'bad_code_verifier', '요청 형식이 올바르지 않습니다.');
  }
  return { code, redirectUri, codeVerifier: codeVerifier || '' };
}

/** GitHub에 code를 보내 토큰으로 바꿉니다. 실패 사유에는 GitHub의 오류 이름만 담고 code·토큰은 담지 않습니다. */
export async function exchangeCode(env, { code, redirectUri, codeVerifier }, fetchImpl = (...args) => fetch(...args)) {
  const clientId = String(env?.GITHUB_CLIENT_ID || '').trim();
  const clientSecret = String(env?.GITHUB_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    throw new ShareError(503, 'github_not_configured', '이 사이트에는 GitHub 연결이 설정되어 있지 않습니다.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GITHUB_TIMEOUT_MS);
  let data;
  try {
    const response = await fetchImpl(GITHUB_TOKEN_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'vpylab-pages-function' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
      }),
    });
    data = await response.json();
  } catch {
    throw new ShareError(502, 'github_unreachable', 'GitHub에 연결하지 못했습니다. 잠시 뒤 다시 시도할 수 있습니다.');
  } finally {
    clearTimeout(timer);
  }

  if (!data || typeof data.access_token !== 'string' || !data.access_token) {
    const reason = typeof data?.error === 'string' ? data.error.replace(/[^a-z_]/gi, '').slice(0, 60) : 'unknown';
    // 클라이언트 ID·비밀값이 틀린 경우는 사이트 설정 문제입니다.
    if (reason === 'incorrect_client_credentials') {
      throw new ShareError(503, 'github_not_configured', '이 사이트의 GitHub 연결 설정이 올바르지 않습니다.');
    }
    throw Object.assign(new ShareError(400, 'github_exchange_failed', 'GitHub 연결을 마치지 못했습니다. 다시 연결할 수 있습니다.'), { reason });
  }
  return { accessToken: data.access_token, scope: typeof data.scope === 'string' ? data.scope : '' };
}

/** POST /api/github/token 처리. 오류 응답에는 사유 코드(code)와, GitHub가 준 오류 이름(reason)만 담습니다. */
export function handleTokenRequest(request, env, { fetchImpl } = {}) {
  return handle(async () => {
    try {
      assertSameSite(request);
      const input = await readTokenRequest(request);
      if (env?.DB) {
        try {
          await checkRate(env.DB, request.headers.get('CF-Connecting-IP'), `${env.SHARE_SALT || 'vpylab-share'}|github-token`);
        } catch (error) {
          // 요청 제한에 걸린 경우만 막습니다. 공유 저장소(D1)의 문제로 GitHub 로그인이 막히지 않게 합니다.
          if (error instanceof ShareError) throw error;
        }
      }
      return json(200, await exchangeCode(env, input, fetchImpl));
    } catch (error) {
      if (error instanceof ShareError && error.reason) {
        return json(error.status, { error: error.message, code: error.code, reason: error.reason });
      }
      throw error;
    }
  });
}
