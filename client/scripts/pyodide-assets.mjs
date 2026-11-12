/**
 * Pyodide 핵심 파일을 같은 출처(/pyodide/v<버전>/)에서 제공하기 위한 빌드 도구입니다.
 *
 * - npm `pyodide` 패키지(버전 고정)에서 핵심 파일만 public/ 아래로 복사합니다.
 * - pyodide-lock.json의 패키지 경로는 CDN 절대 주소로 바꿉니다. 그래서 numpy 같은
 *   선택 패키지는 CDN에서 받고, 핵심 파일만 같은 출처에서 받습니다.
 * - 선택 패키지까지 같은 출처에서 제공하려면 `bundledPackages`에 적힌 휠을 로컬 경로로 남겨 둡니다.
 */
import { createRequire } from 'node:module';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const PYODIDE_VERSION = '0.27.0';
export const PYODIDE_PUBLIC_PATH = `/pyodide/v${PYODIDE_VERSION}/`;
export const PYODIDE_CDN_BASES = [
  `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,
  `https://unpkg.com/pyodide@${PYODIDE_VERSION}/`,
];
/** Worker가 초기화에 꼭 받는 파일. 이 다섯 개만 같은 출처에 둡니다. */
export const PYODIDE_CORE_FILES = ['pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip'];
export const PYODIDE_LOCK_FILE = 'pyodide-lock.json';

export function pyodidePackageDir() {
  const packageJson = require.resolve('pyodide/package.json', { paths: [clientRoot] });
  const dir = dirname(packageJson);
  const installed = JSON.parse(readFileSync(packageJson, 'utf8')).version;
  if (installed !== PYODIDE_VERSION) {
    throw new Error(`pyodide 패키지 버전이 ${installed}입니다. Worker와 캐시 경로는 ${PYODIDE_VERSION}에 맞춰져 있으니 package.json을 같은 버전으로 맞춰주세요.`);
  }
  return dir;
}

function sameFile(source, target) {
  if (!existsSync(target)) return false;
  const a = statSync(source), b = statSync(target);
  return a.size === b.size && b.mtimeMs >= a.mtimeMs;
}

/**
 * lock 파일을 다시 씁니다. 로컬에 두지 않는 패키지는 CDN 절대 주소를 가리킵니다.
 * Pyodide는 file_name이 절대 URL이면 indexURL과 합치지 않고 그대로 받습니다.
 */
export function rewriteLockFile(lockJson, { cdnBase = PYODIDE_CDN_BASES[0], bundledPackages = new Set() } = {}) {
  const lock = JSON.parse(JSON.stringify(lockJson));
  for (const [name, pkg] of Object.entries(lock.packages || {})) {
    if (bundledPackages.has(name)) continue;
    if (/^https?:\/\//.test(pkg.file_name)) continue;
    pkg.file_name = cdnBase + pkg.file_name;
  }
  return lock;
}

/**
 * 패키지 이름 목록을 받아 lock 파일의 depends를 따라 닫힌 집합을 만듭니다.
 * micropip.install이 lock에 있는 패키지를 loadPackage로 내려받으므로 micropip 자체도 포함합니다.
 */
export function resolvePackageClosure(lockJson, names) {
  const packages = lockJson.packages || {};
  const byImport = new Map();
  for (const [key, pkg] of Object.entries(packages)) {
    byImport.set(key, key);
    byImport.set(pkg.name, key);
    for (const imported of pkg.imports || []) byImport.set(imported, key);
  }
  const result = new Set();
  const queue = [...names, 'micropip'];
  while (queue.length) {
    const name = queue.shift();
    const key = byImport.get(name) ?? byImport.get(String(name).toLowerCase().replace(/_/g, '-'));
    if (!key) throw new Error(`Pyodide ${PYODIDE_VERSION} lock 파일에 없는 패키지입니다: ${name}`);
    if (result.has(key)) continue;
    result.add(key);
    queue.push(...(packages[key].depends || []));
  }
  return result;
}

/**
 * 핵심 파일을 publicDir/pyodide/v<버전>/ 아래로 복사하고 lock 파일을 씁니다.
 * @param {object} options
 * @param {string} options.publicDir  Vite public 디렉터리
 * @param {Set<string>} [options.bundledPackages]  로컬에도 두는 패키지(lock 키)
 * @param {(key: string, pkg: object) => string} [options.resolvePackageFile]  로컬 휠 경로를 돌려주는 함수
 */
export function preparePyodideAssets({ publicDir, bundledPackages = new Set(), resolvePackageFile } = {}) {
  const source = pyodidePackageDir();
  const target = join(publicDir, PYODIDE_PUBLIC_PATH);
  mkdirSync(target, { recursive: true });
  const copied = [];
  for (const file of PYODIDE_CORE_FILES) {
    const from = join(source, file), to = join(target, file);
    if (!sameFile(from, to)) { copyFileSync(from, to); copied.push(file); }
  }
  const lock = JSON.parse(readFileSync(join(source, PYODIDE_LOCK_FILE), 'utf8'));
  for (const key of bundledPackages) {
    const pkg = lock.packages[key];
    if (!pkg || !resolvePackageFile) throw new Error(`패키지 파일을 찾을 수 없습니다: ${key}`);
    const from = resolvePackageFile(key, pkg), to = join(target, pkg.file_name);
    if (!sameFile(from, to)) { copyFileSync(from, to); copied.push(pkg.file_name); }
  }
  const rewritten = rewriteLockFile(lock, { bundledPackages });
  writeFileSync(join(target, PYODIDE_LOCK_FILE), JSON.stringify(rewritten));
  const files = [...PYODIDE_CORE_FILES, PYODIDE_LOCK_FILE, ...[...bundledPackages].map((key) => lock.packages[key].file_name)];
  const bytes = files.reduce((sum, file) => sum + statSync(join(target, file)).size, 0);
  return { directory: target, files, copied, bytes };
}

/** Vite 플러그인: 개발 서버와 빌드 시작 때 핵심 파일을 public/으로 준비합니다. */
export function pyodideAssets() {
  let publicDir = join(clientRoot, 'public');
  const run = () => {
    const result = preparePyodideAssets({ publicDir });
    if (result.copied.length) console.log(`[pyodide] ${result.copied.join(', ')} → ${PYODIDE_PUBLIC_PATH}`);
  };
  return {
    name: 'vpylab-pyodide-assets',
    configResolved(config) { if (config.publicDir) publicDir = config.publicDir; },
    buildStart() { run(); },
    configureServer() { run(); },
  };
}
