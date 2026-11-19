import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { resolveTexture, whenTexturesReady } from './texture-system';

afterEach(() => vi.restoreAllMocks());

it('같은 URL의 요청을 공유하고, 실패 뒤 다음 실행에서 다시 받아 재사용한다', async () => {
  const url = 'https://example.org/class-map.jpg';
  const requests = [];
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((_url, success, _progress, failure) => {
    requests.push({ success, failure });
    return new THREE.Texture();
  });

  const first = resolveTexture(url);
  expect(resolveTexture(url)).toBe(first);
  expect(requests).toHaveLength(1);
  requests[0].failure(new Error('offline'));
  await whenTexturesReady();

  const second = resolveTexture(url);
  expect(requests).toHaveLength(2);
  expect(second).not.toBe(first);
  expect(resolveTexture(url)).toBe(second);
  requests[1].success(second);
  await whenTexturesReady();
  expect(resolveTexture(url)).toBe(second);
  expect(requests).toHaveLength(2);
});
