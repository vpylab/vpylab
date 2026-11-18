// 학생 코드가 import한 패키지를 실행 전에 설치하는 규칙입니다. 내려받은 HTML(server/utils/standalone-template.js)이 씁니다.
// 독립 HTML에 함수 본문을 그대로 싣기 때문에(toString) 바깥 이름을 참조하지 않습니다.
//
// 편집기의 Worker(client/src/engine/pyodide-worker.js)는 classic Worker라 이 파일을 import할 수 없어 같은 규칙을 따로 갖고 있습니다.
// 두 쪽의 목록(표준 모듈, IMPORT_TO_PACKAGE, 철자 실수 검사 이름)·Python 코드·안내 문구·판정 결과가 같은지는
// server/utils/package-imports.test.js가 확인합니다. 한쪽을 고치면 다른 쪽도 같이 고칩니다.
export function createPackageImportTools() {
  /**
   * 학생 코드의 import 문을 읽어, 실행 전에 설치해 볼 외부 패키지를 고릅니다.
   * - 표준 라이브러리와 VPyLab 내장 모듈(vpython, js 등)은 설치하지 않습니다.
   *   이 목록에 없는 표준 모듈도 실행 직전 Python의 sys.stdlib_module_names·find_spec으로 한 번 더 거릅니다.
   * - import 이름과 설치 이름이 다른 패키지는 IMPORT_TO_PACKAGE 대응표로 바꿉니다.
   * - 대응표에 없는 이름은 import 이름 그대로 설치를 시도합니다(패키지 이름만, 주소·파일 경로는 받지 않음).
   * - 주석·문자열 안의 import, 상대 import(from . import x)는 무시합니다.
   */
  const STDLIB_MODULES = new Set([
    'sys', 'os', 'io', 'json', 'math', 'random', 'time', 'datetime',
    'collections', 'itertools', 'functools', 'operator', 'string',
    're', 'copy', 'types', 'typing', 'abc', 'enum', 'dataclasses',
    'decimal', 'fractions', 'statistics', 'cmath', 'numbers',
    'asyncio', 'concurrent', 'threading', 'queue', 'sched',
    'pathlib', 'glob', 'fnmatch', 'shutil', 'tempfile',
    'csv', 'textwrap', 'difflib', 'heapq', 'bisect', 'array', 'weakref',
    'struct', 'codecs', 'unicodedata', 'contextlib', 'inspect', 'ast', 'keyword',
    'html', 'xml', 'base64', 'binascii', 'hashlib', 'hmac', 'secrets', 'uuid',
    'zlib', 'gzip', 'zipfile', 'tarfile', 'pickle', 'calendar', 'locale',
    'pprint', 'reprlib', 'traceback', 'warnings', 'logging', 'timeit', 'argparse',
    'unittest', 'doctest', 'platform', 'urllib', 'http', 'email', 'graphlib', 'zoneinfo',
    'builtins', '__future__',
    // VPython·Pyodide 내장 모듈은 제외
    'vpython', 'js', 'pyodide', 'pyodide_js', 'micropip',
  ]);

  // import 이름 → 설치(배포) 이름. 같은 이름이면 적지 않아도 됩니다.
  const IMPORT_TO_PACKAGE = {
    'np': 'numpy',
    'pd': 'pandas',
    'sklearn': 'scikit-learn',
    'skimage': 'scikit-image',
    'PIL': 'Pillow',
    'yaml': 'PyYAML',
    'bs4': 'beautifulsoup4',
    'dateutil': 'python-dateutil',
    'cv2': 'opencv-python',
    'Bio': 'biopython',
  };

  // 철자 실수로 PyPI의 엉뚱한 패키지를 받지 않도록, 아래 이름과 한 글자만 다른 import는 설치하지 않습니다.
  // (예: import maths, import randon, import numpi) — 원래의 ModuleNotFoundError로 이어집니다.
  const TYPO_GUARD_NAMES = [...STDLIB_MODULES, 'numpy', 'pandas', 'matplotlib', 'scipy', 'sympy', 'sklearn', 'networkx']
    .filter(name => name.length >= 4);

  // PEP 508 배포 이름 꼴만 허용합니다(주소·경로·버전 지정 문자 불가).
  const PACKAGE_NAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;
  const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

  function isOneEditApart(a, b) {
    if (a === b || Math.abs(a.length - b.length) > 1) return false;
    let i = 0;
    let j = 0;
    let edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (a.length > b.length) i++;
      else if (a.length < b.length) j++;
      else { i++; j++; }
    }
    return edits + (a.length - i) + (b.length - j) === 1;
  }

  /** 주석과 문자열 내용을 지우고(줄바꿈은 남김) 괄호·역슬래시로 이어진 줄을 한 줄로 합칩니다. */
  function toLogicalStatements(code) {
    let text = '';
    let i = 0;
    const n = code.length;
    while (i < n) {
      const ch = code[i];
      if (ch === '#') {
        while (i < n && code[i] !== '\n') i++;
        continue;
      }
      if (ch === '"' || ch === "'") {
        const quote = code.startsWith(ch.repeat(3), i) ? ch.repeat(3) : ch;
        i += quote.length;
        while (i < n) {
          if (code[i] === '\\') { i += 2; continue; }
          if (code.startsWith(quote, i)) { i += quote.length; break; }
          if (code[i] === '\n') {
            if (quote.length === 1) break;
            text += '\n';
          }
          i++;
        }
        text += '""';
        continue;
      }
      text += ch;
      i++;
    }
    let joined = '';
    let depth = 0;
    for (let k = 0; k < text.length; k++) {
      const ch = text[k];
      if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) depth = Math.max(0, depth - 1);
      if (ch === '\\' && text[k + 1] === '\n') { joined += ' '; k++; continue; }
      joined += ch === '\n' && depth > 0 ? ' ' : ch;
    }
    return joined.split(/[\n;]/).map(line => line.trim()).filter(Boolean);
  }

  /** 학생 코드가 import하는 최상위 모듈 이름(중복 없음, 나온 순서). */
  function detectImportedModules(code) {
    const modules = [];
    const add = (dotted) => {
      const top = String(dotted).split('.')[0];
      if (IDENTIFIER_RE.test(top) && !modules.includes(top)) modules.push(top);
    };
    for (const statement of toLogicalStatements(String(code ?? ''))) {
      // 'try: import x', 'else: import x'처럼 같은 줄의 블록 머리는 떼고 봅니다.
      const body = statement.replace(/^(?:try|else|finally|except\b[^:]*|if\b[^:]*|elif\b[^:]*)\s*:\s*/, '');
      let match = body.match(/^import\s+(.+)$/);
      if (match) {
        for (const part of match[1].split(',')) add(part.trim().split(/\s+/)[0]);
        continue;
      }
      match = body.match(/^from\s+([A-Za-z_][\w.]*)\s+import\b/);
      if (match) add(match[1]); // 'from .x import y'(상대 import)는 이 꼴에 맞지 않아 무시됩니다.
    }
    return modules;
  }

  /** import 이름마다 설치해 볼 패키지 이름. 표준·내장 모듈과 철자 실수로 보이는 이름은 뺍니다. */
  function detectImportCandidates(code) {
    const candidates = [];
    for (const module of detectImportedModules(code)) {
      if (STDLIB_MODULES.has(module)) continue;
      const mapped = Object.hasOwn(IMPORT_TO_PACKAGE, module) ? IMPORT_TO_PACKAGE[module] : null;
      if (!mapped && TYPO_GUARD_NAMES.some(name => isOneEditApart(module, name))) continue;
      const packageName = mapped || module;
      if (!PACKAGE_NAME_RE.test(packageName)) continue;
      candidates.push({ module, package: packageName });
    }
    return candidates;
  }

  // 실행 직전, 이미 import할 수 있는 모듈(표준·내장·전에 설치한 것)을 Python에서 거릅니다.
  const PY_MISSING_MODULES = `
def _vpylab_missing_modules(names_json):
    import importlib.util, json, sys
    missing = []
    for name in json.loads(names_json):
        if name in sys.stdlib_module_names or name in sys.builtin_module_names:
            continue
        try:
            if importlib.util.find_spec(name) is not None:
                continue
        except (ImportError, ValueError):
            pass
        missing.append(name)
    return json.dumps(missing)
_vpylab_missing_modules(__vpylab_import_names__)
`;

  // 한꺼번에 설치해 보고, 실패하면 하나씩 설치해 어느 패키지가 안 되는지 가립니다.
  // 결과: { 설치 이름: null(성공) | 'notfound' | 'nowheel' | 'other' }
  const PY_INSTALL_PACKAGES = `
async def _vpylab_install_packages(packages_json):
    import json, micropip
    packages = json.loads(packages_json)
    def _kind(err):
        text = str(err)
        if 'pure Python' in text or 'wheel' in text.lower() and 'compatible' in text.lower():
            return 'nowheel'
        if "Can't fetch metadata" in text or 'No matching distribution' in text or 'not found' in text.lower():
            return 'notfound'
        return 'other'
    try:
        await micropip.install(packages)
        return json.dumps({pkg: None for pkg in packages})
    except Exception:
        pass
    result = {}
    for pkg in packages:
        try:
            await micropip.install(pkg)
            result[pkg] = None
        except Exception as err:
            result[pkg] = _kind(err)
    return json.dumps(result)
await _vpylab_install_packages(__vpylab_install_names__)
`;

  const INSTALL_FAILURE_MESSAGES = {
    notfound: '⚠️ {0}: 이 이름의 패키지를 찾지 못했습니다. import 이름과 설치 이름이 다를 수 있습니다.',
    nowheel: '⚠️ {0}: 브라우저 파이썬(Pyodide)에서 쓸 수 없는 패키지입니다.',
    other: '⚠️ {0}: 설치하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 실행합니다.',
  };

  function parseJsonList(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  async function findMissingModules(pyodide, modules) {
    pyodide.globals.set('__vpylab_import_names__', JSON.stringify(modules));
    try {
      return parseJsonList(await pyodide.runPythonAsync(PY_MISSING_MODULES), modules);
    } catch {
      return modules;
    }
  }

  /**
   * 필요한 패키지를 설치하고 결과를 log로 알립니다. 편집기 Worker의 installImportedPackages와 같은 순서입니다.
   * 1) Pyodide 배포판에 든 패키지는 loadPackagesFromImports로 먼저 불러오고 2) 남은 것만 micropip으로 PyPI에서 받습니다.
   * 설치에 실패해도 예외를 던지지 않아 실행은 계속되고, 학생은 원래의 ModuleNotFoundError를 봅니다.
   * @returns {Promise<Record<string, null|string>>} 설치 이름별 결과(null = 성공)
   */
  async function installImportedPackages(pyodide, code, log = () => {}) {
    const pending = detectImportCandidates(code);
    if (pending.length === 0) return {};

    const missingModules = await findMissingModules(pyodide, pending.map(item => item.module));
    const packages = [...new Set(pending.filter(item => missingModules.includes(item.module)).map(item => item.package))];
    if (packages.length === 0) return {};

    let results = null;
    try {
      log(`📦 ${packages.join(', ')} 설치 중...`);
      let remaining = packages;
      // 1) Pyodide 배포판에 든 패키지(예: import pygame → pygame-ce, import cv2 → opencv-python)는
      //    Pyodide가 가진 import 이름 대응표로 먼저 불러옵니다.
      if (typeof pyodide.loadPackagesFromImports === 'function') {
        const items = pending.filter(item => packages.includes(item.package));
        const modules = items.map(item => item.module);
        try {
          await pyodide.loadPackagesFromImports(modules.map(name => `import ${name}`).join('\n'), {
            messageCallback: () => {}, errorCallback: () => {},
          });
        } catch { /* 배포판에 없거나 받지 못하면 아래 micropip이 다시 시도합니다 */ }
        const stillMissing = await findMissingModules(pyodide, modules);
        remaining = [...new Set(items.filter(item => stillMissing.includes(item.module)).map(item => item.package))];
      }
      results = Object.fromEntries(packages.filter(pkg => !remaining.includes(pkg)).map(pkg => [pkg, null]));
      if (remaining.length > 0) {
        // 2) 나머지는 micropip으로 PyPI에서(순수 파이썬 패키지만) 받습니다.
        log('📦 패키지 관리자 준비 중...');
        await pyodide.loadPackage('micropip');
        pyodide.globals.set('__vpylab_install_names__', JSON.stringify(remaining));
        const raw = await pyodide.runPythonAsync(PY_INSTALL_PACKAGES);
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch { parsed = null; }
        // 결과를 읽지 못하면(오래된 환경 등) 예외 없이 끝난 설치는 성공으로 봅니다.
        if (!parsed || typeof parsed !== 'object') parsed = Object.fromEntries(remaining.map(pkg => [pkg, null]));
        Object.assign(results, parsed);
      }
    } catch {
      // 패키지 관리자를 받지 못한 경우 등: 결과가 없는 패키지는 실패로 알리고 실행은 이어 갑니다.
      results = results || {};
      for (const pkg of packages) {
        if (!Object.hasOwn(results, pkg)) results[pkg] = 'other';
      }
    }

    const installed = packages.filter(pkg => results[pkg] === null);
    if (installed.length > 0) log(`✅ ${installed.join(', ')} 설치 완료!`);
    for (const pkg of packages) {
      const kind = results[pkg];
      if (!kind) continue;
      const template = INSTALL_FAILURE_MESSAGES[kind] || INSTALL_FAILURE_MESSAGES.other;
      log(template.replace('{0}', pkg));
    }
    return results;
  }

  return {
    STDLIB_MODULES, IMPORT_TO_PACKAGE, TYPO_GUARD_NAMES, PACKAGE_NAME_RE,
    PY_MISSING_MODULES, PY_INSTALL_PACKAGES, INSTALL_FAILURE_MESSAGES,
    detectImportedModules, detectImportCandidates, installImportedPackages,
  };
}
