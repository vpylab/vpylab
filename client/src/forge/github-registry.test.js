import { beforeEach, describe, expect, it } from 'vitest';
import { memoryStorage } from '../drive-lab/fake-google.js';
import { createFakeGitHub } from '../github/fake-github.js';
import { configureGitHub, useGitHubStore } from '../github/githubSession.js';
import { MODULE_FORMAT, MODULE_PREFIX, builtInModule, makeForgeModule, moduleDefinition, moduleFromPublishedCode, moduleProgram } from './modules.js';
import { createRecipe } from './recipes.js';
import { ForgeLoadError, loadForgeIndex } from './forge-index.js';
import { FORGE_GITHUB_TEXT } from './forge-text.js';
import { fetchOwnForgeModules, fetchPublicForgeModules, forgeLogin, forgeSourceUrl, forkPublicForgeModule, publishForgeModule, unpublishForgeModule } from './github-registry.js';
import { FORGE_MODULE_FORMAT, FORGE_MODULE_PREFIX, readForgeModuleHeader, validateForgeIndex } from '../../../server/shared/forge-rules.js';

// GitHub 연동 대장간: 목록 읽기, 가져오기, 내 GitHub 저장소에 올리고 내리기. GitHub는 fake-github.js가 흉내 냅니다.

const ID = '3f2c1a9e-0b7d-4c55-9a10-ffeeddccbbaa';
const moduleOf = (preset = 'bell', extra = {}) => makeForgeModule(createRecipe(preset), { id: ID, title: '맑은 종', description: '누르면 소리가 납니다', ...extra });
const indexOf = (items) => ({ version: 1, generatedAt: '2026-11-12T03:00:00Z', items });
const entryOf = (owner, module) => ({ owner, id: module.id, sha: 'a'.repeat(40), updatedAt: '2026-11-10T01:02:03Z', module });
const respond = (status, body) => ({ ok: status >= 200 && status < 300, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });

let github;
beforeEach(() => {
  github = createFakeGitHub({ tokens: { 'token-ada': 'ada' } });
  configureGitHub({
    clientId: 'client-1',
    fetchImpl: github.fetchImpl,
    storage: memoryStorage(),
    origin: 'https://vpylab.example',
    login: () => ({ promise: Promise.resolve({ accessToken: 'token-ada', scope: 'public_repo,repo:invite' }), cancel: () => {}, url: '', state: 's' }),
    apiOptions: { sleep: async () => {} },
  });
});

describe('공용 규칙과 대장간 모듈 형식', () => {
  it('공용 규칙의 표식이 대장간의 표식과 같다', () => {
    expect(FORGE_MODULE_PREFIX).toBe(MODULE_PREFIX);
    expect(FORGE_MODULE_FORMAT).toBe(MODULE_FORMAT);
  });

  it('대장간이 만든 파일의 첫 줄을 목록 스크립트의 규칙으로 읽으면 같은 모듈이 나온다', () => {
    const module = moduleOf('bell', { references: [{ title: '친구의 종', url: 'https://example.com/bell' }] });
    const header = readForgeModuleHeader(moduleProgram(module), { id: ID });
    expect(header).toEqual(JSON.parse(JSON.stringify(module)));
  });

  it('원본이 GitHub의 모듈이면 생성 코드에 그 파일의 주소를 적는다', () => {
    const forked = makeForgeModule(createRecipe('cat'), { title: '내 고양이', source: { id: 'gh:ada/bell-1', title: '맑은 종', author: 'ada' } });
    expect(moduleDefinition(forked)).toContain('# 원본 프로젝트: https://github.com/ada/vpylab-forge/blob/HEAD/modules/bell-1.py');
    expect(moduleFromPublishedCode(moduleProgram(forked))).toEqual(forked);
    const classroom = makeForgeModule(createRecipe('cat'), { title: '내 고양이', source: { id: 'abc', title: '원본', author: '별명' } });
    expect(moduleDefinition(classroom)).toContain('# 원본 프로젝트: /gallery/abc');
    expect(forgeSourceUrl(forked.source)).toBe('https://github.com/ada/vpylab-forge/blob/HEAD/modules/bell-1.py');
    expect(forgeSourceUrl(classroom.source)).toBeNull();
    expect(forgeSourceUrl(null)).toBeNull();
  });
});

describe('목록 읽기', () => {
  it('주소가 없으면 요청하지 않고, 응답이 이상하면 까닭을 구분한다', async () => {
    const reasonOf = (options) => loadForgeIndex(options).then(() => null, (error) => (error instanceof ForgeLoadError ? error.reason : 'other'));
    let calls = 0;
    expect(await reasonOf({ url: '', fetchImpl: async () => { calls += 1; } })).toBe('off');
    expect(await reasonOf({ url: 'https://evil.example/forge.json', fetchImpl: async () => { calls += 1; } })).toBe('off');
    expect(calls).toBe(0);
    const url = '/forge.json';
    expect(await reasonOf({ url, fetchImpl: async () => respond(404, '') })).toBe('http');
    expect(await reasonOf({ url, fetchImpl: async () => { throw new TypeError('Failed to fetch'); } })).toBe('network');
    expect(await reasonOf({ url, fetchImpl: async () => respond(200, 'not json') })).toBe('format');
    expect(await reasonOf({ url, fetchImpl: async () => respond(200, { version: 9, items: [] }) })).toBe('format');
    expect(await reasonOf({ url, fetchImpl: async () => respond(200, 'x'.repeat(3 * 1024 * 1024)) })).toBe('tooLarge');
    const seen = [];
    const index = await loadForgeIndex({ url, fetchImpl: async (address, init) => { seen.push(init); return respond(200, indexOf([entryOf('ada', moduleOf())])); } });
    expect(index.items).toHaveLength(1);
    expect(seen[0].credentials).toBe('omit');
  });

  it('대장간의 검사기를 통과한 모듈만 보이고, 만든 사람은 저장소의 GitHub 아이디다', async () => {
    const good = moduleOf();
    const broken = { ...JSON.parse(JSON.stringify(good)), id: 'broken', recipe: { presetId: 'no-such-preset' } };
    const load = async () => validateForgeIndex(indexOf([entryOf('ada', { ...good, author: '가짜 이름' }), entryOf('bo', broken)]));
    const data = await fetchPublicForgeModules({ load });
    expect(data.hasMore).toBe(false);
    expect(data.modules).toHaveLength(1);
    expect(data.modules[0]).toMatchObject({
      id: ID, title: '맑은 종', author: 'ada', ownerId: 'ada', published: true, publicListing: true,
      fileUrl: `https://github.com/ada/vpylab-forge/blob/HEAD/modules/${ID}.py`,
    });
    expect([...data.keys]).toEqual([`ada/${ID}`]);
  });

  it('목록을 읽지 못하면 안내 문구로 알린다', async () => {
    await expect(fetchPublicForgeModules({ load: async () => { throw new ForgeLoadError('network'); } })).rejects.toThrow(FORGE_GITHUB_TEXT.loadFailed);
  });
});

describe('가져오기', () => {
  it('새 모듈 ID를 만들고 원본의 GitHub 아이디와 모듈 ID를 기록한다. GitHub 요청은 없다', async () => {
    const data = await fetchPublicForgeModules({ load: async () => validateForgeIndex(indexOf([entryOf('ada', moduleOf())])) });
    const fork = forkPublicForgeModule(data.modules[0]);
    expect(fork.id).not.toBe(ID);
    expect(fork.title).toBe('맑은 종 · 내 포크');
    expect(fork.source).toEqual({ id: `gh:ada/${ID}`, title: '맑은 종', author: 'ada' });
    expect(fork.recipe).toEqual(data.modules[0].recipe);
    expect(fork.recordId).toBeNull();
    expect(github.state.log).toHaveLength(0);
  });
});

describe('내 GitHub 저장소에 올리고 내리기', () => {
  it('연결이 없으면 올리지 않고 안내한다', async () => {
    await expect(publishForgeModule(moduleOf())).rejects.toThrow(FORGE_GITHUB_TEXT.disconnected);
    expect(await fetchOwnForgeModules()).toBeNull();
    await expect(unpublishForgeModule(ID)).rejects.toThrow(FORGE_GITHUB_TEXT.disconnected);
    expect(github.state.log).toHaveLength(0);
  });

  it('검증한 레시피에서 코드를 다시 만들어 올리고, 올린 모듈을 다시 읽을 수 있다', async () => {
    await useGitHubStore.getState().connect();
    const input = { ...moduleOf(), recordId: '11111111-2222-4333-8444-555555555555', extra: 'ignored' };
    const done = await publishForgeModule(input);
    expect(done).toMatchObject({ changed: true, fresh: true });
    expect(done.module).toMatchObject({ id: ID, author: 'ada', ownerId: 'ada', published: true, recordId: null });
    const file = github.file('ada/vpylab-forge', `modules/${ID}.py`);
    expect(file).toBe(moduleProgram(makeForgeModule(input.recipe, { ...input, recordId: null })));
    expect(moduleFromPublishedCode(file).title).toBe('맑은 종');

    const mine = await fetchOwnForgeModules();
    expect(mine.login).toBe('ada');
    expect(mine.modules.map((module) => [module.id, module.title, module.published])).toEqual([[ID, '맑은 종', true]]);

    // 같은 내용으로 다시 누르면 GitHub에 새로 쓰지 않습니다.
    expect(await publishForgeModule(input)).toMatchObject({ changed: false, fresh: false });

    expect(await unpublishForgeModule(ID)).toBe(ID);
    expect(github.file('ada/vpylab-forge', `modules/${ID}.py`)).toBeUndefined();
    expect((await fetchOwnForgeModules()).modules).toEqual([]);
  });

  it('파일 이름으로 쓸 수 없는 모듈 ID와 기본 오브젝트의 ID는 새 ID로 바꿔 올린다', async () => {
    await useGitHubStore.getState().connect();
    const long = await publishForgeModule(makeForgeModule(createRecipe('cat'), { id: 'x'.repeat(60), title: '긴 ID' }));
    expect(long.module.id).toMatch(/^[0-9a-f-]{36}$/);
    const builtin = await publishForgeModule(builtInModule('cat'));
    expect(builtin.module.id.startsWith('builtin-')).toBe(false);
    expect(github.file('ada/vpylab-forge', `modules/${long.module.id}.py`)).toBeTruthy();
  });

  it('다른 이름으로 올린 파일과 레시피가 잘못된 파일은 내 모듈로 읽지 않는다', async () => {
    await useGitHubStore.getState().connect();
    await publishForgeModule(moduleOf());
    const code = github.file('ada/vpylab-forge', `modules/${ID}.py`);
    const broken = `${MODULE_PREFIX}${btoa(JSON.stringify({ format: MODULE_FORMAT, version: 1, id: 'broken', title: 'x', recipe: { presetId: 'no-such-preset' } }))}\n`;
    github.remoteCommit('ada/vpylab-forge', { 'modules/renamed.py': code, 'modules/broken.py': broken, 'modules/plain.py': 'print(1)\n' }, { login: 'ada' });
    expect((await fetchOwnForgeModules()).modules.map((module) => module.id)).toEqual([ID]);
  });

  it('본문 코드가 지금의 생성 코드와 달라도(앱이 바뀌었거나 손으로 고침) 내 모듈로 보여 공개를 내릴 수 있다', async () => {
    await useGitHubStore.getState().connect();
    await publishForgeModule(moduleOf());
    const code = github.file('ada/vpylab-forge', `modules/${ID}.py`);
    github.remoteCommit('ada/vpylab-forge', { [`modules/${ID}.py`]: `${code}\n# 예전 판의 생성 코드\nraise Exception("MUST NOT RUN")` }, { login: 'ada' });
    const mine = await fetchOwnForgeModules();
    expect(mine.modules.map((module) => [module.id, module.published])).toEqual([[ID, true]]);
    // 화면과 실행에 사용하는 코드는 레시피에서 다시 만듭니다. 저장소의 본문은 사용하지 않습니다.
    expect(moduleProgram(makeForgeModule(mine.modules[0].recipe, mine.modules[0]))).not.toContain('MUST NOT RUN');
    expect(await unpublishForgeModule(ID)).toBe(ID);
    expect(github.file('ada/vpylab-forge', `modules/${ID}.py`)).toBeUndefined();
  });

  it('연결한 탭의 GitHub 아이디는 GitHub에 묻지 않고 알려 준다', async () => {
    expect(await forgeLogin()).toBeNull();
    await useGitHubStore.getState().connect();
    const before = github.state.log.length;
    expect(await forgeLogin()).toBe('ada');
    expect(github.state.log).toHaveLength(before);
  });

  it('레시피가 잘못된 모듈은 GitHub에 보내지 않는다', async () => {
    await useGitHubStore.getState().connect();
    const before = github.state.log.length;
    await expect(publishForgeModule({ ...moduleOf(), recipe: { presetId: 'no-such-preset' } })).rejects.toThrow(FORGE_GITHUB_TEXT.invalid);
    expect(github.state.log).toHaveLength(before);
  });

  it('GitHub가 거절하면 그 까닭의 안내 문구를 보인다', async () => {
    await useGitHubStore.getState().connect();
    const repo = github.createRepo('ada', 'vpylab-forge', { files: { 'README.md': 'x' } });
    repo.private = true;
    await expect(publishForgeModule(moduleOf())).rejects.toThrow('vpylab-forge 저장소가 비공개');
    repo.private = false;
    github.failNext({ method: 'PUT', test: /\/contents\/modules\//, status: 500, times: 9 });
    await expect(publishForgeModule(moduleOf())).rejects.toThrow('GitHub 서버 오류');
  });

  it('팀 프로젝트의 저장을 설명하는 문구는 대장간에 보이지 않고 대장간의 문구로 알린다', async () => {
    await useGitHubStore.getState().connect();
    await publishForgeModule(moduleOf());
    // 409: 팀 프로젝트에서는 "팀원이 동시에 저장하고 있어…"로 안내하는 경우
    github.failNext({ method: 'PUT', test: /\/contents\/modules\//, status: 409, body: { message: 'is at abc but expected def' }, times: 9 });
    await expect(publishForgeModule(moduleOf('bell', { title: '고친 종' }))).rejects.toThrow(FORGE_GITHUB_TEXT.publishFailed);
    github.failNext({ method: 'DELETE', test: /\/contents\/modules\//, status: 409, body: { message: 'conflict' }, times: 9 });
    await expect(unpublishForgeModule(ID)).rejects.toThrow(FORGE_GITHUB_TEXT.unpublishFailed);
  });
});
