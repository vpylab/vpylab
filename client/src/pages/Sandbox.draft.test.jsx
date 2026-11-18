import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { I18nProvider } from '../i18n';
import { downloadPython } from '../utils/code-file';
import { readSandboxDraft, writeSandboxDraft, SANDBOX_DRAFT_MAX_BYTES } from '../utils/sandbox-draft';
import Sandbox from './Sandbox';

vi.mock('../components/editor/CodeEditor', async () => ({
  DEFAULT_CODE: (await import('../data/default-code')).DEFAULT_CODE,
  default: ({ code, onChange }) => <textarea aria-label="편집기" value={code} onChange={e => onChange(e.target.value)} />,
}));
vi.mock('../components/viewport/Viewport3D', () => ({ default: () => null }));
vi.mock('../hooks/usePyodide', () => ({
  default: () => ({ initWorker: vi.fn(), stopExecution: vi.fn(), isReady: true }),
}));
vi.mock('../utils/code-file', async importOriginal => ({
  ...await importOriginal(), downloadPython: vi.fn(),
}));

function openEditor() {
  const router = createMemoryRouter([
    { path: '/sandbox', element: <Sandbox /> },
    { path: '/docs', element: <h1>문서</h1> },
  ], { initialEntries: ['/docs', '/sandbox'] });
  render(<I18nProvider><RouterProvider router={router} /></I18nProvider>);
  return router;
}

function edit(code) {
  fireEvent.change(screen.getAllByRole('textbox', { name: '편집기' })[0], { target: { value: code } });
}
const waitForDraft = () => act(() => vi.advanceTimersByTime(800));
function tryClosingTab() {
  const event = new Event('beforeunload', { cancelable: true });
  act(() => { window.dispatchEvent(event); });
  return event.defaultPrevented;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.useRealTimers();
});

it('크기 초과 시 이전 초안을 유지하고 최신 코드 내려받기와 이동 경고를 제공한다', async () => {
  writeSandboxDraft('sphere()');
  const router = openEditor();
  const longCode = '# ' + '한'.repeat(Math.ceil(SANDBOX_DRAFT_MAX_BYTES / 3));
  edit(longCode);
  waitForDraft();
  expect(readSandboxDraft()).toBe('sphere()');
  expect(screen.getByRole('alert')).toHaveTextContent('최신 코드');
  fireEvent.click(screen.getByRole('button', { name: '.py 내려받기' }));
  expect(downloadPython).toHaveBeenCalledWith(longCode, expect.stringMatching(/\.py$/));
  expect(tryClosingTab()).toBe(true);

  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await act(async () => { await router.navigate(-1); });
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(router.state.location.pathname).toBe('/sandbox');
  confirm.mockReturnValue(true);
  await act(async () => { await router.navigate('/docs'); });
  expect(screen.getByRole('heading', { name: '문서' })).toBeInTheDocument();
});

it('용량 오류를 알리고 다음 저장 성공 시 경고를 해제하며 타이머 전 이동에도 최신 코드를 남긴다', async () => {
  writeSandboxDraft('box()');
  const router = openEditor();
  const draftKey = 'vpylab:sandbox:draft:v1';
  // jsdom은 setItem을 프로토타입에, 테스트용 메모리 저장소는 객체에 정의한다.
  const target = Object.hasOwn(localStorage, 'setItem') ? localStorage : Object.getPrototypeOf(localStorage);
  const originalSetItem = target.setItem;
  const setItem = vi.spyOn(target, 'setItem').mockImplementation(function (key, value) {
    if (this === localStorage && key === draftKey) {
      throw new DOMException('저장 공간 부족', 'QuotaExceededError');
    }
    return originalSetItem.call(this, key, value);
  });
  edit('sphere()');
  expect(tryClosingTab()).toBe(true);
  expect(setItem).toHaveBeenCalledWith(draftKey, expect.any(String));
  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(readSandboxDraft()).toBe('box()');
  setItem.mockRestore();
  edit('sphere(radius=2)');
  waitForDraft();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(tryClosingTab()).toBe(false);
  edit('sphere(radius=3)');
  await act(async () => { await router.navigate('/docs'); });
  expect(readSandboxDraft()).toBe('sphere(radius=3)');
});
