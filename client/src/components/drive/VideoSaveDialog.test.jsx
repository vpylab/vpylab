import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const recorder = vi.hoisted(() => ({ downloadRecording: vi.fn() }));
vi.mock('../../engine/video-recorder', () => recorder);

import VideoSaveDialog from './VideoSaveDialog';
import { useDriveStore } from '../../drive/driveSession';

const video = { blob: new Blob([new Uint8Array(1024 * 1024)], { type: 'video/mp4' }), name: 'vpylab_1.mp4', seconds: 12 };
const original = { uploadVideo: useDriveStore.getState().uploadVideo, signIn: useDriveStore.getState().signIn };

beforeEach(() => {
  recorder.downloadRecording.mockClear();
  useDriveStore.setState({ account: { sub: 'a', email: 'a@school.example', name: '' }, videoUpload: null });
});
afterEach(() => { cleanup(); useDriveStore.setState({ ...original, account: null, videoUpload: null }); });

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

  it('드라이브를 연결하지 않았으면 드라이브 저장 버튼을 보이지 않는다', () => {
    useDriveStore.setState({ account: null });
    render(<VideoSaveDialog video={video} onClose={() => {}} />);
    expect(screen.queryByTestId('video-upload')).toBeNull();
    expect(screen.getByTestId('video-download')).toBeTruthy();
  });
});
