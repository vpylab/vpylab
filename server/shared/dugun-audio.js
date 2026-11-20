// 갤러리의 다운로드 주소와 저장소 안의 짧은 경로는 같은 음원을 가리킵니다.
export function dugunAudioUrl(value) {
  if (typeof value !== 'string') return null;
  const file = value.replace(/^https:\/\/greatsong\.github\.io\/dugun-assets\//, '')
    .replace(/^https:\/\/(?:raw\.githubusercontent\.com\/greatsong\/dugun-assets\/|github\.com\/greatsong\/dugun-assets\/(?:blob|raw)\/)(?:refs\/heads\/)?main\//, '');
  if (!/^audio\/(?:[\w-]+\/)*[\w.-]+\.(?:mp3|m4a)$/i.test(file)) return null;
  return 'https://raw.githubusercontent.com/greatsong/dugun-assets/main/' + file;
}

// 내보낸 HTML에도 이 함수를 넣습니다. 같은 출력 노드를 사용해 음량과 녹화에 함께 반영합니다.
export function createAssetAudioPlayer(getOutput, changed, reportError) {
  const tracks = new Set();
  let music = null;

  function stop(track) {
    if (!track || !tracks.delete(track)) return;
    if (music === track) music = null;
    const { media, source } = track;
    media.onended = media.onerror = null;
    media.pause();
    media.removeAttribute('src');
    media.load();
    source.disconnect();
    changed();
  }

  function play(url, isMusic, loop = false) {
    if (isMusic) stop(music);
    if (!isMusic && tracks.size - Number(Boolean(music)) >= 4) return;
    const output = getOutput();
    if (!output) return;
    const media = new Audio();
    media.crossOrigin = 'anonymous';
    media.loop = loop;
    const source = output.context.createMediaElementSource(media);
    source.connect(output);
    const track = { url, media, source };
    tracks.add(track);
    if (isMusic) music = track;
    const fail = () => {
      if (!tracks.has(track)) return;
      stop(track);
      reportError(url);
    };
    media.onended = () => stop(track);
    media.onerror = fail;
    media.src = url;
    media.play().catch(fail);
    changed();
  }

  return {
    play,
    get count() { return tracks.size; },
    get musicUrl() { return music?.url ?? null; },
    stopMusic() { stop(music); },
    stopAll() { for (const track of tracks) stop(track); },
  };
}
