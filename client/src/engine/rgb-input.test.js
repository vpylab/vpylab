import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { normalizeRenderColors } from '../../../server/shared/rgb-input';
import { clearScene, getMesh, processBatch } from './vpython-bridge';
import { hasPython, runPythonJobs } from '../test/python-runner';

describe('RGB input scales', () => {
  it.each([
    [[0, 0, 0], [0, 0, 0]], [[1, 0, 0], [1, 0, 0]], [[1, 1, 1], [1, 1, 1]],
    [[1, 1 / 255, 0], [1, 1 / 255, 0]], [[0, 2, 0], [0, 2 / 255, 0]],
    [[255, 128, 1], [1, 128 / 255, 1 / 255]], [[255, 255, 255], [1, 1, 1]],
    [[1.3, 0.8, 0.5], [1.3, 0.8, 0.5]], [[256, 0, 2], [256, 0, 2]],
    [[-1, 128, 0], [-1, 128, 0]],
  ])('renders %j as %j', (color, expected) => {
    expect(normalizeRenderColors({ action: 'update', color }).color).toEqual(expected);
  });

  it('only copies byte colors, including individual points, faces, mesh vertices and trails', () => {
    const byte = [255, 0, 128], unit = [1, 0, 128 / 255], hdr = [1.5, 0, 0];
    const plain = { action: 'update', axis: byte, pos: byte };
    expect(normalizeRenderColors(plain)).toBe(plain);
    const input = { ...plain, color: hdr, background: byte, start_face_color: byte, end_face_color: byte,
      trail_color: byte, colors: [byte, hdr], vertices: [{ pos: byte, color: byte }] };
    const actual = normalizeRenderColors(input);
    expect(actual).toEqual({ ...input, background: unit, start_face_color: unit, end_face_color: unit,
      trail_color: unit, colors: [unit, hdr], vertices: [{ pos: byte, color: unit }] });
    expect(input.vertices[0].color).toBe(byte);
    expect(actual.colors[1]).toBe(hdr);
    expect(normalizeRenderColors(actual)).toBe(actual);
  });

  it.skipIf(!hasPython())('renders student code and component edits with the same rules across objects and scenes', () => {
    const code = `from vpython import *
col = vec(255, 0, 64)
ball = sphere(pos=col, color=col)
ball.color.y = 128
assert col.y == 0 and ball.color == vec(255, 128, 64)
assert color.rgb_to_hsv(col) == color.rgb_to_hsv(col / 255)
scene.background = col
scene.ambient = vec(0, 64, 128)
local_light(pos=col, color=col, intensity=128)
points(pos=[dict(pos=col, color=col)], color=color.white)
`;
    const result = runPythonJobs([{ id: 'rgb', label: 'lesson', code }]).get('rgb:lesson');
    expect(result.error).toBeNull();
    const scene = new THREE.Scene();
    const ambient = new THREE.AmbientLight();
    ambient.userData.vpDefaultLight = true;
    scene.add(ambient);
    try {
      processBatch(result.commands, scene);
      const mesh = type => getMesh(result.commands.find(c => c.action === 'create' && c.type === type).id);
      const ball = mesh('sphere'), lamp = mesh('local_light'), points = mesh('points');
      expect(ball.position.toArray()).toEqual([255, 0, 64]);
      expect(ball.material.color.toArray()).toEqual([1, 128 / 255, 64 / 255]);
      expect(scene.background.toArray()).toEqual([1, 0, 64 / 255]);
      expect(ambient.color.toArray()).toEqual([0, 64 / 255, 128 / 255]);
      expect(lamp.color.toArray()).toEqual([1, 0, 64 / 255]);
      expect(lamp.intensity).toBe(128);
      expect(points.geometry.getAttribute('color').getZ(0)).toBeCloseTo(64 / 255);
    } finally {
      clearScene(scene);
    }
  });
});
