/**
 * VPyLab Service Worker — 재방문 때 네트워크 없이 시작하기 위한 캐시입니다.
 *
 * 빌드 플러그인(client/scripts/service-worker-plugin.mjs)이 아래 자리 표시자를 채웁니다.
 *   __PRECACHE_MANIFEST__  빌드 산출물 목록 [{ url, revision }]
 *   __BUILD_ID__           산출물 목록의 해시. 바뀌면 앱 캐시를 새로 만듭니다.
 *   __APP_SHELL__          SPA 진입 HTML(index.html 또는 classroom.html)
 *   __PYODIDE_VERSION__    Pyodide 버전. 다른 버전의 핵심 파일 캐시는 지웁니다.
 *
 * 캐시 정책
 *   - 앱 셸·해시가 붙은 /assets/ (Monaco·Three.js·React 청크): 설치 때 미리 저장, 캐시 우선
 *   - /pyodide/v<버전>/ 핵심 파일과 CDN의 Pyodide·휠: 캐시 우선. 처음 받을 때 저장하고
 *     Worker가 준비를 마치면 메인 스레드가 WARM_PYODIDE 메시지로 빠진 파일을 채웁니다.
 *   - 글꼴(Google Fonts·Fontshare) 요청은 건드리지 않습니다. sw.js의 CSP connect-src에 글꼴 출처가
 *     없어 Service Worker 안에서 fetch하면 막히고, 페이지에 ERR_FAILED로 전달됩니다.
 *   - 페이지 이동(navigate): 네트워크 우선, 끊기면 저장한 앱 셸. /embed/ 경로는 헤더가 달라 별도 키에 저장
 *     앱 셸이 아닌 독립 HTML(/drive-lab.html 등)은 가로채지 않습니다(앱 셸 캐시를 덮어쓰지 않게).
 *   - 그 밖의 요청(API, Supabase 등)은 건드리지 않습니다.
 *
 * Pyodide Worker 안에서 fetch를 지우는 보안 정책은 Worker 전역에만 적용되며,
 * Service Worker는 별도 스레드에서 브라우저가 띄우므로 서로 영향을 주지 않습니다.
 */
const PRECACHE_MANIFEST = self.__PRECACHE_MANIFEST__;
const BUILD_ID = self.__BUILD_ID__;
const APP_SHELL = self.__APP_SHELL__;
const PYODIDE_VERSION = self.__PYODIDE_VERSION__;

const APP_CACHE = `vpylab-app-${BUILD_ID}`;
const PYODIDE_CACHE = 'vpylab-pyodide';
// 예전 버전이 만든 'vpylab-fonts' 캐시는 KNOWN_CACHES에 없으므로 activate 때 지워집니다.
const KNOWN_CACHES = new Set([APP_CACHE, PYODIDE_CACHE]);

const PYODIDE_CORE = ['pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];

function isPyodideUrl(url) {
  if (url.origin === self.location.origin) return url.pathname.startsWith('/pyodide/');
  return (url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/pyodide/'))
    || (url.hostname === 'unpkg.com' && url.pathname.startsWith('/pyodide@'));
}
/** 불투명 응답(no-cors)은 크기를 알 수 없어 저장하지 않습니다. */
function cacheable(response) {
  return !!response && response.status === 200 && response.type !== 'opaque';
}

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (cacheable(response)) await cache.put(request, response.clone());
  return response;
}

// /embed/ 응답은 frame-ancestors가 다르므로(다른 사이트에 넣을 수 있음) 일반 앱 셸과 따로 저장합니다.
const EMBED_SHELL = '__vpylab-embed-shell__';

function shellKeyFor(url) {
  return url.pathname.startsWith('/embed/') ? EMBED_SHELL : APP_SHELL;
}

// 앱 셸이 아닌 독립 HTML 페이지(예: /drive-lab.html)는 앱 셸 캐시를 덮어쓰지 않도록 가로채지 않습니다.
// Cloudflare Pages는 '/drive-lab.html'을 확장자 없는 '/drive-lab'으로 넘겨 제공하므로 그 주소도 함께 둡니다.
const STANDALONE_PAGES = new Set(['/drive-lab']);
function isStandaloneDocument(url) {
  if (STANDALONE_PAGES.has(url.pathname)) return true;
  return url.pathname.endsWith('.html') && url.pathname !== `/${APP_SHELL}`;
}

async function networkFirstShell(request, shellKey = APP_SHELL) {
  try {
    const response = await fetch(request);
    if (cacheable(response)) {
      const cache = await caches.open(APP_CACHE);
      await cache.put(shellKey, response.clone());
    }
    return response;
  } catch (error) {
    const cache = await caches.open(APP_CACHE);
    const shell = (await cache.match(shellKey)) || (shellKey !== APP_SHELL ? null : undefined);
    if (shell) return shell;
    throw error;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    const existing = new Set((await cache.keys()).map((request) => request.url));
    await Promise.all(PRECACHE_MANIFEST.map(async ({ url }) => {
      const absolute = new URL(url, self.location.origin).href;
      if (existing.has(absolute)) return;
      // 해시가 붙은 산출물은 HTTP 캐시에 이미 있으면 그대로 쓰고, HTML은 새로 받습니다.
      const request = new Request(absolute, { cache: url === APP_SHELL ? 'reload' : 'default' });
      try {
        const response = await fetch(request);
        if (cacheable(response)) await cache.put(absolute, response);
      } catch { /* 한 파일 실패가 설치 전체를 막지 않습니다. 다음 요청 때 다시 받습니다. */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('vpylab-') && !KNOWN_CACHES.has(name)).map((name) => caches.delete(name)));
    // 다른 버전의 Pyodide 핵심 파일은 지웁니다(버전당 약 14MB).
    const pyodide = await caches.open(PYODIDE_CACHE);
    for (const request of await pyodide.keys()) {
      const url = new URL(request.url);
      const isCore = PYODIDE_CORE.some((name) => url.pathname.endsWith(`/${name}`));
      if (isCore && !url.pathname.includes(PYODIDE_VERSION) && !url.pathname.includes(`pyodide@${PYODIDE_VERSION}`)) await pyodide.delete(request);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  let url;
  try { url = new URL(request.url); } catch { return; }

  if (isPyodideUrl(url)) { event.respondWith(cacheFirst(PYODIDE_CACHE, request)); return; }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' && isStandaloneDocument(url)) return;
  if (request.mode === 'navigate') { event.respondWith(networkFirstShell(request, shellKeyFor(url))); return; }
  if (url.pathname.startsWith('/assets/')) { event.respondWith(cacheFirst(APP_CACHE, request)); return; }
  if (PRECACHE_MANIFEST.some(({ url: path }) => url.pathname === `/${path}`)) { event.respondWith(cacheFirst(APP_CACHE, request)); }
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'WARM_PYODIDE' && typeof data.base === 'string') {
    // Worker가 이미 받은 파일이므로 보통 HTTP 캐시에서 채워집니다(네트워크 비용 없음).
    event.waitUntil((async () => {
      let base;
      try { base = new URL(data.base); } catch { return; }
      if (!isPyodideUrl(base)) return;
      const cache = await caches.open(PYODIDE_CACHE);
      for (const name of PYODIDE_CORE) {
        const url = new URL(name, base).href;
        if (await cache.match(url, { ignoreVary: true })) continue;
        try {
          const response = await fetch(url, { credentials: 'same-origin' });
          if (cacheable(response)) await cache.put(url, response);
        } catch { /* 다음 방문 때 다시 시도 */ }
      }
    })());
  }
});
