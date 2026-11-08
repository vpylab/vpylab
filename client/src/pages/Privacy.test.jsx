import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../components/layout/Header', () => ({ default: () => <header>메뉴</header> }));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function renderPrivacy(edition, locale = 'ko') {
  vi.resetModules();
  vi.stubEnv('VITE_EDITION', edition);
  // 모듈을 다시 불러오므로 화면이 읽는 것과 같은 저장소에 언어를 넣습니다.
  const { default: useAppStore } = await import('../stores/appStore');
  useAppStore.setState({ locale });
  const { default: Privacy } = await import('./Privacy.jsx');
  return render(<Privacy />);
}

it('공개판은 서버·DB가 없다는 처리방침을 보여 주고 수업용 판의 Supabase 수집 항목을 보여 주지 않는다', async () => {
  await renderPrivacy('open');
  expect(screen.getByTestId('privacy-open')).toBeInTheDocument();
  expect(screen.getByText('개인정보 처리방침 (공개판)')).toBeInTheDocument();
  expect(screen.getByText(/이름이나 이메일 같은 개인정보를 수집하지 않습니다/)).toBeInTheDocument();
  expect(screen.getByText(/코드와 제목이 Cloudflare D1 저장소에 저장되고 짧은 주소가 만들어집니다/)).toBeInTheDocument();
  expect(screen.getByText(/drive\.file 권한으로는 이 앱이 만든 파일만/)).toBeInTheDocument();
  expect(screen.queryByText(/Supabase 서울 리전에 저장/)).toBeNull();
});

it('공개판 처리방침은 영어 화면에서 모든 문단이 번역된다', async () => {
  const { container } = await renderPrivacy('open', 'en');
  expect(screen.getByText('Privacy Policy (open edition)')).toBeInTheDocument();
  expect(container.querySelector('main').textContent).not.toMatch(/[가-힣]{3,}(?![^(]*\))/);
});

it('수업용 판은 지금의 처리방침을 그대로 보여 준다', async () => {
  await renderPrivacy('');
  expect(screen.queryByTestId('privacy-open')).toBeNull();
  expect(screen.getByText(/Supabase 서울 리전에 저장/)).toBeInTheDocument();
});
