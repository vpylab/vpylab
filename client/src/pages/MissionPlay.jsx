import { useUiText } from "../i18n/ui-text";
import { readPracticeDraft, writePracticeDraft } from '../utils/practice-drafts';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';
import Header from '../components/layout/Header';
import CodeEditor from '../components/editor/CodeEditor';
import Viewport3D from '../components/viewport/Viewport3D';
import OutputConsole from '../components/console/OutputConsole';
import RuntimeStatus from '../components/shared/RuntimeStatus';
import useAudioState from '../hooks/useAudioState';
import usePyodide from '../hooks/usePyodide';
import { processBatch, clearScene } from '../engine/vpython-bridge';
import { gradeMission } from '../engine/grading-engine';
import { clearRegistry } from '../engine/object-registry';
import { runSound, successSound, errorSound, stopBgm, stopAllSounds, initAudioOnUserGesture, resumeAndRun } from '../engine/sound-system';
import { getMissionById } from '../data/missions';
import { getTrainingPosition } from '../data/training';

import useAppStore from '../stores/appStore';

/**
 * 미션 플레이 페이지
 * Sandbox와 유사하지만 미션 설명 + 채점 기능이 추가됨
 */
export default function MissionPlay() {
  const { missionId } = useParams();
  return <MissionSession key={missionId} missionId={missionId} />;
}

function MissionSession({ missionId }) {
  const ui = useUiText();
  const audio=useAudioState();
  const { t, locale: lang } = useI18n();
  const navigate = useNavigate();

  const mission = getMissionById(missionId);
  const completeMission = useAppStore((s) => s.completeMission);
  const [code, setCode] = useState(() => readPracticeDraft(`mission/${missionId}`) ?? mission?.starterCode ?? '');
  const [outputs, setOutputs] = useState([]);
  const [gradeResult, setGradeResult] = useState(null);
  const [hintIndex, setHintIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState('editor');
  const sceneRef = useRef(null);
  const pendingBatchRef = useRef([]);  // 모바일: sceneRef 미 mount 시 버퍼
  const pendingGradeRef = useRef(false);  // 채점 버튼 → 실행 완료 후 자동 채점

  // 미션이 없으면 목록으로 이동
  useEffect(() => {
    if (!mission) navigate('/missions');
  }, [mission, navigate]);

  useEffect(() => { initAudioOnUserGesture(); }, []);
  // 미션 화면을 떠나면 재생 중이거나 예약된 소리를 멈춥니다.
  useEffect(() => () => { stopBgm(); stopAllSounds(); }, []);

  const changeCode = value => {
    const next = value || '';
    writePracticeDraft(`mission/${missionId}`,next,mission?.starterCode);
    setCode(next);
  };

  // details: 파이썬 오류의 구조화 정보(입문자용 설명 포함). 콘솔이 설명을 먼저 보여 준다.
  const addOutput = useCallback((text, type = 'log', details) => {
    setOutputs((prev) => [...prev, { text, type, id: Date.now() + Math.random(), ...(details ? { details } : {}) }]);
  }, []);

  const handleBatch = useCallback((commands) => {
    if (sceneRef.current) {
      if (pendingBatchRef.current.length > 0) {
        for (const pending of pendingBatchRef.current) {
          processBatch(pending, sceneRef.current);
        }
        pendingBatchRef.current = [];
      }
      processBatch(commands, sceneRef.current);
    } else {
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
      if (pendingGradeRef.current) {
        pendingGradeRef.current = false;
        setGradeResult({
          grade: mission?.gradeType || 'run',
          passed: false,
          score: 0,
          message: ui("실행 오류가 있어 채점할 수 없습니다."),
        });
      }
    },
    locale: lang,
    onBatch: handleBatch,
    onReady: () => addOutput(ui("Python 엔진 준비 완료!"), 'success'),
    onDone: () => {
      stopBgm();
      if (pendingGradeRef.current) {
        pendingGradeRef.current = false;
        setTimeout(() => handleGradeInternal(), 100);
      }
    },
  });

  useEffect(() => {
    initWorker();
  }, [initWorker]);

  const handleRun = () => {
    if (!isReady) return;
    // 클릭 제스처에서 AudioContext resume 후 코드 실행 (최대 500ms 대기)
    resumeAndRun(() => {
      stopAllSounds();
      pendingGradeRef.current = false;
      if (sceneRef.current) clearScene(sceneRef.current);
      if (sceneRef.current?._cameraSystem) {
        sceneRef.current._cameraSystem.onCodeStart();
      }
      clearRegistry();
      setOutputs([]);
      setGradeResult(null);
      setActiveTab('3d');
      runSound();
      addOutput(ui("▶ 실행 중"), 'log');
      runCode(code);
    });
  };

  const handleStop = () => {
    stopExecution();
    stopAllSounds();
    setActiveTab('editor');  // 정지 시 코드 에디터로 복귀
    addOutput(ui("⏹ 실행 중지됨"), 'warning');
    // 채점 대기 중이면 정지 후 자동 채점 (무한 루프 미션 대응)
    if (pendingGradeRef.current) {
      pendingGradeRef.current = false;
      setTimeout(() => handleGradeInternal(), 100);
    }
  };

  // 채점 (내부 로직)
  const handleGradeInternal = () => {
    if (!mission) return;

    // 미션 종류별 채점기 조합 + codeChecks·expectedNotes 병행 검사
    const result = gradeMission(mission, code, { lang });

    setGradeResult(result);

    if (result.passed) {
      completeMission(missionId, result.score);
      successSound();
      if (result.score >= 100) {
        addOutput(ui`🎉 ${t('mission.congratulations')} (${result.score}점)`, 'success');
      } else {
        addOutput(ui`✅ 통과! (${result.score}점) — 더 완벽하게 도전해 보세요!`, 'success');
      }
    } else {
      if (result.score > 0) {
        addOutput(ui`📝 ${result.score}점 — ${result.message || t('mission.notYet')}`, 'warning');
      } else {
        addOutput(`📝 ${result.message || t('mission.notYet')}`, 'warning');
      }
    }
  };

  // 채점 (외부 진입점)
  const handleGrade = () => {
    if (!mission || (!isReady && !isRunning)) return;

    // 실행 중이면 정지 후 채점 (무한 루프 미션 대응)
    if (isRunning) {
      pendingGradeRef.current = true;
      handleStop();
      return;
    }

    resumeAndRun(() => {
      stopAllSounds();
      if (sceneRef.current) clearScene(sceneRef.current);
      if (sceneRef.current?._cameraSystem) {
        sceneRef.current._cameraSystem.onCodeStart();
      }
      clearRegistry();
      setOutputs([]);
      setGradeResult(null);
      setActiveTab('3d');
      pendingGradeRef.current = true;
      runSound();
      addOutput(ui("▶ 채점을 위해 현재 코드를 실행 중"), 'log');
      runCode(code);
    });
  };


  // 다음 미션
  const training = getTrainingPosition(missionId);
  const nextMission = training?.nextId ? getMissionById(training.nextId) : null;

  if (!mission) return null;

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      {training && <details className="px-4 py-2 text-xs border-b shrink-0" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
        <summary className="cursor-pointer">{lang === 'ko' ? '핵심 연습' : 'Core practice'} {training.index + 1} / {training.total} · {training.focus[lang]}</summary>
        <p className="pt-2 pb-1">{training.reflect[lang]}</p>
      </details>}
      {/* 툴바 — Sandbox와 동일한 레이아웃 */}
      <div
        className="flex flex-wrap items-center gap-2 px-3 py-2 shrink-0"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {/* 실행 버튼들 (좌측, Sandbox와 동일 위치) */}
        <button onClick={handleRun} disabled={!isReady || isRunning} className="toolbar-btn --run">
          {t('editor.run')}
        </button>
        <button onClick={handleStop} disabled={!isRunning&&!audio.playing} className="toolbar-btn --stop">
          {t('editor.stop')}
        </button>
        <button onClick={handleGrade} disabled={!isReady && !isRunning} className="toolbar-btn --grade">
          {t('mission.submit')}
        </button>

        <Link to="/missions" aria-label={lang === 'ko' ? '트레이닝 목록' : 'Training list'} className="py-2 text-xs no-underline shrink-0" style={{color:'var(--color-accent)'}}>← {lang === 'ko' ? '트레이닝' : 'Training'}</Link>
        {/* 미션 정보 */}
        <div className="hidden md:flex items-center gap-2 ml-2">

          <span className="text-xs font-mono font-bold" style={{ color: 'var(--color-text-muted)' }}>
            {mission.id}
          </span>
          <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {mission.title[lang]}
          </span>
        </div>
        {/* 모바일: 미션 제목 */}
        <span className="md:hidden text-xs font-bold truncate max-w-[100px]" style={{ color: 'var(--color-text-primary)' }}>
          {mission.title[lang]}
        </span>

        <div className="flex-1" />

        {/* 모바일 탭 */}
        <div className="flex md:hidden gap-1 w-full justify-end">
          {[['editor', lang === 'ko' ? '코드' : 'Code'], ['3d', lang === 'ko' ? '화면' : '3D'], ['info', lang === 'ko' ? '안내' : 'Info']].map(([tab, label]) => (
            <button
              key={tab}
              aria-pressed={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-btn ${activeTab === tab ? '--active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 상태 */}
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span className="flex items-center gap-1.5">
            <span className={`status-dot ${isRunning ? '--running' : isReady ? '--ready' : '--idle'}`} />
            <RuntimeStatus status={engineStatus} progress={progress} message={progressMessage} onRetry={initWorker} locale={lang} />
          </span>
        </div>
      </div>


      {/* === 메인 레이아웃 === */}
      <div className="flex-1 flex min-h-0">
        {/* 좌측: 에디터 */}
        <div
          className={`${activeTab === 'editor' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[45%] md:min-w-[300px]`}
          style={{ borderRight: '1px solid var(--color-border)' }}
        >
          <CodeEditor code={code} onChange={changeCode} />
        </div>

        {/* 중앙: 3D + 콘솔 */}
        <div className={`${activeTab === 'editor' ? 'hidden' : activeTab === 'info' ? 'hidden md:flex' : 'flex'} md:flex flex-1 flex-col min-h-0 min-w-0`}>
          <div
            className={`${activeTab === '3d' ? 'flex' : 'hidden'} md:flex w-full`}
            style={{ height: '60%', minHeight: 0, borderBottom: '1px solid var(--color-border)' }}
          >
            <Viewport3D sceneRef={sceneRef} onSceneReady={handleSceneReady} controls={{ onRun: handleRun, onStop: handleStop, isRunning:isRunning||audio.playing, isReady }} />
          </div>
          <div
            className={`${activeTab === '3d' ? 'flex' : 'hidden'} md:flex flex-col w-full`}
            style={{ flex: 1, minHeight: 0 }}
          >
            <OutputConsole outputs={outputs} onClear={() => setOutputs([])} />
          </div>
        </div>

        {/* 우측: 미션 정보 + 채점 결과 */}
        <div
          className={`${activeTab === 'info' ? 'flex' : 'hidden'} md:flex flex-col overflow-y-auto w-full md:w-[260px] md:min-w-[240px]`}
          style={{
            borderLeft: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
          }}
        >
          <div className="p-4 space-y-4">
            {/* 미션 설명 */}
            <section>
              <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/>
                </svg>
                {t('mission.description')}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {mission.description[lang]}
              </p>
            </section>

            <div style={{ borderTop: '1px solid var(--color-border)' }} />

            {/* 힌트 */}
            <section>
              <h3 className="text-xs font-bold mb-2.5 flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E0A800" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 21h6M12 3a6 6 0 00-4 10.5V17h8v-3.5A6 6 0 0012 3z"/>
                </svg>
                {t('mission.hints')}
              </h3>
              <div className="space-y-2">
                {mission.hints.map((hint, i) => (
                  <div key={i}>
                    {i <= hintIndex ? (
                      <div className="text-sm py-2.5 px-3 rounded-lg leading-relaxed" style={{
                        backgroundColor: 'var(--color-bg-panel)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                      }}>
                        {hint[lang]}
                      </div>
                    ) : (
                      <button
                        onClick={() => setHintIndex(i)}
                        className="text-[13px] px-3 py-2.5 rounded-lg cursor-pointer w-full text-left flex items-center gap-2 transition-colors font-medium"
                        style={{
                          backgroundColor: 'transparent',
                          color: 'var(--color-text-muted)',
                          border: '1px dashed var(--color-border)',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                        </svg>
                        {t('mission.showHint')} {i + 1}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>


            {/* 채점 결과 */}
            {gradeResult && (
              <div
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: gradeResult.passed ? '#3fb95010' : '#f7816610',
                  border: `1px solid ${gradeResult.passed ? '#3fb95040' : '#f7816640'}`,
                }}
              >
                <h3
                  className="text-sm font-bold mb-2 flex items-center gap-1.5"
                  style={{ color: gradeResult.passed ? '#3fb950' : '#f78166' }}
                >
                  {gradeResult.passed ? '✅ ' + t('grading.passed') : '❌ ' + t('grading.failed')}
                </h3>
                <p className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {gradeResult.score}<span className="text-sm font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>{ui("점")}</span>
                </p>

                {/* 세부 결과 */}
                {gradeResult.results?.map((r, i) => (
                  <div key={i} className="text-xs mb-1.5 pl-2" style={{ color: 'var(--color-text-secondary)', borderLeft: `2px solid ${r.passed ? '#3fb95050' : '#f7816650'}` }}>
                    {r.message}
                  </div>
                ))}
                {/* 음악/실행 미션 메시지 */}
                {!gradeResult.results && gradeResult.message && (
                  <div className="text-xs pl-2" style={{ color: 'var(--color-text-secondary)' }}>
                    {gradeResult.message}
                  </div>
                )}

                {training && <p className="text-xs leading-relaxed mt-3" style={{ color: 'var(--color-text-secondary)' }}>{lang === 'ko' ? '자동 검사는 코드 조건을 확인합니다. 다음 질문으로 이해를 확인하세요: ' : 'Automatic checks verify code conditions. Reflect on this: '}{training.reflect[lang]}</p>}
                {gradeResult.passed && !nextMission && <Link to="/missions" className="block mt-3 text-sm" style={{ color: 'var(--color-accent)' }}>{lang === 'ko' ? '트레이닝 코스로 돌아가기 →' : 'Back to training courses →'}</Link>}
                {/* 다음 미션 버튼 */}
                {gradeResult.passed && nextMission && (
                  <Link
                    to={`/mission/${nextMission.id}`}
                    className="block mt-3 text-center text-sm font-bold py-2.5 rounded-lg no-underline transition-all"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-accent), #8B7CF7)',
                      color: '#fff',
                    }}
                    onClick={() => {
                      setCode(nextMission.starterCode);
                      setGradeResult(null);
                      setHintIndex(-1);
                      setOutputs([]);
                    }}
                  >
                    {t('mission.next')} → {nextMission.title[lang]}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
