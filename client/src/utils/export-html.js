import { usedPlanetPresets } from '../../../server/shared/planet-presets.js';
import quiet from '../../../server/shared/instruments/felt-quiet.mp3?inline';
import loud from '../../../server/shared/instruments/felt-loud.mp3?inline';
import transformSource from '../engine/student-code-transform.py?raw';
import { generateStandaloneHTML as generate } from '../../../server/utils/standalone-template.js';

export { downloadHTML } from '../../../server/utils/standalone-template.js';

export function generateStandaloneHTML(code, title = 'VPyLab', options = {}) {
  return generate(code, title, options, transformSource, [quiet, loud]);
}


// 그림 모듈은 해당 작품을 내려받거나 게시할 때만 불러온다.
const planetAssets = import.meta.glob('../../../server/shared/planets/*.jpg', { query: '?inline', import: 'default' });

export async function generateProjectHTML(code, title = 'VPyLab', options = {}) {
  const maps = await Promise.all(usedPlanetPresets(code).map(async name => {
    const load = planetAssets['../../../server/shared/planets/' + name + '.jpg'];
    return [name, await load()];
  }));
  return generate(code, title, options, transformSource, [quiet, loud], Object.fromEntries(maps));
}
