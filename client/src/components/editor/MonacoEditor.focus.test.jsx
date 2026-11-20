import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import MonacoEditor from './MonacoEditor';

const editorView = vi.hoisted(() => vi.fn(() => null));
vi.mock('@monaco-editor/react', () => ({ default: editorView, loader: { config: vi.fn() } }));
vi.mock('./monaco-python', () => ({}));

afterEach(() => { cleanup(); editorView.mockClear(); });

it.each([true, false])('편집기 준비 전 도구 버튼 선택 여부 %s에 따라 포커스를 유지한다', selected => {
  render(<><button>도구</button><MonacoEditor code="box()" /></>);
  const tool = screen.getByRole('button', { name: '도구' });
  if (selected) tool.focus();
  const subscription = () => ({ dispose() {} });
  const focus = vi.fn();
  editorView.mock.lastCall[0].onMount({
    focus, updateOptions: vi.fn(),
    onDidChangeModelContent: subscription, onDidScrollChange: subscription,
    onDidBlurEditorWidget: subscription, onMouseDown: subscription, onKeyDown: subscription,
  });
  expect(focus).toHaveBeenCalledTimes(selected ? 0 : 1);
  if (selected) expect(tool).toHaveFocus();
});
