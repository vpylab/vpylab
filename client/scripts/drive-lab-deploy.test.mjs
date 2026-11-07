/**
 * 드라이브 실험 페이지 배포 검증: 운영 빌드에 들어가는지, rewrite가 index.html로 보내지 않는지,
 * 전용 CSP가 구글 로그인·드라이브 API를 허용하는지, Service Worker가 앱 셸을 덮어쓰지 않는지.
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { renderServiceWorker } from './service-worker-plugin.mjs';

const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(clientRoot, path), 'utf8');
const vercel = JSON.parse(read('../vercel.json'));
const toRegExp = (source) => new RegExp(`^${source.replace(/\\\\/g, '\\')}$`);

describe('드라이브 실험 페이지 배포', () => {
  it('운영 빌드 명령이 실험 페이지를 client/dist에 덧붙인다', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(vercel.buildCommand).toContain('npm run build:deploy');
    expect(pkg.scripts['build:deploy']).toMatch(/^vite build && vite build --config vite\.drivelab\.config\.js --outDir dist --emptyOutDir false$/);
  });

  it('SPA rewrite가 /drive-lab.html을 index.html로 보내지 않는다', () => {
    const spa = vercel.rewrites.find((rule) => rule.destination === '/index.html');
    const pattern = toRegExp(spa.source);
    expect(pattern.test('/drive-lab.html')).toBe(false);
    expect(pattern.test('/gallery')).toBe(true);
  });

  it('/drive-lab 주소는 /drive-lab.html로 넘긴다', () => {
    expect(vercel.redirects).toContainEqual({ source: '/drive-lab', destination: '/drive-lab.html', permanent: false });
  });

  it('실험 페이지에는 전용 헤더 하나만 적용된다', () => {
    const matching = vercel.headers.filter((rule) => toRegExp(rule.source).test('/drive-lab.html'));
    expect(matching.map((rule) => rule.source)).toEqual(['/drive-lab.html']);
    // 일반 페이지는 여전히 공통 헤더를 받는다.
    expect(vercel.headers.some((rule) => rule.source !== '/drive-lab.html' && toRegExp(rule.source).test('/gallery'))).toBe(true);
  });

  it('전용 CSP는 구글 로그인과 드라이브 API만 더 허용하고 운영 서버·Supabase는 허용하지 않는다', () => {
    const rule = vercel.headers.find((r) => r.source === '/drive-lab.html');
    const headers = Object.fromEntries(rule.headers.map((h) => [h.key, h.value]));
    const csp = headers['Content-Security-Policy'];
    expect(csp).toContain('script-src \'self\' https://accounts.google.com/gsi/client');
    expect(csp).toMatch(/connect-src [^;]*https:\/\/www\.googleapis\.com/);
    expect(csp).toMatch(/connect-src [^;]*https:\/\/oauth2\.googleapis\.com/);
    expect(csp).toContain('frame-src https://accounts.google.com/gsi/');
    expect(csp).not.toMatch(/supabase|railway|unsafe-eval/);
    // 승인 팝업이 결과를 돌려줄 수 있어야 합니다.
    expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin-allow-popups');
    expect(headers['Referrer-Policy']).toBe('no-referrer');
  });
});

describe('Service Worker의 독립 페이지 처리', () => {
  function loadWorker() {
    const listeners = {};
    const self = {
      location: { origin: 'https://vpylab.vercel.app' },
      addEventListener: (type, fn) => { listeners[type] = fn; },
    };
    const source = renderServiceWorker({ manifest: [{ url: 'index.html', revision: 'r' }], appShell: 'index.html' });
    vm.runInNewContext(source, { self, URL, caches: {}, fetch: vi.fn() });
    return (url) => {
      const respondWith = vi.fn();
      listeners.fetch({ request: { method: 'GET', url, mode: 'navigate' }, respondWith });
      return respondWith.mock.calls.length > 0;
    };
  }

  it('실험 페이지 이동은 가로채지 않아 앱 셸 캐시를 덮어쓰지 않는다', () => {
    const intercepts = loadWorker();
    expect(intercepts('https://vpylab.vercel.app/drive-lab.html')).toBe(false);
    // Cloudflare Pages가 제공하는 확장자 없는 주소
    expect(intercepts('https://vpylab.pages.dev/drive-lab')).toBe(false);
  });

  it('본 앱 경로와 앱 셸 이동은 그대로 가로챈다', () => {
    const intercepts = loadWorker();
    expect(intercepts('https://vpylab.vercel.app/gallery')).toBe(true);
    expect(intercepts('https://vpylab.vercel.app/index.html')).toBe(true);
    expect(intercepts('https://vpylab.vercel.app/')).toBe(true);
  });
});
