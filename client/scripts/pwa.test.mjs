/**
 * PWA 설치 파일 검증: index.html의 매니페스트 링크·메타, 매니페스트 내용, 아이콘 파일,
 * Service Worker 사전 캐시 목록.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPrecacheManifest } from './service-worker-plugin.mjs';

const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(clientRoot, path), 'utf8');

describe('PWA 설치 파일', () => {
  const html = read('index.html');
  const manifest = JSON.parse(read('public/manifest.webmanifest'));

  it('index.html이 매니페스트와 설치용 메타를 가리킨다', () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(html).toMatch(/<meta name="theme-color" content="#FFFFFF" \/>/);
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="VPyLab" />');
    expect(html).toContain('<meta property="og:image" content="https://vpylab.pages.dev/brand/og-default.png" />');
  });

  it('매니페스트는 독립 창으로 열리고 DESIGN.md의 밝은 테마 색을 쓴다', () => {
    expect(manifest.name).toBe('VPyLab');
    expect(manifest.short_name).toBe('VPyLab');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#FFFFFF');
    expect(manifest.background_color).toBe('#F8FAFC');
  });

  it('any·maskable 아이콘이 모두 public/에 있다', () => {
    const purposes = manifest.icons.map((icon) => icon.purpose);
    expect(purposes).toContain('any');
    expect(purposes).toContain('maskable');
    for (const icon of manifest.icons) {
      expect(existsSync(resolve(clientRoot, 'public', icon.src.replace(/^\//, '')))).toBe(true);
    }
    expect(existsSync(resolve(clientRoot, 'public/brand/og-default.png'))).toBe(true);
  });

  it('Service Worker 사전 캐시 목록에 public/의 매니페스트가 들어간다', () => {
    // public/ 파일은 Vite 번들에 없으므로 플러그인이 디스크에서 읽어 넣는다
    const manifestEntries = buildPrecacheManifest({
      'index.html': { type: 'asset', source: '<html></html>' },
      'icon-192.png': { type: 'asset', source: Buffer.alloc(4) },
      'assets/app-abcdef123456.js': { type: 'chunk', code: '' },
    });
    const entry = manifestEntries.find((item) => item.url === 'manifest.webmanifest');
    expect(entry).toBeTruthy();
    expect(entry.revision).toMatch(/^[0-9a-f]{16}$/);
    const urls = manifestEntries.map((item) => item.url);
    expect(urls).toContain('index.html');
    expect(urls).not.toContain('icon-192.png');
  });
});
