import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import { useI18n } from '../i18n/useI18n';
import '../components/home/home.css';
import { writePersonalHome } from '../utils/personal-home';
import usePersonalHome from '../hooks/usePersonalHome';
import HomePreviewBoundary from '../components/home/HomePreviewBoundary';
import HomeSettingsDialog from '../components/home/HomeSettingsDialog';
import StillFriend from '../components/home/WelcomeStill';
function WelcomeFallback({ko}) { return <section className="welcome-friends"><div className="welcome-stage"><StillFriend id="dumpling"/></div><div className="welcome-actions"><Link to="/tutorials/welcome-friend?step=dumpling">{ko?'이 친구, 내 코드로 만들기':'Build this friend with code'} →</Link></div></section>; }
const WelcomeFriends = lazy(() => import('../components/home/WelcomeFriends').catch(() => ({default:WelcomeFallback})));

const PersonalHomeProject=lazy(()=>import('../components/home/PersonalHomeProject'));

export default function Home() {
  const { locale } = useI18n();
  const ko = locale === 'ko';
  const home=usePersonalHome(),[settings,setSettings]=useState(false);
  const personal=home?.enabled===false?null:home;
  const saveLights=lights=>writePersonalHome({lights});
  const paths = [
    { number: '01', title: ko ? '트레이닝' : 'Training', description: ko ? '변수부터 반복까지, 작은 작품을 만들며 차근차근 배워요.' : 'Learn step by step, from variables to loops and a small project.', to: '/missions' },
    { number: '02', title: ko ? '튜토리얼' : 'Tutorials', description: ko ? '빛과 소리, 움직임과 클릭. 궁금한 기능부터 짧게 체험해요.' : 'Explore light, sound, motion, and clicks in a short experience.', to: '/tutorials' },
    { number: '03', title: ko ? '대장간' : 'Forge', description: ko ? '캐릭터와 물건을 다듬고, 내 작품에 쓸 부품으로 가져가요.' : 'Shape characters and objects, then reuse them in your project.', to: '/forge' },
  ];
  return (
    <div className="min-h-screen w-full min-w-0 flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', ...(personal?.background?{backgroundImage:'linear-gradient(135deg,'+personal.background+'38,transparent 65%)'}:{}) }}>
      <Header />
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 md:px-10">
        <div className="home-customize-entry"><button type="button" onClick={()=>setSettings(true)}>{ko?'내 메인 꾸미기':'Customize my home'}</button></div>
        <section className="home-hero">
          <div>
          <p className="text-xs font-semibold tracking-widest mb-6" style={{ color: 'var(--color-accent)' }}>{ko ? '코드가 눈앞의 작품으로, VPyLab' : 'YOUR CODE COMES TO LIFE, VPyLab'}</p>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight leading-tight max-w-3xl">{personal?.greeting|| (ko ? <>빛과 소리로 만드는<br />나의 첫 코딩.</> : <>Your first code.<br />Light, sound, and ideas.</>)}</h1>
          <p className="mt-6 text-base md:text-lg leading-relaxed max-w-xl" style={{ color: 'var(--color-text-secondary)' }}>{ko ? '작은 도형으로 친구를 만들고, 움직임과 소리를 더해 보세요. 나만의 아이디어가 눈앞에서 살아나요.' : 'Make a friend from simple shapes. Add motion and sound, and bring your ideas to life.'}</p>
          <div className="mt-8 flex items-center gap-x-6 gap-y-4 flex-wrap">
            <Link to="/missions" className="btn-primary no-underline inline-flex items-center gap-5">{ko ? '트레이닝 시작하기' : 'Start training'} <span aria-hidden="true">→</span></Link>
            <Link to="/sandbox" className="text-sm font-medium no-underline py-3" style={{ color: 'var(--color-text-secondary)' }}>{ko ? '바로 만들기' : 'Create now'} <span aria-hidden="true">↗</span></Link>
          </div>
          <p className="mt-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{ko ? '설치나 로그인 없이 시작할 수 있어요.' : 'Start without installing or signing in.'}</p>
          </div>
          <Suspense fallback={<div className="welcome-friends" aria-hidden="true"><div className="welcome-stage" /></div>}>{personal?.showProject!==false&&personal?.project?<HomePreviewBoundary key={personal.project.code} project={personal.project} ko={ko}><PersonalHomeProject project={personal.project} ko={ko}/></HomePreviewBoundary>:<WelcomeFriends ko={ko} lightSettings={home?.lights} onLightChange={saveLights}/>}</Suspense>
        </section>
        <section className="pb-14" aria-labelledby="learning-path-title">
          <h2 id="learning-path-title" className="text-sm font-semibold pb-5" style={{ borderBottom: '1px solid var(--color-border)' }}>{ko ? '체험에서 내 작품까지' : 'From trying to creating'}</h2>
          <ol className="home-paths">{paths.map(path => <li key={path.to}><Link to={path.to}><span className="home-path-number" aria-hidden="true">{path.number}</span><h3>{path.title} <span aria-hidden="true">↗</span></h3><p>{path.description}</p></Link></li>)}</ol>
        </section>
      </main>
      {settings&&<HomeSettingsDialog ko={ko} onClose={()=>setSettings(false)}/>}
      <footer className="w-full max-w-6xl mx-auto px-6 md:px-10 pb-8 text-xs flex justify-between gap-5 flex-wrap" style={{ color: 'var(--color-text-secondary)' }}>
        <Link to="/sandbox" className="no-underline" style={{ color: 'inherit' }}>{ko ? '바로 만들기 →' : 'Create now →'}</Link>
        <div className="flex gap-5"><Link to="/guide" className="no-underline" style={{ color: 'inherit' }}>{ko ? '사용 안내' : 'Guide'}</Link><Link to="/privacy" className="no-underline" style={{ color: 'inherit' }}>{ko ? '개인정보 처리방침' : 'Privacy'}</Link></div>
      </footer>
    </div>
  );
}
