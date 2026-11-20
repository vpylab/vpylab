import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function audioParameter(value = 0) {
  const events = [];
  const parameter = { value, events };
  for (const method of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime']) parameter[method] = vi.fn((next, time) => { events.push({ method, value: next, time }); });
  parameter.cancelScheduledValues = vi.fn();
  parameter.cancelAndHoldAtTime = vi.fn();
  return parameter;
}

function audioContext() {
  const sources = []; const gains = []; const filters = [];
  const node = (kind) => ({ kind, connect: vi.fn(), disconnect: vi.fn() });
  const source = (kind) => {
    const handlers = [];
    const result = { ...node(kind), frequency: audioParameter(440), start: vi.fn(), stop: vi.fn(), addEventListener: vi.fn((name, handler) => { if (name === 'ended') handlers.push(handler); }), end: () => handlers.forEach((handler) => handler()) };
    sources.push(result); return result;
  };
  const context = {
    state: 'running', currentTime: 0, sampleRate: 48000, destination: node('destination'),
    resume: vi.fn(async () => { context.state = 'running'; }),
    createOscillator: vi.fn(() => source('oscillator')),
    createGain: vi.fn(() => { const gain = { ...node('gain'), gain: audioParameter(1) }; gains.push(gain); return gain; }),
    createDynamicsCompressor: vi.fn(() => ({ ...node('compressor'), threshold: audioParameter(), knee: audioParameter(), ratio: audioParameter(), attack: audioParameter(), release: audioParameter() })),
    createWaveShaper: vi.fn(() => ({ ...node('limiter'), curve: null, oversample: 'none' })),
    createBuffer: vi.fn((channels, length) => ({ getChannelData: () => new Float32Array(length) })),
    createBufferSource: vi.fn(() => source('buffer')),
    createBiquadFilter: vi.fn(() => { const filter = { ...node('filter'), frequency: audioParameter(350) }; filters.push(filter); return filter; }),
    sources, gains, filters,
  };
  return context;
}

function envelopeAt(events, time) {
  let previous = { value: 0, time: 0 };
  for (const next of events) {
    if (time < next.time) {
      if (next.method === 'setValueAtTime') return previous.value;
      const fraction = Math.max(0, Math.min(1, (time - previous.time) / (next.time - previous.time)));
      return next.method === 'exponentialRampToValueAtTime' && previous.value > 0
        ? previous.value * Math.pow(next.value / previous.value, fraction)
        : previous.value + (next.value - previous.value) * fraction;
    }
    previous = next;
  }
  return previous.value;
}

let context;
let sound;
beforeEach(async () => {
  vi.useFakeTimers(); vi.resetModules(); context = audioContext();
  function AudioContextDouble() { return context; }
  vi.stubGlobal('AudioContext', vi.fn(AudioContextDouble));
  vi.stubGlobal('webkitAudioContext', undefined);
  sound = await import('./sound-system.js');
});
afterEach(() => { sound.stopAllSounds(); vi.runOnlyPendingTimers(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('수업 음원의 출력 경로와 자연스러운 수명', () => {
  it('오디오가 잠겨 있는 동안 첫 예약음을 버리지 않고 재개와 정지에 맞춰 정리한다', () => {
    context.state = 'suspended';
    context.resume.mockImplementation(() => new Promise(() => {}));
    sound.playSequence([{ freq: 261.63, duration: 0.1 }, { freq: 329.63, duration: 0.1 }]);
    vi.advanceTimersByTime(3000);
    expect(context.sources).toHaveLength(2);
    expect(context.sources.every(source => !source.disconnect.mock.calls.length)).toBe(true);
    expect(sound.getPlayingNotes()).toEqual([]);
    context.state = 'running'; context.currentTime = 0.1;
    expect(sound.getPlayingNotes()).toEqual(['E4']);
    sound.stopAllSounds(); vi.advanceTimersByTime(30);
    expect(context.sources.every(source => source.disconnect.mock.calls.length > 0)).toBe(true);
  });

  it('실행 확인음은 작품의 현재 음에 섞이지 않는다', () => {
    sound.runSound();
    expect(sound.getPlayingNotes()).toEqual([]);
    sound.playNote('C4');
    expect(sound.getPlayingNotes()).toEqual(['C4']);
  });

  it('타이머가 흔들려도 다음 음의 시작과 envelope는 절대 오디오 시각에 예약한다', () => {
    sound.playSequence([{ freq: 261.63, duration: 0.1 }, { freq: 329.63, duration: 0.1 }, { freq: 392, duration: 0.1 }]);
    expect(context.sources.map(source => source.start.mock.calls[0][0])).toEqual([0, 0.1]);
    expect(sound.getPlayingNotes()).toEqual(['C4']);
    context.currentTime = 0.095;
    vi.advanceTimersByTime(25);
    expect(context.sources[2].start).toHaveBeenCalledWith(0.2);
    expect(context.gains[3].gain.events[0].time).toBe(0.2);
    context.currentTime = 0.1;
    expect(sound.getPlayingNotes()).toEqual(['E4']);
    context.currentTime = 0.2;
    expect(sound.getPlayingNotes()).toEqual(['G4']);
    sound.stopAllSounds();
    expect(sound.getPlayingNotes()).toEqual([]);
    vi.advanceTimersByTime(5000);
    expect(context.sources).toHaveLength(3);
  });

  it('배경 탭에서 늦게 복귀해도 지난 음을 몰아치지 않고 반복의 원래 위상을 유지한다', () => {
    sound.startBgm('peaceful');
    const before = context.sources.length;
    context.currentTime = 3600.05;
    vi.advanceTimersByTime(25);
    expect(context.sources.length - before).toBeLessThanOrEqual(2);
    const scheduled = context.sources.slice(before).map(source => source.start.mock.calls[0][0]);
    expect(scheduled.every(time => time >= context.currentTime && time < context.currentTime + 0.12)).toBe(true);
    sound.stopBgm();
    const stopped = context.sources.length;
    context.currentTime += 3600;
    vi.advanceTimersByTime(1000);
    expect(context.sources).toHaveLength(stopped);
  });

  it('늦게 도착한 유한 시퀀스는 지나간 음을 생략하고 종료하며 앞으로 예약한 음도 음소거로 취소한다', () => {
    sound.playSequence([{ freq: 440, duration: 0.1 }, { freq: 660, duration: 0.1 }, { freq: 880, duration: 0.1 }]);
    const count = context.sources.length;
    context.currentTime = 5;
    vi.advanceTimersByTime(25);
    expect(context.sources).toHaveLength(count);
    sound.setMasterMuted(true);
    expect(context.sources.every(source => source.stop.mock.calls.some(([time]) => time <= 5.02))).toBe(true);
    context.currentTime = 100;
    vi.advanceTimersByTime(10000);
    expect(context.sources).toHaveLength(count);
    expect(sound.getAudioState()).toMatchObject({ playing: false, pendingCount: 0 });
  });

  it('출력 시각을 지원하면 실제 청취 위치의 음을 표시한다', () => {
    sound.playSequence([{ freq: 261.63, duration: 0.1 }, { freq: 329.63, duration: 0.1 }]);
    context.currentTime = 0.12;
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    context.getOutputTimestamp = () => ({ contextTime: 0.05, performanceTime: performance.now() });
    expect(sound.getPlayingNotes()).toEqual(['C4']);
  });

  it('기본음과 노이즈 모두 동일한 master·compressor·limiter를 거친다', () => {
    sound.beep(440, 0.5); sound.sfxExplosion();
    const master = context.gains[0];
    const compressor = context.createDynamicsCompressor.mock.results[0].value;
    const limiter = context.createWaveShaper.mock.results[0].value;
    expect(context.gains[1].connect).toHaveBeenCalledWith(master);
    expect(context.gains[2].connect).toHaveBeenCalledWith(master);
    expect(master.connect).toHaveBeenCalledExactlyOnceWith(compressor);
    expect(compressor.connect).toHaveBeenCalledExactlyOnceWith(limiter);
    expect(limiter.connect).toHaveBeenCalledExactlyOnceWith(context.destination);
    expect(compressor.threshold.value).toBe(-18);
    expect(compressor.ratio.value).toBe(12);
    expect(master.gain.value).toBeCloseTo(0.27);
    expect(limiter.oversample).toBe('2x');
    expect(context.sources.every((source) => !source.connect.mock.calls.some(([target]) => target === context.destination))).toBe(true);
  });

  it('음량 변경은 부드럽게 적용하고 음소거는 예약음·노이즈·필터까지 정리한다', () => {
    sound.sfxExplosion(); sound.playSequence([{ freq: 440, duration: 0.5 }, { freq: 660, duration: 0.5 }]);
    sound.setMasterVolume(0.4);
    expect(context.gains[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.4 * 0.45, 0.02);
    const created = context.sources.length;
    sound.setMasterMuted(true);
    expect(sound.getAudioState()).toMatchObject({ muted: true, playing: false, pendingCount: 0 });
    vi.advanceTimersByTime(30);
    for (const source of context.sources) expect(source.disconnect).toHaveBeenCalled();
    for (const filter of context.filters) expect(filter.disconnect).toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(context.sources).toHaveLength(created);
    sound.setMasterMuted(false);
    expect(sound.getAudioState().playing).toBe(false);
  });

  it('음의 시작과 끝을 0으로 예약하고 종료 이벤트에서 노드를 연결 해제한다', () => {
    sound.beep(440, 0.5, 'sine', 0.4);
    const source = context.sources[0]; const gain = context.gains[1];
    expect(gain.gain.events[0]).toMatchObject({ method: 'setValueAtTime', value: 0, time: 0 });
    expect(gain.gain.events[1]).toMatchObject({ method: 'linearRampToValueAtTime', value: 0.4, time: 0.008 });
    expect(gain.gain.events.at(-1)).toMatchObject({ method: 'linearRampToValueAtTime', value: 0, time: 0.5 });
    source.end();
    expect(source.disconnect).toHaveBeenCalledOnce();
    expect(gain.disconnect).toHaveBeenCalledOnce();
    expect(sound.getAudioState()).toMatchObject({ playing: false, voiceCount: 0 });
  });

  it('동시 소스와 예약 수를 제한하고 BGM을 오래 반복해도 정지 후 예약이 남지 않는다', () => {
    for (let index = 0; index < 500; index++) sound.successSound();
    expect(context.createOscillator.mock.calls.length).toBeLessThanOrEqual(sound.MAX_AUDIO_VOICES);
    expect(sound.getAudioState().pendingCount).toBeLessThanOrEqual(sound.MAX_AUDIO_TIMERS);
    sound.stopAllSounds(); vi.advanceTimersByTime(30);
    sound.startBgm('peaceful'); vi.advanceTimersByTime(120_000);
    expect(sound.getAudioState().voiceCount).toBeLessThanOrEqual(sound.MAX_AUDIO_VOICES);
    expect(sound.getAudioState().pendingCount).toBeLessThanOrEqual(33);
    sound.stopAllSounds(); vi.advanceTimersByTime(30);
    const created = context.sources.length; vi.advanceTimersByTime(120_000);
    expect(context.sources).toHaveLength(created);
    expect(sound.getAudioState()).toMatchObject({ playing: false, voiceCount: 0, pendingCount: 0 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('전체 정지 후 긴 시퀀스와 반복 BGM이 2분 뒤에도 다시 울리지 않는다',()=>{
    sound.playSequence(Array.from({length:8},()=>({freq:440,duration:1})));sound.startBgm('adventure',true);sound.beep(660,10);
    vi.advanceTimersByTime(100);const created=context.sources.length;sound.stopAllSounds();vi.advanceTimersByTime(120_000);
    expect(context.sources).toHaveLength(created);expect(sound.getAudioState()).toMatchObject({playing:false,voiceCount:0,pendingCount:0});for(const source of context.sources)expect(source.disconnect).toHaveBeenCalled();
  });

  it('suspended 상태에서 예약한 음표를 resume 뒤 중복 재생하지 않는다', async () => {
    let release;
    context.state = 'suspended';
    const resume = new Promise((resolve) => { release = resolve; });
    context.resume.mockImplementation(() => resume);
    sound.playNote('C5', 0.5);
    expect(context.createOscillator).toHaveBeenCalledTimes(1);
    const ready = sound.ensureAudioReady();
    context.state = 'running'; release(); await ready;
    expect(context.createOscillator).toHaveBeenCalledTimes(1);
  });

  it('새 악기는 주파수와 배음 비율을 지키고 공간 잔향은 전체 정지 때 해제한다', () => {
    const reverb = { connect: vi.fn(), disconnect: vi.fn() };
    context.createConvolver = () => reverb;
    sound.playNote('A4', .25, 'marimba-room', .6);
    expect(context.sources.map(source => source.frequency.value)).toEqual([440, 1760, 440 * 9.93]);
    sound.playNote('A4', .25, 'glass', .3);
    expect(context.sources.at(-1).frequency.value).toBeCloseTo(440 * 5.43);
    expect(reverb.buffer).toBeDefined();
    sound.stopAllSounds();
    expect(reverb.disconnect).not.toHaveBeenCalled(); // 바로 끊지 않고 짧게 줄인 뒤 해제합니다
    vi.advanceTimersByTime(100);
    expect(reverb.disconnect).toHaveBeenCalled();
  });

  it('피아노·뮤직박스는 배음과 자연 잔향을 합성하며 limiter 곡선은 유한·대칭이다', () => {
    sound.beep(440, 0.5, 'piano', 0.4); sound.beep(440, 0.5, 'musicbox', 0.4);
    expect(context.createOscillator).toHaveBeenCalledTimes(6);
    expect(context.sources.slice(0, 3).map((source) => source.frequency.value)).toEqual([440, 880, 1320]);
    expect(context.sources[5].frequency.value).toBeCloseTo(440 * 3.01);
    for (const source of context.sources) expect(source.stop.mock.calls[0][0]).toBeGreaterThan(0.5);
    const curve = context.createWaveShaper.mock.results[0].value.curve;
    expect(curve[1024]).toBe(0);
    for (let index = 0; index < curve.length; index++) {
      expect(Number.isFinite(curve[index])).toBe(true);
      expect(Math.abs(curve[index])).toBeLessThan(0.85);
      expect(curve[index]).toBeCloseTo(-curve[curve.length - 1 - index], 5);
      if (index) expect(curve[index]).toBeGreaterThanOrEqual(curve[index - 1]);
    }
    // 예약한 배음과 envelope의 참조 파형으로 양 끝의 영점과 출력 범위를 확인합니다.
    const samples = new Float32Array(48000);
    for (let index = 0; index < samples.length; index++) {
      const time = index / 48000;
      let mixed = 0;
      for (const source of context.sources) {
        const gain = source.connect.mock.calls[0][0];
        mixed += Math.sin(2 * Math.PI * source.frequency.value * time) * envelopeAt(gain.gain.events, time);
      }
      samples[index] = 0.85 * Math.tanh(mixed * context.gains[0].gain.value / 0.85);
    }
    expect(samples[0]).toBe(0);
    expect(samples.at(-1)).toBeCloseTo(0, 6);
    expect(Math.max(...samples.map(Math.abs))).toBeLessThan(0.85);
    expect(samples.some((sample) => Math.abs(sample) > 0.01)).toBe(true);
  });

  it('미리 듣기는 호출 전 자동 재생하지 않고 음소거로 지연된 연주도 취소한다', async () => {
    expect(context.createOscillator).not.toHaveBeenCalled();
    expect(globalThis.AudioContext).not.toHaveBeenCalled();
    expect(await sound.previewInstrument('musicbox')).toBe(true);
    expect(context.createOscillator).toHaveBeenCalledTimes(3);
    sound.setMasterMuted(true); vi.advanceTimersByTime(5000);
    expect(context.createOscillator).toHaveBeenCalledTimes(3);
    expect(await sound.previewInstrument('piano')).toBe(false);
  });

  it('resume 대기 중 정지하면 미리 듣기와 실행 콜백이 뒤늦게 시작되지 않는다', async () => {
    let release;
    context.state = 'suspended';
    const resume = new Promise((resolve) => { release = resolve; });
    context.resume.mockImplementation(() => resume);
    const preview = sound.previewInstrument('piano');
    const run = vi.fn(); sound.resumeAndRun(run);
    sound.stopAllSounds(); context.state = 'running'; release();
    expect(await preview).toBe(false);
    await Promise.resolve(); vi.advanceTimersByTime(1000);
    expect(run).not.toHaveBeenCalled();
    expect(context.createOscillator).not.toHaveBeenCalled();
  });

  it('0 음량과 잘못된 주파수·길이는 소스를 만들지 않는다', () => {
    sound.processSoundCommand({ method: 'beep', frequency: 440, duration: 1, volume: 0 });
    sound.beep(Infinity, 1); sound.beep(440, Infinity); sound.beep(-1, 1); sound.beep(440, -1);
    expect(context.sources).toHaveLength(0);
  });

  it('브라우저 resume이 응답하지 않아도 미리 듣기는 500ms 뒤 실패하고 다시 시도할 수 있다', async () => {
    context.state = 'suspended'; context.resume.mockImplementation(() => new Promise(() => {}));
    const pending = sound.previewInstrument('musicbox');
    vi.advanceTimersByTime(500);
    expect(await pending).toBe(false);
    expect(sound.getAudioState().playing).toBe(false);
    expect(context.createOscillator).not.toHaveBeenCalled();
    context.state = 'running';
    expect(await sound.previewInstrument('musicbox')).toBe(true);
    expect(context.createOscillator).toHaveBeenCalledTimes(3);
  });
});

describe('Worker의 목표 박자를 오디오 시계에 예약한다', () => {
  it('지터가 있는 배치·화음을 같은 악보 시각에 맞추고 정지하면 미래 음을 취소한다', () => {
    const note = beatTime => sound.processSoundCommand({ method: 'note', name: 'C4', beatTime });
    note(10);
    context.currentTime = 0.132;
    sound.processSoundCommand({ method: 'chord', frequencies: [330, 440], beatTime: 10.125 });
    const starts = context.sources.map(source => source.start.mock.calls[0][0]);
    expect(starts[1] - starts[0]).toBeCloseTo(0.125, 8);
    expect(starts[2]).toBe(starts[1]);
    sound.stopAllSounds();
    expect(context.sources[1].stop).toHaveBeenLastCalledWith(0.132);
    expect(context.sources[2].stop).toHaveBeenLastCalledWith(0.132);
    context.currentTime = 2;
    note(10.25);
    expect(context.sources.at(-1).start.mock.calls[0][0]).toBeCloseTo(2.016, 8);
  });
});

describe('발음 한도에서 새 음을 버리지 않는다', () => {
  it('배음 셋인 피아노로 열두 음 화음을 쳐도 모든 음의 기본음이 난다', () => {
    const hz = [211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271]; // 서로의 배음과 겹치지 않는 값
    sound.playChord(hz, 2, 'piano', 0.3);
    const fundamentals = context.sources.map(source => source.frequency.value).filter(value => hz.includes(value));
    expect(fundamentals).toEqual(hz);
    expect(context.sources.length).toBeLessThanOrEqual(sound.MAX_AUDIO_VOICES);
  });

  it('자리가 꽉 찼을 때 새 음은 가장 오래된 음을 줄이고 소리를 낸다', () => {
    for (let index = 0; index < sound.MAX_AUDIO_VOICES; index++) sound.beep(200 + index, 5, 'sine', 0.2);
    expect(context.sources).toHaveLength(sound.MAX_AUDIO_VOICES);
    context.currentTime = 1; // 앞의 음들이 '방금' 시작한 것이 아니게 됩니다
    sound.beep(880, 0.5, 'sine', 0.2);
    expect(context.sources.at(-1).frequency.value).toBe(880);
    expect(context.sources[0].stop).toHaveBeenCalledTimes(2); // 만들 때 예약한 정지 한 번 + 자리를 내주려고 앞당긴 정지 한 번
    expect(sound.getAudioState().voiceCount).toBeLessThanOrEqual(sound.MAX_AUDIO_VOICES);
  });

  it('같은 순간에 몰린 요청은 서로를 지우지 않아 노드 수가 한도를 넘지 않는다', () => {
    for (let index = 0; index < 200; index++) sound.beep(300 + index, 1, 'glass', 0.2);
    expect(context.sources.length).toBeLessThanOrEqual(sound.MAX_AUDIO_VOICES);
  });
});

describe('발음 한도의 가장자리', () => {
  it('정지 직후 다시 연주해도 줄이는 중인 소스까지 합쳐 상한을 넘지 않는다', () => {
    for (let index = 0; index < sound.MAX_AUDIO_VOICES; index++) sound.beep(200 + index, 5, 'sine', 0.2);
    sound.stopAllSounds(); // 24개가 모두 줄이는 중인 상태
    const before = context.sources.length;
    for (let index = 0; index < 40; index++) sound.beep(500 + index, 1, 'piano', 0.2);
    expect(context.sources.length - before).toBeLessThanOrEqual(8);
  });

  it('배경음악은 꽉 찬 자리에서 학생의 음을 밀어내지 않는다', () => {
    for (let index = 0; index < sound.MAX_AUDIO_VOICES; index++) sound.beep(200 + index, 5, 'sine', 0.2);
    context.currentTime = 1;
    sound.beep(880, 0.5, 'sine', 0.2, 'bgm');
    expect(context.sources).toHaveLength(sound.MAX_AUDIO_VOICES);
    expect(context.sources[0].stop).toHaveBeenCalledTimes(1); // 만들 때 예약한 정지뿐, 앞당겨 멈추지 않습니다
  });
});
