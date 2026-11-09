/**
 * VPyLab — 사운드 시스템 (Phase 2: 게임 효과음 + BGM + 노트 시스템)
 * 의존성 0. 브라우저 내장 Web Audio API만 사용.
 *
 * 기능:
 * 1) beep / play — 기본 주파수 재생
 * 2) playNote / playChord / playSequence — 노트 이름 기반 재생
 * 3) 게임 효과음 — 슈퍼마리오 스타일 (점프, 코인, 파워업, 죽음 등)
 * 4) BGM — 루프 가능한 8비트 배경음악
 * 5) processSoundCommand — Python 코드에서 호출하는 브릿지 인터페이스
 *
 * 모든 효과음/BGM은 저작권 없이 Web Audio API로 합성합니다.
 */

let audioCtx = null;
let audioUnlocked = false;
let audioUnlockPending = null;
let iosMediaUnlocked = false;
let iosMediaUnlockPending = null;
let silentMediaDataUri = null;

// 모든 수업 음원은 하나의 출력 경로와 같은 음량·음소거 설정을 사용합니다.
export const MAX_AUDIO_VOICES = 24;
export const MAX_AUDIO_TIMERS = 256;
const HEADROOM = 0.45;
const STOP_FADE = 0.018;
let masterGain = null;
let outputTap = null; // 스피커 직전의 마지막 노드 (녹화가 같은 소리를 받는 곳)
let masterVolume = 0.6;
let masterMuted = false;
let audioGeneration = 0;
let pendingPreviewCancel = null;
const activeVoices = new Map();
const activeTimeouts = new Set();
const activeScores = new Set();
const audioListeners = new Set();
let audioState = { volume: masterVolume, muted: masterMuted, playing: false, voiceCount: 0, pendingCount: 0 };

function notifyAudioState() {
  const voiceCount = [...activeVoices.values()].filter((voice) => !voice.retiring).length;
  const playing = voiceCount > 0 || activeTimeouts.size > 0 || activeScores.size > 0 || pendingPreviewCancel !== null;
  const pendingCount = activeTimeouts.size + activeScores.size + (pendingPreviewCancel ? 1 : 0);
  if (audioState.volume === masterVolume && audioState.muted === masterMuted && audioState.playing === playing && audioState.voiceCount === voiceCount && audioState.pendingCount === pendingCount) return;
  audioState = { volume: masterVolume, muted: masterMuted, playing, voiceCount, pendingCount };
  for (const listener of audioListeners) listener(audioState);
}

export function getAudioState() { return audioState; }
export function subscribeAudioState(listener) {
  audioListeners.add(listener);
  return () => audioListeners.delete(listener);
}

function holdParameter(parameter, time) {
  if (typeof parameter.cancelAndHoldAtTime === 'function') parameter.cancelAndHoldAtTime(time);
  else {
    parameter.cancelScheduledValues?.(time);
    parameter.setValueAtTime(Math.max(0, parameter.value), time);
  }
}

function updateMasterGain() {
  if (!masterGain || !audioCtx) return;
  const time = audioCtx.currentTime;
  holdParameter(masterGain.gain, time);
  masterGain.gain.linearRampToValueAtTime(masterMuted ? 0 : masterVolume * HEADROOM, time + 0.02);
}

export function setMasterVolume(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return;
  masterVolume = Math.max(0, Math.min(1, number));
  if (masterVolume === 0) stopAllSounds();
  updateMasterGain();
  notifyAudioState();
}

export function setMasterMuted(value) {
  masterMuted = Boolean(value);
  if (masterMuted) stopAllSounds();
  updateMasterGain();
  notifyAudioState();
}

function createMasterGraph(ctx) {
  masterGain = ctx.createGain();
  masterGain.gain.value = masterMuted ? 0 : masterVolume * HEADROOM;
  let output = masterGain;
  if (typeof ctx.createDynamicsCompressor === 'function') {
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.18;
    output.connect(compressor);
    output = compressor;
  }
  if (typeof ctx.createWaveShaper === 'function') {
    const limiter = ctx.createWaveShaper();
    const curve = new Float32Array(2049);
    for (let index = 0; index < curve.length; index++) {
      const input = index / (curve.length - 1) * 2 - 1;
      curve[index] = 0.85 * Math.tanh(input / 0.85);
    }
    limiter.curve = curve;
    limiter.oversample = '2x';
    output.connect(limiter);
    output = limiter;
  }
  output.connect(ctx.destination);
  outputTap = output;
}

/**
 * 작품 영상 녹화용 — 스피커로 나가는 것과 같은 소리를 MediaStream으로도 내보냅니다.
 * 반환값의 close()로 연결을 풉니다. 지원하지 않는 환경에서는 null입니다.
 */
export function openRecordingAudioStream() {
  const ctx = getAudioContext();
  const tap = outputTap;
  if (!ctx || !tap || typeof ctx.createMediaStreamDestination !== 'function') return null;
  const destination = ctx.createMediaStreamDestination();
  tap.connect(destination);
  return { stream: destination.stream, close() { try { tap.disconnect(destination); } catch { /* 이미 끊김 */ } } };
}

function connectOutput(node) { node.connect(masterGain); }

function trackOsc(source, gain, duration = 10, nodes = [], group = 'lesson', note = null) {
  const voice = { source, gain, nodes, group, note, retiring: false, timer: null };
  const cleanup = () => {
    if (!activeVoices.has(source)) return;
    clearTimeout(voice.timer);
    activeVoices.delete(source);
    try { source.stop?.(); } catch { /* 이미 끝난 소스입니다. */ }
    for (const node of [source, gain, ...nodes]) {
      try { node?.disconnect?.(); } catch { /* 이미 정리된 노드는 무시합니다. */ }
    }
    notifyAudioState();
  };
  voice.cleanup = cleanup;
  activeVoices.set(source, voice);
  source.addEventListener?.('ended', cleanup, { once: true });
  // 비표준 환경이나 중단된 context에서도 노드를 무기한 남기지 않습니다.
  const checkEnded = () => {
    // 잠긴 오디오 시계가 멈춘 동안에도 예약한 첫 음을 보존합니다.
    if (!voice.retiring && note && audioCtx?.state !== 'closed' && audioCtx.currentTime < note.end) {
      voice.timer = setTimeout(checkEnded, 1000);
      return;
    }
    cleanup();
  };
  voice.timer = setTimeout(checkEnded, Math.max(0.03, duration) * 1000 + 250);
  notifyAudioState();
}

function retireVoice(voice) {
  if (voice.retiring) return;
  voice.retiring = true;
  const time = audioCtx?.currentTime || 0;
  try {
    holdParameter(voice.gain.gain, time);
    voice.gain.gain.linearRampToValueAtTime(0, time + STOP_FADE);
    voice.source.stop(time + STOP_FADE + 0.002);
  } catch { /* 이미 종료된 소스입니다. */ }
  clearTimeout(voice.timer);
  voice.timer = setTimeout(voice.cleanup, 25);
}

function _st(fn, ms) {
  if (masterMuted || activeTimeouts.size >= MAX_AUDIO_TIMERS) return null;
  const generation = audioGeneration;
  const id = setTimeout(() => {
    activeTimeouts.delete(id);
    if (generation === audioGeneration && !masterMuted) fn();
    notifyAudioState();
  }, Math.max(0, Math.min(60_000, Number(ms) || 0)));
  activeTimeouts.add(id);
  notifyAudioState();
  return id;
}

/** 예약음을 취소하고 짧게 감쇠한 뒤 모든 소스·필터를 연결 해제합니다. */
export function stopAllSounds() {
  audioGeneration += 1;
  pendingPreviewCancel?.();
  stopBgm();
  for (const cancel of activeScores) cancel();
  activeScores.clear();
  for (const id of activeTimeouts) clearTimeout(id);
  activeTimeouts.clear();
  for (const voice of activeVoices.values()) retireVoice(voice);
  notifyAudioState();
}

// 채점용 노트 기록 콜백 (vpython-bridge에서 주입)
let _onNotePlay = null;
export function setNotePlayCallback(cb) { _onNotePlay = cb; }
// 효과음·BGM 재생 시 호출 — (kind: 'sfx'|'bgm', name)
let _onSoundEvent = null;
export function setSoundEventCallback(cb) { _onSoundEvent = cb; }

const NOTE_NAME_BY_SEMITONE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * 주파수 → 가장 가까운 노트 이름 (A4 = 440Hz 기준, 12-TET)
 * @returns {string|null}
 */
export function freqToNoteName(freq) {
  const f = Number(freq);
  if (!Number.isFinite(f) || f <= 0) return null;
  const midi = Math.round(69 + 12 * Math.log2(f / 440));
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAME_BY_SEMITONE[((midi % 12) + 12) % 12]}${octave}`;
}

function getAudioContext() {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContextClass();
    createMasterGraph(audioCtx);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function isIOSDevice() {
  const nav = globalThis.navigator;
  if (!nav) return false;

  const ua = nav.userAgent || '';
  const platform = nav.platform || '';
  const touchPoints = nav.maxTouchPoints || 0;

  return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && touchPoints > 1);
}

function isAndroidDevice() {
  const nav = globalThis.navigator;
  if (!nav) return false;
  return /Android/i.test(nav.userAgent || '');
}

export function isTouchPlaybackEnvironment() {
  if (isIOSDevice() || isAndroidDevice()) return true;
  if (typeof globalThis.matchMedia === 'function') {
    return globalThis.matchMedia('(hover: none) and (pointer: coarse)').matches;
  }
  return false;
}

function writeWavString(view, offset, value) {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function getSilentMediaDataUri() {
  if (silentMediaDataUri) return silentMediaDataUri;

  const sampleRate = 8000;
  const durationSeconds = 0.2;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const dataSize = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeWavString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeWavString(view, 8, 'WAVE');
  writeWavString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeWavString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  silentMediaDataUri = `data:audio/wav;base64,${btoa(binary)}`;
  return silentMediaDataUri;
}

async function ensureIOSMediaPlayback() {
  if (!isIOSDevice()) return true;
  if (iosMediaUnlocked) return true;

  if (!iosMediaUnlockPending) {
    iosMediaUnlockPending = (async () => {
      try {
        const audio = document.createElement('audio');
        audio.src = getSilentMediaDataUri();
        audio.preload = 'auto';
        audio.playsInline = true;
        audio.setAttribute('playsinline', '');
        audio.setAttribute('webkit-playsinline', '');
        await audio.play();
        iosMediaUnlocked = true;
      } catch {
        // 사용자 제스처가 아니면 재생이 거절될 수 있으므로 다음 제스처에서 재시도
      }

      return iosMediaUnlocked;
    })().finally(() => {
      iosMediaUnlockPending = null;
    });
  }

  return iosMediaUnlockPending;
}

function playSilentUnlockBuffer(ctx) {
  try {
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    connectOutput(gain);
    src.start(0);
    src.stop(ctx.currentTime + 0.01);
    trackOsc(src, gain, 0.01);
  } catch { /* 중복 호출 시 무시 */ }
}

export async function ensureAudioReady() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  const generation = audioGeneration;

  const iosReadyPromise = ensureIOSMediaPlayback();

  if (ctx.state === 'running') {
    audioUnlocked = true;
    const iosReady = await iosReadyPromise;
    return isIOSDevice() ? iosReady : true;
  }

  if (!audioUnlockPending) {
    audioUnlockPending = (async () => {
      try {
        await ctx.resume();
      } catch {
        // 모바일 정책으로 실패하면 다음 사용자 제스처에서 다시 시도
      }

      if (generation !== audioGeneration) return false;

      playSilentUnlockBuffer(ctx);
      const iosReady = await iosReadyPromise;

      if (ctx.state === 'running') {
        audioUnlocked = true;
      }

      return isIOSDevice() ? (ctx.state === 'running' && iosReady) : ctx.state === 'running';
    })().finally(() => {
      audioUnlockPending = null;
    });
  }

  return audioUnlockPending;
}

export function isAudioUnlocked() {
  if (isIOSDevice()) {
    return (audioUnlocked || audioCtx?.state === 'running') && iosMediaUnlocked;
  }
  return audioUnlocked || audioCtx?.state === 'running';
}

/**
 * AudioContext를 확보하고 콜백 실행.
 * 핵심: 상태 체크 없이 항상 즉시 fn(ctx) 호출.
 *
 * Web Audio API는 suspended 상태에서도 노드 생성·스케줄이 가능하고,
 * context가 resume되면 스케줄된 노드가 재생된다.
 * initAudioOnUserGesture()에서 첫 제스처 시 resume()이 호출되므로,
 * fn() 안에서 스케줄된 오디오는 resume 직후 재생된다.
 *
 * 이전 방식(resume 완료 후 fn 호출)은 모바일에서 타이밍 문제로
 * fn()이 아예 호출되지 않는 버그가 있었음.
 */
function withRunningContext(fn) {
  if (masterMuted || masterVolume === 0 || activeVoices.size >= MAX_AUDIO_VOICES) return;
  const ctx = getAudioContext();
  if (ctx) fn(ctx);
}

/**
 * 모바일 브라우저 오디오 잠금 해제
 * 사용자 제스처(클릭/터치/키)에서 AudioContext를 생성하고 resume한다.
 * - touchend 사용 (iOS에서 touchstart는 스크롤로 간주될 수 있어 불안정)
 * - resume 성공 후에만 리스너 제거 (비동기 실패 시 재시도 보장)
 */
export function initAudioOnUserGesture() {
  if (audioUnlocked) return;

  const EVENTS = ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'];

  const cleanup = () => {
    EVENTS.forEach(e => document.removeEventListener(e, unlock, true));
  };

  const unlock = () => {
    if (audioUnlocked) return;
    ensureAudioReady().then((ready) => {
      if (ready) cleanup();
    }).catch(() => {});
  };

  EVENTS.forEach(e => document.addEventListener(e, unlock, true));
}

/**
 * Run 버튼 등 사용자 클릭 핸들러 내부에서 직접 호출.
 * iOS Safari는 사용자 제스처 콜스택 안에서 resume()해야 동작하므로
 * 클릭 핸들러에서 이 함수를 동기적으로 호출해 확실히 잠금을 해제한다.
 */
export function ensureAudioResumed() {
  void ensureAudioReady();
}

/**
 * 클릭 핸들러에서 AudioContext를 resume하고, running 확인 후 콜백 실행.
 * - 동기적으로 resume() 호출 (사용자 제스처 콜스택 안)
 * - 최대 500ms 대기 후 상태 무관하게 콜백 실행 (3D 차단 방지)
 * - iOS에서 suspended→running 전환 시간을 확보하면서도 실행을 보장
 */
export function resumeAndRun(callback) {
  const generation = audioGeneration;
  const ctx = getAudioContext();
  if (!ctx || ctx.state === 'running') {
    if (ctx) audioUnlocked = true;
    callback();
    return () => {};
  }
  const resumePromise = ctx.resume().catch(() => {});
  playSilentUnlockBuffer(ctx);
  ensureIOSMediaPlayback().catch(() => {});
  let done = false;
  let timer = null;
  const cancel = () => {
    done = true;
    clearTimeout(timer);
    activeTimeouts.delete(timer);
    notifyAudioState();
  };
  const run = () => {
    if (done || generation !== audioGeneration) return;
    cancel();
    if (ctx.state === 'running') audioUnlocked = true;
    callback();
  };
  timer = setTimeout(run, 500);
  activeTimeouts.add(timer);
  notifyAudioState();
  resumePromise.then(run);
  return cancel;
}

// ===================================================================
// 1) 기본 재생
// ===================================================================

/**
 * 비프음
 * @param {number} frequency - 주파수 (Hz)
 * @param {number} duration - 길이 (초)
 * @param {string} type - 파형 ('sine'|'square'|'sawtooth'|'triangle')
 * @param {number} volume - 볼륨 (0~1)
 */
function scheduleEnvelope(gain, ctx, peak, duration, attack = 0.008, time = ctx.currentTime) {
  const rise = Math.min(attack, duration / 4);
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(peak, time + rise);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(rise, duration - 0.012));
  gain.gain.linearRampToValueAtTime(0, time + duration);
}

function richTone(ctx, frequency, duration, timbre, volume, group, time) {
  const partials = timbre === 'musicbox' ? [[1, 0.78], [2, 0.16], [3.01, 0.06]] : [[1, 0.72], [2, 0.2], [3, 0.08]];
  const tail = timbre === 'musicbox' ? 0.28 : 0.16;
  for (const [ratio, strength] of partials) {
    if (activeVoices.size >= MAX_AUDIO_VOICES || frequency * ratio > 18_000) break;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const length = duration + tail / ratio;
    osc.type = 'sine';
    osc.frequency.value = frequency * ratio;
    scheduleEnvelope(gain, ctx, volume * strength, length, timbre === 'musicbox' ? 0.006 : 0.01, time);
    osc.connect(gain); connectOutput(gain);
    osc.start(time); osc.stop(time + length);
    trackOsc(osc, gain, time - ctx.currentTime + length, [], group, { name: freqToNoteName(frequency), start: time, end: time + duration });
  }
}

export function beep(frequency = 440, duration = 0.3, type = 'sine', volume = 0.3, group = 'lesson', startAt = null) {
  const pitch = Number(frequency); const seconds = Number(duration); const level = Number(volume);
  if (!Number.isFinite(pitch) || pitch < 20 || pitch > 18_000 || !Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(level) || level <= 0) return;
  const length = Math.max(0.025, Math.min(10, seconds));
  const peak = Math.min(1, level);
  withRunningContext(ctx => {
    const time = Number.isFinite(startAt) ? Math.max(ctx.currentTime, startAt) : ctx.currentTime;
    if (type === 'piano' || type === 'musicbox') { richTone(ctx, pitch, length, type, peak, group, time); return; }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = ['sine', 'triangle', 'square', 'sawtooth'].includes(type) ? type : 'sine';
    osc.frequency.value = pitch;
    scheduleEnvelope(gain, ctx, peak, length, 0.008, time);
    osc.connect(gain); connectOutput(gain);
    osc.start(time); osc.stop(time + length);
    trackOsc(osc, gain, time - ctx.currentTime + length, [], group, { name: freqToNoteName(pitch), start: time, end: time + length });
  });
}

/** 명시적인 클릭에서만 실행하는 짧은 오리지널 음색 예제입니다. */
export async function previewInstrument(timbre = 'piano') {
  stopAllSounds();
  const generation = audioGeneration;
  if (masterMuted || masterVolume === 0) return false;
  return new Promise((resolve) => {
    let cancelResume = null;
    const finish = (played) => {
      if (pendingPreviewCancel === cancel) pendingPreviewCancel = null;
      notifyAudioState();
      resolve(played);
    };
    const cancel = () => { cancelResume?.(); finish(false); };
    pendingPreviewCancel = cancel;
    notifyAudioState();
    // 제스처 안에서 resume을 요청하고, 500ms 뒤에도 막혀 있으면 재시도를 안내합니다.
    ensureAudioResumed();
    cancelResume = resumeAndRun(() => {
      if (masterMuted || generation !== audioGeneration || getAudioContext()?.state !== 'running') { finish(false); return; }
      const names = timbre === 'musicbox' ? ['C5', 'E5', 'G5', 'B5', 'C6'] : ['C4', 'E4', 'G4', 'B4', 'C5'];
      playSequence(names.map((name, index) => ({ freq: noteToFreq(name), duration: index === names.length - 1 ? 0.75 : 0.3, type: timbre === 'musicbox' ? 'musicbox' : 'piano', volume: 0.42 })));
      finish(true);
    });
  });
}

/**
 * 노트 연주 (학생 코드에서 사용)
 */
export function play(frequency, duration = 0.5) {
  beep(frequency, duration, 'sine', 0.4);
}

// ===================================================================
// 2) 노트 이름 → 주파수 변환 + 노트 기반 재생
// ===================================================================

// 반음 인덱스 (C=0, C#=1, ..., B=11)
const NOTE_NAMES = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
};

/**
 * 노트 이름(예: "C4", "F#5") → 주파수(Hz) 변환
 * A4 = 440Hz 기준, 12-TET
 * @returns {number|null}
 */
export function noteToFreq(name) {
  if (!name || name.length < 2) return null;

  // 이름과 옥타브 분리
  let notePart, octave;
  if (name.length >= 3 && (name[1] === '#' || name[1] === 'b')) {
    notePart = name.slice(0, 2);
    octave = parseInt(name.slice(2), 10);
  } else {
    notePart = name[0];
    octave = parseInt(name.slice(1), 10);
  }

  const semitone = NOTE_NAMES[notePart];
  if (semitone === undefined || isNaN(octave)) return null;

  // A4(=440Hz)를 기준으로 반음 차이 계산
  const stepsFromA4 = (octave - 4) * 12 + (semitone - 9);
  return 440 * Math.pow(2, stepsFromA4 / 12);
}

/**
 * 노트 이름으로 재생
 */
export function playNote(name, duration = 0.5, type = 'sine', volume = 0.4) {
  const freq = noteToFreq(name);
  if (freq === null) return;
  if (_onNotePlay) _onNotePlay(name, duration, type);
  beep(freq, duration, type, volume);
}

/**
 * 여러 주파수를 동시에 재생 (화음)
 */
export function playChord(frequencies, duration = 1.0, type = 'sine', volume = 0.25) {
  if (!frequencies || frequencies.length === 0) return;
  const notes = frequencies.slice(0, 24);
  if (_onNotePlay) {
    const names = notes.map(freqToNoteName).filter(Boolean);
    if (names.length > 0) _onNotePlay(names.join('+'), duration, type);
  }
  for (const freq of notes) beep(freq, duration, type, volume / Math.sqrt(notes.length));
}

/**
 * 노트 배열을 순차적으로 재생
 * @param {Array<{freq: number, duration: number, type?: string, volume?: number}>} notes
 */
// JavaScript 타이머는 예약 창을 채우기만 합니다. 실제 박자는 AudioContext가 결정합니다.
function scheduleScore(entries, loop = false, group = 'lesson') {
  if (masterMuted || masterVolume === 0 || activeScores.size >= 16 || !entries.length) return () => {};
  const ctx = getAudioContext();
  if (!ctx) return () => {};
  const generation = audioGeneration;
  const origin = ctx.currentTime;
  const length = entries.reduce((sum, note) => sum + note.duration, 0);
  let cycle = 0;
  let index = 0;
  let offset = 0;
  let timer = null;
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
    clearTimeout(timer);
    activeTimeouts.delete(timer);
    activeScores.delete(cancel);
    notifyAudioState();
  };
  activeScores.add(cancel);
  const pump = () => {
    if (cancelled || generation !== audioGeneration || ctx.state === 'closed') { cancel(); return; }
    const now = ctx.currentTime;
    // 배경 탭이 오래 멈췄어도 지난 마디를 한꺼번에 따라잡지 않습니다.
    if (loop && now > origin + (cycle + 1) * length) {
      cycle = Math.floor((now - origin) / length);
      index = 0;
      offset = 0;
    }
    while (origin + cycle * length + offset < now + 0.12) {
      const time = origin + cycle * length + offset;
      const note = entries[index];
      if (time >= now - 0.04) beep(note.freq, note.duration * (group === 'bgm' ? 0.9 : 1), note.type || 'sine', note.volume ?? 0.4, group, time);
      offset += note.duration;
      index += 1;
      if (index === entries.length) {
        if (!loop) { cancel(); return; }
        cycle += 1; index = 0; offset = 0;
      }
    }
    timer = _st(pump, 25);
    if (timer === null) cancel();
  };
  pump();
  return cancel;
}

export function playSequence(notes) {
  if (!Array.isArray(notes) || !notes.length) return;
  let length = 0;
  const entries = [];
  for (const note of notes.slice(0, 128)) {
    if (length > 60) break;
    if (!note || typeof note !== 'object') continue;
    const duration = Number.isFinite(Number(note.duration)) && Number(note.duration) > 0 ? Math.max(0.025, Math.min(10, Number(note.duration))) : 0.3;
    entries.push({ ...note, duration });
    length += duration;
  }
  scheduleScore(entries);
}

/** 미리 예약된 음은 아직 표시하지 않고, 실제 오디오 시각에 맞춰 읽습니다. */
export function getPlayingNotes() {
  if (!audioCtx || audioCtx.state !== 'running' || masterMuted || masterVolume === 0) return [];
  const stamp = audioCtx.getOutputTimestamp?.();
  const outputTime = stamp?.performanceTime > 0 ? stamp.contextTime + (performance.now() - stamp.performanceTime) / 1000 : audioCtx.currentTime;
  const time = Math.max(0, Math.min(audioCtx.currentTime, outputTime));
  return [...new Set([...activeVoices.values()]
    .filter(voice => !voice.retiring && voice.group !== 'ui' && voice.note && voice.note.start <= time && time < voice.note.end)
    .map(voice => voice.note.name).filter(Boolean))];
}

// ===================================================================
// 3) 시스템 효과음 (UI용)
// ===================================================================

export function successSound() {
  beep(523, 0.15, 'sine', 0.2);  // C5
  _st(() => beep(659, 0.15, 'sine', 0.2), 100);  // E5
  _st(() => beep(784, 0.3, 'sine', 0.2), 200);   // G5
}

export function errorSound() {
  beep(200, 0.3, 'square', 0.15);
}

export function hintSound() {
  beep(880, 0.1, 'sine', 0.15);
  _st(() => beep(1100, 0.15, 'sine', 0.15), 80);
}

export function runSound() {
  beep(660, 0.08, 'sine', 0.1, 'ui');
}

export function levelUpSound() {
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    _st(() => beep(freq, 0.2, 'sine', 0.2), i * 120);
  });
}

// ===================================================================
// 4) 게임 효과음 (슈퍼마리오 스타일, 저작권 무관)
// ===================================================================

/**
 * 점프 효과음 — 상승 주파수 스윕
 */
export function sfxJump() {
  withRunningContext(ctx => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);

    scheduleEnvelope(gain, ctx, 0.2, 0.2);

    osc.connect(gain);
    connectOutput(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
    trackOsc(osc, gain, 0.2);
  });
}

/**
 * 코인 획득 효과음 — 높은 2음
 */
export function sfxCoin() {
  beep(988, 0.06, 'square', 0.2);   // B5
  _st(() => beep(1319, 0.12, 'square', 0.2), 60); // E6
}

/**
 * 파워업 효과음 — 상승 아르페지오
 */
export function sfxPowerUp() {
  const notes = [523, 659, 784, 988, 1175, 1319]; // C5→E6
  notes.forEach((freq, i) => {
    _st(() => beep(freq, 0.08, 'square', 0.15), i * 50);
  });
}

/**
 * 죽음/실패 효과음 — 하강 음계
 */
export function sfxDeath() {
  const notes = [494, 466, 440, 370, 311, 247]; // B4→B3 하강
  notes.forEach((freq, i) => {
    _st(() => beep(freq, 0.15, 'square', 0.15), i * 100);
  });
}

/**
 * 파이어볼 효과음 — 빠른 하강 스윕
 */
export function sfxFireball() {
  withRunningContext(ctx => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);

    scheduleEnvelope(gain, ctx, 0.15, 0.15);

    osc.connect(gain);
    connectOutput(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
    trackOsc(osc, gain, 0.15);
  });
}

/**
 * 파이프/워프 효과음 — 하강 후 상승
 */
export function sfxPipe() {
  withRunningContext(ctx => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.4);

    scheduleEnvelope(gain, ctx, 0.15, 0.4);

    osc.connect(gain);
    connectOutput(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    trackOsc(osc, gain, 0.4);
  });
}

/**
 * 1UP (생명 획득) 효과음 — 밝은 상승 멜로디
 */
export function sfx1Up() {
  const notes = [659, 784, 988, 784, 988, 1319]; // E5-G5-B5-G5-B5-E6
  notes.forEach((freq, i) => {
    _st(() => beep(freq, 0.1, 'square', 0.18), i * 80);
  });
}

/**
 * 버튼/선택 효과음 — 짧은 틱
 */
export function sfxSelect() {
  beep(660, 0.05, 'square', 0.12);
}

/**
 * 경고/위험 효과음
 */
export function sfxWarning() {
  beep(440, 0.15, 'square', 0.2);
  _st(() => beep(440, 0.15, 'square', 0.2), 250);
  _st(() => beep(440, 0.15, 'square', 0.2), 500);
}

/**
 * 폭발 효과음 — 노이즈 기반
 */
export function sfxExplosion() {
  withRunningContext(ctx => {
    // 화이트 노이즈 버퍼 생성
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = ctx.createGain();
    scheduleEnvelope(gain, ctx, 0.3, 0.4);

    // 로우패스 필터로 둔탁한 느낌
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    connectOutput(gain);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.4);
    trackOsc(noise, gain, 0.4, [filter]);
  });
}

/**
 * 레이저 효과음 — 하강 톤
 */
export function sfxLaser() {
  withRunningContext(ctx => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);

    scheduleEnvelope(gain, ctx, 0.15, 0.2);

    osc.connect(gain);
    connectOutput(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
    trackOsc(osc, gain, 0.2);
  });
}

// 이름으로 효과음 호출하는 매핑
const SFX_MAP = {
  jump: sfxJump,
  coin: sfxCoin,
  powerup: sfxPowerUp,
  power_up: sfxPowerUp,
  death: sfxDeath,
  fireball: sfxFireball,
  pipe: sfxPipe,
  '1up': sfx1Up,
  oneup: sfx1Up,
  select: sfxSelect,
  warning: sfxWarning,
  explosion: sfxExplosion,
  laser: sfxLaser,
  success: successSound,
  error: errorSound,
  hint: hintSound,
  run: runSound,
  levelup: levelUpSound,
  level_up: levelUpSound,
};

/**
 * 이름으로 효과음 재생
 * @param {string} name - 효과음 이름 (jump, coin, powerup, death 등)
 */
/** 지원하는 효과음 이름인지 확인 */
export function hasSfx(name) {
  return Boolean(SFX_MAP[name?.toLowerCase()]);
}

export function playSfx(name) {
  const fn = SFX_MAP[name?.toLowerCase()];
  if (!fn) return;
  if (_onSoundEvent) _onSoundEvent('sfx', name.toLowerCase());
  fn();
}

// ===================================================================
// 5) BGM (루프 가능한 8비트 배경음악)
// ===================================================================

// 현재 재생 중인 BGM 상태
let currentBgm = null;

/**
 * BGM 패턴 정의 (저작권 없는 오리지널 8비트 멜로디)
 * 각 패턴은 { notes: [...], tempo, type, volume } 형태
 */
const BGM_PATTERNS = {
  // 모험 테마 — 밝은 8비트 마치
  adventure: {
    notes: [
      'C4','E4','G4','C5','B4','G4','E4','G4',
      'A4','C5','E5','A4','G4','E4','C4','E4',
      'F4','A4','C5','F4','E4','C4','A3','C4',
      'G4','B4','D5','G4','F4','D4','B3','D4',
    ],
    durations: [
      0.15,0.15,0.15,0.3,0.15,0.15,0.15,0.3,
      0.15,0.15,0.15,0.3,0.15,0.15,0.15,0.3,
      0.15,0.15,0.15,0.3,0.15,0.15,0.15,0.3,
      0.15,0.15,0.15,0.3,0.15,0.15,0.15,0.3,
    ],
    type: 'square',
    volume: 0.12,
  },

  // 탐험 테마 — 미스터리한 분위기
  explore: {
    notes: [
      'E4','G4','A4','B4','E4','G4','A4','G4',
      'D4','F#4','A4','D5','D4','F#4','A4','F#4',
      'C4','E4','G4','C5','C4','E4','G4','E4',
      'B3','D#4','F#4','B4','B3','D#4','F#4','D#4',
    ],
    durations: [
      0.2,0.2,0.2,0.4,0.2,0.2,0.2,0.4,
      0.2,0.2,0.2,0.4,0.2,0.2,0.2,0.4,
      0.2,0.2,0.2,0.4,0.2,0.2,0.2,0.4,
      0.2,0.2,0.2,0.4,0.2,0.2,0.2,0.4,
    ],
    type: 'triangle',
    volume: 0.1,
  },

  // 전투 테마 — 긴박한 빠른 템포
  battle: {
    notes: [
      'A4','A4','C5','A4','D5','C5','A4','A4',
      'G4','G4','Bb4','G4','C5','Bb4','G4','G4',
      'F4','F4','A4','F4','C5','A4','F4','F4',
      'E4','E4','G4','E4','B4','G4','E4','E4',
    ],
    durations: [
      0.1,0.1,0.1,0.1,0.15,0.1,0.1,0.15,
      0.1,0.1,0.1,0.1,0.15,0.1,0.1,0.15,
      0.1,0.1,0.1,0.1,0.15,0.1,0.1,0.15,
      0.1,0.1,0.1,0.1,0.15,0.1,0.1,0.15,
    ],
    type: 'square',
    volume: 0.12,
  },

  // 평화 테마 — 느긋한 아르페지오
  peaceful: {
    notes: [
      'C4','E4','G4','C5','G4','E4',
      'F4','A4','C5','F5','C5','A4',
      'G4','B4','D5','G5','D5','B4',
      'C4','E4','G4','C5','G4','E4',
    ],
    durations: [
      0.3,0.3,0.3,0.3,0.3,0.3,
      0.3,0.3,0.3,0.3,0.3,0.3,
      0.3,0.3,0.3,0.3,0.3,0.3,
      0.3,0.3,0.3,0.3,0.3,0.3,
    ],
    type: 'sine',
    volume: 0.1,
  },

  // 승리 팡파레
  victory: {
    notes: [
      'C5','C5','C5','C5','Ab4','Bb4','C5','Bb4','C5',
      'E5','E5','E5','E5','C5','D5','E5','D5','E5',
      'G5','G5','F5','E5','D5','C5','D5','E5','C5',
    ],
    durations: [
      0.12,0.12,0.12,0.35,0.12,0.12,0.12,0.12,0.45,
      0.12,0.12,0.12,0.35,0.12,0.12,0.12,0.12,0.45,
      0.12,0.12,0.12,0.12,0.12,0.12,0.12,0.12,0.6,
    ],
    type: 'square',
    volume: 0.15,
  },
};

/**
 * BGM 재생 시작
 * @param {string} name - BGM 이름 (adventure, explore, battle, peaceful, victory)
 * @param {boolean} loop - 반복 여부 (기본 true)
 */
/** 지원하는 배경음악 이름인지 확인 */
export function hasBgm(name) {
  return Boolean(BGM_PATTERNS[name?.toLowerCase()]);
}

export function startBgm(name, loop = true) {
  stopBgm(); // 기존 BGM 중지

  const pattern = BGM_PATTERNS[name?.toLowerCase()];
  if (!pattern) return;
  if (_onSoundEvent) _onSoundEvent('bgm', name.toLowerCase());

  const { notes, durations, type, volume } = pattern;
  const cancel = scheduleScore(notes.map((note, index) => ({ freq: noteToFreq(note), duration: durations[index] || 0.2, type, volume })), loop, 'bgm');
  currentBgm = {
    name,
    stop: () => {
      cancel();
      for (const voice of activeVoices.values()) if (voice.group === 'bgm') retireVoice(voice);
      notifyAudioState();
    },
  };
}

/**
 * BGM 정지
 */
export function stopBgm() {
  if (currentBgm) {
    currentBgm.stop();
    currentBgm = null;
  }
}

/**
 * 현재 BGM 이름 조회
 */
export function getCurrentBgm() {
  return currentBgm?.name || null;
}

// ===================================================================
// 6) Python 브릿지 인터페이스 — processSoundCommand
// ===================================================================

/**
 * Worker에서 온 사운드 커맨드를 처리
 * vpython-bridge.js의 processBatch에서 호출됨
 *
 * @param {Object} cmd - 사운드 커맨드
 *   { action: 'sound', method: 'beep'|'note'|'chord'|'sequence'|'sfx'|'bgm_start'|'bgm_stop', ... }
 */
export function processSoundCommand(cmd) {
  switch (cmd.method) {
    case 'beep':
      beep(cmd.frequency || 440, cmd.duration || 0.3, cmd.type || 'sine', cmd.volume ?? 0.3);
      break;

    case 'play':
      play(cmd.frequency || 440, cmd.duration || 0.5);
      break;

    case 'note':
      playNote(cmd.name, cmd.duration || 0.5, cmd.type || 'sine', cmd.volume ?? 0.4);
      break;

    case 'chord':
      playChord(cmd.frequencies || [], cmd.duration || 1.0, cmd.type || 'sine', cmd.volume ?? 0.25);
      break;

    case 'sequence':
      playSequence(cmd.notes || []);
      break;

    case 'sfx':
      playSfx(cmd.name);
      break;

    case 'bgm_start':
      startBgm(cmd.name, cmd.loop !== false);
      break;

    case 'bgm_stop':
      stopBgm();
      break;

    default:
      // 알 수 없는 method는 무시
      break;
  }
}
