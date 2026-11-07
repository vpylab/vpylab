import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const here = resolve(__dirname);

describe('Python 전용 Monaco', () => {
  it('편집기는 모든 언어를 담은 monaco-editor 진입점 대신 Python 전용 모듈을 불러온다', () => {
    const editor = readFileSync(resolve(here, 'CodeEditor.jsx'), 'utf8');
    expect(editor).not.toMatch(/from 'monaco-editor'/);
    expect(editor).toMatch(/from '\.\/monaco-python'/);
  });

  it('Python 문법 색과 편집 기능 전체(edcore)를 불러온다', () => {
    const src = readFileSync(resolve(here, 'monaco-python.js'), 'utf8');
    expect(src).toMatch(/edcore\.main\.js/);
    expect(src).toMatch(/basic-languages\/python\/python\.contribution\.js/);
    expect(src).not.toMatch(/language\/typescript|editor\.main\.js/);
  });
});
