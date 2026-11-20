import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authState: {
    user: { id: 'user-a', email: 'student@example.com' },
    profile: { display_name: '학생 A' },
    getGitHubToken: vi.fn(),
  },
  codeState: {
    saveCode: vi.fn(),
    _createRevision: vi.fn(),
    setCurrentCodeId: vi.fn(),
  },
  supabaseFrom: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    from: (...args) => mocks.supabaseFrom(...args),
  },
}));

vi.mock('./authStore', () => ({
  default: {
    getState: () => mocks.authState,
  },
}));

vi.mock('./codeStore', () => ({
  default: {
    getState: () => mocks.codeState,
  },
}));

vi.mock('../utils/export-html', () => ({
  generateProjectHTML: vi.fn((code, title) => `<html><title>${title}</title><body>${code}</body></html>`),
}));

const { default: useProjectStore } = await import('./projectStore');

function installMemoryStorage() {
  const store = new Map();
  const storage = {
    get length() {
      return store.size;
    },
    clear: vi.fn(() => store.clear()),
    getItem: vi.fn((key) => store.get(key) ?? null),
    key: vi.fn((index) => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn((key) => store.delete(key)),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
  };
  Object.defineProperty(window, 'localStorage', {
    value: storage,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  });
  return storage;
}

function mockRevisionCount(count = 1) {
  const chain = makeResolvedChain({ count });
  mocks.supabaseFrom.mockImplementation((table) => {
    if (table !== 'vpylab_code_revisions') {
      throw new Error(`unexpected table: ${table}`);
    }
    return {
      select: vi.fn(() => chain),
    };
  });
}

function makeResolvedChain(result) {
  const promise = Promise.resolve(result);
  const chain = {
    eq: vi.fn(() => chain),
    not: vi.fn(() => chain),
    maybeSingle: vi.fn(() => promise),
    single: vi.fn(() => promise),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  return chain;
}

function mockGithubSyncSupabase({ count = 1, codeSnapshot = 'print("retry")' } = {}) {
  mocks.supabaseFrom.mockImplementation((table) => ({
    select: vi.fn((columns) => {
      if (table === 'vpylab_code_revisions' && columns === 'code_snapshot') {
        return makeResolvedChain({ data: { code_snapshot: codeSnapshot }, error: null });
      }
      return makeResolvedChain({ count, data: [], error: null });
    }),
    update: vi.fn(() => makeResolvedChain({ data: null, error: null })),
  }));
}

function jsonResponse(ok, status, body) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function waitForCondition(assertion, timeoutMs = 1000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      return assertion();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  throw lastError;
}

describe('projectStore saveAndPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installMemoryStorage();
    mockRevisionCount();
    mocks.authState.user = { id: 'user-a', email: 'student@example.com' };
    mocks.authState.profile = { display_name: '학생 A' };
    mocks.authState.getGitHubToken = vi.fn().mockResolvedValue(null);
    vi.stubGlobal('fetch', vi.fn());
    mocks.codeState.saveCode = vi.fn().mockResolvedValue({
      data: {
        id: 'code-1',
        project_id: 'project-1',
        _revision: { id: 'revision-1' },
      },
      error: null,
    });
    useProjectStore.setState({
      activeProject: {
        id: 'project-1',
        title: '팀 프로젝트',
        github_repo: 'owner/repo',
      },
      activeMembers: [],
      activeCodeId: 'code-1',
      activeCodeSnapshot: 'loaded-base',
      projectSaveStatus: null,
      lastRemoteUpdate: null,
    });
  });

  it('GitHub 토큰이 없어도 VPyLab 저장을 성공 처리하고 대기 작업을 blocked로 남긴다', async () => {
    const result = await useProjectStore.getState().saveAndPush({
      code: 'print("hello")',
      message: '저장',
    });

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      localOnly: true,
      pendingGitHub: false,
      savedCodeId: 'code-1',
    });
    expect(mocks.codeState.saveCode).toHaveBeenCalledWith(expect.objectContaining({
      id: 'code-1',
      projectId: 'project-1',
      code: 'print("hello")',
    }));

    const jobs = JSON.parse(localStorage.getItem('vpylab:github-sync-pending:v1'));
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      id: 'code:revision-1',
      blocked: true,
      lastErrorCode: 'github_auth_required',
      authorId: 'user-a',
      projectId: 'project-1',
      repoFullName: 'owner/repo',
      revisionId: 'revision-1',
    });
  });

  it('GitHub 토큰 확인 오류가 나도 저장 결과를 실패로 바꾸지 않는다', async () => {
    mocks.authState.getGitHubToken = vi.fn().mockRejectedValue(
      new Error('GitHub 인증 확인이 지연되고 있습니다.'),
    );

    const result = await useProjectStore.getState().saveAndPush({
      code: 'print("still saved")',
      message: '토큰 지연',
    });

    expect(result.error).toBeNull();
    expect(result.data.localOnly).toBe(true);
    expect(result.data.pagesWarning).toContain('VPyLab에는 저장했습니다');

    const jobs = JSON.parse(localStorage.getItem('vpylab:github-sync-pending:v1'));
    expect(jobs[0].lastErrorCode).toBe('github_auth_required');
  });

  it('GitHub 403 권한 없음은 VPyLab 저장 성공 후 permission blocked로 멈춘다', async () => {
    mockGithubSyncSupabase();
    mocks.authState.getGitHubToken = vi.fn().mockResolvedValue('gh-token');
    fetch.mockResolvedValueOnce(jsonResponse(false, 403, {
      error: 'GitHub 쓰기 권한이 없습니다. collaborator 초대를 수락해야 합니다.',
      code: 'github_write_permission_required',
    }));

    const result = await useProjectStore.getState().saveAndPush({
      code: 'print("permission")',
      message: '권한 테스트',
    });

    expect(result.error).toBeNull();
    expect(result.data.localOnly).toBe(true);
    expect(result.data.pendingGitHub).toBe(false);
    expect(result.data.pagesWarning).toContain('collaborator');

    const jobs = JSON.parse(localStorage.getItem('vpylab:github-sync-pending:v1'));
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      blocked: true,
      lastErrorCode: 'github_permission_required',
      authorId: 'user-a',
      attempts: 1,
      nextRetryAt: null,
    });
  });

  it('GitHub 2FA 요구는 VPyLab 저장 성공 후 2FA blocked로 멈춘다', async () => {
    mockGithubSyncSupabase();
    mocks.authState.getGitHubToken = vi.fn().mockResolvedValue('gh-token');
    fetch.mockResolvedValueOnce(jsonResponse(false, 403, {
      error: 'GitHub 코드 반영이 GitHub 계정의 2단계 인증(2FA) 요구 때문에 막혔습니다.',
      code: 'github_2fa_required',
    }));

    const result = await useProjectStore.getState().saveAndPush({
      code: 'print("2fa")',
      message: '2FA 테스트',
    });

    expect(result.error).toBeNull();
    expect(result.data.localOnly).toBe(true);
    expect(result.data.pendingGitHub).toBe(false);
    expect(result.data.pagesWarning).toContain('2단계 인증');

    const jobs = JSON.parse(localStorage.getItem('vpylab:github-sync-pending:v1'));
    expect(jobs[0]).toMatchObject({
      blocked: true,
      lastErrorCode: 'github_2fa_required',
      authorId: 'user-a',
      attempts: 1,
      nextRetryAt: null,
    });
  });

  it('GitHub 404 repo 접근 불가는 VPyLab 저장 성공 후 repo blocked로 멈춘다', async () => {
    mockGithubSyncSupabase();
    mocks.authState.getGitHubToken = vi.fn().mockResolvedValue('gh-token');
    fetch.mockResolvedValueOnce(jsonResponse(false, 404, {
      error: 'GitHub 저장소를 찾을 수 없거나 이 GitHub 계정에 접근 권한이 없습니다.',
      code: 'repo_not_accessible',
    }));

    const result = await useProjectStore.getState().saveAndPush({
      code: 'print("missing repo")',
      message: '저장소 테스트',
    });

    expect(result.error).toBeNull();
    expect(result.data.localOnly).toBe(true);
    expect(result.data.pendingGitHub).toBe(false);

    const jobs = JSON.parse(localStorage.getItem('vpylab:github-sync-pending:v1'));
    expect(jobs[0]).toMatchObject({
      blocked: true,
      lastErrorCode: 'github_repo_unavailable',
      authorId: 'user-a',
      attempts: 1,
      nextRetryAt: null,
    });
  });

  it('권한 수정 후 GitHub 성공 응답이면 pending job을 제거하고 GitHub 결과를 반환한다', async () => {
    mockGithubSyncSupabase({ count: 1 });
    mocks.authState.getGitHubToken = vi.fn().mockResolvedValue('gh-token');
    fetch.mockResolvedValueOnce(jsonResponse(true, 200, {
      commitSha: 'abc123',
      pageCommitSha: 'def456',
      commitUrl: 'https://github.com/owner/repo/commit/abc123',
      pageCommitUrl: 'https://github.com/owner/repo/commit/def456',
      repoUrl: 'https://github.com/owner/repo',
      pagesUrl: 'https://owner.github.io/repo/',
      pagesStatus: 'built',
    }));

    const result = await useProjectStore.getState().saveAndPush({
      code: 'print("after collaborator accepted")',
      message: '권한 수정 후 저장',
    });

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      commitSha: 'abc123',
      pageCommitSha: 'def456',
      repoUrl: 'https://github.com/owner/repo',
      pagesUrl: 'https://owner.github.io/repo/',
      savedCodeId: 'code-1',
    });
    expect(JSON.parse(localStorage.getItem('vpylab:github-sync-pending:v1'))).toEqual([]);
  });

  it('계정이 다른 pending job은 자동 재시도하지 않는다', async () => {
    mockGithubSyncSupabase();
    mocks.authState.getGitHubToken = vi.fn().mockResolvedValue('gh-token');
    localStorage.setItem('vpylab:github-sync-pending:v1', JSON.stringify([{
      id: 'code:other-user-revision',
      kind: 'code',
      projectId: 'project-1',
      codeId: 'code-1',
      repoFullName: 'owner/repo',
      title: '팀 프로젝트',
      message: '다른 계정 저장',
      authorId: 'user-b',
      revisionId: 'other-user-revision',
      blocked: true,
      lastErrorCode: 'github_permission_required',
      createdAt: new Date().toISOString(),
    }]));

    const result = await useProjectStore.getState().flushPendingGithubSync('project-1', { force: true });

    expect(result).toEqual({ started: 0, skipped: 1 });
    expect(fetch).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('vpylab:github-sync-pending:v1'))[0]).toMatchObject({
      id: 'code:other-user-revision',
      authorId: 'user-b',
      lastErrorCode: 'github_permission_required',
    });
  });

  it('깨진 pending job은 retryable 루프 대신 blocked로 고정한다', async () => {
    mockGithubSyncSupabase();
    mocks.authState.getGitHubToken = vi.fn().mockResolvedValue('gh-token');
    localStorage.setItem('vpylab:github-sync-pending:v1', JSON.stringify([{
      id: 'code:broken',
      kind: 'code',
      projectId: 'project-1',
      title: '팀 프로젝트',
      authorId: 'user-a',
      createdAt: new Date().toISOString(),
    }]));

    const result = await useProjectStore.getState().flushPendingGithubSync('project-1', { force: true });

    expect(result).toEqual({ started: 1, skipped: 0 });
    await waitForCondition(() => {
      const [job] = JSON.parse(localStorage.getItem('vpylab:github-sync-pending:v1'));
      expect(job).toMatchObject({
        blocked: true,
        lastErrorCode: 'github_invalid_pending_job',
        nextRetryAt: null,
      });
    });
  });

  it('같은 pending job이 동시에 요청되면 하나의 GitHub 요청을 공유한다', async () => {
    mockGithubSyncSupabase({ count: 1 });
    mocks.authState.getGitHubToken = vi.fn().mockResolvedValue('gh-token');
    const response = deferred();
    fetch.mockReturnValue(response.promise);

    const first = useProjectStore.getState().saveAndPush({
      code: 'print("same revision")',
      message: '동시 저장',
    });
    const second = useProjectStore.getState().saveAndPush({
      code: 'print("same revision")',
      message: '동시 저장',
    });

    await waitForCondition(() => expect(fetch).toHaveBeenCalledTimes(1));
    response.resolve(jsonResponse(true, 200, {
      commitSha: 'shared123',
      repoUrl: 'https://github.com/owner/repo',
      pagesUrl: 'https://owner.github.io/repo/',
    }));

    const results = await Promise.all([first, second]);

    expect(results[0].error).toBeNull();
    expect(results[1].error).toBeNull();
    expect(results[0].data.commitSha).toBe('shared123');
    expect(results[1].data.commitSha).toBe('shared123');
    expect(JSON.parse(localStorage.getItem('vpylab:github-sync-pending:v1'))).toEqual([]);
  });

  it.each(['github_conflict_exhausted', 'github_commit_rejected', 'revision_required', 'revision_snapshot_mismatch'])(
    '%s 실패는 VPyLab 저장을 유지하고 자동 재시도와 force 재시도를 중단한다', async code => {
      mockGithubSyncSupabase();
      mocks.authState.getGitHubToken.mockResolvedValue('gh-token');
      fetch.mockResolvedValue(jsonResponse(false, code === 'github_commit_rejected' ? 422 : 409, { code, error: '반영을 중단했습니다.' }));
      const result = await useProjectStore.getState().saveAndPush({ code: 'safe-local', message: '검증' });
      expect(result.error).toBeNull();
      expect(result.data.localOnly).toBe(true);
      expect(mocks.codeState.saveCode).toHaveBeenCalledWith(expect.objectContaining({ code: 'safe-local' }));
      expect(JSON.parse(localStorage.getItem('vpylab:github-sync-pending:v1'))[0]).toMatchObject({ blocked: true, lastErrorCode: code, nextRetryAt: null });
      for (let n = 0; n < 5; n++) expect((await useProjectStore.getState().flushPendingGithubSync('project-1', { force: true })).started).toBe(0);
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it('네트워크·서버 실패가 다섯 번 누적되면 이전 작업은 자동 반복하지 않는다', async () => {
    mockGithubSyncSupabase();
    mocks.authState.getGitHubToken.mockResolvedValue('gh-token');
    fetch.mockRejectedValue(new Error('Network unavailable'));
    localStorage.setItem('vpylab:github-sync-pending:v1', JSON.stringify([{
      id: 'code:retry-limit', kind: 'code', projectId: 'project-1', codeId: 'code-1', repoFullName: 'owner/repo',
      revisionId: 'retry-limit', authorId: 'user-a', attempts: 4, createdAt: new Date().toISOString(),
    }]));
    await useProjectStore.getState().flushPendingGithubSync('project-1');
    await waitForCondition(() => expect(JSON.parse(localStorage.getItem('vpylab:github-sync-pending:v1'))[0]).toMatchObject({
      attempts: 5, blocked: true, lastErrorCode: 'github_retry_exhausted', nextRetryAt: null,
    }));
    for (let n = 0; n < 10; n++) await useProjectStore.getState().flushPendingGithubSync('project-1', { force: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('새 저장이 force 검사를 요청해도 실패 작업의 backoff 시간을 무시하지 않는다', async () => {
    mockGithubSyncSupabase();
    mocks.authState.getGitHubToken.mockResolvedValue('gh-token');
    localStorage.setItem('vpylab:github-sync-pending:v1', JSON.stringify([{
      id: 'code:backoff', kind: 'code', projectId: 'project-1', codeId: 'code-1', repoFullName: 'owner/repo',
      revisionId: 'backoff', authorId: 'user-a', attempts: 1, nextRetryAt: new Date(Date.now() + 60000).toISOString(),
    }]));
    const result = await useProjectStore.getState().flushPendingGithubSync('project-1', { force: true });
    expect(result).toMatchObject({ started: 0, skipped: 1 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('코드는 저장됐지만 이력 생성이 실패하면 검증 없이 GitHub에 보내지 않는다', async () => {
    mockGithubSyncSupabase();
    mocks.authState.getGitHubToken.mockResolvedValue('gh-token');
    mocks.codeState.saveCode.mockResolvedValue({ data: { id: 'code-1', _revisionPending: true, _revisionWarning: '이력 생성 실패' }, error: null });
    const result = await useProjectStore.getState().saveAndPush({ code: 'local-only', message: '검증' });
    expect(result.error).toBeNull();
    expect(result.data.localOnly).toBe(true);
    expect(result.data.pagesWarning).toContain('이력');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('GitHub 커밋 후 표시용 횟수 조회가 실패해도 성공을 재시도 대기열로 되돌리지 않는다', async () => {
    mocks.authState.getGitHubToken.mockResolvedValue('gh-token');
    mocks.supabaseFrom.mockImplementation(() => ({
      select: () => {
        const promise = Promise.reject(new Error('표시용 DB 조회 실패'));
        const chain = { eq: () => chain, not: () => chain, then: promise.then.bind(promise) };
        return chain;
      },
      update: () => makeResolvedChain({ data: null, error: null }),
    }));
    fetch.mockResolvedValue(jsonResponse(true, 200, { commitSha: 'completed-commit', repoUrl: 'https://github.com/owner/repo' }));
    const result = await useProjectStore.getState().saveAndPush({ code: 'saved-on-github', message: '검증' });
    expect(result.error).toBeNull();
    expect(result.data.commitSha).toBe('completed-commit');
    expect(JSON.parse(localStorage.getItem('vpylab:github-sync-pending:v1'))).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('응답 헤더 뒤 본문이 멈춰도 45초에 요청을 종료하고 무한 대기하지 않는다', async () => {
    vi.useFakeTimers();
    try {
      mockGithubSyncSupabase();
      mocks.authState.getGitHubToken.mockResolvedValue('gh-token');
      fetch.mockResolvedValue({ ok: true, status: 200, json: () => new Promise(() => {}) });
      const saving = useProjectStore.getState().saveAndPush({ code: 'local-code', message: '느린 네트워크' });
      await vi.advanceTimersByTimeAsync(3500);
      const result = await saving;
      expect(result.error).toBeNull();
      expect(result.data.pendingGitHub).toBe(true);
      await vi.advanceTimersByTimeAsync(45000);
      expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
      expect(JSON.parse(localStorage.getItem('vpylab:github-sync-pending:v1'))[0]).toMatchObject({ attempts: 1, blocked: false });
    } finally { vi.useRealTimers(); }
  });

  it('공동 본문 충돌 시 내 편집본과 비교 기준을 유지하고 GitHub 반영을 시작하지 않는다', async () => {
    mocks.codeState.saveCode.mockResolvedValue({ data: null, error: { code: 'saved_code_conflict', message: '다른 친구의 저장이 먼저 반영됐습니다.' } });
    const result = await useProjectStore.getState().saveAndPush({ code: 'my-edits', message: '검증' });
    expect(result.error.code).toBe('saved_code_conflict');
    expect(mocks.codeState.saveCode).toHaveBeenCalledWith(expect.objectContaining({ expectedCode: 'loaded-base', code: 'my-edits' }));
    expect(useProjectStore.getState().activeCodeSnapshot).toBe('loaded-base');
    expect(fetch).not.toHaveBeenCalled();
  });
});
