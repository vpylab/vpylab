import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import { getGlowscriptProject } from '../data/glowscript-projects';
import { useI18n } from '../i18n/useI18n';

export default function SourceProject() {
  const { projectId } = useParams();
  const { locale } = useI18n();
  const ko = locale === 'ko';
  const project = getGlowscriptProject(projectId);
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!project) return;
    const controller = new AbortController();
    fetch(project.sourcePath, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('source-load-failed');
      return response.json();
    }).then(data => { setLoaded({ id: project.id, data }); setError(null); }).catch(reason => {
      if (reason.name !== 'AbortError') setError(project.id);
    });
    return () => controller.abort();
  }, [project]);
  const data = loaded?.id === projectId ? loaded.data : null;
  return <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
    <Header />
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link to="/gallery/glowscript" className="text-sm" style={{ color: 'var(--color-accent)' }}>← {ko ? '갤러리' : 'Gallery'}</Link>
      {!project ? <h1 className="text-2xl my-8">{ko ? '프로젝트를 찾을 수 없습니다.' : 'Project not found.'}</h1> : <>
        <p className="text-xs mt-8 mb-3" style={{ color: 'var(--color-text-secondary)' }}>{ko ? project.credit : project.kind==='student' ? 'Student project' : 'Teacher/reference project'} · {project.folder}</p>
        <h1 className="font-display text-3xl font-bold mb-5 break-words">{project.title}</h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-text-secondary)' }}>{ko ? '완성된 작품을 보고, 어떤 규칙과 코드로 만들었는지 살펴보세요. 전체를 따라 만드는 필수 과제는 아닙니다.' : 'Explore the finished project and the rules behind it. Recreating the entire project is optional.'}</p>
        {project.thumbnail && <img src={project.thumbnail} alt={project.title} className="w-full max-h-72 object-contain border mb-6" style={{ borderColor: 'var(--color-border)', backgroundColor: '#111827' }} />}
        <div className="flex gap-4 flex-wrap mb-5">
          <a href={project.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn-primary no-underline">{ko ? 'GlowScript 원작 실행' : 'Run the GlowScript original'} ↗</a>
          {project.pythonCheck === 'ready' && <Link to={`/sandbox?showcase=${project.id}`} className="btn-secondary no-underline">{ko ? 'VPyLab에서 코드 실험' : 'Experiment in VPyLab'} →</Link>}
        </div>
        <p className="text-xs leading-relaxed mb-8" style={{ color: 'var(--color-text-secondary)' }}>{project.pythonCheck === 'ready' ? (ko ? 'VPyLab용 코드는 Python API 실행을 확인했습니다. 화면·외부 이미지·게임 조작은 원작과 다를 수 있어요. 계속 움직이는 작품은 정지 버튼으로 멈추세요.' : 'The imported code passed a Python API run check. Rendering, external images, and controls may differ. Use Stop for continuous animations.') : (ko ? '이 자료는 원본 링크와 코드를 보존했습니다. 실행은 GlowScript 원작에서 확인하세요.' : 'The original link and code are preserved. Use GlowScript to run this project.')}</p>
        {data?.adaptations?.length > 0 && <details className="border p-5 mb-5" style={{ borderColor: 'var(--color-border)' }}>
          <summary className="text-sm font-semibold cursor-pointer">{ko ? 'VPyLab 실행용 수정 사항' : 'Changes for VPyLab'}</summary>
          <ul className="text-sm leading-relaxed list-disc pl-5 mt-4 space-y-2">{data.adaptations.map(note => <li key={note}>{note}</li>)}</ul>
          <p className="text-xs mt-4">{ko ? '아래 원본 코드는 그대로 보존했습니다.' : 'The original code below is preserved.'}</p>
        </details>}
        <details className="border p-5" style={{ borderColor: 'var(--color-border)' }}>
          <summary className="text-sm font-semibold cursor-pointer">{ko ? '원본 코드와 출처' : 'Original code and source'}</summary>
          <p className="text-xs my-4 break-words">{project.originalName} · greatsong21 / {project.folder}</p>
          {error === project.id ? <p role="alert">{ko ? '코드를 불러오지 못했습니다. 원본 링크에서 확인해주세요.' : 'Could not load the code. Open the original link.'}</p> : data ? <pre className="text-xs leading-relaxed overflow-x-auto" tabIndex={0}><code>{data.source}</code></pre> : <p className="text-sm">{ko ? '코드를 불러오는 중입니다.' : 'Loading code.'}</p>}
        </details>
      </>}
    </main>
  </div>;
}
