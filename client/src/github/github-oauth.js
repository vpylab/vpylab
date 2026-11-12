/**
 * GitHub 팀 프로젝트 애드온의 GitHub 로그인(OAuth 앱 웹 흐름, 팝업 방식).
 *
 * 1. 클릭 처리 안에서 팝업을 github.com 승인 화면으로 엽니다(state와 PKCE S256 포함).
 * 2. GitHub가 팝업을 /github/callback으로 돌려보내면 그 화면(pages/GitHubCallback.jsx)이
 *    BroadcastChannel로 { code, state }를 보냅니다. 사이트의 COOP 헤더 때문에 window.opener가
 *    끊길 수 있어 opener에 의존하지 않습니다.
 * 3. 연 쪽이 state를 대조한 뒤 POST /api/github/token(Pages 함수)으로 code를 토큰으로 바꿉니다.
 *    github.com의 토큰 발급 주소는 브라우저 호출을 허용하지 않고 client_secret이 필요하기 때문입니다.
 *
 * 토큰은 이 모듈에 남기지 않고 호출한 쪽에 돌려주기만 합니다.
 */

export const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
export const GITHUB_OAUTH_CHANNEL = 'vpylab-github-oauth';
export const GITHUB_OAUTH_MESSAGE = 'vpylab-github-oauth';
export const GITHUB_CALLBACK_PATH = '/github/callback';
export const GITHUB_TOKEN_PATH = '/api/github/token';
/**
 * public_repo: 공개 저장소 만들기·커밋·협업자 초대.
 * repo:invite: 받은 저장소 초대 목록 보기·수락(GitHub 문서: public_repo에는 들어 있지 않습니다).
 */
export const GITHUB_SCOPES = ['public_repo', 'repo:invite'];
export const LOGIN_TIMEOUT_MS = 5 * 60_000;
export const POPUP_POLL_MS = 500;
/** 콜백 화면은 결과를 보낸 뒤 스스로 닫힙니다. 닫힘을 먼저 보더라도 이 시간 동안은 결과를 기다립니다. */
export const POPUP_CLOSE_GRACE_MS = 1500;
export const TOKEN_TIMEOUT_MS = 20_000;

/**
 * reason: notConfigured(클라이언트 ID 또는 서버 비밀값 없음) · popupBlocked · timeout · denied(사용자가 거부) ·
 *         oauth(GitHub가 돌려준 그 밖의 오류) · exchange(토큰 교환 실패) · network · unsupported · cancelled
 * 팝업이 닫힌 것은 오류로 끝내지 않고 onPopupClosed로 알립니다(아래 beginGitHubLogin 설명).
 */
export class GitHubOAuthError extends Error {
  constructor(reason, detail = '') {
    super(`GitHub 로그인 실패: ${reason}`);
    this.name = 'GitHubOAuthError';
    this.reason = reason;
    this.detail = detail;
  }
}

export function base64Url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const rotr = (x, n) => (x >>> n) | (x << (32 - n));

/**
 * SHA-256(동기). 팝업은 클릭 처리 안에서 바로 열어야 하는데 crypto.subtle.digest는 비동기라서,
 * PKCE code_challenge를 그 자리에서 계산하려고 둡니다. 테스트가 crypto.subtle 결과와 대조합니다.
 */
export function sha256(bytes) {
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bytes.length / 0x20000000));
  view.setUint32(padded.length - 4, (bytes.length << 3) >>> 0);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, k] = h;
    for (let i = 0; i < 64; i += 1) {
      const t1 = (k + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + SHA256_K[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      k = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += k;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  h.forEach((value, i) => outView.setUint32(i * 4, value));
  return out;
}

const defaultRandom = (length) => globalThis.crypto.getRandomValues(new Uint8Array(length));

/** PKCE: 무작위 32바이트(base64url 43자)와 그 SHA-256(base64url 43자) */
export function createPkce(random = defaultRandom) {
  const verifier = base64Url(random(32));
  return { verifier, challenge: base64Url(sha256(new TextEncoder().encode(verifier))) };
}

export function buildAuthorizeUrl({ clientId, redirectUri, state, challenge, scopes = GITHUB_SCOPES }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    // 공용 컴퓨터에서 앞 학생의 GitHub 계정으로 이어지지 않게 계정을 고르게 합니다.
    prompt: 'select_account',
  });
  return `${GITHUB_AUTHORIZE_URL}?${params}`;
}

/** 토큰 응답의 scope(쉼표로 구분)에 빠진 범위. repo는 public_repo와 repo:invite를 포함합니다. */
export function missingGitHubScopes(scopeString = '', required = GITHUB_SCOPES) {
  const granted = new Set(String(scopeString).split(/[\s,]+/).filter(Boolean));
  if (granted.has('repo')) return [];
  return required.filter((scope) => !granted.has(scope));
}

/** 콜백 주소(?code=…&state=… 또는 ?error=…)에서 보낼 값을 읽습니다. 보낼 것이 없으면 null. */
export function readCallbackParams(search = '') {
  const params = new URLSearchParams(search);
  const clip = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');
  const code = clip(params.get('code'), 200);
  const state = clip(params.get('state'), 200);
  const error = clip(params.get('error'), 100);
  if (!state || (!code && !error)) return null;
  return { type: GITHUB_OAUTH_MESSAGE, code, state, error, errorDescription: clip(params.get('error_description'), 300) };
}

const defaultChannel = (name) => new BroadcastChannel(name);

/** 콜백 화면이 결과를 연 쪽으로 보냅니다. 보냈으면 true. */
export function sendCallbackResult(message, channelFactory = defaultChannel) {
  if (!message) return false;
  try {
    const channel = channelFactory(GITHUB_OAUTH_CHANNEL);
    channel.postMessage(message);
    channel.close();
    return true;
  } catch {
    return false;
  }
}

async function exchangeCode({ endpoint, code, redirectUri, codeVerifier, fetchImpl }) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), TOKEN_TIMEOUT_MS) : null;
  let response;
  let data = {};
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      cache: 'no-store',
      signal: controller?.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri, codeVerifier }),
    });
    data = await response.json().catch(() => ({}));
  } catch {
    throw new GitHubOAuthError('network');
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok || typeof data?.accessToken !== 'string' || !data.accessToken) {
    const notConfigured = response.status === 503 || data?.code === 'github_not_configured';
    throw new GitHubOAuthError(notConfigured ? 'notConfigured' : 'exchange', String(data?.code || response.status));
  }
  return { accessToken: data.accessToken, scope: typeof data.scope === 'string' ? data.scope : '' };
}

/**
 * GitHub 로그인을 시작합니다. 반드시 클릭 처리 안에서(await 없이) 부릅니다. 팝업을 이 함수 안에서 바로 엽니다.
 *
 * 돌려주는 값: { promise, cancel, url, state }
 *   promise → { accessToken, scope }. 실패하면 GitHubOAuthError.
 *
 * 팝업이 닫힌 경우: 결과 없이 창이 닫히면 onPopupClosed를 한 번 부릅니다. 이때 promise는 끝내지 않습니다.
 * 사이트의 COOP 설정에 따라서는 팝업이 github.com으로 넘어가는 순간 창이 닫힌 것처럼 보일 수 있어서,
 * 닫힘 표시만으로 로그인을 끝내면 실제로는 진행 중인 로그인을 버리게 됩니다. 결과가 오면 그대로 이어집니다.
 * 결과가 끝내 오지 않으면 시간 초과(timeout)로 끝나고, 다시 시작하려면 cancel()을 부릅니다.
 *
 * @param {object} options
 * @param {string} options.clientId GitHub OAuth 앱의 클라이언트 ID
 * @param {string} [options.origin]
 * @param {(url:string, name:string, features:string) => (Window|null)} [options.open]
 * @param {(length:number) => Uint8Array} [options.random]
 * @param {(name:string) => BroadcastChannel} [options.channelFactory]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {() => void} [options.onPopupClosed]
 * @param {number} [options.timeoutMs]
 * @param {string[]} [options.scopes]
 */
export function beginGitHubLogin({
  clientId,
  origin = globalThis.location?.origin,
  open = (...args) => globalThis.open(...args),
  random = defaultRandom,
  channelFactory = defaultChannel,
  fetchImpl = (...args) => globalThis.fetch(...args),
  onPopupClosed = () => {},
  timeoutMs = LOGIN_TIMEOUT_MS,
  scopes = GITHUB_SCOPES,
} = {}) {
  const failed = (reason, detail) => {
    const promise = Promise.reject(new GitHubOAuthError(reason, detail));
    promise.catch(() => {}); // 호출한 쪽이 늦게 받아도 처리되지 않은 거부로 기록되지 않게 합니다.
    return { promise, cancel: () => {}, url: '', state: '' };
  };
  if (!clientId) return failed('notConfigured', 'clientId');

  const state = base64Url(random(16));
  const { verifier, challenge } = createPkce(random);
  const redirectUri = `${origin}${GITHUB_CALLBACK_PATH}`;
  const url = buildAuthorizeUrl({ clientId, redirectUri, state, challenge, scopes });

  let channel;
  try {
    channel = channelFactory(GITHUB_OAUTH_CHANNEL);
  } catch {
    return failed('unsupported');
  }

  let popup = null;
  try {
    popup = open(url, 'vpylab-github-login', 'popup=yes,width=620,height=760');
  } catch {
    popup = null;
  }
  if (!popup) {
    channel.close();
    return failed('popupBlocked');
  }

  let settled = false;
  let handling = false;
  let pollTimer = null;
  let graceTimer = null;
  let timeoutTimer = null;
  let finish;
  const promise = new Promise((resolve, reject) => {
    finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearInterval(pollTimer);
      clearTimeout(graceTimer);
      clearTimeout(timeoutTimer);
      try { channel.close(); } catch { /* 이미 닫힘 */ }
      if (error) reject(error); else resolve(value);
    };
  });
  promise.catch(() => {});
  const closePopup = () => { try { popup.close(); } catch { /* 닫을 수 없는 창 */ } };

  channel.onmessage = (event) => {
    const message = event?.data;
    // 같은 사이트의 다른 탭이 시작한 로그인의 결과는 state가 달라서 무시합니다.
    if (settled || handling || !message || message.type !== GITHUB_OAUTH_MESSAGE || message.state !== state) return;
    handling = true;
    clearInterval(pollTimer);
    clearTimeout(graceTimer);
    closePopup();
    if (message.error || !message.code) {
      finish(new GitHubOAuthError(message.error === 'access_denied' ? 'denied' : 'oauth', String(message.error || 'no_code')));
      return;
    }
    exchangeCode({ endpoint: `${origin}${GITHUB_TOKEN_PATH}`, code: message.code, redirectUri, codeVerifier: verifier, fetchImpl })
      .then((token) => finish(null, token), (error) => finish(error));
  };

  pollTimer = setInterval(() => {
    let closed = false;
    try { closed = popup.closed; } catch { closed = true; }
    if (!closed) return;
    clearInterval(pollTimer);
    graceTimer = setTimeout(() => { if (!settled && !handling) onPopupClosed(); }, POPUP_CLOSE_GRACE_MS);
  }, POPUP_POLL_MS);

  timeoutTimer = setTimeout(() => {
    if (handling) return; // 토큰 교환 중이면 교환의 시간 제한을 따릅니다.
    closePopup();
    finish(new GitHubOAuthError('timeout'));
  }, timeoutMs);

  return {
    promise,
    url,
    state,
    cancel() {
      closePopup();
      finish(new GitHubOAuthError('cancelled'));
    },
  };
}
