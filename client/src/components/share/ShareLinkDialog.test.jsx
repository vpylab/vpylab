import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  window.localStorage.clear();
});

async function renderDialog(edition, props = {}, { lan = false } = {}) {
  vi.resetModules();
  vi.stubEnv('VITE_EDITION', edition);
  vi.stubEnv('VITE_LAN_MODE', lan ? '1' : '');
  const { I18nProvider } = await import('../../i18n');
  const { default: ShareLinkDialog } = await import('./ShareLinkDialog.jsx');
  return render(
    <I18nProvider>
      <ShareLinkDialog url={`${window.location.origin}/s/k7x2p9`} shareId="k7x2p9" title="공" code="sphere()" onClose={() => {}} {...props} />
    </I18nProvider>,
  );
}

it('오픈소스 판은 이름을 정하면 주소와 QR이 그 이름으로 바뀐다', async () => {
  const fetchSpy = vi.fn(async () => ({ ok: true, status: 201, json: async () => ({ id: 'solar', url: '/s/solar', editKey: 'secret-secret-secret-1', named: true }) }));
  vi.stubGlobal('fetch', fetchSpy);
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn(async () => {}) } });
  await renderDialog('open');

  expect(screen.getByTestId('share-url')).toHaveValue(`${window.location.origin}/s/k7x2p9`);
  const input = screen.getByTestId('share-name-input');
  fireEvent.change(input, { target: { value: 'Solar System' } });
  expect(input).toHaveValue('solar-system'); // 대문자·빈칸은 바로 소문자·하이픈으로
  fireEvent.change(input, { target: { value: 'solar' } });
  fireEvent.click(screen.getByTestId('share-name-submit'));

  await waitFor(() => expect(screen.getByTestId('share-url')).toHaveValue(`${window.location.origin}/s/solar`));
  expect(screen.getByTestId('share-name-message')).toHaveTextContent('이름을 정했습니다.');
  expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toMatchObject({ code: 'sphere()', name: 'solar' });
});

it('남이 쓰는 이름이면 안내를 보여 주고 주소는 그대로 둔다', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 409, json: async () => ({ code: 'name_taken' }) })));
  await renderDialog('open');
  fireEvent.change(screen.getByTestId('share-name-input'), { target: { value: 'taken' } });
  fireEvent.click(screen.getByTestId('share-name-submit'));
  await waitFor(() => expect(screen.getByTestId('share-name-error')).toHaveTextContent('이미 다른 사람이 사용하는 이름입니다'));
  expect(screen.getByTestId('share-url')).toHaveValue(`${window.location.origin}/s/k7x2p9`);
});

it('수업용 판에도 이름 칸이 있고, 저장소가 없는 교실 LAN 모드에는 없다', async () => {
  await renderDialog('');
  expect(screen.getByTestId('share-name-form')).toBeInTheDocument();
  cleanup();
  await renderDialog('', {}, { lan: true });
  expect(screen.queryByTestId('share-name-form')).toBeNull();
});

it('이름을 정하면 창을 열 때 만든 무작위 주소를 그 브라우저의 열쇠로 지운다', async () => {
  window.localStorage.setItem('vpylab-share-edit-keys', JSON.stringify({ k7x2p9: 'random-key-random-key-1' }));
  const fetchSpy = vi.fn(async (_url, options = {}) => (options.method === 'DELETE'
    ? { ok: true, status: 200, json: async () => ({ id: 'k7x2p9', deleted: true }) }
    : { ok: true, status: 201, json: async () => ({ id: 'solar', url: '/s/solar', editKey: 'secret-secret-secret-1', named: true }) }));
  vi.stubGlobal('fetch', fetchSpy);
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn(async () => {}) } });
  await renderDialog('open');

  fireEvent.change(screen.getByTestId('share-name-input'), { target: { value: 'solar' } });
  fireEvent.click(screen.getByTestId('share-name-submit'));

  await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
  const [deleteUrl, deleteOptions] = fetchSpy.mock.calls[1];
  expect(deleteUrl).toMatch(/\/api\/share\/k7x2p9$/);
  expect(deleteOptions).toMatchObject({ method: 'DELETE', headers: { Authorization: 'Bearer random-key-random-key-1' } });
  await waitFor(() => expect(JSON.parse(window.localStorage.getItem('vpylab-share-edit-keys'))).not.toHaveProperty('k7x2p9'));
  expect(JSON.parse(window.localStorage.getItem('vpylab-share-edit-keys'))).toHaveProperty('solar');
});

it('무작위 주소를 이 창에서 복사했다면 이름을 정해도 지우지 않는다', async () => {
  window.localStorage.setItem('vpylab-share-edit-keys', JSON.stringify({ k7x2p9: 'random-key-random-key-1' }));
  const fetchSpy = vi.fn(async () => ({ ok: true, status: 201, json: async () => ({ id: 'solar', url: '/s/solar', editKey: 'secret-secret-secret-1', named: true }) }));
  vi.stubGlobal('fetch', fetchSpy);
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn(async () => {}) } });
  await renderDialog('open');

  fireEvent.click(screen.getByText(/링크 복사|Copy link/));
  fireEvent.change(screen.getByTestId('share-name-input'), { target: { value: 'solar' } });
  fireEvent.click(screen.getByTestId('share-name-submit'));

  await waitFor(() => expect(screen.getByTestId('share-url')).toHaveValue(`${window.location.origin}/s/solar`));
  expect(fetchSpy.mock.calls.every(([, options = {}]) => options.method !== 'DELETE')).toBe(true);
});
