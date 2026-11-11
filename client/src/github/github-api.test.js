import { describe, expect, it, vi } from 'vitest';
import { createFakeGitHub } from './fake-github.js';
import {
  GitHubError, PROJECT_TOPIC, appendHistorySection, classifyGitHubError, cleanRecord, createGitHubApi, decodeBase64Utf8, encodeBase64Utf8,
  formatLocalTimestamp, generateFallbackHtml, generateInitialHistory, normalizeRepoNameInput, parseRepoFullName, sanitizeGithubUsername,
  sanitizeRepoName,
} from './github-api.js';

const NOW = new Date(2026, 10, 12, 9, 30);

function setup({ token = 'token-ada', tokens = { 'token-ada': 'ada', 'token-bo': 'bo' } } = {}) {
  const github = createFakeGitHub({ tokens });
  const sleeps = [];
  const api = createGitHubApi({
    getToken: () => token,
    fetchImpl: github.fetchImpl,
    sleep: async (ms) => { sleeps.push(ms); },
    now: () => NOW,
    randomSuffix: () => 'rand06',
  });
  const as = (other) => createGitHubApi({ getToken: () => other, fetchImpl: github.fetchImpl, sleep: async () => {}, now: () => NOW });
  return { github, api, sleeps, as };
}

const rejectsWith = async (promise, reason) => {
  const error = await promise.then(() => null, (e) => e);
  expect(error).toBeInstanceOf(GitHubError);
  expect(error.reason).toBe(reason);
  return error;
};

describe('이름·글자 도우미', () => {
  it('저장소 이름: 영어 제목은 그대로, 한글 제목은 해시 6자로 구분한다', async () => {
    expect(await sanitizeRepoName('Solar System!')).toMatch(/^solar-system-[0-9a-f]{6}$/);
    const korean = await sanitizeRepoName('태양계 만들기');
    expect(korean).toMatch(/^project-[0-9a-f]{6}$/);
    expect(await sanitizeRepoName('달 탐사')).not.toBe(korean);
    expect((await sanitizeRepoName('a'.repeat(80))).length).toBeLessThanOrEqual(39);
  });

  it('직접 정한 저장소 이름과 GitHub 아이디를 서버와 같은 규칙으로 검사한다', () => {
    expect(normalizeRepoNameInput('  My Team_Project  ')).toBe('my-teamproject');
    expect(normalizeRepoNameInput('태양계')).toBe('');
    expect(sanitizeGithubUsername('@Ada-Lovelace')).toBe('Ada-Lovelace');
    for (const bad of ['-ada', 'ada-', 'a/b', 'ada lovelace', '', 'a'.repeat(40)]) expect(sanitizeGithubUsername(bad)).toBe('');
    expect(parseRepoFullName('ada/vpylab-solar')).toEqual({ owner: 'ada', repo: 'vpylab-solar' });
    for (const bad of ['ada', 'ada/../x', 'ada/x/y', '/x', 'ada/', 'https://github.com/ada/x']) expect(parseRepoFullName(bad)).toBeNull();
  });

  it('한글 코드를 base64로 바꾸고 되돌린다', () => {
    const code = '# 공 튀기기\nball = sphere(color=color.red)\n';
    expect(decodeBase64Utf8(encodeBase64Utf8(code))).toBe(code);
  });

  it('기록 세 칸에서 마크다운 제목 표시와 줄바꿈을 지우고, 모두 비면 null', () => {
    expect(cleanRecord({ did: '# 제목\n공을 만들었다', blocker: '  ', next: '' })).toEqual({ did: '제목 공을 만들었다', blocker: '', next: '' });
    expect(cleanRecord({ did: ' ', blocker: '', next: '' })).toBeNull();
    expect(cleanRecord(null)).toBeNull();
  });

  it('history.md: 새 기록이 위에 추가되고 선택 기록 세 칸이 들어간다', () => {
    const first = generateInitialHistory('공 `튀기기`', 'ada', NOW);
    expect(first).toContain("`공 '튀기기'` 프로젝트를 저장한 기록입니다.");
    const next = appendHistorySection(first, {
      message: '중력 추가', author: 'bo', record: { did: '중력을 넣었다', blocker: '', next: '바닥 충돌' }, codeLines: 12, lineDelta: 3,
    }, new Date(2026, 10, 12, 10, 5));
    const stamp = formatLocalTimestamp(new Date(2026, 10, 12, 10, 5));
    expect(next.indexOf(`## ${stamp}`)).toBeLessThan(next.indexOf(`## ${formatLocalTimestamp(NOW)}`));
    expect(next).toContain('- 메시지: 중력 추가\n- 작성자: bo\n- 한 일: 중력을 넣었다\n- 다음 할 일: 바닥 충돌\n- 코드: 12줄 (+3)\n');
    expect(next).not.toContain('막힌 점');
    expect(next.startsWith('# 저장 기록\n')).toBe(true);
    // 머리말이 없는 파일에도 추가한다
    expect(appendHistorySection('', { message: 'm', author: 'a' }, NOW)).toContain('# 저장 기록\n\n---\n\n## ');
  });

  it('정적 화면은 제목과 코드를 글자로만 넣는다', () => {
    const html = generateFallbackHtml({ title: '<b>x</b>', code: '</pre><script>alert(1)</script>', owner: 'ada', repo: 'r', openUrl: 'javascript:alert(1)' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).not.toContain('javascript:');
  });

  it('오류 분류: 401·2단계 인증·요청 제한·권한', () => {
    expect(classifyGitHubError(401, {})).toBe('auth');
    expect(classifyGitHubError(403, { message: 'You must enable two-factor authentication' })).toBe('twoFactor');
    expect(classifyGitHubError(403, { message: 'API rate limit exceeded for user' })).toBe('rate');
    expect(classifyGitHubError(403, { message: 'x' }, { get: (name) => (name === 'x-ratelimit-remaining' ? '0' : null) })).toBe('rate');
    expect(classifyGitHubError(403, { message: 'Resource not accessible' })).toBe('forbidden');
    expect(classifyGitHubError(404, {})).toBe('notFound');
    expect(classifyGitHubError(409, {})).toBe('conflict');
    expect(classifyGitHubError(422, {})).toBe('rejected');
    expect(classifyGitHubError(503, {})).toBe('server');
  });
});

describe('요청', () => {
  it('토큰이 없으면 요청하지 않고 auth, 무효 토큰(401)도 auth', async () => {
    const { github } = setup();
    const none = createGitHubApi({ getToken: () => '', fetchImpl: github.fetchImpl });
    await rejectsWith(none.me(), 'auth');
    expect(github.state.log).toHaveLength(0);
    const bad = createGitHubApi({ getToken: () => 'wrong', fetchImpl: github.fetchImpl });
    const error = await rejectsWith(bad.me(), 'auth');
    expect(error.status).toBe(401);
    expect(JSON.stringify({ ...error, message: error.message })).not.toContain('wrong');
  });

  it('읽기는 5xx·네트워크 오류에서 다시 보내고, 브라우저 캐시를 사용하지 않는다', async () => {
    const { github, api, sleeps } = setup();
    github.failNext({ test: /^\/user$/, status: 502 });
    github.failNext({ test: /^\/user$/, network: true });
    expect((await api.me()).login).toBe('ada');
    expect(sleeps).toEqual([400, 1200]);
    expect(github.state.log.every((entry) => entry.cache === 'no-store')).toBe(true);
  });

  it('읽기 재시도를 다 쓰면 network로 실패한다', async () => {
    const { github, api } = setup();
    github.failNext({ test: /^\/user$/, network: true, times: 3 });
    await rejectsWith(api.me(), 'network');
  });

  it('쓰기는 5xx에서 다시 보내지 않는다', async () => {
    const { github, api } = setup();
    github.createRepo('ada', 'p', { topics: [PROJECT_TOPIC], files: { 'main.py': 'a' } });
    github.failNext({ method: 'PUT', test: /collaborators/, status: 500 });
    await rejectsWith(api.invite('ada/p', 'bo'), 'server');
    expect(github.calls('PUT', /collaborators/)).toHaveLength(1);
  });

  it('응답이 없으면 시간 제한으로 끊고 timeout', async () => {
    vi.useFakeTimers();
    try {
      const { github } = setup();
      const api = createGitHubApi({ getToken: () => 'token-ada', fetchImpl: github.fetchImpl, timeoutMs: 1000, sleep: async () => {} });
      github.failNext({ test: /^\/user$/, hang: true });
      const pending = rejectsWith(api.me(), 'timeout');
      await vi.advanceTimersByTimeAsync(1001);
      await pending;
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('프로젝트 만들기·열기', () => {
  it('공개 저장소를 만들고 첫 커밋 네 파일, topic, Pages를 차례로 처리한다', async () => {
    const { github, api } = setup();
    const html = vi.fn(({ fullName, repoUrl }) => `<html>${fullName} ${repoUrl}</html>`);
    const result = await api.createProject({ title: 'Solar System', code: 'sphere()', html });
    const { project } = result;
    expect(project.fullName).toMatch(/^ada\/vpylab-solar-system-[0-9a-f]{6}$/);
    expect(project).toMatchObject({ owner: 'ada', title: 'Solar System', canPush: true, canAdmin: true, isOwner: true });
    expect(project.htmlUrl).toBe(`https://github.com/${project.fullName}`);
    expect(project.pagesUrl).toBe(`https://ada.github.io/${project.repo}/`);
    expect(result.pagesWarning).toBeUndefined();

    const repo = github.repo(project.fullName);
    expect(repo.head).toBe(result.headSha);
    expect(github.file(project.fullName, 'main.py')).toBe('sphere()');
    expect(github.file(project.fullName, 'index.html')).toBe(`<html>${project.fullName} https://github.com/${project.fullName}</html>`);
    expect(github.file(project.fullName, 'README.md')).toContain('# Solar System');
    expect(github.file(project.fullName, 'history.md')).toContain('- 메시지: 프로젝트 시작\n- 작성자: ada');
    expect([...repo.topics]).toEqual([PROJECT_TOPIC]);
    expect(repo.pages).toEqual({ branch: 'main', path: '/' });
    // 빈 저장소는 tree 만들기가 409로 거절되어 Contents API로 첫 파일을 만든 뒤 나머지를 맞춘다
    expect(github.calls('PUT', /contents\/main\.py$/)).toHaveLength(1);
    expect((await api.listProjects()).map((p) => p.fullName)).toEqual([project.fullName]);
  });

  it('같은 이름의 저장소가 있으면 -2를 붙이고, 다 겹치면 무작위 6자를 붙인다', async () => {
    const { github, api } = setup();
    const base = `vpylab-${await sanitizeRepoName('공')}`;
    github.createRepo('ada', base);
    expect((await api.createProject({ title: '공', code: 'a' })).project.repo).toBe(`${base}-2`);
    for (const suffix of ['-3', '-4']) github.createRepo('ada', `${base}${suffix}`);
    expect((await api.createProject({ title: '공', code: 'a' })).project.repo).toBe(`${base}-rand06`);
  });

  it('직접 정한 이름이 이미 있으면 대체 이름을 쓰지 않고 invalidName(taken)', async () => {
    const { github, api } = setup();
    github.createRepo('ada', 'my-game');
    const error = await rejectsWith(api.createProject({ title: '게임', code: 'a', repoName: 'My Game' }), 'invalidName');
    expect(error.detail).toBe('taken');
    expect((await rejectsWith(api.createProject({ title: '게임', code: 'a', repoName: '게임' }), 'invalidName')).detail).toBe('repo');
    expect(github.calls('POST', /^\/user\/repos$/)).toHaveLength(1);
  });

  it('코드가 비었거나 100KB를 넘으면 저장소를 만들지 않는다', async () => {
    const { github, api } = setup();
    await rejectsWith(api.createProject({ title: 't', code: '   ' }), 'empty');
    await rejectsWith(api.createProject({ title: 't', code: '가'.repeat(40_000) }), 'tooLarge');
    await rejectsWith(api.createProject({ title: '  ', code: 'a' }), 'invalidName');
    expect(github.state.log).toHaveLength(0);
  });

  it('새 저장소의 준비가 늦으면 기다렸다가 첫 커밋을 다시 시도한다', async () => {
    const { github, api, sleeps } = setup();
    github.failNext({ method: 'PUT', test: /contents\/main\.py$/, status: 404, body: { message: 'Not Found' }, times: 2 });
    const { project } = await api.createProject({ title: 'slow', code: 'a' });
    expect(sleeps.slice(0, 2)).toEqual([500, 1500]);
    expect(github.file(project.fullName, 'main.py')).toBe('a');
  });

  it('Pages를 켜지 못해도 프로젝트는 만들어지고 까닭만 돌려준다', async () => {
    const { github, api } = setup();
    github.state.pagesForbidden = true;
    const result = await api.createProject({ title: 'no pages', code: 'a' });
    expect(result.pagesWarning).toBe('forbidden');
    expect(result.project.pagesUrl).toBeNull();
    expect(github.file(result.project.fullName, 'main.py')).toBe('a');
  });

  it('2단계 인증 요구로 저장소를 만들지 못하면 twoFactor', async () => {
    const { github, api } = setup();
    github.failNext({ method: 'POST', test: /^\/user\/repos$/, status: 403, body: { message: 'You must enable two-factor authentication to create repositories.' } });
    await rejectsWith(api.createProject({ title: 't', code: 'a' }), 'twoFactor');
  });

  it('첫 커밋에 실패하면 오류에 만들어진 저장소 이름을 남긴다', async () => {
    const { github, api } = setup();
    github.failNext({ method: 'PUT', test: /contents\/main\.py$/, status: 500 });
    const error = await rejectsWith(api.createProject({ title: 'broken', code: 'a' }), 'server');
    expect(error.fullName).toMatch(/^ada\/vpylab-broken-/);
  });

  it('실행형 HTML을 만들지 못하면 정적 화면으로 대신한다', async () => {
    const { github, api } = setup();
    const { project } = await api.createProject({ title: 'fallback', code: 'box()', html: () => { throw new Error('chunk'); } });
    expect(github.file(project.fullName, 'index.html')).toContain('<pre><code>box()</code></pre>');
  });

  it('프로젝트를 열면 최신 코드와 커밋을 돌려주고, main.py가 없으면 빈 문자열과 표시를 돌려준다', async () => {
    const { github, api } = setup();
    github.createRepo('bo', 'team', { description: '우리 팀', topics: [PROJECT_TOPIC], files: { 'main.py': '# 한글\nsphere()' } });
    const opened = await api.readProject('bo/team');
    expect(opened).toMatchObject({ code: '# 한글\nsphere()', missingMain: false, headSha: github.repo('bo/team').head });
    expect(opened.project).toMatchObject({ title: '우리 팀', canPush: false, isOwner: false });

    github.createRepo('ada', 'empty', { topics: [PROJECT_TOPIC] });
    expect(await api.readProject('ada/empty')).toMatchObject({ code: '', missingMain: true, headSha: null });
    github.createRepo('ada', 'nomain', { files: { 'README.md': 'x' } });
    expect(await api.readProject('ada/nomain')).toMatchObject({ code: '', missingMain: true });
    await rejectsWith(api.readProject('ada/none'), 'notFound');
    await rejectsWith(api.readProject('../etc'), 'invalidName');
  });

  it('목록에는 topic이 붙은 내 저장소와 협업 저장소만 나온다', async () => {
    const { github, api } = setup();
    github.createRepo('ada', 'mine', { topics: [PROJECT_TOPIC], files: { 'main.py': 'a' } });
    github.createRepo('ada', 'dotfiles', { files: { 'x': 'a' } });
    github.createRepo('bo', 'team', { topics: [PROJECT_TOPIC], files: { 'main.py': 'a' } }).collaborators.add('ada');
    github.createRepo('bo', 'private-work', { topics: [PROJECT_TOPIC] });
    const projects = await api.listProjects();
    expect(projects.map((p) => [p.fullName, p.isOwner, p.canPush])).toEqual([['ada/mine', true, true], ['bo/team', false, true]]);
  });
});

describe('저장(커밋)', () => {
  async function project() {
    const ctx = setup();
    const created = await ctx.api.createProject({ title: 'team', code: 'v1', html: () => '<html>v1</html>' });
    ctx.github.state.log.length = 0; // 아래 시험은 만든 뒤의 요청만 셉니다.
    return { ...ctx, fullName: created.project.fullName, headSha: created.headSha };
  }

  it('세 파일을 한 커밋으로 저장하고 기록을 history.md와 커밋 메시지에 남긴다', async () => {
    const { github, api, fullName, headSha } = await project();
    const result = await api.commit({
      fullName, code: 'v2', html: '<html>v2</html>', message: '중력 추가', author: 'ada', baseSha: headSha,
      record: { did: '중력을 넣었다', blocker: '충돌이 어렵다', next: '바닥' }, codeLines: 1, lineDelta: 0,
    });
    expect(result).toMatchObject({ status: 'saved', commitUrl: `https://github.com/${fullName}/commit/${result.headSha}` });
    const repo = github.repo(fullName);
    expect(repo.head).toBe(result.headSha);
    expect(repo.commits.get(result.headSha).parents).toEqual([headSha]);
    expect(repo.commits.get(result.headSha).message).toBe('중력 추가\n\n한 일: 중력을 넣었다\n막힌 점: 충돌이 어렵다\n다음 할 일: 바닥');
    expect(github.file(fullName, 'main.py')).toBe('v2');
    expect(github.file(fullName, 'index.html')).toBe('<html>v2</html>');
    expect(github.file(fullName, 'history.md')).toContain('- 메시지: 중력 추가\n- 작성자: ada\n- 한 일: 중력을 넣었다\n- 막힌 점: 충돌이 어렵다\n- 다음 할 일: 바닥\n- 코드: 1줄 (+0)');
    expect(github.file(fullName, 'README.md')).toContain('# team');
    // 커밋 하나만 늘었다(파일마다 따로 커밋하지 않는다)
    expect(github.calls('POST', /git\/commits$/)).toHaveLength(1);
    expect(github.calls('PATCH', /git\/refs/).length).toBe(1);
  });

  it('팀원이 먼저 저장했으면 쓰지 않고 충돌과 원격 코드를 돌려준다', async () => {
    const { github, api, fullName, headSha } = await project();
    const remoteHead = github.remoteCommit(fullName, { 'main.py': 'teammate' });
    const result = await api.commit({ fullName, code: 'mine', message: 'm', author: 'ada', baseSha: headSha });
    expect(result).toEqual({ status: 'conflict', remote: { headSha: remoteHead, code: 'teammate' } });
    expect(github.repo(fullName).head).toBe(remoteHead);
    expect(github.calls('POST', /git\/trees$/)).toHaveLength(0);
  });

  it('baseSha를 모르면 덮어쓰지 않고 충돌로 본다', async () => {
    const { api, fullName } = await project();
    expect((await api.commit({ fullName, code: 'mine', message: 'm', author: 'ada' })).status).toBe('conflict');
  });

  it('force면 최신 커밋 위에 내 코드로 새 커밋을 만들고, 팀원의 커밋은 기록에 남는다', async () => {
    const { github, api, fullName, headSha } = await project();
    const remoteHead = github.remoteCommit(fullName, { 'main.py': 'teammate' });
    const result = await api.commit({ fullName, code: 'mine', message: 'm', author: 'ada', baseSha: headSha, force: true });
    expect(result.status).toBe('saved');
    expect(github.repo(fullName).commits.get(result.headSha).parents).toEqual([remoteHead]);
    expect(github.file(fullName, 'main.py')).toBe('mine');
    // 브랜치를 강제로 밀지 않는다
    expect(github.calls('PATCH', /git\/refs/).map((call) => call.body.force)).toEqual([false]);
  });

  it('원격이 이미 내 코드와 같으면(앞선 저장이 늦게 반영됨) 저장된 것으로 본다', async () => {
    const { github, api, fullName, headSha } = await project();
    const remoteHead = github.remoteCommit(fullName, { 'main.py': 'mine' }, { login: 'ada' });
    expect(await api.commit({ fullName, code: 'mine', message: 'm', author: 'ada', baseSha: headSha }))
      .toMatchObject({ status: 'saved', headSha: remoteHead, alreadySaved: true });
  });

  it('결과를 모르던 내 저장 시도가 원격에 반영되어 있으면 충돌로 보지 않고 그 위에 저장한다', async () => {
    const { github, api, fullName, headSha } = await project();
    const remoteHead = github.remoteCommit(fullName, { 'main.py': 'attempt' }, { login: 'ada' });
    const result = await api.commit({ fullName, code: 'next', message: 'm', author: 'ada', baseSha: headSha, ownCodes: ['attempt'] });
    expect(result.status).toBe('saved');
    expect(github.repo(fullName).commits.get(result.headSha).parents).toEqual([remoteHead]);
  });

  it('브랜치 갱신 직전에 팀원이 저장하면 강제로 밀지 않고 충돌로 알린다', async () => {
    const { github, fullName, headSha } = await project();
    const original = github.fetchImpl;
    const racing = createGitHubApi({
      getToken: () => 'token-ada', sleep: async () => {}, now: () => NOW,
      fetchImpl: async (url, init = {}) => {
        // 내 커밋 객체를 만든 직후, 브랜치를 옮기기 전에 팀원의 커밋이 들어옵니다.
        if (init.method === 'PATCH' && /git\/refs/.test(url) && !github.state.raced) {
          github.state.raced = true;
          github.remoteCommit(fullName, { 'main.py': 'teammate' });
        }
        return original(url, init);
      },
    });
    const result = await racing.commit({ fullName, code: 'mine', message: 'm', author: 'ada', baseSha: headSha });
    expect(result.status).toBe('conflict');
    expect(result.remote.code).toBe('teammate');
    expect(github.file(fullName, 'main.py')).toBe('teammate');
    expect(github.calls('PATCH', /git\/refs/).map((call) => call.body.force)).toEqual([false]);
  });

  it('쓰기 권한이 없으면 readOnly, 저장소 이름이 바뀌었으면 notFound(moved)', async () => {
    const { github, fullName, headSha, as } = await project();
    await rejectsWith(as('token-bo').commit({ fullName, code: 'x', message: 'm', author: 'bo', baseSha: headSha }), 'readOnly');
    expect(github.file(fullName, 'main.py')).toBe('v1');
    const renamed = github.repo(fullName);
    github.state.repos.set('ada/old-name', renamed);
    const error = await rejectsWith(as('token-ada').commit({ fullName: 'ada/old-name', code: 'x', message: 'm', baseSha: headSha }), 'notFound');
    expect(error.detail).toBe('moved');
  });

  it('코드 100KB 초과와 HTML 1MB 초과는 tooLarge', async () => {
    const { api, fullName, headSha } = await project();
    expect((await rejectsWith(api.commit({ fullName, code: 'a'.repeat(100 * 1024 + 1), message: 'm', baseSha: headSha }), 'tooLarge')).detail).toBe('code');
    expect((await rejectsWith(api.commit({ fullName, code: 'a', html: 'h'.repeat(1024 * 1024 + 1), message: 'm', baseSha: headSha }), 'tooLarge')).detail).toBe('html');
  });

  it('첫 커밋에 실패해 비어 있는 저장소에 저장하면 처음 파일을 모두 올린다', async () => {
    const { github, api } = setup();
    github.createRepo('ada', 'half', { description: '반쯤 만든 프로젝트', topics: [PROJECT_TOPIC] });
    const result = await api.commit({ fullName: 'ada/half', code: 'box()', message: '다시 저장', author: 'ada', baseSha: null });
    expect(result.status).toBe('saved');
    expect(github.file('ada/half', 'main.py')).toBe('box()');
    expect(github.file('ada/half', 'README.md')).toContain('# 반쯤 만든 프로젝트');
  });

  it('pages: true면 저장 뒤 Pages를 켜고, 켜지 못하면 저장 결과에 까닭을 붙인다', async () => {
    const { github, api } = setup();
    github.createRepo('ada', 'p', { topics: [PROJECT_TOPIC], files: { 'main.py': 'a', 'history.md': '' } });
    const head = github.repo('ada/p').head;
    const first = await api.commit({ fullName: 'ada/p', code: 'b', message: 'm', author: 'ada', baseSha: head, pages: true });
    expect(first).toMatchObject({ status: 'saved', pagesUrl: 'https://ada.github.io/p/' });
    expect(github.repo('ada/p').pages).toEqual({ branch: 'main', path: '/' });
    github.repo('ada/p').pages = null;
    github.state.pagesForbidden = true;
    const second = await api.commit({ fullName: 'ada/p', code: 'c', message: 'm', author: 'ada', baseSha: first.headSha, pages: true });
    expect(second).toMatchObject({ status: 'saved', pagesUrl: null, pagesWarning: 'forbidden' });
    expect(github.file('ada/p', 'main.py')).toBe('c');
  });

  it('최근 저장 기록을 돌려주고, 빈 저장소면 빈 배열', async () => {
    const { github, api, fullName, headSha } = await project();
    await api.commit({ fullName, code: 'v2', message: '둘째 저장', author: 'ada', baseSha: headSha });
    const commits = await api.history(fullName, { limit: 5 });
    expect(commits[0]).toMatchObject({ message: '둘째 저장', author: 'ada', url: `https://github.com/${fullName}/commit/${commits[0].sha}` });
    expect(commits.length).toBeGreaterThanOrEqual(2);
    github.createRepo('ada', 'empty');
    expect(await api.history('ada/empty')).toEqual([]);
  });
});

describe('팀원 초대', () => {
  function team() {
    const ctx = setup();
    ctx.github.createRepo('ada', 'team', { description: '팀 프로젝트', topics: [PROJECT_TOPIC], files: { 'main.py': 'a' } });
    return ctx;
  }

  it('초대 → 대기 목록 → 받은 초대 수락 → 협업자 목록과 내 프로젝트에 나타난다', async () => {
    const { api, as } = team();
    const bo = as('token-bo');
    const invited = await api.invite('ada/team', '@bo');
    expect(invited).toMatchObject({ username: 'bo', alreadyCollaborator: false });
    expect((await api.pendingInvitations('ada/team')).map((i) => i.invitee)).toEqual(['bo']);
    expect(await bo.listProjects()).toEqual([]);

    const mine = await bo.myInvitations();
    expect(mine).toEqual([expect.objectContaining({ fullName: 'ada/team', title: '팀 프로젝트', inviter: 'ada', htmlUrl: 'https://github.com/ada/team' })]);
    await bo.acceptInvitation(mine[0].id);
    expect(await bo.myInvitations()).toEqual([]);
    expect((await bo.listProjects())[0]).toMatchObject({ fullName: 'ada/team', canPush: true, isOwner: false });
    expect((await api.collaborators('ada/team')).map((c) => [c.login, c.isOwner])).toEqual([['ada', true], ['bo', false]]);
    expect(await api.pendingInvitations('ada/team')).toEqual([]);
    expect(await api.invite('ada/team', 'bo')).toMatchObject({ alreadyCollaborator: true });
  });

  it('받은 초대 가운데 VPyLab 프로젝트만 보이고, topic이 응답에 없으면 저장소를 읽어 확인한다', async () => {
    const { github, api, as } = team();
    github.createRepo('ada', 'homework', { files: { 'x': 'a' } });
    await api.invite('ada/team', 'bo');
    await api.invite('ada/homework', 'bo');
    const bo = as('token-bo');
    expect((await bo.myInvitations()).map((i) => i.fullName)).toEqual(['ada/team']);
    github.state.invitationTopics = false;
    expect((await bo.myInvitations()).map((i) => i.fullName)).toEqual(['ada/team']);
    github.state.userInvitations[0].expired = true;
    expect(await bo.myInvitations()).toEqual([]);
  });

  it('잘못된 아이디, 없는 사용자, 이미 초대한 사용자, 관리자가 아닌 경우를 구분한다', async () => {
    const { github, api, as } = team();
    expect((await rejectsWith(api.invite('ada/team', 'bad name'), 'invalidName')).detail).toBe('username');
    expect(github.state.log).toHaveLength(0);
    expect((await rejectsWith(api.invite('ada/team', 'ghost'), 'notFound')).detail).toBe('user');
    await api.invite('ada/team', 'bo');
    expect((await rejectsWith(api.invite('ada/team', 'bo'), 'rejected')).detail).toBe('invite');
    expect((await rejectsWith(as('token-bo').invite('ada/team', 'cy'), 'forbidden')).detail).toBe('adminRequired');
  });

  it('대기 중인 초대를 취소하고, 없는 초대는 notFound', async () => {
    const { github, api } = team();
    await api.invite('ada/team', 'bo');
    const [pending] = await api.pendingInvitations('ada/team');
    expect(await api.cancelInvitation('ada/team', pending.id)).toEqual({ cancelled: pending.id });
    expect(github.state.userInvitations).toHaveLength(0);
    await rejectsWith(api.cancelInvitation('ada/team', pending.id), 'notFound');
    await rejectsWith(api.cancelInvitation('ada/team', 'abc'), 'notFound');
    await rejectsWith(api.acceptInvitation(-1), 'notFound');
  });
});
