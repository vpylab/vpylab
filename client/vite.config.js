import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { pyodideAssets } from './scripts/pyodide-assets.mjs'
import { serviceWorker } from './scripts/service-worker-plugin.mjs'

/**
 * 교실 LAN 모드(VITE_LAN_MODE=1): 외부 글꼴 @import를 제거해 인터넷이 없는 교실에서
 * 스타일시트가 외부 요청 응답을 기다리지 않게 합니다. 글꼴은 시스템 글꼴로 대체됩니다.
 */
export function stripRemoteFonts() {
  return {
    name: 'vpylab-strip-remote-fonts',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/index.css')) return null;
      return { code: code.replace(/@import url\('https:\/\/[^']+'\);\n?/g, ''), map: null };
    },
  };
}

// 교실 LAN 모드는 scripts/classroom/lan.mjs가 VITE_LAN_MODE=1로 빌드합니다.
// (mergeConfig로 확장하는 교실·연수 설정이 있어 콜백 형태 설정은 쓸 수 없습니다.)
const lanMode = process.env.VITE_LAN_MODE === '1';

export default defineConfig({
  plugins: [
    // Tailwind가 index.css를 컴파일하기 전에 외부 글꼴 @import를 지워야 합니다.
    ...(lanMode ? [stripRemoteFonts()] : []),
    react(),
    tailwindcss(),
    pyodideAssets(),
    serviceWorker(),
  ],
  // 일반 앱에서 연수 전용 HTML의 별도 별칭까지 미리 탐색하지 않습니다.
  optimizeDeps: {
    entries: ['index.html'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('monaco-editor') || id.includes('@monaco-editor/react')) {
            return 'monaco';
          }
          if (id.includes('/three/') || id.includes('@react-three/')) {
            return 'three';
          }
          if (
            id.includes('/react-dom/') ||
            id.includes('/react/') ||
            id.includes('/react-router')
          ) {
            return 'vendor';
          }
          if (id.includes('@supabase/')) {
            return 'supabase';
          }
        },
      },
    },
  },
  server: {
    fs: { allow: [fileURLToPath(new URL('.', import.meta.url)), fileURLToPath(new URL('../server/shared/instruments/', import.meta.url)), fileURLToPath(new URL('../server/shared/planets/', import.meta.url))] },
    port: 4033,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4034',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
})
