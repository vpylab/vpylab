// 학생 코드 → 브리지 → 카메라 시스템까지 이어서, 기본 카메라가 고정인지 확인한다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import CameraSystem from './camera-system';
import { hasPython, runPythonJobs } from '../test/python-runner';

vi.mock('./chart-system', () => ({ renderChart: vi.fn(), clearCharts: vi.fn() }));
vi.mock('./sound-system', () => ({ processSoundCommand: vi.fn(), setNotePlayCallback: vi.fn(), setSoundEventCallback: vi.fn() }));

import { clearScene, getMesh, processBatch } from './vpython-bridge';

describe.skipIf(!hasPython())('기본 카메라: 실제 학생 코드 실행', () => {
  let scene; let camera; let controls; let system;

  beforeEach(() => {
    scene = new THREE.Scene();
    clearScene(scene);
    camera = new THREE.PerspectiveCamera(60, 1.5, 0.1, 1000);
    controls = { target: new THREE.Vector3(), domElement: { addEventListener() {}, removeEventListener() {} } };
    system = new CameraSystem(camera, controls, scene);
    scene._cameraSystem = system;
    system.onCodeStart();
  });

  afterEach(() => {
    system.dispose();
    clearScene(scene);
  });

  // 명령을 하나씩 적용하며 그 사이에 화면을 몇 프레임 그린 것처럼 카메라를 갱신한다
  function replay(code, onCommand) {
    const run = runPythonJobs([{ id: 'camera', label: 'run', code }]).get('camera:run');
    expect(run.error).toBeNull();
    const view = () => ({ position: camera.position.toArray(), target: controls.target.toArray() });
    run.commands.forEach((command, index) => {
      processBatch([command], scene);
      for (let frame = 0; frame < 80; frame++) system.update();
      onCommand?.(command, index, view);
    });
    return { run, view };
  }

  it('공이 움직이고 궤적이 길어져도 카메라는 처음 맞춘 자리에 있다', () => {
    let fixed = null;
    const { run, view } = replay(`from vpython import *
ball = sphere(radius=0.5, color=color.orange, make_trail=True)
for i in range(60):
    rate(60)
    ball.pos.x = ball.pos.x + 0.5
`, (command, _index, current) => {
      if (command.action === 'create' && command.type === 'sphere') fixed = current();
      else if (fixed) expect(current()).toEqual(fixed);
    });
    const ball = run.commands.find(c => c.action === 'create' && c.type === 'sphere');
    expect(getMesh(ball.id).position.x).toBeCloseTo(30, 6);
    expect(view().target).toEqual([0, 0, 0]);
    // 화면에 맞추기를 누르면 그때의 공과 궤적에 한 번 맞춘다
    system.fitOnce();
    for (let frame = 0; frame < 120; frame++) system.update();
    expect(controls.target.x).toBeCloseTo(15.25, 1);
  });

  it('반복문에서 하나씩 만든 물체는 만들어질 때마다 화면에 담긴다', () => {
    const targets = [];
    replay(`from vpython import *
for i in range(5):
    sphere(pos=vector(i * 3, 0, 0), radius=0.4)
    sleep(0.3)
`, (command, _index, current) => {
      if (command.action === 'create') targets.push(current().target[0]);
    });
    expect(targets).toHaveLength(5);
    expect(targets.map(value => Math.round(value * 100) / 100)).toEqual([0, 1.5, 3, 4.5, 6]);
  });

  it('scene.range를 적은 코드는 그 범위를 유지하고, scene.autoscale = True는 움직이는 물체를 계속 담는다', () => {
    replay(`from vpython import *
scene.range = 6
ball = sphere(radius=0.5)
for i in range(20):
    rate(60)
    ball.pos.x = ball.pos.x + 1
`);
    expect(system.getRange()).toBeCloseTo(6, 9);
    expect(controls.target.toArray()).toEqual([0, 0, 0]);

    system.onCodeStart();
    clearScene(scene);
    replay(`from vpython import *
scene.autoscale = True
ball = sphere(radius=0.5)
for i in range(20):
    rate(60)
    ball.pos.x = ball.pos.x + 1
`);
    expect(system.isContinuousFit()).toBe(true);
    expect(controls.target.x).toBeGreaterThan(15);
  });
});
