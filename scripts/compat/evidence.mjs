import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// 서로 다른 코드 버전의 정적·브라우저 결과를 하나의 통과율로 합치지 않습니다.
export async function compatibilityFingerprint(root) {
  const names = [
    'scripts/compat/corpus/corpus.json', 'scripts/compat/preprocess.mjs', 'scripts/compat/static-harness.py',
    'client/src/engine/vpython-api.py', 'client/src/engine/student-code-transform.py',
    'client/src/engine/pyodide-worker.js', 'client/src/engine/vpython-bridge.js',
    'client/src/engine/graph2d-system.js', 'shared/standalone-template.js',
    'client/src/engine/mesh-geometry.js', 'client/src/engine/text3d-system.js', 'client/src/engine/texture-system.js',
    'client/src/engine/widgets-system.js', 'client/src/engine/camera-system.js', 'shared/compound-appearance.js', 'shared/camera-system.js', 'shared/primitive-geometry.js',
    'client/src/engine/pyodide-singleton.js', 'client/src/components/viewport/Viewport3D.jsx',
  ];
  const files = await Promise.all(names.map(async name => [name, createHash('sha256').update(await readFile(path.join(root, name))).digest('hex')]));
  return Object.fromEntries(files);
}

export function sameCompatibilityEvidence(first, second) {
  if (!first || !second || Object.keys(first).length === 0) return false;
  return JSON.stringify(Object.entries(first).sort()) === JSON.stringify(Object.entries(second).sort());
}
