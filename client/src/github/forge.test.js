import { beforeEach, describe, expect, it } from 'vitest';
import { memoryStorage } from '../drive-lab/fake-google.js';
import { createFakeGitHub } from './fake-github.js';
import { GitHubError, createGitHubApi } from './github-api.js';
import { configureGitHub, useGitHubStore } from './githubSession.js';
import { FORGE_REPO, FORGE_TOPIC } from '../../../server/shared/forge-rules.js';

// 대장간 모듈을 내 GitHub 저장소(<아이디>/vpylab-forge)에 올리고 내리기. GitHub는 fake-github.js가 흉내 냅니다.

let github;
let storage;
const store = () => useGitHubStore.getState();
const apiAs = (token) => createGitHubApi({ getToken: () => token, fetchImpl: github.fetchImpl, sleep: async () => {} });
const CODE = '# vpylab-forge:v1 e30=\nfrom vpython import *\n';

beforeEach(() => {
  github = createFakeGitHub({ tokens: { 'token-ada': 'ada', 'token-bo': 'bo' } });
  storage = memoryStorage();
  configureGitHub({
    clientId: 'client-1',
    fetchImpl: github.fetchImpl,
    storage,
    origin: 'https://vpylab.example',
    login: () => ({ promise: Promise.resolve({ accessToken: 'token-ada', scope: 'public_repo,repo:invite' }), cancel: () => {}, url: '', state: 's' }),
    apiOptions: { sleep: async () => {} },
  });
});

const rejectsWith = async (promise, reason, detail) => {
  const error = await promise.then(() => null, (e) => e);
  expect(error).toBeInstanceOf(GitHubError);
  expect(error.reason).toBe(reason);
  if (detail) expect(error.detail).toBe(detail);
};

describe('GitHub API: 대장간 모듈 올리기', () => {
  it('저장소가 없으면 공개 저장소를 만들고 topic을 붙인 뒤 파일을 올린다', async () => {
    const api = apiAs('token-ada');
    const result = await api.putForgeModule({ owner: 'ada', id: 'bell-1', code: CODE, title: '맑은 종' });
    expect(result).toEqual({ owner: 'ada', id: 'bell-1', fileUrl: 'https://github.com/ada/vpylab-forge/blob/HEAD/modules/bell-1.py', changed: true, fresh: true });
    const created = github.calls('POST', /^\/user\/repos$/)[0].body;
    expect(created).toMatchObject({ name: FORGE_REPO, private: false, auto_init: true });
    expect([...github.repo('ada/vpylab-forge').topics]).toEqual([FORGE_TOPIC]);
    expect(github.file('ada/vpylab-forge', 'modules/bell-1.py')).toBe(CODE);
    expect(github.file('ada/vpylab-forge', 'README.md')).toContain('vpylab-forge');
  });

  it('같은 내용이면 다시 올리지 않고, 내용이 바뀌면 그 파일만 고친다', async () => {
    const api = apiAs('token-ada');
    await api.putForgeModule({ owner: 'ada', id: 'bell-1', code: CODE, title: '맑은 종' });
    const puts = () => github.calls('PUT', /\/contents\/modules\//).length;
    const before = puts();
    expect(await api.putForgeModule({ owner: 'ada', id: 'bell-1', code: CODE, title: '맑은 종' })).toMatchObject({ changed: false, fresh: false });
    expect(puts()).toBe(before);
    expect(github.calls('POST', /^\/user\/repos$/)).toHaveLength(1);

    const next = `${CODE}sphere()\n`;
    expect(await api.putForgeModule({ owner: 'ada', id: 'bell-1', code: next, title: '맑은 종' })).toMatchObject({ changed: true, fresh: false });
    expect(github.file('ada/vpylab-forge', 'modules/bell-1.py')).toBe(next);
    expect(github.calls('PUT', /\/contents\/modules\//).at(-1).body.sha).toBeTruthy();
  });

  it('이미 있는 저장소의 다른 topic은 그대로 두고 vpylab-forge만 더한다', async () => {
    github.createRepo('ada', FORGE_REPO, { topics: ['physics'], files: { 'README.md': 'x' } });
    await apiAs('token-ada').putForgeModule({ owner: 'ada', id: 'a', code: CODE, title: 'a' });
    expect([...github.repo('ada/vpylab-forge').topics].sort()).toEqual(['physics', FORGE_TOPIC].sort());
    expect(github.calls('POST', /^\/user\/repos$/)).toHaveLength(0);
  });

  it('저장소의 이름을 바꾼 적이 있으면(옛 주소가 다른 저장소로 넘어감) 그 저장소를 건드리지 않고 새로 만든다', async () => {
    const api = apiAs('token-ada');
    await api.putForgeModule({ owner: 'ada', id: 'old', code: CODE, title: 'old' });
    github.rename('ada/vpylab-forge', 'old-forge');
    // 옛 주소로 읽으면 이름이 바뀐 저장소가 옵니다. 내 대장간 저장소로 보지 않습니다.
    expect(await api.listForgeModules('ada')).toEqual({ items: [] });
    expect(await api.deleteForgeModule({ owner: 'ada', id: 'old' })).toEqual({ removed: false });
    expect(github.file('ada/old-forge', 'modules/old.py')).toBe(CODE);

    const result = await api.putForgeModule({ owner: 'ada', id: 'new', code: CODE, title: 'new' });
    expect(result).toMatchObject({ changed: true, fresh: true });
    expect(github.file('ada/vpylab-forge', 'modules/new.py')).toBe(CODE);
    expect(github.file('ada/old-forge', 'modules/new.py')).toBeUndefined();
    expect((await api.listForgeModules('ada')).items.map((item) => item.id)).toEqual(['new']);
  });

  it('같은 이름의 저장소가 비공개이거나 보관 상태면 올리지 않는다', async () => {
    const repo = github.createRepo('ada', FORGE_REPO, { files: { 'README.md': 'x' } });
    // 비공개 저장소는 앱의 권한(public_repo)으로 보이지 않습니다: 읽기는 404, 같은 이름으로 만들기는 422.
    repo.private = true;
    await rejectsWith(apiAs('token-ada').putForgeModule({ owner: 'ada', id: 'a', code: CODE, title: 'a' }), 'rejected', 'forgeRepo');
    expect(github.calls('POST', /^\/user\/repos$/)).toHaveLength(1);
    expect(await apiAs('token-ada').listForgeModules('ada')).toEqual({ items: [] });
    repo.private = false;
    repo.archived = true;
    await rejectsWith(apiAs('token-ada').putForgeModule({ owner: 'ada', id: 'a', code: CODE, title: 'a' }), 'rejected', 'forgeRepo');
    expect(github.calls('PUT', /\/contents\//)).toHaveLength(0);
    expect(github.calls('PUT', /\/topics$/)).toHaveLength(0);
  });

  it('새 저장소가 아직 준비되지 않았으면 잠시 뒤 다시 올린다', async () => {
    github.failNext({ method: 'PUT', test: /\/contents\/modules\//, status: 404, body: { message: 'Not Found' } });
    const result = await apiAs('token-ada').putForgeModule({ owner: 'ada', id: 'a', code: CODE, title: 'a' });
    expect(result.changed).toBe(true);
    expect(github.file('ada/vpylab-forge', 'modules/a.py')).toBe(CODE);
  });

  it('잘못된 모듈 ID, 빈 내용, 너무 큰 내용은 GitHub에 보내지 않는다', async () => {
    const api = apiAs('token-ada');
    await rejectsWith(api.putForgeModule({ owner: 'ada', id: '../x', code: CODE }), 'rejected', 'forgeId');
    await rejectsWith(api.putForgeModule({ owner: 'ada', id: 'a', code: '  ' }), 'empty');
    await rejectsWith(api.putForgeModule({ owner: 'ada', id: 'a', code: 'x'.repeat(200 * 1024) }), 'tooLarge', 'forge');
    expect(github.state.log).toHaveLength(0);
  });
});

describe('GitHub API: 내 모듈 읽기와 내리기', () => {
  it('저장소나 폴더가 없으면 빈 목록이고, 모듈 파일만 읽는다', async () => {
    const api = apiAs('token-ada');
    expect(await api.listForgeModules('ada')).toEqual({ items: [] });
    github.createRepo('ada', FORGE_REPO, { files: { 'README.md': 'x' } });
    expect(await api.listForgeModules('ada')).toEqual({ items: [] });
    github.remoteCommit('ada/vpylab-forge', { 'modules/a.py': CODE, 'modules/notes.md': 'memo', 'modules/bad name.py': 'x', 'other/b.py': 'y' }, { login: 'ada' });
    const { items } = await api.listForgeModules('ada');
    expect(items.map((item) => [item.id, item.code])).toEqual([['a', CODE]]);
  });

  it('내리면 그 파일만 지우고, 없는 모듈은 removed가 false다', async () => {
    const api = apiAs('token-ada');
    await api.putForgeModule({ owner: 'ada', id: 'a', code: CODE, title: 'a' });
    await api.putForgeModule({ owner: 'ada', id: 'b', code: `${CODE}#b\n`, title: 'b' });
    expect(await api.deleteForgeModule({ owner: 'ada', id: 'a' })).toEqual({ removed: true });
    expect(github.file('ada/vpylab-forge', 'modules/a.py')).toBeUndefined();
    expect(github.file('ada/vpylab-forge', 'modules/b.py')).toContain('#b');
    expect(await api.deleteForgeModule({ owner: 'ada', id: 'a' })).toEqual({ removed: false });
    expect(await api.deleteForgeModule({ owner: 'bo', id: 'a' })).toEqual({ removed: false });
  });

  it('두 번 눌러 둘째 지우기가 늦게 도착해도(이미 지워짐) 오류로 보지 않는다', async () => {
    const api = apiAs('token-ada');
    await api.putForgeModule({ owner: 'ada', id: 'a', code: CODE, title: 'a' });
    github.failNext({ method: 'DELETE', test: /\/contents\/modules\//, status: 404, body: { message: 'Not Found' } });
    expect(await api.deleteForgeModule({ owner: 'ada', id: 'a' })).toEqual({ removed: false });
  });

  it('다른 사람의 저장소에는 올리거나 지울 수 없다', async () => {
    await apiAs('token-ada').putForgeModule({ owner: 'ada', id: 'a', code: CODE, title: 'a' });
    const bo = apiAs('token-bo');
    await rejectsWith(bo.putForgeModule({ owner: 'ada', id: 'a', code: `${CODE}#x\n`, title: 'a' }), 'forbidden');
    await rejectsWith(bo.deleteForgeModule({ owner: 'ada', id: 'a' }), 'forbidden');
    expect(github.file('ada/vpylab-forge', 'modules/a.py')).toBe(CODE);
  });
});

describe('GitHub 세션: 대장간 동작', () => {
  it('연결이 없으면 GitHub에 요청하지 않는다', async () => {
    expect(await store().forgePublish({ id: 'a', code: CODE, title: 'a' })).toEqual({ status: 'disconnected' });
    expect(await store().forgeMine()).toEqual({ status: 'disconnected' });
    expect(await store().forgeUnpublish('a')).toEqual({ status: 'disconnected' });
    expect(github.state.log).toHaveLength(0);
  });

  it('연결한 계정의 저장소에 올리고, 읽고, 내린다. 진행 표시와 오류는 건드리지 않는다', async () => {
    await store().connect();
    const published = await store().forgePublish({ id: 'a', code: CODE, title: '맑은 종' });
    expect(published).toMatchObject({ status: 'ok', login: 'ada', owner: 'ada', id: 'a', changed: true, fresh: true });
    const mine = await store().forgeMine();
    expect(mine.status).toBe('ok');
    expect(mine.items.map((item) => item.id)).toEqual(['a']);
    expect(await store().forgeUnpublish('a')).toMatchObject({ status: 'ok', removed: true });
    expect(store().busy).toBe('');
    expect(store().error).toBeNull();
  });

  it('토큰이 무효가 되면 다시 연결이 필요한 상태가 된다', async () => {
    await store().connect();
    github.revoke('token-ada');
    expect(await store().forgePublish({ id: 'a', code: CODE, title: 'a' })).toEqual({ status: 'disconnected' });
    expect(store().needsReauth).toBe(true);
  });

  it('GitHub가 거절하면 까닭을 돌려준다', async () => {
    await store().connect();
    const repo = github.createRepo('ada', FORGE_REPO, { files: { 'README.md': 'x' } });
    repo.private = true;
    expect(await store().forgePublish({ id: 'a', code: CODE, title: 'a' })).toEqual({ status: 'error', reason: 'forgeRepo' });
    repo.private = false;
    github.failNext({ test: /\/contents\/modules$/, status: 403, body: { message: 'API rate limit exceeded' } });
    expect(await store().forgeMine()).toEqual({ status: 'error', reason: 'rate' });
  });
});
