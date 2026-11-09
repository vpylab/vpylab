import { create } from 'zustand';
import { AUTH_STORAGE_KEY, supabase } from '../lib/supabase';

const GITHUB_AUTH_KEY = 'vpylab-github-auth';
const OAUTH_PROVIDER_KEY = 'vpylab-oauth-provider';
const OAUTH_LINK_USER_KEY = 'vpylab-oauth-link-user';
const OAUTH_RETURN_KEYS = ['vpylab-oauth-return-path', 'vpylab-oauth-return-code', 'vpylab-oauth-return-action', 'vpylab-oauth-return-project-id'];

function hasGitHubIdentity(user) {
  return user?.app_metadata?.provider === 'github'
    || user?.identities?.some(identity => identity.provider === 'github');
}

// 연결된 identity 목록은 현재 provider_token의 발급자를 알려주지 않습니다.
// 기존 단일 GitHub 계정만 추론하고, 연결 계정은 OAuth 완료 시 확인한 토큰을 사용합니다.
function isOnlyGitHub(user) {
  const providers = new Set([user?.app_metadata?.provider,
    ...(user?.app_metadata?.providers || []), ...(user?.identities || []).map(identity => identity.provider)].filter(Boolean));
  return providers.size === 1 && providers.has('github');
}

function extractGitHubUsername(user) {
  const githubIdentity = user?.identities?.find((identity) => identity.provider === 'github');
  return [
    user?.user_metadata?.user_name,
    user?.user_metadata?.preferred_username,
    githubIdentity?.identity_data?.user_name,
    githubIdentity?.identity_data?.preferred_username,
  ]
    .map((value) => String(value || '').trim().replace(/^@/, ''))
    .find((value) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(value))
    || null;
}

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  authModalOpen: false,
  githubTokenExpired: false,
  githubAuthError: '',

  setAuthModalOpen: (open) => set({ authModalOpen: open }),

  // 요청한 OAuth provider와 돌아온 사용자 ID를 묶어 별도 보관합니다.
  // Supabase 세션 갱신이 provider_token을 지워도 GitHub 연결은 유지합니다.
  captureOAuthSession: (session, { errorCode } = {}) => {
    try {
      const provider = localStorage.getItem(OAUTH_PROVIDER_KEY);
      if (!provider) return;
      const linkUserId = localStorage.getItem(OAUTH_LINK_USER_KEY);
      localStorage.removeItem(OAUTH_PROVIDER_KEY);
      localStorage.removeItem(OAUTH_LINK_USER_KEY);
      localStorage.removeItem(GITHUB_AUTH_KEY);
      if (provider === 'github' && linkUserId && session?.user?.id && linkUserId !== session.user.id) {
        set({ githubAuthError: '다른 GitHub 계정으로 인증됐습니다. 원래 계정으로 다시 로그인해주세요.', authModalOpen: true });
        return { accountMismatch: true };
      }
      if (provider === 'github' && session?.user?.id && hasGitHubIdentity(session.user) && session.provider_token) {
        localStorage.setItem(GITHUB_AUTH_KEY, JSON.stringify({ userId: session.user.id, provider: 'github', token: session.provider_token }));
        set({ githubTokenExpired: false, githubAuthError: '' });
      } else if (provider === 'github') {
        set({ githubAuthError: errorCode === 'identity_already_exists'
          ? '이미 다른 VPyLab 계정에 연결된 GitHub 계정입니다. 연결할 GitHub 계정을 확인해주세요.'
          : 'GitHub 연결을 완료하지 못했습니다. 연결할 계정과 저장 권한을 확인해주세요.' });
      }
    } catch { /* 저장 불가 시 재인증으로 안내 */ }
  },

  markGitHubTokenExpired: () => {
    try {
      localStorage.removeItem(GITHUB_AUTH_KEY);
      const stored = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}');
      if (stored?.provider_token) {
        delete stored.provider_token;
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
      }
    } catch { /* localStorage 사용 불가 환경 무시 */ }
    set({ githubTokenExpired: true });
  },

  // 세션 초기화 (App 마운트 시 호출)
  // cleanup 함수를 반환하여 StrictMode 이중 실행 시 리스너 중복 방지
  initialize: () => {
    let active = true;
    const pendingTasks = new Set();
    const afterAuthEvent = (task) => {
      const timer = setTimeout(() => {
        pendingTasks.delete(timer);
        if (active) Promise.resolve().then(task).catch((error) => {
          console.warn('로그인 후 동기화 실패:', error.message);
        });
      }, 0);
      pendingTasks.add(timer);
    };
    const isCurrentUser = (userId) => active && get().user?.id === userId;

    // 세션 조회 (비동기, 반환값과 무관)
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (session?.user) {
          set({ user: session.user, loading: false });
          await get().upsertProfile(session.user);
          if (isCurrentUser(session.user.id)) get().fetchProfile(session.user.id);
        } else {
          set({ loading: false });
        }
      } catch {
        if (active) set({ loading: false });
      }
    })();

    // 인증 상태 변화 리스너
    // Supabase는 이 콜백의 완료를 기다립니다. DB 요청은 다음 이벤트 루프에서
    // 시작해야 요청의 인증 조회가 현재 로그인 알림을 다시 기다리지 않습니다.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'SIGNED_IN' && session?.user) {
        set({ user: session.user, loading: false });
        afterAuthEvent(async () => {
          if (!isCurrentUser(session.user.id)) return;
          await get().upsertProfile(session.user);
          if (!isCurrentUser(session.user.id)) return;
          await get().fetchProfile(session.user.id);
          // localStorage 진행률 서버 동기화
          const { default: useAppStore } = await import('./appStore');
          if (isCurrentUser(session.user.id)) useAppStore.getState().syncProgressToServer();
        });
      } else if (event === 'SIGNED_OUT') {
        try { localStorage.removeItem(GITHUB_AUTH_KEY); } catch { /* ignore */ }
        set({ user: null, profile: null, githubTokenExpired: false });
        get()._cleanupStoresOnSignOut();
      }
    });

    // cleanup 함수 반환
    return () => {
      active = false;
      pendingTasks.forEach(clearTimeout);
      subscription.unsubscribe();
    };
  },

  // 프로필 조회
  fetchProfile: async (userId) => {
    const { data } = await supabase
      .from('vpylab_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) set({ profile: data });
  },

  // 프로필 upsert (첫 로그인 시)
  upsertProfile: async (user) => {
    const displayName = user.user_metadata?.full_name
      || user.user_metadata?.name
      || user.email?.split('@')[0]
      || '';
    const avatarUrl = user.user_metadata?.avatar_url || null;
    const githubUsername = extractGitHubUsername(user);

    const { error: insertError } = await supabase.from('vpylab_profiles').upsert({
      id: user.id,
      display_name: displayName,
      avatar_url: avatarUrl,
      github_username: githubUsername,
    }, { onConflict: 'id', ignoreDuplicates: true });
    if (insertError) {
      console.warn('프로필 생성 실패:', insertError.message);
    }

    if (!avatarUrl && !githubUsername) return;

    const { error: updateError } = await supabase
      .from('vpylab_profiles')
      .update({
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        ...(githubUsername ? { github_username: githubUsername } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.warn('프로필 갱신 실패:', updateError.message);
    }
  },

  // Google 로그인
  signInWithGoogle: async () => {
    try {
      localStorage.removeItem(GITHUB_AUTH_KEY);
      localStorage.removeItem(OAUTH_LINK_USER_KEY);
      OAUTH_RETURN_KEYS.forEach(key => localStorage.removeItem(key));
      localStorage.setItem(OAUTH_PROVIDER_KEY, 'google');
    } catch { /* ignore */ }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) console.error('Google 로그인 오류:', error.message);
    if (data?.url) window.location.href = data.url;
  },

  // GitHub 로그인 (public_repo scope으로 갤러리 발행/프로젝트 commit 지원)
  // returnPath, returnCode를 옵션으로 받으면 재인증 후 그 코드로 복원할 수 있도록
  // localStorage에 임시 저장한다 (Supabase는 OAuth 후 redirectTo만 보존하므로 우리가 직접 백업).
  signInWithGitHub: async ({ returnPath, returnCode, returnAction, returnProjectId } = {}) => {
    set({ githubTokenExpired: false, githubAuthError: '' });
    const currentUser = get().user;
    const linkCurrentAccount = !!currentUser?.id && !hasGitHubIdentity(currentUser);
    try {
      localStorage.removeItem(GITHUB_AUTH_KEY);
      localStorage.setItem(OAUTH_PROVIDER_KEY, 'github');
      localStorage.removeItem(OAUTH_LINK_USER_KEY);
      if (currentUser?.id) localStorage.setItem(OAUTH_LINK_USER_KEY, currentUser.id);
      OAUTH_RETURN_KEYS.forEach(key => localStorage.removeItem(key));
      if (returnPath) localStorage.setItem('vpylab-oauth-return-path', returnPath);
      if (returnCode != null) localStorage.setItem('vpylab-oauth-return-code', returnCode);
      if (returnAction) localStorage.setItem('vpylab-oauth-return-action', returnAction);
      if (returnProjectId) localStorage.setItem('vpylab-oauth-return-project-id', returnProjectId);
    } catch { /* localStorage 사용 불가 환경 무시 */ }
    // 로그인한 Google 계정을 다른 계정으로 바꾸지 않고 GitHub identity를 연결합니다.
    const authMethod = linkCurrentAccount ? 'linkIdentity' : 'signInWithOAuth';
    let data, error;
    try {
      ({ data, error } = await supabase.auth[authMethod]({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'public_repo',
        skipBrowserRedirect: false,
      },
      }));
    } catch (requestError) {
      error = requestError;
    }
    if (error) {
      try {
        localStorage.removeItem(OAUTH_PROVIDER_KEY);
        localStorage.removeItem(OAUTH_LINK_USER_KEY);
        OAUTH_RETURN_KEYS.forEach(key => localStorage.removeItem(key));
      } catch { /* ignore */ }
      const message = error.code === 'manual_linking_disabled'
        ? 'GitHub 계정 연결을 사용할 수 없습니다. 관리자에게 계정 연결 설정을 확인해주세요.'
        : error.code === 'identity_already_exists'
          ? '이미 다른 VPyLab 계정에 연결된 GitHub 계정입니다. 연결할 GitHub 계정을 확인해주세요.'
          : 'GitHub 연결을 완료하지 못했습니다. 현재 계정의 작품은 그대로 보관됩니다.';
      set({ githubAuthError: message });
      console.error('GitHub 로그인 오류:', error.message);
      return { data: null, error };
    }
    // 자동 리다이렉트가 안 될 경우 수동 이동
    if (data?.url) window.location.href = data.url;
    return { data, error: null };
  },

  // GitHub provider_token 추출 (갤러리 발행 시 사용)
  getGitHubToken: async () => {
    if (get().githubTokenExpired) return null;

    // 1차: Supabase getSession()에서 provider_token 확인
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id || !hasGitHubIdentity(session.user)) return null;
    try {
      const cached = JSON.parse(localStorage.getItem(GITHUB_AUTH_KEY) || 'null');
      if (cached?.userId === session.user.id && cached.provider === 'github' && cached.token) return cached.token;
    } catch { /* ignore */ }
    if (!isOnlyGitHub(session.user)) return null;
    if (session.provider_token) return session.provider_token;

    // 2차: localStorage fallback (Supabase는 세션 새로고침 시 provider_token을 잃을 수 있음)
    try {
      const stored = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
      if (stored?.user?.id === session.user.id && isOnlyGitHub(stored.user)
        && stored.provider_token) return stored.provider_token;
    } catch { /* ignore parse errors */ }

    return null;
  },

  // GitHub 로그인 여부 확인
  isGitHubUser: () => {
    const user = get().user;
    return user?.app_metadata?.provider === 'github'
      || user?.identities?.some(i => i.provider === 'github');
  },

  // 서버 API 호출용 Supabase access token 조회 (없으면 null)
  getAccessToken: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch {
      return null;
    }
  },

  // OAuth가 다른 사용자로 돌아왔을 때 listener 도착 여부와 무관하게 개인 상태를 정리합니다.
  endMismatchedOAuth: async () => {
    let error = null;
    try {
      ({ error } = await supabase.auth.signOut({ scope: 'local' }));
    } catch (requestError) {
      error = requestError;
    }
    try {
      [AUTH_STORAGE_KEY, `${AUTH_STORAGE_KEY}-user`, GITHUB_AUTH_KEY].forEach(key => localStorage.removeItem(key));
    } catch { /* 저장소를 사용할 수 없어도 화면의 개인 상태는 정리합니다. */ }
    await get()._cleanupStoresOnSignOut();
    set({ user: null, profile: null, loading: false, githubTokenExpired: false, authModalOpen: !error });
    return { error };
  },

  // 로그아웃 시 다른 스토어의 개인 상태 정리
  // codeStore/projectStore가 authStore를 import하므로 순환 import 방지를 위해 동적 import 사용
  _cleanupStoresOnSignOut: async () => {
    try {
      const [{ default: useProjectStore }, { default: useCodeStore }] = await Promise.all([
        import('./projectStore'),
        import('./codeStore'),
      ]);
      useProjectStore.getState().closeProject();     // Realtime 채널 해제 포함
      useCodeStore.getState().resetOnSignOut();      // 자동 저장 타이머/개인 코드 목록 초기화
      const { default: useAppStore } = await import('./appStore');
      useAppStore.getState().clearProgressOnSignOut(); // 계정 진행률이 다음 사용자에게 남지 않게
    } catch (e) {
      console.warn('로그아웃 스토어 정리 실패:', e.message);
    }
  },

  // 로그아웃
  signOut: async () => {
    try {
      localStorage.removeItem(GITHUB_AUTH_KEY);
      localStorage.removeItem(OAUTH_PROVIDER_KEY);
      localStorage.removeItem(OAUTH_LINK_USER_KEY);
    } catch { /* ignore */ }
    await supabase.auth.signOut();
    await get()._cleanupStoresOnSignOut();
    set({ user: null, profile: null, githubTokenExpired: false, githubAuthError: '' });
  },

  // 프로필 업데이트
  updateProfile: async (updates) => {
    const user = get().user;
    if (!user) return;
    const { data, error } = await supabase
      .from('vpylab_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (!error && data) set({ profile: data });
    return { data, error };
  },

  // 초대 코드로 학급 참가
  joinClass: async (inviteCode) => {
    const user = get().user;
    if (!user) return { error: { message: '로그인이 필요합니다' } };

    const { data: cls } = await supabase
      .from('vpylab_classes')
      .select('id')
      .eq('invite_code', inviteCode)
      .single();

    if (!cls) return { error: { message: '유효하지 않은 초대 코드입니다' } };

    return get().updateProfile({ class_id: cls.id });
  },

  // 역할 확인 헬퍼
  isTeacher: () => {
    const profile = get().profile;
    return profile?.role === 'teacher' || profile?.role === 'admin';
  },

  isAdmin: () => {
    const profile = get().profile;
    return profile?.role === 'admin';
  },
}));

export default useAuthStore;
