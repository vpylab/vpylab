import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const INDEX_URL = 'https://raw.githubusercontent.com/vpylab/vpylab/gallery-data/gallery.json';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function renderHeader(env) {
  vi.resetModules();
  for (const [key, value] of Object.entries({ VITE_LAN_MODE: '', VITE_GALLERY_INDEX_URL: '', ...env })) vi.stubEnv(key, value);
  const { MemoryRouter } = await import('react-router-dom');
  const { I18nProvider } = await import('../../i18n/index.jsx');
  const { default: useAppStore } = await import('../../stores/appStore');
  useAppStore.setState({ locale: 'ko' });
  const { default: Header } = await import('./Header.jsx');
  return render(<I18nProvider><MemoryRouter><Header /></MemoryRouter></I18nProvider>);
}

const galleryLinks = () => screen.queryAllByRole('link', { name: '갤러리' });

describe('머리글의 갤러리 메뉴', () => {
  it('오픈소스 판은 갤러리 목록 주소가 설정된 배포에서만 갤러리 메뉴를 보인다', async () => {
    await renderHeader({ VITE_EDITION: 'open', VITE_GALLERY_INDEX_URL: INDEX_URL });
    expect(galleryLinks()[0]).toHaveAttribute('href', '/gallery');
  });

  it('목록 주소가 없는 오픈소스 판에는 갤러리 메뉴가 없다', async () => {
    await renderHeader({ VITE_EDITION: 'open' });
    expect(galleryLinks()).toHaveLength(0);
    expect(screen.getAllByRole('link', { name: '만들기' }).length).toBeGreaterThan(0);
  });

  it('수업용 판은 기존대로 갤러리 메뉴를 보인다', async () => {
    await renderHeader({ VITE_EDITION: '' });
    expect(galleryLinks()[0]).toHaveAttribute('href', '/gallery');
  });
});
