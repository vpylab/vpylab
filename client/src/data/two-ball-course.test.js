import { expect, it } from 'vitest';
import { getCourseById } from './courses';
import { localizeCourse } from '../i18n/owned-content';
import { hasPython, runPythonJobs } from '../test/python-runner';

it.skipIf(!hasPython())('두 공의 여덟 단계가 한·영에서 같은 순서로 색, 클릭, 조건, 빛과 소리를 더한다', () => {
  const course = getCourseById('two-ball-signals');
  const ids = ['draw', 'color', 'second', 'arrange', 'click', 'pick', 'light', 'sound'];
  expect(course.lessons.map(lesson => lesson.id)).toEqual(ids);
  expect(course.sessions).toBe(ids.length);
  expect(course.lessons[0]).toMatchObject({ code: 'sphere()', starterCode: '' });
  for (const locale of ['ko', 'en']) {
    const { lessons } = localizeCourse(course, locale);
    const jobs = lessons.map(({ id, code }) => ({ id, code, label: locale }));
    const scenes = runPythonJobs(jobs);
    const clicks = [];
    for (const [index, lesson] of lessons.entries()) {
      const scene = scenes.get(lesson.id + ':' + locale);
      expect(scene.error).toBeNull();
      expect(lesson.code).toContain(lesson.practice.line);
      expect([lesson.code, ...Object.values(lesson.practice)].join(' ')).not.toContain('_id');
      if (locale === 'en') expect([lesson.code, lesson.summary, ...Object.values(lesson.practice)].join(' ')).not.toMatch(/[가-힣]/);
      const balls = scene.commands.filter(c => c.type === 'sphere');
      expect(balls).toHaveLength(index < 2 ? 1 : 2);
      if (index >= 1) expect(balls[0].color).toEqual([1, 0.75, 0.8]);
      if (index >= 2) {
        expect(balls[1].color).toEqual([0.53, 0.81, 0.92]);
        expect(balls[0].pos[0]).toBeLessThan(balls[1].pos[0]);
      }
      if (index >= 3) expect(balls.map(b => [b.pos[0], b.radius])).toEqual([[-1.5, 0.8], [1.5, 0.8]]);
      expect(scene.commands.some(c => c.type === 'local_light')).toBe(index >= 6);
      expect(scene.commands.some(c => c.action === 'scene_bind')).toBe(index >= 4);
      expect(scene.commands.some(c => c.action === 'sound')).toBe(false);
      if (index >= 4) {
        const targets = [balls[0].id, balls[1].id, null, balls[1].id];
        clicks.push({ ...jobs[index], events: targets.map(pick => ({ name: 'click', pick })) });
      }
    }
    const results = runPythonJobs(clicks);
    for (const { id } of clicks) {
      const { error, commands } = results.get(id + ':' + locale);
      expect(error).toBeNull();
      const [left, right] = commands.filter(c => c.type === 'sphere');
      const updates = commands.filter(c => c.action === 'update');
      const copyLeft = [left.id, right.color];
      const colors = updates.filter(c => c.color).map(c => [c.id, c.color]);
      expect(colors).toEqual(id === 'click' ? Array(4).fill(copyLeft) : [
        copyLeft, [right.id, right.color], [left.id, left.color], [right.id, right.color], [right.id, left.color],
      ]);
      const lamp = commands.find(c => c.type === 'local_light');
      expect(updates.filter(c => lamp && c.id === lamp.id).map(c => c.pos)).toEqual(lamp
        ? [[-1.5, 1, 1], [1.5, 1, 1], [0, 2, 2], [1.5, 1, 1]] : []);
      expect(commands.filter(c => c.action === 'sound').map(c => c.name)).toEqual(id === 'sound' ? ['C4', 'G4', 'G4'] : []);
    }
  }
});

it.skipIf(!hasPython())('클릭 결과는 실제 도형이며 예전 ID 비교와 사전 조회도 동작한다',()=>{
  const code = [
    'left = sphere()',
    'right = sphere()',
    'assembly = compound([right])',
    'expected = [left, assembly, assembly, None]',
    'old_colors = {left._id: color.red, assembly._id: color.green}',
    'def click(event):',
    '    picked = event.pick',
    '    assert picked is expected.pop(0)',
    '    if picked is not None:',
    '        assert picked == picked._id and picked._id == picked',
    '        picked.color = old_colors[picked]',
    '    print("checked")',
    'scene.bind("click", click)',
  ].join('\n');
  const events = ['obj_1', 'obj_2', 'obj_3', null].map(pick=>({name:'click',pick}));
  const result = runPythonJobs([{id:'pick',label:'identity',code,events}]).get('pick:identity');
  expect(result.error).toBeNull();
  expect(result.stdout.trim().split('\n')).toEqual(Array(4).fill('checked'));
});
