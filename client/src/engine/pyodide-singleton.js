/**
 * 실행 화면이 공유하는 Python Worker입니다.
 * 화면 이탈 때 실행 상태를 정리하고, 준비된 엔진은 잠시 보관해 다음 실습에서 재사용합니다.
 */
import vpythonApiRaw from './vpython-api.py?raw';
import transformRaw from './student-code-transform.py?raw';
import physicalKitRaw from './physical-kit.py?raw';
import { stopAllSounds } from './sound-system';
import { warmPyodideCache } from '../lib/service-worker.js';

const INIT_TIMEOUT = 45_000;
const IDLE_TIMEOUT = 10 * 60_000;
const RELEASE_TIMEOUT = 750;
let worker = null;
let status = 'idle';
let initialization = null;
let initializationTimer = null;
const listeners = new Set();
let runSeq = 0;
let activeRunId = 0;
let soundSuppressed = false;
let idleTimer = null;
let idleDeadline = 0;
let releaseState = null;
let releaseSeq = 0;

function clearIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = null;
  idleDeadline = 0;
}

function expireIdleWorker() {
  if (!listeners.size && idleDeadline && (Date.now() >= idleDeadline || Date.now() < idleDeadline - IDLE_TIMEOUT)) hardStop();
}

function settleRelease(error) {
  const pending = releaseState;
  releaseState = null;
  clearTimeout(pending?.timer);
  if (error) pending?.reject(error);
  else pending?.resolve();
}

function retainIdleWorker() {
  clearIdleTimer();
  if (!worker || listeners.size) return;
  const retained = worker;
  idleDeadline = Date.now() + IDLE_TIMEOUT;
  idleTimer = setTimeout(() => {
    if (!listeners.size && worker === retained) hardStop();
  }, IDLE_TIMEOUT);
}

function discardReleasedWorker() {
  const retry = listeners.size > 0;
  hardStop();
  // 새 화면이 정리 완료를 기다리던 경우에만 새 엔진을 준비합니다.
  if (retry) void initIfNeeded().catch(() => {});
}

function parkReleasedWorker() {
  if (!releaseState || releaseState.phase === 'parking') return;
  releaseState.phase = 'parking';
  activeRunId = 0; // 이전 실행의 늦은 출력·이벤트는 다음 화면에 전달하지 않습니다.
  worker.postMessage({ type: 'park', token: releaseState.token });
}

function releaseWorker() {
  soundSuppressed = true;
  stopAllSounds();
  if (!worker) return;
  // 아직 학생 코드를 실행하지 않은 초기화는 빠른 화면 이동·StrictMode에서 이어받습니다.
  if (status === 'loading') {
    retainIdleWorker();
    return;
  }
  if (releaseState) return;
  if (!['ready', 'running', 'stopping'].includes(status)) {
    hardStop();
    return;
  }
  const previousStatus = status;
  let resolve;
  let reject;
  const promise = new Promise((accept, decline) => { resolve = accept; reject = decline; });
  // 기다리는 화면이 없어도 정리 실패가 미처리 Promise 오류로 남지 않게 합니다.
  promise.catch(() => {});
  releaseState = { instance: worker, token: ++releaseSeq, phase: 'stopping', promise, resolve, reject };
  releaseState.timer = setTimeout(discardReleasedWorker, RELEASE_TIMEOUT);
  updateStatus('stopping');
  try {
    if (previousStatus === 'ready') parkReleasedWorker();
    else worker.postMessage({ type: 'stop' });
  } catch {
    discardReleasedWorker();
  }
}

function broadcast(message) {
  for (const listener of listeners) listener.onMessage(message);
}

function updateStatus(nextStatus) {
  status = nextStatus;
  broadcast({ type: 'status', status });
}

function settleInitialization(error) {
  clearTimeout(initializationTimer);
  initializationTimer = null;
  const pending = initialization;
  initialization = null;
  if (error) pending?.reject(error);
  else pending?.resolve();
}

function terminateWorker() {
  const previous = worker;
  worker = null;
  if (previous) {
    previous.onmessage = null;
    previous.onerror = null;
    previous.onmessageerror = null;
    previous.terminate();
  }
}

function failWorker(message, phase) {
  clearIdleTimer();
  settleRelease(new Error(message));
  soundSuppressed=true;stopAllSounds();
  terminateWorker();
  updateStatus('error');
  settleInitialization(new Error(message));
  broadcast({ type: 'error', error: message, phase, fatal: true, ...(phase === 'runtime' ? { runId: activeRunId } : {}) });
}

function createWorker() {
  const instance = new Worker(new URL('./pyodide-worker.js', import.meta.url), { type: 'classic' });
  instance.onmessage = (event) => {
    if (instance !== worker) return;
    let message = event.data;
    if (typeof message === 'string') {
      try { message = JSON.parse(message); } catch { return; }
    }
    if (!message || typeof message !== 'object') return;
    // 화면을 넘기는 동안 이전 실행은 화면 없이 정지·정리합니다.
    if (releaseState?.instance === instance) {
      if (releaseState.phase === 'parking' && message.type === 'parked' && message.token === releaseState.token) {
        if (message.error) {
          discardReleasedWorker();
          return;
        }
        settleRelease();
        updateStatus('ready');
        broadcast({ type: 'ready', reused: true });
        retainIdleWorker();
      } else if (releaseState.phase === 'stopping'
        && message.runId === activeRunId
        && ['done', 'event_done', 'error'].includes(message.type)) {
        try { parkReleasedWorker(); } catch { discardReleasedWorker(); }
      }
      return;
    }
    if (message.runId != null && message.runId !== activeRunId) return;

    // 정지 직후 큐에 남은 묶음이 예약음을 다시 만들지 못하게 합니다.
    if(message.type==='batch'&&soundSuppressed&&Array.isArray(message.commands))message={...message,commands:message.commands.filter(command=>command.action!=='sound')};
    if(message.type==='error'){soundSuppressed=true;stopAllSounds();}
    if (message.type === 'ready') {
      updateStatus('ready');
      settleInitialization();
      // 재방문 때 네트워크 없이 시작하도록 방금 받은 핵심 파일을 Service Worker 캐시에 둡니다.
      warmPyodideCache(message.source);
      retainIdleWorker();
    } else if (message.type === 'error' && status === 'loading') {
      failWorker(message.error || 'Python 엔진을 준비하지 못했습니다.', 'init');
      return;
    } else if (message.type === 'event_start') {
      if(!soundSuppressed&&status!=='stopping')updateStatus('running');
    } else if (['done', 'error', 'event_done'].includes(message.type)) {
      updateStatus('ready');
    }
    broadcast(message);
  };
  instance.onerror = (event) => {
    if (instance !== worker) return;
    if (releaseState) { discardReleasedWorker(); return; }
    failWorker(`Worker 오류: ${event?.message || 'Python 엔진의 응답이 끊겼습니다.'}`, status === 'loading' ? 'init' : 'runtime');
  };
  instance.onmessageerror = () => {
    if (instance !== worker) return;
    if (releaseState) { discardReleasedWorker(); return; }
    failWorker('Python 엔진의 응답을 읽지 못했습니다. 다시 준비해 주세요.', status === 'loading' ? 'init' : 'runtime');
  };
  return instance;
}

/** 한 번만 시도하며, 실패하면 사용자가 직접 재시도합니다. */
export function initIfNeeded() {
  expireIdleWorker();
  if (releaseState) return releaseState.promise;
  if (['ready', 'running', 'stopping'].includes(status)) return Promise.resolve();
  if (initialization) return initialization.promise;

  let resolve;
  let reject;
  const promise = new Promise((accept, decline) => { resolve = accept; reject = decline; });
  initialization = { promise, resolve, reject };
  updateStatus('loading');
  initializationTimer = setTimeout(() => {
    failWorker('Python 엔진 준비 시간이 초과되었습니다. 네트워크를 확인한 뒤 다시 준비해 주세요.', 'init');
  }, INIT_TIMEOUT);
  try {
    worker = createWorker();
    worker.postMessage({ type: 'init', vpythonApi: vpythonApiRaw, transformSource: transformRaw, physicalKit: physicalKitRaw });
  } catch (error) {
    failWorker(`Python 엔진 초기화 실패: ${error.message}`, 'init');
  }
  return promise;
}

/** 실행 중이거나 정지 확인 중인 Worker에 다음 코드를 넣지 않습니다. */
export function runCode(code) {
  if (!worker || status !== 'ready') return null;
  soundSuppressed=false;
  activeRunId = ++runSeq;
  updateStatus('running');
  worker.postMessage({ type: 'run', code, runId: activeRunId });
  return activeRunId;
}

export function softStop() {
  soundSuppressed=true;stopAllSounds();
  if (!worker) return false;
  if(status==='ready'){worker.postMessage({type:'stop'});return false;}
  if(status!=='running')return false;
  updateStatus('stopping');
  worker.postMessage({ type: 'stop' });
  return true;
}

export function postEvent(payload) {
  if (!soundSuppressed && worker && ['running', 'ready'].includes(status)) worker.postMessage({ type: 'event', payload });
}

export function postWidgetValue(id, value) {
  if (!soundSuppressed && worker && ['running', 'ready'].includes(status)) worker.postMessage({ type: 'widget_value', id, value });
}

/** input() 입력 위젯의 답을 Worker에 보낸다. value가 null이면 취소(Python 쪽 EOFError). */
export function postInputValue(id, value) {
  if (worker && ['running', 'stopping'].includes(status)) worker.postMessage({ type: 'input_value', id, value });
}

export function postMouseState(pos, pick, canvasId = 'scene') {
  if (worker && ['running', 'ready'].includes(status)) worker.postMessage({ type: 'mouse', pos, pick, canvas_id: canvasId });
}

export function postPressedKeys(keys) {
  if (worker && ['running', 'ready'].includes(status)) worker.postMessage({ type: 'keys', keys });
}

/** 카메라 상태를 Worker에 알린다. Python의 scene.camera.pos, scene.forward 읽기에 쓴다. */
export function postCameraState(state, canvasId = 'scene') {
  if (worker && ['running', 'ready'].includes(status)) worker.postMessage({ type: 'camera', state, canvas_id: canvasId, runId: activeRunId });
}

/** 구독은 유지하므로 종료 후 다시 준비해도 메시지가 유실되지 않습니다. */
export function hardStop() {
  clearIdleTimer();
  soundSuppressed=true;stopAllSounds();
  terminateWorker();
  const error = new Error('Python 엔진 준비가 취소되었습니다.');
  error.name = 'AbortError';
  settleRelease(error);
  settleInitialization(error);
  activeRunId = 0;
  updateStatus('idle');
}

export function subscribe(listener) {
  expireIdleWorker();
  clearIdleTimer();
  listeners.add(listener);
  return () => {
    if (!listeners.delete(listener)) return;
    if (listeners.size === 0) releaseWorker();
  };
}

export function prewarm() {
  if (status === 'idle') {
    void initIfNeeded().catch(() => {});
    retainIdleWorker();
  }
}

/** 계정이 바뀌면 패키지·파일을 포함한 Python VM 전체를 비웁니다. */
export function resetForSessionChange() {
  const restart = listeners.size > 0;
  hardStop();
  if (restart) void initIfNeeded().catch(() => {});
}

// 참고 자료를 보는 동안에도 보관합니다. 배경 탭의 타이머 지연은 벽시계로 보완합니다.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', expireIdleWorker);
  globalThis.addEventListener?.('pageshow', expireIdleWorker);
}

export function getStatus() { return status; }

/** 이전 호출부와의 호환성을 위한 상태 전달 함수입니다. */
export function setStatus(nextStatus) { updateStatus(nextStatus); }
