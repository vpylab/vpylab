import { describe, it, expect, vi, afterEach } from 'vitest';
import { shouldPrewarm, scheduleIdlePrewarm } from './idle-prewarm.js';

afterEach(() => vi.useRealTimers());

function env({ readyState = 'complete', hidden = false, pathname = '/', connection, deviceMemory, idle = true } = {}) {
  const docListeners = {};
  const winListeners = {};
  const doc = {
    readyState, hidden,
    addEventListener: (t, f) => { docListeners[t] = f; },
    removeEventListener: (t) => { delete docListeners[t]; },
  };
  const win = {
    location: { pathname },
    Worker: function Worker() {},
    setTimeout: (f, ms) => setTimeout(f, ms),
    clearTimeout: (id) => clearTimeout(id),
    addEventListener: (t, f) => { winListeners[t] = f; },
    removeEventListener: (t) => { delete winListeners[t]; },
    ...(idle ? { requestIdleCallback: (f) => setTimeout(f, 0), cancelIdleCallback: (id) => clearTimeout(id) } : {}),
  };
  return { doc, win, nav: { connection, deviceMemory }, docListeners, winListeners };
}

describe('shouldPrewarm', () => {
  it('보통 환경에서는 미리 띄운다', () => {
    expect(shouldPrewarm({ connection: { effectiveType: '4g' }, deviceMemory: 8, pathname: '/' })).toBe(true);
    expect(shouldPrewarm({})).toBe(true);
  });
  it('데이터 절약·2G·메모리 4GB 미만에서는 띄우지 않는다', () => {
    expect(shouldPrewarm({ connection: { saveData: true } })).toBe(false);
    expect(shouldPrewarm({ connection: { effectiveType: '2g' } })).toBe(false);
    expect(shouldPrewarm({ connection: { effectiveType: 'slow-2g' } })).toBe(false);
    expect(shouldPrewarm({ deviceMemory: 2 })).toBe(false);
    expect(shouldPrewarm({ connection: { effectiveType: '3g' }, deviceMemory: 4 })).toBe(true);
  });
  it('임베드·로그인 콜백 화면에서는 띄우지 않는다', () => {
    expect(shouldPrewarm({ pathname: '/embed/abc' })).toBe(false);
    expect(shouldPrewarm({ pathname: '/auth/callback' })).toBe(false);
    expect(shouldPrewarm({ pathname: '/authors' })).toBe(true);
  });
  it('Web Worker가 없으면 띄우지 않는다', () => {
    expect(shouldPrewarm({ hasWorker: false })).toBe(false);
  });
});

describe('scheduleIdlePrewarm', () => {
  it('페이지를 다 불러온 뒤 잠시 기다렸다가 한 번만 띄운다', () => {
    vi.useFakeTimers();
    const e = env();
    const warm = vi.fn();
    scheduleIdlePrewarm({ warm, ...e, delayMs: 1000 });
    vi.advanceTimersByTime(999);
    expect(warm).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10);
    expect(warm).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_000);
    expect(warm).toHaveBeenCalledTimes(1);
  });

  it('load 이벤트 전에는 시작하지 않는다', () => {
    vi.useFakeTimers();
    const e = env({ readyState: 'loading' });
    const warm = vi.fn();
    scheduleIdlePrewarm({ warm, ...e, delayMs: 0 });
    vi.advanceTimersByTime(5000);
    expect(warm).not.toHaveBeenCalled();
    e.winListeners.load();
    vi.advanceTimersByTime(10);
    expect(warm).toHaveBeenCalledTimes(1);
  });

  it('숨은 탭이면 다시 보일 때까지 미룬다', () => {
    vi.useFakeTimers();
    const e = env({ hidden: true });
    const warm = vi.fn();
    scheduleIdlePrewarm({ warm, ...e, delayMs: 0 });
    vi.advanceTimersByTime(100);
    expect(warm).not.toHaveBeenCalled();
    e.doc.hidden = false;
    e.docListeners.visibilitychange();
    expect(warm).toHaveBeenCalledTimes(1);
  });

  it('조건이 맞지 않으면 띄우지 않는다', () => {
    vi.useFakeTimers();
    const e = env({ connection: { saveData: true } });
    const warm = vi.fn();
    scheduleIdlePrewarm({ warm, ...e, delayMs: 0 });
    vi.advanceTimersByTime(100);
    expect(warm).not.toHaveBeenCalled();
  });

  it('requestIdleCallback이 없는 브라우저(사파리)에서도 동작한다', () => {
    vi.useFakeTimers();
    const e = env({ idle: false });
    const warm = vi.fn();
    scheduleIdlePrewarm({ warm, ...e, delayMs: 0 });
    vi.advanceTimersByTime(10);
    expect(warm).toHaveBeenCalledTimes(1);
  });

  it('취소하면 띄우지 않는다', () => {
    vi.useFakeTimers();
    const e = env();
    const warm = vi.fn();
    const cancel = scheduleIdlePrewarm({ warm, ...e, delayMs: 1000 });
    cancel();
    vi.advanceTimersByTime(5000);
    expect(warm).not.toHaveBeenCalled();
  });
});
