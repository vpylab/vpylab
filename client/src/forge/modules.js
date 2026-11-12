import { activeParameters, buildForgeModel, createRecipe, forgeParameters, validateRecipe, forgeColorVector, isForgeStudio } from './recipes.js';
import { forgeFileUrlOf, parseForgeSourceId } from '../../../server/shared/forge-rules.js';

export const MODULE_PREFIX = '# vpylab-forge:v1 ';
export const MODULE_FORMAT = 'vpylab-forge';
export const MAX_MODULE_BYTES = 96_000;
const cleanText = (text, max) => Array.from(String(text || ''),c=>c.charCodeAt(0)<32?' ':c).slice(0,max).join('').trim();
const encode = text => btoa(Array.from(new TextEncoder().encode(text),b=>String.fromCharCode(b)).join(''));
const decode = text => new TextDecoder().decode(Uint8Array.from(atob(text), c=>c.charCodeAt(0)));
export function makeForgeModule(recipe, {title,description='',source=null,id,recordId=null,references=[]}={}) {
  const normalized=validateRecipe(recipe),model=buildForgeModel(normalized);
  if(id!==undefined&&(typeof id!=='string'||!id.match(/^[a-zA-Z0-9_-]{1,80}$/)))throw new Error('모듈 ID 형식이 올바르지 않습니다.');
  if(recordId!==null&&(typeof recordId!=='string'||!recordId.match(/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i)))throw new Error('포크 기록 ID를 확인하세요.');
  if(!Array.isArray(references)||references.length>8)throw new Error('참고 프로젝트는 8개까지 남길 수 있습니다.');
  const refs=references.map(ref=>{let url;try{url=new URL(ref.url);}catch{throw new Error('참고 프로젝트의 주소를 확인하세요.');}if(!['http:','https:'].includes(url.protocol))throw new Error('참고 링크는 http 또는 https 주소만 가능합니다.');return {title:cleanText(ref.title,100)||'참고 프로젝트',url:url.href.slice(0,2000)};});
  return {format:MODULE_FORMAT,version:1,id:id||crypto.randomUUID(),title:cleanText(title,80)||model.preset.name,description:cleanText(description,500),recipe:normalized,source:source?{id:cleanText(source.id,80),title:cleanText(source.title,80),author:cleanText(source.author,80)}:null,recordId,references:refs};
}
export function parseModuleFile(text) {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_MODULE_BYTES)throw new Error('모듈 파일은 96KB 이하만 가져올 수 있습니다.');
  let value;
  try {value=JSON.parse(text);} catch {throw new Error('대장간에서 내보낸 .vpymodule.json 파일을 선택하세요.');}
  if(value?.format!==MODULE_FORMAT||value?.version!==1||typeof value.title!=='string')throw new Error('지원하지 않는 모듈 형식입니다.');
  return makeForgeModule(value.recipe,value);
}
export function moduleFromPublishedCode(code) {
  if(typeof code!=='string'||!code.startsWith(MODULE_PREFIX))return null;
  try {const header=code.split('\n',1)[0].slice(MODULE_PREFIX.length);if(header.length>Math.ceil(MAX_MODULE_BYTES*4/3))return null;const module=parseModuleFile(decode(header));return moduleProgram(module).trim()===code.trim()?module:null;}catch{return null;}
}
function recipeHash(recipe) {
  let h=2166136261;
  for(const c of JSON.stringify(recipe))h=Math.imul(h^c.charCodeAt(0),16777619);
  return (h>>>0).toString(16).padStart(8,'0');
}
export function factoryName(module) {return 'make_'+module.recipe.presetId.replaceAll('-','_')+'_'+recipeHash(module.recipe);}
const python = value => JSON.stringify(value);

// 생성된 함수는 실행하는 프로젝트의 위치·크기를 받습니다. 모듈마다 이름을 분리합니다.
export function moduleDefinition(module) {
  const model=buildForgeModel(module.recipe),name=factoryName(module),lines=[],hasSound=model.preset.id==='bell'&&module.recipe.bellMode!=='shape',hasWaves=hasSound&&module.recipe.bellMode==='waves';
  const push=(line='',level=1)=>lines.push('    '.repeat(level)+line);
  lines.push(`# ${cleanText(module.title,80)} · VPyLab 대장간`);
  // 원본이 GitHub의 모듈(gh:아이디/모듈 ID)이면 그 파일의 주소를 적습니다.
  if(module.source){const gh=parseForgeSourceId(module.source.id);lines.push(`# 원본: ${module.source.title} · ${module.source.author}`,`# 원본 프로젝트: ${gh?forgeFileUrlOf(gh.owner,gh.id):'/gallery/'+module.source.id}`);}
  for(const ref of module.references||[])lines.push(`# 참고: ${cleanText(ref.title,100)} · ${cleanText(ref.url,2000)}`);
  lines.push(`def ${name}(pos=None, scale=1):`);
  push('if not isinstance(scale, (int, float)) or not 0 < scale < 1000:');push('raise ValueError("scale은 0보다 큰 유한한 양수여야 합니다 (1000 미만)")',2);
  push('origin = vector(0, 0, 0) if pos is None else vector(pos)');
  push('# 슬라이더에서 바꾼 값입니다. size는 세 방향의 전체 길이입니다.');
  for(const key of activeParameters(module.recipe))push(`${forgeParameters[key].variable} = ${module.recipe.params[key]}`);
  // 사용하지 않는 조절기도 부품 식에서 필요할 수 있어 기본 상수를 둡니다.
  const neededCode=model.parts.flatMap(p=>Object.values(p.props).map(v=>v.code)).join(' ')+' '+model.derived.join(' ');
  for(const [key,spec]of Object.entries(forgeParameters))if(!activeParameters(module.recipe).includes(key)&&(!model.preset.studio||neededCode.includes(spec.variable)))push(`${spec.variable} = ${module.recipe.params[key]}`);
  if(module.recipe.appearance==='welcome-v1')push('# 색은 VPyLab 메인과 같은 선형 RGB입니다. 조명에 따라 보이는 색은 달라질 수 있습니다.');
  for(const [i,color]of module.recipe.colors.entries()){
    const rgb=forgeColorVector(module.recipe,color).map(n=>Number(n.toFixed(6)));
    push(`${i?'accent':'body'}_color = vector(${rgb.join(', ')})`);
  }
  for(const line of model.derived)push(line);
  push('parts = []');
  if(model.parts.some(p=>p.type==='extrusion')){
    push('def scale_shape(items):');
    push('return [scale_shape(item) if isinstance(item, (list, tuple)) else item * scale for item in items]',2);
  }
  const writeSmile=()=>{
    const start=model.parts.find(p=>p.name==='smile_joint_0'),bottom=model.parts.find(p=>p.name==='smile_joint_12');
    push('face_start = '+start.props.pos.code);push('face_bottom = '+bottom.props.pos.code);push('previous = None');
    push('for i in range(25):');push('angle = i * pi / 24',2);
    push('point = origin + vector(face_start.x*cos(angle), face_start.y+(face_bottom.y-face_start.y)*sin(angle), face_start.z) * scale',2);
    push('parts.append(sphere(pos=point, radius='+start.props.radius.code+' * scale, shininess=0.28, color='+start.props.color.code+'))',2);
    push('if previous is not None:',2);push('parts.append(cylinder(pos=previous, axis=point-previous, radius='+start.props.radius.code+' * scale, shininess=0.28, color='+start.props.color.code+'))',3);
    push('previous = point',2);
  };
  if(model.preset.id==='dome'){
    push('normalized_faces = '+python(model.parts.map(p=>JSON.parse(p.props.vertices.code))));
    push('for face in normalized_faces:');
    push('corners = []',2);push('for x, y, z in face:',2);
    push('point = origin + vector(x*body_width/2, y*body_height/2-body_height/4, z*body_depth/2) * scale',3);
    push('normal = vector(0,-1,0) if all(abs(p[1]) < 0.000001 for p in face) else norm(vector(x/body_width, y/body_height, z/body_depth))',3);
    push('corners.append(vertex(pos=point, normal=normal, color=body_color))',3);
    push('parts.append(triangle(vs=corners))',2);
  }else for(const part of model.parts){
    if(model.preset.studio&&part.name.startsWith('smile_')){if(part.name==='smile_joint_0')writeSmile();continue;}
    const props=[];
    for(const [key,value]of Object.entries(part.props)){
      let code=value.code;
      if(key==='pos'){
        if(part.type==='extrusion')continue;
        code=`origin + ${code} * scale`;
      }else if(['size','axis','radius','thickness'].includes(key))code=`${code} * scale`;
      else if(key==='path')code=`[origin + point * scale for point in ${code}]`;
      else if(key==='shape')code=`scale_shape(${code})`;
      props.push(`${key}=${code}`);
    }
    push(`${part.name} = ${part.type}(${props.join(', ')})`);
    if(!part.effect)push(`parts.append(${part.name})`);
  }
  push('object_3d = compound(parts)');push('effects = ['+model.parts.filter(p=>p.effect).map(p=>p.name).join(', ')+']');push('visible_parts = [object_3d] + effects');
  push('object_offset = vector(object_3d.pos - origin)');
  push('class Module:');
  push('def __init__(self):',2);push('self.object = object_3d',3);push('self.parts = visible_parts',3);push('self.active = True',3);
  if(hasSound){push('self._effect_running = False',3);push('self._handler = self.on_click',3);push('scene.bind("click", self._handler)',3);}
  push('@property',2);push('def pos(self):',2);push('return vector(self.object.pos - object_offset)',3);
  push('def move_to(self, new_pos):',2);push('self.object.pos = vector(new_pos) + object_offset',3);
  if(hasSound){
    push((hasWaves?'async ':'')+'def on_click(self, event):',2);push('if not self.active or self._effect_running:',3);push('return',4);
    push('picked = getattr(event, "pick", None)',3);push('if picked is None:',3);push('picked = scene.mouse.pick',4);push('picked = getattr(picked, "_id", picked)',3);
    push('if any(picked == getattr(item, "_id", item) for item in parts + [object_3d]):',3);
    push('# 소리와 비동기 이벤트는 VPyLab 확장입니다. 외부 환경에서는 해당 처리를 맞춰 주세요.',4);push('play_sound(tone_hz, duration=0.45)',4);
    if(hasWaves){
      push('# VPyLab의 비동기 이벤트로 음파 효과를 재사용합니다.',4);push('self._effect_running = True',4);push('try:',4);
      push('for wave in effects:',5);push('wave.visible = True',6);
      push('for frame in range(36):',5);push('if not self.active:',6);push('break',7);
      push('for index, wave in enumerate(effects):',6);push('wave.pos = vector(self.object.pos)',7);push('wave.radius = (0.35 + frame/36*1.8 + index*0.18) * scale',7);push('wave.opacity = max(0, 0.65 * (1-frame/36))',7);push('await rate(60)',6);
      push('finally:',4);push('for wave in effects:',5);push('wave.visible = False',6);push('self._effect_running = False',5);
    }
  }
  push('def dispose(self):',2);push('if not self.active:',3);push('return',4);push('self.active = False',3);push('for item in self.parts:',3);push('item.visible = False',4);
  if(hasSound)push('scene.unbind("click", self._handler)',3);
  push('return Module()');
  return lines.join('\n')+'\n';
}
export function moduleProgram(module,{file=false,metadata=!file}={}) {
  const model=buildForgeModel(module.recipe),fn=factoryName(module),header=MODULE_PREFIX+encode(JSON.stringify(module));
  const demo=[`scene.range = ${model.range}`,`scene.center = vector(${model.center.join(', ')})`,isForgeStudio(model.recipe)?'scene.forward = vector(-0.13, -0.145, -1)':'scene.forward = vector(-0.25, -0.12, -1)',`my_module = ${fn}(pos=vector(0, 0, 0), scale=1)`,'# 다른 위치에 더 만들기: '+`friend = ${fn}(pos=vector(3,0,0), scale=0.7)`];
  demo.push('# 이동: my_module.move_to(vector(2,0,0))','# 제거: my_module.dispose()');
  const body=moduleDefinition(module);
  return (metadata?header+'\n':'')+'from vpython import *\n\n'+body+'\n'+(file?'if __name__ == "__main__":\n'+demo.map(s=>'    '+s).join('\n'):demo.join('\n'))+'\n';
}
export const FORGE_STORAGE_VERSION=1;
const key=owner=>'vpylab:forge:v1:'+String(owner||'guest');
export function readForgeShelf(owner, storage) {
  try {
    storage??=globalThis.localStorage;const value=JSON.parse(storage.getItem(key(owner))||'null');
    if(value?.version!==FORGE_STORAGE_VERSION)return {modules:[],draft:null};
    const modules=(Array.isArray(value.modules)?value.modules:[]).slice(0,50).flatMap(m=>{try{return [parseModuleFile(JSON.stringify(m))]}catch{return []}});
    let draft=null;try{if(value.draft)draft=parseModuleFile(JSON.stringify(value.draft));}catch{ /* 손상된 초안만 제외 */ }
    return {modules,draft};
  }catch{return {modules:[],draft:null};}
}
export function writeForgeShelf(owner,value,storage) {
  try {storage??=globalThis.localStorage;storage.setItem(key(owner),JSON.stringify({version:FORGE_STORAGE_VERSION,...value}));return true;}catch{return false;}
}
// 초안 변경이 다른 탭의 새 보관 모듈을 오래된 목록으로 덮지 않게 분리합니다.
export function writeForgeDraft(owner,draft,storage){const saved=readForgeShelf(owner,storage);return writeForgeShelf(owner,{...saved,draft},storage);}
export function saveForgeShelfModule(owner,module,storage){const saved=readForgeShelf(owner,storage),modules=[module,...saved.modules.filter(m=>m.id!==module.id)].slice(0,50);return {modules,saved:writeForgeShelf(owner,{...saved,modules},storage)};}
export function removeForgeShelfModule(owner,id,storage){const saved=readForgeShelf(owner,storage),modules=saved.modules.filter(m=>m.id!==id);return {modules,saved:writeForgeShelf(owner,{...saved,modules},storage)};}
export const FORGE_LOGIN_TRANSFER='vpylab:forge:login-transfer:v1';
export function stageForgeLogin(draft,modules,session){try{session??=globalThis.sessionStorage;session.setItem(FORGE_LOGIN_TRANSFER,JSON.stringify({draft,modules,at:Date.now()}));return true;}catch{return false;}}
// 구형의 손대지 않은 시작 초안만 새 메인 모양으로 바꿉니다. 저장/포크는 보존합니다.
export function refreshForgeStarterDraft(module,savedModules=[]) {
  if(savedModules.some(saved=>saved.id===module?.id))return module;
  if(!module||module.recipe?.presetId!=='kirby'||module.recipe.appearance||module.recordId||module.source||module.references?.length||module.description||!['커비처럼 동그랗게','Round like Kirby'].includes(module.title))return module;
  const old={width:2.1,height:1.95,depth:1.7,eyeSize:.18,eyeGap:.18,cheekSize:.23,earLength:.55,armSize:.55,feetSize:.55,wall:.14,point:.48,tone:880};
  if(module.recipe.expression!=='smile'||module.recipe.accessory!=='none'||module.recipe.colors.join(',')!=='#f8a8cc,#da4772'||Object.entries(old).some(([k,v])=>module.recipe.params[k]!==v))return module;
  return makeForgeModule(createRecipe('kirby'),module);
}
export function initialForgeShelf(owner,storage,session){
  const saved=readForgeShelf(owner,storage),guest=owner?readForgeShelf(null,storage):null;
  if(owner)try{
    session??=globalThis.sessionStorage;const transfer=JSON.parse(session.getItem(FORGE_LOGIN_TRANSFER)||'null');
    if(transfer&&Date.now()-transfer.at>=0&&Date.now()-transfer.at<15*60*1000){
      const draft=parseModuleFile(JSON.stringify(guest?.draft||transfer.draft)),modules=[...(Array.isArray(transfer.modules)?transfer.modules:[]),...saved.modules,...(saved.draft?[saved.draft]:[])].flatMap(m=>{try{return[parseModuleFile(JSON.stringify(m))]}catch{return[]}});
      return {draft,modules:[...new Map(modules.map(m=>[m.id,m])).values()].slice(0,50),pendingLogin:true,guestDraft:guest?.draft};
    }
  }catch{/* 이관 자료가 손상되면 계정의 원래 작업을 읽습니다. */}
  return {...saved,guestDraft:guest?.draft,pendingLogin:false};
}
export function builtInModule(presetId){return makeForgeModule(createRecipe(presetId),{id:'builtin-'+presetId});}
