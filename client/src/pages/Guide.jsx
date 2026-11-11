import { useUiText } from "../i18n/ui-text";
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import CodeVocabulary from '../components/learning/CodeVocabulary';
import GuideWays from '../components/guide/GuideWays';

function GuideSection({ id, title, children }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="font-display text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h2>
      <div className="text-sm leading-relaxed space-y-3" style={{ color: 'var(--color-text-secondary)' }}>
        {children}
      </div>
    </section>
  );
}

export default function Guide() {
  const ui = useUiText();
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-10">
          <h1 className="font-display text-3xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{ui("사용 안내")}</h1>
          <p className="text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{ui("처음 코딩하는 중·고등학생도 모양을 바꾸고, 움직임과 소리를 붙여 자기 작품을 만듭니다. 작은 시도를 친구와 나누고 재사용하며 배워 보세요.")}</p>
        </header>

        <nav aria-label={ui("사용 안내 목차")} className="flex flex-wrap gap-3 mb-10 text-sm" style={{ color: 'var(--color-accent)' }}>
          {[['ways',ui("세 가지 방법으로 만들기")],['start',ui("처음 시작하기")],['forge',ui("대장간")],['fork',ui("포크와 출처")],['character',ui("캐릭터 튜토리얼")],['projects',ui("팀 프로젝트")]].map(([id,label]) => <a key={id} href={'#'+id}>{label}</a>)}
        </nav>

        <GuideWays />

        <GuideSection id="start" title={ui("어디에서 시작할까요?")}>
          <ul className="list-disc pl-5 space-y-2">
            <li><Link to="/missions">{ui("트레이닝")}</Link>{ui(": 처음 코딩하는 학생을 위한 코스를 순서대로 연습합니다.")}</li>
            <li><Link to="/sandbox">{ui("만들기")}</Link>{ui(": Python 코드를 직접 쓰고 실행하며 내 프로젝트를 만듭니다.")}</li>
            <li><Link to="/tutorials">{ui("튜토리얼")}</Link>{ui(": 빛·소리·상호작용을 짧게 체험합니다.")}</li>
            <li><Link to="/forge">{ui("대장간")}</Link>{ui(": 슬라이더로 하나의 오브젝트를 만들고 여러 작품에서 재사용합니다.")}</li>
            <li><Link to="/gallery">{ui("갤러리")}</Link>{ui(": 실제 학생 작품과 원본 프로젝트를 살펴봅니다.")}</li>
            <li><Link to="/docs">{ui("문서")}</Link>{ui(": VPython 기능과 VPyLab 확장, 도형 가이드를 찾아봅니다.")}</li>
            <li>{ui("사용 안내: 지금 읽고 있는 서비스와 협력 프로젝트의 안내입니다.")}</li>
          </ul>
          <p>{ui("첫 화면에서는 만두·손전등·공구상자·분홍 친구를 골라 볼 수 있습니다.")}<Link to="/tutorials/welcome-friend">{ui("이 친구, 내 코드로 만들기")}</Link>{ui("에서 같은 도형을 직접 실행하고 색과 크기를 바꿔 보세요. 기본 만들기의 완제품은 하나의 compound입니다. 첫 화면의 만두 빚기·불 켜기·뚜껑 달그락·입 크게 벌리기를 눌러 보세요. 전용 모션 실습은 부품을 움직이고 마지막에 compound로 완성합니다. 프렌즈를 고르면 네 친구가 서로 다른 박자로 통통 뜁니다. 실습의 friends 목록에서 각 friend.pos를 바꿔 따로 움직여 보세요. 캐릭터별 3D 무대 조명은 버튼으로 켜고 끌 수 있습니다. 아직 이름은 정하지 않았습니다.")}</p>
          <p><strong>{ui("내 메인 꾸미기")}</strong>{ui(": 만들기 → 도구 → 현재 프로젝트를 내 메인으로 설정을 누르면 코드 사본과 현재 화면을 홈에 둘 수 있습니다. 홈에서 환영 문구·배경색을 바꾸고 내 작품 실행을 눌러 돌려보세요. 설정은 이 브라우저에서 계정별로 보관하며 공개 등록과 별도입니다. 코드 수정 후 다시 설정하면 메인도 갱신됩니다.")}</p>
          <p><strong>{ui("무대 조명 조절 (VPyLab 자체 기능)")}</strong>{ui(": 기본 친구 화면에서 ‘시점·조명 상세 설정’과 ‘조명 조절’을 차례로 펼쳐 조명별 위치·각도 X/Y/Z, 빛 크기·밝기·색을 슬라이더로 바꾸세요. 기본 조명으로 캐릭터별 배치와 색을 복구합니다. 내가 둔 작품의 조명은 그 작품 코드에서 바꿉니다.")}</p>
          <p>{ui("정지·화면 이동·오류 종료 시 예약음까지 함께 멈춥니다. Python 본문이 끝난 뒤에도 소리가 재생 중이면 정지를 누를 수 있습니다.")}</p>
          <p>{ui("기본 친구도 좌우로 끌어 회전하고 시점 초기화로 되돌립니다. 기본 화면으로 돌아가도 작품 사본은 남으며, 꾸미기의 ‘메인에 이 작품 표시’를 켜서 다시 사용할 수 있습니다.")}</p>
          <p>{ui("교사가 제공한 GlowScript 원본 33개는 갤러리에서 볼 수 있습니다. 학생 작품 7개와 교사·참고 자료 26개를 구분하고, 참고 자료 목록은 접어 둡니다. 각 상세 화면에서 원본과 VPyLab 실습을 열 수 있습니다. 원본 실행과 VPyLab 실행은 환경에 따라 차이가 있을 수 있습니다.")}</p>
        </GuideSection>

        <GuideSection id="forge" title={ui("대장간: 내 모양을 재사용할 부품으로")}>
          <ol className="list-decimal pl-5 space-y-2">
            <li>{ui("작업대에서 메인의 만두·손전등·공구상자·분홍 친구 4종, 종과 프로젝트 에셋 6종, 기본 모양 5종 중 하나를 고릅니다. 코인·보석·나무·로켓·상자·깃발을 내 프로젝트에 활용해 보세요.")}</li>
            <li>{ui("슬라이더로 비율과 크기를 바꾸고, 색·표정·장식을 조절합니다. 마우스로 돌려 보거나 정면·위 시점을 선택하세요.")}</li>
            <li>{ui("이름과 설명을 적어 내 모듈 보관함에 등록합니다. 작업 중 초안과 이 보관함은 현재 브라우저에 저장됩니다.")}</li>
            <li>{ui("완성 모듈 코드 복사 후 만들기 화면에 붙여 넣습니다. 함수의 위치와 크기를 바꾸면 여러 개를 만들 수 있습니다. Python 파일로도 내려받을 수 있습니다.")}</li>
          </ol>
          <p>{ui("대장간은 문서·튜토리얼 밖에서도 독립적으로 사용합니다. 제작 대상은 다른 작품에 넣어 쓸 하나의 오브젝트입니다. 슬라이더 값은 생성 코드에 반영되며, 실습에서 고친 코드를 슬라이더로 되돌리지는 않습니다.")}</p>
          <p>{ui("복사한 코드의")}<code>my_module.object</code>{ui("가 완제품 compound입니다. 일반 VPython 속성으로 직접 이동하고 색·투명도를 바꿀 수 있습니다.")}</p>
          <pre className="overflow-x-auto rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-panel)' }}><code>{`obj = my_module.object
obj.pos.x += 0.1
obj.pos = vector(2, 0, 0)
obj.color = vector(0.5, 1, 0.7)
obj.opacity = 0.6`}</code></pre>
          <CodeVocabulary code={'sphere(radius=0.5, opacity=0.6)\nfriend = compound([body, eye])'}/>
          <p>{ui("낯선 영어 단어는 타이핑하거나 자동 완성할 때 그림·뜻·짧은 예시로 처음 두 번만 안내합니다. 알겠어요를 누르면 생략합니다. 자동 완성은 AI 없이 동작하며 Tab으로 적용하고 Esc로 닫습니다. Enter는 줄바꿈입니다.")}</p>
          <p>{ui("compound의 색은 원래 부품 색에 곱해집니다. 흰 부품은 새 색이 잘 나타나고 검은 부품은 검게 남습니다. 특정 부품을 따로 바꾸려면 복사한 코드의 해당 부품 속성을 살펴보세요.")}<Link to="/docs#compound">{ui("compound 문서")}</Link>{ui("와")}<Link to="/docs#shape-dome">{ui("반구·돔 가이드")}</Link>{ui("를 함께 볼 수 있습니다.")}</p>
          <p><strong>{ui("종 만들기")}</strong>{ui("는 ① 모양만 만들기 → ② 클릭하면 소리 → ③ 음파 효과까지 순서로 체험합니다. 소리 높이를 바꾸고 종을 눌러 보세요. 음파 고리는 소리를 눈으로 표현하는 효과입니다.")}</p>
          <p><strong>{ui("VPyLab 자체 기능:")}</strong>{ui("대장간과 생성 편의 함수, 소리 명령은 VPyLab에서 제공합니다. 일반 도형·compound·위치 속성과 구분해 문서에 표시합니다. 소리 명령을 외부 VPython으로 옮길 때는 해당 환경에 맞게 바꿔야 합니다. 압출 모양은 공유 HTML에서 표현 범위가 더 좁습니다.")}</p>
        </GuideSection>

        <GuideSection id="fork" title={ui("다른 사람의 모듈을 포크하고 출처 남기기")}>
          <ol className="list-decimal pl-5 space-y-2">
            <li>{ui("모듈 보관함의 모두의 모듈에서 모양을 고릅니다. 목록에서는 코드를 기본으로 펼쳐 보여 주지 않습니다.")}</li>
            <li>{ui("로그인한 뒤 포크해서 가져오기를 누릅니다. 내 계정에 비공개 포크 기록을 남긴 뒤 작업대에 엽니다.")}</li>
            <li>{ui("내 모양으로 고치고, 추가로 참고한 프로젝트가 있으면 이름과 링크를 남깁니다. 참고 링크는 8개까지 넣을 수 있습니다.")}</li>
            <li>{ui("다시 공개할 때는 공개할 별명을 확인합니다. 같은 포크 기록에 수정본이 반영되고 원본 제목·제작자와 참고 기록이 이어집니다.")}</li>
          </ol>
          <p>{ui("내 모듈에서 공개 상태를 확인하고 내 모듈 공개 내리기로 비공개로 바꿀 수 있습니다. 내가 공개한 모듈은 내 모듈 이어 만들기로 수정하세요. 원본이 삭제되어도 저장된 출처 제목과 제작자 기록은 유지됩니다.")}</p>
          <p>{ui("공개 모듈의 코드는 다른 사람이 열고 가져갈 수 있습니다. 대장간 목록의 기본 접힘은 코드의 비공개 설정을 뜻하지 않습니다. 공개 이름과 설명에는 개인정보를 넣지 마세요.")}</p>
          <p>{ui("작업 초안·브라우저 보관함과 계정에 기록된 포크·공개 모듈은 다릅니다. 다른 기기에서 이어 쓸 항목은 계정 기록을 확인하고, 코드만 옮길 때는 복사하면 됩니다.")}</p>
        </GuideSection>

        <GuideSection id="character" title={ui("캐릭터를 만들고 움직이며 배우기")}>
          <p><Link to="/tutorials/forge-character">{ui("대장간 캐릭터 튜토리얼")}</Link>{ui("은 ① 부품을 compound로 묶기 → ② 완제품 움직이기 → ③ 아이템을 먹으면 색 바꾸기의 세 단계입니다.")}</p>
          <p>{ui("방향키·WASD 또는 화면 버튼으로 움직여 보세요. 아이템을 먹으면 조작한 캐릭터의 색이 바뀌고, 옆 캐릭터와 검은 눈은 유지됩니다. 조건과 색 값을 하나씩 바꿔 결과를 예상하고 확인합니다.")}</p>
          <p>{ui("친구와 몸통·표정·움직임·소리를 나누어 실험하고, 서로 만든 부품을 읽고 조합해 보세요. 기본 학습은 AI 없이 직접 예상·실행·수정·설명하는 흐름입니다.")}</p>
        </GuideSection>

        <p className="mb-10 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{ui("GitHub 연결이 처음이라면")}{' '}
          <Link to="/courses/beg-github-project" style={{ color: 'var(--color-accent)' }}>{ui("GitHub 프로젝트 시작하기")}</Link>{ui("에서 프로젝트 생성부터 저장·복원·공유까지 순서대로 실습할 수 있습니다.")}</p>

        <GuideSection id="projects" title={ui("팀 프로젝트: 함께 만들며 배우는 것")}>
          <ul className="list-disc pl-5 space-y-2">
            <li>{ui("예상한 움직임과 실제 실행 결과를 비교하며 코드의 원리를 이해합니다.")}</li>
            <li>{ui("오류가 생긴 조건과 수정 방법을 설명하며 자신의 생각을 점검합니다.")}</li>
            <li>{ui("친구의 코드와 해결 방법을 읽고, 다른 접근을 자신의 작품에 적용합니다.")}</li>
            <li>{ui("이전 버전과 작업 기록을 돌아보며 다음에 시도할 일을 정합니다.")}</li>
          </ul>
        </GuideSection>

        <GuideSection title={ui("1. 프로젝트 만들기와 합류")}>
          <ol className="list-decimal pl-5 space-y-2">
            <li>{ui("VPyLab에 로그인한 뒤 프로젝트 화면을 엽니다.")}</li>
            <li>{ui("한 명이 새 프로젝트를 만들고, 팀 멤버 화면에서 초대 코드를 공유합니다.")}</li>
            <li>{ui("팀원은 프로젝트 목록의 초대 코드 입력란에 코드를 넣고 합류합니다.")}</li>
          </ol>
          <p>{ui("VPyLab 안에서 함께 편집하고 저장하는 데 GitHub 연결은 필수가 아닙니다. 혼자 작업할 때도 프로젝트 저장과 이력 복원을 사용할 수 있습니다.")}</p>
        </GuideSection>

        <GuideSection title={ui("2. 역할 나누고 실행하기")}>
          <p>{ui("움직임, 충돌 조건, 소리처럼 맡을 부분을 정합니다. 한 가지씩 바꾸고 실행해 예상한 결과가 나오는지 확인하세요.")}</p>
          <p>{ui("예를 들어 공의 속도를 바꾸기 전에 궤적이 어떻게 달라질지 예상해 보고, 실행 결과를 친구와 비교합니다. 결과가 다르면 변수와 조건문을 함께 살펴봅니다.")}</p>
          <p>{ui("팀원이 저장한 뒤에는 최신 코드를 가져와 확인하고 이어서 작업합니다. 같은 부분을 동시에 수정하려면 먼저 순서를 정하세요.")}</p>
        </GuideSection>

        <GuideSection title={ui("3. 코드 저장과 기록 남기기")}>
          <div
            className="rounded-xl p-5 space-y-3"
            style={{ backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)' }}
          >
            <p><strong>{ui("코드 저장")}</strong>{ui("은 현재 에디터의 코드를 프로젝트에 반영합니다.")}</p>
            <p>
              <strong>{ui("기록 남기기")}</strong>{ui("는 코드를 바꾸지 않고 한 일, 막힌 점, 다음 할 일을 남깁니다. 역할 분담이나 시도한 방법을 적을 때 사용합니다.")}</p>
          </div>
          <p>{ui("기록 예: “공이 바닥을 통과해서 중심 좌표 대신 반지름을 포함해 충돌을 판단했다. 다음에는 속도가 빠를 때도 확인한다.”")}</p>
          <p>{ui("기록은 직접 작성합니다. 무엇을 바꿨고 결과가 어땠는지 적어두면 다음 시간에 작업을 이어가거나 팀원에게 도움을 요청하기 좋습니다.")}</p>
        </GuideSection>

        <GuideSection title={ui("4. 저장 이력 확인과 복원")}>
          <p>{ui("프로젝트 상단의")}<strong>{ui("📜 저장 이력")}</strong>{ui("에서 저장한 사람과 시점을 확인합니다. 필요하면 이전 버전을 에디터로 복원해 실행 결과를 다시 확인할 수 있습니다.")}</p>
          <p>{ui("복원한 코드를 실행해 결과를 확인한 뒤 코드 저장으로 반영하세요. GitHub에도 반영하려면 복원 후 코드 저장이 필요합니다.")}</p>
        </GuideSection>

        <GuideSection title={ui("GitHub 연결과 작품 공유")}>
          <p>{ui("GitHub를 연결하면 코드를 저장소에 반영하고 GitHub Pages 실행 페이지로 공유할 수 있습니다. 갤러리 발행으로 작품을 공유하는 방법도 있습니다.")}</p>
          <p>{ui("VPyLab 초대 코드는 앱 안의 편집 권한입니다. 팀원이 GitHub 저장소에도 직접 반영하려면 GitHub 공동작업자 권한이 추가로 필요합니다. 연결 상태와 반영 결과는 저장 후 안내에서 확인하세요.")}</p>
        </GuideSection>

        <div className="flex gap-3 flex-wrap">
          <Link to="/sandbox" className="btn-primary no-underline">{ui("프로젝트 열기")}</Link>
          <Link to="/tutorials" className="btn-secondary no-underline">{ui("튜토리얼 체험하기")}</Link>
        </div>
      </main>
    </div>
  );
}
