import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { pyodideAssets } from './scripts/pyodide-assets.mjs'
import { serviceWorker } from './scripts/service-worker-plugin.mjs'
import { pagesStatic } from './scripts/pages-static.mjs'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    pyodideAssets(),
    serviceWorker(),
    pagesStatic(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('monaco-editor') || id.includes('@monaco-editor/react')) {
            return 'monaco';
          }
          if (id.includes('/three/')) {
            return 'three';
          }
          if (
            id.includes('/react-dom/') ||
            id.includes('/react/') ||
            id.includes('/react-router')
          ) {
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 4033,
    strictPort: true,
    // 짧은 공유 주소(/api/share)와 GitHub 연결(/api/github/token)은 Cloudflare Pages 함수입니다.
    // vite 개발 서버에는 없으므로, 그 기능까지 확인할 때는 빌드한 뒤 `npx wrangler pages dev client/dist`로 실행합니다.
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
})
