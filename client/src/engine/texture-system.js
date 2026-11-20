/**
 * VPyLab — 텍스처 시스템
 * 프로시저럴 프리셋(textures.wood 등)과 외부 URL/data URI를 Three.js Texture로 변환
 */

import * as THREE from 'three';

const TEXTURE_CACHE = new Map();
const textureLoads = new Map();

export function whenTexturesReady() { return Promise.all([...textureLoads.values()]); }
// WebGL accepts cross-origin images when their server permits anonymous CORS requests.
const URL_LOADER = new THREE.TextureLoader();
URL_LOADER.setCrossOrigin('anonymous');

// Vite가 파일을 작품과 같은 출처에서 제공하며 실제로 선택한 재질만 내려받습니다.
const surfaceImages = {
  jupiter: new URL('../assets/planets/jupiter.jpg', import.meta.url).href,
  saturn: new URL('../assets/planets/saturn.jpg', import.meta.url).href,
  sun: new URL('../assets/planets/sun.jpg', import.meta.url).href,
  earth: new URL('../assets/planets/earth.jpg', import.meta.url).href,
  moon: new URL('../assets/planets/moon.jpg', import.meta.url).href,
};

function drawGasGiant(ctx, size) {
  for (let y = 0; y < size; y++) {
    const latitude = y / size;
    const band = Math.sin(latitude * 63 + .8*Math.sin(latitude*19));
    const glow = .5 + .5*band;
    ctx.fillStyle = `rgb(${170+60*glow}, ${117+88*glow}, ${87+86*glow})`;
    ctx.fillRect(0,y,size,1);
  }
  ctx.fillStyle = '#b66a47';
  ctx.beginPath(); ctx.ellipse(size*.61,size*.61,size*.075,size*.026,.04,0,2*Math.PI); ctx.fill();
}

const PRESET_GENERATORS = {
  sun(ctx, size) {
    // 느린 연결에서도 광구 전체에 같은 바탕색을 표시합니다.
    ctx.fillStyle = '#f7c46f';
    ctx.fillRect(0, 0, size, size);
  },
  moon: drawGranite,
  jupiter: drawGasGiant,
  saturn: drawGasGiant,
  wood: drawWood,
  metal: drawMetal,
  stones: drawStones,
  granite: drawGranite,
  gravel: drawGravel,
  rough: drawRough,
  rug: drawRug,
  stucco: drawStucco,
  flower: drawFlower,
  earth: drawEarth,
  brick: drawBrick,
  checker: drawChecker,
  grid: drawGrid,
  galaxy: drawGalaxy,
  nebula: drawNebula,
  water: drawWater,
  lava: drawLava,
  ice: drawIce,
  circuit: drawCircuit,
  fire: drawFire,
};

let compressedModule;
export function releaseSurfaceImages(renderer) {
  compressedModule?.then(module => module.releaseEarth(renderer), () => {});
}

// 지구를 KTX2(압축 텍스처)로 바꿔 끼우는 경로는 끕니다. 변환기(wasm·Worker)가 아이패드에서 검증되지 않았고,
// 재실행·장면 정리와 겹치면 임시 그림이 남는 경쟁 조건이 있습니다. 다른 천체와 같은 JPEG 경로를 씁니다.
const USE_COMPRESSED_EARTH = false;

export function surfacePlaceholder(spec, renderer) {
  if (!USE_COMPRESSED_EARTH) return resolveTexture(spec);
  return spec === 'preset:earth' && renderer?.isWebGLRenderer ? resolveTexture('earth') : resolveTexture(spec);
}

export function finishSurfaceImage(material, spec, renderer) {
  if (!USE_COMPRESSED_EARTH || spec !== 'preset:earth' || !renderer?.isWebGLRenderer) return;
  compressedModule ??= import('./compressed-earth.js');
  const placeholder = material.map;
  const ready = compressedModule.then(module => module.loadEarth(renderer))
    .catch(() => resolveTexture(spec)).then(texture => {
      if (!texture || material.map !== placeholder || material.userData.textureSpec !== spec) return;
      material.map = material.emissiveMap = texture;
      material.needsUpdate = true;
    });
  textureLoads.set('compressed-earth', ready);
}

export const PRESET_NAMES = Object.keys(PRESET_GENERATORS);

/**
 * 텍스처 spec → Three.Texture
 * - "preset:<name>": 프로시저럴 프리셋
 * - "https://..." / "http://..." / "data:...": 외부 이미지 로드
 * - falsy: null 반환
 */
export function resolveTexture(spec) {
  if (!spec || typeof spec !== 'string') return null;
  if (TEXTURE_CACHE.has(spec)) return TEXTURE_CACHE.get(spec);

  let texture = null;

  if (spec.startsWith('preset:')) {
    const name = spec.slice(7);
    texture = makeProceduralTexture(name);
    if (Object.hasOwn(surfaceImages, name)) {
      textureLoads.set(spec, new Promise(done => {
        new THREE.ImageLoader().load(surfaceImages[name], image => {
          // 작은 임시 캔버스를 이미 그렸다면 GPU 저장소가 그 크기로 고정돼 있습니다.
          // 같은 재질 참조를 유지하면서 최종 이미지 크기로 다시 할당합니다.
          texture.dispose();
          texture.image = image;
          texture.needsUpdate = true;
          done();
        }, undefined, done);
      }));
    }
  } else if (
    spec.startsWith('http://') ||
    spec.startsWith('https://') ||
    spec.startsWith('data:image')
  ) {
    let complete;
    const ready = new Promise(resolve => { complete = resolve; });
    textureLoads.set(spec, ready);
    texture = URL_LOADER.load(spec, () => complete(), undefined, err => {
      console.warn(`[texture] 로드 실패: ${spec}`, err?.message || err);
      complete();
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  } else {
    // 알 수 없는 형식 — 프리셋 이름만 적었을 가능성
    if (PRESET_GENERATORS[spec]) {
      texture = makeProceduralTexture(spec);
    }
  }

  if (texture) TEXTURE_CACHE.set(spec, texture);
  return texture;
}

function makeProceduralTexture(name) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gen = PRESET_GENERATORS[name] || drawChecker;
  gen(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// === 프로시저럴 패턴 ===

function drawWood(ctx, size) {
  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0, '#8b5a2b');
  grad.addColorStop(0.5, '#a0522d');
  grad.addColorStop(1, '#6f4518');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 80; i++) {
    const y = Math.random() * size;
    ctx.strokeStyle = `rgba(60, 30, 10, ${0.05 + Math.random() * 0.2})`;
    ctx.lineWidth = 0.5 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(
      size * 0.3, y + (Math.random() - 0.5) * 25,
      size * 0.7, y + (Math.random() - 0.5) * 25,
      size, y + (Math.random() - 0.5) * 5,
    );
    ctx.stroke();
  }
}

function drawMetal(ctx, size) {
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#c8c8c8');
  grad.addColorStop(0.5, '#909090');
  grad.addColorStop(1, '#a8a8a8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 600; i++) {
    const y = Math.random() * size;
    ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.12})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, y);
    ctx.lineTo(Math.random() * size, y);
    ctx.stroke();
  }
}

function drawStones(ctx, size) {
  ctx.fillStyle = '#5a5a50';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 12 + Math.random() * 30;
    const grad = ctx.createRadialGradient(
      x - r * 0.3, y - r * 0.3, r * 0.1,
      x, y, r,
    );
    const hue = 25 + Math.random() * 30;
    grad.addColorStop(0, `hsl(${hue}, 18%, ${45 + Math.random() * 20}%)`);
    grad.addColorStop(1, '#3a3a30');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGranite(ctx, size) {
  ctx.fillStyle = '#888884';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 7000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const g = Math.random();
    if (g < 0.3) ctx.fillStyle = `rgba(40,40,40,${0.5 + Math.random() * 0.5})`;
    else if (g < 0.6) ctx.fillStyle = `rgba(170,170,170,${0.5 + Math.random() * 0.4})`;
    else if (g < 0.85) ctx.fillStyle = `rgba(220,220,220,${0.3 + Math.random() * 0.3})`;
    else ctx.fillStyle = `rgba(180, 90, 60, ${0.4 + Math.random() * 0.4})`;
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawGravel(ctx, size) {
  ctx.fillStyle = '#5e564a';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 280; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 3 + Math.random() * 9;
    ctx.fillStyle = `hsl(${20 + Math.random() * 40}, ${10 + Math.random() * 20}%, ${30 + Math.random() * 35}%)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRough(ctx, size) {
  ctx.fillStyle = '#a09078';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 60;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

function drawRug(ctx, size) {
  const tile = 32;
  for (let y = 0; y < size; y += tile) {
    for (let x = 0; x < size; x += tile) {
      const hue = ((x + y) / size * 360) % 360;
      ctx.fillStyle = `hsl(${hue}, 55%, 50%)`;
      ctx.fillRect(x, y, tile, tile);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let i = 0; i < 30; i++) {
    const y = Math.random() * size;
    ctx.fillRect(0, y, size, 1);
  }
  // 가장자리 어둡게
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.7);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
}

function drawStucco(ctx, size) {
  ctx.fillStyle = '#e0d8c0';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = Math.random();
    ctx.fillStyle = v > 0.5
      ? `rgba(255,255,255,${v * 0.35})`
      : `rgba(100,80,60,${(1 - v) * 0.3})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
}

function drawFlower(ctx, size) {
  ctx.fillStyle = '#fce4ec';
  ctx.fillRect(0, 0, size, size);
  const cells = 4;
  for (let cy = 0; cy < cells; cy++) {
    for (let cx = 0; cx < cells; cx++) {
      const x = (cx + 0.5) * size / cells;
      const y = (cy + 0.5) * size / cells;
      drawSimpleFlower(ctx, x, y, 18 + Math.random() * 8);
    }
  }
}

function drawSimpleFlower(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.random() * Math.PI);
  ctx.fillStyle = `hsl(${330 + Math.random() * 30}, 75%, 60%)`;
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.5, r * 0.32, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff59d';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEarth(ctx, size) {
  ctx.fillStyle = '#1565c0';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#388e3c';
  for (let c = 0; c < 6; c++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    ctx.beginPath();
    for (let p = 0; p < 24; p++) {
      const a = (p / 24) * Math.PI * 2;
      const r = 25 + Math.random() * 45;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (p === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  // 구름
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.beginPath();
    ctx.arc(x, y, 8 + Math.random() * 16, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBrick(ctx, size) {
  ctx.fillStyle = '#3a1810';
  ctx.fillRect(0, 0, size, size);
  const bw = 64;
  const bh = 24;
  for (let y = 0; y < size; y += bh) {
    const offset = (Math.floor(y / bh) % 2) * (bw / 2);
    for (let x = -bw; x < size; x += bw) {
      ctx.fillStyle = `hsl(${10 + Math.random() * 8}, ${55 + Math.random() * 15}%, ${30 + Math.random() * 15}%)`;
      ctx.fillRect(x + offset + 1, y + 1, bw - 2, bh - 2);
    }
  }
}

function drawChecker(ctx, size) {
  const tile = 32;
  for (let y = 0; y < size; y += tile) {
    for (let x = 0; x < size; x += tile) {
      ctx.fillStyle = ((x + y) / tile) % 2 === 0 ? '#1f1f1f' : '#f0f0f0';
      ctx.fillRect(x, y, tile, tile);
    }
  }
}

function drawGrid(ctx, size) {
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  const tile = 32;
  for (let i = 0; i <= size; i += tile) {
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i, size);
    ctx.moveTo(0, i); ctx.lineTo(size, i);
    ctx.stroke();
  }
}

function drawGalaxy(ctx, size) {
  ctx.fillStyle = '#01020a';
  ctx.fillRect(0, 0, size, size);
  // 먼 별
  for (let i = 0; i < 800; i++) {
    const a = 0.1 + Math.random() * 0.7;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  // 나선팔
  const cx = size / 2;
  const cy = size / 2;
  const arms = 3;
  for (let i = 0; i < 7000; i++) {
    const t = Math.random();
    const armOffset = (Math.floor(Math.random() * arms) / arms) * Math.PI * 2;
    const angle = t * Math.PI * 4 + armOffset;
    const radius = t * size * 0.42;
    const wobble = (Math.random() - 0.5) * 30;
    const x = cx + Math.cos(angle) * radius + wobble;
    const y = cy + Math.sin(angle) * radius + wobble;
    const hue = 200 + Math.random() * 60;
    const lum = 55 + Math.random() * 35;
    ctx.fillStyle = `hsla(${hue}, 80%, ${lum}%, ${0.3 + Math.random() * 0.4})`;
    ctx.fillRect(x, y, 2, 2);
  }
  // 밝은 핵
  const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 70);
  grad.addColorStop(0, 'rgba(255,240,200,0.95)');
  grad.addColorStop(0.5, 'rgba(255,170,110,0.4)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
}

function drawNebula(ctx, size) {
  ctx.fillStyle = '#070024';
  ctx.fillRect(0, 0, size, size);
  const colors = [
    [233, 30, 99],   // pink
    [156, 39, 176],  // purple
    [63, 81, 181],   // indigo
    [0, 188, 212],   // cyan
  ];
  for (const [r, g, b] of colors) {
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const rad = 35 + Math.random() * 90;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},0.2)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 별
  for (let i = 0; i < 250; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
}

function drawWater(ctx, size) {
  const base = ctx.createLinearGradient(0, 0, 0, size);
  base.addColorStop(0, '#4fc3f7');
  base.addColorStop(1, '#01579b');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * size;
    ctx.strokeStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.22})`;
    ctx.lineWidth = 0.8 + Math.random() * 1.8;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 4) {
      const wy = y + Math.sin(x * 0.04 + i) * 3;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.6})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
}

function drawLava(ctx, size) {
  ctx.fillStyle = '#180400';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 30 + Math.random() * 70;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, '#ffeb3b');
    grad.addColorStop(0.3, '#ff5722');
    grad.addColorStop(0.7, '#bf360c');
    grad.addColorStop(1, 'rgba(40,10,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 35; i++) {
    ctx.strokeStyle = `rgba(15,5,0,${0.5 + Math.random() * 0.4})`;
    ctx.lineWidth = 1 + Math.random() * 3;
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (Math.random() - 0.5) * 40;
      y += (Math.random() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawIce(ctx, size) {
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#e1f5fe');
  grad.addColorStop(0.5, '#81d4fa');
  grad.addColorStop(1, '#b3e5fc');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.45})`;
    ctx.lineWidth = 0.8 + Math.random() * 1.4;
    ctx.beginPath();
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const rays = 4 + Math.floor(Math.random() * 3);
    for (let r = 0; r < rays; r++) {
      const ang = (r / rays) * Math.PI * 2 + Math.random();
      const len = 12 + Math.random() * 35;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.55})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
}

function drawCircuit(ctx, size) {
  ctx.fillStyle = '#0a3a1a';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#4caf50';
  ctx.lineWidth = 1.5;
  const grid = 32;
  for (let i = 0; i < 100; i++) {
    const sx = Math.floor(Math.random() * (size / grid)) * grid;
    const sy = Math.floor(Math.random() * (size / grid)) * grid;
    const dirH = Math.random() < 0.5;
    const len = (1 + Math.floor(Math.random() * 4)) * grid;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    if (dirH) ctx.lineTo(sx + len, sy);
    else ctx.lineTo(sx, sy + len);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffc107';
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(Math.random() * (size / grid)) * grid;
    const y = Math.floor(Math.random() * (size / grid)) * grid;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // 칩 사각형
  ctx.fillStyle = '#212121';
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(Math.random() * (size / grid - 2)) * grid;
    const y = Math.floor(Math.random() * (size / grid - 1)) * grid;
    ctx.fillRect(x, y, grid * 2, grid);
  }
}

function drawFire(ctx, size) {
  const base = ctx.createLinearGradient(0, size, 0, 0);
  base.addColorStop(0, '#bf360c');
  base.addColorStop(0.4, '#ff5722');
  base.addColorStop(0.75, '#ffc107');
  base.addColorStop(1, 'rgba(255,235,59,0.2)');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 35; i++) {
    const x = Math.random() * size;
    const baseY = size;
    const peakY = Math.random() * size * 0.6;
    const w = 12 + Math.random() * 32;
    const grad = ctx.createLinearGradient(x, baseY, x, peakY);
    grad.addColorStop(0, '#ff5722');
    grad.addColorStop(0.6, '#ffeb3b');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, baseY);
    ctx.quadraticCurveTo(x, peakY, x + w / 2, baseY);
    ctx.fill();
  }
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(255,${Math.random() * 200 + 55}, 0, ${Math.random() * 0.8})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
}
