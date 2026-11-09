import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import { useI18n } from '../i18n/useI18n';
import { getMissionById } from '../data/missions';
import { trainingCourses, trainingSteps } from '../data/training';
import useAppStore from '../stores/appStore';

const physicalMissionIds = ['PC-1', 'PC-2', 'PC-3'];

export default function Missions() {
  const { locale: lang } = useI18n();
  const ko = lang === 'ko';
  const progress = useAppStore(s => s.missionProgress);
  const next = trainingSteps.find(step => !progress[step.missionId]?.passed);
  const completed = trainingSteps.filter(step => progress[step.missionId]?.passed).length;
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Header />
      <main className="w-full max-w-3xl mx-auto px-6 md:px-10 py-12">
        <h1 className="font-display text-3xl font-bold mb-4">{ko ? '트레이닝' : 'Training'}</h1>
        <p className="text-sm leading-relaxed mb-10" style={{ color: 'var(--color-text-secondary)' }}>{ko ? '작은 작품을 완성하는 트레이닝 코스입니다. 처음이라면 기초부터, 문법을 배웠다면 핵심 연습부터 시작하세요.' : 'Training courses for finishing a small project. Start with foundations, or try core practice if you know the basics.'}</p>
        <section aria-labelledby="foundation-title" className="border p-6 mb-8" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-panel)' }}>
          <p className="text-xs mb-3" style={{ color: 'var(--color-accent)' }}>{ko ? '처음이라면 여기부터 · 기초 8차시' : 'Start here · 8 foundation lessons'}</p>
          <h2 id="foundation-title" className="font-display text-xl font-bold mb-3">{trainingCourses[0].title[lang]}</h2>
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-text-secondary)' }}>{trainingCourses[0].description[lang]}</p>
          <p className="text-xs mb-5" style={{ color: 'var(--color-text-secondary)' }}>{trainingCourses[0].prerequisite[lang]}</p>
          <Link to={`/courses/${trainingCourses[0].id}`} className="btn-primary no-underline inline-flex">{ko ? '기초 코스 시작하기' : 'Start foundations'} →</Link>
        </section>
        <section aria-labelledby="practice-title" className="mb-10">
          <div className="flex justify-between items-center gap-4 mb-3"><h2 id="practice-title" className="font-display text-xl font-bold">{ko ? '배운 것을 내 힘으로' : 'Practice on your own'}</h2><span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{completed} / {trainingSteps.length} {ko ? '조건 확인' : 'checks passed'}</span></div>
          <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-text-secondary)' }}>{ko ? '기초를 배운 뒤 선택하는 6단계 연습입니다. 변수·반복·조건·리스트를 도움을 조금씩 줄이며 연습합니다. 순서는 추천이며 어느 단계든 열 수 있어요.' : 'An optional six-step practice course after foundations. Practice variables, loops, conditions, and lists with less help. Follow the suggested order or open any step.'}</p>
          {next && <Link to={`/mission/${next.missionId}`} className="text-sm inline-block mb-5" style={{ color: 'var(--color-accent)' }}>{ko ? (completed ? '이어서 연습하기' : '핵심 연습 시작하기') : (completed ? 'Continue practice' : 'Start core practice')} →</Link>}
          <ol>{trainingSteps.map((step, index) => {
            const mission = getMissionById(step.missionId);
            return <li key={step.missionId} className="border-t" style={{ borderColor: 'var(--color-border)' }}><Link to={`/mission/${step.missionId}`} className="flex gap-4 py-5 no-underline" style={{ color: 'inherit' }}><span className="font-mono text-xs pt-1" style={{ color: 'var(--color-accent)' }}>{index + 1}</span><div className="flex-1 min-w-0"><p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>{step.focus[lang]}</p><h3 className="font-semibold text-sm">{mission.title[lang]}</h3><p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{step.reflect[lang]}</p></div><span className="text-xs shrink-0" style={{ color: 'var(--color-accent)' }}>{progress[step.missionId]?.passed ? (ko ? '조건 확인됨' : 'Checked') : '→'}</span></Link></li>;
          })}</ol>
          <p className="text-xs leading-relaxed mt-4" style={{ color: 'var(--color-text-secondary)' }}>{ko ? '자동 검사는 코드의 조건을 확인합니다. 왜 바꿨는지 설명하고, 다른 값에서도 되는지 살펴보며 마무리하세요. 이 기기의 연습 기록은 그대로 이어집니다.' : 'Automatic checks verify code conditions. Explain your changes and try other values to finish. Practice records on this device are preserved.'}</p>
        </section>
        <section aria-labelledby="physical-title" className="mb-10">
          <p className="text-xs mb-2" style={{ color: 'var(--color-accent)' }}>{ko ? '시범 운영 · 피지컬 컴퓨팅 시뮬레이션' : 'Pilot · Physical computing simulation'}</p>
          <h2 id="physical-title" className="font-display text-xl font-bold mb-3">{ko ? '센서로 읽고, 판단하고, 빛과 소리로 알리기' : 'Sense, decide, and signal with light and sound'}</h2>
          <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-text-secondary)' }}>{ko ? '장면과 친구들은 미리 준비되어 있으며 여러분은 센서 함수가 값을 돌려주게 하고 조건문으로 알맞은 출력 장치를 실행하는 일을 합니다. 이는 실제 피지컬 컴퓨팅의 흐름인 센서로 읽고, 판단하고, 빛과 소리로 알리는 과정과 같습니다.' : 'The scene and friends are ready. Make the sensor function return a value, then call the right output with a condition.'}</p>
          <ol>{physicalMissionIds.map((id, index) => {
            const mission = getMissionById(id);
            return <li key={id} className="border-t" style={{ borderColor: 'var(--color-border)' }}><Link to={`/mission/${id}`} className="flex gap-4 py-5 no-underline" style={{ color: 'inherit' }}><span className="font-mono text-xs pt-1" style={{ color: 'var(--color-accent)' }}>{index + 1}</span><div className="flex-1 min-w-0"><h3 className="font-semibold text-sm">{mission.title[lang]}</h3><p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{mission.description[lang]}</p></div><span className="text-xs shrink-0" style={{ color: 'var(--color-accent)' }}>{progress[id]?.passed ? (ko ? '조건 확인됨' : 'Checked') : '→'}</span></Link></li>;
          })}</ol>
        </section>
        <p className="text-sm leading-relaxed mb-10"><Link to="/tutorials" style={{ color: 'var(--color-accent)' }}>{ko ? '연습한 것으로 내 작품을 만들고 싶다면 튜토리얼의 만들며 탐구하기로 →' : 'Use your practice in a project: Explore by making in Tutorials →'}</Link></p>
        <section aria-labelledby="sharing-title" className="border-t pt-6" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>{ko ? '작품을 만든 다음 · 선택 4차시' : 'After making a project · 4 optional lessons'}</p>
          <h2 id="sharing-title" className="font-display text-xl font-bold mb-3">{trainingCourses[1].title[lang]}</h2>
          <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{trainingCourses[1].description[lang]}</p>
          <p className="text-xs mb-5" style={{ color: 'var(--color-text-secondary)' }}>{trainingCourses[1].prerequisite[lang]}</p>
          <Link to={`/courses/${trainingCourses[1].id}`} className="text-sm" style={{ color: 'var(--color-accent)' }}>{ko ? '저장과 공유 코스 열기' : 'Open saving and sharing'} →</Link>
        </section>
      </main>
    </div>
  );
}
