import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeGoogle, memoryStorage } from '../../drive-lab/fake-google.js';
import { configureDrive, useDriveStore } from '../../drive/driveSession.js';
import DriveDialog from './DriveDialog.jsx';

let google;
beforeEach(() => {
  google = createFakeGoogle();
  configureDrive({ clientId: 'test-client', gis: google.gis, fetchImpl: google.fetchImpl, storage: memoryStorage() });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('DriveDialog', () => {
  it('저장: 로그인 → 파일 이름 → 드라이브에 저장하면 onSaved를 부른다', async () => {
    const onSaved = vi.fn();
    render(<DriveDialog mode="save" getCode={() => 'sphere()'} defaultName="공 튀기기" onSaved={onSaved} onClose={() => {}} />);
    fireEvent.click(await screen.findByTestId('drive-sign-in'));
    await waitFor(() => expect(screen.getByTestId('drive-account')).toHaveTextContent('a@school.example'));
    const nameInput = await screen.findByTestId('drive-file-name');
    expect(nameInput).toHaveValue('공 튀기기');
    fireEvent.click(screen.getByTestId('drive-save-new'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ status: 'created' })));
    const saved = [...google.state.files.values()].find((f) => f.name === '공 튀기기.py');
    expect(saved.content).toBe('sphere()');
  });

  it('열기: 목록에서 고른 파일의 내용을 onLoaded로 넘긴다', async () => {
    google.addFile({ id: 'f-old', name: '태양계.py', content: 'sun = sphere()' });
    const onLoaded = vi.fn();
    render(<DriveDialog mode="files" getCode={() => ''} onLoaded={onLoaded} isDirty={() => false} onClose={() => {}} />);
    fireEvent.click(await screen.findByTestId('drive-sign-in'));
    fireEvent.click(await screen.findByRole('button', { name: /태양계\.py/ }));
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith('sun = sphere()', '태양계.py'));
  });

  it('충돌이 나면 세 가지 선택을 보이고, 드라이브 내용 불러오기는 그 코드를 넘긴다', async () => {
    const store = useDriveStore.getState;
    await store().prepare();
    await store().signIn();
    await store().save('v1', { name: '충돌.py' });
    google.remoteSave(store().file.id, 'other device');
    await store().save('mine');
    const onLoaded = vi.fn();
    render(<DriveDialog mode="save" getCode={() => 'mine'} onLoaded={onLoaded} onClose={() => {}} />);
    expect(screen.getByTestId('drive-conflict-copy')).toBeInTheDocument();
    expect(screen.getByTestId('drive-conflict-overwrite')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('drive-conflict-remote'));
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith('other device', '충돌.py'));
  });

  it('빠른 저장이 만료로 막혀 창이 열리면, 다시 승인한 뒤 그 저장을 이어서 한다 (3-way #5)', async () => {
    const store = useDriveStore.getState;
    await store().prepare();
    await store().signIn();
    await store().save('v1', { name: '만료.py' });
    const id = store().file.id;
    google.state.tokens.clear();
    await store().save('v2');
    const onSaved = vi.fn();
    render(<DriveDialog mode="save" getCode={() => 'v2'} isDirty={() => true} onSaved={onSaved} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('drive-reauth'));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(google.state.files.get(id).content).toBe('v2');
  });

  it('저장하지 않은 변경이 있으면 "저장했습니다" 대신 저장 버튼을 보인다 (3-way #5)', async () => {
    const store = useDriveStore.getState;
    await store().prepare();
    await store().signIn();
    await store().save('v1', { name: '표시.py' });
    render(<DriveDialog mode="save" getCode={() => 'changed'} isDirty={() => true} onClose={() => {}} />);
    expect(screen.getByTestId('drive-save-existing')).toBeInTheDocument();
    expect(screen.queryByText(/에 저장했습니다/)).toBeNull();
  });

  it('다시 승인에서 다른 계정이 들어오면 하려던 저장을 새 계정에 하지 않는다 (3-way #8)', async () => {
    google = createFakeGoogle({ accounts: [{ sub: 'subA', email: 'a@school.example' }, { sub: 'subB', email: 'b@school.example' }] });
    configureDrive({ clientId: 'test-client', gis: google.gis, fetchImpl: google.fetchImpl, storage: memoryStorage() });
    const store = useDriveStore.getState;
    await store().prepare();
    await store().signIn();
    await store().save('A code', { name: 'A.py' });
    google.state.tokens.clear();
    await store().save('A code 2');
    const onSaved = vi.fn();
    render(<DriveDialog mode="save" getCode={() => 'A code 2'} isDirty={() => true} onSaved={onSaved} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('drive-reauth'));
    await waitFor(() => expect(store().account.email).toBe('b@school.example'));
    await new Promise((r) => setTimeout(r, 50));
    expect(onSaved).not.toHaveBeenCalled();
    expect([...google.state.files.values()].some((f) => f.owner === 'subB' && !f.folder)).toBe(false);
  });

  it('파일을 찾을 수 없으면(지워짐·권한 사라짐) "새 파일로 저장" 버튼을 보인다 (아르곤 안정성 점검)', async () => {
    useDriveStore.setState({ error: { reason: 'notFound', detail: '404' } });
    render(<DriveDialog mode="save" getCode={() => 'sphere()'} onClose={() => {}} />);
    expect(await screen.findByRole('button', { name: '새 파일로 저장' })).toBeInTheDocument();
  });
});

describe('DriveDialog: 그 자리 안내', () => {
  beforeEach(() => { localStorage.clear(); });
  const store = useDriveStore.getState;
  const POPUP_BLOCKED = '승인 창을 열지 못했습니다. 브라우저의 팝업 차단을 해제하세요.';

  it('로그인 전: 버튼 아래에 누르면 일어나는 일 세 단계를 펼쳐 보이고, 로그인에 성공하면 다음부터 접어 둔다', async () => {
    const first = render(<DriveDialog mode="save" getCode={() => 'sphere()'} onClose={() => {}} />);
    const signIn = await screen.findByTestId('drive-sign-in');
    const toggle = await screen.findByRole('button', { name: '버튼을 누르면 일어나는 일' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const help = first.baseElement.querySelector('[data-help="drive-signin"]');
    expect(signIn.compareDocumentPosition(help) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const steps = help.querySelectorAll('ol.vh-steps > li');
    expect(steps).toHaveLength(3);
    expect(steps[1]).toHaveTextContent('"Google Drive 파일"이 적힌 줄의 체크 상자는 처음에 비어 있습니다. 직접 눌러 체크합니다.');
    expect(within(help).getByRole('button', { name: '그림으로 보기' })).toHaveAttribute('aria-expanded', 'false');
    expect(within(help).getByRole('button', { name: '창이 열리지 않을 때' })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(within(help).getByRole('button', { name: '그림으로 보기' }));
    expect(help.querySelector('[data-sketch="google-consent"]')).not.toBeNull();

    fireEvent.click(signIn);
    await waitFor(() => expect(screen.getByTestId('drive-account')).toHaveTextContent('a@school.example'));
    expect(first.baseElement.querySelector('[data-help="drive-signin"]')).toBeNull();
    await act(async () => { await store().signOut(); });
    first.unmount();
    render(<DriveDialog mode="save" getCode={() => 'sphere()'} onClose={() => {}} />);
    expect(await screen.findByRole('button', { name: '버튼을 누르면 일어나는 일' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('승인 창을 기다리는 동안: 지금 열린 구글 창에서 할 일을 그림과 함께 보인다', async () => {
    const { baseElement } = render(<DriveDialog mode="save" getCode={() => 'sphere()'} onClose={() => {}} />);
    await screen.findByTestId('drive-sign-in');
    act(() => { useDriveStore.setState({ busy: 'signin' }); });
    expect(screen.getByTestId('drive-sign-in')).toHaveTextContent('승인 창을 확인하십시오…');
    expect(await screen.findByText('지금 열린 구글 창에서 할 일')).toBeInTheDocument();
    expect(baseElement.querySelector('[data-sketch="google-account"]')).not.toBeNull();
    expect(baseElement.querySelector('[data-sketch="google-consent"]')).not.toBeNull();
  });

  it('브라우저가 구글 창을 막으면: 팝업을 허용하는 순서를 펼쳐 보인다', async () => {
    const { baseElement } = render(<DriveDialog mode="save" getCode={() => 'sphere()'} onClose={() => {}} />);
    await screen.findByTestId('drive-sign-in');
    act(() => { useDriveStore.setState({ error: { reason: 'auth', detail: POPUP_BLOCKED } }); });
    expect(screen.getByTestId('drive-error')).toHaveTextContent('팝업 차단을 해제');
    expect(await screen.findByRole('button', { name: '창이 열리지 않을 때' })).toHaveAttribute('aria-expanded', 'true');
    expect(baseElement.querySelector('[data-sketch="popup-blocked"]')).not.toBeNull();
    expect(screen.getByText('VPyLab 화면으로 돌아와 방금 누른 버튼을 다시 누릅니다.')).toBeInTheDocument();
  });

  it('드라이브 권한이 빠지면: 체크 상자의 위치를 그림으로 바로 보인다', async () => {
    await store().prepare();
    await store().signIn();
    useDriveStore.setState({ missingScope: true, error: { reason: 'scope' } });
    const { baseElement } = render(<DriveDialog mode="save" getCode={() => 'sphere()'} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: '드라이브 권한 다시 요청' })).toBeInTheDocument();
    expect(await screen.findByText('"Google Drive 파일"이 적힌 줄의 빈 체크 상자를 눌러 체크합니다.')).toBeInTheDocument();
    const picture = within(baseElement.querySelector('[data-sketch="google-consent"]')).getByRole('img');
    expect(picture).toHaveTextContent('여기를 체크합니다');
  });

  it('다시 승인: 고장이 아니라는 점과 같은 계정을 골라야 한다는 점을 알린다', async () => {
    await store().prepare();
    await store().signIn();
    await store().save('v1', { name: '만료.py' });
    google.state.tokens.clear();
    await store().save('v2');
    render(<DriveDialog mode="save" getCode={() => 'v2'} isDirty={() => true} onClose={() => {}} />);
    expect(screen.getByTestId('drive-reauth')).toBeInTheDocument();
    expect(await screen.findByText(/고장이 아니야/)).toBeInTheDocument();
    expect(screen.getByText(/구글 창이 잠깐 열렸다가 스스로 닫힙니다/)).toBeInTheDocument();
    expect(screen.getByText(/다른 계정을 고르면 저장하지 않습니다/)).toBeInTheDocument();
    // 다시 승인할 때 창이 막히면 해결 방법을 펼칩니다(이 상태에서는 오류 문구가 따로 보이지 않습니다).
    expect(screen.getByRole('button', { name: '창이 열리지 않을 때' })).toHaveAttribute('aria-expanded', 'false');
    act(() => { useDriveStore.setState({ error: { reason: 'auth', detail: POPUP_BLOCKED } }); });
    await waitFor(() => expect(screen.getByRole('button', { name: '창이 열리지 않을 때' })).toHaveAttribute('aria-expanded', 'true'));
  });

  it('충돌: 세 버튼 아래에 고르면 일어나는 일을 버튼마다 보인다', async () => {
    await store().prepare();
    await store().signIn();
    await store().save('v1', { name: '충돌.py' });
    google.remoteSave(store().file.id, 'other device');
    await store().save('mine');
    const { baseElement } = render(<DriveDialog mode="save" getCode={() => 'mine'} onClose={() => {}} />);
    expect(await screen.findByRole('button', { name: '세 선택지의 차이' })).toHaveAttribute('aria-expanded', 'true');
    const help = baseElement.querySelector('[data-help="drive-conflict"]');
    expect([...help.querySelectorAll('.vh-choice dt')].map((term) => term.textContent)).toEqual(
      ['drive-conflict-copy', 'drive-conflict-remote', 'drive-conflict-overwrite'].map((id) => screen.getByTestId(id).textContent),
    );
    expect(help).toHaveTextContent('어느 쪽이 맞는지 모르겠으면 사본으로 저장하면 돼.');
  });

  it('내 드라이브: 공용 컴퓨터 정리 순서를 접어서 두고, 저장을 사용할 수 없으면 파일로 보관하는 방법을 알린다', async () => {
    render(<DriveDialog mode="files" getCode={() => ''} isDirty={() => false} onClose={() => {}} />);
    fireEvent.click(await screen.findByTestId('drive-sign-in'));
    const leaving = await screen.findByRole('button', { name: '공용 컴퓨터 사용을 마칠 때' });
    expect(leaving).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(leaving);
    expect(screen.getByText(/"로그아웃"을 누르고, 이 브라우저에 남은 초안도 지울지 묻는 창이 나오면 "확인"을 누릅니다/)).toBeInTheDocument();
    act(() => { useDriveStore.setState({ error: { reason: 'policy' } }); });
    const keep = await screen.findByRole('button', { name: '구글 로그인 없이 코드를 보관하는 방법' });
    fireEvent.click(keep);
    expect(screen.getByText(/"HTML 내려받기"를 누르면 작품이 파일로 컴퓨터에 저장됩니다/)).toBeInTheDocument();
  });
});

