import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUiText } from '../../i18n/ui-text';
import { DRIVE_REASON_TEXT, useDriveStore } from '../../drive/driveSession';
import { downloadRecording } from '../../engine/video-recorder';

const megabytes = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

/**
 * 녹화한 작품 영상을 어디에 저장할지 고르는 창(구글 드라이브를 연결한 경우에만 열립니다).
 *   - 내려받기: 이 컴퓨터에 파일로 저장
 *   - 드라이브에 저장: 내 구글 드라이브의 VPyLab/영상 폴더에 이어 올리기
 * @param {{ video: { blob: Blob, name: string, seconds: number }, onClose: () => void }} props
 */
export default function VideoSaveDialog({ video, onClose }) {
  const ui = useUiText();
  const account = useDriveStore((state) => state.account);
  const progress = useDriveStore((state) => state.videoUpload);
  const [saved, setSaved] = useState(null); // 드라이브에 올린 파일
  const [failure, setFailure] = useState(''); // 실패 이유(DRIVE_REASON_TEXT의 키)
  const [downloaded, setDownloaded] = useState(false);
  const uploading = Boolean(progress);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !uploading) onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [uploading, onClose]);

  async function upload() {
    setFailure('');
    const result = await useDriveStore.getState().uploadVideo(video.blob, video.name);
    if (result.status === 'saved') setSaved(result.file);
    else if (result.status === 'error') setFailure(result.reason);
  }

  // 구글 승인이 만료된 경우: 클릭 처리 안에서 다시 승인한 뒤 이어서 올립니다.
  async function approveAndUpload() {
    const result = await useDriveStore.getState().signIn({ again: true });
    if (result?.status === 'ok' && !result.switched) await upload();
  }

  function download() {
    downloadRecording(video.blob, video.name);
    setDownloaded(true);
  }

  const button = 'toolbar-btn';
  const primary = { backgroundColor: 'var(--color-accent)', color: 'var(--color-text-on-accent, #fff)', borderColor: 'var(--color-accent)' };
  const percent = progress?.total ? Math.round((progress.sent / progress.total) * 100) : 0;

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }} onClick={() => !uploading && onClose?.()} role="presentation" data-testid="video-save-dialog">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ui("영상 저장")}
        className="rounded-2xl w-full flex flex-col gap-3"
        style={{ maxWidth: 440, backgroundColor: 'var(--color-bg-panel)', color: 'var(--color-text-primary)', padding: 20, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl, 0 24px 48px rgba(0,0,0,0.25))' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-base font-semibold">{ui("영상 저장")}</h2>
          <button type="button" onClick={onClose} disabled={uploading} className="w-7 h-7 rounded-md cursor-pointer border-none" style={{ backgroundColor: 'transparent', color: 'var(--color-text-muted)' }} aria-label={ui("닫기")}>✕</button>
        </div>
        <p className="m-0 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {ui`녹화한 영상은 ${video.seconds}초, ${megabytes(video.blob.size)}MB입니다. 이 창을 닫으면 영상은 사라집니다.`}
        </p>
        {account && <p className="m-0 text-xs" style={{ color: 'var(--color-text-muted)' }}>{ui`드라이브 계정: ${account.email}`}</p>}

        {uploading && (
          <div role="status" aria-live="polite">
            <p className="m-0 mb-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{ui`드라이브에 올리는 중입니다. ${percent}%`}</p>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
              <div className="h-full" style={{ width: `${percent}%`, backgroundColor: 'var(--color-accent)', transition: 'width 200ms' }} data-testid="video-upload-bar" />
            </div>
          </div>
        )}
        {saved && (
          <p className="m-0 text-sm" role="status">
            {ui("내 구글 드라이브의 VPyLab 폴더 안 영상 폴더에 저장했습니다.")}{' '}
            {saved.webViewLink && <a href={saved.webViewLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>{ui("드라이브에서 열기")}</a>}
          </p>
        )}
        {failure && failure !== 'auth' && <p className="m-0 text-sm" role="alert" style={{ color: 'var(--color-error)' }}>{ui(DRIVE_REASON_TEXT[failure] || DRIVE_REASON_TEXT.unknown)}</p>}
        {failure === 'auth' && <p className="m-0 text-sm" role="alert" style={{ color: 'var(--color-error)' }}>{ui("구글 승인이 만료되었습니다. 다시 승인하면 이어서 저장합니다.")}</p>}
        {downloaded && <p className="m-0 text-xs" role="status" style={{ color: 'var(--color-text-secondary)' }}>{ui("이 컴퓨터에 내려받았습니다.")}</p>}

        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" className={button} disabled={uploading} onClick={download} data-testid="video-download">{ui("내려받기")}</button>
          {account && !saved && failure !== 'auth' && (
            <button type="button" className={button} style={primary} disabled={uploading} onClick={upload} data-testid="video-upload">
              {failure ? ui("드라이브에 다시 저장") : ui("드라이브에 저장")}
            </button>
          )}
          {failure === 'auth' && (
            <button type="button" className={button} style={primary} disabled={uploading} onClick={approveAndUpload} data-testid="video-reauth">{ui("다시 승인")}</button>
          )}
          {(saved || downloaded) && <button type="button" className={button} disabled={uploading} onClick={onClose}>{ui("닫기")}</button>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
