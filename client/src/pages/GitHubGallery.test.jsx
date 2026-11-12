import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import useAppStore from '../stores/appStore';
import GitHubGallery from './GitHubGallery';

vi.mock('../components/layout/Header', () => ({ default: () => <header>메뉴</header> }));
vi.mock('../components/gallery/GitHubGalleryView', () => ({ default: () => <div>작품 목록</div> }));

afterEach(() => { cleanup(); useAppStore.setState({ locale: 'ko' }); });

it('GitHub 갤러리 화면에서 GlowScript 원작 목록으로 갈 수 있다', () => {
  useAppStore.setState({ locale: 'ko' });
  render(<MemoryRouter><GitHubGallery /></MemoryRouter>);
  expect(screen.getByRole('heading', { level: 1, name: '갤러리' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'GlowScript 작품 보기 ↗' })).toHaveAttribute('href', '/gallery/glowscript');
  expect(screen.getByText('작품 목록')).toBeInTheDocument();
});

it('영어 화면에서는 링크 글도 번역된다', () => {
  useAppStore.setState({ locale: 'en' });
  render(<MemoryRouter><GitHubGallery /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'View GlowScript works ↗' })).toHaveAttribute('href', '/gallery/glowscript');
});
