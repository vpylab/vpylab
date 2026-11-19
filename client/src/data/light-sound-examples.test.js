import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import examples, { getExampleCode } from './examples';
import english from '../i18n/catalogs/en-ui-text.json';

describe('light and sound classroom examples', () => {
  it('opens the owned examples in the chosen language and keeps the close-up view selected', () => {
    for (const id of ['pyctures-solar-study', 'comet-observatory', 'comet-closeup', 'timbre-studio']) {
      const example = examples.find(item => item.id === id);
      expect(english[example.title]).toBeTruthy();
      expect(english[example.description]).toBeTruthy();
      expect(getExampleCode(example, 'ko')).toBe(example.code);
      const en = getExampleCode(example, 'en');
      expect(en).not.toMatch(/[가-힣]/u);
      if (id === 'comet-closeup') {
        expect(en).toContain('selected="Follow comet"');
        expect(example.code).toContain('selected="혜성 따라가기"');
      }
    }
    const ordinary = examples.find(item => item.id === 'solar-system');
    expect(getExampleCode(ordinary, 'en')).toBe(ordinary.code);
  });

  it('opens the same nine Python programs that students read in the guide', () => {
    const markdown = readFileSync(resolve('../docs/LIGHT_SOUND_SPACE_LAB.md'), 'utf8');
    const snippets = [...markdown.matchAll(/^```python\n([\s\S]*?)\n```$/gm)];
    const links = [...markdown.matchAll(/^\[run-(\d+)\]: .*?#b64=([\w-]+)$/gm)];
    expect(snippets).toHaveLength(9);
    expect(links).toHaveLength(9);
    links.forEach(([, number, encoded], i) => {
      expect(Number(number)).toBe(i + 1);
      expect(Buffer.from(encoded, 'base64url').toString('utf8')).toBe(snippets[i][1]);
    });
  });
});

it('국제 파일럿은 공통 시각 코드에 VPyLab 음 한 줄만 더해 같은 호스트에서 연다', () => {
  const sheet = readFileSync(resolve('public/projects/light-sound-lab/duet.html'), 'utf8');
  const visual = sheet.match(/<code id="visual">([\s\S]+?)<\/code>/)[1];
  const sound = sheet.match(/<code id="sound">([^<]+)<\/code>/)[1];
  expect(visual).not.toMatch(/play_note/);
  const code = visual.replace('Web VPython 3.2', 'from vpython import *')
    .replace('if phase == 0:\n', 'if phase == 0:\n' + sound + '\n');
  for (const lang of ['ko', 'en']) {
    const link = sheet.match(new RegExp('id="' + lang + '-run" href="([^"]+)"'))[1];
    const url = new URL(link.replaceAll('&amp;', '&'), 'https://preview.example');
    expect(url.origin).toBe('https://preview.example');
    expect(url.searchParams.get('lang')).toBe(lang);
    expect(Buffer.from(url.hash.slice(5), 'base64url').toString('utf8')).toBe(code);
  }
});
