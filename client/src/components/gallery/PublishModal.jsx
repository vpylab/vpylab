import { useUiText } from "../../i18n/ui-text";
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPosterThumbnail, isThumbnailUsable } from '../../engine/thumbnail';
import useGalleryStore from '../../stores/galleryStore';
import useAuthStore from '../../stores/authStore';

const CATEGORIES = [
  { value: 'free', label: '자유' },
  { value: 'CT', label: '컴퓨팅' },
  { value: 'CR', label: '창작' },
  { value: 'MA', label: '수학' },
  { value: 'SC', label: '과학' },
  { value: 'AR', label: '아트' },
  { value: 'SN', label: '사운드' },
];

export default function PublishModal({ isOpen, onClose, code, thumbnail, remixFrom, projectContext = null, onRefreshThumbnail }) {
  const ui = useUiText();
  const navigate = useNavigate();
  const publishWork = useGalleryStore(s => s.publishWork);
  const publishing = useGalleryStore(s => s.publishing);
  const getGitHubToken = useAuthStore(s => s.getGitHubToken);
  const isGitHubUser = useAuthStore(s => s.isGitHubUser);
  const signInWithGitHub = useAuthStore(s => s.signInWithGitHub);
  const profile = useAuthStore(s => s.profile);

  const projectRepo = projectContext?.github_repo || '';
  const hasProjectRepo = !!projectRepo;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [authorAlias, setAuthorAlias] = useState(profile?.display_name || '');
  const [category, setCategory] = useState('free');
  const [publishToGitHub, setPublishToGitHub] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [githubTokenExpired, setGithubTokenExpired] = useState(false);
  const [thumbnailState, setThumbnailState] = useState(null);

  const publishModeText = !publishToGitHub ? ui("갤러리 스냅샷만 공개합니다.") : hasProjectRepo
    ? ui`현재 프로젝트 저장소 ${projectRepo}에 Pages 실행 버전을 갱신합니다.`
    : ui("새 GitHub 저장소와 Pages 실행 페이지를 함께 만듭니다.");
  const posterTitle=title.trim() || projectContext?.title || ui("VPyLab 작품");
  const posterThumbnail = useMemo(() => createPosterThumbnail({
    title: posterTitle,
    description,
    category,
    code,
    repo: projectRepo,
    author: authorAlias,
  }), [authorAlias, category, code, description, projectRepo, posterTitle]);
  const capturedThumbnail = thumbnailState?.source === thumbnail && thumbnailState.usable ? thumbnail : null;
  const finalThumbnail = capturedThumbnail || posterThumbnail;
  const thumbnailMode = capturedThumbnail ? ui("실행 화면 캡처") : ui("자동 포스터");

  useEffect(() => {
    if (!isOpen) return;
    setResult(null);
    setError(null);
    setGithubTokenExpired(false);
    setAuthorAlias(profile?.display_name || '');
    if (projectContext?.title) setTitle(projectContext.title);
    if (projectContext?.description) setDescription(projectContext.description);
    if (hasProjectRepo) setPublishToGitHub(true);
  }, [hasProjectRepo, isOpen, profile?.display_name, projectContext?.description, projectContext?.id, projectContext?.title]);

  useEffect(() => {
    let alive = true;
    if (!thumbnail) return () => { alive = false; };
    isThumbnailUsable(thumbnail).then(usable => {
      if (alive) setThumbnailState({ source: thumbnail, usable });
    });
    return () => { alive = false; };
  }, [thumbnail]);

  if (!isOpen) return null;

  const handleGitHubSignIn = () => {
    const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    signInWithGitHub({
      returnPath,
      returnCode: code || '',
      returnAction: 'publish',
      returnProjectId: projectContext?.id || '',
    });
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      setError(ui("제목을 입력해주세요."));
      return;
    }
    if (!code?.trim()) {
      setError(ui("코드가 비어있습니다."));
      return;
    }

    setError(null);
    setResult(null);
    setGithubTokenExpired(false);

    try {
      let githubToken = null;
      let htmlContent = null;

      if (publishToGitHub) {
        if (!isGitHubUser()) {
          setError(ui("GitHub Pages까지 연결하려면 GitHub 로그인이 필요합니다."));
          return;
        }

        githubToken = await getGitHubToken();
        if (!githubToken) {
          setGithubTokenExpired(true);
          setError(ui("GitHub 인증이 만료되었습니다. 다시 로그인한 뒤 발행해주세요."));
          return;
        }

        const { generateProjectHTML } = await import('../../utils/export-html');
        htmlContent = await generateProjectHTML(code, title.trim());
      }

      const res = await publishWork({
        title: title.trim(),
        description: description.trim(),
        code,
        thumbnail: finalThumbnail,
        category,
        remixFrom,
        htmlContent,
        githubToken,
        authorAlias: authorAlias.trim() || ui("익명"),
        projectId: projectContext?.id || null,
        existingRepo: publishToGitHub && hasProjectRepo ? projectRepo : null,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setResult(res);
      }
    } catch (err) {
      console.error(ui("[Publish] 오류:"), err);
      setError(err.message || ui("발행 중 오류가 발생했습니다."));
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setAuthorAlias(profile?.display_name || '');
    setCategory('free');
    setPublishToGitHub(true);
    setResult(null);
    setError(null);
    setGithubTokenExpired(false);
    onClose();
  };

  const handleGoToGallery = () => {
    handleClose();
    if (result?.data?.id) navigate(`/gallery/${result.data.id}`);
    else navigate('/gallery');
  };

  return (
    <div className="publish-modal-overlay" onClick={handleClose}>
      <div className="publish-modal" onClick={e => e.stopPropagation()}>
        {result ? (
          <div className="publish-success">
            <div className="publish-success-mark">
              <svg width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden="true">
                <rect x="5" y="5" width="32" height="32" fill="var(--color-success)" />
                <path d="M13 21.5L18.5 27L29.5 15" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2>{ui("발행 완료")}</h2>
            <p className="publish-success-desc">
              {result.githubUrl
                ? ui("갤러리 작품과 GitHub Pages 실행 페이지가 연결되었습니다.")
                : ui("갤러리 작품으로 공개되었습니다.")}
            </p>
            {result.githubUrl && (
              <div className="publish-result-box">
                <span>GitHub Pages</span>
                <a href={result.githubUrl} target="_blank" rel="noopener noreferrer">{result.githubUrl}</a>
              </div>
            )}
            {result.warnings?.length > 0 && (
              <div className="publish-warnings">
                {result.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
              </div>
            )}
            <div className="publish-actions">
              <button onClick={handleGoToGallery} className="publish-primary" type="button">{ui("갤러리에서 보기")}</button>
              <button onClick={handleClose} className="publish-secondary" type="button">{ui("닫기")}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="publish-header">
              <div>
                <p>Gallery Publish</p>
                <h2>{ui("작품 공개하기")}</h2>
              </div>
              <button className="publish-close" onClick={handleClose} aria-label={ui("닫기")} type="button">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="publish-thumbnail">
              <img src={finalThumbnail} alt={ui("미리보기")} />
              <div className="publish-thumbnail-bar">
                <span>{thumbnailMode}</span>
                {onRefreshThumbnail && (
                  <button type="button" onClick={onRefreshThumbnail}>{ui("현재 화면 다시 캡처")}</button>
                )}
              </div>
            </div>

            <div className="publish-flow-note">
              <span>{hasProjectRepo ? 'Project Repo' : 'Open Source'}</span>
              <p>{publishModeText}</p>
            </div>

            {remixFrom && (
              <div className="publish-remix-note">{ui("다른 작품에서 출발한 Remix로 연결됩니다.")}</div>
            )}

            <label className="publish-field">{ui("제목")}<span className="required">*</span>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={ui("작품 제목")}
                maxLength={100}
                autoFocus
              />
            </label>

            <label className="publish-field">{ui("공개 이름")}<div className="publish-alias-row">
                <input
                  type="text"
                  value={authorAlias}
                  onChange={e => setAuthorAlias(e.target.value)}
                  placeholder={ui("갤러리에 표시될 이름")}
                  maxLength={30}
                />
                <button type="button" onClick={() => setAuthorAlias('')} className={!authorAlias.trim() ? 'active' : ''}>{ui("익명")}</button>
              </div>
            </label>

            <label className="publish-field">{ui("설명")}<textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={ui("다른 사람이 실행하거나 Remix할 때 도움이 되는 짧은 설명")}
                maxLength={500}
                rows={3}
              />
            </label>

            <div className="publish-field">{ui("카테고리")}<div className="publish-category-grid">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    className={category === cat.value ? 'active' : ''}
                    onClick={() => setCategory(cat.value)}
                    type="button"
                  >
                    {ui(cat.label)}
                  </button>
                ))}
              </div>
            </div>

            <label className="publish-checkbox">
              <input
                type="checkbox"
                checked={publishToGitHub}
                onChange={e => setPublishToGitHub(e.target.checked)}
              />
              <span>{ui("GitHub Pages 실행 버전까지 발행")}{hasProjectRepo && <small>{ui("현재 프로젝트 저장소를 재사용합니다.")}</small>}
              </span>
            </label>

            {publishToGitHub && !isGitHubUser() && (
              <div className="publish-github-prompt">
                <p>{ui("GitHub 저장소와 Pages를 만들려면 GitHub 로그인이 필요합니다.")}</p>
                <button onClick={handleGitHubSignIn} type="button">{ui("GitHub으로 로그인")}</button>
              </div>
            )}

            {githubTokenExpired && (
              <div className="publish-token-warning">
                <p>{ui("GitHub 인증이 만료되었습니다. 재로그인 후 다시 발행해주세요.")}</p>
                <button onClick={handleGitHubSignIn} type="button">{ui("GitHub 재로그인")}</button>
              </div>
            )}

            {error && <div className="publish-error">{ui(error)}</div>}

            <div className="publish-actions">
              <button
                onClick={handlePublish}
                disabled={publishing || !title.trim()}
                className="publish-primary"
                type="button"
              >
                {publishing ? (
                  <span className="publishing-state"><span className="spinner" />{ui("발행 중")}</span>
                ) : ui("발행하기")}
              </button>
              <button onClick={handleClose} className="publish-secondary" type="button">{ui("취소")}</button>
            </div>
          </>
        )}
      </div>

      <style>{`
        .publish-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(15, 23, 42, 0.56);
          backdrop-filter: blur(4px);
        }

        .publish-modal {
          width: min(560px, 100%);
          max-height: min(760px, calc(100vh - 48px));
          overflow-y: auto;
          background: var(--color-bg-panel);
          border: 1px solid var(--color-border);
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
          padding: 32px;
          color: var(--color-text-primary);
          font-family: var(--font-body);
        }

        .publish-header {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 22px;
        }

        .publish-header p,
        .publish-flow-note span {
          margin: 0 0 4px;
          color: var(--color-accent);
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .publish-header h2,
        .publish-success h2 {
          margin: 0;
          font-size: 24px;
          line-height: 1.2;
          letter-spacing: 0;
        }

        .publish-close {
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--color-border);
          background: transparent;
          color: var(--color-text-muted);
          cursor: pointer;
        }

        .publish-thumbnail {
          margin-bottom: 18px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
          overflow: hidden;
        }

        .publish-thumbnail img {
          display: block;
          width: 100%;
          aspect-ratio: 16 / 9;
          object-fit: cover;
        }

        .publish-thumbnail-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border-top: 1px solid var(--color-border);
          background: var(--color-bg-panel);
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .publish-thumbnail-bar button {
          border: 1px solid var(--color-border);
          background: transparent;
          color: var(--color-text-primary);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          padding: 7px 10px;
        }

        .publish-thumbnail-bar button:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }

        .publish-flow-note,
        .publish-remix-note,
        .publish-github-prompt,
        .publish-token-warning,
        .publish-error,
        .publish-result-box {
          border: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
          padding: 14px;
          margin-bottom: 16px;
        }

        .publish-flow-note p,
        .publish-remix-note,
        .publish-github-prompt p,
        .publish-token-warning p,
        .publish-success-desc {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: 14px;
          line-height: 1.6;
        }

        .publish-field {
          display: block;
          margin-bottom: 16px;
          color: var(--color-text-secondary);
          font-size: 13px;
          font-weight: 700;
        }

        .publish-field input,
        .publish-field textarea {
          display: block;
          width: 100%;
          margin-top: 7px;
          padding: 12px 14px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
          font: inherit;
          font-weight: 500;
          letter-spacing: 0;
        }

        .publish-field textarea {
          resize: vertical;
        }

        .publish-field input:focus,
        .publish-field textarea:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px var(--color-accent-bg);
        }

        .required,
        .publish-error {
          color: var(--color-error);
        }

        .publish-alias-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          margin-top: 7px;
        }

        .publish-alias-row input {
          margin-top: 0;
        }

        .publish-alias-row button,
        .publish-category-grid button,
        .publish-secondary,
        .publish-github-prompt button,
        .publish-token-warning button,
        .publish-result-box button {
          border: 1px solid var(--color-border);
          background: transparent;
          color: var(--color-text-secondary);
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          padding: 10px 14px;
        }

        .publish-alias-row button.active,
        .publish-category-grid button.active {
          border-color: var(--color-accent);
          background: var(--color-accent-bg);
          color: var(--color-accent);
        }

        .publish-category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
          gap: 8px;
          margin-top: 8px;
        }

        .publish-checkbox {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 10px;
          align-items: start;
          padding: 14px;
          margin-bottom: 16px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
          cursor: pointer;
        }

        .publish-checkbox input {
          margin-top: 3px;
          accent-color: var(--color-accent);
        }

        .publish-checkbox small {
          display: block;
          margin-top: 3px;
          color: var(--color-text-muted);
          font-size: 12px;
        }

        .publish-github-prompt,
        .publish-token-warning {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .publish-github-prompt button,
        .publish-token-warning button {
          border-color: #238636;
          color: #238636;
          white-space: nowrap;
        }

        .publish-token-warning {
          border-color: rgba(245, 158, 11, 0.45);
          background: rgba(245, 158, 11, 0.08);
        }

        .publish-error {
          border-color: rgba(239, 68, 68, 0.35);
          background: rgba(239, 68, 68, 0.08);
          font-size: 13px;
        }

        .publish-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 22px;
        }

        .publish-primary {
          min-width: 132px;
          padding: 12px 18px;
          border: 1px solid var(--color-accent);
          background: var(--color-accent);
          color: white;
          cursor: pointer;
          font: inherit;
          font-weight: 800;
        }

        .publish-primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .publishing-state {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .spinner {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255,255,255,0.28);
          border-top-color: white;
          border-radius: 50%;
          animation: publish-spin 0.65s linear infinite;
        }

        .publish-success {
          text-align: center;
        }

        .publish-success-mark {
          margin: 0 auto 14px;
          width: 42px;
          height: 42px;
        }

        .publish-success-desc {
          margin-top: 8px;
          margin-bottom: 18px;
        }

        .publish-result-box {
          text-align: left;
        }

        .publish-result-box span {
          display: block;
          margin-bottom: 6px;
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 700;
        }

        .publish-result-box a {
          color: var(--color-accent);
          word-break: break-all;
          font-size: 13px;
        }

        .publish-warnings {
          margin: 12px 0;
          text-align: left;
        }

        .publish-warnings p {
          margin: 4px 0;
          color: var(--color-warning);
          font-size: 12px;
        }

        @keyframes publish-spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 560px) {
          .publish-modal-overlay {
            padding: 12px;
            align-items: stretch;
          }

          .publish-modal {
            padding: 22px;
            max-height: none;
          }

          .publish-actions,
          .publish-github-prompt,
          .publish-token-warning {
            flex-direction: column;
            align-items: stretch;
          }

          .publish-primary,
          .publish-secondary {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
