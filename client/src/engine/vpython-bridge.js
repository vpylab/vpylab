/**
 * VPyLab — JS 측 VPython 브릿지
 * Worker에서 받은 JSON 커맨드를 Three.js 씬에 적용
 * 커맨드 배칭: 프레임당 단일 postMessage에서 받은 배치를 처리
 */

import * as THREE from 'three';
import { createPrimitiveGeometry } from '../../../server/shared/primitive-geometry.js';
const primitiveGeometry = createPrimitiveGeometry(THREE);
import { createCompoundAppearanceTools } from '../../../server/shared/compound-appearance.js';
const compoundAppearance = createCompoundAppearanceTools(THREE);
import {
  registerObject,
  updateObject,
  clearRegistry,
  registerNote,
  registerSound,
} from './object-registry';
import { processSoundCommand, setNotePlayCallback, setSoundEventCallback } from './sound-system';
import { resolveTexture, whenTexturesReady } from './texture-system';
import { postEvent } from './pyodide-singleton';
import {
  DEFAULT_OBJECT_PROPS, asNumber, asVectorArray, resolveBoxSize, getRegistryProps,
} from './registry-props';

// 음표 재생 시 레지스트리에 기록
setNotePlayCallback((name, duration, type) => registerNote(name, duration, type));
// 효과음·배경음악 재생 시 레지스트리에 기록
setSoundEventCallback((kind, name) => registerSound(kind, name));
import { renderChart, clearCharts } from './chart-system';
import {
  createWidget, updateWidget, deleteWidget, clearWidgets, createInputPrompt, createPauseNotice,
} from './widgets-system';
import {
  createGraph, deleteGraph,
  createSeries, deleteSeries, clearSeries, plotSeries, updateSeries,
  clearGraphs2D,
} from './graph2d-system';
import { buildExtrusionGeometry } from './extrusion-geometry';
import { buildMeshGeometry, configureMeshMaterial, buildHelixGeometry } from './mesh-geometry';
import {
  pickTextSpec, rebuildText3D, applyTextLength, applyTextAppearance, unregisterText3D, updateBillboards,
} from './text3d-system';

// 뷰포트가 renderer.render 직전에 부른다 — billboard 글자가 카메라를 향하게 한다
export { updateBillboards };

// 메인 스레드에서 디스패치 활성화된 이벤트 이름들
const sceneBoundEvents = new Set();
const eventKey = (name, canvasId = 'scene') => canvasId === 'scene' ? name : `${canvasId}:${name}`;
export function isEventBound(name, canvasId = 'scene') { return sceneBoundEvents.has(eventKey(name, canvasId)); }
export function getBoundEvents() { return new Set(sceneBoundEvents); }

// 생성 명령을 받은 뒤 React가 보조 뷰포트를 준비할 때까지 해당 캔버스의 명령을 보관한다.
export function registerCanvasScene(root, id, scene) {
  scene._vpCanvasId = id;
  root._canvasScenes ||= new Map([['scene', root]]);
  root._canvasScenes.set(id, scene);
  const pending = root._canvasPending?.get(id) || [];
  root._canvasPending?.delete(id);
  processBatch(pending, root);
}

// Three.js 메시 레지스트리 (id → Three.js Mesh)
const meshRegistry = new Map();

// 궤적(trail) 레지스트리 (id → { line, positions, material, maxPoints })
const trailRegistry = new Map();

// curve/points 동적 라인 레지스트리 (id → { line, positions, colors, kind, baseColor })
const curveRegistry = new Map();

// axis·up 기준 좌표계(basis)로 방향을 정하는 객체 종류 — box와 같은 방식으로 회전한다
// group은 GlowScript 명세대로 Python이 하위 객체를 하나씩 돌리므로 여기 없다 (그룹 자체는 위치만 갖는다)
const BASIS_TYPES = new Set(['box', 'pyramid', 'ellipsoid', 'compound', 'extrusion', 'text', 'curve', 'points', 'helix']);

// 기본 재질 설정
const DEFAULT_MATERIAL_PARAMS = {
  roughness: 0.4,
  metalness: 0.1,
};

/** 객체의 재질(배열이면 각각)에 fn을 적용 */
function eachMaterial(obj, fn) {
  const m = obj?.material;
  if (!m) return;
  (Array.isArray(m) ? m : [m]).forEach(fn);
}

/** group(묶음) 안으로 객체를 옮긴다 — 하위 객체의 위치는 묶음 기준 상대 좌표가 된다 */
function attachToGroup(mesh, groupId, scene) {
  if (!groupId) return;
  const parent = meshRegistry.get(groupId);
  if (!parent || parent.userData?.vpType !== 'group') return;
  scene.remove(mesh);
  parent.add(mesh);
}

/** 정점 색 속성을 한 색으로 채운다 */
function fillColorAttribute(geometry, rgb) {
  const attr = geometry?.getAttribute?.('color');
  if (!attr) return;
  for (let i = 0; i < attr.count; i++) attr.setXYZ(i, rgb[0], rgb[1], rgb[2]);
  attr.needsUpdate = true;
}

/** curve/points의 위치·색 배열을 지오메트리에 다시 싣는다 */
function refreshCurveGeometry(entry) {
  const geometry = entry.line.geometry;
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(entry.positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(entry.colors, 3));
  geometry.computeBoundingSphere();
}

/** 경로 점들의 경계 상자 중심 — Python 쪽 extrusion.pos 기본값과 같은 규칙 */
function pathCenter(path) {
  const pts = (path || []).filter((p) => Array.isArray(p) && p.length >= 2);
  if (pts.length === 0) return [0, 0, 0];
  const mins = [Infinity, Infinity, Infinity];
  const maxs = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) {
    for (let k = 0; k < 3; k++) {
      const v = Number(p[k]) || 0;
      if (v < mins[k]) mins[k] = v;
      if (v > maxs[k]) maxs[k] = v;
    }
  }
  return [0, 1, 2].map((k) => (mins[k] + maxs[k]) / 2);
}

/** 메시(그룹이면 자식까지)의 지오메트리·재질·텍스처를 해제 */
function disposeObject(mesh) {
  const disposeOne = (obj) => {
    obj.geometry?.dispose?.();
    eachMaterial(obj, (mat) => {
      mat.map?.dispose?.();
      mat.dispose?.();
    });
  };
  disposeOne(mesh);
  if (mesh.isGroup || mesh.children?.length) {
    mesh.traverse?.((child) => {
      if (child !== mesh) disposeOne(child);
    });
  }
  if (mesh.userData?.vpType === 'text') {
    unregisterText3D(mesh);
    mesh.userData.textMaterial?.dispose?.();
  }
}

function applyBoxOrientation(mesh, axisValue, upValue) {
  const axis = asVectorArray(axisValue, DEFAULT_OBJECT_PROPS.box.axis);
  const up = asVectorArray(upValue, DEFAULT_OBJECT_PROPS.box.up);
  const xAxis = new THREE.Vector3(...axis);
  if (!xAxis.lengthSq || xAxis.lengthSq() < 1e-12) {
    xAxis.set(1, 0, 0);
  } else {
    xAxis.normalize();
  }

  const yAxis = new THREE.Vector3(...up);
  if (!yAxis.lengthSq || yAxis.lengthSq() < 1e-12) {
    yAxis.set(0, 1, 0);
  }
  yAxis.addScaledVector(xAxis, -yAxis.dot(xAxis));
  if (yAxis.lengthSq() < 1e-12) {
    if (Math.abs(xAxis.y) < 0.9) {
      yAxis.set(0, 1, 0);
    } else {
      yAxis.set(0, 0, 1);
    }
    yAxis.addScaledVector(xAxis, -yAxis.dot(xAxis));
  }
  yAxis.normalize();

  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
  yAxis.crossVectors(zAxis, xAxis).normalize();
  const matrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  mesh.quaternion.setFromRotationMatrix(matrix);
}

/**
 * arrow 그룹(화살대+화살촉)의 geometry를 새 길이/굵기로 재구성
 * VPython 호환: axis 벡터의 크기가 곧 화살표 길이
 */
function rebuildArrow(group, len, sw) {
  const [shaft, head] = group.children;
  if (shaft?.geometry) {
    shaft.geometry.dispose();
    shaft.geometry = new THREE.CylinderGeometry(sw / 2, sw / 2, len * 0.8, 8);
    shaft.position.y = len * 0.4;
  }
  if (head?.geometry) {
    head.geometry.dispose();
    head.geometry = new THREE.ConeGeometry(sw * 1.5, len * 0.2, 8);
    head.position.y = len * 0.9;
  }
}

/** 나선 크기·단면·회전 방향·선 두께를 실제 지오메트리로 반영한다. */
function rebuildHelixGeometry(mesh, len) {
  const spec = mesh.userData.helixSpec;
  spec.size[0] = len;
  mesh.geometry.dispose();
  mesh.geometry = buildHelixGeometry(spec);
}

/**
 * VPython 색상 배열 [r,g,b] (0~1) → Three.js Color
 */
function toThreeColor(arr) {
  return new THREE.Color(arr[0], arr[1], arr[2]);
}

function cloneThreeColor(color) {
  return typeof color?.clone === 'function'
    ? color.clone()
    : new THREE.Color(color?.r ?? 0, color?.g ?? 0, color?.b ?? 0);
}

function setMaterialEmissive(material, enabled) {
  if (!material || !('emissive' in material)) return;
  material.emissive = enabled ? cloneThreeColor(material.color) : new THREE.Color(0, 0, 0);
  material.emissiveIntensity = enabled ? 0.8 : 0;
  material.needsUpdate = true;
}

function updateMaterialColor(material, color) {
  if (!material) return;
  material.color = color;
  if ('emissiveIntensity' in material && material.emissiveIntensity > 0) {
    material.emissive = cloneThreeColor(color);
  }
}

/**
 * height는 화면의 글자 픽셀 크기이다. 카메라 거리·줌·기기 DPR에 따라
 * 글자가 작아지지 않도록, 현재 투영 행렬과 CSS 뷰포트 높이로 환산한다.
 */
function sizeLabelForRenderer(renderer, _scene, camera) {
  const data = this.userData;
  const viewport = renderer.getSize(data.labelViewport);
  const projectionY = Math.abs(camera.projectionMatrix.elements[5]);
  if (!(viewport.y > 0) || !(projectionY > 0)) return;
  const pixelsToWorld = 2 / (viewport.y * projectionY);
  this.scale.set(data.labelPixelWidth * pixelsToWorld, data.labelPixelHeight * pixelsToWorld, 1);
  // onBeforeRender는 씬의 행렬 갱신 뒤 호출되므로 변경한 scale을 즉시 반영한다.
  this.updateMatrixWorld();
}

/**
 * 라벨 스프라이트 생성 — 각 줄을 따로 측정·그려 줄바꿈과 빈 줄을 보존한다.
 */
function createLabelSprite(cmd) {
  const text = String(cmd.text ?? '');
  const lines = text.split(/\r\n|\r|\n/);
  const fontPx = Math.max(12, asNumber(cmd.height, 16));
  const resolution = 2;
  const padding = 4 * resolution;
  const lineHeight = Math.ceil(fontPx * 1.3) * resolution;
  const font = `${fontPx * resolution}px "DM Sans", "Noto Sans KR", sans-serif`;

  // 측정용 캔버스
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  measureCtx.font = font;
  let widestLine = 0;
  for (const line of lines) {
    widestLine = Math.max(widestLine, measureCtx.measureText(line || ' ').width);
  }
  const textWidth = Math.ceil(widestLine) + padding * 2;
  const textHeight = lineHeight * lines.length + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(textWidth, 32);
  canvas.height = Math.max(textHeight, 32);
  const ctx = canvas.getContext('2d');

  // 배경
  if (cmd.background) {
    const [r, g, b] = cmd.background;
    ctx.fillStyle = `rgba(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)}, 0.85)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 테두리
  if (cmd.border > 0) {
    ctx.strokeStyle = '#888';
    ctx.lineWidth = cmd.border;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  }

  // 텍스트
  const [r, g, b] = cmd.color || [1, 1, 1];
  ctx.fillStyle = `rgb(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)})`;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, padding + lineHeight * (index + 0.5));
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: cmd.opacity ?? 1,
    depthTest: false,
    depthWrite: false,
    sizeAttenuation: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.userData = {
    isLabel: true, text, fontPx, color: cmd.color || [1, 1, 1],
    background: cmd.background, border: cmd.border,
    labelPixelWidth: canvas.width / resolution,
    labelPixelHeight: canvas.height / resolution,
    labelViewport: new THREE.Vector2(),
  };
  sprite.onBeforeRender = sizeLabelForRenderer;
  sprite.frustumCulled = false;
  return sprite;
}

/**
 * 라벨 스프라이트 텍스처를 갱신 (text/color 변경 시)
 */
function updateLabelSprite(sprite, cmd) {
  const merged = {
    text: cmd.text ?? sprite.userData.text,
    height: Math.max(12, asNumber(cmd.height, sprite.userData.fontPx)),
    color: cmd.color || sprite.userData.color,
    background: cmd.background ?? sprite.userData.background,
    border: cmd.border ?? sprite.userData.border,
    opacity: cmd.opacity ?? (sprite.material?.opacity ?? 1),
  };
  const sameColor = merged.color.every((value, index) => value === sprite.userData.color[index]);
  if (
    String(merged.text) === sprite.userData.text && merged.height === sprite.userData.fontPx
    && sameColor && merged.background === sprite.userData.background && merged.border === sprite.userData.border
  ) return;
  // 새 sprite를 만들어 texture/scale을 옮겨붙임
  const fresh = createLabelSprite(merged);
  // 기존 텍스처/재질 정리
  if (sprite.material?.map) sprite.material.map.dispose();
  if (sprite.material) sprite.material.dispose();
  sprite.material = fresh.material;
  sprite.scale.copy(fresh.scale);
  sprite.userData = { ...sprite.userData, ...fresh.userData };
}

/**
 * 3D 객체 생성
 */
function createObject(cmd, scene) {
  let geometry;
  let material;
  let mesh;

  const col = toThreeColor(cmd.color || [1, 1, 1]);
  const tex = resolveTexture(cmd.texture);
  material = new THREE.MeshStandardMaterial({
    color: col,
    map: tex || null,
    emissive: cmd.emissive ? cloneThreeColor(col) : new THREE.Color(0, 0, 0),
    emissiveIntensity: cmd.emissive ? 0.8 : 0,
    ...DEFAULT_MATERIAL_PARAMS,
    ...(cmd.shininess !== undefined ? { roughness: Math.max(0.05, 1-cmd.shininess) } : {}),
    transparent: cmd.opacity < 1,
    opacity: cmd.opacity ?? 1,
  });
  if (tex) {
    material.userData = material.userData || {};
    material.userData.textureSpec = cmd.texture;
  }

  switch (cmd.type) {
    case 'sphere':
      geometry = new THREE.SphereGeometry(cmd.radius ?? DEFAULT_OBJECT_PROPS.sphere.radius, 32, 16);
      mesh = new THREE.Mesh(geometry, material);
      break;

    case 'box': {
      const size = resolveBoxSize(cmd);
      geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
      mesh = new THREE.Mesh(geometry, material);
      mesh.userData = {
        ...(mesh.userData || {}),
        vpType: 'box',
        boxSize: size,
        boxAxis: asVectorArray(cmd.axis, DEFAULT_OBJECT_PROPS.box.axis),
        boxUp: asVectorArray(cmd.up, DEFAULT_OBJECT_PROPS.box.up),
      };
      applyBoxOrientation(mesh, mesh.userData.boxAxis, mesh.userData.boxUp);
      break;
    }

    case 'cylinder': {
      const r = cmd.radius ?? DEFAULT_OBJECT_PROPS.cylinder.radius;
      const axis = cmd.axis || DEFAULT_OBJECT_PROPS.cylinder.axis;
      const len = Math.sqrt(axis[0] ** 2 + axis[1] ** 2 + axis[2] ** 2) || 1;
      geometry = primitiveGeometry.cylinder(r, len);
      mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { ...(mesh.userData || {}), vpType: 'cylinder' };
      // 실린더를 축 방향으로 회전
      if (axis) {
        const dir = new THREE.Vector3(...axis).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        mesh.quaternion.setFromUnitVectors(up, dir);
      }
      break;
    }

    case 'arrow': {
      const axis = cmd.axis || DEFAULT_OBJECT_PROPS.arrow.axis;
      const len = Math.sqrt(axis[0] ** 2 + axis[1] ** 2 + axis[2] ** 2) || 1;
      const sw = cmd.shaftwidth ?? DEFAULT_OBJECT_PROPS.arrow.shaftwidth;

      // 화살대 + 화살촉 그룹
      const group = new THREE.Group();

      const shaftGeom = new THREE.CylinderGeometry(sw / 2, sw / 2, len * 0.8, 8);
      const shaft = new THREE.Mesh(shaftGeom, material);
      shaft.position.y = len * 0.4;
      group.add(shaft);

      const headGeom = new THREE.ConeGeometry(sw * 1.5, len * 0.2, 8);
      const head = new THREE.Mesh(headGeom, material);
      head.position.y = len * 0.9;
      group.add(head);

      // 방향 설정
      const dir = new THREE.Vector3(...axis).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      group.quaternion.setFromUnitVectors(up, dir);

      group.userData = { ...(group.userData || {}), vpType: 'arrow', arrowLen: len, arrowShaftwidth: sw };
      mesh = group;
      break;
    }

    case 'cone': {
      const r = cmd.radius ?? DEFAULT_OBJECT_PROPS.cone.radius;
      const axis = cmd.axis || DEFAULT_OBJECT_PROPS.cone.axis;
      const len = Math.sqrt(axis[0] ** 2 + axis[1] ** 2 + axis[2] ** 2) || 1;
      geometry = primitiveGeometry.cone(r, len);
      mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { ...(mesh.userData || {}), vpType: 'cone' };
      const dir = new THREE.Vector3(...axis).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      mesh.quaternion.setFromUnitVectors(up, dir);
      break;
    }

    case 'ring': {
      const r = cmd.radius ?? DEFAULT_OBJECT_PROPS.ring.radius;
      const t = cmd.thickness ?? DEFAULT_OBJECT_PROPS.ring.thickness;
      geometry = new THREE.TorusGeometry(r, t, 16, 48);
      mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { vpType: 'ring' };
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), new THREE.Vector3(...asVectorArray(cmd.axis, [1,0,0])).normalize());
      break;
    }

    case 'pyramid': {
      const size = resolveBoxSize(cmd, DEFAULT_OBJECT_PROPS.pyramid.size);
      geometry = primitiveGeometry.pyramid(size);
      mesh = new THREE.Mesh(geometry, material);
      mesh.userData = {vpType:'pyramid',boxSize:size,boxAxis:asVectorArray(cmd.axis,[1,0,0]),boxUp:asVectorArray(cmd.up,[0,1,0])};
      applyBoxOrientation(mesh,mesh.userData.boxAxis,mesh.userData.boxUp);
      break;
    }

    case 'ellipsoid': {
      // 타원체 — sphere를 size로 비균등 스케일링
      const size = cmd.size || DEFAULT_OBJECT_PROPS.ellipsoid.size;
      geometry = new THREE.SphereGeometry(0.5, 32, 16);
      mesh = new THREE.Mesh(geometry, material);
      mesh.scale.set(size[0], size[1], size[2]);
      mesh.userData = { vpType: 'ellipsoid', boxAxis: asVectorArray(cmd.axis, [1,0,0]), boxUp: asVectorArray(cmd.up, [0,1,0]) };
      applyBoxOrientation(mesh, mesh.userData.boxAxis, mesh.userData.boxUp);
      break;
    }

    case 'helix': {
      const spec = {
        size: cmd.size || [cmd.length ?? 1, 2*(cmd.radius ?? 1), 2*(cmd.radius ?? 1)],
        coils: cmd.coils ?? 5, thickness: cmd.thickness ?? (cmd.radius ?? 1)/20,
        ccw: cmd.ccw !== false,
      };
      mesh = new THREE.Mesh(buildHelixGeometry(spec), material);
      mesh.userData = { vpType: 'helix', helixSpec: spec,
        boxAxis: cmd.axis || [1,0,0], boxUp: cmd.up || [0,1,0] };
      applyBoxOrientation(mesh, mesh.userData.boxAxis, mesh.userData.boxUp);
      break;
    }

    case 'label': {
      // 항상 카메라를 향하는 텍스트 스프라이트 (Canvas 텍스처)
      material.dispose();
      const sprite = createLabelSprite(cmd);
      mesh = sprite;
      break;
    }

    case 'curve':
    case 'points': {
      // 점마다 색을 가진 폴리라인/점 집합 — 재질 색은 흰색으로 두고 정점 색으로 그린다
      material.dispose();
      const pointList = cmd.points || [];
      const baseColor = cmd.color || [1, 1, 1];
      const initialPoints = pointList.flat();
      const initialColors = (Array.isArray(cmd.colors) && cmd.colors.length === pointList.length)
        ? cmd.colors.flat()
        : pointList.flatMap(() => baseColor);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(initialPoints, 3));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(initialColors, 3));
      if (cmd.type === 'curve') {
        const cmat = new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: cmd.opacity < 1,
          opacity: cmd.opacity ?? 1,
        });
        mesh = new THREE.Line(geom, cmat);
      } else {
        // size_units='world'면 점마다의 radius(평균)로 크기를 정하고, 기본은 픽셀 크기(size)
        const radii = Array.isArray(cmd.radii) ? cmd.radii.filter((r) => r > 0) : [];
        const avgRadius = radii.length ? radii.reduce((a, b) => a + b, 0) / radii.length : (cmd.radius || 0);
        const worldUnits = cmd.size_units === 'world';
        const pmat = new THREE.PointsMaterial({
          vertexColors: true,
          size: worldUnits ? Math.max(2 * (avgRadius || 0.02), 1e-3) : (cmd.size ?? 5) * 0.02,
          sizeAttenuation: true,
          transparent: cmd.opacity < 1,
          opacity: cmd.opacity ?? 1,
        });
        mesh = new THREE.Points(geom, pmat);
      }
      mesh.userData = {
        vpType: cmd.type,
        boxAxis: asVectorArray(cmd.axis, [1, 0, 0]),
        boxUp: asVectorArray(cmd.up, [0, 1, 0]),
      };
      applyBoxOrientation(mesh, mesh.userData.boxAxis, mesh.userData.boxUp);
      if (Array.isArray(cmd.origin)) mesh.position.set(cmd.origin[0], cmd.origin[1], cmd.origin[2]);
      curveRegistry.set(cmd.id, {
        line: mesh,
        positions: initialPoints.slice(),
        colors: initialColors.slice(),
        kind: cmd.type,
        baseColor,
      });
      break;
    }

    case 'group': {
      // 묶음 — 하위 객체는 create 커맨드의 group 필드로 이 그룹 안에 들어온다.
      // GlowScript 명세대로 그룹은 위치(g.pos)만 더하고, 회전은 Python이 하위 객체를 하나씩 돌린다.
      material.dispose();
      mesh = new THREE.Group();
      mesh.userData = { vpType: 'group' };
      break;
    }

    case 'text': {
      // 3D 입체 글자 — 글꼴을 비동기로 받아 자식 메시를 채운다 (글꼴에 없는 글자는 2D 라벨로 대체)
      const holder = new THREE.Group();
      holder.userData = {
        vpType: 'text',
        textSpec: pickTextSpec(cmd),
        textMaterial: material,
        createLabel: createLabelSprite,
        boxAxis: asVectorArray(cmd.axis, [1, 0, 0]),
        boxUp: asVectorArray(cmd.up, [0, 1, 0]),
      };
      applyBoxOrientation(holder, holder.userData.boxAxis, holder.userData.boxUp);
      rebuildText3D(holder);
      mesh = holder;
      break;
    }

    case 'triangle':
    case 'quad': {
      const verts = cmd.vertices || [];
      configureMeshMaterial(material, verts);
      mesh = new THREE.Mesh(buildMeshGeometry(cmd.type, verts), material);
      mesh.userData = { vpType: cmd.type };
      break;
    }

    case 'extrusion': {
      // 2D 단면(shape: [[바깥, 구멍...], ...])을 path를 따라 쓸어 만든다.
      // 지오메트리는 경로 중심 기준으로 만들고 mesh.position = pos 로 놓는다 (pos를 바꾸면 전체가 옮겨진다)
      const path = cmd.path || [];
      let solids = cmd.shape || [];
      // 옛 형식([[x, y], ...] 단일 외곽선)도 받는다
      if (solids.length > 0 && Array.isArray(solids[0]) && solids[0].length >= 2 && typeof solids[0][0] === 'number') {
        solids = [[solids]];
      } else if (solids.length > 0 && Array.isArray(solids[0]) && Array.isArray(solids[0][0]) && typeof solids[0][0][0] === 'number') {
        solids = [solids];
      }
      let built = null;
      try {
        built = buildExtrusionGeometry(path, solids, {
          scale: cmd.scale,
          colors: cmd.colors,
          color: cmd.color,
          up: [0, 1, 0],
          showStartFace: cmd.show_start_face,
          showEndFace: cmd.show_end_face,
          startFaceColor: cmd.start_face_color,
          endFaceColor: cmd.end_face_color,
          center: pathCenter(path),
        });
      } catch (err) {
        // 정점 상한 초과 등 — 그리지 않고 한국어 오류만 남긴다
        console.error(`[extrusion] ${err?.message || err}`);
        material.dispose();
        return;
      }
      if (built) {
        geometry = built.geometry;
        material.side = THREE.DoubleSide;
        if (built.vertexColored) {
          material.vertexColors = true;
          material.color = new THREE.Color(1, 1, 1);
          material.needsUpdate = true;
        }
      } else {
        // path/shape가 부실하면 1x1x1 box로 대체
        geometry = new THREE.BoxGeometry(1, 1, 1);
      }
      mesh = new THREE.Mesh(geometry, material);
      mesh.userData = {
        vpType: 'extrusion',
        vertexColored: Boolean(built?.vertexColored),
        boxAxis: asVectorArray(cmd.axis, [1, 0, 0]),
        boxUp: asVectorArray(cmd.up, [0, 1, 0]),
      };
      applyBoxOrientation(mesh, mesh.userData.boxAxis, mesh.userData.boxUp);
      if (!cmd.pos) mesh.position.set(...pathCenter(path));
      break;
    }

    case 'local_light': {
      const light = new THREE.PointLight(
        toThreeColor(cmd.color || [1, 1, 1]),
        cmd.intensity ?? 1,
        50, // distance
      );
      if (cmd.pos) light.position.set(cmd.pos[0], cmd.pos[1], cmd.pos[2]);
      scene.add(light);
      meshRegistry.set(cmd.id, light);
      registerObject('local_light', getRegistryProps(cmd), cmd.id);
      return;
    }

    case 'distant_light': {
      const light = new THREE.DirectionalLight(
        toThreeColor(cmd.color || [1, 1, 1]),
        cmd.intensity ?? 1,
      );
      const dir = cmd.direction || [0, -1, 0];
      // DirectionalLight의 position = -direction (빛이 오는 방향)
      light.position.set(-dir[0] * 10, -dir[1] * 10, -dir[2] * 10);
      light.target.position.set(0, 0, 0);
      scene.add(light);
      scene.add(light.target);
      meshRegistry.set(cmd.id, light);
      registerObject('distant_light', getRegistryProps({ ...cmd, direction: dir }), cmd.id);
      return;
    }

    default:
      console.warn(`[Bridge] 알 수 없는 객체 타입: ${cmd.type}`);
      return;
  }

  // 위치 설정
  if (cmd.pos) {
    mesh.position.set(cmd.pos[0], cmd.pos[1], cmd.pos[2]);
  }

  // 가시성
  mesh.visible = cmd.visible !== false;

  // 픽 식별용 — raycasting 시 mesh.userData.vpId로 VPython id 복원
  mesh.userData = mesh.userData || {};
  mesh.userData.vpId = cmd.id;

  // 씬에 추가 (group= 으로 묶인 객체는 그 그룹 안으로)
  scene.add(mesh);
  mesh.userData = { ...(mesh.userData || {}), vpCanvasId: scene._vpCanvasId || 'scene' };
  meshRegistry.set(cmd.id, mesh);
  attachToGroup(mesh, cmd.group, scene);

  // 궤적(trail) 생성
  if (cmd.make_trail) {
    createTrail(cmd, scene);
  }

  // 객체 레지스트리에 등록 (Python Worker의 cmd.id를 그대로 사용)
  registerObject(cmd.type, getRegistryProps(cmd), cmd.id);
}

/**
 * 궤적(trail) 생성 — trail_type='curve'(선, 기본) 또는 'points'(점)
 * interval=n: n번 움직일 때마다 한 점, pps=k: 초당 k점까지만, trail_radius: 점 궤적의 반지름
 */
function createTrail(cmd, scene) {
  const trailColor = cmd.trail_color
    ? toThreeColor(cmd.trail_color)
    : toThreeColor(cmd.color || [1, 1, 1]);
  const trailGeometry = new THREE.BufferGeometry();
  const positions = [];
  // 초기 위치를 첫 포인트로 추가
  if (cmd.pos) {
    positions.push(cmd.pos[0], cmd.pos[1], cmd.pos[2]);
  }
  trailGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  const isPoints = cmd.trail_type === 'points';
  let trailLine;
  if (isPoints) {
    const radius = asNumber(cmd.trail_radius, 0);
    const trailMaterial = new THREE.PointsMaterial({
      color: trailColor,
      size: radius > 0 ? 2 * radius : 0.08,
      sizeAttenuation: true,
    });
    trailLine = new THREE.Points(trailGeometry, trailMaterial);
  } else {
    const trailMaterial = new THREE.LineBasicMaterial({ color: trailColor });
    trailLine = new THREE.Line(trailGeometry, trailMaterial);
  }
  trailLine.userData.vpTrail = true; // 카메라의 화면 맞춤 기준에서 뺀다 (움직임에서 나온 선)
  scene.add(trailLine);
  trailRegistry.set(cmd.id, {
    line: trailLine,
    positions: positions,
    // retain 지정 시 해당 값을 최대 포인트 수로 사용 (attach_trail 경로와 동일)
    maxPoints: cmd.retain > 0 ? cmd.retain : 10000,
    type: isPoints ? 'points' : 'curve',
    interval: Math.max(1, Math.floor(asNumber(cmd.interval, 1)) || 1),
    pps: Math.max(0, asNumber(cmd.pps, 0)),
    counter: 0,
    lastTime: -Infinity,
  });
}

/**
 * 궤적 업데이트 — 새 위치 추가
 */
function updateTrail(cmd) {
  const trail = trailRegistry.get(cmd.id);
  if (!trail) return;
  trail.counter = (trail.counter || 0) + 1;
  if (trail.interval > 1 && trail.counter % trail.interval !== 0) return;
  if (trail.pps > 0) {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now - trail.lastTime < 1000 / trail.pps) return;
    trail.lastTime = now;
  }
  trail.positions.push(cmd.pos[0], cmd.pos[1], cmd.pos[2]);
  // 최대 길이 제한
  if (trail.positions.length > trail.maxPoints * 3) {
    trail.positions.splice(0, 3);
  }
  trail.line.geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(trail.positions, 3),
  );
  trail.line.geometry.computeBoundingSphere();
}

/**
 * 객체 속성 업데이트
 */
function updateMesh(cmd) {
  const mesh = meshRegistry.get(cmd.id);
  if (!mesh) return;

  const registryUpdates = {};

  if (cmd.pos) {
    mesh.position.set(cmd.pos[0], cmd.pos[1], cmd.pos[2]);
    registryUpdates.pos = cmd.pos;
  }

  // curve/points의 origin — 점 좌표는 그대로 두고 전체를 옮긴다
  if (Array.isArray(cmd.origin)) {
    mesh.position.set(cmd.origin[0], cmd.origin[1], cmd.origin[2]);
  }

  // compound의 size/length 변경 — 그룹 배율
  if (Array.isArray(cmd.scale) && mesh.userData?.vpType === 'compound') {
    mesh.scale.set(asNumber(cmd.scale[0], 1), asNumber(cmd.scale[1], 1), asNumber(cmd.scale[2], 1));
    registryUpdates.size = cmd.scale;
  }

  if (cmd.color) {
    const curveEntry = curveRegistry.get(cmd.id);
    if (mesh.isLight) {
      mesh.color = toThreeColor(cmd.color);
    } else if (curveEntry) {
      // curve/points — 점마다의 색을 모두 이 색으로 (GlowScript와 같음)
      curveEntry.baseColor = cmd.color;
      for (let i = 0; i < curveEntry.colors.length; i += 3) {
        curveEntry.colors[i] = cmd.color[0];
        curveEntry.colors[i + 1] = cmd.color[1];
        curveEntry.colors[i + 2] = cmd.color[2];
      }
      refreshCurveGeometry(curveEntry);
    } else if (mesh.userData?.vertexColored) {
      // 정점 색으로 그리는 extrusion — 정점 색을 모두 바꾼다
      fillColorAttribute(mesh.geometry, cmd.color);
    } else if (mesh.userData?.vpType === 'compound') {
      compoundAppearance.apply(mesh, { color: cmd.color });
    } else if (mesh.isGroup) {
      // group·text(Group) — 모든 자식 재질 색상 변경
      mesh.traverse((child) => {
        eachMaterial(child, (mat) => updateMaterialColor(mat, toThreeColor(cmd.color)));
      });
    } else if (mesh.material && !mesh.isSprite) {
      updateMaterialColor(mesh.material, toThreeColor(cmd.color));
    }
    registryUpdates.color = cmd.color;
  }

  if (cmd.size !== undefined && mesh.isPoints && mesh.material) {
    // points의 픽셀 크기
    mesh.material.size = asNumber(cmd.size, 5) * 0.02;
    mesh.material.needsUpdate = true;
  }

  if (cmd.intensity !== undefined && mesh.isLight) {
    mesh.intensity = cmd.intensity;
    registryUpdates.intensity = cmd.intensity;
  }

  if (cmd.direction !== undefined && mesh.isDirectionalLight) {
    mesh.position.set(-cmd.direction[0] * 10, -cmd.direction[1] * 10, -cmd.direction[2] * 10);
    registryUpdates.direction = cmd.direction;
  }

  if (cmd.visible !== undefined) {
    mesh.visible = cmd.visible;
    registryUpdates.visible = cmd.visible;
  }

  if (cmd.opacity !== undefined) {
    if (mesh.userData?.vpType === 'compound') {
      compoundAppearance.apply(mesh, { opacity: cmd.opacity });
    } else if (mesh.isGroup) {
      mesh.traverse(child => eachMaterial(child, mat => compoundAppearance.setOpacity(mat, cmd.opacity)));
    } else if (mesh.material) {
      const alpha = mesh.geometry?.getAttribute?.('vpOpacity');
      const vertexAlpha = alpha && Array.from(alpha.array).some(value => value < 1);
      eachMaterial(mesh, mat => compoundAppearance.setOpacity(mat, cmd.opacity, !!vertexAlpha));
    }
    registryUpdates.opacity = cmd.opacity;
  }

  if (cmd.shininess !== undefined) {
    if (mesh.userData?.vpType === 'compound') compoundAppearance.apply(mesh, { shininess: cmd.shininess });
    else eachMaterial(mesh, mat => { if ('roughness' in mat) mat.roughness = Math.max(0.05, 1-cmd.shininess); });
    registryUpdates.shininess = cmd.shininess;
  }

  if (cmd.texture !== undefined) {
    const newTex = resolveTexture(cmd.texture);
    const apply = (mat) => {
      if (!mat) return;
      mat.map = newTex || null;
      mat.userData = mat.userData || {};
      mat.userData.textureSpec = cmd.texture || null;
      mat.needsUpdate = true;
    };
    if (mesh.isGroup) {
      mesh.traverse((child) => eachMaterial(child, apply));
    } else {
      apply(mesh.material);
    }
    registryUpdates.texture = cmd.texture || null;
  }

  if (cmd.emissive !== undefined && !mesh.isLight) {
    if (mesh.userData?.vpType === 'compound') {
      compoundAppearance.apply(mesh, { emissive: cmd.emissive });
    } else if (mesh.isGroup) {
      mesh.traverse((child) => {
        eachMaterial(child, (mat) => setMaterialEmissive(mat, cmd.emissive));
      });
    } else if (mesh.material) {
      setMaterialEmissive(mesh.material, cmd.emissive);
    }
    registryUpdates.emissive = cmd.emissive;
  }

  if (cmd.radius !== undefined && mesh.geometry) {
    registryUpdates.radius = cmd.radius;
    // geometry 재생성 (sphere, cone, cylinder, ring)
    let newGeom;
    if (mesh.geometry.type === 'SphereGeometry') {
      newGeom = new THREE.SphereGeometry(cmd.radius, 32, 16);
    } else if (mesh.geometry.type === 'ConeGeometry' && mesh.userData?.vpType !== 'pyramid') {
      const h = mesh.geometry.parameters?.height || 1;
      newGeom = primitiveGeometry.cone(cmd.radius, h);
    } else if (mesh.geometry.type === 'CylinderGeometry') {
      const h = mesh.geometry.parameters?.height || 1;
      newGeom = primitiveGeometry.cylinder(cmd.radius, h);
    } else if (mesh.geometry.type === 'TorusGeometry') {
      const t = mesh.geometry.parameters?.tube || 0.1;
      newGeom = new THREE.TorusGeometry(cmd.radius, t, 16, 48);
    }
    if (newGeom) {
      mesh.geometry.dispose();
      mesh.geometry = newGeom;
    }
  }

  if (mesh.userData?.vpType === 'helix' && ['size', 'radius', 'coils', 'thickness', 'ccw', 'axis'].some(key => cmd[key] !== undefined)) {
    const spec = mesh.userData.helixSpec;
    if (cmd.size) spec.size = [...cmd.size];
    else if (cmd.radius !== undefined) spec.size = [spec.size[0], 2*cmd.radius, 2*cmd.radius];
    if (cmd.coils !== undefined) spec.coils = cmd.coils;
    if (cmd.thickness !== undefined) spec.thickness = cmd.thickness;
    if (cmd.ccw !== undefined) spec.ccw = cmd.ccw;
    rebuildHelixGeometry(mesh, cmd.axis ? Math.hypot(...cmd.axis) : spec.size[0]);
  }

  const isBox = mesh.userData?.vpType === 'box' || mesh.geometry?.type === 'BoxGeometry';
  if (
    (cmd.size !== undefined || (isBox && (cmd.length !== undefined || cmd.height !== undefined || cmd.width !== undefined)))
    && mesh.geometry
  ) {
    const s = isBox
      ? resolveBoxSize(cmd, mesh.userData?.boxSize || DEFAULT_OBJECT_PROPS.box.size)
      : cmd.size;
    registryUpdates.size = s;
    if(mesh.userData?.vpType==='pyramid'){
      mesh.geometry.dispose();mesh.geometry=primitiveGeometry.pyramid(s);mesh.userData.boxSize=s;
    } else if (mesh.geometry.type === 'BoxGeometry') {
      const newGeom = new THREE.BoxGeometry(s[0], s[1], s[2]);
      mesh.geometry.dispose();
      mesh.geometry = newGeom;
      mesh.userData = mesh.userData || {};
      mesh.userData.boxSize = s;
    } else if (mesh.geometry.type === 'SphereGeometry') {
      // ellipsoid는 sphere + scale로 표현하므로 size 갱신은 scale 변경
      mesh.scale.set(s[0], s[1], s[2]);
    }
  }

  // 라벨 텍스트/색상 갱신 — Sprite를 새 캔버스 텍스처로 교체
  if (mesh.isSprite && (
    cmd.text !== undefined || cmd.color !== undefined || cmd.height !== undefined
    || cmd.background !== undefined || cmd.border !== undefined
  )) {
    if (cmd.text !== undefined) registryUpdates.text = cmd.text;
    updateLabelSprite(mesh, cmd);
  }

  if (cmd.thickness !== undefined) {
    registryUpdates.thickness = cmd.thickness;
  }

  if (cmd.thickness !== undefined && mesh.geometry?.type === 'TorusGeometry') {
    // ring의 경우 geometry 재생성
    const r = mesh.geometry.parameters?.radius || 1;
    const newGeom = new THREE.TorusGeometry(r, cmd.thickness, 16, 48);
    mesh.geometry.dispose();
    mesh.geometry = newGeom;
  }

  // 3D 글자 — 글자·높이·두께·정렬이 바뀌면 다시 만들고, 길이만 바뀌면 가로 배율만 바꾼다.
  // 색·투명도는 공유 재질(textMaterial)에 바로 적용되므로 글꼴을 기다리는 동안 바뀐 값도 완성된 글자에 반영된다.
  if (mesh.userData?.vpType === 'text') {
    const textMaterial = mesh.userData.textMaterial;
    if (textMaterial) {
      if (cmd.color) updateMaterialColor(textMaterial, toThreeColor(cmd.color));
      if (cmd.opacity !== undefined) {
        textMaterial.opacity = cmd.opacity;
        textMaterial.transparent = cmd.opacity < 1;
      }
      if (cmd.emissive !== undefined) setMaterialEmissive(textMaterial, cmd.emissive);
    }
    applyTextAppearance(mesh, cmd);
    const rebuildKeys = ['text', 'height', 'depth', 'align', 'billboard', 'latin', 'start_face_color', 'end_face_color'];
    const needsRebuild = rebuildKeys.some((key) => cmd[key] !== undefined);
    if (cmd.text !== undefined) registryUpdates.text = cmd.text;
    if (needsRebuild || cmd.length !== undefined) {
      mesh.userData.textSpec = pickTextSpec(cmd, mesh.userData.textSpec);
      if (needsRebuild) rebuildText3D(mesh);
      else applyTextLength(mesh);
    }
  }

  const usesBasis = isBox || BASIS_TYPES.has(mesh.userData?.vpType);
  if (usesBasis && (cmd.axis !== undefined || cmd.up !== undefined)) {
    mesh.userData = mesh.userData || {};
    mesh.userData.boxAxis = asVectorArray(cmd.axis || mesh.userData.boxAxis, DEFAULT_OBJECT_PROPS.box.axis);
    mesh.userData.boxUp = asVectorArray(cmd.up || mesh.userData.boxUp, DEFAULT_OBJECT_PROPS.box.up);
    applyBoxOrientation(mesh, mesh.userData.boxAxis, mesh.userData.boxUp);
    if (cmd.axis !== undefined) registryUpdates.axis = cmd.axis;
    if (cmd.up !== undefined) registryUpdates.up = cmd.up;
  } else if (cmd.axis !== undefined) {
    // VPython 호환: axis 벡터의 크기가 곧 길이 — 방향과 길이를 함께 반영
    const axisArr = asVectorArray(cmd.axis, [1, 0, 0]);
    const len = Math.hypot(...axisArr) || 1;
    const dir = new THREE.Vector3(...axisArr).normalize();
    const vpType = mesh.userData?.vpType;
    if (vpType === 'cylinder' && mesh.geometry) {
      const r = mesh.geometry.parameters?.radiusTop ?? 1;
      mesh.geometry.dispose();
      mesh.geometry = primitiveGeometry.cylinder(r, len);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    } else if (vpType === 'cone' && mesh.geometry) {
      const r = mesh.geometry.parameters?.radius ?? 1;
      mesh.geometry.dispose();
      mesh.geometry = primitiveGeometry.cone(r, len);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    } else if (vpType === 'ring') {
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), dir);
    } else if (vpType === 'arrow') {
      mesh.userData.arrowLen = len;
      rebuildArrow(mesh, len, mesh.userData.arrowShaftwidth ?? DEFAULT_OBJECT_PROPS.arrow.shaftwidth);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    } else if (vpType === 'helix') {
      rebuildHelixGeometry(mesh, len);
      // helix 기본 진행축은 +X (생성 시와 동일)
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    } else {
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    }
    registryUpdates.axis = cmd.axis;
  }

  if (cmd.shaftwidth !== undefined) {
    registryUpdates.shaftwidth = cmd.shaftwidth;
    if (mesh.userData?.vpType === 'arrow') {
      mesh.userData.arrowShaftwidth = cmd.shaftwidth;
      rebuildArrow(mesh, mesh.userData.arrowLen ?? 1, cmd.shaftwidth);
    }
  }

  if (Object.keys(registryUpdates).length > 0) {
    updateObject(cmd.id, registryUpdates);
  }
}

/**
 * scene.ambient = color — 뷰포트 기본 환경광의 색을 바꾼다.
 * GlowScript처럼 색의 밝기가 곧 세기다 (흰색 = 전부 밝힘, gray(0.2) = 어둡게).
 */
function setAmbientLight(scene, rgb) {
  scene.traverse((child) => {
    if (child.isAmbientLight && child.userData?.vpDefaultLight) {
      child.color = toThreeColor(rgb);
      child.intensity = 1;
    }
  });
}

/**
 * scene.lights = [...] — 기본 방향광을 끄고, 목록에 있는 사용자 조명만 켠다.
 * 빈 목록이면 사용자가 만든 조명도 모두 꺼진다 (GlowScript의 scene.lights = [] 와 같음).
 */
function setSceneLights(scene, ids) {
  const keep = new Set(ids.map(String));
  scene.traverse((child) => {
    if (child.isLight && !child.isAmbientLight && child.userData?.vpDefaultLight) child.visible = false;
  });
  for (const [id, mesh] of meshRegistry) {
    if (mesh.isLight && !mesh.isAmbientLight && (mesh.userData?.vpCanvasId || 'scene') === (scene._vpCanvasId || 'scene')) mesh.visible = keep.has(String(id));
  }
}

/** 새 실행 전에 기본 조명을 원래대로 되돌린다. */
export function resetDefaultLights(scene) {
  scene.traverse((child) => {
    if (!child.isLight || !child.userData?.vpDefaultLight) return;
    child.visible = true;
    if (child.isAmbientLight && child.userData.vpDefaultColor !== undefined) {
      child.color = new THREE.Color(child.userData.vpDefaultColor);
      child.intensity = child.userData.vpDefaultIntensity ?? 0.6;
    }
  });
}

/**
 * 배치 커맨드 처리 (커맨드 배칭 패턴)
 */
export function processBatch(commands, scene) {
  const root = scene;
  root._canvasScenes ||= new Map();
  root._canvasScenes.set('scene', root);
  root._canvasPending ||= new Map();
  for (const cmd of commands) {
    const canvasId = cmd.canvas_id || 'scene';
    if (cmd.action === 'canvas_create') {
      root._canvasHost?.create(cmd);
      continue;
    }
    scene = root._canvasScenes.get(canvasId);
    if (!scene) {
      const pending = root._canvasPending.get(canvasId) || [];
      pending.push(cmd);
      root._canvasPending.set(canvasId, pending);
      continue;
    }
    if (cmd.action === 'canvas_resize') {
      root._canvasHost?.resize(cmd);
      continue;
    }
    if (cmd.action === 'canvas_move') {
      const mesh = meshRegistry.get(cmd.id);
      if (mesh) {
        const previousScene = mesh.parent;
        scene.add(mesh);
        mesh.userData.vpCanvasId = canvasId;
        previousScene?._requestRender?.();
        scene._requestRender?.();
      }
      continue;
    }
    scene._requestRender?.();
    switch (cmd.action) {
      case 'create':
        if (canvasId === 'scene') root._canvasHost?.showDefault?.();
        createObject(cmd, scene);
        break;
      case 'update':
        updateMesh(cmd);
        break;
      case 'mesh_vertices': {
        const mesh = meshRegistry.get(cmd.id);
        if (mesh && ['triangle', 'quad'].includes(mesh.userData?.vpType)) {
          mesh.geometry.dispose();
          mesh.geometry = buildMeshGeometry(mesh.userData.vpType, cmd.vertices);
          configureMeshMaterial(mesh.material, cmd.vertices);
        }
        break;
      }
      case 'scene':
        if (cmd.property === 'background' && cmd.value) {
          scene.background = toThreeColor(cmd.value);
        } else if (cmd.property === 'range' && scene._cameraSystem) {
          scene._cameraSystem.setExplicitRange(Number(cmd.value));
        } else if (cmd.property === 'center' && scene._cameraSystem) {
          const c = cmd.value;
          scene._cameraSystem.setExplicitCenter(c[0], c[1], c[2]);
        } else if (cmd.property === 'autoscale' && scene._cameraSystem) {
          scene._cameraSystem.setAutoscale(Boolean(cmd.value));
        } else if (cmd.property === 'forward' && scene._cameraSystem && Array.isArray(cmd.value)) {
          scene._cameraSystem.setForward(cmd.value[0], cmd.value[1], cmd.value[2]);
        } else if (cmd.property === 'up' && scene._cameraSystem && Array.isArray(cmd.value)) {
          scene._cameraSystem.setUp(cmd.value[0], cmd.value[1], cmd.value[2]);
        } else if (cmd.property === 'fov' && scene._cameraSystem) {
          scene._cameraSystem.setFov(Number(cmd.value));
        } else if (cmd.property === 'camera_pos' && scene._cameraSystem && Array.isArray(cmd.value)) {
          scene._cameraSystem.setCameraPos(cmd.value[0], cmd.value[1], cmd.value[2]);
        } else if (cmd.property === 'camera_axis' && scene._cameraSystem && Array.isArray(cmd.value)) {
          scene._cameraSystem.setCameraAxis(cmd.value[0], cmd.value[1], cmd.value[2]);
        } else if (cmd.property === 'camera_follow' && scene._cameraSystem) {
          scene._cameraSystem.followObject(cmd.value ? meshRegistry.get(cmd.value) || null : null);
        } else if (cmd.property === 'ambient' && Array.isArray(cmd.value)) {
          setAmbientLight(scene, cmd.value);
        } else if (cmd.property === 'lights') {
          setSceneLights(scene, Array.isArray(cmd.value) ? cmd.value : []);
        } else if (['title', 'caption', 'append_title', 'append_caption'].includes(cmd.property)) {
          const overlay = scene._overlay;
          const text = String(cmd.value ?? '');
          if (overlay) {
            if (cmd.property === 'title') overlay.setTitle(text);
            else if (cmd.property === 'caption') overlay.setCaption(text);
            else if (cmd.property === 'append_title') overlay.appendTitle(text);
            else overlay.appendCaption(text);
          }
        } else if (['userzoom', 'userspin', 'userpan'].includes(cmd.property) && scene._cameraSystem?.controls) {
          const key = { userzoom: 'enableZoom', userspin: 'enableRotate', userpan: 'enablePan' }[cmd.property];
          scene._cameraSystem.controls[key] = !!cmd.value;
        } else if (cmd.property === 'visible') {
          // scene.visible = False — 3D 화면 전체를 숨긴다 (객체는 남는다)
          scene.visible = cmd.value !== false;
        } else if (cmd.property === 'delete') {
          // scene.delete() — 3D 객체를 모두 지운다 (위젯·그래프·오버레이는 남는다)
          deleteSceneObjects(scene, { markRegistry: true });
          clearWidgets(canvasId);
          clearGraphs2D(canvasId);
          scene._overlay?.clear?.();
          if (canvasId !== 'scene') {
            root._canvasScenes.delete(canvasId);
            root._canvasHost?.remove?.(canvasId);
          }
        }
        if (cmd.camera_revision !== undefined && scene._cameraSystem) scene._cameraRevision = cmd.camera_revision;
        break;
      case 'wtext_create':
      case 'wtext_update':
        scene._overlay?.setWidgetText?.(cmd.id, String(cmd.text ?? ''), cmd.anchor);
        break;
      case 'wtext_delete':
        scene._overlay?.removeWidgetText?.(cmd.id);
        break;
      case 'trail_update':
        updateTrail(cmd);
        break;
      case 'trail_clear': {
        const trail = trailRegistry.get(cmd.id);
        if (trail) {
          trail.positions.length = 0;
          trail.line.geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute([], 3),
          );
          trail.line.geometry.computeBoundingSphere();
        }
        break;
      }
      case 'trail_attach': {
        // 기존 trail이 없으면 새로 만들고, 있으면 색·길이만 갱신한다
        if (!trailRegistry.has(cmd.id) && meshRegistry.has(cmd.id)) {
          createTrail({
            id: cmd.id,
            pos: cmd.pos || [0, 0, 0],
            color: [1, 1, 1],
            trail_color: cmd.trail_color,
            trail_type: cmd.trail_type,
            interval: cmd.interval,
            pps: cmd.pps,
            trail_radius: cmd.trail_radius,
            retain: cmd.retain,
          }, scene);
        } else {
          const t = trailRegistry.get(cmd.id);
          if (t) {
            if (cmd.retain) t.maxPoints = cmd.retain;
            if (cmd.trail_color && t.line.material) t.line.material.color = toThreeColor(cmd.trail_color);
          }
        }
        break;
      }
      case 'curve_append': {
        const c = curveRegistry.get(cmd.id);
        if (c) {
          // 새 형식: points/colors 목록, 옛 형식: pos 하나
          const pts = Array.isArray(cmd.points) ? cmd.points : (cmd.pos ? [cmd.pos] : []);
          const cols = (Array.isArray(cmd.colors) && cmd.colors.length === pts.length)
            ? cmd.colors
            : pts.map(() => c.baseColor);
          for (const p of pts) c.positions.push(p[0], p[1], p[2]);
          for (const col of cols) c.colors.push(col[0], col[1], col[2]);
          refreshCurveGeometry(c);
        }
        break;
      }
      case 'curve_set': {
        // 점 목록 전체 교체 (modify·pop·shift·retain 뒤)
        const c = curveRegistry.get(cmd.id);
        if (c) {
          const pts = Array.isArray(cmd.points) ? cmd.points : [];
          const cols = (Array.isArray(cmd.colors) && cmd.colors.length === pts.length)
            ? cmd.colors
            : pts.map(() => c.baseColor);
          c.positions = pts.flat();
          c.colors = cols.flat();
          refreshCurveGeometry(c);
        }
        break;
      }
      case 'curve_clear': {
        const c = curveRegistry.get(cmd.id);
        if (c) {
          c.positions.length = 0;
          c.colors.length = 0;
          refreshCurveGeometry(c);
        }
        break;
      }
      case 'compound': {
        const group = new THREE.Group();
        // 기존 메시를 그룹으로 이동 — 부품 중심(center)이 그룹 원점이 되도록 자식 위치를 옮긴다
        const center = Array.isArray(cmd.center) ? cmd.center : [0, 0, 0];
        for (const subId of cmd.sub_ids) {
          const subMesh = meshRegistry.get(subId);
          if (subMesh) {
            scene.remove(subMesh);
            subMesh.position.set(
              subMesh.position.x - center[0],
              subMesh.position.y - center[1],
              subMesh.position.z - center[2],
            );
            group.add(subMesh);
          }
        }
        if (cmd.pos) group.position.set(cmd.pos[0], cmd.pos[1], cmd.pos[2]);
        else group.position.set(center[0], center[1], center[2]);
        group.userData = {
          vpType: 'compound',
          vpId: cmd.id,
          vpCanvasId: canvasId,
          boxAxis: asVectorArray(cmd.axis, [1, 0, 0]),
          boxUp: asVectorArray(cmd.up, [0, 1, 0]),
        };
        applyBoxOrientation(group, group.userData.boxAxis, group.userData.boxUp);
        compoundAppearance.init(group);
        compoundAppearance.apply(group, cmd);
        if (cmd.texture) {
          const tex = resolveTexture(cmd.texture);
          group.traverse((child) => eachMaterial(child, (mat) => {
            mat.map = tex || null;
            mat.needsUpdate = true;
          }));
        }
        group.visible = cmd.visible !== false;
        scene.add(group);
        meshRegistry.set(cmd.id, group);
        attachToGroup(group, cmd.group, scene);

        // compound 궤적 생성
        if (cmd.make_trail) {
          createTrail(cmd, scene);
        }

        registerObject('compound', getRegistryProps(cmd), cmd.id);
        break;
      }
      case 'sound':
        try { processSoundCommand(cmd); } catch { /* 사운드 에러가 3D 렌더링을 막지 않도록 */ }
        break;
      case 'chart':
        renderChart(cmd, scene);
        break;

      // === 위젯 ===
      case 'widget_create':
        try { createWidget(cmd); } catch (e) { console.warn('[widget create]', e); }
        break;
      case 'widget_update':
        try { updateWidget(cmd); } catch (e) { console.warn('[widget update]', e); }
        break;
      case 'widget_delete':
        try { deleteWidget(cmd); } catch (e) { console.warn('[widget delete]', e); }
        break;
      case 'input_request':
        // Python input() — 입력 위젯을 띄우고 답은 postInputValue로 Worker에 돌려준다
        try { createInputPrompt(cmd); } catch (e) { console.warn('[input request]', e); }
        break;
      case 'pause_notice':
        try { createPauseNotice(cmd); } catch (e) { console.warn('[pause notice]', e); }
        break;

      // === 2D 그래프 ===
      case 'graph_create':
        try { createGraph(cmd); } catch (e) { console.warn('[graph create]', e); }
        break;
      case 'graph_delete':
        try { deleteGraph(cmd); } catch (e) { console.warn('[graph delete]', e); }
        break;
      case 'graph_series_create':
        try { createSeries(cmd); } catch (e) { console.warn('[series create]', e); }
        break;
      case 'graph_series_delete':
        try { deleteSeries(cmd); } catch (e) { console.warn('[series delete]', e); }
        break;
      case 'graph_series_clear':
        try { clearSeries(cmd); } catch (e) { console.warn('[series clear]', e); }
        break;
      case 'graph_series_update':
        try { updateSeries(cmd); } catch (e) { console.warn('[series update]', e); }
        break;
      case 'graph_series_plot':
        try { plotSeries(cmd); } catch (e) { console.warn('[series plot]', e); }
        break;

      // === 이벤트 바인딩 신호 ===
      case 'scene_bind':
        for (const name of (cmd.events || [])) sceneBoundEvents.add(eventKey(name, canvasId));
        if (cmd.waiting && (cmd.events || []).includes('textures')) {
          const epoch = root._canvasEpoch;
          whenTexturesReady().then(() => {
            if (root._canvasEpoch === epoch) postEvent({ name: 'textures', canvas_id: canvasId });
          });
        }
        break;
      case 'scene_unbind':
        for (const name of (cmd.events || [])) sceneBoundEvents.delete(eventKey(name, canvasId));
        break;
      default:
        console.warn(`[Bridge] 알 수 없는 액션: ${cmd.action}`);
    }
  }
}

/**
 * 3D 객체·궤적·곡선을 모두 씬에서 제거하고 해제한다 (scene.delete()와 새 실행 전 초기화가 함께 쓴다)
 */
function deleteSceneObjects(scene, { markRegistry = false, all = false } = {}) {
  for (const [id, mesh] of meshRegistry) {
    if (!all && (mesh.userData?.vpCanvasId || 'scene') !== (scene._vpCanvasId || 'scene')) continue;
    if (mesh.parent) mesh.parent.remove(mesh);
    else scene.remove(mesh);
    meshRegistry.delete(id);
    // distant_light의 target도 씬에서 제거 (생성 시 scene.add(light.target) 됨)
    if (mesh.isDirectionalLight && mesh.target) mesh.target.parent?.remove(mesh.target);
    disposeObject(mesh);
    if (markRegistry) updateObject(id, { visible: false });
  }

  // 궤적(trail) 레지스트리 정리
  for (const [id, trail] of trailRegistry) {
    if (!all && trail.line.parent !== scene) continue;
    trail.line.parent?.remove(trail.line);
    trailRegistry.delete(id);
    trail.line.geometry.dispose();
    trail.line.material.dispose();
  }

  // curve/points 레지스트리 정리 (line 자체는 meshRegistry와 공유)
  for (const id of curveRegistry.keys()) if (!meshRegistry.has(id)) curveRegistry.delete(id);
}

/**
 * 씬 초기화 (모든 VPython 객체 제거)
 */
export function clearScene(scene) {
  scene._requestRender?.();
  deleteSceneObjects(scene, { all: true });
  scene._canvasScenes?.clear();
  scene._canvasPending?.clear();
  scene._canvasEpoch = (scene._canvasEpoch || 0) + 1;
  scene._canvasHost?.reset?.();
  scene.visible = true;
  scene._cameraRevision = 0;

  // 위젯·2D 그래프 DOM 정리
  clearWidgets();
  clearGraphs2D();

  // 이벤트 바인딩 초기화
  sceneBoundEvents.clear();

  // 차트 객체 정리
  clearCharts(scene);

  // scene.lights / scene.ambient / scene.title 로 바꾼 기본 상태 복구
  resetDefaultLights(scene);
  scene._overlay?.clear?.();

  clearRegistry();
}

/**
 * 메시 레지스트리 조회
 */
export function getMesh(id) {
  return meshRegistry.get(id);
}
