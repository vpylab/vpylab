import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import HomeSettingsDialog from './HomeSettingsDialog';
import { readPersonalHome, writePersonalHome } from '../../utils/personal-home';
beforeEach(()=>{HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
afterEach(()=>{localStorage.clear();vi.restoreAllMocks();});
it('현재 코드 사본을 내 메인으로 지정한다',()=>{
 const done=vi.fn();render(<MemoryRouter><HomeSettingsDialog pin={{title:'작품',code:'sphere()'}} onClose={done}/></MemoryRouter>);fireEvent.change(screen.getByLabelText('작품 이름'),{target:{value:'나의 종'}});fireEvent.click(screen.getByRole('button',{name:'내 메인으로 설정'}));expect(readPersonalHome().project).toMatchObject({title:'나의 종',code:'sphere()'});expect(done).toHaveBeenCalledOnce();
});

it('명시적으로 삭제를 확인한 경우에만 이 브라우저의 보관본을 지운다',()=>{
 writePersonalHome({project:{title:'내 작품',code:'sphere()'}});
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);render(<MemoryRouter><HomeSettingsDialog onClose={()=>{}}/></MemoryRouter>);
 fireEvent.click(screen.getByText('이 브라우저의 보관본 관리'));fireEvent.click(screen.getByRole('button',{name:'보관본 삭제'}));expect(readPersonalHome()).not.toBeNull();
 confirm.mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'보관본 삭제'}));expect(readPersonalHome()).toBeNull();
});
