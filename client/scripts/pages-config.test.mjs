/**
 * Cloudflare Pages 배포 설정 검증: 응답 헤더(public/_headers)와 정적 폴더의 404 처리(pages-static.mjs).
 */
import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOT_FOUND_HTML, STATIC_DIRS, writeStaticNotFound } from './pages-static.mjs';

const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const headersText = readFileSync(resolve(clientRoot, 'public/_headers'), 'utf8');

/** _headers를 { 경로: { 헤더 이름(소문자): 값 }, … }과 떼어 낸 헤더 목록으로 읽습니다. */
function parseHeaders(text) {
  const rules = {};
  let current = null;
  for (const raw of text.split('\n')) {
    if (!raw.trim() || raw.startsWith('#')) continue;
    if (!raw.startsWith(' ')) { current = { headers: {}, detached: [] }; rules[raw.trim()] = current; continue; }
    const line = raw.trim();
    if (line.startsWith('! ')) { current.detached.push(line.slice(2).toLowerCase()); continue; }
    const colon = line.indexOf(':');
    current.headers[line.slice(0, colon).toLowerCase()] = line.slice(colon + 1).trim();
  }
  return rules;
}

const rules = parseHeaders(headersText);
const directive = (path, name) => {
  const csp = rules[path].headers['content-security-policy'];
  const found = csp.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name} `) || part === name);
  return found ? found.split(/\s+/).slice(1) : null;
};

describe('Cloudflare Pages 응답 헤더 (public/_headers)', () => {
  it('규칙은 본 앱, 정적 폴더 둘, 임베드 네 가지이고 한도를 넘지 않는다', () => {
    expect(Object.keys(rules)).toEqual(['/*', '/assets/*', '/pyodide/*', '/embed/*']);
    for (const line of headersText.split('\n')) expect(line.length).toBeLessThanOrEqual(2000);
  });

  it('본 앱은 보안 헤더를 모두 내보내고 다른 사이트의 iframe에 들어가지 않는다', () => {
    const main = rules['/*'].headers;
    expect(main['x-content-type-options']).toBe('nosniff');
    expect(main['x-frame-options']).toBe('DENY');
    expect(main['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(main['strict-transport-security']).toContain('max-age=');
    expect(main['permissions-policy']).toContain('camera=()');
    expect(main['cache-control']).toContain('no-cache');
    expect(directive('/*', 'frame-ancestors')).toEqual(["'self'"]);
    expect(directive('/*', 'default-src')).toEqual(["'self'"]);
  });

  it('본 앱의 CSP는 구글 드라이브 저장, GitHub, 목록 파일에 필요한 주소만 연다', () => {
    const connect = directive('/*', 'connect-src');
    for (const host of ['https://www.googleapis.com', 'https://oauth2.googleapis.com', 'https://accounts.google.com/gsi/', 'https://api.github.com', 'https://raw.githubusercontent.com']) {
      expect(connect).toContain(host);
    }
    expect(directive('/*', 'script-src')).toContain('https://accounts.google.com/gsi/client');
    expect(directive('/*', 'frame-src')).toEqual(['https://accounts.google.com/gsi/']);
    // 미리보기 그림은 raw.githubusercontent.com에서 읽습니다(img-src가 https:를 허용).
    expect(directive('/*', 'img-src')).toContain('https:');
  });

  it('운영 서버나 DB의 주소가 어디에도 없다', () => {
    expect(headersText).not.toMatch(/supabase|railway|vercel/i);
  });

  it('구체적인 규칙은 기본 규칙의 헤더를 모두 떼어 낸 뒤 자기 값을 적는다', () => {
    const global = Object.keys(rules['/*'].headers).sort();
    for (const path of ['/assets/*', '/pyodide/*', '/embed/*']) {
      expect([...rules[path].detached].sort()).toEqual(global);
      expect(rules[path].headers['content-security-policy']).toBeTruthy();
      expect(rules[path].headers['x-content-type-options']).toBe('nosniff');
    }
  });

  it('정적 폴더는 1년 캐시이고, 로그인 관련 주소를 열지 않는다', () => {
    for (const path of ['/assets/*', '/pyodide/*']) {
      expect(rules[path].headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(rules[path].headers['content-security-policy']).not.toMatch(/accounts\.google\.com|api\.github\.com/);
    }
  });

  it('임베드는 다른 사이트의 iframe에 넣을 수 있고, 로그인 관련 주소를 열지 않는다', () => {
    expect(directive('/embed/*', 'frame-ancestors')).toEqual(['*']);
    expect(rules['/embed/*'].headers['x-frame-options']).toBeUndefined();
    expect(rules['/embed/*'].headers['content-security-policy']).not.toMatch(/accounts\.google\.com|api\.github\.com/);
  });

  it('모든 주소를 index.html로 보내는 _redirects를 두지 않는다(정적 폴더의 404가 사라진다)', () => {
    expect(existsSync(resolve(clientRoot, 'public/_redirects'))).toBe(false);
    expect(existsSync(resolve(clientRoot, 'public/404.html'))).toBe(false);
  });
});

describe('정적 폴더의 404 (pages-static.mjs)', () => {
  it('있는 정적 폴더마다 404.html을 넣고 맨 위에는 넣지 않는다', () => {
    const out = mkdtempSync(join(tmpdir(), 'vpylab-pages-'));
    try {
      mkdirSync(join(out, 'assets'));
      mkdirSync(join(out, 'pyodide'));
      writeFileSync(join(out, 'index.html'), '<html></html>');
      expect(writeStaticNotFound(out)).toEqual(['assets', 'pyodide']);
      expect(readFileSync(join(out, 'assets/404.html'), 'utf8')).toBe(NOT_FOUND_HTML);
      expect(existsSync(join(out, 'pyodide/404.html'))).toBe(true);
      expect(existsSync(join(out, 'projects'))).toBe(false);
      expect(existsSync(join(out, '404.html'))).toBe(false);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('맨 위에 404.html이 있으면 멈춘다(SPA 대체가 꺼지기 때문)', () => {
    const out = mkdtempSync(join(tmpdir(), 'vpylab-pages-'));
    try {
      writeFileSync(join(out, '404.html'), 'x');
      expect(() => writeStaticNotFound(out)).toThrow('SPA 대체');
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('정적 폴더 목록에 빌드 결과의 폴더가 들어 있다', () => {
    expect(STATIC_DIRS).toEqual(expect.arrayContaining(['assets', 'pyodide']));
  });
});
