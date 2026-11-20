import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import useAppStore from '../../stores/appStore';

export default function CodeEditor({ code, onChange, readOnly = false, fontSize = 14 }) {
  const ko = useAppStore(state => state.locale) === 'ko';
  const [RichEditor, setRichEditor] = useState(null);
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  const plain = useRef(null);
  const rich = useRef(null);
  const composing = useRef(false);
  const compositionEndFrame = useRef(0);
  const focusWhenReady = useRef(false);
  const selection = useRef(null);

  useEffect(() => {
    let mounted = true;
    import('./MonacoEditor').then(
      module => { if (mounted) setRichEditor(() => module.default); },
      () => { if (mounted) setFailed(true); },
    );
    return () => { mounted = false; cancelAnimationFrame(compositionEndFrame.current); };
  }, []);

  const activate = useCallback(() => {
    const input = plain.current;
    const editor = rich.current;
    if (!input || !editor || composing.current) return;
    if (editor.getValue() !== input.value) editor.setValue(input.value);
    focusWhenReady.current = document.activeElement === document.body && !input.readOnly;
    if (document.activeElement === input) {
      const backward = input.selectionDirection === 'backward';
      selection.current = {
        anchor: backward ? input.selectionEnd : input.selectionStart,
        cursor: backward ? input.selectionStart : input.selectionEnd,
        scrollTop: input.scrollTop,
      };
    }
    setActive(true);
  }, []);

  const onReady = useCallback(editor => {
    rich.current = editor;
    activate();
  }, [activate]);

  useLayoutEffect(() => {
    if (!active) return;
    const editor = rich.current;
    const saved = selection.current;
    if (saved) {
      const model = editor.getModel();
      const anchor = model.getPositionAt(saved.anchor);
      const cursor = model.getPositionAt(saved.cursor);
      editor.setSelection({
        selectionStartLineNumber: anchor.lineNumber, selectionStartColumn: anchor.column,
        positionLineNumber: cursor.lineNumber, positionColumn: cursor.column,
      });
      editor.setScrollTop(saved.scrollTop);
      if (document.activeElement === document.body) editor.focus();
      selection.current = null;
    } else if (focusWhenReady.current && document.activeElement === document.body) {
      editor.focus();
    }
  }, [active]);

  return (
    <div className="relative h-full w-full min-h-0">
      {!active && <div className="absolute inset-0 flex flex-col" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="px-3 py-1 text-xs" role="status" style={{ color: 'var(--color-text-secondary)' }}>
          {failed ? (ko ? '기본 편집기' : 'Basic editor')
            : readOnly ? (ko ? '편집기 준비 중…' : 'Preparing the editor…')
              : (ko ? '지금 입력할 수 있습니다. 자동 완성 준비 중…' : 'You can type now. Preparing autocomplete…')}
        </div>
        <textarea ref={plain} aria-label="Python" spellCheck={false} autoCapitalize="off" autoCorrect="off"
          className="w-full min-h-0 flex-1 resize-none border-0 px-4 py-3 font-mono"
          style={{ fontSize, background: 'var(--color-bg-panel)', color: 'var(--color-text-primary)' }}
          value={code ?? ''} readOnly={readOnly} onChange={event => onChange?.(event.target.value)}
          onCompositionStart={() => {
            cancelAnimationFrame(compositionEndFrame.current);
            composing.current = true;
          }}
          onCompositionEnd={() => {
            // 마지막 한글 입력이 DOM과 onChange에 반영된 뒤 커서를 넘깁니다.
            compositionEndFrame.current = requestAnimationFrame(() => {
              composing.current = false;
              activate();
            });
          }}
        />
      </div>}
      {RichEditor && <div className="h-full w-full" inert={!active} style={{ visibility: active ? 'visible' : 'hidden' }}>
        <RichEditor code={code} onChange={onChange} readOnly={readOnly} fontSize={fontSize} onReady={onReady} />
      </div>}
    </div>
  );
}

export { DEFAULT_CODE } from '../../data/default-code';
