import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUiText } from '../../i18n/ui-text';
import { GITHUB_PAGES_WARNING_TEXT, GITHUB_REASON_TEXT, isGitHubConfigured, useGitHubStore } from '../../github/githubSession';

const GITHUB_LOGOUT_URL = 'https://github.com/logout';

/** 링크는 github.com과 *.github.io 주소에만 겁니다. 그 밖의 주소는 글자로만 보입니다. */
function safeGitHubUrl(url) {
  if (typeof url !== 'string') return null;
  return /^https:\/\/github\.com\//.test(url) || /^https:\/\/[a-z0-9-]+\.github\.io\//i.test(url) ? url : null;
}

function ExternalLink({ href, children }) {
  const safe = safeGitHubUrl(href);
  if (!safe) return <span>{children}</span>;
  return <a href={safe} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>{children}</a>;
}

const firstLine = (text) => String(text || '').split('\n')[0];

/**
 * GitHub 팀 프로젝트 대화상자(오픈소스 판 만들기 화면의 애드온).
 *   mode='projects': 내 프로젝트 열기, 받은 초대 수락, 새 프로젝트 만들기, 연 프로젝트의 팀원·초대·저장 기록.
 *   mode='commit': 저장 메시지와 선택 기록 세 칸을 적어 연 프로젝트에 저장. 충돌·만료·권한 문제도 여기서 안내합니다.
 * GitHub 연결이 없거나 실패해도 이 창 안에서만 안내하고, 실행과 드라이브 저장에는 영향을 주지 않습니다.
 *
 * @param {object} props
 * @param {'projects'|'commit'} props.mode
 * @param {() => string} props.getCode 편집기의 지금 코드
 * @param {string} [props.defaultTitle] 새 프로젝트 제목 칸의 처음 값
 * @param {(code: string, title: string) => void} [props.onLoaded] 프로젝트의 코드를 편집기에 넣을 때
 * @param {(result: object) => void} [props.onSaved] 저장(saved) 또는 프로젝트 만들기(created)가 끝났을 때
 * @param {() => boolean} [props.isDirty] 편집기에 저장하지 않은 변경이 있는지(없으면 GitHub에 저장한 코드와 비교)
 * @param {() => void} props.onClose
 */
export default function GitHubProjectDialog({ mode, getCode, defaultTitle, onLoaded, onSaved, onClose, isDirty }) {
  const ui = useUiText();
  const {
    account, project, projects, invitations, invitationsUnavailable, collaborators, pending, commits,
    busy, listing, teamLoading, error, needsReauth, missingScope, conflict, pagesWarning, lastCommitUrl,
  } = useGitHubStore();
  const store = useGitHubStore.getState;
  const [title, setTitle] = useState(defaultTitle || '');
  const [message, setMessage] = useState('');
  const [did, setDid] = useState('');
  const [blocker, setBlocker] = useState('');
  const [next, setNext] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [notice, setNotice] = useState('');
  const pendingRef = useRef(null); // 다시 연결한 뒤 이어서 할 일
  const listedFor = useRef('');
  const teamFor = useRef('');

  const configured = isGitHubConfigured();
  const working = Boolean(busy);
  // 연결 창을 기다리는 동안에는 이 창을 닫을 수 있습니다. 연결은 뒤에서 이어집니다.
  const locked = working && busy !== 'connect';

  useEffect(() => { store().restore(); }, [store]);
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !locked) onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [locked, onClose]);

  // 프로젝트 목록과 받은 초대: 연결한 계정마다 한 번 읽습니다.
  useEffect(() => {
    if (!account || needsReauth || listedFor.current === account.login) return;
    listedFor.current = account.login;
    store().loadProjects();
    store().loadInvitations();
  }, [account, needsReauth, store]);

  // 팀원·초대·저장 기록: 연 프로젝트마다 한 번 읽습니다.
  useEffect(() => {
    if (mode !== 'projects' || !account || needsReauth || !project || teamFor.current === project.fullName) return;
    teamFor.current = project.fullName;
    store().loadTeam();
  }, [mode, account, needsReauth, project, store]);

  const dirty = () => {
    if (isDirty) return isDirty();
    const code = getCode();
    return project ? store().isDirty(code) : Boolean(code.trim());
  };

  /** 반드시 클릭 처리 안에서 부릅니다. store().connect()가 await 전에 GitHub 창을 엽니다. */
  async function connect() {
    setNotice('');
    const result = await store().connect();
    if (result.switched) {
      // 다른 계정으로 바뀌었으면 앞 계정에서 하려던 저장을 새 계정에 하지 않습니다.
      pendingRef.current = null;
      setNotice(ui("다른 GitHub 계정으로 바뀌어 하려던 작업을 멈췄습니다."));
    }
    if (result.status !== 'ok') return;
    listedFor.current = store().account?.login || '';
    teamFor.current = '';
    store().loadProjects();
    store().loadInvitations();
    if (pendingRef.current) {
      const resume = pendingRef.current;
      pendingRef.current = null;
      resume();
    }
  }

  function disconnect() {
    store().disconnect();
    pendingRef.current = null;
    listedFor.current = '';
    teamFor.current = '';
    setNotice(ui("GitHub 연결을 해제했습니다."));
  }

  /** 다시 연결이 필요해 멈춘 작업만 남겨 두었다가 이어서 합니다. */
  const keepIfAuth = (result, resume) => { pendingRef.current = result.status === 'error' && result.reason === 'auth' ? resume : null; };

  async function save(event) {
    event?.preventDefault();
    const text = message.trim();
    if (!text) return;
    setNotice('');
    const result = await store().commit(getCode(), { message: text, record: { did, blocker, next } });
    keepIfAuth(result, () => save());
    if (result.status === 'saved') {
      setMessage(''); setDid(''); setBlocker(''); setNext('');
      setNotice(ui("GitHub에 저장했습니다."));
      onSaved?.(result);
    } else if (result.status === 'unchanged') {
      setNotice(ui("바뀐 코드가 없어 저장하지 않았습니다."));
    }
  }

  async function resolve(choice) {
    setNotice('');
    const result = await store().resolveConflict(choice);
    keepIfAuth(result, () => resolve(choice));
    if (result.status === 'loaded') {
      onLoaded?.(result.code, result.title);
      setNotice(ui("팀원이 저장한 최신 코드를 가져왔습니다."));
    } else if (result.status === 'saved') {
      setMessage(''); setDid(''); setBlocker(''); setNext('');
      setNotice(ui("GitHub에 저장했습니다."));
      onSaved?.(result);
    }
  }

  async function doCreate() {
    const name = title.trim();
    if (!name) return;
    setNotice('');
    const result = await store().createProject({ title: name, code: getCode() });
    keepIfAuth(result, () => doCreate());
    if (result.status !== 'created') return;
    setNotice(ui`${result.project.repo} 저장소를 만들고 지금 코드를 저장했습니다.`);
    onSaved?.(result);
  }

  function create(event) {
    event.preventDefault();
    doCreate();
  }

  async function doOpen(fullName) {
    setNotice('');
    const result = await store().openProject(fullName);
    keepIfAuth(result, () => doOpen(fullName));
    if (result.status !== 'opened') return;
    if (result.empty) {
      // 코드가 없는 프로젝트: 편집기를 비우지 않습니다.
      setNotice(ui("이 프로젝트에는 아직 코드가 없습니다. 지금 코드를 저장하면 프로젝트의 코드가 됩니다."));
      return;
    }
    onLoaded?.(result.code, result.title);
    setNotice(ui`${result.title} 프로젝트를 열었습니다.`);
  }

  function open(fullName) {
    if (dirty() && !window.confirm(ui("편집기에 저장하지 않은 변경이 있고, 프로젝트를 열면 편집기의 코드가 바뀝니다. 계속할까요?"))) return;
    doOpen(fullName);
  }

  async function doPull() {
    setNotice('');
    const result = await store().pullLatest();
    keepIfAuth(result, () => doPull());
    if (result.status !== 'loaded') return;
    if (!result.empty) onLoaded?.(result.code, result.title);
    teamFor.current = '';
    store().loadTeam();
    setNotice(result.changed ? ui("팀원이 저장한 최신 코드를 가져왔습니다.") : ui("GitHub의 코드가 이미 최신입니다."));
  }

  function pull() {
    if (dirty() && !window.confirm(ui("편집기에 GitHub에 저장하지 않은 변경이 있고, 최신 코드를 가져오면 이 변경은 사라집니다. 계속할까요?"))) return;
    doPull();
  }

  function detach() {
    store().detach();
    teamFor.current = '';
    setNotice(ui("프로젝트 연결을 끊었습니다. 편집기의 코드와 GitHub 저장소는 그대로 있습니다."));
  }

  async function invite(event) {
    event.preventDefault();
    if (!inviteName.trim()) return;
    setNotice('');
    const result = await store().invite(inviteName);
    if (result.status === 'invited') {
      setInviteName('');
      setNotice(ui`${result.username} 님을 초대했습니다. 초대받은 사람이 GitHub 또는 이 창의 받은 초대에서 수락하면 팀원이 됩니다.`);
    } else if (result.status === 'already') {
      setInviteName('');
      setNotice(ui`${result.username} 님은 이미 팀원입니다.`);
    }
  }

  async function cancelInvite(id) {
    setNotice('');
    const result = await store().cancelInvitation(id);
    if (result.status === 'cancelled') setNotice(ui("초대를 취소했습니다."));
  }

  async function accept(id) {
    setNotice('');
    const result = await store().acceptInvitation(id);
    if (result.status === 'accepted') setNotice(ui("초대를 수락했습니다. 내 프로젝트 목록에서 열 수 있습니다."));
  }

  function refresh() {
    store().loadProjects();
    store().loadInvitations();
    if (project) store().loadTeam();
  }

  const button = 'toolbar-btn';
  const primary = { backgroundColor: 'var(--color-accent)', color: 'var(--color-text-on-accent, #fff)', borderColor: 'var(--color-accent)' };
  const secondary = { color: 'var(--color-text-secondary)' };
  const muted = { color: 'var(--color-text-muted)' };
  const warning = { color: 'var(--color-warning-text, var(--color-text-primary))' };
  const box = { border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' };
  const inputClass = 'w-full min-w-0 text-sm py-2 px-3 rounded-md outline-none';
  const reason = error?.reason;
  const showError = reason
    && !(reason === 'auth' && needsReauth)
    && !(reason === 'scope' && missingScope)
    && !(reason === 'notConfigured' && !configured);
  const heading = mode === 'commit' ? ui("GitHub에 저장") : ui("GitHub 팀 프로젝트");

  const projectSummary = project && (
    <div className="flex flex-col gap-1 text-sm" data-testid="github-project">
      <span className="font-semibold truncate">{project.title}</span>
      <span className="text-xs truncate" style={secondary}>
        {ui("저장소")}{' '}<ExternalLink href={project.htmlUrl}>{project.fullName}</ExternalLink>
      </span>
      {project.pagesUrl && (
        <span className="text-xs truncate" style={secondary}>
          {ui("게시 주소")}{' '}<ExternalLink href={project.pagesUrl}>{project.pagesUrl}</ExternalLink>
        </span>
      )}
    </div>
  );

  const createForm = (
    <form onSubmit={create} className="flex flex-col gap-2" data-testid="github-create-form">
      <label htmlFor="github-project-title" className="text-xs font-semibold">{ui("새 프로젝트 제목")}</label>
      <div className="flex items-stretch gap-2">
        <input
          id="github-project-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={100}
          className={inputClass}
          style={box}
          data-testid="github-project-title"
        />
        <button type="submit" className={`${button} shrink-0`} style={primary} disabled={working || !title.trim()} data-testid="github-create">
          {busy === 'create' ? ui("만드는 중…") : ui("지금 코드로 프로젝트 만들기")}
        </button>
      </div>
      <p className="m-0 text-xs" style={muted}>{ui("프로젝트는 GitHub의 공개 저장소로 만들어지며 누구나 코드를 볼 수 있습니다.")}</p>
    </form>
  );

  const projectLists = (
    <>
      {(invitations.length > 0 || invitationsUnavailable) && (
        <section className="flex flex-col gap-1" aria-label={ui("받은 초대")} data-testid="github-invitations">
          <h3 className="m-0 text-xs font-semibold">{ui("받은 초대")}</h3>
          {invitationsUnavailable && <p className="m-0 text-xs" style={muted}>{ui("받은 초대를 읽지 못했습니다. GitHub의 알림에서도 초대를 수락할 수 있습니다.")}</p>}
          {invitations.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 text-sm px-3 py-2 rounded-md" style={{ border: '1px solid var(--color-border)' }}>
              <span className="min-w-0 flex flex-col">
                <span className="truncate">{item.title}</span>
                <span className="text-xs truncate" style={muted}>{item.fullName}{item.inviter ? ` · ${ui`${item.inviter} 님의 초대`}` : ''}</span>
              </span>
              <button type="button" className={`${button} shrink-0`} disabled={working} onClick={() => accept(item.id)} aria-label={ui`${item.title} 초대 수락`}>
                {ui("수락")}
              </button>
            </div>
          ))}
        </section>
      )}
      <section className="flex flex-col gap-1" aria-label={ui("내 프로젝트")}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 text-xs font-semibold">{ui("내 프로젝트")}</h3>
          <button type="button" className="underline cursor-pointer border-none bg-transparent p-0 text-xs" style={secondary} disabled={working || listing} onClick={refresh}>{ui("목록 새로 고침")}</button>
        </div>
        <div className="flex flex-col gap-1 overflow-auto" style={{ maxHeight: 200 }} data-testid="github-project-list">
          {listing && projects.length === 0 && <p className="m-0 text-sm" style={muted}>{ui("프로젝트 목록을 불러오는 중…")}</p>}
          {!listing && projects.length === 0 && <p className="m-0 text-sm" style={muted}>{ui("아직 VPyLab 프로젝트가 없습니다. 아래에서 지금 코드로 프로젝트를 만들 수 있습니다.")}</p>}
          {projects.map((item) => (
            <button
              key={item.fullName}
              type="button"
              disabled={working}
              onClick={() => open(item.fullName)}
              className="flex items-center justify-between gap-3 text-left text-sm px-3 py-2 rounded-md cursor-pointer"
              style={{ border: '1px solid var(--color-border)', backgroundColor: item.fullName === project?.fullName ? 'var(--color-bg-secondary)' : 'transparent', color: 'var(--color-text-primary)' }}
            >
              <span className="min-w-0 flex flex-col">
                <span className="truncate">{item.title}</span>
                <span className="text-xs truncate" style={muted}>{item.fullName}</span>
              </span>
              <span className="text-xs shrink-0" style={muted}>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}</span>
            </button>
          ))}
        </div>
      </section>
      {createForm}
    </>
  );

  let body;
  if (!configured) {
    body = <p className="m-0 text-sm" style={secondary} data-testid="github-not-configured">{ui(GITHUB_REASON_TEXT.notConfigured)}</p>;
  } else if (!account) {
    body = (
      <>
        <p className="m-0 text-sm" style={secondary}>
          {ui("GitHub는 팀 프로젝트와 공개 프로젝트에 사용하는 선택 기능입니다. 13세 이상이고 GitHub 계정이 있어야 사용할 수 있습니다.")}
        </p>
        <p className="m-0 text-sm" style={secondary}>{ui("혼자 작업하는 코드는 구글 드라이브에 저장합니다.")}</p>
        <button type="button" className={button} style={primary} disabled={working} onClick={connect} data-testid="github-connect">
          {busy === 'connect' ? ui("GitHub 창에서 연결을 진행하고 있습니다…") : ui("GitHub 연결")}
        </button>
      </>
    );
  } else if (needsReauth || missingScope) {
    body = (
      <>
        <p className="m-0 text-sm" role="alert" style={warning}>{ui(needsReauth ? GITHUB_REASON_TEXT.auth : GITHUB_REASON_TEXT.scope)}</p>
        <button type="button" className={button} style={primary} disabled={working} onClick={connect} data-testid="github-reconnect">
          {busy === 'connect' ? ui("GitHub 창에서 연결을 진행하고 있습니다…") : ui("다시 연결")}
        </button>
      </>
    );
  } else if (conflict) {
    body = (
      <>
        <p className="m-0 text-sm" role="alert" style={warning} data-testid="github-conflict">
          {ui("팀원이 먼저 저장했습니다. 최신 코드를 가져오거나 내 코드로 저장할 수 있습니다. 내 코드로 저장해도 팀원의 저장은 GitHub의 저장 기록에 남습니다.")}
        </p>
        <div className="flex flex-col gap-2">
          <button type="button" className={button} disabled={working} onClick={() => resolve('remote')} data-testid="github-conflict-remote">{ui("최신 코드 가져오기(내 변경은 버림)")}</button>
          <button type="button" className={button} disabled={working} onClick={() => resolve('overwrite')} data-testid="github-conflict-overwrite">
            {busy === 'save' ? ui("저장 중…") : ui("내 코드로 저장")}
          </button>
        </div>
      </>
    );
  } else if (mode === 'commit' && project) {
    body = (
      <>
        {projectSummary}
        <form onSubmit={save} className="flex flex-col gap-2" data-testid="github-commit-form">
          <label htmlFor="github-commit-message" className="text-xs font-semibold">{ui("저장 메시지(필수)")}</label>
          <input
            id="github-commit-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={200}
            required
            autoFocus
            placeholder={ui("무엇을 바꿨는지 한 줄로 적습니다")}
            className={inputClass}
            style={box}
            data-testid="github-commit-message"
          />
          <label htmlFor="github-record-did" className="text-xs font-semibold">{ui("한 일(선택)")}</label>
          <input id="github-record-did" value={did} onChange={(event) => setDid(event.target.value)} maxLength={500} className={inputClass} style={box} data-testid="github-record-did" />
          <label htmlFor="github-record-blocker" className="text-xs font-semibold">{ui("막힌 점(선택)")}</label>
          <input id="github-record-blocker" value={blocker} onChange={(event) => setBlocker(event.target.value)} maxLength={500} className={inputClass} style={box} data-testid="github-record-blocker" />
          <label htmlFor="github-record-next" className="text-xs font-semibold">{ui("다음 할 일(선택)")}</label>
          <input id="github-record-next" value={next} onChange={(event) => setNext(event.target.value)} maxLength={500} className={inputClass} style={box} data-testid="github-record-next" />
          <button type="submit" className={button} style={primary} disabled={working || !message.trim()} data-testid="github-commit-save">
            {busy === 'save' ? ui("저장 중…") : ui("GitHub에 저장")}
          </button>
        </form>
        {lastCommitUrl && (
          <p className="m-0 text-xs" style={secondary}><ExternalLink href={lastCommitUrl}>{ui("방금 저장한 내용을 GitHub에서 보기")}</ExternalLink></p>
        )}
      </>
    );
  } else {
    body = (
      <>
        {mode === 'commit' && <p className="m-0 text-sm" role="alert" style={warning} data-testid="github-no-project">{ui(GITHUB_REASON_TEXT.noProject)}</p>}
        {project && (
          <section className="flex flex-col gap-2 rounded-md p-3" style={{ border: '1px solid var(--color-border)' }} aria-label={ui("열려 있는 프로젝트")}>
            {projectSummary}
            {!project.canPush && <p className="m-0 text-xs" style={warning}>{ui(GITHUB_REASON_TEXT.readOnly)}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={button} disabled={working} onClick={pull} data-testid="github-pull">{busy === 'pull' ? ui("가져오는 중…") : ui("최신 코드 가져오기")}</button>
              <button type="button" className={button} disabled={working} onClick={detach} data-testid="github-detach">{ui("프로젝트 연결 끊기")}</button>
            </div>

            <h3 className="m-0 text-xs font-semibold">{ui("팀원")}</h3>
            {teamLoading && collaborators.length === 0 && <p className="m-0 text-xs" style={muted}>{ui("팀 정보를 불러오는 중…")}</p>}
            {collaborators.length > 0 && (
              <ul className="m-0 p-0 flex flex-wrap gap-2 text-xs" style={{ listStyle: 'none' }} data-testid="github-collaborators">
                {collaborators.map((member) => (
                  <li key={member.login} className="px-2 py-1 rounded-md" style={{ border: '1px solid var(--color-border)' }}>
                    {member.login}{member.isOwner ? ` (${ui("소유자")})` : ''}
                  </li>
                ))}
              </ul>
            )}
            {project.canAdmin && (
              <form onSubmit={invite} className="flex items-stretch gap-2" data-testid="github-invite-form">
                <label htmlFor="github-invite-name" className="sr-only">{ui("초대할 GitHub 아이디")}</label>
                <input
                  id="github-invite-name"
                  value={inviteName}
                  onChange={(event) => setInviteName(event.target.value)}
                  maxLength={40}
                  placeholder={ui("초대할 GitHub 아이디")}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={inputClass}
                  style={box}
                  data-testid="github-invite-name"
                />
                <button type="submit" className={`${button} shrink-0`} disabled={working || !inviteName.trim()} data-testid="github-invite">
                  {busy === 'invite' ? ui("초대하는 중…") : ui("초대")}
                </button>
              </form>
            )}
            {pending.length > 0 && (
              <ul className="m-0 p-0 flex flex-col gap-1 text-xs" style={{ listStyle: 'none' }} data-testid="github-pending">
                {pending.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <span className="truncate" style={secondary}>{ui`${item.invitee || '?'} 님이 아직 초대를 수락하지 않았습니다.`}</span>
                    <button type="button" className="underline cursor-pointer border-none bg-transparent p-0 text-xs shrink-0" style={secondary} disabled={working} onClick={() => cancelInvite(item.id)} aria-label={ui`${item.invitee || '?'} 초대 취소`}>
                      {ui("초대 취소")}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {commits.length > 0 && (
              <>
                <h3 className="m-0 text-xs font-semibold">{ui("최근 저장 기록")}</h3>
                <ul className="m-0 p-0 flex flex-col gap-1 text-xs" style={{ listStyle: 'none' }} data-testid="github-commits">
                  {commits.map((item) => (
                    <li key={item.sha} className="flex items-center justify-between gap-2">
                      <span className="truncate"><ExternalLink href={item.url}>{firstLine(item.message) || item.sha.slice(0, 7)}</ExternalLink></span>
                      <span className="shrink-0" style={muted}>{item.author}{item.date ? ` · ${new Date(item.date).toLocaleString()}` : ''}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
        {projectLists}
      </>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }} onClick={() => !locked && onClose?.()} role="presentation" data-testid="github-dialog">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="rounded-2xl w-full flex flex-col gap-3 overflow-auto"
        style={{ maxWidth: 520, maxHeight: '90vh', backgroundColor: 'var(--color-bg-panel)', color: 'var(--color-text-primary)', padding: 20, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl, 0 24px 48px rgba(0,0,0,0.25))' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-base font-semibold">{heading}</h2>
          <button type="button" onClick={onClose} disabled={locked} className="w-7 h-7 rounded-md cursor-pointer border-none" style={{ backgroundColor: 'transparent', color: 'var(--color-text-muted)' }} aria-label={ui("닫기")}>✕</button>
        </div>
        {account && (
          <div className="flex flex-wrap items-center gap-2 text-xs" style={secondary}>
            <span data-testid="github-account">{account.login}</span>
            <button type="button" className="underline cursor-pointer border-none bg-transparent p-0 text-xs" style={secondary} disabled={locked} onClick={disconnect} data-testid="github-disconnect">{ui("GitHub 연결 해제")}</button>
          </div>
        )}
        {body}
        {pagesWarning && GITHUB_PAGES_WARNING_TEXT[pagesWarning] && (
          <p className="m-0 text-xs" role="status" style={warning} data-testid="github-pages-warning">{ui(GITHUB_PAGES_WARNING_TEXT[pagesWarning])}</p>
        )}
        {showError && (
          <p className="m-0 text-xs" role="alert" style={{ color: 'var(--color-error-text)' }} data-testid="github-error">
            {ui(GITHUB_REASON_TEXT[reason] || GITHUB_REASON_TEXT.unknown)}{/^\d{3}$/.test(error.detail || '') ? ` (${error.detail})` : ''}
          </p>
        )}
        {notice && (
          <p className="m-0 text-xs" role="status" style={{ color: 'var(--color-success-text)' }} data-testid="github-notice">
            {notice}{' '}
            {!account && <a href={GITHUB_LOGOUT_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>{ui("공용 컴퓨터에서는 GitHub에서도 로그아웃해야 합니다.")}</a>}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
