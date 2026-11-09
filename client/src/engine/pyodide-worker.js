/* global importScripts */
/**
 * VPyLab — Pyodide Web Worker
 *
 * 보안 감사 결과 반영:
 * - Pyodide 로딩 완료 후 위험 API 삭제 (WebSocket, IndexedDB, importScripts, caches 등)
 *   fetch는 패키지 설치 중·패키지 출처에만 통과시키는 가드로 바꿉니다.
 * - Worker.terminate() 기반 강제 종료 (메인 스레드에서)
 * - 패키지 화이트리스트
 *
 * 중요: fetch/importScripts는 Pyodide 로딩에 필요하므로,
 *       Pyodide 초기화가 완료된 후에만 삭제한다.
 */

const PYODIDE_VERSION = '0.27.0';
// 1순위: 같은 출처(/pyodide/v<버전>/, 빌드 때 npm 패키지에서 복사). 학교망이 CDN을 막아도 동작하고
//        Service Worker·HTTP 캐시에 남아 재방문 때 네트워크 없이 시작합니다.
// 2순위: jsdelivr, 3순위: unpkg — 한 쪽이 일시 장애여도 다른 쪽으로 시도합니다.
const PYODIDE_LOCAL_BASE = (() => {
  try { return new URL(`/pyodide/v${PYODIDE_VERSION}/`, self.location.href).href; } catch { return null; }
})();
const PYODIDE_CDNS = [
  `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,
  `https://unpkg.com/pyodide@${PYODIDE_VERSION}/`,
];
const PYODIDE_SOURCES = [
  // 같은 출처는 404가 결정적이므로 한 번만 시도합니다.
  ...(PYODIDE_LOCAL_BASE ? [{ base: PYODIDE_LOCAL_BASE, attempts: 1 }] : []),
  ...PYODIDE_CDNS.map((base) => ({ base, attempts: 3 })),
];
let PYODIDE_CDN = PYODIDE_SOURCES[0].base;

let pyodide = null;
let vpythonApiCode = null;
// 학생 코드 변환기(student-code-transform.py). 실행 직전 Python ast로 rate() 등이 든 함수를
// async def로 바꾸고 호출에 await를 붙인다. 변환은 Worker 안의 Python이 맡는다.
let transformSourceCode = null;
// 피지컬 컴퓨팅 키트(physical-kit.py). vpython 모듈 다음에 `피지컬키트` 모듈로 등록한다.
let physicalKitCode = null;

// === 패키지 설치용 fetch 가드 ===
// 초기화 뒤 fetch를 완전히 지우면 Pyodide의 loadPackage/micropip도 fetch를 찾지 못해
// numpy 같은 패키지를 설치할 수 없습니다. 그래서 fetch 자리에 다음 조건을 모두 만족할 때만
// 통과시키는 가드를 둡니다. (1) Worker가 패키지를 설치하는 동안(학생 코드 실행 전)이고
// (2) 주소가 Pyodide 패키지 출처(같은 출처 /pyodide/, Pyodide CDN, PyPI)일 때.
// 학생 코드가 실행되는 동안에는 어떤 주소도 거부합니다.
const nativeFetch = typeof self.fetch === 'function' ? self.fetch.bind(self) : null;
let packageInstallDepth = 0;
function isPackageSource(url) {
  if (PYODIDE_LOCAL_BASE && url.href.startsWith(PYODIDE_LOCAL_BASE)) return true;
  return /^https:\/\/cdn\.jsdelivr\.net\/pyodide\//.test(url.href)
    || /^https:\/\/unpkg\.com\/pyodide@/.test(url.href)
    || /^https:\/\/pypi\.org\//.test(url.href)
    || /^https:\/\/files\.pythonhosted\.org\//.test(url.href);
}
function guardedFetch(input, init) {
  if (packageInstallDepth === 0 || !nativeFetch) {
    return Promise.reject(new TypeError('이 환경에서는 네트워크 요청을 할 수 없습니다.'));
  }
  let url;
  try { url = new URL(typeof input === 'string' ? input : input.url, PYODIDE_LOCAL_BASE || undefined); } catch { url = null; }
  if (!url || !isPackageSource(url)) {
    return Promise.reject(new TypeError('패키지 출처가 아닌 주소에는 요청할 수 없습니다.'));
  }
  return nativeFetch(input, init);
}
async function withPackageInstall(task) {
  packageInstallDepth += 1;
  try { return await task(); } finally { packageInstallDepth -= 1; }
}
let shouldStop = false;
let micropipLoaded = false;
let isRunningCode = false;
let isDispatchingEvents = false;
let currentRunId = 0;
let queuedRun = null;

// Python의 print()가 무한 반복되어도 Worker 메모리와 메시지 큐를 제한합니다.
const OUTPUT_BUFFER_LIMIT = 16_384;
const outputStreams = {
  stdout: { text: '', dropped: 0 },
  stderr: { text: '', dropped: 0 },
};
let outputFlushTimer = null;

self._queueOutput = (kind, value) => {
  const stream = outputStreams[kind];
  if (!stream) return;
  const text = String(value);
  const available = Math.max(0, OUTPUT_BUFFER_LIMIT - stream.text.length);
  stream.text += text.slice(0, available);
  stream.dropped += Math.max(0, text.length - available);
  if (outputFlushTimer === null) {
    outputFlushTimer = setTimeout(() => { void flushOutputStreams(); }, 75);
  }
};

function resetOutputStreams() {
  clearTimeout(outputFlushTimer);
  outputFlushTimer = null;
  for (const stream of Object.values(outputStreams)) {
    stream.text = '';
    stream.dropped = 0;
  }
}

// === 이벤트 큐 (메인 스레드 → Python) ===
const _eventQueue = [];
const _widgetValues = {};   // { widgetId: latestValue }
// input() 응답: { requestId: JSON 문자열 '{"value": "..."}' 또는 '{"cancelled": true}' }
const _inputValues = {};
let _mouseState = { pos: [0, 0, 0], pick: null };
const _mouseStates = new Map();
const _cameraStates = new Map();
let _cameraStateJson = null; // 메인 스레드가 보내는 카메라 상태 (scene.camera.pos 등 읽기용)
let _pressedKeysJson = '[]';  // 현재 눌려있는 키 목록 (JSON 직렬화)

self._popEvent = () => {
  return _eventQueue.length > 0 ? _eventQueue.shift() : null;
};
self._getMousePos = (id = 'scene') => (_mouseStates.get(id) || (id === 'scene' ? _mouseState : { pos: [0,0,0] })).pos;
self._getMousePick = (id = 'scene') => (_mouseStates.get(id) || (id === 'scene' ? _mouseState : { pick: null })).pick;
self._getCameraState = (id = 'scene') => id === 'scene' ? _cameraStateJson : _cameraStates.get(id) || null;
self._getWidgetValue = (id) => _widgetValues[id] ?? null;
self._getInputValue = (id) => _inputValues[id] ?? null;
self._getPressedKeys = () => _pressedKeysJson;
self._getCurrentRunId = () => currentRunId;

function sendRunMessage(runId, type, payload = {}) {
  self.postMessage({ type, runId, ...payload });
}

function sendProgress(percent, message) {
  self.postMessage({ type: 'progress', percent, message });
}

function clearInputQueues() {
  _eventQueue.length = 0;
  _mouseStates.clear();
  _cameraStates.clear();
  _cameraStateJson = null;
  _mouseState = { pos: [0,0,0], pick: null };
  for (const key of Object.keys(_widgetValues)) delete _widgetValues[key];
  for (const key of Object.keys(_inputValues)) delete _inputValues[key];
}

async function flushOutputStreams(runId = currentRunId) {
  clearTimeout(outputFlushTimer);
  outputFlushTimer = null;
  for (const [kind, stream] of Object.entries(outputStreams)) {
    if (stream.text) sendRunMessage(runId, kind, { text: stream.text.replace(/\n$/, '') });
    if (stream.dropped) sendRunMessage(runId, kind, { text: '출력이 너무 많아 일부를 생략했습니다.' });
    stream.text = '';
    stream.dropped = 0;
  }
}

async function dispatchQueuedEvents() {
  if (!pyodide || shouldStop || isRunningCode || isDispatchingEvents || _eventQueue.length === 0) return;
  isDispatchingEvents = true;
  sendRunMessage(currentRunId, 'event_start');
  try {
    // 핸들러가 rate()·sleep()·input()을 쓰면 별도 태스크로 돈다. 그 태스크가 끝날 때까지
    // 실행 상태(event_start~event_done)를 유지해 하트비트·정지 버튼·입력 위젯이 동작하게 한다.
    await pyodide.runPythonAsync('await _vpylab_dispatch_events()');
    await flushOutputStreams();
    if(shouldStop){clearInputQueues();await pyodide.runPythonAsync('_event_handlers.clear()');}
    sendRunMessage(currentRunId, 'event_done', {stopped:shouldStop});
  } catch (err) {
    const msg = takePythonTraceback(err);
    await flushOutputStreams();
    if (shouldStop || msg.includes('_StopExecution') || msg.includes('실행이 중지되었습니다')) {
      clearInputQueues();
      try{await pyodide.runPythonAsync('_event_handlers.clear()');}catch{/* 정지 중 정리 실패는 다음 실행의 reset에서 회수 */}
      sendRunMessage(currentRunId, 'event_done', { stopped: true });
    } else {
      sendRunMessage(currentRunId, 'error', { error: formatPythonError(msg), raw: msg, detail: parsePythonTraceback(msg, err.type) });
    }
  } finally {
    isDispatchingEvents = false;
    if (queuedRun) {
      const next = queuedRun;
      queuedRun = null;
      await runCode(next.code, next.runId);
    } else if (!shouldStop && _eventQueue.length > 0) {
      await dispatchQueuedEvents();
    }
  }
}

/**
 * Pyodide JS 스크립트를 importScripts로 로드 — 같은 출처 → CDN 순회 + 재시도
 * 같은 출처가 없거나(개발 서버에 파일이 없는 경우) CDN 한 곳이 장애여도 다음 출처로 넘어갑니다.
 */
function importPyodideScript() {
  const errors = [];
  for (const { base, attempts } of PYODIDE_SOURCES) {
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        importScripts(`${base}pyodide.js`);
        PYODIDE_CDN = base;  // 성공한 출처를 indexURL로도 사용
        return base;
      } catch (e) {
        const message = e.message || String(e);
        errors.push(`${base} attempt ${attempt + 1}: ${message}`);
        // CSP가 막은 fallback은 재시도해도 성공하지 않으므로 같은 출처 반복을 멈춥니다.
        if (/Content Security Policy|violates.*directive|blocked by CSP/i.test(message)) break;
      }
    }
  }
  throw new Error(`Pyodide 로드 실패: 학교/회사 네트워크가 CDN을 막았거나 일시 장애가 있습니다. 새로고침 후 다시 실행해 주세요. (${errors.slice(-2).join(' | ')})`);
}

/**
 * Pyodide 초기화
 */
async function initPyodide() {
  try {
    sendProgress(10, 'Pyodide 다운로드 중...');

    // 1. Pyodide JS 로드 — 같은 출처 → CDN 순회 + 재시도
    importPyodideScript();

    sendProgress(40, 'Python 엔진 초기화 중...');

    // 2. Pyodide WASM 로드 (fetch 필요) — JS 로드에 성공한 출처 사용
    pyodide = await self.loadPyodide({
      indexURL: PYODIDE_CDN,
    });

    sendProgress(70, 'VPython API 준비 중...');

    // 3. 학생 코드 변환기를 API 전역 `_vpylab_transform`에 모듈 객체로 둔다.
    //    sys.modules에 넣지 않으므로 학생 코드가 import해 바꿀 수 없고, 학생 전역(실행마다 새 딕셔너리)에는 보이지 않는다.
    if (transformSourceCode) {
      pyodide.globals.set('__vpylab_transform_source__', transformSourceCode);
      await pyodide.runPythonAsync(`
import types as _vpylab_types
_vpylab_transform = _vpylab_types.ModuleType('_vpylab_transform')
exec(compile(__vpylab_transform_source__, '${TRANSFORM_FILENAME}', 'exec'), _vpylab_transform.__dict__)
del _vpylab_types, __vpylab_transform_source__
`);
    }

    // 4. VPython API를 'vpython' 모듈로 등록 (한 번만)
    if (vpythonApiCode) {
      // vpython-api.py 코드를 실행하여 전역에 로드 (트레이스백에서 학생 코드와 구분되도록 파일 이름 지정)
      await pyodide.runPythonAsync(vpythonApiCode, { filename: API_FILENAME });
      // 'vpython' 모듈로 등록 — from vpython import * 가 동작하도록
      await pyodide.runPythonAsync(`
import sys
import types
vpython_module = types.ModuleType('vpython')
# 현재 전역에 정의된 VPython 클래스/함수를 모듈에 복사
_vpython_names = [
    'vector', 'vec', 'color', '\uc0c9\uc0c1', 'textures', '\ud14d\uc2a4\ucc98',
    'sphere', 'box', 'cylinder', 'arrow', 'cone', 'ring', 'compound',
    'pyramid', 'ellipsoid', 'helix', 'label', 'text', 'curve', 'points', 'frame',
    'vertex', 'triangle', 'quad', 'extrusion',
    'graph', 'gcurve', 'gdots', 'gvbars', 'ghbars',
    'slider', 'button', 'checkbox', 'radio', 'menu', 'winput',
    'scene', 'keysdown',
    'local_light', 'distant_light', 'attach_arrow',
    'rate', 'sleep', 'input', 'scene_background',
    'mag', 'mag2', 'hat', 'dot', 'cross', 'norm',
    'play_sound', 'play_note', 'play_note_and_wait', 'play_chord', 'play_sequence',
    'play_sfx', 'start_bgm', 'stop_bgm', 'note',
    'sound', 'sfx', 'bgm', 'chord',
    '\uc18c\ub9ac', '\uc74c\ud45c', '\ud6a8\uacfc\uc74c', '\ubc30\uacbd\uc74c\uc545', '\ubc30\uacbd\uc74c\uc545\uc815\uc9c0', '\ud654\uc74c',
    'NamedList',
    '\uc74c\uacc4', 'scale', '\ub192\uc740\uc74c\uacc4', 'high_scale', '\ub0ae\uc740\uc74c\uacc4', 'low_scale',
    '\ubb34\uc9c0\uac1c', 'rainbow', '\ub530\ub73b\ud55c\uc0c9', 'warm_colors', '\ucc28\uac00\uc6b4\uc0c9', 'cool_colors',
    '\uae30\ubcf8\uc0c9', 'basic_colors', '\ud30c\uc2a4\ud154', 'pastel_colors',
    'play_instrument', '\uc545\uae30',
    'scatter3d', 'surface3d', 'line3d', 'bar3d',
    '\uc0b0\uc810\ub3c4', '\ud45c\uba74\uadf8\ub798\ud504', '\uc120\uadf8\ub798\ud504', '\ub9c9\ub300\uadf8\ub798\ud504',
    # GlowScript 호환: 함수형 벡터 연산, 수학·난수·시간 함수, 별칭
    'simple_sphere', 'bumpmaps', 'proj', 'comp', 'diff_angle', 'rotate',
    'random', 'arange', 'clock', 'msclock', 'sign', 'combin', 'print_options',
    # GlowScript 호환: 캔버스·묶음·단면/경로 생성기·캡션 글자·부착물
    'canvas', 'group', 'shapes', 'paths', 'wtext', 'attach_trail', 'attach_light',
]
# GlowScript처럼 from vpython import * 가 math의 공개 이름(sin, cos, pi, sqrt ...)도 제공한다
import math as _math_for_export
_vpython_names += [_n for _n in dir(_math_for_export) if not _n.startswith('_')]
for _name in _vpython_names:
    if _name in dir():
        setattr(vpython_module, _name, eval(_name))
sys.modules['vpython'] = vpython_module
`);
      // vpython API 로딩 완료
    }

    // 4-1. 피지컬 컴퓨팅 키트 — 미션 장면·친구·장치를 숨겨 두는 모듈 (from 피지컬키트 import *)
    if (physicalKitCode) {
      pyodide.globals.set('__vpylab_kit_source__', physicalKitCode);
      await pyodide.runPythonAsync(`
import sys
import types
_kit_module = types.ModuleType('피지컬키트')
exec(compile(__vpylab_kit_source__, '${KIT_FILENAME}', 'exec'), _kit_module.__dict__)
sys.modules['피지컬키트'] = _kit_module
del _kit_module, __vpylab_kit_source__
`);
    }

    sendProgress(85, '보안 샌드박스 설정 중...');

    // 4. pyodide.http 모듈 차단
    await pyodide.runPythonAsync(`
import sys
if 'pyodide' in sys.modules:
    if hasattr(sys.modules['pyodide'], 'http'):
        delattr(sys.modules['pyodide'], 'http')
`);

    // 5. === 보안: 위험 API 삭제 (Pyodide 로딩 완료 후!) ===
    // 상속된 API도 가리도록 값을 고정합니다. delete만 하면 프로토타입의 API가 남습니다.
    // caches(Cache Storage)도 같은 출처 요청을 보내고 응답을 읽을 수 있으므로 함께 지웁니다.
    // (Worker CSP connect-src에 같은 출처 /pyodide/ 허용이 들어가면서 요청 가능한 API를 모두 막습니다.)
    Object.defineProperty(self, 'fetch', { value: guardedFetch, configurable: false, writable: false });
    for (const name of ['XMLHttpRequest', 'WebSocket', 'indexedDB', 'importScripts', 'Worker', 'SharedWorker', 'EventSource', 'caches']) {
      Object.defineProperty(self, name, { value: undefined, configurable: false, writable: false });
    }
    if (self.navigator) {
      delete self.navigator.sendBeacon;
    }

    sendProgress(100, '준비 완료!');
    // source: 핵심 파일을 받은 출처. 메인 스레드가 Service Worker 캐시를 채울 때 사용합니다.
    self.postMessage({ type: 'ready', source: PYODIDE_CDN, version: PYODIDE_VERSION });
  } catch (err) {
    self.postMessage({
      type: 'error',
      error: `Pyodide 초기화 실패: ${err.message}`,
    });
  }
}

/**
 * 코드에서 import 문을 분석하여 설치 필요한 외부 패키지 목록 반환
 * 표준 라이브러리(math, random, json 등)는 제외
 */
const STDLIB_MODULES = new Set([
  'sys', 'os', 'io', 'json', 'math', 'random', 'time', 'datetime',
  'collections', 'itertools', 'functools', 'operator', 'string',
  're', 'copy', 'types', 'typing', 'abc', 'enum', 'dataclasses',
  'decimal', 'fractions', 'statistics', 'cmath',
  'asyncio', 'concurrent', 'threading',
  'pathlib', 'glob', 'fnmatch',
  'csv', 'textwrap', 'difflib',
  'struct', 'codecs', 'unicodedata',
  'html', 'xml', 'base64', 'binascii', 'hashlib', 'hmac',
  'pprint', 'reprlib', 'traceback', 'warnings', 'logging',
  'unittest', 'doctest',
  // VPython 내장 모듈은 제외
  'vpython', 'js',
]);

// Pyodide에서 micropip으로 설치 가능한 패키지
const INSTALLABLE_PACKAGES = {
  'numpy': 'numpy',
  'np': 'numpy',
  'matplotlib': 'matplotlib',
  'pandas': 'pandas',
  'pd': 'pandas',
  'scipy': 'scipy',
  'sklearn': 'scikit-learn',
  'sympy': 'sympy',
};

// 이미 설치한 패키지 캐시
const installedPackages = new Set();

function detectRequiredPackages(code) {
  const needed = new Set();
  const lines = code.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // import numpy / import numpy as np
    let match = trimmed.match(/^import\s+(\w+)/);
    if (match) {
      const mod = match[1];
      if (!STDLIB_MODULES.has(mod) && INSTALLABLE_PACKAGES[mod]) {
        needed.add(INSTALLABLE_PACKAGES[mod]);
      }
    }
    // from numpy import ... / from matplotlib.pyplot import ...
    match = trimmed.match(/^from\s+(\w+)/);
    if (match) {
      const mod = match[1];
      if (!STDLIB_MODULES.has(mod) && INSTALLABLE_PACKAGES[mod]) {
        needed.add(INSTALLABLE_PACKAGES[mod]);
      }
    }
  }

  // 이미 설치된 것은 제외
  return [...needed].filter(pkg => !installedPackages.has(pkg));
}

/**
 * Python 코드 실행
 */
async function runCode(code, runId = currentRunId + 1) {
  if (!pyodide) {
    sendRunMessage(runId, 'error', { error: 'Python 엔진이 아직 준비되지 않았습니다.' });
    return;
  }

  if (isRunningCode || isDispatchingEvents) {
    // 실행 중이거나 본문 종료 뒤 이벤트 핸들러 태스크가 도는 중 — 멈춘 뒤 이어서 실행한다
    queuedRun = { code, runId };
    shouldStop = true;
    return;
  }

  try {
    currentRunId = runId;
    isRunningCode = true;
    resetOutputStreams();
    // 중단 플래그 리셋
    shouldStop = false;
    clearInputQueues();

    // Python에서 중단 신호를 확인할 수 있도록 JS 함수 노출
    self._checkStopSignal = () => shouldStop;

    // 필요한 패키지 자동 설치
    const packages = detectRequiredPackages(code);
    if (packages.length > 0) {
      // micropip 지연 로딩 (첫 사용 시에만). 설치 중에만 패키지 출처로의 fetch를 허용합니다.
      await withPackageInstall(async () => {
        if (!micropipLoaded) {
          sendRunMessage(runId, 'stdout', { system: true, text: '📦 패키지 관리자 준비 중...' });
          await pyodide.loadPackage('micropip');
          micropipLoaded = true;
        }
        sendRunMessage(runId, 'stdout', { system: true, text: `📦 ${packages.join(', ')} 설치 중...` });
        await pyodide.runPythonAsync(`
import micropip
await micropip.install(${JSON.stringify(packages)})
`);
      });
      for (const pkg of packages) {
        installedPackages.add(pkg);
      }
      sendRunMessage(runId, 'stdout', { system: true, text: `✅ ${packages.join(', ')} 설치 완료!` });
    }

    // Python 문자열 버퍼에 무제한 축적하지 않고 제한된 JS 버퍼로 보냅니다.
    await pyodide.runPythonAsync(`
import sys
class _VPLBoundedOutput:
    encoding = 'utf-8'
    def __init__(self, kind):
        self.kind = kind
    def write(self, text):
        text = str(text)
        js._queueOutput(self.kind, text)
        return len(text)
    def flush(self):
        pass
    def isatty(self):
        return False
sys.stdout = _VPLBoundedOutput('stdout')
sys.stderr = _VPLBoundedOutput('stderr')
`);

    // 이전 실행에서 남은 태스크를 취소·회수하고 Python 측 객체/핸들러를 정리
    await pyodide.runPythonAsync('await _vpylab_reset_runtime()');

    // 학생 코드 실행 전 heartbeat — 모바일에서 초기화 지연으로 인한 타임아웃 방지
    sendRunMessage(runId, 'batch', { commands: [] });

    // 학생 코드 실행 — vpython-api.py의 _vpylab_run이 ast 변환 뒤 모듈 수준에서 실행한다.
    // 학생 코드 프레임은 <student> 파일 이름으로 트레이스백에 나타나고 줄 번호는 원본 그대로다.
    pyodide.globals.set('__vpylab_source__', code);
    await pyodide.runPythonAsync(`await _vpylab_run(__vpylab_source__, '${STUDENT_FILENAME}')`, { filename: RUNNER_FILENAME });

    // 실행 후 남은 커맨드 버퍼 플러시
    await pyodide.runPythonAsync('_send_commands()');

    // 남은 출력을 묶어서 전송한 뒤 버퍼를 비웁니다.
    await flushOutputStreams(runId);

    isRunningCode = false;
    sendRunMessage(runId, 'done');
  } catch (err) {
    const msg = takePythonTraceback(err);
    // 오류 전에 만든 객체는 화면에 보이도록 남은 커맨드를 먼저 보낸다 (GlowScript와 같음)
    try { await pyodide.runPythonAsync('_send_commands()'); } catch { /* 플러시 실패는 무시 */ }
    await flushOutputStreams(runId);
    // 사용자 중지로 인한 예외는 에러가 아닌 정상 종료로 처리
    // shouldStop 플래그 또는 예외 메시지로 판별
    if (shouldStop || msg.includes('_StopExecution') || msg.includes('실행이 중지되었습니다')) {
      clearInputQueues();
      try{await pyodide.runPythonAsync('_event_handlers.clear()');}catch{/* 다음 실행의 reset에서 회수 */}
      isRunningCode = false;
      sendRunMessage(runId, 'done');
      if (queuedRun) {
        const next = queuedRun;
        queuedRun = null;
        await runCode(next.code, next.runId);
      }
      return;
    }
    // 오류로 끝난 코드의 클릭·키·위젯 콜백이 계속 돌지 않도록 핸들러를 비운다 (정상 종료는 그대로 둔다)
    try { await pyodide.runPythonAsync('_event_handlers.clear()'); } catch { /* 무시 */ }
    const errorMsg = formatPythonError(msg);
    isRunningCode = false;
    sendRunMessage(runId, 'error', { error: errorMsg, raw: msg, detail: parsePythonTraceback(msg, err.type) });
  }

  if (queuedRun) {
    const next = queuedRun;
    queuedRun = null;
    await runCode(next.code, next.runId);
  }
}

/**
 * Python 에러 메시지를 사용자 친화적으로 포맷 — 마지막 예외 한 줄만 남긴다.
 */
function formatPythonError(msg) {
  const lines = msg.split('\n').filter(l => l.trim());
  // 마지막 Error 라인 찾기
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('Error') || lines[i].includes('Exception')) {
      return lines[i].trim();
    }
  }
  return lines[lines.length - 1]?.trim() || msg;
}

// 학생 코드와 VPython API를 구분하는 트레이스백 파일 이름
const STUDENT_FILENAME = '<student>';
const API_FILENAME = '<vpython-api>';
const TRANSFORM_FILENAME = '<vpylab-transform>';
const KIT_FILENAME = '<피지컬키트>';
const RUNNER_FILENAME = '<vpylab-runner>';
const TRACEBACK_MARKER = 'Traceback (most recent call last):';

/**
 * 예외의 트레이스백 전문을 얻는다.
 * Pyodide는 sys.stderr가 바뀌어 있으면 PythonError.message를 비우고 트레이스백을 stderr로 보낸다.
 * 그 경우 stderr 버퍼 끝의 트레이스백을 떼어 내 사용하고, 콘솔에 중복 출력되지 않게 버퍼에서 지운다.
 */
function takePythonTraceback(err) {
  if (err && err.message) return err.message;
  const stream = outputStreams.stderr;
  const start = stream.text.lastIndexOf(TRACEBACK_MARKER);
  if (start >= 0) {
    const traceback = stream.text.slice(start);
    stream.text = stream.text.slice(0, start);
    return traceback;
  }
  return String(err);
}

/**
 * CPython 트레이스백을 구조화한다. 줄 번호는 전처리된 코드 기준이며
 * 메인 스레드가 원래 줄 번호로 되돌린다.
 * @param {string} msg - 트레이스백 전문
 * @param {string} [typeHint] - Pyodide가 알려 준 예외 클래스 이름
 * @returns {{ type: string, message: string, line: number|null, column: number|null, frames: {line:number, name:string}[], sourceLine: string|null }}
 */
function parsePythonTraceback(msg, typeHint) {
  const lines = msg.split('\n');
  const frames = [];
  let column = null;
  let sourceLine = null;
  let syntaxLine = null;
  const framePattern = /^\s*File "([^"]*)", line (\d+)(?:, in (.+))?$/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(framePattern);
    if (!match) continue;
    const [, file, lineText, name] = match;
    if (file !== STUDENT_FILENAME) continue;
    const line = Number(lineText);
    if (name) {
      frames.push({ line, name });
      continue;
    }
    // 함수 이름이 없는 프레임은 SyntaxError 계열 — 다음 줄이 소스, 그다음이 ^ 표시
    syntaxLine = line;
    const source = lines[i + 1] ?? '';
    const caret = lines[i + 2] ?? '';
    if (source && !framePattern.test(source) && !/^\w*Error/.test(source.trim())) {
      sourceLine = source.replace(/^\s{4}/, '');
      const caretIndex = caret.indexOf('^');
      if (caretIndex >= 0) column = Math.max(0, caretIndex - (source.length - source.trimStart().length)) + 1;
    }
  }

  // 마지막 줄의 `Type: message`
  const nonEmpty = lines.filter(l => l.trim());
  const last = nonEmpty[nonEmpty.length - 1]?.trim() || '';
  const lastMatch = last.match(/^([A-Za-z_][\w.]*(?:Error|Exception|Exit|Interrupt|Warning|Iteration|_StopExecution)?):\s?(.*)$/s);
  let type = typeHint || '';
  let message = last;
  if (lastMatch) {
    if (!type) type = lastMatch[1].split('.').pop();
    message = lastMatch[2];
  }
  if (!type) type = 'Error';

  const innermost = frames.length ? frames[frames.length - 1].line : null;
  return { type, message, line: syntaxLine ?? innermost, column, frames, sourceLine };
}

// === 메시지 핸들러 ===
self.onmessage = async (event) => {
  const { type, code, vpythonApi, transformSource, physicalKit } = event.data;

  switch (type) {
    case 'init':
      if (vpythonApi) vpythonApiCode = vpythonApi;
      if (transformSource) transformSourceCode = transformSource;
      if (physicalKit) physicalKitCode = physicalKit;
      await initPyodide();
      break;

    case 'run':
      await runCode(code, event.data.runId);
      break;

    case 'stop':
      // 소프트 스톱 — rate()에서 플래그 확인 후 Python 예외 발생
      shouldStop = true;
      clearInputQueues();
      if(pyodide&&!isRunningCode&&!isDispatchingEvents){try{pyodide.runPython('_event_handlers.clear()');}catch{/* 다음 실행의 reset에서 회수 */}}
      break;

    case 'park':
      // 실행 종료를 확인한 뒤 학생 상태만 비우고 Python 엔진·패키지는 보관합니다.
      shouldStop = true;
      queuedRun = null;
      clearInputQueues();
      resetOutputStreams();
      try {
        if (isRunningCode || isDispatchingEvents || !pyodide) throw new Error('실행 정리를 기다리고 있습니다.');
        await pyodide.runPythonAsync('await _vpylab_reset_runtime()');
        self.postMessage({ type: 'parked', token: event.data.token });
      } catch {
        self.postMessage({ type: 'parked', token: event.data.token, error: true });
      }
      break;

    case 'event':
      // 메인 스레드의 사용자 입력 이벤트 — 큐에 적재하면 rate()에서 디스패치
      if (shouldStop) break;
      if (event.data.payload) {
        try {
          _eventQueue.push(JSON.stringify(event.data.payload));
        } catch { /* 직렬화 실패 시 무시 */ }
      }
      await dispatchQueuedEvents();
      break;

    case 'widget_value':
      // 위젯 값 동기화
      if (shouldStop) break;
      if (event.data.id !== undefined) {
        _widgetValues[event.data.id] = event.data.value;
      }
      break;

    case 'input_value':
      // input() 응답 — value가 null이면 취소. Python의 input()이 폴링으로 읽는다.
      if (shouldStop) break;
      if (event.data.id !== undefined) {
        try {
          _inputValues[event.data.id] = JSON.stringify(
            event.data.value === null || event.data.value === undefined
              ? { cancelled: true }
              : { value: String(event.data.value) },
          );
        } catch { /* 직렬화 실패 시 무시 */ }
      }
      break;

    case 'mouse':
      {
      const id = event.data.canvas_id || 'scene';
      const value = _mouseStates.get(id) || { pos: [0,0,0], pick: null };
      if (Array.isArray(event.data.pos)) value.pos = event.data.pos;
      if ('pick' in event.data) value.pick = event.data.pick;
      _mouseStates.set(id, value);
      }
      // 마우스 좌표/픽 객체 갱신
      if (Array.isArray(event.data.pos)) _mouseState.pos = event.data.pos;
      if ('pick' in event.data) _mouseState.pick = event.data.pick;
      break;

    case 'camera':
      if (event.data.runId !== currentRunId) break;
      // 카메라 위치·중심·방향·range — scene.camera.pos 등 폴링용
      try {
        const value = JSON.stringify(event.data.state);
        const id = event.data.canvas_id || 'scene';
        _cameraStates.set(id, value);
        if (id === 'scene') _cameraStateJson = value;
      }
      catch { _cameraStateJson = null; }
      break;

    case 'keys':
      // 현재 눌려있는 키 목록 — keysdown() 폴링용
      if (Array.isArray(event.data.keys)) {
        try { _pressedKeysJson = JSON.stringify(event.data.keys); }
        catch { _pressedKeysJson = '[]'; }
      }
      break;

    default:
      // 무시
      break;
  }
};
