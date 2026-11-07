// 구글 로그인과 드라이브 권한 (Google Identity Services 토큰 방식)
//
// 서버 없이 브라우저가 액세스 토큰을 직접 받습니다. refresh token은 없으므로
// 만료되면 사용자가 버튼을 눌러 다시 승인해야 합니다(팝업 차단을 피하려면 클릭 이벤트 안에서 요청).

export const GIS_SRC = 'https://accounts.google.com/gsi/client';
export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const IDENTITY_SCOPES = ['openid', 'email', 'profile'];
export const ALL_SCOPES = [...IDENTITY_SCOPES, DRIVE_FILE_SCOPE];
/** 만료 직전 요청이 실패하지 않도록 남은 시간이 이보다 짧으면 만료로 봅니다. */
export const EXPIRY_MARGIN_MS = 60_000;

export class AuthRequiredError extends Error {
  constructor(message = '구글 권한 승인이 필요합니다.') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

let gisPromise = null;
export const GIS_LOAD_TIMEOUT_MS = 15_000;

/** GIS 스크립트를 한 번만 불러옵니다. 학교 방화벽에 막히면 기다리지 않고 실패합니다. */
export function loadGis(doc = document, win = window, timeoutMs = GIS_LOAD_TIMEOUT_MS) {
  if (win.google?.accounts?.oauth2) return Promise.resolve(win.google);
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const script = doc.createElement('script');
    const fail = (message) => {
      clearTimeout(timer);
      gisPromise = null;
      script.remove();
      reject(new Error(message));
    };
    const timer = setTimeout(() => fail('구글 로그인 스크립트가 응답하지 않습니다. 학교 방화벽에서 accounts.google.com이 막혔는지 확인하세요.'), timeoutMs);
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => {
      if (!win.google?.accounts?.oauth2) return fail('구글 로그인 스크립트를 초기화하지 못했습니다.');
      clearTimeout(timer);
      resolve(win.google);
    };
    script.onerror = () => fail('구글 로그인 스크립트를 불러오지 못했습니다. 네트워크나 학교 방화벽을 확인하세요.');
    doc.head.appendChild(script);
  });
  return gisPromise;
}

/** 구글 승인 오류를 교실에서 이해할 수 있는 안내로 바꿉니다. */
export function explainAuthError(code = '', description = '') {
  const text = `${code} ${description}`;
  if (/admin_policy_enforced|org_internal|restricted_client|disallowed_useragent/i.test(text)) {
    return '학교 관리자가 이 앱을 아직 허용하지 않았습니다. 정보 담당 선생님께 관리 콘솔에서 VPyLab을 허용해 달라고 요청하세요.';
  }
  if (/access_denied/i.test(text)) return '승인을 거부했습니다. 다시 승인하려면 버튼을 다시 누르세요.';
  if (/popup_closed/i.test(text)) return '승인 창이 닫혔습니다. 다시 시도하세요.';
  if (/popup_failed_to_open/i.test(text)) return '승인 창을 열지 못했습니다. 브라우저의 팝업 차단을 해제하세요.';
  return `승인 실패: ${description || code || '알 수 없는 오류'}`;
}

/** 승인 응답에서 실제로 허용된 범위를 나눕니다. 사용자는 드라이브 권한만 빼고 승인할 수 있습니다. */
export function grantedScopes(scopeString = '') {
  return scopeString.split(/\s+/).filter(Boolean);
}

export function missingScopes(scopeString, required = ALL_SCOPES) {
  const granted = new Set(grantedScopes(scopeString));
  // 구글은 email·profile을 전체 URL 형태로 돌려주기도 합니다.
  const alias = {
    email: 'https://www.googleapis.com/auth/userinfo.email',
    profile: 'https://www.googleapis.com/auth/userinfo.profile',
  };
  return required.filter((scope) => !granted.has(scope) && !granted.has(alias[scope]));
}

/**
 * @param {object} options
 * @param {string} options.clientId
 * @param {object} options.gis window.google
 * @param {() => number} [options.now]
 */
export function createGoogleAuth({ clientId, gis, now = () => Date.now() }) {
  let token = null; // { accessToken, expiresAt, scope }
  let pending = null;
  const client = gis.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: ALL_SCOPES.join(' '),
    callback: (response) => {
      const done = pending;
      pending = null;
      if (!done) return;
      if (response.error) {
        done.reject(new Error(explainAuthError(response.error, response.error_description)));
        return;
      }
      token = {
        accessToken: response.access_token,
        expiresAt: now() + Number(response.expires_in || 0) * 1000,
        scope: response.scope || '',
      };
      done.resolve(token);
    },
    error_callback: (error) => {
      const done = pending;
      pending = null;
      // popup_closed, popup_failed_to_open 등
      done?.reject(new Error(explainAuthError(error?.type || '')));
    },
  });

  return {
    /**
     * 반드시 클릭 같은 사용자 동작 안에서 호출합니다.
     * loginHint: 다시 승인할 때 같은 계정을 고르게 합니다(공용 PC에서 다른 학생 계정으로 바뀌는 것을 줄입니다).
     */
    request({ prompt = '', loginHint = '' } = {}) {
      if (pending) pending.reject(new Error('이전 승인 요청을 취소했습니다.'));
      return new Promise((resolve, reject) => {
        pending = { resolve, reject };
        client.requestAccessToken(loginHint ? { prompt, login_hint: loginHint } : { prompt });
      });
    },
    current() {
      return token;
    },
    isValid() {
      return Boolean(token && token.expiresAt - now() > EXPIRY_MARGIN_MS);
    },
    /** 드라이브 어댑터가 요청마다 부릅니다. 만료됐으면 화면이 재승인을 안내하도록 오류를 던집니다. */
    getToken() {
      if (!token || token.expiresAt - now() <= EXPIRY_MARGIN_MS) throw new AuthRequiredError();
      return token.accessToken;
    },
    /** 실험용: 1시간을 기다리지 않고 만료 상황을 만듭니다. */
    expireNow() {
      if (token) token = { ...token, expiresAt: now() - 1 };
    },
    /** 실험용: 토큰 값을 망가뜨려 구글이 401을 돌려주게 합니다. */
    corrupt() {
      if (token) token = { ...token, accessToken: `${token.accessToken}x` };
    },
    revoke() {
      const value = token?.accessToken;
      token = null;
      return new Promise((resolve) => {
        if (!value) return resolve();
        gis.accounts.oauth2.revoke(value, () => resolve());
      });
    },
    forget() {
      token = null;
    },
  };
}

export async function fetchUserInfo(accessToken, fetchImpl = (...args) => globalThis.fetch(...args)) {
  const response = await fetchImpl('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`계정 정보를 읽지 못했습니다 (${response.status})`);
  return response.json();
}
