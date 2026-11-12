import transformSource from '../engine/student-code-transform.py?raw';
import { generateStandaloneHTML as generate } from '../../../shared/standalone-template.js';

export { downloadHTML } from '../../../shared/standalone-template.js';

export function generateStandaloneHTML(code, title = 'VPyLab', options = {}) {
  return generate(code, title, options, transformSource);
}
