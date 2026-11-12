import { useEffect, useRef, useState } from 'react';
import { useGitHubStore } from '../../github/githubSession.js';
import { clearProjectDraft, readProjectDraft, writeProjectDraft } from '../../github/tab-session.js';
import GitHubProjectDialog from './GitHubProjectDialog.jsx';

/**
 * 만들기 화면과 GitHub 팀 프로젝트 애드온을 잇는 한 지점입니다(오픈소스 판, docs/SCOPE.md 애드온 규칙).
 * 만들기 화면은 이 파일을 지연 불러오기 하고, controlRef로만 애드온에 말을 겁니다.
 *   controlRef.current = { open(mode), hasProject(), detach(), isDirty(code) }
 * 이 파일을 불러오지 못해도 만들기 화면의 실행·드라이브 저장은 그대로 동작합니다.
 *
 * 새로 고침 대비: 연결과 연 프로젝트는 스토어가 탭 저장소에 남깁니다. 저장하지 않은 편집 내용은 여기서 탭 저장소에 남겼다가
 * 다시 열릴 때 편집기에 되돌립니다(onRestore).
 */
export default function GitHubAddon({ controlRef, code, getCode, defaultTitle, shouldRestore, onReady, onProjectChange, onRestore, onLoaded, onSaved }) {
  const project = useGitHubStore((state) => state.project);
  const [mode, setMode] = useState(null); // 'projects' | 'commit' | null
  const started = useRef(false);
  const callbacks = useRef({});
  // 가장 먼저 선언한 효과라 아래 효과들이 실행될 때는 항상 최신 콜백이 들어 있습니다.
  useEffect(() => {
    callbacks.current = { getCode, shouldRestore, onReady, onProjectChange, onRestore };
  });

  // 만들기 화면이 부르는 동작. 스토어를 직접 읽어 항상 최신 상태로 답합니다.
  useEffect(() => {
    controlRef.current = {
      open: (next) => setMode(next === 'commit' ? 'commit' : 'projects'),
      hasProject: () => Boolean(useGitHubStore.getState().project),
      detach: () => { clearProjectDraft(); useGitHubStore.getState().detach(); },
      isDirty: (value) => useGitHubStore.getState().isDirty(value),
    };
    return () => { controlRef.current = null; };
  }, [controlRef]);

  // 처음 한 번: 탭에 남은 연결을 되살리고, 열어 두었던 프로젝트의 코드를 편집기에 돌려줍니다.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const store = useGitHubStore.getState();
    store.restore();
    const restored = useGitHubStore.getState().project;
    if (restored && !callbacks.current.shouldRestore?.()) {
      // 다른 코드(공유 링크·학습 자료 등)로 들어왔으면 프로젝트 연결을 끊어, 저장이 그 코드를 팀 저장소에 올리지 않게 합니다.
      clearProjectDraft();
      useGitHubStore.getState().detach();
    } else if (restored) {
      (async () => {
        let baseline = restored.savedCode;
        if (baseline == null) {
          const pulled = await useGitHubStore.getState().pullLatest();
          if (pulled.status !== 'loaded') return;
          // 읽는 사이 다른 코드를 불러와 연결을 끊었거나 다른 프로젝트를 열었으면 편집기를 건드리지 않습니다.
          if (useGitHubStore.getState().project?.fullName !== restored.fullName) return;
          baseline = pulled.code;
        }
        const draft = readProjectDraft(restored.fullName);
        callbacks.current.onRestore?.({ code: draft ?? baseline, baseline, title: restored.title, restoredDraft: draft != null && draft !== baseline });
      })();
    }
    callbacks.current.onReady?.();
  }, []);

  useEffect(() => {
    callbacks.current.onProjectChange?.(project ? { fullName: project.fullName, title: project.title } : null);
  }, [project]);

  // 저장하지 않은 편집 내용을 탭 저장소에 남깁니다(새로 고침 대비). 저장했거나 프로젝트가 없으면 지웁니다.
  useEffect(() => {
    if (!project) return undefined;
    const timer = setTimeout(() => {
      if (project.savedCode != null && code !== project.savedCode) writeProjectDraft(project.fullName, code);
      else clearProjectDraft();
    }, 800);
    return () => clearTimeout(timer);
  }, [code, project]);

  // 저장하지 않은 팀 프로젝트 변경이 있으면 떠나기 전에 묻습니다.
  useEffect(() => {
    const warn = (event) => {
      if (!useGitHubStore.getState().isDirty(callbacks.current.getCode())) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  if (!mode) return null;
  return (
    <GitHubProjectDialog
      mode={mode}
      getCode={getCode}
      defaultTitle={defaultTitle}
      onLoaded={(loaded, title) => { clearProjectDraft(); onLoaded?.(loaded, title); setMode(null); }}
      onSaved={(result) => { clearProjectDraft(); onSaved?.(result); setMode(null); }}
      onClose={() => setMode(null)}
    />
  );
}
