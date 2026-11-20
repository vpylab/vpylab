import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './lib/service-worker.js'
import { initInstallPrompt } from './lib/pwa-install.js'

// Monaco Editor의 비동기 작업 취소 시 발생하는 무해한 "Canceled" 에러 무시
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.name === 'Canceled' || e.reason?.message === 'Canceled') {
    e.preventDefault();
  }
});

initInstallPrompt();
registerServiceWorker();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 학교망에서 외부 글꼴 응답이 지연되어도 실습 화면은 시스템 글꼴로 바로 표시합니다.
for (const href of [
  'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap',
]) {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.media = 'print';
  stylesheet.href = href;
  stylesheet.addEventListener('load', () => { stylesheet.media = 'all'; }, { once: true });
  document.head.append(stylesheet);
}
