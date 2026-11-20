import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOgHandler } from '../../api/og.mjs';
import { createOgImageHandler } from '../../api/og-image.mjs';
import { buildCard, injectMeta, resetShellCache } from '../../api/_lib/og.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const env = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon-key' };
const GALLERY_ID = '2f1c9a4e-5b6d-4c7e-8f90-123456789abc';
// 1×1 PNG
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function fakeFetch(rowsByTable) {
  return vi.fn(async (url) => {
    const table = String(url).match(/rest\/v1\/([a-z_]+)\?/)?.[1];
    const rows = rowsByTable[table] ?? [];
    return { ok: true, json: async () => rows, text: async () => '' };
  });
}

function makeReq(url, host = 'vpylab.vercel.app') {
  return { url, headers: { host, 'x-forwarded-proto': 'https' } };
}

function makeRes() {
  const headers = {};
  let body = null;
  return {
    statusCode: 0,
    setHeader: (key, value) => { headers[key.toLowerCase()] = value; },
    end: (chunk) => { body = chunk; },
    get headers() { return headers; },
    get body() { return body; },
  };
}

describe('OG 카드 서버리스 함수', () => {
  let cwd;
  beforeEach(() => {
    resetShellCache();
    cwd = mkdtempSync(join(tmpdir(), 'vpylab-og-'));
    mkdirSync(join(cwd, 'client/dist'), { recursive: true });
    const shell = readFileSync(resolve(repoRoot, 'client/index.html'), 'utf8')
      .replace('<script type="module" src="/src/main.jsx"></script>', '<script type="module" crossorigin src="/assets/index-abc123.js"></script>');
    writeFileSync(join(cwd, 'client/dist/index.html'), shell);
  });
  afterEach(() => rmSync(cwd, { recursive: true, force: true }));

  it('공유 코드(/s/:id)는 제목을 넣고 기본 카드 이미지를 쓴다', async () => {
    const fetchImpl = fakeFetch({ vpylab_shares: [{ title: '공 튀기기 <실험>' }] });
    const res = makeRes();
    await createOgHandler({ env, fetchImpl, cwd })(makeReq('/api/og?kind=share&id=abc12345'), res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.headers['x-vpylab-card']).toBe('found');
    expect(res.body).toContain('<meta property="og:title" content="공 튀기기 &lt;실험&gt; · VPyLab" />');
    expect(res.body).toContain('<meta property="og:image" content="https://vpylab.vercel.app/brand/og-default.png" />');
    expect(res.body).toContain('<meta property="og:url" content="https://vpylab.vercel.app/s/abc12345" />');
    expect(res.body).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(res.body).toContain('<title>공 튀기기 &lt;실험&gt; · VPyLab</title>');
    // 앱 셸은 그대로 — 사람 브라우저에서는 React 앱이 뜬다
    const shell = new DOMParser().parseFromString(res.body, 'text/html');
    expect(shell.querySelector('#root [role="status"] progress')).not.toBeNull();
    expect(res.body).toContain('src="/assets/index-abc123.js"');
    // 기본 og 메타는 한 번만 남는다
    expect(res.body.match(/property="og:title"/g)).toHaveLength(1);
    expect(fetchImpl.mock.calls[0][0]).toContain('/rest/v1/vpylab_shares?id=eq.abc12345');
    expect(fetchImpl.mock.calls[0][1].headers.apikey).toBe('anon-key');
  });

  it('갤러리 작품의 data URI 썸네일은 /api/og-image로, URL 썸네일은 그대로 쓴다', async () => {
    const dataThumb = fakeFetch({ vpylab_gallery: [{ title: '태양계', description: '행성 8개', thumbnail: `data:image/jpeg;base64,${PNG_BASE64}`, author_alias: '민수' }] });
    const res = makeRes();
    await createOgHandler({ env, fetchImpl: dataThumb, cwd })(makeReq(`/api/og?kind=gallery&id=${GALLERY_ID}`), res);
    expect(res.body).toContain(`<meta property="og:image" content="https://vpylab.vercel.app/api/og-image?id=${GALLERY_ID}" />`);
    expect(res.body).toContain('<meta property="og:description" content="행성 8개" />');
    expect(res.body).toContain(`<meta property="og:url" content="https://vpylab.vercel.app/gallery/${GALLERY_ID}" />`);
    // 공개 작품만 읽는다
    expect(dataThumb.mock.calls[0][0]).toContain('is_public=eq.true');

    const urlThumb = fakeFetch({ vpylab_gallery: [{ title: '태양계', description: '', thumbnail: 'https://cdn.example.com/t.png', author_alias: '민수' }] });
    const res2 = makeRes();
    await createOgHandler({ env, fetchImpl: urlThumb, cwd })(makeReq(`/api/og?kind=gallery&id=${GALLERY_ID}`), res2);
    expect(res2.body).toContain('<meta property="og:image" content="https://cdn.example.com/t.png" />');
    expect(res2.body).toContain('민수님이 VPyLab 갤러리에 공개한 3D 작품입니다.');
  });

  it('비공개·삭제된 작품과 잘못된 id는 기본 카드만 보여 주고 내용을 노출하지 않는다', async () => {
    const fetchImpl = fakeFetch({ vpylab_gallery: [], vpylab_shares: [] });
    for (const path of [`/api/og?kind=gallery&id=${GALLERY_ID}`, '/api/og?kind=share&id=zzzzzzzz', '/api/og?kind=gallery&id=not-a-uuid', '/api/og?kind=share&id=../x']) {
      const res = makeRes();
      await createOgHandler({ env, fetchImpl, cwd })(makeReq(path), res);
      expect(res.statusCode).toBe(200);
      expect(res.headers['x-vpylab-card']).toBe('default');
      expect(res.body).toContain('<meta property="og:title" content="VPyLab — Python으로 만드는 3D 세계" />');
      expect(res.body).toContain('<meta property="og:image" content="https://vpylab.vercel.app/brand/og-default.png" />');
    }
    // 형식이 틀린 id는 Supabase에 묻지도 않는다
    expect(fetchImpl.mock.calls.every(([url]) => !url.includes('not-a-uuid') && !url.includes('..'))).toBe(true);
  });

  it('Supabase가 느리거나 실패해도 기본 카드로 응답한다', async () => {
    const failing = vi.fn(async () => { throw new Error('network'); });
    const res = makeRes();
    await createOgHandler({ env, fetchImpl: failing, cwd })(makeReq('/api/og?kind=share&id=abc12345'), res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-vpylab-card']).toBe('default');
    const shell = new DOMParser().parseFromString(res.body, 'text/html');
    expect(shell.querySelector('#root [role="status"] progress')).not.toBeNull();
  });

  it('함수 번들에 index.html이 없으면 배포에서 받아 오고, 그것도 없으면 최소 HTML을 돌려준다', async () => {
    rmSync(join(cwd, 'client'), { recursive: true, force: true });
    const shellFetch = vi.fn(async (url) => {
      if (String(url).endsWith('/index.html')) return { ok: true, text: async () => '<html><head></head><body><div id="root"></div></body></html>' };
      return { ok: true, json: async () => [{ title: 'T' }] };
    });
    const res = makeRes();
    await createOgHandler({ env, fetchImpl: shellFetch, cwd })(makeReq('/api/og?kind=share&id=abc12345'), res);
    expect(res.body).toContain('<div id="root"></div>');
    expect(res.body).toContain('og:title');

    resetShellCache();
    const noShell = vi.fn(async (url) => (String(url).endsWith('/index.html') ? { ok: false } : { ok: true, json: async () => [{ title: 'T' }] }));
    const res2 = makeRes();
    await createOgHandler({ env, fetchImpl: noShell, cwd })(makeReq('/api/og?kind=share&id=abc12345'), res2);
    expect(res2.body).toContain('<meta property="og:title" content="T · VPyLab" />');
    expect(res2.body).toContain('href="https://vpylab.vercel.app/s/abc12345"');
  });

  it("제목의 `$'`·`$&` 같은 치환 토큰이 HTML 조각으로 확장되지 않는다", () => {
    const html = '<html><head><title>x</title><meta name="description" content="d" /></head><body><p>tail</p></body></html>';
    const out = injectMeta(html, { title: "a $' b $& c $1", description: "$' $`", image: 'https://i', url: 'https://u', found: true });
    expect(out).toContain("<title>a $&#39; b $&amp; c $1</title>");
    expect(out).toContain('<meta name="description" content="$&#39; $`" />');
    expect(out).toContain('<meta property="og:title" content="a $&#39; b $&amp; c $1" />');
    expect(out.match(/<title>/g)).toHaveLength(1);
    expect(out).not.toContain('</head></head>');
  });

  it('메타 주입은 따옴표·꺾쇠를 이스케이프한다', () => {
    const html = injectMeta('<html><head><title>x</title></head><body></body></html>', {
      title: 'a"b', description: '<s>', image: 'https://i', url: 'https://u', found: true,
    });
    expect(html).toContain('content="a&quot;b"');
    expect(html).toContain('content="&lt;s&gt;"');
    expect(html).not.toContain('<s>');
  });

  it('환경변수가 없으면 번들에 포함된 client/.env.production의 공개 값을 읽는다', async () => {
    writeFileSync(join(cwd, 'client/.env.production'), 'VITE_SUPABASE_URL=https://file.supabase.co/\nVITE_SUPABASE_ANON_KEY="file-key"\nVITE_API_URL=https://x\n');
    const fetchImpl = fakeFetch({ vpylab_shares: [{ title: '파일 환경' }] });
    const res = makeRes();
    await createOgHandler({ env: {}, fetchImpl, cwd })(makeReq('/api/og?kind=share&id=abc12345'), res);
    expect(res.headers['x-vpylab-card']).toBe('found');
    expect(fetchImpl.mock.calls[0][0]).toMatch(/^https:\/\/file\.supabase\.co\/rest\/v1\/vpylab_shares/);
    expect(fetchImpl.mock.calls[0][1].headers.apikey).toBe('file-key');
    // Vercel 환경변수가 있으면 그쪽이 우선
    resetShellCache();
    const fetch2 = fakeFetch({ vpylab_shares: [{ title: 'T' }] });
    await createOgHandler({ env, fetchImpl: fetch2, cwd })(makeReq('/api/og?kind=share&id=abc12345'), makeRes());
    expect(fetch2.mock.calls[0][0]).toMatch(/^https:\/\/example\.supabase\.co\//);
  });

  it('환경변수도 파일도 없으면 Supabase를 부르지 않고 기본 카드를 만든다', async () => {
    const fetchImpl = vi.fn();
    const card = await buildCard({ kind: 'share', id: 'abc12345', env: {}, fetchImpl });
    expect(card.found).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('OG 썸네일 이미지 함수', () => {
  it('data URI 썸네일을 저장된 MIME으로 디코드해 하루 캐시한다', async () => {
    const fetchImpl = fakeFetch({ vpylab_gallery: [{ thumbnail: `data:image/png;base64,${PNG_BASE64}` }] });
    const res = makeRes();
    await createOgImageHandler({ env, fetchImpl })(makeReq(`/api/og-image?id=${GALLERY_ID}`), res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['cache-control']).toBe('public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.subarray(1, 4).toString()).toBe('PNG');
  });

  it('선언한 형식과 실제 바이트가 다르거나 너무 긴 data URI는 기본 카드 이미지로 보낸다', async () => {
    const fakePng = Buffer.from('this is not a png at all, just text bytes').toString('base64');
    const res = makeRes();
    await createOgImageHandler({ env, fetchImpl: fakeFetch({ vpylab_gallery: [{ thumbnail: `data:image/png;base64,${fakePng}` }] }) })(makeReq(`/api/og-image?id=${GALLERY_ID}`), res);
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('https://vpylab.vercel.app/brand/og-default.png');

    const huge = `data:image/png;base64,${'A'.repeat(3 * 1024 * 1024 + 10)}`;
    const res2 = makeRes();
    await createOgImageHandler({ env, fetchImpl: fakeFetch({ vpylab_gallery: [{ thumbnail: huge }] }) })(makeReq(`/api/og-image?id=${GALLERY_ID}`), res2);
    expect(res2.statusCode).toBe(302);
  });

  it('URL 썸네일은 그 주소로, 없거나 비공개면 기본 카드 이미지로 보낸다', async () => {
    const res = makeRes();
    await createOgImageHandler({ env, fetchImpl: fakeFetch({ vpylab_gallery: [{ thumbnail: 'https://cdn.example.com/t.png' }] }) })(makeReq(`/api/og-image?id=${GALLERY_ID}`), res);
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('https://cdn.example.com/t.png');

    const res2 = makeRes();
    await createOgImageHandler({ env, fetchImpl: fakeFetch({ vpylab_gallery: [] }) })(makeReq(`/api/og-image?id=${GALLERY_ID}`), res2);
    expect(res2.statusCode).toBe(302);
    expect(res2.headers.location).toBe('https://vpylab.vercel.app/brand/og-default.png');

    const fetchImpl = vi.fn();
    const res3 = makeRes();
    await createOgImageHandler({ env, fetchImpl })(makeReq('/api/og-image?id=../etc'), res3);
    expect(res3.statusCode).toBe(302);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
