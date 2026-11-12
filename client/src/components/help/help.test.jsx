import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import english from '../../i18n/catalogs/en-ui-text.json';
import useAppStore from '../../stores/appStore';
import DialogHelp from './DialogHelp.jsx';
import additions from './en-ui-text.additions.json';
import { EXTERNAL_LABELS } from './external-labels';
import { isHelpDone, markHelpDone } from './help-memory';
import { helpText } from './help-text';
import { HelpMong, HelpMore } from './HelpParts.jsx';
import HelpSlot from './HelpSlot.jsx';

const TOPICS = [
  'drive-signin', 'drive-scope', 'drive-reauth', 'drive-conflict', 'keep-file',
  'github-connect', 'github-reconnect', 'github-create', 'github-invite', 'github-invited', 'github-missing-invite', 'github-conflict',
  'leaving', 'guide-solo', 'guide-drive', 'guide-team', 'guide-leaving',
];
const HELP_DIR = resolve(process.cwd(), 'src/components/help');
const sources = () => readdirSync(HELP_DIR).filter((name) => /\.(jsx?|css)$/.test(name) && !/\.test\./.test(name)).map((name) => [name, readFileSync(resolve(HELP_DIR, name), 'utf8')]);

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ locale: 'ko' });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.doUnmock('./DialogHelp.jsx'); vi.resetModules(); });

/** 닫혀 있는 펼치기를 모두 엽니다(안에 든 펼치기까지). */
function openAll(container) {
  for (let round = 0; round < 6; round += 1) {
    const closed = [...container.querySelectorAll('button[aria-expanded="false"]')];
    if (!closed.length) return;
    closed.forEach((button) => fireEvent.click(button));
  }
}

describe('그 자리 안내: 펼치기와 부품', () => {
  it('펼치기는 버튼이며 닫혀 있는 동안 내용을 그리지 않고, 누르면 aria-expanded와 함께 열린다', () => {
    render(<HelpMore summary="자세히 보기"><p>안의 내용</p></HelpMore>);
    const toggle = screen.getByRole('button', { name: '자세히 보기' });
    expect(toggle).toHaveAttribute('type', 'button');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('안의 내용')).toBeNull();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(toggle.getAttribute('aria-controls'))).toHaveTextContent('안의 내용');
    fireEvent.click(toggle);
    expect(screen.queryByText('안의 내용')).toBeNull();
  });

  it('캐릭터 그림을 불러오지 못해도 이름과 말은 남는다', () => {
    const { container } = render(<HelpMong id="arong">저장까지 이어져.</HelpMong>);
    const image = screen.getByAltText('아롱몽(스케치북 캐릭터)');
    expect(image).toHaveAttribute('src', '/mong/arong.png');
    expect(image).toHaveAttribute('loading', 'lazy');
    fireEvent.error(image);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('아롱몽저장까지 이어져.');
  });

  it('브라우저 저장소를 사용할 수 없어도 오류 없이 "한 적 없음"으로 동작한다', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => markHelpDone('drive-signin')).not.toThrow();
    expect(isHelpDone('drive-signin')).toBe(false);
  });

  it('한 번 성공한 브라우저에서는 로그인 순서를 접어 두고 캐릭터의 말도 줄인다', () => {
    const first = render(<DialogHelp topic="drive-signin" />);
    expect(screen.getByRole('button', { name: '버튼을 누르면 일어나는 일' })).toHaveAttribute('aria-expanded', 'true');
    expect(first.container.querySelector('[data-mong="arong"]')).not.toBeNull();
    first.unmount();
    markHelpDone('drive-signin');
    expect(isHelpDone('drive-signin')).toBe(true);
    const again = render(<DialogHelp topic="drive-signin" />);
    expect(screen.getByRole('button', { name: '버튼을 누르면 일어나는 일' })).toHaveAttribute('aria-expanded', 'false');
    expect(again.container.querySelector('[data-mong]')).toBeNull();
    // 저장하는 값은 표시 하나뿐입니다(계정·코드 없음).
    expect(localStorage.getItem('vpylab:help:done:v1')).toBe('{"drive-signin":1}');
  });
});

describe('그 자리 안내: 그림', () => {
  it('구글 창 그림은 직접 그린 도식이며 대체 설명과 실제 화면의 글자를 갖는다', () => {
    const { container } = render(<DialogHelp topic="drive-scope" />);
    const sketch = container.querySelector('[data-sketch="google-consent"]');
    const picture = within(sketch).getByRole('img');
    expect(picture.getAttribute('aria-label')).toMatch(/"Google Drive 파일"이 적힌 줄의 빈 체크 상자를 먼저 체크하고, 그 아래의 "계속" 버튼/);
    expect(picture).toHaveTextContent('구글 창');
    expect(picture).toHaveTextContent('Google Drive 파일');
    expect(picture).toHaveTextContent('계속');
    expect([...picture.querySelectorAll('.vh-tag')].map((tag) => tag.textContent)).toEqual(['1여기를 체크합니다', '2여기를 누릅니다']);
    // 실제 화면이 영어일 때의 표기와, 그림이 실제 화면과 다를 수 있다는 안내
    expect(sketch.querySelector('figcaption')).toHaveTextContent('창이 영어로 표시되면 같은 곳에 "Google Drive files", "Continue"(이)라고 적혀 있습니다.');
    expect(sketch.querySelector('figcaption')).toHaveTextContent('실제 화면은 모양이 다를 수 있습니다.');
    // 캡처한 그림이나 밖에서 불러오는 그림이 없습니다.
    expect(container.querySelector('img, svg image, iframe, object, embed')).toBeNull();
  });

  it('영어 화면에서는 그림의 글자를 영어 표기로 적고 한국어 표기를 함께 알려 준다', () => {
    useAppStore.setState({ locale: 'en' });
    const { container } = render(<DialogHelp topic="drive-scope" />);
    const sketch = container.querySelector('[data-sketch="google-consent"]');
    expect(within(sketch).getByRole('img')).toHaveTextContent('Google Drive files');
    expect(within(sketch).getByRole('img')).toHaveTextContent('Continue');
    expect(sketch.querySelector('.vh-alt-labels')).toHaveTextContent('If the window is shown in Korean, the same places read "Google Drive 파일", "계속".');
  });

  it('GitHub 창 그림에는 권한 글자와 초록색 버튼의 글자를 그대로 적는다', () => {
    const { container } = render(<DialogHelp topic="github-connect" waiting />);
    const picture = within(container.querySelector('[data-sketch="github-authorize"]')).getByRole('img');
    expect(picture).toHaveTextContent('GitHub 창');
    expect(picture).toHaveTextContent(EXTERNAL_LABELS.githubScope.en);
    expect(picture.querySelector('.vh-ext-btn[data-kind="green"]')).toHaveTextContent('Authorize vpylab');
    expect(picture.querySelector('.vh-tag')).toHaveTextContent('여기를 누릅니다');
  });

  it('팝업 차단 안내는 순서, 브라우저 창 그림, 다른 기기 안내를 함께 보여 준다', () => {
    const { container } = render(<DialogHelp topic="drive-signin" popupBlocked />);
    expect(screen.getByRole('button', { name: '창이 열리지 않을 때' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('주소 표시줄 오른쪽 끝에 생긴 팝업 차단 아이콘을 누릅니다.')).toBeInTheDocument();
    const picture = within(container.querySelector('[data-sketch="popup-blocked"]')).getByRole('img');
    expect(picture).toHaveTextContent('브라우저 창');
    expect(picture).toHaveTextContent('항상 허용');
    expect(picture).toHaveTextContent('완료');
    expect(screen.getByText(/아이패드와 아이폰에서는 설정 앱의 Safari 항목에서 "팝업 차단"을 끕니다/)).toBeInTheDocument();
    // 창이 막힌 것을 알았으면 순서 안내는 접고 해결 방법을 먼저 보입니다.
    expect(screen.getByRole('button', { name: '버튼을 누르면 일어나는 일' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('도구 메뉴 그림은 VPyLab 화면의 실제 버튼 이름을 적는다', () => {
    const { container } = render(<DialogHelp topic="guide-solo" />);
    openAll(container);
    const picture = within(container.querySelector('[data-sketch="tools-file"]')).getByRole('img');
    expect([...picture.querySelectorAll('.vh-menu-row')].map((row) => row.textContent)).toEqual(['초기 코드로 돌아가기', '공유', '파일 열기 (.py, .html)', 'HTML 내려받기']);
    expect(picture).toHaveTextContent('도구');
  });
});

describe('그 자리 안내: 주제마다', () => {
  it('승인 창을 기다리는 동안 지금 할 일을 순서와 그림으로 보여 준다', () => {
    const { container } = render(<DialogHelp topic="drive-signin" waiting />);
    expect(screen.getByRole('status')).toHaveTextContent('지금 열린 구글 창에서 할 일');
    const steps = container.querySelectorAll('ol.vh-steps > li');
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent('저장에 사용할 내 구글 계정을 고릅니다.');
    expect(steps[0].querySelector('[data-sketch="google-account"]')).not.toBeNull();
    expect(steps[1]).toHaveTextContent('"Google Drive 파일"이 적힌 줄의 체크 상자는 처음에 비어 있습니다. 직접 눌러 체크합니다.');
    expect(steps[1].querySelector('[data-sketch="google-consent"]')).not.toBeNull();
    expect(steps[2]).toHaveTextContent('"계속"을 누르면 구글 창이 닫히고');
    expect(screen.getByText(/다른 창 뒤에 가려져 있을 수 있습니다/)).toBeInTheDocument();
  });

  it('충돌 안내는 버튼 견본과 고르면 일어나는 일을 짝지어 보여 준다', () => {
    const drive = render(<DialogHelp topic="drive-conflict" />);
    expect([...drive.container.querySelectorAll('.vh-choice dt')].map((term) => term.textContent)).toEqual(['내 코드를 사본으로 저장', '드라이브 내용 불러오기(내 변경은 버림)', '내 코드로 덮어쓰기']);
    expect(drive.container.querySelectorAll('.vh-choice dd')[0]).toHaveTextContent('"(사본)"이 붙은 새 파일로 저장됩니다. 드라이브의 원래 파일은 바뀌지 않습니다.');
    expect(drive.container.querySelectorAll('.vh-choice dd')[2]).toHaveTextContent('구글 드라이브의 버전 기록에서 확인할 수 있습니다.');
    drive.unmount();
    const team = render(<DialogHelp topic="github-conflict" />);
    expect([...team.container.querySelectorAll('.vh-choice dt')].map((term) => term.textContent)).toEqual(['최신 코드 가져오기(내 변경은 버림)', '내 코드로 저장']);
    expect(team.container.querySelectorAll('.vh-choice dd')[1]).toHaveTextContent('GitHub의 저장 기록에 남습니다.');
  });

  it('공용 컴퓨터 정리 순서는 여섯 단계이며 실제 버튼 이름을 적는다', () => {
    const { container } = render(<DialogHelp topic="guide-leaving" />);
    expect(screen.getByRole('heading', { level: 3, name: '공용 컴퓨터 사용을 마칠 때' })).toBeInTheDocument();
    const steps = [...container.querySelectorAll('ol.vh-steps > li')].map((step) => step.querySelector('.vh-step-text').textContent);
    expect(steps).toHaveLength(6);
    expect(steps[1]).toMatch(/"내 드라이브" 버튼.*"로그아웃".*"확인"/);
    expect(steps[2]).toContain('"공용 컴퓨터에서는 구글 계정에서도 로그아웃하십시오."');
    expect(steps[3]).toMatch(/"팀 프로젝트" 버튼.*"GitHub 연결 해제"/);
    expect(steps[4]).toContain('"초기 코드로 돌아가기"');
    expect(container.querySelector('[data-sketch="tools-reset"]')).not.toBeNull();
  });

  it.each(TOPICS)('%s: 순서는 <ol>, 그림은 대체 설명이 있는 role="img"이고, 모든 펼치기를 키보드로 열 수 있다', (topic) => {
    const { container } = render(<DialogHelp topic={topic} />);
    openAll(container);
    expect(container.querySelector('.vh-help')).not.toBeNull();
    for (const picture of container.querySelectorAll('.vh-win')) {
      expect(picture).toHaveAttribute('role', 'img');
      expect(picture.getAttribute('aria-label').length).toBeGreaterThan(20);
    }
    for (const steps of container.querySelectorAll('.vh-steps')) expect(steps.tagName).toBe('OL');
    for (const toggle of container.querySelectorAll('.vh-more-toggle')) {
      expect(toggle.tagName).toBe('BUTTON');
      expect(toggle).toHaveAttribute('type', 'button');
      expect(document.getElementById(toggle.getAttribute('aria-controls'))).not.toBeNull();
    }
    // 안내는 읽기만 하는 내용입니다: 링크·입력 칸·양식이 없습니다.
    expect(container.querySelector('a, input, form, select, textarea, iframe')).toBeNull();
  });

  it.each([...TOPICS.map((topic) => [topic, {}]), ['drive-signin', { waiting: true }], ['drive-signin', { popupBlocked: true }], ['github-connect', { waiting: true }], ['github-reconnect', { waiting: true }]])(
    '영어 화면 %s %o: 글과 대체 설명이 모두 번역된다',
    (topic, props) => {
      useAppStore.setState({ locale: 'en' });
      const { container } = render(<DialogHelp topic={topic} {...props} />);
      openAll(container);
      // 한국어 화면의 표기를 일부러 함께 알려 주는 줄과, 드라이브가 붙이는 파일 이름 "(사본)"만 한글로 남습니다.
      container.querySelectorAll('.vh-alt-labels').forEach((node) => node.remove());
      expect(container.textContent.replaceAll('"(사본)"', '')).not.toMatch(/[가-힣]/);
      for (const node of container.querySelectorAll('[aria-label], [alt]')) {
        expect(node.getAttribute('aria-label') || node.getAttribute('alt')).not.toMatch(/[가-힣]/);
      }
    },
  );

  it('없는 주제는 아무것도 그리지 않는다', () => {
    const { container } = render(<DialogHelp topic="constructor" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('그 자리 안내: 번역 모음과 안전', () => {
  it('번역 모음의 원문은 모두 안내에서 사용하고, 앱의 번역에 같은 원문이 있으면 번역도 같다', () => {
    const code = sources().filter(([name]) => /\.jsx?$/.test(name)).map(([, text]) => text.replaceAll('\\"', '"')).join('\n');
    for (const [korean, translated] of Object.entries(additions)) {
      expect(code.includes(korean.split('{0}')[0]), `사용하지 않는 원문: ${korean}`).toBe(true);
      expect(translated.trim(), korean).not.toBe('');
      expect(translated.replaceAll('(사본)', ''), korean).not.toMatch(/[가-힣]/);
      // 이 모음을 i18n/catalogs/en-ui-text.json에 합친 뒤에도 두 곳의 번역이 어긋나지 않게 합니다.
      if (Object.hasOwn(english, korean)) expect(english[korean], korean).toBe(translated);
    }
  });

  it('번역 모음을 먼저 찾고, 없으면 앱의 번역을 따른다', () => {
    expect(helpText('en', '여기를 누릅니다')).toBe('Press here');
    expect(helpText('en', '저장')).toBe('Save');
    expect(helpText('ko', '여기를 누릅니다')).toBe('여기를 누릅니다');
    const tagged = (strings, ...values) => helpText('en', strings, ...values);
    expect(tagged`창이 영어로 표시되면 같은 곳에 ${'"계속"'}(이)라고 적혀 있습니다.`).toBe('If the window is shown in Korean, the same places read "계속".');
  });

  it('안내 코드는 밖의 주소·스크립트를 불러오지 않고 innerHTML을 사용하지 않는다', () => {
    for (const [name, text] of sources()) {
      expect(text, name).not.toMatch(/innerHTML|dangerouslySetInnerHTML|\beval\(|document\.write/);
      expect(text, name).not.toMatch(/https?:\/\//);
      expect(text, name).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|url\(/);
    }
  });
});

describe('그 자리 안내: 연결 지점(HelpSlot)', () => {
  it('안내를 따로 불러와 보여 준다', async () => {
    render(<HelpSlot topic="github-invited" />);
    expect(await screen.findByText(/"수락"을 누르면 그 프로젝트가 "내 프로젝트" 목록에 나타납니다/)).toBeInTheDocument();
  });

  it('안내 파일을 불러오지 못하면 아무것도 그리지 않고 둘레의 화면은 그대로 둔다', async () => {
    vi.resetModules();
    let tried = false;
    vi.doMock('./DialogHelp.jsx', () => { tried = true; throw new Error('파일을 불러오지 못함'); });
    const { default: Slot } = await import('./HelpSlot.jsx');
    const { container } = render(<div><button type="button">드라이브에 저장</button><Slot topic="drive-signin" /></div>);
    await waitFor(() => expect(tried).toBe(true));
    await waitFor(() => expect(container.querySelector('.vh-help')).toBeNull());
    expect(screen.getByRole('button', { name: '드라이브에 저장' })).toBeInTheDocument();
    expect(container.textContent).toBe('드라이브에 저장');
  });
});
