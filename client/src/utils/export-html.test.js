import { localizeCourse } from '../i18n/owned-content';
import { describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import * as THREE from 'three';
import { generateProjectHTML, generateStandaloneHTML } from './export-html';
import course from '../data/light-sound-course';
import { hasPython, runPythonJobs } from '../test/python-runner';
import source from '../engine/student-code-transform.py?raw';
import CameraSystem from '../engine/camera-system';

function exportedApi(html) {
  const match = html.match(/const vpythonApi = (`[\s\S]*?`);/);
  expect(match).not.toBeNull();
  return runInNewContext(match[1]);
}

function finalObjects(commands) {
  const objects = new Map();
  for (const command of commands) {
    if (command.action === 'create') objects.set(command.id, { ...command });
    if (command.action === 'update' && objects.has(command.id)) Object.assign(objects.get(command.id), command);
  }
  return [...objects.values()].map(object => Object.fromEntries(
    ['id', 'type', 'pos', 'color', 'radius', 'emissive'].map(key => [key, object[key]]),
  ));
}

describe.skipIf(!hasPython())('교재 작품의 편집기와 공유 HTML 실행 비교', () => {
  it.each(['ko','en'])('8차시 작품의 최종 도형과 소리 순서·길이가 동일하다 (%s)', locale => {
    const jobs = localizeCourse(course,locale).lessons.map(lesson => ({ id: lesson.id, label: 'export', code: lesson.code }));
    const html = generateStandaloneHTML(jobs[0].code);
    const result = spawnSync('python3', ['-I', 'src/test/run-export-python.py'], {
      input: JSON.stringify({ api: exportedApi(html), transform: source, jobs }) + '\n',
      encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 15000,
    });
    expect(result.status, result.stderr).toBe(0);
    const editor = runPythonJobs(jobs);
    for (const exported of JSON.parse(result.stdout)) {
      const original = editor.get(`${exported.id}:export`);
      expect(exported.error, exported.id).toBeNull();
      expect(finalObjects(exported.commands), exported.id).toEqual(finalObjects(original.commands));
      // beatTime은 실행마다 기점이 다른 Worker 단조 시계다. 작품의 음과 연주 순서는 모두 비교한다.
      const sounds = commands => commands.filter(command => command.action === 'sound').map(command => {
        const event = { ...command };
        delete event.beatTime;
        return event;
      });
      expect(sounds(exported.commands), exported.id).toEqual(sounds(original.commands));
      const range = commands => commands.filter(command => command.action === 'scene' && command.property === 'range').map(({action,property,value})=>({action,property,value}));
      expect(range(exported.commands), exported.id).toEqual(range(original.commands));
      const background = commands => commands.filter(command => command.action === 'scene' && command.property === 'background');
      expect(background(exported.commands), exported.id).toEqual(background(original.commands));
    }
  });
});

it.skipIf(!hasPython())('전체 색상은 이름과 번호로 읽고 각 색이 추첨에 한 번씩 들어간다', () => {
  const code = `assert 색상 is color
assert len(색상) == 30
assert 색상[0] is color.red and 색상[-1] is color.ivory
assert 색상['분홍'] is 색상['pink'] is 색상['핑크']
assert 색상['회색'](0.2).x == 0.2
colors = list(색상)
names = str(색상).split(', ')
assert len(set(names)) == len(colors)
assert all(name.isalpha() and '가' <= name[0] <= '힣' and 색상[name] is colors[i] for i, name in enumerate(names))
presets = [value for value in vars(type(색상)).values() if isinstance(value, vector)]
assert {id(c) for c in colors} == {id(c) for c in presets}
assert 색상[1:4] == colors[1:4]
assert len({(c.x, c.y, c.z) for c in colors}) == len(colors)
assert all(c is color[i] for i, c in enumerate(colors))
try:
    color[len(color)]
except IndexError:
    pass
else:
    raise AssertionError('index out of range')
try:
    색상['없는 색']
except KeyError:
    pass
else:
    raise AssertionError('unknown color')
random.seed(42)
picks = [random.choice(색상) for _ in range(100)]
import random
random.seed(42)
assert picks == [random.choice(colors) for _ in range(100)]
sphere(color=picks[0])`;
  const job = { id: 'palette', label: 'palette', code };
  const editor = runPythonJobs([job]).get('palette:palette');
  expect(editor.error).toBeNull();
  const html = generateStandaloneHTML(code);
  const result = spawnSync('python3', ['-I', 'src/test/run-export-python.py'], {
    input: JSON.stringify({ api: exportedApi(html), transform: source, jobs: [job] }),
    encoding: 'utf8', timeout: 10000,
  });
  expect(result.status, result.stderr).toBe(0);
  const [exported] = JSON.parse(result.stdout);
  expect(exported.error).toBeNull();
  expect(exported.commands.find(c => c.type === 'sphere')?.color)
    .toEqual(editor.commands.find(c => c.type === 'sphere').color);
});

it('독립 HTML의 표준 대기 별칭이 요청 시간 뒤 복귀하며 색과 음을 세 번 보낸다', () => {
  const code = `from vpython import *
import time as clock
from time import sleep as wait
def sleep(x):
    return x + 1
assert sleep(4) == 5
lamp = sphere()
for i, note in enumerate(["C4", "D4", "E4"]):
    lamp.color = [color.red, color.green, color.blue][i]
    play_note(note, 0.01)
    if i < 2:
        start = clock.monotonic()
        if i == 0: wait(0.03)
        else: clock.sleep(0.03)
        assert clock.monotonic() - start >= 0.03
`;
  const job = { id: 'sleep', code, realTime: true };
  const html = generateStandaloneHTML(code);
  const result = spawnSync('python3', ['-I', 'src/test/run-export-python.py'], {
    input: JSON.stringify({ api: exportedApi(html), transform: source, jobs: [job] }),
    encoding: 'utf8', timeout: 10000,
  });
  expect(result.status, result.stderr).toBe(0);
  const [run] = JSON.parse(result.stdout);
  expect(run.error).toBeNull();
  const batches = run.batchEnds.map((end, i) => run.commands.slice(run.batchEnds[i - 1] ?? 0, end));
  expect(batches.map(batch => batch.filter(cmd => cmd.action === 'sound').map(cmd => cmd.name))).toEqual([['C4'], ['D4'], ['E4']]);
  expect(batches.map(batch => batch.find(cmd => cmd.action === 'update')?.color)).toEqual([[1,0,0], [0,1,0], [0,0,1]]);
});

function startExport(width, height) {
  document.body.innerHTML = '<div id="viewport"></div><div id="console"></div><div id="loading"></div><div id="progress"></div>';
  const html = generateStandaloneHTML(course.lessons[1].code);
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]
    .replace("import * as THREE from 'three';", '')
    .replace("import { OrbitControls } from 'three/addons/controls/OrbitControls.js';", '');
  const listeners = {};
  class Renderer {
    domElement = document.createElement('canvas');
    setSize() {}
    setPixelRatio() {}
    render() {}
  }
  class Controls {
    target = new THREE.Vector3();
    update() {}
  }
  const context = {
    THREE: { ...THREE, WebGLRenderer: Renderer }, OrbitControls: Controls, document,
    window: { addEventListener: (name, handler) => { listeners[name] = handler; } },
    navigator: {}, innerWidth: width, innerHeight: height, devicePixelRatio: 1,
    requestAnimationFrame: vi.fn(), console, setTimeout, clearTimeout,
  };
  runInNewContext(`${script}\nglobalThis.testExport = { camera, controls, processCmd, scene, meshes };`, context);
  return { ...context.testExport, context, listeners };
}

it('내려받는 작품이 쓰는 천체만 JPEG로 넣고 지구 관측 자료의 출처를 보인다', async () => {
  const empty = await generateProjectHTML('sphere()');
  const earth = await generateProjectHTML('sphere(texture=textures.earth)');
  expect(empty).not.toContain('data:image/jpeg;base64,');
  expect(earth.match(/data:image\/jpeg;base64,/g)).toHaveLength(1);
  expect(earth).toContain('Earth day map · three-globe');
  const dark = await generateProjectHTML('sphere(texture=textures.earth_dark)');
  expect(dark.match(/data:image\/jpeg;base64,/g)).toHaveLength(1);
  expect(dark).toContain('Reto Stöckli, NASA Earth Observatory');
  expect(dark).not.toContain('Earth day map · three-globe');
});

it('작품에 지정한 환경광과 사용자 광원만 켜고 혜성의 입자 시각을 셰이더에 전달한다', () => {
  const { processCmd, scene, meshes } = startExport(800, 600);
  processCmd({action: 'create', type: 'local_light', id: 'a'});
  processCmd({action: 'create', type: 'distant_light', id: 'b'});
  processCmd({action: 'scene', property: 'ambient', value: [0.2, 0.3, 0.4]});
  processCmd({action: 'scene', property: 'lights', value: ['a']});
  expect(scene.children.find(child => child.isAmbientLight).color.toArray()).toEqual([0.2, 0.3, 0.4]);
  expect(meshes.get('a').visible).toBe(true);
  expect(scene.children.filter(child => child.isDirectionalLight).every(child => !child.visible)).toBe(true);
  processCmd({action: 'create', type: 'points', shape: 'plume', id: 'tail', points: [[1, 0, 0]]});
  processCmd({action: 'update', id: 'tail', flow_time: 1.25});
  const plume = meshes.get('tail');
  expect(plume.material.userData.flowTime.value).toBe(1.25);
  expect(plume.frustumCulled).toBe(false);
  expect(plume.material.depthWrite).toBe(false);
});

it('내려받은 HTML은 도형 생성·갱신·배경의 바이트 RGB를 같은 정규화 색으로 그린다', () => {
  const { processCmd, meshes, scene } = startExport(390, 844);
  processCmd({ action: 'create', id: 'star', type: 'sphere', pos: [255, 2, 0], color: [255, 2, 0] });
  const mesh = meshes.get('star');
  expect(mesh.position.toArray()).toEqual([255, 2, 0]);
  expect(mesh.material.color.toArray()).toEqual([1, 2 / 255, 0]);
  processCmd({ action: 'update', id: 'star', color: [1, 0, 0] });
  expect(mesh.material.color.toArray()).toEqual([1, 0, 0]);
  processCmd({ action: 'scene', property: 'background', value: [0, 128, 255] });
  expect(scene.background.toArray()).toEqual([0, 128 / 255, 1]);
});

it('구의 발광을 다시 켜면 직사각형 무늬와 기본 지도가 같은 텍스처를 쓴다', () => {
  const { processCmd, meshes } = startExport(390, 844);
  processCmd({ action: 'create', type: 'sphere', id: 'globe', texture: 'data:image/png;base64,AA==', emissive: true });
  const material = meshes.get('globe').material;
  expect(material.map).toBeInstanceOf(THREE.Texture);
  expect(material.emissiveMap).toBe(material.map);
  processCmd({ action: 'update', id: 'globe', emissive: false });
  expect(material.emissiveMap).toBeNull();
  processCmd({ action: 'update', id: 'globe', emissive: true });
  expect(material.emissiveMap).toBe(material.map);
});

it('점광원의 기본 환산과 명시한 세기를 생성과 갱신에서 구분한다', () => {
  const { processCmd, meshes } = startExport(390, 844);
  for (const explicit of [true, false]) {
    const id = String(explicit);
    processCmd({ action: 'create', type: 'local_light', id, distance_falloff: explicit, intensity: 1 });
    const light = meshes.get(id);
    expect(light.decay).toBe(explicit ? 2 : 0);
    processCmd({ action: 'update', id, intensity: 2 });
    expect(light.intensity).toBeCloseTo(explicit ? 2 : 2 * Math.PI / 0.9);
  }
});

it('시점 선택에 따라 회전·확대·이동 조작을 잠그고 다시 푼다', () => {
  const { processCmd, controls } = startExport(390, 844);
  for (const enabled of [false, true]) {
    for (const property of ['userspin', 'userzoom', 'userpan']) processCmd({action: 'scene', property, value: enabled});
    expect([controls.enableRotate, controls.enableZoom, controls.enablePan]).toEqual([enabled, enabled, enabled]);
  }
});

describe('공유 페이지의 시야 범위', () => {
  it.each([[1440, 900], [390, 844]])('짧은 변의 절반이 scene.range가 되도록 카메라를 맞춘다 (%i×%i)', (width, height) => {
    const runtime = startExport(width, height);
    runtime.processCmd({ action: 'scene', property: 'range', value: 3 });
    const camera = runtime.camera;
    const halfHeight = camera.position.distanceTo(runtime.controls.target) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    expect(halfHeight * Math.min(1, camera.aspect)).toBeCloseTo(3);
    const editorCamera = camera.clone();
    const editorControls = { target: runtime.controls.target.clone() };
    const editor = new CameraSystem(editorCamera, editorControls, new THREE.Scene());
    editor.setExplicitRange(3);
    expect(camera.position.distanceTo(runtime.controls.target)).toBeCloseTo(editorCamera.position.distanceTo(editorControls.target));
    runtime.context.innerWidth = height;
    runtime.context.innerHeight = width;
    runtime.listeners.resize();
    const resizedHalfHeight = camera.position.distanceTo(runtime.controls.target) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    expect(resizedHalfHeight * Math.min(1, camera.aspect)).toBeCloseTo(3);
    editor.dispose();
  });

  it('화면 회전 후에도 사용자가 확대하고 회전한 방향과 중심을 유지한다', () => {
    const runtime = startExport(1440, 900);
    runtime.processCmd({ action: 'scene', property: 'range', value: 3 });
    runtime.controls.target.set(1, 2, 3);
    const direction = new THREE.Vector3(1, 1, 2).normalize();
    const distance = runtime.camera.position.length() / 2;
    runtime.camera.position.copy(runtime.controls.target).addScaledVector(direction, distance);
    const range = distance * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2));
    runtime.context.innerWidth = 390;
    runtime.context.innerHeight = 844;
    runtime.listeners.resize();
    const offset = runtime.camera.position.clone().sub(runtime.controls.target);
    expect(offset.clone().normalize().distanceTo(direction)).toBeCloseTo(0);
    expect(runtime.controls.target.toArray()).toEqual([1, 2, 3]);
    expect(offset.length() * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov / 2)) * runtime.camera.aspect).toBeCloseTo(range);
  });
});

it.skipIf(!hasPython())('pyramid의 size·axis·up과 clone은 편집기와 독립 HTML에서 같다',()=>{
 const code='from vpython import *\np=pyramid(pos=vec(1,2,3),axis=vec(0,2,0),size=vec(2,4,6),up=vec(1,0,0))\np.size=vec(3,2,4)\np.axis=vec(4,0,0)\np.up=vec(0,0,1)\nq=p.clone(pos=vec(8,0,0))\nassert isinstance(q,pyramid) and q.size==p.size\n';
 const jobs=[{id:'pyramid',label:'export',code}],html=generateStandaloneHTML(code);
 const exported=spawnSync('python3',['-I','src/test/run-export-python.py'],{input:JSON.stringify({api:exportedApi(html),transform:source,jobs})+'\n',encoding:'utf8'});expect(exported.status,exported.stderr).toBe(0);
 const result=JSON.parse(exported.stdout)[0];expect(result.error).toBeNull();const original=runPythonJobs(jobs).get('pyramid:export');expect(original.error).toBeNull();
 const objects=commands=>{const state=new Map();for(const c of commands){if(c.action==='create')state.set(c.id,{...c});if(c.action==='update')Object.assign(state.get(c.id)||{},c);}return [...state.values()].map(o=>Object.fromEntries(['type','pos','size','axis','up'].map(k=>[k,o[k]])));};
 expect(objects(result.commands)).toEqual(objects(original.commands));
});

it.skipIf(!hasPython())('독립 HTML의 vector(v)는 새 복사본이며 모듈 위치·차이 벡터를 받을 수 있다',()=>{
 const jobs=[{id:'copy',code:'from vpython import *\na=vec(1,2,3)\nb=vector(a)\nb.x+=5\nassert a==vec(1,2,3) and b==vec(6,2,3)\nassert vector(b-a)==vec(5,0,0)\nassert vector([1,2,3])==a\n'}];
 const result=spawnSync('python3',['-I','src/test/run-export-python.py'],{input:JSON.stringify({api:exportedApi(generateStandaloneHTML(jobs[0].code)),transform:source,jobs})+'\n',encoding:'utf8'});expect(result.status,result.stderr).toBe(0);expect(JSON.parse(result.stdout)[0].error).toBeNull();
});

it.skipIf(!hasPython())('공유 HTML이 점 목록, 텍스처, 위젯 콜백과 음 이름 화음을 실행한다', () => {
  const code = `from vpython import *
ball = sphere(texture=textures.checker)
dots = points(pos=[dict(pos=vec(0,0,0), color=color.red)], radius=0.1)
dots.splice(0, 1, [vec(1,2,3)])
dots.modify(0, x=2)
assert dots.npoints == 1 and dots.point(0)["pos"] == vec(2,2,3)
def change(control):
    ball.texture = textures.earth
pace = slider(min=0, max=3, value=1, step=1, bind=change)
change(pace)
play_chord(["C4", "미4", "G4"], 0.15)
play_note("B4", 0.15, volume=0)
`;
  const result = spawnSync('python3', ['-I', 'src/test/run-export-python.py'], {
    input: JSON.stringify({ api: exportedApi(generateStandaloneHTML(code)), transform: source, jobs: [{ id: 'export', code }] }) + '\n',
    encoding: 'utf8', timeout: 15000,
  });
  expect(result.status, result.stderr).toBe(0);
  const [run] = JSON.parse(result.stdout);
  expect(run.error).toBeNull();
  expect(run.commands).toContainEqual(expect.objectContaining({ action: 'widget_create', kind: 'slider', value: 1 }));
  expect(run.commands).toContainEqual(expect.objectContaining({ action: 'curve_set', points: [[2,2,3]] }));
  expect(run.commands).toContainEqual(expect.objectContaining({ action: 'update', texture: 'preset:earth' }));
  const [chord, silent] = run.commands.filter(command => command.action === 'sound');
  expect(chord.frequencies.map(Math.round)).toEqual([262,330,392]);
  expect(silent.volume).toBe(0);
});

describe.skipIf(!hasPython())('내려받은 HTML의 group과 키·클릭 이벤트', () => {
  const friend = `친구 = group()
몸 = box(group=친구, size=vec(1.6, 1, 0.6), color=color.cyan)
왼눈 = sphere(group=친구, pos=vec(-0.36, 0.15, 0.32), radius=0.15)
등 = sphere(group=친구, pos=vec(0, 0.67, 0), radius=0.23, color=color.orange)
def 이동(e):
    if e.key == "right":
        친구.pos.x += 0.3
scene.bind("keydown", 이동)
def 인사(e):
    if e.pick == 등:
        등.emissive = not 등.emissive
        play_note("G4", 0.3, type="glass")
scene.bind("click", 인사)
`;
  const ufo = `UFO = group()
몸 = ellipsoid(group=UFO, size=vec(1.8, 0.35, 0.9), color=color.cyan)
창 = sphere(group=UFO, pos=vec(0, 0.18, 0), radius=0.32, color=color.yellow)
def 점프(e):
    if e.key != "up":
        return
    play_note("G4", 0.2, type="glass")
    for 높이 in [0, 0.8, 1.3, 0.8, 0]:
        rate(8)
        UFO.pos.y = 높이
        창.emissive = 높이 > 0
scene.bind("keydown", 점프)
`;
  const runExport = jobs => {
    const result = spawnSync('python3', ['-I', 'src/test/run-export-python.py'], {
      input: JSON.stringify({ api: exportedApi(generateStandaloneHTML(jobs[0].code)), transform: source, jobs }) + '\n',
      encoding: 'utf8', timeout: 15000,
    });
    expect(result.status, result.stderr).toBe(0);
    return JSON.parse(result.stdout);
  };
  const created = commands => commands.filter(c => c.action === 'create').map(c => Object.fromEntries(
    ['id', 'type', 'pos', 'group'].map(key => [key, c[key]]),
  ));

  it.each([['friend', friend], ['ufo', ufo]])('묶음과 부품의 상대 위치가 편집기와 같다 (%s)', (id, code) => {
    const [exported] = runExport([{ id, label: 'export', code }]);
    expect(exported.error).toBeNull();
    const original = runPythonJobs([{ id, label: 'export', code }]).get(`${id}:export`);
    expect(original.error).toBeNull();
    expect(created(exported.commands)).toEqual(created(original.commands));
    const [groupCmd, ...parts] = created(exported.commands);
    expect(groupCmd.type).toBe('group');
    expect(parts.every(part => part.group === groupCmd.id)).toBe(true);
  });

  it('방향키로 묶음 전체가 움직이고 클릭한 부품만 빛나며 소리를 낸다', () => {
    const [run] = runExport([{ id: 'friend', code: friend, events: [
      { type: 'key', name: 'keydown', key: 'ArrowRight', label: 'right' },
      { type: 'key', name: 'keyup', key: 'ArrowRight', label: 'right-up' },
      { type: 'mouse', payload: { name: 'click', pos: [0, 0.67, 0.23], pick: '@몸' }, label: 'click-body' },
      { type: 'mouse', payload: { name: 'click', pos: [0, 0.67, 0.23], pick: '@등' }, label: 'click-back' },
    ] }]);
    expect(run.error).toBeNull();
    const ids = Object.fromEntries(run.commands.filter(c => c.action === 'create').map((c, i) => [['group', 'body', 'eye', 'back'][i], c.id]));
    const after = label => run.commands.slice(0, run.commands.findIndex(c => c.action === 'event_done' && c.event === label) + 1);
    const between = (from, to) => after(to).slice(after(from).length);
    expect(after('right').filter(c => c.action === 'update')).toEqual([{ action: 'update', id: ids.group, pos: [0.3, 0, 0] }]);
    // 몸을 누르면 아무 일도 없고, 등을 누르면 등만 빛나고 유리 소리를 낸다.
    expect(between('right-up', 'click-body').filter(c => c.action !== 'event_done')).toEqual([]);
    const backClick = between('click-body', 'click-back');
    expect(backClick).toContainEqual({ action: 'update', id: ids.back, emissive: true });
    expect(backClick.filter(c => c.action === 'update').map(c => c.id)).toEqual([ids.back]);
    expect(backClick).toContainEqual(expect.objectContaining({ action: 'sound', name: 'G4', type: 'glass' }));
  });

  it('↑ 키 처리기 안의 rate() 동안 UFO 묶음이 오르내리고 공중에서만 조종석이 켜진다', () => {
    const [run] = runExport([{ id: 'ufo', code: ufo, events: [
      { type: 'key', name: 'keydown', key: 'ArrowLeft', label: 'left' },
      { type: 'key', name: 'keydown', key: 'ArrowUp', label: 'up', ticks: 60 },
    ] }]);
    expect(run.error).toBeNull();
    const [ufoId, , windowId] = run.commands.filter(c => c.action === 'create').map(c => c.id);
    const start = run.commands.findIndex(c => c.event === 'left');
    const jump = run.commands.slice(start + 1);
    expect(run.commands.slice(0, start).some(c => c.action === 'update' || c.action === 'sound')).toBe(false);
    expect(jump.filter(c => c.id === ufoId).map(c => c.pos[1])).toEqual([0, 0.8, 1.3, 0.8, 0]);
    expect(jump.filter(c => c.id === windowId).map(c => c.emissive)).toEqual([false, true, true, true, false]);
    expect(jump).toContainEqual(expect.objectContaining({ action: 'sound', name: 'G4', type: 'glass' }));
  });
});
