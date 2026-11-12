import { afterEach, describe, expect, it, vi } from 'vitest';
import { GalleryLoadError, MAX_INDEX_BYTES, loadGalleryIndex } from './gallery-index.js';

const URL_OK = 'https://raw.githubusercontent.com/vpylab/vpylab/gallery-data/gallery.json';

const item = (fullName, extra = {}) => {
  const [owner, repo] = fullName.split('/');
  return {
    fullName, title: `${repo} 작품`, owner, htmlUrl: `https://github.com/${fullName}`,
    pagesUrl: `https://${owner.toLowerCase()}.github.io/${repo}/`,
    thumbnailUrl: `https://raw.githubusercontent.com/${fullName}/main/thumbnail.jpg`,
    stars: 2, updatedAt: '2026-11-10T01:02:03.000Z', ...extra,
  };
};

function respondWith(body, { status = 200 } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { ok: status >= 200 && status < 300, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) };
  };
  return { fetchImpl, calls };
}

const failsWith = async (promise, reason) => {
  const error = await promise.then(() => null, (e) => e);
  expect(error).toBeInstanceOf(GalleryLoadError);
  expect(error.reason).toBe(reason);
  return error;
};

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.resetModules(); });

describe('갤러리 목록 읽기', () => {
  it('목록 파일 하나만 읽고, 쿠키나 로그인 정보를 보내지 않는다', async () => {
    const { fetchImpl, calls } = respondWith({ version: 1, generatedAt: '2026-11-12T03:00:00.000Z', topic: 'vpylab-gallery', items: [item('ada/solar'), item('bo/moon')] });
    const index = await loadGalleryIndex({ url: URL_OK, fetchImpl });
    expect(index.items.map((entry) => entry.fullName)).toEqual(['ada/solar', 'bo/moon']);
    expect(index.generatedAt).toBe('2026-11-12T03:00:00.000Z');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(URL_OK);
    expect(calls[0].init.credentials).toBe('omit');
    expect(calls[0].init.headers.Authorization).toBeUndefined();
  });

  it('목록 파일의 내용을 믿지 않는다: 주소가 그 저장소의 것이 아니면 항목이나 값을 버린다', async () => {
    const { fetchImpl } = respondWith({
      version: 1,
      items: [
        item('ada/solar', { title: '<img src=x onerror=alert(1)>', stars: '많음', secret: 'x' }),
        item('eve/phish', { htmlUrl: 'https://evil.example/phish' }),
        item('eve/redirect', { pagesUrl: 'https://evil.example/', thumbnailUrl: 'javascript:alert(1)' }),
        { fullName: '../../etc/passwd', owner: '..', htmlUrl: 'https://github.com/../../etc/passwd' },
        'not an object',
      ],
    });
    const index = await loadGalleryIndex({ url: URL_OK, fetchImpl });
    expect(index.items.map((entry) => entry.fullName)).toEqual(['ada/solar', 'eve/redirect']);
    expect(index.items[0]).toEqual({ ...item('ada/solar'), title: '<img src=x onerror=alert(1)>', stars: 0 }); // 제목은 글자 그대로, 화면이 글자로만 그립니다.
    expect(index.items[1].pagesUrl).toBeNull();
    expect(index.items[1].thumbnailUrl).toBeNull();
  });

  it('목록 주소가 없거나 허용하지 않는 주소면 요청하지 않는다', async () => {
    const fetchImpl = vi.fn();
    for (const url of ['', 'https://example.com/gallery.json', 'http://raw.githubusercontent.com/a/b/c/gallery.json', '//evil.example/gallery.json']) {
      await failsWith(loadGalleryIndex({ url, fetchImpl }), 'off');
    }
    expect(fetchImpl).not.toHaveBeenCalled();
    const { fetchImpl: sameOrigin, calls } = respondWith({ version: 1, items: [] });
    expect((await loadGalleryIndex({ url: '/gallery/gallery.json', fetchImpl: sameOrigin })).items).toEqual([]);
    expect(calls[0].url).toBe('/gallery/gallery.json');
  });

  it('읽지 못한 까닭을 구분한다', async () => {
    expect((await failsWith(loadGalleryIndex({ url: URL_OK, fetchImpl: respondWith('', { status: 404 }).fetchImpl }), 'http')).status).toBe(404);
    await failsWith(loadGalleryIndex({ url: URL_OK, fetchImpl: async () => { throw new TypeError('Failed to fetch'); } }), 'network');
    await failsWith(loadGalleryIndex({ url: URL_OK, fetchImpl: respondWith('<html>not json').fetchImpl }), 'format');
    await failsWith(loadGalleryIndex({ url: URL_OK, fetchImpl: respondWith({ version: 99, items: [] }).fetchImpl }), 'format');
    await failsWith(loadGalleryIndex({ url: URL_OK, fetchImpl: respondWith({ version: 1 }).fetchImpl }), 'format');
    await failsWith(loadGalleryIndex({ url: URL_OK, fetchImpl: respondWith('x'.repeat(MAX_INDEX_BYTES + 1)).fetchImpl }), 'tooLarge');
  });

  it('응답이 너무 늦으면 기다리지 않는다', async () => {
    vi.useFakeTimers();
    const fetchImpl = (url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    });
    const pending = failsWith(loadGalleryIndex({ url: URL_OK, fetchImpl, timeoutMs: 1000 }), 'timeout');
    await vi.advanceTimersByTimeAsync(1000);
    await pending;
  });
});

describe('갤러리를 켜는 설정(VITE_GALLERY_INDEX_URL)', () => {
  async function flags(env) {
    vi.resetModules();
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    return import('../lib/api-base.js');
  }

  it('오픈소스 판에서 목록 주소가 있을 때만 켜진다', async () => {
    expect((await flags({ VITE_EDITION: 'open', VITE_GALLERY_INDEX_URL: `  ${URL_OK} ` })).GITHUB_GALLERY).toBe(true);
    expect((await flags({ VITE_EDITION: 'open', VITE_GALLERY_INDEX_URL: URL_OK })).GALLERY_INDEX_URL).toBe(URL_OK);
    expect((await flags({ VITE_EDITION: 'open', VITE_GALLERY_INDEX_URL: '' })).GITHUB_GALLERY).toBe(false);
    expect((await flags({ VITE_EDITION: 'open', VITE_GALLERY_INDEX_URL: 'https://example.com/gallery.json' })).GITHUB_GALLERY).toBe(false);
  });

  it('수업용 판은 목록 주소가 있어도 기존 갤러리를 그대로 사용한다', async () => {
    const m = await flags({ VITE_EDITION: '', VITE_LAN_MODE: '', VITE_GALLERY_INDEX_URL: URL_OK });
    expect(m.GITHUB_GALLERY).toBe(false);
    expect(m.GALLERY_INDEX_URL).toBe('');
    expect(m.SERVER_FEATURES).toBe(true);
  });

  it('갤러리가 꺼진 배포에서는 목록을 읽으려 해도 요청하지 않는다(애드온을 사용할 수 없는 경우)', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_EDITION', 'open');
    vi.stubEnv('VITE_GALLERY_INDEX_URL', '');
    const { loadGalleryIndex: load, GalleryLoadError: LoadError } = await import('./gallery-index.js');
    const fetchImpl = vi.fn();
    const error = await load({ fetchImpl }).then(() => null, (e) => e);
    expect(error).toBeInstanceOf(LoadError);
    expect(error.reason).toBe('off');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
