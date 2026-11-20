/**
 * 3D 화면의 마우스·손가락 입력을 Python의 scene.mouse 와 scene.bind 이벤트로 옮깁니다.
 *
 * - 누를 때와 뗄 때도 scene.mouse.pos를 그 자리로 고칩니다. 손가락은 누르기 전에 움직이지 않으므로
 *   이렇게 하지 않으면 이전에 누른 자리가 남습니다.
 * - 첫 손가락(주 포인터)만 mousedown·mouseup·click·mousemove를 보냅니다. 두 번째 손가락은
 *   카메라 조작(OrbitControls의 두 손가락 확대·이동)에만 쓰입니다.
 * - 브라우저가 터치를 취소하면(pointercancel, iOS에서 자주 생김) mouseup으로 마무리해
 *   Python 쪽이 누른 상태로 남지 않게 합니다. 취소는 클릭이 아니므로 click은 보내지 않습니다.
 * - 두 번 눌러 화면 맞추기는 마우스로만 하고, 프로그램이 카메라 조작을 막았으면 하지 않습니다.
 *
 * @param {HTMLElement} element 입력을 받을 캔버스
 * @param {object} options
 * @param {string} options.canvasId
 * @param {(event: PointerEvent) => { pos: number[] | null, pick: string | null }} options.locate 화면 좌표 → 3D 위치·고른 물체
 * @param {(name: string, canvasId: string) => boolean} options.isEventBound
 * @param {(payload: object) => void} options.postEvent
 * @param {(pos: number[], pick: string | null, canvasId: string) => void} options.postMouseState
 * @param {() => boolean} [options.canFit] 두 번 눌러 화면 맞추기를 해도 되는가(카메라 조작이 막히지 않았는가)
 * @param {() => void} [options.fit]
 * @returns {() => void} 이벤트 연결을 푸는 함수
 */
export function attachPointerInput(element, { canvasId, locate, isEventBound, postEvent, postMouseState, canFit = () => true, nativeZoomEnabled = () => true, fit = () => {} }) {
  let activePointerId = null; // 지금 누르고 있는 주 포인터
  let lastPointerType = 'mouse';
  let lastHit = { pos: null, pick: null };

  const isPrimary = (event) => event.isPrimary !== false;
  const bound = (name) => isEventBound(name, canvasId);
  // 프로그램이 기본 줌을 끄고 zoom 이벤트를 요청했을 때만 제스처를 넘깁니다.
  const customZoom = () => !nativeZoomEnabled() && bound('zoom');
  const touches = new Map();
  let pinching = false;
  let lastSpan = 0;
  const span = () => {
    const [a, b] = touches.values();
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const onWheel = (event) => {
    if (!customZoom()) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
    postEvent({ canvas_id: canvasId, name: 'zoom', value: -event.deltaY * unit / 180 });
  };
  const send = (name, hit) => postEvent({ canvas_id: canvasId, name, ...hit });
  const updateMouse = (event) => {
    const hit = { ...locate(event), clientX: event.clientX, clientY: event.clientY };
    lastHit = hit;
    if (hit.pos) {
      postMouseState(hit.pos, hit.pick, canvasId);
    }
    return hit;
  };
  const releaseCapture = (event) => {
    try {
      if (element.hasPointerCapture?.(event.pointerId)) element.releasePointerCapture(event.pointerId);
    } catch {
      // 이미 풀린 포인터는 그대로 둡니다.
    }
  };

  const onPointerDown = (event) => {
    lastPointerType = event.pointerType || 'mouse';
    if (event.pointerType === 'touch' && customZoom()) {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touches.size === 2) {
        lastSpan = span();
        pinching = true;
        if (activePointerId !== null && bound('mouseup')) send('mouseup', lastHit);
        activePointerId = null;
      }
      if (pinching) return;
    }
    if (!isPrimary(event)) return;
    activePointerId = event.pointerId;
    if (bound('mousedown') && bound('mouseup')) element.setPointerCapture?.(event.pointerId);
    element.focus?.({ preventScroll: true });
    const hit = updateMouse(event);
    if (bound('mousedown')) send('mousedown', hit);
  };
  const onPointerUp = (event) => {
    touches.delete(event.pointerId);
    if (touches.size === 0) pinching = false;
    if (!isPrimary(event) || event.pointerId !== activePointerId) return;
    activePointerId = null;
    const hit = updateMouse(event);
    if (bound('mouseup')) send('mouseup', hit);
    if (bound('click')) send('click', hit);
  };
  const onPointerCancel = (event) => {
    touches.delete(event.pointerId);
    if (touches.size === 0) pinching = false;
    if (event.pointerId !== activePointerId) return;
    activePointerId = null;
    releaseCapture(event);
    // 취소 이벤트의 좌표는 믿을 수 없어 마지막으로 본 자리를 씁니다.
    if (bound('mouseup')) send('mouseup', lastHit);
  };
  const onPointerMove = (event) => {
    if (touches.has(event.pointerId)) {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pinching && touches.size === 2 && customZoom()) {
        const next = span();
        if (lastSpan > 0 && next > 0) {
          postEvent({ canvas_id: canvasId, name: 'zoom', value: Math.log2(next / lastSpan) });
        }
        lastSpan = next;
      }
      if (pinching) return;
    }
    if (!isPrimary(event)) return;
    // scene.mouse.pos는 늘 갱신합니다(폴링용).
    const hit = updateMouse(event);
    if (bound('mousemove')) send('mousemove', hit);
  };
  const onDblClick = (event) => {
    if ((event.pointerType || lastPointerType) === 'touch') return;
    if (!canFit()) return;
    fit();
  };

  element.addEventListener('wheel', onWheel, { passive: false });
  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerCancel);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('dblclick', onDblClick);
  return () => {
    element.removeEventListener('wheel', onWheel);
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointerup', onPointerUp);
    element.removeEventListener('pointercancel', onPointerCancel);
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('dblclick', onDblClick);
  };
}
