// 같은 악기를 직접음 또는 짧은 실내 잔향과 함께 듣습니다.
export function createRoomBus(ctx, destination) {
  const input = ctx.createGain();
  const reverb = ctx.createConvolver();
  const wet = ctx.createGain();
  const impulse = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * .8), ctx.sampleRate);
  let seed = 104729;
  for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
    const wave = impulse.getChannelData(channel);
    for (let i = 0; i < wave.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      wave[i] = (seed / 2147483648 - 1) * Math.exp(-7*i/wave.length);
    }
  }
  reverb.buffer = impulse;
  wet.gain.value = .18;
  input.connect(destination);
  input.connect(reverb);
  reverb.connect(wet);
  wet.connect(destination);
  return {
    input,
    // 바로 끊으면 직접음과 잔향이 한꺼번에 잘려 '딱' 소리가 납니다. 짧게 줄인 뒤 연결을 풉니다.
    close() {
      const time = ctx.currentTime || 0;
      for (const node of [input, wet]) {
        try {
          node.gain.cancelScheduledValues?.(time);
          node.gain.setValueAtTime(node.gain.value, time);
          node.gain.linearRampToValueAtTime(0, time + 0.02);
        } catch { /* 이미 닫힌 오디오 컨텍스트 */ }
      }
      setTimeout(() => {
        for (const node of [input, reverb, wet]) { try { node.disconnect(); } catch { /* 이미 끊김 */ } }
      }, 60);
    },
  };
}
