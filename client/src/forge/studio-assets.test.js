import {expect,it,afterEach} from 'vitest';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import legacyHashes from './fixtures/legacy-library.sha256.json';
import {forgePresets,visibleForgePresets,createRecipe,buildForgeModel,forgeCommands,activeParameters,forgeParameters} from './recipes';
import {builtInModule,moduleProgram,moduleFromPublishedCode,factoryName,moduleDefinition} from './modules';
import {hasPython,runPythonJobs} from '../test/python-runner';
import {createWelcomeModel} from '../components/home/welcome-geometry';
import {welcomeParts} from '../data/welcome-friends';
import {processBatch,clearScene,getMesh} from '../engine/vpython-bridge';
const scene=new THREE.Scene();afterEach(()=>clearScene(scene));
const studio=forgePresets.filter(p=>p.studio);
it('시작 목록은 캐릭터 4종·프로젝트 물건 7종·기본 모양 5종이며 옛 작품 코드는 같다',()=>{
  expect(visibleForgePresets.filter(p=>p.kind==='character').map(p=>p.id)).toEqual(['kirby','dumpling','flashlight','toolbox']);
  expect(visibleForgePresets.filter(p=>p.kind==='asset')).toHaveLength(7);expect(visibleForgePresets.filter(p=>p.kind==='shape')).toHaveLength(5);
  for(const [id,hash]of Object.entries(legacyHashes))expect(createHash('sha256').update(moduleProgram(builtInModule(id),{publishedFormat:'wrapper'})).digest('hex'),id).toBe(hash);
  for(const p of studio){const m=builtInModule(p.id);expect(moduleFromPublishedCode(moduleProgram(m)),p.id).toEqual(m);expect(buildForgeModel(m.recipe).parts.length).toBeLessThanOrEqual(p.kind==='character'?80:10);}
});
it('종전 배포본 두 종류도 원문 그대로 검증하고 새로 복사하면 기본 도형을 돌려준다',()=>{
  const hashes={
    dumpling:'bcdaca9666756f744d2654121edaa9c0190e5a8583bea9f338085c3f8ad3b232',
    bell:'a5bcd33a0175290b001fb808d6eac04a65f50af86576fb3c36716768363b3e72',
  };
  for(const [id,hash] of Object.entries(hashes)){
    const module=builtInModule(id);
    if(id==='bell')module.recipe.bellMode='waves';
    const previous=moduleProgram(module,{publishedFormat:'aliases'});
    expect(createHash('sha256').update(previous).digest('hex')).toBe(hash);
    expect(moduleFromPublishedCode(previous)).toEqual(module);
    expect(moduleFromPublishedCode(previous+'\nprint(1)')).toBeNull();
    expect(moduleProgram(module)).not.toContain('def move_to');
  }
});

it.skipIf(!hasPython())('새 에셋은 최소·최대·두 인스턴스 이동에서 Python과 미리보기의 형상·색이 같다',()=>{
  const jobs=[];
  for(const p of studio)for(const end of ['default','min','max']){
    const recipe=createRecipe(p.id);if(end!=='default')for(const key of activeParameters(recipe))recipe.params[key]=forgeParameters[key][end];
    jobs.push({id:p.id,label:end,recipe,code:moduleProgram({...builtInModule(p.id),recipe})});
  }
  for(const id of ['dumpling','flashlight','toolbox'])for(const expression of ['smile','surprise','sleepy'])for(const accessory of ['none','hat','bow','antenna']){const recipe={...createRecipe(id),expression,accessory};jobs.push({id,label:expression+'-'+accessory,recipe,code:moduleProgram({...builtInModule(id),recipe})});}
  for(const id of ['flashlight','toolbox'])for(const width of [1.3,2.8])for(const height of [1.3,2.8])for(const expression of ['surprise','sleepy'])for(const accessory of ['hat','bow','antenna']){
    const recipe=createRecipe(id);recipe.params.width=width;recipe.params.height=height;recipe.expression=expression;recipe.accessory=accessory;
    jobs.push({id,label:[width,height,expression,accessory].join('-'),recipe,code:moduleProgram({...builtInModule(id),recipe})});
    const model=buildForgeModel(recipe),find=name=>model.parts.find(p=>p.name===name).props;
    const mouth=find('mouth');if(id==='flashlight')expect(mouth.pos.value[2]).toBeGreaterThan(find('body').radius.value);else expect(mouth.pos.value[2]).toBeCloseTo(.46*recipe.params.depth/1.1,7);
    if(accessory==='bow'&&id==='flashlight'){const bow=find('bow_minus1');expect(bow.pos.value[2]-bow.size.value[2]/2).toBeGreaterThan(find('body').radius.value);}
    if(id==='toolbox'&&accessory!=='bow'){
      const handle=find('handle'),top=handle.pos.value[1]+handle.radius.value+handle.thickness.value;
      expect(accessory==='hat'?find('hat_brim').pos.value[1]-find('hat_brim').size.value[1]/2:find('antenna').pos.value[1]).toBeGreaterThanOrEqual(top-1e-8);
    }
  }
  const results=runPythonJobs(jobs);
  for(const job of jobs){
    const key=job.id+':'+job.label,result=results.get(key);expect(result.error,key).toBeNull();
    const model=buildForgeModel(job.recipe),expected=forgeCommands(model);processBatch(expected,scene);scene.updateMatrixWorld(true);
    const before=model.parts.map(p=>{const m=getMesh('forge_'+p.name);return{bounds:new THREE.Box3().setFromObject(m),color:m.material.color.toArray()};});clearScene(scene);
    processBatch(result.commands,scene);scene.updateMatrixWorld(true);const creates=result.commands.filter(c=>c.action==='create');expect(creates,key).toHaveLength(model.parts.length);
    for(const [i,c]of creates.entries()){
      const mesh=getMesh(c.id),bounds=new THREE.Box3().setFromObject(mesh);
      for(const axis of ['x','y','z'])for(const edge of ['min','max'])expect(bounds[edge][axis],key+':'+model.parts[i].name).toBeCloseTo(before[i].bounds[edge][axis],4);
      mesh.material.color.toArray().forEach((v,j)=>expect(v,key).toBeCloseTo(before[i].color[j],5));
    }
    const compound=result.commands.find(c=>c.action==='compound');expect(compound.sub_ids,key).toHaveLength(model.parts.length);clearScene(scene);
  }
  const copies=studio.map(p=>{const m=builtInModule(p.id),fn=factoryName(m);return{id:p.id,label:'copies',code:'from vpython import *\n'+moduleDefinition(m)+`\na=${fn}(pos=vector(3,0,0),scale=.7)\nb=${fn}(pos=vector(-3,0,0),scale=1.3)\nassert isinstance(a, compound)\na.pos.x+=1\na.visible=False\nassert b.visible\nassert mag(a.pos-vector(4,0,0))<0.0001\nb.visible=False\nassert not b.visible\n`};});
  for(const [key,r]of runPythonJobs(copies))expect(r.error,key).toBeNull();
},20000);

it('새 캐릭터 셋은 메인과 같은 기본 부품·색·방향이며 몸 크기 슬라이더도 작동한다',()=>{
  for(const id of ['dumpling','flashlight','toolbox']){
    const recipe=createRecipe(id),model=buildForgeModel(recipe),main=createWelcomeModel(id);main.group.updateMatrixWorld(true);
    expect(model.parts).toHaveLength(welcomeParts(id).length);processBatch(forgeCommands(model),scene);scene.updateMatrixWorld(true);
    for(const p of welcomeParts(id)){
      const mesh=getMesh('forge_'+p.name.replaceAll('-','minus')),reference=main.group.getObjectByName(p.name);
      expect(mesh.getWorldPosition(new THREE.Vector3()).distanceTo(reference.getWorldPosition(new THREE.Vector3())),id+':'+p.name).toBeLessThan(1e-7);
      expect(Math.abs(mesh.getWorldQuaternion(new THREE.Quaternion()).dot(reference.getWorldQuaternion(new THREE.Quaternion()))),id+':'+p.name).toBeCloseTo(1,7);
      mesh.material.color.toArray().forEach((v,j)=>expect(v,id+':'+p.name).toBeCloseTo(reference.material.color.toArray()[j],8));
    }
    const before=new THREE.Box3().setFromObject(getMesh('forge_body')).getSize(new THREE.Vector3());clearScene(scene);main.dispose();
    const changed={...recipe,params:{...recipe.params,width:2.7,height:2.6,depth:2.2}};
    processBatch(forgeCommands(buildForgeModel(changed)),scene);scene.updateMatrixWorld(true);const after=new THREE.Box3().setFromObject(getMesh('forge_body')).getSize(new THREE.Vector3());
    for(const [i,key]of ['width','height','depth'].entries()){const scaleKey=id==='flashlight'&&key==='depth'?'width':key;expect(after.getComponent(i)/before.getComponent(i),id+':'+key).toBeCloseTo(changed.params[scaleKey]/recipe.params[scaleKey],6);}
    clearScene(scene);
  }
});

it('깃발은 깃대에서 오른쪽으로 펼쳐지고 크리스털 꼭짓점은 몸통 위에서 시작한다',()=>{
 const flag=buildForgeModel(createRecipe('flag'));processBatch(forgeCommands(flag),scene);scene.updateMatrixWorld(true);
 const cloth=getMesh('forge_flag'),pole=getMesh('forge_pole'),bounds=new THREE.Box3().setFromObject(cloth);expect(bounds.min.x).toBeCloseTo(pole.position.x,5);expect(bounds.max.x).toBeGreaterThan(pole.position.x+1);clearScene(scene);
 const crystal=buildForgeModel(createRecipe('crystal'));processBatch(forgeCommands(crystal),scene);scene.updateMatrixWorld(true);
 for(let i=0;i<3;i++){const a=new THREE.Box3().setFromObject(getMesh('forge_crystal_body_'+i)),b=new THREE.Box3().setFromObject(getMesh('forge_crystal_tip_'+i));expect(b.min.y).toBeCloseTo(a.max.y,5);for(const axis of ['x','z']){expect(a.min[axis]).toBeCloseTo(b.min[axis],5);expect(a.max[axis]).toBeCloseTo(b.max[axis],5);}}
});
