import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../i18n/useI18n';
import { useUiText } from '../../i18n/ui-text';
import { SHARE_NAMES } from '../../lib/api-base';
import { copyEmbedCode } from '../../utils/embed';
import { claimShareName } from '../../utils/share';
import QRCodeModal from './QRCodeModal';

/**
 * 공유 링크를 만든 직후 보여 주는 작은 대화상자.
 * 링크 복사·QR 보기·임베드 코드 복사·새 탭 열기를 한곳에 둡니다.
 * 오픈소스 판(SHARE_NAMES)은 무작위 주소 대신 쓸 짧은 이름을 정할 수 있습니다(/s/<이름>).
 */
// 이름 칸 문구: docs/reference/solar/short-share-261109-solar.md (블록 2~12)
export default function ShareLinkDialog({ url: initialUrl, shareId: initialShareId, title, code, onClose }) {
  const { t } = useI18n();
  const ui = useUiText();
  const [copied, setCopied] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [link, setLink] = useState({ url: initialUrl, shareId: initialShareId });
  const [name, setName] = useState('');
  const [naming, setNaming] = useState({ busy: false, message: '', error: '' });
  const url = link.url;
  const shareId = link.shareId;
  const canName = SHARE_NAMES && typeof code === 'string';

  const nameErrors = {
    name_invalid: ui("이름이 규칙에 맞지 않습니다. 이름은 영어 소문자, 숫자, 하이픈(-)으로 3~30자여야 하며, 하이픈으로 시작하거나 끝날 수 없습니다."),
    name_reserved: ui("이 이름은 사용할 수 없습니다. 다른 이름을 정하십시오."),
    name_blocked: ui("이 이름은 사용할 수 없습니다. 다른 이름을 정하십시오."),
    name_taken: ui("이미 다른 사람이 사용하는 이름입니다. 다른 이름을 정하십시오."),
    rate_limited: ui("같은 곳에서 공유 링크를 너무 많이 만들었습니다. 1분 뒤에 다시 시도하십시오."),
    code_too_large: ui("코드가 너무 깁니다(50KB 초과)."),
  };

  const submitName = async (event) => {
    event.preventDefault();
    if (naming.busy) return;
    setNaming({ busy: true, message: '', error: '' });
    const result = await claimShareName(code, title, name);
    if (!result.url) {
      setNaming({ busy: false, message: '', error: nameErrors[result.errorCode] || ui("이름을 정하지 못했습니다. 잠시 뒤 다시 시도하십시오.") });
      return;
    }
    setLink({ url: result.url, shareId: result.id });
    let copiedNow = false;
    try { await navigator.clipboard.writeText(result.url); copiedNow = true; } catch { /* 주소가 화면에 있음 */ }
    const message = result.updated
      ? ui("이 브라우저에서 만든 이름이어서 그 주소의 내용을 지금 코드로 바꿨습니다.")
      : ui("이름을 정했습니다.");
    setNaming({ busy: false, message: copiedNow ? `${message} ${ui("주소를 클립보드에 복사했습니다.")}` : message, error: '' });
  };

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
        {canName && (
          <form onSubmit={submitName} className="flex flex-col gap-2 pt-3" style={{ borderTop: '1px solid var(--color-border)' }} data-testid="share-name-form">
            <label htmlFor="share-name-input" className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {ui("짧은 이름 정하기(선택 사항)")}
            </label>
            <div className="flex items-stretch gap-2">
              <div className="flex items-center flex-1 min-w-0 rounded-md" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
                <span className="pl-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
                  /s/
                </span>
                <input
                  id="share-name-input"
                  value={name}
                  onChange={(event) => setName(event.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="my-project"
                  maxLength={30}
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1 min-w-0 text-sm py-2 pr-3 bg-transparent border-none outline-none"
                  style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono, monospace)' }}
                  data-testid="share-name-input"
                />
              </div>
              <button type="submit" className="toolbar-btn" style={buttonStyle} disabled={naming.busy || name.trim().length < 3} data-testid="share-name-submit">
                {naming.busy ? ui("만드는 중…") : ui("이 이름으로 만들기")}
              </button>
            </div>
            <p className="m-0 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {ui("이름은 영어 소문자, 숫자, 하이픈(-)으로 3~30자까지 정할 수 있습니다. 하이픈으로 시작하거나 끝날 수 없으며, 먼저 정한 사람이 그 이름을 사용합니다.")}
            </p>
            {naming.error && <p className="m-0 text-xs" role="alert" style={{ color: 'var(--color-error-text)' }} data-testid="share-name-error">{naming.error}</p>}
            {naming.message && <p className="m-0 text-xs" role="status" style={{ color: 'var(--color-success-text)' }} data-testid="share-name-message">{naming.message}</p>}
          </form>
        )}
      </div>
      {showQr && <QRCodeModal url={url} title={title} onClose={() => setShowQr(false)} />}
    </div>,
    document.body,
  );
}
