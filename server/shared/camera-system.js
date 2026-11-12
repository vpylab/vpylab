// 편집기와 독립 HTML의 카메라 계산을 같은 구현으로 유지합니다.
//
// 기본 동작: 물체가 만들어진 자리에 맞춰 화면을 잡고, 물체가 움직이거나 커져도 카메라는 그대로 둔다.
// 움직이는 물체를 따라가거나 줌을 계속 바꾸지 않는다. 카메라는 다음 경우에만 바뀐다.
//   - 새 물체가 지금 화면 범위 밖에 만들어질 때 (그 물체가 만들어진 자리까지 담도록 넓힌다)
//   - 학생 코드가 scene.center·range·forward·up·fov, scene.camera.pos·axis·follow()를 사용할 때
//   - 학생이 마우스로 돌리거나 확대할 때
//   - "화면에 맞추기"(fitOnce)를 누를 때
//   - 계속 맞추기를 켰을 때 (scene.autoscale = True 또는 화면의 "자동 맞춤")
export const CAMERA_MODES = {
  AUTO_FIT: 'auto-fit',     // 카메라 시스템이 화면 맞춤을 관리 (만들어진 자리 기준, 또는 계속 맞추기)
  MANUAL: 'manual',          // 학생 코드나 마우스가 카메라를 정함
};

export function createCameraSystem(THREE, MODE = { AUTO_FIT: 'auto-fit', MANUAL: 'manual' }) {
// 기본 설정
const DEFAULTS = {
  // 화면 맞춤
  fitPadding: 1.8,           // 바운딩 박스 대비 여유 공간 배율
  fitMinDistance: 1e-9,          // 최소 카메라 거리
  continuousFit: false,       // true면 실행 중에도 계속 화면에 맞춘다 (예전 "자동")

  framingLerpFactor: 0.25,   // 기본(고정) 맞춤의 보간 속도 (빠르게 자리 잡고 멈춘다)
  centerLerpFactor: 0.12,    // 계속 맞추기의 중심 보간 속도
  zoomLerpFactor: 0.03,      // 계속 맞추기의 줌 보간 속도

  // 기본 카메라
  defaultDistance: 10 / Math.tan(Math.PI / 6),         // 물체 없을 때 기본 거리
  defaultFov: 60,
  preserveDirectionOnCenter: true, // 좌표 수업은 중심 이동 시 시선 방향도 유지하도록 선택

  // 씬 내 VPython 객체 판별
  ignoreTypes: ['GridHelper', 'AxesHelper', 'AmbientLight', 'DirectionalLight', 'PointLight'],
};

return class CameraSystem {
  constructor(camera, controls, scene, options = {}) {
    this.camera = camera;
    this.controls = controls;
    this.scene = scene;
    this.options = { ...DEFAULTS, ...options };

    this.mode = MODE.AUTO_FIT;
    this._autoEnabled = true;
    this._centerPinned = null;
    this._targetCenter = new THREE.Vector3(0, 0, 0);
    this._targetDistance = this.options.defaultDistance;
    this._currentCenter = new THREE.Vector3(0, 0, 0);
    this._currentDistance = this.options.defaultDistance;
    this._lastBounds = null;
    this._hasFit = false;
    this._userInteracted = false;
    this._frameCount = 0;

    // 고정 카메라의 기준: 물체가 처음 나타난 자리(만들어진 자리)를 모은 상자.
    // 물체가 나중에 움직이거나 커져도 이 상자는 바뀌지 않으므로 카메라도 바뀌지 않는다.
    this._homeBox = new THREE.Box3();
    this._homeSeen = new WeakSet();
    this._codeAutoscale = false;      // 학생 코드가 scene.autoscale = True를 명시했는가 (실행마다 초기화)
    this._explicitRange = null;       // scene.range로 지정한 시야 반경 (GlowScript 호환)
    this._followTarget = null;        // scene.camera.follow(obj)로 지정한 추적 대상

    // 사용자 조작 감지 — 마우스 이벤트로 수동 모드 전환
    this._onUserInteraction = () => {
      this._autoEnabled = false;
      this._explicitRange = null;
      this._centerPinned = null;
      if (this.mode !== MODE.MANUAL) {
        this.mode = MODE.MANUAL;
        this._userInteracted = true;
      }
    };

    const domElement = controls.domElement;
    if (domElement) {
      this._pointerStart = null;
      this._onPointerDown = event => { this._pointerStart = [event.clientX, event.clientY]; };
      this._onPointerMove = event => {
        if (this._pointerStart && (this.controls.enableRotate !== false || this.controls.enablePan !== false) && Math.hypot(event.clientX-this._pointerStart[0],event.clientY-this._pointerStart[1]) > 3) this._onUserInteraction();
      };
      this._onPointerEnd = () => { this._pointerStart = null; };
      domElement.addEventListener('pointerdown', this._onPointerDown);
      domElement.addEventListener('pointermove', this._onPointerMove);
      domElement.addEventListener('pointerup', this._onPointerEnd);
      domElement.addEventListener('pointercancel', this._onPointerEnd);
      this._onWheel = () => { if (this.controls.enableZoom !== false) this._onUserInteraction(); };
      domElement.addEventListener('wheel', this._onWheel);
    }
  }

  /**
   * 씬에서 VPython 객체만 필터링 (조명, 그리드 등 제외)
   */
  _getVPythonObjects() {
    const objects = [];
    const ignoreTypes = this.options.ignoreTypes;

    this.scene.traverse((child) => {
      // Mesh, Group만 대상 (Light, Helper 제외)
      if (child === this.scene) return;
      for (let owner = child; owner && owner !== this.scene; owner = owner.parent) {
        if (owner.visible === false) return;
      }
      if (child.isLight) return;
      if (ignoreTypes.some(t => child.constructor.name === t)) return;
      if (child.type === 'GridHelper' || child.type === 'AxesHelper') return;

      // Group은 최상위만, Mesh는 Group 바깥의 독립 객체만 추적 대상으로 사용
      if (child.isGroup && child.parent === this.scene) {
        objects.push(child);
        return;
      }

      if ((child.isMesh || child.isLine || child.isPoints) && !child.parent?.isGroup) {
        objects.push(child);
      }
    });

    return objects;
  }

  /**
   * 단일 객체의 실제 렌더 바운딩 박스를 합친다.
   */
  _expandBoxByObject(box, obj) {
    let expanded = false;

    if (obj.isGroup) {
      obj.traverse((child) => {
        if ((!child.isMesh && !child.isLine && !child.isPoints) || !child.geometry) return;
        for (let owner = child; owner && owner !== obj.parent; owner = owner.parent) { if (owner.visible === false) return; }
        const attribute = child.geometry.getAttribute('position');
        if (!child.geometry.boundingBox || child.geometry.userData.vpBoundsVersion !== attribute?.version) {
          child.geometry.computeBoundingBox();
          child.geometry.userData.vpBoundsVersion = attribute?.version;
        }
        if (!child.geometry.boundingBox) return;
        const childBox = child.geometry.boundingBox.clone();
        childBox.applyMatrix4(child.matrixWorld);
        box.union(childBox);
        expanded = true;
      });
      return expanded;
    }

    if ((obj.isMesh || obj.isLine || obj.isPoints) && obj.geometry) {
      const attribute = obj.geometry.getAttribute('position');
      if (!obj.geometry.boundingBox || obj.geometry.userData.vpBoundsVersion !== attribute?.version) {
        obj.geometry.computeBoundingBox();
        obj.geometry.userData.vpBoundsVersion = attribute?.version;
      }
      if (!obj.geometry.boundingBox) return false;
      const meshBox = obj.geometry.boundingBox.clone();
      meshBox.applyMatrix4(obj.matrixWorld);
      box.union(meshBox);
      return true;
    }

    return false;
  }

  /**
   * 카메라 프레이밍용 상태 계산
   * @returns {{ center: THREE.Vector3, size: THREE.Vector3, radius: number } | null}
   */
  _computeCameraState() {
    const objects = this._getVPythonObjects();
    if (objects.length === 0) return null;

    const frameBox = new THREE.Box3();
    let hasFrameBounds = false;

    for (const obj of objects) {
      hasFrameBounds = this._expandBoxByObject(frameBox, obj) || hasFrameBounds;
    }

    if (!hasFrameBounds || frameBox.isEmpty()) return null;

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    frameBox.getCenter(center);
    frameBox.getSize(size);

    return {
      center,
      size,
      radius: size.length() / 2,
    };
  }

  /**
   * 바운딩 박스에 맞는 카메라 거리 계산
   */
  _distanceForBounds(radius) {
    const fov = this.camera.fov * (Math.PI / 180);
    const aspect = this.camera.aspect;
    const effectiveFov = 2 * Math.atan(Math.tan(fov / 2) * Math.min(1, aspect));
    let distance = (radius * this.options.fitPadding) / Math.tan(effectiveFov / 2);

    // 범위 제한
    distance = Math.max(distance, this.options.fitMinDistance);
    // 명시된 큰 모양도 프레임에 들어와야 하므로 인위적인 최대 거리로 자르지 않는다.

    return distance;
  }

  /** 계속 맞추기가 켜져 있는가: 화면의 "자동 맞춤" 또는 코드의 scene.autoscale = True. */
  isContinuousFit() {
    return Boolean(this.options.continuousFit || this._codeAutoscale);
  }

  /** 기준 상자를 비운다. 다음에 보이는 물체부터 다시 모은다. */
  _resetHome() {
    this._homeBox.makeEmpty();
    this._homeSeen = new WeakSet();
  }

  /**
   * 처음 보는 물체가 만들어진 자리를 기준 상자에 더한다. 상자가 커졌으면 true.
   * 궤적(trail)은 움직임에서 나온 것이므로 실행 중에는 세지 않는다. "화면에 맞추기"처럼 지금 보이는
   * 것을 모두 담을 때만 includeTrails로 함께 센다. 아직 모양이 없는 물체는 다음에 다시 본다.
   */
  _absorbNewObjects(includeTrails = false) {
    let grew = false;
    const box = new THREE.Box3();
    for (const obj of this._getVPythonObjects()) {
      if (this._homeSeen.has(obj) || (obj.userData?.vpTrail && !includeTrails)) continue;
      box.makeEmpty();
      if (!this._expandBoxByObject(box, obj) || box.isEmpty()) continue;
      if (![box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z].every(Number.isFinite)) continue;
      this._homeSeen.add(obj);
      if (this._homeBox.isEmpty() || !this._homeBox.containsBox(box)) {
        this._homeBox.union(box);
        grew = true;
      }
    }
    return grew;
  }

  /** 기준 상자를 카메라 맞춤 상태로 바꾼다. 아직 물체가 없으면 null. */
  _homeState() {
    if (this._homeBox.isEmpty()) return null;
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    this._homeBox.getCenter(center);
    this._homeBox.getSize(size);
    return { center, size, radius: size.length() / 2 };
  }

  /**
   * 화면 맞춤: 모든 물체가 담기는 중심과 거리
   */
  _fitState(state) {
    if (!state || !this._centerPinned) return state;
    return { ...state, radius: state.radius + state.center.distanceTo(this._centerPinned), center: this._centerPinned.clone() };
  }

  _autoFit() {
    if (!this._autoEnabled || this.mode === MODE.MANUAL) return;
    this.scene.updateMatrixWorld(true);
    const continuous = this.isContinuousFit();
    if (!continuous) this._absorbNewObjects();
    const state = this._fitState(continuous ? this._computeCameraState() : this._homeState());
    if (!state) {
      this._targetCenter.copy(this._centerPinned || new THREE.Vector3());
      this._targetDistance = this.options.defaultDistance;
      return;
    }

    this._targetCenter.copy(state.center);
    this._targetDistance = this._distanceForBounds(state.radius);
    this._lastBounds = state;
    this._hasFit = true;
  }

  /**
   * 매 프레임 호출 — 카메라를 부드럽게 목표로 이동
   */
  update() {
    this._frameCount++;
    this.updateClipPlanes();

    // scene.camera.follow(obj): 지정한 객체의 위치를 중심으로 삼고 거리·방향은 유지
    if (this._followTarget) {
      if (!this._followTarget.parent) {
        this._followTarget = null;
        this.mode = this._autoEnabled ? MODE.AUTO_FIT : MODE.MANUAL;
      } else {
        const center = new THREE.Vector3();
        this._followTarget.getWorldPosition(center);
        this._currentDistance = this._currentCameraDistance();
        if (this._autoEnabled) {
          // 거리는 새 물체가 범위 밖에 만들어졌을 때(또는 계속 맞추기일 때)만 다시 계산한다
          this.scene.updateMatrixWorld(true);
          if (this.isContinuousFit() || this._absorbNewObjects()) {
            const state = this._computeCameraState();
            if (state) this._currentDistance = this._distanceForBounds(state.radius + state.center.distanceTo(center));
          }
        }
        this._targetDistance = this._currentDistance;
        const direction = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
        if (direction.lengthSq() < 1e-24) direction.set(0, 0, 1);
        else direction.normalize();
        this._targetCenter.copy(center);
        this._currentCenter.copy(center);
        this.controls.target.copy(center);
        this.camera.position.copy(center).addScaledVector(direction, this._currentDistance);
        this._cameraLimits(this._currentDistance);
        return;
      }
    }

    // 수동 모드면 아무것도 하지 않음
    if (this.mode === MODE.MANUAL) return;

    // 기본: 새 물체가 범위 밖에 만들어졌을 때만 목표를 다시 계산한다. 물체가 움직이는 것만으로는
    // 목표가 바뀌지 않으므로 카메라는 한 곳에 머문다. 계속 맞추기일 때는 매 프레임 지금 물체에 맞춘다.
    this.scene.updateMatrixWorld(true);
    const continuous = this.isContinuousFit();
    let state = null;
    if (continuous) state = this._computeCameraState();
    else if (this._absorbNewObjects()) state = this._homeState();
    state = this._fitState(state);
    if (state) {
      this._targetCenter.copy(state.center);
      this._targetDistance = this._distanceForBounds(state.radius);
      this._hasFit = true;
      this._lastBounds = state;
    }

    // 부드럽게 보간: 기본 맞춤은 빠르게 자리 잡고, 계속 맞추기는 천천히 따라간다
    const centerLerp = continuous ? this.options.centerLerpFactor : this.options.framingLerpFactor;
    const zoomLerp = continuous ? this.options.zoomLerpFactor : this.options.framingLerpFactor;
    this._currentCenter.lerp(this._targetCenter, centerLerp);
    this._currentDistance += (this._targetDistance - this._currentDistance) * zoomLerp;
    if (!continuous) {
      // 충분히 가까워지면 목표에 붙여 카메라가 완전히 멈추게 한다
      const tolerance = 1e-6 * Math.max(this._targetDistance, 1e-9);
      if (this._currentCenter.distanceTo(this._targetCenter) <= tolerance) this._currentCenter.copy(this._targetCenter);
      if (Math.abs(this._targetDistance - this._currentDistance) <= tolerance) this._currentDistance = this._targetDistance;
    }

    // 카메라 방향을 타겟 업데이트 전에 저장
    const direction = new THREE.Vector3();
    direction.subVectors(this.camera.position, this.controls.target);

    // 방향 벡터가 너무 짧으면 기본 z축 (정면)
    if (direction.lengthSq() < 1e-24) {
      direction.set(0, 0, 1);
    } else {
      direction.normalize();
    }

    // OrbitControls 타겟 업데이트
    this.controls.target.copy(this._currentCenter);

    // 카메라 위치: 보던 방향 유지 + 거리 조절
    this._cameraLimits(this._currentDistance);
    this.camera.position.copy(this._currentCenter).addScaledVector(direction, this._currentDistance);
  }

  /**
   * 화면 맞춤을 다시 카메라 시스템에 맡긴다. 지금 물체가 있는 자리를 새 기준으로 삼아 맞춘다.
   */
  resetToAutoFit({ keepCenter = false } = {}) {
    this._autoEnabled = true;
    if (!keepCenter) this._centerPinned = null;
    this._syncCurrentView();
    this.mode = MODE.AUTO_FIT;
    this._userInteracted = false;
    this._followTarget = null;
    this._explicitRange = null;
    this._resetHome();
    this.scene.updateMatrixWorld(true);
    this._absorbNewObjects(true); // 지금 그려진 궤적까지 담는다
    this._autoFit();
  }

  /**
   * "화면에 맞추기": 지금 있는 물체가 모두 보이도록 한 번만 맞추고 그 자리에 둔다.
   * scene.camera.follow(obj)로 따라가는 중이면 대상은 유지하고 거리만 맞춘다.
   */
  fitOnce() {
    this._codeAutoscale = false;
    this.scene.updateMatrixWorld(true);
    if (this._followTarget?.parent) {
      const state = this._computeCameraState();
      const center = this._followTarget.getWorldPosition(new THREE.Vector3());
      if (state) this._applyDistance(this._distanceForBounds(state.radius + state.center.distanceTo(center)));
      this._resetHome();
      this._absorbNewObjects(true);
      return;
    }
    this.resetToAutoFit();
  }

  /**
   * 계속 맞추기(예전 "자동")를 켜거나 끈다. 보는 사람의 선택이므로 새 실행에서도 유지된다.
   */
  setContinuousFit(enabled) {
    this.options.continuousFit = Boolean(enabled);
    if (this.options.continuousFit) {
      if (this._followTarget) this._autoEnabled = true;
      else this.resetToAutoFit();
    } else {
      this._codeAutoscale = false;
      // 지금 보이는 그대로 멈추고, 지금 물체가 있는 자리를 새 기준으로 삼는다
      if (this.mode === MODE.AUTO_FIT && !this._followTarget) this._syncCurrentView();
      this.scene.updateMatrixWorld(true);
      this._resetHome();
      this._absorbNewObjects(true);
    }
  }

  /**
   * 코드 실행 시작 시 호출 — 카메라를 기본 위치로 되돌리고 기준 상자를 비운다
   */
  onCodeStart() {
    this._autoEnabled = true;
    this._centerPinned = null;
    this.controls.enableZoom = this.controls.enableRotate = this.controls.enablePan = true;
    this.mode = MODE.AUTO_FIT;
    this._userInteracted = false;
    this._frameCount = 0;
    this._followTarget = null;
    this._explicitRange = null;
    this._resetHome();
    this._codeAutoscale = false;

    // Python scene도 매번 초기화된다. 예전 작품의 중심·시야가 새 작품에 남지 않게 한다.
    this.controls.reset?.();
    this.controls.target.set(0, 0, 0);
    this._currentCenter.set(0, 0, 0);
    this._targetCenter.set(0, 0, 0);
    this._currentDistance = this.options.defaultDistance / Math.min(1, this.camera.aspect || 1);
    this._targetDistance = this._currentDistance;
    this.camera.position.set(0, 0, this._currentDistance);
    this.camera.up.set(0, 1, 0);
    this.camera.fov = this.options.defaultFov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.controls.target);
    this.controls.update?.();
    this._lastBounds = null;
    this._hasFit = false;
  }

  /**
   * 현재 카메라 모드
   */
  getMode() {
    return this.mode;
  }

  /**
   * scene.range = N — VPython 호환: 시야 반경 N. MANUAL 모드로 전환.
   */
  setExplicitRange(range) {
    if (!Number.isFinite(range) || range <= 0) return;
    this._autoEnabled = false;
    this.mode = MODE.MANUAL;
    this._userInteracted = true;
    this._explicitRange = range;
    this._applyDistance(this._distanceForRange(range));
  }

  /**
   * GlowScript 호환: range는 화면의 짧은 변 방향으로 보이는 영역의 절반이다.
   * Three.js의 fov는 세로 기준이므로 세로가 더 짧을 때는 그대로, 가로가 더 짧을 때는 종횡비로 나눈다.
   */
  _distanceForRange(range) {
    const fov = this.camera.fov * (Math.PI / 180);
    const aspect = this.camera.aspect || 1;
    const verticalHalfExtent = aspect >= 1 ? range : range / aspect;
    return verticalHalfExtent / Math.tan(fov / 2);
  }

  /** 현재 보는 방향을 유지한 채 카메라 거리만 바꾼다. */
  _syncCurrentView() {
    this._currentCenter.copy(this.controls.target);
    this._targetCenter.copy(this.controls.target);
    this._currentDistance = this._currentCameraDistance();
    this._targetDistance = this._currentDistance;
  }

  updateClipPlanes() {
    const distance = this._currentCameraDistance();
    if (!(distance > 0) || !Number.isFinite(distance)) return;
    // 명시 range로 작게 확대해도 멀리 있는 깊이 방향 물체가 잘리지 않게 합니다.
    this.scene.updateMatrixWorld(true);
    const bounds = this._computeCameraState();
    const reach = bounds ? this.camera.position.distanceTo(bounds.center) + bounds.radius : 0;
    const near = Math.max(1e-12, distance / 1000);
    const far = Math.max(near * 100, distance * 100, reach * 1.1);
    if (near !== this.camera.near || far !== this.camera.far) {
      this.camera.near = near; this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
  }

  _cameraLimits(distance) {
    if (!(distance > 0) || !Number.isFinite(distance)) return;
    this.controls.minDistance = Math.min(this.controls.minDistance ?? 1, distance / 10);
    this.controls.maxDistance = Math.max(this.controls.maxDistance ?? 100, distance * 2);
    this.updateClipPlanes();
  }

  resize(width, height) {
    if (!(width > 0 && height > 0)) return;
    const range = this.getRange();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.mode === MODE.MANUAL || this._followTarget) this._applyDistance(this._distanceForRange(range));
    else this._autoFit(); // 기본은 만들어진 자리 기준으로 다시 계산하므로 물체가 움직였어도 화면이 달라지지 않는다
  }

  _applyDistance(distance) {
    this._cameraLimits(distance);
    this._targetDistance = distance;
    this._currentDistance = distance;
    const direction = this._viewDirection();
    this.camera.position.copy(this.controls.target).addScaledVector(direction, distance);
    this._currentCenter.copy(this.controls.target);
    this._targetCenter.copy(this.controls.target);
    this.updateClipPlanes();
  }

  /** 중심에서 카메라를 향하는 단위 벡터 (forward의 반대 방향). */
  _viewDirection() {
    const direction = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    if (direction.lengthSq() < 1e-24) direction.set(0, 0, 1);
    else direction.normalize();
    return direction;
  }

  /** 현재 카메라 거리 (중심에서 카메라까지). */
  _currentCameraDistance() {
    const distance = this.camera.position.distanceTo(this.controls.target);
    return distance > 1e-12 ? distance : this._currentDistance;
  }

  /**
   * scene.forward = vec — 보는 방향을 바꾼다. 중심과 거리는 유지한다.
   * GlowScript처럼 autoscale 상태는 바꾸지 않는다.
   */
  setForward(x, y, z) {
    const forward = new THREE.Vector3(x, y, z);
    if (forward.lengthSq() < 1e-24) return;
    forward.normalize();
    const distance = this._currentCameraDistance();
    this.camera.position.copy(this.controls.target).addScaledVector(forward, -distance);
    if (this.mode === MODE.MANUAL) {
      this._currentDistance = distance;
      this._targetDistance = distance;
    }
    this.camera.lookAt(this.controls.target);
  }

  /** scene.up = vec — 화면의 위쪽 방향. */
  setUp(x, y, z) {
    const up = new THREE.Vector3(x, y, z);
    if (up.lengthSq() < 1e-24) return;
    this.camera.up.copy(up.normalize());
    // OrbitControls는 생성 당시 up을 캐시하므로 공개 update와 함께 기준 회전도 갱신합니다.
    this.controls._quat?.setFromUnitVectors(this.camera.up, new THREE.Vector3(0,1,0));
    this.controls._quatInverse?.copy(this.controls._quat).invert();
    this.camera.lookAt(this.controls.target);
  }

  /** scene.fov = 라디안 — 시야각. 명시한 range가 있으면 같은 범위가 보이도록 거리를 다시 계산한다. */
  setFov(radians) {
    if (!Number.isFinite(radians) || radians <= 0 || radians >= Math.PI) return;
    // GlowScript처럼 보이는 범위(range)는 그대로 두고 카메라 거리를 다시 계산한다 (fov가 작아지면 멀어진다)
    const keepRange = this.getRange();
    this.camera.fov = radians * (180 / Math.PI);
    this.camera.updateProjectionMatrix();
    if (this.mode === MODE.MANUAL) {
      this._applyDistance(this._distanceForRange(keepRange));
    } else if (this.mode === MODE.AUTO_FIT) {
      this._autoFit();
    }
  }

  /**
   * scene.camera.pos = vec — 카메라를 옮기고 중심도 같이 평행이동한다 (방향·거리 유지).
   */
  setCameraPos(x, y, z) {
    this._autoEnabled = false;
    this._centerPinned = null;
    this.mode = MODE.MANUAL;
    this._userInteracted = true;
    this._followTarget = null;
    const next = new THREE.Vector3(x, y, z);
    const translation = next.clone().sub(this.camera.position);
    this.controls.target.add(translation);
    this.camera.position.copy(next);
    this._currentCenter.copy(this.controls.target);
    this._targetCenter.copy(this.controls.target);
  }

  /**
   * scene.camera.axis = vec — 카메라 위치는 그대로 두고 중심을 pos + axis로 옮긴다.
   * 축의 길이가 카메라 거리가 되고, range는 거리·fov에서 다시 계산된다.
   */
  setCameraAxis(x, y, z) {
    this._autoEnabled = false;
    this._centerPinned = null;
    const axis = new THREE.Vector3(x, y, z);
    if (axis.lengthSq() < 1e-24) return;
    this.mode = MODE.MANUAL;
    this._userInteracted = true;
    this._followTarget = null;
    this.controls.target.copy(this.camera.position).add(axis);
    this._currentCenter.copy(this.controls.target);
    this._targetCenter.copy(this.controls.target);
    this._currentDistance = axis.length();
    this._targetDistance = this._currentDistance;
    this._cameraLimits(this._currentDistance);
    this._explicitRange = this.getRange();
    this.camera.lookAt(this.controls.target);
  }

  /** scene.camera.follow(obj) — 객체를 계속 화면 중심에 둔다. null이면 해제. */
  followObject(mesh) {
    this._followTarget = mesh || null;
    if (mesh) {
      if (this._autoEnabled) {
        this.scene.updateMatrixWorld(true);
        const state = this._computeCameraState();
        const center = mesh.getWorldPosition(new THREE.Vector3());
        if (state) this._applyDistance(this._distanceForBounds(state.radius + state.center.distanceTo(center)));
      }
      this.mode = MODE.MANUAL;
      this._currentDistance = this._currentCameraDistance();
      this._targetDistance = this._currentDistance;
      const center = mesh.getWorldPosition(new THREE.Vector3());
      const direction = this._viewDirection();
      this.controls.target.copy(center);
      this._currentCenter.copy(center);
      this._targetCenter.copy(center);
      this.camera.position.copy(center).addScaledVector(direction, this._currentDistance);
    } else {
      this.mode = this._autoEnabled ? MODE.AUTO_FIT : MODE.MANUAL;
      this._userInteracted = true;
    }
  }

  /** 현재 range (화면 짧은 변 방향 시야 절반) — GlowScript 의미. */
  getRange() {
    return this._rangeForDistance(this._currentCameraDistance());
  }

  /** 카메라 거리에서 보이는 range (_distanceForRange의 반대). */
  _rangeForDistance(distance) {
    const fov = this.camera.fov * (Math.PI / 180);
    const aspect = this.camera.aspect || 1;
    const verticalHalfExtent = distance * Math.tan(fov / 2);
    return aspect >= 1 ? verticalHalfExtent : verticalHalfExtent * aspect;
  }

  /** Python 쪽 scene.camera.pos 등이 읽을 현재 카메라 상태. */
  getState() {
    const forward = new THREE.Vector3().subVectors(this.controls.target, this.camera.position);
    if (forward.lengthSq() < 1e-24) forward.set(0, 0, -1);
    else forward.normalize();
    const p = this.camera.position;
    const c = this.controls.target;
    const u = this.camera.up;
    return {
      pos: [p.x, p.y, p.z],
      center: [c.x, c.y, c.z],
      forward: [forward.x, forward.y, forward.z],
      up: [u.x, u.y, u.z],
      range: this.getRange(),
      fov: this.camera.fov * (Math.PI / 180),
      aspect: this.camera.aspect || 1,
      autoscale: this._autoEnabled,
    };
  }

  /**
   * scene.center = vec — 카메라 타겟 중심점 설정. 자동 맞춤 여부는 유지.
   */
  setExplicitCenter(x, y, z) {
    this._centerPinned = new THREE.Vector3(x, y, z);
    this.mode = this._autoEnabled ? MODE.AUTO_FIT : MODE.MANUAL;
    this._userInteracted = true;
    this._followTarget = null;
    if (this.options.preserveDirectionOnCenter) {
      const translation = new THREE.Vector3(x, y, z).sub(this.controls.target);
      this.camera.position.add(translation);
    }
    this._targetCenter.set(x, y, z);
    this._currentCenter.set(x, y, z);
    this.controls.target.copy(this._currentCenter);
  }

  /** 중심을 옮길 때 카메라도 평행이동할지 선택한다. VPython 기본값은 true. */
  setPreserveDirectionOnCenter(enabled) {
    this.options.preserveDirectionOnCenter = Boolean(enabled);
  }

  /**
   * scene.autoscale = bool — 학생 코드가 True를 명시하면 VPython처럼 실행 중에도 계속 화면에 맞춘다.
   * False면 지금 카메라를 그대로 둔다.
   */
  setAutoscale(enabled) {
    this._codeAutoscale = Boolean(enabled);
    if (this._followTarget) { this._autoEnabled = Boolean(enabled); return; }
    if (enabled) {
      this.resetToAutoFit({ keepCenter: true });
    } else {
      this._autoEnabled = false;
      this.mode = MODE.MANUAL;
      this._userInteracted = true;
    }
  }

  /**
   * 정리
   */
  dispose() {
    const domElement = this.controls?.domElement;
    if (domElement) {
      domElement.removeEventListener('pointerdown', this._onPointerDown);
      domElement.removeEventListener('pointermove', this._onPointerMove);
      domElement.removeEventListener('pointerup', this._onPointerEnd);
      domElement.removeEventListener('pointercancel', this._onPointerEnd);
      domElement.removeEventListener('wheel', this._onWheel);
    }
  }
}


}
