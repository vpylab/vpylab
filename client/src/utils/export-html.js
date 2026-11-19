import quiet from '../../../server/shared/instruments/felt-quiet.mp3?inline';
import loud from '../../../server/shared/instruments/felt-loud.mp3?inline';
import transformSource from '../engine/student-code-transform.py?raw';
import { generateStandaloneHTML as generate } from '../../../server/utils/standalone-template.js';

export { downloadHTML } from '../../../server/utils/standalone-template.js';

export function generateStandaloneHTML(code, title = 'VPyLab', options = {}) {
  return generate(code, title, options, transformSource, [quiet, loud]);
}
