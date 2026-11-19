import * as T from 'three';
import {softwareRenderer} from './software.js';
import {resolveTexture} from '../../../client/src/engine/texture-system.js';
const $=id=>document.getElementById(id);
async function start(){
const data=await (await fetch('scenes.json')).json();
let renderer;
try { renderer=new T.WebGLRenderer({canvas:$('screen'),antialias:true}); } catch { renderer=softwareRenderer($('screen')); }
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
const scene=new T.Scene(), camera=new T.PerspectiveCamera(39,1,.015,160);
const V=(x,y,z)=>new T.Vector3(x,y,z);
const col=a=>new T.Color(...a);
const amb=new T.AmbientLight(0xffffff,1);scene.add(amb);
const sky=new T.Group(),stage=new T.Group(),world=new T.Group(),instrument=new T.Group();
scene.add(sky,world,instrument);instrument.add(stage);
const textures=await Promise.all(['sun','earth','moon'].map(async name=>{
 const t=await new T.TextureLoader().loadAsync('../../../client/src/assets/planets/'+name+'.jpg');t.colorSpace=T.SRGBColorSpace;return t;
}));
function halo(){
 const c=document.createElement('canvas');c.width=c.height=256;
 const ctx=c.getContext('2d'),g=ctx.createRadialGradient(128,128,0,128,128,128);
 for(const [x,a] of [[0,.65],[.29,.42],[.39,.24],[.55,.08],[.8,.016],[1,0]])g.addColorStop(x,'rgba(255,136,45,'+a+')');
 ctx.fillStyle=g;ctx.fillRect(0,0,256,256);
 const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),blending:T.AdditiveBlending,depthWrite:false,transparent:true}));s.scale.setScalar(9);return s;
}
const corona=halo();world.add(corona);
let seed=2409;
function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const starPos=[],starCol=[];
for(let i=0;i<3800;i++){
 const a=rand()*2*Math.PI,y=i<2600?2*rand()-1:Math.sin(a)*.23+(rand()+rand()-1)*.20,h=Math.sqrt(1-y*y);
 starPos.push(49*h*Math.cos(a),49*y,49*h*Math.sin(a));const v=.08+.66*rand()**3;starCol.push(v*.85,v*.91,v);
}
const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(starPos,3));sg.setAttribute('color',new T.Float32BufferAttribute(starCol,3));sky.add(new T.Points(sg,new T.PointsMaterial({size:.065,vertexColors:true})));
const path=new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({length:280},(_,i)=>V(5*Math.cos(i*Math.PI/140),0,5*Math.sin(i*Math.PI/140)))),new T.LineBasicMaterial({color:0x314055}));world.add(path);
const spheres=[],basic=[],enhanced=[],geom=[];
let lamp;
for(const cmd of data.orbit){
 if(cmd.type==='local_light'){lamp=new T.PointLight(col(cmd.color),cmd.intensity,50);world.add(lamp);continue}
 const i=spheres.length;cMaterial();
 function cMaterial(){
 const base=new T.MeshStandardMaterial({map:resolveTexture(cmd.texture),metalness:.1,roughness:cmd.shininess===0?1:.4,emissive:cmd.emissive?0xffffff:0,emissiveIntensity:cmd.emissive?.8:0});
 const rich=i===0?new T.MeshBasicMaterial({map:textures[i]}):new T.MeshStandardMaterial({map:textures[i],roughness:i===1?.78:1,bumpMap:i===2?textures[i]:null,bumpScale:i===2?.016:0});
 const gs=[new T.SphereGeometry(cmd.radius,32,16),new T.SphereGeometry(cmd.radius,96,64)];
 const obj=new T.Mesh(gs[0],base);world.add(obj);spheres.push(obj);basic.push(base);enhanced.push(rich);geom.push(gs);
 }
}
const rim=new T.Mesh(new T.SphereGeometry(.895,80,48),new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexShader:'varying vec3 n;varying vec3 p;void main(){p=(modelMatrix*vec4(position,1.)).xyz;n=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}',fragmentShader:'varying vec3 n;varying vec3 p;void main(){float r=pow(1.-max(0.,dot(normalize(n),normalize(cameraPosition-p))),3.8);float day=smoothstep(-.16,.68,dot(normalize(n),normalize(-p)));gl_FragColor=vec4(.17,.53,1.,r*day*.88);}' }));world.add(rim);
const keys=[],lights=[],baseKeys=[],richKeys=[];
for(const cmd of data.keys){
 const c=col(cmd.color);const a=new T.MeshStandardMaterial({color:c,roughness:.4,metalness:.1});
 const b=new T.MeshPhysicalMaterial({color:c,roughness:.26,metalness:.26,clearcoat:.8});
 const obj=new T.Mesh(new T.BoxGeometry(...cmd.size),a);obj.position.fromArray(cmd.pos);instrument.add(obj);keys.push(obj);baseKeys.push(a);richKeys.push(b);
 const l=new T.PointLight(c,0,5);l.position.copy(obj.position);l.position.y+=.52;l.position.z+=.75;stage.add(l);lights.push(l);
}
const floor=new T.Mesh(new T.BoxGeometry(11,.3,5),new T.MeshStandardMaterial({color:0x202d3e,roughness:.38,metalness:.19}));floor.position.y=-.34;stage.add(floor);
const keylight=new T.DirectionalLight(0xffffff,.8);keylight.position.set(4,8,6);instrument.add(keylight);
const edge=new T.DirectionalLight(0x8bcaff,2);edge.position.set(-4,3,-4);stage.add(edge);
let music=false,film=true,paused=false,sunlight=true,surface=false,clock=0,angle=0,elev=.28,zoom=1,last=performance.now(),ac;
const when=Array(5).fill(-Infinity), palette=['#91c8ff','#66e5cd','#adec91','#ffc475','#ef97cd'];
const pressed=(el,on)=>el.setAttribute('aria-pressed',String(on));
function style(){
 spheres.forEach((s,i)=>{s.geometry=geom[i][+film];s.material=film?enhanced[i]:basic[i]});
 keys.forEach((s,i)=>s.material=film?richKeys[i]:baseKeys[i]);
 sky.visible=film&&!music;corona.visible=path.visible=film;rim.visible=film&&sunlight;
 stage.visible=film;amb.intensity=music?.6:1;amb.color.setRGB(...(music?[1,1,1]:[.12,.12,.12]));
 scene.background=new T.Color(film?(music?0x101724:0x060913):0x10141c);
 lamp.intensity=sunlight?70:0;
 pressed($('film'),film);pressed($('base'),!film);pressed($('music'),music);pressed($('orbit'),!music);
}
function button(text,fn){const b=document.createElement('button');b.textContent=text;b.onclick=fn;$('controls').append(b);return b}
function ui(){
 $('title').textContent=music?'다섯 음으로 켜는 빛':'태양빛 아래의 지구와 달';
 $('hint').textContent=music?'건반을 터치하거나 숫자 1~5로 연주하세요.':'드래그로 회전 · 휠로 확대';
 $('controls').replaceChildren();world.visible=!music;instrument.visible=music;
 $('code').textContent=data.source[+music];$('download').href=music?'keys.py':'orbit.py';
 if(music){['도','레','미','솔','라'].forEach((n,i)=>{let b=button(n+' · '+(i+1),()=>play(i));b.className='note';b.style.setProperty('--c',palette[i])});}
 else{button(paused?'공전 재생':'시간 멈춤',()=>{paused=!paused;ui()});button(sunlight?'태양광 끄기':'태양광 켜기',()=>{sunlight=!sunlight;ui()});button(surface?'우주에서 보기':'지표에서 달 보기',()=>{surface=!surface;ui()})}style()
}
function select(m){music=m;angle=0;elev=m?.54:.28;zoom=1;ui()}
$('orbit').onclick=()=>select(false);$('music').onclick=()=>select(true);
$('base').onclick=()=>{film=false;style()};$('film').onclick=()=>{film=true;style()};
function play(i){const cmd=data.notes[i];ac??=new AudioContext();ac.resume();const now=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type=cmd.type;o.frequency.value=440*2**(([60,62,64,67,69][i]-69)/12);
 g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(cmd.volume*.55,now+.016);g.gain.exponentialRampToValueAtTime(.0001,now+cmd.duration);o.connect(g).connect(ac.destination);o.start();o.stop(now+cmd.duration);
 if(film){for(const [ratio,level,tail] of [[2,.055,.43],[3,.023,.22],[1.002,.026,.62]]){const overtone=ac.createOscillator(),env=ac.createGain();overtone.frequency.value=o.frequency.value*ratio;env.gain.setValueAtTime(.0001,now);env.gain.exponentialRampToValueAtTime(level,now+.012);env.gain.exponentialRampToValueAtTime(.0001,now+tail);overtone.connect(env).connect(ac.destination);overtone.start();overtone.stop(now+tail);}}when[i]=performance.now()/1000;}
window.addEventListener('keydown',e=>{if(music&&!e.repeat&&/^[1-5]$/.test(e.key))play(Number(e.key)-1)});
const cn=$('screen');let down=null,moved=false;
cn.onpointerdown=e=>{down=[e.clientX,e.clientY];moved=false;cn.setPointerCapture(e.pointerId)};
cn.onpointermove=e=>{if(!down||(!music&&surface))return;const dx=e.clientX-down[0],dy=e.clientY-down[1];if(Math.abs(dx)+Math.abs(dy)>1)moved=true;angle-=dx*.009;elev=Math.max(.04,Math.min(1.35,elev+dy*.005));down=[e.clientX,e.clientY]};
cn.onpointerup=e=>{if(music&&!moved){let r=cn.getBoundingClientRect();const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);let hit=ray.intersectObjects(keys)[0];if(hit)play(keys.indexOf(hit.object))}down=null};
cn.onpointercancel=()=>down=null;cn.onwheel=e=>{e.preventDefault();zoom=Math.min(2,Math.max(.55,zoom*Math.exp(e.deltaY*.001)))};
ui();
function draw(now){
 const dt=Math.max(0,Math.min((now-last)/1000,.1));last=now;if(!music&&!paused)clock=(clock+dt*60)%data.frames.length;
 const frame=data.frames[Math.floor(clock)];spheres[1].position.fromArray(frame[0]);spheres[2].position.fromArray(frame[1]);rim.position.copy(spheres[1].position);spheres[1].rotation.y=.7+clock*.002;
 const w=cn.clientWidth,h=cn.clientHeight;if(cn.width!==Math.floor(w*renderer.getPixelRatio())||cn.height!==Math.floor(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
 camera.aspect=w/h;camera.up.set(0,1,0);
 if(!music&&surface){const zen=V(Math.cos(clock*.008+.9)*.866,.5,Math.sin(clock*.008+.9)*.866);camera.position.copy(spheres[1].position).addScaledVector(zen,.90);camera.up.copy(zen);
 const dir=spheres[2].position.clone().sub(camera.position);let alt=dir.dot(zen);if(alt<0)dir.addScaledVector(zen,-alt);camera.lookAt(camera.position.clone().add(dir));$('hint').textContent=alt>=0?'북위 30° · 달이 지평선 위에 있습니다.':'북위 30° · 달이 지평선 아래에 있습니다.';}
 else{const target=music?V(0,0,0):V(1.75,0,0);const d=(music?8.2:12.3)*Math.max(1,1.52/camera.aspect)*zoom;camera.position.copy(target).add(V(Math.sin(angle)*Math.cos(elev),Math.sin(elev),Math.cos(angle)*Math.cos(elev)).multiplyScalar(d));camera.lookAt(target)}
 camera.updateProjectionMatrix();
 if(music)keys.forEach((s,i)=>{const age=now/1000-when[i],v=age<.7?(film?Math.exp(-5*age):1):0;s.material.emissive.copy(s.material.color);s.material.emissiveIntensity=v*(film?2:.8);lights[i].intensity=12*v;s.position.y=film?-.06*v:0;});
 renderer.render(scene,camera,{music,film,spheres,keys,when,now,sky:starPos,textures,basic,sunlight,path,surface});requestAnimationFrame(draw);
}requestAnimationFrame(draw);
}
start().catch(e=>{$('error').textContent='3D 장면을 열 수 없습니다. WebGL 2를 지원하는 Safari 또는 Chrome에서 열어 주세요. ('+e.message+')'});
