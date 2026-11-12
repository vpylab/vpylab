// AI는 도형 명세만 제안하고, 실행 코드는 검증된 생성기가 만듭니다.
const vectorSchema = {type:'array',items:{type:'number'}};
const partProperties = {
  kind:{type:'string',enum:['sphere','box','ellipsoid','cylinder','cone','ring','hemisphere','mesh']},
  pos:vectorSchema, axis:vectorSchema, size:vectorSchema, color:vectorSchema,
  opacity:{type:'number'}, vertices:{type:'array',items:vectorSchema},
  faces:{type:'array',items:{type:'array',items:{type:'integer'}}},
};
export const shapeResponseSchema = {
  type:'object',additionalProperties:false,required:['status','title','explanation','parts'],
  properties:{
    status:{type:'string',enum:['ok','needs_clarification','unsupported']},
    title:{type:'string'}, explanation:{type:'string'},
    parts:{type:'array',items:{type:'object',additionalProperties:false,required:Object.keys(partProperties),properties:partProperties}},
  },
};
const kinds = new Set(partProperties.kind.enum);
const fail = message => { throw new Error('도형 명세: '+message); };
const exact = (object, names) => object && typeof object === 'object' && !Array.isArray(object) && Object.keys(object).length === names.length && names.every(name=>Object.hasOwn(object,name));
const finite = (value,lo,hi) => typeof value === 'number' && Number.isFinite(value) && value >= lo && value <= hi;
const vec = (v,lo,hi) => Array.isArray(v) && v.length===3 && v.every(n=>finite(n,lo,hi));
export function validateShapeSpec(spec) {
  if (!exact(spec,['status','title','explanation','parts'])) fail('최상위 필드가 다릅니다');
  if (!['ok','needs_clarification','unsupported'].includes(spec.status)) fail('처리 상태가 다릅니다');
  if (typeof spec.title!=='string'||spec.title.length>120||typeof spec.explanation!=='string'||spec.explanation.length>2000) fail('설명 길이를 확인하세요');
  if (!Array.isArray(spec.parts)||spec.parts.length>24) fail('부품은 최대 24개입니다');
  if (spec.status!=='ok') { if(spec.parts.length)fail('확인 전에는 도형을 만들지 않습니다'); return spec; }
  if (!spec.parts.length) fail('도형이 없습니다');
  let faces=0;
  for (const p of spec.parts) {
    if (!exact(p,Object.keys(partProperties))||!kinds.has(p.kind)) fail('허용하지 않은 부품입니다');
    if (!vec(p.pos,-100,100)||!vec(p.axis,-100,100)||Math.hypot(...p.axis)<0.001) fail('위치·방향을 확인하세요');
    if (!vec(p.size,0.001,100)||!vec(p.color,0,1)||!finite(p.opacity,0,1)) fail('크기·색·불투명도를 확인하세요');
    if (!Array.isArray(p.vertices)||!Array.isArray(p.faces)||p.vertices.length>512||p.faces.length>1024) fail('메시 크기 제한을 넘었습니다');
    if (p.kind!=='mesh' && (p.vertices.length||p.faces.length)) fail('메시 외 부품에는 정점을 넣을 수 없습니다');
    if (p.kind==='hemisphere' && p.axis.some((v,i)=>v!==[0,1,0][i])) fail('현재 반구의 절단면은 수평입니다');
    if (p.kind==='ellipsoid' && p.axis.some((v,i)=>v!==[1,0,0][i])) fail('현재 타원체는 좌표축 방향만 지원합니다');
    if (p.kind==='ring'&&p.size[1]>=p.size[0]) fail('고리 두께는 반지름보다 작아야 합니다');
    if (p.kind==='mesh') {
      if(p.vertices.length<3||!p.faces.length||!p.vertices.every(v=>vec(v,-100,100)))fail('메시 정점을 확인하세요');
      for (const f of p.faces) {
        if(!Array.isArray(f)||f.length!==3||new Set(f).size!==3||!f.every(i=>Number.isInteger(i)&&i>=0&&i<p.vertices.length))fail('삼각형 인덱스를 확인하세요');
        const [a,b,c]=f.map(i=>p.vertices[i]), u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]);
        if(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])<1e-8)fail('넓이가 0인 삼각형입니다');
      }
    }
    faces += p.kind==='hemisphere'?256:p.faces.length;
    if (faces>4096) fail('전체 삼각형 제한을 넘었습니다');
  }
  return spec;
}

function hemisphereMesh(radius,height) {
  const vertices=[[0,height,0]],faces=[],segments=16,rows=8;
  for(let i=1;i<=rows;i++)for(let j=0;j<segments;j++){
    const a=Math.PI/2*i/rows,b=2*Math.PI*j/segments;
    vertices.push([radius*Math.sin(a)*Math.cos(b),height*Math.cos(a),radius*Math.sin(a)*Math.sin(b)]);
  }
  for(let j=0;j<segments;j++)faces.push([0,1+(j+1)%segments,1+j]);
  for(let i=0;i<rows-1;i++)for(let j=0;j<segments;j++){
    const a=1+i*segments+j,b=1+i*segments+(j+1)%segments,c=a+segments,d=b+segments;
    faces.push([a,b,d],[a,d,c]);
  }
  const bottom=vertices.length;vertices.push([0,0,0]);
  for(let j=0;j<segments;j++)faces.push([bottom,1+(rows-1)*segments+j,1+(rows-1)*segments+(j+1)%segments]);
  return {vertices,faces};
}

// 문자열 설명이나 모델이 만든 식은 코드에 삽입하지 않습니다. 유한 숫자만 직렬화합니다.
export function compileShapeSpec(spec) {
  validateShapeSpec(spec);
  if(spec.status!=='ok')return null;
  const v=a=>'vec('+a.join(', ')+')';
  const lines=['from vpython import *','# 부품의 위치·크기·색 숫자를 직접 바꾸며 비교하세요.','shape_parts = []'];
  for(const p of spec.parts){
    const args=['pos='+v(p.pos),'color='+v(p.color),'opacity='+p.opacity];
    if(p.kind==='hemisphere'||p.kind==='mesh'){
      const mesh=p.kind==='mesh'?p:hemisphereMesh(p.size[0],p.size[1]);
      const points=mesh.vertices.map(a=>a.map((n,i)=>n+p.pos[i]));
      lines.push('_points = '+JSON.stringify(points),'_faces = '+JSON.stringify(mesh.faces),'_mesh_parts = []',
        'for _face in _faces:',
        '    _mesh_parts.append(triangle(vs=[vertex(pos=vec(*_points[_i]), color=color.white) for _i in _face]))',
        'shape_parts.append(compound(_mesh_parts, color='+v(p.color)+', opacity='+p.opacity+'))');
    }else{
      if(['box','ellipsoid'].includes(p.kind)) args.push('size='+v(p.size));
      if(['sphere','cylinder','cone','ring'].includes(p.kind)) args.push('radius='+p.size[0]);
      if(['box','cylinder','cone','ring'].includes(p.kind)) args.push('axis='+v(p.axis));
      if(p.kind==='ring') args.push('thickness='+p.size[1]);
      lines.push('shape_parts.append('+p.kind+'('+args.join(', ')+'))');
    }
  }
  lines.push('shape = compound(shape_parts)','# shape.color = color.white  # 원래 부품 색으로 복원','# shape.opacity = 0.5       # 전체 불투명도 바꾸기');
  return lines.join('\n')+'\n';
}
