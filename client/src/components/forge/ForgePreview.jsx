import { createWelcomeStage } from '../home/welcome-stage';
import { welcomeLighting } from '../../data/welcome-friends';
import { useUiText } from "../../i18n/ui-text";
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clearScene, getMesh, processBatch } from '../../engine/vpython-bridge';
import { forgeCommands, isForgeStudio } from '../../forge/recipes';
import { PLACEMENT_AXES } from '../../forge/placement';

export default function ForgePreview({model,view,onBell,onCapture,waveTick=0,placement=null}) {
  const ui = useUiText();
  const host=useRef(null),state=useRef(null),processedWave=useRef(waveTick),callback=useRef({onBell,onCapture});
  const [error,setError]=useState('');
  const studioView=isForgeStudio(model.recipe);
  const centerKey=model.center.join(','),range=model.range,placing=!!placement;
  useEffect(()=>{callback.current={onBell,onCapture};},[onBell,onCapture]);
  useEffect(()=>{
    const el=host.current;
    let renderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}
    catch {queueMicrotask(()=>setError(ui("3D 미리보기를 열지 못했습니다. 다른 브라우저에서 열거나 아래 코드를 가져가세요.")));return;}
    const scene=new THREE.Scene();scene.background=new THREE.Color('#f0f1ec');
    const camera=new THREE.PerspectiveCamera(38,1,.05,100),controls=new OrbitControls(camera,renderer.domElement);
    scene._renderer=renderer;scene._camera=camera;
    controls.enableDamping=true;controls.enablePan=false;controls.minDistance=2;controls.maxDistance=18;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
    renderer.domElement.setAttribute('aria-label',ui("마우스나 손가락으로 돌려 보는 3D 모듈"));renderer.domElement.tabIndex=0;
    el.appendChild(renderer.domElement);
    const ambient=new THREE.AmbientLight(0xffffff,1.8),key=new THREE.DirectionalLight(0xffffff,2.5),fill=new THREE.DirectionalLight(0xdfe9ff,1.1);
    key.position.set(4,7,6);fill.position.set(-5,2,-3);scene.add(ambient,key,fill);
    const stage=createWelcomeStage(scene);stage.setVisible(false);
    const grid=new THREE.GridHelper(12,24,0xc9cec5,0xe0e4dc);grid.position.y=-2.2;scene.add(grid);
    let frame=0;
    const draw=()=>{controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(draw);};draw();
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    let down=null;
    const pointerDown=e=>{down=[e.clientX,e.clientY];};
    const pointerUp=e=>{
      if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;
      const rect=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
      const hits=ray.intersectObjects(scene.children,true);
      if(hits.some(hit=>String(hit.object.userData?.vpId||'').startsWith('forge_')))callback.current.onBell?.();
    };
    renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);
    state.current={scene,camera,controls,renderer,grid,ambient,key,fill,stage};
    callback.current.onCapture?.(()=>renderer.domElement.toDataURL('image/jpeg',.65));
    return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();clearScene(scene);state.current?.place?.axes.dispose();stage.dispose();grid.geometry.dispose();grid.material.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();state.current=null;callback.current.onCapture?.(null);};
  },[ui]);
  useEffect(()=>{
    const s=state.current;if(!s)return;
    clearScene(s.scene);processBatch(forgeCommands(model),s.scene);
    const matching=isForgeStudio(model.recipe);
    s.ambient.intensity=matching?.95:1.8;s.key.intensity=matching?1.3:2.5;s.fill.intensity=matching?.45:1.1;
    s.key.color.set(matching?0xfff7ee:0xffffff);s.fill.color.set(matching?0xdceaff:0xdfe9ff);
    s.key.position.set(...(matching?[-3,5,6]:[4,7,6]));s.fill.position.set(...(matching?[4,2,2]:[-5,2,-3]));
    s.grid.visible=!matching;s.stage.setVisible(matching);
    s.scene.background.set(matching?'#f8fafc':'#f0f1ec');
    if(matching){
      const bounds=new THREE.Box3();for(const p of model.parts){if(!p.effect){const mesh=getMesh('forge_'+p.name);if(mesh){mesh.updateMatrixWorld(true);bounds.union(new THREE.Box3().setFromObject(mesh));}}}
      if(!bounds.isEmpty())s.stage.setGround(bounds.min.y-.05);
      s.stage.setLighting(true,welcomeLighting[model.preset.id]||{left:model.recipe.colors[1],right:'#c5dcf3'},null);
      for(const p of model.parts){const mesh=getMesh('forge_'+p.name);if(mesh){mesh.castShadow=!/^(eye|cheek|mouth|tongue|smile)/.test(p.name);mesh.receiveShadow=true;}}
    }
  },[model]);
  useEffect(()=>{
    const s=state.current;if(!s)return;
    const center=new THREE.Vector3(...centerKey.split(',').map(Number)),distance=(range+(placing?2.5:0))*2.05;
    s.controls.target.copy(center);
    s.camera.position.copy(center).add(new THREE.Vector3(...(view.mode==='front'?[0,0,distance]:view.mode==='top'?[0,distance,.001]:[distance*(studioView?.13:.42),distance*(studioView?.145:.22),distance])));
    s.camera.lookAt(center);s.controls.update();
  },[centerKey,range,view,studioView,placing]);
  // 놓아 보기: 완성품 전체를 한 묶음으로 옮기고, 키우고, 돌리고, 색을 곱합니다. placement가 없으면 이전과 같습니다.
  useEffect(()=>{
    const s=state.current;if(!s)return;
    const meshes=model.parts.filter(p=>!p.effect).map(p=>getMesh('forge_'+p.name)).filter(Boolean);
    if(!s.place){
      if(!placement)return;
      const outer=new THREE.Group(),inner=new THREE.Group(),axes=new THREE.AxesHelper(3);
      outer.add(inner);s.scene.add(outer,axes);s.place={outer,inner,axes};
    }
    const {outer,inner,axes}=s.place;
    axes.visible=!!placement;
    outer.position.set(0,0,0);outer.quaternion.identity();outer.scale.setScalar(1);inner.position.set(0,0,0);
    const tint=new THREE.Color(placement?placement.tint:'#ffffff');
    for(const mesh of meshes){
      (placement?inner:s.scene).add(mesh);
      mesh.traverse(node=>{for(const material of [].concat(node.material||[])){if(!material.color)continue;material.userData.forgeBase??=material.color.clone();material.color.copy(material.userData.forgeBase).multiply(tint);}});
    }
    if(!placement)return;
    outer.updateMatrixWorld(true);
    const box=new THREE.Box3();for(const mesh of meshes)box.union(new THREE.Box3().setFromObject(mesh));
    // compound의 pos는 묶음의 가운데입니다. 그 점을 중심으로 키우고 돌립니다.
    const middle=box.isEmpty()?new THREE.Vector3():box.getCenter(new THREE.Vector3());
    inner.position.copy(middle).negate();
    outer.scale.setScalar(placement.scale);
    outer.position.set(placement.x,placement.y,placement.z).addScaledVector(middle,placement.scale);
    outer.quaternion.setFromAxisAngle(new THREE.Vector3(...PLACEMENT_AXES[placement.axis]),THREE.MathUtils.degToRad(placement.angle));
  },[model,placement]);
  useEffect(()=>{
    if(waveTick===processedWave.current)return;
    processedWave.current=waveTick;
    if(!waveTick||model.recipe.bellMode!=='waves'||model.preset.id!=='bell')return;
    let frame=0,start=null;
    const draw=time=>{if(start===null)start=time;const t=Math.min(1,(time-start)/600);const commands=[];for(let i=0;i<3;i++)if(getMesh('forge_wave_'+i))commands.push({action:'update',id:'forge_wave_'+i,visible:t<1,radius:.35+t*1.8+i*.18,opacity:.65*(1-t)});if(state.current)processBatch(commands,state.current.scene);if(t<1)frame=requestAnimationFrame(draw);};
    frame=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(frame);if(state.current)processBatch([0,1,2].map(i=>({action:'update',id:'forge_wave_'+i,visible:false})),state.current.scene);};
  },[waveTick,model]);
  return <div className="forge-canvas" ref={host} data-forge-preview={model.preset.id}>{error&&<p role="alert" className="p-8">{ui(error)}</p>}</div>;
}
