/**
 * 작품 영상 내보내기 — 3D 화면(canvas)과 소리를 브라우저 안에서 녹화합니다.
 * 서버로 보내는 것이 없고, 길이·화질에 상한을 두어 교실 기기의 부담을 줄입니다.
 */

export const MAX_RECORDING_SECONDS = 30;
const FRAMES_PER_SECOND = 30;
const VIDEO_BITS_PER_SECOND = 2_500_000;
const AUDIO_BITS_PER_SECOND = 128_000;

// 메신저·발표 자료에서 바로 열리는 mp4를 먼저 고르고, 지원하지 않으면 webm을 사용합니다.
const RECORDING_TYPES = [
  { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
  { mimeType: 'video/mp4', extension: 'mp4' },
  { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
  { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
  { mimeType: 'video/webm', extension: 'webm' },
];

export function pickRecordingType(isSupported) {
  return RECORDING_TYPES.find(type => {
    try { return isSupported(type.mimeType); } catch { return false; }
  }) || null;
}

export function canRecordCanvas(canvas) {
  const Recorder = globalThis.MediaRecorder;
  return Boolean(canvas && typeof canvas.captureStream === 'function' && Recorder
    && pickRecordingType(type => Recorder.isTypeSupported(type)));
}

/**
 * @param {HTMLCanvasElement} canvas 3D 화면
 * @param {{ audio?: { stream: MediaStream, close: () => void } | null, maxSeconds?: number, onTick?: (seconds: number) => void }} options
 * @returns {{ stop: () => void, cancel: () => void, finished: Promise<{ blob: Blob, extension: string, seconds: number } | null> }}
 *   finished는 취소하면 null, 녹화에 실패하면 reject 됩니다.
 */
export function startCanvasRecording(canvas, { audio = null, maxSeconds = MAX_RECORDING_SECONDS, onTick } = {}) {
  const Recorder = globalThis.MediaRecorder;
  const type = canRecordCanvas(canvas) ? pickRecordingType(mime => Recorder.isTypeSupported(mime)) : null;
  if (!type) throw new Error('recording_unsupported');

  // 장면이 멈춰 있으면 canvas가 다시 그려지지 않아 프레임이 생기지 않습니다.
  // 그래서 일정한 간격으로 현재 화면을 직접 프레임으로 넘깁니다(멈춘 장면도 영상에 담깁니다).
  let videoStream = canvas.captureStream(0);
  const videoTrack = videoStream.getVideoTracks()[0];
  let requestFrame = null;
  if (typeof videoTrack?.requestFrame === 'function') requestFrame = () => videoTrack.requestFrame();
  else if (typeof videoStream.requestFrame === 'function') requestFrame = () => videoStream.requestFrame();
  else {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = canvas.captureStream(FRAMES_PER_SECOND);
  }
  const tracks = [...videoStream.getVideoTracks(), ...(audio?.stream?.getAudioTracks?.() || [])];
  const recorder = new Recorder(new MediaStream(tracks), {
    mimeType: type.mimeType,
    videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
    audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
  });

  const chunks = [];
  const startedAt = Date.now();
  let cancelled = false;
  let timer = null;
  let frameTimer = null;
  let limit = null;

  const release = () => {
    clearInterval(timer);
    clearInterval(frameTimer);
    clearTimeout(limit);
    videoStream.getTracks().forEach(track => track.stop());
    try { audio?.close?.(); } catch { /* 이미 끊긴 연결 */ }
  };
  const stop = () => { if (recorder.state !== 'inactive') recorder.stop(); };

  const finished = new Promise((resolve, reject) => {
    recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
    recorder.onerror = event => { release(); reject(event.error || new Error('recording_failed')); };
    recorder.onstop = () => {
      release();
      if (cancelled) { resolve(null); return; }
      const blob = new Blob(chunks, { type: type.mimeType.split(';')[0] });
      if (!blob.size) { reject(new Error('recording_empty')); return; }
      resolve({ blob, extension: type.extension, seconds: Math.round((Date.now() - startedAt) / 1000) });
    };
  });

  recorder.start(1000);
  if (requestFrame) {
    requestFrame();
    frameTimer = setInterval(requestFrame, 1000 / FRAMES_PER_SECOND);
  }
  timer = setInterval(() => onTick?.(Math.floor((Date.now() - startedAt) / 1000)), 500);
  limit = setTimeout(stop, maxSeconds * 1000);

  return { stop, cancel: () => { cancelled = true; stop(); }, finished };
}

/** 녹화한 영상을 파일로 내려받습니다. */
export function downloadRecording(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
