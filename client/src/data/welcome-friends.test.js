import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { welcomeCode, welcomeFriends, welcomeParts, welcomeMotionCode, welcomeBounce } from './welcome-friends';
import { getTutorial } from './tutorials';
import { createWelcomeModel } from '../components/home/welcome-geometry';
import { clearScene, getMesh, processBatch } from '../engine/vpython-bridge';
import { hasPython, runPythonJobs } from '../test/python-runner';
const scene=new THREE.Scene();afterEach(()=>clearScene(scene));
describe.skipIf(!hasPython())('환영 친구의 화면과 실제 VPython',()=>{
 it.each(welcomeFriends.map(f=>[f.id]))('%s는 같은 기본 도형으로 재현되고 인사 후 종료한다',id=>{
  const code=welcomeCode(id),results=runPythonJobs([{id,label:'rest',code:code.split('for frame in range')[0]},{id,label:'wave',code}]);
  for(const result of results.values()){expect(result.error,id).toBeNull();expect(result.stopped).toBe(false);expect(result.pendingTasks).toBe(0);}
  const model=createWelcomeModel(id);model.group.updateMatrixWorld(true);const expected=new THREE.Box3().setFromObject(model.group);processBatch(results.get(id+':rest').commands,scene);scene.updateMatrixWorld(true);const actual=new THREE.Box3().setFromObject(scene);
  for(const axis of ['x','y','z']){expect(actual.min[axis],id+' min '+axis).toBeCloseTo(expected.min[axis],2);expect(actual.max[axis],id+' max '+axis).toBeCloseTo(expected.max[axis],2);}
  const baseCreates=results.get(id+':rest').commands.filter(c=>c.action==='create'&&!['local_light','distant_light'].includes(c.type));
  for(const [i,part]of welcomeParts(id).entries()){
    const preview=model.group.getObjectByName(part.name),rendered=getMesh(baseCreates[i].id);
    expect(preview.getWorldPosition(new THREE.Vector3()).distanceTo(rendered.getWorldPosition(new THREE.Vector3())),id+' '+part.name+' pos').toBeLessThan(1e-5);
    expect(Math.abs(preview.getWorldQuaternion(new THREE.Quaternion()).dot(rendered.getWorldQuaternion(new THREE.Quaternion()))),id+' '+part.name+' rotation').toBeCloseTo(1,5);
  }
  const parts=welcomeParts(id);expect(parts.every(p=>!['curve','helix','label'].includes(p.type))).toBe(true);const compound=results.get(id+':wave').commands.find(c=>c.action==='compound');expect(compound.sub_ids).toHaveLength(parts.length);expect(results.get(id+':wave').commands.some(c=>c.action==='update'&&c.id===compound.id&&c.pos)).toBe(true);model.dispose();
 },120000);
});
it.skipIf(!hasPython())('프렌즈는 독립 compound 네 개를 목록으로 움직이고 제자리로 돌아온다',()=>{
 const code=welcomeCode('friends'),result=runPythonJobs([{id:'friends',label:'bounce',code}]).get('friends:bounce');
 expect(result.error).toBeNull();expect(result.pendingTasks).toBe(0);expect(result.stopped).toBe(false);
 const compounds=result.commands.filter(c=>c.action==='compound');expect(compounds).toHaveLength(4);
 for(const [i,c] of compounds.entries()){
  expect(c.sub_ids).toHaveLength(welcomeParts(welcomeFriends[i].id).length);
  const updates=result.commands.filter(u=>u.action==='update'&&u.id===c.id&&u.pos);
  expect(new Set(updates.map(u=>u.pos[1])).size).toBeGreaterThan(20);
 }
 processBatch(result.commands,scene);const model=createWelcomeModel('friends');model.group.updateMatrixWorld(true);scene.updateMatrixWorld(true);
 const expected=new THREE.Box3().setFromObject(model.group),actual=new THREE.Box3().setFromObject(scene);
 for(const axis of ['x','y','z']){expect(actual.min[axis]).toBeCloseTo(expected.min[axis],2);expect(actual.max[axis]).toBeCloseTo(expected.max[axis],2);}
 expect(getTutorial('welcome-friend','friends').activeStep).toBe('friends');model.dispose();
},120000);
describe.skipIf(!hasPython())('친구별 전용 모션의 실제 부품 변형',()=>{
 it.each(welcomeFriends.map(f=>[f.id]))('%s의 정점 모션은 Python과 같고 완제품으로 종료한다',id=>{
  const code=welcomeMotionCode(id),peak=code.replace('for frame in range(73):','for frame in [36]:').split('# 모션을 마치고')[0];
  const jobs=runPythonJobs([{id,label:'peak',code:peak},{id,label:'done',code}]);
  for(const result of jobs.values()){expect(result.error).toBeNull();expect(result.pendingTasks).toBe(0);}
  const result=jobs.get(id+':peak'),creates=result.commands.filter(c=>c.action==='create'&&!['local_light','distant_light'].includes(c.type));processBatch(result.commands,scene);scene.updateMatrixWorld(true);
  const model=createWelcomeModel(id);model.animate(1.2);model.group.updateMatrixWorld(true);if(id==='flashlight'){expect(model.group.children.some(o=>o.isPointLight&&o.intensity>0)).toBe(true);expect(model.group.getObjectByName('flashlight_beam').material.opacity).toBeGreaterThan(0);}
  for(const [i,part]of welcomeParts(id).entries()){
   const preview=model.group.getObjectByName(part.name),rendered=getMesh(creates[i].id);
   expect(preview.getWorldPosition(new THREE.Vector3()).distanceTo(rendered.getWorldPosition(new THREE.Vector3())),id+' '+part.name).toBeLessThan(1e-5);
   expect(Math.abs(preview.getWorldQuaternion(new THREE.Quaternion()).dot(rendered.getWorldQuaternion(new THREE.Quaternion()))),id+' '+part.name).toBeCloseTo(1,5);
   const a=new THREE.Box3().setFromObject(preview),b=new THREE.Box3().setFromObject(rendered);for(const axis of ['x','y','z']){expect(a.min[axis],part.name).toBeCloseTo(b.min[axis],2);expect(a.max[axis],part.name).toBeCloseTo(b.max[axis],2);}
  }
  if(id==='flashlight'){
   const beam=creates.at(-1),lamp=result.commands.find(c=>c.action==='create'&&c.type==='local_light');expect(getMesh(beam.id).material.opacity).toBeCloseTo(.12,5);expect(getMesh(lamp.id).color.toArray()).toEqual([1,.91,.54]);
  }
  const done=jobs.get(id+':done');expect(done.commands.filter(c=>c.action==='compound')).toHaveLength(1);
  clearScene(scene);processBatch(done.commands,scene);scene.updateMatrixWorld(true);const completed=done.commands.find(c=>c.action==='compound'),freshRest=createWelcomeModel(id);freshRest.group.updateMatrixWorld(true);
  for(const [i,p]of welcomeParts(id).entries()){
   const actual=getMesh(completed.sub_ids[i]),expected=freshRest.group.getObjectByName(p.name);
   expect(actual.getWorldPosition(new THREE.Vector3()).distanceTo(expected.getWorldPosition(new THREE.Vector3())),p.name+' Python finish').toBeLessThan(1e-5);
   const a=new THREE.Box3().setFromObject(actual),b=new THREE.Box3().setFromObject(expected);for(const axis of ['x','y','z']){expect(a.min[axis],p.name+' Python size').toBeCloseTo(b.min[axis],2);expect(a.max[axis],p.name+' Python size').toBeCloseTo(b.max[axis],2);}
  }freshRest.dispose();
  model.animate(0);if(id==='flashlight'){expect(model.group.children.filter(o=>o.isPointLight).every(o=>o.intensity===0)).toBe(true);expect(model.group.getObjectByName('flashlight_beam')).toBeUndefined();}const fresh=createWelcomeModel(id);fresh.group.updateMatrixWorld(true);model.group.updateMatrixWorld(true);
  expect(new THREE.Box3().setFromObject(model.group).min.distanceTo(new THREE.Box3().setFromObject(fresh.group).min)).toBeLessThan(1e-5);for(const p of welcomeParts(id)){const a=model.group.getObjectByName(p.name).matrixWorld.elements,b=fresh.group.getObjectByName(p.name).matrixWorld.elements;for(let i=0;i<16;i++)expect(a[i],p.name+' reset').toBeCloseTo(b[i],5);}fresh.dispose();model.dispose();
 },120000);
 it('프렌즈의 중간 프레임에서 실제 Python도 같은 위상과 높이로 뛰며 부품 모션을 재생한다',()=>{
  const code=welcomeMotionCode('friends').replace('for frame in range(180):','for frame in [36]:').split('# 모션을 마치고')[0],result=runPythonJobs([{id:'friends',label:'phase',code}]).get('friends:phase');expect(result.error).toBeNull();processBatch(result.commands,scene);scene.updateMatrixWorld(true);
  const creates=result.commands.filter(c=>c.action==='create'&&!['local_light','distant_light'].includes(c.type)),model=createWelcomeModel('friends');model.animate(1.2);model.members.forEach((m,i)=>m.group.position.y+=welcomeBounce(1.2,i));model.group.updateMatrixWorld(true);
  let offset=0;for(const [index,f]of welcomeFriends.entries()){for(const p of welcomeParts(f.id)){
   const actual=getMesh(creates[offset++].id),expected=model.members[index].group.getObjectByName(p.name);
   expect(actual.getWorldPosition(new THREE.Vector3()).distanceTo(expected.getWorldPosition(new THREE.Vector3())),f.id+' '+p.name+' bounce').toBeLessThan(1e-5);
  }}model.dispose();
 });
 it('프렌즈 모션은 네 완제품으로 끝나고 모션 경로를 실습에 넘긴다',()=>{
  const result=runPythonJobs([{id:'friends',label:'motion',code:welcomeMotionCode('friends')}]).get('friends:motion');expect(result.error).toBeNull();expect(result.commands.filter(c=>c.action==='compound')).toHaveLength(4);
  processBatch(result.commands,scene);scene.updateMatrixWorld(true);const actual=new THREE.Box3();for(const c of result.commands.filter(c=>c.action==='compound'))actual.union(new THREE.Box3().setFromObject(getMesh(c.id)));
  const model=createWelcomeModel('friends');model.group.updateMatrixWorld(true);const expected=new THREE.Box3().setFromObject(model.group);for(const axis of ['x','y','z']){expect(actual.min[axis]).toBeCloseTo(expected.min[axis],2);expect(actual.max[axis]).toBeCloseTo(expected.max[axis],2);}model.dispose();
  expect(getTutorial('welcome-friend','kirby-motion').code).toBe(welcomeMotionCode('kirby'));expect(getTutorial('welcome-friend','friends-motion').activeStep).toBe('friends-motion');
 });
});
it('첫 화면에서 고른 네 친구를 같은 체험 경로로 열고, 없는 선택은 만두로 시작한다',()=>{
 for(const f of welcomeFriends){const tutorial=getTutorial('welcome-friend',f.id);expect(tutorial.activeStep).toBe(f.id);expect(tutorial.code).toBe(welcomeCode(f.id));}
 expect(getTutorial('welcome-friend','missing').activeStep).toBe('dumpling');
});

describe.skipIf(!hasPython())('타원체·고리 속성과 복제 회귀',()=>{
 it('타원체를 size·length·axis로 바꿔도 타원체로 남고 복제·compound가 독립적이다',()=>{
  const code=`from vpython import *
e = ellipsoid(size=vector(2,1,.5))
assert abs(e.axis.mag-2)<1e-9
e.axis = vector(0,3,0)
assert e.length == 3
e.size.x = 4
e.height = .6
e.width = .8
assert abs(e.axis.mag-4)<1e-9
copy = e.clone(pos=vector(5,0,0))
assert copy.size == e.size and copy.axis == e.axis
copy.color = color.red
assert e.color != copy.color
whole = compound([copy])
assert whole.visible
r = ring(axis=vector(0,1,0))
r.axis = vector(0,0,1)
`;
  const result=runPythonJobs([{id:'orientation',label:'properties',code}]).get('orientation:properties');expect(result.error).toBeNull();processBatch(result.commands,scene);
  const e=getMesh('obj_1');expect(e.geometry.type).toBe('SphereGeometry');expect(e.scale.toArray()).toEqual([4,.6,.8]);expect(new THREE.Vector3(1,0,0).applyQuaternion(e.quaternion).distanceTo(new THREE.Vector3(0,1,0))).toBeLessThan(1e-6);
  const ring=getMesh('obj_4');expect(new THREE.Vector3(0,0,1).applyQuaternion(ring.quaternion).distanceTo(new THREE.Vector3(0,0,1))).toBeLessThan(1e-6);
 });
});
