import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const bridge = vi.hoisted(() => ({ bound: new Set() }));
const cameras = vi.hoisted(() => []);

// jsdom에는 WebGL이 없으므로 그리기만 하는 가짜 렌더러를 씁니다. 화면 크기는 200×100으로 둡니다.
vi.mock('three', async importOriginal => {
  const THREE = await importOriginal();
  class FakeRenderer {
    constructor() {
      this.domElement = document.createElement('canvas');
      this.domElement.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0 });
      // OrbitControls가 쓰는 포인터 잡기(jsdom에는 없음)
      const captured = new Set();
      this.domElement.setPointerCapture = id => captured.add(id);
      this.domElement.releasePointerCapture = id => captured.delete(id);
      this.domElement.hasPointerCapture = id => captured.has(id);
    }
    setSize() {}
    setPixelRatio() {}
    render() {}
    dispose() {}
    forceContextLoss() {}
  }
  return { ...THREE, WebGLRenderer: FakeRenderer };
});
vi.mock('../../engine/camera-system', () => ({
  default: class FakeCameraSystem {
    constructor(camera, controls) {
      this.camera = camera;
      this.controls = controls;
      this.fitOnce = vi.fn();
      cameras.push(this);
    }
    update() {}
    updateClipPlanes() {}
    getState() { return {}; }
    resize() {}
    dispose() {}
    setContinuousFit() {}
  },
}));
vi.mock('../../engine/pyodide-singleton', () => ({
  postCameraState: vi.fn(), postEvent: vi.fn(), postMouseState: vi.fn(), postPressedKeys: vi.fn(),
}));
vi.mock('../../engine/vpython-bridge', () => ({
  isEventBound: name => bridge.bound.has(name),
  updateBillboards: vi.fn(),
  registerCanvasScene: vi.fn(),
}));
vi.mock('./AudioNoteIndicator', () => ({ default: () => null }));

import { postEvent, postMouseState } from '../../engine/pyodide-singleton';
import Viewport3D from './Viewport3D';

function pointer(type, { id = 1, primary = true, kind = 'touch', x = 100, y = 50 } = {}) {
  return Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
    pointerId: id, isPrimary: primary, pointerType: kind, clientX: x, clientY: y, button: 0,
  });
}

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} disconnect() {} };
});

describe('Viewport3D 손가락 입력', () => {
  let canvas;
  let camera;

  beforeEach(() => {
    bridge.bound = new Set(['mousedown', 'mouseup', 'click']);
    cameras.length = 0;
    const { container } = render(<Viewport3D />);
    canvas = container.querySelector('canvas');
    camera = cameras.at(-1);
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('누를 때와 뗄 때 scene.mouse.pos를 손가락 자리로 고친 뒤 이벤트를 보낸다', () => {
    canvas.dispatchEvent(pointer('pointerdown', { x: 100, y: 50 }));
    canvas.dispatchEvent(pointer('pointerup', { x: 150, y: 25 }));
    const [downPos] = postMouseState.mock.calls[0];
    const [upPos] = postMouseState.mock.calls[1];
    // 화면 가운데는 z=0 평면의 원점, 오른쪽 위를 누르면 x·y가 양수인 자리
    expect(downPos[0]).toBeCloseTo(0);
    expect(downPos[1]).toBeCloseTo(0);
    expect(upPos[0]).toBeGreaterThan(0);
    expect(upPos[1]).toBeGreaterThan(0);
    expect(postEvent.mock.calls.map(([e]) => [e.name, e.pos])).toEqual([
      ['mousedown', downPos],
      ['mouseup', upPos],
      ['click', upPos],
    ]);
    // 이벤트보다 위치가 먼저 간다
    expect(postMouseState.mock.invocationCallOrder[0]).toBeLessThan(postEvent.mock.invocationCallOrder[0]);
    expect(postMouseState.mock.invocationCallOrder[1]).toBeLessThan(postEvent.mock.invocationCallOrder[1]);
  });

  it('두 번째 손가락은 무시하고, 터치가 취소되면 mouseup으로 끝낸다', () => {
    canvas.dispatchEvent(pointer('pointerdown', { id: 1 }));
    canvas.dispatchEvent(pointer('pointerdown', { id: 2, primary: false }));
    canvas.dispatchEvent(pointer('pointerup', { id: 2, primary: false }));
    canvas.dispatchEvent(pointer('pointercancel', { id: 1 }));
    expect(postEvent.mock.calls.map(([e]) => e.name)).toEqual(['mousedown', 'mouseup']);
  });

  it('마우스로 두 번 누르면 화면에 맞추고, 손가락이나 카메라 조작을 막은 프로그램에서는 맞추지 않는다', () => {
    canvas.dispatchEvent(pointer('pointerdown', { kind: 'mouse' }));
    canvas.dispatchEvent(new Event('dblclick', { bubbles: true }));
    expect(camera.fitOnce).toHaveBeenCalledTimes(1);

    canvas.dispatchEvent(pointer('pointerdown', { kind: 'touch' }));
    canvas.dispatchEvent(new Event('dblclick', { bubbles: true }));
    expect(camera.fitOnce).toHaveBeenCalledTimes(1);

    // scene.userzoom = False 가 하는 일(vpython-bridge)과 같게 카메라 조작을 막는다
    camera.controls.enableZoom = false;
    canvas.dispatchEvent(pointer('pointerdown', { kind: 'mouse' }));
    canvas.dispatchEvent(new Event('dblclick', { bubbles: true }));
    expect(camera.fitOnce).toHaveBeenCalledTimes(1);
    camera.controls.enableZoom = true;
    camera.controls.enableRotate = false; // scene.userspin = False
    canvas.dispatchEvent(new Event('dblclick', { bubbles: true }));
    expect(camera.fitOnce).toHaveBeenCalledTimes(1);
  });

  it('길게 눌러도 글자가 선택되지 않게 3D 화면 전체의 글자 선택을 막는다', () => {
    const wrapper = document.querySelector('[data-vpylab-viewport]');
    expect(wrapper.style.userSelect).toBe('none');
    expect(wrapper.style.touchAction).toBe('none');
  });
});
