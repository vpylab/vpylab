import { describe, expect, it } from 'vitest';
import { needsTapBeforeAutoStart } from './pending-start.js';

describe('엔진 준비를 기다린 실행의 자동 시작', () => {
  it('터치 기기에서 탭 없이 자동 실행하려 하면 먼저 탭을 받는다', () => {
    expect(needsTapBeforeAutoStart({ touch: true, audioUnlocked: false, userStarted: false })).toBe(true);
  });

  it('사용자가 이미 시작을 눌렀으면 소리 잠금이 풀리지 않았어도 다시 묻지 않는다', () => {
    // 아이폰에서 엔진을 받는 동안 ▶를 누르면 흰 화면에 멈추던 경우입니다.
    expect(needsTapBeforeAutoStart({ touch: true, audioUnlocked: false, userStarted: true })).toBe(false);
  });

  it('소리가 이미 켜졌거나 터치 기기가 아니면 바로 실행한다', () => {
    expect(needsTapBeforeAutoStart({ touch: true, audioUnlocked: true, userStarted: false })).toBe(false);
    expect(needsTapBeforeAutoStart({ touch: false, audioUnlocked: false, userStarted: false })).toBe(false);
  });
});
