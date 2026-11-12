import {describe,it,expect} from 'vitest';
import docs,{apiReferenceDocs,getDocById,searchDocs,docCategories} from './docs';
import {extendedColors} from './doc-origins';
import {shapeGuides,getGuideVariants} from './shape-guides';
import {hasPython,runPythonJobs} from '../test/python-runner';

describe('문서의 출처·검색·링크',()=>{
 it('고유 ID·분류와 관련 링크를 유지하고 가이드를 API 목록에서 구별한다',()=>{
  expect(new Set(docs.map(d=>d.id)).size).toBe(docs.length);
  for(const d of docs){expect(['vpython','vpylab','guide']).toContain(d.origin);expect(docCategories[d.category],d.id).toBeDefined();for(const id of d.related||[])expect(getDocById(id),id).toBeDefined();}
  expect(apiReferenceDocs).toHaveLength(89);expect(apiReferenceDocs.every(d=>d.origin!=='guide')).toBe(true);
 });
 it('표준 명령은 표준으로, 편의 이름과 혼합 인자는 확장으로 표시한다',()=>{
  for(const id of ['compound','vertex','triangle','scene_camera','scene_range_fov','attach-trail-function','text','graph','gcurve','gdots','gvbars','ghbars'])expect(getDocById(id).origin,id).toBe('vpython');
  for(const id of ['scene_background','frame','object-attach-trail','vector-clone','korean-colors','play_note','scatter3d'])expect(getDocById(id).origin,id).toBe('vpylab');
  expect(getDocById('local_light').params.find(p=>p.name==='intensity').origin).toBe('vpylab');
  expect(getDocById('color-palette').params.find(p=>p.name==='color.gold').origin).toBe('vpylab');
  expect(getDocById('text').params.find(p=>p.name==='billboard').origin).toBeUndefined();
 });
 it('표준 예제에는 자체 소리·색 이름·편의 함수를 섞지 않고 기본값이 실제 동작과 맞는다',()=>{
  for(const d of apiReferenceDocs.filter(d=>d.origin==='vpython')){expect(d.code||'',d.id).not.toMatch(/scene_background\(|색상\[|무지개|파스텔|intensity=/);for(const name of Object.keys(extendedColors))expect(d.code||'',d.id).not.toMatch(new RegExp('color\\.'+name+'\\b'));}
  expect(getDocById('scene_range_fov').params.find(p=>p.name==='scene.fov').default).toBe('pi/3');
  expect(getDocById('color-palette').params.find(p=>p.name==='color.green').default).toBe('vector(0,1,0)');
 });
 it('한글·영어 모양 이름과 확장을 찾고 비어 있는 검색을 처리한다',()=>{
  for(const [q,id] of [['반구','shape-dome'],['돔','shape-dome'],['cup','shape-cup'],['컵','shape-cup'],['자체','play_note']])expect(searchDocs(q).some(d=>d.id===id),q).toBe(true);
  expect(searchDocs('  ')).toEqual([]);
 });
});
const jobs=docs.filter(d=>d.code).map(d=>({id:d.id,label:'base',code:d.code}));
for(const d of shapeGuides.filter(d=>d.code))jobs.push(...getGuideVariants(d).map(v=>({id:v.id,label:'variant',code:v.code})));
const batches=[];for(let i=0;i<jobs.length;i+=30)batches.push([i/30+1,jobs.slice(i,i+30)]);
describe.skipIf(!hasPython())('문서에서 복사하는 실제 Python 예제',()=>{
 it.each(batches)('모든 예제가 독립 실행된다 · 묶음 %i',(_id,batch)=>{
  const results=runPythonJobs(batch);expect(results.size).toBe(batch.length);
  for(const [id,r]of results)expect(r.error,id).toBeNull();
 },120000);
});
it('반구의 height·segments 변경은 제공 함수 기본값이 아니라 호출 줄에 적용된다',()=>{
 const d=getDocById('shape-dome'),variants=getGuideVariants(d);
 expect(variants[0].code).toContain('    height=0.5,');expect(variants[1].code).toContain('    segments=4,');
 for(const v of variants)expect(v.code).toContain('def make_dome(radius=1, height=1, segments=16, paint=color.cyan):');
});
