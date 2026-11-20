import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import useAuthStore from './authStore';

const CODE_WRITE_TIMEOUT_MS = 22000;
const REVISION_WRITE_TIMEOUT_MS = 12000;
const projectSaveRequests = new Map();

function withTimeout(promise, timeoutMs, message) {
  let timerId;
  const timeout = new Promise((_, reject) => {
    timerId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), timeout])
    .finally(() => clearTimeout(timerId));
}

async function getCurrentUser() {
  const cachedUser = useAuthStore.getState().user;
  if (cachedUser?.id) return cachedUser;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

const useCodeStore = create((set, get) => ({
  savedCodes: [],
  loading: false,
  panelOpen: false,

  // 자동 저장 상태
  currentCodeId: null,      // 현재 작업 중인 코드 레코드 ID
  saveStatus: 'idle',       // 'idle' | 'saving' | 'saved' | 'error'
  _saveTimer: null,
  _autoSaveInFlight: false,   // 자동 저장 요청 진행 중 가드
  _autoSavePendingArgs: null, // 진행 중에 들어온 최신 자동 저장 인자 (완료 후 재예약)
  _autoSaveTask: null,
  _autoSavePaused: false,
  _autoSaveLatestArgs: null,
  _autoSaveGeneration: 0,

  setPanelOpen: (open) => set({ panelOpen: open }),
  setCurrentCodeId: (id) => set({ currentCodeId: id }),

  // 저장된 코드 목록 조회 — 본인 코드 + 본인이 속한 팀 프로젝트 코드 (RLS가 정책상 알아서 OR 처리)
  fetchSavedCodes: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set({ loading: true });

    // 1) 내 개인 코드
    const { data: ownCodes } = await supabase
      .from('vpylab_saved_code')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    // 2) 내가 멤버인 팀 코드 (RLS가 멤버십 통과한 행만 반환)
    const { data: memberRows } = await supabase
      .from('vpylab_project_members')
      .select('project_id')
      .eq('user_id', user.id);
    const projectIds = (memberRows || []).map(r => r.project_id);

    let teamCodes = [];
    if (projectIds.length > 0) {
      const { data } = await supabase
        .from('vpylab_saved_code')
        .select('*')
        .in('project_id', projectIds)
        .order('updated_at', { ascending: false });
      teamCodes = data || [];
    }

    // 합치고 중복 제거 (id 기준)
    const map = new Map();
    [...(ownCodes || []), ...teamCodes].forEach(c => map.set(c.id, c));
    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
    );

    set({ savedCodes: merged, loading: false });
  },

  /**
   * 내부 헬퍼: code_id에 대한 revision을 1행 추가한다.
   * - parent_revision_id를 자동으로 직전 revision으로 연결
   * - projectId가 있으면 revision에도 함께 기록(팀 이력 RLS/조회용)
   */
  _createRevision: async ({
    codeId,
    code,
    userId,
    message = '',
    source = 'manual',
    projectId = null,
    skipParentLookup = false,
    journal = false,
  }) => {
    let parent = null;
    if (!skipParentLookup) {
      const { data, error } = await supabase
        .from('vpylab_code_revisions')
        .select('id')
        .eq('code_id', codeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[codeStore] parent revision 조회 실패:', error.message);
      }
      parent = data || null;
    }

    const { data, error } = await supabase
      .from('vpylab_code_revisions')
      .insert({
        code_id: codeId,
        parent_revision_id: parent?.id || null,
        author_id: userId,
        message: message.slice(0, journal ? 3600 : 200),
        code_snapshot: code,
        code_size: code.length,
        source,
        project_id: projectId,
      })
      .select()
      .single();

    if (error) {
      console.warn('[codeStore] revision 생성 실패:', error.message);
    }
    return { data, error };
  },

  /**
   * 코드 저장 (새로 만들기 또는 업데이트)
   * - manual 저장 시 vpylab_code_revisions에 스냅샷 1행을 함께 추가한다 (Phase 1).
   * - source: 'manual' | 'restore' | 'mission_submit' | 'github_pull'
   * - commitMessage: 학생이 입력한 저장 메시지 (예: "캐릭터 점프 추가")
   * - skipRevision: true면 revision을 만들지 않음 (자동저장 등에서 사용)
   */
  saveCode: async ({
    title,
    code,
    missionId = null,
    id = null,
    projectId = null,
    commitMessage = '',
    source = 'manual',
    skipRevision = false,
    skipParentLookup = false,
    journal = false,
    expectedCode,
  }) => {
    const user = await getCurrentUser();
    if (!user) return { error: { message: '로그인이 필요합니다' } };

    if (id && projectId && !skipRevision) {
      if (typeof expectedCode !== 'string') {
        return { data: null, error: { code: 'save_context_missing', message: '편집을 시작한 코드를 확인하지 못했습니다. 내 코드를 복사해 보관한 뒤 프로젝트를 다시 열어주세요.' } };
      }
      const requestKey = `${user.id}:${id}`;
      const requestBody = JSON.stringify([projectId, code, commitMessage, source, missionId]);
      const pending = projectSaveRequests.get(requestKey);
      const sameRequest = pending?.body === requestBody;
      const requestId = sameRequest ? pending.id : crypto.randomUUID();
      const requestExpectedCode = sameRequest ? pending.expectedCode : expectedCode;
      projectSaveRequests.set(requestKey, { id: requestId, body: requestBody, expectedCode: requestExpectedCode });
      const clearRequest = () => {
        if (projectSaveRequests.get(requestKey)?.id === requestId) projectSaveRequests.delete(requestKey);
      };
      const controller = new AbortController();
      try {
        let rpc = supabase.rpc('vpylab_save_project_code', {
          p_code_id: id, p_project_id: projectId, p_expected_code: requestExpectedCode,
          p_code: code, p_title: title, p_message: commitMessage, p_source: source,
          p_client_save_id: requestId, p_mission_id: missionId,
        });
        if (rpc.abortSignal) rpc = rpc.abortSignal(controller.signal);
        const { data, error, status } = await withTimeout(rpc, CODE_WRITE_TIMEOUT_MS,
          '저장 응답이 지연되어 결과를 아직 확인하지 못했습니다. 같은 코드로 다시 저장하면 기존 요청 결과를 확인합니다.');
        if (error) {
          if (status === 0 || status >= 500 || /AbortError|Failed to fetch|NetworkError|fetch failed/i.test(error.message || '')) {
            return { data: null, error: { code: 'save_result_unknown', message: '통신이 끊겨 저장 결과를 아직 확인하지 못했습니다. 같은 코드로 다시 저장해 기존 요청 결과를 확인해주세요.' } };
          }
          clearRequest();
          if (error.code === 'PT409' && error.message === 'saved_code_conflict') {
            let latestCode;
            try {
              const latest = await withTimeout(supabase.from('vpylab_saved_code').select('code').eq('id', id).maybeSingle(),
                REVISION_WRITE_TIMEOUT_MS, '최신 코드 조회가 지연되고 있습니다.');
              if (!latest.error) latestCode = latest.data?.code;
            } catch { /* 최신 코드를 못 읽어도 내 편집본과 충돌 정보는 유지합니다. */ }
            return { data: null, error: { code: 'saved_code_conflict', latestCode,
              message: '다른 친구의 저장이 먼저 반영됐습니다. 내 코드는 편집기에 그대로 남아 있습니다. 새 작품으로 보관하거나 최신 코드와 비교한 뒤 다시 저장해주세요.' } };
          }
          return { data: null, error: error.code === '42501'
            ? { code: error.code, message: '이 작품을 저장할 편집 권한이 없습니다. 프로젝트 초대와 멤버 권한을 확인해주세요.' }
            : error };
        }
        if (!data?.saved || !data?.revision) return { data: null, error: { message: '코드와 저장 이력의 완료 결과를 확인하지 못했습니다.' } };
        clearRequest();
        get().fetchSavedCodes().catch(() => {});
        return { data: { ...data.saved, _revision: data.revision, _superseded: !!data.superseded, _latestCode: data.latest_code }, error: null };
      } catch (error) {
        controller.abort();
        return { data: null, error: { code: 'save_result_unknown', message: error.message || '저장 결과를 아직 확인하지 못했습니다. 같은 코드로 다시 저장해 기존 요청 결과를 확인해주세요.' } };
      }
    }

    let savedRow;
    let saveError;

    try {
      if (id) {
        // UPDATE — 팀 코드는 user_id 필터를 걸지 않음 (RLS가 멤버십 검사)
        const updatePayload = { title, code, mission_id: missionId, updated_at: new Date().toISOString() };
        if (projectId !== undefined && projectId !== null) updatePayload.project_id = projectId;

        let q = supabase
          .from('vpylab_saved_code')
          .update(updatePayload)
          .eq('id', id);
        if (!projectId) q = q.eq('user_id', user.id);

        const { data, error } = await withTimeout(
          q.select().single(),
          CODE_WRITE_TIMEOUT_MS,
          'VPyLab 코드 본문 저장이 지연되고 있습니다. 네트워크 상태를 확인한 뒤 다시 저장해주세요.',
        );
        savedRow = data;
        saveError = error;
      } else {
        const { data, error } = await withTimeout(
          supabase
            .from('vpylab_saved_code')
            .insert({
              user_id: user.id,
              title,
              code,
              mission_id: missionId,
              project_id: projectId,
            })
            .select()
            .single(),
          CODE_WRITE_TIMEOUT_MS,
          'VPyLab 코드 본문 저장이 지연되고 있습니다. 네트워크 상태를 확인한 뒤 다시 저장해주세요.',
        );
        savedRow = data;
        saveError = error;
      }
    } catch (error) {
      return {
        data: null,
        error: { message: error.message || 'VPyLab 코드 본문 저장이 지연되고 있습니다.' },
      };
    }

    if (saveError) return { data: null, error: saveError };

    // === revision 생성 (실패해도 저장 자체는 성공으로 간주) ===
    let revision = null;
    let revisionWarning = '';
    if (!skipRevision && savedRow) {
      try {
        const { data: createdRevision, error: revisionError } = await withTimeout(
          get()._createRevision({
            codeId: savedRow.id,
            code,
            userId: user.id,
            message: commitMessage,
            source,
            projectId: savedRow.project_id || null,
            skipParentLookup,
          }),
          REVISION_WRITE_TIMEOUT_MS,
          '코드 본문은 저장됐지만 저장 이력 생성 응답이 지연되고 있습니다. 잠시 뒤 저장 이력을 확인하거나 다시 저장해주세요.',
        );
        if (revisionError) {
          revisionWarning = revisionError.message || '저장 이력 생성에 실패했습니다.';
        }
        revision = createdRevision || null;
      } catch (error) {
        revisionWarning = error.message || '저장 이력 생성 응답이 지연되고 있습니다.';
        console.warn('[codeStore] revision 생성 지연:', revisionWarning);
      }
    }

    get().fetchSavedCodes();
    const result = revision ? { ...savedRow, _revision: revision } : { ...savedRow };
    if (revisionWarning) {
      result._revisionPending = true;
      result._revisionWarning = revisionWarning;
    }
    return {
      data: result,
      error: null,
    };
  },

  /**
   * 자동 저장 (2초 debounce)
   * - currentCodeId가 있으면 업데이트, 없으면 새 레코드 생성
   * - 로그인 사용자만 동작
   */
  autoSave: (code, { title = '제목 없음', missionId = null } = {}) => {
    if (get()._autoSavePaused) return;
    const { _saveTimer } = get();
    if (_saveTimer) clearTimeout(_saveTimer);

    const timer = setTimeout(() => {
      set({ _saveTimer: null });
      get()._runAutoSave(code, { title, missionId });
    }, 2000);

    // 이전 pending보다 새 타이머의 코드가 최신입니다.
    set({ _saveTimer: timer, _autoSavePendingArgs: null, _autoSaveLatestArgs: [code, { title, missionId }], saveStatus: 'idle' });
  },

  // 자동 저장 실제 실행 — in-flight 가드 포함
  _runAutoSave: (code, { title = '제목 없음', missionId = null } = {}) => {
    if (get()._autoSavePaused) return;
    // 진행 중이면 최신 인자만 보관했다가 완료 후 다시 예약 (요청 중복/경합 방지)
    if (get()._autoSaveInFlight) {
      set({ _autoSavePendingArgs: [code, { title, missionId }] });
      return;
    }
    set({ _autoSaveInFlight: true });

    const task = (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        set({ saveStatus: 'saving' });

        // 비동기 경계 이후 재확인 — 다른 경로(코드 열기 등)에서 id가 생겼으면 중복 INSERT 방지
        const currentId = get().currentCodeId;

        if (currentId) {
          // 기존 레코드 업데이트 (본인 소유분만)
          // count로 실제 갱신된 행 수를 확인하여 user_id 불일치 시 false-positive 'saved' 방지
          const { error, count } = await supabase
            .from('vpylab_saved_code')
            .update({ code, updated_at: new Date().toISOString() }, { count: 'exact' })
            .eq('id', currentId)
            .eq('user_id', user.id);

          if (error || count === 0) {
            set({ saveStatus: 'error' });
          } else {
            set({ saveStatus: 'saved' });
          }
        } else {
          // 새 레코드 생성
          const { data, error } = await supabase
            .from('vpylab_saved_code')
            .insert({ user_id: user.id, title, code, mission_id: missionId })
            .select()
            .single();

          if (!error && data) {
            // INSERT 응답 대기 중 다른 경로에서 currentCodeId가 생겼으면 그 값을 유지 (중복 INSERT 결과 무시)
            set({ currentCodeId: get().currentCodeId || data.id, saveStatus: 'saved' });
          } else {
            set({ saveStatus: 'error' });
          }
        }
      } catch {
        set({ saveStatus: 'error' });
      } finally {
        set({ _autoSaveInFlight: false });
        // 진행 중에 들어온 최신 변경이 있으면 다음 debounce로 재예약
        const pending = get()._autoSavePendingArgs;
        if (pending && !get()._autoSavePaused) {
          set({ _autoSavePendingArgs: null });
          get().autoSave(pending[0], pending[1]);
        }
      }
    })();
    set({ _autoSaveTask: task });
    return task;
  },

  // 복원 중에는 예약을 취소하고 이미 시작한 저장이 끝난 뒤 본문을 읽습니다.
  // currentCodeId는 유지하며, 실패했을 때만 기존 편집본 자동저장을 다시 예약합니다.
  pauseAutoSave: async () => {
    const { _saveTimer, _autoSaveTask, _autoSaveLatestArgs, _autoSaveInFlight, _autoSavePendingArgs } = get();
    const shouldResume = !!(_saveTimer || _autoSaveInFlight || _autoSavePendingArgs);
    const generation = get()._autoSaveGeneration;
    if (_saveTimer) clearTimeout(_saveTimer);
    set({ _autoSavePaused: true, _saveTimer: null, _autoSavePendingArgs: null });
    try {
      if (_autoSaveTask) await withTimeout(_autoSaveTask, CODE_WRITE_TIMEOUT_MS, '자동저장이 아직 끝나지 않아 복원하지 않았습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.');
    } catch (error) {
      set({ _autoSavePaused: false });
      throw error;
    }
    return (restored = false) => {
      set({ _autoSavePaused: false, ...(restored ? { _autoSaveLatestArgs: null } : {}) });
      if (!restored && shouldResume && _autoSaveLatestArgs && generation === get()._autoSaveGeneration) get().autoSave(..._autoSaveLatestArgs);
    };
  },

  // 자동 저장 타이머 정리
  clearAutoSave: () => {
    const { _saveTimer } = get();
    if (_saveTimer) clearTimeout(_saveTimer);
    set({
      _saveTimer: null,
      _autoSavePendingArgs: null,
      _autoSaveLatestArgs: null,
      _autoSaveGeneration: get()._autoSaveGeneration + 1,
      currentCodeId: null,
      saveStatus: 'idle',
    });
  },

  // 로그아웃 시 개인 데이터/타이머 초기화 (authStore._cleanupStoresOnSignOut에서 호출)
  resetOnSignOut: () => {
    projectSaveRequests.clear();
    const { _saveTimer } = get();
    if (_saveTimer) clearTimeout(_saveTimer);
    set({
      _saveTimer: null,
      _autoSaveInFlight: false,
      _autoSavePendingArgs: null,
      _autoSaveLatestArgs: null,
      _autoSaveGeneration: get()._autoSaveGeneration + 1,
      currentCodeId: null,
      savedCodes: [],
      saveStatus: 'idle',
      panelOpen: false,
    });
  },

  /**
   * 미션용: mission_id로 가장 최근 저장된 코드 로드
   */
  loadMissionCode: async (missionId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('vpylab_saved_code')
      .select('*')
      .eq('user_id', user.id)
      .eq('mission_id', missionId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      set({ currentCodeId: data.id });
      return data.code;
    }
    return null;
  },

  // 코드 삭제
  deleteCode: async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('vpylab_saved_code')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    get().fetchSavedCodes();
  },

  // 미션 제출 기록
  submitMission: async ({ missionId, code, score, passed, gradingDetails }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('vpylab_submissions')
      .insert({
        user_id: user.id,
        mission_id: missionId,
        code,
        score,
        passed,
        grading_details: gradingDetails,
      })
      .select()
      .single();

    return { data, error };
  },

  // 내 제출 기록 조회
  fetchMySubmissions: async (missionId = null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('vpylab_submissions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (missionId) query = query.eq('mission_id', missionId);

    const { data } = await query;
    return data || [];
  },
}));

export default useCodeStore;
