import { DEFAULT_CODE, getDefaultCode } from '../../data/default-code';
import { useRef, useCallback, useEffect, useState } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from './monaco-python';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import useAppStore from '../../stores/appStore';
import { vocabularyWord } from '../../data/code-vocabulary';
import { claimWordTip, rememberWord } from '../../utils/word-help';
import useAuthStore from '../../stores/authStore';
import TypingWordTip from '../learning/TypingWordTip';
import { registerPythonHelp, pythonContext, completionChoices } from './python-completions';

// Monaco Web Worker 설정 — 누락 시 "MonacoEnvironment.getWorker" 오류 발생
self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  },
};

loader.config({ monaco });

const MONACO_THEME_MAP = {
  'creative-light': 'vs',
  'deep-dark': 'vs-dark',
  'ocean-breeze': 'vs',
  'sunset-glow': 'vs',
  'forest-night': 'vs-dark',
  'lavender-dream': 'vs',
  'midnight-purple': 'vs-dark',
  'rose-garden': 'vs',
  'cyber-neon': 'vs-dark',
};

export default function CodeEditor({ code, onChange, fontSize = 14, readOnly = false }) {
  const editorRef = useRef(null),hostRef=useRef(null),cleanupRef=useRef(()=>{});
  const [tip,setTip]=useState(null);
  const locale=useAppStore(s=>s.locale),owner=useAuthStore(s=>s.user?.id);
  useEffect(()=>()=>cleanupRef.current(),[]);
  const theme = useAppStore((s) => s.theme);

  const handleMount = useCallback((editor) => {
    editorRef.current = editor;
    editor.focus();
    // 폰트 합자 명시적 OFF — props만으로 안 먹는 환경 방어
    editor.updateOptions({ fontLigatures: false });
    cleanupRef.current();
    let pending=null,hideTimer=null,lastKey='',candidate=null;
    const hide=()=>{clearTimeout(pending);clearTimeout(hideTimer);setTip(null);};
    const dismiss=()=>{candidate=null;hide();};
    const changed=editor.onDidChangeModelContent(event=>{
      hide();
      const model=editor.getModel();
      if(!model||event.isFlush||event.isUndoing||event.isRedoing||event.changes.length!==1||event.changes[0].text.length>30||event.changes[0].text.includes('\n')){lastKey='';candidate=null;return;}
      const edit=event.changes[0],editStart=model.getOffsetAt({lineNumber:edit.range.startLineNumber,column:edit.range.startColumn}),end=editStart+edit.text.length,prefix=model.getValue().slice(0,end);
      if(!model.getValue()||edit.rangeLength>0&&(!candidate||editStart<candidate.end)){lastKey='';candidate=null;}
      if(prefix.length>100000||pythonContext(prefix).blocked){candidate=null;return;}
      const match=prefix.match(/([\p{L}_][\p{L}\p{N}_]*)[ \t]*(?:[=(])?[ \t]*$/u),term=match&&vocabularyWord(match[1],prefix),start=match?prefix.length-match[0].length:-1;
      if(term)candidate={term,key:term.id+':'+start,start,end:start+match[1].length,line:edit.range.startLineNumber,time:Date.now()};
      else if(candidate&&(candidate.line!==edit.range.startLineNumber||Date.now()-candidate.time>6000||start===candidate.start))candidate=null;
      const show=(attempt=0)=>{
        if(!editor.hasTextFocus()||!candidate||candidate.key===lastKey)return;
        const p=editor.getPosition();if(!p||p.lineNumber!==candidate.line||model.getOffsetAt(p)<candidate.end)return;
        const fullWord=model.getWordAtPosition(p)?.word;if(fullWord?.startsWith(candidate.term.id)&&fullWord!==candidate.term.id)return;
        const widget=editor.getDomNode()?.querySelector('.suggest-widget.visible');
        if(widget){
          const allOptions=completionChoices(prefix),options=allOptions.filter(c=>c.name===candidate.term.id),longer=allOptions.some(c=>c.name.startsWith(candidate.term.id)&&c.name!==candidate.term.id);
          const exact=match?.[0].trim()===candidate.term.id&&term?.id===candidate.term.id&&!longer&&options.length>0&&options.every(c=>c.insertText===c.name);
          if(!exact){if(attempt<5)pending=setTimeout(()=>show(attempt+1),200);return;}
        }
        const userId=useAuthStore.getState().user?.id,point=editor.getScrolledVisiblePosition(p),host=hostRef.current,dom=editor.getDomNode();
        if(!point||!host||!dom||!claimWordTip(userId,candidate.term.id))return;
        if(widget)editor.trigger('word-help','hideSuggestWidget',{});
        lastKey=candidate.key;const width=Math.min(320,host.clientWidth-16),relativeTop=dom.getBoundingClientRect().top-host.getBoundingClientRect().top,below=relativeTop+point.top+point.height+8;
        setTip({term:candidate.term,owner:userId,left:Math.max(8,Math.min(point.left,host.clientWidth-width-8)),top:below+215<host.clientHeight?below:Math.max(8,relativeTop+point.top-215),width});
        hideTimer=setTimeout(()=>setTip(null),6000);
      };
      pending=setTimeout(show,320);
    });
    const scroll=editor.onDidScrollChange(e=>{if(e.scrollTopChanged||e.scrollLeftChanged)dismiss();}),blur=editor.onDidBlurEditorWidget(dismiss),mouse=editor.onMouseDown(e=>{if(!e.target.element?.closest('.suggest-widget'))dismiss();}),keys=editor.onKeyDown(e=>{if(e.keyCode===monaco.KeyCode.Escape)dismiss();});
    cleanupRef.current=()=>{clearTimeout(pending);clearTimeout(hideTimer);changed.dispose();scroll.dispose();blur.dispose();mouse.dispose();keys.dispose();};

  }, []);

  return (
    <div ref={hostRef} className="h-full w-full overflow-hidden flex flex-col relative" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="flex justify-end px-3 py-1 shrink-0"><button type="button" disabled={readOnly} onClick={()=>{editorRef.current?.focus();editorRef.current?.trigger('word-help','editor.action.triggerSuggest',{});}} className="text-xs border-0 bg-transparent cursor-pointer" style={{color:'var(--color-text-muted)'}} title={locale==='ko'?'Tab으로 적용 · Esc로 닫기':'Tab to accept · Esc to close'}>{locale==='ko'?'자동 완성':'Complete'}</button></div>
      <div className="flex-1 min-h-0"><Editor
        height="100%"
        language="python"
        theme={MONACO_THEME_MAP[theme] || 'vs-dark'}
        value={code ?? getDefaultCode(locale)}
        onChange={onChange}
        onMount={handleMount}
        beforeMount={instance=>registerPythonHelp(instance,()=>useAppStore.getState().locale||'ko')}
        options={{
          readOnly,
          fontSize,
          fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, Consolas, monospace",
          fontLigatures: false,  // 학생이 != 를 ≠ 로 오인하지 않도록 합자 OFF
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          roundedSelection: true,
          padding: { top: 12 },
          tabSize: 4,
          insertSpaces: true,
          automaticLayout: true,
          wordWrap: 'on',
          bracketPairColorization: { enabled: true },
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          quickSuggestions: {other:true,comments:false,strings:false},
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'off',
          wordBasedSuggestions: 'off',
          parameterHints: {enabled:true},
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
        }}
      /></div>
      {tip&&tip.owner===owner&&<TypingWordTip tip={tip} ko={locale==='ko'} onClose={()=>setTip(null)} onRemember={()=>{rememberWord(owner,tip.term.id);setTip(null);}}/>}
    </div>
  );
}

export { DEFAULT_CODE };
