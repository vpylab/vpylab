import { describe, expect, it, vi } from 'vitest';
import { appendPersonalJournal, DOCUMENT_MIME } from './project-journal';

function setup() {
  const state = { doc:null, body:'', revision:1, named:{}, writes:0, lost:false, race:false };
  const request=vi.fn(async (kind,url,init) => {
    if (kind === 'journal.create') {
      const meta=JSON.parse(init.body);
      expect(meta.mimeType).toBe(DOCUMENT_MIME);
      expect(meta.appProperties.vpylabJournalFor).toBe('source');
      state.doc={id:'journal',parents:meta.parents,mimeType:meta.mimeType};
      return state.doc;
    }
    if(kind==='journal.read') return {revisionId:String(state.revision),namedRanges:state.named,body:{content:[{endIndex:state.body.length+2}]}};
    const {requests,writeControl}=JSON.parse(init.body);
    expect(writeControl.requiredRevisionId).toBe(String(state.revision));
    if(state.race) {
      state.race=false;state.body+='직접 쓴 글';state.revision++;
      throw Object.assign(new Error('Revision changed'),{status:400});
    }
    const {insertText}=requests[0], {name,range}=requests[1].createNamedRange;
    expect(insertText.location.index).toBe(state.body.length+1);
    expect(range.endIndex-range.startIndex).toBe(insertText.text.length);
    state.body+=insertText.text;state.named[name]={};state.writes++;state.revision++;
    if(state.lost){state.lost=false;throw new TypeError('response lost');}
    return {};
  });
  const append=entry=>appendPersonalJournal({file:{id:'source',name:'궤도.py'},author:'별고래',entry,request,
    liveFolder:async()=>'folder',findMarked:async()=>state.doc?[state.doc]:[]});
  return {state,append};
}
const entry={id:'one',at:Date.UTC(2026,10,20,1,5),zone:'Asia/Seoul',values:{help:'친구가 속도를 비교하도록 도왔다.'}};
describe('개인 Google 문서 항해일지',()=>{
  it('프로젝트별 문서를 만들고 작성자와 현지 시각을 붙이며 직접 쓴 글도 보존한다', async()=>{
    const {state,append}=setup();
    await append(entry);state.race=true;
    await append({...entry,id:'two',values:{thought:'🪐 궤도가 신기했다.'}});
    expect(state.writes).toBe(2);
    expect(state.body).toContain('2026-11-20 10:05 (Asia/Seoul) · 별고래');
    expect(state.body).toContain('직접 쓴 글');expect(state.body).toContain('궤도가 신기했다');
  });
  it('응답을 잃은 기록을 다시 전송해도 한 번만 반영한다',async()=>{
    const {state,append}=setup();state.lost=true;
    await expect(append(entry)).rejects.toThrow('response lost');await append(entry);
    expect(state.writes).toBe(1);
  });
});
