import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, configure } from '@testing-library/react';
import DriveLabApp from './DriveLabApp.jsx';
import { createFakeGoogle, memoryStorage } from './fake-google.js';
import { saveDraft, loadDraft, listDrafts, fileDrafts } from './lab-state.js';

// 전체 테스트를 함께 돌릴 때(무거운 Python 예제 테스트와 동시 실행) 기다림이 1초를 넘을 수 있어 한도를 늘립니다.
configure({ asyncUtilTimeout: 5000 });

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

  it('VPyLab 폴더가 드라이브 휴지통으로 가면 알리고, 되살리기를 누르면 파일이 돌아온다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'base' });
    await signIn();
    await screen.findByRole('button', { name: '공.py' });
    google.state.files.get('folder-subA').trashed = true;
    fireEvent.click(screen.getByRole('button', { name: '목록 새로 고침' }));
    await waitFor(() => expect(status()).toHaveTextContent('VPyLab 폴더가 드라이브 휴지통에 있습니다'));
    fireEvent.click(screen.getByRole('button', { name: 'VPyLab 폴더 되살리기' }));
    await waitFor(() => expect(status()).toHaveTextContent('되살렸습니다'));
    expect(google.state.files.get('folder-subA').trashed).toBe(false);
    expect(screen.getByRole('button', { name: '공.py' })).toBeInTheDocument();
  });

  it('같은 탭에서 다른 계정으로 바뀌면 그 계정의 폴더를 새로 찾아 목록을 보여 주고 파일을 만들 수 있다', async () => {
    setup({ accounts: [{ sub: 'subA', email: 'a@school.example' }, { sub: 'subB', email: 'b@school.example' }] });
    google.addFile({ id: 'fa', name: 'A의 파일.py', content: 'a', owner: 'subA' });
    google.addFile({ id: 'fb', name: 'B의 파일.py', content: 'b', owner: 'subB' });
    await signIn();
    await screen.findByRole('button', { name: 'A의 파일.py' });
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(status()).toHaveTextContent('로그아웃했습니다'));
    await signIn();
    expect(await screen.findByRole('button', { name: 'B의 파일.py' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'A의 파일.py' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '편집기 내용으로 새 파일' }));
    await waitFor(() => expect(status()).toHaveTextContent('드라이브 VPyLab 폴더에 만들었습니다'));
    const created = [...google.state.files.values()].find((f) => f.owner === 'subB' && f.name === '첫 실험.py');
    expect(created.parents).toEqual(['folder-subB']);
  });

  it('같은 이름의 파일이 있으면 새 파일 이름에 번호를 붙인다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '첫 실험.py', content: 'old' });
    await signIn();
    await screen.findByRole('button', { name: '첫 실험.py' });
    fireEvent.click(screen.getByRole('button', { name: '편집기 내용으로 새 파일' }));
    await waitFor(() => expect(status()).toHaveTextContent('첫 실험 (2).py을(를) 드라이브 VPyLab 폴더에 만들었습니다'));
  });

  it('다른 탭에서 휴지통으로 옮긴 파일에는 저장하지 않고 초안을 남긴 채 알린다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'base' });
    await signIn();
    await openFile('공.py');
    google.state.files.get('f1').trashed = true;
    fireEvent.change(editor(), { target: { value: 'mine' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(status()).toHaveTextContent('휴지통으로 옮겨졌습니다'));
    expect(google.state.files.get('f1').content).toBe('base');
    expect(fileDraftCodes('f1')).toEqual(['mine']);
  });

  it('같은 브라우저의 다른 탭이 먼저 저장했으면 "다른 기기"라고 하지 않는다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'base' });
    await signIn();
    await openFile('공.py');
    google.remoteSave('f1', 'other tab');
    google.state.files.get('f1').appProperties = { vpylabDevice: screen.getByText(/이 브라우저:/).textContent.replace(/.*이 브라우저:\s*/, '').trim() };
    fireEvent.change(editor(), { target: { value: 'mine' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(status()).toHaveTextContent('이 브라우저의 다른 탭(창)에서 먼저 저장했습니다'));
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

  it('새 코드를 쓰다 파일을 연 뒤 "새 코드"로 돌아오면 그 새 코드 초안이 남아 있다', async () => {
    setup();
    google.addFile({ id: 'f1', name: 'A.py', content: 'a1' });
    await signIn();
    fireEvent.change(editor(), { target: { value: 'my new idea' } });
    await openFile('A.py');
    fireEvent.click(screen.getByRole('button', { name: '새 코드' }));
    expect(editor()).toHaveValue('my new idea');
    expect(newDrafts(storage, 'subA').map((d) => d.draft.code)).toEqual(['my new idea']);
  });

  it('열린 파일을 휴지통으로 옮겨도 이 탭의 새 코드 초안은 남는다', async () => {
    setup();
    google.addFile({ id: 'f1', name: 'A.py', content: 'a1' });
    await signIn();
    fireEvent.change(editor(), { target: { value: 'my new idea' } });
    await openFile('A.py');
    fireEvent.click(screen.getByRole('button', { name: 'A.py 휴지통으로' }));
    await waitFor(() => expect(status()).toHaveTextContent('휴지통으로 옮겼습니다'));
    expect(editor()).toHaveValue('my new idea');
    expect(newDrafts(storage, 'subA').map((d) => d.draft.code)).toEqual(['my new idea']);
  });

  it('편집 중에 다른 초안을 불러오면 지금 내용을 별도 초안으로 남긴다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    saveDraft(storage, 'subA', 'f1@oldtab', { code: 'old work', baseVersion: '1', name: '공.py' });
    await signIn();
    await openFile('공.py');
    fireEvent.change(editor(), { target: { value: 'typed first' } });
    fireEvent.click(screen.getByRole('button', { name: '초안 불러오기' }));
    expect(editor()).toHaveValue('old work');
    expect(fileDraftCodes('f1')).toEqual(['old work', 'typed first']);
  });

  it('휴지통 확인 창은 저장하지 않은 초안이 함께 지워진다고 알린다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    saveDraft(storage, 'subA', 'f1@oldtab', { code: 'old work', baseVersion: '1', name: '공.py' });
    await signIn();
    window.confirm.mockReturnValueOnce(false);
    fireEvent.click(await screen.findByRole('button', { name: '공.py 휴지통으로' }));
    expect(window.confirm).toHaveBeenLastCalledWith(expect.stringContaining('저장하지 않은 초안 1개'));
    expect(google.state.files.get('f1').trashed).toBeFalsy();
  });

  it('로그아웃할 때 초안을 남기면, 같은 탭에서 다시 로그인했을 때 그 초안을 안내한다', async () => {
    setup();
    await signIn();
    fireEvent.change(editor(), { target: { value: 'X kept on logout' } });
    window.confirm.mockReturnValueOnce(false); // 초안 지우기: 아니요
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(status()).toHaveTextContent('로그아웃했습니다'));
    await signIn();
    expect(screen.getByText(/저장하지 못한 초안이 있습니다/)).toBeInTheDocument();
    expect(newDrafts(storage, 'subA').map((d) => d.draft.code)).toEqual(['X kept on logout']);
    fireEvent.click(screen.getByRole('button', { name: '초안 불러오기' }));
    expect(editor()).toHaveValue('X kept on logout');
  });

  it('로그아웃(초안 유지) 뒤 로그인 전에 쓴 코드가 앞 초안을 덮어쓰지 않는다', async () => {
    setup();
    await signIn();
    fireEvent.change(editor(), { target: { value: 'X' } });
    window.confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(status()).toHaveTextContent('로그아웃했습니다'));
    fireEvent.change(editor(), { target: { value: 'Y before login' } });
    await signIn();
    expect(newDrafts(storage, 'subA').map((d) => d.draft.code).sort()).toEqual(['X', 'Y before login']);
  });

  it('같은 탭에서 A → B → A로 계정이 바뀌어도 A의 새 코드 초안을 안내한다', async () => {
    setup({
      accounts: [
        { sub: 'subA', email: 'a@school.example', hd: 'school.example' },
        { sub: 'subB', email: 'b@school.example', hd: 'school.example' },
        { sub: 'subA', email: 'a@school.example', hd: 'school.example' },
      ],
    });
    /** 토큰을 만료시키고 목록을 새로 고쳐 "다시 승인"을 띄운 뒤 누릅니다. 가짜 구글은 다음 계정을 돌려줍니다. */
    async function reauthorize() {
      fireEvent.click(screen.getByRole('button', { name: '만료 흉내' }));
      fireEvent.click(screen.getByRole('button', { name: '목록 새로 고침' }));
      fireEvent.click(await screen.findByRole('button', { name: '다시 승인' }));
    }
    await signIn();
    fireEvent.change(editor(), { target: { value: 'A idea' } });
    await reauthorize();
    await waitFor(() => expect(screen.getByLabelText('로그인한 계정')).toHaveTextContent('b@school.example'));
    expect(editor()).not.toHaveValue('A idea');
    await reauthorize();
    await waitFor(() => expect(screen.getByLabelText('로그인한 계정')).toHaveTextContent('a@school.example'));
    expect(newDrafts(storage, 'subA').map((d) => d.draft.code)).toEqual(['A idea']);
    expect(screen.getByText(/저장하지 못한 초안이 있습니다/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '초안 불러오기' }));
    expect(editor()).toHaveValue('A idea');
  });

  it('휴지통 확인 창은 편집 중인 이 탭 초안을 두 번 세지 않는다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    await signIn();
    await openFile('공.py');
    fireEvent.change(editor(), { target: { value: 'editing' } });
    window.confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: '공.py 휴지통으로' }));
    expect(window.confirm).toHaveBeenLastCalledWith(expect.stringContaining('저장하지 않은 초안 1개'));
  });

  it('파일을 연 상태에서 "편집기 내용으로 새 파일"을 눌러도 상관없는 새 코드 초안은 남는다', async () => {
    setup();
    google.addFile({ id: 'f1', name: 'A.py', content: 'a1' });
    await signIn();
    fireEvent.change(editor(), { target: { value: 'X new idea' } });
    await openFile('A.py');
    fireEvent.change(editor(), { target: { value: 'A edited' } });
    fireEvent.click(screen.getByRole('button', { name: '편집기 내용으로 새 파일' }));
    await waitFor(() => expect(status()).toHaveTextContent('만들었습니다'));
    expect(newDrafts(storage, 'subA').map((d) => d.draft.code)).toEqual(['X new idea']);
    expect(fileDraftCodes('f1')).toEqual([]); // A의 편집 내용은 새 파일에 담겼습니다.
    expect([...google.state.files.values()].some((f) => f.name === '첫 실험.py' && f.content === 'A edited')).toBe(true);
  });

  it('저장 공간이 가득 차 초안을 보관할 수 없으면 파일을 다시 열지 않고 초안을 지키며 알린다', async () => {
    setup();
    google.addFile({ id: 'f1', name: 'A.py', content: 'a1' });
    google.addFile({ id: 'f2', name: 'B.py', content: 'b1' });
    await signIn();
    await openFile('A.py');
    fireEvent.change(editor(), { target: { value: 'A unsaved' } });
    await openFile('B.py');
    const original = storage.setItem;
    storage.setItem = (k, v) => { if (k.includes('@pending-')) throw new Error('QuotaExceededError'); return original(k, v); };
    fireEvent.click(screen.getByRole('button', { name: 'A.py' }));
    await waitFor(() => expect(status()).toHaveTextContent('저장 공간이 가득 차'));
    expect(screen.getByRole('heading', { name: /편집기 · B\.py/ })).toBeInTheDocument();
    expect(fileDraftCodes('f1')).toEqual(['A unsaved']);
    storage.setItem = original;
  });

  it('편집 중에 이전 버전을 불러오면 확인을 받고 지금 내용을 별도 초안으로 남긴다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    await signIn();
    await openFile('공.py');
    fireEvent.change(editor(), { target: { value: 'v2' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(status()).toHaveTextContent('저장했습니다'));
    fireEvent.change(editor(), { target: { value: 'unsaved v3' } });
    fireEvent.click(screen.getByRole('button', { name: '버전 기록' }));
    const buttons = await screen.findAllByRole('button', { name: '불러오기' });
    fireEvent.click(buttons[buttons.length - 1]); // 가장 오래된 버전(v1)
    await waitFor(() => expect(editor()).toHaveValue('v1'));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('이전 버전을 불러올까요'));
    expect(fileDraftCodes('f1')).toContain('unsaved v3');
  });

  it('초안을 저장하지 못한 상태에서는 로그아웃을 취소할 수 있다', async () => {
    setup();
    await signIn();
    const original = storage.setItem;
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    fireEvent.change(editor(), { target: { value: 'cannot store' } });
    await screen.findByRole('alert');
    window.confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(screen.getByLabelText('로그인한 계정')).toHaveTextContent('a@school.example');
    expect(editor()).toHaveValue('cannot store');
    storage.setItem = original;
  });

  it('초안을 저장하지 못한 상태에서 다른 파일을 열려고 하면 내용을 잃는다고 알리고 취소할 수 있다', async () => {
    setup();
    google.addFile({ id: 'f1', name: 'A.py', content: 'a1' });
    await signIn();
    const original = storage.setItem;
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    fireEvent.change(editor(), { target: { value: 'not stored' } });
    await screen.findByRole('alert');
    window.confirm.mockReturnValueOnce(false);
    fireEvent.click(await screen.findByRole('button', { name: 'A.py' }));
    expect(window.confirm).toHaveBeenLastCalledWith(expect.stringContaining('이 내용을 잃습니다'));
    expect(editor()).toHaveValue('not stored');
    storage.setItem = original;
  });

  it('초안을 저장하지 못한 상태에서 다른 계정이 승인되면 비우기 전에 코드를 내려받을지 묻는다', async () => {
    setup({
      accounts: [
        { sub: 'subA', email: 'a@school.example', hd: 'school.example' },
        { sub: 'subB', email: 'b@school.example', hd: 'school.example' },
      ],
    });
    await signIn();
    const created = [];
    const createObjectURL = vi.fn(() => 'blob:fake');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { created.push(this.download); });
    const original = storage.setItem;
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    fireEvent.change(editor(), { target: { value: 'A unsaved work' } });
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: '만료 흉내' }));
    fireEvent.click(screen.getByRole('button', { name: '목록 새로 고침' }));
    fireEvent.click(await screen.findByRole('button', { name: '다시 승인' }));
    await waitFor(() => expect(screen.getByLabelText('로그인한 계정')).toHaveTextContent('b@school.example'));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('.py 파일로 내려받을까요'));
    expect(created).toEqual(['저장하지 못한 코드.py']);
    const blob = createObjectURL.mock.calls[0][0];
    expect(await blob.text()).toBe('A unsaved work');
    expect(editor()).not.toHaveValue('A unsaved work');
    storage.setItem = original;
    click.mockRestore();
  });

  it('이전 버전을 받아오는 동안 입력한 내용도 별도 초안으로 남긴다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    await signIn();
    await openFile('공.py');
    fireEvent.change(editor(), { target: { value: 'v2' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(status()).toHaveTextContent('저장했습니다'));
    fireEvent.click(screen.getByRole('button', { name: '버전 기록' }));
    const buttons = await screen.findAllByRole('button', { name: '불러오기' });
    let release;
    const gate = new Promise((r) => { release = r; });
    const realFetch = google.fetchImpl;
    vi.stubGlobal('fetch', async (url, init) => {
      if (String(url).includes('/revisions/') && String(url).includes('alt=media')) await gate;
      return realFetch(url, init);
    });
    fireEvent.click(buttons[buttons.length - 1]);
    fireEvent.change(editor(), { target: { value: 'typed while loading' } });
    release();
    await waitFor(() => expect(editor()).toHaveValue('v1'));
    expect(fileDraftCodes('f1')).toContain('typed while loading');
  });

  it('충돌 화면이 열린 채 새 파일을 만들면 충돌 화면을 닫는다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'base' });
    await signIn();
    await openFile('공.py');
    google.remoteSave('f1', 'other');
    fireEvent.change(editor(), { target: { value: 'mine' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByText('충돌: 드라이브에 더 새로운 내용이 있습니다');
    fireEvent.click(screen.getByRole('button', { name: '편집기 내용으로 새 파일' }));
    await waitFor(() => expect(status()).toHaveTextContent('만들었습니다'));
    expect(screen.queryByText('충돌: 드라이브에 더 새로운 내용이 있습니다')).not.toBeInTheDocument();
  });

  it('초안을 불러올 때 이 탭 초안으로 옮기지 못하면 원래 초안을 지우지 않는다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    saveDraft(storage, 'subA', 'f1@oldtab', { code: 'old work', baseVersion: '1', name: '공.py' });
    await signIn();
    await openFile('공.py');
    const original = storage.setItem;
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    fireEvent.click(screen.getByRole('button', { name: '초안 불러오기' }));
    expect(editor()).toHaveValue('old work');
    expect(fileDraftCodes('f1')).toEqual(['old work']);
    storage.setItem = original;
  });

  it('다른 탭의 더 최근 초안이 있어도, 같은 파일을 다시 열 때 이 탭의 편집 내용을 보류 초안으로 남긴다', async () => {
    setup();
    google.addFile({ id: 'f1', name: 'X.py', content: 'x1' });
    await signIn();
    await openFile('X.py');
    fireEvent.change(editor(), { target: { value: 'this tab edit' } });
    // 다른 탭이 나중에 쓴 초안(확실히 더 최근 시각)
    storage.setItem('vpylab-drivelab:draft:subA:f1@othertab', JSON.stringify({ code: 'other tab edit', baseVersion: '1', name: 'X.py', at: new Date(Date.now() + 60_000).toISOString() }));
    fireEvent.click(screen.getByRole('button', { name: 'X.py' }));
    await waitFor(() => expect(status()).toHaveTextContent('열었습니다'));
    expect(fileDraftCodes('f1')).toEqual(['other tab edit', 'this tab edit']);
    expect(screen.getByText(/저장하지 못한 초안이 있습니다/)).toBeInTheDocument();
  });

  it('초안 목록에서 고른 초안이 열면서 보류로 옮겨져도 그 초안을 정확히 안내하고, 버리면 남지 않는다', async () => {
    setup();
    google.addFile({ id: 'f1', name: 'X.py', content: 'x1' });
    google.addFile({ id: 'f2', name: 'Y.py', content: 'y1' });
    await signIn();
    await openFile('X.py');
    fireEvent.change(editor(), { target: { value: 'X edit in this tab' } });
    storage.setItem('vpylab-drivelab:draft:subA:f1@othertab', JSON.stringify({ code: 'X other tab', baseVersion: '1', name: 'X.py', at: new Date(Date.now() + 60_000).toISOString() }));
    await openFile('Y.py');
    fireEvent.click(screen.getByText(/이 브라우저에 남은 다른 초안 2개/));
    const thisTabEntry = screen.getAllByRole('button', { name: '살펴보기' });
    // 목록은 최근 순: 다른 탭 초안이 먼저, 이 탭 초안이 다음
    fireEvent.click(thisTabEntry[1]);
    await waitFor(() => expect(screen.getByRole('heading', { name: /편집기 · X\.py/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '초안 불러오기' }));
    expect(editor()).toHaveValue('X edit in this tab');
  });

  it('초안을 버려 공간이 생기면 저장하지 못했던 이 탭 초안을 다시 저장하고 경고를 내린다', async () => {
    setup({ seed: () => saveDraft(storage, 'subA', 'new-older', { code: 'old idea', name: null }) });
    await signIn();
    const original = storage.setItem;
    let full = true;
    storage.setItem = (k, v) => { if (full) throw new Error('QuotaExceededError'); return original(k, v); };
    fireEvent.change(editor(), { target: { value: 'needs space' } });
    await screen.findByRole('alert');
    full = false;
    fireEvent.click(screen.getByRole('button', { name: '초안 버리기' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(newDrafts(storage, 'subA').map((d) => d.draft.code)).toEqual(['needs space']);
    storage.setItem = original;
  });

  it('로그인 전 초안을 옮기지 못하면 알리고, 로그인과 파일 목록은 그대로 진행한다', async () => {
    setup();
    google.addFile({ id: 'f1', name: 'A.py', content: 'a1' });
    fireEvent.change(editor(), { target: { value: 'anon work' } });
    const original = storage.setItem;
    storage.setItem = (k, v) => { if (k.includes(':draft:')) throw new Error('QuotaExceededError'); return original(k, v); };
    fireEvent.click(await screen.findByRole('button', { name: '구글 로그인·드라이브 승인' }));
    await waitFor(() => expect(status()).toHaveTextContent('옮기지 못했습니다'));
    expect(screen.getByLabelText('로그인한 계정')).toHaveTextContent('a@school.example');
    expect(await screen.findByRole('button', { name: 'A.py' })).toBeInTheDocument();
    expect(newDrafts(session, 'anon').map((d) => d.draft.code)).toEqual(['anon work']);
    storage.setItem = original;
  });

  it('구글 응답을 기다리는 동안 편집기를 잠근다', async () => {
    setup();
    google.addFile({ id: 'f1', name: 'A.py', content: 'a1' });
    await signIn();
    let release;
    const gate = new Promise((r) => { release = r; });
    const realFetch = google.fetchImpl;
    vi.stubGlobal('fetch', async (url, init) => { await gate; return realFetch(url, init); });
    fireEvent.click(screen.getByRole('button', { name: 'A.py' }));
    await waitFor(() => expect(editor()).toHaveAttribute('readonly'));
    release();
    await waitFor(() => expect(status()).toHaveTextContent('열었습니다'));
    expect(editor()).not.toHaveAttribute('readonly');
  });

  it('충돌 화면이 열린 채 같은 파일의 다른 초안을 불러와도 충돌 화면의 드라이브 정보는 그대로다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    google.remoteSave('f1', 'v2');
    google.remoteSave('f1', 'v3');
    google.remoteSave('f1', 'v4 drive');
    saveDraft(storage, 'subA', 'f1@t1', { code: 'draft from v2', baseVersion: '2', name: '공.py' });
    storage.setItem('vpylab-drivelab:draft:subA:f1@t2', JSON.stringify({ code: 'draft from v3', baseVersion: '3', name: '공.py', at: new Date(Date.now() + 60_000).toISOString() }));
    await signIn();
    await openFile('공.py');
    fireEvent.click(screen.getByRole('button', { name: '초안 불러오기' })); // 가장 최근: v3에서 시작한 초안
    expect(screen.getByText('충돌: 드라이브에 더 새로운 내용이 있습니다')).toBeInTheDocument();
    expect(screen.getByDisplayValue('v4 drive')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/이 브라우저에 남은 다른 초안/));
    fireEvent.click(screen.getByRole('button', { name: '살펴보기' }));
    fireEvent.click(screen.getByRole('button', { name: '초안 불러오기' }));
    expect(editor()).toHaveValue('draft from v2');
    expect(screen.getByDisplayValue('v4 drive')).toBeInTheDocument();
    expect(screen.getByText(/드라이브 코드 \(버전 4/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '드라이브 내용 사용' }));
    expect(editor()).toHaveValue('v4 drive');
  });

  it('다시 승인은 마지막으로 실패한 작업만 이어서 하고, 앞서 실패한 저장을 엉뚱하게 다시 하지 않는다', async () => {
    setup();
    google.addFile({ id: 'f1', name: 'A.py', content: 'a1' });
    await signIn();
    await openFile('A.py');
    fireEvent.change(editor(), { target: { value: 'A edit' } });
    fireEvent.click(screen.getByRole('button', { name: '만료 흉내' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByRole('button', { name: '다시 승인' });
    fireEvent.click(screen.getByRole('button', { name: '목록 새로 고침' }));
    await waitFor(() => expect(screen.getByText(/목록 중 권한이 필요합니다/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '다시 승인' }));
    await waitFor(() => expect(status()).toHaveTextContent('승인되었습니다'));
    expect(google.state.files.get('f1').content).toBe('a1');
    expect(fileDraftCodes('f1')).toEqual(['A edit']);
  });

  it('로그인 전에 쓴 코드를 옮기지 않겠다고 하면 그 코드를 지우고 편집기를 비운다', async () => {
    setup();
    fireEvent.change(editor(), { target: { value: 'someone else wrote this' } });
    window.confirm.mockReturnValueOnce(false);
    await signIn();
    expect(newDrafts(storage, 'subA')).toEqual([]);
    expect(newDrafts(session, 'anon')).toEqual([]);
    expect(editor()).not.toHaveValue('someone else wrote this');
  });

  it('저장이 권한 만료로 실패한 뒤 같은 파일의 다른 초안을 불러오면, 다시 승인해도 그 저장을 이어서 하지 않는다', async () => {
    setup();
    google.addFile({ id: 'f1', name: 'A.py', content: 'a1' });
    saveDraft(storage, 'subA', 'f1@oldtab', { code: 'old draft B', baseVersion: '1', name: 'A.py' });
    await signIn();
    await openFile('A.py');
    fireEvent.change(editor(), { target: { value: 'A edit' } });
    fireEvent.click(screen.getByRole('button', { name: '만료 흉내' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByRole('button', { name: '다시 승인' });
    fireEvent.click(screen.getByRole('button', { name: '초안 불러오기' }));
    expect(editor()).toHaveValue('old draft B');
    fireEvent.click(screen.getByRole('button', { name: '다시 승인' }));
    await waitFor(() => expect(status()).toHaveTextContent('승인되었습니다'));
    expect(google.state.files.get('f1').content).toBe('a1');
    expect(fileDraftCodes('f1')).toEqual(['A edit', 'old draft B']);
  });

  it('초안 버리기는 확인을 받는다', async () => {
    setup();
    google.addFile({ id: 'f1', name: '공.py', content: 'v1' });
    saveDraft(storage, 'subA', 'f1@oldtab', { code: 'old work', baseVersion: '1', name: '공.py' });
    await signIn();
    await openFile('공.py');
    window.confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: '초안 버리기' }));
    expect(fileDraftCodes('f1')).toEqual(['old work']);
    fireEvent.click(screen.getByRole('button', { name: '초안 버리기' }));
    expect(fileDraftCodes('f1')).toEqual([]);
  });

  it('로그인 전 초안이 있으면 창을 닫을 때 경고하고, 없으면 경고하지 않는다', async () => {
    const leave = () => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; };
    setup({ seed: () => saveDraft(session, 'anon', 'new-earlier', { code: 'anon from before reload' }) });
    expect(editor()).toHaveValue('from vpython import *\n\nball = sphere(color=color.cyan)\n');
    await waitFor(() => expect(leave()).toBe(true));
    view.unmount();
    session = memoryStorage();
    view = render(<DriveLabApp storage={storage} sessionStore={session} />);
    expect(leave()).toBe(false);
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
