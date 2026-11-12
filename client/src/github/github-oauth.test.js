import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GITHUB_OAUTH_CHANNEL, GITHUB_OAUTH_MESSAGE, GITHUB_SCOPES, GitHubOAuthError, LOGIN_TIMEOUT_MS, POPUP_CLOSE_GRACE_MS, POPUP_POLL_MS,
  base64Url, beginGitHubLogin, buildAuthorizeUrl, createPkce, missingGitHubScopes, readCallbackParams, sendCallbackResult, sha256,
} from './github-oauth.js';

const ORIGIN = 'https://vpylab.example';

/** 같은 이름의 채널끼리 메시지를 주고받는 BroadcastChannel 흉내(보낸 채널 자신은 받지 않음) */
function fakeChannels() {
  const open = new Set();
  const factory = (name) => {
    const channel = {
      name,
      onmessage: null,
      closed: false,
      postMessage(data) { for (const other of open) if (other !== channel && other.name === name) other.onmessage?.({ data }); },
      close() { channel.closed = true; open.delete(channel); },
    };
    open.add(channel);
    return channel;
  };
  return { factory, open };
}

function harness({ tokenResponse = { status: 200, body: { accessToken: 'gho_secret', scope: 'public_repo,repo:invite' } }, ...options } = {}) {
  const channels = fakeChannels();
  const popup = { closed: false, close: vi.fn(() => { popup.closed = true; }) };
  const open = vi.fn(() => popup);
  const fetchImpl = vi.fn(async () => {
    if (tokenResponse instanceof Error) throw tokenResponse;
    return { ok: tokenResponse.status >= 200 && tokenResponse.status < 300, status: tokenResponse.status, json: async () => tokenResponse.body };
  });
  let counter = 0;
  const random = (length) => Uint8Array.from({ length }, () => (counter += 7) % 256);
  const onPopupClosed = vi.fn();
  const login = beginGitHubLogin({ clientId: 'client-1', origin: ORIGIN, open, random, channelFactory: channels.factory, fetchImpl, onPopupClosed, ...options });
  /** 콜백 화면이 하는 일: 주소에서 값을 읽어 채널로 보냅니다. */
  const callback = (search) => sendCallbackResult(readCallbackParams(search), channels.factory);
  return { login, channels, popup, open, fetchImpl, onPopupClosed, callback };
}

const reasonOf = (promise) => promise.then(() => 'resolved', (error) => (error instanceof GitHubOAuthError ? error.reason : `other:${error}`));

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('PKCE와 승인 주소', () => {
  it('동기 SHA-256이 crypto.subtle과 같은 값을 낸다', async () => {
    for (const length of [0, 1, 43, 55, 56, 63, 64, 65, 119, 120, 1000]) {
      const bytes = Uint8Array.from({ length }, (_, i) => (i * 31 + length) % 256);
      const expected = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
      expect(Array.from(sha256(bytes)), `길이 ${length}`).toEqual(Array.from(expected));
    }
  });

  it('검증 값과 도전 값은 43자이고, 도전 값은 검증 값의 SHA-256이다 (RFC 7636 예시)', () => {
    const { verifier, challenge } = createPkce();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const rfcVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    expect(base64Url(sha256(new TextEncoder().encode(rfcVerifier)))).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('승인 주소에 클라이언트 ID, 콜백 주소, 범위, state, PKCE, 계정 선택을 넣는다', () => {
    const url = new URL(buildAuthorizeUrl({ clientId: 'cid', redirectUri: `${ORIGIN}/github/callback`, state: 'st', challenge: 'ch' }));
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'cid', redirect_uri: `${ORIGIN}/github/callback`, scope: 'public_repo repo:invite', state: 'st',
      code_challenge: 'ch', code_challenge_method: 'S256', prompt: 'select_account',
    });
  });

  it('토큰 응답의 범위에서 빠진 것을 찾는다(repo는 둘 다 포함)', () => {
    expect(missingGitHubScopes('public_repo,repo:invite')).toEqual([]);
    expect(missingGitHubScopes('repo')).toEqual([]);
    expect(missingGitHubScopes('public_repo')).toEqual(['repo:invite']);
    expect(missingGitHubScopes('')).toEqual(GITHUB_SCOPES);
  });

  it('콜백 주소에서 code·state 또는 error를 읽고, 보낼 것이 없으면 null', () => {
    expect(readCallbackParams('?code=abc&state=st')).toEqual({ type: GITHUB_OAUTH_MESSAGE, code: 'abc', state: 'st', error: '', errorDescription: '' });
    expect(readCallbackParams('?error=access_denied&error_description=The+user+denied&state=st')).toMatchObject({ error: 'access_denied', errorDescription: 'The user denied', code: '' });
    expect(readCallbackParams('?code=abc')).toBeNull();
    expect(readCallbackParams('')).toBeNull();
  });
});

describe('beginGitHubLogin', () => {
  it('부르는 즉시(같은 틱) 팝업을 GitHub 승인 주소로 열고, 콜백의 code를 토큰으로 바꾼다', async () => {
    const { login, open, popup, fetchImpl, callback, channels } = harness();
    expect(open).toHaveBeenCalledTimes(1); // await 없이 이미 열렸다
    const url = new URL(open.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('state')).toBe(login.state);
    expect(url.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/github/callback`);
    expect(open.mock.calls[0][2]).not.toMatch(/noopener/);

    expect(callback(`?code=the-code&state=${login.state}`)).toBe(true);
    await expect(login.promise).resolves.toEqual({ accessToken: 'gho_secret', scope: 'public_repo,repo:invite' });
    const [endpoint, init] = fetchImpl.mock.calls[0];
    expect(endpoint).toBe(`${ORIGIN}/api/github/token`);
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ code: 'the-code', redirectUri: `${ORIGIN}/github/callback` });
    // 보낸 검증 값의 SHA-256이 승인 주소의 도전 값과 같다
    expect(base64Url(sha256(new TextEncoder().encode(body.codeVerifier)))).toBe(url.searchParams.get('code_challenge'));
    expect(popup.close).toHaveBeenCalled();
    expect(channels.open.size).toBe(0);
  });

  it('state가 다른 결과(다른 탭의 로그인)는 무시하고 기다린다', async () => {
    const { login, fetchImpl, callback } = harness();
    callback('?code=stolen&state=other-state');
    await vi.advanceTimersByTimeAsync(10);
    expect(fetchImpl).not.toHaveBeenCalled();
    callback(`?code=mine&state=${login.state}`);
    await expect(login.promise).resolves.toMatchObject({ accessToken: 'gho_secret' });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).code).toBe('mine');
  });

  it('클라이언트 ID가 없으면 팝업을 열지 않고 notConfigured', async () => {
    const { login, open } = harness({ clientId: '' });
    expect(open).not.toHaveBeenCalled();
    expect(await reasonOf(login.promise)).toBe('notConfigured');
  });

  it('팝업이 막히면 popupBlocked', async () => {
    const channels = fakeChannels();
    const login = beginGitHubLogin({ clientId: 'c', origin: ORIGIN, open: () => null, channelFactory: channels.factory });
    expect(await reasonOf(login.promise)).toBe('popupBlocked');
    expect(channels.open.size).toBe(0);
  });

  it('BroadcastChannel이 없는 브라우저면 팝업을 열지 않고 unsupported', async () => {
    const open = vi.fn();
    const login = beginGitHubLogin({ clientId: 'c', origin: ORIGIN, open, channelFactory: () => { throw new ReferenceError('BroadcastChannel'); } });
    expect(await reasonOf(login.promise)).toBe('unsupported');
    expect(open).not.toHaveBeenCalled();
  });

  it('사용자가 GitHub에서 거부하면 denied', async () => {
    const { login, fetchImpl, callback } = harness();
    callback(`?error=access_denied&state=${login.state}`);
    expect(await reasonOf(login.promise)).toBe('denied');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('결과 없이 창이 닫히면 onPopupClosed로 알리고, 늦게 온 결과는 그대로 받는다', async () => {
    const { login, popup, onPopupClosed, callback } = harness();
    popup.closed = true;
    await vi.advanceTimersByTimeAsync(POPUP_POLL_MS + POPUP_CLOSE_GRACE_MS - 10);
    expect(onPopupClosed).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(20);
    expect(onPopupClosed).toHaveBeenCalledTimes(1);
    // COOP 때문에 닫힌 것처럼 보였을 뿐 실제로는 진행 중이던 로그인
    callback(`?code=late&state=${login.state}`);
    await expect(login.promise).resolves.toMatchObject({ accessToken: 'gho_secret' });
  });

  it('콜백 화면이 결과를 보내고 스스로 닫힌 경우에는 닫힘으로 알리지 않는다', async () => {
    const { login, popup, onPopupClosed, callback } = harness();
    popup.closed = true;
    await vi.advanceTimersByTimeAsync(POPUP_POLL_MS);
    callback(`?code=ok&state=${login.state}`);
    await login.promise;
    await vi.advanceTimersByTimeAsync(POPUP_CLOSE_GRACE_MS * 2);
    expect(onPopupClosed).not.toHaveBeenCalled();
  });

  it('5분 동안 결과가 없으면 timeout으로 끝내고 창을 닫는다', async () => {
    const { login, popup, channels } = harness();
    const reason = reasonOf(login.promise);
    await vi.advanceTimersByTimeAsync(LOGIN_TIMEOUT_MS + 1);
    expect(await reason).toBe('timeout');
    expect(popup.close).toHaveBeenCalled();
    expect(channels.open.size).toBe(0);
  });

  it('cancel하면 cancelled로 끝나고 뒤에 온 결과는 무시한다', async () => {
    const { login, fetchImpl, callback } = harness();
    login.cancel();
    expect(await reasonOf(login.promise)).toBe('cancelled');
    callback(`?code=late&state=${login.state}`);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('토큰 교환: 서버에 비밀값이 없으면 notConfigured, 거절되면 exchange, 연결 실패는 network', async () => {
    const cases = [
      [{ status: 503, body: { code: 'github_not_configured' } }, 'notConfigured'],
      [{ status: 400, body: { code: 'github_exchange_failed' } }, 'exchange'],
      [{ status: 200, body: {} }, 'exchange'],
      [new TypeError('Failed to fetch'), 'network'],
    ];
    for (const [tokenResponse, expected] of cases) {
      const { login, callback } = harness({ tokenResponse });
      callback(`?code=c&state=${login.state}`);
      expect(await reasonOf(login.promise)).toBe(expected);
    }
  });

  it('오류 글자에 토큰이나 code가 들어가지 않는다', async () => {
    const { login, callback } = harness({ tokenResponse: { status: 400, body: { code: 'github_exchange_failed', accessToken: '' } } });
    callback(`?code=secret-code&state=${login.state}`);
    const error = await login.promise.catch((e) => e);
    expect(`${error.message} ${error.detail}`).not.toMatch(/secret-code|gho_/);
  });

  it('콜백 화면은 채널 이름 vpylab-github-oauth로 보낸다', () => {
    const names = [];
    sendCallbackResult({ type: GITHUB_OAUTH_MESSAGE, code: 'c', state: 's' }, (name) => { names.push(name); return { postMessage() {}, close() {} }; });
    expect(names).toEqual([GITHUB_OAUTH_CHANNEL]);
    expect(sendCallbackResult(null)).toBe(false);
  });
});
