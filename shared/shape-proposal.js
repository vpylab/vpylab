import { shapeResponseSchema, validateShapeSpec, compileShapeSpec } from './shape-spec.js';

export const SHAPE_INSTRUCTIONS = `학생이 원하는 정적인 3D 모양의 부품 명세만 제안한다. 전체 프로그램·물리·음악·입력·팀 과제를 대신 풀지 않는다.
전체 API 문서는 참고 자료다. 출력에는 JSON 명세만 사용한다. 문서에 있어도 이 명세에 없는 기능은 사용하지 않는다.
status=ok는 실제로 표현할 수 있을 때만 쓴다. 모호하면 needs_clarification, 애니메이션·소리·외부 접근·불가능한 정확한 모델 요청은 unsupported로 하고 parts=[]로 둔다.
kind=sphere/box/ellipsoid/cylinder/cone/ring/hemisphere/mesh. 모든 부품에는 pos,axis,size,color(0~1 RGB),opacity,vertices,faces가 필요하다. 사용하지 않는 vertices/faces는 []다.
size: sphere는 [반지름,1,1], box와 ellipsoid는 [가로,높이,깊이], cylinder/cone는 [반지름,1,1]과 시작점 pos+길이를 포함한 axis, ring은 [반지름,튜브반지름,1], hemisphere는 [반지름,높이,1]. hemisphere의 평평한 바닥은 pos.y이고 위로 볼록하며 axis=[0,1,0]만 지원한다. ellipsoid는 axis=[1,0,0]만 지원한다.
mesh의 vertices는 pos를 기준으로 한 실제 삼각형 꼭짓점, faces는 0부터 시작하는 세 정점 인덱스다. 정점은 최소 3개, 최대 512개, 삼각형은 최대 1024개이며 겹친/일직선 정점으로 넓이 0인 면을 만들지 않는다.
부품 최대 24개, 좌표/axis 각 성분 -100~100, size 각 성분 0.001~100, axis 길이 최소 0.001, opacity 0~1. ring 튜브반지름은 고리 반지름보다 작다. title/explanation은 한국어로 짧게 쓰며 근사나 한계도 명시한다. 원하는 모양에서 구멍·열린 부분을 막힌 물체로 속이지 않는다.`;

// 실험용 서비스 함수입니다. 공개 API 라우트나 기본 학습 화면에는 연결하지 않았습니다.
export async function proposeShape({request,documentation,apiKey,fetchImpl=fetch}) {
  if(typeof request!=='string'||!request.trim()||request.length>2000)throw new Error('모양 설명은 1~2000자여야 합니다');
  if(typeof documentation!=='string'||!documentation.trim())throw new Error('전체 API 문서가 필요합니다');
  if(!apiKey)throw new Error('UPSTAGE_API_KEY가 필요합니다');
  const started=Date.now();
  const response=await fetchImpl('https://api.upstage.ai/v1/chat/completions',{
    method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
    body:JSON.stringify({model:'solar-pro4',temperature:0,max_tokens:6000,
      messages:[{role:'system',content:SHAPE_INSTRUCTIONS+'\n<api_documentation>\n'+documentation+'\n</api_documentation>'},{role:'user',content:request}],
      response_format:{type:'json_schema',json_schema:{name:'shape_proposal',strict:true,schema:shapeResponseSchema}}}),
    signal:AbortSignal.timeout(90000),
  });
  if(!response.ok)throw new Error('Solar HTTP '+response.status);
  const body=await response.json(),choice=body.choices?.[0];
  if(choice?.finish_reason!=='stop')throw new Error('Solar 응답이 완결되지 않았습니다: '+choice?.finish_reason);
  if(typeof choice.message?.content!=='string'||choice.message.content.length>100000)throw new Error('Solar 응답 크기를 확인하세요');
  const spec=validateShapeSpec(JSON.parse(choice.message.content));
  return {spec,code:compileShapeSpec(spec),model:body.model,usage:body.usage,elapsedMs:Date.now()-started};
}
