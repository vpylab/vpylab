/**
 * VPython 브릿지 통합 테스트
 * Worker에서 온 JSON 커맨드 → Three.js 씬 적용 검증
 * P0 버그: sphere() 생성 시 3D 뷰포트에 구가 안 보이는 문제
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// chart-system과 sound-system을 mock (복잡한 Three.js 의존성 회피)
vi.mock('./chart-system', () => ({
  renderChart: vi.fn(),
  clearCharts: vi.fn(),
}));
vi.mock('./sound-system', () => ({
  processSoundCommand: vi.fn(),
  setNotePlayCallback: vi.fn(),
  setSoundEventCallback: vi.fn(),
}));

// Three.js를 mock — jsdom에서는 WebGL 불가
vi.mock('three', () => {
  class Color {
    constructor(r, g, b) {
      if (typeof r === 'number' && g === undefined) {
        // hex color
        this.r = r; this.g = 0; this.b = 0;
      } else {
        this.r = r ?? 0; this.g = g ?? 0; this.b = b ?? 0;
      }
    }
  }

  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    lengthSq() { return this.x ** 2 + this.y ** 2 + this.z ** 2; }
    normalize() {
      const len = Math.sqrt(this.lengthSq()) || 1;
      this.x /= len; this.y /= len; this.z /= len;
      return this;
    }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    addScaledVector(v, s) {
      this.x += v.x * s; this.y += v.y * s; this.z += v.z * s;
      return this;
    }
    crossVectors(a, b) {
      this.x = a.y * b.z - a.z * b.y;
      this.y = a.z * b.x - a.x * b.z;
      this.z = a.x * b.y - a.y * b.x;
      return this;
    }
  }

  class Quaternion {
    setFromUnitVectors() { return this; }
    setFromRotationMatrix(matrix) { this.matrix = matrix; return this; }
  }

  class Matrix4 {
    makeBasis(xAxis, yAxis, zAxis) {
      this.basis = { xAxis, yAxis, zAxis };
      return this;
    }
  }

  class Geometry {
    translate(x,y,z) { this.translation=[x,y,z]; return this; }
    dispose() {}
  }

  class Material {
    constructor(params = {}) {
      Object.assign(this, params);
    }
    dispose() {}
  }

  class Mesh {
    constructor(geometry, material) {
      this.geometry = geometry;
      this.material = material;
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.quaternion = new Quaternion();
      this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.userData = {};
      this.visible = true;
    }
  }

  class Group {
    constructor() {
      this.children = [];
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.quaternion = new Quaternion();
      this.visible = true;
    }
    add(child) { this.children.push(child); }
  }

  class Light {
    constructor(color, intensity) {
      this.color = color || new Color(1, 1, 1);
      this.intensity = intensity ?? 1;
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.visible = true;
      this.isLight = true;
    }
  }

  class PointLight extends Light {
    constructor(color, intensity, distance, decay) {
      super(color, intensity);
      this.distance = distance;
      this.decay = decay;
      this.isPointLight = true;
    }
  }

  class DirectionalLight extends Light {
    constructor(color, intensity) {
      super(color, intensity);
      this.isDirectionalLight = true;
      this.target = { position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } } };
    }
  }

  class Scene {
    constructor() {
      this.children = [];
      this.background = null;
    }
    add(obj) { this.children.push(obj); }
    remove(obj) {
      const idx = this.children.indexOf(obj);
      if (idx >= 0) this.children.splice(idx, 1);
    }
    traverse(callback) {
      callback(this);
      for (const child of this.children) {
        callback(child);
        if (child.children) {
          for (const gc of child.children) callback(gc);
        }
      }
    }
  }

  class TextureLoader {
    setCrossOrigin() { return this; }
    load(url) {
      return { url, isTexture: true, dispose() {} };
    }
  }

  class CanvasTexture {
    constructor() { this.isTexture = true; }
    dispose() {}
  }

  return {
    Color,
    Vector3,
    Matrix4,
    Mesh,
    Group,
    PointLight,
    DirectionalLight,
    SphereGeometry: class extends Geometry {
      constructor(radius) { super(); this.type = 'SphereGeometry'; this.parameters = { radius }; }
    },
    BoxGeometry: class extends Geometry {
      constructor(width, height, depth) {
        super();
        this.type = 'BoxGeometry';
        this.parameters = { width, height, depth };
      }
    },
    CylinderGeometry: class extends Geometry {
      constructor(radiusTop, radiusBottom, height) {
        super();
        this.type = 'CylinderGeometry';
        this.parameters = { radiusTop, radiusBottom, height };
      }
    },
    ConeGeometry: class extends Geometry {
      constructor(radius, height) { super(); this.type = 'ConeGeometry'; this.parameters = { radius, height }; }
    },
    TorusGeometry: class extends Geometry {
      constructor(radius, tube) { super(); this.type = 'TorusGeometry'; this.parameters = { radius, tube }; }
    },
    MeshStandardMaterial: class extends Material {},
    TextureLoader,
    CanvasTexture,
    SRGBColorSpace: 'srgb',
    RepeatWrapping: 1000,
    Scene,
  };
});

import { processBatch, clearScene, getMesh } from './vpython-bridge';
import { gradeA } from './grading-engine';
import { getSnapshot } from './object-registry';
import * as THREE from 'three';

describe('vpython-bridge: processBatch', () => {
  let scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    clearScene(scene);
  });

  // === P0 핵심 테스트: sphere 생성 → 씬에 mesh 존재 ===

  it('sphere create 커맨드 → 씬에 mesh가 추가된다', () => {
    const commands = [{
      action: 'create',
      id: 'obj_1',
      type: 'sphere',
      pos: [0, 0, 0],
      color: [1, 0, 0],
      visible: true,
      opacity: 1,
      radius: 0.5,
    }];

    processBatch(commands, scene);

    // 씬에 mesh가 추가되었는지 확인
    expect(scene.children.length).toBe(1);
    // meshRegistry에 등록되었는지 확인
    const mesh = getMesh('obj_1');
    expect(mesh).toBeDefined();
    expect(mesh.visible).toBe(true);
  });

  it('sphere 위치가 정확히 설정된다', () => {
    processBatch([{
      action: 'create',
      id: 'obj_1',
      type: 'sphere',
      pos: [3, 2, 1],
      color: [1, 1, 1],
      visible: true,
      opacity: 1,
      radius: 1,
    }], scene);

    const mesh = getMesh('obj_1');
    expect(mesh.position.x).toBe(3);
    expect(mesh.position.y).toBe(2);
    expect(mesh.position.z).toBe(1);
  });

  // === 다른 객체 타입 ===

  it('box create 커맨드 → 씬에 추가', () => {
    processBatch([{
      action: 'create', id: 'obj_2', type: 'box',
      pos: [0, 0, 0], color: [0, 1, 0], visible: true, opacity: 1,
      size: [2, 1, 1],
    }], scene);

    expect(getMesh('obj_2')).toBeDefined();
    expect(scene.children.length).toBe(1);
  });

  it('box length/height/width 별칭으로 크기를 만든다', () => {
    processBatch([{
      action: 'create', id: 'obj_box_alias', type: 'box',
      pos: [0, 0, 0], color: [0, 1, 0], visible: true, opacity: 1,
      length: 4, height: 0.2, width: 2,
    }], scene);

    const mesh = getMesh('obj_box_alias');
    expect(mesh.geometry.parameters).toMatchObject({ width: 4, height: 0.2, depth: 2 });
    expect(mesh.userData.boxSize).toEqual([4, 0.2, 2]);
    const [snapshot] = getSnapshot().filter((item) => item.id === 'obj_box_alias');
    expect(snapshot.props.size).toEqual([4, 0.2, 2]);
  });

  it('box axis/up 변경은 박스 전용 방향값으로 갱신한다', () => {
    processBatch([{
      action: 'create', id: 'obj_box_oriented', type: 'box',
      pos: [0, 0, 0], color: [0, 1, 0], visible: true, opacity: 1,
      size: [4, 0.2, 2], axis: [0, 4, 0], up: [1, 0, 0],
    }], scene);

    const mesh = getMesh('obj_box_oriented');
    expect(mesh.quaternion.matrix).toBeDefined();

    processBatch([{
      action: 'update', id: 'obj_box_oriented',
      axis: [0, 0, 4], up: [0, 1, 0],
    }], scene);

    expect(mesh.userData.boxAxis).toEqual([0, 0, 4]);
    expect(mesh.userData.boxUp).toEqual([0, 1, 0]);
    const [snapshot] = getSnapshot().filter((item) => item.id === 'obj_box_oriented');
    expect(snapshot.props.axis).toEqual([0, 0, 4]);
    expect(snapshot.props.up).toEqual([0, 1, 0]);
  });

  it('cylinder create 커맨드 → 씬에 추가', () => {
    processBatch([{
      action: 'create', id: 'obj_3', type: 'cylinder',
      pos: [0, 0, 0], color: [0, 0, 1], visible: true, opacity: 1,
      radius: 0.3, axis: [0, 1, 0],
    }], scene);

    expect(getMesh('obj_3')).toBeDefined();
  });

  it('arrow create 커맨드 → Group으로 생성', () => {
    processBatch([{
      action: 'create', id: 'obj_4', type: 'arrow',
      pos: [0, 0, 0], color: [1, 1, 0], visible: true, opacity: 1,
      axis: [1, 0, 0], shaftwidth: 0.1,
    }], scene);

    const mesh = getMesh('obj_4');
    expect(mesh).toBeDefined();
    // arrow는 Group (shaft + head)
    expect(mesh.children).toBeDefined();
    expect(mesh.children.length).toBe(2);
  });

  it('ring create 커맨드 → 씬에 추가', () => {
    processBatch([{
      action: 'create', id: 'obj_5', type: 'ring',
      pos: [0, 0, 0], color: [1, 0, 1], visible: true, opacity: 1,
      radius: 1, thickness: 0.1,
    }], scene);

    expect(getMesh('obj_5')).toBeDefined();
  });

  it('cone create 커맨드 → 씬에 추가', () => {
    processBatch([{
      action: 'create', id: 'obj_6', type: 'cone',
      pos: [0, 0, 0], color: [0, 1, 1], visible: true, opacity: 1,
      radius: 0.5, axis: [0, 1, 0],
    }], scene);

    expect(getMesh('obj_6')).toBeDefined();
  });

  // === update 커맨드 ===

  it('update 커맨드로 위치를 변경한다', () => {
    processBatch([
      { action: 'create', id: 'obj_1', type: 'sphere', pos: [0, 0, 0], color: [1, 1, 1], visible: true, opacity: 1 },
      { action: 'update', id: 'obj_1', pos: [5, 3, 1] },
    ], scene);

    const mesh = getMesh('obj_1');
    expect(mesh.position.x).toBe(5);
    expect(mesh.position.y).toBe(3);
  });

  it('update로 visible을 false로 설정한다', () => {
    processBatch([
      { action: 'create', id: 'obj_1', type: 'sphere', pos: [0, 0, 0], color: [1, 1, 1], visible: true, opacity: 1 },
      { action: 'update', id: 'obj_1', visible: false },
    ], scene);

    expect(getMesh('obj_1').visible).toBe(false);
  });

  // === 배치 처리 ===

  it('여러 커맨드를 한 배치에서 처리한다', () => {
    const commands = [
      { action: 'create', id: 'obj_1', type: 'sphere', pos: [0, 0, 0], color: [1, 0, 0], visible: true, opacity: 1 },
      { action: 'create', id: 'obj_2', type: 'box', pos: [3, 0, 0], color: [0, 1, 0], visible: true, opacity: 1 },
      { action: 'create', id: 'obj_3', type: 'cylinder', pos: [0, 3, 0], color: [0, 0, 1], visible: true, opacity: 1 },
    ];

    processBatch(commands, scene);

    expect(scene.children.length).toBe(3);
    expect(getMesh('obj_1')).toBeDefined();
    expect(getMesh('obj_2')).toBeDefined();
    expect(getMesh('obj_3')).toBeDefined();
  });

  // === scene 커맨드 ===

  it('scene background 커맨드로 배경색을 변경한다', () => {
    processBatch([{
      action: 'scene',
      property: 'background',
      value: [0, 0, 0],
    }], scene);

    expect(scene.background).toBeDefined();
  });

  // === clearScene ===

  it('clearScene으로 모든 객체를 제거한다', () => {
    processBatch([
      { action: 'create', id: 'obj_1', type: 'sphere', pos: [0, 0, 0], color: [1, 1, 1], visible: true, opacity: 1 },
      { action: 'create', id: 'obj_2', type: 'box', pos: [1, 0, 0], color: [1, 1, 1], visible: true, opacity: 1 },
    ], scene);

    expect(scene.children.length).toBe(2);

    clearScene(scene);

    expect(scene.children.length).toBe(0);
    expect(getMesh('obj_1')).toBeUndefined();
    expect(getMesh('obj_2')).toBeUndefined();
  });

  // === 알 수 없는 타입/액션 (경고만, 에러 없음) ===

  it('알 수 없는 객체 타입은 무시하고 에러를 던지지 않는다', () => {
    expect(() => {
      processBatch([{
        action: 'create', id: 'obj_x', type: 'unknown',
        pos: [0, 0, 0], color: [1, 1, 1], visible: true, opacity: 1,
      }], scene);
    }).not.toThrow();

    expect(scene.children.length).toBe(0);
  });

  it('존재하지 않는 객체 update는 무시한다', () => {
    expect(() => {
      processBatch([{ action: 'update', id: 'nonexistent', pos: [1, 1, 1] }], scene);
    }).not.toThrow();
  });

  // === Python API가 보내는 실제 커맨드 형식 검증 ===

  it('Python sphere()가 보내는 형식과 일치하는 커맨드를 처리한다', () => {
    // vpython-api.py에서 sphere(pos=vector(1,2,3), color=color.red, radius=0.5) 호출 시:
    const pythonCommand = {
      action: 'create',
      id: 'obj_1',
      type: 'sphere',
      pos: [1, 2, 3],
      color: [1, 0, 0],
      visible: true,
      opacity: 1.0,
      radius: 0.5,
    };

    processBatch([pythonCommand], scene);

    const mesh = getMesh('obj_1');
    expect(mesh).toBeDefined();
    expect(mesh.position.x).toBe(1);
    expect(mesh.position.y).toBe(2);
    expect(mesh.position.z).toBe(3);
  });

  it('create 커맨드의 채점 속성을 레지스트리에 저장한다', () => {
    processBatch([{
      action: 'create',
      id: 'obj_1',
      type: 'sphere',
      pos: [1, 2, 3],
      color: [1, 0, 0],
      visible: true,
      opacity: 0.8,
      radius: 0.5,
    }], scene);

    const [snapshot] = getSnapshot();
    expect(snapshot.props.radius).toBe(0.5);
    expect(snapshot.props.opacity).toBe(0.8);

    const result = gradeA([
      { type: 'sphere', property: 'radius', operator: '==', value: 0.5 },
    ]);
    expect(result.passed).toBe(true);
  });

  it('생성 커맨드에 빠진 기본 속성도 레지스트리에 저장한다', () => {
    processBatch([
      {
        action: 'create',
        id: 'obj_1',
        type: 'sphere',
        pos: [0, 0, 0],
        color: [1, 1, 1],
        visible: true,
        opacity: 1,
      },
      {
        action: 'create',
        id: 'obj_2',
        type: 'cylinder',
        pos: [0, 0, 0],
        color: [1, 1, 1],
      },
      {
        action: 'create',
        id: 'obj_3',
        type: 'cone',
        pos: [0, 0, 0],
        color: [1, 1, 1],
      },
    ], scene);

    const snapshot = getSnapshot();
    expect(snapshot.find(o => o.id === 'obj_1').props.radius).toBe(1);
    expect(snapshot.find(o => o.id === 'obj_2').props.radius).toBe(1);
    expect(snapshot.find(o => o.id === 'obj_2').props.axis).toEqual([1, 0, 0]);
    expect(snapshot.find(o => o.id === 'obj_3').props.radius).toBe(1);
    expect(snapshot.find(o => o.id === 'obj_3').props.axis).toEqual([1, 0, 0]);

    const result = gradeA([
      { type: 'sphere', property: 'radius', operator: '==', value: 1 },
    ]);
    expect(result.passed).toBe(true);
  });

  it('update 커맨드의 색상과 크기 변경을 레지스트리에 반영한다', () => {
    processBatch([
      {
        action: 'create',
        id: 'obj_1',
        type: 'sphere',
        pos: [0, 0, 0],
        color: [1, 0, 0],
        visible: true,
        opacity: 1,
        radius: 0.5,
      },
      { action: 'update', id: 'obj_1', color: [0, 0.8, 0], radius: 2 },
    ], scene);

    const result = gradeA([
      { type: 'sphere', property: 'color.g', operator: '==', value: 0.8, tolerance: 0.01 },
      { type: 'sphere', property: 'radius', operator: '==', value: 2 },
    ]);

    expect(result.passed).toBe(true);
  });

  it('emissive 생성/업데이트를 재질과 레지스트리에 반영한다', () => {
    processBatch([
      {
        action: 'create',
        id: 'obj_1',
        type: 'sphere',
        pos: [0, 0, 0],
        color: [1, 0, 0],
        radius: 0.5,
        emissive: true,
      },
      { action: 'update', id: 'obj_1', emissive: false },
    ], scene);

    const mesh = getMesh('obj_1');
    expect(mesh.material.emissiveIntensity).toBe(0);

    const result = gradeA([
      { type: 'sphere', property: 'emissive', operator: '==', value: false },
    ]);

    expect(result.passed).toBe(true);
  });

  // === 조명 객체 ===

  it('local_light create → PointLight가 씬에 추가된다', () => {
    processBatch([{
      action: 'create', id: 'light_1', type: 'local_light',
      pos: [3, 5, 0], color: [1, 1, 0.8], intensity: 2,
    }], scene);

    const light = getMesh('light_1');
    expect(light).toBeDefined();
    expect(light.isPointLight).toBe(true);
    expect(light.intensity).toBe(2);
    expect(light.position.x).toBe(3);
    expect(light.position.y).toBe(5);
  });

  it('distant_light create → DirectionalLight가 씬에 추가된다', () => {
    processBatch([{
      action: 'create', id: 'light_2', type: 'distant_light',
      direction: [1, -1, 0], color: [1, 1, 1], intensity: 0.5,
    }], scene);

    const light = getMesh('light_2');
    expect(light).toBeDefined();
    expect(light.isDirectionalLight).toBe(true);
    expect(light.intensity).toBe(0.5);
  });

  it('기본 VPython 점광원은 거리에 따른 감쇠가 없고 밝기 수정에도 같은 환산을 쓴다', () => {
    processBatch([{ action: 'create', id: 'vp_lamp', type: 'local_light', distance_falloff: false }], scene);
    const light = getMesh('vp_lamp');
    expect(light.distance).toBe(0);
    expect(light.decay).toBe(0);
    const defaultIntensity = light.intensity;
    expect(defaultIntensity).toBeGreaterThan(3);
    processBatch([{ action: 'update', id: 'vp_lamp', intensity: 0.5 }], scene);
    expect(light.intensity).toBe(defaultIntensity / 2);
  });

  it('local_light update로 위치와 intensity를 변경한다', () => {
    processBatch([
      { action: 'create', id: 'light_1', type: 'local_light', pos: [0, 0, 0], color: [1, 1, 1], intensity: 1 },
      { action: 'update', id: 'light_1', pos: [10, 5, 0], intensity: 3 },
    ], scene);

    const light = getMesh('light_1');
    expect(light.position.x).toBe(10);
    expect(light.intensity).toBe(3);
  });

  it('light의 color를 update할 수 있다', () => {
    processBatch([
      { action: 'create', id: 'light_1', type: 'local_light', pos: [0, 0, 0], color: [1, 1, 1], intensity: 1 },
      { action: 'update', id: 'light_1', color: [1, 0, 0] },
    ], scene);

    const light = getMesh('light_1');
    expect(light.color.r).toBe(1);
    expect(light.color.g).toBe(0);
  });
  // === axis 갱신 시 길이 반영 (VPython 호환: |axis| = 길이) ===

  it('arrow axis 갱신 시 화살대/화살촉 길이가 새 |axis|를 반영한다', () => {
    processBatch([
      { action: 'create', id: 'ar_1', type: 'arrow', pos: [0, 0, 0], color: [1, 1, 1], axis: [1, 0, 0], shaftwidth: 0.1 },
      { action: 'update', id: 'ar_1', axis: [0, 5, 0] },
    ], scene);

    const group = getMesh('ar_1');
    const [shaft, head] = group.children;
    expect(shaft.geometry.parameters.height).toBeCloseTo(5 * 0.8);
    expect(shaft.position.y).toBeCloseTo(5 * 0.4);
    expect(head.geometry.parameters.height).toBeCloseTo(5 * 0.2);
    expect(head.position.y).toBeCloseTo(5 * 0.9);
  });

  it('cylinder axis 갱신 시 geometry 높이가 새 |axis|를 반영한다', () => {
    processBatch([
      { action: 'create', id: 'cy_1', type: 'cylinder', pos: [0, 0, 0], color: [1, 1, 1], radius: 0.5, axis: [2, 0, 0] },
      { action: 'update', id: 'cy_1', axis: [0, 0, 7] },
    ], scene);

    const mesh = getMesh('cy_1');
    expect(mesh.geometry.parameters.height).toBeCloseTo(7);
    expect(mesh.geometry.parameters.radiusTop).toBeCloseTo(0.5); // 반지름은 유지
  });

  it('cone axis 갱신 시 높이가 반영되고 방향이 바뀐다', () => {
    processBatch([
      { action: 'create', id: 'co_1', type: 'cone', pos: [0, 0, 0], color: [1, 1, 1], radius: 1, axis: [1, 0, 0] },
      { action: 'update', id: 'co_1', axis: [0, 3, 0] },
    ], scene);

    const mesh = getMesh('co_1');
    expect(mesh.geometry.parameters.height).toBeCloseTo(3);
    expect(mesh.geometry.parameters.radius).toBeCloseTo(1); // 반지름은 유지
  });

  it('arrow shaftwidth 갱신 시 굵기가 재반영된다', () => {
    processBatch([
      { action: 'create', id: 'ar_2', type: 'arrow', pos: [0, 0, 0], color: [1, 1, 1], axis: [4, 0, 0], shaftwidth: 0.1 },
      { action: 'update', id: 'ar_2', shaftwidth: 0.5 },
    ], scene);

    const group = getMesh('ar_2');
    const [shaft] = group.children;
    expect(shaft.geometry.parameters.radiusTop).toBeCloseTo(0.25);
    expect(shaft.geometry.parameters.height).toBeCloseTo(4 * 0.8); // 길이 유지
  });
});

describe('vpython-bridge: scene 카메라·조명·제목 커맨드', () => {
  let scene;

  function fakeDefaultLights() {
    const ambient = {
      isLight: true, isAmbientLight: true, visible: true, intensity: 0.6,
      color: { r: 1, g: 1, b: 1, setHex(hex) { this.hex = hex; } },
      userData: { vpDefaultLight: 'ambient', vpDefaultColor: 0xffffff, vpDefaultIntensity: 0.6 },
    };
    const distant = { isLight: true, isDirectionalLight: true, visible: true, userData: { vpDefaultLight: 'distant' } };
    scene.add(ambient);
    scene.add(distant);
    return { ambient, distant };
  }

  beforeEach(() => {
    scene = new THREE.Scene();
    clearScene(scene);
  });

  it('카메라 속성 커맨드는 카메라 시스템의 해당 메서드로 전달된다', () => {
    const cameraSystem = {
      setForward: vi.fn(), setUp: vi.fn(), setFov: vi.fn(), setCameraPos: vi.fn(), setCameraAxis: vi.fn(), followObject: vi.fn(),
    };
    scene._cameraSystem = cameraSystem;
    processBatch([
      { action: 'create', id: 'ball', type: 'sphere', pos: [0, 0, 0], radius: 1 },
      { action: 'scene', property: 'forward', value: [0, -1, -1] },
      { action: 'scene', property: 'up', value: [0, 0, 1] },
      { action: 'scene', property: 'fov', value: Math.PI / 3 },
      { action: 'scene', property: 'camera_pos', value: [1, 2, 3] },
      { action: 'scene', property: 'camera_axis', value: [0, 0, -5] },
      { action: 'scene', property: 'camera_follow', value: 'ball' },
      { action: 'scene', property: 'camera_follow', value: null },
    ], scene);
    expect(cameraSystem.setForward).toHaveBeenCalledWith(0, -1, -1);
    expect(cameraSystem.setUp).toHaveBeenCalledWith(0, 0, 1);
    expect(cameraSystem.setFov).toHaveBeenCalledWith(Math.PI / 3);
    expect(cameraSystem.setCameraPos).toHaveBeenCalledWith(1, 2, 3);
    expect(cameraSystem.setCameraAxis).toHaveBeenCalledWith(0, 0, -5);
    expect(cameraSystem.followObject).toHaveBeenNthCalledWith(1, getMesh('ball'));
    expect(cameraSystem.followObject).toHaveBeenNthCalledWith(2, null);
  });

  it('scene.ambient는 기본 환경광의 색을 바꾸고 새 실행에서 복구된다', () => {
    const { ambient } = fakeDefaultLights();
    processBatch([{ action: 'scene', property: 'ambient', value: [0.2, 0.2, 0.2] }], scene);
    expect(ambient.intensity).toBe(1);
    expect(ambient.color.r).toBeCloseTo(0.2, 5);
    const changed = ambient.color;
    clearScene(scene);
    expect(ambient.intensity).toBe(0.6);
    expect(ambient.color).not.toBe(changed);
  });

  it('scene.lights = [...]는 기본 방향광을 끄고 목록에 있는 사용자 조명만 켠다', () => {
    const { ambient, distant } = fakeDefaultLights();
    processBatch([
      { action: 'create', id: 'lamp', type: 'local_light', pos: [1, 2, 3], color: [1, 1, 1], intensity: 1 },
      { action: 'create', id: 'sun', type: 'distant_light', direction: [0, -1, 0], color: [1, 1, 1], intensity: 1 },
      { action: 'scene', property: 'lights', value: ['lamp'] },
    ], scene);
    expect(distant.visible).toBe(false);
    expect(ambient.visible).toBe(true);
    expect(getMesh('lamp').visible).toBe(true);
    expect(getMesh('sun').visible).toBe(false);
    processBatch([{ action: 'scene', property: 'lights', value: [] }], scene);
    expect(getMesh('lamp').visible).toBe(false);
    clearScene(scene);
    expect(distant.visible).toBe(true);
  });

  it('scene.title / caption 커맨드는 오버레이로 전달되고 새 실행에서 지워진다', () => {
    const overlay = { setTitle: vi.fn(), setCaption: vi.fn(), appendTitle: vi.fn(), appendCaption: vi.fn(), clear: vi.fn() };
    scene._overlay = overlay;
    processBatch([
      { action: 'scene', property: 'title', value: '제목' },
      { action: 'scene', property: 'caption', value: '설명' },
      { action: 'scene', property: 'append_caption', value: ' 추가' },
    ], scene);
    expect(overlay.setTitle).toHaveBeenCalledWith('제목');
    expect(overlay.setCaption).toHaveBeenCalledWith('설명');
    expect(overlay.appendCaption).toHaveBeenCalledWith(' 추가');
    clearScene(scene);
    expect(overlay.clear).toHaveBeenCalled();
  });
});
