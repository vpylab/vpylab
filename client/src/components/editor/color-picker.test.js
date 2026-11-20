import { describe, expect, it, vi } from 'vitest';
import api from '../../engine/vpython-api.py?raw';
import { NAMED_COLORS, colorTexts, findColors, nameColorEdit, registerColorHelp, toBytes, toUnitColor } from './color-picker';

const texts = source => findColors(source).map(c => c.text);

function applyEdits(source, edits) {
  let result = source;
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }
  return result;
}

describe('색 찾기', () => {
  it('색 자리에 적은 vector만 찾고 위치·크기의 vector는 찾지 않는다', () => {
    const source = [
      'ball = sphere(pos=vector(2, 0, 0), color=vector(255, 128, 0), size=vec(1, 1, 1))',
      'ball.color = vec(0, 0.5, 1)',
      'scene.background = vector(10, 20, 30)',
      'ball.pos = vector(1, 0, 0)',
      'if ball.color == vector(1, 0, 0): pass',
    ].join('\n');
    expect(texts(source)).toEqual(['vector(255, 128, 0)', 'vec(0, 0.5, 1)', 'vector(10, 20, 30)']);
  });

  it('찾은 위치가 원문의 vector( … )와 정확히 같다', () => {
    const source = 'sphere(color = vector( 255 ,128, 0 ))\n  하늘 = vec(0,0,1)  \nbox(color=하늘)';
    for (const c of findColors(source)) expect(source.slice(c.start, c.end)).toMatch(/^(vector|vec)\s*\(.*\)$/);
    expect(texts(source)).toEqual(['vector( 255 ,128, 0 )', 'vec(0,0,1)']);
  });

  it('엔진과 같은 규칙으로 0~1과 0~255를 구분한다', () => {
    expect(toUnitColor(['1', '0', '0'])).toEqual([1, 0, 0]);
    expect(toUnitColor(['0.2', '.5', '1.'])).toEqual([0.2, 0.5, 1]);
    expect(toUnitColor(['255', '128', '0'])).toEqual([1, 128 / 255, 0]);
    expect(toUnitColor(['0', '2', '0'])).toEqual([0, 2 / 255, 0]);
    expect(toUnitColor(['1.3', '0.8', '0.5'])).toBeNull();
    expect(toUnitColor(['256', '0', '2'])).toBeNull();
    expect(toUnitColor(['255.0', '0', '0'])).toBeNull();
    expect(texts('sphere(color=vector(1.3, 0.8, 0.5))')).toEqual([]);
  });

  it('주석과 문자열 안은 찾지 않는다', () => {
    const source = '# color=vector(255, 0, 0)\nprint("color=vector(0, 255, 0) color.red")\n"""\ncolor.blue\n"""';
    expect(findColors(source)).toEqual([]);
  });

  it('color.red 같은 이름 색을 찾고, 속성 뒤나 다른 낱말은 찾지 않는다', () => {
    const found = findColors('a = sphere(color=color.red)\nb = a.color.x\nmy_color.red = 1\nc = color.redish\nd = color.skyblue');
    expect(found.map(c => [c.text, c.kind])).toEqual([['color.red', 'palette'], ['color.skyblue', 'palette']]);
    expect(found[1].unit).toEqual(NAMED_COLORS.skyblue);
  });

  it('이름을 붙인 색은 색 자리에 사용한 변수만 찾는다', () => {
    const source = '하늘빛 = vector(120, 200, 255)\n위치 = vector(120, 200, 255)\nsphere(pos=위치, color=하늘빛)';
    const found = findColors(source);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ kind: 'variable', name: '하늘빛', text: 'vector(120, 200, 255)' });
  });

  it('너무 긴 코드는 살펴보지 않는다', () => {
    expect(findColors('x = 1\n'.repeat(20_000) + 'sphere(color=color.red)')).toEqual([]);
  });
});

describe('고른 색 적기', () => {
  it('0~255 정수를 먼저, 0~1 소수를 다음으로 제안하고 vec 표기를 유지한다', () => {
    expect(colorTexts([1, 128 / 255, 0])).toEqual(['vector(255, 128, 0)', 'vector(1, 0.5, 0)']);
    expect(colorTexts([0, 0, 1], 'vec')[0]).toBe('vec(0, 0, 255)');
  });

  it('적은 값을 다시 읽으면 같은 색이다', () => {
    for (const unit of [[1, 1, 1], [0, 0, 0], [0.2, 0.4, 0.6], [1, 0, 0], [0.5, 0.004, 0]]) {
      const bytes = toBytes(unit);
      const back = toUnitColor(bytes.map(String));
      back.forEach((v, i) => expect(Math.abs(v - unit[i])).toBeLessThanOrEqual(1 / 255));
    }
  });

  it('세 값이 모두 0 또는 1이 되는 아주 어두운 색은 검정으로 적는다', () => {
    expect(toBytes([1 / 255, 0, 1 / 255])).toEqual([0, 0, 0]);
  });
});

describe('색에 이름 붙이기', () => {
  it('색을 한 줄로 꺼내고 새 이름 두 곳을 선택한다', () => {
    const source = 'ball = sphere(color=vector(255, 128, 0))\n';
    const plan = nameColorEdit(source, source.indexOf('255'));
    const result = applyEdits(source, plan.edits);
    expect(result).toBe('내색 = vector(255, 128, 0)\nball = sphere(color=내색)\n');
    expect(plan.selections.map(([a, b]) => result.slice(a, b))).toEqual(['내색', '내색']);
  });

  it('여러 줄 호출에서는 문장이 시작하는 줄 위에 들여쓰기를 맞춰 넣는다', () => {
    const source = 'while True:\n    ball = sphere(\n        pos=vector(0, 0, 0),\n        color=color.red,\n    )\n';
    const plan = nameColorEdit(source, source.indexOf('color.red') + 3, 'en');
    const result = applyEdits(source, plan.edits);
    expect(result).toBe('while True:\n    my_color = color.red\n    ball = sphere(\n        pos=vector(0, 0, 0),\n        color=my_color,\n    )\n');
    expect(plan.selections.map(([a, b]) => result.slice(a, b))).toEqual(['my_color', 'my_color']);
  });

  it('이미 있는 이름과 겹치지 않게 한다', () => {
    const source = '내색 = 1\n내색2 = 2\nbox(color=color.blue)';
    expect(nameColorEdit(source, source.indexOf('color.blue')).name).toBe('내색3');
  });

  it('색이 아닌 곳과 이미 이름이 있는 색에서는 제안하지 않는다', () => {
    const source = '하늘빛 = vector(120, 200, 255)\nsphere(pos=vector(1, 2, 3), color=하늘빛)';
    expect(nameColorEdit(source, source.indexOf('120'))).toBeNull();
    expect(nameColorEdit(source, source.indexOf('1, 2, 3'))).toBeNull();
  });
});

describe('엔진과의 일치', () => {
  it('NAMED_COLORS가 vpython-api.py의 _ColorPalette와 같다', () => {
    const body = api.slice(api.indexOf('class _ColorPalette'), api.indexOf('_name_map'));
    const engine = {};
    for (const m of body.matchAll(/^\s{4}(\w+)\s*=\s*(?:vector|_GrayColor)\(([^)]*)\)/gm)) {
      engine[m[1]] = m[2].split(',').map(Number);
    }
    expect(Object.keys(engine).length).toBeGreaterThanOrEqual(30);
    expect(NAMED_COLORS).toEqual(engine);
  });
});

describe('Monaco 등록', () => {
  function fakeMonaco() {
    const handles = [];
    const register = vi.fn(() => {
      const handle = { dispose: vi.fn() };
      handles.push(handle);
      return handle;
    });
    return {
      handles,
      register,
      monaco: {
        languages: { registerColorProvider: register, registerCodeActionProvider: register },
        editor: { addEditorAction: register },
      },
    };
  }

  it('중복 등록하지 않고 폐기 후 다시 등록할 수 있다', () => {
    const { monaco, register, handles } = fakeMonaco();
    const first = registerColorHelp(monaco);
    expect(registerColorHelp(monaco)).toBe(first);
    expect(register).toHaveBeenCalledTimes(3);
    first.dispose();
    handles.forEach(h => expect(h.dispose).toHaveBeenCalledOnce());
    registerColorHelp(monaco);
    expect(register).toHaveBeenCalledTimes(6);
  });

  it('Monaco에 색 기능이 없어도 예외를 밖으로 내지 않는다', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const monaco = { languages: {}, editor: {} };
    expect(() => registerColorHelp(monaco).dispose()).not.toThrow();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('색 선택 창에 0~255 표기를 넘기고 전구 동작을 색 위에서만 낸다', () => {
    const providers = [];
    const monaco = {
      languages: {
        registerColorProvider: (_id, p) => { providers.push(p); return { dispose() {} }; },
        registerCodeActionProvider: (_id, p) => { providers.push(p); return { dispose() {} }; },
      },
      editor: { addEditorAction: () => ({ dispose() {} }) },
    };
    registerColorHelp(monaco, () => 'en');
    const source = 'ball = sphere(pos=vec(1, 2, 3), color=vec(255, 0, 0))';
    const model = {
      getValue: () => source,
      getPositionAt: offset => ({ lineNumber: 1, column: offset + 1 }),
      getOffsetAt: position => position.column - 1,
      getValueInRange: range => source.slice(range.startColumn - 1, range.endColumn - 1),
    };
    const [colors, actions] = providers;
    const infos = colors.provideDocumentColors(model);
    expect(infos).toHaveLength(1);
    expect(infos[0].color).toEqual({ red: 1, green: 0, blue: 0, alpha: 1 });
    const picked = { range: infos[0].range, color: { red: 0, green: 1, blue: 0, alpha: 1 } };
    expect(colors.provideColorPresentations(model, picked).map(p => p.label)).toEqual(['vec(0, 255, 0)', 'vec(0, 1, 0)']);
    const at = text => ({ startLineNumber: 1, startColumn: source.indexOf(text) + 1 });
    expect(actions.provideCodeActions(model, at('255')).actions.map(a => a.title)).toEqual(['Name this color']);
    expect(actions.provideCodeActions(model, at('1, 2, 3')).actions).toEqual([]);
  });
});
