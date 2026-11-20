// 수업 링크를 다시 열면 이 배포본에 포함된 최신 실습을 실행합니다.
try {
  const response = await fetch(new URL('./observer.py', import.meta.url));
  if (!response.ok) throw new Error('실습 파일을 불러오지 못했습니다.');
  let source = await response.text();
  const at = new URLSearchParams(location.search).get('at');
  if (at && /^(19\d{2}|20\d{2}|2100)-\d{2}-\d{2}T\d{2}:\d{2}$/.test(at)) {
    const millis = Date.parse(at + ':00+09:00');
    if (Number.isFinite(millis) && new Date(millis + 9*3600000).toISOString().slice(0,16) === at) {
      source = source.replace('observation_start = None', 'observation_start = ' + millis / 1000);
    }
  }
  const bytes = new TextEncoder().encode(source);
  const code = btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  location.replace('/sandbox?view=run#b64=' + code);
} catch {
  document.querySelector('#status').textContent = '실습을 열 수 없습니다. 페이지를 새로 고쳐 다시 시도하세요.';
}
