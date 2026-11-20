/**
 * 대장간 "놓아 보기" (애드온 안의 선택 기능)
 *
 * 완성한 모듈을 프로젝트에 놓을 때 사용하는 값(위치, 크기, 돌리는 축과 각도, 전체 색)을
 * 슬라이더로 바꾸고, 같은 값을 적은 사용 코드를 만듭니다.
 * 이 값은 화면에서만 사용하며 모듈(레시피)에 저장하지 않습니다. 생성 함수의 코드도 바꾸지 않습니다.
 */

export const DEFAULT_PLACEMENT = Object.freeze({ x: 0, y: 0, z: 0, scale: 1, angle: 0, axis: 'y', tint: '#ffffff' });

export const PLACEMENT_SLIDERS = [
  { key: 'x', label: '위치 x (좌우)', min: -3, max: 3, step: 0.5 },
  { key: 'y', label: '위치 y (위아래)', min: -3, max: 3, step: 0.5 },
  { key: 'z', label: '위치 z (앞뒤)', min: -3, max: 3, step: 0.5 },
  { key: 'scale', label: '크기 scale', min: 0.3, max: 2, step: 0.1 },
  { key: 'angle', label: '돌리는 각도', min: 0, max: 345, step: 15 },
];

export const PLACEMENT_AXES = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** 어떤 값이 들어와도 화면과 코드에 쓸 수 있는 범위로 맞춥니다. */
export function normalizePlacement(value) {
  const source = value && typeof value === 'object' ? value : {};
  const result = {};
  for (const slider of PLACEMENT_SLIDERS) {
    const n = clamp(source[slider.key], slider.min, slider.max, DEFAULT_PLACEMENT[slider.key]);
    result[slider.key] = Number(n.toFixed(2));
  }
  result.axis = Object.hasOwn(PLACEMENT_AXES, source.axis) ? source.axis : DEFAULT_PLACEMENT.axis;
  result.tint = /^#[0-9a-f]{6}$/i.test(source.tint || '') ? source.tint.toLowerCase() : DEFAULT_PLACEMENT.tint;
  return result;
}

/** '#f8a8cc' → [248, 168, 204] */
export function hexToBytes(hex) {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''));
  if (!match) return [255, 255, 255];
  return [match[1], match[2], match[3]].map(part => parseInt(part, 16));
}

/**
 * 색을 0~255 정수의 vector(...)로 적습니다.
 * 세 값이 모두 0 또는 1이면 엔진이 0~1 색으로 읽으므로, 흰색·검정처럼 뜻이 같은 0~1 표기로 적습니다.
 */
export function colorVectorText(hex) {
  const bytes = hexToBytes(hex);
  if (bytes.every(v => v <= 1)) return 'vector(0, 0, 0)';
  return `vector(${bytes.join(', ')})`;
}

/** 놓는 값을 그대로 적은 사용 코드. 기본값인 줄은 적지 않습니다. */
export function placementCode(factory, value, name = 'friend') {
  const p = normalizePlacement(value);
  const lines = [`${name} = ${factory}(`, `    pos=vector(${p.x}, ${p.y}, ${p.z}), scale=${p.scale}`, ')'];
  if (p.angle !== 0) {
    lines.push(`${name}.rotate(angle=radians(${p.angle}), axis=vector(${PLACEMENT_AXES[p.axis].join(', ')}))`);
  }
  if (p.tint !== DEFAULT_PLACEMENT.tint) {
    lines.push(`${name}.color = ${colorVectorText(p.tint)}`);
  }
  return lines.join('\n');
}
