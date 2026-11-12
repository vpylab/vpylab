import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../drive-lab/fake-google.js';
import { createFakeGitHub } from '../../github/fake-github.js';
import { GALLERY_TOPIC, PROJECT_TOPIC } from '../../github/github-api.js';
import { configureGitHub, useGitHubStore } from '../../github/githubSession.js';
import GitHubAddon from './GitHubAddon.jsx';
import GitHubProjectDialog from './GitHubProjectDialog.jsx';

// 팀 프로젝트 창의 "갤러리" 구역(GitHub 연동 갤러리 애드온). 갤러리가 꺼진 배포에서는 구역이 보이지 않아야 합니다.

const JPEG = `data:image/jpeg;base64,${btoa('fake jpeg bytes')}`;
let github;
let token;
const store = useGitHubStore.getState;

function configure() {
  configureGitHub({
    clientId: 'client-1',
    fetchImpl: github.fetchImpl,
    storage: memoryStorage(),
    origin: 'https://vpylab.example',
    login: () => ({ promise: Promise.resolve({ accessToken: token, scope: 'public_repo,repo:invite' }), cancel: () => {}, url: '', state: 's' }),
    apiOptions: { sleep: async () => {} },
    buildHtml: (code) => `<html>${code}</html>`,
    openUrl: () => 'https://vpylab.example/sandbox#code=x',
  });
}

beforeEach(() => {
  github = createFakeGitHub({ tokens: { 'token-ada': 'ada', 'token-bo': 'bo' } });
  token = 'token-ada';
  configure();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function connectedWithProject() {
  await store().connect();
  const created = await store().createProject({ title: '공 튀기기', code: 'v1' });
  return created.project.fullName;
}

const renderDialog = (props = {}) => render(<GitHubProjectDialog mode="projects" getCode={() => 'v1'} onClose={() => {}} gallery {...props} />);

describe('팀 프로젝트 창의 갤러리 구역', () => {
  it('올리기 전: 공개되는 것을 알리고, 누르면 그림을 저장하고 표시를 붙인다', async () => {
    const fullName = await connectedWithProject();
    const getThumbnail = vi.fn(() => JPEG);
    renderDialog({ getThumbnail });
    const section = await screen.findByTestId('github-gallery');
    expect(section).toHaveTextContent('교사가 승인하면 갤러리에 표시됩니다.');
    expect(section).toHaveTextContent('누구나 코드, 미리보기 그림, 내 GitHub 아이디를 볼 수 있습니다.');
    expect(screen.queryByTestId('github-gallery-unlist')).toBeNull();

    fireEvent.click(screen.getByTestId('github-gallery-list'));
    expect(await screen.findByTestId('github-notice')).toHaveTextContent('갤러리에 올렸고 미리보기 그림도 저장했습니다.');
    expect(getThumbnail).toHaveBeenCalledTimes(1);
    expect([...github.repo(fullName).topics].sort()).toEqual([GALLERY_TOPIC, PROJECT_TOPIC].sort());
    expect(github.file(fullName, 'thumbnail.jpg')).toBeTruthy();
    // 올린 뒤: 상태 안내, 그림 새로 올리기, 내리기
    expect(screen.getByTestId('github-gallery')).toHaveTextContent('이 프로젝트는 갤러리에 올린 상태입니다.');
    expect(screen.getByTestId('github-gallery-thumbnail')).toBeInTheDocument();
    expect(screen.queryByTestId('github-gallery-list')).toBeNull();
  });

  it('미리보기 그림이 없어도(함수가 없거나 null이거나 실패해도) 올리기는 된다', async () => {
    const fullName = await connectedWithProject();
    const view = renderDialog();
    fireEvent.click(await screen.findByTestId('github-gallery-list'));
    const notice = await screen.findByTestId('github-notice');
    expect(notice).toHaveTextContent('갤러리에 올렸습니다. 미리보기 그림은 저장하지 못했습니다.');
    expect(notice).toHaveTextContent('"미리보기 그림 새로 올리기"를 누릅니다.');
    expect(github.repo(fullName).topics.has(GALLERY_TOPIC)).toBe(true);
    expect(github.file(fullName, 'thumbnail.jpg')).toBeUndefined();
    view.unmount();

    // 그림을 만드는 함수가 오류를 내도 올리기는 진행합니다.
    await store().setGalleryListing(false);
    renderDialog({ getThumbnail: () => { throw new Error('캔버스 없음'); } });
    fireEvent.click(await screen.findByTestId('github-gallery-list'));
    await waitFor(() => expect(github.repo(fullName).topics.has(GALLERY_TOPIC)).toBe(true));
  });

  it('미리보기 그림 새로 올리기와 갤러리에서 내리기', async () => {
    const fullName = await connectedWithProject();
    await store().setGalleryListing(true);
    renderDialog({ getThumbnail: () => JPEG });
    fireEvent.click(await screen.findByTestId('github-gallery-thumbnail'));
    await waitFor(() => expect(github.file(fullName, 'thumbnail.jpg')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('github-gallery-unlist')).not.toBeDisabled());

    fireEvent.click(screen.getByTestId('github-gallery-unlist'));
    const notice = await screen.findByTestId('github-notice');
    await waitFor(() => expect(notice).toHaveTextContent('갤러리에서 내렸습니다.'));
    expect(notice).toHaveTextContent('GitHub 저장소와 코드는 그대로 남습니다.');
    expect(github.repo(fullName).topics.has(GALLERY_TOPIC)).toBe(false);
    expect(github.repo(fullName).topics.has(PROJECT_TOPIC)).toBe(true);
    expect(github.file(fullName, 'thumbnail.jpg')).toBeTruthy(); // 저장소의 파일은 지우지 않습니다.
    expect(screen.getByTestId('github-gallery-list')).toBeInTheDocument();
  });

  it('저장소 소유자가 아닌 팀원에게는 버튼 대신 까닭을 보인다', async () => {
    const fullName = await connectedWithProject();
    github.repo(fullName).collaborators.add('bo');
    token = 'token-bo';
    await store().connect();
    await store().openProject(fullName);
    renderDialog();
    expect(await screen.findByTestId('github-gallery')).toHaveTextContent('저장소 소유자만 할 수 있습니다.');
    expect(screen.queryByTestId('github-gallery-list')).toBeNull();
    expect(screen.queryByTestId('github-gallery-unlist')).toBeNull();
  });

  it('GitHub가 거절하면 이 창 안에서 알리고 올린 상태로 바꾸지 않는다', async () => {
    const fullName = await connectedWithProject();
    renderDialog();
    github.failNext({ method: 'PUT', test: /\/topics$/, status: 403, body: { message: 'Resource not accessible' } });
    fireEvent.click(await screen.findByTestId('github-gallery-list'));
    expect(await screen.findByTestId('github-error')).toHaveTextContent('GitHub가 요청을 거부했습니다.');
    expect(github.repo(fullName).topics.has(GALLERY_TOPIC)).toBe(false);
    expect(screen.getByTestId('github-gallery-list')).not.toBeDisabled();
  });

  it('갤러리가 꺼진 배포에서는 구역이 보이지 않고 팀 프로젝트는 그대로 동작한다', async () => {
    await connectedWithProject();
    render(<GitHubProjectDialog mode="projects" getCode={() => 'v1'} onClose={() => {}} />); // 기본값: 목록 주소가 없는 배포
    expect(await screen.findByTestId('github-project')).toHaveTextContent('공 튀기기');
    expect(screen.queryByTestId('github-gallery')).toBeNull();
    expect(screen.getByTestId('github-pull')).toBeInTheDocument();
  });
});

describe('만들기 화면이 넘겨주는 미리보기 그림(GitHubAddon의 선택 prop)', () => {
  it('prop이 없어도 애드온은 그대로 동작한다', async () => {
    const controlRef = { current: null };
    render(<GitHubAddon controlRef={controlRef} code="v1" getCode={() => 'v1'} defaultTitle="내 작품" shouldRestore={() => true} />);
    expect(controlRef.current.hasProject()).toBe(false);
  });
});
