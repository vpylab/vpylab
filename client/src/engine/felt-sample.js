import { playSampleVoice } from '../../../server/shared/instruments/play-sample.js';
// 첫 음은 로딩을 기다리지 않고 합성합니다. 준비된 녹음은 같은 오디오 시계에 예약합니다.
const layers = [
  new URL('../../../server/shared/instruments/felt-quiet.mp3', import.meta.url).href,
  new URL('../../../server/shared/instruments/felt-loud.mp3', import.meta.url).href,
];
const contexts = new WeakMap();

/** 두 세기의 녹음을 받기 시작합니다. 오디오가 켜질 때 미리 불러 두면 연주 도중에 합성음에서 녹음으로 음색이 바뀌지 않습니다. */
export function warmFeltSamples(ctx) {
  if (!ctx?.decodeAudioData || !ctx.createBufferSource || typeof fetch !== 'function') return null;
  let samples = contexts.get(ctx);
  // 받다가 실패했으면(잠깐 끊긴 연결 등) 조금 뒤에 다시 받습니다. 그러지 않으면 그 뒤로 계속 합성음만 납니다.
  if (samples?.failedAt && Date.now() - samples.failedAt > 15_000) samples = null;
  if (!samples) {
    samples = [];
    contexts.set(ctx, samples);
    layers.forEach((url, index) => {
      Promise.resolve().then(() => fetch(url)).then(response => {
        if (!response.ok) throw new Error('음원 로딩 실패');
        return response.arrayBuffer();
      }).then(data => ctx.decodeAudioData(data)).then(buffer => { samples[index] = buffer; })
        .catch(() => { samples.failedAt = Date.now(); }); // 오프라인이면 합성 음색을 쓰고 나중에 다시 받습니다.
    });
  }
  return samples;
}

export function playFeltSample(ctx, hz, duration, volume, time, output) {
  const samples = warmFeltSamples(ctx);
  if (!samples) return null;
  // 두 녹음이 모두 준비된 뒤에만 씁니다. 한쪽만 준비되면 세기에 따라 음색이 갈립니다.
  if (!samples[0] || !samples[1]) return null;
  return playSampleVoice(samples, ctx, hz, duration, volume, time, output);
}
