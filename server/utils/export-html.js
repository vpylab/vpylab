import { usedPlanetPresets } from '../shared/planet-presets.js';
import { readFileSync } from 'node:fs';
import { generateStandaloneHTML as generate } from './standalone-template.js';

// Railway의 server 루트 배포에서도 실행하도록 변환기를 함께 패키징합니다.
// export-html.test.js가 편집기의 원본과 바이트 단위로 같은지 확인합니다.
const transformSource = readFileSync(new URL('./student-code-transform.py', import.meta.url), 'utf8');

const widgetCss = readFileSync(new URL('../shared/widgets/panel.css', import.meta.url), 'utf8');

const feltLayers = ['felt-quiet.mp3', 'felt-loud.mp3'].map(name => {
  const bytes = readFileSync(new URL('../shared/instruments/' + name, import.meta.url));
  return 'data:audio/mpeg;base64,' + bytes.toString('base64');
});

export function generateStandaloneHTML(code, title = 'VPyLab', options = {}) {
  const maps = Object.fromEntries(usedPlanetPresets(code).map(name => {
    const bytes = readFileSync(new URL('../shared/planets/' + name + '.jpg', import.meta.url));
    return [name, 'data:image/jpeg;base64,' + bytes.toString('base64')];
  }));
  return generate(code, title, options, transformSource, feltLayers, maps, widgetCss);
}
