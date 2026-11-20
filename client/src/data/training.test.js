import { expect, it } from 'vitest';
import { trainingCourses, trainingSteps, getTrainingPosition } from './training';
import { getCourseById } from './courses';
import { localizeCourse } from '../i18n/owned-content';
import { hasPython, runPythonJobs } from '../test/python-runner';
import { getMissionById } from './missions';

it('코스와 연습은 기존 자료 ID로 연결되고 옛 링크도 유지된다', () => {
  for (const course of trainingCourses) expect(getCourseById(course.id)?.lessons).toHaveLength(course.sessions);
  for (const step of trainingSteps) expect(getMissionById(step.missionId)).toBeTruthy();
  expect(getCourseById('beg-first-steps')).toBeTruthy();
  expect(getMissionById('SC-5')).toBeTruthy();
});

it('조건 다음 리스트로 진행하고 마지막 연습 뒤 다른 옛 미션으로 넘어가지 않는다', () => {
  expect(getTrainingPosition('CT-13').nextId).toBe('CT-11');
  expect(getTrainingPosition(trainingSteps.at(-1).missionId).nextId).toBeNull();
  expect(getTrainingPosition('SC-5')).toBeNull();
});

it.skipIf(!hasPython())('첫 다섯 단계는 한·영 모두 import 없이 공을 그리고 마지막 두 단계에서 한 음을 낸다', () => {
  const course = getCourseById('first-lines');
  expect(course.lessons[0]).toMatchObject({ code: 'sphere()\n', starterCode: '' });
  for (const lang of ['ko', 'en']) {
    const lessons = localizeCourse(course, lang).lessons;
    const jobs = lessons.map(({ id, code }) => ({ id, code, label: lang }));
    const results = runPythonJobs(jobs);
    for (const [index, lesson] of lessons.entries()) {
      const result = results.get(lesson.id + ':' + lang);
      expect(result.error).toBeNull();
      expect(lesson.code).toContain(lesson.practice.line);
      expect(result.commands.filter(cmd => cmd.action === 'create' && cmd.type === 'sphere')).toHaveLength(1);
      expect(result.commands.filter(cmd => cmd.action === 'sound')).toHaveLength(index >= 3 ? 1 : 0);
    }
  }
});
