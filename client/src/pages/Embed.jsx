import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';
import Viewport3D from '../components/viewport/Viewport3D';
import { BrandMark } from '../components/shared/BrandLogo';
import usePyodide from '../hooks/usePyodide';
import useAppStore from '../stores/appStore';
import { processBatch, clearScene } from '../engine/vpython-bridge';
import { clearRegistry } from '../engine/object-registry';
import {
  ensureAudioReady, isAudioUnlocked, stopAllSounds, stopBgm, setMasterMuted, getAudioState, subscribeAudioState,
} from '../engine/sound-system';
import { loadSharedCode } from '../utils/share';
import { workUrl } from '../utils/embed';

/** 짧은 공유 주소(/s/:id)의 코드를 읽습니다. 읽지 못하면 work는 null이고, failed는 주소가 없는 것이 아니라 연결 실패라는 뜻입니다. */
async function loadWork(id) {
  const { code, title, error } = await loadSharedCode(id);
  if (error || !code) return { work: null, failed: error === 'unavailable' };
  return { work: { title: title || '', code }, failed: false };
}

/**
 * /embed/:id — 다른 사이트의 iframe에 넣는 가벼운 보기 전용 페이지.
 * 헤더·편집기·로그인·저장 없이 3D 화면, 제목, 실행·정지, 소리, "VPyLab에서 열기"만 둡니다.
 * 열리면 자동 실행하고, 소리는 브라우저 정책상 사용자 동작 뒤에만 켜집니다. 켠 뒤에는 음소거 토글로 남습니다.
 */
export default function Embed() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const theme = useAppStore((s) => s.theme);
  const isDarkTheme = useAppStore((s) => !!s.THEME_META?.[s.theme]?.dark);
  const sceneRef = useRef(null);
  const autoRanRef = useRef(false);
  // id별로 읽은 결과. id가 바뀌면 이전 결과는 무시됩니다(동기 setState 없이 파생).
  const [loaded, setLoaded] = useState(null);
  const work = loaded?.id === id ? loaded.work : null;
  const notFound = loaded?.id === id && !loaded.work;
  const missingText = loaded?.failed ? t('embed.loadFailed') : t('embed.notFound');
  const [lastError, setLastError] = useState('');
  const [soundOn, setSoundOn] = useState(() => isAudioUnlocked());
  const audio = useSyncExternalStore(subscribeAudioState, getAudioState, getAudioState);

  // 3D 화면이 준비되기 전에 도착한 그리기 명령은 모아 두었다가 준비되면 처리합니다(버리면 첫 장면이 비어 보입니다).
  const pendingBatches = useRef([]);
  const handleBatch = useCallback((commands) => {
    if (sceneRef.current) processBatch(commands, sceneRef.current);
    else pendingBatches.current.push(commands);
  }, []);
  const handleSceneReady = useCallback((scene) => {
    const waiting = pendingBatches.current;
    pendingBatches.current = [];
    for (const commands of waiting) processBatch(commands, scene);
  }, []);

  const {
    initWorker, runCode, stopExecution, isReady, isRunning, isLoading, progress, progressMessage,
  } = usePyodide({
    onBatch: handleBatch,
    onError: (message) => { setLastError(String(message || '')); stopAllSounds(); },
    onDone: ({stopped}) => {if(stopped)stopAllSounds();},
    locale,
  });

  useEffect(() => { void initWorker(); }, [initWorker]);

  useEffect(() => {
    let alive = true;
    autoRanRef.current = false;
    loadWork(id).then((result) => {
      if (alive) setLoaded({ id, ...result });
    });
    return () => { alive = false; };
  }, [id]);

  const startRun = useCallback(() => {
    if (!isReady || !work?.code) return;
    if (sceneRef.current) clearScene(sceneRef.current);
    clearRegistry();
    sceneRef.current?._cameraSystem?.onCodeStart?.();
    runCode(work.code);
  }, [isReady, work, runCode]);

  // 실행 버튼은 사용자 제스처이므로 여기서 오디오 잠금도 함께 풉니다.
  const run = () => {
    setLastError('');
    ensureAudioReady().then((ready) => setSoundOn(ready || isAudioUnlocked())).catch(() => {});
    startRun();
  };

  // 엔진과 코드가 모두 준비되면 한 번 자동 실행
  useEffect(() => {
    if (isReady && work?.code && !autoRanRef.current) {
      autoRanRef.current = true;
      startRun();
    }
  }, [isReady, work, startRun]);

  const stop = () => {
    stopExecution();
    stopAllSounds();
  };

  const enableSound = async () => {
    const ready = await ensureAudioReady();
    setSoundOn(ready || isAudioUnlocked());
    setMasterMuted(false);
  };

  useEffect(() => () => { stopBgm(); stopAllSounds(); }, []);

  const openUrl = work ? workUrl(id, window.location.origin) : `${window.location.origin}/`;
  const statusText = notFound
    ? missingText
    : !work ? t('embed.loading')
      : isLoading ? `${t('embed.preparing')} ${progress ? `${progress}%` : ''} ${progressMessage || ''}`.trim()
        : lastError;
  const smallButton = { padding: '4px 10px', fontSize: 12 };

  return (
    <div
      className="h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
      data-vpylab-embed=""
      data-theme-name={theme}
    >
      <div
        className="flex items-center gap-2 px-3 shrink-0"
        style={{ height: 44, borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-panel)' }}
      >
        <a href={openUrl} target="_blank" rel="noopener noreferrer" className="flex items-center no-underline shrink-0" aria-label="VPyLab">
          <BrandMark size={22} inverse={isDarkTheme} />
        </a>
        <span className="text-sm font-semibold truncate flex-1 min-w-0" title={work?.title || ''} data-testid="embed-title">
          {work?.title || (notFound ? missingText : 'VPyLab')}
        </span>
        {(isRunning||audio.playing) ? (
          <button type="button" onClick={stop} className="toolbar-btn --stop" style={smallButton}>
            {t('editor.stop')}
          </button>
        ) : (
          <button type="button" onClick={run} disabled={!isReady || !work} className="toolbar-btn --run" style={smallButton}>
            {t('editor.run')}
          </button>
        )}
        {soundOn ? (
          <button
            type="button"
            onClick={() => setMasterMuted(!audio?.muted)}
            className="toolbar-btn"
            style={smallButton}
            title={audio?.muted ? t('embed.unmute') : t('embed.mute')}
            aria-pressed={!!audio?.muted}
            data-testid="embed-mute-toggle"
          >
            {audio?.muted ? `🔇 ${t('embed.unmute')}` : `🔊 ${t('embed.mute')}`}
          </button>
        ) : (
          <button type="button" onClick={enableSound} className="toolbar-btn" style={smallButton} title={t('embed.enableSound')}>
            🔈 {t('embed.enableSound')}
          </button>
        )}
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="toolbar-btn no-underline"
          style={smallButton}
          data-testid="embed-open-link"
        >
          {t('embed.openInVPyLab')} ↗
        </a>
      </div>

      <div className="flex-1 min-h-0 relative">
        <Viewport3D sceneRef={sceneRef} onSceneReady={handleSceneReady} controls={{ onRun: run, onStop: stop, isRunning:isRunning||audio.playing, isReady: isReady && !!work }} />
        {statusText && (
          <div
            className="absolute left-2 bottom-2 text-xs px-2 py-1 rounded max-w-[90%] whitespace-pre-wrap"
            style={{ color: lastError ? 'var(--color-error)' : 'var(--color-text-secondary)', backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 85%, transparent)' }}
            data-testid="embed-status"
          >
            {statusText}
          </div>
        )}
      </div>
    </div>
  );
}
