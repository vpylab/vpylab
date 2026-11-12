import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import usePersonalHome from './usePersonalHome';
import { PERSONAL_HOME_KEY, removePersonalHome, writePersonalHome } from '../utils/personal-home';
function Probe(){const home=usePersonalHome();return <p>{home?.greeting||'기본 화면'}</p>;}
afterEach(()=>localStorage.clear());
it('같은 탭의 설정과 다른 탭의 변경을 반영하고 지우면 기본 화면으로 돌아간다',()=>{
 render(<Probe/>);expect(screen.getByText('기본 화면')).toBeVisible();
 act(()=>{writePersonalHome({greeting:'나의 공간'});});expect(screen.getByText('나의 공간')).toBeVisible();
 act(()=>{localStorage.setItem(PERSONAL_HOME_KEY,JSON.stringify({version:1,greeting:'다른 탭에서 바꾼 공간'}));window.dispatchEvent(new StorageEvent('storage',{key:PERSONAL_HOME_KEY}));});expect(screen.getByText('다른 탭에서 바꾼 공간')).toBeVisible();expect(screen.queryByText('나의 공간')).toBeNull();
 act(()=>{removePersonalHome();});expect(screen.getByText('기본 화면')).toBeVisible();
});
