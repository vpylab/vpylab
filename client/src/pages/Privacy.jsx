import { useUiText } from "../i18n/ui-text";
import Header from '../components/layout/Header';
import { OPEN_EDITION } from '../lib/api-base.js';

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

// 공개판(vpylab.pages.dev)은 서버·DB가 없어 수업용 판과 처리방침이 다릅니다. 문구: docs/reference/solar/privacy-open-261108-solar.md, 1·3절은 short-share-261109(b)-solar.md(3절 무작위 주소 삭제 문장은 stability-docs-261109-final.md 블록 6), 5절은 drive-editor-261109-solar.md(블록 G)
const OPEN_SECTIONS = [
  ["1. 수집하는 개인정보", "VPyLab 공개판은 회원 가입과 로그인을 사용하지 않습니다. 따라서 이름이나 이메일 같은 개인정보를 수집하지 않습니다. 사용자가 작성한 코드는 사용자의 브라우저 안에서 실행됩니다. 사용자가 공유를 누를 때만 그 코드와 제목이 저장되며, 자세한 내용은 3절(공유 링크)에 있습니다."],
  ["2. 브라우저에 남는 정보", "학습 진행 상황, 화면 테마, 언어, 홈 설정은 이 브라우저의 저장 공간(localStorage)에 남습니다. 연습 중인 초안은 브라우저 탭의 저장 공간(sessionStorage)에 남습니다. 이 정보는 VPyLab으로 전송되지 않으며, 브라우저 데이터를 지우면 사라지고 다른 기기로 옮겨지지 않습니다."],
  ["3. 공유 링크", "도구 → 공유를 누르면 코드와 제목이 Cloudflare D1 저장소에 저장되고 짧은 주소가 만들어집니다. 주소를 아는 사람은 누구나 그 코드를 볼 수 있으므로 코드와 제목에 이름, 연락처 같은 개인정보를 넣지 않아야 합니다. 같은 브라우저에서만 고칠 수 있도록 수정 열쇠가 이 브라우저의 저장 공간(localStorage)에 남고, 저장소에는 열쇠를 변환한 값만 저장됩니다. 짧은 시간에 너무 많이 만드는 것을 막으려고 IP 주소를 변환한 값을 사용하며, IP 주소 자체는 저장하지 않고 변환한 값도 2분 안에 지웁니다. 공유 창에서 이름을 정하면, 창을 열 때 먼저 만든 무작위 주소와 그 코드는 바로 지웁니다. 지울 때는 그 주소를 만든 브라우저의 수정 열쇠로만 지울 수 있습니다. 공유한 코드는 삭제 요청이 있을 때까지 보관하며, 지우려면 GitHub 이슈에 지울 주소만 적으면 됩니다. 저장소가 응답하지 않을 때는 코드를 압축해 링크 주소 안에 담은 긴 링크를 대신 만들며, 이때는 저장소에 저장하지 않습니다."],
  ["4. 외부 서비스", "사이트는 Cloudflare Pages가 제공하며, 접속 과정의 기록은 Cloudflare의 정책에 따라 처리됩니다. 웹 글꼴은 Google Fonts와 Fontshare에서 불러옵니다. 파이썬 실행 환경(Pyodide)은 vpylab.pages.dev에서 받고, 받지 못했을 때만 jsDelivr나 unpkg에서 받습니다. 내려받은 HTML 파일은 열 때 jsDelivr나 unpkg에서 Pyodide와 Three.js를 불러옵니다."],
  ["5. 구글 드라이브 저장", "만들기 화면의 저장과 실험 페이지인 vpylab.pages.dev/drive-lab은 구글 로그인으로 openid, email, profile, drive.file 권한을 요청합니다. drive.file 권한으로는 이 앱이 만든 파일만 볼 수 있고 드라이브의 다른 파일은 볼 수 없습니다. 파일은 사용자 본인의 구글 드라이브 VPyLab 폴더에 저장되며 VPyLab 관리자는 볼 수 없습니다. 영상으로 저장에서 드라이브에 저장을 고르면 녹화한 영상도 같은 권한으로 VPyLab 폴더 안의 영상 폴더에 저장됩니다. 구글 로그인 스크립트는 저장 창이나 내 드라이브 창을 열 때만 불러옵니다. 구글 접근 토큰은 페이지 메모리에만 있고 새로 고침하면 사라집니다. 저장하지 못한 초안은 계정별로 이 브라우저에 남고 14일이 지나면 그 컴퓨터에서 저장 창을 다시 열 때 지워집니다. 권한은 창의 권한 철회 버튼이나 myaccount.google.com/connections에서 거둘 수 있습니다."],
  ["6. 수업용 판", "학교 수업에 사용하는 수업용 판(vpylab.vercel.app)은 계정과 코드를 Supabase에 저장합니다. 수업용 판은 그 사이트의 개인정보 처리방침을 따릅니다."],
  ["7. 개인정보 보호책임자와 문의", "개인정보 보호책임자는 석리송(당곡고등학교 정보과 교사)입니다. 문의는 GitHub 이슈(github.com/vpylab/vpylab/issues)로 받습니다. 이슈는 누구나 볼 수 있으므로 개인정보를 적지 않아야 합니다."],
  ["8. 변경", "이 처리방침은 「개인정보 보호법」에 따라 작성했으며, 법령이나 운영 방식이 바뀌면 갱신합니다."],
];

function OpenPrivacy({ ui }) {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-2 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{ui("개인정보 처리방침 (공개판)")}</h1>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{ui("최종 수정일: 2026-11-09")}</p>
      </header>
      {OPEN_SECTIONS.map(([title, body]) => (
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
