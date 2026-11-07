import { describe, it, expect } from 'vitest';
import {
  deviceId, saveDraft, loadDraft, clearDraft, clearDrafts, listDrafts, purgeOldDrafts, contactedOrigins, summarizeTimings, buildReport, CHECKLIST,
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

  it('연결된 출처를 구글·페이지·기타로 나눈다', () => {
    const origins = contactedOrigins([
      { name: 'https://www.googleapis.com/drive/v3/files' },
      { name: 'https://www.googleapis.com/upload/drive/v3/files' },
      { name: 'https://accounts.google.com/gsi/client' },
      { name: 'http://localhost:4086/src/main.jsx' },
      { name: 'https://vpylab-server-production.up.railway.app/api/health' },
      { name: 'not a url' },
    ], 'http://localhost:4086');
    expect(origins).toEqual([
      { origin: 'http://localhost:4086', count: 1, kind: 'page' },
      { origin: 'https://accounts.google.com', count: 1, kind: 'google' },
      { origin: 'https://vpylab-server-production.up.railway.app', count: 1, kind: 'other' },
      { origin: 'https://www.googleapis.com', count: 2, kind: 'google' },
    ]);
  });

  it('요청 시간을 요약한다', () => {
    const t = summarizeTimings([
      { status: 200, ms: 100 }, { status: 200, ms: 300 }, { status: 200, ms: 200 }, { status: 429, ms: 50 },
    ]);
    expect(t).toEqual({ count: 3, errors: 1, avg: 200, p50: 200, p95: 300, max: 300 });
    expect(summarizeTimings([])).toBeNull();
  });

  it('보고서에는 이메일 대신 도메인만 적는다', () => {
    const report = buildReport({
      results: { A1: { result: 'pass', note: '승인 화면 정상' } },
      account: { email: 'student@school.example', hd: 'school.example' },
      device: '기기-ab12', origins: [], timings: null, burst: null, userAgent: 'UA', now: new Date('2026-11-07T00:00:00Z'),
    });
    expect(report).toContain('계정 도메인: school.example');
    expect(report).not.toContain('student@');
    expect(report).toContain('A1 학생 계정 승인: 통과 · 승인 화면 정상');
    expect(report.split('\n').filter((l) => /^- [A-E]\d /.test(l))).toHaveLength(CHECKLIST.length);
  });
});
