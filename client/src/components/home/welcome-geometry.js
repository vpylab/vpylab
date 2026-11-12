import * as THREE from 'three';
import { createPrimitiveGeometry } from '../../../../shared/primitive-geometry.js';
import { welcomeLayout, welcomeParts, welcomeActionPose } from '../../data/welcome-friends';
const primitives=createPrimitiveGeometry(THREE);
export function createWelcomeModel(id){
 if(id==='friends'){
   const group=new THREE.Group(),members=welcomeLayout().map(item=>{const model=createWelcomeModel(item.id);model.group.scale.setScalar(item.scale);model.group.position.fromArray(item.origin);model.basePosition=model.group.position.clone();group.add(model.group);return model;});
   return{group,members,animate(time){const fade=Math.max(0,Math.min(1,time/.3,(6-time)/.5));members.forEach((m,i)=>m.animate(time>0?Math.max(0,time-i*.18)%2.4:0,fade));},dispose(){members.forEach(m=>m.dispose());}};
 }
 const group=new THREE.Group(),meshes=new Map(),parts=welcomeParts(id);
 for(const p of parts){
  let geometry;
  if(p.type==='sphere')geometry=new THREE.SphereGeometry(p.radius,32,24);
  else if(p.type==='ellipsoid'){geometry=new THREE.SphereGeometry(1,32,24);geometry.scale(...p.size.map(x=>x/2));}
  else if(p.type==='box')geometry=new THREE.BoxGeometry(...p.size);
  else if(p.type==='ring')geometry=new THREE.TorusGeometry(p.radius,p.thickness,12,48);
  else if(p.type==='cylinder')geometry=primitives.cylinder(p.radius,new THREE.Vector3(...p.axis).length(),32);
  else geometry=primitives.cone(p.radius,new THREE.Vector3(...p.axis).length(),32);
  const material=new THREE.MeshStandardMaterial({color:new THREE.Color(p.color),roughness:.72});
  const mesh=new THREE.Mesh(geometry,material);mesh.name=p.name;if(mesh.isMesh){mesh.castShadow=!/^(eye|cheek|mouth|tongue|smile)/.test(p.name);mesh.receiveShadow=true;}
  mesh.position.fromArray(p.pos);
  if(['box','ellipsoid'].includes(p.type)&&p.axis){
    const x=new THREE.Vector3(...p.axis).normalize(),y=new THREE.Vector3(...(p.up||[0,1,0]));
    y.addScaledVector(x,-y.dot(x)).normalize();const z=new THREE.Vector3().crossVectors(x,y).normalize();
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
  }
  else if(p.axis)mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,p.type==='ring'?0:1,p.type==='ring'?1:0),new THREE.Vector3(...p.axis).normalize());
  if(p.angle)mesh.rotateZ(p.angle);
  group.add(mesh);meshes.set(p.name,mesh);
 }
 let lamp=null,beam=null;
 if(id==='flashlight'){
  const material=new THREE.MeshBasicMaterial({color:'#ffe8a0',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
  beam=new THREE.Mesh(primitives.cone(.8,.52,48),material);beam.name='flashlight_beam';beam.position.set(0,1.62,0);beam.rotation.z=Math.PI;beam.visible=false;
  lamp=new THREE.PointLight('#ffe8a0',0,5,2);lamp.position.set(0,1.2,.55);group.add(lamp);
 }
 return{group,id,animate(time,fade=1){
  // 매 프레임 원래 명세에서 계산해 재생할 때 변형이 누적되지 않습니다.
  const {amount,pose}=welcomeActionPose(id,time,fade);
  for(const [name,p] of Object.entries(pose)){
   const mesh=meshes.get(name),base=parts.find(part=>part.name===name);mesh.position.fromArray(p.pos);
   if(p.size)mesh.scale.fromArray(p.size.map((v,i)=>v/base.size[i]));
   if(p.axis){
    if(base.type==='ring')mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...p.axis).normalize());
    else{const x=new THREE.Vector3(...p.axis).normalize(),y=new THREE.Vector3(...p.up);y.addScaledVector(x,-y.dot(x)).normalize();mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,new THREE.Vector3().crossVectors(x,y)));}
   }
  }
  if(lamp){lamp.intensity=4*amount*group.scale.x**2;beam.material.opacity=.12*amount;beam.visible=amount>0;if(amount>0&&!beam.parent)group.add(beam);else if(!amount)beam.removeFromParent();const lens=meshes.get('light');lens.material.emissive.set('#ffe8a0');lens.material.emissiveIntensity=.7*amount;}
 },dispose(){if(beam){beam.removeFromParent();beam.geometry.dispose();beam.material.dispose();}group.traverse(o=>{if(o.geometry){o.geometry.dispose();o.material.dispose();}if(o.isLight)o.dispose();});}};
}
