import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../components/layout/Header', () => ({ default: () => <header>메뉴</header> }));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function renderPrivacy(locale = 'ko', env = {}) {
  vi.resetModules();
  vi.stubEnv('VITE_GALLERY_INDEX_URL', '');
  vi.stubEnv('VITE_FORGE_INDEX_URL', '');
  vi.stubEnv('VITE_GITHUB_CLIENT_ID', '');
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  // 모듈을 다시 불러오므로 화면이 읽는 것과 같은 저장소에 언어를 넣습니다.
  const { default: useAppStore } = await import('../stores/appStore');
  useAppStore.setState({ locale });
  const { default: Privacy } = await import('./Privacy.jsx');
  return render(<Privacy />);
}

it('서버·DB가 없다는 처리방침을 보여 주고 계정·Supabase 수집 항목을 보여 주지 않는다', async () => {
  await renderPrivacy();
  expect(screen.getByTestId('privacy')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1, name: '개인정보 처리방침' })).toBeInTheDocument();
  expect(screen.getByText(/이름이나 이메일 같은 개인정보를 수집하지 않습니다/)).toBeInTheDocument();
  expect(screen.getByText(/코드와 제목이 Cloudflare D1 저장소에 저장되고 짧은 주소가 만들어집니다/)).toBeInTheDocument();
  expect(screen.getByText(/drive\.file 권한으로는 이 앱이 만든 파일만/)).toBeInTheDocument();
  expect(screen.queryByText(/Supabase/)).toBeNull();
  expect(screen.queryByText(/수업용 판/)).toBeNull();
  expect(screen.queryByText(/drive-lab/)).toBeNull();
});

it('절 번호는 1부터 7까지 빠짐없이 이어진다', async () => {
  await renderPrivacy();
  const numbered = screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent).filter(title => /^\d+\./.test(title));
  expect(numbered).toEqual(['1. 수집하는 개인정보', '2. 브라우저에 남는 정보', '3. 공유 링크', '4. 외부 서비스', '5. 구글 드라이브 저장', '6. 개인정보 보호책임자와 문의', '7. 변경']);
});

it('처리방침은 영어 화면에서 모든 문단이 번역된다', async () => {
  const { container } = await renderPrivacy('en');
  expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: '6. Privacy officer and contact' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: '7. Changes' })).toBeInTheDocument();
  expect(container.querySelector('main').textContent).not.toMatch(/[가-힣]{3,}(?![^(]*\))/);
});

const GALLERY_ON = { VITE_GALLERY_INDEX_URL: 'https://raw.githubusercontent.com/vpylab/vpylab/gallery-data/gallery.json' };

it('갤러리를 켠 배포는 갤러리에 올리면 공개되는 것(코드, 미리보기 그림, GitHub 아이디)을 밝힌다', async () => {
  await renderPrivacy('ko', GALLERY_ON);
  expect(screen.getByRole('heading', { name: '갤러리 (선택 기능)' })).toBeInTheDocument();
  const body = screen.getByText(/갤러리에 올리기는 선택 기능이며/);
  expect(body).toHaveTextContent('누구나 볼 수 있는 것은 코드, 실행 화면, 미리보기 그림, 제목, GitHub 아이디, 고친 날짜, 스타 수입니다.');
  expect(body).toHaveTextContent('VPyLab은 따로 서버나 DB에 저장하지 않습니다.');
  expect(body).toHaveTextContent('승인 전에도 저장소 이름, 제목, GitHub 아이디가 승인 대기 목록에 공개됩니다.');
});

it('갤러리를 켜지 않은 배포에는 갤러리 구역이 없다', async () => {
  await renderPrivacy();
  expect(screen.queryByText('갤러리 (선택 기능)')).toBeNull();
});

it('갤러리 구역도 영어 화면에서 번역된다', async () => {
  const { container } = await renderPrivacy('en', GALLERY_ON);
  expect(screen.getByRole('heading', { name: 'Gallery (optional)' })).toBeInTheDocument();
  expect(container.querySelector('main').textContent).not.toMatch(/[가-힣]{3,}(?![^(]*\))/);
});

const FORGE_ON = { VITE_FORGE_INDEX_URL: 'https://raw.githubusercontent.com/vpylab/vpylab/gallery-data/forge.json', VITE_GITHUB_CLIENT_ID: 'client-1' };

it('대장간 공개 등록을 켠 배포는 무엇이 공개되고 어떻게 내리는지 밝힌다', async () => {
  await renderPrivacy('ko', FORGE_ON);
  expect(screen.getByRole('heading', { name: '대장간 공개 등록 (선택 기능)' })).toBeInTheDocument();
  const body = screen.getByText(/대장간의 공개 등록은 선택 기능이며/);
  expect(body.textContent).toContain('공개 저장소 vpylab-forge');
  expect(body.textContent).toContain('누구나 볼 수 있습니다');
  expect(body.textContent).toContain('내 모듈 공개 내리기');
  expect(body.textContent).toContain('VPyLab 운영 서버에는 모듈이 저장되지 않습니다');
});

it('공개 등록을 할 수 없는 배포(목록 주소나 GitHub 연결이 없음)에는 대장간 구역이 없다', async () => {
  await renderPrivacy();
  expect(screen.queryByText('대장간 공개 등록 (선택 기능)')).toBeNull();
  cleanup();
  await renderPrivacy('ko', { VITE_FORGE_INDEX_URL: FORGE_ON.VITE_FORGE_INDEX_URL });
  expect(screen.queryByText('대장간 공개 등록 (선택 기능)')).toBeNull();
});

it('선택 기능의 구역은 5절과 6절 사이에 놓인다', async () => {
  await renderPrivacy('ko', { ...GALLERY_ON, ...FORGE_ON });
  const titles = screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent);
  expect(titles.slice(4)).toEqual(['5. 구글 드라이브 저장', 'GitHub 팀 프로젝트 (선택 기능)', '갤러리 (선택 기능)', '대장간 공개 등록 (선택 기능)', '6. 개인정보 보호책임자와 문의', '7. 변경']);
});

it('대장간 구역도 영어 화면에서 번역된다', async () => {
  const { container } = await renderPrivacy('en', FORGE_ON);
  expect(screen.getByRole('heading', { name: 'Publishing Forge modules (optional)' })).toBeInTheDocument();
  expect(container.querySelector('main').textContent).not.toMatch(/[가-힣]{3,}(?![^(]*\))/);
});
