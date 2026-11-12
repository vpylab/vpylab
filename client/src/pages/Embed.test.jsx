import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { I18nProvider } from '../i18n';

const engine = vi.hoisted(() => ({
  runCode: vi.fn(), stopExecution: vi.fn(), initWorker: vi.fn(), state: { isReady: true, isRunning: false },
  cameraSystem: { onCodeStart: vi.fn() },
}));
const data = vi.hoisted(() => ({ share: null, audioUnlocked: false, muted: false, audioState: { muted: false, volume: 0.6 }, listeners: new Set() }));

vi.mock('../components/viewport/Viewport3D', () => ({
  default: function MockViewport({ sceneRef, controls }) {
    useEffect(() => { sceneRef.current = { _cameraSystem: engine.cameraSystem }; }, [sceneRef]);
    return <div data-testid="viewport" data-controls={controls ? 'yes' : 'no'}>3D</div>;
  },
}));
vi.mock('../hooks/usePyodide', () => ({
  default: () => ({
    initWorker: engine.initWorker, runCode: engine.runCode, stopExecution: engine.stopExecution,
    isReady: engine.state.isReady, isRunning: engine.state.isRunning, isLoading: false, progress: 100, progressMessage: '',
  }),
}));
vi.mock('../engine/vpython-bridge', () => ({ processBatch: vi.fn(), clearScene: vi.fn() }));
vi.mock('../engine/object-registry', () => ({ clearRegistry: vi.fn() }));
vi.mock('../engine/sound-system', () => ({
  ensureAudioReady: vi.fn(async () => { data.audioUnlocked = true; return true; }),
  isAudioUnlocked: () => data.audioUnlocked,
  stopAllSounds: vi.fn(), stopBgm: vi.fn(),
  // 실제 모듈처럼 같은 상태 객체를 돌려주고 바뀔 때만 새 객체를 만듭니다(useSyncExternalStore 안정성).
  getAudioState: () => data.audioState,
  subscribeAudioState: (listener) => { data.listeners.add(listener); return () => data.listeners.delete(listener); },
  setMasterMuted: vi.fn((value) => { data.muted = !!value; data.audioState = { muted: data.muted, volume: 0.6 }; data.listeners.forEach((l) => l(data.audioState)); }),
}));
vi.mock('../utils/share', () => ({
  loadSharedCode: vi.fn(async () => data.share || { code: null, title: null, error: 'not_found' }),
}));
vi.mock('../stores/appStore', () => ({
  default: (selector) => selector({ theme: data.theme || 'creative-light', locale: 'ko', THEME_META: { 'creative-light': { dark: false }, 'forest-night': { dark: true } } }),
}));

import Embed from './Embed';

function renderEmbed(id) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[`/embed/${id}`]}>
        <Routes><Route path="/embed/:id" element={<Embed />} /></Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('임베드 페이지', () => {
  beforeEach(() => {
    engine.runCode.mockClear(); engine.stopExecution.mockClear(); engine.initWorker.mockClear();
    engine.state = { isReady: true, isRunning: false };
    data.share = null; data.audioUnlocked = false; data.muted = false; data.audioState = { muted: false, volume: 0.6 }; data.theme = 'creative-light';
  });
  afterEach(() => cleanup());

  it('공유 코드를 읽어 제목을 보이고 준비되면 자동 실행한다', async () => {
    data.share = { code: 'sphere()', title: '태양계 시뮬레이션', error: null };
    renderEmbed('solar');
    await waitFor(() => expect(screen.getByTestId('embed-title')).toHaveTextContent('태양계 시뮬레이션'));
    await waitFor(() => expect(engine.runCode).toHaveBeenCalledWith('sphere()'));
    expect(engine.runCode).toHaveBeenCalledTimes(1);
    expect(engine.cameraSystem.onCodeStart).toHaveBeenCalled();
    expect(screen.getByTestId('embed-open-link')).toHaveAttribute('href', `${window.location.origin}/s/solar`);
    expect(screen.getByTestId('embed-open-link')).toHaveAttribute('target', '_blank');
    // 보기 전용: 로그인·저장·편집기 없음
    expect(screen.queryByText(/로그인/)).toBeNull();
    expect(screen.queryByText(/저장/)).toBeNull();
    expect(screen.getByTestId('viewport')).toHaveAttribute('data-controls', 'yes');
  });

  it('다른 다크 테마(forest-night)에서도 브랜드 마크를 반전한다', async () => {
    data.theme = 'forest-night';
    data.share = { code: 'box()', title: '상자', error: null };
    renderEmbed('abc12345');
    await waitFor(() => expect(engine.runCode).toHaveBeenCalled());
    expect(document.querySelector('img.vpylab-brand-mark')).toHaveAttribute('src', '/brand/vpylab-mark-inverse.svg');
  });

  it('공유 코드(nanoid)는 /s/:id 로 열고 실행·정지 버튼이 동작한다', async () => {
    data.share = { code: 'box()', title: '상자', error: null };
    const view = renderEmbed('abc12345');
    await waitFor(() => expect(engine.runCode).toHaveBeenCalledWith('box()'));
    expect(screen.getByTestId('embed-open-link')).toHaveAttribute('href', `${window.location.origin}/s/abc12345`);

    engine.state = { isReady: true, isRunning: true };
    view.rerender(
      <I18nProvider>
        <MemoryRouter initialEntries={['/embed/abc12345']}>
          <Routes><Route path="/embed/:id" element={<Embed />} /></Routes>
        </MemoryRouter>
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '정지' }));
    expect(engine.stopExecution).toHaveBeenCalled();
  });

  it('소리 켜기 버튼은 오디오를 풀고 음소거 토글로 바뀐다', async () => {
    data.share = { code: 'box()', title: '상자', error: null };
    renderEmbed('abc12345');
    const button = await screen.findByRole('button', { name: /소리 켜기/ });
    await act(async () => { fireEvent.click(button); });
    const toggle = await screen.findByTestId('embed-mute-toggle');
    expect(toggle).toHaveTextContent('음소거');
    await act(async () => { fireEvent.click(toggle); });
    expect(screen.getByTestId('embed-mute-toggle')).toHaveTextContent('소리 켜기');
    expect(screen.getByTestId('embed-mute-toggle')).toHaveAttribute('aria-pressed', 'true');
  });

  it('없는 공유 주소는 안내만 보이고 실행하지 않는다', async () => {
    renderEmbed('2f1c9a4e-5b6d-4c7e-8f90-123456789abc');
    await waitFor(() => expect(screen.getByTestId('embed-status')).toHaveTextContent('작품을 찾을 수 없습니다'));
    expect(engine.runCode).not.toHaveBeenCalled();
  });

  it('연결 실패는 없는 주소와 다르게 안내한다', async () => {
    data.share = { code: null, title: null, error: 'unavailable' };
    renderEmbed('solar');
    await waitFor(() => expect(screen.getByTestId('embed-status')).toHaveTextContent('작품을 불러오지 못했습니다'));
    expect(engine.runCode).not.toHaveBeenCalled();
  });
});
