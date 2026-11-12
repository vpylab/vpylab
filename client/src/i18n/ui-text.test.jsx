import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import useAppStore from '../stores/appStore';
import { translateUi, translateSystemMessage, useUiText } from './ui-text';
import { localizeCourse, localizeLessonCode } from './owned-content';
import courses from '../data/courses';
import english from './catalogs/en-ui-text.json';

const originalLocale = useAppStore.getState().locale;
afterEach(() => act(() => useAppStore.getState().setLocale(originalLocale)));

describe('fixed UI and owned educational content in English', () => {
  it('keeps every numbered interpolation and never interprets interpolated text as HTML or another template', () => {
    for (const [key, value] of Object.entries(english)) {
      expect([...key.matchAll(/\{\d+\}/g)].map(x => x[0]).sort(), key).toEqual([...value.matchAll(/\{\d+\}/g)].map(x => x[0]).sort());
    }
    expect(translateUi('en', Object.assign(['“', '”을 내 모듈 보관함에 등록했습니다.'], { raw: [] }), '<script>{0}학생 작품</script>')).toContain('<script>{0}학생 작품</script>');
  });
  it('switches labels without changing the translator identity used by running effects', () => {
    act(() => useAppStore.getState().setLocale('ko'));
    const { result } = renderHook(() => { const ui = useUiText(); return { ui, text: ui('대장간') }; });
    const ui = result.current.ui;
    expect(result.current.text).toBe('대장간');
    act(() => useAppStore.getState().setLocale('en'));
    expect(result.current.ui).toBe(ui);
    expect(result.current.text).toBe('Forge');
  });
  it('localizes the full workbook while preserving all executable code and original data', () => {
    // 코스 목록의 교재는 "처음 만드는 빛과 소리" 하나입니다(GitHub 교재는 다시 쓸 때까지 목록에서 뺐습니다).
    const workbooks = courses.filter(course => course.workbook);
    expect(workbooks).toHaveLength(1);
    for (const course of workbooks) {
      const snapshot = JSON.stringify(course);
      const localized = localizeCourse(course, 'en');
      expect(localized.workbook.introduction).not.toBe(course.workbook.introduction);
      localized.lessons.forEach((lesson, i) => {
        expect(lesson.guide.goal).not.toBe(course.lessons[i].guide.goal);
        expect(lesson.code).toBe(localizeLessonCode(course.id, course.lessons[i].code, 'en'));
        if (lesson.code) expect(lesson.code).not.toMatch(/[가-힣]/);
        expect(JSON.stringify(lesson.guide)).not.toMatch(/[가-힣]/);
        expect(lesson.guide.accessibleCode).toBe(localizeLessonCode(course.id, course.lessons[i].guide.accessibleCode, 'en'));
        expect(lesson.title).toEqual(course.lessons[i].title);
      });
      expect(JSON.stringify(course)).toBe(snapshot);
      expect(localizeCourse(course, 'ko')).toBe(course);
    }
  });
  it('영문 교재 사본에서 음의 옥타브·올림음·내림음을 보존하고 기존 비대기 호출은 유지한다', () => {
    const code='음표("도4", 0.2)\n음표("솔#5", 0.3)\n소리(440, 0.1)\nplay_note("C4", 0.2)\nprint("도형 라벨")\n도 = 3\n# 음표("레5")';
    expect(localizeLessonCode('beg-light-sound',code,'en')).toBe('play_note_and_wait("C4", 0.2)\nplay_note_and_wait("G#5", 0.3)\nplay_sound(440, 0.1)\nplay_note("C4", 0.2)\nprint("도형 라벨")\n도 = 3\n# 음표("레5")');
    expect(localizeLessonCode('beg-light-sound','음표("레b3")\n음표("도-1")','en')).toBe('play_note_and_wait("Db3")\nplay_note_and_wait("C-1")');
    expect(localizeLessonCode('student-project',code,'en')).toBe(code);
    expect(localizeLessonCode('beg-light-sound',code,'ko')).toBe(code);
  });

  it('translates only recognized system messages and preserves unknown output verbatim', () => {
    expect(translateSystemMessage('en', '📦 numpy 설치 중...')).toBe('📦 Installing numpy...');
    expect(translateSystemMessage('en', '학생이 직접 쓴 문장 <b>내 작품</b>')).toBe('학생이 직접 쓴 문장 <b>내 작품</b>');
    expect(translateSystemMessage('en', 'constructor')).toBe('constructor');
    expect(translateUi('en', 'toString')).toBe('toString');
    expect(translateSystemMessage('ko', '📦 numpy 설치 중...')).toBe('📦 numpy 설치 중...');
  });
});
