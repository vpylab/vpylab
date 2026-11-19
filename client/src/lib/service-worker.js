/**
 * Service Worker 등록과 Pyodide 캐시 예열.
 * 빌드된 앱(https 또는 localhost)에서만 등록합니다. 개발 서버와 http LAN 출처에서는
 * 브라우저가 Service Worker를 허용하지 않거나 소스 변경을 가리므로 건너뜁니다.
 */
export function canUseServiceWorker() {
  return import.meta.env.PROD
    && typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && typeof window !== 'undefined'
    && window.isSecureContext;
}

export function registerServiceWorker() {
  if (!canUseServiceWorker()) return;
  const register = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
      console.warn('[VPyLab] Service Worker 등록 실패:', error?.message || error);
    });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/** Worker가 핵심 파일을 받은 출처를 알려주면 Service Worker 캐시에 빠진 파일을 채웁니다. */
export function warmPyodideCache(base) {
  if (!canUseServiceWorker() || typeof base !== 'string') return;
  navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage({ type: 'WARM_PYODIDE', base });
  }).catch(() => {});
}

/** 편집기를 실제로 연 뒤에만 해당 청크와 워커를 오프라인 캐시에 보관합니다. */
export function warmEditorCache() {
  if (!canUseServiceWorker()) return;
  navigator.serviceWorker.ready.then(registration => {
    registration.active?.postMessage({ type: 'WARM_EDITOR' });
  }).catch(() => {});
}
