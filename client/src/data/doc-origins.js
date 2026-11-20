const text=(ko,en)=>({ko,en});
export const originLabels={vpython:text('VPython API','VPython API'),vpylab:text('VPyLab 확장','VPyLab extension'),guide:text('만들기 가이드','Making guide')};
const extensionIds=new Set(['frame','vector-clone','object-attach-trail','scene_background','korean-colors','color-lists']);
export const extendedColors={pink:[1,.75,.8],brown:[.6,.3,.1],gold:[1,.84,0],silver:[.75,.75,.75],navy:[0,0,.5],skyblue:[.53,.81,.92],lime:[.5,1,0],olive:[.5,.5,0],coral:[1,.5,.31],salmon:[.98,.5,.45],violet:[.56,0,1],indigo:[.29,0,.51],beige:[.96,.96,.86],mint:[.6,1,.8],peach:[1,.85,.73],lavender:[.71,.49,.86],maroon:[.5,0,0],teal:[0,.5,.5],ivory:[1,1,.94]};
const standardTextures=new Set(['wood','metal','stones','granite','gravel','rough','rug','stucco','flower','earth','rock','wood_old']);
const notes={
 pyramid:text('지원 차이: 현재 pyramid는 사각 원뿔 기하로 단순화하여 밑면 height와 width가 다른 직사각형은 정확하게 표현하지 못합니다. 정확한 단면 모양은 extrusion 가이드를 참고하세요.','Current pyramid geometry is simplified and does not accurately represent a rectangular base with unequal height and width. Use an extrusion for an exact cross-section.'),
 'vector-clone':text('v.clone()은 VPyLab 편의 함수입니다. 표준 VPython에서는 vector(v)로 복사할 수 있습니다.','v.clone() is a VPyLab convenience; use vector(v) in standard VPython.'),
 frame:text('이 앱의 frame은 compound 편의 별칭입니다. 예전 VPython의 frame 전체 동작을 재현하는 명령이 아닙니다. 새 코드는 compound 또는 group으로 작성하세요.','This app aliases frame to compound; it does not reproduce the full historical VPython frame API. Use compound or group for new code.'),
 'object-attach-trail':text('obj.attach_trail()은 VPyLab 편의 메서드입니다. 표준 함수 attach_trail(obj, ...)와 구별하세요.','obj.attach_trail() is a VPyLab convenience method; distinguish it from standard attach_trail(obj, ...).'),
 scene_background:text('표준 표기는 scene.background = color.black입니다. 이 함수는 같은 목적의 편의 함수입니다.','The standard form is scene.background = color.black; this function is a convenience.'),
 'scene-mouse':text('scene.mouse.pick은 마우스 아래의 도형을 돌려줍니다. scene.mouse() 호출 표기는 VPyLab 편의 표기입니다.','scene.mouse.pick returns the object under the cursor. Calling scene.mouse() is a VPyLab convenience.'),
 'scene-bind':text('scene.bind(이벤트, 함수)는 VPython API입니다. @scene.bind(...) 데코레이터 표기는 VPyLab 확장입니다.','scene.bind(event, handler) is standard; the @scene.bind(...) decorator form is a VPyLab extension.'),
 'textures-presets':text('표준과 이름이 겹치는 무늬도 이 앱에서는 자체 생성 이미지로 보입니다. 추가 프리셋은 인자 표에 VPyLab 확장으로 표시합니다.','Even standard texture names use app-generated patterns here. Additional preset names are marked as VPyLab extensions.'),
 'extrusion':text('지원 범위: 단면·구멍·경로·scale을 지원합니다. twist·smooth·xscale·yscale은 현재 모양에 반영하지 않습니다. 공유 HTML의 지원 범위는 더 좁습니다.','Supports cross-sections, holes, paths, and scale. twist, smooth, xscale, and yscale currently do not affect geometry. Standalone HTML supports a narrower subset.'),
};
export function annotateDocOrigin(doc) {
 const origin=extensionIds.has(doc.id)||['sound','charts'].includes(doc.category)?'vpylab':'vpython';
 const params=(doc.params||[]).map(p=>{
  const extended=(doc.id==='radio'&&p.name==='value')||(['local_light','distant_light','attach-light'].includes(doc.id)&&p.name==='intensity')||(doc.id==='color-palette'&&Object.hasOwn(extendedColors,p.name.replace('color.','')))||(doc.id==='textures-presets'&&!standardTextures.has(p.name));
  return extended?{...p,origin:'vpylab',...(doc.id==='radio'&&p.name==='value'?{type:'number | string',desc:text('문자열·숫자 등 직렬화 가능한 편의 값. 색 벡터는 콜백에서 직접 지정하세요.','A serializable convenience value such as a string or number. Assign color vectors directly in the callback.')}:{})}:p;
 });
 let code=doc.code;
 if(origin==='vpython'&&code){
  for(const [name,rgb] of Object.entries(extendedColors)) code=code.replaceAll(`color.${name}`,`vector(${rgb.join(', ')})`);
  code=code.replace(/, intensity=(?:1\.5|1\.2|20)/g,'');
  code=code.replaceAll('scene_background(color.black)','scene.background = color.black').replaceAll('scene_background(vector(0.53, 0.81, 0.92))','scene.background = vector(0.53, 0.81, 0.92)');
 }
 const extensionNotes=[];
 if(params.some(p=>p.origin==='vpylab'))extensionNotes.push(text('이 항목에는 VPython API와 VPyLab 추가 기능이 함께 있습니다. 추가한 인자·이름에 VPyLab 확장을 표시했습니다.','This topic includes standard API and VPyLab additions; extended parameters and names are marked.'));
 if(notes[doc.id])extensionNotes.push(notes[doc.id]);
 return {...doc,code,params,origin,extensionNotes,tags:[...(doc.tags||[]),...(origin==='vpylab'||params.some(p=>p.origin==='vpylab')?['vpylab','자체','확장','extension']:[])],practice:!!code};
}
