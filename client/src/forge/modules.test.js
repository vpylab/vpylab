import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { activeParameters, buildForgeModel, createRecipe, forgeCommands, forgeParameters, forgePresets, visibleForgePresets } from './recipes';
import { builtInModule, factoryName, makeForgeModule, moduleDefinition, moduleFromPublishedCode, moduleProgram, parseModuleFile, readForgeShelf, writeForgeShelf, writeForgeDraft, saveForgeShelfModule, initialForgeShelf, stageForgeLogin } from './modules';
import { hasPython, runPythonJobs } from '../test/python-runner';
import { clearScene, getMesh, processBatch } from '../engine/vpython-bridge';
import { getForgeTutorial } from '../data/forge-tutorial';

const scene=new THREE.Scene();afterEach(()=>clearScene(scene));
const run=(code,rateLimit=20000)=>runPythonJobs([{id:'forge',label:'case',code,rateLimit}]).get('forge:case');
const box=()=>{scene.updateMatrixWorld(true);return new THREE.Box3().setFromObject(scene);};
it('단일 오브젝트를 다루고 공전 시스템을 포함하지 않는다',()=>{
  expect(visibleForgePresets).toHaveLength(16);expect(visibleForgePresets.filter(p=>p.kind==='character')).toHaveLength(4);expect(forgePresets.map(p=>p.id)).not.toContain('earth-moon');
  expect(forgePresets.every(p=>['character','shape','asset'].includes(p.kind))).toBe(true);
});
it('파일의 설정만 가져오며 잘못된 값·알 수 없는 형식·큰 입력을 거부한다',()=>{
  const module=builtInModule('kirby');expect(parseModuleFile(JSON.stringify(module)).recipe).toEqual(module.recipe);
  for(const invalid of [{...module,version:2},{...module,recipe:{...module.recipe,presetId:'earth-moon'}},{...module,recipe:{...module.recipe,params:{...module.recipe.params,width:100}}},{...module,recipe:{...module.recipe,colors:['javascript:alert(1)','#ffffff']}}])expect(()=>parseModuleFile(JSON.stringify(invalid))).toThrow();
  expect(()=>parseModuleFile(' '.repeat(97000))).toThrow();expect(moduleFromPublishedCode('print("not a module")')).toBeNull();
  expect(moduleFromPublishedCode(moduleProgram(module)).recipe).toEqual(module.recipe);
  expect(moduleProgram(module,{metadata:false})).toMatch(/^from vpython import \*/);
  expect(moduleProgram(module,{file:true})).not.toContain('vpylab-forge:v1');
  expect(moduleFromPublishedCode(moduleProgram(module)+'\nprint("edited")')).toBeNull();
  expect(parseModuleFile(JSON.stringify({...module,title:''})).title).toBe(module.title);
  expect(()=>parseModuleFile(JSON.stringify({...module,id:'../../wrong'}))).toThrow('ID');
});
it('다른 탭의 새 보관 모듈을 초안 저장으로 덮지 않고 로그인 때 게스트 작업을 이어 받는다',()=>{
  const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)},sessions=new Map(),session={getItem:k=>sessions.get(k),setItem:(k,v)=>sessions.set(k,v)};
  const a=builtInModule('cat'),b=builtInModule('bell');saveForgeShelfModule(null,a,storage);saveForgeShelfModule(null,b,storage);writeForgeDraft(null,a,storage);expect(readForgeShelf(null,storage).modules).toHaveLength(2);
  writeForgeShelf('account',{modules:[],draft:b},storage);stageForgeLogin(a,[a],session);
  const restored=initialForgeShelf('account',storage,session);expect(restored.pendingLogin).toBe(true);expect(restored.draft.id).toBe(a.id);expect(restored.modules.some(m=>m.id===b.id)).toBe(true);
});
it('같은 레시피의 함수 이름은 안정적이고 Python 파일은 실행 진입점을 제공한다',()=>{
  const module=builtInModule('bear');expect(factoryName(module)).toBe(factoryName(builtInModule('bear')));expect(moduleProgram(module,{file:true})).toContain('if __name__ == "__main__":');
});
it('허용한 참고 링크 8개를 기록해도 공개 모듈을 다시 읽을 수 있다',()=>{
  const references=Array.from({length:8},(_,i)=>({title:'참고 '+i,url:'https://example.com/'+String(i)+'x'.repeat(1700)}));
  const module=makeForgeModule(createRecipe('bear'),{references});
  expect(moduleFromPublishedCode(moduleProgram(module)).references).toEqual(module.references);
});
it('계정별·버전별 보관, 손상 항목 복구와 용량 실패를 구별한다',()=>{
  const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)},a=builtInModule('cat');
  expect(writeForgeShelf('a',{modules:[a],draft:a},storage)).toBe(true);expect(readForgeShelf('a',storage).modules).toHaveLength(1);expect(readForgeShelf('b',storage).modules).toHaveLength(0);
  expect(writeForgeShelf('a',{modules:[{bad:true},a],draft:{bad:true}},storage)).toBe(true);expect(readForgeShelf('a',storage)).toEqual({modules:[a],draft:null});
  expect(writeForgeShelf('a',{}, {setItem:()=>{throw Error('quota');}})).toBe(false);
});
describe.skipIf(!hasPython())('대장간 출력의 실제 Python·기하 의미',()=>{
  it.each(forgePresets.map(p=>[p.id]))('%s 미리보기와 내보낸 Python이 같은 경계 상자를 만든다',id=>{
    const model=buildForgeModel(createRecipe(id));processBatch(forgeCommands(model),scene);const before=box();clearScene(scene);
    const result=run(moduleProgram(builtInModule(id)));expect(result.error,id).toBeNull();processBatch(result.commands,scene);const after=box();
    for(const axis of ['x','y','z']){expect(after.min[axis],id+' min '+axis).toBeCloseTo(before.min[axis],4);expect(after.max[axis],id+' max '+axis).toBeCloseTo(before.max[axis],4);}
  },20000);
  it('모든 조절기의 최소·최대 조합과 표정·장식이 독립 실행된다',()=>{
    const jobs=[];
    for(const p of forgePresets)for(const end of ['min','max']){
      const recipe=createRecipe(p.id);for(const key of activeParameters(recipe))recipe.params[key]=forgeParameters[key][end];
      jobs.push({id:p.id,label:end,code:moduleProgram(makeForgeModule(recipe))});
    }
    for(const expression of ['smile','surprise','sleepy'])for(const accessory of ['none','hat','bow','antenna'])jobs.push({id:expression,label:accessory,code:moduleProgram(makeForgeModule({...createRecipe('cat'),expression,accessory}))});
    const results=runPythonJobs(jobs);for(const [id,r]of results)expect(r.error,id).toBeNull();
  },30000);
  it('복사한 만두의 pos.x를 바꾸면 화면의 모든 부품이 정확히 한 칸 이동한다',()=>{
    const result=run(moduleProgram(builtInModule('dumpling'),{metadata:false})+'\nmy_module.pos.x += 1\n');
    expect(result.error).toBeNull();
    const compound=result.commands.find(c=>c.action==='compound');
    const move=result.commands.findIndex(c=>c.id===compound.id && c.action==='update' && c.pos);
    expect(move).toBeGreaterThan(result.commands.indexOf(compound));
    processBatch(result.commands.slice(0,move),scene);
    const positions=()=>compound.sub_ids.map(id=>getMesh(id).getWorldPosition(new THREE.Vector3()));
    const before=positions();
    processBatch(result.commands.slice(move),scene);
    positions().forEach((point,i)=>expect(point.sub(before[i]).distanceTo(new THREE.Vector3(1,0,0))).toBeLessThan(1e-7));
  });
  it('위치·배율·이동과 인스턴스별 색·제거가 서로 간섭하지 않는다',()=>{
    const m=builtInModule('kirby'),fn=factoryName(m),code='from vpython import *\n'+moduleDefinition(m)+`\na=${fn}(pos=vector(3,2,1),scale=2)\nb=${fn}(pos=vector(-3,0,0),scale=.5)\na.object.pos.x+=1\na.object.pos.y+=1\na.move_to(vector(5,3,2))\na.object.color=color.green\nassert b.object.color == color.white\nassert mag(a.pos-vector(5,3,2))<0.000001\nb.dispose()\nassert a.object.visible and not b.object.visible\n`;
    const result=run(code);expect(result.error).toBeNull();processBatch(result.commands,scene);
    const compounds=result.commands.filter(c=>c.action==='compound');expect(getMesh(compounds[0].id).visible).toBe(true);expect(getMesh(compounds[1].id).visible).toBe(false);
    expect(getMesh(compounds[0].id).children[0].material.color.g).toBeGreaterThan(0);
  });
  it('교재의 세 단계가 실행되고 아이템을 먹으면 해당 compound만 색이 바뀐다',()=>{
    for(const step of ['build','move','collect'])expect(run(getForgeTutorial('forge-character',step).code,120).error,step).toBeNull();
    let code=getForgeTutorial('forge-character','collect').code;
    code=code.slice(0,code.indexOf('while True:'))+`\noriginal=vector(other.color)\nmove_character(1.5,0)\ncollect_items()\nassert player.color==vector(1,.45,.7)\nassert other.color==original\nassert not items[0].visible and items[1].visible\n`;
    expect(run(code).error).toBeNull();
  });
  it('서로 다른 종의 실제 클릭은 자기 소리만 내며 dispose 뒤에는 울리지 않는다',()=>{
    const a=makeForgeModule({...createRecipe('bell'),bellMode:'sound'}),b=makeForgeModule({...createRecipe('bell'),bellMode:'sound',params:{...createRecipe('bell').params,tone:440}});
    const code='from vpython import *\n'+moduleDefinition(a)+'\n'+moduleDefinition(b)+`\na=${factoryName(a)}(pos=vector(-2,0,0))\nb=${factoryName(b)}(pos=vector(2,0,0))\n`;
    const base=run(code);expect(base.error).toBeNull();const creates=base.commands.filter(c=>c.action==='create');
    const jobs=[{id:'a',label:'click',code,events:[{name:'click',pick:creates[0].id}]},{id:'b',label:'click',code,events:[{name:'click',pick:creates[4].id}]},{id:'dispose',label:'click',code:code+'\na.dispose()\na.dispose()\n',events:[{name:'click',pick:creates[0].id}]},{id:'empty',label:'click',code,events:[{name:'click',pick:null}]}];
    const result=runPythonJobs(jobs);
    expect(result.get('a:click').commands.filter(c=>c.action==='sound').map(c=>c.frequency)).toEqual([880]);
    expect(result.get('b:click').commands.filter(c=>c.action==='sound').map(c=>c.frequency)).toEqual([440]);
    for(const key of ['dispose:click','empty:click'])expect(result.get(key).commands.filter(c=>c.action==='sound')).toHaveLength(0);
    for(const r of result.values())expect(r.error).toBeNull();
  });
  it('종은 모양만·소리·음파 단계로 나뉘고 음파는 새 객체를 누적 생성하지 않는다',()=>{
    const jobs=['shape','sound','waves'].map(mode=>({id:mode,label:'bell',code:moduleProgram(makeForgeModule({...createRecipe('bell'),bellMode:mode})),events:[{name:'click',pick:'obj_1'},{name:'click',pick:null}]}));
    const results=runPythonJobs(jobs);
    for(const r of results.values())expect(r.error).toBeNull();
    expect(results.get('shape:bell').commands.some(c=>c.action==='sound')).toBe(false);
    expect(results.get('sound:bell').commands.filter(c=>c.action==='sound')).toHaveLength(1);
    const waves=results.get('waves:bell').commands;expect(waves.filter(c=>c.action==='create'&&c.type==='ring')).toHaveLength(4);
    expect(waves.some(c=>c.action==='update'&&c.radius>2)).toBe(true);
    expect(waves.filter(c=>c.action==='update'&&c.visible===false).length).toBeGreaterThanOrEqual(3);
  });
});
it('로그인 창을 닫고 편집한 게스트의 최신 초안으로 이어 간다',()=>{
  const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)},sessions=new Map(),session={getItem:k=>sessions.get(k),setItem:(k,v)=>sessions.set(k,v)};
  const old=builtInModule('cat'),latest={...old,title:'로그인 전 마지막 편집'};stageForgeLogin(old,[],session);writeForgeDraft(null,latest,storage);
  expect(initialForgeShelf('account',storage,session).draft.title).toBe(latest.title);
});
it('길이 경계의 공백·이모지 제목도 등록 후 그대로 다시 읽는다',()=>{
  for(const title of ['가'.repeat(75)+' · 내 포크','🙂'.repeat(81),'가'.repeat(79)+' 나']){
    const module=makeForgeModule(createRecipe('bear'),{title});expect(moduleFromPublishedCode(moduleProgram(module)).title).toBe(module.title);
  }
});
