import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachPointerInput } from './pointer-input';

// jsdom의 MouseEvent 좌표는 읽기 전용이라, 필요한 값만 담은 Event로 포인터 이벤트를 흉내 냅니다.
function pointer(type, { id = 1, primary = true, kind = 'touch', x = 0, y = 0 } = {}) {
  return Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
    pointerId: id, isPrimary: primary, pointerType: kind, clientX: x, clientY: y,
  });
}

describe('attachPointerInput', () => {
  let el;
  let log;
  let bound;
  let detach;
  let opts;

  beforeEach(() => {
    el = document.createElement('canvas');
    document.body.appendChild(el);
    log = [];
    bound = new Set(['mousedown', 'mouseup', 'click', 'mousemove']);
    opts = {
      canvasId: 'scene',
      // 화면 좌표를 그대로 3D 위치로 돌려 주는 가짜 계산
      locate: e => ({ pos: [e.clientX, e.clientY, 0], pick: null }),
      isEventBound: name => bound.has(name),
      postEvent: vi.fn(payload => log.push(['event', payload.name, payload.pos])),
      postMouseState: vi.fn(pos => log.push(['mouse', pos])),
      canFit: vi.fn(() => true),
      fit: vi.fn(),
    };
    detach = attachPointerInput(el, opts);
  });
  afterEach(() => {
    detach();
    el.remove();
  });

  it('손가락으로 누르고 뗄 때 scene.mouse.pos를 먼저 그 자리로 고친 뒤 이벤트를 보낸다', () => {
    el.dispatchEvent(pointer('pointerdown', { x: 10, y: 20 }));
    el.dispatchEvent(pointer('pointerup', { x: 30, y: 40 }));
    expect(log).toEqual([
      ['mouse', [10, 20, 0]],
      ['event', 'mousedown', [10, 20, 0]],
      ['mouse', [30, 40, 0]],
      ['event', 'mouseup', [30, 40, 0]],
      ['event', 'click', [30, 40, 0]],
    ]);
  });

  it('바인딩이 없어도 누른 자리는 scene.mouse.pos에 들어간다', () => {
    bound.clear();
    el.dispatchEvent(pointer('pointerdown', { x: 5, y: 6 }));
    expect(opts.postMouseState).toHaveBeenCalledWith([5, 6, 0], null, 'scene');
    expect(opts.postEvent).not.toHaveBeenCalled();
  });

  it('두 번째 손가락은 mousedown·mouseup·click·mousemove를 만들지 않는다', () => {
    el.dispatchEvent(pointer('pointerdown', { id: 1, x: 1, y: 1 }));
    el.dispatchEvent(pointer('pointerdown', { id: 2, primary: false, x: 9, y: 9 }));
    el.dispatchEvent(pointer('pointermove', { id: 2, primary: false, x: 8, y: 8 }));
    el.dispatchEvent(pointer('pointerup', { id: 2, primary: false, x: 8, y: 8 }));
    el.dispatchEvent(pointer('pointerup', { id: 1, x: 2, y: 2 }));
    expect(log.filter(([kind]) => kind === 'event').map(([, name]) => name)).toEqual(['mousedown', 'mouseup', 'click']);
    expect(opts.postMouseState).not.toHaveBeenCalledWith([9, 9, 0], null, 'scene');
    expect(opts.postMouseState).not.toHaveBeenCalledWith([8, 8, 0], null, 'scene');
  });

  it('터치가 취소되면 마지막 자리에서 mouseup을 보내고 click은 보내지 않으며 포인터 잡기를 푼다', () => {
    el.hasPointerCapture = vi.fn(() => true);
    el.releasePointerCapture = vi.fn();
    el.dispatchEvent(pointer('pointerdown', { x: 1, y: 2 }));
    el.dispatchEvent(pointer('pointermove', { x: 3, y: 4 }));
    el.dispatchEvent(pointer('pointercancel', { x: 0, y: 0 }));
    const events = log.filter(([kind]) => kind === 'event');
    expect(events.at(-1)).toEqual(['event', 'mouseup', [3, 4, 0]]);
    expect(events.some(([, name]) => name === 'click')).toBe(false);
    expect(el.releasePointerCapture).toHaveBeenCalledWith(1);
    // 취소 뒤에 늦게 온 pointerup은 무시한다
    const count = opts.postEvent.mock.calls.length;
    el.dispatchEvent(pointer('pointerup', { x: 3, y: 4 }));
    expect(opts.postEvent.mock.calls.length).toBe(count);
  });

  it('누르지 않은 포인터의 취소는 무시한다', () => {
    el.dispatchEvent(pointer('pointercancel', { id: 7 }));
    expect(opts.postEvent).not.toHaveBeenCalled();
  });

  it('마우스로 두 번 누르면 화면에 맞추지만 손가락으로 두 번 누르면 맞추지 않는다', () => {
    el.dispatchEvent(pointer('pointerdown', { kind: 'mouse' }));
    el.dispatchEvent(pointer('pointerup', { kind: 'mouse' }));
    el.dispatchEvent(new Event('dblclick', { bubbles: true }));
    expect(opts.fit).toHaveBeenCalledTimes(1);

    el.dispatchEvent(pointer('pointerdown', { kind: 'touch' }));
    el.dispatchEvent(pointer('pointerup', { kind: 'touch' }));
    el.dispatchEvent(new Event('dblclick', { bubbles: true }));
    expect(opts.fit).toHaveBeenCalledTimes(1);
  });

  it('프로그램이 카메라 조작을 막았으면 마우스로 두 번 눌러도 맞추지 않는다', () => {
    opts.canFit.mockReturnValue(false);
    el.dispatchEvent(pointer('pointerdown', { kind: 'mouse' }));
    el.dispatchEvent(new Event('dblclick', { bubbles: true }));
    expect(opts.fit).not.toHaveBeenCalled();
  });

  it('연결을 풀면 더는 이벤트를 보내지 않는다', () => {
    detach();
    el.dispatchEvent(pointer('pointerdown'));
    el.dispatchEvent(pointer('pointerup'));
    el.dispatchEvent(new Event('dblclick'));
    expect(opts.postEvent).not.toHaveBeenCalled();
    expect(opts.fit).not.toHaveBeenCalled();
  });
});
