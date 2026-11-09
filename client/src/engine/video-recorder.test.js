import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_RECORDING_SECONDS, canRecordCanvas, pickRecordingType, startCanvasRecording } from './video-recorder';

class FakeRecorder {
  static supported = new Set(['video/webm']);
  static isTypeSupported(type) { return FakeRecorder.supported.has(type); }
  static last = null;
  constructor(stream, options) { this.stream = stream; this.options = options; this.state = 'inactive'; FakeRecorder.last = this; }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['video']) }); this.onstop?.(); }
}
const makeCanvas = ({ manualFrames = true } = {}) => {
  const track = { stop: vi.fn(), ...(manualFrames ? { requestFrame: vi.fn() } : {}) };
  return { track, captureStream: vi.fn(() => ({ getVideoTracks: () => [track], getTracks: () => [track] })) };
};
const makeAudio = () => ({ stream: { getAudioTracks: () => [{ kind: 'audio' }] }, close: vi.fn() });

beforeEach(() => {
  vi.useFakeTimers();
  FakeRecorder.supported = new Set(['video/webm']);
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  vi.stubGlobal('MediaStream', class { constructor(tracks) { this.tracks = tracks; } });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('작품 영상 녹화', () => {
  it('mp4를 먼저 고르고 지원하지 않으면 webm, 둘 다 없으면 녹화하지 않는다', () => {
    expect(pickRecordingType(() => true).extension).toBe('mp4');
    expect(pickRecordingType(type => type.startsWith('video/webm')).extension).toBe('webm');
    expect(pickRecordingType(() => false)).toBeNull();
    expect(pickRecordingType(() => { throw new Error('x'); })).toBeNull();
    expect(canRecordCanvas(makeCanvas())).toBe(true);
    expect(canRecordCanvas({})).toBe(false);
    FakeRecorder.supported = new Set();
    expect(canRecordCanvas(makeCanvas())).toBe(false);
    expect(() => startCanvasRecording(makeCanvas())).toThrow('recording_unsupported');
  });

  it('화면과 소리를 함께 녹화하고 끝내면 파일과 길이를 돌려주며 연결을 정리한다', async () => {
    const canvas = makeCanvas(), audio = makeAudio(), onTick = vi.fn();
    const recording = startCanvasRecording(canvas, { audio, onTick });
    expect(FakeRecorder.last.stream.tracks).toHaveLength(2);
    expect(FakeRecorder.last.options.videoBitsPerSecond).toBeLessThanOrEqual(2_500_000);
    vi.advanceTimersByTime(3000);
    expect(onTick).toHaveBeenLastCalledWith(3);
    recording.stop();
    const result = await recording.finished;
    expect(result.extension).toBe('webm');
    expect(result.blob.type).toBe('video/webm');
    expect(result.seconds).toBe(3);
    expect(canvas.track.stop).toHaveBeenCalledOnce();
    expect(audio.close).toHaveBeenCalledOnce();
  });

  it('상한 시간이 되면 스스로 끝내고, 취소하면 파일을 만들지 않는다', async () => {
    const limited = startCanvasRecording(makeCanvas());
    vi.advanceTimersByTime(MAX_RECORDING_SECONDS * 1000);
    expect((await limited.finished).seconds).toBe(MAX_RECORDING_SECONDS);
    const cancelled = startCanvasRecording(makeCanvas());
    cancelled.cancel();
    expect(await cancelled.finished).toBeNull();
  });

  it('멈춘 장면도 담기도록 현재 화면을 일정 간격으로 프레임으로 넘기고, 끝나면 멈춘다', async () => {
    const canvas = makeCanvas();
    const recording = startCanvasRecording(canvas);
    expect(canvas.captureStream).toHaveBeenCalledWith(0);
    vi.advanceTimersByTime(1000);
    const requested = canvas.track.requestFrame.mock.calls.length;
    expect(requested).toBeGreaterThanOrEqual(25);
    recording.stop();
    await recording.finished;
    vi.advanceTimersByTime(1000);
    expect(canvas.track.requestFrame.mock.calls.length).toBe(requested);
  });

  it('프레임을 직접 넘길 수 없는 브라우저에서는 자동 캡처로 녹화한다', async () => {
    const canvas = makeCanvas({ manualFrames: false });
    const recording = startCanvasRecording(canvas);
    expect(canvas.captureStream).toHaveBeenLastCalledWith(30);
    recording.stop();
    expect((await recording.finished).extension).toBe('webm');
  });
});
