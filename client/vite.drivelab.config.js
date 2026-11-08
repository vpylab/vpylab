import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 구글 드라이브 저장 실험 페이지 (서버·DB 없음)
// 구글 OAuth의 "승인된 JavaScript 원본"은 정확한 주소만 허용하므로 localhost:4086으로 고정합니다.
// 운영 배포는 `npm run build:deploy`가 본 앱 빌드 뒤에 이 설정으로 client/dist에 덧붙입니다.

/** 운영 헤더(vercel.json)를 미리보기 서버에도 걸어, CSP 위반을 배포 전에 로컬에서 확인합니다. */
function productionHeaders() {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const rule = config.headers.find((h) => h.source === '/drive-lab.html');
  return Object.fromEntries((rule?.headers || []).filter((h) => h.key !== 'Strict-Transport-Security').map((h) => [h.key, h.value]));
}

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // public/은 본 앱 빌드가 이미 복사합니다. 덧붙이는 빌드에서 다시 복사하지 않습니다.
  publicDir: command === 'build' ? false : 'public',
  optimizeDeps: { entries: ['drive-lab.html'] },
  server: { host: 'localhost', port: 4086, strictPort: true },
  preview: { host: 'localhost', port: 4086, strictPort: true, headers: productionHeaders() },
  build: {
    outDir: 'dist-drive-lab',
    rollupOptions: { input: ['drive-lab.html'] },
  },
}));
