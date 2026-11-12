import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useUiText } from '../../i18n/ui-text';
import { GITHUB_ADDON } from '../../lib/api-base.js';
import { loadGalleryIndex } from '../../gallery/gallery-index.js';
import { GALLERY_TEXT } from '../../gallery/gallery-text.js';
import { useGitHubStore } from '../../github/githubSession.js';
import { isAllowedGalleryUrl, parseFullName } from '../../../../server/shared/gallery-rules.js';

const secondary = { color: 'var(--color-text-secondary)' };
const muted = { color: 'var(--color-text-muted)' };
const panel = { border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-panel)', color: 'var(--color-text-primary)' };

/** 미리보기 그림. 주소가 없거나 불러오지 못하면 글자로 대신합니다. */
function Thumbnail({ item }) {
  const ui = useUiText();
  const [broken, setBroken] = useState(false);
  if (!item.thumbnailUrl || broken) {
    return (
      <div className="w-full aspect-video flex items-center justify-center text-xs" style={{ backgroundColor: 'var(--color-bg-secondary)', ...muted }} data-testid="gallery-thumbnail-placeholder">
        {ui("미리보기 그림 없음")}
      </div>
    );
  }
  return (
    <img
      src={item.thumbnailUrl}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="w-full aspect-video object-cover block"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      onError={() => setBroken(true)}
    />
  );
}

const dateOf = (item) => (item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '');

function Stars({ count }) {
  const ui = useUiText();
  return <span aria-label={ui`스타 ${count}개`} title={ui`스타 ${count}개`}><span aria-hidden="true">★ </span>{count}</span>;
}

/** 저장소 주소가 그 작품의 주소일 때만 링크로 만듭니다. 목록은 읽을 때 이미 검사했고, 여기서 한 번 더 확인합니다. */
function RepoLink({ item, kind, className, style, children, ...rest }) {
  const target = parseFullName(item.fullName);
  const href = kind === 'pages' ? item.pagesUrl : item.htmlUrl;
  if (!target || !isAllowedGalleryUrl(kind, href, target)) return null;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={style} {...rest}>{children}</a>;
}

/**
 * 스타(갤러리의 좋아요). GitHub에 연결한 탭에서는 여기서 누르고, 아니면 저장소로 가는 링크를 보입니다.
 * 공개 저장소에 스타를 누르는 데 필요한 GitHub 권한은 팀 프로젝트가 이미 요청하는 public_repo입니다.
 */
function StarControl({ item, github }) {
  const ui = useUiText();
  const account = useGitHubStore((state) => state.account);
  const needsReauth = useGitHubStore((state) => state.needsReauth);
  const connected = github && Boolean(account) && !needsReauth;
  const [mine, setMine] = useState(null); // 내가 눌렀는지: null은 아직 모름
  const [delta, setDelta] = useState(0); // 이 창에서 누르거나 취소해 달라진 수
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => { if (github) useGitHubStore.getState().restore(); }, [github]);
  useEffect(() => {
    if (!connected) return undefined;
    let alive = true;
    useGitHubStore.getState().starStatus(item.fullName).then((result) => {
      if (alive && result.status === 'ok') setMine(result.starred);
    });
    return () => { alive = false; };
  }, [connected, item.fullName]);

  async function toggle() {
    const next = !mine;
    setWorking(true);
    setFailed(false);
    const result = await useGitHubStore.getState().setStar(item.fullName, next);
    setWorking(false);
    if (result.status === 'ok') {
      setMine(result.starred);
      setDelta((value) => value + (result.starred ? 1 : -1));
    } else if (result.status === 'error') {
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col gap-2" data-testid="gallery-star">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Stars count={Math.max(0, item.stars + delta)} />
        {connected && mine !== null ? (
          <button type="button" className="toolbar-btn" onClick={toggle} disabled={working} aria-pressed={mine} data-testid="gallery-star-button">
            {mine ? ui("스타 취소") : ui("스타 누르기")}
          </button>
        ) : (
          <RepoLink item={item} kind="html" style={{ color: 'var(--color-accent)' }} data-testid="gallery-star-link">{ui("GitHub에서 스타 누르기")}</RepoLink>
        )}
      </div>
      {failed && <p className="m-0 text-xs" role="alert" style={{ color: 'var(--color-error-text)' }}>{ui(GALLERY_TEXT.starFailed)}</p>}
      {github && !connected && <p className="m-0 text-xs" style={muted} data-testid="gallery-star-hint">{ui(GALLERY_TEXT.starHint)}</p>}
    </div>
  );
}

function WorkDialog({ item, github, onClose }) {
  const ui = useUiText();
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const primary = { backgroundColor: 'var(--color-accent)', color: 'var(--color-text-on-accent, #fff)', borderColor: 'var(--color-accent)' };
  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }} onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        className="rounded-2xl w-full flex flex-col gap-3 overflow-auto"
        style={{ ...panel, maxWidth: 560, maxHeight: '90vh', padding: 20, boxShadow: 'var(--shadow-xl, 0 24px 48px rgba(0,0,0,0.25))' }}
        onClick={(event) => event.stopPropagation()}
        data-testid="gallery-work-dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 data-user-content className="m-0 text-base font-semibold break-words min-w-0">{item.title}</h2>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-md cursor-pointer border-none shrink-0" style={{ backgroundColor: 'transparent', ...muted }} aria-label={ui("닫기")}>✕</button>
        </div>
        <Thumbnail item={item} />
        <p className="m-0 text-xs" style={secondary}>
          <span data-user-content>{item.owner}</span>{dateOf(item) ? ` · ${dateOf(item)}` : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <RepoLink item={item} kind="pages" className="toolbar-btn no-underline" style={primary} data-testid="gallery-open-pages">{ui("실행 화면 열기")}</RepoLink>
          <Link to={`/sandbox?repo=${encodeURIComponent(item.fullName)}`} className="toolbar-btn no-underline" data-testid="gallery-open-code">{ui("코드 보기")}</Link>
          <RepoLink item={item} kind="html" className="toolbar-btn no-underline" data-testid="gallery-open-repo">{ui("GitHub 저장소 보기")}</RepoLink>
        </div>
        {!item.pagesUrl && <p className="m-0 text-xs" style={muted} data-testid="gallery-no-pages">{ui(GALLERY_TEXT.noPages)}</p>}
        <StarControl item={item} github={github} />
      </div>
    </div>,
    document.body,
  );
}

/**
 * GitHub 연동 갤러리의 본문(오픈소스 판 애드온, docs/SCOPE.md).
 * 정적 목록 파일을 읽어 카드로 보여 줍니다. 목록을 읽지 못해도 이 안에서만 안내하고 다른 화면에는 영향을 주지 않습니다.
 *
 * @param {object} props
 * @param {() => Promise<{items: object[]}>} [props.load] 목록 읽기(테스트에서 바꿔 끼움)
 * @param {boolean} [props.github] GitHub 애드온이 켜진 배포인지(앱에서 스타 누르기)
 */
export default function GitHubGalleryView({ load = loadGalleryIndex, github = GITHUB_ADDON }) {
  const ui = useUiText();
  const [state, setState] = useState({ status: 'loading', items: [] });
  const [selected, setSelected] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => load()).then(
      (index) => { if (alive) setState({ status: 'ready', items: Array.isArray(index?.items) ? index.items : [] }); },
      () => { if (alive) setState({ status: 'error', items: [] }); },
    );
    return () => { alive = false; };
  }, [load, attempt]);

  const retry = useCallback(() => { setState({ status: 'loading', items: [] }); setAttempt((value) => value + 1); }, []);
  const close = useCallback(() => setSelected(null), []);

  return (
    <>
      <p className="text-sm leading-relaxed max-w-2xl mb-9" style={secondary}>{ui(GALLERY_TEXT.intro)}</p>

      {state.status === 'loading' && <p className="text-sm" role="status" style={secondary}>{ui("작품 목록을 불러오는 중입니다.")}</p>}

      {state.status === 'error' && (
        <div className="flex flex-col items-start gap-3" role="alert" data-testid="gallery-error">
          <p className="m-0 text-sm" style={secondary}>{ui(GALLERY_TEXT.loadFailed)}</p>
          <button type="button" className="btn-secondary" onClick={retry}>{ui("다시 시도")}</button>
        </div>
      )}

      {state.status === 'ready' && state.items.length === 0 && <p className="text-sm" style={secondary} data-testid="gallery-empty">{ui(GALLERY_TEXT.empty)}</p>}

      {state.status === 'ready' && state.items.length > 0 && (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 m-0 p-0" style={{ listStyle: 'none' }} data-testid="gallery-list">
          {state.items.map((item) => (
            <li key={item.fullName}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="w-full text-left p-0 cursor-pointer overflow-hidden flex flex-col"
                style={panel}
                data-testid="gallery-card"
              >
                <Thumbnail item={item} />
                <span className="p-4 flex flex-col gap-2 min-w-0 w-full">
                  <span data-user-content className="text-base font-semibold leading-snug break-words">{item.title}</span>
                  <span className="flex items-center justify-between gap-3 text-xs" style={secondary}>
                    <span data-user-content className="truncate">{item.owner}</span>
                    <span className="shrink-0 flex items-center gap-3">{dateOf(item) && <span>{dateOf(item)}</span>}<Stars count={item.stars} /></span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-12 border-t pt-6" style={{ borderColor: 'var(--color-border)' }} aria-labelledby="gallery-how-to">
        <h2 id="gallery-how-to" className="text-sm font-semibold mb-3">{ui("작품 올리는 방법")}</h2>
        <p className="text-sm leading-relaxed max-w-2xl m-0" style={secondary}>{ui(GALLERY_TEXT.howToPublish)}</p>
        <p className="mt-4 mb-0"><Link to="/sandbox" className="text-sm no-underline" style={{ color: 'var(--color-accent)' }}>{ui("만들기 화면으로 가기")} →</Link></p>
      </section>

      {selected && <WorkDialog item={selected} github={github} onClose={close} />}
    </>
  );
}
