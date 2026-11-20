import { describe, expect, it } from 'vitest';
import { getCourseById, getLesson } from './courses';
import { localizeCourse } from '../i18n/owned-content';
import { hasPython, runPythonJobs } from '../test/python-runner';

const course = getCourseById('space-from-earth');

describe('ten-step space course', () => {
  it('connects each step to its Python source and translates the teaching notes', () => {
    const english = localizeCourse(course, 'en');
    expect(course.lessons).toHaveLength(10);
    for (const [i, lesson] of course.lessons.entries()) {
      expect(getLesson(course.id, lesson.id)).toBe(lesson);
      expect(lesson.code).toContain(lesson.practice.line);
      expect(english.lessons[i].code).toBe(lesson.code);
      expect(english.lessons[i].practice.line).toBe(lesson.practice.line);
      expect(JSON.stringify(english.lessons[i].practice)).not.toMatch(/[가-힣]/u);
      expect(english.lessons[i].summary).not.toMatch(/[가-힣]/u);
    }
  });
  it.skipIf(!hasPython())('runs every step and submits the eight planets and two particle sets in the finished scene', () => {
    const results = runPythonJobs(course.lessons.map(lesson => ({
      id: lesson.id, label: 'classroom', code: lesson.code, rateLimit: 4,
    })));
    const sphereCounts = [1, 2, 2, 2, 3, 3, 6, 10, 11, 11];
    for (const [i, lesson] of course.lessons.entries()) {
      const result = results.get(lesson.id + ':classroom');
      expect(result.error, lesson.id).toBeNull();
      expect(result.stopped).toBe(i >= 2);
      const objects = result.commands.filter(c => c.action === 'create');
      expect(objects.filter(c => c.type === 'sphere')).toHaveLength(sphereCounts[i]);
      if (i === 9) {
        expect(objects.filter(c => c.type === 'points')).toHaveLength(2);
        expect(objects.filter(c => c.type === 'ring')).toHaveLength(1);
        expect(objects.filter(c => c.type === 'local_light')).toHaveLength(1);
      }
    }
  });
});
