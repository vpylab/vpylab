import { externalLabel, otherLabel } from './external-labels';
import { useHelpText } from './help-text';
import './help.css';

/**
 * "여기를 누릅니다" 그림. 구글·GitHub·브라우저의 실제 화면을 캡처하지 않고 창의 모양만 단순하게 직접 그렸습니다.
 * 로고는 그리지 않고 "구글 창", "GitHub 창"이라는 글자로 구분합니다. 학생이 실제 화면에서 찾을 글자만 정확히 적습니다
 * (external-labels.js). 그림은 role="img"와 글로 된 설명을 갖고, 그림 아래에 실제 화면과 다를 수 있다는 안내를 둡니다.
 */

/** 그림 한 장: 창 모양의 틀과 대체 설명, 아래 안내 줄. quiet는 바로 앞 그림에서 이미 한 안내를 되풀이하지 않습니다. */
function Sketch({ kind, title, label, others, quiet, children }) {
  const { h } = useHelpText();
  const alternates = (others || []).filter(Boolean);
  return (
    <figure className="vh-sketch" data-sketch={kind}>
      <div className="vh-win" role="img" aria-label={label}>
        <div className="vh-win-bar">
          <span className="vh-win-dots" />
          <span className="vh-win-title">{title}</span>
        </div>
        <div className="vh-win-body">{children}</div>
      </div>
      <figcaption className="vh-sketch-note">
        {!quiet && h("창의 모양을 단순하게 그린 그림입니다. 실제 화면은 모양이 다를 수 있습니다. 그림에 적힌 글자를 실제 화면에서 찾으면 됩니다.")}
        {alternates.length > 0 && (
          <span className="vh-alt-labels">
            {quiet ? '' : ' '}{h`창이 영어로 표시되면 같은 곳에 ${alternates.map((text) => `"${text}"`).join(', ')}(이)라고 적혀 있습니다.`}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

/** 눌러야 할 곳: 테두리로 강조하고 꼬리표를 붙입니다. side="right"는 꼬리표를 오른쪽에, 기본은 아래에 둡니다. */
function Target({ tag, order, side, children }) {
  return (
    <span className="vh-target" data-side={side || 'below'}>
      <span className="vh-target-ring">{children}</span>
      <span className="vh-tag">
        {order && <span className="vh-tag-order">{order}</span>}
        {tag}
      </span>
    </span>
  );
}

/** 글자를 적지 않는 부분(실제 화면마다 다른 글)을 나타내는 회색 줄. */
function Blank({ width = '60%' }) {
  return <span className="vh-blank" style={{ width }} />;
}

/** 구글 창 1: 계정 고르기. */
export function GoogleAccountSketch() {
  const { h } = useHelpText();
  return (
    <Sketch kind="google-account" title={h("구글 창")} label={h("구글 창의 계정 목록 그림입니다. 저장에 사용할 내 계정을 누르는 곳이 표시되어 있습니다.")}>
      <Blank width="45%" />
      <Target tag={h("여기를 누릅니다")}>
        <span className="vh-account">
          <span className="vh-avatar" />
          <span className="vh-account-lines">
            <span className="vh-account-name">{h("내 계정")}</span>
            <Blank width="70%" />
          </span>
        </span>
      </Target>
      <span className="vh-account" data-dim="true">
        <span className="vh-avatar" />
        <span className="vh-account-lines">
          <span className="vh-account-name">{h("다른 계정")}</span>
          <Blank width="55%" />
        </span>
      </span>
    </Sketch>
  );
}

/** 구글 창 2: 권한 화면. 비어 있는 체크 상자를 먼저 체크하고 진행 버튼을 누릅니다. */
export function GoogleConsentSketch({ quiet }) {
  const { h, locale } = useHelpText();
  return (
    <Sketch
      kind="google-consent"
      quiet={quiet}
      title={h("구글 창")}
      label={h("구글 창의 권한 화면 그림입니다. \"Google Drive 파일\"이 적힌 줄의 빈 체크 상자를 먼저 체크하고, 그 아래의 \"계속\" 버튼을 누르는 순서가 표시되어 있습니다.")}
      others={[otherLabel('googleDriveFiles', locale), otherLabel('googleContinue', locale)]}
    >
      <Blank width="70%" />
      <Target tag={h("여기를 체크합니다")} order="1">
        <span className="vh-check-row">
          <span className="vh-checkbox" />
          <span className="vh-check-text">… <b>{externalLabel('googleDriveFiles', locale)}</b> …</span>
        </span>
      </Target>
      <span className="vh-actions">
        <span className="vh-ext-btn" data-kind="plain"><Blank width="2.2em" /></span>
        <Target tag={h("여기를 누릅니다")} order="2">
          <span className="vh-ext-btn" data-kind="blue">{externalLabel('googleContinue', locale)}</span>
        </Target>
      </span>
    </Sketch>
  );
}

/** 브라우저 창(크롬): 주소 표시줄 오른쪽 끝의 팝업 차단 아이콘과 허용 항목. */
export function PopupBlockedSketch() {
  const { h, locale } = useHelpText();
  return (
    <Sketch
      kind="popup-blocked"
      title={h("브라우저 창")}
      label={h("브라우저 창 그림입니다. 주소 표시줄 오른쪽 끝의 팝업 차단 아이콘을 누르고, 열린 작은 창에서 \"항상 허용\"이 들어 있는 항목과 \"완료\" 버튼을 누르는 곳이 표시되어 있습니다.")}
      others={[otherLabel('popupAlwaysAllow', locale), otherLabel('popupDone', locale)]}
    >
      <span className="vh-address">
        <span className="vh-address-bar"><Blank width="50%" /></span>
        <Target tag={h("여기를 누릅니다")} order="1">
          <span className="vh-popup-icon" />
        </Target>
      </span>
      <span className="vh-bubble">
        <Target tag={h("여기를 고릅니다")} order="2">
          <span className="vh-radio-row">
            <span className="vh-radio" data-on="true" />
            <span className="vh-check-text">… <b>{externalLabel('popupAlwaysAllow', locale)}</b> …</span>
          </span>
        </Target>
        <span className="vh-radio-row">
          <span className="vh-radio" />
          <Blank width="40%" />
        </span>
        <span className="vh-actions">
          <Target tag={h("고른 뒤 여기를 누릅니다")}>
            <span className="vh-ext-btn" data-kind="blue">{externalLabel('popupDone', locale)}</span>
          </Target>
        </span>
      </span>
    </Sketch>
  );
}

/** GitHub 창: 권한 줄과 초록색 승인 버튼. */
export function GitHubAuthorizeSketch() {
  const { h, locale } = useHelpText();
  return (
    <Sketch
      kind="github-authorize"
      title={h("GitHub 창")}
      label={h("GitHub 창 그림입니다. \"Public repositories and repository invites\" 권한이 적혀 있고, 그 아래 초록색 \"Authorize vpylab\" 버튼을 누르는 곳이 표시되어 있습니다.")}
    >
      <Blank width="55%" />
      <span className="vh-scope-row">
        <span className="vh-scope-icon" />
        <span className="vh-check-text" lang="en">{externalLabel('githubScope', locale)}</span>
      </span>
      <span className="vh-actions">
        <span className="vh-ext-btn" data-kind="plain"><Blank width="2.2em" /></span>
        <Target tag={h("여기를 누릅니다")}>
          <span className="vh-ext-btn" data-kind="green" lang="en">{externalLabel('githubAuthorize', locale)}</span>
        </Target>
      </span>
    </Sketch>
  );
}

/**
 * VPyLab 만들기 화면의 버튼 줄과 "도구" 메뉴. 우리 화면이므로 실제 버튼 이름을 그대로 적습니다.
 * mark: 'file'은 파일로 보관하고 다시 여는 곳, 'reset'은 초기 코드로 돌아가는 곳을 표시합니다.
 */
export function ToolsMenuSketch({ mark = 'file' }) {
  const { h } = useHelpText();
  const label = mark === 'reset'
    ? h("VPyLab 만들기 화면 위쪽의 버튼 줄 그림입니다. \"도구\"를 누르면 열리는 메뉴에서 \"초기 코드로 돌아가기\"의 위치가 표시되어 있습니다.")
    : h("VPyLab 만들기 화면 위쪽의 버튼 줄 그림입니다. \"도구\"를 누르면 열리는 메뉴에서 \"HTML 내려받기\"와 \"파일 열기 (.py, .html)\"의 위치가 표시되어 있습니다.");
  const row = (text, tag, order) => (tag
    ? <Target key={text} tag={tag} order={order} side="right"><span className="vh-menu-row">{text}</span></Target>
    : <span key={text} className="vh-menu-row">{text}</span>);
  return (
    <Sketch kind={`tools-${mark}`} title={h("VPyLab 만들기 화면")} label={label}>
      <span className="vh-toolbar">
        <span className="vh-btn">{h("저장")}</span>
        <span className="vh-btn"><Blank width="3em" /></span>
        <Target tag={h("여기를 누릅니다")} order="1">
          <span className="vh-btn">{h("도구")} ⌄</span>
        </Target>
      </span>
      <span className="vh-menu">
        {row(h("초기 코드로 돌아가기"), mark === 'reset' ? h("여기를 누릅니다") : '', '2')}
        {row(h("공유"))}
        {row(h("파일 열기 (.py, .html)"), mark === 'file' ? h("다시 열 때") : '')}
        {row(h("HTML 내려받기"), mark === 'file' ? h("보관할 때") : '')}
      </span>
    </Sketch>
  );
}
