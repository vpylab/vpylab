import { shapeGuides } from './shape-guides.js';
import { annotateDocOrigin } from './doc-origins.js';
// VPyLab API 문서 데이터
// VPython 3D 프로그래밍 교육 플랫폼용 레퍼런스

// ─── 카테고리 정의 ───────────────────────────────────────────
export const docCategories = {
  'shape-guides': { ko: '모양 만들기', en: 'Making shapes', icon: '◇' },
  objects:  { ko: '3D 객체',       en: '3D Objects',       icon: '📦' },
  meshes:   { ko: '저수준 메시',   en: 'Low-level Meshes', icon: '🔷' },
  vectors:  { ko: '벡터와 수학',   en: 'Vectors & Math',   icon: '📐' },
  scene:    { ko: '씬 제어',       en: 'Scene Controls',   icon: '⚙️' },
  events:   { ko: '이벤트 / 입력', en: 'Events & Input',   icon: '🖱️' },
  widgets:  { ko: 'UI 위젯',       en: 'UI Widgets',       icon: '🎚️' },
  graphs:   { ko: '2D 그래프',     en: '2D Graphs',        icon: '📈' },
  colors:   { ko: '색상표',        en: 'Color Reference',  icon: '🎨' },
  materials:{ ko: '재질 / 텍스처', en: 'Materials & Textures', icon: '🧱' },
  sound:    { ko: '사운드 / 음악', en: 'Sound & Music',    icon: '🎵' },
  charts:   { ko: '3D 차트',       en: '3D Charts',        icon: '📊' },
};

// ─── 문서 항목 ──────────────────────────────────────────────
const apiDocs = [
  // ━━━ objects ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'sphere',
    category: 'objects',
    title: { ko: '구 (sphere)', en: 'sphere' },
    description: {
      ko: '3D 구를 생성합니다. 위치, 반지름, 색상 등을 지정할 수 있습니다.',
      en: 'Creates a 3D sphere. You can set position, radius, color, and more.',
    },
    signature: "sphere(pos=vector(0,0,0), radius=1.0, color=color.white)",
    params: [
      { name: 'pos',         type: 'vector',  default: 'vector(0,0,0)', desc: { ko: '위치', en: 'Position' } },
      { name: 'radius',      type: 'number',  default: '1.0',          desc: { ko: '반지름', en: 'Radius' } },
      { name: 'color',       type: 'vector',  default: 'color.white',  desc: { ko: '색상', en: 'Color' } },
      { name: 'opacity',     type: 'number',  default: '1.0',          desc: { ko: '불투명도 (0~1)', en: 'Opacity (0–1)' } },
      { name: 'emissive',    type: 'boolean', default: 'False',        desc: { ko: '색상으로 스스로 빛나게 표시', en: 'Glow using the object color' } },
      { name: 'make_trail',  type: 'boolean', default: 'False',        desc: { ko: '궤적 표시 여부', en: 'Show trail' } },
      { name: 'trail_color',  type: 'vector',  default: 'color.white',  desc: { ko: '궤적 색상', en: 'Trail color' } },
      { name: 'velocity',    type: 'vector',  default: 'vector(0,0,0)', desc: { ko: '속도 벡터 (시뮬레이션용)', en: 'Velocity vector (for simulation)' } },
      { name: 'visible',     type: 'boolean', default: 'True',         desc: { ko: '화면 표시 여부', en: 'Visibility' } },
    ],
    code: `from vpython import *
ball = sphere(pos=vector(1, 0, 0), radius=0.8, color=color.red)
ball.velocity = vector(-1, 0, 0)`,
    tags: ['3d', 'object', 'geometry', 'sphere', 'ball'],
  },
  {
    id: 'box',
    category: 'objects',
    title: { ko: '상자 (box)', en: 'box' },
    description: {
      ko: '3D 직육면체를 생성합니다. size 벡터로 가로, 세로, 깊이를 지정합니다.',
      en: 'Creates a 3D box. Use the size vector to set width, height, and depth.',
    },
    signature: "box(pos=vector(0,0,0), size=vector(1,1,1), color=color.white)",
    params: [
      { name: 'pos',        type: 'vector',  default: 'vector(0,0,0)', desc: { ko: '위치', en: 'Position' } },
      { name: 'size',       type: 'vector',  default: 'vector(1,1,1)', desc: { ko: '크기 (가로, 세로, 깊이)', en: 'Size (width, height, depth)' } },
      { name: 'color',      type: 'vector',  default: 'color.white',   desc: { ko: '색상', en: 'Color' } },
      { name: 'opacity',    type: 'number',  default: '1.0',           desc: { ko: '불투명도 (0~1)', en: 'Opacity (0–1)' } },
      { name: 'emissive',   type: 'boolean', default: 'False',         desc: { ko: '색상으로 스스로 빛나게 표시', en: 'Glow using the object color' } },
      { name: 'make_trail', type: 'boolean', default: 'False',         desc: { ko: '궤적 표시 여부', en: 'Show trail' } },
      { name: 'visible',    type: 'boolean', default: 'True',          desc: { ko: '화면 표시 여부', en: 'Visibility' } },
    ],
    code: `from vpython import *
ground = box(pos=vector(0, -0.5, 0), size=vector(4, 0.1, 4), color=color.green)
cube = box(pos=vector(0, 0.5, 0), size=vector(1, 1, 1), color=color.blue)`,
    tags: ['3d', 'object', 'geometry', 'box', 'cube', 'rectangle'],
  },
  {
    id: 'cylinder',
    category: 'objects',
    title: { ko: '원기둥 (cylinder)', en: 'cylinder' },
    description: {
      ko: '3D 원기둥을 생성합니다. axis 벡터로 방향과 길이를 지정합니다.',
      en: 'Creates a 3D cylinder. The axis vector sets direction and length.',
    },
    signature: "cylinder(pos=vector(0,0,0), axis=vector(1,0,0), radius=1.0, color=color.white)",
    params: [
      { name: 'pos',     type: 'vector',  default: 'vector(0,0,0)', desc: { ko: '밑면 중심 위치', en: 'Base center position' } },
      { name: 'axis',    type: 'vector',  default: 'vector(1,0,0)', desc: { ko: '축 방향과 길이', en: 'Axis direction and length' } },
      { name: 'radius',  type: 'number',  default: '1.0',          desc: { ko: '반지름', en: 'Radius' } },
      { name: 'color',   type: 'vector',  default: 'color.white',  desc: { ko: '색상', en: 'Color' } },
      { name: 'opacity', type: 'number',  default: '1.0',          desc: { ko: '불투명도 (0~1)', en: 'Opacity (0–1)' } },
      { name: 'emissive', type: 'boolean', default: 'False',       desc: { ko: '색상으로 스스로 빛나게 표시', en: 'Glow using the object color' } },
      { name: 'visible', type: 'boolean', default: 'True',         desc: { ko: '화면 표시 여부', en: 'Visibility' } },
    ],
    code: `from vpython import *
pole = cylinder(pos=vector(0, 0, 0), axis=vector(0, 3, 0), radius=0.1, color=color.brown)
disk = cylinder(pos=vector(0, 3, 0), axis=vector(0, 0.05, 0), radius=0.8, color=color.gold)`,
    tags: ['3d', 'object', 'geometry', 'cylinder', 'tube', 'pipe'],
  },
  {
    id: 'arrow',
    category: 'objects',
    title: { ko: '화살표 (arrow)', en: 'arrow' },
    description: {
      ko: '3D 화살표를 생성합니다. 힘, 속도 등 벡터 시각화에 유용합니다.',
      en: 'Creates a 3D arrow. Useful for visualizing vectors like force and velocity.',
    },
    signature: "arrow(pos=vector(0,0,0), axis=vector(1,0,0), shaftwidth=0.1, color=color.white)",
    params: [
      { name: 'pos',        type: 'vector',  default: 'vector(0,0,0)', desc: { ko: '시작 위치', en: 'Start position' } },
      { name: 'axis',       type: 'vector',  default: 'vector(1,0,0)', desc: { ko: '방향과 길이', en: 'Direction and length' } },
      { name: 'shaftwidth', type: 'number',  default: '0.1',          desc: { ko: '몸통 두께', en: 'Shaft width' } },
      { name: 'color',      type: 'vector',  default: 'color.white',  desc: { ko: '색상', en: 'Color' } },
      { name: 'opacity',    type: 'number',  default: '1.0',          desc: { ko: '불투명도 (0~1)', en: 'Opacity (0–1)' } },
      { name: 'emissive',   type: 'boolean', default: 'False',        desc: { ko: '색상으로 스스로 빛나게 표시', en: 'Glow using the object color' } },
      { name: 'visible',    type: 'boolean', default: 'True',         desc: { ko: '화면 표시 여부', en: 'Visibility' } },
    ],
    code: `from vpython import *
ball = sphere(pos=vector(0, 0, 0), radius=0.3, color=color.cyan)
vel = arrow(pos=ball.pos, axis=vector(2, 1, 0), shaftwidth=0.08, color=color.yellow)`,
    tags: ['3d', 'object', 'geometry', 'arrow', 'vector', 'force', 'velocity'],
  },
  {
    id: 'attach_arrow',
    category: 'objects',
    title: { ko: '따라다니는 화살표 (attach_arrow)', en: 'attach_arrow' },
    description: {
      ko: '물체의 벡터 속성(예: velocity)을 화살표로 계속 표시합니다. rate()나 sleep()을 지날 때마다 위치와 방향이 갱신됩니다.',
      en: 'Keeps drawing an arrow for a vector attribute of an object (for example velocity). The arrow updates on every rate() or sleep().',
    },
    signature: "attach_arrow(obj, 'velocity', scale=1, shaftwidth=None, color=None)",
    params: [
      { name: 'obj', type: 'object', default: '-', desc: { ko: '따라갈 물체', en: 'Object to follow' } },
      { name: 'attr', type: 'str', default: '-', desc: { ko: '벡터 속성 이름', en: 'Name of the vector attribute' } },
      { name: 'scale', type: 'number', default: '1', desc: { ko: '화살표 길이 배율', en: 'Length multiplier' } },
      { name: 'shaftwidth', type: 'number', default: '자동', desc: { ko: '화살대 굵기', en: 'Shaft width' } },
      { name: 'color', type: 'vector', default: '물체 색', desc: { ko: '화살표 색', en: 'Arrow color' } },
    ],
    code: `from vpython import *
scene.center = vector(-3, 0, 0)
scene.range = 4
ball = sphere(pos=vector(-4, 0, 0), radius=0.4, color=color.cyan)
ball.velocity = vector(2, 3, 0)
attach_arrow(ball, 'velocity', scale=0.5, color=color.yellow)
g = vector(0, -9.8, 0)
dt = 1 / 60
while ball.pos.y >= -2:
    rate(60)
    ball.velocity = ball.velocity + g * dt
    ball.pos = ball.pos + ball.velocity * dt`,
    tags: ['arrow', 'attach_arrow', 'velocity', 'vector', 'physics', '화살표', '속도'],
  },
  {
    id: 'cone',
    category: 'objects',
    title: { ko: '원뿔 (cone)', en: 'cone' },
    description: {
      ko: '3D 원뿔을 생성합니다. axis 벡터가 꼭짓점 방향을 결정합니다.',
      en: 'Creates a 3D cone. The axis vector determines the direction of the apex.',
    },
    signature: "cone(pos=vector(0,0,0), axis=vector(1,0,0), radius=1.0, color=color.white)",
    params: [
      { name: 'pos',     type: 'vector',  default: 'vector(0,0,0)', desc: { ko: '밑면 중심 위치', en: 'Base center position' } },
      { name: 'axis',    type: 'vector',  default: 'vector(1,0,0)', desc: { ko: '꼭짓점 방향과 높이', en: 'Apex direction and height' } },
      { name: 'radius',  type: 'number',  default: '1.0',          desc: { ko: '밑면 반지름', en: 'Base radius' } },
      { name: 'color',   type: 'vector',  default: 'color.white',  desc: { ko: '색상', en: 'Color' } },
      { name: 'opacity', type: 'number',  default: '1.0',          desc: { ko: '불투명도 (0~1)', en: 'Opacity (0–1)' } },
      { name: 'emissive', type: 'boolean', default: 'False',       desc: { ko: '색상으로 스스로 빛나게 표시', en: 'Glow using the object color' } },
      { name: 'visible', type: 'boolean', default: 'True',         desc: { ko: '화면 표시 여부', en: 'Visibility' } },
    ],
    code: `from vpython import *
tree_trunk = cylinder(pos=vector(0, 0, 0), axis=vector(0, 1, 0), radius=0.15, color=color.brown)
tree_top = cone(pos=vector(0, 1, 0), axis=vector(0, 1.5, 0), radius=0.7, color=color.green)`,
    tags: ['3d', 'object', 'geometry', 'cone', 'pyramid'],
  },
  {
    id: 'ring',
    category: 'objects',
    title: { ko: '링 (ring)', en: 'ring' },
    description: {
      ko: '3D 링(도넛 형태)을 생성합니다. axis는 고리 면에 수직인 방향이며 기본값은 vector(1,0,0)입니다. 정면에서 둥글게 보려면 vector(0,0,1)을 지정하세요.',
      en: 'Creates a torus. axis is normal to the ring plane and defaults to vector(1,0,0). Use vector(0,0,1) for a front-facing ring.',
    },
    signature: "ring(pos=vector(0,0,0), axis=vector(1,0,0), radius=1.0, thickness=0.1, color=color.white)",
    params: [
      { name: 'axis', type: 'vector', default: 'vector(1,0,0)', desc: { ko: '고리 면에 수직인 방향', en: 'Normal to the ring plane' } },
      { name: 'pos',       type: 'vector',  default: 'vector(0,0,0)', desc: { ko: '중심 위치', en: 'Center position' } },
      { name: 'radius',    type: 'number',  default: '1.0',          desc: { ko: '링의 반지름', en: 'Ring radius' } },
      { name: 'thickness', type: 'number',  default: '0.1',          desc: { ko: '링의 두께', en: 'Ring thickness' } },
      { name: 'color',     type: 'vector',  default: 'color.white',  desc: { ko: '색상', en: 'Color' } },
      { name: 'opacity',   type: 'number',  default: '1.0',          desc: { ko: '불투명도 (0~1)', en: 'Opacity (0–1)' } },
      { name: 'emissive',  type: 'boolean', default: 'False',        desc: { ko: '색상으로 스스로 빛나게 표시', en: 'Glow using the object color' } },
      { name: 'visible',   type: 'boolean', default: 'True',         desc: { ko: '화면 표시 여부', en: 'Visibility' } },
    ],
    code: `from vpython import *
planet = sphere(pos=vector(0, 0, 0), radius=0.5, color=color.blue)
orbit = ring(pos=vector(0, 0, 0), axis=vector(0,0,1), radius=2, thickness=0.03, color=color.gray)`,
    tags: ['3d', 'object', 'geometry', 'ring', 'torus', 'orbit'],
  },
  {
    id: 'compound',
    category: 'objects',
    title: { ko: '복합 객체 (compound)', en: 'compound' },
    description: {
      ko: '여러 객체를 하나로 합쳐 함께 움직이게 합니다. pos 기본값은 부품들의 중심이고, 지정하면 중심이 그 자리로 옮겨집니다. rotate()·clone()·length·size를 지원합니다. 부품을 나중에 따로 바꾸려면 group().',
      en: 'Combines objects into one that moves together. pos defaults to the center of the parts; setting it moves the center there. Supports rotate(), clone(), length, size. Use group() to keep parts editable.',
    },
    signature: "compound(objects, pos=중심, axis=vector(1,0,0), color=color.white)",
    params: [
      { name: 'shininess', type: 'number', default: '0.6', desc: { ko: '광택(0~1). 묶은 뒤 변경 가능', en: 'Shininess (0–1); editable after combining' } },
      { name: 'objects',    type: 'list',    default: '[]',            desc: { ko: '합칠 객체 리스트', en: 'List of objects to combine' } },
      { name: 'pos',        type: 'vector',  default: '부품 중심',      desc: { ko: '중심 위치 (지정하면 그 자리로 이동)', en: 'Center position (moves the compound when given)' } },
      { name: 'axis',       type: 'vector',  default: 'vector(1,0,0)', desc: { ko: '방향. 길이는 length가 됨', en: 'Orientation; its length becomes length' } },
      { name: 'color',      type: 'vector',  default: 'color.white',   desc: { ko: '부품 색에 곱하는 색 필터. 흰색이면 원래 색으로 복원', en: 'Multiplies the original part colors; white restores them' } },
      { name: 'opacity',    type: 'number',  default: '1.0',           desc: { ko: '불투명도 (0~1)', en: 'Opacity (0–1)' } },
      { name: 'emissive',   type: 'boolean', default: 'False',         desc: { ko: '색상으로 스스로 빛나게 표시', en: 'Glow using the object color' } },
      { name: 'make_trail', type: 'boolean', default: 'False',         desc: { ko: '궤적 표시 여부', en: 'Show trail' } },
      { name: 'visible',    type: 'boolean', default: 'True',          desc: { ko: '화면 표시 여부', en: 'Visibility' } },
    ],
    code: `from vpython import *
body = box(pos=vector(0, 0, 0), size=vector(2, 0.5, 1), color=color.blue)
head = sphere(pos=vector(1.2, 0.4, 0), radius=0.3, color=color.red)
car = compound([body, head], pos=vector(0, 0, 0))`,
    tags: ['3d', 'object', 'compound', 'group', 'combine', 'robot', 'car'],
  },
  {
    id: 'pyramid',
    category: 'objects',
    title: { ko: '사각뿔 (pyramid)', en: 'pyramid' },
    description: {
      ko: '직사각 밑면을 가진 사각뿔. size=vector(축방향 높이, 폭, 깊이).',
      en: 'A square-base pyramid. size=vector(axial-height, width, depth).',
    },
    signature: "pyramid(pos=vector(0,0,0), size=vector(1,1,1), axis=vector(1,0,0), color=color.white)",
    params: [
      { name: 'pos',  type: 'vector', default: 'vector(0,0,0)', desc: { ko: '경계 상자 중심 위치', en: 'Bounding-box center position' } },
      { name: 'size', type: 'vector', default: 'vector(1,1,1)', desc: { ko: '(축높이, 폭, 깊이)', en: '(axial-height, width, depth)' } },
      { name: 'axis', type: 'vector', default: 'vector(1,0,0)', desc: { ko: '축 방향', en: 'Axis direction' } },
      { name: 'color', type: 'vector', default: 'color.white', desc: { ko: '색상', en: 'Color' } },
    ],
    code: `from vpython import *
pyramid(pos=vector(0,0,0), size=vector(1.5, 1, 1),
        color=color.gold, axis=vector(0, 1, 0))`,
    tags: ['3d', 'pyramid', 'cone', '사각뿔', 'geometry'],
  },
  {
    id: 'ellipsoid',
    category: 'objects',
    title: { ko: '타원체 (ellipsoid)', en: 'ellipsoid' },
    description: {
      ko: '구를 비균등 스케일링한 타원체. size=vector(x폭, y높이, z깊이).',
      en: 'An ellipsoid (non-uniformly scaled sphere). size=vector(x-width, y-height, z-depth).',
    },
    signature: "ellipsoid(pos=vector(0,0,0), size=vector(1,1,1), color=color.white)",
    params: [
      { name: 'pos',  type: 'vector', default: 'vector(0,0,0)', desc: { ko: '중심', en: 'Center' } },
      { name: 'size', type: 'vector', default: 'vector(1,1,1)', desc: { ko: '(x폭, y높이, z깊이)', en: '(x, y, z extents)' } },
      { name: 'color', type: 'vector', default: 'color.white', desc: { ko: '색상', en: 'Color' } },
    ],
    code: `from vpython import *
ellipsoid(pos=vector(0,0,0), size=vector(1.4, 0.8, 0.6),
          color=color.skyblue)`,
    tags: ['3d', 'ellipsoid', '타원체', 'geometry'],
  },
  {
    id: 'helix',
    category: 'objects',
    title: { ko: '나선 (helix)', en: 'helix' },
    description: {
      ko: '나선/스프링. axis 방향으로 length만큼, coils번 감김.',
      en: 'Helix/spring. Wraps coils times along axis for length.',
    },
    signature: "helix(pos=vector(0,0,0), axis=vector(1,0,0), radius=1, length=1, coils=5, thickness=0.05)",
    params: [
      { name: 'pos',       type: 'vector', default: 'vector(0,0,0)', desc: { ko: '시작점', en: 'Start position' } },
      { name: 'axis',      type: 'vector', default: 'vector(1,0,0)', desc: { ko: '나선이 진행하는 방향', en: 'Axis direction' } },
      { name: 'radius',    type: 'number', default: '1.0',           desc: { ko: '나선 반경', en: 'Coil radius' } },
      { name: 'length',    type: 'number', default: 'axis 길이',      desc: { ko: '전체 길이', en: 'Total length' } },
      { name: 'coils',     type: 'number', default: '5',             desc: { ko: '감김 수', en: 'Number of coils' } },
      { name: 'thickness', type: 'number', default: '0.05',          desc: { ko: '선 굵기', en: 'Line thickness' } },
    ],
    code: `from vpython import *
spring = helix(pos=vector(0,0,0), axis=vector(1,0,0),
               radius=0.5, length=4, coils=10,
               thickness=0.05, color=color.silver)`,
    tags: ['3d', 'helix', 'spring', '나선', '스프링'],
  },
  {
    id: 'label',
    category: 'objects',
    title: { ko: '라벨 (label)', en: 'label' },
    description: {
      ko: '3D 위치에 2D 텍스트 표시. 항상 카메라를 향함(스프라이트). 두께 있는 입체 글자는 text().',
      en: 'Text label at a 3D position, always faces the camera. For 3D extruded letters use text().',
    },
    signature: "label(pos=vector(0,0,0), text='', color=color.white, height=16, background=None, border=0)",
    params: [
      { name: 'pos',        type: 'vector', default: 'vector(0,0,0)', desc: { ko: '위치', en: 'Position' } },
      { name: 'text',       type: 'string', default: "''",            desc: { ko: '표시할 문자열', en: 'Text to display' } },
      { name: 'color',      type: 'vector', default: 'color.white',   desc: { ko: '글자 색', en: 'Text color' } },
      { name: 'height',     type: 'number', default: '16',            desc: { ko: '폰트 높이(px)', en: 'Font height (px)' } },
      { name: 'background', type: 'vector', default: 'None',          desc: { ko: '배경색 (선택)', en: 'Background color (optional)' } },
      { name: 'border',     type: 'number', default: '0',             desc: { ko: '테두리 두께', en: 'Border thickness' } },
    ],
    code: `from vpython import *
ball = sphere(pos=vector(0,0,0), radius=0.5, color=color.blue)
label(pos=vector(0, 1.2, 0), text="공", height=20,
      color=color.white, background=color.black, border=2)`,
    tags: ['label', 'text', 'sprite', '라벨', '텍스트'],
  },
  {
    id: 'curve',
    category: 'objects',
    title: { ko: '곡선 (curve)', en: 'curve' },
    description: {
      ko: '점을 누적해 그리는 3D 폴리라인. 점마다 색·반지름을 줄 수 있고 .npoints, .point(i), .modify(i), .rotate()를 지원합니다.',
      en: '3D polyline that grows as you append points. Per-point color/radius, .npoints, .point(i), .modify(i), .rotate().',
    },
    signature: "curve(*points, pos=None, color=color.white, radius=0, retain=-1, origin=vector(0,0,0))",
    params: [
      { name: '*points / pos', type: 'list', default: 'None', desc: { ko: 'vector, (x,y,z), {"pos":v, "color":c, "radius":r} 또는 그 목록', en: 'vector, (x,y,z), {"pos":v, "color":c, "radius":r} or lists of them' } },
      { name: 'color',  type: 'vector', default: 'color.white', desc: { ko: '기본 선 색 (점마다 다르게 줄 수 있음)', en: 'Default color (per-point colors allowed)' } },
      { name: 'radius', type: 'number', default: '0',           desc: { ko: '굵기 (현재 선은 1픽셀로 그림)', en: 'Thickness (lines are drawn 1px for now)' } },
      { name: 'retain', type: 'number', default: '-1',          desc: { ko: '남길 최대 점 수 (-1=제한 없음)', en: 'Max points to keep (-1=unlimited)' } },
      { name: 'origin', type: 'vector', default: 'vector(0,0,0)', desc: { ko: '전체 이동 기준점 (.pos와 같음)', en: 'Translation origin (same as .pos)' } },
    ],
    code: `from vpython import *
c = curve(color=color.red)
for i in range(100):
    c.append(vector(i*0.1, sin(i*0.2), 0))
c.append(pos=vector(10, 0, 0), color=color.cyan, radius=0.1)   # 점마다 색·반지름
c.modify(0, pos=vector(0, 1, 0))                                # i번째 점 수정
print(c.npoints, c.point(0)['color'])
c.rotate(angle=0.1, axis=vector(0, 1, 0))                       # 전체 회전
d = curve([{'pos': vector(0, 0, 0), 'color': color.red}, {'pos': vector(1, 1, 0)}])
c.clear()  # 모두 지우기`,
    tags: ['curve', 'polyline', '곡선', 'append', 'modify', 'npoints'],
  },
  {
    id: 'points',
    category: 'objects',
    title: { ko: '점 집합 (points)', en: 'points' },
    description: {
      ko: '여러 3D 점들을 픽셀 크기로 표시. .append(pos)로 점 추가.',
      en: 'A collection of 3D points rendered as pixel-sized dots. .append(pos).',
    },
    signature: "points(color=color.white, size=5, pos=None, visible=True)",
    params: [
      { name: 'color', type: 'vector', default: 'color.white', desc: { ko: '점 색', en: 'Point color' } },
      { name: 'size',  type: 'number', default: '5',           desc: { ko: '픽셀 크기', en: 'Pixel size' } },
      { name: 'pos',   type: 'list',   default: 'None',        desc: { ko: '초기 점들', en: 'Initial points' } },
    ],
    code: `from vpython import *
p = points(color=color.yellow, size=8)
for x in range(-5, 6):
    p.append(vector(x, 0, 0))`,
    tags: ['points', 'dots', '점', 'particles'],
  },
  {
    id: 'frame',
    category: 'objects',
    title: { ko: 'frame (= compound)', en: 'frame (alias for compound)' },
    description: {
      ko: 'VPyLab의 편의 별칭입니다. 이 앱에서는 compound와 같으며 구형 VPython frame 전체를 재현하지는 않습니다.',
      en: 'A VPyLab convenience alias for compound; it does not reproduce the historical frame API.',
    },
    signature: "frame(objects, pos=vector(0,0,0), color=color.white)",
    params: [
      { name: 'objects', type: 'list',   default: '—',            desc: { ko: '묶을 객체 리스트', en: 'List of objects' } },
    ],
    code: `from vpython import *
g = frame([sphere(pos=vector(-1,0,0), radius=0.3),
           sphere(pos=vector(1,0,0), radius=0.3)],
          pos=vector(0, 1, 0))`,
    tags: ['frame', 'compound', 'alias', 'group'],
  },

  // ━━━ 객체 공통 메서드 — clone/rotate/attach_trail/clear_trail ━━━━━
  {
    id: 'object-clone',
    category: 'objects',
    title: { ko: '객체 복제 (.clone())', en: '.clone()' },
    description: {
      ko: '동일 속성의 새 객체 생성. **kwargs로 일부 속성만 덮어씁니다.',
      en: 'Creates a duplicate object. Override individual props with **kwargs.',
    },
    signature: "obj.clone(**kwargs) → new_obj",
    params: [
      { name: '**kwargs', type: 'props', default: '—', desc: { ko: '덮어쓸 속성 (pos, color, ...)', en: 'Props to override' } },
    ],
    code: `from vpython import *
ball = sphere(pos=vector(0,0,0), radius=0.5, color=color.red)
ball2 = ball.clone(pos=vector(2,0,0))            # 같은 모양, 다른 위치
ball3 = ball.clone(pos=vector(-2,0,0), color=color.blue)`,
    tags: ['clone', 'copy', 'duplicate', '복제'],
  },
  {
    id: 'object-rotate',
    category: 'objects',
    title: { ko: '객체 회전 (.rotate())', en: '.rotate()' },
    description: {
      ko: 'origin 중심으로 axis 축으로 angle(라디안) 회전. axis를 생략하면 객체 자신의 axis(없으면 y축)를 중심으로 돕니다. compound·group·text·extrusion·curve도 같습니다.',
      en: 'Rotates the object around origin by angle (radians) on axis. Without axis it spins about its own axis (y-axis if none). Works for compound, group, text, extrusion and curve too.',
    },
    signature: "obj.rotate(angle, axis=obj.axis, origin=obj.pos)",
    params: [
      { name: 'angle',  type: 'number', default: '—',            desc: { ko: '회전 각 (라디안)', en: 'Rotation angle (radians)' } },
      { name: 'axis',   type: 'vector', default: 'obj.axis',      desc: { ko: '회전축 (없으면 자기 axis, sphere 등은 y축)', en: 'Rotation axis (own axis by default, y-axis for sphere etc.)' } },
      { name: 'origin', type: 'vector', default: 'self.pos',      desc: { ko: '회전 중심', en: 'Rotation center' } },
    ],
    code: `from vpython import *
import math
arrow1 = arrow(pos=vector(2,0,0), axis=vector(1,0,0), color=color.red)
arrow1.rotate(math.pi/4, axis=vector(0,0,1), origin=vector(0,0,0))`,
    tags: ['rotate', '회전', 'transform'],
  },
  {
    id: 'object-attach-trail',
    category: 'objects',
    title: { ko: '궤적 부착 (.attach_trail())', en: '.attach_trail()' },
    description: {
      ko: '객체에 동적으로 궤적 추가. 이미 있으면 색/길이만 갱신.',
      en: 'Attach a trail to the object on the fly. Updates color/length if already attached.',
    },
    signature: "obj.attach_trail(color=None, retain=10000)",
    params: [
      { name: 'color',  type: 'vector', default: 'None',  desc: { ko: '궤적 색 (None=객체색)', en: 'Trail color (None=object color)' } },
      { name: 'retain', type: 'number', default: '10000', desc: { ko: '최대 점 개수', en: 'Max points to keep' } },
    ],
    code: `from vpython import *
ball = sphere(pos=vector(0,0,0), radius=0.3, color=color.red)
ball.attach_trail(color=color.cyan, retain=500)
# 이후 ball.pos를 갱신할 때마다 궤적 누적`,
    tags: ['trail', 'attach', '궤적'],
  },
  {
    id: 'object-clear-trail',
    category: 'objects',
    title: { ko: '궤적 지우기 (.clear_trail())', en: '.clear_trail()' },
    description: {
      ko: '누적된 궤적을 모두 즉시 지웁니다.',
      en: 'Immediately clears all accumulated trail points.',
    },
    signature: "obj.clear_trail()",
    params: [],
    code: `from vpython import *
ball = sphere(make_trail=True, trail_color=color.cyan)
# ... 잠시 움직인 후
ball.clear_trail()    # 궤적 초기화`,
    tags: ['trail', 'clear', '궤적', '지우기'],
  },

  {
    id: 'group',
    category: 'objects',
    title: { ko: '묶음 (group)', en: 'group' },
    description: {
      ko: 'box(group=g)처럼 객체를 묶습니다. compound와 달리 하위 객체를 나중에 따로 바꿀 수 있고, g.pos·g.rotate()·g.visible로 한꺼번에 움직입니다(g.visible은 하위 객체 각각의 값을 덮어쓰지 않습니다). 하위 객체의 pos는 g.pos 기준 상대 위치입니다.',
      en: 'Groups objects created with group=g. Unlike compound, children stay editable; move all with g.pos, g.rotate(), g.visible. Child pos is relative to g.pos.',
    },
    signature: "g = group(pos=vector(0,0,0), axis=vector(1,0,0), up=vector(0,1,0), visible=True)\nbox(group=g, ...)  g.objects  g.rotate(angle=, axis=, origin=)",
    params: [
      { name: 'pos',     type: 'vector',  default: 'vector(0,0,0)', desc: { ko: '묶음의 기준 위치', en: 'Group origin' } },
      { name: 'axis',    type: 'vector',  default: 'vector(1,0,0)', desc: { ko: '묶음의 방향', en: 'Group orientation' } },
      { name: 'visible', type: 'boolean', default: 'True',          desc: { ko: '묶음 전체 표시 여부', en: 'Visibility of the whole group' } },
    ],
    code: `from vpython import *
scene.range = 8
g = group()
body = box(group=g, pos=vector(0, 0, 0), size=vector(4, 1, 2), color=color.red)
head = sphere(group=g, pos=vector(2.5, 0.5, 0), radius=0.5, color=color.yellow)
g.pos = vector(-5, 0, 0)
while True:
    rate(60)
    g.pos.x += 0.05
    if g.pos.x > 5:
        g.pos.x = -5
    g.rotate(angle=0.01, axis=vector(0, 1, 0))
    head.color = color.hsv_to_rgb(vector((g.pos.x % 10) / 10, 1, 1))   # 하위 객체는 따로 바꿀 수 있다`,
    tags: ['group', '묶음', 'compound', 'car', 'robot'],
  },
  {
    id: 'text',
    category: 'objects',
    title: { ko: '입체 글자 (text)', en: 'text' },
    description: {
      ko: '두께가 있는 3D 글자. pos는 기준선 위치(align에 따라 왼쪽·가운데·오른쪽), axis 방향으로 글이 흐릅니다. 번들 글꼴은 라틴 문자만 담고 있어 한글은 2D 라벨로 대체됩니다.',
      en: 'Extruded 3D letters. pos is the baseline (left/center/right by align); text flows along axis. The bundled font covers Latin letters; other scripts fall back to a 2D label.',
    },
    signature: "text(text='', pos=vector(0,0,0), height=1, depth=0.2*height, align='left', billboard=False, axis=vector(1,0,0), up=vector(0,1,0), color=color.white)",
    params: [
      { name: 'text',      type: 'string',  default: "''",      desc: { ko: '표시할 문자열 (줄바꿈 가능)', en: 'Text (newlines allowed)' } },
      { name: 'height',    type: 'number',  default: '1',       desc: { ko: '글자 높이 (월드 단위)', en: 'Letter height (world units)' } },
      { name: 'depth',     type: 'number',  default: '0.2*height', desc: { ko: '두께', en: 'Depth' } },
      { name: 'align',     type: 'string',  default: "'left'",  desc: { ko: "'left' | 'center' | 'right'", en: "'left' | 'center' | 'right'" } },
      { name: 'billboard', type: 'boolean', default: 'False',   desc: { ko: '항상 카메라를 향함', en: 'Always face the camera' } },
      { name: 'length',    type: 'number',  default: '자동',    desc: { ko: '가로 길이 읽기/쓰기 (.start, .end도 있음)', en: 'Read/set width (.start, .end available)' } },
    ],
    code: `from vpython import *
t = text(text='VPyLab', pos=vector(0, 0, 0), height=1, depth=0.3, align='center', color=color.gold)
box(pos=t.start, size=0.1*vector(1,1,1), color=color.red)
tag = text(text='box', pos=vector(0, 2, 0), height=0.5, align='center', billboard=True, color=color.cyan, emissive=True)
while True:
    rate(60)
    t.rotate(angle=0.01, axis=vector(0, 1, 0))`,
    tags: ['text', '3d', '글자', 'extruded', 'font', 'billboard'],
  },
  {
    id: 'attach-trail-function',
    category: 'objects',
    title: { ko: '궤적 함수형 (attach_trail)', en: 'attach_trail()' },
    description: {
      ko: 'attach_trail(obj 또는 함수, ...)가 stop()/start()/clear()가 있는 손잡이를 돌려줍니다. 함수를 주면 rate()마다 그 값이 궤적 점이 됩니다. type="points"면 점 궤적, pps로 초당 점 수를 제한합니다.',
      en: 'attach_trail(obj or function, ...) returns a handle with stop()/start()/clear(). With a function, each rate() adds its value. type="points" draws dots; pps limits points per second.',
    },
    signature: "attach_trail(obj | fn, color=None, radius=0, retain=-1, type='curve', pps=0, interval=1) → handle",
    params: [
      { name: 'obj | fn', type: 'object | function', default: '—', desc: { ko: '궤적을 남길 객체, 또는 vector를 돌려주는 함수', en: 'Object to trail, or a function returning a vector' } },
      { name: 'type',     type: 'string', default: "'curve'", desc: { ko: "'curve' 선 | 'points' 점", en: "'curve' line | 'points' dots" } },
      { name: 'retain',   type: 'number', default: '-1',      desc: { ko: '남길 최대 점 수', en: 'Max points to keep' } },
      { name: 'pps',      type: 'number', default: '0',       desc: { ko: '초당 최대 점 수 (0=제한 없음)', en: 'Max points per second (0=unlimited)' } },
      { name: 'interval', type: 'number', default: '1',       desc: { ko: 'n번 움직일 때마다 한 점 (객체 궤적)', en: 'One point every n moves (object trails)' } },
    ],
    code: `from vpython import *
scene.range = 4
ball = sphere(radius=0.2, color=color.red)
h = attach_trail(ball, color=color.green, retain=200)
shadow = attach_trail(lambda: vector(ball.pos.x, -1, ball.pos.z), type='points', color=color.gray(0.5))
t = 0
while t < 20:
    rate(60)
    ball.pos = vector(3*cos(t), sin(3*t), 3*sin(t))
    t += 0.02
h.stop()`,
    tags: ['trail', 'attach_trail', '궤적', 'points', 'pps'],
  },

  // ━━━ meshes — vertex / triangle / quad / extrusion ━━━━━━━━━━━━━━
  {
    id: 'vertex',
    category: 'meshes',
    title: { ko: '정점 (vertex)', en: 'vertex' },
    description: {
      ko: 'triangle/quad의 정점. 위치 + 색을 가짐.',
      en: 'A vertex for triangle/quad. Holds position + color.',
    },
    signature: "vertex(pos=vector(0,0,0), color=color.white, normal=None, opacity=1.0)",
    params: [
      { name: 'pos',     type: 'vector', default: 'vector(0,0,0)', desc: { ko: '위치', en: 'Position' } },
      { name: 'color',   type: 'vector', default: 'color.white',   desc: { ko: '정점 색', en: 'Vertex color' } },
      { name: 'normal',  type: 'vector', default: 'None',          desc: { ko: '법선 (선택)', en: 'Normal (optional)' } },
      { name: 'opacity', type: 'number', default: '1.0',           desc: { ko: '불투명도', en: 'Opacity' } },
    ],
    code: `from vpython import *
v0 = vertex(pos=vector(0,0,0), color=color.red)
v1 = vertex(pos=vector(1,0,0), color=color.green)
v2 = vertex(pos=vector(0,1,0), color=color.blue)
triangle(v0=v0, v1=v1, v2=v2)`,
    tags: ['vertex', 'mesh', '정점'],
  },
  {
    id: 'triangle',
    category: 'meshes',
    title: { ko: '삼각형 (triangle)', en: 'triangle' },
    description: {
      ko: '3정점 면. v0/v1/v2 또는 vs=[v0,v1,v2] 형식.',
      en: '3-vertex face. Use v0/v1/v2 or vs=[v0,v1,v2].',
    },
    signature: "triangle(v0=, v1=, v2=)  또는  triangle(vs=[v0,v1,v2])",
    params: [
      { name: 'v0/v1/v2', type: 'vertex', default: '—', desc: { ko: '3개의 정점', en: 'Three vertices' } },
    ],
    code: `from vpython import *
v0 = vertex(pos=vector(-1,0,0), color=color.red)
v1 = vertex(pos=vector(1,0,0),  color=color.green)
v2 = vertex(pos=vector(0,1,0),  color=color.blue)
triangle(v0=v0, v1=v1, v2=v2)    # 정점 색이 면 위에서 보간`,
    tags: ['triangle', 'mesh', '삼각형'],
  },
  {
    id: 'quad',
    category: 'meshes',
    title: { ko: '사각형 (quad)', en: 'quad' },
    description: {
      ko: '4정점 면 (내부적으로 2개 삼각형).',
      en: '4-vertex face (rendered as 2 triangles).',
    },
    signature: "quad(v0=, v1=, v2=, v3=)  또는  quad(vs=[v0,v1,v2,v3])",
    params: [
      { name: 'v0~v3', type: 'vertex', default: '—', desc: { ko: '4개의 정점 (시계방향)', en: 'Four vertices (clockwise)' } },
    ],
    code: `from vpython import *
verts = [
    vertex(pos=vector(-1,-1,0), color=color.red),
    vertex(pos=vector( 1,-1,0), color=color.green),
    vertex(pos=vector( 1, 1,0), color=color.blue),
    vertex(pos=vector(-1, 1,0), color=color.yellow),
]
quad(vs=verts)`,
    tags: ['quad', 'mesh', '사각형'],
  },
  {
    id: 'extrusion',
    category: 'meshes',
    title: { ko: '압출 (extrusion)', en: 'extrusion' },
    description: {
      ko: '2D 단면(shape)을 3D 경로(path)를 따라 압출. 휘어진 튜브, 별 모양 길 등.',
      en: 'Sweep a 2D shape along a 3D path. Curved tubes, star-shaped paths, etc.',
    },
    signature: "extrusion(path=paths.circle(radius=2), shape=shapes.rectangle(width=0.4, height=0.2), pos=None, axis=vector(1,0,0), color=color.white)",
    params: [
      { name: 'path',  type: 'list', default: '—',            desc: { ko: '3D 점 리스트 (vector) 또는 paths.* 결과. 첫 점 == 끝 점이면 닫힌 고리', en: 'List of 3D vectors or a paths.* result. Closed ring when first == last' } },
      { name: 'shape', type: 'list', default: 'square',       desc: { ko: '2D 외곽선, [바깥, 구멍], 또는 고체 여러 개의 목록 (shapes.* 결과)', en: '2D outline, [outer, holes...], or a list of solids (shapes.* result)' } },
      { name: 'pos',   type: 'vector', default: '경로 중심', desc: { ko: '지정하면 입체 전체가 그 위치로 옮겨짐', en: 'Moves the whole solid when given' } },
      { name: 'color', type: 'vector | list', default: 'color.white', desc: { ko: '색 하나 또는 경로 점마다의 색', en: 'One color or one per path point' } },
      { name: 'scale', type: 'number | list', default: '1', desc: { ko: '단면 배율 (경로 점마다 다르게 가능)', en: 'Cross-section scale (per path point allowed)' } },
      { name: 'start_face_color / end_face_color', type: 'vector', default: 'None', desc: { ko: '열린 경로 양 끝면의 색', en: 'Colors of the end caps' } },
    ],
    code: `from vpython import *
ring = extrusion(path=paths.circle(radius=2), shape=shapes.rectangle(width=0.4, height=0.2), color=color.orange)
tube = extrusion(path=[vector(0,0,0), vector(2,0,0)], shape=shapes.circle(radius=0.6, thickness=0.2),
                 pos=vector(0, 2, 0), color=color.yellow, end_face_color=color.blue)
tube.rotate(angle=pi/4, axis=vector(0, 1, 0))
tube2 = tube.clone(pos=vector(0, 4, 0))`,
    tags: ['extrusion', 'extrude', 'sweep', '압출', 'shapes', 'paths'],
  },
  {
    id: 'shapes-paths',
    category: 'meshes',
    title: { ko: '단면·경로 생성기 (shapes / paths)', en: 'shapes / paths' },
    description: {
      ko: 'extrusion용 2D 단면(shapes.*)과 3D 경로(paths.*) 생성기. VPython 7(vpython-jupyter)의 shapespaths.py를 그대로 가져와 인자 이름·기본값·결과가 같습니다. thickness를 주면 [바깥, 구멍]을 돌려줍니다.',
      en: '2D cross-sections (shapes.*) and 3D paths (paths.*) for extrusion, taken verbatim from VPython 7 (vpython-jupyter shapespaths.py), so names, defaults and results match. thickness returns [outer, hole].',
    },
    signature: "shapes.rectangle(width=1, height=None, thickness=0, roundness=0)  shapes.circle(radius=0.5, np=64, thickness=0)\npaths.circle(pos=vector(0,0,0), radius=3, np=32, up=vector(0,1,0))  paths.arc(radius=3, angle2=pi)",
    params: [
      { name: 'shapes.*', type: '', default: '', desc: { ko: 'rectangle, circle, arc, ellipse, line, triangle, pentagon, hexagon, octagon, ngon, star, cross, trapezoid, points, gear, rackgear', en: 'rectangle, circle, arc, ellipse, line, triangle, pentagon, hexagon, octagon, ngon, star, cross, trapezoid, points, gear, rackgear' } },
      { name: 'paths.*', type: '', default: '', desc: { ko: 'circle, arc(열린 경로), rectangle, ellipse, line, triangle, pentagon, hexagon, ngon, star, cross, trapezoid, pointlist', en: 'circle, arc (open), rectangle, ellipse, line, triangle, pentagon, hexagon, ngon, star, cross, trapezoid, pointlist' } },
      { name: '공통 인자', type: '', default: '', desc: { ko: 'pos, rotate(라디안), scale, xscale, yscale, roundness(0~0.5), invert, thickness', en: 'pos, rotate (radians), scale, xscale, yscale, roundness (0–0.5), invert, thickness' } },
    ],
    code: `from vpython import *
hex_ring = extrusion(path=paths.rectangle(width=5, height=2), shape=shapes.hexagon(length=0.3), color=color.red)
cross_tube = extrusion(path=paths.cross(width=4, thickness=1), shape=shapes.circle(radius=0.2), color=color.green)
gear = extrusion(path=[vector(0,0,0), vector(0,0,0.3)], shape=shapes.gear(n=12, radius=1), color=color.gray(0.7))
star_frame = shapes.star(n=5, radius=1, thickness=0.1)   # [바깥, 구멍]`,
    tags: ['shapes', 'paths', '단면', '경로', 'gear', 'star', 'circle'],
  },
  {
    id: 'vector',
    category: 'vectors',
    title: { ko: '벡터 (vector)', en: 'vector' },
    description: {
      ko: '3D 벡터를 생성합니다. 위치, 속도, 힘 등을 표현하는 기본 수학 도구입니다. vec()로 짧게 쓸 수도 있습니다.',
      en: 'Creates a 3D vector. The fundamental math tool for position, velocity, force, etc. vec() is a shorthand alias.',
    },
    signature: "vector(x, y, z)  # 또는 vec(x, y, z)",
    params: [
      { name: 'x', type: 'number', default: '0', desc: { ko: 'x 성분', en: 'x component' } },
      { name: 'y', type: 'number', default: '0', desc: { ko: 'y 성분', en: 'y component' } },
      { name: 'z', type: 'number', default: '0', desc: { ko: 'z 성분', en: 'z component' } },
    ],
    code: `from vpython import *
v = vector(3, 4, 0)
print(v.x, v.y, v.z)  # 3 4 0
print(v.mag)           # 5.0
print(v.hat)           # <0.6, 0.8, 0>

# vec()는 vector()의 단축 별칭
w = vec(1, 2, 3)
print(w)               # <1, 2, 3>`,
    tags: ['math', 'vector', 'vec', 'position', 'direction', 'mag', 'hat'],
  },
  {
    id: 'mag',
    category: 'vectors',
    title: { ko: '크기 (mag)', en: 'mag' },
    description: {
      ko: '벡터의 크기(길이)를 반환합니다. 거리 계산에 사용합니다.',
      en: 'Returns the magnitude (length) of a vector. Used for distance calculations.',
    },
    signature: "mag(v)",
    params: [
      { name: 'v', type: 'vector', default: '-', desc: { ko: '벡터', en: 'Vector' } },
    ],
    code: `from vpython import *
v = vector(3, 4, 0)
print(mag(v))     # 5.0
print(v.mag)      # 5.0 (속성으로도 가능)
print(v.mag2)     # 25.0 (크기의 제곱)`,
    tags: ['math', 'vector', 'magnitude', 'length', 'distance'],
  },
  {
    id: 'hat',
    category: 'vectors',
    title: { ko: '단위벡터 (hat)', en: 'hat' },
    description: {
      ko: '벡터의 단위벡터(크기가 1인 방향 벡터)를 반환합니다.',
      en: 'Returns the unit vector (direction with magnitude 1) of a vector.',
    },
    signature: "hat(v)",
    params: [
      { name: 'v', type: 'vector', default: '-', desc: { ko: '벡터', en: 'Vector' } },
    ],
    code: `from vpython import *
v = vector(3, 4, 0)
u = hat(v)
print(u)        # <0.6, 0.8, 0>
print(mag(u))   # 1.0`,
    tags: ['math', 'vector', 'unit', 'direction', 'normalize'],
  },
  {
    id: 'dot',
    category: 'vectors',
    title: { ko: '내적 (dot)', en: 'dot' },
    description: {
      ko: '두 벡터의 내적(스칼라곱)을 반환합니다. 두 벡터가 같은 방향인지 판단하는 데 유용합니다.',
      en: 'Returns the dot product of two vectors. Useful for checking alignment.',
    },
    signature: "dot(a, b)",
    params: [
      { name: 'a', type: 'vector', default: '-', desc: { ko: '첫 번째 벡터', en: 'First vector' } },
      { name: 'b', type: 'vector', default: '-', desc: { ko: '두 번째 벡터', en: 'Second vector' } },
    ],
    code: `from vpython import *
a = vector(1, 0, 0)
b = vector(0, 1, 0)
print(dot(a, b))    # 0 (직각)
print(a.dot(b))     # 0 (메서드 방식)`,
    tags: ['math', 'vector', 'dot', 'product', 'scalar', 'angle'],
  },
  {
    id: 'cross',
    category: 'vectors',
    title: { ko: '외적 (cross)', en: 'cross' },
    description: {
      ko: '두 벡터의 외적(벡터곱)을 반환합니다. 수직 방향 벡터를 구할 때 사용합니다.',
      en: 'Returns the cross product of two vectors. Used to find perpendicular directions.',
    },
    signature: "cross(a, b)",
    params: [
      { name: 'a', type: 'vector', default: '-', desc: { ko: '첫 번째 벡터', en: 'First vector' } },
      { name: 'b', type: 'vector', default: '-', desc: { ko: '두 번째 벡터', en: 'Second vector' } },
    ],
    code: `from vpython import *
a = vector(1, 0, 0)
b = vector(0, 1, 0)
c = cross(a, b)
print(c)            # <0, 0, 1>
print(a.cross(b))   # <0, 0, 1>`,
    tags: ['math', 'vector', 'cross', 'product', 'perpendicular', 'normal'],
  },
  {
    id: 'norm',
    category: 'vectors',
    title: { ko: '정규화 (norm)', en: 'norm' },
    description: {
      ko: 'hat과 같습니다. 벡터를 단위벡터로 변환합니다.',
      en: 'Same as hat. Normalizes a vector to unit length.',
    },
    signature: "norm(v)",
    params: [
      { name: 'v', type: 'vector', default: '-', desc: { ko: '벡터', en: 'Vector' } },
    ],
    code: `from vpython import *
v = vector(0, 5, 0)
print(norm(v))   # <0, 1, 0>
print(hat(v))    # <0, 1, 0> (동일)`,
    tags: ['math', 'vector', 'normalize', 'unit', 'direction'],
  },
  {
    id: 'vector-clone',
    category: 'vectors',
    title: { ko: '벡터 복제 (.clone())', en: 'vector .clone()' },
    description: {
      ko: '벡터를 복제. 원본을 보존하면서 변형하고 싶을 때.',
      en: 'Copy a vector. Useful when you want to mutate without affecting the original.',
    },
    signature: "v.clone() → vector",
    params: [],
    code: `from vpython import *
a = vector(1, 2, 3)
b = a.clone()
b.x = 99
print(a)   # <1, 2, 3>  원본 유지`,
    tags: ['clone', 'copy', 'vector', '복제'],
  },
  {
    id: 'vector-proj',
    category: 'vectors',
    title: { ko: '투영 (.proj() / .comp())', en: '.proj() / .comp()' },
    description: {
      ko: '.proj(b)는 self를 b 방향으로 투영한 벡터, .comp(b)는 그 스칼라 성분.',
      en: '.proj(b) returns vector projection of self onto b. .comp(b) returns the scalar.',
    },
    signature: "v.proj(b) → vector\nv.comp(b) → number",
    params: [
      { name: 'b', type: 'vector', default: '—', desc: { ko: '투영 기준 벡터', en: 'Direction vector' } },
    ],
    code: `from vpython import *
a = vector(3, 4, 0)
b = vector(1, 0, 0)
print(a.proj(b))   # <3, 0, 0>  벡터 투영
print(a.comp(b))   # 3.0       스칼라 성분`,
    tags: ['projection', 'proj', 'comp', '투영', 'vector'],
  },
  {
    id: 'vector-diff-angle',
    category: 'vectors',
    title: { ko: '벡터 사이 각 (.diff_angle())', en: '.diff_angle()' },
    description: {
      ko: '두 벡터 사이의 각을 라디안으로 반환.',
      en: 'Angle between two vectors in radians.',
    },
    signature: "v.diff_angle(b) → number (radians)",
    params: [
      { name: 'b', type: 'vector', default: '—', desc: { ko: '비교 벡터', en: 'Other vector' } },
    ],
    code: `from vpython import *
import math
a = vector(1, 0, 0)
b = vector(0, 1, 0)
print(a.diff_angle(b))           # 1.5708 (≈ π/2)
print(math.degrees(a.diff_angle(b)))  # 90.0`,
    tags: ['angle', 'diff_angle', '각', 'vector'],
  },
  {
    id: 'vector-rotate',
    category: 'vectors',
    title: { ko: '벡터 회전 (.rotate())', en: 'vector .rotate()' },
    description: {
      ko: '주어진 축으로 angle(라디안) 회전한 새 벡터 (Rodrigues 공식).',
      en: 'Returns a new vector rotated by angle (radians) about axis.',
    },
    signature: "v.rotate(angle, axis=vector(0,0,1)) → vector",
    params: [
      { name: 'angle', type: 'number', default: '—',             desc: { ko: '회전 각 (라디안)', en: 'Rotation angle (radians)' } },
      { name: 'axis',  type: 'vector', default: 'vector(0,0,1)', desc: { ko: '회전축', en: 'Rotation axis' } },
    ],
    code: `from vpython import *
import math
v = vector(1, 0, 0)
v90 = v.rotate(math.pi/2, axis=vector(0,0,1))
print(v90)   # <0, 1, 0> (z축 90도 회전)`,
    tags: ['rotate', 'rotation', '회전', 'vector', 'rodrigues'],
  },

  // ━━━ scene ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'rate',
    category: 'scene',
    title: { ko: '프레임 속도 (rate)', en: 'rate' },
    description: {
      ko: '초당 프레임 수를 제어합니다. VPyLab 편집기에서는 rate()만 써도 자동으로 await rate()로 변환됩니다.',
      en: 'Controls frame rate. In the VPyLab editor, rate() is automatically converted to await rate().',
    },
    signature: "rate(fps)",
    params: [
      { name: 'fps', type: 'number', default: '60', desc: { ko: '초당 프레임 수', en: 'Frames per second' } },
    ],
    code: `from vpython import *
scene.range = 6
ball = sphere(color=color.red)
ball.velocity = vector(1, 0, 0)
for i in range(100):
    rate(30)
    ball.pos += ball.velocity * 0.05`,
    tags: ['scene', 'animation', 'loop', 'frame', 'fps', 'rate'],
  },
  {
    id: 'sleep',
    category: 'scene',
    title: { ko: '대기 (sleep)', en: 'sleep' },
    description: {
      ko: '지정한 시간(초) 동안 실행을 멈춥니다. VPyLab 편집기에서는 sleep()만 써도 자동으로 await sleep()로 변환됩니다.',
      en: 'Pauses execution for the given seconds. In the VPyLab editor, sleep() is automatically converted to await sleep().',
    },
    signature: "sleep(seconds)",
    params: [
      { name: 'seconds', type: 'number', default: '-', desc: { ko: '대기 시간 (초)', en: 'Wait time (seconds)' } },
    ],
    code: `from vpython import *
sphere(color=color.red)
sleep(2)
sphere(pos=vector(2, 0, 0), color=color.blue)`,
    tags: ['scene', 'pause', 'wait', 'delay', 'sleep', 'time'],
  },
  {
    id: 'scene_background',
    category: 'scene',
    title: { ko: '배경색 (scene_background)', en: 'scene_background' },
    description: {
      ko: '3D 씬의 배경색을 설정합니다.',
      en: 'Sets the background color of the 3D scene.',
    },
    signature: "scene_background(color)",
    params: [
      { name: 'color', type: 'vector', default: '-', desc: { ko: '배경색', en: 'Background color' } },
    ],
    code: `from vpython import *
scene_background(color.skyblue)
sphere(pos=vector(0, 1, 0), color=color.yellow, radius=0.5)
box(pos=vector(0, -0.5, 0), size=vector(5, 0.1, 5), color=color.green)`,
    tags: ['scene', 'background', 'sky', 'color'],
  },
  {
    id: 'local_light',
    category: 'scene',
    title: { ko: '점 조명 (local_light)', en: 'local_light' },
    description: {
      ko: '특정 위치에서 사방으로 빛을 내는 점 조명을 생성합니다.',
      en: 'Creates a point light that emits light in all directions from a position.',
    },
    signature: "local_light(pos=vector(0,0,0), color=color.white, intensity=1.0)",
    params: [
      { name: 'pos',       type: 'vector', default: 'vector(0,0,0)', desc: { ko: '조명 위치', en: 'Light position' } },
      { name: 'color',     type: 'vector', default: 'color.white',   desc: { ko: '조명 색상', en: 'Light color' } },
      { name: 'intensity', type: 'number', default: '1.0',           desc: { ko: '밝기 (0~...)', en: 'Intensity (0–...)' } },
    ],
    code: `from vpython import *
scene_background(color.black)
local_light(pos=vector(2, 3, 0), color=color.yellow, intensity=1.5)
sphere(radius=0.5, color=color.white)`,
    tags: ['scene', 'light', 'point', 'local', 'lighting'],
  },
  {
    id: 'distant_light',
    category: 'scene',
    title: { ko: '방향 조명 (distant_light)', en: 'distant_light' },
    description: {
      ko: '무한히 먼 곳에서 한 방향으로 비추는 조명입니다. 햇빛과 비슷합니다.',
      en: 'A directional light from infinitely far away. Similar to sunlight.',
    },
    signature: "distant_light(direction=vector(0,-1,0), color=color.white, intensity=1.0)",
    params: [
      { name: 'direction', type: 'vector', default: 'vector(0,-1,0)', desc: { ko: '빛의 방향', en: 'Light direction' } },
      { name: 'color',     type: 'vector', default: 'color.white',    desc: { ko: '조명 색상', en: 'Light color' } },
      { name: 'intensity', type: 'number', default: '1.0',            desc: { ko: '밝기 (0~...)', en: 'Intensity (0–...)' } },
    ],
    code: `from vpython import *
scene_background(color.skyblue)
distant_light(direction=vector(1, -1, -0.5), color=color.white, intensity=1.2)
box(size=vector(2, 0.5, 2), color=color.orange)`,
    tags: ['scene', 'light', 'directional', 'distant', 'sun', 'lighting'],
  },
  {
    id: 'scene_camera',
    category: 'scene',
    title: { ko: '카메라 위치와 방향 (scene.camera, scene.forward)', en: 'scene.camera / scene.forward' },
    description: {
      ko: '카메라를 직접 움직입니다. scene.forward는 보는 방향, scene.camera.pos는 카메라 위치, scene.camera.axis는 카메라에서 중심까지의 벡터입니다. GlowScript VPython과 같은 의미입니다. range 또는 camera.pos/axis를 지정하면 자동 맞춤이 꺼집니다. forward·center·camera.follow는 자동 맞춤 여부를 유지합니다. center를 옮기면 카메라도 함께 평행 이동합니다.',
      en: 'Moves the camera directly. scene.forward is the viewing direction, scene.camera.pos the camera position and scene.camera.axis the vector from the camera to the center, with the same meaning as GlowScript VPython. Setting range or camera.pos/axis disables autoscale; forward, center, and camera.follow preserve it. Moving center translates the camera too.',
    },
    signature: "scene.forward = vector(0, -1, -1); scene.camera.pos = vector(0, 5, 10); scene.camera.axis = vector(0, -5, -10); scene.camera.follow(obj)",
    params: [
      { name: 'scene.forward', type: 'vector', default: 'vector(0,0,-1)', desc: { ko: '보는 방향 (길이는 무시)', en: 'Viewing direction (length ignored)' } },
      { name: 'scene.up', type: 'vector', default: 'vector(0,1,0)', desc: { ko: '화면의 위쪽 방향', en: 'Screen up direction' } },
      { name: 'scene.camera.pos', type: 'vector', default: '-', desc: { ko: '카메라 위치. 중심도 같이 이동', en: 'Camera position; the center moves with it' } },
      { name: 'scene.camera.axis', type: 'vector', default: '-', desc: { ko: '카메라에서 중심까지의 벡터', en: 'Vector from camera to center' } },
      { name: 'scene.camera.rotate(angle, axis, origin)', type: 'method', default: 'origin=camera.pos', desc: { ko: '기본은 자기 위치에서 시선 회전. origin=scene.center로 중심 주위 회전', en: 'Rotates in place by default; specify origin=scene.center to orbit' } },
      { name: 'scene.camera.follow(obj)', type: 'object', default: 'None', desc: { ko: '객체를 계속 화면 중심에 둠. None이면 해제', en: 'Keep an object centered; None stops following' } },
    ],
    code: `from vpython import *
ball = sphere(pos=vector(0, 0, 0), radius=0.5, color=color.orange)
box(pos=vector(0, -1, 0), size=vector(10, 0.2, 10), color=color.green)

# 비스듬히 위에서 내려다보기
scene.forward = vector(0, -0.6, -1)
scene.range = 4

# 공을 따라가는 카메라
scene.camera.follow(ball)
for i in range(200):
    rate(60)
    ball.pos.x += 0.03`,
    tags: ['scene', 'camera', 'forward', 'up', 'follow', 'view', '카메라', '시점'],
  },
  {
    id: 'scene_range_fov',
    category: 'scene',
    title: { ko: '보이는 범위와 시야각 (scene.range, scene.fov)', en: 'scene.range / scene.fov' },
    description: {
      ko: 'scene.range는 화면의 짧은 변 방향으로 중심에서 보이는 범위의 절반입니다. 가로 화면에서 range=5이면 중심 위아래로 5만큼, 세로 화면이면 좌우로 5만큼이 보입니다. scene.fov는 시야각(라디안)이며 기본값은 60도(pi/3)입니다. scene.center는 카메라가 바라보는 점입니다. VPyLab은 물체가 만들어진 자리에 맞춰 화면을 정하며 물체가 움직이거나 커져도 카메라는 한 곳에 있습니다. 새 물체가 화면 범위 밖에 만들어지면 그 물체까지 보이도록 범위가 넓어집니다. scene.autoscale = True를 적으면 실행하는 동안 모든 물체가 보이도록 카메라가 계속 조절됩니다.',
      en: 'scene.range is half of the visible extent along the shorter side of the view. scene.fov is the field of view in radians (default 60 degrees, pi/3). scene.center is the point the camera looks at. VPyLab frames the places where objects were created, and the camera stays in one place when objects move or grow. If a new object is created outside the view, the range widens to include it. Write scene.autoscale = True to keep the camera adjusting so that every object stays visible while the code runs.',
    },
    signature: "scene.range = 5; scene.center = vector(0, 0, 0); scene.fov = pi/3; scene.autoscale = False",
    params: [
      { name: 'scene.range', type: 'number', default: '자동', desc: { ko: '짧은 변 방향 시야의 절반', en: 'Half extent along the shorter side' } },
      { name: 'scene.center', type: 'vector', default: 'vector(0,0,0)', desc: { ko: '카메라가 보는 점', en: 'Point the camera looks at' } },
      { name: 'scene.fov', type: 'number', default: 'pi/3', desc: { ko: '시야각 (라디안)', en: 'Field of view (radians)' } },
      { name: 'scene.autoscale', type: 'bool', default: 'True', desc: { ko: 'True를 적으면 실행하는 동안 모든 물체가 보이도록 계속 조절. False는 지금 카메라를 유지', en: 'Write True to keep fitting every object while the code runs; False keeps the current camera' } },
    ],
    code: `from vpython import *
from math import pi
for i in range(5):
    sphere(pos=vector(i * 2 - 4, 0, 0), radius=0.4, color=color.cyan)

scene.center = vector(0, 0, 0)
scene.range = 3        # 가운데 세 개만 크게
sleep(1.5)
scene.fov = pi / 2     # 기본 pi/3보다 넓은 시야각으로 원근감 비교
sleep(1.5)
scene.autoscale = True # 전체가 보이도록 계속 맞추기`,
    tags: ['scene', 'range', 'fov', 'center', 'autoscale', 'zoom', '범위', '시야각'],
  },
  {
    id: 'scene_lights',
    category: 'scene',
    title: { ko: '환경광과 기본 조명 (scene.ambient, scene.lights)', en: 'scene.ambient / scene.lights' },
    description: {
      ko: 'scene.ambient는 그림자 쪽도 고르게 밝히는 환경광의 색입니다. 밝은 색일수록 전체가 밝아집니다. scene.lights = []로 기본 조명을 끄고 local_light, distant_light만으로 장면을 밝힐 수 있습니다.',
      en: 'scene.ambient is the color of the ambient light that brightens every face evenly. scene.lights = [] turns off the default lights so only your local_light and distant_light remain.',
    },
    signature: "scene.ambient = color.gray(0.2); scene.lights = []",
    params: [
      { name: 'scene.ambient', type: 'vector', default: 'color.gray(0.6)', desc: { ko: '환경광 색 (밝기)', en: 'Ambient light color (brightness)' } },
      { name: 'scene.lights', type: 'list', default: '기본 조명', desc: { ko: '켜 둘 조명 목록. 빈 목록이면 모두 끔', en: 'Lights to keep on; empty list turns all off' } },
    ],
    code: `from vpython import *
scene.ambient = color.gray(0.1)   # 어두운 방
scene.lights = []                 # 기본 조명 끄기
lamp = local_light(pos=vector(2, 3, 2), color=color.yellow, intensity=20)
sphere(pos=vector(0, 0, 0), radius=1, color=color.white)
box(pos=vector(0, -1.2, 0), size=vector(6, 0.2, 6), color=color.gray(0.7))
for i in range(300):
    rate(60)
    lamp.pos = vector(3 * cos(i * 0.03), 3, 3 * sin(i * 0.03))`,
    tags: ['scene', 'ambient', 'lights', 'light', 'dark', '조명', '환경광'],
  },
  {
    id: 'scene_title',
    category: 'scene',
    title: { ko: '화면 제목과 설명 (scene.title, scene.caption)', en: 'scene.title / scene.caption' },
    description: {
      ko: '3D 화면 위쪽에 제목을, 아래쪽에 설명을 표시합니다. scene.append_to_caption()으로 글을 덧붙일 수 있습니다.',
      en: 'Shows a title above the 3D view and a caption below it. scene.append_to_caption() appends text.',
    },
    signature: "scene.title = '제목'; scene.caption = '설명'; scene.append_to_caption('덧붙일 글')",
    params: [
      { name: 'scene.title', type: 'str', default: "''", desc: { ko: '화면 위쪽 글자', en: 'Text above the view' } },
      { name: 'scene.caption', type: 'str', default: "''", desc: { ko: '화면 아래쪽 글자', en: 'Text below the view' } },
    ],
    code: `from vpython import *
scene.title = '자유 낙하 실험'
scene.caption = '공이 바닥에 닿을 때까지의 시간을 관찰하세요.'
scene.center = vector(0, 2.5, 0)
scene.range = 4
ball = sphere(pos=vector(0, 5, 0), radius=0.3, color=color.red)
v = 0
t = 0
while ball.pos.y > 0:
    rate(60)
    v -= 9.8 / 60
    ball.pos.y += v / 60
    t += 1 / 60
scene.append_to_caption(f' 걸린 시간: {t:.2f}초')`,
    tags: ['scene', 'title', 'caption', 'text', '제목', '설명'],
  },
  {
    id: 'scene-object',
    category: 'scene',
    title: { ko: 'scene 객체 — 카메라/배경', en: 'scene object — camera/background' },
    description: {
      ko: '씬 전역 제어. background/range/center/autoscale/title/caption.',
      en: 'Global scene control: background, range, center, autoscale, title, caption.',
    },
    signature: "scene.background = vector\nscene.range = number\nscene.center = vector\nscene.autoscale = bool",
    params: [
      { name: 'background', type: 'vector', default: 'cool gray', desc: { ko: '배경색 (vector RGB)', en: 'Background (vector RGB)' } },
      { name: 'range',      type: 'number', default: '—',         desc: { ko: '시야 반경 (Auto-Fit OFF)', en: 'View half-range (disables auto-fit)' } },
      { name: 'center',     type: 'vector', default: 'vector(0,0,0)', desc: { ko: '카메라 타겟', en: 'Camera target' } },
      { name: 'autoscale',  type: 'bool',   default: 'True',      desc: { ko: 'Auto-Fit 다시 켜기', en: 'Re-enable auto-fit' } },
      { name: 'title',      type: 'string', default: '—',         desc: { ko: '3D 화면 위·아래에 표시', en: 'Displayed above or below the 3D viewport' } },
      { name: 'caption',    type: 'string', default: '—',         desc: { ko: '3D 화면 위·아래에 표시', en: 'Displayed above or below the 3D viewport' } },
    ],
    code: `from vpython import *
scene.background = color.black
scene.center = vector(0, 0, 0)
scene.range = 5
sphere(pos=vector(0,0,0), radius=1, color=color.red)`,
    tags: ['scene', 'camera', 'background', 'range', 'center'],
  },

  {
    id: 'canvas',
    category: 'scene',
    title: { ko: '캔버스 (canvas)', en: 'canvas' },
    description: {
      ko: 'GlowScript의 canvas(). VPyLab은 3D 화면이 하나라서 인자를 scene에 적용하고 scene을 돌려줍니다. 두 번째 호출부터는 같은 scene을 돌려주고 안내를 한 번 출력합니다. scene.visible·scene.delete()·scene.objects도 있습니다.',
      en: "GlowScript's canvas(). VPyLab has one viewport, so it applies the arguments to scene and returns scene; later calls return the same scene with a one-time notice. scene.visible, scene.delete(), scene.objects are available.",
    },
    signature: "scene = canvas(width=640, height=400, background=color.white, title='', caption='', center=vector(0,0,0), range=10, forward=vector(0,0,-1))",
    params: [
      { name: 'width / height', type: 'number', default: '640 / 400', desc: { ko: '값은 기억하지만 화면 크기는 레이아웃이 정함', en: 'Stored, but the viewport size is set by the layout' } },
      { name: 'background',     type: 'vector', default: '—',  desc: { ko: '배경색', en: 'Background color' } },
      { name: 'title / caption', type: 'string', default: "''", desc: { ko: '3D 화면 위·아래 글자', en: 'Text above/below the viewport' } },
      { name: 'center / range / forward / up / fov', type: '', default: '—', desc: { ko: '카메라 설정 (scene 속성과 같음)', en: 'Camera settings (same as scene attributes)' } },
    ],
    code: `from vpython import *
scene = canvas(title='진자', width=600, height=400, background=color.white, range=3)
bob = sphere(pos=vector(1, -2, 0), radius=0.2, color=color.red)
print(len(scene.objects))   # 1
scene.visible = True
# scene.delete()  → 3D 객체 모두 지우기`,
    tags: ['canvas', 'scene', '캔버스', 'visible', 'delete', 'objects'],
  },
  {
    id: 'attach-light',
    category: 'scene',
    title: { ko: '따라다니는 광원 (attach_light)', en: 'attach_light' },
    description: {
      ko: '객체를 따라다니는 점광원. rate()·sleep()마다 광원 위치를 obj.pos + offset으로 옮깁니다. .offset·.color·.visible을 바꿀 수 있습니다.',
      en: 'A point light that follows an object: each rate()/sleep() moves it to obj.pos + offset. .offset, .color, .visible are adjustable.',
    },
    signature: "attach_light(obj, offset=vector(0,0,0), color=color.white, intensity=1.0)",
    params: [
      { name: 'obj',    type: 'object', default: '—',             desc: { ko: '따라갈 객체', en: 'Object to follow' } },
      { name: 'offset', type: 'vector', default: 'vector(0,0,0)', desc: { ko: '객체 위치에서의 거리', en: 'Offset from the object' } },
      { name: 'color',  type: 'vector', default: 'color.white',   desc: { ko: '빛 색', en: 'Light color' } },
    ],
    code: `from vpython import *
scene.lights = []
scene.ambient = color.gray(0.2)
floor = box(pos=vector(0, -1, 0), size=vector(10, 0.2, 10))
sun = sphere(radius=0.3, color=color.yellow, emissive=True)
attach_light(sun, offset=vector(0, 0.5, 0), color=color.yellow)
t = 0
while True:
    rate(60)
    sun.pos = vector(3*cos(t), 1, 3*sin(t))
    t += 0.02`,
    tags: ['attach_light', 'light', '광원', '조명', 'follow'],
  },

  // ━━━ events ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'scene-bind',
    category: 'events',
    title: { ko: 'scene.bind() — 이벤트 핸들러', en: 'scene.bind() — events' },
    description: {
      ko: 'click/mousedown/mouseup/mousemove/keydown/keyup/widget 이벤트 등록. handler는 evt(event info)를 받음.',
      en: 'Bind handlers for click/mousedown/mouseup/mousemove/keydown/keyup/widget events.',
    },
    signature: "scene.bind('click mousedown ...', handler)\n@scene.bind('keydown')   # 데코레이터도 가능",
    params: [
      { name: 'event_names', type: 'string', default: '—', desc: { ko: '공백 구분 다중 가능', en: 'Space-separated names' } },
      { name: 'handler',     type: 'function', default: '—', desc: { ko: 'def f(evt): evt.pos, evt.pick, evt.key', en: 'evt.pos, evt.pick, evt.key' } },
    ],
    code: `from vpython import *

def on_click(evt):
    sphere(pos=evt.pos, radius=0.2, color=color.red)

scene.bind('click', on_click)

# 메인 루프 — rate()로 이벤트 디스패치
while True:
    rate(30)`,
    tags: ['event', 'click', 'mousemove', 'keydown', 'bind', '이벤트'],
  },
  {
    id: 'scene-mouse',
    category: 'events',
    title: { ko: 'scene.mouse — 마우스 폴링', en: 'scene.mouse' },
    description: {
      ko: 'scene.mouse.pos = 현재 마우스의 월드 좌표(z=0 평면 기준), .pick = 마우스 아래 객체 id, .ray = 카메라에서 마우스로 향하는 단위 벡터, .project(normal=, point=/d=) = 평면에 투영한 점.',
      en: 'scene.mouse.pos = world coords (z=0 plane), .pick = object id under cursor, .ray = unit vector from camera, .project(normal=, point=/d=) = point on a plane.',
    },
    signature: "scene.mouse.pos → vector\nscene.mouse.pick → str | None\nscene.mouse.ray → vector\nscene.mouse.project(normal=vector(0,1,0), point=vector(0,0,0)) → vector | None",
    params: [],
    code: `from vpython import *
ball = sphere(pos=vector(0,0,0), radius=0.3, color=color.coral)
while True:
    rate(60)
    p = scene.mouse.project(normal=vector(0, 0, 1), d=0)   # z=0 평면 위의 마우스 위치
    if p is not None:
        ball.pos = ball.pos + (p - ball.pos) * 0.1          # 부드럽게 추적`,
    tags: ['mouse', 'scene', 'pos', 'pick', 'ray', 'project', '폴링'],
  },
  {
    id: 'keysdown',
    category: 'events',
    title: { ko: 'keysdown() — 다중 키 폴링', en: 'keysdown()' },
    description: {
      ko: '현재 눌려있는 모든 키 리스트. 동시 입력(예: 위+오른쪽)에 필수. scene.bind(\'keydown\')은 한 번 누름마다 1회.',
      en: 'List of all keys currently held. Use this for simultaneous keys; bind(\'keydown\') fires once per press.',
    },
    signature: "keysdown() → list[str]",
    params: [],
    code: `from vpython import *
ball = sphere(pos=vector(0,0,0), radius=0.3, color=color.lime)
while True:
    rate(60)
    keys = keysdown()
    if 'left'  in keys: ball.pos.x -= 0.05
    if 'right' in keys: ball.pos.x += 0.05
    if 'up'    in keys: ball.pos.y += 0.05
    if 'down'  in keys: ball.pos.y -= 0.05`,
    tags: ['keysdown', 'keyboard', 'multi-key', '다중 키', '폴링'],
  },

  // ━━━ widgets ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'slider',
    category: 'widgets',
    title: { ko: '슬라이더 (slider)', en: 'slider' },
    description: {
      ko: '드래그 가능한 슬라이더. 값이 바뀔 때마다 bind 콜백 호출 (evt.value).',
      en: 'Draggable slider. bind callback receives evt.value on every change.',
    },
    signature: "slider(min=0, max=1, step=0.01, value=None, length=200, bind=fn)",
    params: [
      { name: 'min/max', type: 'number',   default: '0/1',  desc: { ko: '범위', en: 'Range' } },
      { name: 'step',    type: 'number',   default: '0.01', desc: { ko: '눈금', en: 'Step' } },
      { name: 'value',   type: 'number',   default: 'min',  desc: { ko: '초기값', en: 'Initial value' } },
      { name: 'length',  type: 'number',   default: '200',  desc: { ko: '픽셀 길이', en: 'Pixel length' } },
      { name: 'bind',    type: 'function', default: 'None', desc: { ko: 'def f(evt): evt.value', en: 'def f(evt): evt.value' } },
    ],
    code: `from vpython import *
ball = sphere(pos=vector(0,0,0), radius=0.5, color=color.coral)

def on_slide(evt):
    ball.radius = evt.value

slider(min=0.1, max=2.0, step=0.05, value=0.5, length=200, bind=on_slide)

while True:
    rate(30)`,
    tags: ['slider', 'widget', '슬라이더'],
  },
  {
    id: 'button',
    category: 'widgets',
    title: { ko: '버튼 (button)', en: 'button' },
    description: {
      ko: '클릭 가능한 버튼. .text로 라벨 변경 가능.',
      en: 'Clickable button. Use .text to update label.',
    },
    signature: "button(text='Button', bind=fn)",
    params: [
      { name: 'text', type: 'string',   default: "'Button'", desc: { ko: '버튼 라벨', en: 'Button label' } },
      { name: 'bind', type: 'function', default: 'None',     desc: { ko: '클릭 핸들러', en: 'Click handler' } },
    ],
    code: `from vpython import *
import random
ball = sphere(pos=vector(0,0,0), radius=0.5, color=color.red)

def on_click(evt):
    ball.color = vector(random.random(), random.random(), random.random())

button(text='색 바꾸기', bind=on_click)
while True:
    rate(30)`,
    tags: ['button', 'widget', '버튼'],
  },
  {
    id: 'checkbox',
    category: 'widgets',
    title: { ko: '체크박스 (checkbox)', en: 'checkbox' },
    description: {
      ko: '체크박스 위젯. evt.value는 boolean. .checked로도 접근.',
      en: 'Checkbox widget. evt.value is boolean. Use .checked too.',
    },
    signature: "checkbox(text='', checked=False, bind=fn)",
    params: [
      { name: 'text',    type: 'string',   default: "''",    desc: { ko: '레이블', en: 'Label' } },
      { name: 'checked', type: 'bool',     default: 'False', desc: { ko: '초기 상태', en: 'Initial state' } },
      { name: 'bind',    type: 'function', default: 'None',  desc: { ko: '변경 콜백', en: 'Change callback' } },
    ],
    code: `from vpython import *
ball = sphere(pos=vector(0,0,0), radius=0.5, color=color.cyan)

def on_toggle(evt):
    ball.emissive = evt.value

checkbox(text='발광', checked=False, bind=on_toggle)
while True:
    rate(30)`,
    tags: ['checkbox', 'widget', '체크박스'],
  },
  {
    id: 'radio',
    category: 'widgets',
    title: { ko: '라디오 버튼 (radio)', en: 'radio' },
    description: {
      ko: '같은 name 그룹에서 하나만 선택. 선택될 때 bind 호출.',
      en: 'Single-select within same name group. bind fires when selected.',
    },
    signature: "radio(text='', name='group', checked=False, bind=fn)",
    params: [
      { name: 'text',    type: 'string',   default: "''",        desc: { ko: '레이블', en: 'Label' } },
      { name: 'name',    type: 'string',   default: "'radio_group'", desc: { ko: '그룹명', en: 'Group name' } },
      { name: 'value',   type: 'any',      default: 'None',      desc: { ko: 'evt.value로 전달', en: 'Passed via evt.value' } },
      { name: 'checked', type: 'bool',     default: 'False',     desc: { ko: '기본 선택', en: 'Default selection' } },
      { name: 'bind',    type: 'function', default: 'None',      desc: { ko: '선택 콜백', en: 'Select callback' } },
    ],
    code: `from vpython import *
ball = sphere(radius=0.5, color=color.red)
def choose_red(r):
    ball.color = color.red
def choose_green(r):
    ball.color = color.green
def choose_blue(r):
    ball.color = color.blue
radio(text='빨강', name='shade', checked=True, bind=choose_red)
radio(text='초록', name='shade', bind=choose_green)
radio(text='파랑', name='shade', bind=choose_blue)
`,
    tags: ['radio', 'widget', '라디오'],
  },
  {
    id: 'menu',
    category: 'widgets',
    title: { ko: '메뉴 / 드롭다운 (menu)', en: 'menu / dropdown' },
    description: {
      ko: '선택지 중 하나를 고르는 드롭다운. evt.value는 선택된 문자열.',
      en: 'Dropdown to pick one of choices. evt.value is the selected string.',
    },
    signature: "menu(choices=[...], selected=None, bind=fn)",
    params: [
      { name: 'choices',  type: 'list',     default: '—',    desc: { ko: '선택지 리스트', en: 'List of options' } },
      { name: 'selected', type: 'string',   default: '첫 항목', desc: { ko: '초기 선택', en: 'Initial choice' } },
      { name: 'bind',     type: 'function', default: 'None',  desc: { ko: '변경 콜백', en: 'Change callback' } },
    ],
    code: `from vpython import *
scene.range = 6
ball = sphere(pos=vector(0,0,0), radius=0.5)
speeds = {'느림': 0.01, '보통': 0.05, '빠름': 0.1}

def on_speed(evt):
    ball.spd = speeds[evt.value]

ball.spd = speeds['보통']
menu(choices=list(speeds), selected='보통', bind=on_speed)

while True:
    rate(60)
    ball.pos.x += ball.spd
    if ball.pos.x > 5: ball.pos.x = -5`,
    tags: ['menu', 'dropdown', 'select', '드롭다운'],
  },
  {
    id: 'winput',
    category: 'widgets',
    title: { ko: '입력창 (winput)', en: 'winput' },
    description: {
      ko: '숫자 또는 텍스트 입력. Enter 또는 blur 시 bind 호출. type=\'numeric\' (기본) 또는 \'string\'.',
      en: 'Numeric or text input. Fires on Enter or blur. type=\'numeric\' or \'string\'.',
    },
    signature: "winput(prompt='', type='numeric', bind=fn)",
    params: [
      { name: 'prompt', type: 'string',   default: "''",        desc: { ko: '안내 문구', en: 'Prompt label' } },
      { name: 'type',   type: 'string',   default: "'numeric'", desc: { ko: 'numeric | string', en: 'numeric | string' } },
      { name: 'bind',   type: 'function', default: 'None',      desc: { ko: '제출 콜백', en: 'Submit callback' } },
    ],
    code: `from vpython import *

def on_input(evt):
    print(f"입력값: {evt.value}")

winput(prompt='크기', type='numeric', bind=on_input)
while True:
    rate(30)`,
    tags: ['winput', 'input', 'widget', '입력창'],
  },
  {
    id: 'wtext',
    category: 'widgets',
    title: { ko: '캡션 글자 (wtext)', en: 'wtext' },
    description: {
      ko: '3D 화면 아래 캡션 영역에 글자를 표시하고 .text로 바꿉니다. 슬라이더 값 표시에 씁니다. pos=scene.title_anchor면 제목 영역에 놓입니다.',
      en: 'Text in the caption area below the viewport, updated via .text. Typical use: showing a slider value. pos=scene.title_anchor places it in the title area.',
    },
    signature: "wtext(text='', pos=scene.caption_anchor)",
    params: [
      { name: 'text', type: 'string', default: "''", desc: { ko: '표시할 글자 (.text로 갱신)', en: 'Text to show (update via .text)' } },
      { name: 'pos',  type: 'anchor', default: 'scene.caption_anchor', desc: { ko: 'scene.caption_anchor | scene.title_anchor', en: 'scene.caption_anchor | scene.title_anchor' } },
    ],
    code: `from vpython import *
ball = sphere(radius=0.5, color=color.cyan)
scene.caption = '반지름: '
readout = wtext(text='0.50')

def on_slide(evt):
    ball.radius = evt.value
    readout.text = f'{evt.value:.2f}'

slider(min=0.1, max=2, value=0.5, bind=on_slide)
while True:
    rate(30)`,
    tags: ['wtext', 'caption', 'widget', '글자', 'slider'],
  },

  // ━━━ graphs (2D) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'graph',
    category: 'graphs',
    title: { ko: '그래프 캔버스 (graph)', en: 'graph (2D plot canvas)' },
    description: {
      ko: '2D 플롯 캔버스. gcurve/gdots/gvbars/ghbars의 컨테이너. 우측 하단 패널에 표시.',
      en: '2D plot canvas. Container for gcurve/gdots/gvbars/ghbars. Shown in bottom panel.',
    },
    signature: "graph(title='', xtitle='', ytitle='', width=480, height=320, xmin=, xmax=, ymin=, ymax=)",
    params: [
      { name: 'title',  type: 'string', default: "''",  desc: { ko: '그래프 제목', en: 'Title' } },
      { name: 'xtitle / ytitle', type: 'string', default: "''", desc: { ko: '축 라벨', en: 'Axis labels' } },
      { name: 'width / height',  type: 'number', default: '480 / 320', desc: { ko: '캔버스 크기', en: 'Canvas size' } },
      { name: 'xmin / xmax / ymin / ymax', type: 'number', default: '자동', desc: { ko: '범위 (None=자동)', en: 'Range (None=auto)' } },
    ],
    code: `from vpython import *
import math
g = graph(title='속도 vs 시간', xtitle='t', ytitle='v',
          width=480, height=320)
v_curve = gcurve(graph=g, color=color.red)
for i in range(100):
    t = i * 0.1
    v_curve.plot(t, math.sin(t))`,
    tags: ['graph', '2d', 'plot', '그래프'],
  },
  {
    id: 'gcurve',
    category: 'graphs',
    title: { ko: '선 그래프 (gcurve)', en: 'gcurve' },
    description: {
      ko: '선으로 그리는 시리즈. graph 안에 추가. .plot(x, y) 또는 .plot([(x,y),...]).',
      en: 'Line series within a graph. Use .plot(x, y) or .plot([(x,y), ...]).',
    },
    signature: "gcurve(graph=g, color=color.blue, width=1.5, label='')",
    params: [
      { name: 'graph', type: 'graph', default: '직전 graph',   desc: { ko: '담을 graph', en: 'Parent graph' } },
      { name: 'color', type: 'vector', default: 'cool blue',   desc: { ko: '선 색', en: 'Line color' } },
      { name: 'width', type: 'number', default: '1.5',          desc: { ko: '선 굵기', en: 'Line width' } },
      { name: 'label', type: 'string', default: "''",           desc: { ko: '범례 라벨', en: 'Legend label' } },
    ],
    code: `from vpython import *
import math
g = graph(title='cos(x)')
c = gcurve(graph=g, color=color.blue)
for i in range(100):
    c.plot(i*0.1, math.cos(i*0.1))`,
    tags: ['gcurve', 'graph', 'line', '선그래프'],
  },
  {
    id: 'gdots',
    category: 'graphs',
    title: { ko: '점 그래프 (gdots)', en: 'gdots' },
    description: {
      ko: '산점도. .plot(x, y)로 점 추가.',
      en: 'Scatter plot series. Add points with .plot(x, y).',
    },
    signature: "gdots(graph=g, color=color.red, size=4, label='')",
    params: [
      { name: 'graph', type: 'graph', default: '직전 graph', desc: { ko: '담을 graph', en: 'Parent graph' } },
      { name: 'color', type: 'vector', default: 'red',       desc: { ko: '점 색', en: 'Dot color' } },
      { name: 'size',  type: 'number', default: '4',          desc: { ko: '점 크기 (px)', en: 'Dot size' } },
    ],
    code: `from vpython import *
import random
g = graph(title='산점도', xmin=0, xmax=10)
d = gdots(graph=g, color=color.red, size=6)
for _ in range(40):
    x = random.uniform(0, 10)
    d.plot(x, 2*x + random.gauss(0, 2))`,
    tags: ['gdots', 'graph', 'scatter', '산점도'],
  },
  {
    id: 'gvbars',
    category: 'graphs',
    title: { ko: '세로 막대 (gvbars)', en: 'gvbars' },
    description: {
      ko: '세로 막대 차트. .plot(x, y) — y 높이의 막대를 x 위치에.',
      en: 'Vertical bar chart. .plot(x, y) places bar of height y at x.',
    },
    signature: "gvbars(graph=g, color=color.green, width=0.5)",
    params: [
      { name: 'graph', type: 'graph', default: '직전 graph', desc: { ko: '담을 graph', en: 'Parent graph' } },
      { name: 'color', type: 'vector', default: 'green',     desc: { ko: '막대 색', en: 'Bar color' } },
      { name: 'width', type: 'number', default: '0.5',        desc: { ko: '막대 굵기', en: 'Bar thickness' } },
    ],
    code: `from vpython import *
g = graph(title='월별 강수량')
bars = gvbars(graph=g, color=color.blue, width=0.6)
data = [30, 50, 80, 120, 90, 60]
for i, v in enumerate(data):
    bars.plot(i+1, v)`,
    tags: ['gvbars', 'graph', 'bar', '막대'],
  },
  {
    id: 'ghbars',
    category: 'graphs',
    title: { ko: '가로 막대 (ghbars)', en: 'ghbars' },
    description: {
      ko: '가로 막대 차트. gvbars의 가로 버전.',
      en: 'Horizontal bar chart (rotated gvbars).',
    },
    signature: "ghbars(graph=g, color=color.orange, width=0.5)",
    params: [
      { name: 'graph', type: 'graph', default: '직전 graph', desc: { ko: '담을 graph', en: 'Parent graph' } },
      { name: 'color', type: 'vector', default: 'orange',    desc: { ko: '막대 색', en: 'Bar color' } },
      { name: 'width', type: 'number', default: '0.5',        desc: { ko: '막대 굵기', en: 'Bar thickness' } },
    ],
    code: `from vpython import *
g = graph(title='국가별 인구', xtitle='인구(백만)')
bars = ghbars(graph=g, color=color.orange, width=0.6)
for i, v in enumerate([52, 333, 126, 1400]):
    bars.plot(v, i+1)`,
    tags: ['ghbars', 'graph', 'bar', '가로 막대'],
  },

  // ━━━ colors ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'color-palette',
    category: 'colors',
    title: { ko: '색상 팔레트', en: 'Color Palette' },
    description: {
      ko: 'VPyLab에서 사용할 수 있는 30가지 기본 색상입니다. color.이름 형식으로 사용합니다.',
      en: '30 built-in colors available in VPyLab. Use the color.name format.',
    },
    signature: "color.red, color.green, color.blue, ...",
    params: [
      { name: 'color.red',      type: 'vector', default: 'vector(1,0,0)',           desc: { ko: '빨강', en: 'Red' } },
      { name: 'color.green',    type: 'vector', default: 'vector(0,1,0)',         desc: { ko: '초록', en: 'Green' } },
      { name: 'color.blue',     type: 'vector', default: 'vector(0,0,1)',           desc: { ko: '파랑', en: 'Blue' } },
      { name: 'color.yellow',   type: 'vector', default: 'vector(1,1,0)',           desc: { ko: '노랑', en: 'Yellow' } },
      { name: 'color.cyan',     type: 'vector', default: 'vector(0,1,1)',           desc: { ko: '시안', en: 'Cyan' } },
      { name: 'color.magenta',  type: 'vector', default: 'vector(1,0,1)',           desc: { ko: '마젠타', en: 'Magenta' } },
      { name: 'color.orange',   type: 'vector', default: 'vector(1,0.6,0)',         desc: { ko: '주황', en: 'Orange' } },
      { name: 'color.white',    type: 'vector', default: 'vector(1,1,1)',           desc: { ko: '흰색', en: 'White' } },
      { name: 'color.black',    type: 'vector', default: 'vector(0,0,0)',           desc: { ko: '검정', en: 'Black' } },
      { name: 'color.gray(0.5)',     type: 'vector', default: 'vector(0.5,0.5,0.5)',     desc: { ko: '회색', en: 'Gray' } },
      { name: 'color.purple',   type: 'vector', default: 'vector(0.4,0.2,0.6)',       desc: { ko: '보라', en: 'Purple' } },
      { name: 'color.pink',     type: 'vector', default: 'vector(1,0.75,0.8)',      desc: { ko: '분홍', en: 'Pink' } },
      { name: 'color.brown',    type: 'vector', default: 'vector(0.6,0.3,0.1)',     desc: { ko: '갈색', en: 'Brown' } },
      { name: 'color.gold',     type: 'vector', default: 'vector(1,0.84,0)',        desc: { ko: '금색', en: 'Gold' } },
      { name: 'color.silver',   type: 'vector', default: 'vector(0.75,0.75,0.75)',  desc: { ko: '은색', en: 'Silver' } },
      { name: 'color.navy',     type: 'vector', default: 'vector(0,0,0.5)',         desc: { ko: '남색', en: 'Navy' } },
      { name: 'color.skyblue',  type: 'vector', default: 'vector(0.53,0.81,0.92)',  desc: { ko: '하늘색', en: 'Sky Blue' } },
      { name: 'color.lime',     type: 'vector', default: 'vector(0.5,1,0)',         desc: { ko: '라임', en: 'Lime' } },
      { name: 'color.olive',    type: 'vector', default: 'vector(0.5,0.5,0)',       desc: { ko: '올리브', en: 'Olive' } },
      { name: 'color.coral',    type: 'vector', default: 'vector(1,0.5,0.31)',      desc: { ko: '코랄', en: 'Coral' } },
      { name: 'color.salmon',   type: 'vector', default: 'vector(0.98,0.5,0.45)',   desc: { ko: '살몬', en: 'Salmon' } },
      { name: 'color.violet',   type: 'vector', default: 'vector(0.56,0,1)',        desc: { ko: '바이올렛', en: 'Violet' } },
      { name: 'color.indigo',   type: 'vector', default: 'vector(0.29,0,0.51)',     desc: { ko: '인디고', en: 'Indigo' } },
      { name: 'color.beige',    type: 'vector', default: 'vector(0.96,0.96,0.86)',  desc: { ko: '베이지', en: 'Beige' } },
      { name: 'color.mint',     type: 'vector', default: 'vector(0.6,1,0.8)',       desc: { ko: '민트', en: 'Mint' } },
      { name: 'color.peach',    type: 'vector', default: 'vector(1,0.85,0.73)',     desc: { ko: '복숭아', en: 'Peach' } },
      { name: 'color.lavender', type: 'vector', default: 'vector(0.71,0.49,0.86)',  desc: { ko: '라벤더', en: 'Lavender' } },
      { name: 'color.maroon',   type: 'vector', default: 'vector(0.5,0,0)',         desc: { ko: '마룬', en: 'Maroon' } },
      { name: 'color.teal',     type: 'vector', default: 'vector(0,0.5,0.5)',       desc: { ko: '틸', en: 'Teal' } },
      { name: 'color.ivory',    type: 'vector', default: 'vector(1,1,0.94)',        desc: { ko: '아이보리', en: 'Ivory' } },
    ],
    code: `from vpython import *
colors_list = [color.red, color.orange, color.yellow, color.green, color.blue, color.purple]
for i, c in enumerate(colors_list):
    sphere(pos=vector(i - 2.5, 0, 0), radius=0.4, color=c)`,
    tags: ['color', 'palette', 'reference', 'list'],
  },
  {
    id: 'korean-colors',
    category: 'colors',
    title: { ko: '한글 색상 (색상)', en: 'Korean Color Aliases' },
    description: {
      ko: "한글로 색상을 지정할 수 있습니다. 색상['빨강'] 또는 색상['빨'] 형식으로 사용합니다.",
      en: "Colors can be specified in Korean. Use 색상['빨강'] or 색상['빨'] format.",
    },
    signature: "색상['빨강'], 색상['빨'], 색상['초록'], 색상['파랑'], ...",
    params: [
      { name: "색상['빨강'] / 색상['빨'] / 색상['빨간']", type: 'vector', default: 'color.red', desc: { ko: '빨강', en: 'Red' } },
      { name: "색상['주황'] / 색상['주']",    type: 'vector', default: 'color.orange',  desc: { ko: '주황', en: 'Orange' } },
      { name: "색상['노랑'] / 색상['노']",    type: 'vector', default: 'color.yellow',  desc: { ko: '노랑', en: 'Yellow' } },
      { name: "색상['초록'] / 색상['초'] / 색상['녹색']", type: 'vector', default: 'color.green', desc: { ko: '초록', en: 'Green' } },
      { name: "색상['파랑'] / 색상['파']",    type: 'vector', default: 'color.blue',    desc: { ko: '파랑', en: 'Blue' } },
      { name: "색상['보라'] / 색상['보']",    type: 'vector', default: 'color.purple',  desc: { ko: '보라', en: 'Purple' } },
      { name: "색상['흰색'] / 색상['흰']",    type: 'vector', default: 'color.white',   desc: { ko: '흰색', en: 'White' } },
      { name: "색상['검정'] / 색상['검']",    type: 'vector', default: 'color.black',   desc: { ko: '검정', en: 'Black' } },
      { name: "색상['분홍'] / 색상['분']",    type: 'vector', default: 'color.pink',    desc: { ko: '분홍', en: 'Pink' } },
      { name: "색상['하늘'] / 색상['하늘색']", type: 'vector', default: 'color.skyblue', desc: { ko: '하늘색', en: 'Sky Blue' } },
      { name: "색상['청록'] / 색상['시안']",   type: 'vector', default: 'color.cyan',    desc: { ko: '청록', en: 'Cyan' } },
      { name: "색상['갈색'] / 색상['갈']",    type: 'vector', default: 'color.brown',   desc: { ko: '갈색', en: 'Brown' } },
      { name: "색상['회색'] / 색상['회']",    type: 'vector', default: 'color.gray',    desc: { ko: '회색', en: 'Gray' } },
      { name: "색상['금색'] / 색상['황금']",   type: 'vector', default: 'color.gold',    desc: { ko: '금색', en: 'Gold' } },
      { name: "색상['민트'] / 색상['라벤더']", type: 'vector', default: '-',             desc: { ko: '확장 색상도 한글 이름으로 접근 가능', en: 'Extended colors are available by Korean names too' } },
    ],
    code: `from vpython import *
sphere(pos=vector(-1, 0, 0), radius=0.5, color=색상['빨'])
sphere(pos=vector(0, 0, 0), radius=0.5, color=색상['초록'])
sphere(pos=vector(1, 0, 0), radius=0.5, color=색상['파랑'])`,
    tags: ['color', 'korean', 'hangul', '색상', '한글'],
  },
  {
    id: 'custom-rgb',
    category: 'colors',
    title: { ko: '사용자 정의 색상 (RGB)', en: 'Custom RGB Color' },
    description: {
      ko: 'vector(r, g, b) 형식으로 나만의 색상을 만듭니다. 각 값은 0~1 범위입니다.',
      en: 'Create custom colors with vector(r, g, b). Each value ranges from 0 to 1.',
    },
    signature: "vector(r, g, b)  # r, g, b: 0.0 ~ 1.0",
    params: [
      { name: 'r', type: 'number', default: '0', desc: { ko: '빨강 (0~1)', en: 'Red (0–1)' } },
      { name: 'g', type: 'number', default: '0', desc: { ko: '초록 (0~1)', en: 'Green (0–1)' } },
      { name: 'b', type: 'number', default: '0', desc: { ko: '파랑 (0~1)', en: 'Blue (0–1)' } },
    ],
    code: `from vpython import *
my_color = vector(0.2, 0.6, 0.9)
sphere(pos=vector(0, 0, 0), radius=0.8, color=my_color)
sphere(pos=vector(2, 0, 0), radius=0.5, color=vector(1, 0.4, 0.7))`,
    tags: ['color', 'custom', 'rgb', 'vector'],
  },
  {
    id: 'color-lists',
    category: 'colors',
    title: { ko: '색상 리스트 (무지개)', en: 'Color Lists' },
    description: {
      ko: '자주 쓰는 색상 묶음입니다. 번호로 꺼내거나 한글 이름으로 꺼낼 수 있어 미디어아트 예제에 좋습니다.',
      en: 'Ready-made color groups. Access by index or Korean color name; useful for media-art examples.',
    },
    signature: "무지개[0], 무지개['빨강'], 파스텔['하늘'], 따뜻한색[1]",
    params: [
      { name: '무지개 / rainbow', type: 'NamedList', default: '빨-주-노-초-하늘-파-보', desc: { ko: '무지개 7색', en: 'Seven rainbow colors' } },
      { name: '따뜻한색 / warm_colors', type: 'NamedList', default: '빨-주-노', desc: { ko: '따뜻한 계열 색상', en: 'Warm colors' } },
      { name: '차가운색 / cool_colors', type: 'NamedList', default: '하늘-파-보', desc: { ko: '차가운 계열 색상', en: 'Cool colors' } },
      { name: '기본색 / basic_colors', type: 'NamedList', default: '흰-검-빨-초-파', desc: { ko: '가장 기본적인 5색', en: 'Five basic colors' } },
      { name: '파스텔 / pastel_colors', type: 'NamedList', default: '핑크-주황-노랑-초록-하늘-보라-자홍', desc: { ko: '부드러운 파스텔 색상', en: 'Soft pastel colors' } },
    ],
    code: `from vpython import *
scene_background(색상['검정'])

for i in range(7):
    sphere(
        pos=vector(i - 3, 0, 0),
        radius=0.35,
        color=무지개[i],
        emissive=True
    )

sphere(pos=vector(0, 1.2, 0), radius=0.45, color=파스텔['하늘'])`,
    tags: ['color', 'palette', 'korean', 'hangul', '무지개', '파스텔', '따뜻한색', '차가운색', '기본색'],
  },

  // ━━━ sound ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'korean-sound-quickstart',
    category: 'sound',
    title: { ko: '한글 사운드 빠른 시작', en: 'Korean Sound Quickstart' },
    description: {
      ko: 'VPyLab은 영어 함수와 함께 한글 함수명을 제공합니다. 수업 예제에서는 한글 이름을 먼저 쓰고, 필요할 때 영어 별칭을 함께 보여주는 방식을 권장합니다.',
      en: 'VPyLab provides Korean sound functions alongside English aliases. For classes, prefer Korean names first and introduce English aliases when useful.',
    },
    signature: '소리(), 음표(), 화음(), 효과음(), 배경음악(), 배경음악정지(), 악기()',
    params: [
      { name: '소리(frequency, duration)', type: 'function', default: '440, 0.3', desc: { ko: '주파수로 단순한 소리 재생', en: 'Play a tone by frequency' } },
      { name: "음표('도4', duration)", type: 'async function', default: "'도4', 0.5", desc: { ko: '음표 이름으로 재생하고 자동으로 기다림', en: 'Play a named note and wait automatically' } },
      { name: '화음([freq...], duration)', type: 'function', default: '-', desc: { ko: '여러 음을 동시에 재생', en: 'Play several notes at once' } },
      { name: "효과음('coin')", type: 'function', default: '-', desc: { ko: '내장 게임 효과음 재생', en: 'Play a built-in game sound effect' } },
      { name: "배경음악('peaceful')", type: 'function', default: '-', desc: { ko: '내장 BGM 시작', en: 'Start built-in background music' } },
      { name: "악기('피아노', '도4')", type: 'async function', default: '-', desc: { ko: '악기 음색으로 음표 재생', en: 'Play a note with an instrument preset' } },
    ],
    code: `from vpython import *

배경음악("peaceful")

음표("도4", 0.3)
음표("미4", 0.3)
음표("솔4", 0.5)
화음([음계['도'], 음계['미'], 음계['솔']], 1.0)

효과음("success")
배경음악정지()`,
    tags: ['sound', 'audio', 'music', 'korean', 'hangul', '소리', '음표', '화음', '효과음', '배경음악', '악기'],
  },
  {
    id: 'play_sound',
    category: 'sound',
    title: { ko: '소리 재생 (소리 / sound)', en: 'sound / play_sound' },
    description: {
      ko: '주파수를 지정하여 소리를 재생합니다. 한글 별칭 소리(), 짧은 영어 별칭 sound(), 전체 이름 play_sound()를 모두 사용할 수 있습니다.',
      en: 'Plays a tone with the specified frequency. You can use the Korean alias 소리(), short English alias sound(), or full name play_sound().',
    },
    signature: "소리(frequency=440, duration=0.3, type='sine', volume=0.3)",
    params: [
      { name: 'frequency', type: 'number', default: '440',    desc: { ko: '주파수 (Hz)', en: 'Frequency (Hz)' } },
      { name: 'duration',  type: 'number', default: '0.3',    desc: { ko: '재생 시간 (초)', en: 'Duration (seconds)' } },
      { name: 'type',      type: 'string', default: "'sine'",  desc: { ko: "파형 ('sine'|'square'|'sawtooth'|'triangle')", en: "Waveform ('sine'|'square'|'sawtooth'|'triangle')" } },
      { name: 'volume',    type: 'number', default: '0.3',    desc: { ko: '음량 (0~1)', en: 'Volume (0–1)' } },
    ],
    code: `from vpython import *
소리(440, 0.4)
sleep(0.5)
sound(660, 0.4, type='square')
sleep(0.5)
play_sound(880, 0.4, type='triangle')`,
    tags: ['sound', 'audio', 'tone', 'frequency', 'beep', '소리'],
  },
  {
    id: 'play_note',
    category: 'sound',
    title: { ko: '음표 재생 (음표)', en: '음표 / play_note' },
    description: {
      ko: "음표 이름으로 소리를 재생합니다. 음표()는 재생 시간만큼 자동으로 기다리므로 멜로디를 만들 때 가장 편합니다. 영문('C4')과 한글('도4')을 모두 지원합니다.",
      en: "Plays a note by name. The Korean 음표() helper waits automatically for the note duration, making melodies easier. English ('C4') and Korean ('도4') notation both work.",
    },
    signature: "음표(name='도4', duration=0.5, type='sine', volume=0.4)",
    params: [
      { name: 'name',     type: 'string', default: "'도4'",   desc: { ko: "음표 이름 ('도4', '레4', 'C4', 'C#4', '도#4')", en: "Note name ('도4', '레4', 'C4', 'C#4', '도#4')" } },
      { name: 'duration', type: 'number', default: '0.5',    desc: { ko: '재생 시간 (초)', en: 'Duration (seconds)' } },
      { name: 'type',     type: 'string', default: "'sine'",  desc: { ko: '파형', en: 'Waveform' } },
      { name: 'volume',   type: 'number', default: '0.4',    desc: { ko: '음량 (0~1)', en: 'Volume (0–1)' } },
    ],
    code: `from vpython import *
# 도레미파솔라시도
notes = ['도4', '레4', '미4', '파4', '솔4', '라4', '시4', '도5']
for n in notes:
    음표(n, 0.3)`,
    tags: ['sound', 'audio', 'note', 'music', 'melody', 'korean', '도레미', '음표'],
  },
  {
    id: 'play_note_and_wait', category: 'sound',
    title: { ko: '음표를 내고 기다리기 (play_note_and_wait)', en: 'play_note_and_wait' },
    description: {
      ko: 'VPyLab 대기형 소리 도우미입니다. 음표()와 같은 동작으로 음을 낸 뒤 재생 시간만큼 기다립니다. play_note()는 바로 다음 줄로 진행하는 기존 동작을 유지합니다.',
      en: 'A VPyLab helper that plays a note and waits for its duration, just like the Korean helper. The existing play_note() returns immediately; use this helper for sequential melodies and synchronized color changes.',
    },
    signature: "play_note_and_wait(name, duration=0.5, type='sine', volume=0.4)",
    params: [
      { name: 'name', type: 'string', default: "'C4'", desc: { ko: '음 이름 (C4, D4, G4 등)', en: 'Note name, such as C4, D4 or G4' } },
      { name: 'duration', type: 'number', default: '0.5', desc: { ko: '재생하고 기다릴 시간 (초)', en: 'Play and wait duration in seconds' } },
      { name: 'type', type: 'string', default: "'sine'", desc: { ko: '파형', en: 'Waveform' } },
      { name: 'volume', type: 'number', default: '0.4', desc: { ko: '음량 (0~1)', en: 'Volume (0–1)' } },
    ],
    code: `from vpython import *
ball = sphere(color=color.blue)
ball.color = color.yellow
play_note_and_wait("C4", 0.5)
ball.color = color.blue`,
    tags: ['sound', 'note', 'wait', 'melody', '소리', '대기'],
  },
  {
    id: 'play_chord',
    category: 'sound',
    title: { ko: '화음 재생 (화음)', en: '화음 / chord' },
    description: {
      ko: '여러 주파수를 동시에 재생하여 화음을 만듭니다. 음계 리스트와 함께 쓰면 숫자 주파수를 외우지 않아도 됩니다.',
      en: 'Plays multiple frequencies simultaneously to create a chord. Use it with scale lists so students do not need to memorize numeric frequencies.',
    },
    signature: "화음([음계['도'], 음계['미'], 음계['솔']], duration=1.0)",
    params: [
      { name: 'frequencies', type: 'list',   default: '-',      desc: { ko: '주파수 리스트 (Hz)', en: 'List of frequencies (Hz)' } },
      { name: 'duration',    type: 'number', default: '1.0',    desc: { ko: '재생 시간 (초)', en: 'Duration (seconds)' } },
      { name: 'type',        type: 'string', default: "'sine'",  desc: { ko: '파형', en: 'Waveform' } },
      { name: 'volume',      type: 'number', default: '0.25',   desc: { ko: '음량 (0~1)', en: 'Volume (0–1)' } },
    ],
    code: `from vpython import *
# 밝은 느낌: 도-미-솔
화음([음계['도'], 음계['미'], 음계['솔']], 1.0)
sleep(1.2)

# 다른 느낌: 라-도-미
화음([음계['라'], 높은음계['도'], 높은음계['미']], 1.0)`,
    tags: ['sound', 'audio', 'chord', 'harmony', 'music', '화음', '음계'],
  },
  {
    id: 'play_sequence',
    category: 'sound',
    title: { ko: '멜로디 재생 (play_sequence)', en: 'play_sequence' },
    description: {
      ko: '음표 리스트를 순서대로 재생하여 멜로디를 만듭니다.',
      en: 'Plays a list of notes in sequence to create a melody.',
    },
    signature: "play_sequence(notes)",
    params: [
      { name: 'notes', type: 'list', default: '-', desc: { ko: "음표 리스트 [{freq, duration, type, volume}, ...]", en: "List of note objects [{freq, duration, type, volume}, ...]" } },
    ],
    code: `from vpython import *
melody = [
    {'freq': 음계['도'], 'duration': 0.3},
    {'freq': 음계['레'], 'duration': 0.3},
    {'freq': 음계['미'], 'duration': 0.3},
    {'freq': 음계['파'], 'duration': 0.3},
    {'freq': 음계['솔'], 'duration': 0.6},
]
play_sequence(melody)`,
    tags: ['sound', 'audio', 'sequence', 'melody', 'music', 'song', '음계'],
  },
  {
    id: 'play_sfx',
    category: 'sound',
    title: { ko: '효과음 재생 (효과음)', en: '효과음 / sfx' },
    description: {
      ko: '내장 효과음을 재생합니다. 게임, 장면 전환, 미디어아트 피드백에 유용합니다. 효과음(), sfx(), play_sfx()를 모두 사용할 수 있습니다.',
      en: 'Plays a built-in sound effect. Useful for games, scene changes, and media-art feedback. 효과음(), sfx(), and play_sfx() are all supported.',
    },
    signature: "효과음(name)",
    params: [
      { name: 'name', type: 'string', default: '-', desc: {
        ko: "효과음 이름: 'jump', 'coin', 'powerup', 'power_up', 'death', 'fireball', 'pipe', '1up', 'oneup', 'select', 'warning', 'explosion', 'laser', 'success', 'error', 'hint', 'run', 'levelup', 'level_up'",
        en: "SFX name: 'jump', 'coin', 'powerup', 'power_up', 'death', 'fireball', 'pipe', '1up', 'oneup', 'select', 'warning', 'explosion', 'laser', 'success', 'error', 'hint', 'run', 'levelup', 'level_up'",
      } },
    ],
    code: `from vpython import *
효과음("coin")
sleep(0.5)
효과음("success")
sleep(0.5)
효과음("explosion")`,
    tags: ['sound', 'audio', 'sfx', 'effect', 'game', 'coin', 'jump', 'explosion', '효과음'],
  },
  {
    id: 'bgm',
    category: 'sound',
    title: { ko: '배경음악 (배경음악 / 배경음악정지)', en: 'BGM' },
    description: {
      ko: '내장 배경음악을 반복 재생하거나 정지합니다. 작품의 분위기를 빠르게 만들 수 있어 갤러리 예제에 잘 어울립니다.',
      en: 'Starts or stops a built-in background music loop. Great for giving gallery pieces an immediate mood.',
    },
    signature: "배경음악(name)  /  배경음악정지()",
    params: [
      { name: 'name', type: 'string', default: '-', desc: {
        ko: "배경음악 이름: 'adventure', 'explore', 'battle', 'peaceful', 'victory'",
        en: "BGM name: 'adventure', 'explore', 'battle', 'peaceful', 'victory'",
      } },
    ],
    code: `from vpython import *
배경음악("adventure")
sphere(color=color.gold, radius=0.5)
sleep(5)
배경음악정지()`,
    tags: ['sound', 'audio', 'bgm', 'music', 'background', 'loop', '배경음악'],
  },
  {
    id: 'note-constants',
    category: 'sound',
    title: { ko: '음계와 노트 상수', en: 'Scales and Note Constants' },
    description: {
      ko: '숫자 주파수를 직접 쓰지 않도록 note 상수와 한글 음계 리스트를 제공합니다. 음계, 높은음계, 낮은음계는 번호와 이름으로 모두 접근할 수 있습니다.',
      en: 'Use note constants and Korean scale lists instead of raw frequencies. 음계, 높은음계, and 낮은음계 work with both indexes and names.',
    },
    signature: "음계['도'], 높은음계['솔'], 낮은음계[0], note.C4",
    params: [
      { name: "음계['도'] / scale['C']", type: 'number', default: 'note.C4', desc: { ko: '가운데 옥타브 도', en: 'Middle octave C' } },
      { name: "높은음계['도']", type: 'number', default: 'note.C5', desc: { ko: '높은 도', en: 'High C' } },
      { name: "낮은음계['도']", type: 'number', default: 'note.C3', desc: { ko: '낮은 도', en: 'Low C' } },
      { name: 'note.C3',  type: 'number', default: '130.81',  desc: { ko: '도3', en: 'C3' } },
      { name: 'note.C4',  type: 'number', default: '261.63',  desc: { ko: '도4 (가온다)', en: 'C4 (middle C)' } },
      { name: 'note.D4',  type: 'number', default: '293.66',  desc: { ko: '레4', en: 'D4' } },
      { name: 'note.E4',  type: 'number', default: '329.63',  desc: { ko: '미4', en: 'E4' } },
      { name: 'note.F4',  type: 'number', default: '349.23',  desc: { ko: '파4', en: 'F4' } },
      { name: 'note.G4',  type: 'number', default: '392.00',  desc: { ko: '솔4', en: 'G4' } },
      { name: 'note.A4',  type: 'number', default: '440.00',  desc: { ko: '라4 (기준음)', en: 'A4 (concert pitch)' } },
      { name: 'note.B4',  type: 'number', default: '493.88',  desc: { ko: '시4', en: 'B4' } },
      { name: 'note.C5',  type: 'number', default: '523.25',  desc: { ko: '도5', en: 'C5' } },
      { name: 'note.C6',  type: 'number', default: '1046.50', desc: { ko: '도6', en: 'C6' } },
    ],
    code: `from vpython import *
for n in ['도', '미', '솔', '높은도']:
    소리(음계[n], 0.25)
    sleep(0.3)

화음([낮은음계['도'], 음계['솔'], 높은음계['도']], 1.0)`,
    tags: ['sound', 'audio', 'note', 'constant', 'frequency', 'pitch', '음계', '높은음계', '낮은음계'],
  },
  {
    id: 'instrument',
    category: 'sound',
    title: { ko: '악기 음색 (악기)', en: 'Instrument Presets' },
    description: {
      ko: '피아노, 기타, 플루트, 칩튠 같은 악기 느낌으로 음표를 재생합니다. 악기()는 음표()처럼 자동으로 기다립니다.',
      en: 'Plays notes with instrument-like presets such as piano, guitar, flute, and chiptune. 악기() waits automatically like 음표().',
    },
    signature: "악기(instrument, name, duration=0.5, volume=None)",
    params: [
      { name: 'instrument', type: 'string', default: "'피아노'", desc: { ko: "악기 이름: '피아노', '오르간', '기타', '플루트', '트럼펫', '베이스', '칩튠', '신스'", en: "Instrument: 'piano', 'organ', 'guitar', 'flute', 'trumpet', 'bass', 'chiptune', 'synth'" } },
      { name: 'name', type: 'string', default: "'도4'", desc: { ko: "음표 이름 ('도4', '솔#4', 'C4')", en: "Note name ('도4', '솔#4', 'C4')" } },
      { name: 'duration', type: 'number', default: '0.5', desc: { ko: '재생 시간 (초)', en: 'Duration (seconds)' } },
      { name: 'volume', type: 'number', default: 'None', desc: { ko: '직접 지정하지 않으면 악기별 기본 음량 사용', en: 'Uses the preset volume unless specified' } },
    ],
    code: `from vpython import *
악기("피아노", "도4", 0.4)
악기("기타", "미4", 0.4)
악기("칩튠", "솔4", 0.4)

화음([음계['도'], 음계['미'], 음계['솔']], 1.0, type='triangle')`,
    tags: ['sound', 'audio', 'instrument', 'music', '악기', '피아노', '기타', '칩튠'],
  },

  // ━━━ charts ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'scatter3d',
    category: 'charts',
    title: { ko: '3D 산점도 (scatter3d)', en: 'scatter3d' },
    description: {
      ko: '3D 공간에 데이터 포인트를 표시합니다. 한글 별명: 산점도',
      en: 'Plots data points in 3D space. Korean alias: 산점도',
    },
    signature: "산점도(points, colors=None, size=0.08, colormap='rainbow', opacity=0.9, show_axes=True)",
    params: [
      { name: 'points',    type: 'list',    default: '-',          desc: { ko: '3D 좌표 리스트 [[x,y,z], ...]', en: '3D coordinate list [[x,y,z], ...]' } },
      { name: 'colors',    type: 'list',    default: 'None',       desc: { ko: '각 점의 색상 리스트', en: 'Color list for each point' } },
      { name: 'size',      type: 'number',  default: '0.08',       desc: { ko: '점 크기', en: 'Point size' } },
      { name: 'colormap',  type: 'string',  default: "'rainbow'",  desc: { ko: '색상맵', en: 'Colormap' } },
      { name: 'opacity',   type: 'number',  default: '1.0',        desc: { ko: '불투명도 (0~1)', en: 'Opacity (0–1)' } },
      { name: 'show_axes', type: 'boolean', default: 'True',       desc: { ko: '축 표시 여부', en: 'Show axes' } },
    ],
    code: `from vpython import *
import random
points = [[random.uniform(-2,2), random.uniform(-2,2), random.uniform(-2,2)] for _ in range(50)]
산점도(points, colormap='rainbow', size=0.1)`,
    tags: ['chart', 'graph', 'scatter', 'data', 'visualization', '산점도'],
  },
  {
    id: 'surface3d',
    category: 'charts',
    title: { ko: '3D 표면 그래프 (surface3d)', en: 'surface3d' },
    description: {
      ko: '2D 배열 데이터를 3D 표면으로 시각화합니다. 한글 별명: 표면그래프',
      en: 'Visualizes 2D array data as a 3D surface. Korean alias: 표면그래프',
    },
    signature: "표면그래프(z_data, x_range=None, y_range=None, colormap='viridis', wireframe=True, opacity=0.85, show_axes=True)",
    params: [
      { name: 'z_data',    type: 'list',    default: '-',           desc: { ko: '2D 높이 데이터', en: '2D height data' } },
      { name: 'x_range',   type: 'list',    default: 'None',        desc: { ko: 'x축 범위 [min, max]', en: 'x-axis range [min, max]' } },
      { name: 'y_range',   type: 'list',    default: 'None',        desc: { ko: 'y축 범위 [min, max]', en: 'y-axis range [min, max]' } },
      { name: 'colormap',  type: 'string',  default: "'viridis'",   desc: { ko: '색상맵', en: 'Colormap' } },
      { name: 'wireframe', type: 'boolean', default: 'False',       desc: { ko: '와이어프레임 표시', en: 'Show wireframe' } },
      { name: 'opacity',   type: 'number',  default: '1.0',         desc: { ko: '불투명도 (0~1)', en: 'Opacity (0–1)' } },
    ],
    code: `from vpython import *
import math
z = []
for i in range(20):
    row = []
    for j in range(20):
        x, y = (i - 10) * 0.3, (j - 10) * 0.3
        row.append(math.sin(math.sqrt(x**2 + y**2)))
    z.append(row)
표면그래프(z, colormap='viridis')`,
    tags: ['chart', 'graph', 'surface', 'data', 'visualization', 'heatmap', '표면그래프'],
  },
  {
    id: 'line3d',
    category: 'charts',
    title: { ko: '3D 선 그래프 (line3d)', en: 'line3d' },
    description: {
      ko: '3D 공간에 선을 그려 데이터의 흐름을 표현합니다. 한글 별명: 선그래프',
      en: 'Draws lines in 3D space to show data trends. Korean alias: 선그래프',
    },
    signature: "선그래프(points, color=color.white, width=0.03, show_axes=True)",
    params: [
      { name: 'points',    type: 'list',    default: '-',          desc: { ko: '3D 좌표 리스트 [[x,y,z], ...]', en: '3D coordinate list [[x,y,z], ...]' } },
      { name: 'color',     type: 'vector',  default: 'color.white', desc: { ko: '선 색상', en: 'Line color' } },
      { name: 'width',     type: 'number',  default: '0.03',       desc: { ko: '선 두께', en: 'Line width' } },
      { name: 'show_axes', type: 'boolean', default: 'True',       desc: { ko: '축 표시 여부', en: 'Show axes' } },
    ],
    code: `from vpython import *
import math
points = [[t * 0.1, math.sin(t * 0.1), math.cos(t * 0.1)] for t in range(60)]
선그래프(points, color=색상['하늘'], width=0.05)`,
    tags: ['chart', 'graph', 'line', 'data', 'visualization', 'curve', '선그래프'],
  },
  {
    id: 'bar3d',
    category: 'charts',
    title: { ko: '3D 막대 그래프 (bar3d)', en: 'bar3d' },
    description: {
      ko: '3D 공간에 막대 그래프를 그립니다. 한글 별명: 막대그래프',
      en: 'Draws a 3D bar chart. Korean alias: 막대그래프',
    },
    signature: "막대그래프(values, labels=None, colors=None, colormap='plasma', bar_width=0.6, show_axes=True)",
    params: [
      { name: 'values',    type: 'list',    default: '-',          desc: { ko: '막대 높이 리스트', en: 'List of bar heights' } },
      { name: 'labels',    type: 'list',    default: 'None',       desc: { ko: '각 막대의 이름', en: 'Label for each bar' } },
      { name: 'colors',    type: 'list',    default: 'None',       desc: { ko: '각 막대의 색상', en: 'Color for each bar' } },
      { name: 'colormap',  type: 'string',  default: "'plasma'",   desc: { ko: '색상맵', en: 'Colormap' } },
      { name: 'bar_width', type: 'number',  default: '0.6',        desc: { ko: '막대 폭', en: 'Bar width' } },
      { name: 'show_axes', type: 'boolean', default: 'True',       desc: { ko: '축 표시 여부', en: 'Show axes' } },
    ],
    code: `from vpython import *
values = [3, 7, 2, 5, 9, 4]
labels = ['월', '화', '수', '목', '금', '토']
막대그래프(values, labels=labels, colormap='plasma')`,
    tags: ['chart', 'graph', 'bar', 'data', 'visualization', 'column', '막대그래프'],
  },

  // ━━━ materials / textures ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'texture-attribute',
    category: 'materials',
    title: { ko: '텍스처 속성 (texture)', en: 'texture attribute' },
    description: {
      ko: '도형 표면에 이미지/패턴을 입힙니다. 프리셋 문자열, 외부 URL, data URI를 모두 지원합니다.',
      en: 'Apply an image or pattern to an object surface. Accepts preset strings, external URLs, and data URIs.',
    },
    signature: "box(texture=textures.wood)  # 또는 texture='https://...'",
    params: [
      { name: 'preset', type: 'string', default: '-', desc: { ko: 'textures.wood처럼 미리 정의된 프리셋', en: 'Preset like textures.wood' } },
      { name: 'URL',    type: 'string', default: '-', desc: { ko: 'https:// 또는 http://로 시작하는 외부 이미지', en: 'External image starting with https:// or http://' } },
      { name: 'data',   type: 'string', default: '-', desc: { ko: "data:image/... 형태의 인라인 이미지", en: 'data:image/... inline image' } },
    ],
    code: `from vpython import *
# 1) 프리셋
floor = box(pos=vector(0, -1, 0), size=vector(20, 0.2, 20), texture=textures.checker)
log = box(pos=vector(0, 0, 0), size=vector(2, 1, 1), texture=textures.wood)
ball = sphere(pos=vector(0, 1.5, 0), radius=0.7, texture=textures.metal)

# 2) 외부 URL — 학교 위키, 위키미디어 등
earth = sphere(pos=vector(4, 1, 0), radius=1,
               texture="https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Earthmap1000x500compac.jpg/1024px-Earthmap1000x500compac.jpg")

# 3) 런타임에 변경 가능
log.texture = textures.brick`,
    tags: ['texture', 'material', 'image', 'map', 'surface', '텍스처', '재질'],
  },
  {
    id: 'textures-presets',
    category: 'materials',
    title: { ko: '텍스처 프리셋 (textures)', en: 'textures namespace' },
    description: {
      ko: '20종 프로시저럴 프리셋 — 외부 이미지 없이 즉시 사용. 모든 프리셋은 RepeatWrapping으로 반복됩니다.',
      en: '20 procedural presets — usable immediately without external images. All wrap with RepeatWrapping.',
    },
    signature: "textures.wood, textures.galaxy, textures.water, ...",
    params: [
      { name: 'wood',    type: 'preset', default: '-', desc: { ko: '나뭇결', en: 'Wood grain' } },
      { name: 'metal',   type: 'preset', default: '-', desc: { ko: '브러시드 메탈', en: 'Brushed metal' } },
      { name: 'stones',  type: 'preset', default: '-', desc: { ko: '둥근 자갈', en: 'Rounded stones' } },
      { name: 'granite', type: 'preset', default: '-', desc: { ko: '화강암', en: 'Granite speckle' } },
      { name: 'gravel',  type: 'preset', default: '-', desc: { ko: '자갈 / 모래', en: 'Gravel / sand' } },
      { name: 'rough',   type: 'preset', default: '-', desc: { ko: '거친 표면', en: 'Rough noise' } },
      { name: 'rug',     type: 'preset', default: '-', desc: { ko: '러그/카펫 무늬', en: 'Rug pattern' } },
      { name: 'stucco',  type: 'preset', default: '-', desc: { ko: '벽 마감재', en: 'Stucco wall' } },
      { name: 'flower',  type: 'preset', default: '-', desc: { ko: '꽃무늬 벽지', en: 'Flower wallpaper' } },
      { name: 'earth',   type: 'preset', default: '-', desc: { ko: '간이 지구', en: 'Stylized earth' } },
      { name: 'brick',   type: 'preset', default: '-', desc: { ko: '벽돌', en: 'Brick wall' } },
      { name: 'checker', type: 'preset', default: '-', desc: { ko: '체크무늬', en: 'Checkerboard' } },
      { name: 'grid',    type: 'preset', default: '-', desc: { ko: '격자', en: 'Grid lines' } },
      { name: 'galaxy',  type: 'preset', default: '-', desc: { ko: '나선 은하', en: 'Spiral galaxy' } },
      { name: 'nebula',  type: 'preset', default: '-', desc: { ko: '성운(분홍·보라·청록)', en: 'Nebula clouds' } },
      { name: 'water',   type: 'preset', default: '-', desc: { ko: '물결', en: 'Water ripples' } },
      { name: 'lava',    type: 'preset', default: '-', desc: { ko: '용암', en: 'Lava with cracks' } },
      { name: 'ice',     type: 'preset', default: '-', desc: { ko: '얼음 결정', en: 'Ice crystals' } },
      { name: 'circuit', type: 'preset', default: '-', desc: { ko: 'PCB / 회로기판', en: 'Circuit board' } },
      { name: 'fire',    type: 'preset', default: '-', desc: { ko: '불꽃', en: 'Flames' } },
    ],
    code: `from vpython import *
# 모든 프리셋 한눈에 보기 (5x4 그리드)
names = ['wood','metal','stones','granite','gravel',
         'rough','rug','stucco','flower','earth',
         'brick','checker','grid','galaxy','nebula',
         'water','lava','ice','circuit','fire']
for i, n in enumerate(names):
    x = (i % 5 - 2) * 1.6
    y = 2.4 - (i // 5) * 1.6
    box(pos=vector(x, y, 0), size=vector(1.4, 1.4, 0.2),
        texture=getattr(textures, n))
    label(pos=vector(x, y - 0.95, 0), text=n, height=10)`,
    tags: ['texture', 'preset', 'wood', 'metal', 'galaxy', 'nebula', 'water', 'lava', 'ice', 'fire', '프리셋'],
  },
  {
    id: 'math_functions',
    category: 'vectors',
    title: { ko: '수학 함수와 난수 (sin, pi, random)', en: 'Math functions & random' },
    description: {
      ko: 'from vpython import * 를 하면 GlowScript처럼 sin, cos, sqrt, pi 등 math 모듈의 이름을 바로 사용할 수 있습니다. random()은 0 이상 1 미만의 난수이고, random.randint(1, 6)처럼 random 모듈의 함수도 그대로 됩니다. arange, sign, combin, clock, msclock, print_options도 제공합니다.',
      en: 'After from vpython import *, math names such as sin, cos, sqrt and pi are available directly, as in GlowScript. random() returns a number in [0, 1), and random.randint(1, 6) also works. arange, sign, combin, clock, msclock and print_options are provided too.',
    },
    signature: "sin(x), cos(x), sqrt(x), pi, random(), arange(start, stop, step), sign(x), combin(n, k), clock(), print_options(digits=3)",
    params: [
      { name: 'random()', type: 'function', default: '-', desc: { ko: '0 이상 1 미만 난수', en: 'Random number in [0, 1)' } },
      { name: 'arange(start, stop, step)', type: 'function', default: '-', desc: { ko: 'start부터 stop 전까지 step 간격 목록', en: 'List from start to stop by step' } },
      { name: 'print_options(digits=n)', type: 'function', default: '4', desc: { ko: '벡터 출력 자릿수', en: 'Digits when printing vectors' } },
    ],
    code: `from vpython import *

for i in range(12):
    각 = 2 * pi * i / 12
    sphere(pos=vector(3 * cos(각), 3 * sin(각), 0), radius=0.3,
           color=color.hsv_to_rgb(vector(i / 12, 1, 1)))

for t in arange(0, 1, 0.25):
    box(pos=vector(t * 4 - 2, -3, 0), size=vector(0.5, 0.5, 0.5))

print(sqrt(16), sign(-2), combin(5, 2))
print(random(), random.randint(1, 6))`,
    tags: ['math', 'sin', 'cos', 'pi', 'sqrt', 'random', 'arange', 'sign', 'combin', 'clock', 'print_options', '수학', '난수'],
  },
  {
    id: 'vector_functions',
    category: 'vectors',
    title: { ko: '벡터 함수형 (proj, comp, diff_angle, rotate)', en: 'proj / comp / diff_angle / rotate' },
    description: {
      ko: 'GlowScript의 함수형 벡터 연산입니다. 메서드(a.proj(b))와 같은 결과를 냅니다. rotate(v, angle=, axis=)는 회전한 새 벡터를 돌려주고, rotate(obj, angle=, axis=)는 3D 객체를 그 자리에서 회전시킵니다. v.norm()은 v.hat, v.equals(w)는 v == w와 같고, vector.random()은 각 성분이 -1~1인 난수 벡터입니다.',
      en: 'GlowScript-style vector functions, equal to the methods (a.proj(b)). rotate(v, angle=, axis=) returns a rotated vector; rotate(obj, ...) rotates a 3D object in place. v.norm() equals v.hat, v.equals(w) equals v == w, and vector.random() gives a vector with components in -1..1.',
    },
    signature: "proj(a, b); comp(a, b); diff_angle(a, b); rotate(v, angle=, axis=); v.norm(); v.equals(w); vector.random()",
    params: [
      { name: 'a, b', type: 'vector', default: '-', desc: { ko: '벡터', en: 'Vectors' } },
      { name: 'angle', type: 'number', default: '0', desc: { ko: '회전각 (라디안)', en: 'Angle in radians' } },
      { name: 'axis', type: 'vector', default: 'vector(0,0,1)', desc: { ko: '회전축', en: 'Rotation axis' } },
    ],
    code: `from vpython import *

a = vector(1, 1, 0)
b = vector(1, 0, 0)
print(proj(a, b))        # <1, 0, 0>
print(comp(a, b))        # 1.0
print(diff_angle(a, b))  # 0.785... (45도)

v = rotate(b, angle=pi / 2, axis=vector(0, 0, 1))
print(v)                 # <0, 1, 0>

bar = cylinder(axis=vector(2, 0, 0), radius=0.2)
rotate(bar, angle=pi / 4, axis=vector(0, 0, 1))
print(vector.random())`,
    tags: ['vector', 'proj', 'comp', 'diff_angle', 'rotate', 'norm', 'equals', 'random', '투영', '회전'],
  },
  {
    id: 'color_hsv',
    category: 'colors',
    title: { ko: '색 변환 (hsv_to_rgb, rgb_to_hsv)', en: 'color.hsv_to_rgb / rgb_to_hsv' },
    description: {
      ko: '색상(h)·채도(s)·명도(v)를 RGB로, 또는 그 반대로 바꿉니다. 각 성분은 0~1입니다. h를 0에서 1까지 돌리면 무지개 순서로 색이 바뀌므로 색 애니메이션에 사용합니다.',
      en: 'Converts hue, saturation and value to RGB and back. Each component is in 0..1. Sweeping h from 0 to 1 walks through the rainbow, which is handy for color animation.',
    },
    signature: "color.hsv_to_rgb(vector(h, s, v)); color.rgb_to_hsv(vector(r, g, b))",
    params: [
      { name: 'h', type: 'number', default: '-', desc: { ko: '색상 0~1 (0 빨강, 1/3 초록, 2/3 파랑)', en: 'Hue 0..1 (0 red, 1/3 green, 2/3 blue)' } },
      { name: 's', type: 'number', default: '-', desc: { ko: '채도 0~1', en: 'Saturation 0..1' } },
      { name: 'v', type: 'number', default: '-', desc: { ko: '명도 0~1', en: 'Value 0..1' } },
    ],
    code: `from vpython import *

ball = sphere(radius=1)
h = 0
while True:
    rate(60)
    h = (h + 0.005) % 1
    ball.color = color.hsv_to_rgb(vector(h, 1, 1))`,
    tags: ['color', 'hsv', 'rgb', 'hsv_to_rgb', 'rgb_to_hsv', '색상', '무지개', 'rainbow'],
  },
  {
    id: 'object_length_size',
    category: 'objects',
    title: { ko: '길이와 크기 (length, size)', en: 'length / size' },
    description: {
      ko: 'cylinder, cone, arrow, helix의 length는 axis의 길이와 연동됩니다. length를 바꾸면 axis가 같은 방향으로 늘어나거나 줄어듭니다. cylinder와 cone의 size는 vector(length, 2*radius, 2*radius)이고, sphere의 size는 지름 벡터입니다. ellipsoid는 size 대신 length, height, width로도 만들 수 있습니다. 생성할 때 length=를 주면 axis 방향으로 그 길이가 됩니다.',
      en: 'length of cylinder, cone, arrow and helix is tied to the axis magnitude. size of cylinder and cone is vector(length, 2*radius, 2*radius); sphere.size is the diameter vector. ellipsoid also accepts length, height and width. Passing length= at creation sets the axis length.',
    },
    signature: "obj.length = 3; cylinder(length=2, radius=0.5); sphere().size; ellipsoid(length=2, height=1, width=3)",
    params: [
      { name: 'length', type: 'number', default: 'axis의 길이', desc: { ko: 'axis 방향 길이', en: 'Length along axis' } },
      { name: 'size', type: 'vector', default: '-', desc: { ko: '(길이, 높이, 폭)', en: '(length, height, width)' } },
    ],
    code: `from vpython import *

봉 = cylinder(pos=vector(-2, 0, 0), axis=vector(1, 0, 0), radius=0.2, length=1)
공 = sphere(pos=vector(2, 0, 0), radius=0.5)
print(공.size)      # <1, 1, 1>

while True:
    rate(60)
    봉.length = 1 + abs(sin(clock()))   # 축 방향으로 늘었다 줄었다`,
    tags: ['length', 'size', 'axis', 'cylinder', 'cone', 'arrow', 'helix', 'ellipsoid', '길이', '크기'],
  },
  {
    id: 'scene_size_objects',
    category: 'scene',
    title: { ko: '화면 크기와 객체 목록 (scene.width, scene.objects)', en: 'scene.width / scene.objects' },
    description: {
      ko: 'scene.width/height를 지정할 수 있지만 기본 화면의 실제 크기는 앱 배치가 정합니다. 추가 canvas는 지정 크기를 사용 가능한 공간 안에서 반영합니다. scene.objects는 현재 보이는 3D 객체 목록이며, 모두 숨기거나 개수를 셀 때 사용합니다. scene.align과 scene.resizable은 값을 기억하며, caption_anchor/title_anchor는 위젯 영역을 지정합니다.',
      en: 'The default viewport follows app layout. Extra canvases honor requested dimensions within available space. scene.objects lists the visible 3D objects, useful for hiding everything or counting. scene.align and scene.resizable are stored; caption_anchor/title_anchor identify widget areas.',
    },
    signature: "scene.width = 800; scene.height = 500; for obj in scene.objects: obj.visible = False",
    params: [
      { name: 'scene.width / height', type: 'number', default: '화면 배치', desc: { ko: '기본 화면은 앱 배치, 추가 canvas는 사용 가능한 공간 안에서 크기 반영', en: 'Default view follows app layout; extra canvases resize within available space' } },
      { name: 'scene.objects', type: 'list', default: '[]', desc: { ko: '보이는 3D 객체 목록', en: 'Visible 3D objects' } },
    ],
    code: `from vpython import *

scene.width = 800
scene.height = 500

colors = [color.red, color.orange, color.yellow, color.green, color.blue]
for i in range(5):
    sphere(pos=vector(i - 2, 0, 0), radius=0.3, color=colors[i])

print(len(scene.objects), '개')
sleep(1)
for obj in scene.objects:
    obj.visible = False`,
    tags: ['scene', 'width', 'height', 'objects', 'align', '화면', '크기', '목록'],
  },
];

const docs = [...shapeGuides.map(doc=>({...doc,practice:!!doc.code})), ...apiDocs.map(annotateDocOrigin)];
export const apiReferenceDocs = docs.filter(doc=>doc.origin !== 'guide');

// ─── 유틸리티 함수 ──────────────────────────────────────────

/**
 * 카테고리 ID로 해당 문서 항목 필터링
 * @param {string} catId - 카테고리 키 (예: 'objects')
 * @returns {Array} 해당 카테고리의 문서 배열
 */
export function getDocsByCategory(catId) {
  return docs.filter((d) => d.category === catId);
}

/**
 * ID로 문서 항목 검색
 * @param {string} id - 문서 고유 ID (예: 'sphere')
 * @returns {Object|undefined} 문서 객체 또는 undefined
 */
export function getDocById(id) {
  return docs.find((d) => d.id === id);
}

/**
 * 검색어로 문서를 검색하고 관련도 순으로 정렬
 * @param {string} query - 검색어
 * @param {string} locale - 'ko' 또는 'en'
 * @returns {Array} 관련도 점수가 높은 순으로 정렬된 문서 배열
 */
export function searchDocs(query, locale = 'ko') {
  if (!query || !query.trim()) return [];

  const tokens = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const scored = docs.map((doc) => {
    let score = 0;

    const titleText = [doc.title?.[locale],doc.title?.ko,doc.title?.en].filter(Boolean).join(' ').toLowerCase();
    const descText = [doc.description?.[locale] || doc.description?.en || '', doc.explain?.[locale] || '', ...((doc.changes || []).map(step => step.instruction?.[locale] || '')), ...(doc.extensionNotes || []).map(note=>note[locale] || '')].join(' ').toLowerCase();
    const sigText = (doc.signature || '').toLowerCase();
    const idText = doc.id.toLowerCase();

    for (const token of tokens) {
      // id 정확 일치: +10
      if (idText === token) score += 10;

      // title 포함: +10
      if (titleText.includes(token)) score += 10;

      // signature 포함: +8
      if (sigText.includes(token)) score += 8;

      // description 포함: +5
      if (descText.includes(token)) score += 5;

      // tags 정확 일치: +6
      if (doc.tags && doc.tags.some((t) => t.toLowerCase() === token)) score += 6;

      // params 이름 포함: +3
      if (doc.params && doc.params.some((p) => p.name.toLowerCase().includes(token))) score += 3;
    }

    return { ...doc, _score: score };
  });

  return scored
    .filter((d) => d._score > 0)
    .sort((a, b) => b._score - a._score);
}

export default docs;
