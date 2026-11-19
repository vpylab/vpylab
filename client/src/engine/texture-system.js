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

const PRESET_GENERATORS = createTexturePainters();

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
