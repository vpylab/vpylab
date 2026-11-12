import { useUiText } from "../../i18n/ui-text";
import { useI18n } from '../../i18n/useI18n';
import useAuthStore from '../../stores/authStore';
import useAppStore from '../../stores/appStore';
import { BrandMark } from '../shared/BrandLogo';
import { DRIVE_SAVE, OPEN_EDITION } from '../../lib/api-base.js';

/**
 * 오픈소스 판에는 운영 서버 로그인이 없습니다. 코드는 학생 본인의 구글 드라이브에 저장할 예정이며(docs/GOOGLE_FIRST_PLAN.md 2단계),
 * 그 전까지는 지금 쓸 수 있는 방법을 안내합니다.
 */
function OpenEditionSaveNotice({ ko, onClose }) {
  return (
    <>
      <h2 id="auth-dialog-title" className="auth-title">{ko ? '저장 기능 준비 중' : 'Saving is coming soon'}</h2>
      <p className="auth-desc">
        {ko
          ? '오픈소스 VPyLab은 코드를 운영 서버가 아닌 학생 본인의 구글 드라이브에 저장합니다. 편집기 저장은 준비 중입니다. 지금은 "도구" 메뉴의 "HTML 내려받기"로 작품을 저장하세요.'
          : 'Open-source VPyLab saves code to each student\'s own Google Drive, not to our servers. Saving from the editor is coming soon. For now, use "Download HTML" in the Tools menu.'}
      </p>
      <div className="auth-buttons">
        <a className="auth-btn auth-btn-google" href="/drive-lab" target="_blank" rel="noopener">{ko ? '드라이브 저장 실험 열기' : 'Try Drive saving (lab)'}</a>
        <button className="auth-btn auth-btn-github" onClick={onClose}>{ko ? '닫기' : 'Close'}</button>
      </div>
    </>
  );
}

export default function AuthModal() {
  const ui = useUiText();
  const theme = useAppStore((state) => state.theme);
  const locale = useAppStore((state) => state.locale);
  const { authModalOpen, setAuthModalOpen, signInWithGoogle, signInWithGitHub, githubAuthError } = useAuthStore();
  const { t } = useI18n();

  if (!authModalOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={() => setAuthModalOpen(false)}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title" onClick={(e) => e.stopPropagation()}>
        {/* 닫기 */}
        <button className="auth-close" onClick={() => setAuthModalOpen(false)} aria-label={ui("닫기")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* 로고 + 타이틀 */}
        <div className="auth-logo">
          <BrandMark size={44} inverse={theme === 'deep-dark'} />
        </div>

        {OPEN_EDITION ? <OpenEditionSaveNotice ko={locale === 'ko'} onClose={() => setAuthModalOpen(false)} /> : <>
        <h2 id="auth-dialog-title" className="auth-title">{DRIVE_SAVE ? ui("팀 프로젝트 로그인") : <>VPyLab {t('auth.login')}</>}</h2>
        {/* 개인 코드를 구글 드라이브에 저장하는 배포: 로그인은 팀 프로젝트(GitHub)와 갤러리·교사 기능에만 필요합니다. */}
        <p className="auth-desc">{DRIVE_SAVE
          ? ui("코드 실행과 내 작품 저장에는 로그인이 필요 없습니다. 내 작품은 만들기 화면의 \"저장\"으로 구글 드라이브에 저장됩니다. 팀 프로젝트는 GitHub 계정으로 로그인해 사용합니다.")
          : t('auth.loginDescription')}</p>
        {githubAuthError && <p role="alert" className="auth-desc">{ui(githubAuthError)}</p>}

        {/* 소셜 버튼 */}
        <div className="auth-buttons">
          {!DRIVE_SAVE && <button onClick={signInWithGoogle} className="auth-btn auth-btn-google">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            {t('auth.googleLogin')}
          </button>}

          <button onClick={signInWithGitHub} className="auth-btn auth-btn-github">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            {t('auth.githubLogin')}
          </button>
        </div>

        {/* 안내 */}
        {DRIVE_SAVE
          ? <p className="auth-notice">{ui("교사 계정은 구글 계정으로 로그인합니다.")} <button type="button" onClick={signInWithGoogle} className="underline cursor-pointer border-none bg-transparent p-0" style={{ color: 'inherit', font: 'inherit' }}>{t('auth.googleLogin')}</button></p>
          : <p className="auth-notice">{t('auth.notice')}</p>}
        </>}
      </div>

      <style>{`
        .auth-modal-overlay {
          position: fixed; inset: 0; z-index: 100;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          background: rgba(0,0,0,0.35);
          backdrop-filter: blur(4px);
          animation: authFadeIn 0.2s ease;
        }
        @keyframes authFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes authSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .auth-modal {
          position: relative;
          width: 100%; max-width: 380px;
          border-radius: var(--radius-xl);
          padding: 32px 28px 24px;
          background: var(--color-bg-panel);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-xl);
          animation: authSlideUp 0.2s ease;
          font-family: var(--font-body);
        }

        .auth-close {
          position: absolute; top: 14px; right: 14px;
          background: none; border: none; cursor: pointer;
          color: var(--color-text-muted);
          padding: 6px; border-radius: var(--radius-sm);
          transition: all 0.15s;
        }
        .auth-close:hover {
          background: var(--color-bg-secondary);
          color: var(--color-text-primary);
        }

        .auth-logo { margin-bottom: 14px; }

        .auth-title {
          margin: 0 0 6px; font-size: 20px; font-weight: 700;
          font-family: var(--font-display);
          color: var(--color-text-primary);
        }

        .auth-desc {
          margin: 0 0 16px;
          font-size: 13px; line-height: 1.5;
          color: var(--color-text-secondary);
        }

        .auth-features {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 20px;
          font-size: 11px; font-weight: 500;
          color: var(--color-text-muted);
        }

        .auth-buttons {
          display: flex; flex-direction: column; gap: 8px;
        }

        .auth-btn {
          display: flex; align-items: center; justify-content: center;
          gap: 10px; width: 100%;
          padding: 11px 16px; border-radius: var(--radius-md);
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }

        .auth-btn-google {
          background: var(--color-bg-panel);
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
        }
        .auth-btn-google:hover {
          border-color: var(--color-accent);
          background: var(--color-accent-bg);
        }

        .auth-btn-github {
          background: #24292f;
          border: 1px solid #24292f; color: #fff;
        }
        .auth-btn-github:hover {
          background: #1b1f23;
        }

        .auth-notice {
          text-align: center; margin: 16px 0 0;
          font-size: 11px; line-height: 1.6;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
}
