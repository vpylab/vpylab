import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCloudflareConfig, toCloudflarePath, openEditionCsp, spaExcludedDirs, withGitHubApi, withGoogleSignIn } from './cloudflare-pages.mjs';

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

describe('withGoogleSignIn', () => {
  it('구글 로그인·드라이브 주소를 더하고 frame-src의 none을 바꾼다', () => {
    const csp = "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' https:; frame-src 'none'";
    expect(withGoogleSignIn(csp)).toBe("default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; style-src 'self' https://accounts.google.com/gsi/style; connect-src 'self' https://www.googleapis.com https://oauth2.googleapis.com https://accounts.google.com/gsi/; img-src 'self' https:; frame-src https://accounts.google.com/gsi/");
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
  it('두 판의 본 앱 CSP에 구글 로그인이 있고(수업용 판은 영상의 드라이브 저장에 사용), 임베드에는 없다', () => {
    const blocks = parse(buildCloudflareConfig(vercel, { edition: 'open' }).headers);
    const classroom = buildCloudflareConfig(vercel, { edition: 'classroom' });
    const openMain = blocks['/*'].find((l) => l.startsWith('Content-Security-Policy:'));
    expect(openMain).toContain('https://accounts.google.com/gsi/client');
    expect(openMain).not.toContain("frame-src 'none'");
    const openEmbed = blocks['/embed/*'].find((l) => l.startsWith('Content-Security-Policy:'));
    expect(openEmbed).not.toContain('accounts.google.com');
    const classroomBlocks = parse(classroom.headers);
    expect(classroomBlocks['/*'].find((l) => l.startsWith('Content-Security-Policy:'))).toContain('https://accounts.google.com/gsi/client');
    expect(classroomBlocks['/embed/*'].find((l) => l.startsWith('Content-Security-Policy:'))).not.toContain('accounts.google.com');
  });
});

describe('GitHub 팀 프로젝트 애드온의 CSP', () => {
  const cspOf = (config, path) => parse(config.headers)[path].find((line) => line.startsWith('Content-Security-Policy:'));

  it('connect-src에만 api.github.com을 더한다', () => {
    expect(withGitHubApi("default-src 'self'; connect-src 'self'; frame-src 'none'")).toBe("default-src 'self'; connect-src 'self' https://api.github.com; frame-src 'none'");
    expect(withGitHubApi("connect-src 'self' https://api.github.com")).toBe("connect-src 'self' https://api.github.com");
  });

  it('GitHub 클라이언트 ID를 넣은 오픈소스 판 빌드의 본 앱에만 적용한다', () => {
    const plain = buildCloudflareConfig(vercel, { edition: 'open' });
    const withGitHub = buildCloudflareConfig(vercel, { edition: 'open', github: true });
    expect(cspOf(plain, '/*')).not.toContain('https://api.github.com');
    expect(cspOf(withGitHub, '/*')).toContain('https://api.github.com');
    for (const path of ['/embed/*', '/assets/*', '/drive-lab.html']) expect(cspOf(withGitHub, path) || '').not.toContain('https://api.github.com');
    // 수업용 판은 운영 서버가 GitHub를 호출하므로 더하지 않습니다.
    expect(cspOf(buildCloudflareConfig(vercel, { edition: 'classroom', github: true }), '/*')).not.toContain('https://api.github.com');
  });
});
