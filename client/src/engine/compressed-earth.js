// 실제 GPU가 지원하는 압축 포맷으로 변환하고, 렌더러마다 한 번만 로드합니다.
import { LoadingManager, SRGBColorSpace } from 'three';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import transcoderJS from 'three/examples/jsm/libs/basis/basis_transcoder.js?url';
import transcoderWasm from 'three/examples/jsm/libs/basis/basis_transcoder.wasm?url';
const states = new WeakMap();
export function loadEarth(renderer) {
  let state = states.get(renderer);
  if (state) return state.ready;
  const manager = new LoadingManager();
  manager.setURLModifier(url => {
    if (url === 'basis_transcoder.js') return transcoderJS;
    if (url === 'basis_transcoder.wasm') return transcoderWasm;
    return url;
  });
  const loader = new KTX2Loader(manager).setWorkerLimit(1).detectSupport(renderer);
  state = { closed:false, texture:null };
  state.ready = loader.loadAsync(new URL('../assets/planets/earth.ktx2', import.meta.url).href).then(texture => {
    if (state.closed) { texture.dispose(); return null; }
    texture.colorSpace = SRGBColorSpace;
    state.texture = texture;
    return texture;
  }).finally(() => loader.dispose());
  states.set(renderer, state);
  return state.ready;
}
export function releaseEarth(renderer) {
  const state = states.get(renderer);
  if (!state) return;
  state.closed = true;
  state.texture?.dispose();
  states.delete(renderer);
}
