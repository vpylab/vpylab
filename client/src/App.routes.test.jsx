import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// 화면 본문은 이 테스트의 대상이 아닙니다. 어느 화면으로 가는지만 확인합니다.
vi.mock('./pages/Home', () => ({ default: () => <p>첫 화면</p> }));
vi.mock('./pages/Gallery', () => ({ default: () => <p>GlowScript 작품 목록</p> }));
vi.mock('./pages/SourceProject', () => ({ default: () => <p>GlowScript 작품</p> }));
vi.mock('./engine/idle-prewarm', () => ({ scheduleIdlePrewarm: () => () => {} }));

afterEach(() => { cleanup(); window.history.pushState({}, '', '/'); });

async function open(path) {
  window.history.pushState({}, '', path);
  const { default: App } = await import('./App.jsx');
  render(<App />);
}

describe('없는 주소', () => {
  it('예전의 대시보드·로그인 복귀 주소는 첫 화면으로 간다', async () => {
    await open('/dashboard');
    expect(await screen.findByText('첫 화면')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
    cleanup();
    await open('/auth/callback');
    expect(await screen.findByText('첫 화면')).toBeInTheDocument();
  });

  it('예전의 작품 상세 주소는 갤러리로 간다', async () => {
    await open('/gallery/3f2c1a9e-0b7d-4c55-9a10-ffeeddccbbaa');
    expect(await screen.findByText('GlowScript 작품 목록')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/gallery');
  });

  it('GlowScript 작품 주소는 그대로 열린다', async () => {
    await open('/gallery/glowscript/abc');
    expect(await screen.findByText('GlowScript 작품')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/gallery/glowscript/abc');
  });
});
