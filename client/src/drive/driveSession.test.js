import { beforeEach, describe, expect, it } from 'vitest';
import { createFakeGoogle, memoryStorage } from '../drive-lab/fake-google.js';
import { configureDrive, useDriveStore } from './driveSession.js';

let google;
let storage;
const store = () => useDriveStore.getState();

async function signedIn(accounts) {
  google = createFakeGoogle(accounts ? { accounts } : undefined);
  storage = memoryStorage();
  configureDrive({ clientId: 'test-client', gis: google.gis, fetchImpl: google.fetchImpl, storage });
  expect(await store().prepare()).toBe(true);
  expect((await store().signIn()).status).toBe('ok');
}

/** 다른 탭·기기가 저장했거나 토큰이 철회된 상황 */
const revokeTokens = () => google.state.tokens.clear();

describe('편집기 드라이브 저장', () => {
  beforeEach(() => { useDriveStore.setState({ file: null }); });

  it('로그인하면 계정을 보이고, 처음 저장은 VPyLab 폴더에 새 파일을 만든 뒤 같은 파일에 이어 저장한다', async () => {
    await signedIn();
    expect(store().account.email).toBe('a@school.example');
    expect(google.state.requests[0]).toEqual({ prompt: 'select_account' });

    const first = await store().save('sphere()', { name: '공.py' });
    expect(first.status).toBe('created');
    const fileId = store().file.id;
    expect(google.state.files.get(fileId)).toMatchObject({ name: '공.py', content: 'sphere()', parents: ['folder-subA'] });
    expect(store().isDirty('sphere()')).toBe(false);
    expect(store().isDirty('box()')).toBe(true);

    expect((await store().save('box()')).status).toBe('saved');
    expect(store().file.id).toBe(fileId);
    expect(google.state.files.get(fileId).content).toBe('box()');
  });

  it('같은 이름의 파일이 있으면 번호를 붙여 따로 만든다', async () => {
    await signedIn();
    google.addFile({ id: 'old', name: '공.py', content: 'x' });
    await store().listFiles();
    await store().save('y', { name: '공.py' });
    expect(store().file.name).toBe('공 (2).py');
  });

  it('다른 기기가 먼저 저장하면 충돌로 알리고, 세 가지 해결이 모두 동작한다', async () => {
    await signedIn();
    await store().save('v1', { name: '충돌.py' });
    const id = store().file.id;

    google.remoteSave(id, 'from other device');
    expect((await store().save('mine'))).toEqual({ status: 'conflict' });
    expect(store().conflict.remote.code).toBe('from other device');

    // 드라이브 내용 불러오기
    const loaded = await store().resolveConflict('remote');
    expect(loaded).toEqual({ status: 'loaded', code: 'from other device' });
    expect(store().conflict).toBeNull();
    expect(store().isDirty('from other device')).toBe(false);

    // 덮어쓰기
    google.remoteSave(id, 'again other');
    await store().save('mine 2');
    expect((await store().resolveConflict('overwrite')).status).toBe('saved');
    expect(google.state.files.get(id).content).toBe('mine 2');

    // 사본으로 저장
    google.remoteSave(id, 'third other');
    await store().save('mine 3');
    expect((await store().resolveConflict('copy')).status).toBe('created');
    expect(store().file.name).toBe('충돌 (사본).py');
    expect(google.state.files.get(id).content).toBe('third other');
  });

  it('권한이 만료·철회되면 초안을 남기고 재승인을 안내하며, 다시 승인하면 같은 파일에 저장한다', async () => {
    await signedIn();
    await store().save('v1', { name: '만료.py' });
    const id = store().file.id;

    revokeTokens();
    const failed = await store().save('after expiry');
    expect(failed).toEqual({ status: 'error', reason: 'auth' });
    expect(store().needsReauth).toBe(true);

    expect((await store().signIn({ again: true })).status).toBe('ok');
    expect(google.state.requests.at(-1)).toEqual({ prompt: '', login_hint: 'a@school.example' });
    expect(store().needsReauth).toBe(false);
    expect((await store().save('after expiry')).status).toBe('saved');
    expect(google.state.files.get(id).content).toBe('after expiry');
  });

  it('저장하지 못한 초안은 파일을 다시 열 때 함께 돌려주고, 저장하면 지운다', async () => {
    await signedIn();
    await store().save('saved', { name: '초안.py' });
    const id = store().file.id;
    store().rememberDraft('unsaved edit');

    const reopened = await store().openFile(id);
    expect(reopened.code).toBe('saved');
    expect(reopened.draft.code).toBe('unsaved edit');

    await store().save('unsaved edit');
    expect((await store().openFile(id)).draft).toBeNull();
  });

  it('다른 계정으로 승인되면 앞 계정의 파일 연결과 목록을 지운다', async () => {
    await signedIn([{ sub: 'subA', email: 'a@school.example' }, { sub: 'subB', email: 'b@school.example' }]);
    await store().save('a code', { name: 'A.py' });
    expect(store().file).not.toBeNull();
    const result = await store().signIn();
    expect(result).toMatchObject({ status: 'ok', switched: true });
    expect(store().account.email).toBe('b@school.example');
    expect(store().file).toBeNull();
    expect(store().files).toEqual([]);
  });

  it('휴지통에 있는 파일에 저장하면 trashed로 알리고, 새 파일로 저장할 수 있다', async () => {
    await signedIn();
    await store().save('v1', { name: '버린.py' });
    google.state.files.get(store().file.id).trashed = true;
    expect(await store().save('v2')).toEqual({ status: 'error', reason: 'trashed' });
    expect((await store().saveAsNew('v2', '버린.py')).status).toBe('created');
    expect(store().file.id).not.toBe('f2');
  });

  it('클라이언트 ID가 없으면 준비하지 않는다', async () => {
    configureDrive({ clientId: '', gis: null, fetchImpl: null, storage: memoryStorage() });
    expect(await store().prepare()).toBe(false);
  });

  it('오래된 초안을 불러온 뒤 저장하면, 그사이 다른 기기의 저장을 덮어쓰지 않고 충돌로 알린다 (3-way #2)', async () => {
    await signedIn();
    await store().save('v1', { name: '초안기준.py' });
    const id = store().file.id;
    store().rememberDraft('my old draft'); // 기준 버전 1에서 쓴 초안
    google.remoteSave(id, 'from other device'); // 버전 2
    const reopened = await store().openFile(id);
    expect(reopened.draft.code).toBe('my old draft');
    store().adoptDraft(reopened.draft);
    expect((await store().save('my old draft')).status).toBe('conflict');
    expect(google.state.files.get(id).content).toBe('from other device');
  });

  it('한 탭의 저장이 다른 탭의 내용이 다른 초안을 지우지 않는다 (3-way #7)', async () => {
    await signedIn();
    await store().save('v1', { name: '두탭.py' });
    const id = store().file.id;
    storage.setItem(`vpylab-drivelab:draft:editor-subA:${id}@other-tab`, JSON.stringify({ code: 'other tab work', baseVersion: '1', at: new Date().toISOString() }));
    await store().save('this tab saved');
    expect((await store().openFile(id)).draft.code).toBe('other tab work');
  });

  it('여러 파일을 빠르게 열면 마지막으로 고른 파일만 반영한다 (3-way #3)', async () => {
    await signedIn();
    google.addFile({ id: 'slow', name: 'A.py', content: 'a' });
    google.addFile({ id: 'fast', name: 'B.py', content: 'b' });
    let release;
    const gate = new Promise((r) => { release = r; });
    configureDrive({ fetchImpl: async (url, init) => { if (String(url).includes('/files/slow')) await gate; return google.fetchImpl(url, init); } });
    await store().prepare();
    await store().signIn();
    const first = store().openFile('slow');
    const second = await store().openFile('fast');
    release();
    expect((await first).status).toBe('stale');
    expect(second.status).toBe('opened');
    expect(store().file.id).toBe('fast');
  });

  it('로그아웃 전에 시작한 목록 응답은 뒤 계정 화면에 넣지 않는다 (3-way #4)', async () => {
    await signedIn();
    google.addFile({ id: 'secret', name: 'A의 파일.py', content: 'x' });
    let release;
    const gate = new Promise((r) => { release = r; });
    configureDrive({ fetchImpl: async (url, init) => { if (String(url).includes('/drive/v3/files?')) await gate; return google.fetchImpl(url, init); } });
    await store().prepare();
    await store().signIn();
    const listing = store().listFiles();
    await store().signOut();
    release();
    expect(await listing).toBeNull();
    expect(store().files).toEqual([]);
  });

  it('파일로 만들기 전의 새 코드 초안을 다시 찾을 수 있다 (3-way #6)', async () => {
    await signedIn();
    store().rememberDraft('new idea');
    expect(store().latestNewDraft().code).toBe('new idea');
    await store().save('new idea', { name: '새.py' });
    expect(store().latestNewDraft()).toBeNull();
  });
});
