import { afterEach, expect, it, vi } from 'vitest';
import { createWidgetPanel } from '../../../server/shared/widget-panel';

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.lang = '';
});

it('날짜·시각 위젯의 라벨과 모바일 패널을 연결하고 선택 시 시각 원문을 한 번 전달한다', () => {
  const onEvent = vi.fn();
  const onValue = vi.fn();
  const panel = createWidgetPanel(onEvent, onValue, vi.fn());
  const host = document.createElement('div');
  host.setAttribute('data-vpylab-viewport', '');
  document.body.append(host);
  panel.createWidget({ id: 'date', kind: 'winput', input_type: 'datetime-local', prompt: '한국 시각 / Seoul time' });
  const wrap = host.querySelector('.vp-widget-panel > [data-widget-kind=winput]');
  const input = wrap.querySelector('input');
  expect(wrap.querySelector('label').control).toBe(input);
  expect(input.type).toBe('datetime-local');
  input.value = '2026-11-20T18:30';
  input.dispatchEvent(new Event('change'));
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(onValue.mock.calls).toEqual([['date', '2026-11-20T18:30']]);
  expect(onEvent).toHaveBeenCalledWith({ name: 'widget', widget: 'date', value: '2026-11-20T18:30' });
  panel.updateWidget({ id: 'date', value: '2026-11-21T07:05' });
  expect(input.value).toBe('2026-11-21T07:05');
  panel.clearWidgets();
  expect(host.querySelector('.vp-widget-panel')).toBeNull();
});

it.each([['ko', '입력'], ['en', 'Submit']])('입력 대기 단추가 %s 언어로 한 번만 답한다', (locale, label) => {
  document.documentElement.lang = locale;
  const onInput = vi.fn();
  const panel = createWidgetPanel(vi.fn(), vi.fn(), onInput);
  panel.createInputPrompt({ id: 'answer' });
  const button = document.querySelector('[data-vpylab-input] button');
  expect(button.textContent).toBe(label);
  document.querySelector('[data-vpylab-input] input').value = '42';
  button.click();
  button.click();
  expect(onInput.mock.calls).toEqual([['answer', '42']]);
});
