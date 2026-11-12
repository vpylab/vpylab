import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { useI18n } from './i18n/useI18n';
import Home from './pages/Home';
import AuthCallback from './pages/AuthCallback';
import AuthModal from './components/auth/AuthModal';
import useAuthStore from './stores/authStore';
import { resetForSessionChange, prewarm } from './engine/pyodide-singleton';
import { scheduleIdlePrewarm } from './engine/idle-prewarm';
import './index.css';

// 배포 후 구 청크 404 → 자동 새로고침 (Vite + SPA 배포 공통 이슈)
function lazyWithRetry(importFn) {
  return lazy(() =>
    importFn().catch(() => {
      window.location.reload();
      return new Promise(() => {}); // 새로고침 중 렌더 방지
    })
  );
}

// 실습 화면은 지연 로딩하며, 홈의 3D 환영 친구는 별도 청크로 불러온다.
const Sandbox = lazyWithRetry(() => import('./pages/Sandbox'));
const Missions = lazyWithRetry(() => import('./pages/Missions'));
const Tutorials = lazyWithRetry(() => import('./pages/Tutorials'));
const MissionPlay = lazyWithRetry(() => import('./pages/MissionPlay'));
const Courses = lazyWithRetry(() => import('./pages/Courses'));
const Examples = lazyWithRetry(() => import('./pages/Examples'));
const About = lazyWithRetry(() => import('./pages/About'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Gallery = lazyWithRetry(() => import('./pages/Gallery'));
const GalleryDetail = lazyWithRetry(() => import('./pages/GalleryDetail'));
const SourceProject = lazyWithRetry(() => import('./pages/SourceProject'));
const Docs = lazyWithRetry(() => import('./pages/Docs'));
const Forge = lazyWithRetry(() => import('./pages/Forge'));
const Guide = lazyWithRetry(() => import('./pages/Guide'));
const Privacy = lazyWithRetry(() => import('./pages/Privacy'));
const Embed = lazyWithRetry(() => import('./pages/Embed'));
// GitHub 팀 프로젝트 애드온의 로그인 창(팝업)이 돌아오는 작은 화면입니다.
const GitHubCallback = lazyWithRetry(() => import('./pages/GitHubCallback'));

function AppContent() {
  const initialize = useAuthStore((s) => s.initialize);
  const { t } = useI18n();

  useEffect(() => {
    const stopForAccountChange = useAuthStore.subscribe((next, previous) => {
      if (next.user?.id !== previous.user?.id) resetForSessionChange();
    });
    const cleanup = initialize();
    return () => { stopForAccountChange(); if (cleanup) cleanup(); };
  }, [initialize]);

  // 첫 화면을 보는 동안 실습 화면 코드와 Python 엔진을 미리 준비합니다(idle-prewarm.js 참고).
  useEffect(() => scheduleIdlePrewarm({
    warm: () => {
      void import('./pages/Sandbox').catch(() => {});
      prewarm();
    },
  }), []);

  return (
    <>
      <AuthModal />
      <Suspense fallback={
        <div className="h-screen flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-muted)' }}>
          {t('common.loading')}
        </div>
      }>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tutorials" element={<Tutorials />} />
          <Route path="/tutorials/:tutorialId" element={<Tutorials />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:courseId" element={<Courses />} />
          <Route path="/courses/:courseId/:lessonId" element={<Courses />} />
          <Route path="/sandbox" element={<Sandbox />} />
          <Route path="/examples" element={<Examples />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/mission/:missionId" element={<MissionPlay />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/forge" element={<Forge />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/about" element={<About />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/gallery/glowscript/:projectId" element={<SourceProject />} />
          <Route path="/gallery/:id" element={<GalleryDetail />} />
          {/* 공유 주소는 만들기 화면이 직접 읽습니다. 주소창에 /s/이름이 남아 새로 고침·복사해도 작품이 다시 열립니다. */}
          <Route path="/s/:id" element={<Sandbox />} />
          <Route path="/embed/:id" element={<Embed />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/github/callback" element={<GitHubCallback />} />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </I18nProvider>
  );
}

export default App;
