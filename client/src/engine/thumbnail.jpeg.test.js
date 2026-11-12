import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureThumbnail } from './thumbnail.js';

// jsdom에는 캔버스 그리기가 없어, 줄인 그림을 만드는 캔버스를 흉내 냅니다.
function stubOffscreen() {
  const pixels = new Uint8ClampedArray(16 * 9 * 4);
  for (let i = 0; i < pixels.length; i += 4) { pixels[i] = (i * 7) % 256; pixels[i + 1] = (i * 3) % 256; pixels[i + 2] = 40; pixels[i + 3] = 255; }
  const asked = [];
  const offscreen = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: () => {}, getImageData: () => ({ data: pixels }) }),
    toDataURL: (type, quality) => { asked.push({ type, quality }); return `data:${type};base64,AAAA`; },
  };
  const create = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag) => (tag === 'canvas' ? offscreen : create(tag)));
  return asked;
}

afterEach(() => vi.restoreAllMocks());

describe('captureThumbnail의 형식', () => {
  const source = { width: 1280, height: 720 };

  it('기본은 예전처럼 WebP를 먼저 시도한다', () => {
    const asked = stubOffscreen();
    expect(captureThumbnail(source)).toMatch(/^data:image\/webp/);
    expect(asked[0]).toEqual({ type: 'image/webp', quality: 0.82 });
  });

  it("'jpeg'을 고르면 WebP를 지원하는 브라우저에서도 JPEG로 만든다(갤러리의 thumbnail.jpg)", () => {
    const asked = stubOffscreen();
    expect(captureThumbnail(source, 640, 0.8, 'jpeg')).toMatch(/^data:image\/jpeg;base64,/);
    expect(asked).toEqual([{ type: 'image/jpeg', quality: 0.8 }]);
  });

  it('캔버스가 없으면 null', () => {
    expect(captureThumbnail(null, 640, 0.8, 'jpeg')).toBeNull();
    expect(captureThumbnail(undefined)).toBeNull();
  });
});
