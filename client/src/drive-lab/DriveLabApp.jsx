import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createDriveStorage, DriveError } from './drive-storage.js';
import {
  loadGis, createGoogleAuth, fetchUserInfo, missingScopes, AuthRequiredError,
} from './google-auth.js';
import {
  CHECKLIST, RESULT_LABELS, deviceId as getDeviceId, loadClientId, saveClientId, saveDraft, clearDraft,
  clearDrafts, listDrafts, fileDrafts, clearFileDrafts, purgeOldDrafts, loadResults, saveResults, contactedOrigins, summarizeTimings, buildReport,
} from './lab-state.js';

const ENV_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
/**
 * 운영 빌드에서는 배포 설정의 클라이언트 ID만 사용합니다.
 * 화면에서 아무 ID나 넣게 하면 남의 앱에 학생 계정 권한을 주도록 유도하는 링크를 만들 수 있기 때문입니다.
 */
const ALLOW_CLIENT_ID_INPUT = !ENV_CLIENT_ID
  && (import.meta.env.DEV || import.meta.env.VITE_DRIVE_LAB_ALLOW_CLIENT_ID_INPUT === '1');
const CLIENT_ID_PATTERN = /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/;
const STARTER = 'from vpython import *\n\nball = sphere(color=color.cyan)\n';
const BURST_FILE = '연속저장-실험';
const EXTEND_WINDOW_MS = 5 * 60_000;

function safeStorage(name) {
  try {
    const s = window[name];
    if (s && typeof s.getItem === 'function') return s;
  } catch { /* 차단된 환경 */ }
  return { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 };
}

const GOOGLE_LOGOUT_URL = 'https://accounts.google.com/Logout';

const REASON_TEXT = {
  auth: '권한이 만료되었거나 철회되었습니다.',
  scope: '드라이브 권한이 없습니다. 승인 화면에서 드라이브 항목을 허용해야 합니다.',
  policy: '학교 관리자 정책이 이 앱의 드라이브 사용을 막고 있습니다. 정보 담당 선생님께 문의하세요.',
  storageFull: '구글 드라이브 저장 공간이 가득 찼습니다.',
  rate: '구글이 요청 속도를 제한했습니다. 잠시 뒤 다시 시도하세요.',
  forbidden: '구글이 요청을 거부했습니다. 학교 관리자 정책일 수 있습니다.',
  notFound: '파일을 찾을 수 없습니다. 휴지통으로 옮겨졌거나 권한이 사라졌을 수 있습니다.',
  network: '네트워크 연결에 실패했습니다. 코드는 이 브라우저에 초안으로 남아 있습니다.',
  timeout: '구글 응답이 너무 늦습니다. 저장됐는지 확인하려면 파일을 다시 여세요. 코드는 초안으로 남아 있습니다.',
  tooLarge: '코드가 100KB를 넘습니다.',
  server: '구글 서버 오류입니다. 잠시 뒤 다시 시도하세요.',
};

function describeError(error) {
  if (error instanceof AuthRequiredError) return REASON_TEXT.auth;
  if (error instanceof DriveError) return `${REASON_TEXT[error.reason] || '드라이브 오류'} (${error.status || error.reason})`;
  return error?.message || String(error);
}

const needsReauth = (error) => error instanceof AuthRequiredError || (error instanceof DriveError && error.reason === 'auth');

/**
 * 탭 ID. 페이지를 열 때마다 새로 정합니다. 초안은 탭마다 다른 이름(`new-<탭>`, `<파일ID>@<탭>`)에 쓰므로
 * 편집 내용이 다른 탭의 초안이나 지난 세션의 초안(안내 중인 초안 포함)을 덮어쓰지 않습니다.
 */
function newTabId() {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

const deviceOf = (meta) => meta?.appProperties?.vpylabDevice || '알 수 없음';

/** 지금 편집기와 다른, 가장 최근의 새 코드 초안 */
function latestOtherNewDraft(store, scope, ownKey, currentCode) {
  const found = listDrafts(store, scope).find(({ fileId, draft }) => fileId.startsWith('new-') && fileId !== ownKey && draft.code !== currentCode && draft.code !== STARTER);
  return found ? { ...found.draft, fileId: found.fileId } : null;
}

function formatRemaining(ms) {
  if (ms <= 0) return '만료됨';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}분 ${String(s).padStart(2, '0')}초`;
}

/**
 * storage: 계정별 초안·실험 기록(localStorage)
 * sessionStore: 로그인 전 초안(sessionStorage). 탭을 닫으면 사라져 공용 PC의 다음 사람에게 보이지 않습니다.
 */
export default function DriveLabApp({ storage: providedStorage, sessionStore: providedSession } = {}) {
  const storage = useMemo(() => providedStorage || safeStorage('localStorage'), [providedStorage]);
  const sessionStore = useMemo(() => providedSession || safeStorage('sessionStorage'), [providedSession]);
  const [tabId] = useState(newTabId);
  const newKey = `new-${tabId}`;
  const ownDraftKey = (fileId) => (fileId ? `${fileId}@${tabId}` : newKey);
  const device = useMemo(() => getDeviceId(storage), [storage]);
  const [clientId, setClientId] = useState(() => ENV_CLIENT_ID || (ALLOW_CLIENT_ID_INPUT ? loadClientId(storage) : ''));
  const [gisState, setGisState] = useState('idle'); // idle · ready · error
  const [account, setAccount] = useState(null); // { email, hd, sub }
  const [tokenInfo, setTokenInfo] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [files, setFiles] = useState([]);
  // version: 편집기 내용이 시작한 드라이브 버전, savedCode: 그 버전의 내용(모르면 null)
  const [current, setCurrent] = useState(null); // { id, name, version, savedCode }
  const [truncated, setTruncated] = useState(false);
  const [draftsTick, setDraftsTick] = useState(0); // 초안 목록을 바꾼 뒤 다시 그리기
  const [draftSaveFailed, setDraftSaveFailed] = useState(false);
  const [showGoogleLogout, setShowGoogleLogout] = useState(false);
  const [code, setCode] = useState(STARTER);
  const [newName, setNewName] = useState('첫 실험');
  const [conflict, setConflict] = useState(null);
  const [overwritten, setOverwritten] = useState(null);
  const [revisions, setRevisions] = useState([]);
  // draftNotice: { code, baseVersion, at, fileId } 화면에 아직 불러오지 않은 초안
  const [draftNotice, setDraftNotice] = useState(() => latestOtherNewDraft(sessionStore, 'anon', null, STARTER));
  const [reauth, setReauth] = useState(null); // 재승인 뒤 다시 할 작업 이름
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(() => ({
    tone: 'info',
    text: clientId || ALLOW_CLIENT_ID_INPUT ? '구글 로그인을 누르세요.' : '이 배포에는 구글 클라이언트 ID(VITE_GOOGLE_CLIENT_ID)가 설정되지 않았습니다.',
  }));
  const [requests, setRequests] = useState([]);
  const [results, setResults] = useState(() => loadResults(storage));
  const [burstCount, setBurstCount] = useState(30);
  const [burst, setBurst] = useState(null);
  const [origins, setOrigins] = useState(() => contactedOrigins(performance.getEntriesByType('resource'), window.location.origin));
  const [copied, setCopied] = useState(false);

  const authRef = useRef(null);
  const driveRef = useRef(null);
  const pendingRef = useRef(null);
  const codeRef = useRef(code);
  const currentRef = useRef(current);
  const scope = account?.sub || 'anon';
  const draftStore = scope === 'anon' ? sessionStore : storage;
  const savedCode = current ? current.savedCode : STARTER;
  const dirty = code !== savedCode;

  // 다시 승인 뒤 이어 가는 작업이 실패 시점이 아닌 최신 편집 내용을 사용하도록 ref에 둡니다.
  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { currentRef.current = current; }, [current]);

  const say = (text, tone = 'info') => setMessage({ text, tone });

  const refreshOrigins = useCallback(() => {
    setOrigins(contactedOrigins(performance.getEntriesByType('resource'), window.location.origin));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    // 페이지가 다 불러온 뒤의 출처를 한 번 더 모읍니다.
    const first = setTimeout(refreshOrigins, 1500);
    return () => { clearInterval(timer); clearTimeout(first); };
  }, [refreshOrigins]);

  useEffect(() => { saveResults(storage, results); }, [storage, results]);

  // 공용 PC에 오래된 초안이 쌓이지 않게 14일이 지난 초안을 지웁니다.
  useEffect(() => { purgeOldDrafts(storage); purgeOldDrafts(sessionStore); }, [storage, sessionStore]);

  // 구글 로그인 스크립트를 미리 불러옵니다. 클릭한 순간 바로 승인 창을 열어야 팝업이 차단되지 않습니다.
  useEffect(() => {
    const id = clientId.trim();
    if (!CLIENT_ID_PATTERN.test(id)) return undefined;
    let cancelled = false;
    loadGis().then((gis) => {
      if (cancelled) return;
      if (ALLOW_CLIENT_ID_INPUT) saveClientId(storage, id);
      authRef.current = createGoogleAuth({ clientId: id, gis });
      driveRef.current = createDriveStorage({
        getToken: () => authRef.current.getToken(),
        onRequest: (entry) => setRequests((list) => [...list.slice(-499), { ...entry, at: new Date().toLocaleTimeString() }]),
      });
      setGisState('ready');
    }).catch((error) => {
      if (cancelled) return;
      setGisState('error');
      setMessage({ tone: 'error', text: error.message });
    });
    return () => { cancelled = true; authRef.current = null; driveRef.current = null; };
  }, [clientId, storage]);

  // 드라이브에 반영되지 않은 변경만 초안으로 남깁니다. 초안은 저장 성공이나 명시적 선택으로만 지웁니다.
  // 이 탭의 초안: 편집기 내용이 드라이브와 같으면 지우고, 다르면 저장합니다.
  // 저장 처리 안에서 지우지 않고 여기서 지워야 렌더링 순서와 관계없이 결과가 같습니다.
  // 안내 중인 초안은 다른 이름에 있으므로 여기서 덮어쓰거나 지우지 않습니다.
  const ownKey = current?.id ? `${current.id}@${tabId}` : newKey;
  useEffect(() => {
    if (code === savedCode) {
      clearDraft(draftStore, scope, ownKey);
      return;
    }
    const ok = saveDraft(draftStore, scope, ownKey, { code, baseVersion: current?.version ?? null, name: current?.name ?? null });
    // 브라우저 저장소(외부 시스템)에 쓴 결과를 화면에 반영합니다. 저장 공간이 가득 차면 초안을 믿지 않도록 알립니다.
    setDraftSaveFailed((prev) => (prev === !ok ? prev : !ok));
  }, [draftStore, scope, code, current, savedCode, ownKey]);

  // 저장하지 않은 변경이 있으면 페이지를 떠나기 전에 묻습니다.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function run(label, task) {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      if (needsReauth(error)) {
        setReauth(label);
        say(`${REASON_TEXT.auth} ${draftSaveFailed ? '브라우저 저장 공간이 가득 차 초안도 저장하지 못했습니다. 창을 닫지 마세요.' : '코드는 이 브라우저에 초안으로 남아 있습니다.'} "다시 승인"을 누르면 이어서 진행합니다.`, 'warn');
      } else {
        pendingRef.current = null;
        say(`${label} 실패: ${describeError(error)}`, 'error');
      }
    } finally {
      setBusy(false);
      refreshOrigins();
    }
  }

  function resetWorkspace() {
    setFiles([]);
    setCurrent(null);
    setCode(STARTER);
    setConflict(null);
    setOverwritten(null);
    setRevisions([]);
    setDraftNotice(null);
    setTruncated(false);
    pendingRef.current = null;
  }

  /** 로그인 전에 쓴 새 코드 초안을 로그인한 계정의 초안으로 옮깁니다. 초안 이름이 서로 달라 기존 초안을 덮어쓰지 않습니다. */
  function adoptAnonDrafts(sub) {
    for (const { fileId, draft } of listDrafts(sessionStore, 'anon')) {
      saveDraft(storage, sub, fileId, draft);
      clearDraft(sessionStore, 'anon', fileId);
    }
  }

  /**
   * mode: first(계정 선택 창) · reauth(같은 계정으로 다시 승인) · consent(권한 다시 묻기)
   * 승인 요청은 await 없이 클릭 처리 안에서 바로 보냅니다.
   */
  function signIn(mode = 'first', retry) {
    const auth = authRef.current;
    if (!auth) {
      say(gisState === 'error' ? '구글 로그인 스크립트를 불러오지 못했습니다. 새로 고침해 보세요.' : '구글 로그인을 준비하고 있습니다. 잠시 뒤 다시 누르세요.', 'warn');
      return Promise.resolve();
    }
    const hint = mode === 'first' ? '' : account?.email || '';
    const prompt = mode === 'first' ? 'select_account' : mode === 'consent' ? 'consent' : '';
    const tokenPromise = auth.request({ prompt, loginHint: hint });
    return run('로그인', async () => {
      const token = await tokenPromise;
      const missing = missingScopes(token.scope);
      setTokenInfo({ expiresAt: token.expiresAt, missing });
      setReauth(null);
      const info = await fetchUserInfo(token.accessToken);
      if (account && account.sub !== info.sub) {
        // 공용 PC에서 다른 학생 계정이 승인된 경우: 앞 학생의 화면을 보이지 않게 비웁니다.
        resetWorkspace();
        setShowGoogleLogout(false);
        setAccount({ email: info.email, hd: info.hd || null, sub: info.sub });
        say(`다른 계정(${info.email})으로 바뀌어 화면을 비웠습니다. 앞 계정의 초안은 그 계정으로 로그인해야 보입니다.`, 'warn');
        if (!missing.length) await loadFiles();
        return;
      }
      setAccount({ email: info.email, hd: info.hd || null, sub: info.sub });
      setShowGoogleLogout(false);
      if (!account) {
        adoptAnonDrafts(info.sub);
        // 지난번에 파일로 만들지 못한 새 코드가 있으면 알려 줍니다(탭이 닫히거나 PC가 다시 켜진 경우).
        if (!currentRef.current) setDraftNotice(latestOtherNewDraft(storage, info.sub, newKey, codeRef.current));
        setDraftsTick((t) => t + 1);
      }
      if (missing.length) {
        say('드라이브 권한이 빠졌습니다. "드라이브 권한 다시 요청"을 눌러 드라이브 항목을 허용하세요.', 'warn');
        return;
      }
      say(`${info.email}(으)로 승인되었습니다.`, 'ok');
      await loadFiles();
      if (retry) await retry();
    });
  }

  async function loadFiles() {
    const result = await driveRef.current.list();
    setFiles(result.files);
    setTruncated(result.truncated);
  }

  /**
   * 파일을 열 때 안내할 초안: 그 파일의 초안 가운데 드라이브 내용과 다른 가장 최근 것.
   * 드라이브와 같아진 초안은 정리합니다. 이 탭의 초안이면 편집으로 덮이지 않게 별도 이름으로 옮겨 둡니다.
   */
  function pendingFileDraft(fileId, remote) {
    const drafts = fileDrafts(storage, scope, fileId);
    for (const { fileId: key, draft } of drafts) if (draft.code === remote) clearDraft(storage, scope, key);
    const latest = drafts.find(({ draft }) => draft.code !== remote);
    if (!latest) return null;
    if (latest.fileId !== ownDraftKey(fileId)) return { ...latest.draft, fileId: latest.fileId };
    const samePending = drafts.find((d) => d.fileId.startsWith(`${fileId}@pending-`) && d.draft.code === latest.draft.code);
    if (samePending) {
      clearDraft(storage, scope, latest.fileId);
      return { ...samePending.draft, fileId: samePending.fileId };
    }
    const pendingKey = `${fileId}@pending-${newTabId()}`;
    saveDraft(storage, scope, pendingKey, latest.draft);
    clearDraft(storage, scope, latest.fileId);
    return { ...latest.draft, fileId: pendingKey };
  }

  /** 파일을 엽니다. 실제로 열었으면 true, 취소하거나 실패하면 false를 돌려줍니다. */
  async function openFile(file) {
    if (dirty && !window.confirm('저장하지 않은 변경이 있습니다. 초안은 이 브라우저에 남습니다. 다른 파일을 열까요?')) return false;
    let opened = false;
    await run('열기', async () => {
      const { meta, code: remote } = await driveRef.current.open(file.id);
      setCurrent({ id: meta.id, name: meta.name, version: meta.version, savedCode: remote, appProperties: meta.appProperties || {} });
      setCode(remote);
      setConflict(null);
      setOverwritten(null);
      setRevisions([]);
      setDraftNotice(pendingFileDraft(meta.id, remote));
      say(`${meta.name}을(를) 열었습니다. 드라이브 버전 ${meta.version}, 마지막 저장 기기 ${meta.appProperties?.vpylabDevice || '알 수 없음'}`, 'ok');
      opened = true;
    });
    setDraftsTick((t) => t + 1);
    return opened;
  }

  async function createFile() {
    const codeToSave = codeRef.current;
    pendingRef.current = () => createFile();
    await run('새 파일', async () => {
      const meta = await driveRef.current.create({ name: newName, code: codeToSave, deviceId: device });
      pendingRef.current = null;
      setCurrent({ id: meta.id, name: meta.name, version: meta.version, savedCode: codeToSave });
      clearDraft(storage, scope, newKey);
      clearDraft(sessionStore, 'anon', newKey);
      setDraftNotice(null);
      await loadFiles();
      say(`${meta.name}을(를) 드라이브 VPyLab 폴더에 만들었습니다.`, 'ok');
    });
  }

  async function saveFile({ force = false, expectVersion = null } = {}) {
    const target = currentRef.current;
    if (!target) return;
    const codeToSave = codeRef.current;
    const attemptedCodes = target.attemptedCodes || [];
    // 이 시도가 시간 초과로 끝나 결과를 모르더라도, 다음 저장이 이 내용을 내 것으로 알아보게 기록합니다.
    const withThisAttempt = [...attemptedCodes, codeToSave].slice(-3);
    currentRef.current = { ...target, attemptedCodes: withThisAttempt };
    setCurrent((c) => (c && c.id === target.id ? { ...c, attemptedCodes: withThisAttempt } : c));
    pendingRef.current = () => saveFile({ force, expectVersion });
    await run('저장', async () => {
      const result = await driveRef.current.save({
        id: target.id, code: codeToSave, baseVersion: target.version, baseCode: target.savedCode ?? undefined, attemptedCodes, deviceId: device, force, expectVersion,
      });
      pendingRef.current = null;
      if (result.status === 'conflict') {
        setConflict(result.remote);
        say(`다른 기기가 먼저 저장했습니다(드라이브 버전 ${result.remote.meta.version}, 기기 ${deviceOf(result.remote.meta)}). 어느 쪽을 남길지 고르세요.`, 'warn');
        return;
      }
      setCurrent((c) => (c && c.id === target.id ? { ...c, version: result.meta.version, savedCode: codeToSave, attemptedCodes: [], appProperties: result.meta.appProperties || c.appProperties } : c));
      setConflict(null);
      if (result.overwritten) {
        setOverwritten({ fileId: target.id, fileName: target.name, revisionId: result.overwritten.revisionId });
        say('저장했지만, 바로 직전에 다른 기기가 저장한 내용을 덮어썼습니다. 그 내용은 아래 버튼으로 사본 파일로 되살릴 수 있습니다.', 'warn');
        return;
      }
      say(result.status === 'unchanged' ? '드라이브 내용과 같아서 저장하지 않았습니다.' : `저장했습니다. 드라이브 버전 ${result.meta.version}`, 'ok');
    });
  }

  /**
   * 초안을 편집기로 불러옵니다. 초안이 시작한 버전 뒤에 다른 기기가 저장했다면 바로 충돌 화면으로 보냅니다.
   * 충돌 화면이 열려 있는 동안 "저장"은 막혀 있어, 고르지 않고 덮어쓸 수 없습니다.
   */
  function restoreDraft() {
    const draft = draftNotice;
    const target = draft.fileId.startsWith('new-') ? null : draft.fileId.split('@')[0];
    if ((target || null) !== (current?.id || null)) {
      setDraftNotice(null);
      say('이 초안은 지금 편집기의 파일 것이 아니어서 불러오지 않았습니다. 초안 목록에서 다시 고르세요.', 'warn');
      return;
    }
    setDraftNotice(null);
    setCode(draft.code);
    // 안내한 초안은 편집기로 옮겨져 이 탭의 초안이 되므로 원래 이름의 것은 지웁니다.
    clearDraft(draftStore, scope, draft.fileId);
    setDraftsTick((t) => t + 1);
    if (!current || draft.baseVersion == null || String(draft.baseVersion) === String(current.version)) return;
    setConflict({ meta: { version: current.version, appProperties: current.appProperties || {} }, code: current.savedCode });
    setCurrent((c) => ({ ...c, version: String(draft.baseVersion), savedCode: null }));
    say(`이 초안은 드라이브 버전 ${draft.baseVersion}에서 시작했는데, 그 뒤 다른 곳에서 저장했습니다(현재 버전 ${current.version}, 기기 ${deviceOf(current)}). 어느 쪽을 남길지 고르세요.`, 'warn');
  }

  function keepRemote() {
    if (!window.confirm('내 변경을 버리고 드라이브의 내용을 불러옵니다. 계속할까요?')) return;
    setCurrent((c) => ({ ...c, version: conflict.meta.version, savedCode: conflict.code }));
    setCode(conflict.code);
    setConflict(null);
    say('드라이브의 내용을 불러왔습니다. 내 변경은 버렸습니다.', 'info');
  }

  async function saveAsCopy() {
    const mine = code;
    const original = current;
    await run('사본 저장', async () => {
      const meta = await driveRef.current.create({ name: `${original.name.replace(/\.py$/, '')} (충돌 사본 ${device})`, code: mine, deviceId: device });
      setConflict(null);
      clearDraft(storage, scope, ownDraftKey(original.id)); // 원래 파일의 이 탭 초안은 사본에 담겼습니다.
      setCurrent({ id: meta.id, name: meta.name, version: meta.version, savedCode: mine });
      await loadFiles();
      say(`내 코드를 ${meta.name}(으)로 따로 저장했습니다. 편집기는 이제 이 사본을 편집합니다.`, 'ok');
    });
  }

  async function recoverOverwritten() {
    const info = overwritten;
    await run('덮어쓴 버전 되살리기', async () => {
      const text = await driveRef.current.revisionContent(info.fileId, info.revisionId);
      const meta = await driveRef.current.create({ name: `${info.fileName.replace(/\.py$/, '')} (덮어쓴 버전)`, code: text, deviceId: device });
      setOverwritten(null);
      await loadFiles();
      say(`덮어쓴 내용을 ${meta.name}(으)로 되살렸습니다.`, 'ok');
    });
  }

  async function loadRevisions() {
    await run('버전 기록', async () => {
      setRevisions(await driveRef.current.revisions(current.id));
    });
  }

  async function restoreRevision(revision) {
    await run('이전 버전 불러오기', async () => {
      const text = await driveRef.current.revisionContent(current.id, revision.id);
      setCode(text);
      say(`${new Date(revision.modifiedTime).toLocaleString()} 버전을 편집기에 불러왔습니다. 저장해야 드라이브에 반영됩니다.`, 'info');
    });
  }

  async function trashFile(file) {
    if (!window.confirm(`${file.name}을(를) 드라이브 휴지통으로 옮길까요? 휴지통에서 복원할 수 있습니다.`)) return;
    await run('휴지통으로 이동', async () => {
      await driveRef.current.trash(file.id);
      if (current?.id === file.id) { setCurrent(null); setCode(STARTER); }
      if (draftNotice && !draftNotice.fileId.startsWith('new-') && draftNotice.fileId.split('@')[0] === file.id) setDraftNotice(null);
      clearFileDrafts(storage, scope, file.id);
      setDraftsTick((t) => t + 1);
      await loadFiles();
      say(`${file.name}을(를) 휴지통으로 옮겼습니다.`, 'ok');
    });
  }

  async function runBurst() {
    const total = Math.max(1, Math.min(100, Number(burstCount) || 30));
    await run('연속 저장', async () => {
      const drive = driveRef.current;
      const existing = (await drive.list()).files.find((f) => f.name === `${BURST_FILE}.py`);
      let meta = existing || await drive.create({ name: BURST_FILE, code: '# 연속 저장 실험\n', deviceId: device });
      const times = [];
      let errors = 0;
      let lastError = '';
      for (let i = 1; i <= total; i += 1) {
        const started = performance.now();
        try {
          const result = await drive.save({ id: meta.id, code: `# 연속 저장 실험 ${i}/${total} · ${device}\n`, baseVersion: meta.version, deviceId: device });
          if (result.status === 'conflict') { meta = result.remote.meta; errors += 1; lastError = '충돌'; }
          else meta = result.meta;
        } catch (error) {
          if (needsReauth(error)) throw error;
          errors += 1;
          lastError = describeError(error);
        }
        times.push(Math.round(performance.now() - started));
        setBurst({ total, done: i, avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length), max: Math.max(...times), errors, lastError });
      }
      await loadFiles();
      say(`연속 저장 ${total}회를 마쳤습니다. 오류 ${errors}회`, errors ? 'warn' : 'ok');
    });
  }

  async function signOut({ revoke }) {
    const clearLocal = window.confirm('이 브라우저에 남은 이 계정의 초안도 지울까요? 공용 컴퓨터라면 지우는 것이 안전합니다.');
    if (revoke) await authRef.current?.revoke();
    else authRef.current?.forget();
    const removed = clearLocal ? clearDrafts(storage, scope) : 0;
    setAccount(null);
    setTokenInfo(null);
    resetWorkspace();
    setShowGoogleLogout(true);
    const tail = clearLocal ? ` 초안 ${removed}개를 지웠습니다.` : '';
    say(`${revoke ? '구글에 권한 철회를 요청했습니다.' : '로그아웃했습니다.'}${tail} 공용 컴퓨터에서는 구글 계정에서도 로그아웃하세요.`, 'info');
  }

  const remaining = tokenInfo ? tokenInfo.expiresAt - now : 0;
  const timings = useMemo(() => summarizeTimings(requests), [requests]);
  const report = useMemo(() => buildReport({
    results, account, device, origins, timings, burst, userAgent: navigator.userAgent,
  }), [results, account, device, origins, timings, burst]);
  const otherOrigins = origins.filter((o) => o.kind === 'other');
  const noticeKey = draftNotice?.fileId;
  // 초안 목록은 초안을 바꾸는 동작(draftsTick)이나 계정·파일이 바뀔 때만 다시 읽습니다(1초 타이머로 다시 그릴 때는 읽지 않음).
  const otherDrafts = useMemo(
    () => listDrafts(draftStore, scope).filter(({ fileId }) => fileId !== ownKey && fileId !== noticeKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draftStore, scope, ownKey, noticeKey, draftsTick, account, files],
  );

  /** 초안 목록에서 고른 초안을 안내 배너로 올립니다. 다른 파일의 초안이면 그 파일을 먼저 엽니다. */
  async function pickDraft({ fileId, draft }) {
    const targetFile = fileId.startsWith('new-') ? null : fileId.split('@')[0];
    if (!targetFile) {
      if (current) { say('새 코드 초안은 파일을 닫은 새 코드 화면에서 불러옵니다. 편집기를 새 코드로 바꾼 뒤 다시 누르세요.', 'info'); return; }
      setDraftNotice({ ...draft, fileId });
      return;
    }
    if (current?.id !== targetFile) {
      const file = files.find((f) => f.id === targetFile);
      if (!file) { say('이 초안의 파일이 목록에 없습니다. 휴지통으로 옮겨졌을 수 있습니다.', 'warn'); return; }
      // 열기를 취소하거나 실패하면 지금 열린 다른 파일에 이 초안을 안내하지 않습니다.
      if (!(await openFile(file))) return;
    }
    setDraftNotice({ ...draft, fileId });
  }

  function discardDraft(fileId) {
    clearDraft(draftStore, scope, fileId);
    setDraftsTick((t) => t + 1);
  }

  function newCode() {
    if (dirty && !window.confirm('저장하지 않은 변경이 있습니다. 초안은 이 브라우저에 남습니다. 새 코드로 바꿀까요?')) return;
    setCurrent(null);
    setCode(STARTER);
    setConflict(null);
    setOverwritten(null);
    setRevisions([]);
    setDraftNotice(null);
  }
  const signedIn = Boolean(account);
  const ready = gisState === 'ready';

  function setResult(id, patch) {
    setResults((r) => ({ ...r, [id]: { ...(r[id] || {}), ...patch } }));
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      say('클립보드에 복사하지 못했습니다. 보고서 칸을 직접 선택해 복사하세요.', 'warn');
    }
  }

  return (
    <div className="lab">
      <header className="lab-head">
        <div>
          <p className="eyebrow">VPyLab 실험</p>
          <h1>구글 드라이브 저장 실험</h1>
          <p className="lead">서버와 DB 없이 학생 본인의 구글 드라이브에 코드를 저장합니다. 이 페이지는 구글 API와만 통신합니다.</p>
        </div>
        <div className="who">
          <span className="device">이 브라우저: {device}</span>
          {signedIn && <strong className="account" aria-label="로그인한 계정">{account.email}</strong>}
        </div>
      </header>

      <p className={`status status-${message.tone}`} role="status" aria-live="polite">{message.text}</p>

      {reauth && (
        <div className="banner">
          <span>{reauth} 중 권한이 필요합니다.</span>
          <button className="btn primary" disabled={busy} onClick={() => signIn('reauth', pendingRef.current || undefined)}>다시 승인</button>
        </div>
      )}

      {overwritten && (
        <div className="banner">
          <span>다른 기기가 저장한 내용을 덮어썼습니다. 그 내용은 드라이브 버전 기록에 남아 있습니다.</span>
          <button className="btn primary" disabled={busy} onClick={recoverOverwritten}>덮어쓴 버전을 사본으로 되살리기</button>
          <button className="btn" onClick={() => setOverwritten(null)}>닫기</button>
        </div>
      )}

      <div className="grid">
        <section className="card" aria-labelledby="sec-setup">
          <h2 id="sec-setup">1. 연결</h2>
          {ENV_CLIENT_ID && <p className="hint">클라이언트 ID는 배포 설정(VITE_GOOGLE_CLIENT_ID)에서 읽었습니다.</p>}
          {ALLOW_CLIENT_ID_INPUT && (
            <label className="field">
              <span>OAuth 클라이언트 ID (개발용)</span>
              <input value={clientId} onChange={(e) => { setClientId(e.target.value); setGisState('idle'); }} placeholder="123456-abc.apps.googleusercontent.com" spellCheck={false} />
            </label>
          )}
          {ALLOW_CLIENT_ID_INPUT && clientId && !CLIENT_ID_PATTERN.test(clientId.trim()) && (
            <p className="hint warn-text">클라이언트 ID 형식이 아닙니다. "숫자-문자.apps.googleusercontent.com" 형태여야 합니다.</p>
          )}
          <p className="hint">구글 클라우드 콘솔의 "승인된 JavaScript 원본"에 <code>{window.location.origin}</code>이 등록되어 있어야 합니다.</p>
          <div className="row">
            {!signedIn && <button className="btn primary" disabled={busy || !ready} onClick={() => signIn('first')}>{ready ? '구글 로그인·드라이브 승인' : '구글 로그인 준비 중'}</button>}
            {signedIn && tokenInfo?.missing?.length > 0 && <button className="btn primary" disabled={busy} onClick={() => signIn('consent')}>드라이브 권한 다시 요청</button>}
            {signedIn && remaining > 0 && remaining < EXTEND_WINDOW_MS && <button className="btn primary" disabled={busy} onClick={() => signIn('reauth')}>승인 연장</button>}
          </div>
          {showGoogleLogout && (
            <p className="hint">공용 컴퓨터라면 <a href={GOOGLE_LOGOUT_URL} target="_blank" rel="noopener noreferrer">구글 계정에서도 로그아웃</a>하세요. 그러지 않으면 다음 사람이 계정 선택 창에서 이 계정을 고를 수 있습니다.</p>
          )}
          {signedIn && (
            <dl className="facts">
              <div><dt>학교 도메인</dt><dd>{account.hd || '없음(개인 계정)'}</dd></div>
              <div><dt>토큰 남은 시간</dt><dd className={remaining < EXTEND_WINDOW_MS ? 'warn-text' : ''}>{formatRemaining(remaining)}</dd></div>
              <div><dt>빠진 권한</dt><dd>{tokenInfo?.missing?.length ? tokenInfo.missing.join(', ') : '없음'}</dd></div>
            </dl>
          )}
          {signedIn && (
            <div className="row">
              <button className="btn" disabled={busy} onClick={() => { authRef.current.expireNow(); setTokenInfo((t) => ({ ...t, expiresAt: Date.now() - 1 })); say('토큰을 만료 상태로 바꿨습니다. 이제 저장해 보세요.', 'info'); }}>만료 흉내</button>
              <button className="btn" disabled={busy} onClick={() => { authRef.current.corrupt(); say('토큰 값을 망가뜨렸습니다. 다음 요청에서 구글이 401을 돌려줍니다.', 'info'); }}>401 흉내</button>
              <button className="btn" disabled={busy} onClick={() => signOut({ revoke: false })}>로그아웃</button>
              <button className="btn danger" disabled={busy} onClick={() => signOut({ revoke: true })}>권한 철회</button>
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="sec-files">
          <h2 id="sec-files">2. 드라이브 VPyLab 폴더</h2>
          <div className="row">
            <button className="btn" disabled={!signedIn || busy} onClick={() => run('목록', loadFiles)}>목록 새로 고침</button>
          </div>
          {truncated && <p className="hint warn-text">파일이 1,000개를 넘어 최근에 고친 1,000개만 표시합니다.</p>}
          {files.length === 0 ? <p className="hint">{signedIn ? '이 앱으로 만든 파일이 없습니다.' : '로그인하면 이 앱으로 만든 파일만 보입니다.'}</p> : (
            <ul className="files">
              {files.map((f) => (
                <li key={f.id} className={current?.id === f.id ? 'active' : ''}>
                  <button className="link" onClick={() => openFile(f)} disabled={busy}>{f.name}</button>
                  <span className="meta">v{f.version} · {new Date(f.modifiedTime).toLocaleString()} · {f.appProperties?.vpylabDevice || '-'}</span>
                  <button className="btn small danger" onClick={() => trashFile(f)} disabled={busy} aria-label={`${f.name} 휴지통으로`}>휴지통</button>
                </li>
              ))}
            </ul>
          )}
          <div className="row">
            <input className="grow" value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="새 파일 이름" />
            <button className="btn" disabled={!signedIn || busy} onClick={createFile}>편집기 내용으로 새 파일</button>
          </div>
        </section>
      </div>

      <section className="card" aria-labelledby="sec-editor">
        <div className="card-head">
          <h2 id="sec-editor">3. 편집기 {current ? `· ${current.name}` : '· 새 코드'}</h2>
          <span className="meta">{current ? `기준 버전 ${current.version}` : '드라이브에 아직 없음'}{dirty ? ' · 저장 안 됨' : ''}</span>
        </div>
        {draftNotice && (
          <div className="banner">
            <span>이 브라우저에 저장하지 못한 초안이 있습니다: <strong>{draftNotice.name || '새 코드'}</strong> ({new Date(draftNotice.at).toLocaleString()})</span>
            <button className="btn" onClick={restoreDraft}>초안 불러오기</button>
            <button className="btn" onClick={() => { clearDraft(draftStore, scope, draftNotice.fileId); setDraftNotice(null); }}>초안 버리기</button>
          </div>
        )}
        {otherDrafts.length > 0 && (
          <details className="drafts">
            <summary>이 브라우저에 남은 다른 초안 {otherDrafts.length}개</summary>
            <p className="hint">저장하지 못한 코드입니다. 14일이 지나면 자동으로 지워집니다.</p>
            <ul>
              {otherDrafts.map((entry) => (
                <li key={entry.fileId}>
                  <span>{entry.draft.name || '새 코드'} · {entry.draft.at ? new Date(entry.draft.at).toLocaleString() : ''}</span>
                  <button className="btn small" disabled={busy} onClick={() => pickDraft(entry)}>살펴보기</button>
                  <button className="btn small danger" onClick={() => discardDraft(entry.fileId)} aria-label={`${entry.draft.name || '새 코드'} 초안 버리기`}>버리기</button>
                </li>
              ))}
            </ul>
          </details>
        )}
        {draftSaveFailed && (
          <p className="status status-error" role="alert">브라우저 저장 공간이 가득 차 초안을 저장하지 못했습니다. 드라이브에 저장하기 전에는 창을 닫지 마세요. 초안 목록에서 필요 없는 초안을 버리면 공간이 생깁니다.</p>
        )}
        <textarea className="code" value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} aria-label="코드" rows={10} />
        <div className="row">
          <button className="btn primary" disabled={!current || busy || Boolean(conflict)} onClick={() => saveFile()}>저장</button>
          <button className="btn" disabled={!current || busy} onClick={loadRevisions}>버전 기록</button>
          <button className="btn" disabled={!current || busy} onClick={newCode}>새 코드</button>
        </div>
        {conflict && (
          <div className="conflict">
            <h3>충돌: 드라이브에 더 새로운 내용이 있습니다</h3>
            <div className="two">
              <label><span>내 코드</span><textarea readOnly value={code} rows={6} /></label>
              <label><span>드라이브 코드 (버전 {conflict.meta.version} · 기기 {deviceOf(conflict.meta)})</span><textarea readOnly value={conflict.code} rows={6} /></label>
            </div>
            <div className="row">
              <button className="btn" onClick={saveAsCopy} disabled={busy}>내 코드를 사본으로 저장</button>
              <button className="btn" onClick={keepRemote} disabled={busy}>드라이브 내용 사용</button>
              <button className="btn danger" onClick={() => saveFile({ force: true, expectVersion: conflict.meta.version })} disabled={busy}>내 코드로 덮어쓰기</button>
            </div>
          </div>
        )}
        {revisions.length > 0 && (
          <ul className="revisions">
            {revisions.slice().reverse().map((r) => (
              <li key={r.id}>
                <span>{new Date(r.modifiedTime).toLocaleString()} · {r.size ? `${r.size}바이트` : ''} {r.lastModifyingUser?.displayName || ''}</span>
                <button className="btn small" onClick={() => restoreRevision(r)} disabled={busy}>불러오기</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid">
        <section className="card" aria-labelledby="sec-burst">
          <h2 id="sec-burst">4. 연속 저장 측정</h2>
          <p className="hint">"{BURST_FILE}.py" 파일에 차례로 저장합니다. 저장 1회는 버전 확인, 쓰기, 덮어쓰기 확인의 세 요청입니다.</p>
          <div className="row">
            <label className="inline">횟수 <input type="number" min={1} max={100} value={burstCount} onChange={(e) => setBurstCount(e.target.value)} /></label>
            <button className="btn" disabled={!signedIn || busy} onClick={runBurst}>연속 저장 시작</button>
          </div>
          {burst && <p className="meta">{burst.done}/{burst.total}회 · 평균 {burst.avg}ms · 최대 {burst.max}ms · 오류 {burst.errors}회 {burst.lastError && `(${burst.lastError})`}</p>}
          {timings && <p className="meta">드라이브 요청 전체: 성공 {timings.count}회 · 실패 {timings.errors}회 · 중앙값 {timings.p50}ms · 95% {timings.p95}ms</p>}
        </section>

        <section className="card" aria-labelledby="sec-origins">
          <h2 id="sec-origins">5. 연결된 출처</h2>
          <p className="hint">이 페이지가 요청을 보낸 주소입니다. 운영 서버나 DB 주소가 없어야 합니다.</p>
          <ul className="origins">
            {origins.map((o) => <li key={o.origin} className={`origin-${o.kind}`}><code>{o.origin}</code><span className="meta">{o.kind === 'page' ? '이 페이지' : o.kind === 'google' ? '구글' : '기타'} · {o.count}회</span></li>)}
          </ul>
          <p className={otherOrigins.length ? 'warn-text' : 'ok-text'}>{otherOrigins.length ? `구글이 아닌 출처 ${otherOrigins.length}곳이 있습니다.` : '구글과 이 페이지 외의 출처는 없습니다.'}</p>
          <button className="btn small" onClick={refreshOrigins}>다시 확인</button>
        </section>
      </div>

      <section className="card" aria-labelledby="sec-check">
        <h2 id="sec-check">6. 실험 체크리스트</h2>
        <ol className="checklist">
          {CHECKLIST.map((item) => (
            <li key={item.id}>
              <div className="check-title"><strong>{item.id}</strong> <span className="tag">{item.group}</span> {item.title}</div>
              <p className="hint">{item.how}</p>
              <div className="row">
                <select value={results[item.id]?.result || ''} onChange={(e) => setResult(item.id, { result: e.target.value })} aria-label={`${item.id} 결과`}>
                  {Object.entries(RESULT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input className="grow" value={results[item.id]?.note || ''} onChange={(e) => setResult(item.id, { note: e.target.value })} placeholder="관찰한 내용" aria-label={`${item.id} 메모`} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card" aria-labelledby="sec-report">
        <div className="card-head">
          <h2 id="sec-report">7. 보고서</h2>
          <button className="btn primary" onClick={copyReport}>{copied ? '복사했습니다' : '보고서 복사'}</button>
        </div>
        <p className="hint">이메일 대신 도메인만 적습니다. 복사해서 Claude에게 붙여 넣으면 결과를 정리합니다.</p>
        <textarea className="code" readOnly value={report} rows={12} aria-label="보고서" />
      </section>
    </div>
  );
}
