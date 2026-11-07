import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { useI18n } from '../../i18n/useI18n';

/** 파일 이름에 쓸 수 있게 제목을 다듬습니다. */
function fileSafe(title) {
  const base = String(title || 'vpylab').replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return base || 'vpylab';
}

/**
 * 공유 링크를 큰 QR로 보여 주는 모달. 프로젝터에 띄우면 학생이 휴대폰 카메라로 바로 엽니다.
 * QR은 qrcode(MIT) 라이브러리로 브라우저에서 만들고 외부 이미지 API는 쓰지 않습니다.
 */
export default function QRCodeModal({ url, title, onClose }) {
  const { t } = useI18n();
  const [dataUrl, setDataUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#111827', light: '#FFFFFF' } })
      .then((data) => { if (alive) setDataUrl(data); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [url]);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* 클립보드 권한 없음 — 주소가 화면에 있으니 손으로 복사 가능 */ }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
      onClick={onClose}
      role="presentation"
      data-testid="qr-modal"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('qr.title')}
        className="rounded-2xl flex flex-col items-center gap-3 w-full"
        style={{
          backgroundColor: '#FFFFFF', color: '#111827', padding: '24px 24px 20px',
          maxWidth: 'min(92vw, calc(100vh - 160px), 720px)', boxShadow: 'var(--shadow-xl, 0 24px 48px rgba(0,0,0,0.3))',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="m-0 text-base font-semibold truncate w-full text-center">{title || t('qr.title')}</h2>
        {failed ? (
          <p className="text-sm" style={{ color: '#EF4444' }}>{t('qr.failed')}</p>
        ) : (
          <img
            src={dataUrl || undefined}
            alt={`QR: ${url}`}
            className="w-full"
            style={{ aspectRatio: '1 / 1', maxHeight: 'calc(100vh - 260px)', objectFit: 'contain', imageRendering: 'pixelated' }}
            data-testid="qr-image"
          />
        )}
        <code className="text-xs break-all text-center" style={{ color: '#6B7280', fontFamily: 'var(--font-mono, monospace)' }} data-testid="qr-url">{url}</code>
        <p className="m-0 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>{t('qr.hint')}</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <button type="button" onClick={copyLink} className="toolbar-btn" style={{ color: '#111827', background: '#F3F4F6', borderColor: '#E5E7EB' }}>
            {copied ? `✓ ${t('qr.copied')}` : t('qr.copyLink')}
          </button>
          <a
            href={dataUrl || undefined}
            download={`${fileSafe(title)}-qr.png`}
            className="toolbar-btn no-underline"
            style={{ color: '#111827', background: '#F3F4F6', borderColor: '#E5E7EB', pointerEvents: dataUrl ? 'auto' : 'none', opacity: dataUrl ? 1 : 0.5 }}
            data-testid="qr-download"
          >
            {t('qr.download')}
          </a>
          <button type="button" onClick={onClose} className="toolbar-btn" style={{ color: '#FFFFFF', background: '#2563EB', borderColor: '#2563EB' }}>
            {t('qr.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
