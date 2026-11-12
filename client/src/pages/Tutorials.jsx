import { Link, useParams, useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import CodeVocabulary from '../components/learning/CodeVocabulary';
import { useI18n } from '../i18n/useI18n';
import { tutorials, getTutorial } from '../data/tutorials';
import { creativeLabs } from '../data/creative-labs';
import { lightSoundLabs } from '../data/light-sound-labs';
import { forgeCharacterTutorial } from '../data/forge-tutorial';
import { welcomeTutorial } from '../data/welcome-friends';
import { cameraViewsTutorial } from '../data/camera-views';

export default function Tutorials() {
  const { tutorialId } = useParams();
  const [searchParams] = useSearchParams();
  const { locale: lang } = useI18n();
  const ko = lang === 'ko';
  const tutorial = getTutorial(tutorialId, searchParams.get('step'));
  const workspaceUrl = tutorial && `/sandbox?tutorial=${tutorial.id}${tutorial.activeStep ? `&step=${tutorial.activeStep}` : ''}`;
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Header />
      <main className="w-full max-w-3xl mx-auto px-6 md:px-10 py-12">
        {tutorialId ? tutorial ? <>
          <Link to="/tutorials" className="text-sm no-underline" style={{ color: 'var(--color-text-secondary)' }}>← {ko ? '튜토리얼' : 'Tutorials'}</Link>
          <p className="text-xs mt-8 mb-3" style={{ color: 'var(--color-accent)' }}>{tutorial.duration?.[lang] || (ko ? '3~5분 기능 체험 · 점수 없이 자유롭게' : '3–5 minute feature experience · No scores')}</p>
          <h1 className="font-display text-3xl font-bold">{tutorial.title[lang]}</h1>
          <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{tutorial.description[lang]}</p>
          {tutorial.id==='forge-character'&&<Link to="/forge" className="btn-secondary no-underline inline-flex mt-5">{ko?'대장간에서 내 캐릭터 만들기':'Make a character in the forge'} →</Link>}
          {tutorial.prerequisite && <p className="mt-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{tutorial.prerequisite[lang]}</p>}
          {tutorial.kind && <p className="mt-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{tutorial.id==='welcome-friend'?(ko?'VPython 기본 도형 · rotate · AI 없이 직접 만들기':'VPython shapes · rotate · Build without AI'):tutorial.id==='forge-character'?(ko?'VPython 기본 도형 · compound · 키보드 · 충돌 거리':'VPython shapes · compound · keyboard · distance'):tutorial.id==='camera-views'?(ko?'VPython 카메라 명령 · scene.center · scene.camera · AI 없이 진행':'VPython camera commands · scene.center · scene.camera · No AI needed'):ko ? 'VPython 기본 도형 사용 · 소리 명령은 VPyLab 확장 · AI 없이 진행' : 'Uses VPython primitives · Sound commands are VPyLab extensions · No AI needed'}</p>}
          {tutorial.modes && <nav aria-label={ko?'만들기 방식':'Build mode'} className="flex flex-wrap gap-3 mt-6">{tutorial.modes.map(mode=><Link key={mode.id} to={'/tutorials/'+tutorial.id+'?step='+mode.id} aria-current={tutorial.activeStep===mode.id?'step':undefined} className={tutorial.activeStep===mode.id?'btn-primary no-underline':'btn-secondary no-underline'}>{mode.title[lang]}</Link>)}</nav>}
          {tutorial.variants && <nav aria-label={tutorial.id==='welcome-friend'?(ko?'만들 친구 고르기':'Choose a friend'):(ko ? '만들기 단계' : 'Creation stages')} className="flex flex-wrap gap-3 mt-6">{tutorial.variants.map(variant => <Link key={variant.id} to={`/tutorials/${tutorial.id}?step=${variant.id}`} aria-current={tutorial.activeStep === variant.id ? 'step' : undefined} className={tutorial.activeStep === variant.id ? 'btn-primary no-underline' : 'btn-secondary no-underline'}>{variant.title[lang]}</Link>)}</nav>}
          {tutorial.stepNote && <p className="mt-5 text-sm leading-relaxed">{tutorial.stepNote[lang]}</p>}
          <pre className="my-6 border p-5 overflow-x-auto text-xs sm:text-sm leading-relaxed" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-panel)' }} tabIndex={0}><code>{tutorial.displayCode || tutorial.code}</code></pre>
          <CodeVocabulary code={tutorial.displayCode || tutorial.code} locale={lang}/>
          {tutorial.supportCode && <details className="mb-6"><summary className="text-sm cursor-pointer">{ko ? '제공 함수 펼치기 · 실습 화면에 함께 들어 있습니다' : 'View supplied function · Included in the workspace'}</summary><pre className="mt-4 border p-4 overflow-x-auto text-xs leading-relaxed" style={{ borderColor: 'var(--color-border)' }} tabIndex={0}><code>{tutorial.supportCode}</code></pre></details>}
          <ol className="list-decimal pl-5 text-sm leading-relaxed space-y-4 mb-8">
            <li>{ko ? '실습 화면을 열고 실행 버튼을 누르세요. 코드를 모두 이해하지 않아도 괜찮아요.' : 'Open the workspace and press Run. You do not need to understand every line.'}</li>
            <li>{tutorial.change[lang]}</li>
            <li>{tutorial.reflect[lang]}</li>
          </ol>
          <Link to={workspaceUrl} className="btn-primary no-underline inline-flex">{ko ? '직접 체험하기' : 'Try it'} →</Link>
          {tutorial.tasks && <section className="mt-10"><h2 className="font-semibold mb-4">{ko ? '내가 정해서 바꾸기' : 'Make your own choices'}</h2><ul className="list-disc pl-5 text-sm space-y-3 leading-relaxed">{tutorial.tasks.map((task, index) => <li key={index}>{task[lang]}</li>)}</ul></section>}
          {tutorial.peerTest && <section className="mt-8"><h2 className="font-semibold mb-3">{ko ? '친구에게 시험하기' : 'Ask a peer to test'}</h2><p className="text-sm leading-relaxed">{tutorial.peerTest[lang]}</p></section>}
          {tutorial.team && <section className="mt-8"><h2 className="font-semibold mb-4">{ko ? '함께 만드는 방법' : 'Working together'}</h2><ol className="list-decimal pl-5 text-sm space-y-3 leading-relaxed">{tutorial.team.map((step, index) => <li key={index}>{step[lang]}</li>)}</ol></section>}
          {tutorial.tips && <details className="mt-8 text-sm"><summary className="cursor-pointer">{ko ? '막혔을 때 확인하기' : 'When you get stuck'}</summary><ul className="list-disc pl-5 mt-4 space-y-3 leading-relaxed">{tutorial.tips.map((tip, index) => <li key={index}>{tip[lang]}</li>)}</ul><p className="mt-4">{ko ? '실습 화면의 변경분은 먼저 저장하세요. 실습 화면의 도구 → 초기 코드로 돌아가기를 누르면 이 단계의 시작 코드로 돌아갑니다.' : 'Save your changes first. Use Reset in the workspace to return to this stage’s starting code.'}</p></details>}
          {tutorial.extensionId && <p className="mt-8 text-sm"><Link to={`/tutorials/${tutorial.extensionId}`} style={{ color: 'var(--color-accent)' }}>{ko ? '선택 심화: 삼각형으로 만든 반구와 돔 →' : 'Optional extension: a hemisphere and dome made of triangles →'}</Link></p>}
          <p className="mt-8 text-sm"><Link to="/missions" style={{ color: 'var(--color-accent)' }}>{ko ? '차근차근 배우려면 트레이닝으로 →' : 'Learn step by step with training →'}</Link></p>
        </> : <>
          <h1 className="text-2xl font-bold mb-6">{ko ? '체험을 찾을 수 없습니다.' : 'Experience not found.'}</h1>
          <Link to="/tutorials" style={{ color: 'var(--color-accent)' }}>{ko ? '튜토리얼 목록으로' : 'Back to tutorials'}</Link>
        </> : <>
          <h1 className="font-display text-3xl font-bold mb-4">{ko ? '튜토리얼' : 'Tutorials'}</h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--color-text-secondary)' }}>{ko ? 'VPyLab으로 무엇을 할 수 있을까요? 기능마다 3~5분, 실행하고 한 가지만 바꿔보세요. 원하는 체험부터 시작해도 됩니다.' : 'What can you do with VPyLab? Try a feature in 3–5 minutes and change one thing. Start anywhere.'}</p>
          <div className="grid sm:grid-cols-2 gap-4">{tutorials.map(item => <Link key={item.id} to={`/tutorials/${item.id}`} className="block border p-6 no-underline" style={{ color: 'inherit', borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-panel)' }}><h2 className="font-semibold mb-3">{item.title[lang]}</h2><p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{item.description[lang]}</p><p className="text-xs mt-5" style={{ color: 'var(--color-accent)' }}>{ko ? '체험하기' : 'Try it'} →</p></Link>)}</div>
          <section className="mt-12"><h2 className="font-display text-xl font-bold mb-3">{ko ? '만들며 탐구하기' : 'Explore by making'}</h2><p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-text-secondary)' }}>{ko ? '짧은 체험 다음에 골라 보세요. 예상 → 실행 → 코드 살펴보기 → 변형 → 내 작품 순서로, 친구의 해석을 듣고 고칩니다. 점수나 정해진 정답은 없습니다.' : 'Choose after a short experience. Predict, run, investigate, modify, and make; revise after hearing a peer’s interpretation. No scores or single correct design.'}</p><div className="space-y-4">{[...lightSoundLabs,welcomeTutorial,forgeCharacterTutorial,cameraViewsTutorial,...creativeLabs].map(item => <Link key={item.id} to={`/tutorials/${item.id}`} className="block border p-6 no-underline" style={{ color: 'inherit', borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-panel)' }}><p className="text-xs mb-2" style={{ color: 'var(--color-accent)' }}>{item.duration[lang]}</p><h3 className="font-semibold mb-2">{item.title[lang]}</h3><p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{item.description[lang]}</p><p className="text-xs mt-3" style={{ color: 'var(--color-text-secondary)' }}>{item.prerequisite?.[lang]}</p></Link>)}</div></section>
          <Link to="/missions" className="inline-block mt-8 text-sm" style={{ color: 'var(--color-accent)' }}>{ko ? '코딩이 처음이라면 트레이닝의 기초 코스부터 →' : 'New to coding? Start the foundation course in Training →'}</Link>
        </>}
      </main>
    </div>
  );
}
