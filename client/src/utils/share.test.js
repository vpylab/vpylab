import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  window.location.hash = '';
  window.localStorage.clear();
});

async function loadShare() {
  vi.resetModules();
  return import('./share.js');
}

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe('공유 링크 만들기', () => {
  it('같은 출처의 /api/share에 저장해 짧은 주소를 받고, 수정 열쇠를 이 브라우저에 남긴다', async () => {
    const fetchSpy = vi.fn(async () => jsonResponse(201, { id: 'k7x2p9', url: '/s/k7x2p9', editKey: 'key-key-key-key-key-key', named: false }));
    vi.stubGlobal('fetch', fetchSpy);
    const { createShareLink, hasEditKey } = await loadShare();
    const { url, id, error } = await createShareLink('sphere()', '공');
    expect(error).toBeNull();
    expect(url).toBe(`${window.location.origin}/s/k7x2p9`);
    expect(id).toBe('k7x2p9');
    expect(fetchSpy).toHaveBeenCalledWith('/api/share', expect.objectContaining({ method: 'POST' }));
    expect(hasEditKey('k7x2p9')).toBe(true);
  });

  it('저장소가 응답하지 않으면 코드를 주소(#code=)에 담은 링크로 대신하고, 그 주소로 열면 같은 코드가 나온다', async () => {
    for (const failure of [async () => jsonResponse(500, { error: 'x' }), async () => { throw new TypeError('offline'); }]) {
      vi.stubGlobal('fetch', vi.fn(failure));
      const { createShareLink, decodeCodeFromURL } = await loadShare();
      const code = 'from vpython import *\nsphere(color=color.cyan)  # 한글 🎨\n';
      const { url, error } = await createShareLink(code, '공');
      expect(error).toBeNull();
      // QR로 연 휴대폰에서도 편집기가 아니라 실행 화면이 먼저 나오도록 ?view=run을 붙인다.
      expect(url).toMatch(/\/sandbox\?view=run#code=/);
      window.location.hash = url.slice(url.indexOf('#'));
      expect(decodeCodeFromURL()).toEqual({ code, isExternal: true });
    }
  });

  it('50KB를 넘는 코드는 링크를 만들지 않는다', async () => {
    const { createShareLink } = await loadShare();
    const { url, error } = await createShareLink('a'.repeat(50_001));
    expect(url).toBeNull();
    expect(error).toMatch(/50KB/);
  });
});

describe('이름 정하기', () => {
  it('규칙에 맞지 않는 이름은 서버에 보내지 않는다', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { claimShareName } = await loadShare();
    for (const bad of ['ab', '-abc', 'abc-', 'a--b', '태양계', 'a_b_c']) {
      expect((await claimShareName('x', 't', bad)).errorCode).toBe('name_invalid');
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('처음에는 이름으로 새로 만들고, 같은 브라우저에서 다시 정하면 열쇠로 내용을 바꾼다', async () => {
    const fetchSpy = vi.fn(async (url, init) => (init.method === 'POST'
      ? jsonResponse(201, { id: 'solar', url: '/s/solar', editKey: 'secret-secret-secret-1', named: true })
      : jsonResponse(200, { id: 'solar', url: '/s/solar', named: true })));
    vi.stubGlobal('fetch', fetchSpy);
    const { claimShareName } = await loadShare();

    const first = await claimShareName('sphere()', '태양', ' Solar ');
    expect(first).toEqual({ url: `${window.location.origin}/s/solar`, id: 'solar', updated: false, errorCode: null });
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toMatchObject({ code: 'sphere()', title: '태양', name: 'solar' });

    const second = await claimShareName('box()', '태양', 'solar');
    expect(second.updated).toBe(true);
    const [putUrl, putInit] = fetchSpy.mock.calls[1];
    expect(putUrl).toBe('/api/share/solar');
    expect(putInit.method).toBe('PUT');
    expect(putInit.headers.Authorization).toBe('Bearer secret-secret-secret-1');
  });

  it('남이 쓰는 이름이면 name_taken을 돌려준다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(409, { error: '이미…', code: 'name_taken' })));
    const { claimShareName } = await loadShare();
    expect(await claimShareName('x', 't', 'taken')).toMatchObject({ url: null, errorCode: 'name_taken' });
  });

  it('공유 주소를 열면 같은 출처의 /api/share/:id에서 코드를 읽는다', async () => {
    const fetchSpy = vi.fn(async () => jsonResponse(200, { id: 'solar', code: 'sphere()', title: '태양' }));
    vi.stubGlobal('fetch', fetchSpy);
    const { loadSharedCode } = await loadShare();
    expect(await loadSharedCode('solar')).toEqual({ code: 'sphere()', title: '태양', error: null });
    expect(fetchSpy).toHaveBeenCalledWith('/api/share/solar');

    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(404, { code: 'not_found' })));
    expect((await loadSharedCode('nobody')).error).toBe('not_found');
  });

  it('연결이 끊겼거나 저장소가 답하지 못하면 없는 주소와 구분해 알린다', async () => {
    const { loadSharedCode } = await loadShare();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect(await loadSharedCode('solar')).toEqual({ code: null, title: null, error: 'unavailable' });
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(503, {})));
    expect((await loadSharedCode('solar')).error).toBe('unavailable');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(429, { code: 'rate_limited' })));
    expect((await loadSharedCode('solar')).error).toBe('unavailable');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(400, { code: 'invalid_id' })));
    expect((await loadSharedCode('!!')).error).toBe('not_found');
  });
});

describe('수정 열쇠', () => {
  it('이름을 모르는 저장소가 무작위 주소를 돌려주면 성공으로 보이지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { id: 'AbC_12xY', url: '/s/AbC_12xY' })));
    const { claimShareName } = await loadShare();
    expect(await claimShareName('x', 't', 'solar')).toMatchObject({ url: null, errorCode: 'server_error' });
  });

  it('대소문자가 섞인 무작위 주소의 열쇠도 찾는다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { id: 'AbC_12xY', url: '/s/AbC_12xY', editKey: 'secret-secret-secret-3', named: false })));
    const { createShareLink, hasEditKey } = await loadShare();
    await createShareLink('box()', '상자');
    expect(hasEditKey('AbC_12xY')).toBe(true);
  });

  it('localStorage를 쓸 수 없어도 이 탭에서는 열쇠를 기억해 같은 이름을 다시 정하면 내용을 바꾼다 (아르곤 안정성 점검)', async () => {
    const fetchSpy = vi.fn(async (url, init) => (init.method === 'POST'
      ? jsonResponse(201, { id: 'solar', url: '/s/solar', editKey: 'secret-secret-secret-1', named: true })
      : jsonResponse(200, { id: 'solar', url: '/s/solar', named: true })));
    vi.stubGlobal('fetch', fetchSpy);
    const { claimShareName } = await loadShare();
    const blocked = () => { throw new DOMException('blocked', 'SecurityError'); };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    try {
      expect((await claimShareName('sphere()', '태양', 'solar')).updated).toBe(false);
      const second = await claimShareName('box()', '태양', 'solar');
      expect(second.updated).toBe(true);
      expect(fetchSpy.mock.calls[1][1]).toMatchObject({ method: 'PUT', headers: { Authorization: 'Bearer secret-secret-secret-1' } });
    } finally {
      vi.restoreAllMocks();
    }
  });
});
