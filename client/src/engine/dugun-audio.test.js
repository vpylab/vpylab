import { afterEach, expect, it, vi } from 'vitest';
import { createAssetAudioPlayer, dugunAudioUrl } from '../../../server/shared/dugun-audio.js';

const path = 'audio/music/calm/calm01_piano_thoughts_15s.mp3';
const url = 'https://raw.githubusercontent.com/greatsong/dugun-assets/main/' + path;
afterEach(() => vi.unstubAllGlobals());

it('저장소 경로, 갤러리 파일, GitHub 주소가 같은 음원으로 연결된다', () => {
  for (const input of [path, url, 'https://greatsong.github.io/dugun-assets/' + path,
    'https://github.com/greatsong/dugun-assets/blob/main/' + path]) expect(dugunAudioUrl(input)).toBe(url);
  for (const input of ['peaceful', 'audio/../notes.mp3', 'https://example.org/' + path, null]) {
    expect(dugunAudioUrl(input)).toBeNull();
  }
});

it('곡 교체·정지 후 늦은 실패를 무시하고 효과음의 끝과 실제 오류를 처리한다', async () => {
  const media = [];
  vi.stubGlobal('Audio', class {
    constructor() { media.push(this); }
    play() { return new Promise((resolve, reject) => { this.reject = reject; }); }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ''; }
    load() {}
  });
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const output = { context: { createMediaElementSource: () => source } };
  const error = vi.fn();
  const player = createAssetAudioPlayer(() => output, vi.fn(), error);
  player.play(url, true, true);
  player.play(url, false);
  player.play(url, true, false);
  expect(media[0].paused).toBe(true);
  expect(media[2].loop).toBe(false);
  media[0].reject(new Error('이전 재생 취소'));
  await Promise.resolve();
  expect(error).not.toHaveBeenCalled();
  expect(player.count).toBe(2);
  media[1].onended();
  expect(player.count).toBe(1);
  media[2].onerror();
  expect(error).toHaveBeenCalledWith(url);
  expect(player.musicUrl).toBeNull();
  player.play(url, true, true);
  player.stopAll();
  expect(player.count).toBe(0);
  expect(source.disconnect).toHaveBeenCalledTimes(4);
});
