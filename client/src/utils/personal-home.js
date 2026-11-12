import { normalizeStageLights } from '../data/stage-lighting';
// 내 메인 설정과 코드 사본은 이 브라우저에만 보관합니다.
export const PERSONAL_HOME_KEY='vpylab:personal-home:v1:guest';
export const HOME_CHANGED='vpylab:personal-home-changed';
export const HOME_COLORS=['#9acfb5','#9dbfed','#ecb2cb','#e6ca92','#c4b3e8'];
const MAX_CODE_BYTES=50_000,MAX_THUMBNAIL=250_000,MAX_RAW=400_000;
const raster=value=>typeof value==='string'&&value.length<=MAX_THUMBNAIL&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)?value:null;
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
export function parsePersonalHome(raw){
 try{
  if(typeof raw!=='string'||raw.length>MAX_RAW)return null;
  const data=JSON.parse(raw);if(data?.version!==1)return null;
  let project=null;
  if(data.project){
   const p=data.project;if(typeof p.code!=='string'||!p.code.trim()||new TextEncoder().encode(p.code).length>MAX_CODE_BYTES)return null;
   const thumbnail=raster(p.thumbnail);
   project={title:text(p.title,80)||'나의 작품',code:p.code,thumbnail};
  }
  return{version:1,enabled:data.enabled!==false,showProject:data.showProject!==false,greeting:text(data.greeting,80),background:/^#[0-9a-f]{6}$/i.test(data.background||'')?data.background:null,lights:normalizeStageLights(data.lights),project};
 }catch{return null;}
}
export function readPersonalHome(storage){try{return parsePersonalHome((storage||globalThis.localStorage).getItem(PERSONAL_HOME_KEY));}catch{return null;}}
export function writePersonalHome(patch,storage){
 try{
  const current=readPersonalHome(storage)||{version:1,greeting:'',background:null,lights:null,project:null};
  const candidate={...current,...patch,version:1};
  if(candidate.project){
   const p=candidate.project;if(typeof p.code!=='string'||!p.code.trim())return{ok:false,error:'코드를 작성한 뒤 내 메인으로 설정해 주세요.'};
   if(p.code.length>MAX_CODE_BYTES||new TextEncoder().encode(p.code).length>MAX_CODE_BYTES)return{ok:false,error:'작품 코드는 50KB 이내로 설정해 주세요.'};
   candidate.project={title:p.title,code:p.code,thumbnail:raster(p.thumbnail)};
  }
  const raw=JSON.stringify(candidate),value=parsePersonalHome(raw);if(!value)return{ok:false,error:'메인 설정을 확인해 주세요.'};
  (storage||globalThis.localStorage).setItem(PERSONAL_HOME_KEY,JSON.stringify(value));
  globalThis.window?.dispatchEvent(new CustomEvent(HOME_CHANGED));return{ok:true,value};
 }catch{return{ok:false,error:'이 브라우저에 저장하지 못했습니다. 저장 공간이나 브라우저 설정을 확인해 주세요.'};}
}
export function resetPersonalHome(storage){
 try{
  const target=storage||globalThis.localStorage,raw=target.getItem(PERSONAL_HOME_KEY);if(raw===null)return true;
  if(!parsePersonalHome(raw))return false;
  // 화면만 기본으로 되돌립니다. 이것이 유일한 코드 사본이어도 잃지 않습니다.
  return writePersonalHome({enabled:false,lights:null},target).ok;
 }catch{return false;}
}

export function removePersonalHome(storage){
 try{(storage||globalThis.localStorage).removeItem(PERSONAL_HOME_KEY);globalThis.window?.dispatchEvent(new CustomEvent(HOME_CHANGED));return true;}catch{return false;}
}
