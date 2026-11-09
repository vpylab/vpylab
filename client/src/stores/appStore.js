import { readInitialLocale } from '../i18n/locale';
import { create } from 'zustand';

const PROGRESS_KEY = 'vpylab-progress';
// 이 기기의 진행률이 어느 계정과 맞춰졌는지 기록합니다. 없으면 로그인 없이 쌓은 기록입니다.
const PROGRESS_OWNER_KEY = 'vpylab-progress-owner';

function readLocalProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}') || {}; }
  catch { return {}; }
}

function readProgressOwner() {
  try { return localStorage.getItem(PROGRESS_OWNER_KEY) || ''; }
  catch { return ''; }
}

function writeLocalProgress(progress, ownerId) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    if (ownerId) localStorage.setItem(PROGRESS_OWNER_KEY, ownerId);
  } catch { /* 저장 공간이 없어도 화면 상태는 유지합니다 */ }
}

/** 통과한 제출 기록에서 미션별 최고 점수를 고릅니다. */
export function bestProgressFromSubmissions(rows) {
  const best = {};
  for (const row of rows || []) {
    if (!row || typeof row.mission_id !== 'string') continue;
    const score = Number.isFinite(row.score) ? row.score : 0;
    const prev = best[row.mission_id];
    if (prev && prev.score >= score) continue;
    best[row.mission_id] = { score, passed: true, completedAt: row.created_at || new Date().toISOString() };
  }
  return best;
}

/** 이 기기의 기록과 계정 기록을 합칩니다. 같은 미션은 점수가 높은 쪽을 남깁니다. */
export function mergeProgress(local, server) {
  const merged = { ...(local || {}) };
  for (const [missionId, progress] of Object.entries(server || {})) {
    const prev = merged[missionId];
    if (prev?.passed && prev.score >= progress.score) continue;
    merged[missionId] = progress;
  }
  return merged;
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

  // 미션 진행 상태 { [missionId]: { score, passed, completedAt } }
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

  // 로그인 시 이 기기의 진행률과 계정의 제출 기록을 서로 맞춥니다.
  // - 계정에 있는 통과 기록을 내려받아 이 기기에 복원합니다(자리를 옮기거나 기기가 초기화된 경우).
  // - 로그인 전에 이 기기에서 통과한 미션은 계정에 올립니다.
  // - 이 기기의 기록이 다른 계정의 것이면 올리지 않고 계정 기록으로 바꿉니다(공용 컴퓨터).
  syncProgressToServer: async () => {
    // 화면·테마만 재사용하는 새 교실은 이전 인증 클라이언트를 초기화하지 않습니다.
    const { supabase } = await import('../lib/supabase');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rows, error } = await supabase
      .from('vpylab_submissions')
      .select('mission_id, score, created_at')
      .eq('user_id', user.id)
      .eq('passed', true);
    // 조회에 실패하면 이 기기의 기록을 건드리지 않습니다.
    if (error || !Array.isArray(rows)) return;

    const owner = readProgressOwner();
    const local = owner && owner !== user.id ? {} : useAppStore.getState().missionProgress;
    const server = bestProgressFromSubmissions(rows);

    for (const [missionId, progress] of Object.entries(local)) {
      if (!progress?.passed || server[missionId]) continue;
      await supabase.from('vpylab_submissions').insert({
        user_id: user.id,
        mission_id: missionId,
        code: '(synced from localStorage)',
        score: progress.score,
        passed: true,
      });
    }

    // 기다리는 동안 새로 통과한 미션이 있을 수 있어 최신 상태와 다시 합칩니다.
    const latest = owner && owner !== user.id ? {} : useAppStore.getState().missionProgress;
    const merged = mergeProgress(latest, server);
    writeLocalProgress(merged, user.id);
    set({ missionProgress: merged });
  },

  // 로그아웃 시 계정에 묶인 진행률을 이 기기에서 지웁니다(다음 사용자에게 넘어가지 않게).
  // 한 번도 로그인하지 않고 쌓은 기록은 그대로 둡니다.
  clearProgressOnSignOut: () => {
    if (!readProgressOwner()) return;
    try {
      localStorage.removeItem(PROGRESS_KEY);
      localStorage.removeItem(PROGRESS_OWNER_KEY);
    } catch { /* ignore */ }
    set({ missionProgress: {} });
  },

  // 상수
  THEMES,
  THEME_META,
}));

// 초기 테마 적용
const savedTheme = localStorage.getItem('vpylab-theme') || 'creative-light';
document.documentElement.setAttribute('data-theme', savedTheme);

export default useAppStore;
