import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { I18nProvider } from '../i18n';
import Sandbox from './Sandbox';

vi.mock('../components/editor/CodeEditor', async () => ({
  DEFAULT_CODE: (await import('../data/default-code')).DEFAULT_CODE,
  default: ({ code, onChange }) => <textarea aria-label="편집기" value={code} onChange={e => onChange(e.target.value)} />,
}));
vi.mock('../components/viewport/Viewport3D', () => ({ default: () => <div data-testid="viewport" /> }));
vi.mock('../hooks/usePyodide', () => ({
  default: () => ({ initWorker: vi.fn(), stopExecution: vi.fn(), isReady: true }),
}));

const REPO_CODE = 'from vpython import *\nsphere()\n';

function openSandbox(search) {
  const router = createMemoryRouter([{ path: '/sandbox', element: <Sandbox /> }], { initialEntries: [`/sandbox${search}`] });
  render(<I18nProvider><RouterProvider router={router} /></I18nProvider>);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    if (String(url) === 'https://raw.githubusercontent.com/greatsong/dugun-curling/HEAD/main.py') {
      return new Response(REPO_CODE, { status: 200 });
    }
    return new Response('', { status: 404 });
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('README 링크 ?repo=…&autorun=1&view=run은 저장소 코드를 불러와 실행 화면에서 시작을 기다린다', async () => {
  openSandbox('?repo=greatsong/dugun-curling&autorun=1&view=run');
  expect(await screen.findByRole('button', { name: /클릭하여 시작/ })).toBeInTheDocument();
  expect(globalThis.fetch).toHaveBeenCalledWith('https://raw.githubusercontent.com/greatsong/dugun-curling/HEAD/main.py');
  expect(screen.getByTestId('viewport')).toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: '편집기' })).toBeNull();
});

it('view=run이 없으면 지금처럼 편집 화면에 저장소 코드를 연다', async () => {
  openSandbox('?repo=greatsong/dugun-curling');
  await waitFor(() => expect(screen.getAllByRole('textbox', { name: '편집기' })[0]).toHaveValue(REPO_CODE));
  expect(screen.queryByRole('button', { name: /클릭하여 시작/ })).toBeNull();
});

it('저장소를 불러오지 못하면 실행 화면으로 가지 않고 편집 화면에 오류를 남긴다', async () => {
  openSandbox('?repo=greatsong/missing-repo&view=run');
  expect(await screen.findByText(/GitHub main\.py 로드 실패 \(404\)/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /클릭하여 시작/ })).toBeNull();
});
