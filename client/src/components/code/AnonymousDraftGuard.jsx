import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';

export default function AnonymousDraftGuard({ code, save, onDownload, locale }) {
  const [failed, setFailed] = useState(false);
  const pending = useRef(true);
  const ko = locale === 'ko';

  const flush = useCallback(() => {
    if (!pending.current) return true;
    const saved = save();
    pending.current = !saved;
    setFailed(!saved);
    return saved;
  }, [save]);

  useEffect(() => {
    pending.current = true;
    const timer = setTimeout(flush, 800);
    return () => clearTimeout(timer);
  }, [code, flush]);

  // 타이머가 끝나기 전에 닫거나 다른 화면으로 이동해도 마지막 편집을 먼저 보관합니다.
  useEffect(() => {
    const beforeUnload = event => {
      if (flush()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [flush]);

  const blocker = useBlocker(useCallback(() => !flush(), [flush]));
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(ko ? '최신 코드를 이 브라우저에 보관하지 못했습니다. 그래도 이동할까요?' : 'Your latest code could not be saved in this browser. Leave anyway?')) blocker.proceed();
    else blocker.reset();
  }, [blocker, ko]);

  if (!failed) return null;
  return (
    <div role="alert" className="flex items-center gap-3 px-4 py-2 text-sm">
      <span>{ko ? '최신 코드를 이 브라우저에 보관하지 못했습니다. 나가기 전에 파일로 저장하세요.' : 'Your latest code could not be saved in this browser. Download it before leaving.'}</span>
      <button type="button" className="toolbar-btn" onClick={onDownload}>{ko ? '.py 내려받기' : 'Download .py'}</button>
    </div>
  );
}
