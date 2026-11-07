import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DriveLabApp from './DriveLabApp.jsx';
import { createFakeGoogle, memoryStorage } from './fake-google.js';
import { saveDraft, loadDraft, listDrafts, fileDrafts } from './lab-state.js';

const CLIENT_ID = '123456789012-abcdefghij.apps.googleusercontent.com';

let google;
let storage;
let session;
let view;

function setup({ accounts, seed } = {}) {
  google = createFakeGoogle(accounts ? { accounts } : undefined);
  window.google = google.gis;
  vi.stubGlobal('fetch', google.fetchImpl);
  storage = memoryStorage();
  session = memoryStorage();
  storage.setItem('vpylab-drivelab:clientId', JSON.stringify(CLIENT_ID));
  seed?.();
  view = render(<DriveLabApp storage={storage} sessionStore={session} />);
}

/** 탭이 죽거나 PC가 다시 켜진 상황: 같은 브라우저 저장소로 앱을 새로 띄웁니다(sessionStorage는 비워짐). */
function reopenApp() {
  view.unmount();
  session = memoryStorage();
  view = render(<DriveLabApp storage={storage} sessionStore={session} />);
}

const newDrafts = (store, scope) => listDrafts(store, scope).filter(({ fileId }) => fileId.startsWith('new-'));
/** 한 파일의 초안 내용(탭별 이름과 예전 이름 모두) */
const fileDraftCodes = (fileId) => fileDrafts(storage, 'subA', fileId).map((d) => d.draft.code).sort();

const editor = () => screen.getByRole('textbox', { name: '코드' });
const status = () => screen.getByRole('status');

async function signIn() {
  const button = await screen.findByRole('button', { name: '구글 로그인·드라이브 승인' });
  fireEvent.click(button);
  await waitFor(() => expect(status()).toHaveTextContent('승인되었습니다'));
}

async function openFile(name) {
  fireEvent.click(await screen.findByRole('button', { name }));
  await waitFor(() => expect(status()).toHaveTextContent('열었습니다'));
}

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.google;
});

describe('DriveLabApp', () => {
  it('첫 로그인은 계정 선택 창으로 요청하고 계정을 크게 보여 준다', async () => {
    setup();
    await signIn();
    expect(google.state.requests[0]).toEqual({ prompt: 'select_account' });
    expect(screen.getByLabelText('로그인한 계정')).toHaveTextContent('a@school.example');
  });

  it('파일을 열어도 저장하지 못한 초안은 지워지지 않는다', async () => {
    setup({ seed: () => {} });
    google.addFile({ id: 'f1', name: '공.py', content: 'remote' });
    saveDraft(storage, 'subA', 'f1', { code: 'my draft', baseVersion: '1' });
    await signIn();
    await openFile('공.py');
    expect(screen.getByText(/저장하지 못한 초안이 있습니다/)).toBeInTheDocument();
    expect(fileDraftCodes('f1')).toEqual(['my draft']);

    fireEvent.click(screen.getByRole('button', { name: '초안 불러오기' }));
    expect(editor()).toHaveValue('my draft');
    expect(fileDraftCodes('f1')).toEqual(['my draft']);

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(status()).toHaveTextContent('저장했습니다'));
    expect(google.state.files.get('f1').content).toBe('my draft');
    expect(fileDraftCodes('f1')).toEqual([]);
  });

  it('토큰이 만료된 뒤 저장하면 초안을 남기고, 다시 승인하면 같은 계정으로 저장을 이어 간다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    await signIn();
    await openFile('공.py');
    fireEvent.change(editor(), { target: { value: 'v2 after expiry' } });
    fireEvent.click(screen.getByRole('button', { name: '만료 흉내' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(status()).toHaveTextContent('초안으로 남아 있습니다'));
    expect(fileDraftCodes('f1')).toEqual(['v2 after expiry']);

    fireEvent.click(screen.getByRole('button', { name: '다시 승인' }));
    await waitFor(() => expect(status()).toHaveTextContent('저장했습니다'));
    expect(google.state.files.get('f1').content).toBe('v2 after expiry');
    expect(google.state.requests.at(-1)).toEqual({ prompt: '', login_hint: 'a@school.example' });
    expect(fileDraftCodes('f1')).toEqual([]);
  });

  it('다시 승인에서 다른 계정이 들어오면 앞 계정의 화면을 비운다', async () => {
    setup({
      accounts: [
        { sub: 'subA', email: 'a@school.example', hd: 'school.example' },
        { sub: 'subB', email: 'b@school.example', hd: 'school.example' },
      ],
    });
    google.addFile({ id: 'f1', name: '공.py', content: 'A의 코드' });
    await signIn();
    await openFile('공.py');
    fireEvent.click(screen.getByRole('button', { name: '만료 흉내' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByRole('button', { name: '다시 승인' });
    fireEvent.click(screen.getByRole('button', { name: '다시 승인' }));
    await waitFor(() => expect(status()).toHaveTextContent('다른 계정(b@school.example)'));
    expect(editor()).not.toHaveValue('A의 코드');
    expect(screen.queryByRole('button', { name: '공.py' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('로그인한 계정')).toHaveTextContent('b@school.example');
  });

  it('다른 기기가 먼저 저장했으면 충돌을 보여 주고, 사본 저장 뒤에는 사본을 편집한다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'base' });
    await signIn();
    await openFile('공.py');
    google.remoteSave('f1', 'other device');
    fireEvent.change(editor(), { target: { value: 'mine' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByText('충돌: 드라이브에 더 새로운 내용이 있습니다');
    expect(google.state.files.get('f1').content).toBe('other device');

    fireEvent.click(screen.getByRole('button', { name: '내 코드를 사본으로 저장' }));
    await waitFor(() => expect(status()).toHaveTextContent('따로 저장했습니다'));
    const copy = [...google.state.files.values()].find((f) => f.name?.includes('충돌 사본'));
    expect(copy.content).toBe('mine');
    expect(screen.getByRole('heading', { name: /충돌 사본/ })).toBeInTheDocument();
    expect(fileDraftCodes('f1')).toEqual([]);
  });

  it('드라이브 내용 사용은 확인을 받은 뒤에만 내 변경을 버린다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'base' });
    await signIn();
    await openFile('공.py');
    google.remoteSave('f1', 'other device');
    fireEvent.change(editor(), { target: { value: 'mine' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByText('충돌: 드라이브에 더 새로운 내용이 있습니다');
    window.confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: '드라이브 내용 사용' }));
    expect(editor()).toHaveValue('mine');
    fireEvent.click(screen.getByRole('button', { name: '드라이브 내용 사용' }));
    expect(editor()).toHaveValue('other device');
  });

  it('로그아웃할 때 초안 지우기를 고르면 그 계정의 초안과 편집기 내용이 사라진다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'base' });
    await signIn();
    await openFile('공.py');
    fireEvent.change(editor(), { target: { value: 'secret work' } });
    expect(fileDraftCodes('f1')).toEqual(['secret work']);
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(status()).toHaveTextContent('초안 1개를 지웠습니다'));
    expect(fileDraftCodes('f1')).toEqual([]);
    expect(editor()).not.toHaveValue('secret work');
    expect(screen.queryByLabelText('로그인한 계정')).not.toBeInTheDocument();
  });

  it('로그인 전 새 코드는 탭 저장소(sessionStorage)에만 남고, 로그인하면 그 계정 초안으로 옮겨진 뒤 새 파일을 만들면 지워진다', async () => {
    setup();
    fireEvent.change(editor(), { target: { value: 'before login' } });
    expect(newDrafts(session, 'anon').map((d) => d.draft.code)).toEqual(['before login']);
    expect(newDrafts(storage, 'anon')).toEqual([]);
    await signIn();
    expect(newDrafts(session, 'anon')).toEqual([]);
    expect(newDrafts(storage, 'subA').map((d) => d.draft.code)).toEqual(['before login']);
    expect(screen.queryByText(/저장하지 못한 초안이 있습니다/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '편집기 내용으로 새 파일' }));
    await waitFor(() => expect(status()).toHaveTextContent('만들었습니다'));
    expect(newDrafts(storage, 'subA')).toEqual([]);
    const created = [...google.state.files.values()].find((f) => f.name === '첫 실험.py');
    expect(created.content).toBe('before login');
  });

  it('오래된 버전에서 시작한 초안을 불러오면 바로 충돌 화면을 보여 주고 저장을 막는다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    saveDraft(storage, 'subA', 'f1', { code: 'draft from v1', baseVersion: '1' });
    google.remoteSave('f1', 'v2 from home');
    await signIn();
    await openFile('공.py');
    fireEvent.click(screen.getByRole('button', { name: '초안 불러오기' }));
    expect(screen.getByText('충돌: 드라이브에 더 새로운 내용이 있습니다')).toBeInTheDocument();
    expect(status()).toHaveTextContent('버전 1에서 시작했는데');
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(google.state.files.get('f1').content).toBe('v2 from home');

    fireEvent.click(screen.getByRole('button', { name: '내 코드를 사본으로 저장' }));
    await waitFor(() => expect(status()).toHaveTextContent('따로 저장했습니다'));
    expect(google.state.files.get('f1').content).toBe('v2 from home');
    expect([...google.state.files.values()].some((f) => f.content === 'draft from v1')).toBe(true);
  });

  it('같은 버전에서 시작한 초안은 충돌 없이 불러와 저장된다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    saveDraft(storage, 'subA', 'f1', { code: 'draft from v1', baseVersion: '1' });
    await signIn();
    await openFile('공.py');
    fireEvent.click(screen.getByRole('button', { name: '초안 불러오기' }));
    expect(screen.queryByText('충돌: 드라이브에 더 새로운 내용이 있습니다')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(google.state.files.get('f1').content).toBe('draft from v1'));
  });

  it('다시 승인 뒤에는 실패 시점이 아닌 최신 편집 내용을 저장한다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    await signIn();
    await openFile('공.py');
    fireEvent.change(editor(), { target: { value: 'at failure' } });
    fireEvent.click(screen.getByRole('button', { name: '만료 흉내' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByRole('button', { name: '다시 승인' });
    fireEvent.change(editor(), { target: { value: 'edited after failure' } });
    fireEvent.click(screen.getByRole('button', { name: '다시 승인' }));
    await waitFor(() => expect(google.state.files.get('f1').content).toBe('edited after failure'));
  });

  it('로그아웃한 뒤 구글 계정 로그아웃 링크를 보여 준다', async () => {
    setup();
    await signIn();
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    const link = await screen.findByRole('link', { name: '구글 계정에서도 로그아웃' });
    expect(link).toHaveAttribute('href', 'https://accounts.google.com/Logout');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('로그인한 뒤 파일로 만들기 전에 탭이 닫혀도, 다시 로그인하면 새 코드 초안을 알려 주고 되살린다', async () => {
    setup();
    await signIn();
    fireEvent.change(editor(), { target: { value: 'unsaved new work' } });
    expect(newDrafts(storage, 'subA').map((d) => d.draft.code)).toEqual(['unsaved new work']);

    reopenApp();
    expect(editor()).not.toHaveValue('unsaved new work');
    await signIn();
    expect(screen.getByText(/저장하지 못한 초안이 있습니다/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '초안 불러오기' }));
    expect(editor()).toHaveValue('unsaved new work');
    // 되살린 초안은 지금 편집기의 초안 하나로 합쳐집니다.
    expect(newDrafts(storage, 'subA').map((d) => d.draft.code)).toEqual(['unsaved new work']);
  });

  it('로그인 전 초안을 옮겨도 그 계정의 기존 새 코드 초안을 덮어쓰지 않는다', async () => {
    setup({ seed: () => saveDraft(storage, 'subA', 'new-older', { code: 'older unsaved' }) });
    fireEvent.change(editor(), { target: { value: 'typed before login' } });
    await signIn();
    const codes = newDrafts(storage, 'subA').map((d) => d.draft.code).sort();
    expect(codes).toEqual(['older unsaved', 'typed before login']);
    expect(screen.getByText(/저장하지 못한 초안이 있습니다/)).toBeInTheDocument();
  });

  it('초안 버리기는 안내한 그 초안만 지운다', async () => {
    setup({ seed: () => saveDraft(storage, 'subA', 'new-older', { code: 'older unsaved' }) });
    await signIn();
    fireEvent.click(screen.getByRole('button', { name: '초안 버리기' }));
    expect(loadDraft(storage, 'subA', 'new-older')).toBeNull();
  });

  it('초안 안내 중에 그대로 입력하고 저장해도 지난 초안은 남는다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    saveDraft(storage, 'subA', 'f1@oldtab', { code: 'period 1 work', baseVersion: '1', name: '공.py' });
    await signIn();
    await openFile('공.py');
    expect(screen.getByText(/저장하지 못한 초안이 있습니다/)).toBeInTheDocument();
    fireEvent.change(editor(), { target: { value: 'period 2 typing' } });
    expect(fileDraftCodes('f1')).toEqual(['period 1 work', 'period 2 typing']);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(status()).toHaveTextContent('저장했습니다'));
    expect(fileDraftCodes('f1')).toEqual(['period 1 work']);
    expect(screen.getByText(/저장하지 못한 초안이 있습니다/)).toBeInTheDocument();
  });

  it('같은 탭에서 저장 못 한 파일을 다시 열면 그 초안을 따로 옮겨 안내하고, 입력해도 지워지지 않는다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    google.addFile({ id: 'f2', name: '별.py', content: 's1' });
    await signIn();
    await openFile('공.py');
    fireEvent.change(editor(), { target: { value: 'unsaved in this tab' } });
    await openFile('별.py');
    await openFile('공.py');
    expect(screen.getByText(/저장하지 못한 초안이 있습니다/)).toBeInTheDocument();
    fireEvent.change(editor(), { target: { value: 'typing again' } });
    expect(fileDraftCodes('f1')).toEqual(['typing again', 'unsaved in this tab']);
  });

  it('충돌 화면을 보는 사이 다른 기기가 또 저장했으면 덮어쓰기를 멈추고 새 충돌을 보여 준다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'base' });
    await signIn();
    await openFile('공.py');
    google.remoteSave('f1', 'device B');
    fireEvent.change(editor(), { target: { value: 'mine' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByText('충돌: 드라이브에 더 새로운 내용이 있습니다');
    google.remoteSave('f1', 'device C later');
    fireEvent.click(screen.getByRole('button', { name: '내 코드로 덮어쓰기' }));
    await waitFor(() => expect(screen.getByDisplayValue('device C later')).toBeInTheDocument());
    expect(google.state.files.get('f1').content).toBe('device C later');
  });

  it('초안 목록에서 다른 파일의 초안을 고르면 그 파일을 열고 안내한다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    saveDraft(storage, 'subA', 'f1@oldtab', { code: 'old work', baseVersion: '1', name: '공.py' });
    await signIn();
    fireEvent.click(screen.getByText(/이 브라우저에 남은 다른 초안 1개/));
    fireEvent.click(screen.getByRole('button', { name: '살펴보기' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /편집기 · 공\.py/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '초안 불러오기' }));
    expect(editor()).toHaveValue('old work');
  });

  it('초안 목록에서 다른 파일 초안을 골랐다가 열기를 취소하면 지금 파일에 그 초안을 안내하지 않는다', async () => {
    setup();
    google.addFile({ id: 'f1', name: 'A.py', content: 'a1' });
    google.addFile({ id: 'f2', name: 'B.py', content: 'b1' });
    saveDraft(storage, 'subA', 'f2@oldtab', { code: 'B draft', baseVersion: '1', name: 'B.py' });
    await signIn();
    await openFile('A.py');
    fireEvent.change(editor(), { target: { value: 'A editing' } });
    window.confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByText(/이 브라우저에 남은 다른 초안 1개/));
    fireEvent.click(screen.getByRole('button', { name: '살펴보기' }));
    await waitFor(() => expect(window.confirm).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: '초안 불러오기' })).not.toBeInTheDocument();
    expect(editor()).toHaveValue('A editing');
    expect(fileDrafts(storage, 'subA', 'f2').map((d) => d.draft.code)).toEqual(['B draft']);
  });

  it('초안 목록에서 고른 파일의 열기가 실패해도 지금 파일에 그 초안을 안내하지 않는다', async () => {
    setup();
    google.addFile({ id: 'f1', name: 'A.py', content: 'a1' });
    google.addFile({ id: 'f2', name: 'B.py', content: 'b1' });
    saveDraft(storage, 'subA', 'f2@oldtab', { code: 'B draft', baseVersion: '1', name: 'B.py' });
    await signIn();
    await openFile('A.py');
    google.state.files.get('f2').owner = 'someoneElse'; // 열 때 404
    fireEvent.click(screen.getByText(/이 브라우저에 남은 다른 초안 1개/));
    fireEvent.click(screen.getByRole('button', { name: '살펴보기' }));
    await waitFor(() => expect(status()).toHaveTextContent('열기 실패'));
    expect(screen.queryByRole('button', { name: '초안 불러오기' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /편집기 · A\.py/ })).toBeInTheDocument();
  });

  it('안내 배너는 초안의 파일 이름을 보여 준다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    saveDraft(storage, 'subA', 'f1@oldtab', { code: 'old', baseVersion: '1', name: '공.py' });
    await signIn();
    await openFile('공.py');
    expect(screen.getByText(/저장하지 못한 초안이 있습니다/)).toHaveTextContent('공.py');
  });

  it('초안을 브라우저에 저장하지 못하면 경고한다', async () => {
    setup();
    await signIn();
    const original = storage.setItem;
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    fireEvent.change(editor(), { target: { value: 'too big for storage' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('저장 공간이 가득 차');
    storage.setItem = original;
  });

  it('열린 파일을 휴지통으로 옮기면 그 파일의 초안 안내도 사라진다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    saveDraft(storage, 'subA', 'f1@oldtab', { code: 'old', baseVersion: '1', name: '공.py' });
    await signIn();
    await openFile('공.py');
    fireEvent.click(screen.getByRole('button', { name: '공.py 휴지통으로' }));
    await waitFor(() => expect(status()).toHaveTextContent('휴지통으로 옮겼습니다'));
    expect(screen.queryByText(/저장하지 못한 초안이 있습니다/)).not.toBeInTheDocument();
    expect(fileDrafts(storage, 'subA', 'f1')).toEqual([]);
  });

  it('파일 목록은 계정의 파일만 보여 준다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '내 파일.py', content: 'x' });
    google.addFile({ id: 'f2', name: '남의 파일.py', content: 'y', owner: 'subZ' });
    await signIn();
    expect(await screen.findByRole('button', { name: '내 파일.py' })).toBeInTheDocument();
    expect(screen.queryByText('남의 파일.py')).not.toBeInTheDocument();
  });
});
