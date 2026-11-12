import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import useAppStore from '../../stores/appStore';
import CameraSystem from '../../engine/camera-system';
import { createRenderGate } from '../../engine/render-gate';
import AudioNoteIndicator from './AudioNoteIndicator';
import { postCameraState, postEvent, postMouseState, postPressedKeys } from '../../engine/pyodide-singleton';
import { isEventBound, updateBillboards, registerCanvasScene } from '../../engine/vpython-bridge';
import useFullscreen from '../../hooks/useFullscreen';
import { useOptionalI18n } from '../../i18n/useI18n';

const THEME_BG = {
  'creative-light': 0xf8fafc,
  'deep-dark': 0x0f172a,
  'ocean-breeze': 0xf0f9ff,
  'sunset-glow': 0xfffbf5,
  'forest-night': 0x071a0f,
  'lavender-dream': 0xfaf5ff,
  'midnight-purple': 0x13081f,
  'rose-garden': 0xfff1f2,
  'cyber-neon': 0x0a0a0f,
};

/**
 * @param {object} props
 * @param {{ onRun?: () => void, onStop?: () => void, isRunning?: boolean, isReady?: boolean }} [props.controls]
 *   전체 화면 안에서도 실행·정지할 수 있게 부모가 넘기는 핸들러. 전체 화면일 때만 화면에 그립니다.
 */
export default function Viewport3D({ sceneRef, onSceneReady, initialCameraPosition, controls, canvasId = 'scene' }) {
  const containerRef = useRef(null);
  const sceneForChildren = useRef(null);
  const wrapperRef = useRef(null);
  const fullscreen = useFullscreen(wrapperRef);
  // 교실 앱은 I18nProvider 없이 이 구성 요소를 쓰므로 선택적 훅을 씁니다.
  const { t } = useOptionalI18n();
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraSystemRef = useRef(null);
  const animFrameRef = useRef(null);
  const gridRef = useRef(null);
  const axesRef = useRef(null);
  const titleRef = useRef(null);
  const captionRef = useRef(null);
  const [extraCanvases, setExtraCanvases] = useState([]);
  const [defaultHasObjects, setDefaultHasObjects] = useState(false);
  const [showAxes, setShowAxes] = useState(false);
  // 기본은 고정 카메라입니다. 켜면 실행 중에도 계속 화면에 맞춥니다(예전 "자동").
  const [continuousFit, setContinuousFit] = useState(false);
  // WebGL을 만들 수 없는 컴퓨터에서는 화면 영역에만 안내를 표시하고 편집기·콘솔은 그대로 둡니다.
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const startingCamera = useRef(initialCameraPosition);
  const theme = useAppStore((s) => s.theme);

  const initialSceneSetup = useRef({ canvasId, onSceneReady, sceneRef, theme, continuousFit });

  useEffect(() => {
    const { canvasId, onSceneReady, sceneRef, theme, continuousFit } = initialSceneSetup.current;
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 씬
    const scene = new THREE.Scene();
    scene._vpCanvasId = canvasId;
    if (canvasId === 'scene') {
      scene._canvasHost = {
        create: cmd => setExtraCanvases(items => items.some(item => item.id === cmd.canvas_id) ? items : [...items, { id: cmd.canvas_id, epoch: scene._canvasEpoch || 0 }]),
        resize: cmd => setExtraCanvases(items => items.map(item => item.id === cmd.canvas_id ? { ...item, ...(cmd.width ? { width: cmd.width } : {}), ...(cmd.height ? { height: cmd.height } : {}) } : item)),
        reset: () => { setExtraCanvases([]); setDefaultHasObjects(false); },
        showDefault: () => setDefaultHasObjects(true),
        remove: id => setExtraCanvases(items => items.filter(item => item.id !== id)),
      };
    }
    scene.background = new THREE.Color(THEME_BG[theme] || 0xf7f8fa);

    // 카메라 — 기본 거리를 8로 줄여 가까이에서 시작
    const camera = new THREE.PerspectiveCamera(60, (width / height) || 1, 0.1, 1000);
    const initial = startingCamera.current;
    if (Array.isArray(initial) && initial.length === 3 && initial.every(Number.isFinite)) camera.position.set(...initial);
    else camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 렌더러 — 저사양 대응
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: window.devicePixelRatio <= 1,
        alpha: false,
        preserveDrawingBuffer: true,
      });
    } catch (error) {
      console.warn('[VPyLab] WebGL을 시작하지 못했습니다.', error);
      queueMicrotask(() => setWebglUnavailable(true));
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1;
    controls.maxDistance = 100;
    controlsRef.current = controls;

    // 카메라 시스템 — 첫 장면에 한 번 맞춘 뒤 고정합니다
    const camSystem = new CameraSystem(camera, controls, scene, {
      continuousFit,
    });
    cameraSystemRef.current = camSystem;
    // bridge.js에서 scene._cameraSystem으로 접근 (scene.range/center/autoscale 처리)
    scene._cameraSystem = camSystem;

    // 더블클릭 → 화면에 한 번 맞추기
    const onDblClick = () => {
      camSystem.fitOnce();
    };
    renderer.domElement.addEventListener('dblclick', onDblClick);

    // === scene.bind / scene.mouse 이벤트 디스패치 ===
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();      // -1..1 NDC 좌표
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // z=0 평면
    const intersection = new THREE.Vector3();

    function computePosFromEvent(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      // 1) 객체 픽 — meshRegistry의 모든 mesh를 순회하지 않고 scene 자식 사용
      const targets = [];
      scene.traverse((o) => {
        if (o.userData?.vpId && o.visible !== false) targets.push(o);
      });
      const hits = raycaster.intersectObjects(targets, true);
      let pick = null;
      let pos = null;
      if (hits.length > 0) {
        pos = [hits[0].point.x, hits[0].point.y, hits[0].point.z];
        // 픽 객체의 vpId 찾기 (parent를 따라 올라감)
        let o = hits[0].object;
        while (o && !o.userData?.vpId) o = o.parent;
        pick = o?.userData?.vpId || null;
      } else {
        // 2) 객체가 없으면 z=0 평면과의 교점
        if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
          pos = [intersection.x, intersection.y, intersection.z];
        }
      }
      return { pos, pick };
    }

    const onPointerDown = (e) => {
      renderer.domElement.focus({ preventScroll: true });
      if (!isEventBound('mousedown', canvasId) && !isEventBound('click', canvasId)) return;
      const { pos, pick } = computePosFromEvent(e);
      if (isEventBound('mousedown', canvasId)) postEvent({ canvas_id: canvasId, name: 'mousedown', pos, pick });
    };
    const onPointerUp = (e) => {
      const downBound = isEventBound('mouseup', canvasId) || isEventBound('click', canvasId);
      if (!downBound) return;
      const { pos, pick } = computePosFromEvent(e);
      if (isEventBound('mouseup', canvasId)) postEvent({ canvas_id: canvasId, name: 'mouseup', pos, pick });
      if (isEventBound('click', canvasId)) postEvent({ canvas_id: canvasId, name: 'click', pos, pick });
    };
    const onPointerMove = (e) => {
      // mouse pos는 항상 갱신 (scene.mouse.pos 폴링용)
      const { pos, pick } = computePosFromEvent(e);
      if (pos) postMouseState(pos, pick, canvasId);
      if (isEventBound('mousemove', canvasId)) postEvent({ canvas_id: canvasId, name: 'mousemove', pos, pick });
    };
    // keysdown() 폴링용 — 현재 눌려있는 키 셋
    const pressedKeys = new Set();
    const flushKeys = () => postPressedKeys([...pressedKeys]);

    renderer.domElement.tabIndex = 0;
    const acceptsKeyboard = () => !document.activeElement || document.activeElement === document.body || document.activeElement === renderer.domElement;
    const onKeyDown = (e) => {
      if (!acceptsKeyboard() || (document.activeElement === document.body && canvasId !== 'scene')) return;
      if (!pressedKeys.has(e.key)) {
        pressedKeys.add(e.key);
        flushKeys();
      }
      if (isEventBound('keydown', canvasId)) postEvent({ canvas_id: canvasId, name: 'keydown', key: e.key });
    };
    const onKeyUp = (e) => {
      if (!acceptsKeyboard() || (document.activeElement === document.body && canvasId !== 'scene')) return;
      if (pressedKeys.delete(e.key)) flushKeys();
      if (isEventBound('keyup', canvasId)) postEvent({ canvas_id: canvasId, name: 'keyup', key: e.key });
    };
    const onBlur = () => {
      // 포커스 잃을 때 모든 키 해제 (stuck key 방지)
      if (pressedKeys.size > 0) {
        pressedKeys.clear();
        flushKeys();
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // 조명 — scene.ambient / scene.lights 로 바꿀 수 있는 기본 조명
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    ambientLight.userData.vpDefaultLight = 'ambient';
    ambientLight.userData.vpDefaultColor = 0xffffff;
    ambientLight.userData.vpDefaultIntensity = 0.6;
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    dirLight.userData.vpDefaultLight = 'distant';
    scene.add(dirLight);

    // scene.title / scene.caption — 캔버스 위·아래 글자. wtext()는 같은 영역에 span으로 놓인다.
    // (텍스트 노드와 textContent만 사용한다 — innerHTML 금지)
    const overlayText = { title: '', caption: '' };
    const widgetTexts = new Map(); // wtext id → { span, anchor: 'title' | 'caption' }
    const refOf = (anchor) => (anchor === 'title' ? titleRef : captionRef);
    const renderOverlay = (anchor) => {
      const el = refOf(anchor).current;
      if (!el) return;
      el.replaceChildren(document.createTextNode(overlayText[anchor]));
      let hasContent = Boolean(overlayText[anchor]);
      for (const item of widgetTexts.values()) {
        if (item.anchor !== anchor) continue;
        el.appendChild(item.span);
        hasContent = true;
      }
      el.style.display = hasContent ? '' : 'none';
    };
    scene._overlay = {
      setTitle: (text) => { overlayText.title = text; renderOverlay('title'); },
      setCaption: (text) => { overlayText.caption = text; renderOverlay('caption'); },
      appendTitle: (text) => { overlayText.title += text; renderOverlay('title'); },
      appendCaption: (text) => { overlayText.caption += text; renderOverlay('caption'); },
      setWidgetText: (id, text, anchor) => {
        let item = widgetTexts.get(id);
        if (!item) {
          item = { span: document.createElement('span'), anchor: anchor === 'title' ? 'title' : 'caption' };
          widgetTexts.set(id, item);
        }
        item.span.textContent = String(text ?? '');
        renderOverlay(item.anchor);
      },
      removeWidgetText: (id) => {
        const item = widgetTexts.get(id);
        if (!item) return;
        widgetTexts.delete(id);
        renderOverlay(item.anchor);
      },
      clear: () => {
        overlayText.title = '';
        overlayText.caption = '';
        widgetTexts.clear();
        renderOverlay('title');
        renderOverlay('caption');
      },
    };

    // 그리드 (바닥 기준선) — 기본 숨김
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    gridHelper.visible = false;
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    // 좌표축 (XYZ) — 기본 숨김
    const axesHelper = new THREE.AxesHelper(3);
    axesHelper.visible = false;
    scene.add(axesHelper);
    axesRef.current = axesHelper;

    // sceneRef로 씬 전달 + 렌더러 참조 (썸네일 캡처용)
    if (sceneRef) {
      sceneRef.current = scene;
      sceneRef.current._renderer = renderer;
      sceneRef.current._camera = camera;
    }
    sceneForChildren.current = scene;
    scene._renderer = renderer;
    scene._camera = camera;
    // 개발 모드의 setup→cleanup→setup에서 폐기될 화면이 명령 큐를 가져가지 않게 한다.
    const readyFrame = requestAnimationFrame(() => onSceneReady?.(scene));

    let renderDirty = true;
    scene._requestRender = () => { renderDirty = true; };
    const shouldRender = createRenderGate();

    // 카메라 제어는 계속 갱신하되 변함없는 장면의 GPU 그리기는 줄입니다.
    let stateUpdateCounter = 0;
    let cameraStateSeq = 0;
    function animate(now = performance.now()) {
      animFrameRef.current = requestAnimationFrame(animate);

      // 카메라 자동 시스템 업데이트
      camSystem.update();

      controls.update();
      camSystem.updateClipPlanes();
      // billboard=True 인 3D 글자를 카메라 쪽으로 돌린다 (Group에는 onBeforeRender가 오지 않는다)
      if (shouldRender(now, camera, renderDirty)) {
        renderDirty = false;
        updateBillboards(camera, scene);
        renderer.render(scene, camera);
      }

      // 카메라 상태를 Python 쪽에 알림 (6프레임마다, 약 10Hz)
      if (++stateUpdateCounter % 6 === 0) {
        const state = camSystem.getState();
        state.seq = ++cameraStateSeq;
        state.revision = scene._cameraRevision || 0;
        state.width = renderer.domElement.clientWidth;
        state.height = renderer.domElement.clientHeight;
        postCameraState(state, canvasId);
      }
    }
    animate();

    // 리사이즈 대응
    const observer = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camSystem.resize(w, h);
      renderer.setSize(w, h);
      renderDirty = true;
    });
    observer.observe(container);

    return () => {
      delete scene._requestRender;
      observer.disconnect();
      cancelAnimationFrame(animFrameRef.current);
      cancelAnimationFrame(readyFrame);
      renderer.domElement.removeEventListener('dblclick', onDblClick);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      camSystem.dispose();
      controls.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); // 한 번만 초기화

  // 테마 변경 시 배경색만 업데이트
  useEffect(() => {
    if (sceneRef?.current) {
      sceneRef.current.background = new THREE.Color(THEME_BG[theme] || 0xf7f8fa);
      sceneRef.current._requestRender?.();
    }
  }, [theme, sceneRef]);

  // 축/그리드 토글
  useEffect(() => {
    if (gridRef.current) gridRef.current.visible = showAxes;
    if (axesRef.current) axesRef.current.visible = showAxes;
    sceneForChildren.current?._requestRender?.();
  }, [showAxes]);

  // 자동 맞춤 토글 — 처음 그릴 때는 생성자 옵션으로 이미 전달했으므로 바뀔 때만 알립니다
  const appliedContinuousFit = useRef(continuousFit);
  useEffect(() => {
    if (appliedContinuousFit.current === continuousFit) return;
    appliedContinuousFit.current = continuousFit;
    cameraSystemRef.current?.setContinuousFit(continuousFit);
  }, [continuousFit]);

  // cameraSystemRef를 외부에 노출 (Sandbox/MissionPlay에서 사용)
  useEffect(() => {
    if (sceneRef && cameraSystemRef.current) {
      // sceneRef에 카메라 시스템 접근을 위한 커스텀 속성 부착
      sceneRef.current._cameraSystem = cameraSystemRef.current;
    }
  });

  const overlayButtonStyle = {
    color: 'var(--color-text-muted)',
    backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 80%, transparent)',
    border: '1px solid transparent',
  };

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full relative"
      style={{
        overflow: extraCanvases.length ? 'auto' : undefined,
        touchAction: 'none',
        // 전체 화면 API가 없는 브라우저(iOS Safari)는 화면을 채우는 고정 배치로 대체합니다.
        ...(fullscreen.pseudo ? { position: 'fixed', inset: 0, zIndex: 9999, width: '100vw', height: '100vh', backgroundColor: 'var(--color-bg-primary)' } : {}),
      }}
      data-vpylab-viewport=""
      data-vpylab-canvas-id={canvasId}
      data-fullscreen={fullscreen.active ? 'true' : undefined}
    >
      <div className="relative w-full" style={{ height: extraCanvases.length ? (defaultHasObjects ? 320 : 0) : '100%', overflow: 'hidden' }}>
      <div ref={containerRef} className="w-full h-full" />

      {webglUnavailable && (
        <div
          role="status"
          className="absolute inset-0 flex items-center justify-center p-6 text-center"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
          data-vpylab-webgl-unavailable=""
        >
          <div className="max-w-sm">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('viewport.webglUnavailable')}</p>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('viewport.webglUnavailableHelp')}</p>
          </div>
        </div>
      )}

      {/* 전체 화면 안의 실행·정지 — 부모 도구 모음이 가려지므로 여기서 그립니다. */}
      {fullscreen.active && controls && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2" data-vpylab-fullscreen-controls="">
          {controls.isRunning ? (
            <button type="button" onClick={controls.onStop} className="toolbar-btn --stop">{t('editor.stop')}</button>
          ) : (
            <button type="button" onClick={controls.onRun} disabled={controls.isReady === false} className="toolbar-btn --run">{t('editor.run')}</button>
          )}
          <button type="button" onClick={() => { void fullscreen.exit(); }} className="toolbar-btn">{t('viewport.exitFullscreen')} (Esc)</button>
        </div>
      )}

      {/* scene.title / scene.caption */}
      <div
        ref={titleRef}
        className="absolute top-2 left-2 max-w-[70%] text-sm font-semibold px-2 py-1 rounded whitespace-pre-wrap"
        style={{ display: 'none', color: 'var(--color-text-primary)', backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 80%, transparent)' }}
        data-vpylab-title=""
      />
      <div
        ref={captionRef}
        className="absolute bottom-2 left-2 max-w-[90%] text-xs px-2 py-1 rounded whitespace-pre-wrap"
        style={{ display: 'none', color: 'var(--color-text-secondary)', backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 80%, transparent)' }}
        data-vpylab-caption=""
      />

      {/* 화면 조작부: 전체 화면 · 화면에 맞추기 · 자동 맞춤 · 좌표축 */}
      {!webglUnavailable && <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
        {/* 전체 화면 */}
        <button
          type="button"
          onClick={() => { void fullscreen.toggle(); }}
          className="text-xs px-2 py-0.5 rounded cursor-pointer"
          style={fullscreen.active ? { ...overlayButtonStyle, color: 'var(--color-accent)', border: '1px solid var(--color-accent)' } : overlayButtonStyle}
          title={fullscreen.active ? t('viewport.exitFullscreen') : t('viewport.fullscreen')}
          aria-label={fullscreen.active ? t('viewport.exitFullscreen') : t('viewport.fullscreen')}
          aria-pressed={fullscreen.active}
          data-vpylab-fullscreen-toggle=""
        >
          {fullscreen.active ? '✕ ' : '⛶ '}{t('viewport.fullscreen')}
        </button>
        {/* 화면에 맞추기 — 지금 있는 물체가 모두 보이도록 한 번만 맞춥니다 */}
        <button
          type="button"
          onClick={() => cameraSystemRef.current?.fitOnce()}
          className="text-xs px-2 py-0.5 rounded cursor-pointer"
          style={overlayButtonStyle}
          title={t('viewport.fitOnceTip')}
          data-vpylab-fit-once=""
        >
          {t('viewport.fitOnce')}
        </button>

        {/* 자동 맞춤 — 기본은 꺼짐(고정 카메라) */}
        <label
          className="flex items-center gap-1.5 text-xs cursor-pointer select-none px-2 py-1 rounded"
          style={{
            color: continuousFit ? 'var(--color-accent)' : 'var(--color-text-muted)',
            backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 80%, transparent)',
            border: continuousFit ? '1px solid var(--color-accent)' : 'none',
          }}
          title={t('viewport.autoFitTip')}
        >
          <input
            type="checkbox"
            checked={continuousFit}
            onChange={(e) => setContinuousFit(e.target.checked)}
            className="accent-current"
            data-vpylab-auto-fit=""
          />
          {t('viewport.autoFit')}
        </label>

        {/* 축 토글 */}
        <label
          className="flex items-center gap-1.5 text-xs cursor-pointer select-none px-2 py-1 rounded"
          style={{
            color: 'var(--color-text-muted)',
            backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 80%, transparent)',
          }}
        >
          <input
            type="checkbox"
            checked={showAxes}
            onChange={(e) => setShowAxes(e.target.checked)}
            className="accent-current"
          />
          {t('viewport.axes')}
        </label>
      </div>}
      </div>
      {canvasId === 'scene' && <AudioNoteIndicator />}
      {extraCanvases.map(item => <div key={`${item.id}-${item.epoch}`} className="relative border-t" style={{ height: Math.max(180, Math.min(item.height || 320, 1000)), width: item.width ? Math.min(item.width, 1600) : '100%', maxWidth: '100%', borderColor: 'var(--color-border)' }}>
        <Viewport3D canvasId={item.id} onSceneReady={child => registerCanvasScene(sceneRef?.current || sceneForChildren.current, item.id, child)} />
      </div>)}
    </div>
  );
}
