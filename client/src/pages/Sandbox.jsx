import { localizeLessonCode } from '../i18n/owned-content';
import { getDefaultCode } from '../data/default-code';
import { useUiText, getUiLocale } from "../i18n/ui-text";
import { readPracticeDraft, writePracticeDraft } from '../utils/practice-drafts';
import { clearSandboxDraft, readSandboxDraft, writeSandboxDraft } from '../utils/sandbox-draft';
import { CODE_FILE_REASON_TEXT, CodeFileError, codeFileBaseName, downloadPython, openInVpylabUrl, readCodeFile } from '../utils/code-file';
import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { Link, useSearchParams, useLocation, useParams } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';
import Header from '../components/layout/Header';
import CodeEditor, { DEFAULT_CODE } from '../components/editor/CodeEditor';
import SoundSettings from '../components/editor/SoundSettings';
import Viewport3D from '../components/viewport/Viewport3D';
import OutputConsole from '../components/console/OutputConsole';
import RuntimeStatus from '../components/shared/RuntimeStatus';
import useAudioState from '../hooks/useAudioState';
import usePyodide from '../hooks/usePyodide';
import { getStatus as getPythonStatus } from '../engine/pyodide-singleton';
import { processBatch, clearScene } from '../engine/vpython-bridge';
import { clearRegistry } from '../engine/object-registry';
import { runSound, errorSound, stopBgm, stopAllSounds, initAudioOnUserGesture, isAudioUnlocked, isTouchPlaybackEnvironment, resumeAndRun, openRecordingAudioStream } from '../engine/sound-system';
import { MAX_RECORDING_SECONDS, canRecordCanvas, startCanvasRecording, downloadRecording } from '../engine/video-recorder';
import { captureThumbnail } from '../engine/thumbnail';
import { createShareLink, decodeCodeFromURL, loadSharedCode, SHARE_RUN_VIEW } from '../utils/share';
import ShareLinkDialog from '../components/share/ShareLinkDialog';
import DriveDialog from '../components/drive/DriveDialog';
import VideoSaveDialog from '../components/drive/VideoSaveDialog';
import { DRIVE_CLIENT_ID, expiredDriveTabFile, storedDriveFileId, useDriveStore } from '../drive/driveSession';
import { GITHUB_ADDON } from '../lib/api-base.js';
import { storedGitHubProject } from '../github/tab-session.js';
import AddonBoundary from '../components/shared/AddonBoundary';
import { isViewportFullscreen } from '../hooks/useFullscreen';
// export-html은 큰 모듈이므로 사용 시점에 lazy import
import HomeSettingsDialog from '../components/home/HomeSettingsDialog';
import EXAMPLES, { EXAMPLE_CATEGORIES } from '../data/examples';
import { getLesson } from '../data/courses';
import { getTutorial } from '../data/tutorials';
import { getDocById } from '../data/docs';
import { getGlowscriptProject } from '../data/glowscript-projects';

// GitHub 팀 프로젝트 애드온. 설정된 배포에서만, 만들기 화면이 뜬 뒤에 따로 불러옵니다.
const GitHubAddon = GITHUB_ADDON ? lazy(() => import('../components/github/GitHubAddon.jsx')) : null;

const isStarterCode = (value) => !value || value === DEFAULT_CODE || value === getDefaultCode('en');

/**
 * Sandbox 페이지 — 자유 코딩 IDE
 * 3패널: 좌 에디터 | 우상 3D 뷰포트 | 우하 콘솔
 * 태블릿: 탭 전환 (에디터/3D 토글)
 */
/**
 * 저장 방식
 *   - 로그인 없이: 실행, 링크 공유, 파일 내려받기·열기, 이 브라우저의 초안.
 *   - 구글: 개인 코드는 학생 본인의 구글 드라이브에 저장합니다(구글 클라이언트 ID가 설정된 배포).
 *   - GitHub: 팀 프로젝트를 열었을 때만 저장이 GitHub 커밋이 됩니다(GITHUB_ADDON, components/github/GitHubAddon.jsx).
 */
const DRIVE_EDITOR = Boolean(DRIVE_CLIENT_ID);
/** 예제·공유 코드처럼 다른 출처의 코드를 불러오면 드라이브 파일 연결을 끊어, 다음 저장이 그 파일을 덮어쓰지 않게 합니다. */
/** GitHub 애드온이 준비되면 채웁니다({ open, hasProject, detach, isDirty }). 애드온이 없거나 불러오지 못하면 null입니다. */
const githubControl = { current: null };
/** 애드온이 준비되기 전에 다른 코드를 불러왔으면, 준비된 뒤 되살린 프로젝트 연결을 끊도록 표시해 둡니다. */
let githubDetachPending = false;
function detachGitHubSource() {
  if (!GITHUB_ADDON) return;
  if (githubControl.current) githubControl.current.detach();
  else githubDetachPending = true;
}
function detachDriveSource() {
  if (DRIVE_EDITOR) useDriveStore.getState().detach();
  detachGitHubSource();
}
/** 주소에 불러올 대상(공유·학습 자료·저장소 등)이 없는, 빈 만들기 화면으로 들어왔는지 */
function isPlainEntry(location, sharedRouteId) {
  return !sharedRouteId && !location.state && !location.search && !window.location.hash;
}

export default function Sandbox() {
  const ui = useUiText();
  const { t, locale } = useI18n();
  const tRef=useRef(t);
  useEffect(()=>{tRef.current=t;},[t]);
  const audio=useAudioState(),playEpoch=useRef(0),stopSourceRef=useRef(null);
  const [homePin,setHomePin]=useState(null);
  const lastStartedCode=useRef(null);
  const [code, setCode] = useState(() => getDefaultCode(locale));
  const [outputs, setOutputs] = useState([]);
  const [activeTab, setActiveTab] = useState('editor');
  const [mobileMore, setMobileMore] = useState(false);
  const toolsButtonRef = useRef(null);
  const fileInputRef = useRef(null);
  const [shareMsg, setShareMsg] = useState('');
  const [shareDialog, setShareDialog] = useState(null); // { url, id, title, code } | null
  const [driveDialog, setDriveDialog] = useState(null); // 'save' | 'files' | null
  const driveFile = useDriveStore((state) => state.file);
  const [githubProject, setGithubProject] = useState(null); // 애드온에서 연 팀 프로젝트 { fullName, title } | null
  const [githubFailed, setGithubFailed] = useState(false);
  const driveAccount = useDriveStore((state) => state.account);
  const [saveMsg, setSaveMsg] = useState('');
  const [showExamples, setShowExamples] = useState(false);
  const [exampleCategory, setExampleCategory] = useState('all');
  const [theaterMode, setTheaterMode] = useState(false);
  const theaterModeRef = useRef(false);
  useEffect(() => { theaterModeRef.current = theaterMode; }, [theaterMode]);
  const [recordingSeconds, setRecordingSeconds] = useState(null); // 녹화 중이면 지난 시간(초), 아니면 null
  const recordingRef = useRef(null);
  const [recordedVideo, setRecordedVideo] = useState(null); // 드라이브를 연결한 경우 저장 위치를 고를 영상 { blob, name, seconds }
  const [theaterWaiting, setTheaterWaiting] = useState(false); // 클릭 대기 중
  const [playStartRequired, setPlayStartRequired] = useState(false);
  const [repoLoadStatus, setRepoLoadStatus] = useState(null); // 'loading' | 'error' | null
  const sceneRef = useRef(null);
  const pendingBatchRef = useRef([]);  // 모바일: sceneRef 미 mount 시 버퍼
  const [searchParams] = useSearchParams();
  const location = useLocation();
  // 초기화 시 되돌릴 "원본 코드" — 예제/lesson 로드 시 갱신, 미설정 시 DEFAULT_CODE
  const initialCodeRef = useRef(getDefaultCode(locale));
  const codeRef = useRef(getDefaultCode(locale));
  const homeDraftTitle=useRef(null),consumedSharedSource=useRef(null);
  const practiceContextRef = useRef(null);
  const draftWriteFailedRef = useRef(false);
  const pendingPlayRef = useRef(null); // 자동 실행할 코드
  const loadedRepoParamRef = useRef(null);
  const repoParam = searchParams.get('repo');
  const repoAutorun = searchParams.get('autorun') === '1';
  const runViewParam = searchParams.get('view') === SHARE_RUN_VIEW;
  const showcaseProject = getGlowscriptProject(searchParams.get('showcase'));
  const tutorial = getTutorial(searchParams.get('tutorial'), searchParams.get('step'));
  const referenceDoc = getDocById(searchParams.get('doc'));
  const lessonPath = searchParams.get('lesson');
  const lessonParts = (lessonPath || '').split('/');
  const sourceLesson = lessonParts.length === 2 ? getLesson(lessonParts[0], lessonParts[1]) : null;
  const workbookLesson = sourceLesson;

  const updateCode = useCallback((nextCode) => {
    const value = typeof nextCode === 'function' ? nextCode(codeRef.current) : nextCode;
    const normalized = value || '';
    codeRef.current = normalized;
    if (practiceContextRef.current) {
      draftWriteFailedRef.current = !writePracticeDraft(practiceContextRef.current, normalized, initialCodeRef.current);
    }
    setCode(normalized);
  }, []);

  const loadPracticeCode = useCallback((source, context) => {
    practiceContextRef.current = context;
    homeDraftTitle.current=null; detachDriveSource(); initialCodeRef.current = source;
    const draft = readPracticeDraft(context);
    updateCode(draft ?? source);
  }, [updateCode]);

  useEffect(() => {
    const warn = event => {
      if (!draftWriteFailedRef.current || codeRef.current === initialCodeRef.current) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // 드라이브에 반영되지 않은 편집을 이 브라우저에 초안으로 남기고(계정별), 떠나기 전에 묻습니다.
  useEffect(() => {
    if (!DRIVE_EDITOR || !driveAccount) return undefined;
    const drive = useDriveStore.getState();
    if (!drive.file && code === initialCodeRef.current) return undefined;
    const timer = setTimeout(() => useDriveStore.getState().rememberDraft(code), 800);
    return () => clearTimeout(timer);
  }, [code, driveAccount, driveFile]);
  useEffect(() => {
    if (!DRIVE_EDITOR) return undefined;
    const warn = (event) => {
      const drive = useDriveStore.getState();
      // 드라이브 파일의 변경, 또는 로그인한 뒤 아직 파일로 만들지 않은 새 코드가 있으면 묻습니다.
      const unsavedNew = drive.account && !drive.file && codeRef.current !== initialCodeRef.current;
      if (!drive.isDirty(codeRef.current) && !unsavedNew) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  // /s/:id 주소로 열면 공유 코드를 직접 불러옵니다. 주소창은 /s/이름 그대로 둡니다.
  const { id: sharedRouteId } = useParams();
  const loadedSharedRouteId = useRef(null);

  // 자유 코딩 초안 되살리기: 빈 만들기 화면으로 들어왔고 이 브라우저에 남은 코드가 있으면 이어서 엽니다.
  // 새로 고침 전에 드라이브 파일을 열어 두었으면 아래의 드라이브 연결 복구가 그 파일을 엽니다.
  const entryHandled = useRef(false);
  // 익명 자유 코딩 초안에서만 사용하는 기준 코드(로그아웃·연결 해제 직후의 코드). 이 코드와 같으면 초안을 남기지 않습니다.
  const sandboxBaselineRef = useRef(null);
  // 빈 만들기 화면으로 들어왔을 때만, 탭에 남은 팀 프로젝트를 편집기에 되살립니다.
  const githubRestoreAllowed = useRef(isPlainEntry(location, sharedRouteId));
  useEffect(() => {
    if (entryHandled.current) return;
    entryHandled.current = true;
    if (!isPlainEntry(location, sharedRouteId)) return;
    if (DRIVE_EDITOR && storedDriveFileId()) return;
    if (GITHUB_ADDON && storedGitHubProject()) return;
    const draft = readSandboxDraft();
    if (!draft || isStarterCode(draft)) return;
    updateCode(draft);
    setOutputs([{ text: ui("이 브라우저에 남아 있던 코드를 이어서 열었습니다. 새로 시작하려면 도구 메뉴의 \"초기 코드로 돌아가기\"를 누르십시오."), type: 'log', id: Date.now() }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 자유 코딩 초안 남기기: 불러온 원본에서 달라진 코드만 이 브라우저에 남깁니다(탭을 닫아도 이어서 할 수 있게).
  // 학습 자료의 연습 코드(탭 단위 보관), 드라이브 파일, 팀 프로젝트는 각자의 저장 방식을 따릅니다.
  useEffect(() => {
    // 구글 드라이브에 로그인한 동안에는 계정별 드라이브 초안(driveSession.rememberDraft)이 맡습니다. 공용 컴퓨터에서 로그아웃한 뒤 코드가 남지 않게 합니다.
    if (practiceContextRef.current || driveFile || driveAccount || githubProject) return undefined;
    const timer = setTimeout(() => {
      if (codeRef.current !== code) return;
      if (code === initialCodeRef.current) { if (isStarterCode(code)) clearSandboxDraft(); return; }
      // 로그아웃·연결 해제 직후의 코드는 남기지 않습니다(아래 sandboxBaselineRef). 그 뒤에 고친 내용부터 남깁니다.
      if (code === sandboxBaselineRef.current) return;
      sandboxBaselineRef.current = null;
      writeSandboxDraft(code);
    }, 800);
    return () => clearTimeout(timer);
  }, [code, driveFile, driveAccount, githubProject]);
  // 드라이브(로그인·파일)나 팀 프로젝트로 옮겨 가면 그 전의 자유 코딩 초안은 지웁니다(다음에 열 때 옛 코드가 나오지 않게).
  useEffect(() => {
    if (driveFile || driveAccount || githubProject) clearSandboxDraft();
  }, [driveFile, driveAccount, githubProject]);
  // 드라이브에서 로그아웃하거나 팀 프로젝트 연결을 끊은 직후의 코드는 이 브라우저에 익명 초안으로 남기지 않습니다.
  // 그 시점의 코드를 익명 초안 전용 기준(sandboxBaselineRef)으로 삼아, 그 뒤에 새로 고친 내용만 초안이 됩니다
  // (공용 컴퓨터에서 앞 학생의 코드가 넘어가지 않게). "초기 코드로 돌아가기"와 저장하지 않은 변경 판단의 기준(initialCodeRef)은 바꾸지 않습니다.
  const previousSources = useRef({ driveAccount: null, githubProject: null });
  useEffect(() => {
    const previous = previousSources.current;
    if ((previous.driveAccount && !driveAccount) || (previous.githubProject && !githubProject)) {
      clearSandboxDraft();
      sandboxBaselineRef.current = codeRef.current;
    }
    previousSources.current = { driveAccount, githubProject };
  }, [driveAccount, githubProject]);

  // 드라이브 연결 복구: 새로 고침한 뒤 이 탭에 남은 토큰으로 계정을 되살리고, 열어 두었던 파일을 다시 엽니다.
  const driveResumed = useRef(false);
  useEffect(() => {
    if (!DRIVE_EDITOR || driveResumed.current) return;
    driveResumed.current = true;
    const plain = isPlainEntry(location, sharedRouteId);
    (async () => {
      const drive = useDriveStore.getState();
      // 다른 화면에 다녀온 경우(새로 고침 아님)에는 스토어에 계정과 연 파일이 그대로 있습니다. 편집기는 새로 그려져 기본 코드이므로
      // 그 파일을 다시 읽어 넣습니다. 그대로 두면 "저장"이 기본 코드로 드라이브 파일을 덮어씁니다.
      const stillOpen = drive.account && drive.file ? drive.file.id : null;
      const expiredFile = !stillOpen && plain && expiredDriveTabFile();
      const resumed = stillOpen ? { status: 'resumed', fileId: stillOpen } : await drive.resume();
      if (resumed.status !== 'resumed') {
        // 드라이브 파일을 열어 둔 채 연결이 만료된 뒤 새로 고친 경우: 저장하지 않은 변경은 계정별 초안에 남아 있습니다.
        if (expiredFile) addOutput(ui("구글 드라이브 연결이 만료되어 열어 두었던 파일을 다시 열지 못했습니다. \"내 드라이브\"에서 로그인하고 파일을 열면 저장하지 않은 변경을 되살릴 수 있습니다."), 'warning');
        return;
      }
      if (!resumed.fileId) {
        // 계정만 되살아난 경우: 파일로 만들지 않은 새 코드의 초안이 있으면 이어서 엽니다.
        const draft = plain && codeRef.current === initialCodeRef.current ? useDriveStore.getState().latestNewDraft() : null;
        if (draft?.code && !isStarterCode(draft.code) && !(GITHUB_ADDON && storedGitHubProject())) {
          practiceContextRef.current = null;
          updateCode(draft.code);
          setOutputs([{ text: ui("저장하지 않은 코드를 이 브라우저의 초안에서 이어서 열었습니다. 새로 시작하려면 도구 메뉴의 \"초기 코드로 돌아가기\"를 누르십시오."), type: 'log', id: Date.now() }]);
        }
        return;
      }
      // 팀 프로젝트를 열어 두었던 탭이면 그 프로젝트를 되살리는 쪽이 우선입니다(드라이브 파일과 동시에 열지 않음).
      if (GITHUB_ADDON && storedGitHubProject()) { if (stillOpen) useDriveStore.getState().detach(); return; }
      // 다른 코드(공유 링크·학습 자료 등)로 들어온 화면은 그 코드를 불러올 때 파일 연결을 끊습니다. 편집을 시작했으면 덮어쓰지 않습니다.
      if (!plain || codeRef.current !== initialCodeRef.current) return;
      if (!stillOpen && useDriveStore.getState().file) return;
      const opened = await useDriveStore.getState().openFile(resumed.fileId);
      if (opened.status !== 'opened' || codeRef.current !== initialCodeRef.current) return;
      let next = opened.code;
      if (opened.draft) {
        // 새로 고침 직전까지 편집하던 내용을 되살립니다. 그사이 드라이브가 바뀌었으면 저장할 때 충돌로 알립니다.
        next = opened.draft.code;
        useDriveStore.getState().adoptDraft(opened.draft);
      }
      practiceContextRef.current = null;
      updateCode(next);
      homeDraftTitle.current = null; initialCodeRef.current = opened.code;
      setOutputs([{ text: opened.draft
        ? ui`구글 드라이브의 "${opened.name || ''}"을(를) 다시 열고, 저장하지 않은 변경을 이 브라우저의 초안에서 되살렸습니다.`
        : ui`구글 드라이브의 "${opened.name || ''}"을(를) 다시 열었습니다.`, type: 'log', id: Date.now() }]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!sharedRouteId || loadedSharedRouteId.current === sharedRouteId) return undefined;
    loadedSharedRouteId.current = sharedRouteId;
    let cancelled = false;
    loadSharedCode(sharedRouteId).then(({ code: sharedCode, title, error }) => {
      if (cancelled) return;
      if (error || !sharedCode) {
        setOutputs([{ text: tRef.current('sharedCode.notFound'), type: 'warning', id: Date.now() }]);
        return;
      }
      stopAllSounds(); stopSourceRef.current?.(); playEpoch.current++; pendingPlayRef.current=null;
      practiceContextRef.current = null;
      updateCode(sharedCode);
      homeDraftTitle.current=null; detachDriveSource(); initialCodeRef.current = sharedCode;
      if (title) document.title = `${title} · VPyLab`;
      // 극장 모드: 클릭 대기 → 클릭 시 오디오 잠금 해제 + 실행
      setTheaterMode(true);
      setTheaterWaiting(true);
    });
    return () => { cancelled = true; };
  }, [sharedRouteId, updateCode]);

  // 예전 방식(location.state로 넘어온 공유 코드) 로드
  useEffect(() => {
    if (location.state?.sharedCode) {
      if(consumedSharedSource.current===location.key)return;
      consumedSharedSource.current=location.key;
      stopAllSounds(); stopSourceRef.current?.(); playEpoch.current++; pendingPlayRef.current=null;
      updateCode(location.state.sharedCode);
      homeDraftTitle.current=null; detachDriveSource(); initialCodeRef.current = location.state.sharedCode;
      homeDraftTitle.current=location.state.homeDraft?String(location.state.sharedTitle||'').slice(0,80):null;
      if (location.state?.autoPlay) {
        // 극장 모드: 클릭 대기 → 클릭 시 오디오 잠금 해제 + 실행
        setTheaterMode(true);
        setTheaterWaiting(true);
      } else {
        setOutputs([{ text: location.state?.homeDraft ? ui("내 메인의 코드 사본을 열었습니다. 수정 후 다시 내 메인으로 설정해 주세요.") : tRef.current('share.externalCode'), type: 'warning', id: Date.now() }]);
      }
      // state 정리 (뒤로가기 시 다시 로드 방지)
      window.history.replaceState({}, '');
      return;
    }
    // GitHub 프로젝트 README/Pages에서 넘어온 링크: ?repo=owner/repo
    if (repoParam && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repoParam)) {
      const repoLoadKey = `${repoParam}:${repoAutorun ? 'autorun' : 'manual'}`;
      if (loadedRepoParamRef.current === repoLoadKey) return;
      loadedRepoParamRef.current = repoLoadKey;
      const [owner, repo] = repoParam.split('/');
      (async () => {
        stopAllSounds(); stopSourceRef.current?.(); playEpoch.current++; pendingPlayRef.current=null;
        setRepoLoadStatus('loading');
        pendingPlayRef.current = null;
        setOutputs([{ text: ui`${repoParam} 프로젝트 코드를 불러오는 중입니다.`, type: 'log', id: Date.now() }]);
        try {
          // HEAD는 저장소의 기본 브랜치입니다. 계정 설정에 따라 기본 브랜치가 main이 아닐 수 있습니다.
          const response = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/main.py`);
          if (!response.ok) throw new Error(ui`GitHub main.py 로드 실패 (${response.status})`);
          const repoCode = await response.text();
          updateCode(repoCode);
          homeDraftTitle.current=null; detachDriveSource(); initialCodeRef.current = repoCode;
          setRepoLoadStatus(null);
          if (repoAutorun) {
            pendingPlayRef.current = repoCode;
          }
          setOutputs([{ text: ui`${repoParam} 프로젝트 코드를 불러왔습니다.`, type: 'success', id: Date.now() }]);
        } catch (e) {
          pendingPlayRef.current = null;
          setRepoLoadStatus('error');
          setOutputs([{ text: e.message || ui("GitHub 프로젝트 코드를 불러오지 못했습니다."), type: 'error', id: Date.now() }]);
        }
      })();
      return;
    }
    // 기존 LZ-String URL 하위 호환
    const { code: shared, isExternal } = decodeCodeFromURL();
    if (shared) {
      if(consumedSharedSource.current===location.key)return;
      consumedSharedSource.current=location.key;
      updateCode(shared);
      homeDraftTitle.current=null; detachDriveSource(); initialCodeRef.current = shared;
      if (runViewParam) {
        // 공유 링크(?view=run): /s/ 짧은 주소처럼 실행 화면부터 보여 주고, 누르면 실행합니다.
        // 코드 보기로 돌아가면 아래 외부 코드 안내가 출력 창에 남아 있습니다.
        stopAllSounds(); stopSourceRef.current?.(); playEpoch.current++; pendingPlayRef.current=null;
        setTheaterMode(true);
        setTheaterWaiting(true);
      } else if (repoAutorun) {
        pendingPlayRef.current = shared;
      }
      if (isExternal) {
        setOutputs([{ text: location.state?.homeDraft ? ui("내 메인의 코드 사본을 열었습니다. 수정 후 다시 내 메인으로 설정해 주세요.") : tRef.current('share.externalCode'), type: 'warning', id: Date.now() }]);
      }
    }
  }, [location.state?.sharedCode, location.state?.sharedTitle, location.state?.autoPlay, location.state?.homeDraft, location.key, repoAutorun, repoParam, runViewParam, updateCode, ui]);

  useEffect(() => { initAudioOnUserGesture(); }, []);

  // 외부 코드(공유/예제/차시) 로드 시 열어 둔 드라이브 파일·팀 프로젝트와의 연결 해제
  useEffect(() => {
    if (!searchParams.get('tutorial') && !searchParams.get('lesson') && !searchParams.get('showcase') && !searchParams.get('doc')) practiceContextRef.current = null;
    const fromExternal =
      !!location.state?.sharedCode
      || !!searchParams.get('example')
      || !!searchParams.get('lesson')
      || !!searchParams.get('doc')
      || !!searchParams.get('tutorial')
      || !!searchParams.get('showcase')
      || !!repoParam
      || window.location.hash.startsWith('#code=')
      || window.location.hash.startsWith('#b64=')
      || !!sharedRouteId;
    if (fromExternal) {
      // 불러오기가 늦거나 실패해도, 열어 둔 드라이브 파일·팀 프로젝트에 다른 코드가 저장되지 않게 먼저 연결을 끊습니다.
      detachDriveSource();
    }
  }, [location.state, repoParam, searchParams, sharedRouteId]);

  useEffect(() => {
    if (!mobileMore) return;
    const close = event => { if (event.key === 'Escape') { setMobileMore(false); toolsButtonRef.current?.focus(); } };
    window.addEventListener('keydown',close);
    return () => window.removeEventListener('keydown',close);
  }, [mobileMore]);

  // Ctrl/Cmd+S → 저장
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        // 실행 화면만 보이는 동안에는 저장 창을 띄울 곳이 없으므로 단축키를 받지 않습니다.
        if (theaterModeRef.current) return;
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // handleSave는 codeRef를 사용하므로 code 변경마다 리스너를 재등록할 필요가 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // details: 파이썬 오류의 구조화 정보(입문자용 설명 포함). 콘솔이 설명을 먼저 보여 준다.
  const addOutput = useCallback((text, type = 'log', details) => {
    setOutputs((prev) => [...prev, { text, type, id: Date.now() + Math.random(), ...(details ? { details } : {}) }]);
  }, []);

  // Example 파라미터 처리 (?example=<id>) — 예제 코드를 에디터에 자동 로드
  useEffect(() => {
    const exampleId = searchParams.get('example');
    if (!exampleId) return;
    const ex = EXAMPLES.find(e => e.id === exampleId);
    if (ex) {
      // 다른 예제로 이동 시 이전 잔존음/실행 정리
      stopAllSounds();
      // softStop 직접 호출 (stopExecution은 아래에서 디스트럭처되므로 TDZ 회피)
      import('../engine/pyodide-singleton').then(m => m.softStop()).catch(() => {});
      if (sceneRef.current) clearScene(sceneRef.current);
      updateCode(ex.code);
      homeDraftTitle.current=null; detachDriveSource(); initialCodeRef.current = ex.code;  // 초기화 시 이 예제로 복귀
      addOutput(ui`예제 "${ui(ex.title)}" 로드됨. 실행 버튼을 눌러주세요.`, 'success');
    } else {
      addOutput(ui`예제 ID "${exampleId}"를 찾을 수 없습니다.`, 'error');
    }
  }, [searchParams, addOutput, updateCode, ui]);

  useEffect(() => {
    const id = searchParams.get('doc');
    if (!id) return;
    const item = getDocById(id);
    if (!item?.code) { addOutput(ui("실행할 문서 예제를 찾을 수 없습니다."), 'error'); return; }
    stopAllSounds();
    import('../engine/pyodide-singleton').then(m => m.softStop()).catch(() => {});
    if (sceneRef.current) clearScene(sceneRef.current);
    loadPracticeCode(item.code, `doc/${item.id}`);
    addOutput(ui`문서 예제 "${item.title[getUiLocale()]}" 준비됨. 실행 버튼을 눌러주세요.`, 'success');
  }, [searchParams, loadPracticeCode, addOutput, ui]);


  useEffect(() => {
    const tutorialId = searchParams.get('tutorial');
    if (!tutorialId) return;
    const item = getTutorial(tutorialId, searchParams.get('step'));
    if (!item) {
      addOutput(ui("튜토리얼을 찾을 수 없습니다."), 'error');
      return;
    }
    stopAllSounds();
    import('../engine/pyodide-singleton').then(m => m.softStop()).catch(() => {});
    if (sceneRef.current) clearScene(sceneRef.current);
    loadPracticeCode(item.code, `tutorial/${item.id}/${item.activeStep || 'base'}`);
    addOutput(ui`튜토리얼 "${item.title[getUiLocale()]}" 준비됨. 실행 버튼을 눌러주세요.`, 'success');
  }, [searchParams, addOutput, updateCode, loadPracticeCode, ui]);

  useEffect(() => {
    const showcaseId = searchParams.get('showcase');
    if (!showcaseId) return;
    const project = getGlowscriptProject(showcaseId);
    if (!project || project.pythonCheck !== 'ready') {
      addOutput(ui("이 프로젝트는 갤러리의 원본 링크에서 실행해주세요."), 'warning');
      return;
    }
    const controller = new AbortController();
    fetch(project.sourcePath, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('source-load-failed');
      return response.json();
    }).then(data => {
      if (controller.signal.aborted) return;
      stopAllSounds();
      import('../engine/pyodide-singleton').then(m => m.softStop()).catch(() => {});
      if (sceneRef.current) clearScene(sceneRef.current);
      loadPracticeCode(data.code, `showcase/${project.id}`);
      addOutput(ui`학생·참고 프로젝트 "${project.title}" 준비됨. 실행 버튼을 눌러주세요.`, 'success');
    }).catch(reason => {
      if (reason.name !== 'AbortError') addOutput(ui("작품 코드를 불러오지 못했습니다. 갤러리에서 원본을 확인해주세요."), 'error');
    });
    return () => controller.abort();
  }, [searchParams, addOutput, updateCode, loadPracticeCode, ui]);

  // Course lesson 파라미터 처리 (?lesson=<courseId>/<lessonId>) — 코스 차시 코드 prefill
  useEffect(() => {
    const lessonParam = searchParams.get('lesson');
    if (!lessonParam) return;
    const slash = lessonParam.indexOf('/');
    if (slash <= 0) {
      addOutput(ui`잘못된 lesson 파라미터: ${lessonParam} (형식: courseId/lessonId)`, 'error');
      return;
    }
    const cid = lessonParam.slice(0, slash);
    const lid = lessonParam.slice(slash + 1);
    const lesson = getLesson(cid, lid);
    if (lesson?.code) {
      // 다른 차시로 이동 시 이전 잔존음/실행 정리
      stopAllSounds();
      import('../engine/pyodide-singleton').then(m => m.softStop()).catch(() => {});
      if (sceneRef.current) clearScene(sceneRef.current);
      loadPracticeCode(localizeLessonCode(cid, lesson.code, getUiLocale()), `lesson/${lessonParam}`);  // 초기화 시 이 차시로 복귀
      addOutput(ui`코스 차시 "${lesson.title?.[getUiLocale()] || lid}" 로드됨. 실행 버튼을 눌러주세요.`, 'success');
    } else {
      addOutput(lesson
        ? ui("이 차시는 절차 안내입니다. 학습 코스에서 교재를 열고 현재 작품으로 실습하세요.")
        : ui`차시를 찾을 수 없습니다: ${lessonParam}`, lesson ? 'warning' : 'error');
    }
  }, [searchParams, addOutput, updateCode, loadPracticeCode, ui]);

  const handleBatch = useCallback((commands) => {
    if (sceneRef.current) {
      // 먼저 대기 중인 batch가 있으면 flush
      if (pendingBatchRef.current.length > 0) {
        for (const pending of pendingBatchRef.current) {
          processBatch(pending, sceneRef.current);
        }
        pendingBatchRef.current = [];
      }
      processBatch(commands, sceneRef.current);
    } else {
      // 모바일: 뷰포트 미 mount 시 버퍼에 저장
      pendingBatchRef.current.push(commands);
    }
  }, []);

  // Viewport3D 마운트 시 대기 중인 배치 즉시 flush (정적 씬 대응)
  const handleSceneReady = useCallback((scene) => {
    if (pendingBatchRef.current.length > 0) {
      for (const pending of pendingBatchRef.current) {
        processBatch(pending, scene);
      }
      pendingBatchRef.current = [];
    }
  }, []);

  const {
    progress, progressMessage,
    initWorker, runCode, stopExecution,
    status: engineStatus, isReady, isRunning,
  } = usePyodide({
    onOutput: addOutput,
    onError: (err, details) => {
      addOutput(err, 'error', details);
      stopAllSounds();
      errorSound();
    },
    onBatch: handleBatch,
    onReady: () => addOutput(ui("Python 엔진 준비 완료!"), 'success'),
    onDone: () => {
      stopBgm();
    },
    locale,
  });

  useEffect(()=>{stopSourceRef.current=stopExecution;},[stopExecution]);

  // 최초 Worker 초기화
  useEffect(() => {
    initWorker();
  }, [initWorker]);

  const startProgram = useCallback((sourceCode) => {
    // 이전 코드의 잔존음 + BGM + 3D 객체를 모두 정리
    stopAllSounds();
    if(getPythonStatus()!=='ready'){pendingPlayRef.current=sourceCode;stopExecution();return;}
    if (sceneRef.current) clearScene(sceneRef.current);
    clearRegistry();
    if (sceneRef.current?._cameraSystem) {
      sceneRef.current._cameraSystem.onCodeStart();
      // 갤러리의 GlowScript 원작은 표준 VPython의 자동 맞춤(autoscale 기본값 True)을 전제로 만들어졌으므로
      // 고정 카메라 대신 scene.autoscale = True와 같은 상태로 시작한다.
      if (showcaseProject) sceneRef.current._cameraSystem.setAutoscale(true);
    }
    setOutputs([]);
    setActiveTab('3d');
    runSound();
    addOutput(ui("실행을 시작했습니다."), 'log');
    lastStartedCode.current=sourceCode;
    runCode(sourceCode);
  }, [addOutput, runCode, stopExecution, ui, showcaseProject]);

  const handleRun = () => {
    if (!isReady || repoLoadStatus === 'loading') return;
    setPlayStartRequired(false);
    resumeAndRun(() => startProgram(codeRef.current));
  };

  // pendingPlay: Play 모드 코드 로드 + Pyodide 준비 모두 완료 시 자동 실행
  useEffect(() => {
    if (isReady && pendingPlayRef.current) {
      const playCode = pendingPlayRef.current;
      if (isTouchPlaybackEnvironment() && !isAudioUnlocked()) {
        setPlayStartRequired(true);
        return;
      }
      pendingPlayRef.current = null;
      // 다음 프레임에서 실행 (코드 state 반영 보장)
      const epoch=playEpoch.current;
      requestAnimationFrame(() => {if(epoch===playEpoch.current)startProgram(playCode);});
    }
  }, [isReady, code, startProgram]);

  const handlePendingPlayStart = () => {
    const playCode = pendingPlayRef.current || codeRef.current;
    setPlayStartRequired(false);
    pendingPlayRef.current = null;
    resumeAndRun(() => startProgram(playCode));
  };

  useEffect(()=>()=>{playEpoch.current++;},[]);

  const handleStop = () => {
    stopExecution();
    playEpoch.current++;pendingPlayRef.current=null;setPlayStartRequired(false);
    stopAllSounds();
    // 정지 시 코드 에디터로 복귀. 모바일 전체 화면(CSS 대체 모드) 중에는 탭을 바꾸면 전체 화면이 풀리므로 유지합니다.
    if (!isViewportFullscreen()) setActiveTab('editor');
    addOutput(ui("⏹ 실행 중지됨"), 'warning');
  };

  const handleReset = () => {
    // 현재 로드된 예제/lesson/공유 코드의 원본으로 복귀 (없으면 DEFAULT_CODE)
    stopAllSounds();
    stopExecution();
    if (sceneRef.current) clearScene(sceneRef.current);
    // 이 브라우저에 남긴 자유 코딩 초안도 지웁니다(공용 컴퓨터에서 다음 사람에게 남지 않게).
    clearSandboxDraft();
    updateCode(initialCodeRef.current || getDefaultCode(locale));
    setOutputs([]);
  };

  // 공유 카드 제목: 프로젝트 제목 → 코드 첫 줄 주석 → 기본 문구
  const shareTitle = () => {
    const projectTitle = (githubProject?.title || '').trim();
    if (projectTitle) return projectTitle.slice(0, 80);
    if(homeDraftTitle.current)return homeDraftTitle.current;
    const firstComment = String(codeRef.current || '').split('\n').map((line) => line.trim()).find((line) => line.startsWith('#'));
    const fromComment = firstComment ? firstComment.replace(/^#+\s*/, '').trim() : '';
    return (fromComment || ui("VPyLab 코드")).slice(0, 80);
  };

  const handleShare = async () => {
    const title = shareTitle();
    const { url, error } = await createShareLink(codeRef.current, title);
    if (error || !url) {
      setShareMsg(t('share.failed'));
      setTimeout(() => setShareMsg(''), 2000);
      return;
    }
    // 예전처럼 바로 복사해 두고, 링크·QR·임베드를 한곳에서 고를 수 있게 대화상자를 엽니다.
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg(t('share.copied'));
    } catch {
      setShareMsg(t('share.copyLink'));
    }
    setTimeout(() => setShareMsg(''), 2000);
    // 주소에 코드를 담은 링크(#code=)에는 공유 ID가 없어 임베드 코드를 만들지 않습니다.
    // 이름 정하기는 대화상자를 연 순간의 코드로 만듭니다.
    setShareDialog({ url, id: url.includes('/s/') ? url.slice(url.lastIndexOf('/s/') + 3) : null, title, code: codeRef.current });
  };

  // 작품 영상 내보내기: 3D 화면과 소리를 이 브라우저 안에서 녹화해 파일로 내려받습니다.
  const handleStopRecording = useCallback(() => recordingRef.current?.stop(), []);
  const handleStartRecording = useCallback(async () => {
    if (recordingRef.current) return;
    const canvas = sceneRef.current?._renderer?.domElement;
    if (!canRecordCanvas(canvas)) {
      addOutput(ui("이 브라우저는 화면 녹화를 지원하지 않습니다."), 'error');
      return;
    }
    let recording;
    try {
      recording = startCanvasRecording(canvas, { audio: openRecordingAudioStream(), onTick: setRecordingSeconds });
    } catch {
      addOutput(ui("화면 녹화를 시작하지 못했습니다."), 'error');
      return;
    }
    recordingRef.current = recording;
    setRecordingSeconds(0);
    addOutput(ui`화면과 소리를 녹화합니다. 최대 ${MAX_RECORDING_SECONDS}초이며 녹화 끝내기를 누르면 영상 파일로 저장됩니다.`, 'info');
    try {
      const result = await recording.finished;
      if (result) {
        const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
        const name = `vpylab_${stamp}.${result.extension}`;
        if (DRIVE_EDITOR) {
          // 내려받기와 드라이브 저장 가운데 고릅니다. 드라이브를 연결하지 않았으면 창에서 연결할 수 있습니다.
          setRecordedVideo({ blob: result.blob, name, seconds: result.seconds });
        } else {
          downloadRecording(result.blob, name);
          addOutput(ui`영상을 저장했습니다. (${result.seconds}초)`, 'success');
        }
      }
    } catch {
      addOutput(ui("영상을 저장하지 못했습니다. 다시 녹화해 주세요."), 'error');
    } finally {
      if (recordingRef.current === recording) {
        recordingRef.current = null;
        setRecordingSeconds(null);
      }
    }
  }, [addOutput, ui]);
  // 화면을 떠나면 녹화를 버립니다.
  useEffect(() => () => recordingRef.current?.cancel(), []);

  const handleExport = async () => {
    // 내려받은 HTML은 혼자 실행되고, 코드를 품고 있어 "파일 열기"로 VPyLab에 다시 불러올 수 있습니다.
    const { generateStandaloneHTML, downloadHTML } = await import('../utils/export-html');
    const title = shareTitle();
    const html = generateStandaloneHTML(codeRef.current, title, { openInVpylabUrl: openInVpylabUrl(codeRef.current) });
    downloadHTML(html, `${codeFileBaseName(title)}.html`);
    addOutput(ui("HTML 파일을 내려받았습니다. 도구 메뉴의 \"파일 열기\"로 이 파일을 다시 불러올 수 있습니다."), 'success');
  };

  const openGitHubProjects = () => {
    if (githubControl.current) { githubControl.current.open('projects'); return; }
    addOutput(githubFailed
      ? ui("팀 프로젝트 기능을 불러오지 못했습니다. 실행과 저장은 그대로 사용할 수 있으며, 새로 고침한 뒤 다시 시도하십시오.")
      : ui("팀 프로젝트 기능을 불러오는 중입니다. 잠시 뒤 다시 누르십시오."), githubFailed ? 'error' : 'log');
  };

  const handleDownloadPython = () => {
    downloadPython(codeRef.current, `${codeFileBaseName(shareTitle())}.py`);
  };

  /** 고른 파일(.py 또는 VPyLab이 내보낸 .html)의 코드를 편집기로 불러옵니다. */
  const openCodeFile = async (file) => {
    if (!file) return;
    let loaded;
    try {
      loaded = await readCodeFile(file);
    } catch (error) {
      addOutput(ui(CODE_FILE_REASON_TEXT[error instanceof CodeFileError ? error.reason : 'read']), 'error');
      return;
    }
    // 열어 둔 팀 프로젝트나 드라이브 파일이 있으면 그곳에 저장한 코드와 비교합니다. 드라이브에 방금 저장한 코드를 저장 전 기준과 비교하면
    // 저장을 마치고도 "저장하지 않은 변경"으로 잘못 묻게 됩니다.
    const current = codeRef.current;
    const driveFileOpen = DRIVE_EDITOR && Boolean(useDriveStore.getState().file);
    const unsaved = githubControl.current?.hasProject() ? Boolean(githubControl.current.isDirty(current))
      : driveFileOpen ? useDriveStore.getState().isDirty(current)
      : current !== initialCodeRef.current;
    if (unsaved && !window.confirm(ui("편집기에 저장하지 않은 변경이 있고, 파일을 열면 이 변경은 사라집니다. 계속할까요?"))) return;
    stopAllSounds();
    stopExecution();
    if (sceneRef.current) clearScene(sceneRef.current);
    clearRegistry();
    setOutputs([]);
    setActiveTab('editor');
    practiceContextRef.current = null;
    // 파일에서 연 코드는 열어 둔 드라이브 파일이나 팀 프로젝트와 별개입니다(저장이 그쪽을 덮어쓰지 않게 연결을 끊음).
    detachDriveSource();
    updateCode(loaded.code);
    homeDraftTitle.current = loaded.title || null; initialCodeRef.current = loaded.code;
    addOutput(ui`파일 "${file.name}"의 코드를 열었습니다.`, 'success');
  };
  const handleFileDrop = (event) => {
    if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'drop') openCodeFile(event.dataTransfer.files?.[0]);
  };

  /** 드라이브 저장: 연 드라이브 파일이 있으면 바로 저장하고, 로그인·이름·충돌·오류는 대화상자에서 안내합니다. */
  const handleDriveSave = async () => {
    const drive = useDriveStore.getState();
    const canQuickSave = drive.account && drive.file && !drive.conflict && !drive.needsReauth && !drive.missingScope && !drive.folderTrashed && !drive.busy;
    if (!canQuickSave) { setDriveDialog('save'); return; }
    setSaveMsg(ui("저장 중…"));
    const result = await drive.save(codeRef.current);
    if (['saved', 'unchanged'].includes(result.status)) {
      setSaveMsg(ui("저장됨"));
      setTimeout(() => setSaveMsg(''), 2000);
      if (result.overwritten) addOutput(ui("저장 직전에 다른 탭이나 기기에서 저장한 내용이 있었고, 드라이브의 버전 기록에서 확인할 수 있습니다."), 'warning');
      return;
    }
    setSaveMsg('');
    setDriveDialog('save');
  };

  const handleSave = async () => {
    // 팀 프로젝트를 열어 둔 동안에는 저장이 GitHub 커밋입니다. 그 밖의 개인 코드는 구글 드라이브에 저장합니다.
    if (GITHUB_ADDON && githubControl.current?.hasProject()) { githubControl.current.open('commit'); return; }
    if (DRIVE_EDITOR) { await handleDriveSave(); return; }
    // 구글 드라이브 저장이 설정되지 않은 배포: 출력 창에 알리고 링크로 보관하는 방법을 안내합니다.
    // 좁은 화면의 코드 탭에서는 출력 탭으로 옮겨 안내가 보이게 합니다. 화면 탭은 아래쪽에 출력 창이 함께 보이므로 그대로 둡니다
    // (넓은 화면은 출력 창이 항상 보입니다).
    setActiveTab((tab) => (tab === 'editor' ? 'console' : tab));
    addOutput(ui("이 사이트에는 구글 드라이브 저장이 설정되어 있지 않습니다."), 'warning');
    addOutput(ui("도구 메뉴의 \"공유\"를 누르면 작품 링크가 만들어집니다. 링크를 보관하거나 다른 사람에게 보낼 수 있습니다. 링크를 저장 용도로 사용해도 됩니다."), 'log');
  };

  // 극장 모드: 3D 뷰포트만 전체 화면
  if (theaterMode) {
    const handleTheaterStart = () => {
      setTheaterWaiting(false);
      pendingPlayRef.current = null;
      resumeAndRun(() => startProgram(codeRef.current));
    };

    return (
      <div className="h-screen w-screen relative" style={{ backgroundColor: '#000' }}>
        <Viewport3D sceneRef={sceneRef} onSceneReady={handleSceneReady} controls={{ onRun: handleRun, onStop: handleStop, isRunning:isRunning||audio.playing, isReady }} />

        {/* 클릭하여 시작 오버레이 */}
        {theaterWaiting && (
          <button type="button"
            onClick={handleTheaterStart}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', border: 'none', padding: 0, width: '100%', color: 'white',
            }}
          >
            <div style={{ textAlign: 'center', color: 'white' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>▶</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{ui("클릭하여 시작")}</div>
            </div>
          </button>
        )}

        {/* 좌상단: 코드 보기 버튼 */}
        {!theaterWaiting && (
          <button
            onClick={() => { handleStop(); setTheaterMode(false); }}
            style={{
              position: 'fixed', top: 16, left: 16, zIndex: 100,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
              border: 'none', borderRadius: 10,
              color: 'white', padding: '8px 14px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'opacity 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {'</>'}{ui("코드 보기")}</button>
        )}

        {/* 좌하단: 정지 버튼 (실행 중일 때만) */}
        {(isRunning||audio.playing) && (
          <button
            onClick={handleStop}
            style={{
              position: 'fixed', bottom: 16, left: 16, zIndex: 100,
              background: 'rgba(239,68,68,0.8)', backdropFilter: 'blur(8px)',
              border: 'none', borderRadius: 10,
              color: 'white', padding: '8px 14px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.8)'}
          >{ui("⏹ 정지")}</button>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }} onDragOverCapture={handleFileDrop} onDropCapture={handleFileDrop}>
      <Header />
      <input ref={fileInputRef} type="file" accept=".py,.html,.htm,text/x-python,text/html" hidden aria-hidden="true" tabIndex={-1} data-testid="code-file-input"
        onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; openCodeFile(file); }} />
      {GitHubAddon && !githubFailed && (
        <AddonBoundary onError={() => { githubControl.current = null; setGithubFailed(true); setGithubProject(null); }}>
          <Suspense fallback={null}>
            <GitHubAddon
              controlRef={githubControl}
              code={code}
              getCode={() => codeRef.current}
              defaultTitle={shareTitle()}
              // 갤러리에 올릴 때의 미리보기 그림: 지금 3D 화면이 편집기의 코드를 실행한 모습일 때만 넘깁니다(JPEG, 없으면 null).
              getThumbnail={() => (lastStartedCode.current === codeRef.current ? captureThumbnail(sceneRef.current?._renderer?.domElement, 640, 0.8, 'jpeg') : null)}
              shouldRestore={() => githubRestoreAllowed.current && !githubDetachPending && codeRef.current === initialCodeRef.current}
              onReady={() => { githubDetachPending = false; }}
              onProjectChange={(next) => {
                // 팀 프로젝트를 여는 순간부터 저장은 GitHub로 갑니다. 열어 둔 드라이브 파일과 동시에 연결해 두지 않습니다(빈 저장소 포함).
                if (next && DRIVE_EDITOR) useDriveStore.getState().detach();
                setGithubProject(next);
              }}
              onRestore={({ code: restored, baseline, title, restoredDraft }) => {
                // 새로 고침 뒤: 그사이 편집을 시작했으면 덮어쓰지 않습니다. 이때 프로젝트 연결도 끊어, 저장이 지금 코드를 팀 저장소에 올리지 않게 합니다.
                if (codeRef.current !== initialCodeRef.current) {
                  githubControl.current?.detach();
                  addOutput(ui`편집을 시작한 뒤라 팀 프로젝트 "${title || ''}"을(를) 다시 열지 않았습니다. "팀 프로젝트" 버튼에서 다시 열 수 있습니다.`, 'warning');
                  return;
                }
                practiceContextRef.current = null;
                if (DRIVE_EDITOR) useDriveStore.getState().detach();
                updateCode(restored);
                homeDraftTitle.current = null; initialCodeRef.current = baseline;
                setOutputs([{ text: restoredDraft
                  ? ui`팀 프로젝트 "${title || ''}"을(를) 다시 열고, 저장하지 않은 변경을 되살렸습니다.`
                  : ui`팀 프로젝트 "${title || ''}"을(를) 다시 열었습니다.`, type: 'log', id: Date.now() }]);
              }}
              onLoaded={(loaded, title) => {
                stopAllSounds();
                stopExecution();
                if (sceneRef.current) clearScene(sceneRef.current);
                clearRegistry();
                setOutputs([]);
                setActiveTab('editor');
                practiceContextRef.current = null;
                // 팀 프로젝트의 코드는 열어 둔 드라이브 파일과 별개입니다(드라이브 저장이 그 파일을 덮어쓰지 않게 연결을 끊음).
                if (DRIVE_EDITOR) useDriveStore.getState().detach();
                updateCode(loaded);
                homeDraftTitle.current = null; initialCodeRef.current = loaded;
                addOutput(ui`팀 프로젝트 "${title || ''}"의 코드를 열었습니다.`, 'success');
              }}
              onSaved={() => {
                initialCodeRef.current = codeRef.current;
                setSaveMsg(ui("저장됨"));
                setTimeout(() => setSaveMsg(''), 2000);
              }}
            />
          </Suspense>
        </AddonBoundary>
      )}
      {shareDialog && (
        <ShareLinkDialog url={shareDialog.url} shareId={shareDialog.id} title={shareDialog.title} code={shareDialog.code} onClose={() => setShareDialog(null)} />
      )}
      {recordedVideo && <VideoSaveDialog video={recordedVideo} onClose={() => setRecordedVideo(null)} />}
      {driveDialog && (
        <DriveDialog
          mode={driveDialog}
          getCode={() => codeRef.current}
          defaultName={shareTitle()}
          isDirty={() => useDriveStore.getState().isDirty(codeRef.current) || (!useDriveStore.getState().file && codeRef.current !== initialCodeRef.current)}
          onSaved={(result) => {
            setDriveDialog(null);
            setSaveMsg(ui("저장됨"));
            setTimeout(() => setSaveMsg(''), 2000);
            if (result?.status === 'created') addOutput(ui`구글 드라이브 VPyLab 폴더에 "${result.meta?.name || ''}"을(를) 만들었습니다.`, 'success');
          }}
          onLoaded={(loaded, name) => {
            stopAllSounds();
            stopExecution();
            if (sceneRef.current) clearScene(sceneRef.current);
            clearRegistry();
            setOutputs([]);
            setActiveTab('editor');
            practiceContextRef.current = null;
            detachGitHubSource();
            updateCode(loaded);
            homeDraftTitle.current = null; initialCodeRef.current = useDriveStore.getState().file?.savedCode ?? loaded;
            addOutput(ui`구글 드라이브에서 "${name || ''}"을(를) 열었습니다.`, 'success');
            setDriveDialog(null);
          }}
          onRestoreNew={(restored) => {
            practiceContextRef.current = null;
            detachGitHubSource();
            updateCode(restored);
            setDriveDialog(null);
          }}
          onNewCode={() => {
            practiceContextRef.current = null;
            detachGitHubSource();
            const starter = getDefaultCode(locale);
            updateCode(starter);
            homeDraftTitle.current = null; initialCodeRef.current = starter;
            setDriveDialog(null);
          }}
          onClose={() => setDriveDialog(null)}
        />
      )}

      {(tutorial || showcaseProject || workbookLesson || referenceDoc) && <nav aria-label={locale === 'ko' ? '학습 이동' : 'Learning navigation'} className="flex items-center justify-between gap-3 px-4 py-2 border-b text-xs shrink-0" style={{ borderColor:'var(--color-border)', color:'var(--color-accent)' }}>
        <Link className="shrink-0 py-1 no-underline" to={referenceDoc ? '/docs' : tutorial ? '/tutorials' : showcaseProject ? '/gallery/glowscript' : `/courses/${lessonParts[0]}`}>
          ← {locale === 'ko' ? (referenceDoc ? '문서 목록' : tutorial ? '튜토리얼 목록' : showcaseProject ? '갤러리' : '코스 목차') : (referenceDoc ? 'Docs' : tutorial ? 'Tutorial list' : showcaseProject ? 'Gallery' : 'Course contents')}
        </Link>
        <span className="truncate" style={{color:'var(--color-text-secondary)'}}>{referenceDoc?.title?.[locale] || tutorial?.title[locale] || showcaseProject?.title || workbookLesson?.title?.[locale] || workbookLesson?.title?.ko || workbookLesson?.title}</span>
        <Link className="shrink-0 py-1 no-underline" to={referenceDoc ? `/docs#${referenceDoc.id}` : tutorial ? `/tutorials/${tutorial.id}${tutorial.activeStep ? `?step=${tutorial.activeStep}` : ''}` : showcaseProject ? `/gallery/glowscript/${showcaseProject.id}` : `/courses/${lessonPath}`}>
          {locale === 'ko' ? (referenceDoc ? '문서로 돌아가기' : showcaseProject ? '작품 설명' : '학습 안내') : (referenceDoc ? 'Back to topic' : showcaseProject ? 'Project details' : 'Activity guide')}
        </Link>
      </nav>}
      {draftWriteFailedRef.current && <p role="status" className="px-4 py-2 text-xs">{locale === 'ko' ? '연습 내용을 이 탭에 보관하지 못했습니다. 이동 전에 코드를 저장하세요.' : 'Your practice could not be kept in this tab. Save your code before leaving.'}</p>}
      {showcaseProject && <details className="px-5 py-2 text-xs border-b shrink-0" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
        <summary className="cursor-pointer">{showcaseProject.credit} · {showcaseProject.title}</summary>
        <div className="pt-3 pb-2 space-y-2"><p>{locale === 'ko' ? '원작의 화면·조작과 다를 수 있어요. 계속 움직이는 작품은 정지 버튼으로 멈추세요.' : 'Rendering and controls may differ from the original. Use Stop for continuous animations.'}</p><Link to={`/gallery/glowscript/${showcaseProject.id}`} style={{ color: 'var(--color-accent)' }}>{locale === 'ko' ? '작품과 원본 보기' : 'Project and original source'} →</Link></div>
      </details>}
      {tutorial && <details className="px-5 py-2 text-xs border-b shrink-0" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
        <summary className="cursor-pointer">{tutorial.title[locale]} · {locale === 'ko' ? '체험 안내' : 'Experience guide'}</summary>
        <div className="pt-3 pb-2 space-y-2"><p>{tutorial.change[locale]}</p><p>{tutorial.reflect[locale]}</p>{tutorial.stepNote && <p>{tutorial.stepNote[locale]}</p>}{tutorial.peerTest && <p>{tutorial.peerTest[locale]}</p>}<Link to={`/tutorials/${tutorial.id}${tutorial.activeStep ? `?step=${tutorial.activeStep}` : ''}`} style={{ color: 'var(--color-accent)' }}>{locale === 'ko' ? '튜토리얼로 돌아가기' : 'Back to tutorial'} →</Link></div>
      </details>}

      <div className="flex flex-wrap items-center gap-2 shrink-0 px-4 py-3 border-b" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
        <button onClick={handleRun} disabled={!isReady || isRunning || repoLoadStatus === 'loading'} className="toolbar-btn --run">{repoLoadStatus === 'loading' ? ui("불러오는 중") : t('editor.run')}</button>
        {(isRunning||audio.playing) && <button onClick={handleStop} className="toolbar-btn --stop">{t('editor.stop')}</button>}
        {recordingSeconds !== null && <button onClick={handleStopRecording} className="toolbar-btn" aria-live="polite" style={{ color: 'var(--color-error)' }}>● {ui`녹화 끝내기 (${recordingSeconds}초)`}</button>}
        <button onClick={handleSave} className="toolbar-btn" title={ui("현재 코드 저장 (Ctrl/Cmd+S)")}>{saveMsg || ui("저장")}</button>
        {DRIVE_EDITOR && <button onClick={() => setDriveDialog('files')} className="toolbar-btn max-w-36 truncate" title={driveFile?.name || ui("내 구글 드라이브")} data-testid="drive-files-button">{driveFile ? driveFile.name : ui("내 드라이브")}</button>}
        {GITHUB_ADDON && <button onClick={openGitHubProjects} className="toolbar-btn max-w-36 truncate" title={githubProject?.title || ui("GitHub 팀 프로젝트")} data-testid="github-project-button">{githubProject ? githubProject.title : ui("팀 프로젝트")}</button>}
        <div className="relative">
          <button ref={toolsButtonRef} onClick={() => setMobileMore(previous => !previous)} className="toolbar-btn" aria-label={ui("실습 도구")} aria-expanded={mobileMore}>{ui("도구")}<span aria-hidden="true">⌄</span></button>
          {mobileMore && <>
            <button type="button" aria-label={ui("실습 도구 닫기")} className="fixed inset-0 z-40 cursor-default border-0 bg-transparent" onClick={() => setMobileMore(false)} />
            <div className="absolute right-0 top-full mt-2 w-60 max-h-[calc(100dvh-170px)] overflow-y-auto py-2 z-50 border" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-md)' }}>
              {[
                { label: ui("현재 프로젝트를 내 메인으로 설정"), action: () => setHomePin({code:codeRef.current,title:shareTitle(),thumbnail:lastStartedCode.current===codeRef.current?captureThumbnail(sceneRef.current?._renderer?.domElement,600,.7):null}) },
                { label: ui("초기 코드로 돌아가기"), action: handleReset },
                { label: shareMsg || t('editor.share'), action: handleShare },
                { label: ui("파일 열기 (.py, .html)"), action: () => fileInputRef.current?.click() },
                { label: ui("HTML 내려받기"), action: handleExport },
                { label: ui("파이썬 파일(.py) 내려받기"), action: handleDownloadPython },
                ...(recordingSeconds === null ? [{ label: ui`영상으로 저장 (최대 ${MAX_RECORDING_SECONDS}초)`, action: handleStartRecording }] : []),
                { label: t('editor.examples'), action: () => setShowExamples(true) },
              ].map(item => <button key={item.label} onClick={() => { setMobileMore(false); item.action(); }} className="w-full text-left px-4 py-2.5 text-xs cursor-pointer border-0 bg-transparent" style={{ color: 'var(--color-text-primary)' }}>{item.label}</button>)}
              <SoundSettings />
            </div>
          </>}
        </div>
        <div className="flex flex-1 justify-end items-center gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <RuntimeStatus status={engineStatus} progress={progress} message={progressMessage} onRetry={initWorker} locale={locale} />
        </div>
        <div className="w-full flex md:hidden gap-1 pt-1" aria-label={ui("실습 패널")}>{[['editor', ui("코드")], ['3d', ui("화면")], ['console', ui("출력")]].map(([tab, label]) => <button key={tab} onClick={() => setActiveTab(tab)} aria-pressed={activeTab === tab} className={`tab-btn flex-1 ${activeTab === tab ? '--active' : ''}`}>{label}</button>)}</div>
      </div>


      {/* === 3패널 레이아웃 === */}
      <div className="flex-1 flex min-h-0">
        {/* 좌측: 에디터 */}
        <div
          className={`${activeTab === 'editor' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[45%] md:min-w-[300px]`}
          style={{ borderRight: '1px solid var(--color-border)' }}
        >
          <CodeEditor code={code} onChange={(val) => updateCode(val || '')} />
        </div>

        {/* 리사이저 (데스크톱) */}
        <div className="hidden md:block panel-resizer w-1" />

        {/* 우측: 3D + 콘솔 */}
        <div className={`${activeTab === 'editor' ? 'hidden' : 'flex'} md:flex flex-1 flex-col min-h-0 min-w-0`}>
          {/* 3D 뷰포트 — 모바일: 100%, 데스크톱: 항상 60% */}
          <div
            className={`${activeTab === '3d' ? 'flex' : 'hidden'} md:flex w-full`}
            style={{ height: '60%', minHeight: 0, borderBottom: '1px solid var(--color-border)' }}
          >
            <Viewport3D sceneRef={sceneRef} onSceneReady={handleSceneReady} controls={{ onRun: handleRun, onStop: handleStop, isRunning:isRunning||audio.playing, isReady }} />
          </div>

          {/* 리사이저 (데스크톱) */}
          <div className="hidden md:block panel-resizer panel-resizer-h h-1" />

          {/* 콘솔 — 데스크톱: 항상 표시 */}
          <div
            className={`${activeTab === 'console' || activeTab === '3d' ? 'flex' : 'hidden'} md:flex flex-col w-full`}
            style={{ flex: 1, minHeight: 0 }}
          >
            <OutputConsole outputs={outputs} onClear={() => setOutputs([])} />
          </div>
        </div>
      </div>

      {playStartRequired && (
        <div
          onClick={handlePendingPlayStart}
          style={{
            position: 'fixed', inset: 0, zIndex: 120,
            background: 'rgba(13,17,23,0.72)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 'min(420px, 100%)',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 18,
              padding: '28px 24px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.24)',
            }}
          >
            <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 14 }}>▶</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 10 }}>{ui("탭하여 소리와 함께 시작")}</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{ui("모바일과 태블릿에서는 첫 탭에서 오디오를 먼저 활성화해야 합니다.")}</div>
          </div>
        </div>
      )}

      {/* 예제 패널 */}
      {homePin&&<HomeSettingsDialog pin={homePin} ko={locale==='ko'} onClose={()=>setHomePin(null)}/>}
      {showExamples && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowExamples(false); }}
        >
          <div
            style={{
              background: 'var(--color-bg-secondary)', borderRadius: 12,
              width: '90%', maxWidth: 720, maxHeight: '80vh', overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* 헤더 */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--color-text-primary)' }}>{t('editor.examples') || ui("예제 갤러리")}</h2>
              <button onClick={() => setShowExamples(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 3L8 6.5 11.5 3 13 4.5 9.5 8 13 11.5 11.5 13 8 9.5 4.5 13 3 11.5 6.5 8 3 4.5 4.5 3z"/></svg>
              </button>
            </div>

            {/* 카테고리 탭 */}
            <div style={{ padding: '8px 20px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {EXAMPLE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setExampleCategory(cat.id)}
                  style={{
                    padding: '4px 12px', borderRadius: 16, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: exampleCategory === cat.id ? 600 : 400,
                    background: exampleCategory === cat.id ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                    color: exampleCategory === cat.id ? 'white' : 'var(--color-text-secondary)',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* 예제 리스트 */}
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {EXAMPLES
                .filter(ex => exampleCategory === 'all' || ex.category === exampleCategory)
                .map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => {
                      // 팀 프로젝트에 올리지 않은 편집은 예제를 열면 되살릴 방법이 없으므로 먼저 묻습니다.
                      // (드라이브 파일은 파일별 초안이, 자유 코딩은 이 브라우저의 초안이 남습니다.)
                      if (githubControl.current?.hasProject() && githubControl.current.isDirty(codeRef.current)
                        && !window.confirm(ui("팀 프로젝트에 저장하지 않은 변경이 있고, 예제를 열면 이 변경은 사라집니다. 계속할까요?"))) return;
                      // 다른 예제로 전환 시 이전 잔존음/실행/씬 정리
                      stopAllSounds();
                      stopExecution();
                      if (sceneRef.current) clearScene(sceneRef.current);
                      clearRegistry();
                      setOutputs([]);
                      // 학습 자료에서 연습하던 중이면 그 연결을 끊습니다. 끊지 않으면 예제 코드가 그 차시의 연습 초안으로 기록됩니다.
                      practiceContextRef.current = null;
                      updateCode(ex.code);
                      homeDraftTitle.current=null; detachDriveSource(); initialCodeRef.current = ex.code;
                      setShowExamples(false);
                    }}
                    style={{
                      background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)',
                      borderRadius: 8, padding: 12, cursor: 'pointer', textAlign: 'left',
                      transition: 'border-color 0.2s, transform 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8, lineHeight: 1 }}>
                      {ex.thumbnail || (
                        <svg width="28" height="28" viewBox="0 0 16 16" fill="var(--color-accent)" opacity="0.5">
                          <path d="M8 1a5 5 0 00-2 9.58V12a1 1 0 001 1h2a1 1 0 001-1v-1.42A5 5 0 008 1z"/>
                        </svg>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>{ui(ex.title)}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{ui(ex.description)}</div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {ex.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>{tag}</span>
                      ))}
                    </div>
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
