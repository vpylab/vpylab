import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../layout/Header', () => ({ default: () => <header>메뉴</header> }));

afterEach(() => {
  cleanup();
  vi.doUnmock('../../lib/api-base');
  vi.resetModules();
});

/** 배포마다 켜진 기능이 달라 api-base의 값을 바꿔 가며 화면을 그립니다. */
async function renderGuide({ forge = true, github = true } = {}) {
  vi.resetModules();
  vi.doMock('../../lib/api-base', async (importOriginal) => ({
    ...(await importOriginal()),
    GITHUB_FORGE: forge,
    GITHUB_ADDON: github,
  }));
  const { default: Guide } = await import('../../pages/Guide');
  return render(<MemoryRouter><Guide /></MemoryRouter>);
}

it('사용 안내는 목차 맨 앞과 첫 구역에 "세 가지 방법으로 만들기"를 두고 기존 구역은 그대로 둔다', async () => {
  const { container } = await renderGuide();
  const links = within(screen.getByRole('navigation', { name: '사용 안내 목차' })).getAllByRole('link');
  expect(links.map(link => [link.getAttribute('href'), link.textContent])).toEqual([
    ['#ways', '세 가지 방법으로 만들기'],
    ['#start', '처음 시작하기'],
    ['#forge', '대장간'],
    ['#fork', '포크와 출처'],
    ['#character', '캐릭터 튜토리얼'],
    ['#projects', '팀 프로젝트'],
  ]);
  expect([...container.querySelectorAll('main section[id]')].map(section => section.id)).toEqual(['ways', 'start', 'forge', 'fork', 'character', 'projects']);
  // 새 구역이 가리키는 기존 "팀 프로젝트" 구역이 같은 화면에 있다
  expect(within(container.querySelector('#ways')).getByRole('link', { name: '팀 프로젝트 안내' })).toHaveAttribute('href', '#projects');
  expect(container.querySelector('#projects h2').textContent).toBe('팀 프로젝트: 함께 만들며 배우는 것');
  // 공개 등록과 공개 내리기는 GitHub 연결이 설정된 사이트에서만 안내합니다
  expect(container.querySelector('#fork').textContent).toContain('모두의 모듈에 공개 등록');
  expect(container.querySelector('#fork').textContent).toContain('내 모듈 공개 내리기');
});

it('모두의 모듈이 설정되지 않은 사이트에서는 포크 구역과 그 목차를 보이지 않는다', async () => {
  const { container } = await renderGuide({ forge: false, github: false });
  const links = within(screen.getByRole('navigation', { name: '사용 안내 목차' })).getAllByRole('link');
  expect(links.map(link => link.getAttribute('href'))).toEqual(['#ways', '#start', '#forge', '#character', '#projects']);
  expect(container.querySelector('#fork')).toBeNull();
  expect(container.textContent).not.toContain('포크해서 가져오기');
});

it('GitHub 연결이 없는 사이트의 포크 구역은 가져오기만 안내하고 공개 등록은 안내하지 않는다', async () => {
  const { container } = await renderGuide({ forge: true, github: false });
  const fork = container.querySelector('#fork');
  expect(fork.textContent).toContain('포크해서 가져오기');
  expect(fork.textContent).not.toContain('모두의 모듈에 공개 등록');
  expect(fork.textContent).not.toContain('내 모듈 공개 내리기');
});
