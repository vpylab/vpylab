import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rows: { data: [], error: null }, inserts: [] }));
vi.mock('../lib/supabase', () => {
  // select(...).eq(...).eq(...) 를 기다리면 mocks.rows를 돌려주고, insert는 기록만 합니다.
  const query = { select: () => query, eq: () => query, then: (resolve) => resolve(mocks.rows),
    insert: (row) => { mocks.inserts.push(row); return Promise.resolve({ error: null }); } };
  return { supabase: { auth: { getUser: mocks.getUser }, from: () => query } };
});

import useAppStore, { bestProgressFromSubmissions, mergeProgress } from './appStore';

const passed = (score, completedAt = '2026-11-01T00:00:00Z') => ({ score, passed: true, completedAt });
const saved = () => JSON.parse(localStorage.getItem('vpylab-progress') || '{}');

beforeEach(() => {
  localStorage.clear();
  mocks.inserts.length = 0;
  mocks.rows = { data: [], error: null };
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'student-a' } } });
  useAppStore.setState({ missionProgress: {} });
});

describe('진행률 합치기', () => {
  it('제출 기록에서 미션별 최고 점수를 고르고 잘못된 행은 건너뛴다', () => {
    const best = bestProgressFromSubmissions([
      { mission_id: 'CT-1', score: 70, created_at: 'a' }, { mission_id: 'CT-1', score: 100, created_at: 'b' },
      { mission_id: 'CT-1', score: 80, created_at: 'c' }, { mission_id: 'CR-1', score: null, created_at: 'd' }, null, { score: 100 },
    ]);
    expect(best).toEqual({ 'CT-1': passed(100, 'b'), 'CR-1': passed(0, 'd') });
  });

  it('같은 미션은 점수가 높은 쪽을 남기고 한쪽에만 있는 미션은 모두 유지한다', () => {
    const merged = mergeProgress({ 'CT-1': passed(100), 'CT-2': passed(60) }, { 'CT-1': passed(80), 'CT-2': passed(90), 'CT-3': passed(70) });
    expect(merged['CT-1'].score).toBe(100);
    expect(merged['CT-2'].score).toBe(90);
    expect(merged['CT-3'].score).toBe(70);
  });
});

describe('로그인 시 진행률 맞추기', () => {
  it('새 기기에서 로그인하면 계정의 통과 기록을 복원하고 다시 올리지 않는다', async () => {
    mocks.rows = { data: [{ mission_id: 'CT-1', score: 100, created_at: 'x' }, { mission_id: 'CT-2', score: 80, created_at: 'y' }], error: null };
    await useAppStore.getState().syncProgressToServer();
    expect(Object.keys(useAppStore.getState().missionProgress)).toEqual(['CT-1', 'CT-2']);
    expect(saved()['CT-2'].score).toBe(80);
    expect(localStorage.getItem('vpylab-progress-owner')).toBe('student-a');
    expect(mocks.inserts).toEqual([]);
  });

  it('로그인 전에 통과한 미션은 계정에 없는 것만 올리고 계정 기록과 합친다', async () => {
    useAppStore.setState({ missionProgress: { 'CT-1': passed(90), 'CT-3': passed(100), 'CT-4': { score: 40, passed: false } } });
    mocks.rows = { data: [{ mission_id: 'CT-1', score: 100, created_at: 'x' }], error: null };
    await useAppStore.getState().syncProgressToServer();
    expect(mocks.inserts.map(row => row.mission_id)).toEqual(['CT-3']);
    expect(mocks.inserts[0]).toMatchObject({ user_id: 'student-a', score: 100, passed: true });
    expect(useAppStore.getState().missionProgress['CT-1'].score).toBe(100);
    expect(useAppStore.getState().missionProgress['CT-3'].score).toBe(100);
  });

  it('공용 컴퓨터에 남은 다른 계정의 기록은 올리지 않고 내 계정 기록으로 바꾼다', async () => {
    localStorage.setItem('vpylab-progress-owner', 'student-b');
    useAppStore.setState({ missionProgress: { 'CT-9': passed(100) } });
    mocks.rows = { data: [{ mission_id: 'CT-1', score: 70, created_at: 'x' }], error: null };
    await useAppStore.getState().syncProgressToServer();
    expect(mocks.inserts).toEqual([]);
    expect(Object.keys(useAppStore.getState().missionProgress)).toEqual(['CT-1']);
    expect(localStorage.getItem('vpylab-progress-owner')).toBe('student-a');
  });

  it('계정 기록 조회가 실패하거나 로그인 상태가 아니면 이 기기의 기록을 그대로 둔다', async () => {
    useAppStore.setState({ missionProgress: { 'CT-1': passed(90) } });
    mocks.rows = { data: null, error: { message: 'network' } };
    await useAppStore.getState().syncProgressToServer();
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await useAppStore.getState().syncProgressToServer();
    expect(useAppStore.getState().missionProgress).toEqual({ 'CT-1': passed(90) });
    expect(mocks.inserts).toEqual([]);
    expect(localStorage.getItem('vpylab-progress-owner')).toBeNull();
  });
});

describe('로그아웃 시 진행률 정리', () => {
  it('계정과 맞춘 기록은 지우고 로그인 없이 쌓은 기록은 남긴다', () => {
    useAppStore.getState().completeMission('CT-1', 100);
    useAppStore.getState().clearProgressOnSignOut();
    expect(useAppStore.getState().missionProgress['CT-1'].score).toBe(100);

    localStorage.setItem('vpylab-progress-owner', 'student-a');
    useAppStore.getState().clearProgressOnSignOut();
    expect(useAppStore.getState().missionProgress).toEqual({});
    expect(localStorage.getItem('vpylab-progress')).toBeNull();
    expect(localStorage.getItem('vpylab-progress-owner')).toBeNull();
  });
});
