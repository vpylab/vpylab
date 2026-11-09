import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
