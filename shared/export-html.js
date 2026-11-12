import { readFileSync } from 'node:fs';
import { generateStandaloneHTML as generate } from './standalone-template.js';

// Node에서 실행형 HTML을 만들 때 사용합니다(scripts/compat/). 변환기는 편집기가 사용하는 파일을 그대로 읽습니다.
const transformSource = readFileSync(new URL('../client/src/engine/student-code-transform.py', import.meta.url), 'utf8');

export function generateStandaloneHTML(code, title = 'VPyLab', options = {}) {
  return generate(code, title, options, transformSource);
}
