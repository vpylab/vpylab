import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 아이폰·아이패드에서 소리를 켜는 절차: 탭 안에서 무음 <audio>를 한 번 재생해야 isAudioUnlocked()가 참이 됩니다.
let sound;
let created;
beforeEach(async () => {
  vi.resetModules();
  created = [];
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn(), gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() } });
  const context = { state: 'running', currentTime: 0, destination: node(), resume: vi.fn(async () => {}), createGain: vi.fn(node) };
  vi.stubGlobal('AudioContext', vi.fn(function AudioContextDouble() { return context; }));
  vi.stubGlobal('webkitAudioContext', undefined);
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 });
  vi.stubGlobal('document', {
    createElement: vi.fn(() => { const audio = { setAttribute: vi.fn(), play: vi.fn(async () => {}) }; created.push(audio); return audio; }),
  });
  sound = await import('./sound-system.js');
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('iOS 소리 켜기', () => {
  it('무음 파일을 같은 출처에서 재생한다 (data: 주소는 보안 정책에 막힌다)', async () => {
    expect(sound.isAudioUnlocked()).toBe(false);
    await expect(sound.ensureAudioReady()).resolves.toBe(true);
    expect(created).toHaveLength(1);
    expect(created[0].src).toBe(sound.SILENT_MEDIA_URL);
    expect(sound.SILENT_MEDIA_URL).toBe('/silent.wav');
    expect(created[0].src.startsWith('data:')).toBe(false);
    expect(sound.isAudioUnlocked()).toBe(true);
  });

  it('무음 파일 재생이 거절되면 잠금이 풀린 것으로 보지 않는다', async () => {
    document.createElement.mockImplementation(() => ({ setAttribute: vi.fn(), play: vi.fn(async () => { throw new Error('blocked'); }) }));
    await expect(sound.ensureAudioReady()).resolves.toBe(false);
    expect(sound.isAudioUnlocked()).toBe(false);
  });

  it('배포물에 들어갈 무음 파일이 실제로 있고 올바른 WAV다', () => {
    const file = resolve(process.cwd(), 'public/silent.wav'); // 테스트는 client/에서 실행합니다
    expect(existsSync(file)).toBe(true);
    const bytes = readFileSync(file);
    expect(bytes.subarray(0, 4).toString('latin1')).toBe('RIFF');
    expect(bytes.subarray(8, 12).toString('latin1')).toBe('WAVE');
    expect(bytes.subarray(44).every((value) => value === 0)).toBe(true);
  });
});
