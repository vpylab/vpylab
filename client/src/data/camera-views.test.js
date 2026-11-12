import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { cameraViewsTutorial } from './camera-views';
import { eclipseViewsCode } from './eclipse-views';
import examples from './examples';
import { getTutorial } from './tutorials';
import { hasPython, runPythonJobs } from '../test/python-runner';
import { generateStandaloneHTML } from '../utils/export-html';
import transformSource from '../engine/student-code-transform.py?raw';

const stage = id => cameraViewsTutorial.variants.find(item => item.id === id);
const sceneValues = (run, property) => run.commands.filter(c => c.action === 'scene' && c.property === property).map(c => c.value);
const sub = (a, b) => a.map((value, index) => value - b[index]);
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const mag = a => Math.sqrt(dot(a, a));
const angleBetween = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b) / mag(a) / mag(b))));

it('카메라 튜토리얼은 기존 조회로 열리고 단계마다 안내·바꿀 것·생각할 것이 두 언어로 있다', () => {
  expect(getTutorial('camera-views').activeStep).toBe('look');
  expect(getTutorial('camera-views', 'missing').activeStep).toBe('look');
  expect(cameraViewsTutorial.variants.map(item => item.id)).toEqual(['look', 'place', 'ride', 'follow', 'switch', 'eclipse']);
  for (const variant of cameraViewsTutorial.variants) {
    const opened = getTutorial('camera-views', variant.id);
    expect(opened.code).toBe(variant.code);
    for (const field of [opened.stepNote, opened.change, opened.reflect, variant.title]) {
      expect(field.ko.length, variant.id).toBeGreaterThan(5);
      expect(field.en.length, variant.id).toBeGreaterThan(5);
    }
  }
  expect(examples.find(item => item.id === 'eclipse-views').code).toBe(eclipseViewsCode);
});

it('단계 코드는 학생 코드 규칙을 지킨다: 한 줄에 한 문장, 조건 표현식 없음', () => {
  for (const variant of cameraViewsTutorial.variants) {
    for (const line of variant.code.split('\n')) {
      const code = line.replace(/#.*$/, '').replace(/"[^"]*"|'[^']*'/g, '""');
      expect(code.includes(';'), `${variant.id}: ${line}`).toBe(false);
      expect(/\sif\s.+\selse\s/.test(code) && !/^\s*(if|elif)\b/.test(code), `${variant.id}: ${line}`).toBe(false);
      expect(/:\s*\S/.test(code.replace(/\[[^\]]*\]/g, '')), `${variant.id}: ${line}`).toBe(false);
    }
  }
});

describe.skipIf(!hasPython())('카메라 튜토리얼의 실제 Python API 실행', () => {
  const edits = {
    look: code => code.replace('scene.range = 5', 'scene.range = 2').replace('scene.center = vector(0, 0, 0)', 'scene.center = vector(3, 0, 0)'),
    place: code => code.replace('scene.camera.axis = vector(0, -3, -8)', 'scene.camera.axis = vector(3, -3, -8)'),
    ride: code => code.replace('scene.camera.axis = heading * 4', 'scene.camera.axis = tree.pos - scene.camera.pos'),
    follow: code => code.replace('scene.camera.follow(ball)', '# scene.camera.follow(ball)'),
    switch: code => code.replace('car.pos - heading * 4 + vector(0, 2, 0)', 'car.pos - heading * 8 + vector(0, 5, 0)'),
    eclipse: code => code.replace('tilt = radians(25)', 'tilt = radians(0)'),
  };
  const jobs = cameraViewsTutorial.variants.flatMap(item => {
    const changed = edits[item.id](item.code);
    expect(changed, item.id).not.toBe(item.code);
    return [
      { id: item.id, label: 'base', code: item.code, rateLimit: 240 },
      { id: item.id, label: 'changed', code: changed, rateLimit: 240 },
    ];
  });
  jobs.push({ id: 'place', label: 'half', code: stage('place').code.replace('vector(0, -3, -8)', 'vector(0, -1.5, -4)') });
  jobs.push({ id: 'switch', label: 'key2', code: stage('switch').code, rateLimit: 30, pressedKeys: ['2'] });
  jobs.push({ id: 'switch', label: 'key3', code: stage('switch').code, rateLimit: 30, pressedKeys: ['3'] });
  // 일식·월식은 시점을 고정해 돌린다. 오래 걸리는 관찰은 빠르기를 올려 프레임 수를 줄인다.
  const faster = (code, speed) => {
    const changed = code.replace('speed = slider(min=0, max=20, value=1,', `speed = slider(min=0, max=20, value=${speed},`);
    expect(changed).not.toBe(code);
    return changed;
  };
  const fixedView = view => eclipseViewsCode.replace('view = views.index', `view = ${view}`);
  jobs.push({ id: 'eclipse', label: 'view1', code: fixedView(1), rateLimit: 700 });
  jobs.push({ id: 'eclipse', label: 'view2', code: fixedView(2), rateLimit: 120 });
  jobs.push({ id: 'eclipse', label: 'view3', code: faster(fixedView(3), 4), rateLimit: 850 });
  jobs.push({ id: 'eclipse', label: 'long', code: faster(eclipseViewsCode, 10), rateLimit: 340 });
  jobs.push({ id: 'eclipse', label: 'flat', code: faster(eclipseViewsCode.replace('tilt = radians(25)', 'tilt = radians(0)'), 10), rateLimit: 900 });
  let cached;
  const runs = () => (cached ||= runPythonJobs(jobs));

  it('여섯 단계와 안내한 수정이 오류 없이 실행된다', () => {
    for (const run of runs().values()) {
      expect(run.error, `${run.id}:${run.label}`).toBeNull();
      expect(run.pendingTasks, `${run.id}:${run.label}`).toBe(0);
    }
    // 반복이 끝나지 않는 단계는 실행 한도에서 멈추고, 나머지는 스스로 끝난다
    expect(runs().get('look:base').stopped).toBe(false);
    expect(runs().get('place:base').stopped).toBe(false);
    expect(runs().get('ride:base').stopped).toBe(true);
  });

  it('1·2단계: center·range·forward와 camera.pos·axis가 안내한 값을 낸다', () => {
    const look = runs().get('look:changed');
    expect(sceneValues(look, 'range')).toEqual([2]);
    expect(sceneValues(look, 'center')).toEqual([[3, 0, 0]]);
    expect(runs().get('place:base').stdout).toBe('center = <0, 0, 0>\nrange = 4.93\n');
    expect(runs().get('place:changed').stdout).toContain('center = <3, 0, 0>');
    // 방향이 같고 길이만 절반인 axis: 카메라 위치와 방향은 같고 center·range만 달라진다
    const half = runs().get('place:half');
    expect(half.stdout).toBe('center = <0, 1.5, 4>\nrange = 2.47\n');
    expect(sceneValues(half, 'camera_pos')).toEqual(sceneValues(runs().get('place:base'), 'camera_pos'));
  });

  it('3단계: 카메라가 매 프레임 차 위에서 진행 방향을 보고, 수정하면 나무를 본다', () => {
    const base = runs().get('ride:base');
    const positions = sceneValues(base, 'camera_pos');
    const axes = sceneValues(base, 'camera_axis');
    expect(positions.length).toBeGreaterThan(200);
    expect(axes.length).toBe(positions.length);
    for (const index of [0, 100, 200]) {
      expect(mag(axes[index])).toBeCloseTo(4, 9);
      expect(positions[index][1]).toBeCloseTo(0.6, 9);
      expect(Math.hypot(positions[index][0], positions[index][2])).toBeCloseTo(5, 9);
      expect(dot(axes[index], [positions[index][0], 0, positions[index][2]])).toBeCloseTo(0, 9); // 접선 방향
    }
    const changed = runs().get('ride:changed');
    const p = sceneValues(changed, 'camera_pos')[150];
    const a = sceneValues(changed, 'camera_axis')[150];
    expect(p.map((value, index) => value + a[index])).toEqual([0, -0.2, 0].map(value => expect.closeTo(value, 9)));
  });

  it('4단계: follow는 공을 대상으로 지정하고, 주석으로 막으면 따라가기 명령이 없다', () => {
    const ball = runs().get('follow:base').commands.find(c => c.action === 'create' && c.type === 'sphere');
    expect(sceneValues(runs().get('follow:base'), 'camera_follow')).toEqual([ball.id]);
    expect(sceneValues(runs().get('follow:changed'), 'camera_follow')).toEqual([]);
    expect(sceneValues(runs().get('follow:changed'), 'range')).toEqual([4]);
  });

  it('5단계: 숫자 키에 따라 카메라 위치가 달라진다', () => {
    const first = label => sceneValues(runs().get(`switch:${label}`), 'camera_pos').at(-1);
    expect(first('base')).toEqual([0, 12, 9]);
    expect(first('key2')[1]).toBeCloseTo(0.6, 9);
    expect(first('key3')[1]).toBeCloseTo(2, 9);
    expect(first('changed')).toEqual([0, 12, 9]);
  });

  // 명령을 순서대로 읽어 프레임마다 물체 위치와 카메라 명령을 모은다
  function frames(run) {
    const ids = {};
    for (const command of run.commands) {
      if (command.action !== 'create') continue;
      if (command.type === 'sphere') ids[command.id] = ['sun', 'earth', 'moon', 'seoul'][Object.keys(ids).length];
    }
    const state = { caption: '' };
    const list = [];
    for (const command of run.commands) {
      if (command.action === 'update' && ids[command.id]) {
        if (command.pos) state[ids[command.id]] = command.pos;
        if (command.color && ids[command.id] === 'moon') state.moonColor = command.color;
      }
      if (command.action === 'scene') {
        if (command.property === 'caption') state.caption = command.value;
        if (command.property === 'camera_pos') state.cameraPos = command.value;
        if (command.property === 'up') state.up = command.value;
        if (command.property === 'fov') state.fov = command.value;
        if (command.property === 'camera_axis') { state.cameraAxis = command.value; list.push({ ...state }); }
      }
    }
    return list;
  }

  it('6단계 서울에서 태양 보기: 카메라는 서울 지표면 위에서 태양을 향하고, 약 6.5초에 달이 태양을 모두 가린다', () => {
    const list = frames(runs().get('eclipse:view1'));
    expect(list.length).toBeGreaterThan(650);
    let best = { separation: Infinity };
    list.forEach((frame, index) => {
      const eye = frame.cameraPos;
      expect(mag(sub(eye, frame.earth)), `frame ${index}`).toBeCloseTo(1.05, 6);           // 지구 반지름 1의 바로 위
      expect(angleBetween(frame.cameraAxis, sub([0, 0, 0], eye))).toBeLessThan(1e-6);       // 태양을 향한다
      expect(angleBetween(frame.up, sub(frame.seoul, frame.earth))).toBeLessThan(1e-6);     // 머리 위가 화면 위쪽
      const toMoon = sub(frame.moon, eye);
      const separation = angleBetween(frame.cameraAxis, toMoon);
      const sunRadius = Math.asin(2 / mag(eye));
      const moonRadius = Math.asin(0.4 / mag(toMoon));
      const sunAltitude = Math.PI / 2 - angleBetween(frame.cameraAxis, sub(frame.seoul, frame.earth));
      if (separation < best.separation) best = { separation, sunRadius, moonRadius, sunAltitude, index };
    });
    expect(best.index).toBeGreaterThan(330);   // 5.5초 뒤
    expect(best.index).toBeLessThan(450);      // 7.5초 앞
    expect(best.separation).toBeLessThan(best.moonRadius - best.sunRadius); // 개기 일식
    expect(best.sunAltitude).toBeGreaterThan(0.5);                          // 태양이 높이 떠 있다
    expect(list[0].fov).toBeCloseTo(Math.PI / 6, 9);
    expect(list.some(frame => frame.caption.startsWith('일식'))).toBe(true);
  });

  it('6단계 월식: 약 48초에 달이 지구 그림자에 들어가 어두워지고, 그때 달에서 보면 지구가 태양을 가린다', () => {
    const list = frames(runs().get('eclipse:view3'));
    const dark = list.map((frame, index) => (frame.moonColor && frame.moonColor[0] < 0.5 ? index : -1)).filter(index => index >= 0);
    // 빠르기 4로 돌렸으므로 프레임 번호에 4를 곱한 값이 빠르기 1의 프레임이다 (60프레임 = 1초)
    expect(dark[0] * 4).toBeGreaterThan(2700);
    expect(dark[0] * 4).toBeLessThan(3000);
    expect((dark.at(-1) - dark[0]) * 4).toBeGreaterThan(200);
    const middle = list[Math.round((dark[0] + dark.at(-1)) / 2)];
    expect(middle.caption.startsWith('월식')).toBe(true);
    // 달 표면 바로 위(반지름 0.4)에서 지구를 향한다
    expect(mag(sub(middle.cameraPos, middle.moon))).toBeCloseTo(0.45, 6);
    expect(angleBetween(middle.cameraAxis, sub(middle.earth, middle.cameraPos))).toBeLessThan(1e-6);
    // 지구(각반지름 약 12.7도)가 태양(약 4도)을 가린다
    const toSun = sub([0, 0, 0], middle.cameraPos);
    const earthRadius = Math.asin(1 / mag(middle.cameraAxis));
    expect(angleBetween(middle.cameraAxis, toSun) + Math.asin(2 / mag(toSun))).toBeLessThan(earthRadius);
    // 일식 때와 식이 없을 때 달은 밝다
    expect(list[100].moonColor).toEqual([1, 1, 1]);
    expect(list[100].caption.startsWith('일식')).toBe(true);
    expect(list[375].caption.startsWith('식이 없습니다')).toBe(true);
  });

  it('6단계: 기울기 25도에서는 처음 한 달 남짓 뒤 식이 이어지지 않고, 0도로 바꾸면 달마다 일어난다', () => {
    const captions = run => sceneValues(run, 'caption').map(value => value.slice(0, 2));
    expect(captions(runs().get('eclipse:long'))).toEqual(['식이', '일식', '식이', '월식', '식이']);
    const flat = runs().get('eclipse:flat');
    expect(captions(flat).filter(value => value === '일식').length).toBeGreaterThanOrEqual(2);
    expect(captions(flat).filter(value => value === '월식').length).toBeGreaterThanOrEqual(2);
  });

  it('우주에서 보기는 시점을 바꾼 순간에만 카메라를 정해 마우스로 돌릴 수 있다', () => {
    const run = runs().get('eclipse:base');
    expect(sceneValues(run, 'camera_pos')).toEqual([[0, 20, 32]]);
    expect(sceneValues(run, 'camera_axis')).toEqual([[0, -20, -32]]);
    expect(sceneValues(run, 'lights')).toHaveLength(1);
  });

  it('내려받은 HTML의 Python API에서도 여섯 단계가 오류 없이 실행된다 (키와 목록 조작은 지원하지 않아 첫 시점만 보인다)', () => {
    // 내보내기 실행기에는 정지 신호가 없으므로 끝나지 않는 반복만 길이를 정해 돌린다
    const exportJobs = cameraViewsTutorial.variants.map(item => ({ id: item.id, code: item.code.replace('while True:', 'for frame_number in range(90):') }));
    const html = generateStandaloneHTML(exportJobs[0].code);
    const api = runInNewContext(html.match(/const vpythonApi = (`[\s\S]*?`);/)[1]);
    const result = spawnSync('python3', ['-I', 'src/test/run-export-python.py'], {
      input: JSON.stringify({ api, transform: transformSource, jobs: exportJobs }) + '\n',
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 60000,
    });
    expect(result.status, result.stderr).toBe(0);
    // 학생 코드의 print 출력이 앞에 섞이므로 결과 JSON이 시작하는 곳부터 읽는다
    const exported = JSON.parse(result.stdout.slice(result.stdout.lastIndexOf('[{"id"')));
    for (const run of exported) expect(run.error, run.id).toBeNull();
    const eclipse = exported.find(run => run.id === 'eclipse');
    expect(sceneValues(eclipse, 'camera_pos')).toEqual([[0, 20, 32]]);
    expect(sceneValues(exported.find(run => run.id === 'follow'), 'camera_follow')).toHaveLength(1);
  });
});
