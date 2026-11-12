/**
 * Cloudflare Pages용 빌드 마무리.
 *
 * Cloudflare Pages는 맨 위에 404.html이 없으면 없는 주소를 index.html로 응답합니다(SPA 대체). 화면 경로(/sandbox 등)에는
 * 이 동작이 필요하지만, 정적 폴더(/assets, /pyodide 등)의 없는 파일까지 index.html이 200으로 나가면
 * 그 폴더의 1년 캐시 헤더가 붙은 채 브라우저에 남습니다(배포 직후 옛 파일 이름을 찾는 경우).
 * 그래서 정적 폴더마다 404.html을 넣어, 그 폴더의 없는 파일은 404로 응답하게 합니다.
 * 맨 위에는 404.html을 만들지 않으므로 화면 경로의 SPA 대체는 그대로입니다.
 *
 * 응답 헤더는 client/public/_headers에 있습니다.
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** 없는 파일에 404를 돌려줄 정적 폴더(빌드 결과 기준) */
export const STATIC_DIRS = ['assets', 'pyodide', 'projects'];
export const NOT_FOUND_HTML = '<!doctype html><meta charset="utf-8"><title>404</title><p>파일을 찾을 수 없습니다.</p>\n';

/** outDir의 정적 폴더마다 404.html을 씁니다. 쓴 폴더 이름을 돌려줍니다. */
export function writeStaticNotFound(outDir, dirs = STATIC_DIRS) {
  if (existsSync(resolve(outDir, '404.html'))) {
    throw new Error('맨 위에 404.html이 있으면 Cloudflare Pages가 SPA 대체를 하지 않습니다.');
  }
  const written = [];
  for (const dir of dirs) {
    const target = resolve(outDir, dir);
    if (!existsSync(target) || !statSync(target).isDirectory()) continue;
    mkdirSync(target, { recursive: true });
    writeFileSync(resolve(target, '404.html'), NOT_FOUND_HTML);
    written.push(dir);
  }
  return written;
}

/** Vite 플러그인: 빌드가 끝난 뒤 정적 폴더에 404.html을 넣습니다. */
export function pagesStatic() {
  let outDir = 'dist';
  return {
    name: 'vpylab-pages-static',
    apply: 'build',
    configResolved(config) { outDir = resolve(config.root, config.build.outDir); },
    closeBundle: {
      // 다른 플러그인(Pyodide 파일 복사)이 폴더를 만든 뒤에 실행합니다.
      order: 'post',
      sequential: true,
      handler() { writeStaticNotFound(outDir); },
    },
  };
}
