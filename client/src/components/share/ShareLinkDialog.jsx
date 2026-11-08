import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../i18n/useI18n';
import { copyEmbedCode } from '../../utils/embed';
import QRCodeModal from './QRCodeModal';

/**
 * 공유 링크를 만든 직후 보여 주는 작은 대화상자.
 * 링크 복사·QR 보기·임베드 코드 복사·새 탭 열기를 한곳에 둡니다.
 */
export default function ShareLinkDialog({ url, shareId, title, onClose }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState('');
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !showQr) onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, showQr]);

  const flash = (key) => { setCopied(key); setTimeout(() => setCopied(''), 1400); };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); flash('link'); } catch { /* 주소가 화면에 있음 */ }
  };
  const copyEmbed = async () => {
    if (await copyEmbedCode(shareId)) flash('embed');
  };

  const buttonStyle = { fontSize: 13 };

  return createPortal(
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
      onClick={onClose}
      role="presentation"
      data-testid="share-dialog"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('shareLink.title')}
        className="rounded-2xl w-full flex flex-col gap-3"
        style={{ maxWidth: 480, backgroundColor: 'var(--color-bg-panel)', color: 'var(--color-text-primary)', padding: 20, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl, 0 24px 48px rgba(0,0,0,0.25))' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-base font-semibold">🔗 {t('shareLink.title')}</h2>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-md cursor-pointer border-none" style={{ backgroundColor: 'transparent', color: 'var(--color-text-muted)' }} aria-label={t('qr.close')}>✕</button>
        </div>
        <p className="m-0 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('shareLink.created')}</p>
        <input
          readOnly
          value={url}
          onFocus={(event) => event.target.select()}
          className="w-full text-sm px-3 py-2 rounded-md"
          style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono, monospace)' }}
          aria-label={t('shareLink.title')}
          data-testid="share-url"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copyLink} className="toolbar-btn" style={buttonStyle}>
            {copied === 'link' ? `✓ ${t('qr.copied')}` : `📋 ${t('qr.copyLink')}`}
          </button>
          <button type="button" onClick={() => setShowQr(true)} className="toolbar-btn" style={buttonStyle} data-testid="share-show-qr">
            ▦ {t('qr.show')}
          </button>
          {shareId && (
            <button type="button" onClick={copyEmbed} className="toolbar-btn" style={buttonStyle} data-testid="share-copy-embed">
              {copied === 'embed' ? `✓ ${t('qr.copied')}` : `<> ${t('embed.copyEmbed')}`}
            </button>
          )}
          <a href={url} target="_blank" rel="noopener noreferrer" className="toolbar-btn no-underline" style={buttonStyle}>
            ↗ {t('shareLink.open')}
          </a>
        </div>
      </div>
      {showQr && <QRCodeModal url={url} title={title} onClose={() => setShowQr(false)} />}
    </div>,
    document.body,
  );
}
