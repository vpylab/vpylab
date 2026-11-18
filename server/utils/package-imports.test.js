import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInContext, runInNewContext } from 'node:vm';
import { createPackageImportTools } from '../shared/package-imports.js';

// 내려받은 HTML이 쓰는 규칙(server/shared/package-imports.js)과 편집기 Worker(client/src/engine/pyodide-worker.js)의 규칙이
// 같은지 확인합니다. Worker는 classic Worker라 공용 파일을 import하지 못해 같은 규칙을 따로 갖고 있습니다.
const workerSource = readFileSync(new URL('../../client/src/engine/pyodide-worker.js', import.meta.url), 'utf8');
const tools = createPackageImportTools();

function loadWorker() {
  const posted = [];
  const self = Object.create({ fetch: () => Promise.resolve(), WebSocket() {}, indexedDB: {}, caches: {} });
  self.postMessage = message => posted.push(message);
  const context = { self, importScripts() {}, setTimeout, clearTimeout, URL };
  runInNewContext(workerSource, context);
  // 다른 문맥(realm)의 값이라 JSON으로 옮겨 비교합니다.
  const read = expression => JSON.parse(runInContext(`JSON.stringify(${expression})`, context));
  return { context, self, posted, read };
}

const plain = value => JSON.parse(JSON.stringify(value));

// 판정을 비교할 예시 코드. Worker 테스트(pyodide-worker.imports.test.js)의 예시와 까다로운 꼴을 모았습니다.
const SAMPLES = [
  'import qrcode\nimport numpy as np, segno\nfrom matplotlib.pyplot import plot\nimport a.b.c as d',
  '# import fakeone\nx = "import faketwo"\ny = \'\'\'\nimport fakethree\n\'\'\'\nprint("from fakefour import z")  # from fakefive import w\nimport real',
  'from . import helper\nfrom .utils import f\nfrom ..pkg import g',
  'def f():\n    import inner\nx = 1; import semi\nfrom paren import (\n    a,\n    b,\n)\nimport \\\n    slash\ntry: import trial\nexcept ImportError: pass',
  'important = 1\nimports = []\nfromage = 2',
  'import math, random, heapq\nfrom vpython import *\nimport js\nfrom collections import deque',
  'import sklearn\nfrom PIL import Image\nimport yaml\nimport bs4\nimport cv2\nimport np\nimport Bio.Seq',
  'import maths\nimport randon\nimport numpi\nimport jsonn\nimport pandaz\nimport networks',
  'import segno\nimport pygame\nimport nosuchpkg\nimport 피지컬키트\nfrom 피지컬키트 import *',
  'if True: import cond\nelif x: import other\nelse: import fallback\nfinally: import last',
  's = "\\"import escaped\\""\nimport after_escape',
];

test('Worker와 내려받은 HTML의 설치 목록·Python 코드·안내 문구가 같다', () => {
  const { read } = loadWorker();
  assert.deepEqual(read('[...STDLIB_MODULES]'), [...tools.STDLIB_MODULES]);
  assert.deepEqual(read('IMPORT_TO_PACKAGE'), plain(tools.IMPORT_TO_PACKAGE));
  assert.deepEqual(read('TYPO_GUARD_NAMES'), plain(tools.TYPO_GUARD_NAMES));
  assert.equal(read('PACKAGE_NAME_RE.source'), tools.PACKAGE_NAME_RE.source);
  assert.equal(read('PY_MISSING_MODULES'), tools.PY_MISSING_MODULES);
  assert.equal(read('PY_INSTALL_PACKAGES'), tools.PY_INSTALL_PACKAGES);
  assert.deepEqual(read('INSTALL_FAILURE_MESSAGES'), plain(tools.INSTALL_FAILURE_MESSAGES));
});

test('Worker와 내려받은 HTML이 같은 코드에서 같은 모듈과 패키지를 고른다', () => {
  const { context } = loadWorker();
  for (const code of SAMPLES) {
    assert.deepEqual(plain(context.detectImportedModules(code)), plain(tools.detectImportedModules(code)), code);
    assert.deepEqual(plain(context.detectImportCandidates(code)), plain(tools.detectImportCandidates(code)), code);
  }
});

test('설치 후보: 표준·내장 모듈, 주석·문자열, 상대 import, 철자 실수는 빼고 대응표를 쓴다', () => {
  const packages = code => tools.detectImportCandidates(code).map(item => item.package);
  assert.deepEqual(packages('import math, random\nfrom vpython import *\nimport js\nimport micropip'), []);
  assert.deepEqual(packages('# import fake\nx = "import fake2"\nfrom . import helper\nimport segno'), ['segno']);
  assert.deepEqual(packages('import sklearn\nfrom PIL import Image\nimport yaml'), ['scikit-learn', 'Pillow', 'PyYAML']);
  assert.deepEqual(packages('import numpi\nimport maths\nimport randon'), []);
});

// 같은 가짜 Pyodide로 Worker와 공용 함수의 설치 흐름을 돌려, 남기는 안내가 같은지 봅니다.
function fakePython(scenario, globals) {
  const available = new Set(scenario.available || []);
  const calls = { loadPackage: [], fromImports: [], install: [] };
  const python = {
    calls,
    globals: { set: (key, value) => globals.set(key, value), get: key => globals.get(key) },
    loadPackage: async name => {
      calls.loadPackage.push(name);
      if (scenario.micropipFails) throw new Error('offline');
    },
    loadPackagesFromImports: async code => {
      calls.fromImports.push(code);
      for (const line of code.split('\n')) {
        const name = line.replace(/^import\s+/, '');
        if ((scenario.distro || []).includes(name)) available.add(name);
      }
    },
    runPythonAsync: async code => {
      if (code.includes('_vpylab_missing_modules(')) {
        return JSON.stringify(JSON.parse(globals.get('__vpylab_import_names__')).filter(name => !available.has(name)));
      }
      if (code.includes('_vpylab_install_packages(')) {
        const names = JSON.parse(globals.get('__vpylab_install_names__'));
        calls.install.push(names);
        return JSON.stringify(Object.fromEntries(names.map(name => [name, (scenario.failures || {})[name] ?? null])));
      }
      return undefined;
    },
  };
  return python;
}

async function workerTexts(scenario, code) {
  const { self, posted } = loadWorker();
  const python = fakePython(scenario, new Map());
  self.loadPyodide = async () => python;
  await self.onmessage({ data: { type: 'init', vpythonApi: '# API' } });
  posted.length = 0;
  await self.onmessage({ data: { type: 'run', runId: 1, code } });
  assert(posted.some(message => message.type === 'done'), '학생 코드 실행이 끝나야 합니다');
  return { texts: posted.filter(message => message.type === 'stdout' && message.system).map(message => message.text), calls: python.calls };
}

async function sharedTexts(scenario, code) {
  const python = fakePython(scenario, new Map());
  const texts = [];
  const results = await tools.installImportedPackages(python, code, text => texts.push(text));
  return { texts, calls: python.calls, results };
}

const SCENARIOS = [
  { name: '이미 있는 모듈', scenario: { available: ['qrcode'] }, code: 'import qrcode' },
  { name: '배포판 먼저, 나머지는 micropip', scenario: { distro: ['pygame', 'numpy'] }, code: 'import pygame\nimport numpy as np\nimport segno' },
  { name: '설치 실패 안내', scenario: { failures: { pygame: 'nowheel', nosuchpkg: 'notfound', odd: 'weird' } }, code: 'import segno\nimport pygame\nimport nosuchpkg\nimport odd' },
  { name: '패키지 관리자를 받지 못함', scenario: { micropipFails: true }, code: 'import qrcode' },
  { name: '철자 실수', scenario: {}, code: 'import numpi\nimport maths' },
];

for (const { name, scenario, code } of SCENARIOS) {
  test(`설치 흐름이 Worker와 같다: ${name}`, async () => {
    const worker = await workerTexts(scenario, code);
    const shared = await sharedTexts(scenario, code);
    assert.deepEqual(shared.texts, worker.texts);
    assert.deepEqual(plain(shared.calls), plain(worker.calls));
  });
}

test('내려받은 HTML의 설치는 배포판 → micropip 순서이고 실패해도 예외를 던지지 않는다', async () => {
  const done = await sharedTexts({ distro: ['pygame'] }, 'import pygame\nimport segno');
  assert.deepEqual(done.calls.fromImports, ['import pygame\nimport segno']);
  assert.deepEqual(done.calls.loadPackage, ['micropip']);
  assert.deepEqual(done.calls.install, [['segno']]);
  assert.deepEqual(done.texts, ['📦 pygame, segno 설치 중...', '📦 패키지 관리자 준비 중...', '✅ pygame, segno 설치 완료!']);
  assert.deepEqual(done.results, { pygame: null, segno: null });

  const offline = await sharedTexts({ micropipFails: true }, 'import qrcode');
  assert.deepEqual(offline.results, { qrcode: 'other' });
  assert(offline.texts.at(-1).startsWith('⚠️ qrcode:'));

  const typo = await sharedTexts({}, 'import numpi');
  assert.deepEqual(typo, { texts: [], calls: { loadPackage: [], fromImports: [], install: [] }, results: {} });

  // Python 쪽 확인이 실패해도(예외) 설치를 시도하고 실행을 막지 않습니다.
  const broken = fakePython({}, new Map());
  broken.runPythonAsync = async () => { throw new Error('python failed'); };
  const texts = [];
  const results = await tools.installImportedPackages(broken, 'import segno', text => texts.push(text));
  assert.deepEqual(results, { segno: 'other' });
  assert.equal(texts.at(-1), tools.INSTALL_FAILURE_MESSAGES.other.replace('{0}', 'segno'));
});

test('HTML에 함수 본문을 실을 수 있도록 바깥 이름을 참조하지 않는다', () => {
  const embedded = runInNewContext(`(${createPackageImportTools.toString()})()`, {});
  assert.deepEqual(plain(embedded.detectImportCandidates('import segno\nimport numpi\nfrom PIL import Image')),
    [{ module: 'segno', package: 'segno' }, { module: 'PIL', package: 'Pillow' }]);
  assert.doesNotMatch(createPackageImportTools.toString(), /<\/script/i);
});
