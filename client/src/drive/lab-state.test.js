import { describe, it, expect } from 'vitest';
import {
  deviceId, saveDraft, loadDraft, clearDraft, clearDrafts, listDrafts, purgeOldDrafts,
} from './lab-state.js';

function memory() {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
}

describe('lab-state', () => {
  it('기기 ID는 한 번 만들면 유지된다', () => {
    const s = memory();
    const a = deviceId(s, () => 0.5);
    expect(a).toMatch(/^기기-/);
    expect(deviceId(s, () => 0.1)).toBe(a);
  });

  it('초안을 계정·파일별로 저장하고 지운다', () => {
    const s = memory();
    saveDraft(s, 'subA', 'f1', { code: 'x', baseVersion: '3' });
    expect(loadDraft(s, 'subA', 'f1')).toMatchObject({ code: 'x', baseVersion: '3' });
    expect(loadDraft(s, 'subB', 'f1')).toBeNull();
    clearDraft(s, 'subA', 'f1');
    expect(loadDraft(s, 'subA', 'f1')).toBeNull();
  });

  it('로그아웃하면 그 계정의 초안만 모두 지운다', () => {
    const s = memory();
    saveDraft(s, 'subA', 'f1', { code: 'a1' });
    saveDraft(s, 'subA', null, { code: 'a-new' });
    saveDraft(s, 'subB', 'f1', { code: 'b1' });
    expect(clearDrafts(s, 'subA')).toBe(2);
    expect(loadDraft(s, 'subA', 'f1')).toBeNull();
    expect(loadDraft(s, 'subA', null)).toBeNull();
    expect(loadDraft(s, 'subB', 'f1')).toMatchObject({ code: 'b1' });
  });

  it('계정의 초안을 최근 것부터 나열한다', () => {
    const s = memory();
    s.setItem('vpylab-drivelab:draft:subA:f1', JSON.stringify({ code: 'a', at: '2026-11-01T00:00:00Z' }));
    s.setItem('vpylab-drivelab:draft:subA:new-x', JSON.stringify({ code: 'b', at: '2026-11-05T00:00:00Z' }));
    s.setItem('vpylab-drivelab:draft:subB:f1', JSON.stringify({ code: 'c', at: '2026-11-06T00:00:00Z' }));
    expect(listDrafts(s, 'subA').map((d) => d.fileId)).toEqual(['new-x', 'f1']);
  });

  it('깨진 초안 하나가 있어도 나머지 초안은 읽는다', () => {
    const s = memory();
    s.setItem('vpylab-drivelab:draft:subA:bad', '{oops');
    s.setItem('vpylab-drivelab:draft:subA:good', JSON.stringify({ code: 'ok', at: '2026-11-05T00:00:00Z' }));
    expect(listDrafts(s, 'subA').map((d) => d.fileId)).toEqual(['good']);
  });

  it('14일이 지났거나 깨진 초안은 지운다', () => {
    const s = memory();
    const now = Date.parse('2026-11-20T00:00:00Z');
    s.setItem('vpylab-drivelab:draft:subA:old', JSON.stringify({ code: 'a', at: '2026-11-01T00:00:00Z' }));
    s.setItem('vpylab-drivelab:draft:subA:new', JSON.stringify({ code: 'b', at: '2026-11-19T00:00:00Z' }));
    s.setItem('vpylab-drivelab:draft:subA:broken', '{oops');
    s.setItem('vpylab-drivelab:results', '{}');
    expect(purgeOldDrafts(s, undefined, now)).toBe(2);
    expect(listDrafts(s, 'subA').map((d) => d.fileId)).toEqual(['new']);
    expect(s.getItem('vpylab-drivelab:results')).toBe('{}');
  });

  it('저장소를 쓸 수 없어도 멈추지 않는다', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, get length() { throw new Error('blocked'); } };
    expect(saveDraft(broken, 'a', 'f', { code: '' })).toBe(false);
    expect(loadDraft(broken, 'a', 'f')).toBeNull();
    expect(clearDrafts(broken, 'a')).toBe(0);
  });
});
