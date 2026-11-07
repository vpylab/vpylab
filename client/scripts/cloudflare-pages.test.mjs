import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCloudflareConfig, toCloudflarePath, openEditionCsp, spaExcludedDirs } from './cloudflare-pages.mjs';

const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vercel = JSON.parse(readFileSync(resolve(clientRoot, '../vercel.json'), 'utf8'));

/** _headers 텍스트를 { 경로: [줄…] }로 나눕니다. */
function parse(text) {
  const blocks = {};
  let current = null;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    if (!line.startsWith(' ')) { current = line; blocks[current] = []; } else blocks[current].push(line.trim());
  }
  return blocks;
}

describe('toCloudflarePath', () => {
  it('Vercel 경로를 Cloudflare 경로로 바꾼다', () => {
    expect(toCloudflarePath('/assets/(.*)')).toBe('/assets/*');
    expect(toCloudflarePath('/drive-lab.html')).toBe('/drive-lab.html');
    expect(toCloudflarePath('/((?!assets/|pyodide/|embed/).*)')).toBe('/*');
  });
  it('바꿀 수 없는 정규식은 조용히 넘기지 않고 오류를 낸다', () => {
    expect(() => toCloudflarePath('/a/(\\d+)')).toThrow();
  });
});

describe('openEditionCsp', () => {
  it('Supabase·Railway 주소만 빼고 나머지는 그대로 둔다', () => {
    const csp = "default-src 'self'; connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net wss://*.supabase.co https://vpylab-server-production.up.railway.app blob:; img-src 'self'";
    expect(openEditionCsp(csp)).toBe("default-src 'self'; connect-src 'self' https://cdn.jsdelivr.net blob:; img-src 'self'");
  });
});

describe('vercel.json → Cloudflare', () => {
  const open = buildCloudflareConfig(vercel, { edition: 'open' });
  const classroom = buildCloudflareConfig(vercel, { edition: 'classroom' });
  const blocks = parse(open.headers);

  it('전체 경로 규칙을 맨 앞에 둔다', () => {
    expect(open.headers.split('\n')[0]).toBe('/*');
  });

  it('구체적인 규칙은 전체 규칙의 헤더를 떼어 내고 자기 값을 쓴다(헤더가 겹치지 않음)', () => {
    for (const path of ['/assets/*', '/pyodide/*', '/embed/*', '/drive-lab.html', '/drive-lab']) {
      expect(blocks[path]).toContain('! Content-Security-Policy');
      expect(blocks[path].filter((l) => l.startsWith('Content-Security-Policy:'))).toHaveLength(1);
    }
  });

  it('실험 페이지에는 구글 로그인을 허용하는 전용 CSP와 COOP가 붙는다', () => {
    const csp = blocks['/drive-lab.html'].find((l) => l.startsWith('Content-Security-Policy:'));
    expect(csp).toContain('https://accounts.google.com/gsi/client');
    expect(blocks['/drive-lab.html']).toContain('Cross-Origin-Opener-Policy: same-origin-allow-popups');
  });

  it('오픈소스 판에는 Supabase·Railway 주소가 없고, 수업용 판에는 남는다', () => {
    expect(open.headers).not.toMatch(/supabase|railway/);
    expect(classroom.headers).toMatch(/supabase/);
  });

  it('Cloudflare의 깔끔한 주소(/drive-lab.html → /drive-lab)와 부딪치는 리디렉션은 옮기지 않고, 확장자 없는 경로에도 전용 헤더를 건다', () => {
    expect(open.redirects).not.toContain('/drive-lab /drive-lab.html');
    const csp = blocks['/drive-lab'].find((l) => l.startsWith('Content-Security-Policy:'));
    expect(csp).toContain('https://accounts.google.com/gsi/client');
    expect(blocks['/drive-lab']).toContain('Cross-Origin-Opener-Policy: same-origin-allow-popups');
  });

  it('Cloudflare 한도(줄 2,000자, 규칙 100개) 안에 있다', () => {
    expect(Math.max(...open.headers.split('\n').map((l) => l.length))).toBeLessThanOrEqual(2000);
    expect(Object.keys(blocks).length).toBeLessThanOrEqual(100);
  });
});

describe('SPA 대체에서 뺀 폴더', () => {
  it('vercel.json의 SPA rewrite 제외 목록에서 폴더만 고른다(파일·api 함수 경로 포함 판정은 main에서 폴더 존재로 거른다)', () => {
    const dirs = spaExcludedDirs(vercel);
    expect(dirs).toEqual(expect.arrayContaining(['assets', 'pyodide']));
    expect(dirs).not.toContain('sw.js');
    expect(dirs.every((d) => !d.includes('\\'))).toBe(true);
  });
});
