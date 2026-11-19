import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { hasPython, runPythonJobs } from '../test/python-runner';
import { clearScene, getMesh, processBatch } from './vpython-bridge';

vi.mock('./texture-system', async () => {
  const three = await import('three');
  const resolveTexture = vi.fn(spec => spec ? new three.DataTexture(new Uint8Array([255,255,255,255]),1,1) : null);
  return { resolveTexture, surfacePlaceholder: resolveTexture, finishSurfaceImage: vi.fn() };
});

const scene = new THREE.Scene();
const run = code => runPythonJobs([{ id: 'mesh', label: 'case', code: `from vpython import *\n${code}` }]).get('mesh:case');
afterEach(() => clearScene(scene));

describe.skipIf(!hasPython())('VPython 공유 정점·나선 실제 지오메트리', () => {
  it('한 정점의 성분·법선·UV·투명도 변경이 연결된 두 면에 최종 상태로 반영된다', () => {
    const r = run(`a=vertex(pos=vec(0,0,0),texpos=vec(0,0,0))
b=vertex(pos=vec(1,0,0),texpos=vec(1,0,0))
c=vertex(pos=vec(0,1,0),texpos=vec(0,1,0))
d=vertex(pos=vec(1,1,0),texpos=vec(1,1,0))
t=triangle(vs=[a,b,c])
q=quad(vs=[a,b,d,c])
a.pos.z=0.5
a.normal=vec(0,1,1)
a.texpos.x=0.25
a.opacity=0.4
assert t.vs[0] is a and q.vs[0] is a
`);
    expect(r.error).toBeNull();
    processBatch(r.commands, scene);
    expect(r.commands.filter(c => c.action === 'mesh_vertices')).toHaveLength(2);
    for (const id of ['obj_1', 'obj_2']) {
      const mesh = getMesh(id);
      expect(mesh.geometry.getAttribute('position').getZ(0)).toBeCloseTo(0.5);
      expect(mesh.geometry.getAttribute('uv').getX(0)).toBeCloseTo(0.25);
      expect(mesh.geometry.getAttribute('normal').getY(0)).toBe(1);
      expect(mesh.geometry.getAttribute('vpOpacity').getX(0)).toBeCloseTo(0.4);
      expect(mesh.material.transparent).toBe(true);
    }
  });

  it('정점만 변경한 애니메이션도 rate마다 전송하며 종료 때까지 미루지 않는다', () => {
    const r = run(`a=vertex()
t=triangle(vs=[a,vertex(pos=vec(1,0,0)),vertex(pos=vec(0,1,0))])
a.pos.z=0.1
rate(100)
a.pos.z=0.2
rate(100)
`.replace(/^\+/gm, ''));
    expect(r.error).toBeNull();
    expect(r.commands.filter(c => c.action === 'mesh_vertices').map(c => c.vertices[0].pos[2])).toEqual([0.1, 0.2]);
  });

  it('텍스처가 면 생성과 변경에서 실제 재질로 전달되며 정점별 shader 속성을 쓴다', () => {
    const r = run('t=triangle(vs=[vertex(),vertex(pos=vec(1,0,0)),vertex(pos=vec(0,1,0))],texture=textures.rug)');
    expect(r.error).toBeNull();
    expect(r.commands.find(c => c.type === 'triangle').texture).toBeTruthy();
    processBatch(r.commands, scene);
    const mesh = getMesh('obj_1');
    expect(mesh.material.map.isTexture).toBe(true);
    const shader = { vertexShader: '#include <begin_vertex>', fragmentShader: '#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <opaque_fragment>' };
    mesh.material.onBeforeCompile(shader);
    expect(shader.vertexShader).toContain('attribute float vpOpacity');
    expect(shader.fragmentShader).toContain('diffuseColor.a *= vVpOpacity');
    expect(shader.fragmentShader).toContain('roughnessFactor =');
    expect(shader.fragmentShader).toContain('outgoingLight = mix');
  });

  it('나선 size·성분 수정·radius·length가 축과 연동되고 단면의 두 직경과 선 두께를 그린다', () => {
    const r = run(`h=helix(axis=vec(0,2,0),radius=0.5,coils=2.5)
assert h.length == 2 and h.radius == 0.5
h.size=vec(3,2,4)
assert h.axis.mag == 3 and h.radius == 1
h.size.x=4
assert h.length == 4 and h.axis.mag == 4
h.thickness=0.2
h.ccw=False
h.coils=3.5
assert h.clone().size == h.size
`);
    expect(r.error).toBeNull();
    processBatch(r.commands, scene);
    const mesh = getMesh('obj_1');
    expect(mesh.geometry.type).toBe('TubeGeometry');
    expect(mesh.geometry.parameters.radius).toBeCloseTo(0.1);
    const path = mesh.geometry.parameters.path;
    expect(path.getPoint(0).y).toBe(1);
    expect(path.getPoint(1).x).toBe(4);
    expect(mesh.userData.helixSpec.size).toEqual([4,2,4]);
    expect(mesh.userData.helixSpec.coils).toBe(3.5);
    expect(new THREE.Vector3(1,0,0).applyQuaternion(mesh.quaternion).y).toBeCloseTo(1);
  });

  it('문서의 mouse() 표기와 속성 표기가 같은 마우스 상태를 참조한다', () => {
    const r = run('assert scene.mouse() is scene.mouse\nassert scene.mouse().pos == scene.mouse.pos');
    expect(r.error).toBeNull();
  });
});
