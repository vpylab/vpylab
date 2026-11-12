import {test} from 'node:test';
import assert from 'node:assert/strict';
import {proposeShape} from './shape-proposal.js';
import {validateShapeSpec,compileShapeSpec} from './shape-spec.js';
const part=()=>({kind:'sphere',pos:[0,0,0],axis:[1,0,0],size:[1,1,1],color:[1,1,1],opacity:1,vertices:[],faces:[]});
const spec=()=>({status:'ok',title:'구',explanation:'반지름을 바꾸세요',parts:[part()]});
test('잘못된 수치·추가 필드·메시 인덱스·퇴화 삼각형은 실행 전에 거부한다',()=>{
 for(const change of [p=>p.pos=[NaN,0,0],p=>p.opacity=1.1,p=>p.size=[1,0,1],p=>p.axis=[0,0,0],p=>p.kind='exec',p=>p.code='print(1)',p=>{p.kind='mesh';p.vertices=[[0,0,0],[1,0,0],[0,1,0]];p.faces=[[0,1,3]]},p=>{p.kind='mesh';p.vertices=[[0,0,0],[1,0,0],[2,0,0]];p.faces=[[0,1,2]]}]){
  const s=spec();change(s.parts[0]);assert.throws(()=>validateShapeSpec(s),/도형 명세/);
 }
});
test('미지원 응답에는 부품을 허용하지 않고 설명 문자열은 코드에 삽입하지 않는다',()=>{
 const s=spec();s.title='__import__("os").system("echo bad")';s.explanation='</script>';
 assert(!compileShapeSpec(s).includes('__import__'));assert(!compileShapeSpec(s).includes('</script>'));
 s.status='unsupported';assert.throws(()=>validateShapeSpec(s));s.parts=[];assert.equal(compileShapeSpec(s),null);
});
test('Solar에는 문서 전체와 strict 스키마를 보내며 완결된 응답만 검증 후 받는다',async()=>{
 const documentation='전체 문서 내용 확인',request='하얀 구';let body;
 const fetchImpl=async(url,options)=>{assert.equal(url,'https://api.upstage.ai/v1/chat/completions');body=JSON.parse(options.body);return {ok:true,json:async()=>({model:'solar-pro4-fixture',choices:[{finish_reason:'stop',message:{content:JSON.stringify(spec())}}]})}};
 const result=await proposeShape({request,documentation,apiKey:'fixture',fetchImpl});
 assert(body.messages[0].content.includes(documentation));assert.equal(body.response_format.json_schema.strict,true);assert.match(result.code,/shape = compound/);
 const truncated=async()=>({ok:true,json:async()=>({choices:[{finish_reason:'length',message:{content:'{}'}}]})});
 await assert.rejects(proposeShape({request,documentation,apiKey:'fixture',fetchImpl:truncated}),/완결/);
});
test('부품·정점 수 제한과 미지원 방향을 거부한다',()=>{
 const s=spec();s.parts=Array.from({length:25},part);assert.throws(()=>validateShapeSpec(s));
 for(const kind of ['hemisphere','ellipsoid']){const t=spec();t.parts[0].kind=kind;t.parts[0].axis=[1,1,0];assert.throws(()=>validateShapeSpec(t));}
});
