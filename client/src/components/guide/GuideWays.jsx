import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUiText } from '../../i18n/ui-text';
import { DRIVE_SAVE, OPEN_EDITION, TEAM_PROJECTS } from '../../lib/api-base';
import HelpSlot from '../help/HelpSlot';
import './guide-ways.css';

/**
 * 사용 안내의 "세 가지 방법으로 만들기" 구역 (애드온: Guide.jsx에는 <GuideWays /> 한 줄만 연결).
 * 혼자(로그인 없음) → 구글 드라이브 저장 → GitHub 팀 프로젝트 순서로 한 단계씩 더해 가는 흐름을
 * "두근두근 당곡" 캐릭터가 안내합니다. 그림이 없어도 글은 그대로 읽힙니다.
 *
 * 문장 원문과 설계서: docs/reference/solar/guide-ways-261112-solar.md
 * 영어 번역: client/src/i18n/catalogs/en-ui-text.json
 * 그림 출처: client/public/mong/README.md
 *
 * 단계 카드 아래의 "자세한 순서"는 저장 창·팀 프로젝트 창과 같은 그 자리 안내(components/help)를 펼쳐 보여 줍니다.
 * 안내는 따로 불러오며, 불러오지 못해도 이 구역의 글은 그대로 보입니다. 문장: docs/reference/solar/step-guides-261112-solar.md
 */

/** 캐릭터 그림은 검은 외곽선이라 두 테마 모두 밝은 원 위에 올립니다. tone은 그 원의 색입니다. */
const MONGS = {
  dugeun: { name: '두근몽', alt: '두근몽(씨앗 캐릭터)', tone: '#fdf3e4' },
  chorong: { name: '초롱몽', alt: '초롱몽(손전등 캐릭터)', tone: '#f1efff' },
  mongsil: { name: '몽실몽', alt: '몽실몽(구름 캐릭터)', tone: '#e9eefb' },
  sallang: { name: '살랑몽', alt: '살랑몽(연 캐릭터)', tone: '#eaf8ef' },
  arong: { name: '아롱몽', alt: '아롱몽(스케치북 캐릭터)', tone: '#fff8e8' },
  gori: { name: '고리몽', alt: '고리몽(이어진 퍼즐 캐릭터)', tone: '#f3eefb' },
  doran: { name: '도란몽', alt: '도란몽(말풍선 캐릭터)', tone: '#edf6ff' },
  ttukttak: { name: '뚝딱몽', alt: '뚝딱몽(공구상자 캐릭터)', tone: '#fff0ec' },
};

/** 캐릭터 그림과 말풍선. 그림을 불러오지 못하면 그림 자리만 비우고 이름과 말은 남깁니다. */
function MongSays({ id, size = 72, children }) {
  const ui = useUiText();
  const [failed, setFailed] = useState(false);
  const mong = MONGS[id];
  return (
    <div className="guide-say" data-mong={id} style={{ '--mong-size': `${size}px`, '--mong-tone': mong.tone }}>
      {!failed && (
        <span className="guide-mong">
          <img src={`/mong/${id}.png`} alt={ui(mong.alt)} width={size} height={size} loading="lazy" decoding="async" onError={() => setFailed(true)} />
        </span>
      )}
      <p className="guide-say-bubble">
        <span className="guide-say-name">{ui(mong.name)}</span>
        {children}
      </p>
    </div>
  );
}

/** "누르는 곳": 화면에서 누르는 순서. 묶음 사이는 화살표, 묶음 안은 같은 메뉴의 버튼입니다. */
function WhereToPress({ groups }) {
  const ui = useUiText();
  return (
    <p className="guide-way-where">
      <span className="guide-way-where-label">{ui("누르는 곳")}</span>
      <Link to="/sandbox" className="guide-way-key">{ui("만들기")}</Link>
      {groups.map(group => (
        <span key={group.join('|')} className="guide-way-where-group">
          <span className="guide-way-arrow">→</span>
          {group.map(label => <span key={label} className="guide-way-key">{label}</span>)}
        </span>
      ))}
    </p>
  );
}

function Way({ number, when, title, tag, lead, notice, children }) {
  return (
    <li className="guide-way">
      <span className="guide-way-number" aria-hidden="true">{number}</span>
      <div className="guide-way-card">
        <p className="guide-way-when">{when}</p>
        <div className="guide-way-head">
          <h3>{title}</h3>
          <span className="guide-way-tag">{tag}</span>
        </div>
        <p className="guide-way-lead">{lead}</p>
        {notice && <p className="guide-way-notice" role="note">{notice}</p>}
        {children}
      </div>
    </li>
  );
}

export default function GuideWays() {
  const ui = useUiText();
  // 만들기 화면의 버튼 이름과 같게 맞춥니다(구글 드라이브 저장이 없는 배포에서는 "프로젝트").
  const teamButton = ui(DRIVE_SAVE ? "팀 프로젝트" : "프로젝트");
  return (
    <section id="ways" className="guide-ways mb-10 scroll-mt-24">
      <h2 className="font-display text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>{ui("세 가지 방법으로 만들기")}</h2>
      <p className="guide-ways-lead">{ui("VPyLab에서 작품을 만드는 방법은 세 가지입니다. 첫째 방법은 로그인 없이 혼자 만드는 것으로, 이 방법만으로 작품을 만들고 보관하며 다른 사람에게 보낼 수 있습니다. 다른 컴퓨터에서 이어서 작업하려면 구글 드라이브 저장을 더합니다. 친구와 함께 만들 때는 GitHub 팀 프로젝트를 더합니다. 필요한 때에 한 단계씩 더하면 되며 처음부터 모두 할 필요는 없습니다.")}</p>
      <MongSays id="dugeun" size={80}>{ui("처음이면 1번부터 시작하면 돼. 2번과 3번은 필요해질 때 하면 돼.")}</MongSays>

      <ol className="guide-ways-steps">
        <Way
          number="1"
          when={ui("먼저")}
          title={ui("혼자 만들기")}
          tag={ui("로그인 없이")}
          lead={ui("로그인하지 않아도 만들기 화면에서 작품을 만들 수 있으며, 만든 작품은 링크나 파일로 보관할 수 있습니다.")}
        >
          <MongSays id="chorong">{ui("왜 그럴까? 더 살펴보자. 코드의 숫자를 하나 바꾸고 다시 실행하면 무엇이 달라지는지 확인할 수 있어.")}</MongSays>
          <ul className="guide-way-list">
            <li>{ui("만들기 화면에서 코드를 작성하고 실행합니다. 로그인이 필요하지 않습니다.")}</li>
            <li>{ui("작성하던 코드는 이 브라우저에 14일 동안 남습니다. 다시 열면 이어서 작업할 수 있습니다. 공용 컴퓨터에서는 도구 메뉴의 \"초기 코드로 돌아가기\"로 지웁니다.")}</li>
            <li>{ui("도구 메뉴의 \"공유\"를 누르면 작품 링크가 만들어집니다. 링크를 보관하거나 다른 사람에게 보낼 수 있습니다. 링크를 저장 용도로 사용해도 됩니다.")}</li>
            <li>{ui("\"HTML 내려받기\"로 받은 파일은 VPyLab 없이 혼자 실행됩니다. 인터넷 연결이 필요합니다. 도구 메뉴의 \"파일 열기 (.py, .html)\"로 VPyLab에 다시 불러올 수 있습니다. \"파이썬 파일(.py) 내려받기\"도 있습니다.")}</li>
          </ul>
          <WhereToPress groups={[[ui("도구")], [ui("공유"), ui("HTML 내려받기"), ui("파일 열기 (.py, .html)")]]} />
          <div className="guide-way-help"><HelpSlot topic="guide-solo" /></div>
          <div className="guide-way-tips">
            <MongSays id="mongsil" size={56}>{ui("조금 해 보고 골라도 돼. 로그인 없이 먼저 만들고, 저장 방법은 나중에 정해도 돼.")}</MongSays>
            <MongSays id="sallang" size={56}>{ui("이것도 한번 살펴볼까? \"공유\"로 만든 링크를 친구에게 보내면 친구도 바로 실행해 볼 수 있어.")}</MongSays>
          </div>
        </Way>

        <Way
          number="2"
          when={ui("저장이 필요하면")}
          title={ui("구글 드라이브에 저장하기")}
          tag={ui("구글 계정")}
          lead={ui("다른 컴퓨터에서도 이어서 작업하려면 내 구글 드라이브에 저장합니다. 이는 1번 방법에 저장을 더하는 것이며 만드는 방법은 그대로입니다.")}
          notice={!DRIVE_SAVE && <>{ui("이 사이트에는 구글 드라이브 저장이 설정되어 있지 않습니다.")}{OPEN_EDITION && <> {ui("1번 방법의 링크와 파일로 보관합니다.")}</>}</>}
        >
          <MongSays id="arong">{ui("이 느낌, 어떻게 담아 볼까? 마음에 든 작품을 내 드라이브에 저장해 두면 다음에 이어서 고칠 수 있어.")}</MongSays>
          <ul className="guide-way-list">
            <li>{ui("만들기 화면의 \"저장\"(Ctrl/Cmd+S)을 누르고 구글 계정으로 로그인하면 내 구글 드라이브의 VPyLab 폴더에 저장됩니다.")}</li>
            <li>{ui("\"내 드라이브\" 버튼으로 저장한 작품을 다른 컴퓨터에서도 엽니다.")}</li>
            <li>{ui("VPyLab은 이 앱이 만든 파일만 볼 수 있습니다. 운영자는 학생 코드를 보관하지 않습니다.")}</li>
            <li>{ui("구글 연결은 약 1시간마다 다시 승인받습니다. 그때 \"저장\"을 누르면 승인 창이 잠깐 열렸다 닫힙니다. 탭을 닫으면 연결이 끊깁니다.")}</li>
          </ul>
          <WhereToPress groups={[[ui("저장"), ui("내 드라이브")]]} />
          {DRIVE_SAVE && <div className="guide-way-help"><HelpSlot topic="guide-drive" /></div>}
        </Way>

        <Way
          number="3"
          when={ui("함께 만들 때")}
          title={ui("팀으로 만들기")}
          tag={ui("GitHub 계정 · 선택 기능")}
          lead={ui("구글 드라이브는 내가 만든 파일만 열 수 있으므로, 여러 사람이 함께 만드는 작품은 GitHub에 저장합니다.")}
          notice={!TEAM_PROJECTS && ui("이 사이트에는 팀 프로젝트가 설정되어 있지 않습니다.")}
        >
          <MongSays id="gori">{ui("이 둘을 함께 해 보면? 내 코드와 친구 코드를 한 프로젝트에 모으면 혼자서는 만들기 어려운 작품이 돼.")}</MongSays>
          <ul className="guide-way-list">
            <li>{ui`만들기 화면의 "${teamButton}" 버튼에서 GitHub 계정을 연결합니다. 13세 이상이 만들 수 있는 GitHub 계정이 필요합니다. 원하는 사람만 사용하는 선택 기능입니다.`}</li>
            <li>{ui("프로젝트 하나가 GitHub 저장소 하나입니다. 저장하면 커밋이 남습니다.")}</li>
            <li>{OPEN_EDITION ? ui("팀원을 GitHub 아이디로 초대합니다.") : ui("이 사이트에서는 팀원이 초대 코드로 프로젝트에 합류합니다.")}</li>
            <li>{ui("팀원이 먼저 저장했으면 최신 코드를 가져온 뒤 저장합니다.")}</li>
          </ul>
          <WhereToPress groups={[[teamButton]]} />
          {/* GitHub 아이디로 초대하는 배포(오픈소스 판의 GitHub 애드온)에서만 그 창의 순서를 보여 줍니다. */}
          {OPEN_EDITION && TEAM_PROJECTS && <div className="guide-way-help"><HelpSlot topic="guide-team" /></div>}
          <div className="guide-way-tips">
            <MongSays id="doran" size={56}>{ui("너는 어떻게 생각해? 같은 부분을 고치기 전에 누가 먼저 저장할지 팀원과 정하자.")}</MongSays>
            <MongSays id="ttukttak" size={56}>{ui`직접 만들어 볼까? "${teamButton}"에서 새 프로젝트를 하나 만들면 그것이 팀의 저장소가 돼.`}</MongSays>
          </div>
          <p className="guide-way-more">
            {ui("팀으로 함께 만들며 배우는 방법은 이 화면 아래쪽의")}{' '}
            <a href="#projects">{ui("팀 프로젝트 안내")}</a>{ui("에 이어집니다.")}
            {OPEN_EDITION && <> {ui("아래쪽 팀 프로젝트 안내에 나오는 초대 코드는 수업용 사이트에서 사용하는 방식입니다.")}</>}
          </p>
        </Way>
      </ol>
      {/* 공용 컴퓨터 사용을 마칠 때의 정리 순서. 구글 드라이브 저장이 있는 오픈소스 판의 버튼 이름으로 적혀 있어 그 배포에서만 보입니다.
          구역 id를 따로 두지 않아 목차는 그대로입니다. */}
      {OPEN_EDITION && DRIVE_SAVE && <HelpSlot topic="guide-leaving" />}
    </section>
  );
}
