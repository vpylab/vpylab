import { it, expect } from 'vitest';
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import examples, { getExampleCode } from './examples';
import courses from './courses';
import { localizeCourse } from '../i18n/owned-content';
import { shapeGuides, getGuideVariants } from './shape-guides';
import { welcomeFriends, welcomeCode, welcomeMotionCode } from './welcome-friends';
import { forgePresets, createRecipe } from '../forge/recipes';
import { makeForgeModule, moduleProgram } from '../forge/modules';

const catalog = import.meta.glob(['./*.js', '!./*.test.js'], { eager: true });
const privateAccess = /\.\s*_[a-zA-Z]\w*|\b(?:getattr|setattr|hasattr)\s*\([^,\n]+,\s*['"]_[a-zA-Z]\w*|\b(?:_id|_command_buffer|_add_command|_send_commands|obj_\d+)\b/u;

function inspect(value, path, violations) {
  if (typeof value === 'string') {
    const match = value.match(privateAccess);
    if (match) violations.push(path + ' → ' + match[0]);
  } else if (value && typeof value === 'object') {
    for (const [field, item] of Object.entries(value)) {
      inspect(item, path + '/' + (item?.id ?? field), violations);
    }
  }
}

it('수업 본문·힌트·예제와 대장간에서 생성하는 코드는 도형을 직접 사용한다', () => {
  const violations = [];
  inspect(catalog, '자료', violations);
  for (const locale of ['ko', 'en']) {
    for (const course of courses) inspect(localizeCourse(course, locale), course.id + '/' + locale, violations);
    for (const ex of examples) inspect(getExampleCode(ex, locale), ex.id + '/' + locale, violations);
  }
  for (const guide of shapeGuides) inspect(getGuideVariants(guide), guide.id, violations);
  for (const { id } of [...welcomeFriends, { id: 'friends' }]) {
    inspect([welcomeCode(id), welcomeMotionCode(id)], id, violations);
  }
  for (const { id } of forgePresets) {
    for (const bellMode of id === 'bell' ? ['shape', 'sound', 'waves'] : ['shape']) {
      const module = makeForgeModule({ ...createRecipe(id), bellMode }, { id });
      inspect([moduleProgram(module), moduleProgram(module, { file: true })], id + '/' + bellMode, violations);
    }
  }
  expect(violations).toEqual([]);
});

it('학생에게 제공하는 프로젝트 파일에도 엔진 내부 접근이 없다', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const patterns = [
    'client/public/projects/**/*.{py,json}',
    'demos/month-projects/*/main.py',
    'demos/month-projects/*/{milestones,scaffolds}/*.py',
  ];
  const violations = [];
  for (const pattern of patterns) {
    const paths = globSync(pattern, { cwd: root });
    expect(paths.length, pattern).toBeGreaterThan(0);
    for (const path of paths) {
      const raw = readFileSync(join(root, path), 'utf8');
      inspect(path.endsWith('.json') ? JSON.parse(raw) : raw, path, violations);
    }
  }
  expect(violations).toEqual([]);
});

