/**
 * GitHub 팀 프로젝트 애드온의 상태 저장소(오픈소스 판).
 *
 * 기본 저장은 구글 드라이브이고, GitHub는 팀 프로젝트·공개 프로젝트용 선택 기능입니다.
 * 이 저장소를 불러오지 않거나 GitHub 연결이 실패해도 실행과 드라이브 저장은 그대로 동작합니다.
 *
 *   - github-oauth.js: 팝업 로그인(토큰은 서버에 남지 않음)
 *   - github-api.js: 브라우저가 api.github.com을 직접 호출
 *
 * 토큰은 메모리와 sessionStorage(탭 단위)에만 둡니다. 새로 고침에는 유지되고 탭을 닫으면 사라집니다.
 * GitHub가 401을 돌려주면 토큰을 지우고 needsReauth를 켭니다.
 * 화면은 이 저장소의 상태만 보고 그립니다. connect()는 팝업을 열어야 하므로 반드시 클릭 처리 안에서 부릅니다.
 */
import { create } from 'zustand';
import { GitHubError, createGitHubApi } from './github-api.js';
import { GitHubOAuthError, beginGitHubLogin, missingGitHubScopes } from './github-oauth.js';

export const GITHUB_CLIENT_ID = (import.meta.env.VITE_GITHUB_CLIENT_ID || '').trim();
export const GITHUB_SESSION_KEY = 'vpylab:github:session';

/** 오류 사유별 안내. 화면에서 ui()로 번역합니다. */
export const GITHUB_REASON_TEXT = {
  auth: 'GitHub 연결이 만료되었거나 해제되었습니다. "다시 연결"을 누르면 하던 작업을 이어서 진행합니다.',
  scope: 'GitHub 권한이 부족합니다. 다시 연결할 때 표시되는 권한을 모두 허용해야 팀 프로젝트를 사용할 수 있습니다.',
  notConfigured: '이 사이트에는 GitHub 연결이 설정되어 있지 않습니다. 실행과 구글 드라이브 저장은 그대로 사용할 수 있습니다.',
  popupBlocked: 'GitHub 창을 열지 못했습니다. 브라우저의 팝업 차단을 해제한 뒤 다시 연결할 수 있습니다.',
  popupClosed: 'GitHub 창이 닫힌 것으로 보입니다. 창이 열려 있으면 그 창에서 연결을 마칠 수 있고, 창을 닫았으면 연결 버튼을 다시 누릅니다.',
  loginTimeout: 'GitHub 연결 시간이 초과되었습니다. "GitHub 연결"을 다시 누르면 처음부터 진행합니다.',
  denied: 'GitHub에서 연결을 허용하지 않았습니다. 팀 프로젝트를 사용하려면 연결을 허용해야 합니다.',
  oauth: 'GitHub가 연결을 마치지 못했습니다. 잠시 뒤 다시 연결할 수 있습니다.',
  exchange: 'GitHub 연결을 마치지 못했습니다. 잠시 뒤 다시 연결할 수 있습니다.',
  unsupported: '이 브라우저에서는 GitHub 연결을 사용할 수 없습니다. 최신 브라우저에서 사용할 수 있습니다.',
  forbidden: 'GitHub가 요청을 거부했습니다. 이 저장소에 대한 권한이 없거나 조직 정책으로 제한되었을 수 있습니다.',
  readOnly: '이 저장소에 저장할 권한이 없습니다. 저장소 소유자가 내 GitHub 아이디를 초대하고, 내가 초대를 수락하면 저장할 수 있습니다.',
  adminRequired: '팀원 초대는 저장소 소유자만 할 수 있습니다.',
  galleryOwnerOnly: '갤러리에 올리거나 내리는 것은 저장소 소유자만 할 수 있습니다.',
  twoFactor: 'GitHub 계정에 2단계 인증이 필요합니다. GitHub 보안 설정에서 2단계 인증을 켠 뒤 다시 시도할 수 있습니다.',
  notFound: '저장소를 찾을 수 없습니다. 삭제되었거나 이름이 바뀌었을 수 있습니다.',
  userNotFound: '그 GitHub 아이디를 찾을 수 없습니다. 아이디를 다시 확인해야 합니다.',
  invitationGone: '이미 처리되었거나 취소된 초대입니다.',
  rate: 'GitHub가 요청 횟수를 제한했습니다. 잠시 뒤 다시 시도할 수 있습니다.',
  conflict: '팀원이 동시에 저장하고 있어 저장하지 못했습니다. 잠시 뒤 다시 저장할 수 있습니다.',
  rejected: 'GitHub가 요청을 처리하지 않았습니다. 저장소의 보호 설정을 확인해야 합니다.',
  inviteRejected: '초대하지 못했습니다. 이미 초대했거나 초대할 수 없는 계정입니다.',
  network: '네트워크 연결에 실패했습니다. 코드는 편집기에 남아 있습니다.',
  timeout: 'GitHub 응답이 늦습니다. 저장되었는지는 최근 저장 기록에서 확인할 수 있습니다.',
  server: 'GitHub 서버 오류입니다. 잠시 뒤 다시 시도할 수 있습니다.',
  tooLarge: '코드가 100KB를 넘어 저장할 수 없습니다.',
  htmlTooLarge: '실행 화면이 1MB를 넘어 저장할 수 없습니다.',
  empty: '코드가 비어 있어 저장할 수 없습니다.',
  titleRequired: '프로젝트 제목이 필요합니다.',
  invalidName: '저장소 이름은 영어 소문자, 숫자, 하이픈(-)으로 입력해야 합니다.',
  nameTaken: '같은 이름의 저장소가 이미 있습니다. 다른 이름을 입력해야 합니다.',
  invalidUser: 'GitHub 아이디가 올바르지 않습니다. 영어, 숫자, 하이픈(-)으로 된 아이디를 입력해야 합니다.',
  noProject: '열려 있는 GitHub 프로젝트가 없습니다. 프로젝트를 만들거나 연 뒤에 저장할 수 있습니다.',
  unknown: 'GitHub 작업을 마치지 못했습니다. 잠시 뒤 다시 시도할 수 있습니다.',
};

/** GitHub Pages(게시 주소)를 켜지 못한 까닭별 안내. 코드는 저장된 상태입니다. */
export const GITHUB_PAGES_WARNING_TEXT = {
  forbidden: '코드는 저장되었지만 게시 주소(GitHub Pages)를 켜지 못했습니다. 저장소의 Settings → Pages에서 main 브랜치를 선택하면 켤 수 있습니다.',
  sourceMismatch: '코드는 저장되었지만 GitHub Pages의 브랜치 또는 폴더 설정이 다릅니다. 저장소의 Settings → Pages에서 main 브랜치와 루트 폴더를 선택해야 합니다.',
  twoFactor: '코드는 저장되었지만 2단계 인증이 필요해 게시 주소(GitHub Pages)를 켜지 못했습니다.',
  auth: '코드는 저장되었지만 GitHub 연결이 만료되어 게시 주소(GitHub Pages)를 확인하지 못했습니다.',
  pending: '코드는 저장되었고 게시 주소(GitHub Pages)는 준비 중입니다. 1~2분 뒤에 열 수 있습니다.',
};

const OAUTH_REASON = { timeout: 'loginTimeout' };

export function reasonOf(error) {
  if (error instanceof GitHubOAuthError) {
    const reason = OAUTH_REASON[error.reason] || error.reason;
    return GITHUB_REASON_TEXT[reason] ? reason : 'unknown';
  }
  if (error instanceof GitHubError) {
    const { reason, detail } = error;
    if (reason === 'invalidName') {
      return { username: 'invalidUser', taken: 'nameTaken', title: 'titleRequired', fullName: 'notFound' }[detail] || 'invalidName';
    }
    if (reason === 'forbidden' && detail === 'adminRequired') return 'adminRequired';
    if (reason === 'forbidden' && detail === 'galleryOwnerOnly') return 'galleryOwnerOnly';
    if (reason === 'rejected' && detail === 'invite') return 'inviteRejected';
    if (reason === 'notFound' && detail === 'user') return 'userNotFound';
    if (reason === 'notFound' && detail === 'invitation') return 'invitationGone';
    if (reason === 'tooLarge' && detail === 'html') return 'htmlTooLarge';
    return GITHUB_REASON_TEXT[reason] ? reason : 'unknown';
  }
  return 'unknown';
}

const isAuthError = (error) => error instanceof GitHubError && error.reason === 'auth';
const countLines = (code) => (code ? String(code).split('\n').length : 0);
const sameLogin = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

const initialState = {
  account: null, // { login, name, avatarUrl }
  project: null, // { fullName, owner, repo, title, htmlUrl, pagesUrl, canPush, canAdmin, isOwner, inGallery, headSha, savedCode }
  projects: [],
  invitations: [], // 내가 받은 초대
  invitationsUnavailable: false,
  collaborators: [], // 연 프로젝트의 팀원
  pending: [], // 연 프로젝트가 보낸 초대 가운데 대기 중인 것
  commits: [], // 연 프로젝트의 최근 저장 기록
  busy: '', // 'connect' | 'create' | 'open' | 'save' | 'pull' | 'invite' | 'cancel' | 'accept' | 'gallery'
  listing: false,
  teamLoading: false,
  error: null, // { reason, detail?, source? }
  needsReauth: false,
  missingScope: false,
  conflict: null, // { mine, message, record, remote: { headSha, code } }
  pagesWarning: '',
  lastSavedAt: 0,
  lastCommitUrl: '',
};

/** 테스트에서 GitHub 흉내(fetch·로그인·저장소)를 바꿔 끼웁니다. */
let deps = {
  clientId: GITHUB_CLIENT_ID,
  fetchImpl: null,
  storage: null,
  origin: null,
  login: null, // beginGitHubLogin 대신 쓸 함수
  loginOptions: null, // beginGitHubLogin에 더할 값(open, random, channelFactory)
  apiOptions: null, // createGitHubApi에 더할 값(sleep, now, randomSuffix)
  buildHtml: null, // (code, title, { openInVpylabUrl, repoUrl }) => html
  openUrl: null, // (code) => VPyLab에서 여는 주소
};
let token = null;
let grantedScope = '';
let api = null;
let pendingLogin = null;
/** 결과를 모르는 내 저장 시도(시간 초과·연결 끊김)의 코드. 다음 저장의 충돌 판정에서 내 저장으로 인정합니다. */
let attemptedCodes = [];
/** 이 세션에서 Pages를 켜지 못한 저장소. 저장할 때마다 같은 실패를 되풀이하지 않습니다. */
const pagesBlocked = new Set();
/** 연결할 때마다 올립니다. 연결 전에 보낸 요청이 늦게 401로 실패해도 새 연결을 '만료'로 되돌리지 않습니다. */
let authEpoch = 0;
/** 연결 해제·계정 전환 때마다 올립니다. 앞 계정으로 보낸 요청의 결과를 뒤 계정 화면에 넣지 않습니다. */
let sessionEpoch = 0;
/** 프로젝트 열기 요청 번호. 마지막으로 고른 프로젝트의 응답만 반영합니다. */
let openSeq = 0;
/** 연결 시도 번호. 다시 누른 연결만 반영합니다. */
let connectSeq = 0;
/** 저장 요청 번호. 늦게 끝난 앞 저장이 지금 진행 중인 저장의 busy를 풀지 않게 합니다. */
let saveSeq = 0;

export function configureGitHub(next = {}) {
  deps = { ...deps, ...next };
  pendingLogin?.cancel();
  pendingLogin = null;
  token = null;
  grantedScope = '';
  api = null;
  attemptedCodes = [];
  pagesBlocked.clear();
  sessionEpoch += 1;
  connectSeq += 1;
  useGitHubStore.setState({ ...initialState });
}

/** 이 사이트에 GitHub 클라이언트 ID가 설정되어 있는지. 없으면 화면은 연결 버튼 대신 안내만 보입니다. */
export function isGitHubConfigured() {
  return Boolean(deps.clientId);
}

function storage() {
  if (deps.storage) return deps.storage;
  try { return window.sessionStorage; } catch { return null; }
}

function originOf() {
  return deps.origin || globalThis.location?.origin || '';
}

function client() {
  if (!api) {
    api = createGitHubApi({
      getToken: () => token,
      ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
      ...(deps.apiOptions || {}),
    });
  }
  return api;
}

function readSession() {
  const store = storage();
  if (!store) return null;
  try {
    const saved = JSON.parse(store.getItem(GITHUB_SESSION_KEY) || 'null');
    return saved && typeof saved === 'object' && typeof saved.account?.login === 'string' ? saved : null;
  } catch {
    return null;
  }
}

/** 지금 상태를 sessionStorage에 남깁니다. 용량이 모자라면 저장한 코드 사본을 빼고 남깁니다. */
function persist() {
  const store = storage();
  if (!store) return;
  const { account, project } = useGitHubStore.getState();
  try {
    if (!account) {
      store.removeItem(GITHUB_SESSION_KEY);
      return;
    }
    const value = { v: 1, token: token || '', scope: grantedScope, account, project };
    try {
      store.setItem(GITHUB_SESSION_KEY, JSON.stringify(value));
    } catch {
      store.setItem(GITHUB_SESSION_KEY, JSON.stringify({ ...value, project: project ? { ...project, savedCode: null } : null }));
    }
  } catch { /* 저장소를 쓸 수 없는 환경: 이 탭의 메모리로만 동작합니다. */ }
}

async function defaultBuildHtml(code, title, options) {
  // 실행형 HTML 생성기는 무거워서 저장할 때만 불러옵니다.
  const { generateStandaloneHTML } = await import('../utils/export-html.js');
  return generateStandaloneHTML(code, title, options);
}

/** GitHub Pages용 index.html을 만드는 함수와, 그 화면에서 VPyLab으로 돌아오는 주소(#code=)를 준비합니다. */
async function pageParts(code) {
  let openUrl = '';
  try {
    openUrl = deps.openUrl ? deps.openUrl(code) : (await import('../utils/share.js')).hashShareUrl(code, originOf());
  } catch {
    openUrl = ''; // 주소를 만들지 못해도 저장은 진행합니다.
  }
  const html = ({ title, repoUrl }) => (deps.buildHtml || defaultBuildHtml)(code, title, { openInVpylabUrl: openUrl || null, repoUrl });
  return { openUrl, html };
}

function validProject(project) {
  if (!project || typeof project !== 'object' || typeof project.fullName !== 'string') return null;
  return { ...project, savedCode: typeof project.savedCode === 'string' ? project.savedCode : null };
}

export const useGitHubStore = create((set, get) => {
  /** 토큰이 무효가 되었을 때: 토큰만 지우고 계정·프로젝트 표시는 남겨, 다시 연결하면 이어서 할 수 있게 합니다. */
  function loseAuth(epoch) {
    if (epoch !== authEpoch) return false; // 그사이 다시 연결했으면 새 연결을 건드리지 않습니다.
    token = null;
    set({ needsReauth: true, error: { reason: 'auth' } });
    persist();
    return true;
  }

  /** 앞에서 하던 작업(busy)의 오류를 상태에 반영합니다. */
  function fail(error, epoch = authEpoch) {
    if (isAuthError(error)) {
      const current = loseAuth(epoch);
      set({ busy: '' });
      return { status: 'error', reason: current ? 'auth' : 'stale' };
    }
    const reason = reasonOf(error);
    set({ busy: '', error: { reason, detail: error instanceof GitHubError && error.status ? String(error.status) : '' } });
    return { status: 'error', reason };
  }

  /** 목록처럼 배경에서 읽다 생긴 오류. 진행 중인 작업의 표시와 그 오류는 지우지 않습니다. */
  function failBackground(error, epoch, source) {
    if (isAuthError(error)) { loseAuth(epoch); return; }
    if (get().error) return;
    set({ error: { reason: reasonOf(error), detail: error instanceof GitHubError && error.status ? String(error.status) : '', source } });
  }

  const clearBackgroundError = (source) => set((s) => (s.error?.source === source ? { error: null } : {}));

  function notReady() {
    if (!get().account || !token) {
      set({ needsReauth: Boolean(get().account), error: { reason: 'auth' } });
      return { status: 'error', reason: 'auth' };
    }
    return null;
  }

  function noProject() {
    set({ error: { reason: 'noProject' } });
    return { status: 'error', reason: 'noProject' };
  }

  /** 저장(commit)과 내 코드로 저장(overwrite)이 함께 쓰는 본체 */
  async function runCommit({ code, message, record, force }) {
    const { project, account } = get();
    const session = sessionEpoch;
    const epoch = authEpoch;
    const fullName = project.fullName;
    const ticket = ++saveSeq;
    const stale = () => session !== sessionEpoch || get().project?.fullName !== fullName;
    /** 그사이 프로젝트 연결을 끊었거나 계정이 바뀌었습니다. GitHub에 쓴 내용은 그 저장소에 남습니다. */
    const staleResult = () => {
      if (ticket === saveSeq && session === sessionEpoch && get().busy === 'save') set({ busy: '' });
      return { status: 'stale' };
    };
    set({ busy: 'save', error: null });
    try {
      const { openUrl, html } = await pageParts(code);
      const result = await client().commit({
        fullName, code, html, openUrl, title: project.title, message, record, author: account.login,
        baseSha: project.headSha,
        baseCode: typeof project.savedCode === 'string' ? project.savedCode : undefined,
        force,
        ownCodes: attemptedCodes,
        pages: Boolean(project.canAdmin && !project.pagesUrl && !pagesBlocked.has(fullName)),
        codeLines: countLines(code),
        lineDelta: typeof project.savedCode === 'string' ? countLines(code) - countLines(project.savedCode) : undefined,
      });
      if (stale()) return staleResult();
      if (result.status === 'conflict') {
        set({ busy: '', conflict: { mine: code, message, record: record || null, remote: result.remote } });
        return { status: 'conflict' };
      }
      attemptedCodes = [];
      if (result.pagesWarning && result.pagesWarning !== 'pending') pagesBlocked.add(fullName);
      set((s) => ({
        busy: '',
        conflict: null,
        project: { ...s.project, headSha: result.headSha, savedCode: code, pagesUrl: result.pagesUrl || s.project.pagesUrl },
        pagesWarning: result.pagesWarning || '',
        lastSavedAt: Date.now(),
        lastCommitUrl: result.commitUrl || '',
      }));
      persist();
      return { status: 'saved', headSha: result.headSha, commitUrl: result.commitUrl, ...(result.pagesWarning ? { pagesWarning: result.pagesWarning } : {}) };
    } catch (error) {
      if (stale()) return staleResult();
      // 시간 초과·연결 끊김·서버 오류(5xx)는 GitHub에 반영됐는지 알 수 없습니다. 다음 저장에서 내 저장으로 인정합니다.
      if (error instanceof GitHubError && (error.reason === 'timeout' || error.reason === 'network' || error.reason === 'server')) {
        attemptedCodes = [...attemptedCodes, code].slice(-5);
      }
      return fail(error, epoch);
    }
  }

  return {
    ...initialState,

    /** sessionStorage에 남은 연결과 연 프로젝트를 되살립니다(새로 고침 뒤). 되살렸으면 true. */
    restore() {
      if (get().account) return true;
      const saved = readSession();
      if (!saved) return false;
      token = typeof saved.token === 'string' && saved.token ? saved.token : null;
      grantedScope = typeof saved.scope === 'string' ? saved.scope : '';
      set({
        account: { login: saved.account.login, name: saved.account.name || '', avatarUrl: saved.account.avatarUrl || '' },
        project: validProject(saved.project),
        needsReauth: !token,
      });
      return true;
    },

    /**
     * GitHub에 연결합니다. 반드시 클릭 처리 안에서 부릅니다(팝업 차단 방지). await 전에 팝업을 엽니다.
     * 결과: ok | missing-scope | error | stale. switched는 앞 계정과 다른 계정으로 바뀌었는지입니다.
     */
    connect() {
      pendingLogin?.cancel();
      pendingLogin = null;
      const seq = ++connectSeq;
      if (!deps.clientId) {
        set({ busy: '', error: { reason: 'notConfigured' } });
        return Promise.resolve({ status: 'error', reason: 'notConfigured' });
      }
      const attempt = (deps.login || beginGitHubLogin)({
        clientId: deps.clientId,
        origin: originOf(),
        ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
        ...(deps.loginOptions || {}),
        // 창이 닫힌 것으로 보이면 다시 누를 수 있게 버튼을 풀어 둡니다. 늦게 온 결과는 그대로 받습니다.
        onPopupClosed: () => { if (seq === connectSeq && get().busy === 'connect') set({ busy: '', error: { reason: 'popupClosed' } }); },
      });
      pendingLogin = attempt;
      set({ busy: 'connect', error: null });
      return (async () => {
        try {
          const granted = await attempt.promise;
          if (seq !== connectSeq) return { status: 'stale' };
          // 새 토큰의 주인을 먼저 확인합니다. 공용 컴퓨터에서 다른 학생 계정이 들어올 수 있습니다.
          const user = await createGitHubApi({
            getToken: () => granted.accessToken,
            ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
            ...(deps.apiOptions || {}),
          }).me();
          if (seq !== connectSeq) return { status: 'stale' };
          pendingLogin = null;
          const previous = get().account;
          const switched = Boolean(previous && !sameLogin(previous.login, user.login));
          if (switched) {
            // 앞 계정의 프로젝트 정보를 지웁니다(편집기 내용은 그대로).
            sessionEpoch += 1;
            attemptedCodes = [];
            pagesBlocked.clear();
            set({ project: null, projects: [], invitations: [], collaborators: [], pending: [], commits: [], conflict: null, pagesWarning: '', lastCommitUrl: '' });
          }
          token = granted.accessToken;
          grantedScope = granted.scope || '';
          authEpoch += 1;
          const missing = missingGitHubScopes(grantedScope);
          set({
            account: user,
            busy: '',
            needsReauth: false,
            missingScope: missing.length > 0,
            error: missing.length ? { reason: 'scope', detail: missing.join(', ') } : null,
          });
          persist();
          return { status: missing.length ? 'missing-scope' : 'ok', switched };
        } catch (error) {
          if (seq !== connectSeq) return { status: 'stale' };
          pendingLogin = null;
          const reason = reasonOf(error);
          set({ busy: '', error: { reason, detail: error instanceof GitHubOAuthError ? error.detail : '' } });
          return { status: 'error', reason };
        }
      })();
    },

    /** 이 탭의 GitHub 연결을 지웁니다. 토큰 폐기에는 client_secret이 필요해, GitHub 쪽 권한은 사용자가 GitHub 설정(Applications)에서 직접 해제합니다. */
    disconnect() {
      sessionEpoch += 1;
      connectSeq += 1;
      pendingLogin?.cancel();
      pendingLogin = null;
      token = null;
      grantedScope = '';
      attemptedCodes = [];
      pagesBlocked.clear();
      set({ ...initialState });
      persist();
    },

    clearError() { set({ error: null }); },

    /** 내 프로젝트 목록(배경에서 읽음). 실패하면 null. */
    async loadProjects() {
      if (!get().account || !token) return null;
      const session = sessionEpoch;
      const epoch = authEpoch;
      set({ listing: true });
      try {
        const projects = await client().listProjects();
        if (session !== sessionEpoch) return null;
        set({ projects, listing: false });
        clearBackgroundError('list');
        return projects;
      } catch (error) {
        if (session !== sessionEpoch) return null;
        set({ listing: false });
        failBackground(error, epoch, 'list');
        return null;
      }
    },

    /** 내가 받은 초대(배경에서 읽음). 읽지 못해도 다른 기능은 그대로 동작합니다. */
    async loadInvitations() {
      if (!get().account || !token) return null;
      const session = sessionEpoch;
      const epoch = authEpoch;
      try {
        const invitations = await client().myInvitations();
        if (session !== sessionEpoch) return null;
        set({ invitations, invitationsUnavailable: false });
        return invitations;
      } catch (error) {
        if (session !== sessionEpoch) return null;
        if (isAuthError(error)) loseAuth(epoch);
        else set({ invitations: [], invitationsUnavailable: true });
        return null;
      }
    },

    /** 지금 코드로 새 프로젝트(공개 저장소)를 만듭니다. 결과: created | error | busy | stale */
    async createProject({ title, code, repoName } = {}) {
      if (get().busy) return { status: 'busy' };
      const blocked = notReady();
      if (blocked) return blocked;
      const session = sessionEpoch;
      const epoch = authEpoch;
      set({ busy: 'create', error: null });
      try {
        const { openUrl, html } = await pageParts(code);
        const result = await client().createProject({ title, code, html, repoName, openUrl });
        if (session !== sessionEpoch) return { status: 'stale' };
        const project = { ...result.project, headSha: result.headSha, savedCode: code };
        attemptedCodes = [];
        if (result.pagesWarning && result.pagesWarning !== 'pending') pagesBlocked.add(project.fullName);
        set((s) => ({
          busy: '',
          project,
          conflict: null,
          projects: [result.project, ...s.projects.filter((p) => p.fullName !== project.fullName)],
          collaborators: [],
          pending: [],
          commits: [],
          pagesWarning: result.pagesWarning || '',
          lastSavedAt: Date.now(),
          lastCommitUrl: '',
        }));
        persist();
        return { status: 'created', project, headSha: result.headSha, ...(result.pagesWarning ? { pagesWarning: result.pagesWarning } : {}) };
      } catch (error) {
        if (session !== sessionEpoch) return { status: 'stale' };
        return fail(error, epoch);
      }
    },

    /**
     * 프로젝트를 열어 최신 코드를 돌려줍니다. 결과: { status: 'opened', code, title, empty }
     * empty가 true면 저장소에 main.py가 없습니다(code는 빈 문자열). 편집기를 비우지 않는 것이 안전합니다.
     */
    async openProject(fullName) {
      if (get().busy && get().busy !== 'open') return { status: 'busy' };
      const blocked = notReady();
      if (blocked) return blocked;
      const seq = ++openSeq;
      const session = sessionEpoch;
      const epoch = authEpoch;
      set({ busy: 'open', error: null });
      try {
        const result = await client().readProject(fullName);
        // 그사이 다른 프로젝트를 골랐거나 연결을 해제했으면 이 응답은 버립니다.
        if (seq !== openSeq || session !== sessionEpoch) return { status: 'stale' };
        attemptedCodes = [];
        set({
          busy: '',
          project: { ...result.project, headSha: result.headSha, savedCode: result.code },
          conflict: null,
          collaborators: [],
          pending: [],
          commits: [],
          pagesWarning: '',
          lastCommitUrl: '',
        });
        persist();
        return { status: 'opened', code: result.code, title: result.project.title, empty: result.missingMain };
      } catch (error) {
        if (seq !== openSeq || session !== sessionEpoch) return { status: 'stale' };
        return fail(error, epoch);
      }
    },

    /** 편집기 내용이 GitHub에 저장한 코드와 다른지 */
    isDirty(code) {
      const { project } = get();
      return project ? code !== project.savedCode : false;
    },

    /**
     * 연 프로젝트에 저장합니다(main.py·index.html·history.md를 한 커밋으로).
     * 결과: saved | conflict | unchanged | error | busy | stale
     */
    async commit(code, { message, record } = {}) {
      if (get().busy) return { status: 'busy' };
      if (!get().project) return noProject();
      const blocked = notReady();
      if (blocked) return blocked;
      const hasRecord = Boolean(record && [record.did, record.blocker, record.next].some((value) => String(value || '').trim()));
      if (code === get().project.savedCode && !hasRecord) return { status: 'unchanged' };
      return runCommit({ code, message, record, force: false });
    },

    /**
     * 충돌 해결.
     *   remote: 팀원이 저장한 최신 코드를 가져옵니다(돌려준 code를 편집기에 넣습니다).
     *   overwrite: 최신 커밋 위에 내 코드로 새 커밋을 만듭니다. 팀원의 커밋은 저장 기록에 남습니다.
     */
    async resolveConflict(choice) {
      const { conflict, project } = get();
      if (!conflict || !project) return { status: 'none' };
      if (choice === 'remote') {
        attemptedCodes = [];
        set({ conflict: null, project: { ...project, headSha: conflict.remote.headSha, savedCode: conflict.remote.code } });
        persist();
        return { status: 'loaded', code: conflict.remote.code, title: project.title };
      }
      if (get().busy) return { status: 'busy' };
      const blocked = notReady();
      if (blocked) return blocked;
      return runCommit({ code: conflict.mine, message: conflict.message, record: conflict.record, force: true });
    },

    /** 연 프로젝트의 최신 코드를 다시 읽습니다. 결과: { status: 'loaded', code, title, changed, empty } */
    async pullLatest() {
      const { project } = get();
      if (!project) return noProject();
      if (get().busy) return { status: 'busy' };
      const blocked = notReady();
      if (blocked) return blocked;
      const session = sessionEpoch;
      const epoch = authEpoch;
      const fullName = project.fullName;
      const stale = () => session !== sessionEpoch || get().project?.fullName !== fullName;
      const staleResult = () => {
        if (session === sessionEpoch && get().busy === 'pull') set({ busy: '' });
        return { status: 'stale' };
      };
      set({ busy: 'pull', error: null });
      try {
        const result = await client().readProject(fullName);
        if (stale()) return staleResult();
        attemptedCodes = [];
        set({ busy: '', conflict: null, project: { ...result.project, headSha: result.headSha, savedCode: result.code } });
        persist();
        return { status: 'loaded', code: result.code, title: result.project.title, changed: result.headSha !== project.headSha, empty: result.missingMain };
      } catch (error) {
        if (stale()) return staleResult();
        return fail(error, epoch);
      }
    },

    /** 프로젝트와 연결을 끊습니다. 편집기 내용과 GitHub 저장소는 그대로입니다. */
    detach() {
      attemptedCodes = [];
      set({ project: null, conflict: null, collaborators: [], pending: [], commits: [], pagesWarning: '', lastCommitUrl: '' });
      persist();
    },

    /** 연 프로젝트의 팀원, 대기 중인 초대, 최근 저장 기록(배경에서 읽음). 일부를 읽지 못하면 그 목록만 비웁니다. */
    async loadTeam() {
      const { project } = get();
      if (!project || !token) return null;
      const session = sessionEpoch;
      const epoch = authEpoch;
      const fullName = project.fullName;
      set({ teamLoading: true });
      const [commits, collaborators, pending] = await Promise.allSettled([
        client().history(fullName, { limit: 5 }),
        project.canPush ? client().collaborators(fullName) : Promise.resolve([]),
        project.canAdmin ? client().pendingInvitations(fullName) : Promise.resolve([]),
      ]);
      if (session !== sessionEpoch || get().project?.fullName !== fullName) return null;
      const lost = [commits, collaborators, pending].find((item) => item.status === 'rejected' && isAuthError(item.reason));
      if (lost) loseAuth(epoch);
      const valueOf = (item) => (item.status === 'fulfilled' ? item.value : []);
      const team = { commits: valueOf(commits), collaborators: valueOf(collaborators), pending: valueOf(pending).filter((item) => !item.expired) };
      set({ teamLoading: false, ...team });
      return team;
    },

    /** GitHub 아이디로 팀원을 초대합니다. 결과: invited | already | error | busy | stale */
    async invite(username) {
      const { project } = get();
      if (!project) return noProject();
      if (get().busy) return { status: 'busy' };
      const blocked = notReady();
      if (blocked) return blocked;
      const session = sessionEpoch;
      const epoch = authEpoch;
      set({ busy: 'invite', error: null });
      try {
        const result = await client().invite(project.fullName, username);
        if (session !== sessionEpoch) return { status: 'stale' };
        set({ busy: '' });
        await get().loadTeam();
        return { status: result.alreadyCollaborator ? 'already' : 'invited', username: result.username };
      } catch (error) {
        if (session !== sessionEpoch) return { status: 'stale' };
        return fail(error, epoch);
      }
    },

    /** 대기 중인 초대를 취소합니다. 결과: cancelled | error | busy | stale */
    async cancelInvitation(id) {
      const { project } = get();
      if (!project) return noProject();
      if (get().busy) return { status: 'busy' };
      const blocked = notReady();
      if (blocked) return blocked;
      const session = sessionEpoch;
      const epoch = authEpoch;
      set({ busy: 'cancel', error: null });
      try {
        await client().cancelInvitation(project.fullName, id);
        if (session !== sessionEpoch) return { status: 'stale' };
        set((s) => ({ busy: '', pending: s.pending.filter((item) => item.id !== id) }));
        return { status: 'cancelled' };
      } catch (error) {
        if (session !== sessionEpoch) return { status: 'stale' };
        return fail(error, epoch);
      }
    },

    /** 받은 초대를 수락합니다. 수락하면 내 프로젝트 목록에 나타납니다. 결과: accepted | error | busy | stale */
    async acceptInvitation(id) {
      if (get().busy) return { status: 'busy' };
      const blocked = notReady();
      if (blocked) return blocked;
      const session = sessionEpoch;
      const epoch = authEpoch;
      const invitation = get().invitations.find((item) => item.id === id);
      set({ busy: 'accept', error: null });
      try {
        await client().acceptInvitation(id);
        if (session !== sessionEpoch) return { status: 'stale' };
        set((s) => ({ busy: '', invitations: s.invitations.filter((item) => item.id !== id) }));
        await get().loadProjects();
        return { status: 'accepted', fullName: invitation?.fullName || null };
      } catch (error) {
        if (session !== sessionEpoch) return { status: 'stale' };
        return fail(error, epoch);
      }
    },

    // ── 갤러리(선택 기능, client/src/gallery/) ────────────────

    /**
     * 연 프로젝트를 갤러리에 올리거나(listed: true) 내립니다. 올릴 때 thumbnail(JPEG data URL)이 있으면 저장소에 thumbnail.jpg로 커밋합니다.
     * 그림을 올리지 못해도 올리기는 진행합니다. 결과: { status: 'listed' | 'unlisted', thumbnail: 'saved' | 'none' | 'failed' } | error | busy | stale
     * 목록에 실리는 것은 교사가 승인한 뒤이고, 목록은 주기적으로 갱신됩니다.
     */
    async setGalleryListing(listed, { thumbnail } = {}) {
      const { project } = get();
      if (!project) return noProject();
      if (get().busy) return { status: 'busy' };
      const blocked = notReady();
      if (blocked) return blocked;
      const session = sessionEpoch;
      const epoch = authEpoch;
      const fullName = project.fullName;
      const stale = () => session !== sessionEpoch || get().project?.fullName !== fullName;
      const staleResult = () => {
        if (session === sessionEpoch && get().busy === 'gallery') set({ busy: '' });
        return { status: 'stale' };
      };
      set({ busy: 'gallery', error: null });
      try {
        let picture = 'none';
        if (listed && typeof thumbnail === 'string' && thumbnail) {
          try {
            const saved = await client().putThumbnail(fullName, thumbnail);
            if (stale()) return staleResult();
            picture = 'saved';
            // 그림 커밋이 내가 알던 최신 커밋 바로 위에 올라갔을 때만 기준 커밋을 옮깁니다. 그사이 팀원의 저장이 있었다면 다음 저장이 확인합니다.
            if (saved.headSha && saved.parentSha && saved.parentSha === get().project.headSha) {
              set((s) => ({ project: { ...s.project, headSha: saved.headSha } }));
              persist();
            }
          } catch (error) {
            if (stale()) return staleResult();
            if (isAuthError(error)) throw error;
            picture = 'failed';
          }
        }
        const result = await client().setGalleryListing(fullName, listed);
        if (stale()) return staleResult();
        set((s) => ({
          busy: '',
          project: { ...s.project, inGallery: result.inGallery },
          projects: s.projects.map((item) => (item.fullName === fullName ? { ...item, inGallery: result.inGallery } : item)),
        }));
        persist();
        return { status: result.inGallery ? 'listed' : 'unlisted', thumbnail: picture };
      } catch (error) {
        if (stale()) return staleResult();
        return fail(error, epoch);
      }
    },

    /** 갤러리의 스타(좋아요): 내가 눌렀는지 읽습니다. 연결이 없으면 disconnected. 이 창의 진행 표시(busy)와 오류는 건드리지 않습니다. */
    async starStatus(fullName) {
      if (!get().account || !token) return { status: 'disconnected' };
      const session = sessionEpoch;
      const epoch = authEpoch;
      try {
        const starred = await client().isStarred(fullName);
        return session === sessionEpoch ? { status: 'ok', starred } : { status: 'stale' };
      } catch (error) {
        if (session !== sessionEpoch) return { status: 'stale' };
        if (isAuthError(error)) { loseAuth(epoch); return { status: 'disconnected' }; }
        return { status: 'error', reason: reasonOf(error) };
      }
    },

    /** 스타를 누르거나 취소합니다(GitHub 권한 public_repo). 결과: { status: 'ok', starred } | disconnected | error | stale */
    async setStar(fullName, starred) {
      if (!get().account || !token) return { status: 'disconnected' };
      const session = sessionEpoch;
      const epoch = authEpoch;
      try {
        const result = await client().setStarred(fullName, starred);
        return session === sessionEpoch ? { status: 'ok', starred: result.starred } : { status: 'stale' };
      } catch (error) {
        if (session !== sessionEpoch) return { status: 'stale' };
        if (isAuthError(error)) { loseAuth(epoch); return { status: 'disconnected' }; }
        return { status: 'error', reason: reasonOf(error) };
      }
    },
  };
});
