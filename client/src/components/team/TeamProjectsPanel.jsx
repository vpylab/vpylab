import { useUiText } from "../../i18n/ui-text";
import { useEffect, useState } from 'react';
import useProjectStore from '../../stores/projectStore';
import useAuthStore from '../../stores/authStore';
import { DRIVE_SAVE } from '../../lib/api-base.js';
import TeamMembersModal from './TeamMembersModal';

function normalizeRepoNameInput(value) {
  return Array.from(String(value || '')
    .normalize('NFKD')
  )
    .filter((ch) => ch.charCodeAt(0) <= 0x7F)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
    .replace(/-$/g, '');
}

async function defaultRepoNameFromTitle(title) {
  const rawTitle = String(title || 'project');
  const asciiBase = normalizeRepoNameInput(rawTitle).slice(0, 32).replace(/-$/g, '') || 'project';
  try {
    const bytes = new TextEncoder().encode(rawTitle);
    const digest = await crypto.subtle.digest('SHA-1', bytes);
    const suffix = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 6);
    return `vpylab-${asciiBase}-${suffix}`;
  } catch {
    let hash = 5381;
    for (let i = 0; i < rawTitle.length; i += 1) {
      hash = ((hash << 5) + hash + rawTitle.charCodeAt(i)) >>> 0;
    }
    return `vpylab-${asciiBase}-${hash.toString(16).slice(0, 6).padStart(6, '0')}`;
  }
}

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day}일 전`;
  return new Date(iso).toLocaleDateString();
}

function withUiTimeout(promise, ms, fallback = null) {
  let timerId;
  const timeout = new Promise((resolve) => {
    timerId = window.setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([Promise.resolve(promise), timeout])
    .finally(() => window.clearTimeout(timerId));
}

export default function TeamProjectsPanel({
  onOpenProject,
  onClose,
  currentCode,
  initialAction = 'browse',
  initialJoinCode = '',
}) {
  const ui = useUiText();
  const { user, githubTokenExpired, githubAuthError } = useAuthStore();
  const {
    myProjects, loadingProjects, projectsError, projectCreationStatus,
    githubSetupStatusById,
    fetchMyProjects, createProject, connectGithubProject, joinByInviteCode,
    joinError: storeJoinError,
  } = useProjectStore();

  const [creating, setCreating] = useState(false);
  const [createElapsed, setCreateElapsed] = useState(0);
  const [createStartedAt, setCreateStartedAt] = useState(null);
  const [createOpen, setCreateOpen] = useState(initialAction === 'create');
  const [createTitle, setCreateTitle] = useState('');
  const [createRepoName, setCreateRepoName] = useState('');
  const [repoNameTouched, setRepoNameTouched] = useState(false);
  const [createWithGithub, setCreateWithGithub] = useState(false);
  const [createDescription, setCreateDescription] = useState('');
  const [connectTarget, setConnectTarget] = useState(null);
  const [connectRepoName, setConnectRepoName] = useState('');
  const [connectRepoNameTouched, setConnectRepoNameTouched] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [connectingProjectId, setConnectingProjectId] = useState(null);
  const [connectElapsed, setConnectElapsed] = useState(0);
  const [connectStartedAt, setConnectStartedAt] = useState(null);
  const [joinCode, setJoinCode] = useState(initialJoinCode);
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [openingProjectId, setOpeningProjectId] = useState(null);
  const [openError, setOpenError] = useState('');
  const [membersTarget, setMembersTarget] = useState(null);
  const [createError, setCreateError] = useState('');
  const [tokenStatus, setTokenStatus] = useState('idle');  // 'idle' | 'checking' | 'ok' | 'missing'

  useEffect(() => {
    if (user) fetchMyProjects();
  }, [user, fetchMyProjects]);

  useEffect(() => {
    if (initialJoinCode) setJoinCode(initialJoinCode);
  }, [initialJoinCode]);

  useEffect(() => {
    if (!creating || !createStartedAt) return undefined;
    const tick = () => {
      setCreateElapsed(Math.floor((Date.now() - createStartedAt) / 1000));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [creating, createStartedAt]);

  useEffect(() => {
    if (!connectingProjectId || !connectStartedAt) return undefined;
    const tick = () => {
      setConnectElapsed(Math.floor((Date.now() - connectStartedAt) / 1000));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [connectingProjectId, connectStartedAt]);

  useEffect(() => {
    let alive = true;
    if (repoNameTouched) return undefined;
    (async () => {
      const nextName = await defaultRepoNameFromTitle(createTitle);
      if (alive) setCreateRepoName(nextName);
    })();
    return () => { alive = false; };
  }, [createTitle, repoNameTouched]);

  useEffect(() => {
    let alive = true;
    if (!connectTarget || connectRepoNameTouched) return undefined;
    (async () => {
      const nextName = await defaultRepoNameFromTitle(connectTarget.title);
      if (alive) setConnectRepoName(nextName);
    })();
    return () => { alive = false; };
  }, [connectTarget, connectRepoNameTouched]);

  const handleReauth = () => {
    const returnProjectId = useProjectStore.getState().activeProject?.id || '';
    useAuthStore.getState().signInWithGitHub({
      returnPath: '/sandbox',
      returnCode: currentCode || '',
      returnAction: 'projects',
      returnProjectId,
    });
  };

  const checkGitHubTokenForAction = async () => {
    if (!user) {
      setTokenStatus('missing');
      return false;
    }
    if (githubTokenExpired) {
      setTokenStatus('missing');
      return false;
    }
    setTokenStatus('checking');
    const token = await withUiTimeout(useAuthStore.getState().getGitHubToken(), 3000, null)
      .catch(() => null);
    setTokenStatus(token ? 'ok' : 'missing');
    return Boolean(token);
  };

  const openCreate = () => {
    setCreateError('');
    setCreateOpen(true);
  };

  const handleCreate = async (e) => {
    e?.preventDefault();
    setCreateError('');
    const title = createTitle.trim();
    if (!title) {
      setCreateError(ui("이름을 입력해주세요."));
      return;
    }
    if (createWithGithub && !(await checkGitHubTokenForAction())) {
      setCreateError(ui("GitHub 저장소까지 바로 연결하려면 GitHub 연결 확인이 필요합니다. 체크를 끄면 VPyLab 프로젝트만 바로 만들 수 있습니다."));
      return;
    }
    setCreating(true);
    setCreateElapsed(0);
    setCreateStartedAt(Date.now());
    const seedCode = currentCode && currentCode.trim().length > 0
      ? currentCode
      : `# ${title} — VPyLab 프로젝트\n# 여기에 코드를 작성하세요.\n\nbox(pos=(0,0,0), size=(1,1,1), color=(1,0,0))\n`;
    const { data, error } = await createProject({
      title: title.slice(0, 80),
      description: createDescription.trim().slice(0, 240),
      initialCode: seedCode,
      repoName: createRepoName.trim(),
      setupGithub: createWithGithub,
    });
    setCreating(false);
    setCreateStartedAt(null);
    if (error) {
      setCreateError(error.message);
      // 토큰 만료 케이스면 재인증 안내
      if (/GitHub 로그인|GitHub 인증/.test(error.message || '')) {
        setTokenStatus('missing');
      }
      return;
    }
    setCreateTitle('');
    setCreateRepoName('');
    setRepoNameTouched(false);
    setCreateWithGithub(false);
    setCreateDescription('');
    setCreateOpen(false);
    if (onOpenProject && data?.id) {
      await handleOpenProject(data.id, {
        project: data,
        code: data.code,
      });
    }
  };

  const openGithubConnect = async (project) => {
    setOpenError('');
    setConnectError('');
    if (!(await checkGitHubTokenForAction())) {
      setOpenError(ui("GitHub 저장소 연결에는 GitHub 연결 확인이 필요합니다. VPyLab 프로젝트 작업은 그대로 할 수 있습니다."));
      return;
    }
    setConnectTarget(project);
    setConnectRepoName('');
    setConnectRepoNameTouched(false);
  };

  const handleConnectGithub = async (e) => {
    e?.preventDefault();
    setConnectError('');
    if (!connectTarget?.id) {
      setConnectError(ui("연결할 프로젝트를 찾지 못했습니다."));
      return;
    }
    setConnectingProjectId(connectTarget.id);
    setConnectElapsed(0);
    setConnectStartedAt(Date.now());
    const { error } = await connectGithubProject(connectTarget.id, {
      repoName: connectRepoName.trim(),
    });
    setConnectingProjectId(null);
    setConnectStartedAt(null);
    if (error) {
      setConnectError(error.message);
      if (/GitHub 로그인|GitHub 인증/.test(error.message || '')) {
        setTokenStatus('missing');
      }
      return;
    }
    setConnectTarget(null);
    setConnectRepoName('');
    setConnectRepoNameTouched(false);
  };

  const handleJoin = async () => {
    setJoinError('');
    if (!joinCode.trim()) {
      setJoinError(ui("초대 코드를 입력해주세요."));
      return;
    }
    setJoining(true);
    const { data, error } = await joinByInviteCode(joinCode);
    setJoining(false);
    if (error) {
      setJoinError(error.message);
      return;
    }
    setJoinCode('');
    if (onOpenProject && data?.projectId) handleOpenProject(data.projectId);
  };

  const handleOpenProject = async (projectId, prefetched = null) => {
    if (!onOpenProject || !projectId) return;
    setOpenError('');
    setOpeningProjectId(projectId);
    try {
      await onOpenProject(projectId, prefetched);
    } catch (e) {
      setOpenError(e.message || ui("프로젝트를 열지 못했습니다."));
    } finally {
      setOpeningProjectId(null);
    }
  };

  // 미로그인
  if (!user) {
    return (
      <Overlay onClose={onClose}>
        <Header title={ui("프로젝트")} onClose={onClose} />
        <div className="flex-1 flex items-center justify-center" style={{ padding: 48 }}>
          <EmptyState
            title={ui("로그인이 필요합니다")}
            description={DRIVE_SAVE
              ? ui("팀 프로젝트는 GitHub 계정으로 로그인해 사용합니다. 혼자 만드는 작품은 로그인 없이 만들 수 있고 구글 드라이브에 저장할 수 있습니다.")
              : ui("GitHub 프로젝트, 초대 코드, 저장 이력은 로그인 후 사용할 수 있습니다.")}
            actionLabel={ui("로그인하기")}
            onAction={() => {
              onClose?.();
              useAuthStore.getState().setAuthModalOpen(true);
            }}
          />
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      <Header title={ui("프로젝트")} onClose={onClose} />

      {githubAuthError && <StatusBanner tone="warning"><p role="alert">{ui(githubAuthError)}</p></StatusBanner>}
      {tokenStatus === 'missing' && (
        <StatusBanner tone="warning">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{ui("GitHub 연결 확인 필요")}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{ui("VPyLab 저장은 그대로 됩니다. GitHub 저장소 연결·반영 때만 필요합니다.")}</p>
          </div>
          <button
            onClick={handleReauth}
            className="px-4 py-2 text-sm font-semibold cursor-pointer border-none whitespace-nowrap"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-accent-text, white)',
            }}
          >{ui("GitHub 연결")}</button>
        </StatusBanner>
      )}

      <div className="flex-1 overflow-y-auto" style={{ padding: 28 }}>
        <form
          onSubmit={(e) => { e.preventDefault(); handleJoin(); }}
          className="mb-6 flex flex-col gap-2 border sm:flex-row sm:items-center"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
            padding: '14px 16px',
          }}
        >
          <label className="text-xs font-semibold sm:w-28" style={{ color: 'var(--color-text-secondary)' }}>{ui("초대 코드")}</label>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder={ui("8자 코드")}
            className="min-w-0 flex-1 px-3 py-2 text-sm border outline-none font-mono"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            maxLength={16}
          />
          <button
            type="submit"
            disabled={joining}
            className="px-4 py-2 text-sm font-semibold cursor-pointer border disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-bg-panel)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            {joining ? ui("합류 중") : ui("합류")}
          </button>
          {(joinError || storeJoinError) && (
            <p className="text-xs sm:basis-full sm:pl-28" style={{ color: 'var(--color-error, #e03131)' }}>
              {ui(joinError || storeJoinError)}
            </p>
          )}
        </form>

        {openError && (
          <StatusBanner tone="error" compact>
            <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{ui(openError)}</p>
          </StatusBanner>
        )}

        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{ui("최근 프로젝트")}</h3>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>{ui("마지막 코드 저장 시각 기준으로 정렬됩니다.")}</p>
          </div>
          {myProjects.length > 0 && (
            <button
              onClick={openCreate}
              disabled={creating}
              className="px-3 py-2 text-xs font-semibold cursor-pointer border disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-bg-panel)',
                borderColor: 'var(--color-accent)',
                color: 'var(--color-accent)',
              }}
            >{ui("새 프로젝트")}</button>
          )}
        </div>

        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
        >
          {!loadingProjects && myProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              setupStatus={githubSetupStatusById[p.id]}
              isOpening={openingProjectId === p.id}
              isConnecting={connectingProjectId === p.id}
              onOpen={() => handleOpenProject(p.id)}
              onMembersClick={() => setMembersTarget(p)}
              onConnectGithub={() => openGithubConnect(p)}
            />
          ))}

          {!loadingProjects && projectsError && (
            <div
              className="col-span-full flex flex-col items-center gap-3 border px-4 py-6 text-center"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--color-error, #e03131)' }}>{ui("프로젝트 목록을 불러오지 못했습니다:")}{ui(projectsError)}
              </p>
              <button
                onClick={() => fetchMyProjects()}
                className="px-4 py-2 text-xs font-semibold cursor-pointer border"
                style={{
                  backgroundColor: 'var(--color-bg-panel)',
                  borderColor: 'var(--color-accent)',
                  color: 'var(--color-accent)',
                }}
              >{ui("다시 시도")}</button>
            </div>
          )}

          {!loadingProjects && !projectsError && myProjects.length === 0 && (
            <button
              onClick={openCreate}
              disabled={creating}
              className="text-left cursor-pointer border disabled:opacity-50 transition-colors flex flex-col justify-between min-h-[190px]"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-accent)',
                color: 'var(--color-text-primary)',
                padding: 22,
              }}
            >
              <span className="inline-flex h-9 w-9 items-center justify-center border text-xl" style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}>+</span>
              <span>
                <span className="block text-base font-bold mb-1">{ui("새 프로젝트 만들기")}</span>
                <span className="block text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{ui("VPyLab 먼저 생성 · GitHub 선택")}</span>
              </span>
            </button>
          )}

          {loadingProjects && (
            <div className="col-span-full text-center text-sm py-8" style={{ color: 'var(--color-text-muted)' }}>{ui("프로젝트를 불러오는 중입니다.")}</div>
          )}
        </div>

        {createError && (
          <StatusBanner tone="error" compact>
            <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{ui(createError)}</p>
          </StatusBanner>
        )}
      </div>

      {createOpen && (
        <CreateProjectModal
          title={createTitle}
          description={createDescription}
          repoName={createRepoName}
          setupGithub={createWithGithub}
          tokenStatus={tokenStatus}
          creating={creating}
          progressLabel={projectCreationStatus}
          elapsedSeconds={createElapsed}
          error={ui(createError)}
          hasCode={Boolean(currentCode?.trim())}
          onTitleChange={setCreateTitle}
          onDescriptionChange={setCreateDescription}
          onSetupGithubChange={(next) => {
            setCreateWithGithub(next);
            if (next) checkGitHubTokenForAction();
          }}
          onRepoNameChange={(value) => {
            setRepoNameTouched(true);
            setCreateRepoName(normalizeRepoNameInput(value));
          }}
          onSubmit={handleCreate}
          onClose={() => {
            if (creating) return;
            setCreateOpen(false);
            setCreateError('');
          }}
        />
      )}

      {connectTarget && (
        <ConnectGithubModal
          project={connectTarget}
          repoName={connectRepoName}
          connecting={connectingProjectId === connectTarget.id}
          elapsedSeconds={connectElapsed}
          error={ui(connectError)}
          onRepoNameChange={(value) => {
            setConnectRepoNameTouched(true);
            setConnectRepoName(normalizeRepoNameInput(value));
          }}
          onSubmit={handleConnectGithub}
          onClose={() => {
            if (connectingProjectId) return;
            setConnectTarget(null);
            setConnectError('');
          }}
        />
      )}

      {membersTarget && (
        <TeamMembersModal
          project={membersTarget}
          onClose={() => setMembersTarget(null)}
        />
      )}
    </Overlay>
  );
}

// ========================================
// 풀스크린 오버레이 컨테이너
// ========================================
function Overlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.58)' }}
      onClick={onClose}
    >
      <div
        className="w-[min(1080px,96vw)] h-[min(720px,92vh)] flex flex-col shadow-2xl"
        style={{
          backgroundColor: 'var(--color-bg-panel)',
          border: '1px solid var(--color-border)',
          borderRadius: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Header({ title, onClose }) {
  const ui = useUiText();
  return (
    <div
      className="flex items-center justify-between border-b"
      style={{
        borderColor: 'var(--color-border)',
        padding: '20px 28px',
      }}
    >
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h2>
        <p className="text-xs mt-0.5 break-keep" style={{ color: 'var(--color-text-muted)' }}>{ui("생성 · 합류 · 권한 관리")}</p>
      </div>
      <button
        onClick={onClose}
        className="h-9 w-9 cursor-pointer border bg-transparent text-lg"
        style={{
          color: 'var(--color-text-muted)',
          borderColor: 'var(--color-border)',
        }}
        aria-label={ui("닫기")}
      >
        ×
      </button>
    </div>
  );
}

// ========================================
// 프로젝트 카드 (갤러리 셀)
// ========================================
function ProjectCard({
  project,
  setupStatus,
  isOpening = false,
  isConnecting = false,
  onOpen,
  onMembersClick,
  onConnectGithub,
}) {
  const ui = useUiText();
  const repo = project.github_repo;
  const repoUrl = repo ? `https://github.com/${repo}` : null;
  const pagesVersion = project.github_last_pushed_at || project.updated_at || '';
  const pagesUrl = repo ? `https://${repo.split('/')[0]}.github.io/${repo.split('/')[1]}/?v=${encodeURIComponent(pagesVersion)}` : null;
  const pagesHelpText = ui("처음 연결 직후에는 GitHub Pages 배포가 1~2분 걸릴 수 있습니다. 404가 계속 보이면 GitHub로 다시 로그인한 뒤 프로젝트를 한 번 저장해주세요.");
  const lastTouched = project.activity_at || project.latest_code_updated_at || project.github_last_pushed_at || project.updated_at;
  const isOwner = project.my_role === 'owner';
  const memberCount = project.member_count || 1;
  const isGithubPending = !repo && (setupStatus?.state === 'pending' || project.githubSetupPending);
  const canConnectGithub = !repo && isOwner && !isGithubPending;
  const githubStatusText = repo
    ? null
    : isGithubPending
      ? ui("GitHub 준비 중")
      : setupStatus?.state === 'error'
        ? ui("GitHub 실패")
        : ui("GitHub 미연결");
  const statusColor = isGithubPending
    ? 'var(--color-accent)'
    : setupStatus?.state === 'error'
      ? 'var(--color-error, #ef4444)'
      : 'var(--color-text-muted)';

  return (
    <div
      className="flex flex-col transition-shadow"
      style={{
        backgroundColor: 'var(--color-bg-panel)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
        padding: 18,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3
          onClick={onOpen}
          className="text-base font-bold flex-1 cursor-pointer hover:opacity-80 line-clamp-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {project.title}
        </h3>
        <span
          className="text-[10px] px-1.5 py-0.5 flex-shrink-0"
          style={{
            backgroundColor: 'var(--color-accent-bg)',
            color: 'var(--color-accent)',
          }}
        >
          {isOwner ? 'OWNER' : project.my_role === 'editor' ? 'EDIT' : 'VIEW'}
        </span>
      </div>

      {project.description && (
        <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
          {project.description}
        </p>
      )}

      <div className="flex items-center justify-between text-[11px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          {memberCount === 1 ? ui("개인 프로젝트") : ui`${memberCount}명 참여`}
        </span>
        <span title={lastTouched ? new Date(lastTouched).toLocaleString() : ''}>
          {ui(relativeTime(lastTouched))}
        </span>
      </div>

      {repo && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <a
            href={repoUrl} target="_blank" rel="noreferrer"
            className="text-[10px] px-2 py-1 inline-flex items-center gap-1 no-underline"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
            onClick={(e) => e.stopPropagation()}
          >GitHub</a>
          {pagesUrl && (
            <a
              href={pagesUrl} target="_blank" rel="noreferrer"
              className="text-[10px] px-2 py-1 inline-flex items-center gap-1 no-underline"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
              onClick={(e) => e.stopPropagation()}
              title={pagesHelpText}
            >Pages</a>
          )}
          <a
            href={`${repoUrl}/commits/main`} target="_blank" rel="noreferrer"
            className="text-[10px] px-2 py-1 inline-flex items-center gap-1 no-underline"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
            onClick={(e) => e.stopPropagation()}
          >{ui("커밋")}</a>
        </div>
      )}

      {!repo && (
        <div
          className="mb-3 border px-2.5 py-2 text-[11px] leading-relaxed"
          style={{
            backgroundColor: isGithubPending ? 'var(--color-accent-bg)' : 'var(--color-bg-tertiary)',
            borderColor: 'var(--color-border)',
            color: statusColor,
          }}
        >
          <div>{githubStatusText}</div>
          {setupStatus?.state === 'error' && setupStatus?.message && (
            <div className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {ui(setupStatus.message)}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto">
        <button
          onClick={onOpen}
          disabled={isOpening}
          className="flex-1 text-xs py-2 cursor-pointer border-none font-bold disabled:opacity-60"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-accent-text, white)',
          }}
        >
          {isOpening ? ui("여는 중") : ui("작업하기")}
        </button>
        {canConnectGithub && (
          <button
            onClick={onConnectGithub}
            disabled={isOpening || isConnecting}
            className="text-xs px-3 py-2 cursor-pointer border font-semibold disabled:opacity-60"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-accent)',
              color: 'var(--color-accent)',
            }}
          >
            {isConnecting ? ui("연결 중") : setupStatus?.state === 'error' ? ui("재연결") : 'GitHub'}
          </button>
        )}
        <button
          onClick={onMembersClick}
          disabled={isOpening}
          className="text-xs px-3 py-2 cursor-pointer border"
          style={{
            backgroundColor: 'transparent',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
          title={ui("멤버 / 초대 코드")}
        >{ui("멤버")}</button>
      </div>
    </div>
  );
}

function StatusBanner({ children, tone = 'info', compact = false }) {
  const toneColor = tone === 'error'
    ? 'var(--color-error, #ef4444)'
    : tone === 'warning'
      ? 'var(--color-warning, #f59e0b)'
      : 'var(--color-accent)';
  return (
    <div
      className={`${compact ? 'mt-4' : 'mx-6 mt-6'} flex items-center justify-between gap-4 border px-4 py-3`}
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        borderColor: 'var(--color-border)',
        boxShadow: `inset 3px 0 0 ${toneColor}`,
      }}
    >
      {children}
    </div>
  );
}

function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="max-w-md text-center">
      <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
      <p className="mt-2 text-sm leading-relaxed break-keep" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>
      {actionLabel && (
        <button
          onClick={onAction}
          className="mt-5 border-none px-4 py-2 text-sm font-semibold"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-accent-text, white)',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function CreateProjectModal({
  title,
  description,
  repoName,
  setupGithub,
  tokenStatus,
  creating,
  progressLabel,
  elapsedSeconds = 0,
  error,
  hasCode,
  onTitleChange,
  onDescriptionChange,
  onSetupGithubChange,
  onRepoNameChange,
  onSubmit,
  onClose,
}) {
  const ui = useUiText();
  const progressPercent = creating
    ? Math.min(92, 12 + elapsedSeconds * 3)
    : 0;
  const waitingMessage = elapsedSeconds >= 25
    ? ui("VPyLab 프로젝트 공간 예약이 평소보다 오래 걸리고 있습니다. 창을 닫지 말고 조금만 기다려주세요.")
    : setupGithub
      ? ui("프로젝트는 먼저 열리고, GitHub 저장소와 Pages는 뒤에서 이어서 준비됩니다.")
      : ui("보통 1-3초 안에 열립니다. GitHub는 프로젝트 카드에서 나중에 연결할 수 있습니다.");

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.34)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg border shadow-2xl"
        style={{
          backgroundColor: 'var(--color-bg-panel)',
          borderColor: 'var(--color-border)',
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{ui("새 프로젝트")}</h3>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{ui("VPyLab에 먼저 만들고 GitHub는 선택합니다.")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="h-8 w-8 border bg-transparent text-lg disabled:opacity-40"
            style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
            aria-label={ui("닫기")}
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{ui("프로젝트 이름")}</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              maxLength={80}
              placeholder={ui("예: 우리 학교 종소리")}
              className="w-full border px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </label>

          <label
            className="flex items-start gap-3 border px-3 py-2.5 text-xs leading-relaxed"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <input
              type="checkbox"
              checked={setupGithub}
              onChange={(e) => onSetupGithubChange(e.target.checked)}
              disabled={creating}
              className="mt-0.5"
            />
            <span className="min-w-0">
              <span className="block font-semibold" style={{ color: 'var(--color-text-primary)' }}>{ui("GitHub 저장소도 바로 연결")}</span>
              <span className="block mt-0.5">{ui("체크 해제 시 더 빨리 시작합니다.")}</span>
              {tokenStatus === 'missing' && (
                <span className="mt-1 block" style={{ color: 'var(--color-warning, #f59e0b)' }}>{ui("재로그인 필요. 체크 해제 시 프로젝트만 만듭니다.")}</span>
              )}
            </span>
          </label>

          {setupGithub && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{ui("GitHub 저장소 이름")}</span>
              <input
                value={repoName}
                onChange={(e) => onRepoNameChange(e.target.value)}
                maxLength={50}
                placeholder="vpylab-project-123abc"
                className="w-full border px-3 py-2 text-sm outline-none font-mono"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{ui("GitHub 주소용 이름입니다.")}</p>
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{ui("설명")}</span>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              maxLength={240}
              rows={3}
              placeholder={ui("팀원이 알아볼 수 있는 짧은 설명")}
              className="w-full resize-none border px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </label>

          <div
            className="border px-3 py-2 text-xs"
            style={{
              backgroundColor: 'var(--color-accent-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {hasCode ? ui("현재 에디터 코드가 첫 커밋으로 저장됩니다.") : ui("빈 프로젝트 대신 기본 예제 코드로 시작합니다.")}
          </div>

          {error && (
            <p className="border px-3 py-2 text-xs" style={{ color: 'var(--color-error)', borderColor: 'var(--color-border)' }}>
              {ui(error)}
            </p>
          )}

          {creating && (
            <div
              className="border px-3 py-3 text-xs"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
              role="status"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {progressLabel || ui("프로젝트를 만드는 중입니다.")}
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}>{elapsedSeconds}{ui("초")}</span>
              </div>
              <div className="h-1.5 overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: 'var(--color-accent)',
                  }}
                />
              </div>
              <p className="mt-2 leading-relaxed">{waitingMessage}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="border px-4 py-2 text-sm font-semibold disabled:opacity-40"
            style={{
              backgroundColor: 'transparent',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >{ui("취소")}</button>
          <button
            type="submit"
            disabled={creating}
            className="border-none px-4 py-2 text-sm font-semibold disabled:opacity-60"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-accent-text, white)',
            }}
          >
            {creating ? ui("만드는 중") : ui("프로젝트 만들기")}
          </button>
        </div>
      </form>
    </div>
  );
}

function ConnectGithubModal({
  project,
  repoName,
  connecting,
  elapsedSeconds = 0,
  error,
  onRepoNameChange,
  onSubmit,
  onClose,
}) {
  const ui = useUiText();
  const progressPercent = connecting
    ? Math.min(92, 18 + elapsedSeconds * 4)
    : 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.34)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg border shadow-2xl"
        style={{
          backgroundColor: 'var(--color-bg-panel)',
          borderColor: 'var(--color-border)',
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{ui("GitHub 저장소 연결")}</h3>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{ui("최신 코드를 GitHub와 Pages에 연결합니다.")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={connecting}
            className="h-8 w-8 border bg-transparent text-lg disabled:opacity-40"
            style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
            aria-label={ui("닫기")}
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div
            className="border px-3 py-2 text-xs leading-relaxed"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >{ui("연결할 프로젝트:")}<strong style={{ color: 'var(--color-text-primary)' }}>{project?.title || ui("제목 없음")}</strong>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{ui("GitHub 저장소 이름")}</span>
            <input
              autoFocus
              value={repoName}
              onChange={(e) => onRepoNameChange(e.target.value)}
              maxLength={50}
              placeholder="vpylab-project-123abc"
              className="w-full border px-3 py-2 text-sm outline-none font-mono"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{ui("비워두면 기본 이름을 사용합니다.")}</p>
          </label>

          <div
            className="border px-3 py-2 text-xs leading-relaxed"
            style={{
              backgroundColor: 'var(--color-accent-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >{ui("연결은 백그라운드에서 진행됩니다.")}</div>

          {error && (
            <p className="border px-3 py-2 text-xs" style={{ color: 'var(--color-error)', borderColor: 'var(--color-border)' }}>
              {ui(error)}
            </p>
          )}

          {connecting && (
            <div
              className="border px-3 py-3 text-xs"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
              role="status"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{ui("GitHub 연결을 시작하는 중입니다.")}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>{elapsedSeconds}{ui("초")}</span>
              </div>
              <div className="h-1.5 overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: 'var(--color-accent)',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={connecting}
            className="border px-4 py-2 text-sm font-semibold disabled:opacity-40"
            style={{
              backgroundColor: 'transparent',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >{ui("취소")}</button>
          <button
            type="submit"
            disabled={connecting}
            className="border-none px-4 py-2 text-sm font-semibold disabled:opacity-60"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-accent-text, white)',
            }}
          >
            {connecting ? ui("연결 중") : ui("연결 시작")}
          </button>
        </div>
      </form>
    </div>
  );
}
