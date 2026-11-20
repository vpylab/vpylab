import { useEffect, useState } from 'react';
import RuntimePanel from '../classroom/RuntimePanel.jsx';
import '../index.css';
import '../classroom/classroom.css';
import './month-projects.css';

const files = import.meta.glob([
  '../../../demos/month-projects/*/main.py',
  '../../../demos/month-projects/*/milestones/*.py',
  '../../../demos/month-projects/*/scaffolds/*.py',
], { eager: true, query: '?raw', import: 'default' });
const documents = import.meta.glob('../../../demos/month-projects/**/*.json', { eager: true, import: 'default' });
const prefix = '../../../demos/month-projects/';
const teams = [
  { id: 'original', label: '순수 창작', color: '#087e8b', symbol: '01', camera: [0, 28, 32] },
  { id: 'course', label: '수업 코드 활용', color: '#6054b3', symbol: '02', camera: [0, 4, 24] },
  { id: 'remix', label: '공개 프로젝트 리믹스', color: '#b05f20', symbol: '03', camera: [0, 0, 24] },
];
const verification = documents[`${prefix}verification.json`] || { teams: {} };
function selectedTeam() { return teams.some(team => team.id === location.hash.slice(1)) ? location.hash.slice(1) : 'original'; }
function download(value, name, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function printable(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(printable).join(' · ');
  return value && typeof value === 'object' ? Object.values(value).map(printable).join(' · ') : String(value ?? '');
}

export default function MonthProjects() {
  const [teamId, setTeamId] = useState(selectedTeam);
  const [lessonIndex, setLessonIndex] = useState(7);
  const [runResult, setRunResult] = useState(null);
  useEffect(() => {
    const change = () => { setTeamId(selectedTeam()); setLessonIndex(7); setRunResult(null); };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const team = teams.find(item => item.id === teamId);
  const learning = documents[`${prefix}${teamId}/learning.json`];
  if (!learning) return <main className="classroom-shell cr-main"><h1>작품 자료를 준비하고 있습니다.</h1></main>;
  const lessons = learning.lessons || [];
  const lesson = lessons[lessonIndex] || {};
  const code = files[`${prefix}${teamId}/${lessonIndex === 7 ? 'main.py' : `milestones/${String(lessonIndex + 1).padStart(2, '0')}.py`}`] || '';
  const proof = verification.teams?.[teamId];
  const scaffold = Array.isArray(learning.scaffolding) ? learning.scaffolding : Object.values(learning.scaffolding || {});
  const starterName = { original: '06-ui-starter.py', course: '07-ui-starter.py', remix: '05-ui-starter.py' }[teamId];
  const starterCode = files[`${prefix}${teamId}/scaffolds/${starterName}`];
  return (
    <div className="classroom-shell month-shell" style={{ '--month-accent': team.color }}>
      <header className="cr-header"><a className="cr-brand" href="/month-projects.html">VPyLab <small>한 달의 실험</small></a><span className="cr-preview-badge">로컬 테스트 작품</span></header>
      <main className="month-main">
        <div className="month-intro"><span className="cr-eyebrow">만들고, 비교하고, 동료와 고치기</span><h1>세 팀, 여덟 번의 발전.</h1><p>정규 정보 수업 이후 8차시를 가정한 합성 프로젝트입니다. 실제 학생의 성취나 한 달간의 활동을 측정한 자료는 아닙니다.</p></div>
        <nav className="month-teams" aria-label="완성 작품 선택">{teams.map(item => <a key={item.id} href={`#${item.id}`} className={item.id === teamId ? 'active' : ''} aria-current={item.id === teamId ? 'page' : undefined}><span>{item.symbol}</span>{item.label}</a>)}</nav>
        <section className="month-title"><div><span className="cr-eyebrow">{team.label} · 8차시 프로젝트</span><h2>{learning.title}</h2><p>{learning.subtitle}</p></div><div className="month-links"><button className="cr-button" onClick={() => download(files[`${prefix}${teamId}/main.py`], `${teamId}-main.py`)}>완성 코드 받기 ↓</button>{proof && <a className="cr-button" href={`/classroom.html#/projects/${proof.projectId}/process`} target="_blank" rel="noreferrer">협력 과정·개별 피드백 ↗</a>}</div></section>
        <div className="month-workbench">
          <div className="month-experiment"><div className="month-run-heading"><h3>{lessonIndex === 7 ? '완성 작품 실행' : `${lessonIndex + 1}차시 중간 작품`}</h3><span>Python 준비 후 ▶ 실행을 누르세요</span></div><RuntimePanel key={`${teamId}-${lessonIndex}`} code={code} onRunResult={setRunResult} initialCameraPosition={team.camera} />{runResult?.status === 'error' && <p role="alert">실행 기록의 오류를 확인해주세요.</p>}</div>
          <aside className="month-guide cr-panel"><span className="cr-eyebrow">직접 해보기</span><h3>이렇게 실험해 보세요</h3><ol>{(learning.instructions || []).map((item, index) => <li key={index}>{printable(item)}</li>)}</ol><h3>완성된 기능</h3><ul>{(learning.features || []).map((item, index) => <li key={index}>{printable(item)}</li>)}</ul><p className="month-tip">색에는 이름·수치·범례를 함께 씁니다. 소리는 위의 음량과 음소거로 조절할 수 있습니다. AI 없이도 모든 기능을 실행할 수 있습니다.</p>{proof && <div className="month-proof"><h3>실제 비공개 GitHub 시험</h3><a href={proof.issue.url} target="_blank" rel="noreferrer">팀 문제 정의 · Issue #{proof.issue.number} ↗</a><a href={proof.pull.url} target="_blank" rel="noreferrer">완성 코드 · PR #{proof.pull.number} ↗</a><a href={proof.approval.url} target="_blank" rel="noreferrer">다른 계정의 승인 ↗</a><p>실제 계정 두 개로 확인한 시험 기록입니다. 원문은 저장소 접근 권한이 필요합니다.</p></div>}</aside>
        </div>
        <section className="month-learning cr-panel"><div className="cr-section-heading"><h2>여덟 차시의 발전 과정</h2><button className="cr-button small" onClick={() => download(JSON.stringify(learning, null, 2), `${teamId}-learning.json`, 'application/json')}>학습 설계 받기 ↓</button></div><div className="month-lessons" role="group" aria-label="차시별 코드 선택">{lessons.map((item, index) => <button key={index} className={index === lessonIndex ? 'active' : ''} aria-pressed={index === lessonIndex} onClick={() => { setLessonIndex(index); setRunResult(null); }}><b>{index + 1}차시</b><span>{item.title}</span></button>)}</div><div className="month-reflection"><h3>{lesson.question || lesson.title}</h3><dl>{[['가설', lesson.hypothesis], ['관찰 계획·예시', lesson.observation], ['판단한 이유', lesson.reasoning], ['동료의 검토', lesson.reviewerComment], ['다음 실험', lesson.nextStep]].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{printable(value)}</dd></div>)}</dl></div><details className="month-code"><summary>{lessonIndex + 1}차시 Python 코드 살펴보기 · {code.split('\n').length}줄</summary><pre>{code}</pre></details></section>
        <div className="month-bottom"><section className="cr-panel"><h3>막힐 때의 도움</h3>{starterCode && <button className="cr-button small" onClick={() => download(starterCode, `${teamId}-${starterName}`)}>학생용 미완성 골격 받기 ↓</button>}<ol>{scaffold.map((item, index) => <li key={index}>{printable(item)}</li>)}</ol></section><section className="cr-panel"><h3>출발점과 재사용</h3><p>{printable(learning.provenance)}</p><p className="month-tip">차시 선택은 중간 코드로 바뀝니다. 완성 작품으로 돌아가려면 8차시를 선택하고 다시 실행하세요.</p></section></div>
      </main>
    </div>
  );
}

