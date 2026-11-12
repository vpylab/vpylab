import useAppStore from '../../stores/appStore';
import { useId, useMemo, useState } from 'react';
import { vocabularyForCode } from '../../data/code-vocabulary';
import { readWordHelp, rememberWord } from '../../utils/word-help';
import './code-vocabulary.css';

export function WordPicture({term,ko}){
 const id=useId();
 if(term==='sphere')return <svg viewBox="0 0 100 70" aria-hidden="true"><defs><radialGradient id={id} cx="30%" cy="25%"><stop offset="0" stopColor="#e7ecff"/><stop offset=".6" stopColor="#9ca9e8"/><stop offset="1" stopColor="#6774bb"/></radialGradient></defs><ellipse cx="50" cy="62" rx="24" ry="4" fill="currentColor" opacity=".12"/><circle cx="50" cy="33" r="27" fill={'url(#'+id+')'}/></svg>;
 if(term==='radius')return <svg viewBox="0 0 100 70" aria-hidden="true"><circle cx="45" cy="35" r="25" fill="none" stroke="currentColor" strokeWidth="2" opacity=".25"/><path d="M45 35H70" stroke="currentColor" strokeWidth="2"/><circle cx="45" cy="35" r="2.5" fill="currentColor"/><text x="47" y="29" fill="currentColor" fontSize="10">r</text></svg>;
 if(term==='compound')return <svg viewBox="0 0 100 70" aria-hidden="true"><circle cx="17" cy="22" r="10" fill="#a5b4e8"/><rect x="7" y="40" width="20" height="17" rx="3" fill="#efba91"/><path d="M36 35H56m-5-5 5 5-5 5" stroke="currentColor" fill="none" strokeWidth="2"/><rect x="62" y="31" width="28" height="24" rx="4" fill="#efba91"/><circle cx="76" cy="23" r="14" fill="#a5b4e8"/></svg>;
 if(term==='opacity')return <div className="vocabulary-opacity" aria-label={ko?'불투명도 0, 0.5, 1 비교':'Opacity 0, 0.5 and 1'}>{[0,.5,1].map(v=><div key={v}><span><i style={{opacity:v}}/></span><small>{v}</small></div>)}</div>;
 return <span className="vocabulary-initial" aria-hidden="true">{term[0]}</span>;
}
function WordHelp({code,locale='ko',showWhenEmpty=false,initiallyOpen=false}){
 const ko=locale==='ko',panelId=useId(),terms=useMemo(()=>vocabularyForCode(code),[code]);
 const [open,setOpen]=useState(initiallyOpen),[known,setKnown]=useState(()=>readWordHelp().known),[showKnown,setShowKnown]=useState(false),[selected,setSelected]=useState(null),[expanded,setExpanded]=useState(false);
 const remaining=showKnown?terms:terms.filter(t=>!known.includes(t.id)),active=remaining.find(t=>t.id===selected);
 if(!terms.length&&!showWhenEmpty)return null;
 const remember=()=>{setKnown(rememberWord(active.id).known);setSelected(null);};
 return <aside className={'code-vocabulary'+(open?'':' is-collapsed')} aria-label={ko?'코드 속 작은 영어 사전':'Words in this code'}>
  <div className="vocabulary-heading"><button type="button" className="vocabulary-toggle" aria-expanded={open} aria-controls={panelId} onClick={()=>setOpen(v=>!v)}><span aria-hidden="true">Aa</span> {ko?'단어 뜻':'Word meanings'} <span aria-hidden="true">{open?'⌃':'⌄'}</span></button>{open&&<small>{ko?'궁금한 단어만 눌러보세요':'Choose a word'}</small>}</div>
  <div id={panelId}>{open&&<>
   {!terms.length?<p>{ko?'코드에 sphere, radius, compound 같은 단어가 나오면 여기서 뜻을 볼 수 있어요.':'Use sphere, radius or compound to see their meanings here.'}</p>:<><div className="vocabulary-words">{(expanded?remaining:remaining.slice(0,4)).map(term=><button type="button" key={term.id} aria-expanded={active?.id===term.id} onClick={()=>setSelected(old=>old===term.id?null:term.id)}><code>{term.id}</code>{' '}<span>{ko?term.meaning:term.english.split('.')[0]}</span></button>)}{remaining.length>4&&<button className="vocabulary-more" type="button" aria-expanded={expanded} onClick={()=>{setExpanded(v=>!v);setSelected(null);}}>{expanded?(ko?'접기':'Less'):(ko?`+${remaining.length-4}개 단어`:`+${remaining.length-4} words`)}</button>}</div>
   {active&&<div className="vocabulary-definition"><WordPicture term={active.id} ko={ko}/><div><p className="vocabulary-meaning"><code>{active.id}</code> <strong>{ko?active.meaning:''}</strong>{ko&&<small>{active.reading}</small>}</p><p>{ko?active.explanation:active.english}</p><pre><code>{active.example}</code></pre><button type="button" className="vocabulary-remember" onClick={remember}>{ko?'알겠어요 · 다음부터 생략':'Got it · Hide next time'}</button></div></div>}
   {terms.some(t=>known.includes(t.id))&&<button type="button" className="vocabulary-remember" onClick={()=>{setShowKnown(v=>!v);setSelected(null);}}>{showKnown?(ko?'기억한 단어 숨기기':'Hide known words'):(ko?'기억한 단어도 보기':'Include known words')}</button>}</>}
  </>}</div>
 </aside>;
}
export default function CodeVocabulary(props){const locale=useAppStore(s=>s.locale);return <WordHelp locale={locale} {...props}/>;}
