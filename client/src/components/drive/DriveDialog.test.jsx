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

  it('권한이 만료되면 다시 승인 버튼을 보이고, 승인 뒤 저장을 이어 간다', async () => {
    const store = useDriveStore.getState;
    await store().prepare();
    await store().signIn();
    await store().save('v1', { name: '만료.py' });
    google.state.tokens.clear();
    await store().save('v2');
    const onSaved = vi.fn();
    render(<DriveDialog mode="save" getCode={() => 'v2'} onSaved={onSaved} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('drive-reauth'));
    await waitFor(() => expect(store().needsReauth).toBe(false));
    // 대화상자를 연 원인(저장)이 대화상자 밖에서 시작됐으므로, 다시 저장 버튼으로 이어 갑니다.
    expect((await store().save('v2')).status).toBe('saved');
  });
});
