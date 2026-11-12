import { codeVocabulary } from '../data/code-vocabulary';
// 단어 안내 기록은 이 브라우저에만 보관합니다.
const memory=new Map(),slot='vpylab:word-help:v1:guest',allowed=id=>codeVocabulary.some(w=>w.id===id);
export function readWordHelp(){
 let raw;try{raw=localStorage.getItem(slot);}catch{/* 메모리로 대체 */}
 try{const value=raw&&raw.length<=5000?JSON.parse(raw):memory.get(slot);const known=(Array.isArray(value)?value:value?.known)||[];const views={};for(const [id,n]of Object.entries(value?.views||{}))if(allowed(id)&&Number.isFinite(n))views[id]=Math.max(0,Math.min(2,n));return{known:Array.isArray(known)?known.filter(allowed):[],views};}catch{return{known:[],views:{}};}
}
function save(value){try{localStorage.setItem(slot,JSON.stringify(value));memory.delete(slot);}catch{memory.set(slot,value);/* 저장 불가 환경에서도 같은 세션의 반복 안내는 제한 */}return value;}
export function rememberWord(id){const p=readWordHelp();if(allowed(id))p.known=[...new Set([...p.known,id])];return save(p);}
export function claimWordTip(id){const p=readWordHelp();if(!allowed(id)||p.known.includes(id)||(p.views[id]||0)>=2)return false;p.views[id]=(p.views[id]||0)+1;save(p);return true;}
