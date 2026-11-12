import { beforeEach, describe, expect, it } from 'vitest';
import { memoryStorage } from '../drive-lab/fake-google.js';
import { createFakeGitHub } from './fake-github.js';
import { PROJECT_TOPIC } from './github-api.js';
import { GitHubOAuthError } from './github-oauth.js';
import { GITHUB_REASON_TEXT, GITHUB_SESSION_KEY, configureGitHub, useGitHubStore } from './githubSession.js';

let github;
let storage;
let logins; // connect()마다 꺼내 쓰는 로그인 결과
let loginCalls;
const store = () => useGitHubStore.getState();

/** beginGitHubLogin 흉내: 준비해 둔 결과(토큰 또는 오류)를 돌려줍니다. */
function fakeLogin(options) {
  loginCalls.push(options);
  const next = logins.length ? logins.shift() : { accessToken: 'token-ada', scope: 'public_repo,repo:invite' };
  let cancelled = false;
  const promise = (async () => {
    const value = typeof next === 'function' ? await next(options) : next;
    if (cancelled) throw new GitHubOAuthError('cancelled');
    if (value instanceof Error) throw value;
    return value;
  })();
  promise.catch(() => {});
  return { promise, cancel: () => { cancelled = true; }, url: '', state: 's' };
}

function configure(extra = {}) {
  configureGitHub({
    clientId: 'client-1',
    fetchImpl: github.fetchImpl,
    storage,
    origin: 'https://vpylab.example',
    login: fakeLogin,
    apiOptions: { sleep: async () => {}, now: () => new Date(2026, 10, 12, 9, 30) },
    buildHtml: (code, title, { repoUrl, openInVpylabUrl }) => `<html>${title}|${code}|${repoUrl}|${openInVpylabUrl}</html>`,
    openUrl: (code) => `https://vpylab.example/sandbox#code=${code.length}`,
    ...extra,
  });
}

beforeEach(() => {
  github = createFakeGitHub({ tokens: { 'token-ada': 'ada', 'token-bo': 'bo', 'token-ada-2': 'ada' } });
  storage = memoryStorage();
  logins = [];
  loginCalls = [];
  configure();
});

async function connected() {
  expect(await store().connect()).toEqual({ status: 'ok', switched: false });
}

async function withProject(code = 'v1') {
  await connected();
  const created = await store().createProject({ title: '공 튀기기', code });
  expect(created.status).toBe('created');
  return created.project.fullName;
}

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

describe('GitHub 연결', () => {
  it('connect는 부르는 즉시 로그인을 시작하고, 끝나면 계정을 보이며 토큰을 sessionStorage에만 둔다', async () => {
    const pending = store().connect();
    expect(loginCalls).toHaveLength(1); // await 전에 이미 시작(팝업은 클릭 처리 안에서 열림)
    expect(loginCalls[0]).toMatchObject({ clientId: 'client-1', origin: 'https://vpylab.example' });
    expect(store().busy).toBe('connect');
    expect(await pending).toEqual({ status: 'ok', switched: false });
    expect(store()).toMatchObject({ account: { login: 'ada' }, busy: '', needsReauth: false, error: null });
    const saved = JSON.parse(storage.getItem(GITHUB_SESSION_KEY));
    expect(saved).toMatchObject({ token: 'token-ada', account: { login: 'ada' }, project: null });
    expect(JSON.stringify(store())).not.toContain('token-ada');
  });

  it('클라이언트 ID가 없으면 로그인을 시작하지 않고 notConfigured로 안내한다', async () => {
    configure({ clientId: '' });
    expect(await store().connect()).toEqual({ status: 'error', reason: 'notConfigured' });
    expect(loginCalls).toHaveLength(0);
    expect(store().error.reason).toBe('notConfigured');
    expect(GITHUB_REASON_TEXT.notConfigured).toContain('구글 드라이브 저장은 그대로');
  });

  it('팝업 차단·거부·시간 초과를 사유로 구분한다', async () => {
    for (const [reason, expected] of [['popupBlocked', 'popupBlocked'], ['denied', 'denied'], ['timeout', 'loginTimeout'], ['exchange', 'exchange']]) {
      logins = [new GitHubOAuthError(reason)];
      expect(await store().connect()).toEqual({ status: 'error', reason: expected });
      expect(store()).toMatchObject({ account: null, busy: '', error: { reason: expected } });
      expect(GITHUB_REASON_TEXT[expected]).toBeTruthy();
    }
  });

  it('창이 닫힌 것으로 보이면 버튼을 풀고 알리며, 늦게 온 결과로 연결을 마친다', async () => {
    const gate = deferred();
    logins = [() => gate.promise];
    const pending = store().connect();
    loginCalls[0].onPopupClosed();
    expect(store()).toMatchObject({ busy: '', error: { reason: 'popupClosed' } });
    gate.resolve({ accessToken: 'token-ada', scope: 'public_repo,repo:invite' });
    expect((await pending).status).toBe('ok');
    expect(store()).toMatchObject({ account: { login: 'ada' }, error: null });
  });

  it('다시 누르면 앞 연결 시도는 버리고 뒤 시도만 반영한다', async () => {
    const gate = deferred();
    logins = [() => gate.promise, { accessToken: 'token-bo', scope: 'public_repo,repo:invite' }];
    const first = store().connect();
    const second = store().connect();
    gate.resolve({ accessToken: 'token-ada', scope: 'public_repo,repo:invite' });
    expect((await first).status).toBe('stale');
    expect((await second).status).toBe('ok');
    expect(store().account.login).toBe('bo');
  });

  it('권한이 빠진 채 승인되면 missing-scope로 알린다', async () => {
    logins = [{ accessToken: 'token-ada', scope: 'public_repo' }];
    expect((await store().connect()).status).toBe('missing-scope');
    expect(store()).toMatchObject({ missingScope: true, error: { reason: 'scope' } });
  });

  it('새로 고침 뒤 restore로 연결과 연 프로젝트를 되살린다', async () => {
    const fullName = await withProject('v1');
    configure(); // 새로 고침: 메모리 상태가 사라짐
    expect(store().account).toBeNull();
    expect(store().restore()).toBe(true);
    expect(store()).toMatchObject({ account: { login: 'ada' }, project: { fullName, savedCode: 'v1' }, needsReauth: false });
    expect(store().isDirty('v1')).toBe(false);
    expect((await store().commit('v2', { message: '이어서 저장' })).status).toBe('saved');
    expect(github.file(fullName, 'main.py')).toBe('v2');
  });

  it('저장된 연결이 없거나 망가졌으면 restore는 false', () => {
    expect(store().restore()).toBe(false);
    storage.setItem(GITHUB_SESSION_KEY, '{broken');
    expect(store().restore()).toBe(false);
    storage.setItem(GITHUB_SESSION_KEY, JSON.stringify({ token: 'x' }));
    expect(store().restore()).toBe(false);
  });

  it('401이면 토큰을 지우고 needsReauth, 다시 연결하면 같은 프로젝트에 이어서 저장한다', async () => {
    const fullName = await withProject('v1');
    github.revoke('token-ada');
    expect(await store().commit('v2', { message: 'm' })).toEqual({ status: 'error', reason: 'auth' });
    expect(store()).toMatchObject({ needsReauth: true, busy: '', account: { login: 'ada' }, project: { fullName } });
    expect(JSON.parse(storage.getItem(GITHUB_SESSION_KEY)).token).toBe('');

    logins = [{ accessToken: 'token-ada-2', scope: 'public_repo,repo:invite' }];
    expect(await store().connect()).toEqual({ status: 'ok', switched: false });
    expect(store().needsReauth).toBe(false);
    expect((await store().commit('v2', { message: 'm' })).status).toBe('saved');
    expect(github.file(fullName, 'main.py')).toBe('v2');
  });

  it('다시 연결할 때 다른 계정이 들어오면 앞 계정의 프로젝트 정보를 지운다', async () => {
    await withProject('v1');
    logins = [{ accessToken: 'token-bo', scope: 'public_repo,repo:invite' }];
    expect(await store().connect()).toEqual({ status: 'ok', switched: true });
    expect(store()).toMatchObject({ account: { login: 'bo' }, project: null, projects: [] });
  });

  it('연결을 해제하면 상태와 sessionStorage를 모두 지운다', async () => {
    await withProject('v1');
    store().disconnect();
    expect(store()).toMatchObject({ account: null, project: null, projects: [] });
    expect(storage.getItem(GITHUB_SESSION_KEY)).toBeNull();
    expect(await store().commit('x', { message: 'm' })).toEqual({ status: 'error', reason: 'noProject' });
  });

  it('연결을 해제한 뒤 늦게 온 응답은 화면에 들어가지 않는다', async () => {
    await connected();
    github.createRepo('ada', 'p', { topics: [PROJECT_TOPIC], files: { 'main.py': 'a' } });
    const opening = store().openProject('ada/p');
    const listing = store().loadProjects();
    store().disconnect();
    expect(await opening).toEqual({ status: 'stale' });
    expect(await listing).toBeNull();
    expect(store()).toMatchObject({ project: null, projects: [], busy: '' });
  });
});

describe('프로젝트', () => {
  it('지금 코드로 프로젝트를 만들면 연 프로젝트가 되고, 실행 화면에 저장소 주소와 VPyLab 주소가 들어간다', async () => {
    const fullName = await withProject('sphere()');
    expect(store().project).toMatchObject({ fullName, title: '공 튀기기', canPush: true, savedCode: 'sphere()', headSha: github.repo(fullName).head });
    expect(store().projects.map((p) => p.fullName)).toEqual([fullName]);
    expect(github.file(fullName, 'index.html')).toBe(`<html>공 튀기기|sphere()|https://github.com/${fullName}|https://vpylab.example/sandbox#code=8</html>`);
    expect(store().isDirty('sphere()')).toBe(false);
    expect(store().isDirty('box()')).toBe(true);
    expect(JSON.parse(storage.getItem(GITHUB_SESSION_KEY)).project.fullName).toBe(fullName);
  });

  it('실행형 HTML을 만들지 못해도(애드온 실패) 정적 화면으로 프로젝트를 만든다', async () => {
    configure({ buildHtml: async () => { throw new Error('chunk load failed'); } });
    await connected();
    const created = await store().createProject({ title: 't', code: 'box()' });
    expect(created.status).toBe('created');
    expect(github.file(created.project.fullName, 'index.html')).toContain('<pre><code>box()</code></pre>');
  });

  it('Pages를 켜지 못하면 프로젝트는 만들고 경고만 남기며, 저장할 때마다 다시 시도하지 않는다', async () => {
    github.state.pagesForbidden = true;
    await connected();
    const created = await store().createProject({ title: 't', code: 'a' });
    expect(created).toMatchObject({ status: 'created', pagesWarning: 'forbidden' });
    expect(store().pagesWarning).toBe('forbidden');
    github.state.log.length = 0;
    expect((await store().commit('b', { message: 'm' })).status).toBe('saved');
    expect(github.calls('GET', /\/pages$/)).toHaveLength(0);
  });

  it('목록과 받은 초대를 읽고, 초대를 수락하면 목록에 나타난다', async () => {
    github.createRepo('bo', 'team', { description: '팀', topics: [PROJECT_TOPIC], files: { 'main.py': 'team code' } });
    github.createRepo('bo', 'other', { files: { 'x': 'y' } });
    const bo = github.state;
    bo.userInvitations.push({ id: 901, repoKey: 'bo/team', invitee: 'ada', inviter: 'bo', expired: false });
    github.repo('bo/team').invitations.push({ id: 901, invitee: 'ada', inviter: 'bo', expired: false });
    await connected();
    expect(await store().loadProjects()).toEqual([]);
    expect((await store().loadInvitations()).map((i) => i.fullName)).toEqual(['bo/team']);
    expect(await store().acceptInvitation(901)).toEqual({ status: 'accepted', fullName: 'bo/team' });
    expect(store().invitations).toEqual([]);
    expect(store().projects.map((p) => [p.fullName, p.canPush])).toEqual([['bo/team', true]]);

    const opened = await store().openProject('bo/team');
    expect(opened).toEqual({ status: 'opened', code: 'team code', title: '팀', empty: false });
    expect(store().project).toMatchObject({ fullName: 'bo/team', isOwner: false, savedCode: 'team code' });
  });

  it('받은 초대를 읽지 못해도 다른 기능은 그대로이고 표시만 남긴다', async () => {
    await connected();
    github.failNext({ test: /repository_invitations/, status: 403, body: { message: 'Resource not accessible' } });
    expect(await store().loadInvitations()).toBeNull();
    expect(store()).toMatchObject({ invitationsUnavailable: true, error: null, needsReauth: false });
  });

  it('프로젝트를 빠르게 바꿔 고르면 마지막에 고른 것만 반영한다', async () => {
    await connected();
    github.createRepo('ada', 'one', { topics: [PROJECT_TOPIC], files: { 'main.py': '1' } });
    github.createRepo('ada', 'two', { topics: [PROJECT_TOPIC], files: { 'main.py': '2' } });
    const first = store().openProject('ada/one');
    const second = store().openProject('ada/two');
    expect(await first).toEqual({ status: 'stale' });
    expect(await second).toMatchObject({ status: 'opened', code: '2' });
    expect(store().project.fullName).toBe('ada/two');
  });

  it('main.py가 없는 프로젝트를 열면 empty로 알린다', async () => {
    await connected();
    github.createRepo('ada', 'blank', { topics: [PROJECT_TOPIC] });
    expect(await store().openProject('ada/blank')).toMatchObject({ status: 'opened', code: '', empty: true });
    expect(store().isDirty('box()')).toBe(true);
  });

  it('없는 프로젝트를 열면 notFound로 안내하고 연 프로젝트는 그대로 둔다', async () => {
    const fullName = await withProject();
    expect(await store().openProject('ada/nope')).toEqual({ status: 'error', reason: 'notFound' });
    expect(store().project.fullName).toBe(fullName);
    expect(store().error.reason).toBe('notFound');
  });

  it('연결 끊기(detach)는 프로젝트만 떼고 GitHub 연결은 남긴다', async () => {
    await withProject();
    store().detach();
    expect(store()).toMatchObject({ project: null, account: { login: 'ada' } });
    expect(store().isDirty('anything')).toBe(false);
    expect(JSON.parse(storage.getItem(GITHUB_SESSION_KEY)).project).toBeNull();
  });
});

describe('저장과 충돌', () => {
  it('저장하면 한 커밋으로 올라가고, 바뀐 것이 없으면 unchanged', async () => {
    const fullName = await withProject('v1');
    expect(await store().commit('v1', { message: 'm' })).toEqual({ status: 'unchanged' });
    const saved = await store().commit('v1\nv2', { message: '둘째 줄', record: { did: '줄을 더했다', blocker: '', next: '' } });
    expect(saved).toMatchObject({ status: 'saved', commitUrl: `https://github.com/${fullName}/commit/${saved.headSha}` });
    expect(store().project).toMatchObject({ headSha: saved.headSha, savedCode: 'v1\nv2' });
    expect(store().lastCommitUrl).toBe(saved.commitUrl);
    expect(github.file(fullName, 'history.md')).toContain('- 메시지: 둘째 줄\n- 작성자: ada\n- 한 일: 줄을 더했다\n- 코드: 2줄 (+1)');
    // 코드가 같아도 기록을 적으면 저장한다
    expect((await store().commit('v1\nv2', { message: '기록만', record: { did: '', blocker: '막혔다', next: '' } })).status).toBe('saved');
  });

  it('팀원이 먼저 저장했으면 충돌로 알리고, 최신 코드 가져오기와 내 코드로 저장이 모두 동작한다', async () => {
    const fullName = await withProject('v1');
    const remoteHead = github.remoteCommit(fullName, { 'main.py': 'teammate' });
    expect(await store().commit('mine', { message: '내 저장' })).toEqual({ status: 'conflict' });
    expect(store().conflict).toMatchObject({ mine: 'mine', message: '내 저장', remote: { headSha: remoteHead, code: 'teammate' } });
    expect(github.file(fullName, 'main.py')).toBe('teammate');

    // 최신 코드 가져오기
    expect(await store().resolveConflict('remote')).toEqual({ status: 'loaded', code: 'teammate', title: '공 튀기기' });
    expect(store()).toMatchObject({ conflict: null, project: { headSha: remoteHead, savedCode: 'teammate' } });

    // 내 코드로 저장: 최신 커밋 위에 새 커밋
    const second = github.remoteCommit(fullName, { 'main.py': 'teammate 2' });
    await store().commit('mine 2', { message: '다시' });
    const result = await store().resolveConflict('overwrite');
    expect(result.status).toBe('saved');
    expect(github.repo(fullName).commits.get(result.headSha).parents).toEqual([second]);
    expect(github.file(fullName, 'main.py')).toBe('mine 2');
    expect(store()).toMatchObject({ conflict: null, project: { savedCode: 'mine 2' } });
    expect(await store().resolveConflict('remote')).toEqual({ status: 'none' });
  });

  it('최신 코드 가져오기(pullLatest)는 팀원의 저장을 읽어 기준을 옮긴다', async () => {
    const fullName = await withProject('v1');
    expect(await store().pullLatest()).toMatchObject({ status: 'loaded', code: 'v1', changed: false });
    const head = github.remoteCommit(fullName, { 'main.py': 'teammate' });
    expect(await store().pullLatest()).toMatchObject({ status: 'loaded', code: 'teammate', changed: true, title: '공 튀기기' });
    expect(store().project).toMatchObject({ headSha: head, savedCode: 'teammate' });
    expect((await store().commit('mine', { message: 'm' })).status).toBe('saved');
  });

  it('저장이 진행 중이면 겹쳐 저장하지 않는다', async () => {
    await withProject('v1');
    const first = store().commit('v2', { message: 'a' });
    expect(await store().commit('v3', { message: 'b' })).toEqual({ status: 'busy' });
    expect((await first).status).toBe('saved');
  });

  it('응답이 끊긴 저장이 실제로는 반영되었으면, 다음 저장에서 충돌로 보지 않는다', async () => {
    const fullName = await withProject('v1');
    // 브랜치를 옮기는 요청의 응답만 끊깁니다(GitHub에는 반영됨).
    const original = github.fetchImpl;
    let dropped = false;
    configureGitHubFetch(async (url, init = {}) => {
      const response = await original(url, init);
      if (!dropped && init.method === 'PATCH' && /git\/refs/.test(url)) { dropped = true; throw new TypeError('Failed to fetch'); }
      return response;
    });
    expect(await store().commit('attempt', { message: 'a' })).toEqual({ status: 'error', reason: 'network' });
    expect(github.file(fullName, 'main.py')).toBe('attempt');
    expect(store().project.savedCode).toBe('v1');
    expect((await store().commit('attempt + more', { message: 'b' })).status).toBe('saved');
    expect(github.file(fullName, 'main.py')).toBe('attempt + more');
    expect(store().conflict).toBeNull();
  });

  it('저장하는 사이 프로젝트 연결을 끊으면 결과를 화면에 넣지 않고 busy도 풀린다', async () => {
    await withProject('v1');
    const saving = store().commit('v2', { message: 'm' });
    store().detach();
    expect(await saving).toEqual({ status: 'stale' });
    expect(store()).toMatchObject({ project: null, busy: '' });
  });

  it('쓰기 권한이 없는 프로젝트에 저장하면 readOnly로 안내한다', async () => {
    github.createRepo('bo', 'theirs', { topics: [PROJECT_TOPIC], files: { 'main.py': 'x' } });
    await connected();
    await store().openProject('bo/theirs');
    expect(store().project.canPush).toBe(false);
    expect(await store().commit('mine', { message: 'm' })).toEqual({ status: 'error', reason: 'readOnly' });
    expect(github.file('bo/theirs', 'main.py')).toBe('x');
  });
});

describe('팀원', () => {
  it('팀원 목록·대기 중 초대·최근 저장 기록을 읽고, 초대와 취소가 동작한다', async () => {
    const fullName = await withProject('v1');
    expect(await store().invite('bo')).toEqual({ status: 'invited', username: 'bo' });
    expect(store().pending.map((p) => p.invitee)).toEqual(['bo']);
    expect(store().collaborators.map((c) => c.login)).toEqual(['ada']);
    expect(store().commits[0].message).toBe('프로젝트 시작: 공 튀기기');

    expect(await store().invite('bad name')).toEqual({ status: 'error', reason: 'invalidUser' });
    expect(await store().invite('ghost')).toEqual({ status: 'error', reason: 'userNotFound' });
    expect(await store().invite('bo')).toEqual({ status: 'error', reason: 'inviteRejected' });

    expect(await store().cancelInvitation(store().pending[0].id)).toEqual({ status: 'cancelled' });
    expect(store().pending).toEqual([]);
    expect(github.repo(fullName).invitations).toEqual([]);
  });

  it('소유자가 아니면 초대 목록을 요청하지 않고, 초대하면 adminRequired', async () => {
    github.createRepo('bo', 'team', { topics: [PROJECT_TOPIC], files: { 'main.py': 'x' } }).collaborators.add('ada');
    await connected();
    await store().openProject('bo/team');
    github.state.log.length = 0;
    const team = await store().loadTeam();
    expect(team.collaborators.map((c) => c.login)).toEqual(['bo', 'ada']);
    expect(github.calls('GET', /\/invitations$/)).toHaveLength(0);
    expect(await store().invite('cy')).toEqual({ status: 'error', reason: 'adminRequired' });
  });
});

/** 이미 연결된 상태에서 fetch만 바꿉니다(토큰·상태는 그대로). */
function configureGitHubFetch(fetchImpl) {
  const snapshot = { ...store() };
  const saved = storage.getItem(GITHUB_SESSION_KEY);
  configure({ fetchImpl });
  storage.setItem(GITHUB_SESSION_KEY, saved);
  store().restore();
  expect(store().project.fullName).toBe(snapshot.project.fullName);
}

it('사유마다 안내 문구가 있다', () => {
  for (const [reason, text] of Object.entries(GITHUB_REASON_TEXT)) {
    expect(text, reason).toMatch(/[.다]$/);
    expect(text, reason).not.toMatch(/—|그냥|단추|해 보세요/);
  }
});
