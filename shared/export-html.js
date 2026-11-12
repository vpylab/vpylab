import { readFileSync } from 'node:fs';
import { generateStandaloneHTML as generate } from './standalone-template.js';

// Railway의 server 루트 배포에서도 실행하도록 변환기를 함께 패키징합니다.
// export-html.test.js가 편집기의 원본과 바이트 단위로 같은지 확인합니다.
const transformSource = readFileSync(new URL('./student-code-transform.py', import.meta.url), 'utf8');

export function generateStandaloneHTML(code, title = 'VPyLab', options = {}) {
  return generate(code, title, options, transformSource);
}
