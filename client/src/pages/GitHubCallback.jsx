import { useEffect, useState } from 'react';
import { useUiText } from '../i18n/ui-text';
import { readCallbackParams, sendCallbackResult } from '../github/github-oauth.js';

/** 결과를 보낸 뒤 창을 닫기까지 두는 시간. 보낸 메시지가 연 쪽에 닿을 시간을 줍니다. */
const CLOSE_DELAY_MS = 150;

/**
 * GitHub 팀 프로젝트 애드온에서 GitHub 로그인 팝업이 돌아오는 화면(/github/callback).
 * 주소의 code·state(또는 error)를 BroadcastChannel로 연 쪽에 보내고, 주소에서 지운 뒤 창을 닫습니다.
 * window.opener는 사이트의 COOP 헤더 때문에 끊길 수 있어 사용하지 않습니다.
 * 스크립트로 닫을 수 없는 창이면 안내만 남깁니다.
 */
export default function GitHubCallback() {
  const ui = useUiText();
  // 주소를 지우기 전에 한 번만 읽습니다.
  const [message] = useState(() => readCallbackParams(window.location.search));

  useEffect(() => {
    // code가 브라우저 기록과 주소 표시줄에 남지 않게 합니다.
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
    if (!message) return undefined;
    sendCallbackResult(message);
    const timer = setTimeout(() => { try { window.close(); } catch { /* 닫을 수 없는 창 */ } }, CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [message]);

  let text = ui("이 화면은 GitHub 연결을 마칠 때 사용합니다. 이 창을 닫아도 됩니다.");
  if (message?.error) text = ui("GitHub 연결을 마치지 못했습니다. 이 창을 닫고 다시 연결할 수 있습니다.");
  else if (message) text = ui("GitHub 연결을 마쳤습니다. 이 창을 닫아도 됩니다.");

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--color-bg-primary, #fff)', color: 'var(--color-text-primary, #0f172a)' }}
      data-testid="github-callback"
    >
      <p className="m-0 text-sm" role="status">{text}</p>
    </main>
  );
}
