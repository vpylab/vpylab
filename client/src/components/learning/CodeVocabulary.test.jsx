import { afterEach, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import CodeVocabulary from './CodeVocabulary';
import { codeVocabulary, vocabularyForCode, vocabularyWord } from '../../data/code-vocabulary';

afterEach(()=>localStorage.clear());
it('코드에 사용한 낯선 단어만 원문 순서로 고르고 주석·문자열·아는 색 단어는 제외한다', () => {
  expect(vocabularyForCode('my_radius = 1\n# opacity=0.5\nprint("compound")\nball = sphere(radius=0.5, color=color.red)\nball.radius = 1').map(term => term.id)).toEqual(['sphere', 'radius']);
  expect(vocabularyForCode('"""sphere(radius=1)"""\ncolor.red')).toEqual([]);
});

it('처음에는 네 단어만 보여주고 opacity의 의미와 예시를 클릭으로 펼친다', () => {
  render(<CodeVocabulary initiallyOpen code={'sphere(radius=0.5, opacity=0.5, pos=vector(0,0,0))\nfriend = compound([body, eye])'}/>);
  const aside = screen.getByRole('complementary');
  expect(within(aside).getAllByRole('button')).toHaveLength(6);
  const opacity = screen.getByRole('button', { name: 'opacity 불투명도' });
  expect(opacity).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(opacity);
  expect(opacity).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText(/0은 완전히 투명, 1은 불투명/)).toBeVisible();
  expect(document.querySelector('pre code').textContent).toBe('sphere(opacity=0.5)');
  fireEvent.click(opacity);
  expect(document.querySelector('.vocabulary-definition')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '+2개 단어' }));
  fireEvent.click(screen.getByRole('button', { name: 'compound 하나로 합치기' }));
  expect(screen.getByText(/여러 도형을 하나의 완제품/)).toBeVisible();
  expect(document.querySelector('pre code').textContent).toBe('friend = compound([body, eye])');
});

it('코드 문맥이 바뀌면 사라진 단어의 설명을 남기지 않고 HTML로 실행하지 않는다', () => {
  const { rerender } = render(<CodeVocabulary initiallyOpen code={'sphere(radius=0.5)'}/>);
  fireEvent.click(screen.getByRole('button', { name: 'radius 반지름' }));
  rerender(<CodeVocabulary initiallyOpen code={'print("<img src=x onerror=alert(1)>")'}/>);
  expect(screen.queryByRole('complementary')).toBeNull();
  expect(document.querySelector('img')).toBeNull();
});

it('기본으로 접고 알겠어요를 누른 단어는 다시 열어도 생략하며 선택해 복구한다',()=>{
 const view=render(<CodeVocabulary code="sphere(radius=0.5)"/>);expect(screen.queryByRole('button',{name:'radius 반지름'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:/단어 뜻/}));fireEvent.click(screen.getByRole('button',{name:'radius 반지름'}));fireEvent.click(screen.getByRole('button',{name:/알겠어요/}));view.unmount();render(<CodeVocabulary initiallyOpen code="sphere(radius=0.5)"/>);expect(screen.queryByRole('button',{name:'radius 반지름'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'기억한 단어도 보기'}));expect(screen.getByRole('button',{name:'radius 반지름'})).toBeVisible();
});

it('새 재질·조명·소리 낱말도 한글 뜻을 보여 준다', () => {
  const ids = vocabularyForCode('sun = sphere(texture=textures.sun, emissive=True)\nlamp = local_light(pos=sun.pos, intensity=30)\nplay_note("C4", 0.5, type="felt", volume=0.4)').map(term => term.id);
  expect(ids).toEqual(expect.arrayContaining(['texture', 'textures', 'local_light', 'intensity', 'play_note', 'volume']));
  const word = vocabularyForCode('lamp = local_light()').find(term => term.id === 'local_light');
  expect(word.meaning).toBe('전구 조명');
  expect(word.reading).toBeTruthy();
  expect(word.example).toContain('local_light(');
});

it('흔한 변수 이름에는 소리·도형의 뜻을 붙이지 않는다', () => {
  const ids = vocabularyForCode('volume = width * 2\npoints = 10\nmenu = ["파일"]\ncamera = 0\nnorm = 3\nmag = 1').map(term => term.id);
  for (const id of ['volume', 'points', 'menu', 'camera', 'norm', 'mag']) expect(ids).not.toContain(id);
  const used = vocabularyForCode('play_note("C4", 0.5, volume=0.4)\nstars = points(pos=[])\nview = menu(choices=[])\nscene.camera.pos = vector(0, 1, 2)\nd = mag(ball.pos)').map(term => term.id);
  expect(used).toEqual(expect.arrayContaining(['volume', 'points', 'menu', 'camera', 'mag']));
});

it('옛 작품에서도 공개 낱말 카드와 예시만 보여 준다', () => {
  const hiddenNames = /(?:^|[^\p{L}\p{N}_])(?:_[\p{L}\p{N}_]+|move_to|dispose|obj_\d+)(?![\p{L}\p{N}_])/u;
  for (const term of codeVocabulary) {
    for (const value of Object.values(term)) expect(value).not.toMatch(hiddenNames);
  }
  for (const name of ['_id', '_pos', 'move_to', 'dispose', 'obj_42']) {
    expect(vocabularyWord(name)).toBeUndefined();
  }
  const code = 'ball = sphere()\n_id = ball._id\nball.move_to(ball.pos)\nball.dispose()';
  for (const locale of ['ko', 'en']) {
    const view = render(<CodeVocabulary initiallyOpen code={code} locale={locale}/>);
    const cards = within(view.getByRole('complementary'));
    expect(cards.getByRole('button', { name: /^sphere / })).toBeVisible();
    fireEvent.click(cards.getByRole('button', { name: /^pos / }));
    expect(cards.getByText('ball.pos.x += 0.1')).toBeVisible();
    expect(view.container.textContent).not.toMatch(hiddenNames);
    view.unmount();
  }
});
