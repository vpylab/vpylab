// 단순한 기본 도형으로 만드는 프로젝트용 에셋입니다. 학생 코드는 실행하지 않습니다.
import { welcomeParts, welcomeColorVector } from '../data/welcome-friends.js';
export const studioPresets = [
  {id:'dumpling',name:'만두 친구',icon:'ᴗ',kind:'character',studio:true,note:'폭신한 몸 · 다섯 주름 · 반짝이는 눈',colors:['#ffe4b9','#a7d7c4'],params:{width:1.85,height:1.8,depth:1.1,eyeSize:.18,eyeGap:.14,armSize:.5,feetSize:.5,cheekSize:.21},use:'주름과 표정을 바꿔 내 게임의 주인공을 만들어 보세요.',learn:'ellipsoid + sphere + cylinder',example:'my_module.pos.x += 0.1'},
  {id:'flashlight',name:'손전등 친구',icon:'☀',kind:'character',studio:true,note:'넓은 렌즈 · 작은 스위치 · 둥근 손발',colors:['#b8b2ee','#ffe4a3'],params:{width:1.38,height:2,depth:1.38,eyeSize:.18,eyeGap:.14,armSize:.5,feetSize:.5,cheekSize:.21},use:'메인의 손전등을 내 탐험 게임의 친구로 만들어 보세요. 불빛 효과는 프로젝트에서 붙일 수 있어요.',learn:'cylinder + cone + ring',example:'my_module.pos.x += 0.1'},
  {id:'toolbox',name:'공구상자 친구',icon:'▰',kind:'character',studio:true,note:'둥근 모서리 · 손잡이 · 금빛 잠금쇠',colors:['#f59282','#f2d28a'],params:{width:1.8,height:1.8,depth:1.1,eyeSize:.18,eyeGap:.14,armSize:.5,feetSize:.5,cheekSize:.21},use:'메인의 공구상자를 게임의 안내 친구나 수리 아이템으로 써 보세요. 뚜껑은 고정된 모양이에요.',learn:'box + ellipsoid + ring',example:'my_module.pos.y += 0.1'},
  {id:'crystal',name:'크리스털 조각',icon:'◇',kind:'asset',studio:true,note:'상자와 피라미드로 만드는 광물',colors:['#85bfe9','#d3e6ff'],use:'탐험 게임에서 모으는 보석이나 에너지 아이템으로 써 보세요.',learn:'box + pyramid',example:'my_module.visible = False'},
  {id:'coin',name:'별 코인',icon:'✧',kind:'asset',studio:true,note:'금빛 테두리와 도톰한 별 문양',colors:['#e6a936','#fff0a0'],params:{width:1.8,depth:1.2},use:'코인을 모으면 점수가 오르는 수집 게임에 사용해요.',learn:'cylinder + ring + extrusion',example:'my_module.rotate(angle=0.2, axis=vector(0, 1, 0))'},
  {id:'pine',name:'작은 숲 나무',icon:'♠',kind:'asset',studio:true,note:'원뿔 세 층과 나무 기둥',colors:['#619b80','#8ac5a3'],params:{width:1.8,height:1.9},use:'크기와 위치를 달리해 게임의 숲이나 길가를 꾸며 보세요.',learn:'cone + cylinder',example:'my_module.pos.x += 3'},
  {id:'rocket',name:'탐사 로켓',icon:'↑',kind:'asset',studio:true,note:'둥근 창문 · 날개 · 작은 불꽃',colors:['#dbe8ec','#ef866e'],params:{width:1.65,height:1.9},use:'방향키로 움직이는 우주 탐사 게임의 비행체로 써 보세요.',learn:'cylinder + cone + box',example:'my_module.pos.y += 0.1'},
  {id:'chest',name:'보물상자',icon:'▣',kind:'asset',studio:true,note:'금속 띠와 자물쇠가 있는 상자',colors:['#ad7756','#edca75'],params:{width:2.1,height:1.6,depth:1.6},use:'보상을 얻는 장소나 비밀 아이템으로 써 보세요. 뚜껑은 고정된 모양이에요. 색은 원래 부품 색에 곱해집니다.',learn:'box + sphere',example:'my_module.color = vector(1, 0.8, 0.4)'},
  {id:'flag',name:'도착 깃발',icon:'⚑',kind:'asset',studio:true,note:'갈라진 깃발과 작은 받침',colors:['#eb8fa7','#e9c788'],params:{width:1.8,height:1.9,depth:1.2},use:'미로의 도착점이나 팀별 체크포인트로 사용해요.',learn:'cylinder + sphere + extrusion',example:'my_module.opacity = 0.5'},
];
export function buildStudioAsset(preset,recipe,helpers){
  const {part,egg,sphere,cone,expr,vector,mul,add,div,w,h,d,eye,gap,cheek,arm,foot}=helpers;
  const box=(name,pos,size,color='body')=>part(name,'box',{pos:vector(...pos),size:vector(...size),shininess:expr(.3)},color);
  const cylinder=(name,pos,axis,radius,color='body')=>part(name,'cylinder',{pos:vector(...pos),axis:vector(...axis),radius:expr(radius),shininess:expr(.4)},color);
  const ring=(name,pos,radius,thickness,color='accent')=>part(name,'ring',{pos:vector(...pos),axis:vector(0,0,1),radius:expr(radius),thickness:expr(thickness),shininess:expr(.55)},color);
  const profile=(name,points,z1,z2,color='body')=>part(name,'extrusion',{path:{value:[[0,0,z1.value],[0,0,z2.value]],code:`[vector(0,0,${z1.code}), vector(0,0,${z2.code})]`},shape:{value:points.map(p=>p.map(v=>expr(v).value)),code:'['+points.map(p=>'['+p.map(v=>expr(v).code).join(', ')+']').join(', ')+']'},shininess:expr(.35)},color);
  if(preset.kind==='character'){
    const defaults=preset.params,scales=[div(w,defaults.width),div(h,defaults.height),preset.id==='flashlight'?div(w,defaults.width):div(d,defaults.depth)];
    const reference=welcomeParts(preset.id),bodyColor=welcomeColorVector(preset.colors[0]);
    for(const p of reference){
      if(p.name.startsWith('smile')&&recipe.expression!=='smile')continue;
      const isEye=p.name.startsWith('eye'),isCheek=p.name.startsWith('cheek'),limb=p.name.includes('foot')||p.name.includes('hand');
      if(isCheek&&cheek.value<=.005)continue;
      const factor=p.name.includes('foot')?div(foot,.5):p.name.includes('hand')?div(arm,.5):isEye?div(eye,.18):isCheek?div(cheek,.21):expr(1);
      const pos=p.pos.map((n,i)=>mul(n,scales[i]));if(isEye)pos[0]=mul(pos[0],div(gap,.14));
      // 만두의 얼굴은 몸 표면을 따라 움직입니다. 기본 위치는 메인과 같습니다.
      if(preset.id==='dumpling'&&(isEye||isCheek)){
        const x=pos[0].value/(w.value*.5),y=(pos[1].value+.12*scales[1].value)/(1.36*scales[1].value*.5);
        const root=Math.sqrt(Math.max(.05,1-x*x-y*y));
        const baseX=p.pos[0]/(.5*1.85),baseY=(p.pos[1]+.12)/(.5*1.36),baseZ=.55*Math.sqrt(Math.max(.05,1-baseX*baseX-baseY*baseY));
        const offset=p.pos[2]-baseZ;
        pos[2]={value:(.55*root+offset)*scales[2].value,code:`(0.55 * sqrt(max(0.05, 1 - (${pos[0].code} / (body_width * 0.5))**2 - ((${pos[1].code} + 0.12 * ${scales[1].code}) / (0.68 * ${scales[1].code}))**2)) + ${offset}) * ${scales[2].code}`};
      }
      const rgb=welcomeColorVector(p.color),ratios=rgb.map((v,i)=>v/bodyColor[i]);
      const color=p.color===preset.colors[0]?'body':p.color===preset.colors[1]?'accent':p.name.startsWith('fold')||p.name==='lid'||p.name==='head'?{value:recipe.bodyColor.map((v,i)=>v*ratios[i]),code:'vector('+ratios.map((r,i)=>`body_color.${'xyz'[i]} * ${r}`).join(', ')+')'}:rgb;
      const props={pos:vector(...pos),shininess:expr(.28)};
      if(p.size){
        const size=p.size.map((n,i)=>mul(n,limb||isEye||isCheek?factor:scales[i]));
        if(isEye&&recipe.expression==='sleepy')size[1]=mul(size[1],.2);
        props.size=vector(...size);
        if(p.angle){props.axis=vector(mul(Math.cos(p.angle),size[0]),mul(Math.sin(p.angle),size[0]),0);props.up=vector(-Math.sin(p.angle),Math.cos(p.angle),0);}
      }
      if(p.axis)props.axis=vector(...p.axis.map((n,i)=>mul(n,scales[i])));
      if(p.radius)props.radius=mul(p.radius,scales[0]);
      if(p.thickness)props.thickness=mul(p.thickness,scales[0]);
      part(p.name,p.type,props,color);
    }
    const faceDepth=preset.id==='flashlight'?w:d;
    const headTop=preset.id==='toolbox'?add(mul(h,.83/1.8),mul(w,.405/1.8)):preset.id==='flashlight'?add(mul(h,1.09/2),mul(w,.035/1.38)):mul(h,.755/1.8);
    if(recipe.expression!=='smile')egg('mouth',0,mul(h,preset.id==='toolbox'?-.089:-.05),mul(faceDepth,preset.id==='flashlight'?.35:preset.id==='toolbox'?.46/1.1:.51),mul(w,.085),mul(h,recipe.expression==='sleepy'?.012:.09),mul(faceDepth,.035),[.14,.045,.065]);
    if(recipe.accessory==='hat'){
      egg('hat_brim',0,add(headTop,mul(h,.035)),0,mul(w,.75),mul(h,.055),mul(faceDepth,.8),'accent');
      cone('hat_top',0,add(headTop,mul(h,.06)),0,mul(w,.25),mul(h,.35),'accent');
    }else if(recipe.accessory==='bow'){
      for(const side of [-1,1])egg('bow_'+side,mul(w,side*.1),mul(h,.32),mul(faceDepth,preset.id==='toolbox'?.53:preset.id==='flashlight'?.43:.35),mul(w,.24),mul(h,.15),mul(faceDepth,.15),'accent');
      sphere('bow_knot',0,mul(h,.32),mul(faceDepth,preset.id==='toolbox'?.62:preset.id==='flashlight'?.52:.44),mul(w,.055),'accent');
    }else if(recipe.accessory==='antenna'){
      cylinder('antenna',[0,headTop,0],[0,mul(h,.25),0],mul(w,.018),'accent');
      sphere('antenna_tip',0,add(headTop,mul(h,.26)),0,mul(w,.07),'accent');
    }
  } else if(preset.id==='crystal'){
    for(const [i,x,s]of [[0,0,1],[1,-.31,.6],[2,.3,.75]]){
      const width=mul(w,.3*s),depth=mul(d,.3*s),length=mul(h,.5*s),bottom=mul(h,-.4),top=add(bottom,length);
      box('crystal_body_'+i,[mul(w,x),add(bottom,div(length,2)),0],[width,length,depth],i===1?'accent':'body');
      const tip=mul(h,.28*s);part('crystal_tip_'+i,'pyramid',{pos:vector(mul(w,x),top,0),axis:vector(0,tip,0),up:vector(1,0,0),size:vector(tip,width,depth),shininess:expr(.6)},i===1?'accent':'body');
    }
    cylinder('base',[0,mul(h,-.45),0],[0,mul(h,.05),0],mul(w,.45),'accent');
  } else if(preset.id==='coin'){
    cylinder('coin',[0,0,mul(d,-.08)],[0,0,mul(d,.16)],mul(w,.43));
    for(const side of [-1,1])ring('rim_'+side,[0,0,mul(d,side*.085)],mul(w,.36),mul(w,.026));
    const points=Array.from({length:10},(_,i)=>{const angle=Math.PI/2+i*Math.PI/5,r=i%2?.1:.23;return[mul(w,r*Math.cos(angle)),mul(w,r*Math.sin(angle))];});
    profile('star',points,mul(d,.082),mul(d,.14),'accent');
  } else if(preset.id==='pine'){
    cylinder('trunk',[0,mul(h,-.5),0],[0,mul(h,.65),0],mul(w,.075),[.24,.12,.065]);
    for(let i=0;i<3;i++)cone('leaves_'+i,0,mul(h,-.2+i*.24),0,mul(w,.43-i*.105),mul(h,.46),i===1?'accent':'body');
  } else if(preset.id==='rocket'){
    cylinder('hull',[0,mul(h,-.26),0],[0,mul(h,.55),0],mul(w,.23));
    cone('nose',0,mul(h,.29),0,mul(w,.23),mul(h,.3),'accent');
    egg('window',0,mul(h,.04),mul(w,.231),mul(w,.27),mul(w,.27),mul(w,.045),[.12,.35,.55]);
    ring('window_rim',[0,mul(h,.04),mul(w,.247)],mul(w,.15),mul(w,.025),'accent');
    egg('window_shine',mul(w,-.045),mul(h,.073),mul(w,.257),mul(w,.065),mul(w,.05),mul(w,.012),[.85,.96,1]);
    for(const side of [-1,1]){
      const fin=box('fin_'+side,[mul(w,side*.27),mul(h,-.26),0],[mul(w,.15),mul(h,.36),mul(w,.14)],'accent');
      const angle=-side*.3;fin.props.axis=vector(mul(Math.cos(angle),mul(w,.15)),mul(Math.sin(angle),mul(w,.15)),0);fin.props.up=vector(-Math.sin(angle),Math.cos(angle),0);
    }
    cone('flame',0,mul(h,-.26),0,mul(w,.13),mul(h,-.3),[1,.4,.08]);
    cone('flame_core',0,mul(h,-.26),0,mul(w,.08),mul(h,-.19),[1,.85,.3]);
  } else if(preset.id==='chest'){
    box('body',[0,mul(h,-.12),0],[w,mul(h,.58),mul(d,.68)]);
    box('lid',[0,mul(h,.265),0],[mul(w,1.04),mul(h,.18),mul(d,.72)]);
    for(const side of [-1,1]){
      box('band_'+side,[mul(w,side*.32),0,0],[mul(w,.08),mul(h,.73),mul(d,.735)],'accent');
      for(const z of [-1,1])sphere('rivet_'+side+'_'+z,mul(w,side*.32),mul(h,-.15),mul(d,z*.375),mul(w,.025),'accent');
    }
    box('lock',[0,mul(h,.08),mul(d,.39)],[mul(w,.18),mul(h,.22),mul(d,.08)],'accent');
    sphere('keyhole',0,mul(h,.09),mul(d,.435),mul(w,.026),[.07,.045,.03]);
  } else if(preset.id==='flag'){
    cylinder('base',[mul(w,-.25),mul(h,-.5),0],[0,mul(h,.08),0],mul(w,.28),'accent');
    cylinder('pole',[mul(w,-.25),mul(h,-.42),0],[0,mul(h,1.07),0],mul(w,.023),'accent');
    sphere('finial',mul(w,-.25),mul(h,.67),0,mul(w,.06),'accent');
    const points=[[-.25,.6],[.45,.6],[.3,.4],[.45,.2],[-.25,.2]].map(([x,y])=>[mul(w,x),mul(h,y)]);
    // -Z 경로의 단면 가로축은 +X이므로 깃대에서 오른쪽으로 펼쳐집니다.
    profile('flag',points,mul(d,.025),mul(d,-.025));
  }
}
