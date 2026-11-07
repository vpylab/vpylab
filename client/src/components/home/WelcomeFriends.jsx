import { useUiText } from "../../i18n/ui-text";
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { welcomeFriends, welcomeLighting, welcomeTogether, welcomeTogetherLighting, welcomeBounce, welcomeActions } from '../../data/welcome-friends';
import StillFriend from './WelcomeStill';
import { createWelcomeModel } from './welcome-geometry';
import StageLightEditor from './StageLightEditor';
import { createWelcomeStage } from './welcome-stage';

export default function WelcomeFriends({ko=true,lightSettings=null,onLightChange}){
  const ui = useUiText();
 const [id,setId]=useState('dumpling'),[webgl,setWebgl]=useState(true),[manualMotion,setManualMotion]=useState(false),[stageOn,setStageOn]=useState(true),[viewReset,setViewReset]=useState(0),[motionAllowed,setMotionAllowed]=useState(()=>typeof matchMedia==='function'&&!matchMedia('(prefers-reduced-motion: reduce)').matches);
 const host=useRef(null),runtime=useRef(null),friend=id==='friends'?welcomeTogether:welcomeFriends.find(f=>f.id===id)||welcomeFriends.at(-1);
 const selectedId=friend.id,lighting=selectedId==='friends'?welcomeTogetherLighting:welcomeLighting[selectedId];
 useEffect(()=>{
  let renderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});}catch{queueMicrotask(()=>setWebgl(false));return;}
  const el=host.current,scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-2,2,2,-2,.1,30);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor(0x000000,0);renderer.domElement.setAttribute('aria-hidden','true');el.appendChild(renderer.domElement);
  camera.position.set(.9,1.1,7);camera.lookAt(0,.08,0);
  const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(0,.08,0);orbit.enablePan=false;orbit.enableZoom=false;orbit.enableDamping=false;orbit.rotateSpeed=.65;orbit.minPolarAngle=Math.PI*.15;orbit.maxPolarAngle=Math.PI*.55;orbit.update();renderer.domElement.style.touchAction='pan-y';
  scene.add(new THREE.AmbientLight(0xffffff,.95));const key=new THREE.DirectionalLight(0xfff7ee,1.3),fill=new THREE.DirectionalLight(0xdceaff,.45);key.position.set(-3,5,6);fill.position.set(4,2,2);scene.add(key,fill);
  const stage=createWelcomeStage(scene);
  const reduced=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):{matches:true},state={renderer,scene,camera,model:null,frame:0,start:null,reduced,stage,render:null};
  const render=()=>renderer.render(scene,camera);state.render=render;orbit.addEventListener('change',render);state.resetView=()=>{camera.position.set(.9,1.1,7);orbit.target.set(0,.08,0);orbit.update();render();};
  state.draw=time=>{if(!state.model)return;if(state.start===null)state.start=time;const elapsed=(time-state.start)/1000,members=state.model.members,duration=members?6:2.4,playing=(state.manual||!reduced.matches)&&(state.manual||elapsed<duration),phase=state.manual?elapsed%duration:elapsed;if(members)members.forEach((m,i)=>m.group.position.copy(m.basePosition).add(new THREE.Vector3(0,playing?welcomeBounce(phase,i):0,0)));state.model.animate(playing?phase:0);render();el.dataset.motion=playing?'playing':'still';state.frame=playing?requestAnimationFrame(state.draw):0;};
  state.stop=()=>{cancelAnimationFrame(state.frame);state.manual=false;if(state.model?.members)state.model.members.forEach(m=>m.group.position.copy(m.basePosition));state.model?.animate(0);render();el.dataset.motion='still';};
  state.play=(manual=false)=>{cancelAnimationFrame(state.frame);state.manual=manual;state.start=null;if(reduced.matches&&!manual)state.stop();else state.frame=requestAnimationFrame(state.draw);};
  const resize=()=>{if(!el.clientWidth||!el.clientHeight)return;const aspect=el.clientWidth/el.clientHeight,r=Math.max(1.75,2.05/aspect);camera.left=-r*aspect;camera.right=r*aspect;camera.top=r;camera.bottom=-r;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);render();};
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;observer?.observe(el);window.addEventListener('resize',resize);const motionChanged=()=>{setMotionAllowed(!reduced.matches);setManualMotion(false);state.play();};if(reduced.addEventListener)reduced.addEventListener('change',motionChanged);else reduced.addListener?.(motionChanged);runtime.current=state;resize();
  const lost=e=>{e.preventDefault();cancelAnimationFrame(state.frame);state.manual=false;setManualMotion(false);setWebgl(false);};renderer.domElement.addEventListener('webglcontextlost',lost);
  return()=>{cancelAnimationFrame(state.frame);observer?.disconnect();window.removeEventListener('resize',resize);if(reduced.removeEventListener)reduced.removeEventListener('change',motionChanged);else reduced.removeListener?.(motionChanged);renderer.domElement.removeEventListener('webglcontextlost',lost);orbit.removeEventListener('change',render);orbit.dispose();state.model?.dispose();stage.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();runtime.current=null;};
 },[]);
 useEffect(()=>{const r=runtime.current;if(!r)return;cancelAnimationFrame(r.frame);if(r.model){r.scene.remove(r.model.group);r.model.dispose();}r.model=createWelcomeModel(selectedId);r.scene.add(r.model.group);const bounds=new THREE.Box3().setFromObject(r.model.group);r.stage.setGround(bounds.min.y-.05);r.resetView();r.play();},[selectedId]);
 useEffect(()=>{if(viewReset)runtime.current?.resetView();},[viewReset]);
 useEffect(()=>{const r=runtime.current;if(!r)return;r.stage.setLighting(stageOn,lighting,lightSettings);r.render();},[stageOn,lighting,lightSettings]);
 return <section className="welcome-friends" aria-label={ko?'코드로 만든 환영 친구':'A welcome friend made with code'}>
  <p className="welcome-hello" aria-live="polite">{friend.line[ko?'ko':'en']}</p>
  <div className="welcome-stage" data-welcome-friend={selectedId} data-welcome-renderer={webgl?'webgl':'svg'} data-stage-light={stageOn?'on':'off'} data-friends-count={selectedId==='friends'?4:1} role="img" aria-label={friend.label[ko?'ko':'en']}>
   <div ref={host} className="welcome-canvas" style={{visibility:webgl?'visible':'hidden'}}/>
   {!webgl&&<StillFriend id={selectedId}/>}
  </div>
  <div className="welcome-choices" role="group" aria-label={ko?'맞이할 친구 고르기':'Choose a welcome friend'}>{[...welcomeFriends,welcomeTogether].map(f=><button key={f.id} onClick={()=>{setManualMotion(false);setId(f.id);if(f.id===selectedId)runtime.current?.play();}} aria-pressed={f.id===selectedId}><span style={{background:f.color||'#b9d8ce'}} aria-hidden="true"/>{f.label[ko?'ko':'en'].replace(ui("친구"),'')}</button>)}</div>
  <div className="welcome-actions"><button className="welcome-action-play" disabled={!webgl} aria-pressed={manualMotion} onClick={()=>{if(manualMotion)runtime.current?.stop();else runtime.current?.play(true);setManualMotion(active=>!active);}}>{selectedId==='friends'?(ko?'통통 튀기':'Bounce together'):welcomeActions[selectedId][ko?'ko':'en']} <span aria-hidden="true">{manualMotion?'■':'▶'}</span></button><Link to={'/tutorials/welcome-friend?step='+selectedId}>{ko?(selectedId==='friends'?'프렌즈, 내 코드로 만들기':'이 친구, 내 코드로 만들기'):'Build with code'} →</Link></div>
  {/* 주동작(친구 고르기·모션·코드로 만들기)만 펼쳐 두고, 시점·조명·모션 코드는 한 곳에 접습니다. */}
  <p className={webgl?'sr-only':'welcome-motion-status'} aria-live="polite">{!webgl?(ko?'3D를 사용할 수 없어 정적인 친구를 보여드려요.':'Showing a still friend because 3D is unavailable.'):manualMotion?(ko?'변형 모션 재생 중 · 같은 버튼으로 멈춰요.':'Character action is playing. Press again to stop.'):(ko?(motionAllowed?'▶ 버튼으로 변형 모션을 반복해서 볼 수 있어요.':'자동 모션은 꺼져 있어요. ▶ 버튼을 누르면 직접 볼 수 있어요.'):'Press ▶ to repeat the character action.')}</p>
  <details className="welcome-more">
   <summary>{ko?'시점·조명 상세 설정':'View and lighting settings'}</summary>
   <p className="welcome-orbit-hint">{ko?'좌우로 끌어 돌려보세요.':'Drag sideways to rotate.'} <button type="button" disabled={!webgl} onClick={()=>setViewReset(n=>n+1)}>{ko?'시점 초기화':'Reset view'}</button></p>
   <p className="welcome-more-row"><button type="button" aria-pressed={stageOn} onClick={()=>setStageOn(on=>!on)}>{ko?'무대 조명':'Stage lights'} <span aria-hidden="true">{stageOn?'●':'○'}</span></button><span className="welcome-light-label">{lightSettings?(ko?'내가 꾸민 조명':'My lighting'):lighting.label[ko?'ko':'en']}</span></p>
   {onLightChange&&webgl&&<StageLightEditor settings={lightSettings} palette={lighting} onChange={onLightChange} ko={ko}/>}
   <p className="welcome-motion-guide"><Link to={'/tutorials/welcome-friend?step='+selectedId+'-motion'}>{ko?'이 모션, 내 코드로 만들기':'Build this action with code'} →</Link></p>
  </details>
 </section>;
}
