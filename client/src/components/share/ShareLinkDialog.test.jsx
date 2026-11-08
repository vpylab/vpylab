import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  window.localStorage.clear();
});

async function renderDialog(edition, props = {}) {
  vi.resetModules();
  vi.stubEnv('VITE_EDITION', edition);
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

it('수업용 판에는 이름 칸이 없다', async () => {
  await renderDialog('');
  expect(screen.queryByTestId('share-name-form')).toBeNull();
});
