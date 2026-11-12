import { beforeEach, describe, expect, it } from 'vitest';
import { memoryStorage } from '../drive-lab/fake-google.js';
import { createFakeGitHub } from './fake-github.js';
import { GALLERY_TOPIC, GitHubError, MAX_THUMBNAIL_BYTES, PROJECT_TOPIC, createGitHubApi } from './github-api.js';
import { configureGitHub, useGitHubStore } from './githubSession.js';

// 갤러리에 올리기·내리기, 미리보기 그림 커밋, 스타(GitHub 연동 갤러리 애드온). GitHub는 fake-github.js가 흉내 냅니다.

const JPEG = `data:image/jpeg;base64,${btoa('fake jpeg bytes')}`;
let github;
let storage;
const store = () => useGitHubStore.getState();

function configure() {
  configureGitHub({
    clientId: 'client-1',
    fetchImpl: github.fetchImpl,
    storage,
    origin: 'https://vpylab.example',
    login: () => ({ promise: Promise.resolve({ accessToken: 'token-ada', scope: 'public_repo,repo:invite' }), cancel: () => {}, url: '', state: 's' }),
    apiOptions: { sleep: async () => {}, now: () => new Date(2026, 10, 12, 9, 30) },
    buildHtml: (code) => `<html>${code}</html>`,
    openUrl: () => 'https://vpylab.example/sandbox#code=x',
  });
}

const apiAs = (token) => createGitHubApi({ getToken: () => token, fetchImpl: github.fetchImpl, sleep: async () => {} });

beforeEach(() => {
  github = createFakeGitHub({ tokens: { 'token-ada': 'ada', 'token-bo': 'bo' } });
  storage = memoryStorage();
  configure();
});

async function withProject(code = 'v1') {
  await store().connect();
  const created = await store().createProject({ title: '공 튀기기', code });
  expect(created.status).toBe('created');
  return created.project.fullName;
}

const rejectsWith = async (promise, reason, detail) => {
  const error = await promise.then(() => null, (e) => e);
  expect(error).toBeInstanceOf(GitHubError);
  expect(error.reason).toBe(reason);
  if (detail) expect(error.detail).toBe(detail);
};

describe('GitHub API: 갤러리 표시(topic)', () => {
  it('올리면 vpylab-gallery를 더하고 다른 topic은 그대로 두며, 내리면 그것만 뺀다', async () => {
    const fullName = await withProject();
    github.repo(fullName).topics = new Set([PROJECT_TOPIC, 'physics']);
    const api = apiAs('token-ada');

    expect(await api.setGalleryListing(fullName, true)).toEqual({ inGallery: true, changed: true });
    expect([...github.repo(fullName).topics].sort()).toEqual(['physics', GALLERY_TOPIC, PROJECT_TOPIC].sort());
    // 이미 올린 상태면 다시 쓰지 않습니다.
    const writes = github.calls('PUT', /\/topics$/).length;
    expect(await api.setGalleryListing(fullName, true)).toEqual({ inGallery: true, changed: false });
    expect(github.calls('PUT', /\/topics$/)).toHaveLength(writes);
    expect((await api.readProject(fullName)).project.inGallery).toBe(true);
    expect((await api.listProjects())[0].inGallery).toBe(true);

    expect(await api.setGalleryListing(fullName, false)).toEqual({ inGallery: false, changed: true });
    expect([...github.repo(fullName).topics].sort()).toEqual(['physics', PROJECT_TOPIC].sort());
    expect((await api.readProject(fullName)).project.inGallery).toBe(false);
  });

  it('프로젝트 표시가 빠져 있던 저장소는 올릴 때 함께 붙인다(목록은 두 표시가 모두 있는 저장소만 찾습니다)', async () => {
    const fullName = await withProject();
    github.repo(fullName).topics = new Set();
    await apiAs('token-ada').setGalleryListing(fullName, true);
    expect([...github.repo(fullName).topics].sort()).toEqual([GALLERY_TOPIC, PROJECT_TOPIC].sort());
  });

  it('저장소 소유자가 아니면 표시를 바꾸지 않는다', async () => {
    const fullName = await withProject();
    github.repo(fullName).collaborators.add('bo');
    await rejectsWith(apiAs('token-bo').setGalleryListing(fullName, true), 'forbidden', 'galleryOwnerOnly');
    expect(github.calls('PUT', /\/topics$/).filter((call) => call.login === 'bo')).toHaveLength(0);
    expect(github.repo(fullName).topics.has(GALLERY_TOPIC)).toBe(false);
  });
});

describe('GitHub API: 미리보기 그림(thumbnail.jpg)', () => {
  it('JPEG data URL을 thumbnail.jpg로 커밋하고, 바로 앞 커밋을 함께 돌려준다', async () => {
    const fullName = await withProject();
    const before = github.repo(fullName).head;
    const result = await apiAs('token-ada').putThumbnail(fullName, JPEG);
    expect(result.parentSha).toBe(before);
    expect(result.headSha).toBe(github.repo(fullName).head);
    expect(github.file(fullName, 'thumbnail.jpg')).toBeTruthy();
    expect(github.file(fullName, 'main.py')).toBe('v1'); // 다른 파일은 그대로
    const put = github.calls('PUT', /contents\/thumbnail\.jpg$/)[0];
    expect(put.body).toMatchObject({ content: JPEG.split(',')[1], branch: 'main' });
    expect(put.body.sha).toBeUndefined();

    // 이미 있는 그림을 바꿀 때는 그 파일의 sha를 함께 보냅니다.
    await apiAs('token-ada').putThumbnail(fullName, JPEG);
    expect(github.calls('PUT', /contents\/thumbnail\.jpg$/)[1].body.sha).toBeTruthy();
  });

  it('JPEG가 아니거나 200KB를 넘으면 GitHub에 보내지 않는다', async () => {
    const fullName = await withProject();
    const api = apiAs('token-ada');
    for (const bad of [null, '', 'data:image/png;base64,AAAA', 'data:image/svg+xml,<svg onload=alert(1)>', 'data:image/jpeg;base64,<script>', 'https://example.com/a.jpg']) {
      await rejectsWith(api.putThumbnail(fullName, bad), 'rejected', 'thumbnailType');
    }
    const big = `data:image/jpeg;base64,${'A'.repeat(Math.ceil(((MAX_THUMBNAIL_BYTES + 3) * 4) / 3))}`;
    await rejectsWith(api.putThumbnail(fullName, big), 'tooLarge', 'thumbnail');
    expect(github.calls('PUT', /contents\/thumbnail\.jpg$/)).toHaveLength(0);
  });
});

describe('GitHub API: 스타', () => {
  it('눌렀는지 읽고, 누르고, 취소한다', async () => {
    const fullName = await withProject();
    const bo = apiAs('token-bo');
    expect(await bo.isStarred(fullName)).toBe(false);
    expect(await bo.setStarred(fullName, true)).toEqual({ starred: true });
    expect(await bo.isStarred(fullName)).toBe(true);
    expect(await apiAs('token-ada').isStarred(fullName)).toBe(false); // 사람마다 따로입니다.
    expect(await bo.setStarred(fullName, false)).toEqual({ starred: false });
    expect(await bo.isStarred(fullName)).toBe(false);
    const put = github.calls('PUT', /^\/user\/starred\//)[0];
    expect(put.path).toBe(`/user/starred/${fullName}`);
  });

  it('저장소 이름이 올바르지 않으면 요청하지 않는다', async () => {
    await rejectsWith(apiAs('token-ada').setStarred('../x', true), 'invalidName');
    await rejectsWith(apiAs('token-ada').isStarred('ada/x/y'), 'invalidName');
  });
});

describe('스토어: 갤러리에 올리기와 내리기', () => {
  it('올리면 그림을 커밋하고 표시를 붙이며, 다음 저장이 충돌로 보이지 않는다', async () => {
    const fullName = await withProject();
    expect(store().project.inGallery).toBe(false);
    expect(await store().setGalleryListing(true, { thumbnail: JPEG })).toEqual({ status: 'listed', thumbnail: 'saved' });
    expect(store().project.inGallery).toBe(true);
    expect(store().projects[0].inGallery).toBe(true);
    expect(store().busy).toBe('');
    expect(github.repo(fullName).topics.has(GALLERY_TOPIC)).toBe(true);
    expect(store().project.headSha).toBe(github.repo(fullName).head); // 그림 커밋이 기준 커밋이 됩니다.
    expect((await store().commit('v2', { message: '그림 올린 뒤 저장' })).status).toBe('saved');
    expect(github.file(fullName, 'thumbnail.jpg')).toBeTruthy(); // 저장해도 그림은 남습니다.
  });

  it('그림이 없어도 올리기는 된다', async () => {
    const fullName = await withProject();
    expect(await store().setGalleryListing(true)).toEqual({ status: 'listed', thumbnail: 'none' });
    expect(await store().setGalleryListing(true, { thumbnail: null })).toEqual({ status: 'listed', thumbnail: 'none' });
    expect(github.repo(fullName).topics.has(GALLERY_TOPIC)).toBe(true);
    expect(github.calls('PUT', /contents\/thumbnail\.jpg$/)).toHaveLength(0);
  });

  it('그림을 올리지 못해도 올리기는 진행하고 failed로 알린다', async () => {
    const fullName = await withProject();
    github.failNext({ method: 'PUT', test: /contents\/thumbnail\.jpg$/, status: 422, body: { message: 'Invalid request' } });
    expect(await store().setGalleryListing(true, { thumbnail: JPEG })).toEqual({ status: 'listed', thumbnail: 'failed' });
    expect(github.repo(fullName).topics.has(GALLERY_TOPIC)).toBe(true);
    expect(await store().setGalleryListing(true, { thumbnail: 'data:image/png;base64,AAAA' })).toEqual({ status: 'listed', thumbnail: 'failed' });
  });

  it('내리면 표시만 빼고 그림 커밋은 하지 않는다', async () => {
    const fullName = await withProject();
    await store().setGalleryListing(true, { thumbnail: JPEG });
    const commits = github.calls('PUT', /contents\/thumbnail\.jpg$/).length;
    expect(await store().setGalleryListing(false, { thumbnail: JPEG })).toEqual({ status: 'unlisted', thumbnail: 'none' });
    expect(store().project.inGallery).toBe(false);
    expect(github.repo(fullName).topics.has(GALLERY_TOPIC)).toBe(false);
    expect(github.repo(fullName).topics.has(PROJECT_TOPIC)).toBe(true);
    expect(github.calls('PUT', /contents\/thumbnail\.jpg$/)).toHaveLength(commits);
  });

  it('팀원(소유자가 아님)이 올리려 하면 galleryOwnerOnly로 안내한다', async () => {
    const fullName = await withProject();
    github.repo(fullName).collaborators.add('bo');
    configureGitHub({ login: () => ({ promise: Promise.resolve({ accessToken: 'token-bo', scope: 'public_repo,repo:invite' }), cancel: () => {}, url: '', state: 's' }) });
    await store().connect();
    await store().openProject(fullName);
    expect(await store().setGalleryListing(true)).toEqual({ status: 'error', reason: 'galleryOwnerOnly' });
    expect(github.repo(fullName).topics.has(GALLERY_TOPIC)).toBe(false);
    expect(store().busy).toBe('');
  });

  it('연결이나 연 프로젝트가 없으면 요청하지 않는다', async () => {
    expect(await store().setGalleryListing(true)).toEqual({ status: 'error', reason: 'noProject' });
    await withProject();
    github.revoke('token-ada');
    expect(await store().setGalleryListing(true, { thumbnail: JPEG })).toEqual({ status: 'error', reason: 'auth' });
    expect(store().needsReauth).toBe(true);
    expect(store().busy).toBe('');
  });

  it('올린 상태는 새로 고침 뒤에도 남는다', async () => {
    await withProject();
    await store().setGalleryListing(true);
    configure();
    store().restore();
    expect(store().project.inGallery).toBe(true);
  });
});

describe('스토어: 그림 커밋과 팀원의 저장', () => {
  it('팀원의 화면에서는 그림 커밋 뒤의 저장이 충돌이 아니다(main.py가 그대로이므로)', async () => {
    // ada가 만들고 bo가 팀원으로 연 뒤, 누군가 그림만 커밋한 상황입니다.
    const fullName = await withProject('v1');
    github.repo(fullName).collaborators.add('bo');
    configureGitHub({ login: () => ({ promise: Promise.resolve({ accessToken: 'token-bo', scope: 'public_repo,repo:invite' }), cancel: () => {}, url: '', state: 's' }) });
    await store().connect();
    await store().openProject(fullName);
    github.remoteCommit(fullName, { 'thumbnail.jpg': '그림' }, { login: 'ada', message: '갤러리 미리보기 그림' });
    expect((await store().commit('v1\nbo', { message: 'bo의 저장' })).status).toBe('saved');
    expect(github.file(fullName, 'thumbnail.jpg')).toBe('그림');
  });

  it('그사이 팀원이 코드를 바꿨으면 그림을 올린 뒤에도 충돌로 알린다', async () => {
    const fullName = await withProject('v1');
    github.remoteCommit(fullName, { 'main.py': 'teammate' });
    expect((await store().setGalleryListing(true, { thumbnail: JPEG })).status).toBe('listed');
    expect(store().project.headSha).not.toBe(github.repo(fullName).head); // 팀원의 저장을 건너뛰지 않습니다.
    expect(await store().commit('mine', { message: 'm' })).toEqual({ status: 'conflict' });
  });
});

describe('스토어: 스타', () => {
  it('연결한 탭에서는 스타를 읽고 누르며, 진행 표시와 오류 상태를 건드리지 않는다', async () => {
    const fullName = await withProject();
    github.repo(fullName).stars = 4; // 다른 사람이 누른 스타
    expect(await store().starStatus(fullName)).toEqual({ status: 'ok', starred: false, stars: 4 });
    expect(await store().setStar(fullName, true)).toEqual({ status: 'ok', starred: true });
    // 지금의 스타 수를 함께 읽습니다(목록 파일의 수는 마지막 갱신 때의 값입니다).
    expect(await store().starStatus(fullName)).toEqual({ status: 'ok', starred: true, stars: 5 });
    expect(await store().setStar(fullName, false)).toEqual({ status: 'ok', starred: false });
    expect(store().busy).toBe('');
    expect(store().error).toBeNull();
  });

  it('연결이 없으면 disconnected, 토큰이 무효면 다시 연결이 필요한 상태로 바꾼다', async () => {
    expect(await store().starStatus('ada/x')).toEqual({ status: 'disconnected' });
    expect(await store().setStar('ada/x', true)).toEqual({ status: 'disconnected' });
    const fullName = await withProject();
    github.revoke('token-ada');
    expect(await store().setStar(fullName, true)).toEqual({ status: 'disconnected' });
    expect(store().needsReauth).toBe(true);
  });

  it('GitHub가 거절하면 error로 알린다', async () => {
    const fullName = await withProject();
    github.failNext({ method: 'PUT', test: /^\/user\/starred\//, status: 403, body: { message: 'Resource not accessible' } });
    expect(await store().setStar(fullName, true)).toEqual({ status: 'error', reason: 'forbidden' });
    expect(await store().starStatus(fullName)).toEqual({ status: 'ok', starred: false, stars: 0 });
    // 스타 수만 읽지 못하면 stars는 null이고, 내가 눌렀는지는 그대로 알려 줍니다.
    github.failNext({ method: 'GET', test: /^\/repos\/[^/]+\/[^/]+$/, status: 500, times: 9 });
    expect(await store().starStatus(fullName)).toEqual({ status: 'ok', starred: false, stars: null });
  });
});

describe('스토어: 진행 중인 동작과 연결 해제·계정 전환', () => {
  it('프로젝트를 만드는 사이 연결을 끊으면(다른 코드를 연 경우) 만든 프로젝트를 편집기에 붙이지 않는다', async () => {
    await store().connect();
    const creating = store().createProject({ title: '공 튀기기', code: 'v1' });
    store().detach();
    expect(store().busy).toBe('');
    expect(await creating).toEqual({ status: 'stale' });
    expect(store().project).toBeNull();
    expect(store().busy).toBe('');
    // 저장소는 GitHub에 만들어졌고, 프로젝트 목록에서 다시 열 수 있습니다.
    await store().loadProjects();
    expect(store().projects.map((item) => item.title)).toEqual(['공 튀기기']);
  });

  it('프로젝트를 여는 사이 연결을 끊으면 그 프로젝트를 붙이지 않는다', async () => {
    const fullName = await withProject();
    store().detach();
    const opening = store().openProject(fullName);
    store().detach();
    expect(await opening).toEqual({ status: 'stale' });
    expect(store().project).toBeNull();
    expect(store().busy).toBe('');
  });

  it('동작 도중 다른 계정으로 바뀌면 남은 요청을 새 계정의 토큰으로 보내지 않는다', async () => {
    let nextToken = 'token-ada';
    let afterFetch = null;
    configureGitHub({
      clientId: 'client-1',
      storage,
      origin: 'https://vpylab.example',
      fetchImpl: async (url, init) => {
        const response = await github.fetchImpl(url, init);
        if (afterFetch) await afterFetch(url, init);
        return response;
      },
      login: () => ({ promise: Promise.resolve({ accessToken: nextToken, scope: 'public_repo,repo:invite' }), cancel: () => {}, url: '', state: 's' }),
      apiOptions: { sleep: async () => {}, now: () => new Date(2026, 10, 12, 9, 30) },
      buildHtml: (code) => `<html>${code}</html>`,
      openUrl: () => 'https://vpylab.example/sandbox#code=x',
    });
    const fullName = await withProject();
    github.repo(fullName).collaborators.add('bo'); // 새 계정도 이 저장소에 쓸 수 있는 경우

    // 저장의 첫 요청이 나간 직후, 공용 컴퓨터에서 다른 학생의 계정으로 연결됩니다.
    let switching = null;
    afterFetch = async (url, init) => {
      if (switching || init?.headers?.Authorization !== 'Bearer token-ada' || init?.method === 'GET' || !init?.method) return;
      nextToken = 'token-bo';
      switching = store().connect();
      await switching;
    };
    const writesBefore = github.state.log.length;
    const result = await store().commit('v2', { message: '저장' });
    expect(switching).not.toBeNull();
    await switching;
    expect(result.status).toBe('stale');
    expect(store().account.login).toBe('bo');
    // 새 계정의 이름으로 GitHub에 쓴 요청이 없습니다.
    expect(github.state.log.slice(writesBefore).filter((entry) => entry.login === 'bo' && entry.method !== 'GET')).toEqual([]);
    expect(github.file(fullName, 'main.py')).toBe('v1');
  });
});
