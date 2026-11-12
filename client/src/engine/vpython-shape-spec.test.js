import {it,expect} from 'vitest';
import {compileShapeSpec} from '../../../shared/shape-spec.js';
import {hasPython,runPythonJobs} from '../test/python-runner';
it.skipIf(!hasPython())('허용된 기본 모양·닫힌 반구·삼각형 메시가 실제 Python API에서 실행된다',()=>{
 const kinds=['sphere','box','ellipsoid','cylinder','cone','ring','hemisphere','mesh'];
 const parts=kinds.map(kind=>({kind,pos:[0,0,0],axis:kind==='hemisphere'?[0,1,0]:[1,0,0],size:[1,0.2,1],color:[0.2,0.6,1],opacity:0.7,vertices:kind==='mesh'?[[0,0,0],[1,0,0],[0,1,0]]:[],faces:kind==='mesh'?[[0,1,2]]:[]}));
 const code=compileShapeSpec({status:'ok',title:'기본 모양',explanation:'',parts});
 const r=runPythonJobs([{id:'shape',label:'all',code}]).get('shape:all');
 expect(r.error).toBeNull();expect(r.commands.filter(c=>c.action==='create'&&c.type==='triangle')).toHaveLength(257);
 const triangles=r.commands.filter(c=>c.action==='create'&&c.type==='triangle');
 for(const t of triangles){const [a,b,c]=t.vertices.map(v=>v.pos);const u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]);expect(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])).toBeGreaterThan(1e-10);}
});
