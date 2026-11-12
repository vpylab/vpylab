import { useUiText } from "../../i18n/ui-text";
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n/useI18n';
import useAppStore from '../../stores/appStore';
import useAuthStore from '../../stores/authStore';
import { prewarm } from '../../engine/pyodide-singleton';
import { DRIVE_SAVE, GITHUB_GALLERY, SERVER_FEATURES } from '../../lib/api-base.js';
import BrandLogo from '../shared/BrandLogo';
import { InstallButton, IosInstallHint } from './InstallPrompt';

export default function Header() {
  const ui = useUiText();
  const { theme, setTheme, locale, setLocale, THEMES, THEME_META } = useAppStore();
  const { user, profile, signOut, setAuthModalOpen } = useAuthStore();
  const isTeacher = useAuthStore(s => s.isTeacher());
  const { t } = useI18n();
  const ko = locale === 'ko';
  const [openMenu, setOpenMenu] = useState(null);
  const rootRef = useRef(null);
  const moreRef = useRef(null);
  const accountRef = useRef(null);
  const menuId = useId();
  const location = useLocation();
  const primary = [
    { label: ko ? '트레이닝' : 'Training', path: '/missions' },
    { label: ko ? '만들기' : 'Create', path: '/sandbox' },
    { label: ko ? '튜토리얼' : 'Tutorials', path: '/tutorials' },
    { label: ko ? '대장간' : 'Forge', path: '/forge' },
    ...(SERVER_FEATURES || GITHUB_GALLERY ? [{ label: ko ? '갤러리' : 'Gallery', path: '/gallery' }] : []),
    { label: t('nav.docs'), path: '/docs', reference: true },
    { label: ko ? '사용 안내' : 'Guide', path: '/guide' },
  ];
  const resources = [
    { label: ko ? 'VPyLab 소개' : 'About VPyLab', path: '/about' },
    ...(isTeacher ? [{ label: t('nav.dashboard'), path: '/dashboard' }] : []),
  ];
  useEffect(() => {
    const outside = event => { if (!rootRef.current?.contains(event.target)) setOpenMenu(null); };
    const escape = event => {
      if (event.key !== 'Escape' || !openMenu) return;
      setOpenMenu(null);
      (openMenu === 'account' ? accountRef : moreRef).current?.focus();
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, [openMenu]);
  useEffect(() => {
    setOpenMenu(null); // eslint-disable-line react-hooks/set-state-in-effect
  }, [location.pathname]);
  const active = path => location.pathname === path || location.pathname.startsWith(path + '/')
    || (path === '/missions' && (location.pathname.startsWith('/courses/') || location.pathname.startsWith('/mission/')));
  const linkStyle = path => ({ color: active(path) ? 'var(--color-accent)' : 'var(--color-text-secondary)' });
  const menuStyle = { backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' };
  return (
    <header ref={rootRef} className="sticky top-0 z-50 h-14 shrink-0 w-full min-w-0 flex items-center gap-4 border-b px-5 md:px-8" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
      <Link to="/" className="no-underline mr-auto shrink-0" aria-label={ui("VPyLab 홈")}><BrandLogo size={26} inverse={!!THEME_META[theme]?.dark} /></Link>
      <nav aria-label={ko ? '주 메뉴' : 'Main navigation'} className="hidden lg:flex items-center gap-4 xl:gap-5 mr-1">
        {primary.map(item => <Link key={item.path} to={item.path} aria-current={active(item.path) ? 'page' : undefined} className={`no-underline whitespace-nowrap text-sm font-medium py-3 ${item.reference ? 'ml-2 pl-5 border-l' : ''}`} style={{...linkStyle(item.path), borderColor: 'var(--color-border)'}} onMouseEnter={() => { if (item.path === '/sandbox') prewarm(); }}>{item.label}</Link>)}
      </nav>
      <div className="relative">
        <button ref={moreRef} type="button" aria-expanded={openMenu === 'more'} aria-controls={`${menuId}-more`} onClick={() => setOpenMenu(openMenu === 'more' ? null : 'more')} className="text-sm cursor-pointer border-0 bg-transparent py-2 px-1" style={{ color: 'var(--color-text-secondary)' }}><span className="hidden lg:inline">{ko ? '더 보기' : 'More'}</span><span className="lg:hidden">{ko ? '메뉴' : 'Menu'}</span> <span aria-hidden="true">⌄</span></button>
        {openMenu === 'more' && (
          <div id={`${menuId}-more`} className="absolute right-0 top-full mt-3 w-60 max-h-[calc(100dvh-80px)] overflow-y-auto p-3" style={menuStyle}>
            <nav aria-label={ko ? '전체 메뉴' : 'All navigation'}>
              <div className="lg:hidden mb-2 pb-2" style={{ borderBottom: '1px solid var(--color-border)' }}>{primary.map(item => <Link key={item.path} to={item.path} aria-current={active(item.path) ? 'page' : undefined} onClick={() => setOpenMenu(null)} className="block px-3 py-2.5 text-sm no-underline font-semibold" style={linkStyle(item.path)}>{item.label}</Link>)}</div>
              {resources.map(item => <Link key={item.path} to={item.path} className="block px-3 py-2.5 text-sm no-underline hover:underline" style={linkStyle(item.path)}>{item.label}</Link>)}
            </nav>
            <div className="mt-3 pt-4 px-3 space-y-4 text-xs" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
              <label className="flex items-center justify-between gap-3">{ko ? '언어' : 'Language'}<select aria-label={ko ? '언어' : 'Language'} value={locale} onChange={event => setLocale(event.target.value)} className="py-1 px-2 border max-w-32" style={{ backgroundColor: 'var(--color-bg-panel)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}><option value="ko">{ui("한국어")}</option><option value="en">English</option></select></label>
              <label className="flex items-center justify-between gap-3">{t('settings.theme')}<select aria-label={t('settings.theme')} value={theme} onChange={event => setTheme(event.target.value)} className="py-1 px-2 border max-w-32" style={{ backgroundColor: 'var(--color-bg-panel)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>{THEMES.map(value => <option key={value} value={value}>{ui(THEME_META[value]?.label)}</option>)}</select></label>
              <InstallButton />
            </div>
          </div>
        )}
      </div>
      {user ? (
        <div className="relative">
          <button ref={accountRef} type="button" aria-expanded={openMenu === 'account'} aria-label={ko ? '내 계정' : 'My account'} onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')} className="border bg-transparent cursor-pointer text-xs px-3 py-2 max-w-28 truncate" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>{profile?.display_name || t('auth.user')}</button>
          {openMenu === 'account' && <div className="absolute right-0 top-full mt-3 w-44 p-3" style={menuStyle}><p className="text-xs font-semibold px-2 py-2 break-words" style={{ color: 'var(--color-text-primary)' }}>{profile?.display_name || t('auth.user')}</p><button onClick={() => { signOut(); setOpenMenu(null); }} className="text-xs cursor-pointer border-0 bg-transparent text-left px-2 py-2 w-full" style={{ color: 'var(--color-error)' }}>{t('auth.logout')}</button></div>}
        </div>
      ) : SERVER_FEATURES && !DRIVE_SAVE && <button onClick={() => setAuthModalOpen(true)} className="text-xs py-2 px-3 cursor-pointer border bg-transparent shrink-0" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>{t('auth.login')}</button>}
      <IosInstallHint />
    </header>
  );
}
