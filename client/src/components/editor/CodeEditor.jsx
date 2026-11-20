import { lazy, Suspense } from 'react';
import useAppStore from '../../stores/appStore';

// 처음 편집기를 여는 순간 연결이 끊겨도 현재 코드를 수정·실행·저장할 수 있습니다.
function PlainEditor({ code, onChange, readOnly }) {
  return <textarea aria-label="Python" spellCheck={false} className="w-full h-full font-mono"
    value={code ?? ''} readOnly={readOnly} onChange={event => onChange?.(event.target.value)} />;
}

const MonacoEditor = lazy(() => import('./MonacoEditor').catch(() => ({ default: PlainEditor })));

export default function CodeEditor(props) {
  const locale = useAppStore(state => state.locale);
  return <Suspense fallback={<p role="status">{locale === 'ko' ? '편집기를 불러오는 중…' : 'Loading editor…'}</p>}>
    <MonacoEditor {...props} />
  </Suspense>;
}

export { DEFAULT_CODE } from '../../data/default-code';
