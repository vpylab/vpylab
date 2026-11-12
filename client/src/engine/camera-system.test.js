import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import CameraSystem, { MODE } from './camera-system';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function createControls() {
  return {
    target: new THREE.Vector3(0, 0, 0),
    domElement: {
      addEventListener() {},
      removeEventListener() {},
    },
  };
}

function createCamera() {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, 0);
  return camera;
}

describe('camera-system', () => {
  it('VPython 중심 설정은 시선 축을 유지하며 카메라를 함께 옮긴다', () => {
    const camera = createCamera();
    const controls = createControls();
    const system = new CameraSystem(camera, controls, new THREE.Scene());
    const original = camera.position.clone();

    system.setExplicitCenter(2, 4, 0);

    expect(camera.position.toArray()).toEqual(original.add(new THREE.Vector3(2,4,0)).toArray());
    expect(controls.target.toArray()).toEqual([2, 4, 0]);
    expect(system.getMode()).toBe(MODE.AUTO_FIT);
  });

  it('좌표 수업의 중심 이동은 정면 방향과 확대 거리를 보존하고 반복 호출로 밀리지 않는다', () => {
    const camera = createCamera();
    const controls = createControls();
    const system = new CameraSystem(camera, controls, new THREE.Scene(), { preserveDirectionOnCenter: true });
    system.setExplicitRange(6);
    const distance = camera.position.distanceTo(controls.target);

    system.setExplicitCenter(2, 4, 0);
    expect(camera.position.toArray()).toEqual([2, 4, distance]);
    expect(camera.position.clone().sub(controls.target).normalize().toArray()).toEqual([0, 0, 1]);
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(distance, 10);

    const firstPosition = camera.position.clone();
    system.setExplicitCenter(2, 4, 0);
    expect(camera.position.equals(firstPosition)).toBe(true);

    system.setExplicitCenter(0, 0, 0);
    expect(camera.position.toArray()).toEqual([0, 0, distance]);
  });

  it('선택한 평행이동은 사용자가 회전한 방향을 보존하고 해제하면 기존 동작으로 돌아온다', () => {
    const camera = createCamera();
    const controls = createControls();
    camera.position.set(4, 3, 8);
    controls.target.set(-1, 1, 0);
    const system = new CameraSystem(camera, controls, new THREE.Scene());
    const offset = camera.position.clone().sub(controls.target);
    system.setPreserveDirectionOnCenter(true);

    system.setExplicitCenter(2, 4, 1);
    expect(camera.position.clone().sub(controls.target).toArray()).toEqual(offset.toArray());
    expect(controls.target.toArray()).toEqual([2, 4, 1]);

    system.setPreserveDirectionOnCenter(false);
    const previousPosition = camera.position.clone();
    system.setExplicitCenter(0, 0, 0);
    expect(camera.position.equals(previousPosition)).toBe(true);
  });
});

describe('camera-system: 기본은 고정 카메라', () => {
  // 실행 중 매 프레임 update()가 불리는 상황을 흉내 낸다. 시간은 가짜 시계로 흘린다.
  function setup(options) {
    const scene = new THREE.Scene();
    const camera = createCamera();
    const controls = createControls();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial());
    scene.add(ball);
    const system = new CameraSystem(camera, controls, scene, options);
    system.onCodeStart();
    const frames = (count, step = 16) => { for (let i = 0; i < count; i++) { vi.advanceTimersByTime(step); system.update(); } };
    const view = () => ({ pos: camera.position.toArray(), target: controls.target.toArray(), range: system.getRange() });
    return { scene, camera, controls, ball, system, frames, view };
  }
  const withClock = run => () => { vi.useFakeTimers(); try { run(); } finally { vi.useRealTimers(); } };

  it('첫 장면에 한 번 맞춘 뒤에는 물체가 움직여도 카메라 위치·중심·범위가 바뀌지 않는다', withClock(() => {
    const { ball, system, frames, view, camera, controls } = setup();
    frames(120);
    const fitted = system._distanceForBounds(system._computeCameraState().radius);
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(fitted, 6);
    expect(controls.target.length()).toBeCloseTo(0, 9);
    const before = view();
    for (let i = 0; i < 300; i++) { ball.position.x += 0.2; ball.scale.multiplyScalar(1.002); frames(1); }
    expect(ball.position.x).toBeCloseTo(60, 6);
    expect(view()).toEqual(before);
    expect(system.getState().autoscale).toBe(true);
    system.dispose();
  }));

  it('새 물체가 범위 밖에 만들어지면 만들어진 자리까지 넓히고, 그 물체가 움직여도 다시 바꾸지 않는다', withClock(() => {
    const { scene, ball, system, frames, view, camera, controls } = setup();
    scene.remove(ball);
    frames(200); // 물체가 없는 동안에는 기본 위치에서 기다린다
    expect(controls.target.toArray()).toEqual([0, 0, 0]);
    scene.add(ball);
    frames(120);
    const near = camera.position.distanceTo(controls.target);
    // 1초 뒤 멀리 새 물체가 만들어진다 (반복문과 음표로 하나씩 만드는 수업)
    const far = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    far.position.set(20, 0, 0);
    scene.add(far);
    frames(120);
    expect(controls.target.x).toBeCloseTo(9.75, 6);
    expect(camera.position.distanceTo(controls.target)).toBeGreaterThan(near * 3);
    const before = view();
    far.position.set(-80, 30, 0);
    ball.position.set(0, -50, 0);
    frames(120);
    expect(view()).toEqual(before);
    // 범위 안에 만들어진 새 물체는 화면을 바꾸지 않는다
    const inside = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    inside.position.set(10, 0, 0);
    scene.add(inside);
    frames(120);
    expect(view()).toEqual(before);
    system.dispose();
  }));

  it('궤적은 움직임에서 나온 선이므로 길어져도 화면을 넓히지 않는다', withClock(() => {
    const { scene, system, frames, view } = setup();
    frames(120);
    const before = view();
    const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(200, 0, 0)]));
    trail.userData.vpTrail = true;
    scene.add(trail);
    frames(120);
    expect(view()).toEqual(before);
    // 화면에 맞추기는 지금 그려진 궤적까지 담는다
    system.fitOnce();
    frames(120);
    expect(system.controls.target.x).toBeGreaterThan(90);
    system.dispose();
  }));

  it('화면에 맞추기는 지금 물체에 한 번만 맞추고 다시 고정한다', withClock(() => {
    const { ball, system, frames, view, controls } = setup();
    frames(120);
    ball.position.set(40, 10, 0);
    frames(60);
    expect(controls.target.x).toBeCloseTo(0, 9);
    system.fitOnce();
    frames(120);
    expect(controls.target.x).toBeCloseTo(40, 6);
    expect(controls.target.y).toBeCloseTo(10, 6);
    const before = view();
    ball.position.set(-40, 0, 0);
    frames(120);
    expect(view()).toEqual(before);
    system.dispose();
  }));

  it('마우스로 돌린 뒤에도 화면에 맞추기로 돌아올 수 있고, 맞춘 뒤에는 다시 고정된다', withClock(() => {
    const { ball, system, frames, camera, controls } = setup();
    frames(120);
    system._onUserInteraction();
    camera.position.set(30, 0, 0);
    ball.position.set(0, 25, 0);
    frames(30);
    expect(camera.position.toArray()).toEqual([30, 0, 0]);
    system.fitOnce();
    frames(120);
    expect(controls.target.y).toBeCloseTo(25, 6);
    expect(camera.position.clone().sub(controls.target).normalize().x).toBeCloseTo(1, 6); // 보던 방향은 유지
    system.dispose();
  }));

  it('학생 코드의 scene 설정은 고정된 뒤에도 그대로 반영된다', withClock(() => {
    const { ball, system, frames, camera, controls } = setup();
    frames(120);
    system.setExplicitCenter(5, 0, 0);
    frames(30);
    expect(controls.target.toArray()).toEqual([5, 0, 0]);
    system.setForward(0, -1, 0);
    frames(30);
    expect(system.getState().forward.map(v => Math.round(v * 1e6) / 1e6)).toEqual([0, -1, 0]);
    system.setExplicitRange(7);
    frames(30);
    expect(system.getRange()).toBeCloseTo(7, 9);
    system.setCameraPos(1, 2, 3);
    system.setCameraAxis(0, 0, -4);
    ball.position.set(100, 0, 0);
    frames(30);
    expect(camera.position.toArray()).toEqual([1, 2, 3]);
    expect(controls.target.toArray()).toEqual([1, 2, -1]);
    system.dispose();
  }));

  it('scene.center를 매 프레임 옮겨도 처음 맞춘 거리를 유지한 채 따라간다', withClock(() => {
    const { ball, system, frames, camera, controls } = setup();
    frames(120);
    const distance = camera.position.distanceTo(controls.target);
    for (let i = 0; i < 100; i++) { ball.position.x += 0.5; system.setExplicitCenter(ball.position.x, 0, 0); frames(1); }
    expect(controls.target.x).toBeCloseTo(50, 9);
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(distance, 9);
    system.dispose();
  }));

  it('scene.camera.follow는 대상을 따라가되 처음 맞춘 뒤에는 거리를 바꾸지 않는다', withClock(() => {
    const { scene, ball, system, frames, camera, controls } = setup();
    const other = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    scene.add(other);
    system.followObject(ball);
    frames(120);
    const distance = camera.position.distanceTo(controls.target);
    for (let i = 0; i < 100; i++) { ball.position.x += 1; frames(1); }
    expect(controls.target.x).toBeCloseTo(100, 9);
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(distance, 6);
    system.dispose();
  }));

  it('scene.autoscale = True를 명시하면 실행 중에도 계속 맞추고, 새 실행에서는 다시 고정이 기본이다', withClock(() => {
    const { ball, system, frames, controls } = setup();
    frames(120);
    system.setAutoscale(true);
    ball.position.set(30, 0, 0);
    frames(400);
    expect(controls.target.x).toBeCloseTo(30, 3);
    system.onCodeStart();
    expect(system.isContinuousFit()).toBe(false);
    frames(120);
    ball.position.set(-30, 0, 0);
    frames(120);
    expect(controls.target.x).toBeCloseTo(30, 6);
    system.dispose();
  }));

  it('화면의 자동 맞춤을 켜면 예전처럼 계속 맞추고 새 실행에서도 유지되며, 끄면 그 자리에 멈춘다', withClock(() => {
    const { ball, system, frames, view, controls } = setup();
    frames(120);
    system.setContinuousFit(true);
    system.onCodeStart();
    ball.position.set(12, 0, 0);
    frames(400);
    expect(controls.target.x).toBeCloseTo(12, 3);
    system.setContinuousFit(false);
    const before = view();
    ball.position.set(-50, 0, 0);
    frames(120);
    expect(view().target).toEqual(before.target);
    system.dispose();
  }));

  it('고정된 뒤 화면 크기가 바뀌어도 보이는 범위를 유지하고 다시 맞추지 않는다', withClock(() => {
    const { ball, system, frames, controls } = setup();
    frames(120);
    const range = system.getRange();
    ball.position.set(50, 0, 0);
    system.resize(1200, 600);
    frames(60);
    expect(system.getRange()).toBeCloseTo(range, 9);
    expect(controls.target.x).toBeCloseTo(0, 9);
    system.dispose();
  }));
});

describe('camera-system: GlowScript 호환 카메라 제어', () => {
  function createSystem(aspect = 1) {
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);
    const controls = createControls();
    const system = new CameraSystem(camera, controls, new THREE.Scene());
    return { camera, controls, system };
  }

  it('scene.range는 화면 짧은 변 방향 시야의 절반이다 (가로가 넓을 때 세로 기준)', () => {
    const { camera, system } = createSystem(2);
    system.setExplicitRange(3);
    const expected = 3 / Math.tan((45 * Math.PI / 180) / 2);
    expect(camera.position.length()).toBeCloseTo(expected, 5);
    expect(system.getRange()).toBeCloseTo(3, 5);
    expect(system.getMode()).toBe(MODE.MANUAL);
  });

  it('세로가 더 길면 range는 가로 기준이 되어 거리가 종횡비만큼 늘어난다', () => {
    const { camera, system } = createSystem(0.5);
    system.setExplicitRange(3);
    const expected = (3 / 0.5) / Math.tan((45 * Math.PI / 180) / 2);
    expect(camera.position.length()).toBeCloseTo(expected, 5);
    expect(system.getRange()).toBeCloseTo(3, 5);
  });

  it('scene.forward는 중심과 거리를 유지한 채 보는 방향만 바꾼다', () => {
    const { camera, controls, system } = createSystem();
    controls.target.set(1, 1, 1);
    camera.position.set(1, 1, 9);
    system.setForward(0, -1, 0);
    expect(camera.position.x).toBeCloseTo(1, 5);
    expect(camera.position.y).toBeCloseTo(9, 5);
    expect(camera.position.z).toBeCloseTo(1, 5);
    expect(controls.target.toArray()).toEqual([1, 1, 1]);
    expect(system.getState().forward.map((v) => Math.round(v * 1000) / 1000)).toEqual([0, -1, 0]);
  });

  it('scene.camera.pos는 카메라를 옮기고 중심도 같이 평행이동한다', () => {
    const { camera, controls, system } = createSystem();
    system.setCameraPos(5, 0, 8);
    expect(camera.position.toArray()).toEqual([5, 0, 8]);
    expect(controls.target.toArray()).toEqual([5, 0, 0]);
    expect(system.getMode()).toBe(MODE.MANUAL);
  });

  it('scene.camera.axis는 카메라를 두고 중심을 pos + axis로 옮기며 range를 다시 계산한다', () => {
    const { camera, controls, system } = createSystem();
    system.setCameraAxis(0, 0, -4);
    expect(camera.position.toArray()).toEqual([0, 0, 8]);
    expect(controls.target.toArray()).toEqual([0, 0, 4]);
    expect(system.getRange()).toBeCloseTo(4 * Math.tan((45 * Math.PI / 180) / 2), 5);
  });

  it('scene.fov를 바꾸면 명시한 range가 그대로 보이도록 거리를 다시 계산한다', () => {
    const { camera, system } = createSystem();
    system.setExplicitRange(3);
    system.setFov(Math.PI / 3);
    expect(camera.fov).toBeCloseTo(60, 5);
    expect(camera.position.length()).toBeCloseTo(3 / Math.tan(Math.PI / 6), 5);
  });

  it('scene.camera.follow(obj)는 매 프레임 객체 위치를 중심으로 삼고 거리를 유지한다', () => {
    const { camera, controls, system } = createSystem();
    const scene = system.scene;
    const target = new THREE.Object3D();
    target.position.set(3, 0, 0);
    scene.add(target);
    system.followObject(target);
    system.update();
    expect(controls.target.toArray()).toEqual([3, 0, 0]);
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(8, 5);
    target.position.set(3, 2, 0);
    system.update();
    expect(controls.target.toArray()).toEqual([3, 2, 0]);
    system.followObject(null);
    expect(system.getMode()).toBe(MODE.AUTO_FIT);
  });

  it('scene.range는 추적을 끊지 않고 거리만 바꾼다', () => {
    const { camera, controls, system } = createSystem();
    const target = new THREE.Object3D();
    target.position.set(-4, 0, 0);
    system.scene.add(target);
    system.followObject(target);
    system.setExplicitRange(3);
    system.update();
    expect(controls.target.toArray()).toEqual([-4, 0, 0]);
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(3 / Math.tan((45 * Math.PI / 180) / 2), 5);
  });

  it('새 실행이 시작되면 추적 대상과 명시 range가 해제된다', () => {
    const { system } = createSystem();
    const target = new THREE.Object3D();
    system.scene.add(target);
    system.setExplicitRange(2);
    system.followObject(target);
    system.onCodeStart();
    expect(system._followTarget).toBeNull();
    expect(system._explicitRange).toBeNull();
    expect(system.getMode()).toBe(MODE.AUTO_FIT);
    system.dispose();
  });
  it('새 실행의 명시 range는 이전 작품의 중심·시야각·시선 방향을 물려받지 않는다', () => {
    const camera = createCamera();
    const controls = createControls();
    const system = new CameraSystem(camera, controls, new THREE.Scene());
    system.setExplicitCenter(20, 3, 4);
    system.setForward(1, 0, 0);
    system.setFov(Math.PI / 6);
    system.onCodeStart();
    system.setExplicitRange(0.6);
    expect(controls.target.toArray()).toEqual([0, 0, 0]);
    expect(camera.position.x).toBeCloseTo(0);
    expect(camera.position.y).toBeCloseTo(0);
    expect(camera.position.z).toBeCloseTo(0.6 / Math.tan(Math.PI / 6));
    expect(camera.fov).toBe(60);
    system.dispose();
  });

});


describe('실제 OrbitControls와 카메라 수명·화면 비율', () => {
  function setup() {
    const element=document.createElement('div');
    element.setPointerCapture=()=>{}; element.releasePointerCapture=()=>{};
    const camera=new THREE.PerspectiveCamera(60,2,0.1,1000);
    camera.position.set(0,0,8);
    const controls=new OrbitControls(camera,element);
    controls.minDistance=1; controls.maxDistance=100;
    const scene=new THREE.Scene(), system=new CameraSystem(camera,controls,scene);
    return {element,camera,controls,scene,system,dispose:()=>{system.dispose();controls.dispose();}};
  }
  it('아주 작은/큰 range가 OrbitControls의 1~100 거리 제한으로 잘리지 않는다',()=>{
    const {system,camera,controls,dispose}=setup();
    for(const range of [0.0001,100000]){
      system.setExplicitRange(range);system.setForward(1,0,0);controls.update();
      expect(system.getRange()).toBeCloseTo(range,7);
      expect(system.getState().forward[0]).toBeCloseTo(1,9);
      expect(camera.near).toBeLessThan(camera.position.distanceTo(controls.target));
      expect(camera.far).toBeGreaterThan(camera.position.distanceTo(controls.target));
    }
    dispose();
  });
  it('가로→세로→가로 resize 뒤에도 중심·range·시선이 유지된다',()=>{
    const {system,camera,controls,dispose}=setup();
    system.setExplicitRange(3);system.setExplicitCenter(4,2,1);system.setForward(1,-1,-1);
    const direction=system.getState().forward;
    for(const [w,h] of [[300,600],[1200,600]]){
      system.resize(w,h);controls.update();
      expect(system.getRange()).toBeCloseTo(3,9);
      expect(controls.target.toArray()).toEqual([4,2,1]);
      direction.forEach((v,i)=>expect(system.getState().forward[i]).toBeCloseTo(v,9));
      expect(camera.aspect).toBe(w/h);
    }
    dispose();
  });
  it('클릭만 하면 자동 맞춤을 유지하고 실제 드래그일 때 해제한다',()=>{
    const {system,element,dispose}=setup();
    const send=(name,x,y)=>element.dispatchEvent(new MouseEvent(name,{clientX:x,clientY:y}));
    send('pointerdown',10,10);send('pointerup',10,10);
    expect(system.getState().autoscale).toBe(true);
    send('pointerdown',10,10);send('pointermove',20,20);send('pointerup',20,20);
    expect(system.getState().autoscale).toBe(false);
    dispose();
  });
  it('follow 중 확대하면 다음 프레임이 예전 거리로 되돌리지 않는다',()=>{
    const {system,camera,controls,scene,dispose}=setup();
    const target=new THREE.Object3D();scene.add(target);system.followObject(target);
    camera.position.set(0,0,12);controls.update();target.position.x=3;scene.updateMatrixWorld(true);system.update();
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(12);
    expect(controls.target.x).toBe(3);dispose();
  });
  it('수동 카메라에서 자동 모드로 돌아갈 때 이전 실행의 중심으로 점프하지 않는다',()=>{
    const {system,camera,controls,dispose}=setup();
    controls.target.set(20,10,0);camera.position.set(20,10,50);
    system.setAutoscale(false);system.resetToAutoFit();
    expect(system._currentCenter.toArray()).toEqual([20,10,0]);
    expect(system._currentDistance).toBeCloseTo(50);dispose();
  });
  it('지연 auto-fit은 명시 range를 덮지 않으며 큰 선과 숨긴 자식도 구분한다',()=>{
    vi.useFakeTimers();
    const {system,scene,dispose}=setup();
    try {
      const group=new THREE.Group(),hidden=new THREE.Group();hidden.visible=false;
      hidden.add(new THREE.Mesh(new THREE.BoxGeometry(1000000,1,1)));group.add(hidden);scene.add(group);
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1000,0,0),new THREE.Vector3(1000,0,0)])));
      scene.updateMatrixWorld(true);
      expect(system._computeCameraState().size.x).toBe(2000);
      system.onCodeStart();system.setExplicitRange(2);vi.advanceTimersByTime(1000);
      expect(system.getRange()).toBeCloseTo(2);
      system.resetToAutoFit();expect(system._targetDistance).toBeGreaterThan(1000);
    }finally{dispose();vi.useRealTimers();}
  });
});


it('자동 맞춤 보간 중 forward를 반복해도 fit 거리로 수렴한다',()=>{
 const camera=createCamera(),controls=createControls(),scene=new THREE.Scene();
 scene.add(new THREE.Mesh(new THREE.SphereGeometry(100),new THREE.MeshBasicMaterial()));
 const system=new CameraSystem(camera,controls,scene);system.onCodeStart();
 for(let i=0;i<500;i++){system.update();system.setForward(Math.sin(i/30),0,-Math.cos(i/30));}
 expect(camera.position.distanceTo(controls.target)).toBeCloseTo(system._distanceForBounds(system._computeCameraState().radius),2);system.dispose();
});
it('큰 물체 follow는 autoscale을 유지하며 구 안에 카메라를 두지 않는다',()=>{
 const camera=createCamera(),controls=createControls(),scene=new THREE.Scene();
 const ball=new THREE.Mesh(new THREE.SphereGeometry(6.4e9));ball.position.x=1.5e11;scene.add(ball);
 const system=new CameraSystem(camera,controls,scene);system.onCodeStart();system.followObject(ball);system.update();
 expect(system.getState().autoscale).toBe(true);expect(camera.position.distanceTo(controls.target)).toBeGreaterThan(6.4e9);
 system.setExplicitRange(1e10);system.setFov(Math.PI/4);system.update();expect(system.getRange()).toBeCloseTo(1e10,3);system.dispose();
});
it('깊이 방향의 먼 물체를 클리핑하지 않고 확대 조작 후 near도 갱신한다',()=>{
 const camera=createCamera(),controls=createControls(),scene=new THREE.Scene();
 const box=new THREE.Mesh(new THREE.BoxGeometry());box.position.z=-500;scene.add(box);
 const system=new CameraSystem(camera,controls,scene);system.setExplicitRange(1);system.update();
 expect(camera.far).toBeGreaterThan(camera.position.distanceTo(box.position));
 system.setExplicitRange(1e12);camera.position.set(0,0,2);system.updateClipPlanes();expect(camera.near).toBeLessThan(2);system.dispose();
});
