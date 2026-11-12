import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { HOME_CHANGED, PERSONAL_HOME_KEY, parsePersonalHome } from '../utils/personal-home';
/** 이 브라우저에 보관한 내 메인 설정. 같은 탭의 변경과 다른 탭의 변경을 모두 따라갑니다. */
export default function usePersonalHome(){
 const subscribe=useCallback(notify=>{const changed=e=>{if(e.type===HOME_CHANGED||e.key===PERSONAL_HOME_KEY||e.key===null)notify();};window.addEventListener('storage',changed);window.addEventListener(HOME_CHANGED,changed);return()=>{window.removeEventListener('storage',changed);window.removeEventListener(HOME_CHANGED,changed);};},[]);
 const snapshot=useCallback(()=>{try{return localStorage.getItem(PERSONAL_HOME_KEY);}catch{return null;}},[]);
 const raw=useSyncExternalStore(subscribe,snapshot,()=>null);
 return useMemo(()=>parsePersonalHome(raw),[raw]);
}
