import { useUiText } from "../i18n/ui-text";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import ForgePreview from '../components/forge/ForgePreview';
import ForgeLibrary from '../components/forge/ForgeLibrary';
import { activeParameters, buildForgeModel, createRecipe, forgeParameters, forgePresets, visibleForgePresets } from '../forge/recipes';
import { factoryName, refreshForgeStarterDraft, makeForgeModule, moduleDefinition, moduleProgram, initialForgeShelf, writeForgeShelf, writeForgeDraft, saveForgeShelfModule, removeForgeShelfModule, readForgeShelf, stageForgeLogin, FORGE_LOGIN_TRANSFER } from '../forge/modules';
import { forkForgeModule, publishForgeModule } from '../forge/registry';
import { forkPublicForgeModule, forgeSourceUrl } from '../forge/github-registry';
import { FORGE_GITHUB_TEXT } from '../forge/forge-text';
import { FORGE_REGISTRY, GITHUB_ADDON } from '../lib/api-base.js';
import AddonBoundary from '../components/shared/AddonBoundary';
import { beep, ensureAudioReady } from '../engine/sound-system';
import useAuthStore from '../stores/authStore';
import '../forge/forge.css';

// 공개 등록(GitHub 방식)은 애드온입니다. 필요한 배포에서만 따로 불러오고, 불러오지 못해도 대장간은 그대로 동작합니다.
const VIA_GITHUB=FORGE_REGISTRY==='github';
const ForgeGitHubPublish=VIA_GITHUB&&GITHUB_ADDON?lazy(()=>import('../components/forge/ForgeGitHubPublish')):null;
const kindNames={character:'캐릭터',asset:'프로젝트 에셋',shape:'기본 모양'};
const groupNames={body:'크기',face:'얼굴',parts:'팔다리',shape:'모양',sound:'소리'};
function download(text,filename,type='text/plain') {
  const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function ForgeWorkspace({owner}) {
  const ui = useUiText();
  const newModule = recipe => { const module=makeForgeModule(recipe); return {...module, title:ui(module.title), description:ui(module.description)}; };
  const [initial]=useState(()=>{const initial=initialForgeShelf(owner);return {...initial,draft:refreshForgeStarterDraft(initial.draft,initial.modules),guestDraft:refreshForgeStarterDraft(initial.guestDraft,[...initial.modules,...readForgeShelf(null).modules])};});
  const [history,setHistory]=useState(()=>({past:[],present:initial.draft||newModule(createRecipe()),future:[]}));
  const [shelf,setShelf]=useState(initial.modules),[kind,setKind]=useState(()=>forgePresets.find(p=>p.id===initial.draft?.recipe.presetId)?.kind||'character'),[tab,setTab]=useState('body'),[pageTab,setPageTab]=useState('workbench');
  const [view,setView]=useState({mode:'three',epoch:0}),[notice,setNotice]=useState(initial.pendingLogin?ui("로그인 전 만들던 모양을 이어서 열었습니다. 공개 등록은 다시 눌러 주세요."):''),[lastChange,setLastChange]=useState('width'),[alias,setAlias]=useState(initial.draft?.author||ui("익명")),[publishing,setPublishing]=useState(false),[storageError,setStorageError]=useState(false),[waveTick,setWaveTick]=useState(0),[referenceTitle,setReferenceTitle]=useState(''),[referenceUrl,setReferenceUrl]=useState('');
  const capture=useRef(null),gesture=useRef(null),latest=useRef(history.present);
  const current=history.present,recipe=current.recipe;
  const model=useMemo(()=>buildForgeModel(recipe),[recipe]);
  const definition=useMemo(()=>moduleDefinition(current),[current]);
  const keys=activeParameters(recipe),groups=[...new Set(keys.map(key=>forgeParameters[key].group))];
  const selectedTab=groups.includes(tab)?tab:groups[0];
  const shown=keys.filter(key=>forgeParameters[key].group===selectedTab);
  useEffect(()=>{
    if(initial.pendingLogin){const ok=writeForgeShelf(owner,{modules:initial.modules,draft:initial.draft});if(ok)try{sessionStorage.removeItem(FORGE_LOGIN_TRANSFER);}catch{/* 세션 보관 불가 */}}
    const sync=event=>{if(event.key==='vpylab:forge:v1:'+String(owner||'guest'))setShelf(readForgeShelf(owner).modules);};
    window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);
  },[initial,owner]);
  useEffect(()=>{latest.current=current;const ok=writeForgeDraft(owner,current);if(!ok)queueMicrotask(()=>setStorageError(true));},[current,owner]);
  const replace=useCallback(next=>{setHistory(old=>({past:[...old.past,old.present].slice(-40),present:next,future:[]}));},[]);
  const change=useCallback(fn=>setHistory(old=>({past:gesture.current?old.past:[...old.past,old.present].slice(-40),present:fn(old.present),future:[]})),[]);
  const begin=()=>{if(!gesture.current)gesture.current=latest.current;};
  const finish=()=>{const start=gesture.current;gesture.current=null;if(!start)return;setHistory(old=>JSON.stringify(start)===JSON.stringify(old.present)?old:{...old,past:[...old.past,start].slice(-40)});};
  const undo=()=>{gesture.current=null;const target=history.past.at(-1);if(target)setKind(forgePresets.find(p=>p.id===target.recipe.presetId).kind);setHistory(old=>old.past.length?{past:old.past.slice(0,-1),present:old.past.at(-1),future:[old.present,...old.future]}:old);};
  const redo=()=>{const target=history.future[0];if(target)setKind(forgePresets.find(p=>p.id===target.recipe.presetId).kind);setHistory(old=>old.future.length?{past:[...old.past,old.present],present:old.future[0],future:old.future.slice(1)}:old);};
  const setParam=(key,value)=>{setLastChange(key);change(old=>({...old,recipe:{...old.recipe,params:{...old.recipe.params,[key]:value}}}));};
  const choosePreset=id=>{replace(newModule(createRecipe(id)));setTab('body');setNotice(ui("새 시작 모양입니다. 이전 작업은 되돌리기로 돌아갈 수 있습니다."));};
  const keepLocal=module=>{const result=saveForgeShelfModule(owner,makeForgeModule(module.recipe,module));if(!result.saved){setStorageError(true);return false;}setShelf(result.modules);return true;};
  const chooseModule=async module=>{
    // GitHub 방식: 로그인 없이 가져옵니다. 사본은 이 브라우저의 보관함에 남고 원본의 GitHub 아이디가 출처로 기록됩니다.
    if(module.publicListing&&VIA_GITHUB){const next=forkPublicForgeModule(module);replace(next);keepLocal(next);setKind(forgePresets.find(p=>p.id===module.recipe.presetId).kind);setPageTab('workbench');setNotice(FORGE_GITHUB_TEXT.forked);return;}
    if(module.publicListing&&!owner){stageForgeLogin(current,shelf);useAuthStore.getState().setAuthModalOpen(true);setNotice(ui("포크 기록을 남기려면 로그인한 뒤 모두의 모듈에서 포크를 다시 눌러 주세요."));return;}
    const next=module.publicListing?await forkForgeModule(module.id,{alias}):makeForgeModule(module.recipe,{...module,...(module.id.startsWith('builtin-')?{title:ui(module.title),description:ui(module.description)}:{}),id:module.id.startsWith('builtin-')?undefined:module.id});
    replace(next);if(!module.publicListing)setAlias(module.author||alias);if(module.publicListing)keepLocal(next);setKind(forgePresets.find(p=>p.id===module.recipe.presetId).kind);setPageTab('workbench');setNotice(module.publicListing?ui("원본과 연결된 비공개 포크 기록을 내 계정에 저장했습니다. 내 모양으로 고친 뒤 공개할 수 있습니다."):ui("내 모듈을 작업대에 열었습니다."));
  };
  const captureReady=useCallback(fn=>{capture.current=fn;},[]);
  const ringBell=useCallback(async()=>{if(model.preset.id!=='bell')return;if(recipe.bellMode==='shape'){setNotice(ui("1단계는 모양만 만듭니다. 2단계에서 클릭 소리를 붙여 보세요."));return;}if(await ensureAudioReady()){beep(recipe.params.tone,.45,'sine',.3);if(recipe.bellMode==='waves')setWaveTick(n=>n+1);setNotice(ui`${recipe.params.tone}Hz 종을 울렸습니다.`);}else setNotice(ui("소리를 켜지 못했습니다. 브라우저의 소리 권한을 확인하세요."));},[model.preset.id,recipe.params.tone,recipe.bellMode, ui]);
  const saveLocal=()=>{if(keepLocal(current))setNotice(ui`“${current.title}”을 내 모듈 보관함에 등록했습니다.`);else setNotice(ui("내 보관함에 등록하지 못했습니다. 코드를 복사하거나 Python 파일을 내려받으세요."));};
  const addReference=()=>{try{const next=makeForgeModule(current.recipe,{...current,references:[...(current.references||[]),{title:referenceTitle,url:referenceUrl}]});replace(next);setReferenceTitle('');setReferenceUrl('');setNotice(ui("참고한 프로젝트를 기록했습니다. 코드와 다시 공개하는 모듈에 출처가 이어집니다."));}catch(e){setNotice(e.message);}};
  const publish=async()=>{
    if(!owner){if(!stageForgeLogin(current,shelf))setStorageError(true);useAuthStore.getState().setAuthModalOpen(true);setNotice(ui("로그인한 뒤 공개 등록을 다시 눌러 주세요. 만들던 모양은 이어서 열립니다."));return;}
    setPublishing(true);try{const result=await publishForgeModule(current,{alias,thumbnail:capture.current?.()||null}),next=makeForgeModule(result.recipe,result);setHistory(old=>({...old,present:next,past:old.past.map(m=>m.id===next.id?{...m,recordId:next.recordId}:m),future:old.future.map(m=>m.id===next.id?{...m,recordId:next.recordId}:m)}));keepLocal(next);setNotice(ui`“${result.title}”을 모두의 모듈에 공개했습니다. 원본과 참고 프로젝트 기록도 함께 남겼습니다.`);}catch(e){setNotice(e.message);}finally{setPublishing(false);}
  };
  // GitHub에 올린 뒤: 파일 이름으로 쓸 수 없는 ID였다면 새 ID로 바뀌어 돌아옵니다. 작업대와 보관함을 그 ID로 맞춥니다.
  // previousId는 등록을 누른 때의 모듈 ID입니다. 올리는 사이 작업대에서 다른 모듈을 열었을 수 있으므로 지금 작업대의 모듈과 구별합니다.
  const publishedToGitHub=useCallback((done,previousId)=>{
    const next=makeForgeModule(done.recipe,done);
    if(previousId&&previousId!==next.id){
      const removed=removeForgeShelfModule(owner,previousId);if(removed.saved)setShelf(removed.modules);
      if(latest.current.id===previousId)setHistory(old=>old.present.id===previousId?{...old,present:{...old.present,id:next.id}}:old);
    }
    keepLocal(next);
  },[owner]); // eslint-disable-line react-hooks/exhaustive-deps
  const sourceLink=source=>{const url=forgeSourceUrl(source);return url?<a href={url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>:FORGE_REGISTRY==='server'?<Link to={'/gallery/'+encodeURIComponent(source.id)} target="_blank" rel="noopener">{source.title}</Link>:source.title;};
  const copy=async()=>{try{await navigator.clipboard.writeText(moduleProgram(current,{metadata:false}));setNotice(ui("실행할 전체 코드를 복사했습니다."));}catch{setNotice(ui("복사하지 못했습니다. Python 파일을 내려받거나 아래 코드를 직접 선택해 복사하세요."));}};
  const isCharacter=model.preset.kind==='character',filename='forge_'+factoryName(current).slice(5);
  return <div className="forge-page">
    <Header/>
    <main className="forge-shell">
      <div className="forge-heading"><div><p className="forge-eyebrow">{ui("작게 만들고, 크게 써먹기")}</p><h1>{ui("대장간")}<span>{ui("내 손으로 빚는 3D 모듈")}</span></h1><p className="forge-intro">{ui("모양을 바꾸고 내 부품으로 등록하세요. 여러 프로젝트에 꺼내 쓸 수 있어요.")}</p></div><div className="forge-heading-links"><Link to="/tutorials/forge-character">{ui("캐릭터 움직이기 튜토리얼 ↗")}</Link><Link to="/gallery">{ui("GlowScript 작품 보기 ↗")}</Link></div></div>
      <nav className="forge-page-tabs" aria-label={ui("대장간 공간")}><button aria-current={pageTab==='workbench'?'page':undefined} onClick={()=>setPageTab('workbench')}>{ui("01 작업대")}</button><button aria-current={pageTab==='library'?'page':undefined} onClick={()=>setPageTab('library')}>{ui("02 모듈 보관함")}<span>{shelf.length}</span></button></nav>
      {storageError&&<p role="alert" className="forge-notice">{ui("브라우저에 자동 보관하지 못했습니다. 작업을 잃지 않도록 코드를 복사하거나 Python 파일을 내려받으세요.")}</p>}
      {owner&&initial.guestDraft&&JSON.stringify(current)!==JSON.stringify(initial.guestDraft)&&<button className="btn-secondary my-3" onClick={()=>{replace(initial.guestDraft);setKind(forgePresets.find(p=>p.id===initial.guestDraft.recipe.presetId).kind);setNotice(ui("로그인 전에 만들던 초안을 가져왔습니다."));}}>{ui("로그인 전 게스트 초안 가져오기")}</button>}
      <p role="status" aria-live="polite" className="forge-notice">{ui(notice)||ui("값을 바꾸면 모양과 코드가 함께 바뀝니다. 현재 초안은 이 브라우저에 자동 보관됩니다.")}</p>
      {model.preset.hidden&&<p className="forge-notice">{ui("이전에 보관한 캐릭터입니다. 계속 수정하거나 새 시작 모양을 선택할 수 있어요.")}</p>}
      {recipe.presetId==='kirby'&&!recipe.appearance&&<p className="forge-notice">{ui("보관해 둔 모양을 열었어요.")} <button type="button" className="btn-secondary" onClick={()=>{change(old=>({...old,recipe:createRecipe('kirby')}));setTab('body');setNotice(ui("새 시작 모양입니다. 이전 작업은 되돌리기로 돌아갈 수 있습니다."));}}>{ui("메인 화면 커비로 바꾸기")}</button></p>}
      {pageTab==='library'?<ForgeLibrary localModules={shelf} onChoose={chooseModule} onRemove={id=>{const result=removeForgeShelfModule(owner,id);if(result.saved)setShelf(result.modules);else setNotice(ui("보관함에서 제거하지 못했습니다."));}}/>:<>
      <div className="forge-workbench">
        <aside className="forge-templates" aria-label={ui("시작 모양")}><h2><span>1</span>{ui("어떤 모양으로 시작할까요?")}</h2><div className="forge-kind-tabs">{Object.entries(kindNames).map(([key,name])=><button key={key} aria-pressed={kind===key} onClick={()=>setKind(key)}>{ui(name)}</button>)}</div><div className="forge-template-list">{visibleForgePresets.filter(p=>p.kind===kind).map(p=><button key={p.id} data-forge-preset={p.id} aria-pressed={recipe.presetId===p.id} onClick={()=>choosePreset(p.id)}><span className="forge-preset-icon" style={{background:p.colors[0],color:p.colors[1]}} aria-hidden="true">{p.icon}</span><span><strong>{ui(p.name)}</strong><small>{ui(p.note)}</small></span></button>)}</div><p className="forge-small">{ui("메인의 캐릭터 4종과 프로젝트에 쓰는 에셋입니다. 기본 도형을 조합해 내 부품을 만들어 보세요.")}</p></aside>
        <section className="forge-stage" aria-label={ui("만드는 모양 미리보기")}><div className="forge-stage-title"><span><i/>LIVE · {ui(model.preset.name)}</span><span>{model.parts.length}{ui("개 부품")}</span></div><ForgePreview model={model} view={view} onBell={ringBell} onCapture={captureReady} waveTick={waveTick}/><div className="forge-stage-tools" role="group" aria-label={ui("카메라 시점")}>{[['front',ui("정면")],['three',ui("입체")],['top',ui("위에서")]].map(([mode,label])=><button key={mode} aria-pressed={view.mode===mode} onClick={()=>setView(old=>({mode,epoch:old.epoch+1}))}>{label}</button>)}<button onClick={()=>setView(old=>({...old,epoch:old.epoch+1}))}>{ui("시점 초기화 ↺")}</button></div><p className="forge-stage-hint">{ui("드래그해서 돌려 보고 · 스크롤로 가까이 보기")}</p>{model.preset.id==='bell'&&recipe.bellMode!=='shape'&&<button className="forge-bell-button" onClick={ringBell}>{ui("♬ 종을 누르거나 여기서 울려 보기")}</button>}</section>
        <section className="forge-controls" aria-label={ui("모양 조절")}><div className="forge-control-title"><h2><span>2</span>{ui("내 취향대로 다듬기")}</h2><div><button aria-label={ui("되돌리기")} title={ui("드래그 한 번을 되돌립니다")} disabled={!history.past.length} onClick={undo}>↶</button><button aria-label={ui("다시 하기")} disabled={!history.future.length} onClick={redo}>↷</button></div></div>{model.preset.id==='bell'&&<div className="forge-bell-steps" role="group" aria-label={ui("종 만들기 단계")}>{[['shape',ui("1 모양만 만들기")],['sound',ui("2 클릭하면 소리")],['waves',ui("3 음파 효과까지")]].map(([mode,label])=><button key={mode} aria-pressed={recipe.bellMode===mode} onClick={()=>change(old=>({...old,recipe:{...old.recipe,bellMode:mode}}))}>{label}</button>)}<p>{recipe.bellMode==='shape'?ui("먼저 너비·높이·색으로 종을 만듭니다."):recipe.bellMode==='sound'?ui("완성한 종을 누르면 자기 음을 연주합니다."):ui("소리와 함께 세 개의 고리가 퍼졌다 사라집니다.")}</p></div>}<div className="forge-tabs" role="group" aria-label={ui("조절할 부위")}>{groups.map(g=><button key={g} aria-pressed={selectedTab===g} onClick={()=>setTab(g)}>{ui(groupNames[g])}</button>)}</div>
          <div className="forge-sliders">{shown.map(key=>{const p=forgeParameters[key],value=recipe.params[key];return <label key={key} className="forge-slider"><span>{ui(p.label)}<output htmlFor={'forge-'+key}>{value.toFixed(p.step<.1?2:0)}</output></span><input id={'forge-'+key} type="range" min={p.min} max={p.max} step={p.step} value={value} onPointerDown={begin} onPointerUp={finish} onPointerCancel={finish} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))begin();}} onKeyUp={finish} onBlur={finish} onChange={e=>setParam(key,Number(e.target.value))}/><small><code>{p.variable} = {value}</code></small></label>;})}</div>
          {isCharacter&&selectedTab==='face'&&<label className="forge-select">{ui("표정")}<select value={recipe.expression} onChange={e=>change(old=>({...old,recipe:{...old.recipe,expression:e.target.value}}))}><option value="smile">{ui("방긋 웃기")}</option><option value="surprise">{ui("깜짝 놀라기")}</option><option value="sleepy">{ui("졸린 눈")}</option></select></label>}
          {isCharacter&&selectedTab==='parts'&&<label className="forge-select">{ui("장식")}<select value={recipe.accessory} onChange={e=>change(old=>({...old,recipe:{...old.recipe,accessory:e.target.value}}))}><option value="none">{ui("장식 없이")}</option><option value="hat">{ui("고깔모자")}</option><option value="bow">{ui("리본")}</option><option value="antenna">{ui("안테나")}</option></select></label>}
          <div className="forge-colors">{[ui("몸통 색"),ui("포인트 색")].map((label,i)=><label key={label}>{label}<input type="color" value={recipe.colors[i]} onFocus={begin} onBlur={finish} onChange={e=>change(old=>({...old,recipe:{...old.recipe,colors:old.recipe.colors.map((c,j)=>j===i?e.target.value:c)}}))}/></label>)}</div>
          <button className="forge-reset" onClick={()=>replace(makeForgeModule(createRecipe(recipe.presetId),{...current}))}>{ui("이 시작 모양의 기본값으로 ↺")}</button>
          {model.preset.use&&<div className="forge-asset-guide"><strong>{ui("프로젝트에서 이렇게 써요")}</strong><p>{ui(model.preset.use)}</p><span>{model.preset.learn}</span><code>{model.preset.example}</code><small>{ui("복사한 완성 코드 아래에서 한 줄씩 바꿔 보세요.")}</small></div>}<div className="forge-code-peek"><span>{ui("방금 바꾼 코드")}</span><code>{forgeParameters[lastChange]?.variable} = {recipe.params[lastChange]}</code><p>{ui("슬라이더 값이 Python 변수로 들어갑니다.")}</p></div>
        </section>
      </div>
      <section className="forge-register"><div><h2><span>3</span>{ui("하나의 모듈로 꺼내 쓰기")}</h2><p>{ui("완성품은 compound로 묶입니다. 프로젝트마다 위치·크기를 다르게 해서 여러 번 쓸 수 있어요.")}</p><label>{ui("모듈 이름")}<input maxLength={80} value={current.title} onChange={e=>change(old=>({...old,title:e.target.value}))}/></label><label>{ui("어떻게 쓰면 좋을까요?")}<input maxLength={500} placeholder={ui("예: 아이템을 먹으면 색이 바뀌는 내 캐릭터")} value={current.description} onChange={e=>change(old=>({...old,description:e.target.value}))}/></label><div className="forge-register-actions"><button className="btn-primary" onClick={saveLocal} disabled={!current.title.trim()}>{ui("내 모듈 보관함에 등록")}</button><button className="btn-secondary" onClick={copy}>{ui("완성 모듈 코드 복사")}</button></div><p className="forge-small">{ui("다른 프로젝트에는 복사한 코드를 붙여 넣으면 됩니다. 함수 호출의 위치·크기를 바꿔 여러 개 만들어 보세요.")}</p></div><div className="forge-module-api"><span className="forge-badge">{ui("대장간 · VPyLab 제작 도구")}</span><h3>{ui("만들고 → 옮기고 → 색 바꾸기")}</h3><pre tabIndex={0}><code>{`friend = ${factoryName(current)}(\n    pos=vector(0, 0, 0), scale=1\n)\nfriend.object.pos.x += 0.1\nfriend.object.color = vector(1, .7, .3)`}</code></pre><p>{ui("함수의 .object가 완제품 compound입니다. pos·color 등 VPython 속성을 직접 바꿀 수 있습니다.")}</p><p>{ui("흰 부품은 전체 색을 바꾸기 쉽습니다. compound의 색은 원래 부품 색에 곱해집니다.")}</p>{model.preset.id==='bell'&&<p>{ui("종의 소리 명령은 VPyLab 확장입니다. 모듈마다 눌린 종을 구별하며 dispose()로 이벤트도 해제합니다.")}</p>}{['cup','star','heart'].includes(model.preset.id)&&<p>{ui("단면을 압출한 모듈입니다. 실습에서 지원하며 공유 HTML의 표현 범위는 더 좁습니다.")}<Link to="/docs#extrusion">{ui("지원 범위 보기 →")}</Link></p>}<div className="forge-export-actions"><button onClick={copy}>{ui("전체 코드 복사")}</button><button onClick={()=>download(moduleProgram(current,{file:true}),filename+'.py')}>{ui("GitHub용 .py ↓")}</button></div></div></section>
      <section className="forge-credits"><h2>{ui("어떤 프로젝트에서 이어졌나요?")}</h2>{current.source?<p>{ui("포크 원본 ·")}{sourceLink(current.source)} · {current.source.author}{current.recordId&&<span>{ui("· 포크 기록이 계정에 저장되어 있습니다.")}</span>}</p>:<p>{ui("새로 만든 모듈입니다. 참고한 프로젝트가 있으면 아래에 남겨 주세요.")}</p>}{(current.references||[]).map((ref,i)=><p key={i}><a href={ref.url} target="_blank" rel="noopener noreferrer">{ref.title} ↗</a></p>)}<div><label>{ui("참고 프로젝트 이름")}<input maxLength={100} value={referenceTitle} onChange={e=>setReferenceTitle(e.target.value)} placeholder={ui("예: 친구의 종 프로젝트")}/></label><label>{ui("프로젝트 링크")}<input type="url" value={referenceUrl} onChange={e=>setReferenceUrl(e.target.value)} placeholder="https://..."/></label><button className="btn-secondary" onClick={addReference} disabled={!referenceUrl.trim()}>{ui("참고 기록 추가")}</button></div></section><details className="forge-source"><summary>{ui("생성된 전체 함수 보기 · 코드를 읽고 바꾸고 싶을 때")}</summary><p>{ui("슬라이더 → 코드의 한 방향으로 연결됩니다. 실습에서 고친 코드를 슬라이더로 되돌리지는 않습니다. 출력은 VPython 도형을 사용하며 소리가 있는 종은 VPyLab 확장을 포함합니다.")}</p><pre tabIndex={0}><code>{definition.split('\n').map((line,i)=><span key={i} className={line.trim().startsWith(forgeParameters[lastChange]?.variable+' =')?'forge-code-highlight':''}>{line+'\n'}</span>)}</code></pre></details>
      {ForgeGitHubPublish&&<AddonBoundary><Suspense fallback={null}><ForgeGitHubPublish module={current} onPublished={publishedToGitHub}/></Suspense></AddonBoundary>}
      {FORGE_REGISTRY==='server'&&<details className="forge-publish"><summary>{ui("다른 사람도 쓰게 모두의 모듈에 공개하기")}</summary><p>{ui("이름·설명·모양과 생성 코드가 공개되고 다른 사람이 가져가 수정할 수 있습니다. 등록 전 이름과 설명에 개인정보가 없는지 확인하세요.")}</p>{current.source&&<p>{ui("원본 출처:")} {current.source.title} · {current.source.author}</p>}<label>{ui("공개할 별명")}<input maxLength={80} value={alias} onChange={e=>setAlias(e.target.value)}/></label><button className="btn-primary" disabled={publishing||!current.title.trim()} onClick={publish}>{publishing?ui("등록 중…"):owner?ui("모두의 모듈에 공개 등록"):ui("로그인하고 공개 등록")}</button></details>}
      </>}
    </main>
  </div>;
}
export default function Forge(){const owner=useAuthStore(s=>s.user?.id);return <ForgeWorkspace key={owner||'guest'} owner={owner}/>;}
