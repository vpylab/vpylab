import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../components/layout/Header', () => ({ default: () => <header>메뉴</header> }));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function renderPrivacy(edition, locale = 'ko', env = {}) {
  vi.resetModules();
  vi.stubEnv('VITE_EDITION', edition);
  vi.stubEnv('VITE_GALLERY_INDEX_URL', '');
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
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

const GALLERY_ON = { VITE_GALLERY_INDEX_URL: 'https://raw.githubusercontent.com/vpylab/vpylab/gallery-data/gallery.json' };

it('갤러리를 켠 공개판은 갤러리에 올리면 공개되는 것(코드, 미리보기 그림, GitHub 아이디)을 밝힌다', async () => {
  await renderPrivacy('open', 'ko', GALLERY_ON);
  expect(screen.getByRole('heading', { name: '갤러리 (선택 기능)' })).toBeInTheDocument();
  const body = screen.getByText(/갤러리에 올리기는 선택 기능이며/);
  expect(body).toHaveTextContent('누구나 볼 수 있는 것은 코드, 실행 화면, 미리보기 그림, 제목, GitHub 아이디, 고친 날짜, 스타 수입니다.');
  expect(body).toHaveTextContent('VPyLab은 따로 서버나 DB에 저장하지 않습니다.');
  expect(body).toHaveTextContent('승인 전에도 저장소 이름, 제목, GitHub 아이디가 승인 대기 목록에 공개됩니다.');
});

it('갤러리를 켜지 않은 공개판과 수업용 판에는 갤러리 구역이 없다', async () => {
  await renderPrivacy('open');
  expect(screen.queryByText('갤러리 (선택 기능)')).toBeNull();
  cleanup();
  await renderPrivacy('', 'ko', GALLERY_ON);
  expect(screen.queryByText('갤러리 (선택 기능)')).toBeNull();
});

it('갤러리 구역도 영어 화면에서 번역된다', async () => {
  const { container } = await renderPrivacy('open', 'en', GALLERY_ON);
  expect(screen.getByRole('heading', { name: 'Gallery (optional)' })).toBeInTheDocument();
  expect(container.querySelector('main').textContent).not.toMatch(/[가-힣]{3,}(?![^(]*\))/);
});
