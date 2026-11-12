import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../drive-lab/fake-google.js';
import { createFakeGitHub } from '../../github/fake-github.js';
import { configureGitHub, useGitHubStore } from '../../github/githubSession.js';
import useAppStore from '../../stores/appStore';
import GitHubGalleryView from './GitHubGalleryView.jsx';

vi.mock('../layout/Header', () => ({ default: () => <header>메뉴</header> }));

const work = (fullName, extra = {}) => {
  const [owner, repo] = fullName.split('/');
  return {
    fullName, title: `${repo} 작품`, owner, htmlUrl: `https://github.com/${fullName}`,
    pagesUrl: `https://${owner.toLowerCase()}.github.io/${repo}/`,
    thumbnailUrl: `https://raw.githubusercontent.com/${fullName}/main/thumbnail.jpg`,
    stars: 2, updatedAt: '2026-11-10T01:02:03.000Z', ...extra,
  };
};

let github;

function configure() {
  configureGitHub({
    clientId: 'client-1',
    fetchImpl: github.fetchImpl,
    storage: memoryStorage(),
    origin: 'https://vpylab.example',
    login: () => ({ promise: Promise.resolve({ accessToken: 'token-bo', scope: 'public_repo,repo:invite' }), cancel: () => {}, url: '', state: 's' }),
    apiOptions: { sleep: async () => {} },
  });
}

function renderView(props) {
  return render(<MemoryRouter><GitHubGalleryView {...props} /></MemoryRouter>);
}

beforeEach(() => {
  github = createFakeGitHub({ tokens: { 'token-bo': 'bo' } });
  // 저장소의 지금 스타 수는 2개입니다(목록 파일의 수와 같은 경우).
  github.createRepo('ada', 'solar', { description: '태양계', topics: ['vpylab-project', 'vpylab-gallery'], files: { 'main.py': 'sphere()' } }).stars = 2;
  configure();
  act(() => useAppStore.getState().setLocale('ko'));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('GitHub 연동 갤러리 화면', () => {
  it('목록의 작품을 카드로 보인다: 미리보기 그림, 제목, 아이디, 고친 날짜, 스타 수', async () => {
    const load = vi.fn(async () => ({ items: [work('ada/solar', { title: '태양계', stars: 7 }), work('bo/moon', { thumbnailUrl: null })] }));
    const { container } = renderView({ load, github: false });
    expect(screen.getByRole('status')).toHaveTextContent('작품 목록을 불러오는 중입니다.');
    const cards = await screen.findAllByTestId('gallery-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('태양계');
    expect(cards[0]).toHaveTextContent('ada');
    expect(cards[0]).toHaveTextContent(new Date('2026-11-10T01:02:03.000Z').toLocaleDateString());
    expect(within(cards[0]).getByLabelText('스타 7개')).toBeInTheDocument();
    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', 'https://raw.githubusercontent.com/ada/solar/main/thumbnail.jpg');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('alt', '');
    // 그림이 없는 작품은 글자로 대신합니다.
    expect(within(cards[1]).getByTestId('gallery-thumbnail-placeholder')).toHaveTextContent('미리보기 그림 없음');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('그림을 불러오지 못하면 글자로 대신한다', async () => {
    const { container } = renderView({ load: async () => ({ items: [work('ada/solar')] }), github: false });
    await screen.findByTestId('gallery-card');
    fireEvent.error(container.querySelector('img'));
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('gallery-thumbnail-placeholder')).toBeInTheDocument();
  });

  it('제목과 아이디는 글자로만 그린다', async () => {
    const { container } = renderView({ load: async () => ({ items: [work('ada/solar', { title: '<img src=x onerror="window.__hit=1"><b>굵게</b>' })] }), github: false });
    const card = await screen.findByTestId('gallery-card');
    expect(card).toHaveTextContent('<img src=x onerror="window.__hit=1"><b>굵게</b>');
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelectorAll('img')).toHaveLength(1); // 미리보기 그림 하나뿐
    expect(window.__hit).toBeUndefined();
  });

  it('작품을 누르면 실행 화면, 코드 보기, 저장소 링크를 보인다', async () => {
    renderView({ load: async () => ({ items: [work('ada/solar', { title: '태양계' })] }), github: false });
    fireEvent.click(await screen.findByTestId('gallery-card'));
    const dialog = screen.getByRole('dialog', { name: '태양계' });
    const pages = within(dialog).getByTestId('gallery-open-pages');
    expect(pages).toHaveAttribute('href', 'https://ada.github.io/solar/');
    expect(pages).toHaveAttribute('target', '_blank');
    expect(pages).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(dialog).getByTestId('gallery-open-code')).toHaveAttribute('href', '/sandbox?repo=ada%2Fsolar');
    expect(within(dialog).getByTestId('gallery-open-repo')).toHaveAttribute('href', 'https://github.com/ada/solar');
    // GitHub 애드온이 없는 배포: 스타는 저장소로 가는 링크로 대신하고, 연결 안내는 보이지 않습니다.
    expect(within(dialog).getByTestId('gallery-star-link')).toHaveAttribute('href', 'https://github.com/ada/solar');
    expect(within(dialog).queryByTestId('gallery-star-hint')).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('게시 주소가 없는 작품은 실행 화면 링크 대신 안내를 보인다', async () => {
    renderView({ load: async () => ({ items: [work('ada/solar', { pagesUrl: null })] }), github: false });
    fireEvent.click(await screen.findByTestId('gallery-card'));
    expect(screen.queryByTestId('gallery-open-pages')).toBeNull();
    expect(screen.getByTestId('gallery-no-pages')).toHaveTextContent('"코드 보기"를 누르면');
  });

  it('검사를 거치지 않은 주소가 들어와도 링크로 만들지 않는다', async () => {
    renderView({ load: async () => ({ items: [work('ada/solar', { pagesUrl: 'https://evil.example/', htmlUrl: 'javascript:alert(1)' })] }), github: false });
    fireEvent.click(await screen.findByTestId('gallery-card'));
    expect(screen.queryByTestId('gallery-open-pages')).toBeNull();
    expect(screen.queryByTestId('gallery-open-repo')).toBeNull();
    expect(screen.queryByTestId('gallery-star-link')).toBeNull();
    expect(screen.getByTestId('gallery-open-code')).toBeInTheDocument();
  });

  it('작품이 없으면 그렇다고 알리고, 올리는 방법과 GitHub 계정이 필요하다는 점을 밝힌다', async () => {
    renderView({ load: async () => ({ items: [] }), github: false });
    expect(await screen.findByTestId('gallery-empty')).toHaveTextContent('갤러리에 표시할 작품이 아직 없습니다.');
    expect(screen.getByText(/GitHub 계정이 없는 학생은 올릴 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByText(/교사가 승인한 작품만 표시되며/)).toBeInTheDocument();
  });

  it('목록을 읽지 못하면 이 화면 안에서 안내하고, 다시 시도할 수 있다', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ items: [work('ada/solar')] });
    renderView({ load, github: false });
    const error = await screen.findByTestId('gallery-error');
    expect(error).toHaveTextContent('작품 목록을 불러오지 못했습니다.');
    expect(error).toHaveTextContent('다른 화면은 그대로 사용할 수 있습니다');
    fireEvent.click(within(error).getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByTestId('gallery-card')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('영어 화면에서는 고정 문구가 모두 번역된다', async () => {
    act(() => useAppStore.getState().setLocale('en'));
    const { container } = renderView({ load: async () => ({ items: [work('ada/solar', { title: 'Solar system', pagesUrl: null })] }), github: true });
    fireEvent.click(await screen.findByTestId('gallery-card'));
    expect(container.textContent + document.body.textContent).not.toMatch(/[가-힣]/);
    expect(screen.getByTestId('gallery-open-code')).toHaveTextContent('View code');
  });
});

describe('갤러리의 스타', () => {
  const open = async () => {
    renderView({ load: async () => ({ items: [work('ada/solar', { stars: 2 })] }), github: true });
    fireEvent.click(await screen.findByTestId('gallery-card'));
    return screen.getByRole('dialog');
  };

  it('GitHub에 연결하지 않은 탭에서는 저장소 링크와 연결 안내를 보인다', async () => {
    const dialog = await open();
    expect(within(dialog).getByTestId('gallery-star-link')).toHaveAttribute('href', 'https://github.com/ada/solar');
    expect(within(dialog).getByTestId('gallery-star-hint')).toHaveTextContent('"팀 프로젝트" 창에서 GitHub에 연결한');
    expect(within(dialog).queryByTestId('gallery-star-button')).toBeNull();
    expect(github.calls('GET', /^\/user\/starred\//)).toHaveLength(0);
  });

  it('연결한 탭에서는 이 창에서 스타를 누르고 취소한다', async () => {
    await useGitHubStore.getState().connect();
    const dialog = await open();
    const button = await within(dialog).findByTestId('gallery-star-button');
    expect(button).toHaveTextContent('스타 누르기');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveTextContent('스타 취소'));
    expect(within(dialog).getByLabelText('스타 3개')).toBeInTheDocument();
    expect(github.state.starred.has('bo ada/solar')).toBe(true);
    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveTextContent('스타 누르기'));
    expect(within(dialog).getByLabelText('스타 2개')).toBeInTheDocument();
    expect(github.state.starred.size).toBe(0);
    expect(within(dialog).queryByTestId('gallery-star-hint')).toBeNull();
  });

  it('목록 파일의 수가 오래됐으면 지금의 수를 보이고, 창을 다시 열어 취소해도 수가 어긋나지 않는다', async () => {
    await useGitHubStore.getState().connect();
    // 목록 파일에는 2개로 적혀 있지만, 그 뒤 내가 눌러 지금은 3개입니다.
    github.state.starred.add('bo ada/solar');
    const dialog = await open();
    const button = await within(dialog).findByTestId('gallery-star-button');
    await waitFor(() => expect(button).toHaveTextContent('스타 취소'));
    expect(within(dialog).getByLabelText('스타 3개')).toBeInTheDocument();
    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveTextContent('스타 누르기'));
    expect(within(dialog).getByLabelText('스타 2개')).toBeInTheDocument();
  });

  it('연결이 만료된 탭에서 누르면 반영하지 못했다고 알린다', async () => {
    await useGitHubStore.getState().connect();
    const dialog = await open();
    const button = await within(dialog).findByTestId('gallery-star-button');
    github.revoke('token-bo');
    fireEvent.click(button);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('스타를 반영하지 못했습니다.');
  });

  it('스타를 반영하지 못하면 이 창 안에서 알리고 수는 그대로 둔다', async () => {
    await useGitHubStore.getState().connect();
    const dialog = await open();
    const button = await within(dialog).findByTestId('gallery-star-button');
    github.failNext({ method: 'PUT', test: /^\/user\/starred\//, status: 500, times: 5 });
    fireEvent.click(button);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('스타를 반영하지 못했습니다.');
    expect(within(dialog).getByLabelText('스타 2개')).toBeInTheDocument();
    expect(button).toHaveTextContent('스타 누르기');
  });
});

describe('갤러리 화면의 오류 경계(애드온의 실패가 다른 화면으로 번지지 않게)', () => {
  it('본문에서 오류가 나도 머리글은 남고, 이 화면 안에서 안내한다', async () => {
    vi.resetModules();
    vi.doMock('./GitHubGalleryView', () => ({ default: () => { throw new Error('애드온 오류'); } }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { default: GitHubGallery } = await import('../../pages/GitHubGallery.jsx');
    render(<MemoryRouter><GitHubGallery /></MemoryRouter>);
    expect(await screen.findByTestId('gallery-broken')).toHaveTextContent('갤러리 화면을 표시하지 못했습니다.');
    expect(screen.getByText('메뉴')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '갤러리' })).toBeInTheDocument();
    vi.doUnmock('./GitHubGalleryView');
  });
});
