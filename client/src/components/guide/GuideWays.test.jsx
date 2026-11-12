import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const MONG_IDS = ['dugeun', 'chorong', 'mongsil', 'sallang', 'arong', 'gori', 'doran', 'ttukttak'];

afterEach(() => {
  cleanup();
  vi.doUnmock('../../lib/api-base');
  vi.resetModules();
});

/** 배포마다 켜진 기능이 달라 api-base의 값을 바꿔 가며 화면을 그립니다. */
async function renderWays({ drive = true, team = true, open = true, locale = 'ko' } = {}) {
  vi.resetModules();
  vi.doMock('../../lib/api-base', async (importOriginal) => ({
    ...(await importOriginal()),
    DRIVE_SAVE: drive,
    TEAM_PROJECTS: team,
    OPEN_EDITION: open,
  }));
  const { default: useAppStore } = await import('../../stores/appStore');
  useAppStore.setState({ locale });
  const { default: GuideWays } = await import('./GuideWays.jsx');
  return render(<MemoryRouter><GuideWays /></MemoryRouter>);
}

describe('사용 안내: 세 가지 방법으로 만들기', () => {
  it('세 단계를 순서 있는 목록으로 보여 주고 단계마다 캐릭터의 말과 누르는 곳을 둔다', async () => {
    const { container } = await renderWays();
    expect(screen.getByRole('heading', { level: 2, name: '세 가지 방법으로 만들기' })).toBeInTheDocument();
    expect(container.querySelector('section#ways')).not.toBeNull();

    const steps = container.querySelectorAll('ol.guide-ways-steps > li');
    expect(steps).toHaveLength(3);
    expect([...steps].map(step => within(step).getByRole('heading', { level: 3 }).textContent)).toEqual(['혼자 만들기', '구글 드라이브에 저장하기', '팀으로 만들기']);
    expect([...steps].map(step => step.querySelector('.guide-way-when').textContent)).toEqual(['먼저', '저장이 필요하면', '함께 만들 때']);

    // 단계마다 2~4개 항목, 말풍선, 누르는 곳
    for (const step of steps) {
      const items = step.querySelectorAll('.guide-way-list > li');
      expect(items.length).toBeGreaterThanOrEqual(2);
      expect(items.length).toBeLessThanOrEqual(4);
      expect(step.querySelectorAll('.guide-say-bubble').length).toBeGreaterThanOrEqual(1);
      expect(within(step).getByText('누르는 곳')).toBeInTheDocument();
      expect(within(step).getByRole('link', { name: '만들기' })).toHaveAttribute('href', '/sandbox');
    }
    const keys = step => [...step.querySelectorAll('span.guide-way-key')].map(key => key.textContent);
    expect(keys(steps[0])).toEqual(['도구', '공유', 'HTML 내려받기', '파일 열기 (.py, .html)']);
    expect(keys(steps[1])).toEqual(['저장', '내 드라이브']);
    expect(keys(steps[2])).toEqual(['팀 프로젝트']);

    // 1단계만으로 충분하다는 점과 버튼 이름
    expect(screen.getByText(/이 방법만으로 작품을 만들고 보관하며 다른 사람에게 보낼 수 있습니다/)).toBeInTheDocument();
    expect(within(steps[0]).getByText(/14일 동안 남습니다.*"초기 코드로 돌아가기"로 지웁니다/)).toBeInTheDocument();
    expect(within(steps[0]).getByText(/"파이썬 파일\(\.py\) 내려받기"도 있습니다/)).toBeInTheDocument();
    expect(within(steps[1]).getByText(/"저장"\(Ctrl\/Cmd\+S\)을 누르고 구글 계정으로 로그인하면/)).toBeInTheDocument();
    expect(within(steps[2]).getByText(/"팀 프로젝트" 버튼에서 GitHub 계정을 연결합니다\. 13세 이상/)).toBeInTheDocument();
    expect(within(steps[2]).getByText('팀원을 GitHub 아이디로 초대합니다.')).toBeInTheDocument();
    expect(within(steps[2]).getByRole('link', { name: '팀 프로젝트 안내' })).toHaveAttribute('href', '#projects');
    expect(container.querySelector('.guide-way-notice')).toBeNull();
  });

  it('캐릭터 여덟이 모두 나오고 그림에는 대체 글·크기·지연 로딩을 지정한다', async () => {
    const { container } = await renderWays();
    const images = [...container.querySelectorAll('img')];
    expect(images.map(image => image.getAttribute('src'))).toEqual(MONG_IDS.map(id => `/mong/${id}.png`));
    expect(images.map(image => image.alt)).toEqual(['두근몽(씨앗 캐릭터)', '초롱몽(손전등 캐릭터)', '몽실몽(구름 캐릭터)', '살랑몽(연 캐릭터)', '아롱몽(스케치북 캐릭터)', '고리몽(이어진 퍼즐 캐릭터)', '도란몽(말풍선 캐릭터)', '뚝딱몽(공구상자 캐릭터)']);
    for (const image of images) {
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(Number(image.getAttribute('width'))).toBeGreaterThan(0);
      expect(image.getAttribute('height')).toBe(image.getAttribute('width'));
    }
    // 캐릭터의 원래 말투(두근두근 당곡 catalog의 quote)로 말을 시작한다
    const says = Object.fromEntries([...container.querySelectorAll('.guide-say')].map(say => [say.dataset.mong, say.querySelector('.guide-say-bubble').textContent]));
    expect(Object.keys(says)).toEqual(MONG_IDS);
    expect(says.dugeun).toMatch(/^두근몽처음이면 1번부터 시작하면 돼\./);
    expect(says.chorong).toMatch(/^초롱몽왜 그럴까\? 더 살펴보자\./);
    expect(says.mongsil).toMatch(/^몽실몽조금 해 보고 골라도 돼\./);
    expect(says.sallang).toMatch(/^살랑몽이것도 한번 살펴볼까\?/);
    expect(says.arong).toMatch(/^아롱몽이 느낌, 어떻게 담아 볼까\?/);
    expect(says.gori).toMatch(/^고리몽이 둘을 함께 해 보면\?/);
    expect(says.doran).toMatch(/^도란몽너는 어떻게 생각해\?/);
    expect(says.ttukttak).toMatch(/^뚝딱몽직접 만들어 볼까\?/);
  });

  it('그림을 불러오지 못해도 이름과 말은 그대로 남는다', async () => {
    const { container } = await renderWays();
    const image = screen.getByAltText('초롱몽(손전등 캐릭터)');
    fireEvent.error(image);
    expect(screen.queryByAltText('초롱몽(손전등 캐릭터)')).toBeNull();
    expect(container.querySelectorAll('img')).toHaveLength(7);
    expect(container.querySelector('[data-mong="chorong"] .guide-say-bubble').textContent).toMatch(/^초롱몽왜 그럴까\? 더 살펴보자\./);
  });

  it('꺼진 기능의 단계도 보여 주되 이 사이트에 설정되어 있지 않다고 알린다', async () => {
    const { container } = await renderWays({ drive: false, team: false });
    const steps = container.querySelectorAll('ol.guide-ways-steps > li');
    expect(steps).toHaveLength(3);
    expect(steps[0].querySelector('.guide-way-notice')).toBeNull();
    expect(within(steps[1]).getByRole('note')).toHaveTextContent('이 사이트에는 구글 드라이브 저장이 설정되어 있지 않습니다. 1번 방법의 링크와 파일로 보관합니다.');
    expect(within(steps[2]).getByRole('note')).toHaveTextContent('이 사이트에는 팀 프로젝트가 설정되어 있지 않습니다.');
    // 구글 드라이브 저장이 없는 배포의 만들기 화면에서는 버튼 이름이 "프로젝트"다
    expect(within(steps[2]).getByText(/"프로젝트" 버튼에서 GitHub 계정을 연결합니다/)).toBeInTheDocument();
    expect([...steps[2].querySelectorAll('span.guide-way-key')].map(key => key.textContent)).toEqual(['프로젝트']);
  });

  it('수업용 판에서는 초대 코드로 합류한다고 안내하고 GitHub 아이디 초대는 말하지 않는다', async () => {
    const { container } = await renderWays({ open: false, drive: false });
    const steps = container.querySelectorAll('ol.guide-ways-steps > li');
    expect(within(steps[2]).getByText('이 사이트에서는 팀원이 초대 코드로 프로젝트에 합류합니다.')).toBeInTheDocument();
    expect(screen.queryByText('팀원을 GitHub 아이디로 초대합니다.')).toBeNull();
    expect(screen.queryByText(/수업용 사이트에서 사용하는 방식입니다/)).toBeNull();
    expect(within(steps[2]).getByRole('link', { name: '팀 프로젝트 안내' })).toHaveAttribute('href', '#projects');
    // 수업용 판은 계정에 저장하는 예전 방식이 있을 수 있어 "링크와 파일로 보관"까지는 말하지 않는다
    expect(within(steps[1]).getByRole('note')).toHaveTextContent(/^이 사이트에는 구글 드라이브 저장이 설정되어 있지 않습니다\.$/);
  });

  it.each([
    ['모든 기능이 켜진 공개판', { open: true, drive: true, team: true }],
    ['기능이 꺼진 공개판', { open: true, drive: false, team: false }],
    ['수업용 판', { open: false, drive: false, team: true }],
  ])('영어 화면에서는 글과 대체 글이 모두 번역된다: %s', async (_name, flags) => {
    const { container } = await renderWays({ ...flags, locale: 'en' });
    expect(screen.getByRole('heading', { level: 2, name: 'Three ways to make' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[가-힣]/);
    for (const image of container.querySelectorAll('img')) expect(image.alt).not.toMatch(/[가-힣]/);
    const teamButton = flags.drive ? 'Team projects' : 'Projects';
    expect(screen.getByText(new RegExp(`from the "${teamButton}" button on the Create screen`))).toBeInTheDocument();
  });
});

describe('사용 안내: 단계 카드의 자세한 순서(그 자리 안내와 같은 내용)', () => {
  /** 닫혀 있는 펼치기를 모두 엽니다. */
  const openAll = (root) => {
    for (let round = 0; round < 6; round += 1) {
      const closed = [...root.querySelectorAll('button[aria-expanded="false"]')];
      if (!closed.length) return;
      closed.forEach(button => fireEvent.click(button));
    }
  };

  it('단계마다 창에서 할 일을 접어서 두고, 펼치면 그림과 순서를 보여 준다', async () => {
    const { container } = await renderWays();
    const steps = container.querySelectorAll('ol.guide-ways-steps > li');
    const names = step => [...step.querySelectorAll('.guide-way-help .vh-more-toggle')].map(toggle => toggle.textContent);
    await screen.findByRole('button', { name: '처음 로그인할 때 구글 창에서 할 일' });
    await screen.findByRole('button', { name: 'GitHub 창에서 할 일' });
    await screen.findByRole('button', { name: '파일로 보관하는 순서' });
    expect(names(steps[0])).toEqual(['파일로 보관하는 순서']);
    expect(names(steps[1])).toEqual(['처음 로그인할 때 구글 창에서 할 일', '창이 열리지 않을 때', '1시간쯤 지나 다시 승인할 때', '같은 파일을 두 곳에서 저장했을 때']);
    expect(names(steps[2])).toEqual(['GitHub 창에서 할 일', '프로젝트를 만들면 생기는 것', '팀원을 초대하고 수락하는 순서', '팀원이 먼저 저장했을 때']);
    for (const toggle of container.querySelectorAll('.guide-way-help .vh-more-toggle')) expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // 접혀 있는 동안에는 그림을 그리지 않는다
    expect(container.querySelector('.guide-way-help .vh-sketch')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '처음 로그인할 때 구글 창에서 할 일' }));
    expect(within(steps[1].querySelector('[data-sketch="google-consent"]')).getByRole('img')).toHaveTextContent('Google Drive 파일');
    fireEvent.click(screen.getByRole('button', { name: 'GitHub 창에서 할 일' }));
    expect(within(steps[2].querySelector('[data-sketch="github-authorize"]')).getByRole('img')).toHaveTextContent('Authorize vpylab');
    fireEvent.click(screen.getByRole('button', { name: '파일로 보관하는 순서' }));
    expect(steps[0].querySelector('[data-sketch="tools-file"]')).not.toBeNull();

    // 펼쳐도 기존 항목 목록·버튼 줄·캐릭터 그림은 그대로다
    expect([...steps[1].querySelectorAll('span.guide-way-key')].map(key => key.textContent)).toEqual(['저장', '내 드라이브']);
    expect(container.querySelectorAll('img')).toHaveLength(MONG_IDS.length);
  });

  it('공용 컴퓨터 사용을 마칠 때의 정리 순서를 한곳에 펼쳐 둔다', async () => {
    const { container } = await renderWays();
    const heading = await screen.findByRole('heading', { level: 3, name: '공용 컴퓨터 사용을 마칠 때' });
    const card = heading.closest('[data-help="guide-leaving"]');
    expect(container.querySelector('section#ways')).toContainElement(card);
    expect(container.querySelector('ol.guide-ways-steps')).not.toContainElement(card);
    const steps = [...card.querySelectorAll('ol.vh-steps > li .vh-step-text')].map(step => step.textContent);
    expect(steps).toHaveLength(6);
    expect(steps[0]).toBe('"저장"을 눌러 작품이 저장되었는지 확인합니다.');
    expect(steps[5]).toBe('브라우저 창을 닫습니다.');
  });

  it('꺼진 기능의 창 안내는 보이지 않고, 수업용 판에서는 GitHub 아이디 초대 순서를 보이지 않는다', async () => {
    const off = await renderWays({ drive: false, team: false });
    await screen.findByRole('button', { name: '파일로 보관하는 순서' });
    expect(off.container.querySelector('[data-help="guide-drive"], [data-help="guide-team"], [data-help="guide-leaving"]')).toBeNull();
    cleanup();
    const classroom = await renderWays({ open: false, drive: true, team: true });
    await screen.findByRole('button', { name: '처음 로그인할 때 구글 창에서 할 일' });
    // 수업용 판의 팀 프로젝트와 로그아웃은 버튼이 달라, GitHub 창 안내와 공용 컴퓨터 정리 순서는 오픈소스 판에서만 보인다
    expect(classroom.container.querySelector('[data-help="guide-team"], [data-help="guide-leaving"]')).toBeNull();
  });

  it('영어 화면에서는 펼친 안내의 글과 대체 설명도 모두 번역된다', async () => {
    const { container } = await renderWays({ locale: 'en' });
    await screen.findByRole('button', { name: 'What to do in the Google window the first time you sign in' });
    await screen.findByRole('heading', { level: 3, name: 'When you finish on a shared computer' });
    openAll(container);
    // 한국어 화면의 표기를 일부러 함께 알려 주는 줄과, 드라이브가 붙이는 파일 이름 "(사본)"만 한글로 남는다
    container.querySelectorAll('.vh-alt-labels').forEach(node => node.remove());
    expect(container.textContent.replaceAll('"(사본)"', '')).not.toMatch(/[가-힣]/);
    for (const node of container.querySelectorAll('[aria-label]')) expect(node.getAttribute('aria-label')).not.toMatch(/[가-힣]/);
  });
});

describe('그림 파일', () => {

  it('캐릭터 그림과 출처 안내가 public/mong에 있고 파일마다 40KB를 넘지 않는다', () => {
    const folder = resolve(process.cwd(), 'public/mong');
    expect(existsSync(resolve(folder, 'README.md'))).toBe(true);
    for (const id of MONG_IDS) {
      const file = resolve(folder, `${id}.png`);
      expect(existsSync(file), id).toBe(true);
      expect(statSync(file).size, id).toBeLessThan(40 * 1024);
    }
  });
});
