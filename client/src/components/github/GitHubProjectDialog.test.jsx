import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../drive-lab/fake-google.js';
import { createFakeGitHub } from '../../github/fake-github.js';
import { PROJECT_TOPIC } from '../../github/github-api.js';
import { GitHubOAuthError } from '../../github/github-oauth.js';
import { configureGitHub, useGitHubStore } from '../../github/githubSession.js';
import GitHubProjectDialog from './GitHubProjectDialog.jsx';

let github;
let logins;
let loginCalls;
const store = useGitHubStore.getState;

function fakeLogin(options) {
  loginCalls.push(options);
  const next = logins.length ? logins.shift() : { accessToken: 'token-ada', scope: 'public_repo,repo:invite' };
  const promise = next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  promise.catch(() => {});
  return { promise, cancel: () => {}, url: '', state: 's' };
}

function configure(extra = {}) {
  configureGitHub({
    clientId: 'client-1',
    fetchImpl: github.fetchImpl,
    storage: memoryStorage(),
    origin: 'https://vpylab.example',
    login: fakeLogin,
    apiOptions: { sleep: async () => {} },
    buildHtml: (code) => `<html>${code}</html>`,
    openUrl: () => 'https://vpylab.example/sandbox#code=x',
    ...extra,
  });
}

beforeEach(() => {
  github = createFakeGitHub({ tokens: { 'token-ada': 'ada', 'token-bo': 'bo', 'token-ada-2': 'ada' } });
  logins = [];
  loginCalls = [];
  configure();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function connectedWithProject(code = 'v1') {
  await store().connect();
  const created = await store().createProject({ title: '공 튀기기', code });
  return created.project.fullName;
}

describe('GitHubProjectDialog', () => {
  it('연결 전: 선택 기능·13세 이상·드라이브 안내와 연결 버튼을 보이고, 누르는 즉시 로그인을 시작한다', async () => {
    render(<GitHubProjectDialog mode="projects" getCode={() => 'sphere()'} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'GitHub 팀 프로젝트' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveTextContent('팀 프로젝트와 공개 프로젝트에 사용하는 선택 기능');
    expect(dialog).toHaveTextContent('13세 이상이고 GitHub 계정이 있어야');
    expect(dialog).toHaveTextContent('혼자 작업하는 코드는 구글 드라이브에 저장합니다.');
    fireEvent.click(screen.getByTestId('github-connect'));
    expect(loginCalls).toHaveLength(1); // 클릭 처리 안에서 바로 시작
    await waitFor(() => expect(screen.getByTestId('github-account')).toHaveTextContent('ada'));
  });

  it('GitHub가 설정되지 않은 사이트에서는 연결 버튼 없이 안내만 보인다', () => {
    configure({ clientId: '' });
    render(<GitHubProjectDialog mode="projects" getCode={() => ''} onClose={() => {}} />);
    expect(screen.getByTestId('github-not-configured')).toHaveTextContent('구글 드라이브 저장은 그대로 사용할 수 있습니다');
    expect(screen.queryByTestId('github-connect')).toBeNull();
  });

  it('팝업이 막히면 그 까닭을 이 창 안에서 안내하고 다시 누를 수 있다', async () => {
    logins = [new GitHubOAuthError('popupBlocked')];
    render(<GitHubProjectDialog mode="projects" getCode={() => ''} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('github-connect'));
    expect(await screen.findByTestId('github-error')).toHaveTextContent('팝업 차단을 해제');
    expect(screen.getByTestId('github-connect')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('github-connect'));
    await waitFor(() => expect(screen.getByTestId('github-account')).toHaveTextContent('ada'));
    expect(screen.queryByTestId('github-error')).toBeNull();
  });

  it('새 프로젝트: 제목을 넣고 만들면 지금 코드로 저장소를 만들고 onSaved를 부른다', async () => {
    const onSaved = vi.fn();
    render(<GitHubProjectDialog mode="projects" getCode={() => 'sphere()'} defaultTitle="공 튀기기" onSaved={onSaved} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('github-connect'));
    const titleInput = await screen.findByTestId('github-project-title');
    expect(titleInput).toHaveValue('공 튀기기');
    expect(screen.getByRole('dialog')).toHaveTextContent('공개 저장소로 만들어지며 누구나 코드를 볼 수 있습니다');
    fireEvent.click(screen.getByTestId('github-create'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ status: 'created' })));
    const { fullName } = store().project;
    expect(github.file(fullName, 'main.py')).toBe('sphere()');
    const summary = screen.getByTestId('github-project');
    expect(within(summary).getByRole('link', { name: fullName })).toHaveAttribute('href', `https://github.com/${fullName}`);
    expect(within(summary).getByRole('link', { name: /github\.io/ })).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('내 프로젝트를 고르면 코드를 onLoaded로 넘기고, 저장하지 않은 변경이 있으면 먼저 묻는다', async () => {
    github.createRepo('ada', 'solar', { description: '태양계', topics: [PROJECT_TOPIC], files: { 'main.py': 'sun = sphere()' } });
    const onLoaded = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    let dirty = true;
    render(<GitHubProjectDialog mode="projects" getCode={() => 'mine'} isDirty={() => dirty} onLoaded={onLoaded} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('github-connect'));
    const item = await screen.findByRole('button', { name: /태양계/ });
    fireEvent.click(item);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(onLoaded).not.toHaveBeenCalled();
    dirty = false;
    fireEvent.click(item);
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith('sun = sphere()', '태양계'));
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('코드가 없는 프로젝트를 열면 편집기를 비우지 않고 안내한다', async () => {
    github.createRepo('ada', 'blank', { description: '빈 프로젝트', topics: [PROJECT_TOPIC] });
    const onLoaded = vi.fn();
    render(<GitHubProjectDialog mode="projects" getCode={() => ''} onLoaded={onLoaded} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('github-connect'));
    fireEvent.click(await screen.findByRole('button', { name: /빈 프로젝트/ }));
    expect(await screen.findByTestId('github-notice')).toHaveTextContent('아직 코드가 없습니다');
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it('받은 초대를 수락하면 내 프로젝트 목록에 나타난다', async () => {
    github.createRepo('bo', 'team', { description: '우리 팀', topics: [PROJECT_TOPIC], files: { 'main.py': 'x' } });
    github.state.userInvitations.push({ id: 77, repoKey: 'bo/team', invitee: 'ada', inviter: 'bo', expired: false });
    github.repo('bo/team').invitations.push({ id: 77, invitee: 'ada', inviter: 'bo', expired: false });
    render(<GitHubProjectDialog mode="projects" getCode={() => ''} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('github-connect'));
    const invitations = await screen.findByTestId('github-invitations');
    expect(invitations).toHaveTextContent('bo 님의 초대');
    fireEvent.click(within(invitations).getByRole('button', { name: '우리 팀 초대 수락' }));
    await waitFor(() => expect(within(screen.getByTestId('github-project-list')).getByRole('button', { name: /우리 팀/ })).toBeInTheDocument());
    expect(screen.queryByTestId('github-invitations')).toBeNull();
  });

  it('연 프로젝트: 팀원·저장 기록을 보이고, 초대·초대 취소·최신 코드 가져오기·연결 끊기가 동작한다', async () => {
    const fullName = await connectedWithProject('v1');
    const onLoaded = vi.fn();
    render(<GitHubProjectDialog mode="projects" getCode={() => 'v1'} onLoaded={onLoaded} onClose={() => {}} />);
    expect(await screen.findByTestId('github-collaborators')).toHaveTextContent('ada (소유자)');
    expect(screen.getByTestId('github-commits')).toHaveTextContent('프로젝트 시작: 공 튀기기');

    fireEvent.change(screen.getByTestId('github-invite-name'), { target: { value: 'bo' } });
    fireEvent.click(screen.getByTestId('github-invite'));
    expect(await screen.findByTestId('github-pending')).toHaveTextContent('bo 님이 아직 초대를 수락하지 않았습니다.');
    expect(screen.getByTestId('github-notice')).toHaveTextContent('bo 님을 초대했습니다');
    fireEvent.click(screen.getByRole('button', { name: 'bo 초대 취소' }));
    await waitFor(() => expect(screen.queryByTestId('github-pending')).toBeNull());
    expect(github.repo(fullName).invitations).toEqual([]);

    fireEvent.change(screen.getByTestId('github-invite-name'), { target: { value: 'bad name' } });
    fireEvent.click(screen.getByTestId('github-invite'));
    expect(await screen.findByTestId('github-error')).toHaveTextContent('GitHub 아이디가 올바르지 않습니다');

    github.remoteCommit(fullName, { 'main.py': 'teammate' });
    fireEvent.click(screen.getByTestId('github-pull'));
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith('teammate', '공 튀기기'));

    fireEvent.click(screen.getByTestId('github-detach'));
    expect(store().project).toBeNull();
    expect(screen.getByTestId('github-notice')).toHaveTextContent('프로젝트 연결을 끊었습니다');
    expect(screen.queryByTestId('github-pull')).toBeNull();
  });

  it('저장: 메시지가 없으면 저장할 수 없고, 메시지와 기록 세 칸을 한 커밋으로 올린다', async () => {
    const fullName = await connectedWithProject('v1');
    const onSaved = vi.fn();
    render(<GitHubProjectDialog mode="commit" getCode={() => 'v2'} onSaved={onSaved} onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'GitHub에 저장' })).toBeInTheDocument();
    const save = screen.getByTestId('github-commit-save');
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByTestId('github-commit-message'), { target: { value: '중력 추가' } });
    fireEvent.change(screen.getByTestId('github-record-did'), { target: { value: '중력을 넣었다' } });
    fireEvent.change(screen.getByTestId('github-record-blocker'), { target: { value: '충돌' } });
    fireEvent.change(screen.getByTestId('github-record-next'), { target: { value: '바닥' } });
    fireEvent.click(save);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ status: 'saved' })));
    expect(github.file(fullName, 'main.py')).toBe('v2');
    expect(github.file(fullName, 'history.md')).toContain('- 메시지: 중력 추가\n- 작성자: ada\n- 한 일: 중력을 넣었다\n- 막힌 점: 충돌\n- 다음 할 일: 바닥');
    expect(screen.getByTestId('github-notice')).toHaveTextContent('GitHub에 저장했습니다.');
    expect(screen.getByTestId('github-commit-message')).toHaveValue('');
    expect(screen.getByRole('link', { name: '방금 저장한 내용을 GitHub에서 보기' })).toHaveAttribute('href', expect.stringMatching(new RegExp(`^https://github.com/${fullName}/commit/`)));
  });

  it('저장: 연 프로젝트가 없으면 안내하고 프로젝트를 만들거나 열 수 있게 한다', async () => {
    await store().connect();
    render(<GitHubProjectDialog mode="commit" getCode={() => 'v1'} defaultTitle="새 작품" onClose={() => {}} />);
    expect(screen.getByTestId('github-no-project')).toHaveTextContent('열려 있는 GitHub 프로젝트가 없습니다');
    expect(screen.getByTestId('github-create-form')).toBeInTheDocument();
    expect(screen.queryByTestId('github-commit-form')).toBeNull();
  });

  it('충돌: "팀원이 먼저 저장했습니다"를 보이고, 최신 코드 가져오기는 onLoaded, 내 코드로 저장은 onSaved', async () => {
    const fullName = await connectedWithProject('v1');
    github.remoteCommit(fullName, { 'main.py': 'teammate' });
    const onLoaded = vi.fn();
    const onSaved = vi.fn();
    const view = render(<GitHubProjectDialog mode="commit" getCode={() => 'mine'} onLoaded={onLoaded} onSaved={onSaved} onClose={() => {}} />);
    fireEvent.change(screen.getByTestId('github-commit-message'), { target: { value: '내 저장' } });
    fireEvent.click(screen.getByTestId('github-commit-save'));
    expect(await screen.findByTestId('github-conflict')).toHaveTextContent('팀원이 먼저 저장했습니다');
    expect(onSaved).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('github-conflict-remote'));
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith('teammate', '공 튀기기'));
    expect(screen.queryByTestId('github-conflict')).toBeNull();
    view.unmount();

    // 다시 충돌한 뒤 내 코드로 저장
    github.remoteCommit(fullName, { 'main.py': 'teammate 2' });
    await store().commit('mine 2', { message: '다시' });
    render(<GitHubProjectDialog mode="commit" getCode={() => 'mine 2'} onLoaded={onLoaded} onSaved={onSaved} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('github-conflict-overwrite'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ status: 'saved' })));
    expect(github.file(fullName, 'main.py')).toBe('mine 2');
  });

  it('저장이 만료로 막히면 다시 연결한 뒤 그 저장을 이어서 한다', async () => {
    const fullName = await connectedWithProject('v1');
    const onSaved = vi.fn();
    render(<GitHubProjectDialog mode="commit" getCode={() => 'v2'} onSaved={onSaved} onClose={() => {}} />);
    github.revoke('token-ada');
    fireEvent.change(screen.getByTestId('github-commit-message'), { target: { value: '이어서' } });
    fireEvent.click(screen.getByTestId('github-commit-save'));
    const reconnect = await screen.findByTestId('github-reconnect');
    expect(screen.getByRole('dialog')).toHaveTextContent('GitHub 연결이 만료되었거나 해제되었습니다');
    expect(onSaved).not.toHaveBeenCalled();
    logins = [{ accessToken: 'token-ada-2', scope: 'public_repo,repo:invite' }];
    fireEvent.click(reconnect);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ status: 'saved' })));
    expect(github.file(fullName, 'main.py')).toBe('v2');
  });

  it('다시 연결에서 다른 계정이 들어오면 하려던 저장을 새 계정에 하지 않는다', async () => {
    const fullName = await connectedWithProject('v1');
    const onSaved = vi.fn();
    render(<GitHubProjectDialog mode="commit" getCode={() => 'v2'} onSaved={onSaved} onClose={() => {}} />);
    github.revoke('token-ada');
    fireEvent.change(screen.getByTestId('github-commit-message'), { target: { value: 'm' } });
    fireEvent.click(screen.getByTestId('github-commit-save'));
    logins = [{ accessToken: 'token-bo', scope: 'public_repo,repo:invite' }];
    fireEvent.click(await screen.findByTestId('github-reconnect'));
    await waitFor(() => expect(screen.getByTestId('github-account')).toHaveTextContent('bo'));
    expect(screen.getByTestId('github-notice')).toHaveTextContent('다른 GitHub 계정으로 바뀌어');
    expect(onSaved).not.toHaveBeenCalled();
    expect(github.file(fullName, 'main.py')).toBe('v1');
  });

  it('Pages를 켜지 못하면 프로젝트는 만들고 경고만 보인다', async () => {
    github.state.pagesForbidden = true;
    const onSaved = vi.fn();
    render(<GitHubProjectDialog mode="projects" getCode={() => 'a'} defaultTitle="t" onSaved={onSaved} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('github-connect'));
    fireEvent.click(await screen.findByTestId('github-create'));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(screen.getByTestId('github-pages-warning')).toHaveTextContent('게시 주소(GitHub Pages)를 켜지 못했습니다');
    expect(screen.queryByTestId('github-error')).toBeNull();
  });

  it('제목·코드·아이디는 글자로만 표시하고, GitHub가 아닌 주소에는 링크를 걸지 않는다', async () => {
    await store().connect();
    github.createRepo('ada', 'xss', { description: '<img src=x onerror=alert(1)>', topics: [PROJECT_TOPIC], files: { 'main.py': 'x' } });
    await store().openProject('ada/xss');
    useGitHubStore.setState((s) => ({
      project: { ...s.project, htmlUrl: 'javascript:alert(1)', pagesUrl: 'https://evil.example/ada.github.io/' },
      commits: [{ sha: 'abc1234', message: '<b>굵게</b>', author: 'ada', date: null, url: 'https://github.com.evil.example/x' }],
    }));
    render(<GitHubProjectDialog mode="commit" getCode={() => 'x'} onClose={() => {}} />);
    const summary = screen.getByTestId('github-project');
    expect(summary).toHaveTextContent('<img src=x onerror=alert(1)>');
    expect(summary.querySelector('img')).toBeNull();
    expect(within(summary).queryAllByRole('link')).toHaveLength(0);
  });

  it('Esc와 닫기 버튼으로 닫고, 저장하는 동안에는 닫지 않는다', async () => {
    await connectedWithProject('v1');
    const onClose = vi.fn();
    render(<GitHubProjectDialog mode="commit" getCode={() => 'v2'} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByTestId('github-commit-message'), { target: { value: 'm' } });
    fireEvent.click(screen.getByTestId('github-commit-save'));
    expect(screen.getByTestId('github-commit-save')).toBeDisabled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: '닫기' })).toBeDisabled();
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('button', { name: '닫기' })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('GitHub 연결 해제를 누르면 연결 전 화면으로 돌아가고 공용 컴퓨터 안내를 보인다', async () => {
    await connectedWithProject('v1');
    render(<GitHubProjectDialog mode="projects" getCode={() => 'v1'} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('github-disconnect'));
    expect(screen.getByTestId('github-connect')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /공용 컴퓨터에서는 GitHub에서도 로그아웃/ })).toHaveAttribute('href', 'https://github.com/logout');
    expect(store().account).toBeNull();
  });
});
