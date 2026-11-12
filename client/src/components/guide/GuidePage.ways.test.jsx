import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import Guide from '../../pages/Guide';

vi.mock('../layout/Header', () => ({ default: () => <header>메뉴</header> }));

afterEach(cleanup);

it('사용 안내는 목차 맨 앞과 첫 구역에 "세 가지 방법으로 만들기"를 두고 기존 구역은 그대로 둔다', () => {
  const { container } = render(<MemoryRouter><Guide /></MemoryRouter>);
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
});
