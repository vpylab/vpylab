import { describe, expect, it } from 'vitest';
import english from '../i18n/catalogs/en-ui-text.json';
import { hasPython, runPythonJobs } from '../test/python-runner';
import { builtInModule, factoryName, moduleProgram } from './modules';
import { DEFAULT_PLACEMENT, PLACEMENT_SLIDERS, colorVectorText, hexToBytes, normalizePlacement, placementCode } from './placement';

describe('놓아 보기 값', () => {
  it('범위를 벗어나거나 잘못된 값을 쓸 수 있는 값으로 맞춘다', () => {
    expect(normalizePlacement(null)).toEqual(DEFAULT_PLACEMENT);
    expect(normalizePlacement({ x: 99, y: 'abc', z: -99, scale: 0, angle: 1000, axis: 'w', tint: 'red' }))
      .toEqual({ x: 3, y: 0, z: -3, scale: 0.3, angle: 345, axis: 'y', tint: '#ffffff' });
    expect(normalizePlacement({ scale: 0.30000000000000004 + 0.4, tint: '#FFAA00', axis: 'z' }))
      .toMatchObject({ scale: 0.7, tint: '#ffaa00', axis: 'z' });
  });

  it('슬라이더 문구에 영어 번역이 있다', () => {
    for (const slider of PLACEMENT_SLIDERS) expect(english[slider.label]).toBeTruthy();
  });
});

describe('색 표기', () => {
  it('색을 0~255 정수로 적는다', () => {
    expect(hexToBytes('#f8a8cc')).toEqual([248, 168, 204]);
    expect(colorVectorText('#f8a8cc')).toBe('vector(248, 168, 204)');
    expect(colorVectorText('#ffffff')).toBe('vector(255, 255, 255)');
  });

  it('엔진이 0~1 색으로 읽을 값은 검정으로 적는다', () => {
    expect(colorVectorText('#000000')).toBe('vector(0, 0, 0)');
    expect(colorVectorText('#010001')).toBe('vector(0, 0, 0)');
  });

  it('잘못된 색 문자열은 흰색으로 읽는다', () => {
    expect(hexToBytes('pink')).toEqual([255, 255, 255]);
  });
});

describe('사용 코드', () => {
  it('기본값이면 만들기 줄만 적는다', () => {
    expect(placementCode('make_bell_ab12cd34', DEFAULT_PLACEMENT)).toBe('friend = make_bell_ab12cd34(\n    pos=vector(0, 0, 0), scale=1\n)');
  });

  it('바꾼 값만 줄을 더한다', () => {
    const code = placementCode('make_bell_ab12cd34', { x: 1.5, y: 0, z: -2, scale: 1.3, angle: 90, axis: 'z', tint: '#ffb450' });
    expect(code.split('\n')).toEqual([
      'friend = make_bell_ab12cd34(',
      '    pos=vector(1.5, 0, -2), scale=1.3',
      ')',
      'friend.object.rotate(angle=radians(90), axis=vector(0, 0, 1))',
      'friend.object.color = vector(255, 180, 80)',
    ]);
  });
});

describe('만든 코드 실행', () => {
  it.skipIf(!hasPython())('사용 코드가 완성 모듈 코드 아래에서 오류 없이 실행되고 묶음을 옮기고 돌리고 색을 바꾼다', () => {
    const module = builtInModule('bell');
    const usage = placementCode(factoryName(module), { x: 1.5, y: 0, z: -2, scale: 1.3, angle: 90, axis: 'z', tint: '#ffb450' });
    const code = moduleProgram(module, { metadata: false }) + '\n' + usage + '\n';
    const result = runPythonJobs([{ id: 'place', label: 'forge', code }]).get('place:forge');
    expect(result.error).toBeNull();
    const compounds = result.commands.filter(c => c.action === 'compound');
    expect(compounds).toHaveLength(2);
    const updates = result.commands.filter(c => c.action === 'update' && c.id === compounds[1].id);
    expect(updates.some(c => Array.isArray(c.color) && c.color.join() === '255,180,80')).toBe(true);
    expect(updates.some(c => c.axis || c.up)).toBe(true);
  });
});
