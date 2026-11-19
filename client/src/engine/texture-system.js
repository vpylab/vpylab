/**
 * VPyLab — 텍스처 시스템
 * 프로시저럴 프리셋(textures.wood 등)과 외부 URL/data URI를 Three.js Texture로 변환
 */

import { createTexturePainters } from '../../../server/shared/procedural-textures.js';
import * as THREE from 'three';

const TEXTURE_CACHE = new Map();
const textureLoads = new Map();

export function whenTexturesReady() { return Promise.all([...textureLoads.values()]); }
// crossOrigin='anonymous'면 CORS 헤더가 없는 서버의 이미지가 실패함.
// 텍스처는 화면에만 사용하므로 픽셀 읽기가 필요 없어 빈 문자열로 두어
// 일반 <img> 처럼 동작하게 한다 (canvas는 tainted 되지만 렌더링은 정상).
const URL_LOADER = new THREE.TextureLoader();
URL_LOADER.setCrossOrigin('');

// Vite가 파일을 작품과 같은 출처에서 제공하며 실제로 선택한 재질만 내려받습니다.
const surfaceImages = {
  jupiter: new URL('../assets/planets/jupiter.jpg', import.meta.url).href,
  saturn: new URL('../assets/planets/saturn.jpg', import.meta.url).href,
  sun: new URL('../assets/planets/sun.jpg', import.meta.url).href,
  earth: new URL('../assets/planets/earth.jpg', import.meta.url).href,
  moon: new URL('../assets/planets/moon.jpg', import.meta.url).href,
};

const PRESET_GENERATORS = createTexturePainters();

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
  const gen = PRESET_GENERATORS[name] || PRESET_GENERATORS.checker;
  gen(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
