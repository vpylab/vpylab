import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as runtime from './pyodide-singleton';

let workers;
let subscriptions;
class FakeWorker {
  constructor() {
    this.postMessage = vi.fn();
    this.terminate = vi.fn();
    workers.push(this);
  }
  emit(message) { this.onmessage?.({ data: message }); }
}

function acquire() {
  const onMessage = vi.fn();
  const unsubscribe = runtime.subscribe({ onMessage });
  subscriptions.push(unsubscribe);
  const pending = runtime.initIfNeeded();
  pending.catch(() => {});
  return { onMessage, unsubscribe, pending };
}

function park(worker = workers.at(-1)) {
  const request = worker.postMessage.mock.calls.map(([message]) => message).findLast((message) => message.type === 'park');
  expect(request).toBeDefined();
  worker.emit({ type: 'parked', token: request.token });
}

describe('실습 이동에서 Python 엔진 재사용', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    workers = [];
    subscriptions = [];
    vi.stubGlobal('Worker', FakeWorker);
    runtime.hardStop();
  });
  afterEach(() => {
    subscriptions.forEach(unsubscribe => unsubscribe());
    runtime.hardStop();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('초기화 중 StrictMode 재구독도 같은 준비 Promise와 Worker를 이어받는다', async () => {
    const first = acquire();
    first.unsubscribe();
    const second = acquire();
    expect(second.pending).toBe(first.pending);
    workers[0].emit({ type: 'ready' });
    await second.pending;
    expect(workers).toHaveLength(1);
    expect(workers[0].terminate).not.toHaveBeenCalled();
  });

  it('학생 상태 정리 확인 전에는 실행을 막고 확인 후 준비된 엔진을 재사용한다', async () => {
    const first = acquire();
    workers[0].emit({ type: 'ready' });
    first.unsubscribe();
    const second = acquire();
    expect(runtime.getStatus()).toBe('stopping');
    expect(runtime.runCode('print(2)')).toBeNull();
    workers[0].emit({ type: 'parked', token: -1 });
    expect(runtime.getStatus()).toBe('stopping');
    park();
    await second.pending;
    expect(runtime.getStatus()).toBe('ready');
    expect(workers).toHaveLength(1);
    expect(runtime.runCode('print(2)')).toBeGreaterThan(0);
    expect(second.onMessage).toHaveBeenCalledWith({ type: 'ready', reused: true });
  });

  it('실행 중 이탈은 협조적 정지 후 재사용하며 옛 출력과 묶음을 새 화면에 보내지 않는다', async () => {
    const first = acquire();
    workers[0].emit({ type: 'ready' });
    const oldRun = runtime.runCode('while True: rate(30)');
    first.unsubscribe();
    const second = acquire();
    workers[0].emit({ type: 'batch', runId: oldRun, commands: [{ action: 'sound' }] });
    workers[0].emit({ type: 'stdout', runId: oldRun, text: '이전 화면' });
    workers[0].emit({ type: 'done', runId: oldRun });
    workers[0].emit({ type: 'done', runId: oldRun });
    expect(workers[0].postMessage.mock.calls.filter(([message]) => message.type === 'park')).toHaveLength(1);
    park();
    await second.pending;
    const newRun = runtime.runCode('print(2)');
    expect(newRun).toBeGreaterThan(oldRun);
    workers[0].emit({ type: 'stdout', runId: oldRun, text: '늦은 이전 출력' });
    expect(second.onMessage.mock.calls.some(([message]) => ['batch', 'stdout', 'done'].includes(message.type))).toBe(false);
    workers[0].emit({ type: 'stdout', runId: newRun, text: '현재 화면' });
    expect(second.onMessage).toHaveBeenCalledWith({ type: 'stdout', runId: newRun, text: '현재 화면' });
    expect(workers[0].terminate).not.toHaveBeenCalled();
  });

  it('실행 중 이탈 후 재진입이 없으면 무응답 Worker만 종료하고 재초기화하지 않는다', () => {
    const first = acquire();
    workers[0].emit({ type: 'ready' });
    runtime.runCode('while True: pass');
    first.unsubscribe();
    vi.advanceTimersByTime(750);
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(runtime.getStatus()).toBe('idle');
    vi.advanceTimersByTime(600_000);
    expect(workers).toHaveLength(1);
  });

  it('무응답 정리 중 새 화면이 기다리면 새 엔진으로 자동 복구한다', () => {
    const first = acquire();
    workers[0].emit({ type: 'ready' });
    const oldRun = runtime.runCode('while True: pass');
    const oldMessage = workers[0].onmessage;
    first.unsubscribe();
    const second = acquire();
    vi.advanceTimersByTime(750);
    expect(workers).toHaveLength(2);
    expect(runtime.getStatus()).toBe('loading');
    oldMessage({ data: { type: 'done', runId: oldRun } });
    expect(runtime.getStatus()).toBe('loading');
    workers[1].emit({ type: 'ready' });
    expect(runtime.getStatus()).toBe('ready');
    expect(second.onMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'done' }));
  });

  it('10분 유휴 보관이 만료되면 해제하고 이후 진입은 새 엔진을 준비한다', () => {
    const first = acquire();
    workers[0].emit({ type: 'ready' });
    first.unsubscribe();
    park();
    vi.advanceTimersByTime(599_999);
    expect(workers[0].terminate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    acquire();
    expect(workers).toHaveLength(2);
  });

  it('재구독은 유휴 종료 예약을 취소한다', () => {
    const first = acquire();
    workers[0].emit({ type: 'ready' });
    first.unsubscribe();
    park();
    vi.advanceTimersByTime(599_999);
    acquire();
    vi.advanceTimersByTime(600_000);
    expect(workers).toHaveLength(1);
    expect(workers[0].terminate).not.toHaveBeenCalled();
  });

  it('Python 상태 정리가 실패하면 캐시로 재사용하지 않고 새 화면만 복구한다', () => {
    const first = acquire();
    workers[0].emit({ type: 'ready' });
    first.unsubscribe();
    acquire();
    const request = workers[0].postMessage.mock.calls.at(-1)[0];
    workers[0].emit({ type: 'parked', token: request.token, error: true });
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(workers).toHaveLength(2);
    expect(runtime.getStatus()).toBe('loading');
  });

  it('실습을 떠난 뒤 다른 탭에서 자료를 봐도 10분 이내에는 엔진을 유지한다', () => {
    const first = acquire();
    workers[0].emit({ type: 'ready' });
    first.unsubscribe();
    park();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(workers[0].terminate).not.toHaveBeenCalled();
    expect(runtime.getStatus()).toBe('ready');
    acquire();
    expect(workers).toHaveLength(1);
  });

  it.each(['visibility', 'subscribe'])('배경 탭 타이머가 늦어져도 %s에서 벽시계 만료를 확인한다', (trigger) => {
    const first = acquire();
    workers[0].emit({ type: 'ready' });
    first.unsubscribe();
    park();
    vi.setSystemTime(Date.now() + 600_001);
    if (trigger === 'visibility') document.dispatchEvent(new Event('visibilitychange'));
    else acquire();
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(workers).toHaveLength(trigger === 'subscribe' ? 2 : 1);
  });

  it('실습을 계속 쓰는 동안에는 탭 가시성만으로 엔진을 버리지 않는다', () => {
    acquire();
    workers[0].emit({ type: 'ready' });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(workers[0].terminate).not.toHaveBeenCalled();
  });
});
