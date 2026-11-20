// 수업 링크를 다시 열면 이 배포본에 포함된 최신 실습을 실행합니다.
try {
  const response = await fetch(new URL('./observer.py', import.meta.url));
  if (!response.ok) throw new Error('실습 파일을 불러오지 못했습니다.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  const code = btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  location.replace('/sandbox?view=run#b64=' + code);
} catch {
  document.querySelector('#status').textContent = '실습을 열 수 없습니다. 페이지를 새로 고쳐 다시 시도하세요.';
}
