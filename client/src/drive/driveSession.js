/**
 * 편집기(만들기 화면)의 구글 드라이브 저장 — 오픈소스 판의 기본 저장 방식입니다.
 *
 * 드라이브 저장 실험(/drive-lab)에서 시험한 모듈을 그대로 씁니다.
 *   - google-auth.js: 구글 로그인(토큰 1시간, drive.file 권한)
 *   - drive-storage.js: VPyLab 폴더, 만들기·열기·저장, 충돌 판정, 재시도, 폴더 되살리기
 *   - lab-state.js: 브라우저에 남기는 초안(14일 뒤 정리)
 *
 * 화면은 이 저장소의 상태만 보고 그립니다. 구글 승인 창은 반드시 클릭 처리 안에서 열어야 하므로
 * signIn()은 await 없이 바로 승인 요청을 보냅니다.
 */
import { create } from 'zustand';
import { AuthRequiredError, createGoogleAuth, fetchUserInfo, loadGis, missingScopes } from '../drive-lab/google-auth.js';
import { DriveError, createDriveStorage, uniqueFileName } from '../drive-lab/drive-storage.js';
import { clearDraft, clearDrafts, deviceId as getDeviceId, fileDrafts, listDrafts, purgeOldDrafts, saveDraft } from '../drive-lab/lab-state.js';

export const DRIVE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
/** 드라이브 폴더 주소(사용자가 드라이브에서 직접 볼 때) */
export const driveFolderUrl = (folderId) => (folderId ? `https://drive.google.com/drive/folders/${folderId}` : 'https://drive.google.com/drive/my-drive');

/** 오류 사유별 안내. 화면에서 ui()로 번역합니다. 문구: docs/reference/solar/drive-editor-261109-solar.md */
export const DRIVE_REASON_TEXT = {
  auth: '구글 권한이 만료되었거나 철회되었고, "다시 승인"을 누르면 이어서 저장합니다.',
  scope: '드라이브 권한이 없습니다. 승인 화면에서 "Google Drive 파일" 항목의 체크 상자를 직접 체크한 뒤 계속을 눌러야 합니다.',
  policy: '학교 관리자 정책이 이 앱의 드라이브 사용을 막고 있습니다. 정보 담당 선생님께 문의하십시오.',
  storageFull: '구글 드라이브 저장 공간이 가득 찼습니다.',
  rate: '구글이 요청 속도를 제한했습니다. 잠시 뒤 다시 시도하십시오.',
  forbidden: '구글이 요청을 거부했습니다. 학교 관리자 정책일 수 있습니다.',
  notFound: '파일을 찾을 수 없습니다. 휴지통으로 옮겨졌거나 권한이 사라졌을 수 있습니다.',
  trashed: '이 파일은 드라이브 휴지통에 있고, "새 파일로 저장"을 누르면 지금 코드를 새 파일에 저장합니다.',
  network: '네트워크 연결에 실패했고, 코드는 편집기와 이 브라우저에 남아 있습니다.',
  timeout: '구글 응답이 너무 늦습니다. 저장됐는지 확인하려면 파일을 다시 여십시오.',
  tooLarge: '코드가 100KB를 넘어 저장할 수 없습니다.',
  folderTrashed: 'VPyLab 폴더가 드라이브 휴지통에 있습니다. 그대로 두면 안의 파일이 30일 뒤 지워집니다. "VPyLab 폴더 되살리기"를 누르십시오.',
  server: '구글 서버 오류입니다. 잠시 뒤 다시 시도하십시오.',
  gis: '구글 로그인 스크립트를 불러오지 못했으니 네트워크나 학교 방화벽에서 accounts.google.com이 막혔는지 확인하십시오.',
  unknown: '드라이브 작업을 마치지 못했으니 잠시 뒤 다시 시도하십시오.',
};

export function reasonOf(error) {
  if (error instanceof AuthRequiredError) return 'auth';
  if (error instanceof DriveError) return DRIVE_REASON_TEXT[error.reason] ? error.reason : 'unknown';
  return 'unknown';
}

const needsReauth = (error) => error instanceof AuthRequiredError || (error instanceof DriveError && error.reason === 'auth');
const scopeOf = (sub) => `editor-${sub}`;
/** 탭마다 초안 이름을 따로 둡니다. 한 탭의 저장이 다른 탭의 저장하지 않은 초안을 지우지 않게 합니다. */
const TAB_ID = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
const NEW_KEY = `new@${TAB_ID}`;
const ownKey = (fileId) => (fileId ? `${fileId}@${TAB_ID}` : NEW_KEY);

const initialState = {
  ready: false,
  preparing: false,
  account: null, // { sub, email, name }
  file: null, // { id, name, version, headRevisionId, savedCode }
  files: [],
  truncated: false,
  busy: '', // 'signin' | 'list' | 'open' | 'save' | 'restore'
  error: null, // { reason, detail? }
  needsReauth: false,
  missingScope: false,
  folderTrashed: false,
  conflict: null, // { mine, remote: { meta, code } }
  attemptedCodes: [],
  lastSavedAt: 0,
};

/** 테스트에서 구글 흉내(gis·fetch)와 저장소를 바꿔 끼웁니다. */
let deps = { clientId: DRIVE_CLIENT_ID, gis: null, fetchImpl: null, storage: null };
let auth = null;
let drive = null;
/** 승인할 때마다 올립니다. 승인 전에 보낸 요청이 늦게 실패해도 새 승인을 '만료'로 되돌리지 않게 합니다. */
let authEpoch = 0;
/** 로그아웃·계정 전환 때마다 올립니다. 앞 계정으로 보낸 요청의 결과를 뒤 계정 화면에 넣지 않습니다. */
let sessionEpoch = 0;
/** 파일 열기 요청 번호. 마지막으로 고른 파일의 응답만 반영합니다. */
let openSeq = 0;
/** 저장 요청 번호. 늦게 온 앞 계정 저장이 지금 진행 중인 저장의 busy를 풀지 않게 합니다. */
let saveSeq = 0;

export function configureDrive(next) {
  deps = { ...deps, ...next };
  auth = null;
  drive = null;
  useDriveStore.setState({ ...initialState });
}

function storage() {
  if (deps.storage) return deps.storage;
  try { return window.localStorage; } catch { return null; }
}

export const useDriveStore = create((set, get) => {
  /** 오류를 상태에 반영합니다. 재승인이 필요하면 needsReauth, 폴더가 휴지통이면 folderTrashed. */
  function fail(error, epoch = authEpoch) {
    const reason = reasonOf(error);
    if (epoch !== authEpoch && needsReauth(error)) {
      set({ busy: '' });
      return { status: 'error', reason: 'stale' };
    }
    set({
      busy: '',
      needsReauth: needsReauth(error),
      folderTrashed: error instanceof DriveError && error.reason === 'folderTrashed',
      error: { reason, detail: error instanceof DriveError ? String(error.status || error.reason) : error?.message || '' },
    });
    return { status: 'error', reason };
  }

  function rememberDraft(code) {
    const { account, file } = get();
    const store = storage();
    if (!account || !store) return;
    const key = ownKey(file?.id);
    if (file && code === file.savedCode) clearDraft(store, scopeOf(account.sub), key);
    else saveDraft(store, scopeOf(account.sub), key, { code, baseVersion: file?.version ?? null, name: file?.name ?? null });
  }

  /** 이 탭의 초안과, 방금 저장한 내용과 같은 초안(다른 탭 것 포함)을 지웁니다. 다른 내용의 초안은 남깁니다. */
  function forgetDraft(fileId, savedCode = null) {
    const { account } = get();
    const store = storage();
    if (!account || !store) return;
    const scope = scopeOf(account.sub);
    clearDraft(store, scope, ownKey(fileId));
    if (fileId && typeof savedCode === 'string') {
      for (const { fileId: key, draft } of fileDrafts(store, scope, fileId)) if (draft.code === savedCode) clearDraft(store, scope, key);
    }
  }

  /** 앞 계정으로 보낸 저장의 결과는 지금 계정 화면에 넣지 않습니다. 드라이브에 쓴 내용은 앞 계정 드라이브에 남습니다. */
  function staleResult(token) {
    set((s) => (token === saveSeq && s.busy === 'save' ? { busy: '' } : {}));
    return { status: 'stale' };
  }

  async function createFile(code, name, session = sessionEpoch, token = saveSeq) {
    const existing = get().files.map((f) => f.name);
    const meta = await drive.create({ name: uniqueFileName(name, existing), code, deviceId: getDeviceId(storage() || undefined) });
    if (session !== sessionEpoch) return staleResult(token);
    forgetDraft(null);
    set((s) => ({
      busy: '',
      file: { id: meta.id, name: meta.name, version: meta.version, headRevisionId: meta.headRevisionId, savedCode: code },
      files: [meta, ...s.files.filter((f) => f.id !== meta.id)],
      conflict: null,
      attemptedCodes: [],
      lastSavedAt: Date.now(),
    }));
    return { status: 'created', meta };
  }

  return {
    ...initialState,

    /** 구글 로그인 스크립트를 불러오고 승인 준비를 합니다(저장·열기 창을 열 때 부릅니다). */
    async prepare() {
      if (get().ready || get().preparing) return get().ready;
      if (!deps.clientId) return false;
      set({ preparing: true });
      try {
        const gis = deps.gis || await loadGis();
        auth = createGoogleAuth({ clientId: deps.clientId, gis });
        drive = createDriveStorage({ getToken: () => auth.getToken(), ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}) });
        const store = storage();
        if (store) purgeOldDrafts(store);
        set({ ready: true, preparing: false });
        return true;
      } catch {
        set({ preparing: false, error: { reason: 'gis' } });
        return false;
      }
    },

    /**
     * 구글 계정으로 승인합니다. 반드시 클릭 처리 안에서 부릅니다(팝업 차단 방지).
     * again=true면 같은 계정으로 다시 승인합니다(만료·철회 뒤).
     */
    signIn({ again = false, consent = false } = {}) {
      if (!auth) return Promise.resolve({ status: 'not-ready' });
      const hint = again ? get().account?.email || '' : '';
      const tokenPromise = auth.request({ prompt: consent ? 'consent' : again ? '' : 'select_account', loginHint: hint });
      set({ busy: 'signin', error: null });
      return (async () => {
        try {
          const token = await tokenPromise;
          const info = await fetchUserInfo(token.accessToken, deps.fetchImpl || undefined);
          const previous = get().account;
          if (previous && previous.sub !== info.sub) {
            // 공용 PC에서 다른 학생 계정이 승인된 경우: 앞 계정의 파일 정보를 지웁니다(편집기 내용은 그대로).
            sessionEpoch += 1;
            drive.resetFolder();
            set({ file: null, files: [], conflict: null, attemptedCodes: [] });
          }
          authEpoch += 1;
          const missing = missingScopes(token.scope);
          set({ account: { sub: info.sub, email: info.email, name: info.name || '' }, busy: '', needsReauth: false, missingScope: missing.length > 0 });
          if (missing.length) {
            set({ error: { reason: 'scope' } });
            return { status: 'missing-scope', switched: Boolean(previous && previous.sub !== info.sub) };
          }
          return { status: 'ok', switched: Boolean(previous && previous.sub !== info.sub) };
        } catch (error) {
          set({ busy: '', error: { reason: 'auth', detail: error?.message || '' } });
          return { status: 'error', message: error?.message || '' };
        }
      })();
    },

    /** clearLocal: 이 브라우저에 남은 이 계정의 초안도 지웁니다(공용 컴퓨터). */
    async signOut({ revoke = false, clearLocal = false } = {}) {
      sessionEpoch += 1;
      const { account } = get();
      const store = storage();
      if (clearLocal && account && store) clearDrafts(store, scopeOf(account.sub));
      if (revoke) await auth?.revoke(); else auth?.forget();
      drive?.resetFolder();
      set({ ...initialState, ready: get().ready });
    },

    clearError() { set({ error: null }); },

    async listFiles() {
      const epoch = authEpoch;
      const session = sessionEpoch;
      // 목록은 배경에서 읽습니다. 저장 실패로 창이 열린 경우 그 오류(찾을 수 없음·휴지통 등)를 지우지 않습니다.
      if (!get().busy) set({ busy: 'list' });
      // 목록을 읽다 생긴 오류만 표시해 두었다가, 목록을 다시 읽는 데 성공하면 그것만 지웁니다.
      const markListError = () => set((s) => (s.error ? { error: { ...s.error, source: 'list' } } : {}));
      try {
        const { files, truncated } = await drive.list();
        if (session !== sessionEpoch) return null; // 그사이 로그아웃·계정 전환
        // 목록은 배경에서 읽으므로, 그사이 시작한 열기·저장의 진행 표시는 지우지 않습니다.
        set((s) => ({
          files, truncated, folderTrashed: false, busy: s.busy === 'list' ? '' : s.busy,
          error: s.error?.source === 'list' ? null : s.error,
        }));
        return files;
      } catch (error) {
        if (session !== sessionEpoch) return null;
        if (get().busy !== 'list') {
          // 다른 작업이 진행 중이면 그 표시를 지우지 않고 오류만 알립니다.
          const busy = get().busy;
          fail(error, epoch);
          markListError();
          set({ busy });
          return null;
        }
        fail(error, epoch);
        markListError();
        return null;
      }
    },

    /** 파일을 열어 내용을 돌려줍니다. 저장하지 못한 초안이 있으면 함께 돌려줍니다. */
    async openFile(id) {
      const seq = ++openSeq;
      const session = sessionEpoch;
      set({ busy: 'open', error: null });
      try {
        const { meta, code } = await drive.open(id);
        // 그사이 다른 파일을 골랐거나 로그아웃했으면 이 응답은 버립니다.
        if (seq !== openSeq || session !== sessionEpoch) return { status: 'stale' };
        const { account } = get();
        const store = storage();
        let draft = null;
        if (account && store) {
          const scope = scopeOf(account.sub);
          const drafts = fileDrafts(store, scope, meta.id);
          // 드라이브와 같아진 초안은 정리하고, 다른 초안 가운데 가장 최근 것을 안내합니다.
          for (const d of drafts) if (d.draft.code === code) clearDraft(store, scope, d.fileId);
          draft = drafts.find((d) => d.draft.code !== code)?.draft || null;
        }
        set({ busy: '', file: { id: meta.id, name: meta.name, version: meta.version, headRevisionId: meta.headRevisionId, savedCode: code }, conflict: null, attemptedCodes: [] });
        return { status: 'opened', code, name: meta.name, draft };
      } catch (error) {
        if (seq !== openSeq || session !== sessionEpoch) return { status: 'stale' };
        return fail(error);
      }
    },

    /**
     * 파일을 열 때 안내한 초안을 편집기로 가져옵니다. 초안이 만들어진 뒤 드라이브가 바뀌었으면
     * 기준 내용을 모르는 상태로 두어, 저장할 때 덮어쓰지 않고 충돌로 보여 줍니다.
     */
    adoptDraft(draft) {
      const { file } = get();
      if (!file || !draft) return;
      if (draft.baseVersion != null && String(draft.baseVersion) !== String(file.version)) {
        set({ file: { ...file, version: String(draft.baseVersion), savedCode: null } });
      }
    },

    /** 이 계정에서 파일로 만들지 못한 새 코드 초안 가운데 가장 최근 것(다른 탭·지난 세션 포함) */
    latestNewDraft() {
      const { account } = get();
      const store = storage();
      if (!account || !store) return null;
      return listDrafts(store, scopeOf(account.sub)).find((d) => d.fileId.startsWith('new'))?.draft || null;
    },

    /** 지금 편집기 내용을 새 코드로 시작합니다(드라이브 파일과 연결을 끊음). */
    detach() { set({ file: null, conflict: null, attemptedCodes: [] }); },

    rememberDraft,
    forgetDraft,

    /** 편집기 내용이 드라이브와 다른지 */
    isDirty(code) {
      const { file } = get();
      return file ? code !== file.savedCode : false;
    },

    /**
     * 저장합니다. 연 파일이 없으면 name으로 새 파일을 만듭니다.
     * 결과: created | saved | unchanged | conflict | error
     */
    async save(code, { name } = {}) {
      // 저장이 진행 중이면 겹쳐 부르지 않습니다(새 파일이 두 개 생기지 않게).
      if (get().busy === 'save') return { status: 'busy' };
      const { file } = get();
      const session = sessionEpoch;
      const epoch = authEpoch;
      const token = ++saveSeq;
      set({ busy: 'save', error: null });
      try {
        if (!file) return await createFile(code, name || '제목 없음.py', session, token);
        const attempted = get().attemptedCodes;
        const result = await drive.save({
          id: file.id, code, baseVersion: file.version, baseCode: file.savedCode, attemptedCodes: attempted,
          deviceId: getDeviceId(storage() || undefined),
        });
        if (session !== sessionEpoch) return staleResult(token); // 그사이 로그아웃·계정 전환
        if (result.status === 'conflict') {
          set({ busy: '', conflict: { mine: code, remote: result.remote } });
          rememberDraft(code);
          return { status: 'conflict' };
        }
        const meta = result.meta;
        forgetDraft(file.id, code);
        set((s) => ({
          busy: '',
          file: { id: meta.id, name: meta.name || file.name, version: meta.version, headRevisionId: meta.headRevisionId, savedCode: code },
          files: s.files.map((f) => (f.id === meta.id ? { ...f, ...meta } : f)),
          attemptedCodes: [],
          lastSavedAt: Date.now(),
        }));
        return { status: result.status, overwritten: result.overwritten || null };
      } catch (error) {
        if (session !== sessionEpoch) return staleResult(token);
        // 시간 초과처럼 결과를 모르는 저장 시도는 다음 저장의 충돌 판정에서 내 저장으로 인정합니다.
        if (error instanceof DriveError && error.reason === 'timeout') set((s) => ({ attemptedCodes: [...s.attemptedCodes, code].slice(-5) }));
        rememberDraft(code);
        return fail(error, epoch);
      }
    },

    /**
     * 충돌 해결.
     *   copy: 내 코드를 사본 파일로 저장합니다.
     *   remote: 드라이브 내용을 편집기로 가져옵니다(돌려준 code를 편집기에 넣습니다).
     *   overwrite: 충돌 화면에서 본 드라이브 버전일 때만 내 코드로 덮어씁니다.
     */
    async resolveConflict(choice) {
      const { conflict, file } = get();
      if (!conflict || !file) return { status: 'none' };
      if (choice === 'remote') {
        const { meta, code } = conflict.remote;
        forgetDraft(file.id, code);
        set({ conflict: null, file: { id: meta.id, name: meta.name || file.name, version: meta.version, headRevisionId: meta.headRevisionId, savedCode: code }, attemptedCodes: [] });
        return { status: 'loaded', code };
      }
      if (get().busy === 'save') return { status: 'busy' };
      const session = sessionEpoch;
      const epoch = authEpoch;
      const token = ++saveSeq;
      set({ busy: 'save', error: null });
      try {
        if (choice === 'copy') {
          const base = (file.name || '제목 없음.py').replace(/\.py$/i, '');
          return await createFile(conflict.mine, `${base} (사본).py`, session, token);
        }
        const result = await drive.save({
          id: file.id, code: conflict.mine, baseVersion: file.version, baseCode: file.savedCode, force: true,
          expectVersion: conflict.remote.meta.version, expectRevisionId: conflict.remote.meta.headRevisionId,
          deviceId: getDeviceId(storage() || undefined),
        });
        if (session !== sessionEpoch) return staleResult(token);
        if (result.status === 'conflict') {
          set({ busy: '', conflict: { mine: conflict.mine, remote: result.remote } });
          return { status: 'conflict' };
        }
        const meta = result.meta;
        forgetDraft(file.id, conflict.mine);
        set({ busy: '', conflict: null, file: { id: meta.id, name: meta.name || file.name, version: meta.version, headRevisionId: meta.headRevisionId, savedCode: conflict.mine }, attemptedCodes: [], lastSavedAt: Date.now() });
        return { status: 'saved' };
      } catch (error) {
        if (session !== sessionEpoch) return staleResult(token);
        return fail(error, epoch);
      }
    },

    /** 휴지통에 있거나 찾을 수 없는 파일 대신 지금 코드를 새 파일로 저장합니다. */
    async saveAsNew(code, name) {
      if (get().busy === 'save') return { status: 'busy' };
      const session = sessionEpoch;
      const epoch = authEpoch;
      const token = ++saveSeq;
      set({ busy: 'save', error: null, file: null });
      try {
        return await createFile(code, name, session, token);
      } catch (error) {
        if (session !== sessionEpoch) return staleResult(token);
        return fail(error, epoch);
      }
    },

    async restoreFolder() {
      set({ busy: 'restore', error: null });
      try {
        await drive.restoreFolder();
        set({ busy: '', folderTrashed: false });
        return true;
      } catch (error) {
        fail(error);
        return false;
      }
    },
  };
});
