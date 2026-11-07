import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function renderModal(edition) {
  vi.resetModules();
  vi.stubEnv('VITE_EDITION', edition);
  const { default: AuthModal } = await import('./AuthModal.jsx');
  const { default: useAuthStore } = await import('../../stores/authStore');
  const { default: useAppStore } = await import('../../stores/appStore');
  const { I18nProvider } = await import('../../i18n/index.jsx');
  useAppStore.setState({ locale: 'ko' });
  useAuthStore.setState({ authModalOpen: true });
  render(<I18nProvider><AuthModal /></I18nProvider>);
}

describe('저장 버튼을 눌렀을 때 뜨는 창', () => {
  it('오픈소스 판은 운영 서버 로그인 대신 안내와 드라이브 실험 링크를 보여 준다', async () => {
    await renderModal('open');
    expect(screen.getByRole('heading', { name: '저장 기능 준비 중' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '드라이브 저장 실험 열기' })).toHaveAttribute('href', '/drive-lab');
    expect(screen.queryByText(/Google로 로그인|GitHub로 로그인/)).not.toBeInTheDocument();
  });

  it('수업용 판은 기존 로그인 창을 그대로 보여 준다', async () => {
    await renderModal('');
    expect(screen.queryByRole('heading', { name: '저장 기능 준비 중' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBeGreaterThan(2);
  });
});
