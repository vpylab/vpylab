// 실습 링크와 활동지의 코드를 같은 원문에서 만듭니다.
const visual = document.getElementById('visual').textContent;
const sound = document.getElementById('sound').textContent;
const code = visual.replace('Web VPython 3.2', 'from vpython import *')
  .replace('        if phase == 0:\n', '        if phase == 0:\n' + sound + '\n');
const hash = btoa(String.fromCharCode(...new TextEncoder().encode(code)))
  .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
for (const lang of ['ko', 'en']) {
  document.getElementById(lang + '-run').href = '/sandbox?view=run&lang=' + lang + '#b64=' + hash;
}
