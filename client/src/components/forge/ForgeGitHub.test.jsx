import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../drive-lab/fake-google.js';
import { createFakeGitHub } from '../../github/fake-github.js';
import { configureGitHub, useGitHubStore } from '../../github/githubSession.js';
import { makeForgeModule } from '../../forge/modules.js';
import { createRecipe } from '../../forge/recipes.js';
import { FORGE_GITHUB_TEXT } from '../../forge/forge-text.js';
import * as githubRegistry from '../../forge/github-registry.js';
import { validateForgeIndex } from '../../../../server/shared/forge-rules.js';
import ForgeLibrary from './ForgeLibrary.jsx';
import ForgeGitHubPublish from './ForgeGitHubPublish.jsx';

// 대장간의 GitHub 방식 화면: 모두의 모듈 보기·가져오기, 공개 등록, 공개 내리기. GitHub는 fake-github.js가 흉내 냅니다.

const ID = '3f2c1a9e-0b7d-4c55-9a10-ffeeddccbbaa';
const bell = makeForgeModule(createRecipe('bell'), { id: ID, title: '맑은 종', description: '누르면 소리가 납니다' });
const forkOfBell = makeForgeModule(createRecipe('cat'), { id: 'cat-1', title: '종에서 온 고양이', source: { id: `gh:ada/${ID}`, title: '맑은 종', author: 'ada' } });
const forkOfUnknown = makeForgeModule(createRecipe('cat'), { id: 'cat-2', title: '출처가 없는 고양이', source: { id: 'gh:eve/unlisted', title: '없는 모듈', author: 'eve' } });
const entryOf = (owner, module) => ({ owner, id: module.id, sha: 'a'.repeat(40), updatedAt: '2026-11-10T01:02:03Z', module });
const indexOf = (...entries) => validateForgeIndex({ version: 1, generatedAt: '2026-11-12T03:00:00Z', items: entries });

let github;
beforeEach(() => {
  github = createFakeGitHub({ tokens: { 'token-ada': 'ada' } });
  configureGitHub({
    clientId: 'client-1',
    fetchImpl: github.fetchImpl,
    storage: memoryStorage(),
    origin: 'https://vpylab.example',
    login: () => ({ promise: Promise.resolve({ accessToken: 'token-ada', scope: 'public_repo,repo:invite' }), cancel: () => {}, url: '', state: 's' }),
    apiOptions: { sleep: async () => {} },
  });
});
afterEach(cleanup);

/** 목록 읽기만 견본으로 바꾼 등록 모듈 */
const registryWith = (index) => ({ ...githubRegistry, fetchPublicForgeModules: () => githubRegistry.fetchPublicForgeModules({ load: async () => index }) });
const library = (props) => render(<MemoryRouter><ForgeLibrary localModules={[]} onChoose={() => {}} {...props} /></MemoryRouter>);

describe('모듈 보관함 (GitHub 방식)', () => {
  it('로그인 없이 모두의 모듈을 보고 가져올 수 있다', async () => {
    const onChoose = vi.fn();
    library({ registry: 'github', github: registryWith(indexOf(entryOf('ada', bell), entryOf('bo', forkOfBell), entryOf('bo', forkOfUnknown))), onChoose });
    expect(screen.getByText(FORGE_GITHUB_TEXT.libraryIntro)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '모두의 모듈' }));
    await screen.findByText('맑은 종');
    expect(screen.getByText(/만든 사람 ·\s*ada/)).toBeTruthy();
    // 목록에 실린 원본만 링크로 보입니다.
    expect(screen.getByRole('link', { name: /맑은 종/ }).getAttribute('href')).toBe(`https://github.com/ada/vpylab-forge/blob/HEAD/modules/${ID}.py`);
    expect(screen.queryByRole('link', { name: /없는 모듈/ })).toBeNull();
    expect(screen.getByText(/없는 모듈/)).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: /포크해서 가져오기/ })[0]);
    await waitFor(() => expect(onChoose).toHaveBeenCalledTimes(1));
    expect(onChoose.mock.calls[0][0]).toMatchObject({ id: ID, ownerId: 'ada', publicListing: true });
    // GitHub에 연결하지 않은 탭에서는 GitHub에 아무 요청도 하지 않습니다.
    expect(github.state.log).toHaveLength(0);
    expect(screen.queryByText('내 모듈 공개 내리기')).toBeNull();
  });

  it('목록을 읽지 못하면 안내와 다시 시도 버튼을 보인다', async () => {
    let fail = true;
    const registry = { ...githubRegistry, fetchPublicForgeModules: async () => { if (fail) throw new Error(FORGE_GITHUB_TEXT.loadFailed); return githubRegistry.fetchPublicForgeModules({ load: async () => indexOf(entryOf('ada', bell)) }); } };
    library({ registry: 'github', github: registry });
    fireEvent.click(screen.getByRole('button', { name: '모두의 모듈' }));
    expect((await screen.findByRole('alert')).textContent).toContain(FORGE_GITHUB_TEXT.loadFailed);
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await screen.findByText('맑은 종');
  });

  it('연결한 탭에서는 내 모듈의 공개 상태를 보이고 공개를 내릴 수 있다', async () => {
    await useGitHubStore.getState().connect();
    await githubRegistry.publishForgeModule(bell);
    library({ registry: 'github', github: registryWith(indexOf(entryOf('ada', bell))), localModules: [bell, forkOfBell] });
    await screen.findByText('공개 중');
    expect(screen.getAllByText('내 모듈 공개 내리기')).toHaveLength(1);
    fireEvent.click(screen.getByText('내 모듈 공개 내리기'));
    await screen.findByText(FORGE_GITHUB_TEXT.unpublished);
    expect(github.file('ada/vpylab-forge', `modules/${ID}.py`)).toBeUndefined();
    expect(screen.queryByText('공개 중')).toBeNull();
    // 이 브라우저의 보관함에는 그대로 남습니다.
    expect(screen.getByText('맑은 종')).toBeTruthy();
  });

  it('서로 다른 사람이 같은 모듈 ID를 올려도 두 카드를 따로 보인다', async () => {
    const onChoose = vi.fn();
    library({ registry: 'github', github: registryWith(indexOf(entryOf('ada', bell), entryOf('bo', { ...bell, title: '보의 종' }))), onChoose });
    fireEvent.click(screen.getByRole('button', { name: '모두의 모듈' }));
    await screen.findByText('보의 종');
    expect(screen.getByText('맑은 종')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: /포크해서 가져오기/ })[1]);
    await waitFor(() => expect(onChoose).toHaveBeenCalledTimes(1));
    expect(onChoose.mock.calls[0][0]).toMatchObject({ ownerId: 'bo', title: '보의 종' });
  });

  it('공개를 내리는 동안에는 버튼을 다시 누를 수 없고, 내 저장소를 읽지 못해도 모두의 모듈에서 내릴 수 있다', async () => {
    await useGitHubStore.getState().connect();
    await githubRegistry.publishForgeModule(bell);
    // 내 저장소의 모듈 목록을 읽지 못한 경우(한도)
    github.failNext({ method: 'GET', test: /\/contents\/modules$/, status: 403, body: { message: 'API rate limit exceeded' }, times: 1 });
    library({ registry: 'github', github: registryWith(indexOf(entryOf('ada', bell))), localModules: [] });
    expect((await screen.findByRole('alert')).textContent).toContain(FORGE_GITHUB_TEXT.ownLoadFailed);
    fireEvent.click(screen.getByRole('button', { name: '모두의 모듈' }));
    const button = await screen.findByText('내 모듈 공개 내리기');
    fireEvent.click(button);
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    await screen.findByText(FORGE_GITHUB_TEXT.unpublished);
    expect(github.calls('DELETE', /\/contents\/modules\//)).toHaveLength(1);
    expect(screen.queryByText('맑은 종')).toBeNull();
  });

  it('다른 기기에서 올린 모듈도 내 모듈에 보인다', async () => {
    await useGitHubStore.getState().connect();
    await githubRegistry.publishForgeModule(bell);
    library({ registry: 'github', github: registryWith(indexOf()), localModules: [] });
    await screen.findByText('맑은 종');
    expect(screen.getByText('공개 중')).toBeTruthy();
  });
});

describe('모듈 보관함 (모두의 모듈이 없는 배포)', () => {
  it('모두의 모듈 탭을 보이지 않고 서버나 GitHub에 요청하지 않는다', () => {
    const registry = { ...githubRegistry, fetchOwnForgeModules: vi.fn(), fetchPublicForgeModules: vi.fn() };
    library({ registry: 'none', github: registry, localModules: [forkOfBell] });
    expect(screen.queryByRole('button', { name: '모두의 모듈' })).toBeNull();
    expect(screen.getByRole('button', { name: '내 모듈' })).toBeTruthy();
    expect(screen.getByText(FORGE_GITHUB_TEXT.localOnly)).toBeTruthy();
    expect(registry.fetchOwnForgeModules).not.toHaveBeenCalled();
    expect(registry.fetchPublicForgeModules).not.toHaveBeenCalled();
    // 가져온 모듈의 GitHub 출처는 링크로 남습니다.
    expect(screen.getByRole('link', { name: /맑은 종/ }).getAttribute('href')).toContain('github.com/ada/vpylab-forge');
  });
});

describe('작업대의 공개 등록 (GitHub 방식)', () => {
  it('연결 전에는 연결 버튼을, 연결한 뒤에는 공개 등록 버튼을 보인다', async () => {
    const onPublished = vi.fn();
    render(<ForgeGitHubPublish module={bell} onPublished={onPublished} />);
    expect(screen.getByText(FORGE_GITHUB_TEXT.publishIntro)).toBeTruthy();
    expect(screen.queryByTestId('forge-github-publish-button')).toBeNull();
    fireEvent.click(screen.getByTestId('forge-github-connect'));
    const button = await screen.findByTestId('forge-github-publish-button');
    expect(screen.getByText(/GitHub 아이디 ·\s*ada/)).toBeTruthy();

    fireEvent.click(button);
    const result = await screen.findByTestId('forge-github-result');
    expect(result.textContent).toContain(FORGE_GITHUB_TEXT.publishedFresh);
    expect(result.querySelector('a').getAttribute('href')).toBe(`https://github.com/ada/vpylab-forge/blob/HEAD/modules/${ID}.py`);
    expect(onPublished).toHaveBeenCalledWith(expect.objectContaining({ id: ID, ownerId: 'ada' }), ID);
    expect(github.file('ada/vpylab-forge', `modules/${ID}.py`)).toContain('# vpylab-forge:v1 ');

    fireEvent.click(screen.getByTestId('forge-github-publish-button'));
    await waitFor(() => expect(screen.getByTestId('forge-github-result').textContent).toContain(FORGE_GITHUB_TEXT.unchanged));
  });

  it('올리지 못하면 까닭을 보이고 성공으로 표시하지 않는다', async () => {
    await useGitHubStore.getState().connect();
    const onPublished = vi.fn();
    github.failNext({ method: 'POST', test: /^\/user\/repos$/, status: 403, body: { message: 'Resource not accessible' } });
    render(<ForgeGitHubPublish module={bell} onPublished={onPublished} />);
    fireEvent.click(await screen.findByTestId('forge-github-publish-button'));
    expect((await screen.findByTestId('forge-github-error')).textContent).toContain('GitHub가 요청을 거부했습니다');
    expect(screen.queryByTestId('forge-github-result')).toBeNull();
    expect(onPublished).not.toHaveBeenCalled();
  });

  it('연결이 만료되면 다시 연결 버튼으로 돌아간다', async () => {
    await useGitHubStore.getState().connect();
    github.revoke('token-ada');
    render(<ForgeGitHubPublish module={bell} />);
    fireEvent.click(await screen.findByTestId('forge-github-publish-button'));
    await waitFor(() => expect(screen.getByTestId('forge-github-connect').textContent).toBe('다시 연결'));
    // 알림은 하나만 보입니다.
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByTestId('forge-github-error').textContent).toContain('GitHub 연결이 만료되었거나 해제되었습니다');
  });

  it('작업대에서 다른 모듈을 열거나 모듈을 고치면 앞선 등록의 결과 안내를 거둔다', async () => {
    await useGitHubStore.getState().connect();
    const view = render(<ForgeGitHubPublish module={bell} />);
    fireEvent.click(await screen.findByTestId('forge-github-publish-button'));
    await screen.findByTestId('forge-github-result');
    view.rerender(<ForgeGitHubPublish module={forkOfBell} />);
    expect(screen.queryByTestId('forge-github-result')).toBeNull();
    // 같은 내용으로 돌아오면 다시 보입니다(올린 내용이 작업대에 그대로 있습니다).
    view.rerender(<ForgeGitHubPublish module={{ ...bell }} />);
    expect(screen.getByTestId('forge-github-result')).toBeTruthy();
    view.rerender(<ForgeGitHubPublish module={{ ...bell, title: '고친 종' }} />);
    expect(screen.queryByTestId('forge-github-result')).toBeNull();
  });

  it('파일 이름으로 쓸 수 없는 ID의 모듈은 새 ID로 올리고, 누른 때의 ID를 함께 알려 준다', async () => {
    await useGitHubStore.getState().connect();
    const onPublished = vi.fn();
    const long = makeForgeModule(createRecipe('star'), { id: 'x'.repeat(60), title: '긴 ID의 별' });
    render(<ForgeGitHubPublish module={long} onPublished={onPublished} />);
    fireEvent.click(await screen.findByTestId('forge-github-publish-button'));
    await screen.findByTestId('forge-github-result');
    const [published, previousId] = onPublished.mock.calls[0];
    expect(previousId).toBe('x'.repeat(60));
    expect(published.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('GitHub 설정이 없는 배포에서는 아무것도 그리지 않는다', () => {
    configureGitHub({ clientId: '' });
    const { container } = render(<ForgeGitHubPublish module={bell} />);
    expect(container.innerHTML).toBe('');
  });
});
