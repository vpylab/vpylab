import { beforeEach, describe, expect, it } from 'vitest';
import useAppStore from './appStore';

const saved = () => JSON.parse(localStorage.getItem('vpylab-progress') || '{}');

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ missionProgress: {} });
});

describe('미션 진행률(이 브라우저에 보관)', () => {
  it('통과한 미션의 점수를 이 브라우저에 남긴다', () => {
    useAppStore.getState().completeMission('CT-1', 80);
    expect(useAppStore.getState().missionProgress['CT-1']).toMatchObject({ score: 80, passed: true });
    expect(saved()['CT-1'].score).toBe(80);
    expect(useAppStore.getState().getMissionScore('CT-1')).toBe(80);
    expect(useAppStore.getState().getMissionScore('CT-2')).toBeNull();
  });

  it('같은 미션은 더 높은 점수일 때만 바꾼다', () => {
    useAppStore.getState().completeMission('CT-1', 80);
    useAppStore.getState().completeMission('CT-1', 60);
    expect(saved()['CT-1'].score).toBe(80);
    useAppStore.getState().completeMission('CT-1', 100);
    expect(saved()['CT-1'].score).toBe(100);
  });

  it('분류별로 통과한 미션 수를 센다', () => {
    useAppStore.getState().completeMission('CT-1', 100);
    useAppStore.getState().completeMission('CT-2', 70);
    useAppStore.getState().completeMission('CR-1', 90);
    expect(useAppStore.getState().getCompletedCount('CT')).toBe(2);
    expect(useAppStore.getState().getCompletedCount('CR')).toBe(1);
  });
});
