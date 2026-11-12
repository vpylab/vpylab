import { useState } from 'react';
import { isHelpDone } from './help-memory';
import { useHelpText } from './help-text';
import { ChoiceList, HelpBox, HelpMong, HelpMore, HelpSteps } from './HelpParts';
import { GitHubAuthorizeSketch, GoogleAccountSketch, GoogleConsentSketch, PopupBlockedSketch, ToolsMenuSketch } from './Sketches';

/**
 * 학생이 직접 눌러야 하는 지점마다 보여 주는 안내. 저장 창(DriveDialog), 팀 프로젝트 창(GitHubProjectDialog),
 * 사용 안내(GuideWays)가 HelpSlot을 거쳐 같은 안내를 함께 사용합니다.
 *
 * 문장은 솔라 프로4가 썼습니다(docs/reference/solar/step-guides-261112-solar.md). 버튼 이름은 실제 화면과 같아야 하므로
 * 화면의 버튼 이름을 바꾸면 여기의 문장과 영어 번역(en-ui-text.additions.json)도 함께 고칩니다.
 */

/** 브라우저가 새 창을 막았을 때(크롬 기준). 구글 창과 GitHub 창에 함께 사용합니다. */
export function PopupBlockedGuide() {
  const { h } = useHelpText();
  return (
    <>
      <p className="vh-text">{h("브라우저는 새 창이 열리는 것을 막을 때가 있습니다. 이를 팝업 차단이라고 합니다. 이 사이트의 팝업을 한 번 허용하면 다음부터는 창이 열립니다.")}</p>
      <HelpSteps
        items={[
          h("주소 표시줄 오른쪽 끝에 생긴 팝업 차단 아이콘을 누릅니다."),
          h("\"항상 허용\"이 들어 있는 항목을 고르고 \"완료\"를 누릅니다."),
          h("VPyLab 화면으로 돌아와 방금 누른 버튼을 다시 누릅니다."),
        ]}
      />
      <PopupBlockedSketch />
      <ul className="vh-list">
        <li>{h("아이패드와 아이폰에서는 설정 앱의 Safari 항목에서 \"팝업 차단\"을 끕니다.")}</li>
        <li>{h("그 밖의 브라우저는 설정 위치가 다릅니다. 찾기 어려우면 선생님께 도움을 청합니다.")}</li>
      </ul>
    </>
  );
}

/** "창이 열리지 않을 때" 펼치기. 창이 막힌 것을 알았으면 펼친 상태로 보여 줍니다. */
function PopupMore({ open }) {
  const { h } = useHelpText();
  return (
    <HelpMore summary={h("창이 열리지 않을 때")} defaultOpen={open} name="popup" key={open ? 'open' : 'closed'}>
      <PopupBlockedGuide />
    </HelpMore>
  );
}

function useGoogleSteps(pictures) {
  const { h } = useHelpText();
  return [
    { text: h("\"구글 계정으로 로그인\"을 누르면 구글 창이 따로 열립니다. 그 창에서 저장에 사용할 내 구글 계정을 고릅니다."), extra: pictures && <GoogleAccountSketch /> },
    { text: h("권한을 묻는 화면에서 \"Google Drive 파일\"이 적힌 줄의 체크 상자는 처음에 비어 있습니다. 직접 눌러 체크합니다. 체크하지 않으면 저장되지 않습니다."), extra: pictures && <GoogleConsentSketch quiet /> },
    { text: h("\"계속\"을 누르면 구글 창이 닫히고 VPyLab 화면으로 돌아와 저장을 이어 갑니다.") },
  ];
}

const HIDDEN_WINDOW = "새로 열린 창이 보이지 않으면 다른 창 뒤에 가려져 있을 수 있습니다. 찾을 수 없으면 브라우저가 창을 막은 것일 수 있습니다. 아래의 \"창이 열리지 않을 때\"를 확인합니다.";

/**
 * 구글 첫 승인. waiting은 승인 창을 기다리는 동안, popupBlocked는 브라우저가 창을 막은 뒤입니다.
 * 한 번 로그인에 성공한 브라우저에서는 순서를 접어 둡니다.
 */
export function DriveSignInGuide({ waiting, popupBlocked }) {
  const { h } = useHelpText();
  const [done] = useState(() => isHelpDone('drive-signin'));
  const withPictures = useGoogleSteps(true);
  const textOnly = useGoogleSteps(false);
  if (waiting) {
    return (
      <HelpBox topic="drive-signin" tone="now">
        <p className="vh-now" role="status"><span className="vh-now-dot" aria-hidden="true" />{h("지금 열린 구글 창에서 할 일")}</p>
        <HelpSteps items={withPictures} />
        <p className="vh-text">{h(HIDDEN_WINDOW)}</p>
        <PopupMore />
      </HelpBox>
    );
  }
  return (
    <HelpBox topic="drive-signin">
      {!done && !popupBlocked && <HelpMong id="arong">{h("버튼을 누르면 구글 창이 따로 열려. 놀라지 말고 아래 순서대로 하면 저장까지 이어져.")}</HelpMong>}
      {popupBlocked && <PopupMore open />}
      <HelpMore summary={h("버튼을 누르면 일어나는 일")} defaultOpen={!done && !popupBlocked} name="steps">
        <HelpSteps items={textOnly} />
        <HelpMore summary={h("그림으로 보기")} name="pictures">
          <GoogleAccountSketch />
          <GoogleConsentSketch quiet />
        </HelpMore>
      </HelpMore>
      {!popupBlocked && <PopupMore />}
    </HelpBox>
  );
}

/** 드라이브 권한이 빠졌을 때: 체크 상자의 위치를 그림으로 바로 보여 줍니다. */
export function DriveScopeGuide({ popupBlocked }) {
  const { h } = useHelpText();
  return (
    <HelpBox topic="drive-scope" tone="now">
      <HelpSteps
        items={[
          h("\"드라이브 권한 다시 요청\"을 누르면 구글 창이 다시 열립니다."),
          { text: h("\"Google Drive 파일\"이 적힌 줄의 빈 체크 상자를 눌러 체크합니다."), extra: <GoogleConsentSketch /> },
          h("\"계속\"을 누르면 하던 저장을 이어서 합니다."),
        ]}
      />
      <PopupMore open={popupBlocked} />
    </HelpBox>
  );
}

function ReauthLines() {
  const { h } = useHelpText();
  return (
    <ul className="vh-list">
      <li>{h("\"다시 승인\"을 누르면 구글 창이 잠깐 열렸다가 스스로 닫힙니다. 그 뒤 하던 저장을 이어서 합니다.")}</li>
      <li>{h("구글 창이 계정을 물으면 이 창 위쪽에 표시된 계정과 같은 계정을 고릅니다. 다른 계정을 고르면 저장하지 않습니다.")}</li>
    </ul>
  );
}

/** 약 1시간 뒤의 다시 승인: 고장이 아니라는 점과 같은 계정을 골라야 한다는 점. */
export function DriveReauthGuide({ popupBlocked }) {
  const { h } = useHelpText();
  return (
    <HelpBox topic="drive-reauth">
      <HelpMong id="mongsil">{h("고장이 아니야. 구글 연결은 약 1시간마다 다시 승인받으니까 천천히 해도 돼.")}</HelpMong>
      <ReauthLines />
      <PopupMore open={popupBlocked} />
    </HelpBox>
  );
}

function DriveConflictBody() {
  const { h } = useHelpText();
  return (
    <>
      <p className="vh-text">{h("같은 파일을 다른 탭이나 다른 기기에서 먼저 저장했을 때 이 안내가 나타납니다. 버튼을 고르기 전에는 내 코드와 드라이브의 파일이 모두 그대로 있습니다.")}</p>
      <ChoiceList
        items={[
          { button: h("내 코드를 사본으로 저장"), result: h("내 코드를 사본으로 저장 버튼을 고르면 내 코드가 파일 이름 끝에 \"(사본)\"이 붙은 새 파일로 저장됩니다. 드라이브의 원래 파일은 바뀌지 않습니다. 두 파일이 모두 남습니다.") },
          { button: h("드라이브 내용 불러오기(내 변경은 버림)"), result: h("드라이브 내용 불러오기 버튼을 고르면 편집기의 코드가 드라이브에 저장된 내용으로 바뀝니다. 내가 방금 고친 내용은 사라집니다.") },
          { button: h("내 코드로 덮어쓰기"), result: h("내 코드로 덮어쓰기 버튼을 고르면 드라이브의 파일이 내 코드로 바뀝니다. 먼저 저장된 내용은 파일에서 사라지며 구글 드라이브의 버전 기록에서 확인할 수 있습니다.") },
        ]}
      />
    </>
  );
}

/** 드라이브 충돌: 세 버튼을 고르면 각각 무엇이 남고 무엇이 사라지는지. */
export function DriveConflictGuide() {
  const { h } = useHelpText();
  return (
    <HelpBox topic="drive-conflict">
      <HelpMore summary={h("세 선택지의 차이")} defaultOpen name="choices">
        <DriveConflictBody />
        <HelpMong id="chorong">{h("어느 쪽이 맞는지 모르겠으면 사본으로 저장하면 돼. 두 파일이 모두 남으니까 나중에 열어서 비교할 수 있어.")}</HelpMong>
      </HelpMore>
    </HelpBox>
  );
}

function useFileSteps() {
  const { h } = useHelpText();
  return [
    h("만들기 화면 위쪽의 \"도구\"를 누릅니다."),
    h("\"HTML 내려받기\"를 누르면 작품이 파일로 컴퓨터에 저장됩니다. 이 파일 안에 코드도 들어 있습니다."),
    h("이어서 작업할 때는 \"도구\"의 \"파일 열기 (.py, .html)\"에서 그 파일을 고릅니다."),
  ];
}

/** 구글 로그인이나 드라이브 저장을 사용할 수 없을 때: 지금 코드를 파일로 보관하는 길. */
export function KeepAsFileGuide() {
  const { h } = useHelpText();
  const steps = useFileSteps();
  return (
    <HelpBox topic="keep-file">
      <HelpMore summary={h("구글 로그인 없이 코드를 보관하는 방법")} name="keep-file">
        <p className="vh-text">{h("구글 로그인이나 드라이브 저장을 사용할 수 없어도 지금 코드를 파일로 보관할 수 있습니다. 이 창을 닫고 아래 순서대로 합니다.")}</p>
        <HelpSteps items={steps} />
        <ToolsMenuSketch mark="file" />
      </HelpMore>
    </HelpBox>
  );
}

function useGitHubSteps(pictures) {
  const { h } = useHelpText();
  return [
    { text: h("\"GitHub 연결\"을 누르면 GitHub 창이 따로 열립니다. 로그인 화면이 먼저 나오면 내 GitHub 아이디와 비밀번호로 로그인합니다.") },
    { text: h("초록색 \"Authorize vpylab\" 버튼을 누릅니다. 그 위에 적힌 \"Public repositories and repository invites\"는 공개 저장소와 저장소 초대를 다루는 권한이라는 뜻입니다."), extra: pictures && <GitHubAuthorizeSketch /> },
    { text: h("GitHub 창이 스스로 닫히고 VPyLab 화면에 내 프로젝트 목록이 나타납니다.") },
  ];
}

function NoAccountLines() {
  const { h } = useHelpText();
  return (
    <ul className="vh-list">
      <li>{h("GitHub 계정은 13세 이상만 만들 수 있습니다. github.com에서 먼저 가입한 뒤 \"GitHub 연결\"을 다시 누릅니다.")}</li>
      <li>{h("계정을 만들 수 없으면 구글 드라이브 저장과 공유 링크로 작품을 보관하고 보낼 수 있습니다.")}</li>
    </ul>
  );
}

const ALREADY_APPROVED = "전에 승인한 적이 있으면 GitHub 창이 열렸다가 바로 닫힐 수 있습니다. 고장이 아니며 연결이 끝난 것입니다.";

/** GitHub 첫 연결. waiting은 GitHub 창을 기다리는 동안, popupBlocked는 브라우저가 창을 막은 뒤입니다. */
export function GitHubConnectGuide({ waiting, popupBlocked }) {
  const { h } = useHelpText();
  const [done] = useState(() => isHelpDone('github-connect'));
  const withPictures = useGitHubSteps(true);
  const textOnly = useGitHubSteps(false);
  if (waiting) {
    return (
      <HelpBox topic="github-connect" tone="now">
        <p className="vh-now" role="status"><span className="vh-now-dot" aria-hidden="true" />{h("지금 열린 GitHub 창에서 할 일")}</p>
        <HelpSteps items={withPictures} />
        <p className="vh-text">{h(ALREADY_APPROVED)}</p>
        <p className="vh-text">{h(HIDDEN_WINDOW)}</p>
        <PopupMore />
      </HelpBox>
    );
  }
  return (
    <HelpBox topic="github-connect">
      {!done && !popupBlocked && <HelpMong id="gori">{h("버튼을 누르면 GitHub 창이 따로 열려. 그 창에서 초록색 버튼 하나만 누르면 연결돼.")}</HelpMong>}
      {popupBlocked && <PopupMore open />}
      <HelpMore summary={h("버튼을 누르면 일어나는 일")} defaultOpen={!done && !popupBlocked} name="steps">
        <HelpSteps items={textOnly} />
        <HelpMore summary={h("그림으로 보기")} name="pictures">
          <GitHubAuthorizeSketch />
        </HelpMore>
      </HelpMore>
      <HelpMore summary={h("GitHub 계정이 없을 때")} name="no-account">
        <NoAccountLines />
      </HelpMore>
      {!popupBlocked && <PopupMore />}
    </HelpBox>
  );
}

/** GitHub 다시 연결(만료·권한 부족): 초록색 버튼이 다시 보일 수도, 창이 바로 닫힐 수도 있습니다. */
export function GitHubReconnectGuide({ waiting, popupBlocked }) {
  const { h } = useHelpText();
  return (
    <HelpBox topic="github-reconnect" tone={waiting ? 'now' : undefined}>
      {waiting && <p className="vh-now" role="status"><span className="vh-now-dot" aria-hidden="true" />{h("지금 열린 GitHub 창에서 할 일")}</p>}
      <p className="vh-text">{h("\"다시 연결\"을 누르면 GitHub 창이 열립니다. 초록색 \"Authorize vpylab\" 버튼이 보이면 누릅니다. 버튼 없이 창이 바로 닫히면 연결이 끝난 것입니다.")}</p>
      <HelpMore summary={h("그림으로 보기")} defaultOpen={waiting} name="pictures" key={waiting ? 'waiting' : 'idle'}>
        <GitHubAuthorizeSketch />
      </HelpMore>
      <PopupMore open={popupBlocked} />
    </HelpBox>
  );
}

function CreateLines() {
  const { h } = useHelpText();
  return (
    <ul className="vh-list">
      <li>{h("프로젝트 하나가 GitHub의 공개 저장소 하나로 만들어집니다. 누구나 코드를 볼 수 있으므로 코드에 이름이나 전화번호 같은 개인정보를 적지 않습니다.")}</li>
      <li>{h("만드는 데 20초쯤 걸립니다. 끝날 때까지 이 창을 닫지 않습니다.")}</li>
      <li>{h("다 만들어지면 \"게시 주소\"가 생깁니다. 이 주소를 열면 누구나 작품을 실행해 볼 수 있습니다. 주소가 열리기까지 1~2분 걸릴 수 있습니다.")}</li>
    </ul>
  );
}

/** 프로젝트 만들기 전에 알아 둘 것: 공개 저장소, 걸리는 시간, 게시 주소. */
export function GitHubCreateGuide() {
  const { h } = useHelpText();
  return (
    <HelpBox topic="github-create">
      <HelpMore summary={h("프로젝트를 만들면 생기는 것")} name="create">
        <CreateLines />
      </HelpMore>
    </HelpBox>
  );
}

function useInviteSteps() {
  const { h } = useHelpText();
  return [
    h("팀원에게 GitHub 아이디를 물어봅니다. 이메일 주소가 아니라 GitHub에서 사용하는 아이디입니다."),
    h("\"초대할 GitHub 아이디\" 칸에 아이디를 입력하고 \"초대\"를 누릅니다."),
    h("팀원은 자기 컴퓨터에서 \"팀 프로젝트\" 창을 열고 \"받은 초대\"에서 \"수락\"을 누릅니다."),
    h("팀원이 수락한 뒤 \"목록 새로 고침\"을 누르면 팀원 목록에 팀원의 아이디가 나타납니다. 이때부터 팀원도 이 프로젝트에 저장할 수 있습니다."),
  ];
}

const AFTER_ACCEPT = "\"수락\"을 누르면 그 프로젝트가 \"내 프로젝트\" 목록에 나타납니다. 목록에서 프로젝트를 누르면 열립니다.";

/** 초대하는 학생: 아이디를 묻는 것부터 팀원이 수락할 때까지. */
export function GitHubInviteGuide() {
  const { h } = useHelpText();
  const steps = useInviteSteps();
  return (
    <HelpBox topic="github-invite">
      <HelpMore summary={h("팀원을 초대하는 순서")} name="invite">
        <HelpSteps items={steps} />
      </HelpMore>
    </HelpBox>
  );
}

/** 초대받은 학생: "수락" 다음에 일어나는 일. */
export function GitHubInvitedGuide() {
  const { h } = useHelpText();
  return (
    <HelpBox topic="github-invited">
      <p className="vh-text">{h(AFTER_ACCEPT)}</p>
    </HelpBox>
  );
}

/** 초대를 받았다는데 화면에 없을 때. */
export function GitHubMissingInviteGuide() {
  const { h } = useHelpText();
  return (
    <HelpBox topic="github-missing-invite">
      <HelpMore summary={h("초대가 보이지 않을 때")} name="missing-invite">
        <HelpSteps
          items={[
            h("\"목록 새로 고침\"을 누릅니다."),
            h("그래도 없으면, 초대한 친구가 입력한 아이디가 이 창 위쪽에 표시된 내 GitHub 아이디와 같은지 친구와 함께 확인합니다."),
          ]}
        />
      </HelpMore>
    </HelpBox>
  );
}

function GitHubConflictBody() {
  const { h } = useHelpText();
  return (
    <ChoiceList
      items={[
        { button: h("최신 코드 가져오기(내 변경은 버림)"), result: h("최신 코드 가져오기 버튼을 고르면 편집기의 코드가 팀원이 저장한 최신 코드로 바뀝니다. 내가 고친 내용은 사라지므로 남길 부분은 먼저 복사해 둡니다.") },
        { button: h("내 코드로 저장"), result: h("내 코드로 저장 버튼을 고르면 내 코드가 프로젝트의 최신 코드가 됩니다. 팀원이 저장한 내용은 최신 코드에서 빠지지만 GitHub의 저장 기록에 남습니다.") },
      ]}
    />
  );
}

/** 팀원이 먼저 저장했을 때: 두 버튼의 차이. */
export function GitHubConflictGuide() {
  const { h } = useHelpText();
  return (
    <HelpBox topic="github-conflict">
      <HelpMore summary={h("두 선택지의 차이")} defaultOpen name="choices">
        <GitHubConflictBody />
        <HelpMong id="doran">{h("고르기 전에 팀원에게 무엇을 고쳤는지 물어보면 좋아.")}</HelpMong>
      </HelpMore>
    </HelpBox>
  );
}

function LeavingBody({ pictures }) {
  const { h } = useHelpText();
  return (
    <>
      <p className="vh-text">{h("컴퓨터실처럼 여러 사람이 사용하는 컴퓨터에서는 사용을 마칠 때 아래 순서로 정리합니다. 정리하지 않으면 다음 사람이 내 계정과 코드를 볼 수 있습니다.")}</p>
      <HelpSteps
        items={[
          h("\"저장\"을 눌러 작품이 저장되었는지 확인합니다."),
          h("\"내 드라이브\" 버튼을 눌러 창을 엽니다. 파일을 열어 두었으면 이 버튼에 파일 이름이 적혀 있습니다. 열린 창에서 \"로그아웃\"을 누르고, 이 브라우저에 남은 초안도 지울지 묻는 창이 나오면 \"확인\"을 누릅니다."),
          h("로그아웃한 뒤 나타나는 \"공용 컴퓨터에서는 구글 계정에서도 로그아웃하십시오.\" 링크를 눌러 구글 계정에서도 로그아웃합니다."),
          h("GitHub를 연결했다면 \"팀 프로젝트\" 버튼을 눌러 창을 엽니다. 프로젝트를 열어 두었으면 이 버튼에 프로젝트 제목이 적혀 있습니다. 열린 창에서 \"GitHub 연결 해제\"를 누르고, 이어서 나타나는 링크로 GitHub에서도 로그아웃합니다."),
          { text: h("도구 메뉴의 \"초기 코드로 돌아가기\"를 눌러 편집기에 남은 코드를 지웁니다."), extra: pictures && <ToolsMenuSketch mark="reset" /> },
          h("브라우저 창을 닫습니다."),
        ]}
      />
    </>
  );
}

/** 공용 컴퓨터 사용을 마칠 때의 정리 순서(대화상자 안에서는 접어 둡니다). */
export function LeavingGuide() {
  const { h } = useHelpText();
  return (
    <HelpBox topic="leaving">
      <HelpMore summary={h("공용 컴퓨터 사용을 마칠 때")} name="leaving">
        <LeavingBody />
      </HelpMore>
    </HelpBox>
  );
}

/* ---------- 사용 안내(GuideWays)의 단계 카드에 놓는 묶음 ---------- */

/** 1단계 "혼자 만들기": 파일로 보관하고 다시 여는 순서. */
export function GuideSoloHelp() {
  const { h } = useHelpText();
  const steps = useFileSteps();
  return (
    <HelpBox topic="guide-solo">
      <HelpMore summary={h("파일로 보관하는 순서")} name="keep-file">
        <HelpSteps items={steps} />
        <ToolsMenuSketch mark="file" />
      </HelpMore>
    </HelpBox>
  );
}

/** 2단계 "구글 드라이브에 저장하기": 첫 승인, 팝업 차단, 다시 승인, 충돌. */
export function GuideDriveHelp() {
  const { h } = useHelpText();
  const steps = useGoogleSteps(true);
  return (
    <HelpBox topic="guide-drive">
      <HelpMore summary={h("처음 로그인할 때 구글 창에서 할 일")} name="signin">
        <HelpSteps items={steps} />
      </HelpMore>
      <PopupMore />
      <HelpMore summary={h("1시간쯤 지나 다시 승인할 때")} name="reauth">
        <ReauthLines />
      </HelpMore>
      <HelpMore summary={h("같은 파일을 두 곳에서 저장했을 때")} name="conflict">
        <DriveConflictBody />
      </HelpMore>
    </HelpBox>
  );
}

/** 3단계 "팀으로 만들기"(GitHub 아이디로 초대하는 배포): 연결, 프로젝트 만들기, 초대와 수락, 팀원이 먼저 저장했을 때. */
export function GuideTeamHelp() {
  const { h } = useHelpText();
  const connect = useGitHubSteps(true);
  const invite = useInviteSteps();
  return (
    <HelpBox topic="guide-team">
      <HelpMore summary={h("GitHub 창에서 할 일")} name="connect">
        <HelpSteps items={connect} />
        <p className="vh-text">{h(ALREADY_APPROVED)}</p>
        <NoAccountLines />
      </HelpMore>
      <HelpMore summary={h("프로젝트를 만들면 생기는 것")} name="create">
        <CreateLines />
      </HelpMore>
      <HelpMore summary={h("팀원을 초대하고 수락하는 순서")} name="invite">
        <HelpSteps items={invite} />
        <p className="vh-text">{h(AFTER_ACCEPT)}</p>
      </HelpMore>
      <HelpMore summary={h("팀원이 먼저 저장했을 때")} name="conflict">
        <GitHubConflictBody />
      </HelpMore>
    </HelpBox>
  );
}

/** 사용 안내의 "공용 컴퓨터 사용을 마칠 때": 정리 순서를 한곳에 펼쳐 둡니다. */
export function GuideLeavingHelp() {
  const { h } = useHelpText();
  return (
    <HelpBox topic="guide-leaving" tone="card">
      <h3 className="vh-card-title">{h("공용 컴퓨터 사용을 마칠 때")}</h3>
      <LeavingBody pictures />
    </HelpBox>
  );
}
