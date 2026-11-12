import { afterEach, expect, it } from 'vitest';
import * as THREE from 'three';
import legacyCode from './fixtures/kirby-legacy.py?raw';
import { welcomeParts, welcomeCode } from '../data/welcome-friends';
import { createWelcomeModel } from '../components/home/welcome-geometry';
import { buildForgeModel, createRecipe, forgeCommands, activeParameters, forgeParameters, validateRecipe } from './recipes';
import { builtInModule, moduleProgram, moduleFromPublishedCode, refreshForgeStarterDraft } from './modules';
import { clearScene, getMesh, processBatch } from '../engine/vpython-bridge';
import { hasPython, runPythonJobs } from '../test/python-runner';
const scene=new THREE.Scene();afterEach(()=>clearScene(scene));

it('새 커비의 기본 부품·색·위치·방향은 메인의 분홍 친구와 같다',()=>{
  const model=buildForgeModel(createRecipe('kirby')),main=createWelcomeModel('kirby');
  processBatch(forgeCommands(model),scene);scene.updateMatrixWorld(true);main.group.updateMatrixWorld(true);
  expect(model.parts).toHaveLength(welcomeParts('kirby').length);
  for(const part of welcomeParts('kirby')){
    const actual=getMesh('forge_'+part.name.replaceAll('-','minus')),expected=main.group.getObjectByName(part.name);
    expect(actual.getWorldPosition(new THREE.Vector3()).distanceTo(expected.getWorldPosition(new THREE.Vector3())),part.name).toBeLessThan(1e-7);
    expect(Math.abs(actual.getWorldQuaternion(new THREE.Quaternion()).dot(expected.getWorldQuaternion(new THREE.Quaternion()))),part.name).toBeCloseTo(1,7);
    actual.material.color.toArray().forEach((v,i)=>expect(v,part.name).toBeCloseTo(expected.material.color.toArray()[i],8));
    expect(actual.material.roughness,part.name).toBeCloseTo(expected.material.roughness,6);
    const size=part.size||[part.radius*2,part.radius*2,part.radius*2];
    model.parts.find(p=>p.name===part.name.replaceAll('-','minus')).props.size.value.forEach((v,i)=>expect(v,part.name).toBeCloseTo(size[i],7));
  }
  main.dispose();
});
it('손대지 않은 구형 시작 초안만 바꾸고 수정·저장·포크 작품은 보존한다',()=>{
  const old=moduleFromPublishedCode(legacyCode.trim());expect(old).not.toBeNull();
  const upgraded=refreshForgeStarterDraft(old);expect(upgraded.id).toBe(old.id);expect(upgraded.recipe.appearance).toBe('welcome-v1');
  for(const module of [{...old,title:'내가 만든 캐릭터'},{...old,description:'내 작품'},{...old,source:{id:'origin'}},{...old,references:[{url:'https://example.org'}]},{...old,recipe:{...old.recipe,expression:'surprise'}},{...old,recipe:{...old.recipe,accessory:'hat'}},{...old,recipe:{...old.recipe,colors:['#ffffff','#da4772']}},{...old,recordId:'10000000-0000-4000-8000-000000000001'},{...old,recipe:{...old.recipe,params:{...old.recipe.params,width:2.2}}}])expect(refreshForgeStarterDraft(module)).toBe(module);
  expect(refreshForgeStarterDraft(old,[old])).toBe(old);
});
it('이미 공개한 구형 커비 코드는 변경 전과 바이트 단위로 같고 다시 포크할 수 있다',()=>{
  const old=moduleFromPublishedCode(legacyCode.trim());expect(old).not.toBeNull();expect(old.recipe.appearance).toBeUndefined();
  expect(moduleProgram(old).trim()).toBe(legacyCode.trim());
  expect(buildForgeModel(old.recipe).parts.some(p=>p.name==='smile_minus1')).toBe(true);
  expect(()=>validateRecipe({...createRecipe('kirby'),appearance:'unknown'})).toThrow();
});
it.skipIf(!hasPython())('복사한 Python 완제품도 메인과 같은 형상이며 표정·슬라이더 끝값이 실행된다',()=>{
  const base=createRecipe('kirby'),jobs=[{id:'default',label:'shape',code:moduleProgram(builtInModule('kirby'))}];
  for(const expression of ['smile','surprise','sleepy'])for(const end of ['min','max']){
    const recipe={...base,expression,params:{...base.params}};for(const key of activeParameters(recipe))recipe.params[key]=forgeParameters[key][end];
    jobs.push({id:expression,label:end,code:moduleProgram({...builtInModule('kirby'),recipe})});
  }
  jobs[0].recipe=base;
  for(const job of jobs.slice(1)){
    const recipe={...base,expression:job.id,params:{...base.params}};
    for(const key of activeParameters(recipe))recipe.params[key]=forgeParameters[key][job.label];
    job.recipe=recipe;
  }
  const noCheekRecipe={...base,params:{...base.params,cheekSize:0}};
  jobs.push({id:'no-cheeks',label:'shape',recipe:noCheekRecipe,code:moduleProgram({...builtInModule('kirby'),recipe:noCheekRecipe})});
  jobs.push({id:'scaled',label:'shape',recipe:base,code:moduleProgram(builtInModule('kirby')).replace('pos=vector(0, 0, 0), scale=1)','pos=vector(3, -1, 2), scale=0.7)')});
  jobs.push({id:'welcome',label:'shape',recipe:base,code:welcomeCode('kirby')});
  const fresh=builtInModule('kirby');expect(moduleFromPublishedCode(moduleProgram(fresh))).toEqual(fresh);
  const results=runPythonJobs(jobs);
  for(const job of jobs){
    const result=results.get(job.id+':'+job.label);expect(result.error,job.id+':'+job.label).toBeNull();
    const expected=forgeCommands(buildForgeModel(job.recipe)),actual=result.commands.filter(c=>c.action==='create'&&c.type!=='local_light');
    // welcomeCode에는 조명이 별도 명령으로 들어가며, 움직이기 전 생성 부품을 비교합니다.
    expect(actual).toHaveLength(expected.length);
    const scale=job.id==='scaled'?.7:1,origin=job.id==='scaled'?[3,-1,2]:[0,0,0];
    expected.forEach((part,i)=>{for(const key of ['pos','size','axis','up','color'])if(part[key]&&!(job.id==='welcome'&&['axis','up'].includes(key)))part[key].forEach((v,j)=>{
      const wanted=key==='pos'?v*scale+origin[j]:['size','axis'].includes(key)?v*scale:v;
      const values=key==='size'&&actual[i].type==='sphere'?Array(3).fill(actual[i].radius*2):actual[i][key];
      expect(values[j],job.id+':'+job.label+':'+part.id+':'+key).toBeCloseTo(wanted,4);
    });});
    expect(result.commands.find(c=>c.action==='compound').sub_ids).toHaveLength(expected.length);
  }
  const result=results.get('default:shape'),creates=result.commands.filter(c=>c.action==='create');
  const compound=result.commands.find(c=>c.action==='compound');expect(compound.sub_ids).toHaveLength(welcomeParts('kirby').length);
  processBatch(result.commands,scene);scene.updateMatrixWorld(true);
  const main=createWelcomeModel('kirby');main.group.updateMatrixWorld(true);
  for(const [i,part]of welcomeParts('kirby').entries()){
    const mesh=getMesh(creates[i].id);expect(mesh.getWorldPosition(new THREE.Vector3()).toArray().map((v,j)=>Math.abs(v-part.pos[j])).every(d=>d<1e-5),part.name).toBe(true);
    const expected=main.group.getObjectByName(part.name),a=new THREE.Box3().setFromObject(mesh),b=new THREE.Box3().setFromObject(expected);
    for(const axis of ['x','y','z']){expect(a.min[axis],part.name).toBeCloseTo(b.min[axis],3);expect(a.max[axis],part.name).toBeCloseTo(b.max[axis],3);}
    expect(Math.abs(mesh.getWorldQuaternion(new THREE.Quaternion()).dot(expected.getWorldQuaternion(new THREE.Quaternion()))),part.name).toBeCloseTo(1,5);
    if(part.axis||part.angle)expect(Math.hypot(...creates[i].axis),part.name).toBeCloseTo(creates[i].size[0],5);
    creates[i].color.forEach((v,j)=>expect(v,part.name).toBeCloseTo(new THREE.Color(part.color).toArray()[j],5));
  }
  main.dispose();
  const noCheeks=buildForgeModel({...base,params:{...base.params,cheekSize:0}});expect(noCheeks.parts.some(p=>p.name.startsWith('cheek'))).toBe(false);
},120000);
