/**
 * 피지컬 컴퓨팅 키트(physical-kit.py) 무결성 검사
 */
import { describe, it, expect } from 'vitest';
import kitSource from './physical-kit.py?raw';
import { welcomeDefinition } from '../data/welcome-friends.js';
import physicalMissions from '../data/physical-missions.js';

describe('피지컬키트', () => {
  it('친구 모양 코드가 첫 화면 친구 명세와 같다', () => {
    const start = kitSource.indexOf('# <<FRIENDS>>\n') + '# <<FRIENDS>>\n'.length;
    const end = kitSource.indexOf('\n# <</FRIENDS>>');
    const expected = ['dumpling', 'flashlight', 'toolbox'].map(id => welcomeDefinition(id)).join('\n\n\n');
    // 다르면 welcome-friends.js의 welcomeDefinition 출력으로 <<FRIENDS>> 구간을 다시 채운다
    expect(kitSource.slice(start, end)).toBe(expected);
  });

  it('키트 함수는 대기 함수를 부르지 않는다 (import한 함수에는 await가 붙지 않는다)', () => {
    const code = kitSource.replace(/"""[\s\S]*?"""/g, '').replace(/#.*$/gm, '');
    expect(code).not.toMatch(/\b(rate|sleep|음표|화음|악기|input)\s*\(/);
  });

  it('미션 코드가 부르는 키트 이름은 모두 __all__에 있다', () => {
    const all = kitSource.match(/__all__ = \[([\s\S]*?)\]/)[1];
    const exported = new Set([...all.matchAll(/'([^']+)'/g)].map(m => m[1]));
    for (const mission of physicalMissions) {
      const calls = [...mission.solutionCode.matchAll(/^(?:\S+ = )?([가-힣_]+)\(/gm)].map(m => m[1]);
      for (const name of calls) {
        if (['거리센서', '반응하기'].includes(name)) continue;
        expect(exported.has(name), `${mission.id}: ${name}`).toBe(true);
      }
    }
  });

  it('학생 코드에 한 줄 조건식·컴프리헨션이 없다', () => {
    for (const mission of physicalMissions) {
      for (const code of [mission.starterCode, mission.solutionCode]) {
        const lines = code.split('\n').filter(line => !line.trim().startsWith('#'));
        for (const line of lines) {
          expect(line, mission.id).not.toMatch(/\bif\b.*\belse\b/);
          expect(line, mission.id).not.toMatch(/\[[^\]]*\bfor\b/);
        }
      }
    }
  });
});
