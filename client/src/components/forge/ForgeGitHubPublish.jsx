import { useEffect, useState } from 'react';
import { useUiText } from '../../i18n/ui-text';
import { GITHUB_REASON_TEXT, isGitHubConfigured, useGitHubStore } from '../../github/githubSession.js';
import { publishForgeModule } from '../../forge/github-registry.js';
import { FORGE_GITHUB_TEXT } from '../../forge/forge-text.js';

/**
 * 대장간 작업대의 공개 등록(GitHub 방식, 오픈소스 판의 애드온).
 * GitHub에 연결한 학생의 저장소 `<아이디>/vpylab-forge`에 지금 모듈을 올립니다. 모두의 모듈에는 교사가 승인한 뒤에 표시됩니다.
 * 이 파일은 지연 로딩되고 AddonBoundary 안에서 그려집니다. 불러오지 못해도 대장간의 나머지는 그대로 동작합니다.
 * @param {object} props
 * @param {object} props.module 작업대의 지금 모듈
 * @param {(module: object, previousId: string) => void} [props.onPublished] 올린 모듈(모듈 ID가 새로 정해졌을 수 있음)과 등록을 누른 때의 모듈 ID
 * @param {typeof publishForgeModule} [props.publish]
 */
/** 올린 내용을 구별하는 값. 결과 안내는 그 내용이 작업대에 그대로 있을 때만 보입니다(다른 모듈을 열거나 고치면 사라집니다). */
const signatureOf = (module) => JSON.stringify([module.title, module.description, module.recipe, module.references || [], module.source || null]);

export default function ForgeGitHubPublish({ module, onPublished, publish = publishForgeModule }) {
  const ui = useUiText();
  const account = useGitHubStore((state) => state.account);
  const needsReauth = useGitHubStore((state) => state.needsReauth);
  const missingScope = useGitHubStore((state) => state.missingScope);
  const busy = useGitHubStore((state) => state.busy);
  const error = useGitHubStore((state) => state.error);
  const [working, setWorking] = useState(false);
  const [outcome, setOutcome] = useState(null); // { signature, text, fileUrl } 또는 { signature, failed }
  const signature = signatureOf(module);
  const shown = outcome && outcome.signature === signature ? outcome : null;

  useEffect(() => { useGitHubStore.getState().restore(); }, []);

  if (!isGitHubConfigured()) return null;
  const connected = Boolean(account) && !needsReauth && !missingScope;

  // 팝업은 클릭 처리 안에서 열어야 합니다. connect()가 await 전에 창을 엽니다.
  const connect = () => { setOutcome(null); useGitHubStore.getState().connect(); };

  const submit = async () => {
    const asked = module;
    const askedSignature = signature;
    setWorking(true);
    setOutcome(null);
    try {
      const done = await publish(asked);
      onPublished?.(done.module, asked.id);
      const text = !done.changed ? FORGE_GITHUB_TEXT.unchanged : done.fresh ? FORGE_GITHUB_TEXT.publishedFresh : FORGE_GITHUB_TEXT.published;
      setOutcome({ signature: askedSignature, text, fileUrl: done.module.fileUrl });
    } catch (e) {
      setOutcome({ signature: askedSignature, failed: e?.message || FORGE_GITHUB_TEXT.publishFailed });
    } finally {
      setWorking(false);
    }
  };

  // 알림은 하나만 보입니다. 연결 상태의 안내(만료, 권한 부족 등)가 있으면 그것을, 없으면 이번 등록의 실패 까닭을 보입니다.
  const connectError = !connected && error ? GITHUB_REASON_TEXT[error.reason] || GITHUB_REASON_TEXT.unknown : '';
  const alertText = connectError || shown?.failed || '';
  return (
    <details className="forge-publish" data-testid="forge-github-publish">
      <summary>{ui("다른 사람도 쓰게 모두의 모듈에 공개하기")}</summary>
      <p>{ui(FORGE_GITHUB_TEXT.publishIntro)}</p>
      {module.source && <p>{ui("원본 출처:")} {module.source.title} · {module.source.author}</p>}
      {connected ? (
        <>
          <p>{ui("GitHub 아이디 ·")} {account.login}</p>
          <button type="button" className="btn-primary" disabled={working || !module.title.trim()} onClick={submit} data-testid="forge-github-publish-button">
            {working ? ui("등록 중…") : ui("모두의 모듈에 공개 등록")}
          </button>
        </>
      ) : (
        <>
          <p>{ui(FORGE_GITHUB_TEXT.needConnect)}</p>
          <button type="button" className="btn-primary" disabled={busy === 'connect'} onClick={connect} data-testid="forge-github-connect">
            {busy === 'connect' ? ui("GitHub 창에서 연결을 진행하고 있습니다…") : account ? ui("다시 연결") : ui("GitHub 연결")}
          </button>
        </>
      )}
      {alertText && <p role="alert" data-testid="forge-github-error">{ui(alertText)}</p>}
      {shown?.text && (
        <p role="status" data-testid="forge-github-result">
          {ui(shown.text)} <a href={shown.fileUrl} target="_blank" rel="noopener noreferrer">{ui("GitHub에서 보기")} ↗</a>
        </p>
      )}
    </details>
  );
}
