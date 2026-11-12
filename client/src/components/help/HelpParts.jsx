import { useId, useState } from 'react';
import { useHelpText } from './help-text';
import './help.css';

/**
 * 그 자리 안내의 작은 부품: 펼치기, 번호 순서, 캐릭터 말풍선, 버튼 견본.
 * 색과 글꼴은 index.css의 테마 변수를 따릅니다. 모양은 help.css에 있습니다.
 */

/** 캐릭터 그림은 검은 외곽선이라 두 테마 모두 밝은 원 위에 올립니다(guide/GuideWays.jsx와 같은 색). */
const MONGS = {
  chorong: { name: '초롱몽', alt: '초롱몽(손전등 캐릭터)', tone: '#f1efff' },
  mongsil: { name: '몽실몽', alt: '몽실몽(구름 캐릭터)', tone: '#e9eefb' },
  arong: { name: '아롱몽', alt: '아롱몽(스케치북 캐릭터)', tone: '#fff8e8' },
  gori: { name: '고리몽', alt: '고리몽(이어진 퍼즐 캐릭터)', tone: '#f3eefb' },
  doran: { name: '도란몽', alt: '도란몽(말풍선 캐릭터)', tone: '#edf6ff' },
};

/** 안내 한 덩어리의 바깥 틀. tone="now"는 지금 해야 할 일을 강조합니다. */
export function HelpBox({ topic, tone, children }) {
  return <div className="vh-help" data-help={topic} data-tone={tone || undefined}>{children}</div>;
}

/** 캐릭터가 건네는 한마디. 그림을 불러오지 못하면 그림만 빼고 이름과 말은 남깁니다. */
export function HelpMong({ id, children }) {
  const { h } = useHelpText();
  const [failed, setFailed] = useState(false);
  const mong = MONGS[id];
  if (!mong) return <p className="vh-say-bubble">{children}</p>;
  return (
    <div className="vh-say" data-mong={id} style={{ '--vh-mong-tone': mong.tone }}>
      {!failed && (
        <span className="vh-mong">
          <img src={`/mong/${id}.png`} alt={h(mong.alt)} width={40} height={40} loading="lazy" decoding="async" onError={() => setFailed(true)} />
        </span>
      )}
      <p className="vh-say-bubble">
        <span className="vh-say-name">{h(mong.name)}</span>
        {children}
      </p>
    </div>
  );
}

/**
 * 펼치기. 버튼이라 Tab으로 이동하고 Enter·Space로 엽니다. 닫혀 있는 동안에는 안의 내용을 그리지 않습니다.
 * 양식(form) 안에 놓여도 제출하지 않도록 type="button"입니다.
 */
export function HelpMore({ summary, defaultOpen = false, name, children }) {
  const id = useId();
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <div className="vh-more" data-open={open ? 'true' : 'false'} data-more={name || undefined}>
      <button type="button" className="vh-more-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
        <span className="vh-more-caret" aria-hidden="true" />
        <span>{summary}</span>
      </button>
      {open && <div id={id} className="vh-more-body">{children}</div>}
    </div>
  );
}

/** 번호 순서. items의 원소는 글(문자열·노드)이거나 { text, extra }이고, extra는 그 단계 아래에 놓는 그림입니다. */
export function HelpSteps({ items, label }) {
  return (
    <ol className="vh-steps" aria-label={label}>
      {items.map((item, index) => {
        const step = item && typeof item === 'object' && 'text' in item ? item : { text: item };
        return (
          <li key={index}>
            <span className="vh-step-text">{step.text}</span>
            {step.extra}
          </li>
        );
      })}
    </ol>
  );
}

/** VPyLab 화면의 버튼을 흉내 낸 견본. 누를 수 없고, 글자는 실제 버튼과 같습니다. */
export function ButtonSample({ children, tone }) {
  return <span className="vh-btn" data-tone={tone || undefined}>{children}</span>;
}

/** 버튼 견본과 "고르면 일어나는 일"을 짝지은 목록. */
export function ChoiceList({ items }) {
  return (
    <dl className="vh-choices">
      {items.map((item) => (
        <div key={item.button} className="vh-choice">
          <dt><ButtonSample>{item.button}</ButtonSample></dt>
          <dd>{item.result}</dd>
        </div>
      ))}
    </dl>
  );
}
