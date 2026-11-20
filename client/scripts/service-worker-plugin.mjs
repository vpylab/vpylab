/**
 * Vite 플러그인: 빌드 산출물 목록을 넣은 sw.js를 outDir 루트에 만듭니다.
 * 개발 서버에서는 Service Worker를 만들지 않습니다(소스 변경이 캐시에 가려지지 않게).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PYODIDE_VERSION } from './pyodide-assets.mjs';

const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = resolve(clientRoot, 'src/sw/service-worker.js');

/** public/에서 그대로 복사되는 파일 가운데 함께 미리 저장할 것. 번들 밖이라 따로 넣습니다. */
export const PUBLIC_PRECACHE = ['manifest.webmanifest', 'silent.wav'];

function revisionOf(source) {
  return createHash('sha256').update(typeof source === 'string' ? source : Buffer.from(source)).digest('hex').slice(0, 16);
}

/** 미리 저장할 산출물: JS·CSS·HTML·글꼴·SVG와 public/의 웹 매니페스트. 소스맵과 sw.js 자체는 제외합니다. */
export function buildPrecacheManifest(bundle, { publicDir = resolve(clientRoot, 'public'), publicFiles = PUBLIC_PRECACHE } = {}) {
  const manifest = [];
  for (const [fileName, output] of Object.entries(bundle)) {
    if (fileName === 'sw.js' || fileName.endsWith('.map')) continue;
    if (!/\.(js|css|html|woff2?|svg)$/.test(fileName)) continue;
    const source = output.type === 'chunk' ? output.code : output.source;
    const revision = /-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(fileName) ? null : revisionOf(source);
    // 편집기 전용 파일은 처음 편집할 때 저장합니다. 앱 버전 해시에는 계속 포함합니다.
    const editor = /^assets\/(monaco-|MonacoEditor-|editor\.worker-)/.test(fileName);
    manifest.push({ url: fileName, revision, ...(editor && { editor: true }) });
  }
  for (const fileName of publicFiles) {
    const path = resolve(publicDir, fileName);
    if (!existsSync(path)) continue;
    manifest.push({ url: fileName, revision: revisionOf(readFileSync(path)) });
  }
  manifest.sort((a, b) => a.url.localeCompare(b.url));
  return manifest;
}

export function renderServiceWorker({ manifest, appShell, template = readFileSync(TEMPLATE, 'utf8') }) {
  const buildId = createHash('sha256').update(JSON.stringify(manifest)).digest('hex').slice(0, 12);
  return template
    .replace('self.__PRECACHE_MANIFEST__', JSON.stringify(manifest))
    .replace('self.__BUILD_ID__', JSON.stringify(buildId))
    .replace('self.__APP_SHELL__', JSON.stringify(appShell))
    .replace('self.__PYODIDE_VERSION__', JSON.stringify(PYODIDE_VERSION));
}

let preferredAppShell = 'index.html';

/**
 * SPA 진입 HTML 이름을 지정합니다. 기본 index.html, 교실 앱은 classroom.html.
 * 기본 설정을 mergeConfig로 확장하는 설정 파일에서 호출합니다(플러그인을 두 번 넣지 않기 위해).
 */
export function setServiceWorkerAppShell(name) { preferredAppShell = name; }

/** 번들에 있는 HTML 가운데 앱 셸을 고릅니다. 지정한 이름이 없으면 첫 HTML을 씁니다. */
export function pickAppShell(manifest, preferred = preferredAppShell) {
  const htmls = manifest.filter(({ url }) => url.endsWith('.html')).map(({ url }) => url);
  if (htmls.includes(preferred)) return preferred;
  return htmls[0] || null;
}

export function serviceWorker() {
  return {
    name: 'vpylab-service-worker',
    apply: 'build',
    // Vite가 HTML을 번들에 넣는 generateBundle 뒤에 실행되어야 앱 셸이 목록에 들어갑니다.
    enforce: 'post',
    generateBundle(_options, bundle) {
      const manifest = buildPrecacheManifest(bundle);
      const appShell = pickAppShell(manifest);
      if (!appShell) return;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: renderServiceWorker({ manifest, appShell }) });
    },
  };
}
