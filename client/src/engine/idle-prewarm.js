/**
 * 첫 화면·문서를 보는 동안 Python 엔진을 미리 준비합니다.
 * Pyodide는 파일이 캐시에 있어도 브라우저에서 띄우는 데 3~4초가 걸립니다. 만들기 화면에 들어간 뒤 시작하면 학생이 그만큼 기다립니다.
 * 페이지를 다 그린 뒤 브라우저가 한가할 때 시작해 첫 화면 표시를 늦추지 않습니다.
 * Web Worker가 없는 환경, 데이터 절약 모드, 2G 연결, 메모리 4GB 미만 기기, 숨은 탭, 임베드·로그인 콜백 화면에서는 미리 띄우지 않습니다.
 * 준비된 엔진은 pyodide-singleton이 10분 동안 보관하고, 그동안 실습 화면에 들어가지 않으면 정리합니다.
 */
const SKIP_PATHS = /^\/(embed|auth)(\/|$)/;

export function shouldPrewarm({ connection, deviceMemory, pathname = '/', hasWorker = true } = {}) {
  if (!hasWorker) return false;
  if (connection?.saveData) return false;
  if (/(^|-)2g$/.test(connection?.effectiveType || '')) return false;
  if (typeof deviceMemory === 'number' && deviceMemory < 4) return false;
  if (SKIP_PATHS.test(pathname)) return false;
  return true;
}

export function scheduleIdlePrewarm({ warm, win = window, nav = navigator, doc = document, delayMs = 1500 } = {}) {
  let cancelled = false;
  let timer = null;
  let idleId = null;

  const run = () => {
    if (cancelled) return;
    if (doc.hidden) {
      doc.addEventListener('visibilitychange', onVisible);
      return;
    }
    cancelled = true;
    if (shouldPrewarm({ connection: nav.connection, deviceMemory: nav.deviceMemory, pathname: win.location?.pathname, hasWorker: typeof win.Worker === 'function' })) warm();
  };
  function onVisible() {
    if (doc.hidden) return;
    doc.removeEventListener('visibilitychange', onVisible);
    run();
  }
  const afterLoad = () => {
    timer = win.setTimeout(() => {
      if (typeof win.requestIdleCallback === 'function') idleId = win.requestIdleCallback(run, { timeout: 5000 });
      else run();
    }, delayMs);
  };

  if (doc.readyState === 'complete') afterLoad();
  else win.addEventListener('load', afterLoad, { once: true });

  return () => {
    cancelled = true;
    win.clearTimeout(timer);
    if (idleId != null) win.cancelIdleCallback?.(idleId);
    win.removeEventListener('load', afterLoad);
    doc.removeEventListener('visibilitychange', onVisible);
  };
}
