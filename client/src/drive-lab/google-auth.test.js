import { describe, it, expect, vi } from 'vitest';
import {
  createGoogleAuth, missingScopes, AuthRequiredError, ALL_SCOPES, DRIVE_FILE_SCOPE, explainAuthError, loadGis,
} from './google-auth.js';

function fakeGis() {
  const state = { config: null, requests: [], revoked: [] };
  const gis = {
    accounts: {
      oauth2: {
        initTokenClient: (config) => {
          state.config = config;
          return { requestAccessToken: (opts) => state.requests.push(opts) };
        },
        revoke: (token, done) => { state.revoked.push(token); done(); },
      },
    },
  };
  return { gis, state };
}

describe('missingScopes', () => {
  it('구글이 돌려준 전체 URL 형태의 email·profile도 허용으로 본다', () => {
    const scope = `openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile ${DRIVE_FILE_SCOPE}`;
    expect(missingScopes(scope)).toEqual([]);
  });
  it('드라이브 권한이 빠지면 알려 준다', () => {
    expect(missingScopes('openid email profile')).toEqual([DRIVE_FILE_SCOPE]);
  });
});

describe('createGoogleAuth', () => {
  it('클라이언트 ID와 전체 범위로 토큰 클라이언트를 만든다', () => {
    const { gis, state } = fakeGis();
    createGoogleAuth({ clientId: 'cid', gis });
    expect(state.config.client_id).toBe('cid');
    expect(state.config.scope).toBe(ALL_SCOPES.join(' '));
  });

  it('승인 응답으로 토큰과 만료 시각을 기록한다', async () => {
    const { gis, state } = fakeGis();
    let t = 1_000_000;
    const auth = createGoogleAuth({ clientId: 'cid', gis, now: () => t });
    const promise = auth.request();
    expect(state.requests).toEqual([{ prompt: '' }]);
    state.config.callback({ access_token: 'A', expires_in: 3599, scope: 'openid' });
    const token = await promise;
    expect(token.expiresAt).toBe(1_000_000 + 3_599_000);
    expect(auth.getToken()).toBe('A');
    t += 3_599_000 - 30_000; // 만료 30초 전
    expect(auth.isValid()).toBe(false);
    expect(() => auth.getToken()).toThrow(AuthRequiredError);
  });

  it('승인 창을 닫으면 요청이 실패한다', async () => {
    const { gis, state } = fakeGis();
    const auth = createGoogleAuth({ clientId: 'cid', gis });
    const promise = auth.request();
    state.config.error_callback({ type: 'popup_closed' });
    await expect(promise).rejects.toThrow('승인 창이 닫혔습니다');
  });

  it('구글이 오류를 돌려주면 토큰을 남기지 않는다', async () => {
    const { gis, state } = fakeGis();
    const auth = createGoogleAuth({ clientId: 'cid', gis });
    const promise = auth.request();
    state.config.callback({ error: 'access_denied', error_description: 'admin_policy_enforced' });
    await expect(promise).rejects.toThrow('학교 관리자');
    expect(auth.current()).toBeNull();
  });

  it('만료 흉내와 철회', async () => {
    const { gis, state } = fakeGis();
    const auth = createGoogleAuth({ clientId: 'cid', gis });
    const promise = auth.request();
    state.config.callback({ access_token: 'A', expires_in: 3599 });
    await promise;
    auth.expireNow();
    expect(auth.isValid()).toBe(false);
    await auth.revoke();
    expect(state.revoked).toEqual(['A']);
    expect(auth.current()).toBeNull();
  });

  it('승인 대기 중 다시 요청하면 이전 요청을 취소한다', async () => {
    const { gis } = fakeGis();
    const auth = createGoogleAuth({ clientId: 'cid', gis });
    const first = auth.request();
    auth.request();
    await expect(first).rejects.toThrow('취소');
  });
});

describe('다시 승인할 때 같은 계정 지정', () => {
  it('loginHint가 있으면 login_hint로 넘긴다', () => {
    const { gis, state } = fakeGis();
    const auth = createGoogleAuth({ clientId: 'cid', gis });
    auth.request({ prompt: '', loginHint: 'a@school.example' }).catch(() => {});
    auth.request({ prompt: 'select_account' }).catch(() => {});
    expect(state.requests).toEqual([{ prompt: '', login_hint: 'a@school.example' }, { prompt: 'select_account' }]);
  });
});

describe('explainAuthError', () => {
  it('관리자 차단, 팝업 차단, 거부를 구분한다', () => {
    expect(explainAuthError('access_denied', 'admin_policy_enforced')).toContain('학교 관리자');
    expect(explainAuthError('popup_failed_to_open')).toContain('팝업 차단');
    expect(explainAuthError('access_denied')).toContain('거부');
    expect(explainAuthError('weird', 'x')).toContain('x');
  });
});

describe('loadGis', () => {
  it('이미 불러왔으면 그대로 돌려준다', async () => {
    const win = { google: { accounts: { oauth2: {} } } };
    await expect(loadGis(document, win)).resolves.toBe(win.google);
  });
  it('스크립트가 응답하지 않으면 시간 제한 뒤 실패하고 태그를 지운다', async () => {
    const win = {};
    const before = document.head.querySelectorAll('script').length;
    await expect(loadGis(document, win, 10)).rejects.toThrow('방화벽');
    expect(document.head.querySelectorAll('script').length).toBe(before);
  });
});

describe('AuthRequiredError', () => {
  it('이름으로 구분할 수 있다', () => {
    expect(new AuthRequiredError().name).toBe('AuthRequiredError');
    expect(vi).toBeDefined();
  });
});
