import { useUiText } from "../../i18n/ui-text";
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './home.css';
import { HOME_COLORS, readPersonalHome, resetPersonalHome, writePersonalHome, removePersonalHome } from '../../utils/personal-home';

/** 내 메인 설정. 이 브라우저에만 보관합니다. */
export default function HomeSettingsDialog({pin,onClose,ko=true}){
  const ui = useUiText();
 const navigate=useNavigate();
 const dialog=useRef(null),previous=useRef(null);
 const [saved]=useState(()=>readPersonalHome()),[greeting,setGreeting]=useState(saved?.greeting||(ko?'나의 코딩 작업실':'My coding studio')),[background,setBackground]=useState(saved?.background||HOME_COLORS[0]),[title,setTitle]=useState(pin?.title||saved?.project?.title||ui("나의 작품")),[error,setError]=useState(''),[showProject,setShowProject]=useState(!!saved?.project&&saved.enabled!==false&&saved.showProject!==false);
 useEffect(()=>{previous.current=document.activeElement;const el=dialog.current;el.showModal();return()=>{el.close();previous.current?.focus?.();};},[]);
 const save=e=>{e.preventDefault();
  const patch=pin?{enabled:true,showProject:true,project:{title,code:pin.code,thumbnail:pin.thumbnail||null}}:{greeting,background,enabled:true,showProject};const result=writePersonalHome(patch);
  if(!result.ok){setError(result.error);return;}onClose();if(pin)navigate('/');
 };
 const remove=()=>{if(!window.confirm(ko?'이 브라우저의 내 메인 설정과 코드 사본을 삭제할까요? 원본 프로젝트는 남습니다.':'Delete your home settings and code copy from this browser? Original projects are kept.'))return;if(removePersonalHome())onClose();else setError(ko?'보관본을 삭제하지 못했습니다.':'Could not delete the copy.');};
 const reset=()=>{if(resetPersonalHome())onClose();else setError(ko?'설정을 초기화하지 못했습니다.':'Could not reset settings.');};
 return <dialog ref={dialog} className="home-settings-dialog" onCancel={e=>{e.preventDefault();onClose();}} aria-labelledby="home-settings-title">
  <form onSubmit={save}>
   <div className="home-settings-heading"><h2 id="home-settings-title">{pin?(ko?'내 메인에 작품 두기':'Feature on my home'):(ko?'내 메인 꾸미기':'Customize my home')}</h2><button type="button" onClick={onClose} aria-label={ko?'닫기':'Close'}>×</button></div>
   <p>{ko?'로그인 없이 이 브라우저에 보관합니다.':'Settings stay in this browser. Your project is not published or changed.'}</p>
   {pin?<><label>{ko?'작품 이름':'Project title'}<input required maxLength={80} value={title} onChange={e=>setTitle(e.target.value)}/></label><p>{ko?'지금 코드의 사본과 현재 화면을 메인에 담습니다. 수정 후 다시 설정하면 메인도 갱신됩니다.':'A copy of the current code and preview is featured. Set it again after editing to update your home.'}</p></>:<>
    <label>{ko?'환영 문구':'Welcome message'}<input required maxLength={80} value={greeting} onChange={e=>setGreeting(e.target.value)}/></label>
    <fieldset><legend>{ko?'배경색':'Background tint'}</legend><div className="home-color-options">{HOME_COLORS.map((color,i)=><label key={color} title={color}><input type="radio" name="home-background" value={color} checked={background===color} onChange={()=>setBackground(color)} aria-label={(ko?['민트','하늘','분홍','노랑','보라']:['Mint','Sky','Pink','Yellow','Purple'])[i]}/><span style={{background:color}}/></label>)}</div></fieldset>
    {saved?.project&&<label className="home-project-toggle"><input type="checkbox" checked={showProject} onChange={e=>setShowProject(e.target.checked)}/>{ko?'메인에 이 작품 표시':'Show this project on home'}</label>}
    <p>{saved?.project?(ko?'등록된 작품: ':'Featured project: ')+saved.project.title:(ko?'만들기 → 도구 → 현재 프로젝트를 내 메인으로 설정에서 작품을 가져오세요.':'Feature a project from Create → Tools → Set current project as my home.')}</p>
   </>}
   {!pin&&saved?.project&&<p>{ko?'기본 화면으로 돌아가도 작품 사본은 남습니다. 다시 표시하려면 위 선택을 켜고 적용하세요.':'Restoring the default keeps the code copy. Enable the checkbox and apply to show it again.'}</p>}
   {error&&<p role="alert">{ui(error)}</p>}
   <div className="home-settings-actions"><button type="submit" className="btn-primary">{pin?(ko?'내 메인으로 설정':'Set as my home'):(ko?'적용':'Apply')}</button><button type="button" onClick={onClose} className="btn-secondary">{ko?'취소':'Cancel'}</button>{!pin&&<button type="button" onClick={reset} className="btn-secondary">{ko?'기본 화면으로 돌아가기':'Restore default home'}</button>}</div>
   {!pin&&saved&&<details className="mt-4 text-xs"><summary>{ko?'이 브라우저의 보관본 관리':'Manage browser copies'}</summary><p>{ko?'설정과 코드 사본은 이 기기에 보관됩니다. 삭제하면 이 브라우저의 내 메인 사본만 지워집니다.':'Settings and code copies are kept on this device. Deleting removes only this browser’s home copy.'}</p><button type="button" className="btn-secondary" onClick={remove}>{ko?'보관본 삭제':'Delete browser copy'}</button></details>}
   {pin&&<p><Link to="/" onClick={onClose}>{ko?'메인 화면으로':'Go to home'} →</Link></p>}
  </form>
 </dialog>;
}
