import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
import CodeEditor from './CodeEditor';

const mount = vi.hoisted(() => vi.fn());
vi.mock('./MonacoEditor', () => ({
  default: props => { mount(props); return null; },
}));

function EditorPage({ initial = '', readOnly = false }) {
  const [code, setCode] = useState(initial);
  return <><button>도구</button><CodeEditor code={code} onChange={setCode} readOnly={readOnly} /></>;
}

function editorModel() {
  let value = '';
  return {
    getValue: () => value, setValue: text => { value = text; },
    getModel: () => ({ getPositionAt: offset => ({ lineNumber: 1, column: offset + 1 }) }),
    setSelection: vi.fn(), setScrollTop: vi.fn(), focus: vi.fn(),
  };
}

afterEach(() => { cleanup(); mount.mockClear(); });

it('한글 조합이 끝나면 마지막 글자와 거꾸로 선택한 범위를 자동 완성 편집기에 넘긴다', async () => {
  render(<EditorPage initial="가" />);
  const input = screen.getByRole('textbox', { name: 'Python' });
  input.focus();
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: '가나' } });
  await waitFor(() => expect(mount).toHaveBeenCalled());
  const editor = editorModel();
  act(() => mount.mock.lastCall[0].onReady(editor));
  expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: '가나다' } });
  input.setSelectionRange(1, 3, 'backward');
  fireEvent.compositionEnd(input);
  await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Python' })).toBeNull());
  expect(editor.getValue()).toBe('가나다');
  expect(editor.setSelection).toHaveBeenCalledWith({
    selectionStartLineNumber: 1, selectionStartColumn: 4, positionLineNumber: 1, positionColumn: 2,
  });
  expect(editor.focus).toHaveBeenCalledOnce();
});

it('읽기 전용 코드를 먼저 보여주고 다른 도구로 옮긴 포커스를 지킨다', async () => {
  render(<EditorPage initial="sphere()" readOnly />);
  const input = screen.getByRole('textbox', { name: 'Python' });
  expect(input).toHaveAttribute('readonly');
  expect(input).toHaveValue('sphere()');
  const button = screen.getByRole('button', { name: '도구' });
  button.focus();
  await waitFor(() => expect(mount).toHaveBeenCalled());
  const editor = editorModel();
  act(() => mount.mock.lastCall[0].onReady(editor));
  expect(editor.focus).not.toHaveBeenCalled();
  expect(button).toHaveFocus();
});
