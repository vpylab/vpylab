// 화면과 Python 체험이 같은 기본 도형 명세를 사용합니다. 이름은 아직 정하지 않았습니다.
const text=(ko,en)=>({ko,en});
export const welcomeFriends=[
  {id:'dumpling',label:text('만두 친구','Dumpling'),color:'#ffe4b9',line:text('작은 코드부터, 같이 만들어 볼까?','Let’s make something with a little code!')},
  {id:'flashlight',label:text('손전등 친구','Flashlight'),color:'#b8b2ee',line:text('궁금한 곳을 코드로 비춰 보자!','Let’s shine a light on a new idea!')},
  {id:'toolbox',label:text('공구상자 친구','Toolbox'),color:'#f59282',line:text('만들고, 움직이고, 함께 고쳐 보자!','Let’s build, move, and improve it together!')},
  {id:'kirby',label:text('분홍 친구','Pink friend'),color:'#f5a4c2',line:text('반가워! 같이 만들어 볼까?','Hello! Let’s make something together!')},
];
export const welcomeLighting={
  dumpling:{left:'#ffd393',right:'#f4b8ac',label:text('따뜻한 금빛','Warm golden light')},
  flashlight:{left:'#a4c9ff',right:'#fff0a6',label:text('파랑·레몬빛','Blue and lemon light')},
  toolbox:{left:'#ffb48b',right:'#97ddce',label:text('살구·청록빛','Apricot and mint light')},
  kirby:{left:'#f4afd6',right:'#c4b7ff',label:text('분홍·보랏빛','Pink and violet light')},
};
const ink='#293342',cheek='#f3a6ae',mint='#a7d7c4';
export function welcomeParts(id='dumpling'){
  const parts=[];
  const egg=(name,pos,size,color,angle=0)=>parts.push({name,type:'ellipsoid',pos,size,color,angle});
  const solid=(name,type,props,color)=>parts.push({name,type,...props,color});
  if(id==='kirby'){
    const pink='#f5a4c2';
    solid('body','sphere',{pos:[0,0,0],radius:.86},pink);
    egg('left_foot',[-.38,-.81,.16],[.62,.33,.8],'#df3460');egg('right_foot',[.38,-.81,.16],[.62,.33,.8],'#df3460');
    egg('left_hand',[-.88,-.07,0],[.46,.46,.46],pink);egg('right_hand',[.86,.13,0],[.43,.5,.5],pink,-.6);
    for(const side of [-1,1]){
      // 큰 눈이 둥근 몸 표면을 따라가도록 가로축과 위쪽 축을 맞춥니다.
      const x=side*.235,y=.32,z=Math.sqrt(.86**2-x*x-y*y),normal=[x/.86,y/.86,z/.86];
      const horizontal=Math.hypot(z,x),axis=[z/horizontal,0,-x/horizontal];
      const up=[normal[1]*axis[2],normal[2]*axis[0]-normal[0]*axis[2],-normal[1]*axis[0]];
      const eyePart=(name,offset,size,color)=>{
        const pos=[x,y,z].map((v,i)=>v+axis[i]*offset[0]+up[i]*offset[1]+normal[i]*offset[2]);
        egg(name,pos,size,color);Object.assign(parts.at(-1),{axis,up});
      };
      eyePart('eye_'+side,[0,0,.018],[.255,.48,.105],'#181d34');
      eyePart('eye_blue_'+side,[0,-.135,.068],[.17,.15,.018],'#2456b3');
      eyePart('eye_shine_'+side,[-.018,.115,.066],[.115,.14,.02],'#ffffff');
      egg('cheek_'+side,[side*.48,0,.718],[.21,.08,.035],'#eb759e');
    }
    egg('mouth',[0,-.18,.844],[.16,.18,.04],'#813652');
    egg('tongue',[0,-.215,.866],[.085,.045,.02],'#f4a1bc');
    return parts;
  }
  let faceY=0,faceZ=.54,feetY=-.83;
  if(id==='flashlight'){
    solid('body','cylinder',{pos:[0,-.73,0],axis:[0,1.4,0],radius:.46},'#b8b2ee');
    solid('head','cone',{pos:[0,1.05,0],axis:[0,-.55,0],radius:.69},'#a69de4');
    solid('light','cylinder',{pos:[0,1.05,0],axis:[0,.045,0],radius:.65},'#fff2bf');
    solid('rim','ring',{pos:[0,1.09,0],axis:[0,1,0],radius:.67,thickness:.035},'#8b81c5');
    solid('switch','box',{pos:[0,-.43,.47],size:[.19,.25,.09]},'#ffe4a3');
    faceY=.16;faceZ=.465;feetY=-.84;
  }else if(id==='toolbox'){
    solid('handle','ring',{pos:[0,.83,0],axis:[0,0,1],radius:.32,thickness:.085},'#eacb7e');
    solid('body','box',{pos:[0,-.04,0],size:[1.55,1.05,.85]},'#f59282');
    egg('left_edge',[-.76,-.04,0],[.22,1.05,.85],'#f59282');egg('right_edge',[.76,-.04,0],[.22,1.05,.85],'#f59282');
    solid('lid','box',{pos:[0,.47,0],size:[1.8,.26,.98]},'#f8a18e');
    solid('clasp','box',{pos:[0,.35,.53],size:[.32,.28,.12]},'#f2d28a');
    faceY=-.07;faceZ=.44;feetY=-.72;
  }else{
    egg('body',[0,-.12,0],[1.85,1.36,1.1],'#ffe4b9');
    for(let i=-2;i<=2;i++)egg('fold_'+(i+2),[i*.21,.43+(2-Math.abs(i))*.055,0],[.18,.43,.66],'#f8d6a4',-i*.16);
  }
  egg('left_foot',[-.39,feetY,.09],[.32,.22,.43],mint);egg('right_foot',[.39,feetY,.09],[.32,.22,.43],mint);
  const armX=id==='flashlight'?.57:.96;
  egg('left_hand',[-armX,-.22,0],[.22,.48,.24],id==='flashlight'?'#b8b2ee':mint,-.48);
  egg('right_hand',[armX,.25,0],[.23,.55,.25],id==='flashlight'?'#b8b2ee':mint,-.5);
  for(const side of [-1,1]){
    egg('eye_'+side,[side*.25,faceY+.12,faceZ],[.105,.145,.045],ink);
    egg('cheek_'+side,[side*.43,faceY-.055,faceZ-.035],[.21,.115,.035],cheek);
  }
  const points=Array.from({length:25},(_,i)=>[-.12*Math.cos(i*Math.PI/24),faceY-.09-.08*Math.sin(i*Math.PI/24),faceZ+.02]);
  points.forEach((pos,i)=>{
    solid('smile_joint_'+i,'sphere',{pos,radius:.012},ink);
    if(i)solid('smile_link_'+i,'cylinder',{pos:points[i-1],axis:pos.map((v,j)=>v-points[i-1][j]),radius:.012},ink);
  });
  return parts;
}
export const welcomeWaveAngle=frame=>{let angle=0;for(let i=0;i<=frame;i++)angle+=.024*Math.cos(i*Math.PI/12);return angle;};
export const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
// CSS 색을 Three.js 메인 장면과 같은 선형 RGB 값으로 변환합니다.
export const welcomeColorVector=hex=>rgb(hex).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
const n=value=>Number(value.toFixed(5));
const vec=values=>'vector('+values.map(n).join(', ')+')';
export const welcomeTogether={id:'friends',label:text('프렌즈','Friends'),line:text('친구들과 함께 통통!','A little bounce with friends!')};
export const welcomeTogetherLighting={left:'#abd6ee',right:'#f7c4ba',label:text('함께 빛나는 무대','A stage for everyone')};
export const welcomeLayout=()=>welcomeFriends.map((f,i)=>{
  const minY=Math.min(...welcomeParts(f.id).filter(p=>p.name.endsWith('_foot')).map(p=>p.pos[1]-p.size[1]/2));
  return{id:f.id,scale:.43,origin:[(i-1.5)*.82,-.80-minY*.43,0]};
});
export const welcomeBounce=(time,index)=>.24*Math.abs(Math.sin(time*5+index*Math.PI/4))*Math.max(0,Math.min(1,time/.3,(6-time)/.5));
export function welcomeDefinition(id,articulated=false){
  const parts=welcomeParts(id),lines=['def make_'+id+(articulated?'_parts':'')+'(origin=None, scale=1):','    origin = vector(0,0,0) if origin is None else origin'];
  for(const part of parts.filter(p=>!p.name.startsWith('smile_'))){
    const props=Object.entries(part).filter(([key])=>!['name','type','angle'].includes(key)).map(([key,value])=>{
      let expression;
      if(key==='color')expression=vec(id==='kirby'?welcomeColorVector(value):rgb(value));
      else if(key==='pos')expression='origin+'+vec(value)+'*scale';
      else if(Array.isArray(value))expression=vec(value)+(['size','axis'].includes(key)?'*scale':'')+(key==='axis'&&part.type==='ellipsoid'?'*'+n(part.size[0]):'');
      else expression=String(value)+(['radius','thickness'].includes(key)?'*scale':'');
      return key+'='+expression;
    });
    const name=part.name.replaceAll('-','minus');lines.push('    '+name+' = '+part.type+'('+props.join(', ')+')');
    if(part.angle)lines.push('    '+name+'.rotate(angle='+part.angle+', axis=vector(0,0,1))');
  }
  const mouth=parts.find(p=>p.name==='smile_joint_0');
  if(mouth)lines.push('    # curve는 compound에 넣을 수 없어, 구와 원기둥으로 매끄럽게 잇습니다.',
    '    mouth = []','    previous = None','    for i in range(25):','        angle = i*pi/24',
    '        point = origin + vector(-0.12*cos(angle), '+n(mouth.pos[1])+'-0.08*sin(angle), '+n(mouth.pos[2])+')*scale',
    '        mouth.append(sphere(pos=point, radius=0.012*scale, color='+vec(rgb(ink))+'))',
    '        if previous is not None:', '            mouth.append(cylinder(pos=previous, axis=point-previous, radius=0.012*scale, color='+vec(rgb(ink))+'))',
    '        previous = point');
  const names=parts.filter(p=>!p.name.startsWith('smile_')).map(p=>p.name.replaceAll('-','minus'));
  if(articulated){
    lines.push('    parts = {'+names.map(name=>JSON.stringify(name)+': '+name).join(', ')+'}');
    if(mouth)lines.push('    for i, part in enumerate(mouth):','        parts["smile_"+str(i)] = part');
    lines.push('    return parts');
  }else lines.push('    return compound(['+names.join(', ')+']'+(mouth?' + mouth':'')+')');
  return lines.join('\n');
}
export function welcomeCode(id='dumpling'){
  const together=id==='friends',lighting=together?welcomeTogetherLighting:welcomeLighting[id]||welcomeLighting.dumpling;
  const lines=['from vpython import *','from math import cos, sin, pi','scene.range = '+(together?'2.1':'1.8'),'scene.center = vector(0, 0.05, 0)','scene.forward = vector(-0.12, -0.06, -1)',
    'local_light(pos=vector(-2,3,2), color='+vec(rgb(lighting.left))+')','local_light(pos=vector(2,2,1), color='+vec(rgb(lighting.right))+')',''];
  for(const f of together?welcomeFriends:[{id}])lines.push(welcomeDefinition(f.id),'');
  if(together){
    lines.push('# 각 friend는 독립된 compound, friends는 함께 다루는 목록입니다.','friends = [',...welcomeLayout().map(f=>'    make_'+f.id+'(origin='+vec(f.origin)+', scale='+f.scale+'),'),']',
      'bases = [vector(f.pos.x, f.pos.y, f.pos.z) for f in friends]',
      'for frame in range(180):','    rate(30)','    time = frame / 30','    for i, friend in enumerate(friends):','        fade = min(1, time/0.3, (6-time)/0.5)','        bounce = 0.24 * abs(sin(time*5 + i*pi/4)) * fade','        friend.pos = bases[i] + vector(0,bounce,0)',
      'for friend, base in zip(friends, bases):','    friend.pos = base');
  }else{
    lines.push('# 완제품 하나를 만듭니다. friend.pos로 통째로 움직일 수 있습니다.','friend = make_'+id+'()',
      '# friend.pos.x += 0.1', '# 완제품이 살짝 기울며 인사합니다.',
      'for frame in range(72):','    rate(30)','    angle = 0.024 * cos(frame * pi / 12)',
      '    friend.rotate(angle=angle, axis=vector(0,0,1), origin=vector(0,0,0))');
  }
  return lines.join('\n')+'\n';
}
export const welcomeActions={
 dumpling:text('만두 빚기','Shape the dumpling'),flashlight:text('불 켜기','Light up'),toolbox:text('뚜껑 달그락','Rattle the lid'),kirby:text('입 크게 벌리기','Open wide'),
};
export const welcomeActionAmount=time=>time<=0||time>=2.4?0:Math.sin(Math.PI*time/2.4)**2;
export function welcomeActionPose(id,time,gain=1){
 const amount=welcomeActionAmount(time)*gain,parts=welcomeParts(id),pose={};
 if(id==='dumpling')for(const p of parts.filter(p=>p.name.startsWith('fold_'))){
  const i=Number(p.name.at(-1))-2,angle=p.angle+i*.13*amount,size=[p.size[0]*(1+.22*amount),p.size[1]*(1-.3*amount),p.size[2]*(1-.08*amount)];
  pose[p.name]={pos:[p.pos[0]*(1-.68*amount),p.pos[1]+(.075-.008*Math.abs(i))*amount,p.pos[2]],size,axis:[Math.cos(angle)*size[0],Math.sin(angle)*size[0],0],up:[-Math.sin(angle),Math.cos(angle),0]};
 }
 if(id==='toolbox'){
  const angle=-.2*amount*(.6+.4*Math.cos(time*14)),c=Math.cos(angle),sn=Math.sin(angle),hinge=[0,.34,-.49];
  for(const p of parts.filter(p=>['lid','handle','clasp'].includes(p.name))){
   const y=p.pos[1]-hinge[1],z=p.pos[2]-hinge[2];pose[p.name]={pos:[p.pos[0],hinge[1]+y*c-z*sn,hinge[2]+y*sn+z*c],axis:p.type==='ring'?[0,-sn,c]:[p.size[0],0,0],up:[0,c,sn]};
  }
 }
 if(id==='kirby'){
  pose.mouth={pos:[0,-.18-.03*amount,.844+.045*amount],size:[.16*(1+1.1*amount),.18*(1+1.65*amount),.04]};
  pose.tongue={pos:[0,-.215-.125*amount,.866+.045*amount],size:[.085*(1+.6*amount),.045*(1+1.2*amount),.02]};
 }
 return{amount,pose};
}

// 부품은 아직 합치지 않은 상태로 움직이고, 마지막에 완제품 compound로 합칩니다.
export function welcomeMotionCode(id='dumpling'){
 const together=id==='friends',selected=together?welcomeFriends:[welcomeFriends.find(f=>f.id===id)||welcomeFriends[0]];
 const lines=['from vpython import *','from math import sin, cos, pi','scene.range = '+(together?'2.1':'2.0'),'scene.center = vector(0,0.2,0)','scene.forward = vector(-0.12,-0.06,-1)',''];
 for(const f of selected)lines.push(welcomeDefinition(f.id,true),'');
 lines.push('# 움직일 부품을 남겨 둡니다. compound로 합친 뒤에는 부품을 따로 움직이지 않습니다.','rigs = [');
 for(const f of selected){const layout=together?welcomeLayout().find(x=>x.id===f.id):{origin:[0,0,0],scale:1};lines.push('    ('+JSON.stringify(f.id)+', make_'+f.id+'_parts(origin='+vec(layout.origin)+', scale='+layout.scale+'), '+vec(layout.origin)+', '+layout.scale+'),');}
 lines.push(']');
 if(together)lines.push('base_positions = [{name:vector(part.pos.x,part.pos.y,part.pos.z) for name,part in parts.items()} for kind,parts,origin,scale in rigs]');
 if(selected.some(f=>f.id==='flashlight'))lines.push('lamp_origin = rigs['+selected.findIndex(f=>f.id==='flashlight')+'][2]','lamp_scale = rigs['+selected.findIndex(f=>f.id==='flashlight')+'][3]',
  'beam = cone(pos=lamp_origin+vector(0,1.62,0)*lamp_scale, axis=vector(0,-0.52,0)*lamp_scale, radius=0.8*lamp_scale, color=vector(1,0.91,0.54), opacity=0, emissive=True)',
  'lamp = local_light(pos=lamp_origin+vector(0,1.2,0.55)*lamp_scale, color=vector(0,0,0))');
 lines.push('for frame in range('+(together?180:73)+'):','    rate(30)','    time = frame/30','    for index, (kind, parts, origin, scale) in enumerate(rigs):',
  ...(together?['        fade = max(0,min(1,time/0.3,(6-time)/0.5)) if frame < 179 else 0','        bounce = 0.24*abs(sin(time*5+index*pi/4))*fade','        for name, part in parts.items():','            part.pos = base_positions[index][name]+vector(0,bounce,0)','        origin = origin+vector(0,bounce,0)']:[]),
  '        local_time = '+(together?'max(0,time-index*0.18) % 2.4':'time'),
  '        amount = sin(pi*local_time/2.4)**2 if 0 < local_time < 2.4 else 0',
  '        amount *= '+(together?'max(0,min(1,time/0.3,(6-time)/0.5))':'1'),'        if frame == '+(together?179:72)+':','            amount = 0');
 if(selected.some(f=>f.id==='dumpling'))lines.push('        if kind == "dumpling":','            for i in range(5):','                part = parts["fold_"+str(i)]','                side = i-2',
  '                size = vector(0.18*(1+0.22*amount),0.43*(1-0.3*amount),0.66*(1-0.08*amount))*scale','                angle = -side*0.16+side*0.13*amount',
  '                part.pos = origin+vector(side*0.21*(1-0.68*amount),0.43+(2-abs(side))*0.055+(0.075-0.008*abs(side))*amount,0)*scale',
  '                part.size = size','                part.axis = vector(cos(angle),sin(angle),0)*size.x','                part.up = vector(-sin(angle),cos(angle),0)');
 if(selected.some(f=>f.id==='flashlight'))lines.push('        if kind == "flashlight":','            beam.pos = origin+vector(0,1.62,0)*scale','            lamp.pos = origin+vector(0,1.2,0.55)*scale','            beam.opacity = 0.12*amount','            lamp.color = vector(1,0.91,0.54)*amount');
 if(selected.some(f=>f.id==='toolbox'))lines.push('        if kind == "toolbox":','            angle = -0.2*amount*(0.6+0.4*cos(local_time*14))','            hinge = vector(0,0.34,-0.49)',
  '            for name, base in [("lid",vector(0,0.47,0)),("handle",vector(0,0.83,0)),("clasp",vector(0,0.35,0.53))]:',
  '                part = parts[name]','                part.pos = origin+(hinge+(base-hinge).rotate(angle=angle,axis=vector(1,0,0)))*scale',
  '                if name == "handle":','                    part.axis = vector(0,0,1).rotate(angle=angle,axis=vector(1,0,0))',
  '                else:','                    part.up = vector(0,1,0).rotate(angle=angle,axis=vector(1,0,0))');
 if(selected.some(f=>f.id==='kirby'))lines.push('        if kind == "kirby":','            parts["mouth"].size = vector(0.16*(1+1.1*amount),0.18*(1+1.65*amount),0.04)*scale',
  '            parts["mouth"].pos = origin+vector(0,-0.18-0.03*amount,0.844+0.045*amount)*scale',
  '            parts["tongue"].size = vector(0.085*(1+0.6*amount),0.045*(1+1.2*amount),0.02)*scale',
  '            parts["tongue"].pos = origin+vector(0,-0.215-0.125*amount,0.866+0.045*amount)*scale');
 // 마지막 프레임에서 정지 형태로 돌아온 뒤 결합합니다.
 if(together)lines.push('# 마지막 프레임에서 원래 모양으로 돌아온 뒤 완성합니다.');
 lines.push('rate(30)','# 모션을 마치고 완제품으로 묶습니다.');
 if(selected.some(f=>f.id==='flashlight'))lines.push('beam.visible = False','lamp.color = vector(0,0,0)');
 lines.push('# 완제품으로 묶습니다. 이후 friend.pos로 전체를 이동할 수 있습니다.', 'friends = [compound(list(parts.values())) for kind, parts, origin, scale in rigs]','friend = friends[0]');
 return lines.join('\n')+'\n';
}
export const welcomeTutorial={id:'welcome-friend',kind:'lab',duration:text('3~5분 · 기본 도형으로 인사하기','3–5 min · Say hello with shapes'),title:text('첫 화면의 친구를 내 코드로','Build the welcome friend with code'),description:text('만두·손전등·공구상자·분홍 친구를 기본 도형으로 만들고 완제품으로 묶고 인사해 봅니다.','Build a dumpling, flashlight, toolbox, or pink friend with simple shapes and combine the parts into one moving character.'),change:text('도형 한 줄의 color나 발의 size 중 하나를 바꾸고 다시 실행하세요.','Change one shape’s color or a foot’s size and run it again.'),reflect:text('friend.rotate의 angle을 바꾸면 인사가 어떻게 달라지나요?','How does changing the angle in friend.rotate change the wave?')};
export function getWelcomeTutorial(id,step){
 if(id!==welcomeTutorial.id)return undefined;
 const motion=!!step?.endsWith('-motion'),base=motion?step.slice(0,-7):step,friend=base==='friends'?welcomeTogether:welcomeFriends.find(f=>f.id===base)||welcomeFriends[0],suffix=motion?'-motion':'';
 return {...welcomeTutorial,code:motion?welcomeMotionCode(friend.id):welcomeCode(friend.id),activeStep:friend.id+suffix,
  modes:[{id:friend.id,title:text('완제품 만들기','Build the complete object')},{id:friend.id+'-motion',title:text('전용 모션','Character action')}],
  variants:[...welcomeFriends,welcomeTogether].map(f=>({id:f.id+suffix,title:f.label})),
  reflect:motion?text('amount의 크기를 바꾸면 주름·뚜껑·입·불빛이 어떻게 달라지나요?','How does amount change the folds, lid, mouth, or light?'):friend.id==='friends'?text('bounce의 0.24와 i*pi/4를 바꾸면 높이와 박자가 어떻게 달라지나요?','How do 0.24 and i*pi/4 change the bounce height and timing?'):welcomeTutorial.reflect,
  stepNote:motion?text('움직일 부품은 따로 둔 채 모션을 실행하고, 마지막에 compound로 완성합니다. 이미 합친 compound의 부품을 수정하는 방식이 아닙니다.','Animate the separate parts, then finish with compound. Parts inside an existing compound are not edited.'):friend.id==='friends'?text('각 friend는 compound입니다. friends 목록에서 하나씩 위치를 바꿉니다.','Each friend is a compound. Move each one independently through the friends list.'):text('이름은 아직 정하지 않았어요. 먼저 내 색과 모양으로 바꿔 보세요.','No name yet. Start by changing the shapes and colors.'),usesSound:false};
}
