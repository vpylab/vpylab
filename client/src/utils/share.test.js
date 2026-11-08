import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  window.location.hash = '';
});

async function loadShare(edition) {
  vi.resetModules();
  vi.stubEnv('VITE_EDITION', edition);
  return import('./share.js');
}

describe('공유 링크 만들기', () => {
  it('오픈소스 판은 서버를 부르지 않고 코드를 주소(#code=)에 담으며, 그 주소로 열면 같은 코드가 나온다', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { createShareLink, decodeCodeFromURL } = await loadShare('open');
    const code = 'from vpython import *\nsphere(color=color.cyan)  # 한글 🎨\n';
    const { url, error } = await createShareLink(code, '공');
    expect(error).toBeNull();
    expect(url).toMatch(/\/sandbox#code=/);
    expect(fetchSpy).not.toHaveBeenCalled();

    window.location.hash = url.slice(url.indexOf('#'));
    expect(decodeCodeFromURL()).toEqual({ code, isExternal: true });
  });

  it('수업용 판은 지금처럼 서버에 저장하고 짧은 주소를 받는다', async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, json: async () => ({ url: '/s/abc12345' }) }));
    vi.stubGlobal('fetch', fetchSpy);
    const { createShareLink } = await loadShare('');
    const { url } = await createShareLink('print(1)', '제목');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(url).toMatch(/\/s\/abc12345$/);
  });

  it('50KB를 넘는 코드는 어느 판에서도 링크를 만들지 않는다', async () => {
    const { createShareLink } = await loadShare('open');
    const { url, error } = await createShareLink('a'.repeat(50_001));
    expect(url).toBeNull();
    expect(error).toMatch(/50KB/);
  });
});
