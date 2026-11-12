import { useUiText } from "../../i18n/ui-text";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { builtInModule, readForgeShelf } from '../../forge/modules';
import { fetchOwnForgeModules, fetchPublicForgeModules, unpublishForgeModule } from '../../forge/registry';
import * as githubRegistry from '../../forge/github-registry';
import { FORGE_GITHUB_TEXT } from '../../forge/forge-text';
import { FORGE_REGISTRY } from '../../lib/api-base.js';
import { forgeKeyOf, parseForgeSourceId } from '../../../../server/shared/forge-rules.js';
import { forgePresets, visibleForgePresets } from '../../forge/recipes';
import useAuthStore from '../../stores/authStore';

const sameLogin=(a,b)=>Boolean(a)&&Boolean(b)&&String(a).toLowerCase()===String(b).toLowerCase();
/**
 * registry: 모두의 모듈을 두는 곳(lib/api-base.js의 FORGE_REGISTRY).
 *   server는 수업용 판의 Supabase, github는 학생의 GitHub 저장소와 정적 목록, none이면 모두의 모듈 탭을 보이지 않습니다.
 */
export default function ForgeLibrary({onChoose,localModules,onRemove,registry=FORGE_REGISTRY,github=githubRegistry}) {
  const ui = useUiText();
  const viaGitHub=registry==='github';
  const userId=useAuthStore(s=>s.user?.id),[login,setLogin]=useState(null),[listedKeys,setListedKeys]=useState(null),[message,setMessage]=useState(''),[hiding,setHiding]=useState(null);
  // 모두의 모듈에서는 서로 다른 사람이 같은 모듈 ID를 올릴 수 있어, 카드를 아이디와 모듈 ID로 구별합니다.
  const cardKey=module=>(viaGitHub&&module.publicListing?module.ownerId+'/':'')+module.id;
  const owner=viaGitHub?login:userId;
  const [tab,setTab]=useState('mine'),[remote,setRemote]=useState([]),[account,setAccount]=useState([]),[page,setPage]=useState(0),[more,setMore]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[forking,setForking]=useState(null);
  const local=localModules||readForgeShelf(owner).modules;
  // GitHub 방식에서는 모듈 ID로 맞춥니다(계정의 기록 ID가 없습니다). 내 저장소에만 있는 모듈(다른 기기에서 올린 것)도 함께 보입니다.
  const own=viaGitHub
    ?[...local.map(module=>{const saved=account.find(m=>m.id===module.id);return saved?{...module,published:true,ownerId:saved.ownerId,author:saved.author,fileUrl:saved.fileUrl}:module;}),...account.filter(saved=>!local.some(module=>module.id===saved.id))]
    :[...new Map([...account,...local.map(module=>{const saved=account.find(m=>m.recordId===module.recordId);return saved?{...module,published:saved.published,ownerId:saved.ownerId,author:saved.author}:module;})].map(m=>[m.recordId||m.id,m])).values()];
  const load=async(next=0)=>{setLoading(true);setError('');try{const data=viaGitHub?await github.fetchPublicForgeModules():await fetchPublicForgeModules({page:next});setRemote(old=>next?[...old,...data.modules]:data.modules);setMore(data.hasMore);setPage(next);if(viaGitHub)setListedKeys(data.keys);}catch(e){setError(e.message);}finally{setLoading(false);}};
  const hide=async module=>{if(hiding)return;setError('');setMessage('');setHiding(cardKey(module));try{
    if(viaGitHub){
      await github.unpublishForgeModule(module.id);
      setRemote(old=>old.filter(m=>!(m.id===module.id&&sameLogin(m.ownerId,login))));setAccount(old=>old.filter(m=>m.id!==module.id));
      // 내린 모듈을 원본으로 적은 카드의 링크도 거둡니다.
      setListedKeys(old=>{if(!old)return old;const next=new Set(old);next.delete(forgeKeyOf(login,module.id));return next;});
      setMessage(FORGE_GITHUB_TEXT.unpublished);
    }
    else{const id=module.recordId||module.id;await unpublishForgeModule(id);setRemote(old=>old.filter(m=>m.id!==id));setAccount(old=>old.map(m=>m.recordId===id?{...m,published:false}:m));}
  }catch(e){setError(e.message);}finally{setHiding(null);}};
  useEffect(()=>{
    let live=true;
    // GitHub 방식: 이 탭이 GitHub에 연결되어 있을 때만 내 저장소를 읽습니다. 연결이 없으면 아무 요청도 하지 않습니다.
    // 아이디는 GitHub에 묻지 않고 알 수 있습니다. 내 저장소를 읽지 못해도 모두의 모듈에서 내 모듈의 공개를 내릴 수 있게 먼저 정합니다.
    if(viaGitHub)github.forgeLogin().then(name=>{
      if(!live||!name)return null;
      setLogin(name);
      return github.fetchOwnForgeModules().then(data=>{if(live&&data){setLogin(data.login);setAccount(data.modules);}});
    }).catch(e=>{if(live)setError(e.message);});
    else if(registry==='server'&&userId)fetchOwnForgeModules().then(data=>{if(live)setAccount(data);}).catch(e=>{if(live)setError(e.message);});
    return()=>{live=false;};
  },[viaGitHub,registry,userId,github]);
  // 원본 링크: 수업용 판은 갤러리 주소, GitHub 방식은 그 모듈의 파일 주소. 모두의 모듈 탭에서는 목록에 실린 원본만 링크로 보입니다.
  const sourceLink=module=>{
    const source=module.source,gh=parseForgeSourceId(source.id);
    if(gh){const url=github.forgeSourceUrl(source);return tab==='public'&&!listedKeys?.has(forgeKeyOf(gh.owner,gh.id))?source.title:<a href={url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>;}
    return registry==='server'?<Link to={'/gallery/'+encodeURIComponent(source.id)} target="_blank" rel="noopener">{source.title}</Link>:source.title;
  };
  const choose=async module=>{setForking(cardKey(module));try{await onChoose(module);}catch(e){setError(e.message);}finally{setForking(null);}};
  const modules=tab==='mine'?own:tab==='public'?remote:visibleForgePresets.map(p=>builtInModule(p.id));
  return <section className="forge-library-section">
    <h2 className="text-lg font-bold mb-3">{ui("모듈 보관함")}</h2>
    <p className="text-sm leading-relaxed mb-5">{viaGitHub?ui(FORGE_GITHUB_TEXT.libraryIntro):registry==='server'?ui("다른 사람의 모양은 포크해서 내 작업대로 가져옵니다. 포크 기록은 내 계정에 비공개로 남고, 다시 공개할 때 원본 출처가 이어집니다."):ui(FORGE_GITHUB_TEXT.localOnly)}</p>
    <div className="forge-tabs mb-5" role="group" aria-label={ui("모듈 목록 선택")}>{[['mine',ui("내 모듈")],['builtin',ui("기본 오브젝트")],...(registry==='none'?[]:[['public',ui("모두의 모듈")]])].map(([key,title])=><button key={key} aria-pressed={tab===key} onClick={()=>{setTab(key);setError('');setMessage('');if(key==='public')load();}}>{title}</button>)}</div>
    {loading&&<p role="status">{ui("모듈을 불러오는 중입니다.")}</p>}
    {error&&<p role="alert">{ui(error)} {tab==='public'&&<button onClick={()=>load()} className="btn-secondary">{ui("다시 시도")}</button>}</p>}
    {message&&<p role="status" className="text-sm leading-relaxed mb-3">{ui(message)}</p>}
    {!loading&&!error&&modules.length===0&&<p className="text-sm leading-relaxed py-5">{tab==='mine'?ui("만든 모양을 내 보관함에 등록하거나 다른 사람의 모듈을 포크하면 여기에 나타납니다."):ui("아직 공개된 모듈이 없습니다. 첫 모듈을 등록해 보세요.")}</p>}
    <div className="forge-library-grid">{modules.map(module=><article key={cardKey(module)} className="forge-library-card">
      <span className="forge-module-icon" style={{color:module.recipe.colors[1]}} aria-hidden="true">{forgePresets.find(p=>p.id===module.recipe.presetId)?.icon}</span><h3 className="font-semibold">{tab==='builtin'?ui(module.title):module.title}</h3>
      <p className="text-xs mt-2 leading-relaxed">{(tab==='builtin'?ui(module.description):module.description)||ui("위치와 크기를 정해 다른 프로젝트에서 재사용할 수 있는 오브젝트입니다.")}</p>
      {tab==='mine'&&(viaGitHub?module.published:module.recordId&&typeof module.published==='boolean')&&<p className="text-xs mt-2">{module.published?ui("공개 중"):ui("비공개")}</p>}
      {module.author&&<p className="text-xs mt-2">{ui("만든 사람 ·")} {module.author}</p>}
      {module.source&&<p className="text-xs mt-3">{ui("포크 원본 ·")}{sourceLink(module)} · {module.source.author}</p>}
      {viaGitHub&&module.fileUrl&&(tab==='public'||module.published)&&<p className="text-xs mt-2"><a href={module.fileUrl} target="_blank" rel="noopener noreferrer">{ui("GitHub에서 보기")} ↗</a></p>}
      <button disabled={forking!==null} className="btn-secondary mt-4" onClick={()=>choose(module)}>{forking===cardKey(module)?(viaGitHub?ui("가져오는 중…"):ui("포크 기록 저장 중…")):tab==='public'?ui("포크해서 가져오기"):tab==='mine'?ui("내 모듈 이어 만들기"):ui("이 모양으로 시작")} →</button>
      {module.published&&(viaGitHub?sameLogin(module.ownerId,owner):module.ownerId===owner)&&<button className="text-xs underline block mt-4" disabled={hiding!==null} onClick={()=>hide(module)}>{ui("내 모듈 공개 내리기")}</button>}
      {tab==='mine'&&onRemove&&local.some(m=>m.id===module.id)&&<button className="text-xs underline block mt-4" onClick={()=>onRemove(module.id)}>{ui("이 브라우저 보관함에서 제거")}</button>}
    </article>)}</div>
    {tab==='public'&&more&&<button disabled={loading} className="btn-secondary mt-4" onClick={()=>load(page+1)}>{ui("더 보기")}</button>}
  </section>;
}
