import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const recorder = vi.hoisted(() => ({ downloadRecording: vi.fn() }));
vi.mock('../../engine/video-recorder', () => recorder);

import VideoSaveDialog from './VideoSaveDialog';
import { useDriveStore } from '../../drive/driveSession';
import useAuthStore from '../../stores/authStore';

const video = { blob: new Blob([new Uint8Array(1024 * 1024)], { type: 'video/mp4' }), name: 'vpylab_1.mp4', seconds: 12 };
const original = { uploadVideo: useDriveStore.getState().uploadVideo, signIn: useDriveStore.getState().signIn, prepare: useDriveStore.getState().prepare, signOut: useDriveStore.getState().signOut };

beforeEach(() => {
  recorder.downloadRecording.mockClear();
  useDriveStore.setState({ account: { sub: 'a', email: 'a@school.example', name: '' }, videoUpload: null, ready: true, preparing: false, missingScope: false, error: null, busy: '', prepare: vi.fn(async () => true) });
});
afterEach(() => { cleanup(); useAuthStore.setState({ user: null }); useDriveStore.setState({ ...original, account: null, videoUpload: null, ready: false, missingScope: false, error: null }); });

describe('영상 저장 창', () => {
  it('길이와 크기를 보여 주고 내려받기는 이 컴퓨터에 저장한다', () => {
    const onClose = vi.fn();
    render(<VideoSaveDialog video={video} onClose={onClose} />);
    expect(screen.getByText(/12초, 1\.0MB/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('video-download'));
    expect(recorder.downloadRecording).toHaveBeenCalledWith(video.blob, 'vpylab_1.mp4');
    expect(screen.getByText('이 컴퓨터에 내려받았습니다.')).toBeTruthy();
  });

  it('드라이브에 저장하면 진행률을 보여 주고 끝나면 드라이브 링크를 준다', async () => {
    let finish;
    const uploadVideo = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    useDriveStore.setState({ uploadVideo });
    render(<VideoSaveDialog video={video} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('video-upload'));
    expect(uploadVideo).toHaveBeenCalledWith(video.blob, 'vpylab_1.mp4');
    useDriveStore.setState({ videoUpload: { sent: 512 * 1024, total: 1024 * 1024 } });
    await waitFor(() => expect(screen.getByTestId('video-upload-bar').style.width).toBe('50%'));
    expect(screen.getByTestId('video-download').disabled).toBe(true);
    useDriveStore.setState({ videoUpload: null });
    finish({ status: 'saved', file: { id: 'v1', webViewLink: 'https://drive.example/v1' } });
    const link = await screen.findByText('드라이브에서 열기');
    expect(link.getAttribute('href')).toBe('https://drive.example/v1');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(screen.queryByTestId('video-upload')).toBeNull();
  });

  it('실패하면 이유를 알리고 다시 저장할 수 있으며, 승인이 만료되면 다시 승인한 뒤 이어서 올린다', async () => {
    const uploadVideo = vi.fn().mockResolvedValueOnce({ status: 'error', reason: 'network' })
      .mockResolvedValueOnce({ status: 'error', reason: 'auth' })
      .mockResolvedValueOnce({ status: 'saved', file: { id: 'v1' } });
    const signIn = vi.fn().mockResolvedValue({ status: 'ok', switched: false });
    useDriveStore.setState({ uploadVideo, signIn });
    render(<VideoSaveDialog video={video} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('video-upload'));
    expect((await screen.findByRole('alert')).textContent).toContain('네트워크');
    fireEvent.click(screen.getByText('드라이브에 다시 저장'));
    fireEvent.click(await screen.findByTestId('video-reauth'));
    await waitFor(() => expect(uploadVideo).toHaveBeenCalledTimes(3));
    expect(signIn).toHaveBeenCalledWith({ again: true });
    expect(await screen.findByText(/영상 폴더에 저장했습니다/)).toBeTruthy();
  });

  it('드라이브를 연결하지 않았으면 연결 버튼을 보이고, 연결하면 저장 버튼으로 바뀌며 연결을 끊을 수 있다', async () => {
    const signIn = vi.fn(async () => { useDriveStore.setState({ account: { sub: 'a', email: 'a@school.example', name: '' } }); return { status: 'ok' }; });
    const signOut = vi.fn(async () => { useDriveStore.setState({ account: null }); });
    useDriveStore.setState({ account: null, signIn, signOut });
    render(<VideoSaveDialog video={video} onClose={() => {}} />);
    expect(useDriveStore.getState().prepare).toHaveBeenCalled();
    expect(screen.queryByTestId('video-upload')).toBeNull();
    expect(screen.getByTestId('video-download')).toBeTruthy();
    fireEvent.click(screen.getByTestId('video-drive-connect'));
    expect(signIn).toHaveBeenCalledOnce();
    expect(await screen.findByTestId('video-upload')).toBeTruthy();
    expect(screen.queryByTestId('video-drive-connect')).toBeNull();
    fireEvent.click(screen.getByTestId('video-drive-disconnect'));
    expect(await screen.findByTestId('video-drive-connect')).toBeTruthy();
  });

  it('수업용 판에 구글로 로그인했으면 그 계정을 승인 요청에 넘기고, GitHub 로그인이면 넘기지 않는다', () => {
    const signIn = vi.fn(async () => ({ status: 'error' }));
    useDriveStore.setState({ account: null, signIn });
    useAuthStore.setState({ user: { email: 'a@school.example', app_metadata: { provider: 'google' } } });
    const view = render(<VideoSaveDialog video={video} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('video-drive-connect'));
    expect(signIn).toHaveBeenLastCalledWith({ hint: 'a@school.example' });
    view.unmount();
    useAuthStore.setState({ user: { email: 'a@x.example', app_metadata: { provider: 'github' } } });
    render(<VideoSaveDialog video={video} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('video-drive-connect'));
    expect(signIn).toHaveBeenLastCalledWith(undefined);
  });

  it('구글 로그인 준비가 끝나기 전에는 연결 버튼을 누를 수 없고, 준비에 실패하면 이유를 알리며 내려받기는 남긴다', () => {
    useDriveStore.setState({ account: null, ready: false, preparing: true });
    const view = render(<VideoSaveDialog video={video} onClose={() => {}} />);
    expect(screen.getByTestId('video-drive-connect').disabled).toBe(true);
    view.unmount();
    useDriveStore.setState({ account: null, ready: false, preparing: false, error: { reason: 'gis' } });
    render(<VideoSaveDialog video={video} onClose={() => {}} />);
    expect(screen.queryByTestId('video-drive-connect')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('구글 로그인 스크립트');
    expect(screen.getByTestId('video-download').disabled).toBe(false);
  });

  it('드라이브 권한을 체크하지 않고 승인했으면 저장 대신 권한 다시 요청을 보인다', () => {
    const signIn = vi.fn(async () => ({ status: 'ok' }));
    useDriveStore.setState({ missingScope: true, signIn });
    render(<VideoSaveDialog video={video} onClose={() => {}} />);
    expect(screen.queryByTestId('video-upload')).toBeNull();
    fireEvent.click(screen.getByText('드라이브 권한 다시 요청'));
    expect(signIn).toHaveBeenCalledWith({ again: true, consent: true });
  });
});
