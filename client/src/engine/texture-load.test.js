import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { resolveTexture, whenTexturesReady } from './texture-system';

afterEach(() => vi.restoreAllMocks());

it('태양 JPG를 늦게 받아도 기존 재질을 보존하고 작은 GPU 저장소를 먼저 해제한다', async () => {
  const ctx = { fillRect: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
  let finish;
  vi.spyOn(THREE.ImageLoader.prototype, 'load').mockImplementation((_url, onLoad) => {
    finish = onLoad;
  });
  const texture = resolveTexture('preset:sun');
  const placeholder = texture.image;
  const previousVersion = texture.version;
  expect(ctx.fillRect).toHaveBeenCalled();
  const released = vi.fn(() => expect(texture.image).toBe(placeholder));
  texture.addEventListener('dispose', released);
  const decoded = new Image(1536, 768);
  finish(decoded);
  await whenTexturesReady();
  expect(released).toHaveBeenCalledOnce();
  expect(resolveTexture('preset:sun')).toBe(texture);
  expect(texture.image).toBe(decoded);
  expect(texture.version).toBeGreaterThan(previousVersion);
});
