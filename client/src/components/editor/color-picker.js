/**
 * 편집기 안 색 선택 (애드온)
 *
 * 코드에서 색으로 사용한 vector(r, g, b)와 color.red 옆에 색 네모를 표시하고,
 * 네모를 누르면 Monaco의 색 선택 창이 열립니다. 고른 색은 0~255 정수로 적습니다.
 * "색에 이름 붙이기"는 그 색을 `이름 = vector(...)` 한 줄로 꺼내고 이름을 바로 입력하게 합니다.
 *
 * 이름은 학생 코드의 변수로 남습니다. 따로 저장하는 값이 없으므로 코드를 저장한 곳
 * (드라이브, 공유 링크, 내려받은 파일)이면 어디서든 그대로 동작합니다.
 * 이 파일을 불러오지 못해도 편집기와 실행은 달라지지 않습니다.
 */
import { pythonContext } from './python-completions';
import './color-picker.css';

// 엔진(vpython-api.py)의 _ColorPalette와 같은 값. 어긋나면 color-picker.test.js가 실패합니다.
export const NAMED_COLORS = {
  red: [1, 0, 0], green: [0, 1, 0], blue: [0, 0, 1], yellow: [1, 1, 0], cyan: [0, 1, 1],
  magenta: [1, 0, 1], orange: [1, 0.6, 0], white: [1, 1, 1], black: [0, 0, 0],
  gray: [0.5, 0.5, 0.5], purple: [0.4, 0.2, 0.6], pink: [1, 0.75, 0.8], brown: [0.6, 0.3, 0.1],
  gold: [1, 0.84, 0], silver: [0.75, 0.75, 0.75], navy: [0, 0, 0.5], skyblue: [0.53, 0.81, 0.92],
  lime: [0.5, 1, 0], olive: [0.5, 0.5, 0], coral: [1, 0.5, 0.31], salmon: [0.98, 0.5, 0.45],
  violet: [0.56, 0, 1], indigo: [0.29, 0, 0.51], beige: [0.96, 0.96, 0.86], mint: [0.6, 1, 0.8],
  peach: [1, 0.85, 0.73], lavender: [0.71, 0.49, 0.86], maroon: [0.5, 0, 0], teal: [0, 0.5, 0.5],
  ivory: [1, 1, 0.94],
};

const MAX_SOURCE = 100_000;
const MAX_COLORS = 300;
const COLOR_FIELDS = 'color|background|ambient|trail_color|start_face_color|end_face_color';
const NAME = '[\\p{L}_][\\p{L}\\p{N}_]*';
const NUMBER = '(?:\\d+\\.?\\d*|\\.\\d+)';
const VECTOR = `(vector|vec)\\s*\\(\\s*(${NUMBER})\\s*,\\s*(${NUMBER})\\s*,\\s*(${NUMBER})\\s*\\)`;

// color=vector(…), ball.color = vec(…), scene.background = vector(…)
const DIRECT = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${COLOR_FIELDS})\\s*=\\s*${VECTOR}`, 'gu');
// color=하늘빛 처럼 색 자리에 사용한 변수 이름
const USED_NAME = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${COLOR_FIELDS})\\s*=\\s*(${NAME})(?![\\p{L}\\p{N}_.(\\[])`, 'gu');
// 하늘빛 = vector(…) 한 줄
const ASSIGNED = new RegExp(`^([ \\t]*)(${NAME})[ \\t]*=[ \\t]*${VECTOR}[ \\t]*$`, 'gmu');
// color.red
const PALETTE = new RegExp(`(?<![\\p{L}\\p{N}_.])color\\.(${Object.keys(NAMED_COLORS).join('|')})(?![\\p{L}\\p{N}_])`, 'gu');

/**
 * 숫자 세 개를 0~1 색으로 바꿉니다. 엔진의 규칙과 같습니다.
 * 모두 0~1이면 그대로, 모두 0~255 정수이고 하나라도 1보다 크면 255로 나눕니다.
 * 그 밖의 값(1.3처럼 밝기를 올린 색)은 색 선택 대상으로 삼지 않습니다.
 */
export function toUnitColor(parts) {
  const values = parts.map(Number);
  if (values.some(v => !Number.isFinite(v) || v < 0)) return null;
  if (values.every(v => v <= 1)) return values;
  const wholeBytes = parts.every(p => /^\d+$/.test(p)) && values.every(v => v <= 255);
  return wholeBytes ? values.map(v => v / 255) : null;
}

/** 0~1 색을 0~255 정수 세 개로 바꿉니다. */
export function toBytes(unit) {
  const bytes = unit.map(v => Math.max(0, Math.min(255, Math.round(v * 255))));
  // 세 값이 모두 0 또는 1이면 엔진이 0~1 색으로 읽습니다. 눈으로 구별되지 않는 검정으로 적습니다.
  return bytes.every(v => v <= 1) ? [0, 0, 0] : bytes;
}

function vectorColor(match, offset, groupStart) {
  const fn = match[groupStart];
  const parts = [match[groupStart + 1], match[groupStart + 2], match[groupStart + 3]];
  const unit = toUnitColor(parts);
  if (!unit) return null;
  // 일치한 문자열은 `color=vector(…)`나 `이름 = vector(…)`이므로, 그 안에서 vector( 가 시작하는 곳을 찾습니다.
  const start = offset + match[0].search(/(?:vector|vec)\s*\(/);
  return { start, end: offset + match[0].trimEnd().length, unit, fn };
}

/**
 * 코드에서 색 선택 대상을 찾습니다.
 * kind: 'literal'(색 자리에 직접 적은 vector), 'variable'(이름을 붙인 색), 'palette'(color.red)
 */
export function findColors(source) {
  if (!source || source.length > MAX_SOURCE) return [];
  const masked = pythonContext(source).masked;
  const found = [];
  const taken = new Set();
  function add(item, kind, extra) {
    if (!item || taken.has(item.start)) return;
    taken.add(item.start);
    found.push({ ...item, kind, text: source.slice(item.start, item.end), ...extra });
  }

  for (const m of masked.matchAll(DIRECT)) add(vectorColor(m, m.index, 1), 'literal');

  const usedNames = new Set();
  for (const m of masked.matchAll(USED_NAME)) usedNames.add(m[1]);
  for (const m of masked.matchAll(ASSIGNED)) {
    if (usedNames.has(m[2])) add(vectorColor(m, m.index, 3), 'variable', { name: m[2] });
  }

  for (const m of masked.matchAll(PALETTE)) {
    add({ start: m.index, end: m.index + m[0].length, unit: NAMED_COLORS[m[1]], fn: 'vector' }, 'palette');
  }
  return found.sort((a, b) => a.start - b.start).slice(0, MAX_COLORS);
}

function trimNumber(value) {
  return String(Number(value.toFixed(2)));
}

/** 고른 색을 코드로 적는 두 가지 방법. 첫째가 기본(0~255 정수)입니다. */
export function colorTexts(unit, fn = 'vector') {
  const bytes = toBytes(unit);
  return [
    `${fn}(${bytes.join(', ')})`,
    `${fn}(${unit.map(trimNumber).join(', ')})`,
  ];
}

/** 여러 줄에 걸친 호출 안에서도 문장이 시작하는 줄의 위치를 찾습니다. */
function statementStart(masked, offset) {
  let lineStart = masked.lastIndexOf('\n', offset - 1) + 1;
  while (lineStart > 0) {
    let depth = 0;
    for (let i = 0; i < lineStart; i++) {
      const c = masked[i];
      if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) depth = Math.max(0, depth - 1);
    }
    if (depth === 0) break;
    lineStart = masked.lastIndexOf('\n', lineStart - 2) + 1;
  }
  return lineStart;
}

function freshName(masked, base) {
  const names = new Set(masked.match(new RegExp(NAME, 'gu')) || []);
  if (!names.has(base)) return base;
  let n = 2;
  while (names.has(base + n)) n++;
  return base + n;
}

/**
 * offset 위치의 색에 이름을 붙이는 편집을 만듭니다.
 * 반환: { edits: [{start, end, text}], selections: [[start, end], [start, end]] } 또는 null
 * selections는 편집을 적용한 뒤의 위치이며, 새 이름 두 곳을 함께 선택해 바로 고쳐 쓰게 합니다.
 */
export function nameColorEdit(source, offset, locale = 'ko') {
  const target = findColors(source).find(c => c.kind !== 'variable' && offset >= c.start && offset <= c.end);
  if (!target) return null;
  const masked = pythonContext(source).masked;
  const lineStart = statementStart(masked, target.start);
  const indent = source.slice(lineStart).match(/^[ \t]*/)[0];
  const name = freshName(masked, locale === 'ko' ? '내색' : 'my_color');
  const line = `${indent}${name} = ${target.text}\n`;
  const nameAtLine = lineStart + indent.length;
  const nameAtUse = target.start + line.length;
  return {
    name,
    edits: [
      { start: lineStart, end: lineStart, text: line },
      { start: target.start, end: target.end, text: name },
    ],
    selections: [[nameAtLine, nameAtLine + name.length], [nameAtUse, nameAtUse + name.length]],
  };
}

const NAME_COLOR_ID = 'vpylab.nameColor';
const registrations = new WeakMap();

function modelRange(model, start, end) {
  const a = model.getPositionAt(start), b = model.getPositionAt(end);
  return { startLineNumber: a.lineNumber, startColumn: a.column, endLineNumber: b.lineNumber, endColumn: b.column };
}

function runNameColor(editor, getLocale) {
  const model = editor.getModel(), position = editor.getPosition();
  if (!model || !position) return;
  const plan = nameColorEdit(model.getValue(), model.getOffsetAt(position), getLocale());
  if (!plan) return;
  editor.pushUndoStop();
  editor.executeEdits('vpylab-color', plan.edits.map(e => ({ range: modelRange(model, e.start, e.end), text: e.text })));
  editor.setSelections(plan.selections.map(([start, end]) => {
    const r = modelRange(model, start, end);
    return { selectionStartLineNumber: r.startLineNumber, selectionStartColumn: r.startColumn, positionLineNumber: r.endLineNumber, positionColumn: r.endColumn };
  }));
  editor.pushUndoStop();
  editor.focus();
}

/** Monaco에 색 선택과 "색에 이름 붙이기"를 한 번만 등록합니다. 실패해도 편집기는 그대로 동작합니다. */
export function registerColorHelp(monaco, getLocale = () => 'ko') {
  const existing = registrations.get(monaco);
  if (existing) return existing;
  const disposables = [];
  const title = () => (getLocale() === 'ko' ? '색에 이름 붙이기' : 'Name this color');
  try {
    disposables.push(monaco.languages.registerColorProvider('python', {
      provideDocumentColors(model) {
        return findColors(model.getValue()).map(c => ({
          range: modelRange(model, c.start, c.end),
          color: { red: c.unit[0], green: c.unit[1], blue: c.unit[2], alpha: 1 },
        }));
      },
      provideColorPresentations(model, info) {
        const fn = /^vec\s*\(/.test(model.getValueInRange(info.range)) ? 'vec' : 'vector';
        const unit = [info.color.red, info.color.green, info.color.blue];
        return colorTexts(unit, fn).map(text => ({ label: text, textEdit: { range: info.range, text } }));
      },
    }));
    disposables.push(monaco.languages.registerCodeActionProvider('python', {
      provideCodeActions(model, range) {
        const offset = model.getOffsetAt({ lineNumber: range.startLineNumber, column: range.startColumn });
        const plan = nameColorEdit(model.getValue(), offset, getLocale());
        const actions = plan ? [{ title: title(), kind: 'refactor.extract', command: { id: NAME_COLOR_ID, title: title() } }] : [];
        return { actions, dispose() {} };
      },
    }));
    disposables.push(monaco.editor.addEditorAction({
      id: NAME_COLOR_ID,
      label: title(),
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 1.5,
      run: editor => runNameColor(editor, getLocale),
    }));
  } catch (error) {
    console.warn('색 선택 기능을 켜지 못했습니다.', error);
  }
  const handle = {
    dispose() {
      disposables.forEach(d => d.dispose());
      registrations.delete(monaco);
    },
  };
  registrations.set(monaco, handle);
  return handle;
}
