import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeGoogle, memoryStorage } from '../drive-lab/fake-google.js';
import { DRIVE_TAB_KEY, configureDrive, expiredDriveTabFile, hasStoredDriveSession, storedDriveFileId, useDriveStore } from './driveSession.js';
import { TOKEN_STORAGE_KEY } from '../drive-lab/google-auth.js';

let google;
let storage;
let tab;
let clock;
const store = () => useDriveStore.getState();

async function signedIn(accounts) {
  google = createFakeGoogle(accounts ? { accounts } : undefined);
  storage = memoryStorage();
  tab = memoryStorage();
  clock = 1_000_000;
  configureDrive({ clientId: 'test-client', gis: google.gis, fetchImpl: google.fetchImpl, storage, tabStorage: tab, now: () => clock });
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

  it('저장 중에 로그아웃하면 늦게 온 저장 결과를 화면에 넣지 않는다 (아르곤 안정성 점검)', async () => {
    await signedIn();
    let release;
    const gate = new Promise((r) => { release = r; });
    configureDrive({ fetchImpl: async (url, init = {}) => { if (String(url).includes('/upload/')) await gate; return google.fetchImpl(url, init); } });
    await store().prepare();
    await store().signIn();
    const saving = store().save('a code', { name: 'A.py' });
    await store().signOut();
    release();
    expect(await saving).toEqual({ status: 'stale' });
    expect(store().file).toBeNull();
    expect(store().busy).toBe('');
  });

  it('저장이 끝나기 전에 다시 저장해도 새 파일은 하나만 만든다 (아르곤 안정성 점검)', async () => {
    await signedIn();
    let release;
    const gate = new Promise((r) => { release = r; });
    let creates = 0;
    configureDrive({ fetchImpl: async (url, init = {}) => {
      if (String(url).includes('/upload/') && (init.method || 'GET') === 'POST') { creates += 1; await gate; }
      return google.fetchImpl(url, init);
    } });
    await store().prepare();
    await store().signIn();
    const first = store().save('x', { name: '연타.py' });
    expect(await store().save('x', { name: '연타.py' })).toEqual({ status: 'busy' });
    release();
    expect((await first).status).toBe('created');
    expect(creates).toBe(1);
  });

  it('늦게 온 앞 세션 저장 결과가 새 세션에서 진행 중인 저장의 busy를 풀지 않는다 (아르곤 재검토)', async () => {
    await signedIn();
    const gates = {};
    configureDrive({ fetchImpl: async (url, init = {}) => {
      if (String(url).includes('/upload/') && (init.method || 'GET') === 'POST') {
        const which = String(init.body).includes('OLD_SAVE') ? 'old' : 'new';
        await new Promise((r) => { gates[which] = r; });
      }
      return google.fetchImpl(url, init);
    } });
    await store().prepare();
    await store().signIn();
    const oldSave = store().save('# OLD_SAVE', { name: '앞.py' });
    await store().signOut();
    await store().signIn();
    const newSave = store().save('# NEW_SAVE', { name: '뒤.py' });
    await vi.waitFor(() => expect(Object.keys(gates).sort()).toEqual(['new', 'old']));
    gates.old();
    expect(await oldSave).toEqual({ status: 'stale' });
    expect(store().busy).toBe('save'); // 뒤 저장은 아직 진행 중
    gates.new();
    expect((await newSave).status).toBe('created');
    expect(store().busy).toBe('');
  });

  it('저장이 실패한 뒤 목록을 다시 읽어도 저장 오류(휴지통·찾을 수 없음)를 지우지 않는다 (실계정 시험에서 발견)', async () => {
    await signedIn();
    await store().save('v1', { name: '목록.py' });
    google.state.files.get(store().file.id).trashed = true;
    expect(await store().save('v2')).toEqual({ status: 'error', reason: 'trashed' });
    await store().listFiles(); // 저장 창이 열리면서 목록을 다시 읽음
    expect(store().error?.reason).toBe('trashed');
  });

  it('목록을 읽다 난 오류는 다음에 목록을 읽는 데 성공하면 지운다', async () => {
    await signedIn();
    revokeTokens();
    await store().listFiles();
    expect(store().error).not.toBeNull();
    expect((await store().signIn({ again: true })).status).toBe('ok');
    await store().listFiles();
    expect(store().error).toBeNull();
  });

  it('파일로 만들기 전의 새 코드 초안을 다시 찾을 수 있다 (3-way #6)', async () => {
    await signedIn();
    store().rememberDraft('new idea');
    expect(store().latestNewDraft().code).toBe('new idea');
    await store().save('new idea', { name: '새.py' });
    expect(store().latestNewDraft()).toBeNull();
  });
});

describe('작품 영상 올리기', () => {
  const blob = new Blob([new Uint8Array(16)], { type: 'video/mp4' });
  const reply = (status, body, headers = {}) => ({ ok: status < 300, status, headers: { get: (k) => headers[k] ?? null }, json: async () => body });

  /** 가짜 구글에 영상 폴더 조회와 이어 올리기 응답만 덧붙입니다. */
  async function signedInWithVideoUpload(onChunk = () => reply(200, { id: 'v1', webViewLink: 'https://drive.example/v1' })) {
    google = createFakeGoogle();
    storage = memoryStorage();
    const fetchImpl = async (url, init = {}) => {
      const text = String(url);
      if (text.includes('vpylabVideos')) return reply(200, { files: [{ id: 'videos' }] });
      if (text.includes('uploadType=resumable')) return reply(200, {}, { Location: 'https://upload.example/s1' });
      if (text === 'https://upload.example/s1') return onChunk(init);
      return google.fetchImpl(url, init);
    };
    configureDrive({ clientId: 'test-client', gis: google.gis, fetchImpl, storage });
    expect(await store().prepare()).toBe(true);
  }

  it('로그인 전에는 올리지 않고, 올린 뒤에는 진행 표시를 지우며 코드 저장 상태는 건드리지 않는다', async () => {
    await signedInWithVideoUpload();
    expect(await store().uploadVideo(blob, 'a.mp4')).toEqual({ status: 'error', reason: 'auth' });

    expect((await store().signIn()).status).toBe('ok');
    await store().save('sphere()', { name: '공.py' });
    const fileBefore = store().file;
    const result = await store().uploadVideo(blob, 'a.mp4');
    expect(result).toEqual({ status: 'saved', file: { id: 'v1', webViewLink: 'https://drive.example/v1' } });
    expect(store().videoUpload).toBeNull();
    expect(store().file).toBe(fileBefore);
    expect(store().busy).toBe('');
    expect(store().error).toBeNull();
  });

  it('올리는 중에는 진행 상태를 보이고 겹쳐 올리지 않으며, 실패하면 이유만 돌려준다', async () => {
    let seen = null;
    let second = null;
    await signedInWithVideoUpload(async () => {
      seen = store().videoUpload;
      second = await store().uploadVideo(blob, 'b.mp4');
      return reply(404, {});
    });
    await store().signIn();
    const result = await store().uploadVideo(blob, 'a.mp4');
    expect(seen).toEqual({ sent: 0, total: 16 });
    expect(second).toEqual({ status: 'busy' });
    expect(result).toEqual({ status: 'error', reason: 'uploadExpired' });
    expect(store().videoUpload).toBeNull();
    expect(store().error).toBeNull();
  });
});

describe('알고 있는 구글 계정으로 승인', () => {
  it('계정을 넘기면 계정 선택 없이 그 계정으로 요청하고, 넘기지 않으면 계정을 고르게 한다', async () => {
    google = createFakeGoogle();
    storage = memoryStorage();
    configureDrive({ clientId: 'test-client', gis: google.gis, fetchImpl: google.fetchImpl, storage });
    await store().prepare();
    await store().signIn({ hint: 'a@school.example' });
    expect(google.state.requests[0]).toEqual({ prompt: '', login_hint: 'a@school.example' });
    await store().signOut();
    await store().signIn();
    expect(google.state.requests[1]).toEqual({ prompt: 'select_account' });
  });
});

describe('드라이브 연결 유지', () => {
  beforeEach(() => { useDriveStore.setState({ file: null }); });

  /** 같은 탭을 새로 고친 상황: 탭 저장소는 그대로이고 스토어와 구글 스크립트는 새로 시작합니다. */
  const reload = () => configureDrive({ clientId: 'test-client', gis: google.gis, fetchImpl: google.fetchImpl, storage, tabStorage: tab, now: () => clock });

  it('토큰이 만료된 뒤 저장하면 그 호출 안에서 같은 계정으로 다시 승인받아 저장한다', async () => {
    await signedIn();
    await store().save('v1', { name: '연장.py' });
    const id = store().file.id;
    const before = google.state.requests.length;

    clock += 3_600_000; // 1시간 뒤
    expect((await store().save('v2')).status).toBe('saved');
    expect(google.state.requests).toHaveLength(before + 1);
    expect(google.state.requests.at(-1)).toEqual({ prompt: '', login_hint: 'a@school.example' });
    expect(google.state.files.get(id).content).toBe('v2');
    expect(store().needsReauth).toBe(false);

    // 토큰이 유효한 동안에는 다시 승인받지 않습니다.
    await store().save('v3');
    expect(google.state.requests).toHaveLength(before + 1);
  });

  it('만료 뒤 파일 열기도 다시 승인받아 이어서 연다', async () => {
    await signedIn();
    await store().save('v1', { name: '열기.py' });
    const id = store().file.id;
    clock += 3_600_000;
    expect(await store().openFile(id)).toMatchObject({ status: 'opened', code: 'v1' });
  });

  it('다시 승인할 때 다른 계정이 승인되면 그 계정에 저장하지 않고 재승인을 안내한다', async () => {
    await signedIn();
    await store().save('v1', { name: '계정.py' });
    const id = store().file.id;
    clock += 3_600_000;
    google.state.accountQueue.push({ sub: 'subB', email: 'b@school.example' });

    expect(await store().save('v2')).toEqual({ status: 'error', reason: 'auth' });
    expect(store().needsReauth).toBe(true);
    expect(store().account.email).toBe('a@school.example');
    expect(google.state.files.get(id).content).toBe('v1');
    expect([...google.state.files.values()].filter((f) => f.owner === 'subB' && f.name.endsWith('.py'))).toEqual([]);
    expect(tab.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('승인 창을 열지 못하면 초안을 남기고 예전처럼 재승인을 안내한다', async () => {
    await signedIn();
    await store().save('v1', { name: '막힘.py' });
    clock += 3_600_000;
    const original = google.gis.accounts.oauth2.initTokenClient;
    // 팝업이 막힌 상황: 승인 요청이 오류로 끝납니다.
    reload();
    google.gis.accounts.oauth2.initTokenClient = (config) => ({ requestAccessToken: () => queueMicrotask(() => config.error_callback({ type: 'popup_failed_to_open' })) });
    await store().prepare();
    useDriveStore.setState({ account: { sub: 'subA', email: 'a@school.example', name: '' }, file: { id: 'f1', name: '막힘.py', version: '1', headRevisionId: 'r', savedCode: 'v1' } });
    expect(await store().save('v2')).toEqual({ status: 'error', reason: 'auth' });
    expect(store().needsReauth).toBe(true);
    google.gis.accounts.oauth2.initTokenClient = original;
  });

  it('새로 고침하면 남은 토큰으로 계정을 되살리고, 열어 둔 파일을 알려 준다', async () => {
    await signedIn();
    await store().save('v1', { name: '복구.py' });
    const id = store().file.id;
    expect(JSON.parse(tab.getItem(DRIVE_TAB_KEY))).toEqual({ fileId: id });
    const requests = google.state.requests.length;

    reload();
    tab.setItem(DRIVE_TAB_KEY, JSON.stringify({ fileId: id })); // reload()가 스토어를 비우며 지운 표식을 새로 고침 직전 값으로 되돌림
    expect(store().account).toBeNull();
    expect(hasStoredDriveSession()).toBe(true);
    expect(storedDriveFileId()).toBe(id);

    expect(await store().resume()).toEqual({ status: 'resumed', fileId: id });
    expect(store().account.email).toBe('a@school.example');
    expect(google.state.requests).toHaveLength(requests); // 승인 창을 다시 열지 않음
    expect(await store().openFile(id)).toMatchObject({ status: 'opened', code: 'v1' });
    expect((await store().save('v2')).status).toBe('saved');
  });

  it('남은 토큰이 없거나 만료됐으면 되살리지 않고 구글 스크립트도 준비하지 않는다', async () => {
    await signedIn();
    reload();
    clock += 3_600_000;
    expect(hasStoredDriveSession()).toBe(false);
    expect(await store().resume()).toEqual({ status: 'none' });
    expect(store().ready).toBe(false);
    expect(store().account).toBeNull();
  });

  it('철회된 토큰은 버리고 되살리지 않는다', async () => {
    await signedIn();
    await store().save('v1', { name: '철회.py' });
    reload();
    revokeTokens();
    expect(await store().resume()).toEqual({ status: 'none' });
    expect(store().account).toBeNull();
    expect(tab.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(tab.getItem(DRIVE_TAB_KEY)).toBeNull();
  });

  it('파일을 열어 둔 채 토큰이 만료된 뒤 새로 고치면 한 번만 알리고 표식을 지운다', async () => {
    await signedIn();
    await store().save('v1', { name: '만료표식.py' });
    const id = store().file.id;
    expect(expiredDriveTabFile()).toBe(false); // 토큰이 유효한 동안에는 해당 없음
    reload();
    tab.setItem(DRIVE_TAB_KEY, JSON.stringify({ fileId: id }));
    clock += 3_600_000;
    expect(storedDriveFileId()).toBeNull();
    expect(expiredDriveTabFile()).toBe(true);
    expect(tab.getItem(DRIVE_TAB_KEY)).toBeNull();
    expect(expiredDriveTabFile()).toBe(false);
  });

  it('다시 승인하면서 드라이브 권한을 빼면 저장을 시도하지 않고 권한 안내를 남긴다', async () => {
    await signedIn();
    await store().save('v1', { name: '권한.py' });
    const id = store().file.id;
    clock += 3_600_000;
    // 다음 승인 요청은 드라이브 권한 없이 돌아옵니다(승인 화면에서 체크 상자를 비운 경우).
    const original = google.gis.accounts.oauth2.initTokenClient;
    reload();
    google.gis.accounts.oauth2.initTokenClient = (config) => ({
      requestAccessToken: () => {
        const token = 'tok-noscope';
        google.state.tokens.set(token, { sub: 'subA', email: 'a@school.example' });
        queueMicrotask(() => config.callback({ access_token: token, expires_in: 3599, scope: 'openid email profile' }));
      },
    });
    await store().prepare();
    useDriveStore.setState({ account: { sub: 'subA', email: 'a@school.example', name: '' }, file: { id, name: '권한.py', version: '1', headRevisionId: 'r', savedCode: 'v1' } });
    expect(await store().save('v2')).toEqual({ status: 'error', reason: 'scope' });
    expect(store().missingScope).toBe(true);
    expect(store().error).toEqual({ reason: 'scope' });
    expect(store().busy).toBe('');
    expect(google.state.files.get(id).content).toBe('v1');
    google.gis.accounts.oauth2.initTokenClient = original;
  });

  it('드라이브가 version 숫자만 올린 뒤 초안을 되살려 저장해도 충돌로 보지 않는다', async () => {
    await signedIn();
    await store().save('v1', { name: '버전숫자.py' });
    const id = store().file.id;
    store().rememberDraft('v1 + 편집');
    // 실제 드라이브처럼 내용은 그대로 두고 version 숫자만 올립니다.
    const file = google.state.files.get(id);
    file.version = String(Number(file.version) + 2);

    const reopened = await store().openFile(id);
    expect(reopened.draft.code).toBe('v1 + 편집');
    store().adoptDraft(reopened.draft);
    expect(store().file.savedCode).toBe('v1');
    expect((await store().save('v1 + 편집')).status).toBe('saved');
    expect(google.state.files.get(id).content).toBe('v1 + 편집');
  });

  it('로그아웃하면 탭 저장소의 토큰과 파일 표식을 지운다', async () => {
    await signedIn();
    await store().save('v1', { name: '로그아웃.py' });
    expect(tab.getItem(TOKEN_STORAGE_KEY)).not.toBeNull();
    await store().signOut();
    expect(tab.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(tab.getItem(DRIVE_TAB_KEY)).toBeNull();
    expect(hasStoredDriveSession()).toBe(false);
  });

  it('연결을 끊고 새 코드로 시작하면 파일 표식만 지운다', async () => {
    await signedIn();
    await store().save('v1', { name: '새코드.py' });
    store().detach();
    expect(tab.getItem(DRIVE_TAB_KEY)).toBeNull();
    expect(tab.getItem(TOKEN_STORAGE_KEY)).not.toBeNull();
  });

  it('새로 고침 직후(스토어에 파일이 없을 때) 연결을 끊어도 탭의 파일 표식을 지운다', async () => {
    await signedIn();
    await store().save('v1', { name: '표식.py' });
    const id = store().file.id;
    reload();
    tab.setItem(DRIVE_TAB_KEY, JSON.stringify({ fileId: id }));
    expect(store().file).toBeNull();
    store().detach(); // 다른 코드(공유 링크·팀 프로젝트)를 불러오며 끊는 경우
    expect(tab.getItem(DRIVE_TAB_KEY)).toBeNull();
    expect(storedDriveFileId()).toBeNull();
  });

  it('새 파일로 저장하려다 다시 승인에 실패하면 열어 둔 파일 정보를 지우지 않는다', async () => {
    await signedIn();
    await store().save('v1', { name: '유지.py' });
    const id = store().file.id;
    clock += 3_600_000;
    google.state.accountQueue.push({ sub: 'subB', email: 'b@school.example' }); // 다른 계정이 승인됨 → 다시 승인 실패
    const result = await store().saveAsNew('v2', '유지.py');
    expect(result.status).toBe('error');
    expect(store().file?.id).toBe(id);
    expect([...google.state.files.values()].filter((f) => f.name?.startsWith('유지') && f.name.endsWith('.py'))).toHaveLength(1);
  });

  it('탭 저장소를 사용할 수 없어도 로그인과 저장이 된다', async () => {
    google = createFakeGoogle();
    const broken = { getItem() { throw new Error('막힘'); }, setItem() { throw new Error('막힘'); }, removeItem() { throw new Error('막힘'); } };
    configureDrive({ clientId: 'test-client', gis: google.gis, fetchImpl: google.fetchImpl, storage: memoryStorage(), tabStorage: broken, now: null });
    expect(await store().prepare()).toBe(true);
    expect((await store().signIn()).status).toBe('ok');
    expect((await store().save('v1', { name: 'a.py' })).status).toBe('created');
    expect(hasStoredDriveSession()).toBe(false);
  });
});
