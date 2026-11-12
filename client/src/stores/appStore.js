import { readInitialLocale } from '../i18n/locale';
import { create } from 'zustand';

const PROGRESS_KEY = 'vpylab-progress';

function readLocalProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}') || {}; }
  catch { return {}; }
}

function writeLocalProgress(progress) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); }
  catch { /* 저장 공간이 없어도 화면 상태는 유지합니다 */ }
}

const THEMES = [
  'creative-light', 'deep-dark',
  'ocean-breeze', 'sunset-glow',
  'forest-night', 'lavender-dream',
  'midnight-purple', 'rose-garden',
  'cyber-neon',
];

const THEME_META = {
  'creative-light':  { label: '크리에이티브', icon: '☀️', dark: false },
  'deep-dark':       { label: '딥 다크', icon: '🌙', dark: true },
  'ocean-breeze':    { label: '바다 바람', icon: '🌊', dark: false },
  'sunset-glow':     { label: '노을빛', icon: '🌅', dark: false },
  'forest-night':    { label: '깊은 숲', icon: '🌲', dark: true },
  'lavender-dream':  { label: '라벤더', icon: '💜', dark: false },
  'midnight-purple': { label: '자정 퍼플', icon: '🔮', dark: true },
  'rose-garden':     { label: '장미 정원', icon: '🌹', dark: false },
  'cyber-neon':      { label: '사이버 네온', icon: '⚡', dark: true },
};

const useAppStore = create((set) => ({
  // 테마
  theme: localStorage.getItem('vpylab-theme') || 'creative-light',
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vpylab-theme', theme);
    set({ theme });
  },

  // 언어
  locale: readInitialLocale({search:window.location.search, storage:localStorage}),
  setLocale: (locale) => {
    localStorage.setItem('vpylab-locale', locale);
    set({ locale });
  },

  // 미션 진행 상태 { [missionId]: { score, passed, completedAt } }. 이 브라우저에만 보관합니다.
  missionProgress: readLocalProgress(),
  completeMission: (missionId, score) => set((state) => {
    const prev = state.missionProgress[missionId];
    // 기존 최고 점수보다 높을 때만 업데이트
    if (prev && prev.score >= score) return state;
    const updated = {
      ...state.missionProgress,
      [missionId]: { score, passed: true, completedAt: new Date().toISOString() },
    };
    writeLocalProgress(updated);
    return { missionProgress: updated };
  }),
  getMissionScore: (missionId) => {
    const state = useAppStore.getState();
    return state.missionProgress[missionId]?.score ?? null;
  },
  getCompletedCount: (category) => {
    const state = useAppStore.getState();
    return Object.entries(state.missionProgress)
      .filter(([id, p]) => id.startsWith(category) && p.passed)
      .length;
  },

  // 상수
  THEMES,
  THEME_META,
}));

// 초기 테마 적용
const savedTheme = localStorage.getItem('vpylab-theme') || 'creative-light';
document.documentElement.setAttribute('data-theme', savedTheme);

export default useAppStore;
