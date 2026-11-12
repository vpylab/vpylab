import { useUiText } from "../i18n/ui-text";
import Header from '../components/layout/Header';
import { DRIVE_SAVE, GITHUB_ADDON, GITHUB_GALLERY, OPEN_EDITION } from '../lib/api-base.js';

const Section = ({ title, children }) => (
  <section
    className="mb-6 pb-6"
    style={{ borderBottom: '1px solid var(--color-border)' }}
  >
    <h2
      className="text-base font-bold mb-3"
      style={{ color: 'var(--color-text-primary)' }}
    >
      {title}
    </h2>
    <div
      className="text-sm leading-relaxed"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      {children}
    </div>
  </section>
);

// 공개판(vpylab.pages.dev)은 서버·DB가 없어 수업용 판과 처리방침이 다릅니다. 문구: docs/reference/solar/privacy-open-261108-solar.md, 1·3절은 short-share-261109(b)-solar.md(3절 무작위 주소 삭제 문장은 stability-docs-261109-final.md 블록 6), 5절은 drive-editor-261109-solar.md(블록 G), 2절과 5절의 토큰 문장·수업용 판의 드라이브 구역은 three-steps-261112-solar.md
const OPEN_SECTIONS = [
  ["1. 수집하는 개인정보", "VPyLab 공개판은 회원 가입과 로그인을 사용하지 않습니다. 따라서 이름이나 이메일 같은 개인정보를 수집하지 않습니다. 사용자가 작성한 코드는 사용자의 브라우저 안에서 실행됩니다. 사용자가 공유를 누를 때만 그 코드와 제목이 저장되며, 자세한 내용은 3절(공유 링크)에 있습니다."],
  ["2. 브라우저에 남는 정보", "이 브라우저의 저장 공간(localStorage)에는 학습 진행 상황, 화면 테마, 언어, 홈 설정이 남습니다. 만들기 화면에서 작성하던 코드도 같은 저장 공간에 남으며, 이어서 작업하기 위한 목적입니다. 그 코드는 14일이 지나면 만들기 화면을 다시 열 때 지워집니다. 학습 자료에서 연습 중인 초안은 브라우저 탭의 저장 공간(sessionStorage)에 남습니다. 이 정보는 VPyLab으로 전송되지 않으며, 브라우저 데이터를 지우면 사라지고 다른 기기로 옮겨지지 않습니다. 공용 컴퓨터에서는 도구 메뉴의 초기 코드로 돌아가기를 누르면 만들기 화면에 남은 코드가 지워집니다."],
  ["3. 공유 링크", "도구 → 공유를 누르면 코드와 제목이 Cloudflare D1 저장소에 저장되고 짧은 주소가 만들어집니다. 주소를 아는 사람은 누구나 그 코드를 볼 수 있으므로 코드와 제목에 이름, 연락처 같은 개인정보를 넣지 않아야 합니다. 같은 브라우저에서만 고칠 수 있도록 수정 열쇠가 이 브라우저의 저장 공간(localStorage)에 남고, 저장소에는 열쇠를 변환한 값만 저장됩니다. 짧은 시간에 너무 많이 만드는 것을 막으려고 IP 주소를 변환한 값을 사용하며, IP 주소 자체는 저장하지 않고 변환한 값도 2분 안에 지웁니다. 공유 창에서 이름을 정하면, 창을 열 때 먼저 만든 무작위 주소와 그 코드는 바로 지웁니다. 지울 때는 그 주소를 만든 브라우저의 수정 열쇠로만 지울 수 있습니다. 공유한 코드는 삭제 요청이 있을 때까지 보관하며, 지우려면 GitHub 이슈에 지울 주소만 적으면 됩니다. 저장소가 응답하지 않을 때는 코드를 압축해 링크 주소 안에 담은 긴 링크를 대신 만들며, 이때는 저장소에 저장하지 않습니다."],
  ["4. 외부 서비스", "사이트는 Cloudflare Pages가 제공하며, 접속 과정의 기록은 Cloudflare의 정책에 따라 처리됩니다. 웹 글꼴은 Google Fonts와 Fontshare에서 불러옵니다. 파이썬 실행 환경(Pyodide)은 vpylab.pages.dev에서 받고, 받지 못했을 때만 jsDelivr나 unpkg에서 받습니다. 내려받은 HTML 파일은 열 때 jsDelivr나 unpkg에서 Pyodide와 Three.js를 불러옵니다."],
  ["5. 구글 드라이브 저장", "만들기 화면의 저장과 실험 페이지인 vpylab.pages.dev/drive-lab은 구글 로그인으로 openid, email, profile, drive.file 권한을 요청합니다. drive.file 권한으로는 이 앱이 만든 파일만 볼 수 있고 드라이브의 다른 파일은 볼 수 없습니다. 파일은 사용자 본인의 구글 드라이브 VPyLab 폴더에 저장되며 VPyLab 관리자는 볼 수 없습니다. 영상으로 저장에서 드라이브에 저장을 고르면 녹화한 영상도 같은 권한으로 VPyLab 폴더 안의 영상 폴더에 저장됩니다. 구글 로그인 스크립트를 불러오는 때는 저장 창이나 내 드라이브 창을 열 때, 그리고 이 탭에 드라이브 연결이 남아 있을 때뿐입니다. 구글 접근 토큰의 위치는 브라우저 탭의 저장 공간(sessionStorage)이며, 새로 고침해도 유지되지만 탭을 닫거나 로그아웃하면 사라집니다. 토큰은 약 1시간 뒤 만료되며, 만료 뒤에 저장하면 같은 계정으로 다시 승인받습니다. 저장하지 못한 초안은 계정별로 이 브라우저에 남고 14일이 지나면 그 컴퓨터에서 저장 창을 다시 열 때 지워집니다. 권한은 창의 권한 철회 버튼이나 myaccount.google.com/connections에서 거둘 수 있습니다."],
  ["6. 수업용 판", "학교 수업에 사용하는 수업용 판(vpylab.vercel.app)은 계정과 코드를 Supabase에 저장합니다. 수업용 판은 그 사이트의 개인정보 처리방침을 따릅니다."],
  ["7. 개인정보 보호책임자와 문의", "개인정보 보호책임자는 석리송(당곡고등학교 정보과 교사)입니다. 문의는 GitHub 이슈(github.com/vpylab/vpylab/issues)로 받습니다. 이슈는 누구나 볼 수 있으므로 개인정보를 적지 않아야 합니다."],
  ["8. 변경", "이 처리방침은 「개인정보 보호법」에 따라 작성했으며, 법령이나 운영 방식이 바뀌면 갱신합니다."],
];

// 수업용 판에서 개인 코드를 구글 드라이브에 저장하는 배포(구글 클라이언트 ID 설정)에만 보입니다.
const CLASSROOM_DRIVE_TEXT = "만들기 화면의 저장은 구글 로그인으로 openid, email, profile, drive.file 권한을 요청합니다. 코드는 사용자 본인의 구글 드라이브 VPyLab 폴더에 저장됩니다. 이 저장에는 VPyLab 계정이 필요 없으며, 저장한 파일과 구글 계정 정보는 VPyLab 서버로 전송되지 않습니다. drive.file 권한으로는 이 앱이 만든 파일만 볼 수 있고 드라이브의 다른 파일은 볼 수 없습니다. 구글 접근 토큰은 브라우저 탭의 저장 공간(sessionStorage)에 있으며, 탭을 닫거나 로그아웃하면 사라집니다. 만들기 화면에서 작성하던 코드와 저장하지 못한 초안은 이 브라우저의 저장 공간(localStorage)에 남고, 14일이 지나면 지워집니다. 팀 프로젝트의 코드와 기록은 기존과 같이 Supabase와 GitHub 저장소에 저장됩니다.";

// GitHub 팀 프로젝트 애드온을 켠 공개판 배포에만 보입니다. 문구: docs/reference/solar/github-privacy-261112-solar.md(IP 문장은 사실 보완으로 덧붙임)
const OPEN_GITHUB_SECTION = ["GitHub 팀 프로젝트 (선택 기능)", "팀 프로젝트는 선택 기능이며 만들기 화면의 팀 프로젝트 창에서 GitHub 계정을 연결할 때만 동작합니다. 연결할 때 GitHub에 요청하는 권한은 public_repo와 repo:invite이며 공개 저장소를 만들고 저장하고 받은 초대를 수락하는 데 사용합니다. 연결한 뒤에는 브라우저가 GitHub와 직접 통신하며 코드와 기록은 GitHub 저장소에 저장되고 VPyLab 서버에는 저장되지 않습니다. 로그인 확인 코드를 접근 토큰으로 바꾸는 한 번의 요청만 이 사이트의 함수를 거치며 그 함수는 토큰을 저장하거나 기록하지 않습니다. 이 요청에도 3절과 같은 방식으로 IP 주소를 변환한 값을 요청 수 제한에 사용하며, IP 주소 자체는 저장하지 않습니다. GitHub 접근 토큰은 브라우저 탭의 저장 공간인 sessionStorage에 있으며 탭을 닫거나 연결을 해제하면 사라집니다. 프로젝트 저장소는 공개 저장소이므로 누구나 코드, 저장 기록, 작성자의 GitHub 아이디를 볼 수 있으며 따라서 코드와 기록에 이름, 연락처 같은 개인정보를 넣지 않아야 합니다. 권한은 github.com/settings/applications에서 거둘 수 있고 저장소는 GitHub에서 직접 지웁니다."];

// GitHub 연동 갤러리를 켠 공개판 배포에만 보입니다. 문구: docs/reference/solar/github-gallery-261112-solar.md(블록 14)
const OPEN_GALLERY_SECTION = ["갤러리 (선택 기능)", "갤러리에 올리기는 선택 기능이며, 만들기 화면의 팀 프로젝트 창에서 \"갤러리에 올리기\"를 누를 때만 동작합니다. 누르면 그 프로젝트의 GitHub 저장소에 갤러리 표시(topic vpylab-gallery)가 붙고, 그때의 3D 화면이 미리보기 그림 thumbnail.jpg로 저장소에 저장됩니다. 교사가 승인한 작품만 갤러리 화면에 표시됩니다. 갤러리에서 누구나 볼 수 있는 것은 코드, 실행 화면, 미리보기 그림, 제목, GitHub 아이디, 고친 날짜, 스타 수입니다. 이 정보는 모두 GitHub의 공개 저장소에 있는 정보이며, VPyLab은 따로 서버나 DB에 저장하지 않습니다. 작품 목록 파일과 승인 대기 목록은 VPyLab의 공개 GitHub 저장소에 있으며, 승인 전에도 저장소 이름, 제목, GitHub 아이디가 승인 대기 목록에 공개됩니다. 갤러리 화면은 목록 파일과 미리보기 그림을 raw.githubusercontent.com에서 불러오며, 이때의 접속 기록은 GitHub의 정책에 따라 처리됩니다. \"갤러리에서 내리기\"를 누르면 다음 목록 갱신 때 갤러리에서 빠지며, 저장소를 비공개로 바꾸거나 지워도 빠집니다. 갤러리에서 스타를 누르면 GitHub 계정의 스타 목록에 남고 다른 사람이 볼 수 있습니다. 코드, 제목, 미리보기 그림에 이름, 연락처, 얼굴 같은 개인정보를 넣지 않아야 합니다."];

function OpenPrivacy({ ui }) {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-2 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{ui("개인정보 처리방침 (공개판)")}</h1>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{ui("최종 수정일: 2026-11-12")}</p>
      </header>
      {OPEN_SECTIONS.flatMap((section) => (section[0].startsWith('6.')
        ? [...(GITHUB_ADDON ? [OPEN_GITHUB_SECTION] : []), ...(GITHUB_GALLERY ? [OPEN_GALLERY_SECTION] : []), section]
        : [section])).map(([title, body]) => (
        <Section key={title} title={ui(title)}><p>{ui(body)}</p></Section>
      ))}
    </>
  );
}

export default function Privacy() {
  const ui = useUiText();
  if (OPEN_EDITION) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <Header />
        <main className="max-w-2xl mx-auto px-6 py-12" data-testid="privacy-open"><OpenPrivacy ui={ui} /></main>
      </div>
    );
  }
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <header className="mb-8">
          <h1
            className="text-2xl font-bold mb-2 tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >{ui("개인정보 처리방침")}</h1>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{ui("최종 수정일: 2026-04-23")}</p>
        </header>

        <Section title={ui("1. 수집 목적")}>
          <p>{ui("VPyLab은 학생 식별 및 학습 이력·작품 관리를 위해 최소한의 개인정보를 수집합니다.")}</p>
        </Section>

        <Section title={ui("2. 수집 항목")}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{ui("이메일, 이름 (Supabase 서울 리전에 저장)")}</li>
            <li>{ui("프로필 이미지 URL (OAuth 제공자가 전달한 경우, 선택)")}</li>
          </ul>
          <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{ui("로그인은 Google 또는 GitHub OAuth 2.0으로만 진행되며, 비밀번호는 수집·저장하지 않습니다.")}</p>
        </Section>

        <Section title={ui("3. 보유 및 이용 기간")}>
          <p>{ui("해당 학년도 종료 후 일괄 파기합니다.")}</p>
        </Section>

        <Section title={ui("4. 외부 API 사용 안내")}>
          <p className="mb-2">{ui("본 서비스는 다음 외부 API를 사용합니다.")}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>GitHub REST API</strong>{ui("— 학생 작품을 GitHub Pages에 발행하기 위해 코드·제목·설명·메타데이터를 전송합니다. 이메일·이름 등 식별정보는 전송되지 않습니다.")}</li>
          </ul>
          <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{ui("데이터는 서비스 운영을 위한 기술적 처리 목적으로만 사용되며, 외부 API 제공사에 학생 식별정보가 전달되지 않도록 설계되었습니다.")}</p>
        </Section>

        {DRIVE_SAVE && (
          <Section title={ui("구글 드라이브 저장과 브라우저에 남는 정보")}>
            <p>{ui(CLASSROOM_DRIVE_TEXT)}</p>
          </Section>
        )}

        <Section title={ui("5. 안전성 확보 조치")}>
          <ul className="list-disc pl-5 space-y-1">
            <li>{ui("HTTPS 전 구간 암호화 (HSTS 2년, 서브도메인 포함)")}</li>
            <li>{ui("Supabase Row Level Security (RLS) 기반 접근 제어")}</li>
            <li>{ui("CSP, X-Frame-Options DENY, X-XSS-Protection 등 보안 헤더 적용")}</li>
            <li>{ui("작품 발행·공유 시 Rate Limiting(발행 3회/분, 공유 10회/분)")}</li>
            <li>{ui("발행 코드 내 API 키·민감정보 자동 검사")}</li>
            <li>{ui("GitHub 토큰은 DB에 저장하지 않고 요청 시 메모리에서만 사용")}</li>
          </ul>
        </Section>

        <Section title={ui("6. 처리 위탁")}>
          <p>{ui("서비스 운영을 위해 다음 업체에 개인정보 처리를 위탁하고 있습니다.")}</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong>Supabase</strong>{ui("(클라우드 데이터베이스, 서울 리전) — 사용자 프로필·작품 데이터 저장")}</li>
          </ul>
        </Section>

        <Section title={ui("7. 개인정보 보호책임자")}>
          <p>
            <strong style={{ color: 'var(--color-text-primary)' }}>{ui("석리송")}</strong>{' '}{ui("(당곡고등학교 정보과 교사)")}</p>
        </Section>

        <Section title={ui("8. 열람 · 정정 · 삭제 요청")}>
          <p>{ui("개인정보의 열람, 정정, 삭제를 원하시는 경우 담당 교사에게 직접 요청하시면 지체없이 처리합니다. 삭제 요청 시 해당 계정의 프로필, 저장 코드, 미션 제출 기록이 함께 파기됩니다.")}</p>
        </Section>

        <Section title={ui("9. 법령 근거")}>
          <p>{ui("본 처리방침은 「개인정보 보호법」 및 「초·중등교육법」 제29조의2에 따라 작성되었으며, 법령·운영 정책 변경 시 갱신됩니다.")}</p>
        </Section>
      </main>
    </div>
  );
}
