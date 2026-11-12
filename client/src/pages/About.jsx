import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import { useI18n } from '../i18n/useI18n';
import { TEAM_PROJECTS } from '../lib/api-base';

export default function About() {
  const { t, messages } = useI18n();
  const features = [
    { icon: '🐍', key: 'python' },
    { icon: '📚', key: 'courses' },
    { icon: '🎯', key: 'grading' },
    { icon: '🎵', key: 'sound' },
    // 팀 프로젝트(GitHub)가 설정되지 않은 사이트에서는 소개하지 않습니다.
    ...(TEAM_PROJECTS ? [{ icon: '🤝', key: 'team' }] : []),
    { icon: '🎨', key: 'gallery' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold mb-3 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            {t('about.title')}
          </h1>
          <p className="text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {t('about.vision')}
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            {t('about.learningTitle')}
          </h2>
          <ul className="list-disc pl-5 space-y-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {messages.about.learningItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            {t('about.featTitle')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map(({ icon, key }) => (
              <div
                key={key}
                className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)' }}
              >
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <span aria-hidden="true">{icon}</span>
                  {t(`about.feat.${key}`)}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {t(`about.feat.${key}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex gap-3 flex-wrap">
          <Link to="/missions" className="btn-primary no-underline">{t('nav.missions')}</Link>
          <Link to="/tutorials" className="btn-secondary no-underline">{t('nav.tutorials')}</Link>
          <Link to="/guide" className="btn-secondary no-underline">{t('nav.guide')}</Link>
        </div>
      </main>
    </div>
  );
}
