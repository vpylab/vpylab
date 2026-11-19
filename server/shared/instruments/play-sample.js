export function playSampleVoice(samples, ctx, hz, duration, volume, time, output) {
  const buffer = samples[volume < .5 ? 0 : 1];
  if (hz < 130 || hz > 1050) return null;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = hz / 261.625565;
  const length = Math.min(duration + .18, buffer.duration / source.playbackRate.value);
  const end = time + length;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(volume, time + Math.min(.006, length/4));
  gain.gain.setValueAtTime(volume, Math.max(time + length/4, end - .18));
  gain.gain.linearRampToValueAtTime(0, end);
  source.connect(gain); gain.connect(output);
  source.start(time); source.stop(end);
  return { source, gain, end };
}
