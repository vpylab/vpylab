import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { writePersonalHome } from '../utils/personal-home';
import Home from './Home';
vi.mock('../i18n/useI18n',()=>({useI18n:()=>({locale:'ko'})}));
vi.mock('../components/layout/Header',()=>({default:()=> <header>메뉴</header>}));
vi.mock('../components/home/WelcomeFriends',()=>({default:()=> <div>기본 환영 친구</div>}));
vi.mock('../components/home/PersonalHomeProject',()=>({default:({project})=><div>{project.title}</div>}));
afterEach(()=>{act(()=>{localStorage.clear();});});
it('내 메인 작품이 없으면 기본 환영 친구를 보이고, 이 브라우저에 설정하면 그 작품을 보인다',async()=>{
 render(<MemoryRouter><Home/></MemoryRouter>);
 await screen.findByText('기본 환영 친구');
 act(()=>{writePersonalHome({project:{title:'내 메인 작품',code:'sphere()'}});});
 await screen.findByText('내 메인 작품');expect(screen.queryByText('기본 환영 친구')).toBeNull();
});
